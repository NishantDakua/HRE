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
import { DevErrorDetail } from "@/components/DevErrorDetail";

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
  const { data, isPending, isError, error, refetch } = useMyResources();

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
        <div className="surface space-y-3 p-6" data-testid="error-state">
          <p className="text-text">Couldn&apos;t load your listings.</p>
          <DevErrorDetail error={error} />
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : data.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 px-6 py-12 text-center">
          <PackageOpen className="size-6 text-muted" />
          <p className="font-display text-xl text-ink">No listings yet.</p>
          <p className="text-sm text-muted">Your idle chairs, vans and halls could be earning.</p>
          <Button className="mt-2" onClick={onAdd}>
            <Plus /> Add resource
          </Button>
        </div>
      ) : (
        <div className="surface overflow-hidden md:overflow-x-auto" data-lenis-prevent>
          <ul className="divide-y divide-border md:hidden">
            {data.map((r) => {
              const Icon = CATEGORY_ICON[r.category];
              return (
                <li key={r.id} className={cn("space-y-3 p-4", r.status === "PAUSED" && "opacity-60")}>
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sand">
                      <Icon className="size-4 text-ink/70" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link to={`/resource/${r.id}`} className="flex min-w-0 items-center gap-1 font-medium text-text">
                        <span className="truncate">{r.title}</span> <ArrowUpRight className="size-3 shrink-0 text-muted" />
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <PriceTag amount={r.price} unit={r.unit} size="sm" />
                        {r.pendingRequests > 0 && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                            {r.pendingRequests} pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">Stock</dt>
                      <dd className="mt-1 font-mono tabular-nums text-text">
                        {formatINR(r.available)}/{formatINR(r.quantity)} <span className="text-muted">{r.unitLabel}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">Utilization</dt>
                      <dd className="mt-1"><UtilisationBar value={r.utilisation} /></dd>
                    </div>
                  </dl>
                  <div className="overflow-hidden">
                    <p className="mb-1 text-[11px] uppercase tracking-[0.1em] text-muted">Next 14 days</p>
                    <ListingStrip resourceId={r.id} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <StatusToggle resource={r} />
                    <Button size="sm" variant="outline" onClick={() => onEdit(r)} aria-label={`Edit ${r.title}`}>
                      <Pencil /> Edit
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <table className="hidden w-full min-w-[860px] text-sm md:table">
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
                      <Button size="sm" variant="ghost" onClick={() => onEdit(r)} aria-label={`Edit ${r.title}`}>
                        <Pencil /> Edit
                      </Button>
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
      )}
    </section>
  );
}
