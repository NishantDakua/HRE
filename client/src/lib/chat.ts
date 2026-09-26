import axios from "axios";
import { api } from "./api";
import type { Role } from "./types";

export interface MatchCard {
  resourceId: string;
  title: string;
  category: string;
  provider: string;
  area: string;
  verified: boolean;
  rating: number;
  distanceKm: number;
  price: number;
  unit: string;
  unitLabel: string;
  available: number;
  fulfils: number;
  delivery: number;
  landed: number;
  matchScore: number;
}

export interface BookingCard {
  bookingId: string;
  ref: string;
  title: string;
  status: string;
  counterpart: string;
  startAt: string;
  endAt: string;
  total: number;
  lastOffer?: { round: number; price: number; from: "you" | "them"; message: string; status: string };
}

export interface ConfirmCard {
  actionId: string;
  kind: "book" | "respond";
  title: string;
  lines: string[];
  total?: number;
}

export type UIBlock =
  | { type: "text"; text: string }
  | { type: "options"; quantity: number; startAt: string; endAt: string; matches: MatchCard[] }
  | { type: "confirm"; action: ConfirmCard }
  | { type: "bookings"; role: Role; bookings: BookingCard[] }
  | { type: "result"; ok: boolean; text: string; bookingId?: string };

export type ChatStreamEvent =
  | { event: "session"; sessionId: string }
  | { event: "delta"; text: string }
  | { event: "status"; text: string }
  | { event: "block"; block: UIBlock }
  | { event: "done" }
  | { event: "error"; error: string };

/** POST /api/chat and hand each NDJSON event to `onEvent` as it arrives (text streams token by token). */
export async function streamChat(body: { sessionId?: string; message: string; mode: Role }, onEvent: (e: ChatStreamEvent) => void) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Chat failed (${res.status})`);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line) as ChatStreamEvent);
    }
  }
}

export async function confirmAction(body: { sessionId: string; actionId: string; decision: "confirm" | "cancel"; mode: Role }) {
  const { data } = await api.post<{ sessionId: string; blocks: UIBlock[]; changed: boolean }>("/chat/confirm", body);
  return data;
}

/* ------------------------------------------------------------------ */
/* Voice                                                               */
/* ------------------------------------------------------------------ */

const voice = axios.create({ baseURL: "/voice" });

export async function transcribe(wav: Blob) {
  const form = new FormData();
  form.append("audio", wav, "speech.wav");
  form.append("language", "en");
  const { data } = await voice.post<{ text: string; engine: string | null }>("/stt", form);
  return data;
}

export async function synthesize(text: string) {
  const { data } = await voice.post<Blob>("/tts", { text }, { responseType: "blob" });
  return data;
}

const TARGET_RATE = 16000;

/** Decode any recorded blob (webm/ogg/mp4) and resample to 16 kHz mono WAV, the format the STT models expect. */
export async function toWav16k(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer()).finally(() => ctx.close());
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET_RATE), TARGET_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const samples = (await offline.startRendering()).getChannelData(0);

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const ascii = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, TARGET_RATE, true);
  view.setUint32(28, TARGET_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  return new Blob([buffer], { type: "audio/wav" });
}
