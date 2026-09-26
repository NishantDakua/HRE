import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/PriceTag";
import { cn, formatINR } from "@/lib/utils";
import type { BundlePlan } from "./rows";

interface BundleBannerProps {
  plan: BundlePlan;
  unitLabel: string;
  pending: boolean;
  onAccept: () => void;
}

const TONES = ["bg-primary", "bg-available", "bg-pending"];

export function BundleBanner({ plan, unitLabel, pending, onAccept }: BundleBannerProps) {
  const complete = plan.covered >= plan.needed;
  const split = plan.parts.map((p) => formatINR(p.quantity)).join(" + ");

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      aria-label="Split fulfilment"
      className="rounded-lg border-2 border-available/40 bg-mint/30 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow inline-flex items-center gap-1.5 text-peacock">
            <Layers className="size-3.5" /> No single provider has {formatINR(plan.needed)} {unitLabel}
          </p>
          <h2 className="mt-2 font-display text-2xl leading-tight text-ink">
            Bundle {plan.parts.length} providers: {split} {unitLabel}
            {!complete && <span className="text-muted"> ({formatINR(plan.covered)} of {formatINR(plan.needed)})</span>}
          </h2>
          <div className="mt-2 flex items-baseline gap-2 text-sm text-muted">
            <PriceTag amount={plan.total} size="md" /> total, landed
          </div>
        </div>
        <Button size="lg" onClick={onAccept} disabled={pending}>
          {pending ? "Requesting…" : "Accept Bundle"}
        </Button>
      </div>

      <div className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-card">
        {plan.parts.map((p, i) => (
          <motion.span
            key={p.row.resource.id}
            className={cn("h-full", TONES[i % TONES.length])}
            initial={{ width: 0 }}
            animate={{ width: `${(p.quantity / plan.needed) * 100}%` }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
      <ul className="mt-3 grid gap-1.5 text-[13px] sm:grid-cols-2">
        {plan.parts.map((p, i) => (
          <li key={p.row.resource.id} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-text/85">
              <span className={cn("size-2 shrink-0 rounded-full", TONES[i % TONES.length])} />
              <span className="truncate">{p.row.resource.business.name}</span>
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
              ×{formatINR(p.quantity)} · ₹{formatINR(p.cost)}
            </span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
