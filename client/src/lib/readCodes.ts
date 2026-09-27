import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path),
  },
});

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: ImageBitmap) => Promise<DetectedBarcode[]> };

function nativeDetector() {
  const ctor = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
  if (!ctor) return null;
  try {
    return new ctor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

async function codesInFile(file: Blob) {
  const detector = nativeDetector();
  const fromDetector: string[] = [];
  if (detector) {
    try {
      const bitmap = await createImageBitmap(file);
      const found = await detector.detect(bitmap);
      bitmap.close();
      fromDetector.push(...found.map((item) => item.rawValue.trim()).filter(Boolean));
    } catch {
      // The wasm reader below still runs.
    }
  }
  let fromZxing: string[] = [];
  try {
    const results = await readBarcodes(file, { formats: ["QRCode"], tryHarder: true, maxNumberOfSymbols: 255 });
    fromZxing = results.map((item) => item.text.trim()).filter(Boolean);
  } catch {
    fromZxing = [];
  }
  return [...new Set([...fromDetector, ...fromZxing])];
}

/** Reads every QR in a photo, then returns a JPEG of that photo to store. */
export async function prepareLabelPhoto(file: File, maxEdge = 2000, read = true) {
  const codes = read ? await codesInFile(file) : [];
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("This photo could not be read.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), codes };
}
