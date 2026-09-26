import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { differenceInSeconds, formatDistanceToNowStrict, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, Inbox, MapPin, RefreshCw, Search } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { formatWindow } from "@/components/dashboard/format";
import { NegotiationThread } from "@/components/requests/NegotiationThread";
import { RequestTimeline } from "@/components/requests/RequestTimeline";
import { ReviewPanel } from "@/components/requests/ReviewForm";
import { Button } from "@/components/ui/button";
import { useBooking, useBookings } from "@/hooks/queries";
import { ACTIONABLE } from "@/lib/bookings";
import { BOOKING_STATUSES, BOOKING_STATUS_LABEL, type BookingDetail, type BookingStatus, type Role } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { useAppStore } from "@/store/app";

type Tab = "ALL" | BookingStatus;
const isTab = (v: string | null): v is Tab => v === "ALL" || (BOOKING_STATUSES as readonly string[]).includes(v ?? "");

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

function RequestListItem({ b, mode, active, onSelect }: { b: BookingDetail; mode: Role; active: boolean; onSelect: () => void }) {
  const other = mode === "seeker" ? b.provider : b.seeker;
  const last = b.offers.at(-1);
  const me = mode === "seeker" ? b.seekerId : b.provider.id;
  const yourMove = ACTIONABLE.includes(b.status) && last?.status === "OPEN" && last.fromBusinessId !== me;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "relative w-full rounded-lg border p-3.5 text-left transition-colors",
          active ? "border-ink/30 bg-card shadow-card" : "border-transparent hover:border-border hover:bg-card/60"
        )}
      >
        {active && <motion.span layoutId="req-active" className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-primary" />}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text">{b.title}</p>
            <p className="truncate text-xs text-muted">
              {other.name} · <span className="font-mono">{b.ref}</span>
            </p>
          </div>
          <StatusPill status={b.status} className="shrink-0" />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[11px] text-muted">
          <span className="truncate">{formatWindow(b.startAt, b.endAt)}</span>
          <span className="tabular-nums text-text">₹{formatINR(b.total)}</span>
        </div>
        {yourMove && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-marigold/25 px-2 py-0.5 text-[11px] text-ink">
            <span className="size-1.5 rounded-full bg-terracotta" /> Your move
          </span>
        )}
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

function LiveBadge({ updatedAt, fetching }: { updatedAt: number; fetching: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const secs = updatedAt ? Math.max(0, differenceInSeconds(now, updatedAt)) : 0;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted" aria-live="off">
      <span className="relative flex size-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-available/50 motion-reduce:animate-none" />
        <span className="relative size-2 rounded-full bg-available" />
      </span>
      Live · {fetching ? "syncing…" : `updated ${secs}s ago`}
    </span>
  );
}

