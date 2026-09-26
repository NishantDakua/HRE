import io
import json
import logging
import os
import re
import threading
import time
from contextlib import asynccontextmanager
from typing import Any, Literal

import numpy as np
import soundfile as sf
import torch
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
log = logging.getLogger("ai")
logging.basicConfig(level=logging.INFO)

CUDA = torch.cuda.is_available()
# Speech defaults to CPU so the LLM has the (6 GB) GPU to itself.
SPEECH_DEVICE = os.getenv("SPEECH_DEVICE", "cpu")
LLM_4BIT = os.getenv("LLM_4BIT", "1") == "1" and CUDA
SAMPLE_RATE = 16000

LLM_ID = os.getenv("LLM_MODEL", "Qwen/Qwen3-VL-4B-Instruct")
CONFORMER_ID = "ai4bharat/indic-conformer-600m-multilingual"
WHISPER_ID = "openai/whisper-large-v3-turbo"
INDICF5_ID = "ai4bharat/IndicF5"

# Languages IndicConformer was trained on; anything else (English, auto-detect) goes to Whisper.
INDIC_LANGS = {
    "as", "bn", "brx", "doi", "gu", "hi", "kn", "kok", "ks", "mai", "ml",
    "mni", "mr", "ne", "or", "pa", "sa", "sat", "sd", "ta", "te", "ur",
}

_models: dict[str, Any] = {}
_load_lock = threading.Lock()
_generate_lock = threading.Lock()


def _load(name: str):
    with _load_lock:
        if name in _models:
            return _models[name]
        log.info("Loading %s", name)
        if name == "llm":
            from transformers import AutoProcessor, BitsAndBytesConfig, Qwen3VLForConditionalGeneration

            kwargs: dict[str, Any] = {
                "device_map": "auto" if CUDA else "cpu",
                "dtype": torch.bfloat16 if CUDA else torch.float32,
            }
            if LLM_4BIT:
                kwargs["quantization_config"] = BitsAndBytesConfig(
                    load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.bfloat16
                )
            processor = AutoProcessor.from_pretrained(LLM_ID)
            model = Qwen3VLForConditionalGeneration.from_pretrained(LLM_ID, **kwargs).eval()
            loaded: Any = (processor, model)
        elif name == "conformer":
            from transformers import AutoModel

            loaded = AutoModel.from_pretrained(CONFORMER_ID, trust_remote_code=True)
        elif name == "whisper":
            from transformers import pipeline

            loaded = pipeline(
                "automatic-speech-recognition",
                model=WHISPER_ID,
                dtype=torch.float16 if SPEECH_DEVICE == "cuda" else torch.float32,
                device=SPEECH_DEVICE,
            )
        else:
            from transformers import AutoModel

            loaded = AutoModel.from_pretrained(INDICF5_ID, trust_remote_code=True)
        _models[name] = loaded
        log.info("Loaded %s", name)
        return loaded


def _preload_llm():
    processor, model = _load("llm")
    # The first generate() pays one-off CUDA/kernel setup (several seconds); do it now, not on the user's first message.
    inputs = processor.tokenizer("Hello", return_tensors="pt").to(model.device)
    with _generate_lock, torch.inference_mode():
        model.generate(**inputs, max_new_tokens=4, do_sample=False)
    log.info("LLM warmed up")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Loading the model takes a while; start it now so the first chat isn't stuck waiting.
    if os.getenv("LLM_PRELOAD", "1") == "1":
        threading.Thread(target=_preload_llm, daemon=True).start()
    yield


app = FastAPI(title="Spare AI", lifespan=lifespan)


@app.get("/voice/health")
def health():
    return {
        "cuda": CUDA,
        "llm": LLM_ID,
        "llm_4bit": LLM_4BIT,
        "speech_device": SPEECH_DEVICE,
        "loaded": sorted(_models),
        "tts_configured": bool(os.getenv("INDICF5_REF_AUDIO") and os.getenv("INDICF5_REF_TEXT")),
    }


# --------------------------------------------------------------------------- #
# LLM                                                                         #
# --------------------------------------------------------------------------- #


class ToolCall(BaseModel):
    name: str
    arguments: dict[str, Any]


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant", "tool"]
    content: str = ""
    tool_calls: list[ToolCall] | None = None


class ChatIn(BaseModel):
    messages: list[ChatMessage]
    tools: list[dict[str, Any]] = []
    max_new_tokens: int = Field(default=400, le=2048)


TOOL_CALL_RE = re.compile(r"<tool_call>\s*(.*?)\s*</tool_call>", re.S)


def parse_completion(text: str) -> dict[str, Any]:
    """Split Qwen's raw completion into visible text and <tool_call> JSON blocks."""
    calls: list[dict[str, Any]] = []
    for raw in TOOL_CALL_RE.findall(text):
        try:
            call = json.loads(raw)
            args = call.get("arguments", {})
            if isinstance(args, str):
                args = json.loads(args)
            calls.append({"name": call["name"], "arguments": args})
        except (json.JSONDecodeError, KeyError, TypeError):
            log.warning("Unparseable tool call: %s", raw)
    content = TOOL_CALL_RE.sub("", text)
    # A tool call cut off by max_new_tokens has no closing tag; drop it rather than show JSON.
    content = content.split("<tool_call>")[0].strip()
    return {"content": content, "tool_calls": calls}


