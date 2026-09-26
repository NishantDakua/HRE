import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LISTING_PHOTO_LABEL, LISTING_PHOTO_POSITIONS, type ListingPhotoPosition } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { PhotosValues } from "./schemas";

function fingerprint(dataUrl: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("Could not read the photo"));
      context.drawImage(image, 0, 0, 16, 16);
      const pixels = context.getImageData(0, 0, 16, 16).data;
      const grays: number[] = [];
      for (let i = 0; i < pixels.length; i += 4) grays.push(pixels[i] * 0.3 + pixels[i + 1] * 0.59 + pixels[i + 2] * 0.11);
      const average = grays.reduce((sum, value) => sum + value, 0) / grays.length;
      resolve(grays.map((value) => (value > average ? "1" : "0")).join(""));
    };
    image.onerror = () => reject(new Error("Could not read the photo"));
    image.src = dataUrl;
  });
}

function tooClose(a: string, b: string) {
  let differ = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differ += 1;
  return differ < 48;
}

function snap(video: HTMLVideoElement) {
  const scale = Math.min(1, 1280 / (video.videoWidth || 1280));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((video.videoWidth || 1280) * scale));
  canvas.height = Math.max(1, Math.round((video.videoHeight || 720) * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not take the photo");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function PhotosStep({
  initial,
  onNext,
  onBack,
}: {
  initial?: PhotosValues["photos"];
  onNext: (photos: PhotosValues["photos"]) => void;
  onBack: () => void;
}) {
  const [shots, setShots] = useState<Partial<Record<ListingPhotoPosition, string>>>(() =>
    Object.fromEntries((initial ?? []).filter((photo) => photo.dataUrl).map((photo) => [photo.position, photo.dataUrl]))
  );
  const [prints, setPrints] = useState<Partial<Record<ListingPhotoPosition, string>>>({});
  const [active, setActive] = useState<ListingPhotoPosition | null>(null);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    LISTING_PHOTO_POSITIONS.forEach((position) => {
      const shot = shots[position];
      if (!shot) return;
      fingerprint(shot)
        .then((print) => {
          if (!cancelled) setPrints((current) => ({ ...current, [position]: print }));
        })
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // Existing shots are fingerprinted once, so a retake can be compared with them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setError("");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      })
      .catch(() => setError("Allow the camera to continue. A file saved from Google or Amazon cannot be attached."));
    return () => {
      cancelled = true;
    };
  }, [active]);

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(null);
  };

  const capture = async () => {
    if (!active || !videoRef.current || videoRef.current.readyState < 2 || videoRef.current.videoWidth < 2) return;
    const dataUrl = snap(videoRef.current);
    const print = await fingerprint(dataUrl);
    const clash = LISTING_PHOTO_POSITIONS.find((position) => position !== active && prints[position] && tooClose(prints[position], print));
    if (clash) {
      setError(`This looks like the ${LISTING_PHOTO_LABEL[clash].title.toLowerCase()} shot. Move, then take the ${LISTING_PHOTO_LABEL[active].title.toLowerCase()}.`);
      return;
    }
    setPrints((current) => ({ ...current, [active]: print }));
    setShots((current) => ({ ...current, [active]: dataUrl }));
    setError("");
    closeCamera();
  };

  const ready = LISTING_PHOTO_POSITIONS.every((position) => shots[position]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready) {
          setError("Take all three photos before continuing.");
          return;
        }
        onNext(LISTING_PHOTO_POSITIONS.map((position) => ({ position, dataUrl: shots[position]! })));
      }}
      className="space-y-4"
    >
      <p className="text-sm text-muted">
        Three live photos, each from a different position. The camera opens here, so a picture saved from Google or Amazon cannot be used.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {LISTING_PHOTO_POSITIONS.map((position, index) => {
          const shot = shots[position];
          const label = LISTING_PHOTO_LABEL[position];
          return (
            <button
              key={position}
              type="button"
              onClick={() => setActive(position)}
              className={cn(
                "overflow-hidden rounded-md border text-left transition-colors",
                active === position ? "border-primary" : "border-border hover:border-primary/40"
              )}
            >
              <span className="relative grid aspect-[4/3] place-items-center bg-paper">
                {shot ? <img src={shot} alt="" className="absolute inset-0 size-full object-cover" /> : <Camera className="size-5 text-muted" />}
              </span>
              <span className="block px-2.5 py-2">
                <span className="block text-xs font-medium text-text">
                  {index + 1}. {label.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted">{shot ? "Retake" : label.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="space-y-3 rounded-md border border-border bg-paper/70 p-3">
          <p className="text-sm text-text">
            Taking the <em>{LISTING_PHOTO_LABEL[active].title.toLowerCase()}</em> — {LISTING_PHOTO_LABEL[active].hint}
          </p>
          <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full rounded-md bg-ink object-cover" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeCamera}>
              Cancel
            </Button>
            <Button type="button" onClick={capture}>
              <Camera /> Take photo
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-conflict" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
        <Button type="submit" disabled={!ready}>
          Continue
        </Button>
      </div>
    </form>
  );
}
