import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { BadgeCheck, Check, Inbox, MapPin, MessageSquare, Reply, X, Zap } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useBookings, useRespondBooking } from "@/hooks/queries";
import { ACTIONABLE } from "@/lib/bookings";
import type { BookingDetail } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { formatWindow } from "./format";

/* ------------------------------------------------------------------ */
/* Counter form                                                        */
/* ------------------------------------------------------------------ */

function makeCounterSchema(offered: number, list: number) {
  return z.object({
    price: z
      .number({ invalid_type_error: "Enter a price" })
      .int("Whole rupees only")
      .gt(offered, `Counter above their offer of ₹${formatINR(offered)}`)
      .lte(Math.round(list * 1.5), `Keep it within 1.5× your list price (₹${formatINR(Math.round(list * 1.5))})`),
    message: z.string().trim().max(200, "Keep it under 200 characters").optional(),
  });
}
type CounterValues = z.infer<ReturnType<typeof makeCounterSchema>>;

function CounterForm({ booking, onDone }: { booking: BookingDetail; onDone: () => void }) {
  const line = booking.lines[0];
  const respond = useRespondBooking();
  const schema = useMemo(() => makeCounterSchema(line.agreedPrice, line.listPrice), [line.agreedPrice, line.listPrice]);
  const suggested = Math.min(line.listPrice, Math.round((line.agreedPrice + line.listPrice) / 2 / 10) * 10);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CounterValues>({
    resolver: zodResolver(schema),
    defaultValues: { price: suggested > line.agreedPrice ? suggested : line.agreedPrice + 10 },
  });
  const price = watch("price");
  const total = Number.isFinite(price) ? price * line.quantity : 0;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) => {
        respond.mutate({ id: booking.id, action: "counter", price: v.price, message: v.message || undefined });
        onDone();
      })}
      className="mt-4 grid gap-3 rounded-md border border-border bg-paper/70 p-3 sm:grid-cols-[160px_1fr_auto] sm:items-start"
      aria-label={`Counter ${booking.ref}`}
    >
      <label className="space-y-1">
        <span className="text-[11px] text-muted">Your price / unit (₹)</span>
        <input
          type="number"
          inputMode="numeric"
          autoFocus
          aria-invalid={!!errors.price}
          className={cn(
            "h-9 w-full rounded-md border bg-card px-2.5 font-mono text-sm text-text",
            errors.price ? "border-conflict/60" : "border-border"
          )}
          {...register("price", { valueAsNumber: true })}
        />
        <span className="block font-mono text-[11px] text-muted">= ₹{formatINR(total)} total</span>
      </label>
      <label className="space-y-1">
        <span className="text-[11px] text-muted">Message (optional)</span>
        <input
          type="text"
          placeholder="e.g. includes driver and fuel"
          className="h-9 w-full rounded-md border border-border bg-card px-2.5 text-sm text-text placeholder:text-muted/60"
          {...register("message")}
        />
      </label>
      <div className="flex gap-2 sm:pt-5">
        <Button type="submit" size="sm">
          Send counter
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
      {(errors.price || errors.message) && (
        <p className="text-xs text-conflict sm:col-span-3" role="alert">
          {errors.price?.message ?? errors.message?.message}
        </p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function PriceCompare({ offered, list }: { offered: number; list: number }) {
  const diff = Math.round(((offered - list) / list) * 100);
  return (
    <div className="text-right">
      <div className="font-mono text-base tabular-nums text-text">
        ₹{formatINR(offered)}
        <span className="text-xs text-muted">/unit</span>
      </div>
      <div className="mt-0.5 flex items-center justify-end gap-1.5 font-mono text-[11px] tabular-nums">
        {diff !== 0 && <span className="text-muted line-through">₹{formatINR(list)}</span>}
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5",
            diff < 0 ? "bg-marigold/25 text-ink" : diff > 0 ? "bg-available/10 text-available" : "bg-available/10 text-available"
          )}
        >
          {diff === 0 ? "at list" : `${diff > 0 ? "+" : ""}${diff}% vs list`}
        </span>
      </div>
    </div>
  );
}

