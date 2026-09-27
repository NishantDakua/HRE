import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Plus, Truck } from "lucide-react";
import { ResourceCard } from "@/components/ResourceCard";
import { cn, formatINR } from "@/lib/utils";
import type { Row } from "./rows";

interface MatchListProps {
  rows: Row[];
  needed?: number;
  urgent?: boolean;
  hoveredId: string | null;
  compareIds: string[];
  onHover: (id: string | null) => void;
  onToggleCompare: (id: string) => void;
}

function LandedCost({ row, needed }: { row: Row; needed?: number }) {
  const r = row.resource;
  if (row.landed === undefined) {
    return (
      <div className="flex items-center justify-between text-[13px]">
        <span className="inline-flex items-center gap-1.5 text-muted">
          <Truck className="size-3.5" strokeWidth={1.75} />
          {r.delivers ? "Delivers to venue" : "Pickup / on-site"}
        </span>
        <DetailsLink id={r.id} />
      </div>
    );
  }
  const partial = needed !== undefined && (row.fulfils ?? 0) < needed;
  return (
    <div className="rounded-md border border-border bg-paper/70 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted">Landed cost</span>
        <span className="font-mono text-base tabular-nums text-text">₹{formatINR(row.landed)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 font-mono text-[11px] tabular-nums text-muted">
        <span>
          ₹{formatINR(row.rental ?? 0)} rental +{" "}
          {row.delivery ? `₹${formatINR(row.delivery)} delivery` : r.delivers ? "free delivery" : "pickup"}
        </span>
        {needed !== undefined && (
          <span className={cn("rounded-full px-1.5 py-0.5", partial ? "bg-primary/10 text-primary" : "bg-available/10 text-available")}>
            covers {formatINR(row.fulfils ?? 0)}/{formatINR(needed)}
          </span>
        )}
      </div>
      <div className={cn("mt-2 flex items-center gap-3", row.overBudgetBy ? "justify-between" : "justify-end")}>
        {!!row.overBudgetBy && (
          <span className="rounded-full bg-conflict/10 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-conflict">
            ₹{formatINR(row.overBudgetBy)} over budget
          </span>
        )}
        <DetailsLink id={r.id} />
      </div>
    </div>
  );
}

function DetailsLink({ id }: { id: string }) {
  return (
    <Link to={`/resource/${id}`} className="inline-flex items-center gap-1 text-xs font-medium text-text underline-offset-4 hover:underline">
      Details <ArrowUpRight className="size-3.5" />
    </Link>
  );
}

export function MatchList({ rows, needed, urgent, hoveredId, compareIds, onHover, onToggleCompare }: MatchListProps) {
  return (
    <LayoutGroup>
      <motion.ol layout className="grid gap-4 2xl:grid-cols-2" aria-label="Results">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((row, i) => {
            const id = row.resource.id;
            const comparing = compareIds.includes(id);
            return (
              <motion.li
                key={id}
                id={`match-${id}`}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
              >
                <ResourceCard
                  resource={row.resource}
                  score={row.score}
                  total={row.total}
                  breakdown
                  urgent={urgent}
                  distanceKm={row.distanceKm}
                  rank={row.score ? i + 1 : undefined}
                  highlighted={hoveredId === id}
                  onHoverChange={(h) => onHover(h ? id : null)}
                  actions={
                    <button
                      type="button"
                      aria-pressed={comparing}
                      aria-label={comparing ? "Remove from compare" : "Add to compare"}
                      onClick={() => onToggleCompare(id)}
                      className={cn(
                        "grid size-7 place-items-center rounded-full border transition-colors",
                        comparing ? "border-ink bg-ink text-paper" : "border-border text-muted hover:border-ink/40 hover:text-text"
                      )}
                    >
                      {comparing ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                    </button>
                  }
                  extra={<LandedCost row={row} needed={needed} />}
                />
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ol>
    </LayoutGroup>
  );
}

export function MatchListSkeleton() {
  return (
    <div className="grid gap-4 2xl:grid-cols-2" aria-busy="true" aria-label="Loading matches">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="flex justify-between">
            <div className="h-3 w-24 animate-pulse rounded bg-surface" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-surface" />
          </div>
          <div className="h-6 w-2/3 animate-pulse rounded bg-surface" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-surface" />
          <div className="h-12 animate-pulse rounded-md bg-surface" />
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 5 }).map((__, j) => (
              <div key={j} className="h-1.5 animate-pulse rounded-full bg-surface" />
            ))}
          </div>
          <div className="h-14 animate-pulse rounded-md bg-surface" />
        </div>
      ))}
    </div>
  );
}