function RequestDetail({ id, mode, onBack }: { id: string; mode: Role; onBack: () => void }) {
  const { data: b, isPending, isError, refetch, dataUpdatedAt, isFetching } = useBooking(id, { refetchInterval: 5000 });

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-24 animate-pulse rounded-lg bg-card" />
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="h-72 animate-pulse rounded-lg bg-card" />
          <div className="h-72 animate-pulse rounded-lg bg-card" />
        </div>
      </div>
    );
  }
  if (isError || !b) {
    return (
      <div className="surface space-y-3 p-6">
        <p className="text-text">Couldn&apos;t load this request.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw /> Try again
        </Button>
      </div>
    );
  }

  const other = mode === "seeker" ? b.provider : b.seeker;
  return (
    <motion.article key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted hover:text-text lg:hidden">
        <ArrowLeft className="size-4" /> All requests
      </button>

      <header className="surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={b.status} />
              <span className="font-mono text-[11px] text-muted">{b.ref}</span>
              <LiveBadge updatedAt={dataUpdatedAt} fetching={isFetching} />
            </div>
            <h2 className="mt-2 text-2xl leading-tight tracking-tightest text-ink md:text-3xl">{b.title}</h2>
            <p className="mt-1 inline-flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1 text-text">
                {mode === "seeker" ? "with" : "from"} {other.name}
                {other.verified && <BadgeCheck className="size-3.5 text-primary" aria-label="Verified" />}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                <MapPin className="size-3" /> {b.distanceKm} km
              </span>
              <span>· opened {formatDistanceToNowStrict(parseISO(b.createdAt), { addSuffix: true })}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow">Total</p>
            <p className="font-mono text-2xl tabular-nums text-ink">₹{formatINR(b.total)}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-1 border-t border-border pt-3 text-sm">
          {b.lines.map((l) => (
            <p key={l.resourceId} className="flex flex-wrap justify-between gap-2">
              <Link to={`/resource/${l.resourceId}`} className="text-text underline-offset-4 hover:underline">
                <span className="font-mono tabular-nums">{formatINR(l.quantity)}</span> × {l.resource.title}
              </Link>
              <span className="font-mono text-xs text-muted">
                ₹{formatINR(l.agreedPrice)}
                {l.agreedPrice !== l.listPrice && <span className="ml-1 line-through">₹{formatINR(l.listPrice)}</span>}
              </span>
            </p>
          ))}
          <p className="font-mono text-xs text-muted">{formatWindow(b.startAt, b.endAt)}</p>
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <h3 className="eyebrow mb-4">Status</h3>
          <RequestTimeline booking={b} />
        </aside>
        <div className="space-y-8">
          <NegotiationThread booking={b} mode={mode} />
          {b.status === "COMPLETED" && <ReviewPanel booking={b} mode={mode} />}
        </div>
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function RequestsPage() {
  const mode = useAppStore((s) => s.mode);
  const { data, isPending, isError, refetch } = useBookings(mode);
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("status");
  const tab: Tab = isTab(rawTab) ? rawTab : "ALL";
  const selectedId = params.get("id") ?? undefined;
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0])) as Record<BookingStatus, number>;
    (data ?? []).forEach((b) => (c[b.status] += 1));
    return c;
  }, [data]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? [])
      .filter((b) => tab === "ALL" || b.status === tab)
      .filter((b) => !needle || [b.title, b.ref, b.seeker.name, b.provider.name].some((s) => s.toLowerCase().includes(needle)))
      .sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [data, tab, q]);

  const update = (patch: Record<string, string | undefined>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        return next;
      },
      { replace: true }
    );

  // Drop a selection that isn't in this mode's list (e.g. after switching seeker ↔ provider).
  useEffect(() => {
    if (selectedId && data && !data.some((b) => b.id === selectedId)) update({ id: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, data]);

  // Desktop: auto-select the first request so the detail pane is never empty.
  useEffect(() => {
    if (selectedId || !list.length) return;
    if (window.matchMedia("(min-width: 1024px)").matches) update({ id: list[0].id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, list]);

  const tabs: Tab[] = ["ALL", ...BOOKING_STATUSES.filter((s) => counts[s] > 0 || s === tab)];

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">{mode === "provider" ? "Incoming" : "Outgoing"} · Requests</p>
        <h1 className="mt-2 text-4xl leading-[1.05] tracking-tightest md:text-5xl">
          Every <em>deal</em>, in one thread.
        </h1>
      </header>

      <div role="tablist" aria-label="Filter by status" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {tabs.map((t) => {
          const count = t === "ALL" ? data?.length ?? 0 : counts[t];
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => update({ status: t === "ALL" ? undefined : t, id: undefined })}
              className={cn(
                "relative h-9 shrink-0 rounded-full px-3.5 text-sm transition-colors",
                active ? "text-paper" : "text-muted hover:text-text"
              )}
            >
              {active && <motion.span layoutId="req-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <span className="relative">
                {t === "ALL" ? "All" : BOOKING_STATUS_LABEL[t]} <span className={cn("font-mono text-[11px]", active ? "text-paper/70" : "text-muted")}>{count}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className={cn("space-y-3", selectedId && "hidden lg:block")}>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, ref or business"
              aria-label="Search requests"
              className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm text-text placeholder:text-muted/60"
            />
          </label>

          {isPending ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading requests">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[92px] animate-pulse rounded-lg bg-card" />
              ))}
            </div>
          ) : isError ? (
            <div className="surface space-y-3 p-5">
              <p className="text-sm text-text">Couldn&apos;t load requests.</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center">
              <span className="grid size-11 place-items-center rounded-full bg-mint/40">
                <Inbox className="size-5 text-peacock" />
              </span>
              <p className="font-display text-lg text-ink">Nothing here.</p>
              <p className="text-sm text-muted">{q ? "No requests match that search." : "No requests with this status yet."}</p>
              {mode === "seeker" && (
                <Button asChild size="sm" variant="outline" className="mt-1">
                  <Link to="/discover">Find resources</Link>
                </Button>
              )}
            </div>
          ) : (
            <ul className="max-h-[calc(100vh-18rem)] space-y-1 overflow-y-auto pr-1 lg:sticky lg:top-24">
              <AnimatePresence initial={false}>
                {list.map((b) => (
                  <RequestListItem key={b.id} b={b} mode={mode} active={b.id === selectedId} onSelect={() => update({ id: b.id })} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <div className={cn(!selectedId && "hidden lg:block")}>
          {selectedId ? (
            <RequestDetail id={selectedId} mode={mode} onBack={() => update({ id: undefined })} />
          ) : (
            !isPending && (
              <div className="grid h-full min-h-[300px] place-items-center rounded-lg border border-dashed border-border text-sm text-muted">
                Select a request to see its thread.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
