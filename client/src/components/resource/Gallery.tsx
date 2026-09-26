import { ImageIcon } from "lucide-react";
import { CATEGORY_ART, CATEGORY_TINT } from "@/components/landing/CategoryArt";
import type { ResourceWithBusiness } from "@/lib/types";

/** Placeholder gallery until listings support photo uploads. */
export function Gallery({ resource }: { resource: ResourceWithBusiness }) {
  const Art = CATEGORY_ART[resource.category];
  const tint = CATEGORY_TINT[resource.category];
  return (
    <div className="grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-lg" aria-label="Photos">
      <div className="relative col-span-4 row-span-2 grid aspect-[16/9] place-items-center sm:col-span-3" style={{ background: tint }}>
        <div className="h-[78%] w-[78%] max-w-[420px]">
          <Art />
        </div>
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1 text-xs text-muted shadow-card">
          <ImageIcon className="size-3.5" /> Photos coming soon
        </span>
      </div>
      {[0.55, 0.35].map((o) => (
        <div
          key={o}
          className="relative hidden place-items-center sm:grid"
          style={{ background: `color-mix(in srgb, ${tint} ${Math.round(o * 100)}%, hsl(var(--paper)))` }}
          aria-hidden
        >
          <ImageIcon className="size-6 text-ink/20" />
        </div>
      ))}
    </div>
  );
}
