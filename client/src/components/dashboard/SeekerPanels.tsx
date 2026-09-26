import { useMemo } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { ArrowRight, Bookmark, Search, Zap } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useBookings, useSavedSearches } from "@/hooks/queries";
import { IN_FLIGHT } from "@/lib/bookings";
import { CATEGORY_LABEL, RESOURCE_CATEGORIES, type ResourceCategory } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { formatWindow } from "./format";

export function ActiveRequests() {
  const { data, isPending, isError, refetch } = useBookings("seeker");
  const active = useMemo(
    () => (data ?? []).filter((b) => IN_FLIGHT.includes(b.status)).sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime()),
    [data]
  );

  return (
    <section aria-labelledby="active-title" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="active-title" className="text-2xl tracking-tightest text-ink">
          Active <em>requests</em>
        </h2>
        <Link to="/requests" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text">
          All requests <ArrowRight className="size-4" />
        </Link>
      </div>
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : isError ? (
        <div className="surface space-y-3 p-6">
          <p className="text-text">Couldn&apos;t load your requests.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : active.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 px-6 py-12 text-center">
          <p className="font-display text-xl text-ink">Nothing in flight.</p>
          <p className="text-sm text-muted">Paste a WhatsApp message on Discover to get matched in seconds.</p>
          <Button asChild className="mt-2">
            <Link to="/discover">
              <Search /> Find a resource
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {active.map((b, i) => (
            <motion.li
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="surface p-4 md:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-text">{b.title}</p>
                  <p className="font-mono text-[11px] text-muted">
                    {b.ref} · sent {formatDistanceToNowStrict(parseISO(b.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <StatusPill status={b.status} />
              </div>
              <ul className="mt-3 space-y-1 text-[13px]">
                {b.lines.map((l) => (
                  <li key={l.resourceId} className="flex justify-between gap-3">
                    <span className="truncate text-text/85">
                      <span className="font-mono">{formatINR(l.quantity)}</span> × {l.resource.title}
                    </span>
                    <span className="shrink-0 font-mono text-muted">₹{formatINR(l.agreedPrice)}/unit</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <span className="font-mono text-xs text-muted">{formatWindow(b.startAt, b.endAt)}</span>
                <span className="font-mono text-sm tabular-nums text-text">₹{formatINR(b.total)}</span>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}

function describe(query: string) {
  const p = new URLSearchParams(query);
  const cat = p.get("category");
  const chips: string[] = [];
  if (cat && (RESOURCE_CATEGORIES as readonly string[]).includes(cat)) chips.push(CATEGORY_LABEL[cat as ResourceCategory]);
  if (p.get("qty")) chips.push(`×${p.get("qty")}`);
  if (p.get("area")) chips.push(p.get("area")!);
  if (p.get("maxPrice")) chips.push(`≤ ₹${formatINR(Number(p.get("maxPrice")))}`);
  return { chips, urgent: p.get("urgent") === "1" };
}

export function SavedSearches() {
  const { data, isPending, isError } = useSavedSearches();

  return (
    <section aria-labelledby="saved-title" className="space-y-4">
      <h2 id="saved-title" className="text-2xl tracking-tightest text-ink">
        Saved <em>searches</em>
      </h2>
      {isPending ? (
        <div className="h-[200px] animate-pulse rounded-lg border border-border bg-card" />
      ) : isError ? (
        <p className="text-sm text-muted">Couldn&apos;t load saved searches.</p>
      ) : data.length === 0 ? (
        <div className="surface px-6 py-10 text-center text-sm text-muted">Save a search on Discover to get alerts here.</div>
      ) : (
        <ul className="surface divide-y divide-border">
          {data.map((s) => {
            const { chips, urgent } = describe(s.query);
            return (
              <li key={s.id}>
                <Link to={`/discover?${s.query}`} className="group flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-paper/60">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-text">
                      <Bookmark className="size-3.5 text-primary" />
                      {s.name}
                      {s.newMatches > 0 && (
                        <span className="rounded-full bg-available/10 px-1.5 py-0.5 font-mono text-[10px] text-available">{s.newMatches} new</span>
                      )}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1">
                      {chips.map((c) => (
                        <span key={c} className="rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted">
                          {c}
                        </span>
                      ))}
                      {urgent && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-conflict/10 px-2 py-0.5 font-mono text-[10px] text-conflict">
                          <Zap className="size-2.5" /> urgent
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted group-hover:text-text">
                    Run <ArrowRight className="size-3.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
