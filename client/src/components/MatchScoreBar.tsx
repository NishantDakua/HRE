import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MATCH_SIGNALS, MATCH_WEIGHTS, URGENT_WEIGHTS } from "@/lib/match";
import type { MatchScore } from "@/lib/types";

const SEGMENTS: { key: keyof MatchScore; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "distance", label: "Distance" },
  { key: "availability", label: "Avail." },
  { key: "capacity", label: "Capacity" },
  { key: "reliability", label: "Reliability" },
];

function toneFor(v: number): string {
  if (v >= 0.75) return "bg-available";
  if (v >= 0.5) return "bg-accent";
  return "bg-conflict";
}

export function overallScore(score: MatchScore): number {
  const vals = SEGMENTS.map((s) => score[s.key]);
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
}

interface MatchScoreBarProps {
  score: MatchScore;
  /** Weighted total from the matcher; falls back to the plain average. */
  total?: number;
  showLabels?: boolean;
  showTotal?: boolean;
  compact?: boolean;
  /** Show a hover/focus tooltip explaining each signal's contribution. */
  breakdown?: boolean;
  urgent?: boolean;
  className?: string;
}

function Breakdown({ id, score, total, urgent }: { id: string; score: MatchScore; total: number; urgent?: boolean }) {
  const weights = urgent ? URGENT_WEIGHTS : MATCH_WEIGHTS;
  return (
    <motion.div
      id={id}
      role="tooltip"
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="absolute bottom-full left-0 z-30 mb-2 w-64 rounded-md border border-border bg-card p-3 text-left shadow-card-hover"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-medium text-text">Why {total}%</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{urgent ? "urgent weights" : "weights"}</span>
      </div>
      <table className="w-full text-[11px]">
        <tbody>
          {MATCH_SIGNALS.map((s) => {
            const v = Math.max(0, Math.min(1, score[s.key]));
            return (
              <tr key={s.key}>
                <td className="py-0.5 pr-2 text-muted">{s.label}</td>
                <td className="w-16 py-0.5 pr-2">
                  <span className="block h-1 overflow-hidden rounded-full bg-border">
                    <span className={cn("block h-full rounded-full", toneFor(v))} style={{ width: `${v * 100}%` }} />
                  </span>
                </td>
                <td className="py-0.5 pr-2 text-right font-mono tabular-nums text-text">{Math.round(v * 100)}</td>
                <td className="py-0.5 text-right font-mono tabular-nums text-muted">×{weights[s.key].toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </motion.div>
  );
}

export function MatchScoreBar({
  score,
  total: weighted,
  showLabels = true,
  showTotal = true,
  compact,
  breakdown = false,
  urgent,
  className,
}: MatchScoreBarProps) {
  const total = weighted ?? overallScore(score);
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const root = useRef<HTMLDivElement>(null);
  // Mouse opens on hover; touch and pen toggle on tap (no hover to rely on).
  const byTouch = useRef(false);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const interactive = breakdown
    ? {
        tabIndex: 0,
        role: "button",
        "aria-expanded": open,
        "aria-label": `Match ${total}%: show score breakdown`,
        "aria-describedby": open ? tipId : undefined,
        onPointerDown: (e: React.PointerEvent) => void (byTouch.current = e.pointerType !== "mouse"),
        onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setOpen(true),
        onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && setOpen(false),
        onFocus: () => !byTouch.current && setOpen(true),
        onBlur: () => setOpen(false),
        onClick: (e: React.MouseEvent) => {
          if (!byTouch.current) return;
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Escape") setOpen(false);
          else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        },
      }
    : {};

  return (
    <div
      ref={root}
      className={cn("relative w-full", breakdown && "cursor-help rounded-sm outline-offset-4 touch:py-3", className)}
      {...interactive}
    >
      <AnimatePresence>{breakdown && open && <Breakdown id={tipId} score={score} total={total} urgent={urgent} />}</AnimatePresence>
      {showTotal && (
        <div className="mb-2 flex items-baseline justify-between">
          <span className="eyebrow">Match</span>
          <span className="font-mono text-sm tabular-nums text-text">
            {total}
            <span className="text-muted">%</span>
          </span>
        </div>
      )}
      <div className="grid grid-cols-5 gap-1">
        {SEGMENTS.map((seg, i) => {
          const v = Math.max(0, Math.min(1, score[seg.key]));
          return (
            <div key={seg.key} className="min-w-0" title={`${seg.label}: ${Math.round(v * 100)}%`}>
              <div className={cn("overflow-hidden rounded-full bg-border", compact ? "h-1" : "h-1.5")}>
                <motion.div
                  className={cn("h-full rounded-full", toneFor(v))}
                  initial={{ width: 0 }}
                  animate={{ width: `${v * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              {showLabels && (
                <div className="mt-1.5 truncate text-[10px] uppercase tracking-[0.08em] text-muted">{seg.label}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