function RequestRow({ booking: b }: { booking: BookingDetail }) {
  const respond = useRespondBooking();
  const [countering, setCountering] = useState(false);
  const actionable = ACTIONABLE.includes(b.status);
  const line = b.lines[0];

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      className={cn("surface p-4 md:p-5", b.urgent && actionable && "border-conflict/40")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sand font-display text-base text-ink" aria-hidden>
            {b.seeker.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-sm font-medium text-text">
                <span className="truncate">{b.seeker.name}</span>
                {b.seeker.verified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Verified" />}
              </span>
              {b.urgent ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-conflict px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-card">
                  <Zap className="size-3" /> Urgent · {b.distanceKm} km
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted">
                  <MapPin className="size-3" /> {b.distanceKm} km
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[13px] text-muted">
              {b.title} · <span className="font-mono">{b.ref}</span> · {formatDistanceToNowStrict(parseISO(b.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        {actionable ? <PriceCompare offered={line.agreedPrice} list={line.listPrice} /> : <StatusPill status={b.status} />}
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-1">
          {b.lines.map((l) => (
            <p key={l.resourceId} className="text-text">
              <span className="font-mono tabular-nums">{formatINR(l.quantity)}</span> × {l.resource.title}
            </p>
          ))}
          <p className="font-mono text-xs text-muted">{formatWindow(b.startAt, b.endAt)}</p>
          {b.note && (
            <p className="flex items-start gap-1.5 text-[13px] italic text-text/75">
              <MessageSquare className="mt-0.5 size-3.5 shrink-0 not-italic text-muted" />“{b.note}”
            </p>
          )}
        </div>

        {actionable && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button size="sm" onClick={() => respond.mutate({ id: b.id, action: "accept" })} disabled={respond.isPending}>
              <Check /> Accept
            </Button>
            <Button size="sm" variant="outline" aria-expanded={countering} onClick={() => setCountering((c) => !c)} disabled={respond.isPending}>
              <Reply /> Counter
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => respond.mutate({ id: b.id, action: "reject" })}
              disabled={respond.isPending}
              className="hover:bg-conflict/10 hover:text-conflict"
            >
              <X /> Reject
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {countering && actionable && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <CounterForm booking={b} onDone={() => setCountering(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ */
/* Inbox                                                               */
/* ------------------------------------------------------------------ */

type Tab = "action" | "all";

export function RequestInbox() {
  const { data, isPending, isError, refetch } = useBookings("provider");
  const [tab, setTab] = useState<Tab>("action");

  const sorted = useMemo(() => {
    const list = (data ?? []).filter((b) => tab === "all" || ACTIONABLE.includes(b.status));
    return [...list].sort((a, b) => {
      const aAct = ACTIONABLE.includes(a.status) ? 0 : 1;
      const bAct = ACTIONABLE.includes(b.status) ? 0 : 1;
      if (aAct !== bAct) return aAct - bAct;
      if (!!a.urgent !== !!b.urgent) return a.urgent ? -1 : 1;
      return parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime();
    });
  }, [data, tab]);
  const actionCount = (data ?? []).filter((b) => ACTIONABLE.includes(b.status)).length;

  return (
    <section aria-labelledby="inbox-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="inbox-title" className="text-2xl tracking-tightest text-ink">
          Incoming <em>requests</em>
        </h2>
        <div role="tablist" aria-label="Filter requests" className="flex rounded-full border border-border bg-card p-0.5">
          {(
            [
              ["action", `Needs action (${actionCount})`],
              ["all", `All (${data?.length ?? 0})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn("h-8 rounded-full px-3 text-xs transition-colors", tab === value ? "bg-ink text-paper" : "text-muted hover:text-text")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading requests">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[132px] animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : isError ? (
        <div className="surface space-y-3 p-6">
          <p className="text-text">Couldn&apos;t load requests.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-mint/40">
            <Inbox className="size-5 text-peacock" />
          </span>
          <p className="font-display text-xl text-ink">Inbox zero.</p>
          <p className="text-sm text-muted">New requests for your listings will land here.</p>
        </div>
      ) : (
        <LayoutGroup>
          <ul className="space-y-3">
            <AnimatePresence initial={false} mode="popLayout">
              {sorted.map((b) => (
                <RequestRow key={b.id} booking={b} />
              ))}
            </AnimatePresence>
          </ul>
        </LayoutGroup>
      )}
    </section>
  );
}
