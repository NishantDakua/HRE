import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, Columns, X } from "lucide-react";
import { PriceTag } from "@/components/PriceTag";
import { MATCH_SIGNALS } from "@/lib/match";
import { cn, formatINR } from "@/lib/utils";
import type { Row } from "./rows";

export const MAX_COMPARE = 3;

type Best = "min" | "max";

interface Line {
  label: string;
  value: (r: Row) => number | undefined;
  render: (r: Row) => ReactNode;
  best?: Best;
}

const LINES: Line[] = [
  {
    label: "Distance",
    value: (r) => r.distanceKm,
    render: (r) => `${r.distanceKm.toFixed(1)} km`,
    best: "min",
  },
  {
    label: "Unit price",
    value: (r) => r.resource.price,
    render: (r) => <PriceTag amount={r.resource.price} unit={r.resource.unit} size="sm" />,
    best: "min",
  },
  {
    label: "Landed cost",
    value: (r) => r.landed,
    render: (r) =>
      r.landed === undefined ? (
        "—"
      ) : (
        <span>
          ₹{formatINR(r.landed)}
          <span className="block text-[11px] text-muted">
            ₹{formatINR(r.rental ?? 0)} + ₹{formatINR(r.delivery ?? 0)} delivery
          </span>
        </span>
      ),
    best: "min",
  },
  { label: "Covers", value: (r) => r.fulfils, render: (r) => (r.fulfils === undefined ? "—" : formatINR(r.fulfils)), best: "max" },
  {
    label: "Free now",
    value: (r) => r.resource.available,
    render: (r) => `${r.resource.available}/${r.resource.quantity} ${r.resource.unitLabel}`,
  },
  { label: "Min rental", value: (r) => r.resource.minRentalHours, render: (r) => `${r.resource.minRentalHours}h`, best: "min" },
  { label: "Rating", value: (r) => r.resource.business.rating, render: (r) => `★ ${r.resource.business.rating.toFixed(1)} (${r.resource.business.reviewCount})`, best: "max" },
  {
    label: "Replies",
    value: (r) => r.resource.business.avgResponseMins,
    render: (r) => `${Math.round(r.resource.business.responseRate * 100)}% · ~${r.resource.business.avgResponseMins}m`,
    best: "min",
  },
  { label: "Delivery", value: () => undefined, render: (r) => (r.resource.delivers ? "Delivers to venue" : "Pickup / on-site") },
  { label: "Match", value: (r) => r.total, render: (r) => (r.total === undefined ? "—" : `${r.total}%`), best: "max" },
];

function bestIndex(rows: Row[], line: Line): number {
  if (!line.best || rows.length < 2) return -1;
  const values = rows.map(line.value);
  if (values.some((v) => v === undefined)) return -1;
  const nums = values as number[];
  const target = line.best === "min" ? Math.min(...nums) : Math.max(...nums);
  return nums.filter((v) => v === target).length === 1 ? nums.indexOf(target) : -1;
}

