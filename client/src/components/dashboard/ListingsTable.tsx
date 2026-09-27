import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, PackageOpen, Pencil, Plus } from "lucide-react";
import { CATEGORY_ICON } from "@/components/ResourceCard";
import { PriceTag } from "@/components/PriceTag";
import { Button } from "@/components/ui/button";
import { useMyResources, useUpdateResource } from "@/hooks/queries";
import type { MyResource } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { ListingStrip } from "./ListingStrip";

function UtilisationBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Utilization">
        <motion.span
          className={cn("block h-full rounded-full", pct >= 50 ? "bg-available" : pct >= 20 ? "bg-marigold" : "bg-conflict/70")}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className="w-9 font-mono text-xs tabular-nums text-text">{pct}%</span>
    </div>
  );
}

function StatusToggle({ resource }: { resource: MyResource }) {
  const update = useUpdateResource();
  const live = resource.status === "ACTIVE";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={live}
      aria-label={`${resource.title}: ${live ? "live" : "paused"}`}
      onClick={() => update.mutate({ id: resource.id, patch: { status: live ? "PAUSED" : "ACTIVE" } })}
      className="inline-flex items-center gap-2 text-xs"
    >
      <span className={cn("relative h-5 w-9 rounded-full transition-colors", live ? "bg-peacock" : "bg-border")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-card shadow transition-all", live ? "left-[18px]" : "left-0.5")} />
      </span>
      <span className={live ? "text-available" : "text-muted"}>{live ? "Live" : "Paused"}</span>
    </button>
  );
}

export function ListingsTable({ onAdd, onEdit }: { onAdd: () => void; onEdit: (r: MyResource) => void }) {
  const { data, isPending, isError, refetch } = useMyResources();

  return (
    <section aria-labelledby="listings-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="listings-title" className="text-2xl tracking-tightest text-ink">
          My <em>listings</em>
        </h2>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus /> Add resource
        </Button>
      </div>

      {isPending ? (
        <div className="h-[220px] animate-pulse rounded-lg border border-border bg-card" aria-busy="true" aria-label="Loading listings" />
      ) : isError ? (
        <div className="surface space-y-3 p-6">
          <p className="text-text">Couldn&apos;t load your listings.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : data.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 px-6 py-12 text-center">
          <PackageOpen className="size-6 text-muted" />
          <p className="font-display text-xl text-ink">Nothing listed yet.</p>
          <p className="text-sm text-muted">Your idle chairs, vans and halls could be earning.</p>
          <Button className="mt-2" onClick={onAdd}>
            <Plus /> List your first resource
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {data.map((r) => {
              const Icon = CATEGORY_ICON[r.category];
              return (
                <div key={r.id} className={cn("surface space-y-3 p-4", r.status === "PAUSED" && "opacity-60")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sand">
                        <Icon className="size-4 text-ink/70" strokeWidth={1.5} />
                      </span>
                      <div className="min-w-0">
                        <Link to={`/resource/${r.id}`} className="inline-flex items-center gap-1 font-medium text-text hover:underline text-sm">
                          {r.title} <ArrowUpRight className="size-3 text-muted" />
                        </Link>
                        {r.pendingRequests > 0 && (
                          <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                            {r.pendingRequests} pending
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link to={`/labels/${r.id}`} className="text-xs text-muted hover:text-text">
                        Labels
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => onEdit(r)} aria-label={`Edit ${r.title}`}>
                        <Pencil />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted mb-1">Price</p>
                      <PriceTag amount={r.price} unit={r.unit} size="sm" />
                    </div>
                    <div>
                      <p className="text-muted mb-1">Stock</p>
                      <p className="font-mono tabular-nums text-text">
                        {formatINR(r.available)}/{formatINR(r.quantity)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted mb-1">Utilization</p>
                      <UtilisationBar value={r.utilisation} />
                    </div>
                    <div>
                      <p className="text-muted mb-1">Status</p>
                      <StatusToggle resource={r} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted mb-2">Next 14 days</p>
                    <ListingStrip resourceId={r.id} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block surface overflow-x-auto" data-lenis-prevent>
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.1em] text-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Listing</th>
                  <th scope="col" className="px-3 py-3 font-medium">Price</th>
                  <th scope="col" className="px-3 py-3 font-medium">Stock</th>
                  <th scope="col" className="px-3 py-3 font-medium">Utilization</th>
                  <th scope="col" className="px-3 py-3 font-medium">Next 14 days</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => {
                  const Icon = CATEGORY_ICON[r.category];
                  return (
                    <tr key={r.id} className={cn("border-b border-border last:border-0", r.status === "PAUSED" && "opacity-60")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sand">
                            <Icon className="size-4 text-ink/70" strokeWidth={1.5} />
                          </span>
                          <div className="min-w-0">
                            <Link to={`/resource/${r.id}`} className="inline-flex items-center gap-1 font-medium text-text hover:underline">
                              {r.title} <ArrowUpRight className="size-3 text-muted" />
                            </Link>
                            {r.pendingRequests > 0 && (
                              <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                                {r.pendingRequests} pending
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <PriceTag amount={r.price} unit={r.unit} size="sm" />
                      </td>
                      <td className="px-3 py-3 font-mono text-xs tabular-nums text-text">
                        {formatINR(r.available)}/{formatINR(r.quantity)} <span className="text-muted">{r.unitLabel}</span>
                      </td>
                      <td className="px-3 py-3">
                        <UtilisationBar value={r.utilisation} />
                      </td>
                      <td className="px-3 py-3">
                        <ListingStrip resourceId={r.id} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusToggle resource={r} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/labels/${r.id}`} className="px-2 text-xs text-muted hover:text-text">
                            Labels
                          </Link>
                          <Button size="sm" variant="ghost" onClick={() => onEdit(r)} aria-label={`Edit ${r.title}`}>
                            <Pencil /> Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-2 rounded-[2px] bg-available/25" /> free</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-2 rounded-[2px] bg-marigold/50" /> partly booked</span>
              <span className="inline-flex items-center gap-1.5"><span className="conflict-stripes h-3 w-2 rounded-[2px] bg-conflict/25" /> fully booked</span>
            </p>
          </div>
        </>
      )}
    </section>
  );
}