def _template_message(m: ChatMessage) -> dict[str, Any]:
    if m.role == "assistant" and m.tool_calls:
        return {
            "role": "assistant",
            "content": m.content,
            "tool_calls": [{"type": "function", "function": c.model_dump()} for c in m.tool_calls],
        }
    return {"role": m.role, "content": m.content}


TOOL_TAG = "<tool_call>"
TOOL_NAME_RE = re.compile(r'<tool_call>\s*\{\s*"name"\s*:\s*"([a-z_]+)"')


def _visible_prefix(text: str) -> str:
    """Text safe to show while streaming: everything before a tool call, minus a possibly half-written tag."""
    cut = text.find(TOOL_TAG)
    if cut >= 0:
        return text[:cut]
    for k in range(len(TOOL_TAG) - 1, 0, -1):
        if text.endswith(TOOL_TAG[:k]):
            return text[:-k]
    return text


@app.post("/llm/chat/stream")
def llm_chat_stream(body: ChatIn):
    """NDJSON stream: {"type":"delta","text"} while generating, {"type":"tool","name"} as soon as a tool
    call's name is known, then {"type":"done","content","tool_calls"}."""
    from transformers import TextIteratorStreamer

    processor, model = _load("llm")
    # Text-only chat: the tokenizer's template takes plain-string content, the processor's expects image/text parts.
    inputs = processor.tokenizer.apply_chat_template(
        [_template_message(m) for m in body.messages],
        tools=body.tools or None,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt",
    ).to(model.device)
    streamer = TextIteratorStreamer(processor.tokenizer, skip_prompt=True, skip_special_tokens=True)
    failure: list[BaseException] = []

    def generate():
        with _generate_lock, torch.inference_mode():
            try:
                model.generate(
                    **inputs,
                    streamer=streamer,
                    max_new_tokens=body.max_new_tokens,
                    do_sample=True,
                    temperature=0.3,
                    top_p=0.8,
                    top_k=20,
                )
            except BaseException as error:
                failure.append(error)
                streamer.end()

    def events():
        started = time.perf_counter()
        threading.Thread(target=generate, daemon=True).start()
        text, sent, tools_announced = "", 0, 0
        for chunk in streamer:
            text += chunk
            visible = _visible_prefix(text)
            if len(visible) > sent:
                yield json.dumps({"type": "delta", "text": visible[sent:]}) + "\n"
                sent = len(visible)
            names = TOOL_NAME_RE.findall(text)
            for name in names[tools_announced:]:
                yield json.dumps({"type": "tool", "name": name}) + "\n"
            tools_announced = len(names)
        if failure:
            log.error("Generation failed: %r", failure[0])
            yield json.dumps({"type": "error", "error": str(failure[0])}) + "\n"
            return
        log.info("llm: %d prompt tokens, %d chars out in %.1fs", inputs["input_ids"].shape[-1], len(text), time.perf_counter() - started)
        yield json.dumps({"type": "done", **parse_completion(text)}) + "\n"

    return StreamingResponse(events(), media_type="application/x-ndjson")


# --------------------------------------------------------------------------- #
# Speech                                                                      #
# --------------------------------------------------------------------------- #


def _whisper(audio: np.ndarray, language: str | None) -> str:
    kwargs = {"task": "transcribe"}
    if language:
        kwargs["language"] = language
    out = _load("whisper")({"raw": audio, "sampling_rate": SAMPLE_RATE}, generate_kwargs=kwargs)
    return out["text"].strip()


@app.post("/voice/stt")
def stt(audio: UploadFile = File(...), language: str = Form("auto")):
    try:
        data, sr = sf.read(io.BytesIO(audio.file.read()), dtype="float32")
    except RuntimeError:
        raise HTTPException(400, "Send a WAV file")
    if data.ndim > 1:
        data = data.mean(axis=1)
    if sr != SAMPLE_RATE:
        raise HTTPException(400, f"Send {SAMPLE_RATE} Hz audio")
    if data.size < SAMPLE_RATE // 4:
        return {"text": "", "engine": None, "language": language}

    if language in INDIC_LANGS:
        try:
            wav = torch.from_numpy(data).unsqueeze(0)
            text = _load("conformer")(wav, language, "rnnt")
            return {"text": str(text).strip(), "engine": "indic-conformer", "language": language}
        except Exception:
            log.exception("IndicConformer failed, falling back to Whisper")

    text = _whisper(data, None if language == "auto" else language)
    return {"text": text, "engine": "whisper", "language": language}


class TTSIn(BaseModel):
    text: str = Field(min_length=1, max_length=600)


@app.post("/voice/tts")
def tts(body: TTSIn):
    ref_audio = os.getenv("INDICF5_REF_AUDIO")
    ref_text = os.getenv("INDICF5_REF_TEXT")
    if not (ref_audio and ref_text):
        raise HTTPException(503, "Set INDICF5_REF_AUDIO and INDICF5_REF_TEXT in ai/.env")
    audio = _load("indicf5")(body.text, ref_audio_path=ref_audio, ref_text=ref_text)
    audio = np.asarray(audio)
    if audio.dtype == np.int16:
        audio = audio.astype(np.float32) / 32768.0
    buf = io.BytesIO()
    sf.write(buf, audio.astype(np.float32), 24000, format="WAV")
    return Response(buf.getvalue(), media_type="audio/wav")