interface CompareDockProps {
  items: Row[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function CompareDock({ items, onRemove, onClear }: CompareDockProps) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (items.length === 0) setOpen(false);
  }, [items.length]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {items.length > 0 && !open && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-4 bottom-tabbar z-40 mx-auto flex max-w-2xl items-center gap-2 rounded-full bg-ink p-2 pl-4 text-paper shadow-card-hover md:bottom-5"
            role="region"
            aria-label="Compare tray"
          >
            <ul className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
              {items.map((r) => (
                <li key={r.resource.id} className="flex min-w-0 items-center gap-1 rounded-full bg-paper/10 py-1 pl-3 pr-1 text-xs">
                  <span className="truncate">{r.resource.business.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(r.resource.id)}
                    aria-label={`Remove ${r.resource.business.name}`}
                    className="grid size-5 shrink-0 place-items-center rounded-full hover:bg-paper/20"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={onClear} className="shrink-0 px-2 text-xs text-paper/70 hover:text-paper">
              Clear
            </button>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-ink transition-colors hover:bg-paper"
            >
              <Columns className="size-4" />
              Compare {items.length}/{MAX_COMPARE}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.section
              key="drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="compare-title"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-[60] h-[100dvh] overflow-auto border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-card-hover md:h-auto md:max-h-[85vh] md:rounded-t-[22px]"
              data-lenis-prevent
            >
              <div className="container py-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 id="compare-title" className="text-2xl tracking-tightest text-ink">
                    Side by <em>side</em>
                  </h2>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close compare"
                    className="grid size-9 place-items-center rounded-full border border-border text-muted hover:text-text"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Phones: one card per provider, the same lines stacked. */}
                <ul className="mt-5 space-y-3 md:hidden" aria-label="Compared listings">
                  {items.map((r, i) => (
                    <li key={r.resource.id} className="rounded-lg border border-border bg-paper/60 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 font-medium text-ink">
                            <span className="truncate">{r.resource.business.name}</span>
                            {r.resource.business.verified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Verified" />}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {r.resource.title} · {r.resource.business.area}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemove(r.resource.id)}
                          aria-label={`Remove ${r.resource.business.name}`}
                          className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-text"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      <dl className="mt-3 divide-y divide-border text-sm">
                        {LINES.map((line) => {
                          const best = bestIndex(items, line) === i;
                          return (
                            <div key={line.label} className="flex items-baseline justify-between gap-3 py-2">
                              <dt className="text-xs text-muted">{line.label}</dt>
                              <dd className={cn("text-right font-mono tabular-nums text-text", best && "rounded bg-available/10 px-1.5 text-available")}>{line.render(r)}</dd>
                            </div>
                          );
                        })}
                      </dl>
                      <Link to={`/resource/${r.resource.id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-text underline-offset-4 hover:underline">
                        View listing <ArrowUpRight className="size-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr>
                        <th scope="col" className="w-36 pb-4 text-left align-bottom">
                          <span className="eyebrow">Provider</span>
                        </th>
                        {items.map((r) => (
                          <th key={r.resource.id} scope="col" className="px-3 pb-4 text-left align-bottom font-normal">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 font-medium text-ink">
                                  <span className="truncate">{r.resource.business.name}</span>
                                  {r.resource.business.verified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Verified" />}
                                </div>
                                <div className="truncate text-xs text-muted">
                                  {r.resource.title} · {r.resource.business.area}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => onRemove(r.resource.id)}
                                aria-label={`Remove ${r.resource.business.name}`}
                                className="grid size-6 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-text"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {LINES.map((line) => {
                        const best = bestIndex(items, line);
                        return (
                          <tr key={line.label}>
                            <th scope="row" className="border-t border-border py-3 pr-3 text-left text-xs font-medium text-muted">
                              {line.label}
                            </th>
                            {items.map((r, i) => (
                              <td
                                key={r.resource.id}
                                className={cn(
                                  "border-t border-border px-3 py-3 font-mono tabular-nums text-text",
                                  i === best && "bg-available/10 text-available"
                                )}
                              >
                                {line.render(r)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                      {MATCH_SIGNALS.map((s) => (
                        <tr key={s.key}>
                          <th scope="row" className="border-t border-border py-2 pr-3 text-left text-xs text-muted">
                            {s.label}
                          </th>
                          {items.map((r) => {
                            const v = r.score?.[s.key];
                            return (
                              <td key={r.resource.id} className="border-t border-border px-3 py-2">
                                {v === undefined ? (
                                  <span className="text-muted">—</span>
                                ) : (
                                  <span className="flex items-center gap-2">
                                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-border">
                                      <span
                                        className={cn("block h-full rounded-full", v >= 0.75 ? "bg-available" : v >= 0.5 ? "bg-accent" : "bg-conflict")}
                                        style={{ width: `${v * 100}%` }}
                                      />
                                    </span>
                                    <span className="font-mono text-[11px] tabular-nums text-muted">{Math.round(v * 100)}</span>
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr>
                        <td />
                        {items.map((r) => (
                          <td key={r.resource.id} className="px-3 pt-4">
                            <Link
                              to={`/resource/${r.resource.id}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-text underline-offset-4 hover:underline"
                            >
                              View listing <ArrowUpRight className="size-3.5" />
                            </Link>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
