import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Controller, useFormContext } from "react-hook-form";
import { differenceInMinutes, format, formatISO, isBefore, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarDays, Truck } from "lucide-react";
import { toast } from "sonner";
import { PriceTag } from "@/components/PriceTag";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useCreateBooking } from "@/hooks/queries";
import { asConflict } from "@/lib/api";
import { nearestFreeSlots, remainingDuring, type PreparedAvailability } from "@/lib/availability";
import { isLocal, isoToLocal, parseLocal } from "@/lib/datetime";
import { AREAS } from "@/lib/geo";
import type { Booking, ResourceWithBusiness, SlotSuggestion } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { quote, type RequestValues } from "./requestForm";
import { StatusTimeline } from "./StatusTimeline";

const optionalNumber = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v));

const inputCls = (invalid?: boolean) =>
  cn(
    "h-10 w-full rounded-md border bg-card px-3 font-mono text-sm text-text placeholder:text-muted/60 [color-scheme:light] focus-visible:border-primary/60",
    invalid ? "border-conflict/60" : "border-border"
  );

function FieldError({ message }: { message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden text-xs text-conflict"
          role="alert"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export function formatSlot(s: SlotSuggestion) {
  const start = parseISO(s.startAt);
  const end = parseISO(s.endAt);
  return `${format(start, "EEE d MMM, h:mm a")} – ${format(end, "h:mm a")}`;
}

interface RequestSheetProps {
  resource: ResourceWithBusiness;
  prepared?: PreparedAvailability;
}

export function RequestSheet({ resource: r, prepared }: RequestSheetProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<RequestValues>();
  const create = useCreateBooking();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [serverAlts, setServerAlts] = useState<SlotSuggestion[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // The sheet can scroll internally; bring the success view (or form) into view on swap.
  useEffect(() => {
    rootRef.current?.closest("[data-lenis-prevent]")?.scrollTo({ top: 0, behavior: "smooth" });
  }, [booking]);

  const values = watch();
  const q = quote(r, values);
  const start = isLocal(values.start) ? parseLocal(values.start) : undefined;
  const end = isLocal(values.end) ? parseLocal(values.end) : undefined;
  const windowOk = !!start && !!end && isBefore(start, end);
  const remaining = prepared && windowOk ? remainingDuring(prepared, start, end) : undefined;
  const need = Number.isFinite(values.quantity) && values.quantity > 0 ? values.quantity : 1;
  const conflict = remaining !== undefined && need > remaining;

  // A new window invalidates any alternatives the server suggested earlier.
  useEffect(() => {
    setServerAlts(null);
  }, [values.start, values.end, values.quantity]);

  const localAlts = useMemo(
    () => (conflict && prepared && start && end ? nearestFreeSlots(prepared, start, end, need) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conflict, prepared, values.start, values.end, need]
  );
  const alternatives = serverAlts ?? localAlts;

  const applySlot = (s: SlotSuggestion) => {
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    setValue("start", isoToLocal(s.startAt), opts);
    setValue("end", isoToLocal(s.endAt), opts);
    void trigger("quantity");
  };

  const onSubmit = (v: RequestValues) => {
    create.mutate(
      {
        resourceId: r.id,
        quantity: v.quantity,
        startAt: formatISO(parseLocal(v.start)),
        endAt: formatISO(parseLocal(v.end)),
        title: r.title,
        offerPrice: v.counter,
        delivery: v.delivery,
        deliverTo: v.delivery ? v.deliverTo : undefined,
        note: v.note?.trim() || undefined,
      },
      {
        onSuccess: (b) => setBooking(b),
        onError: (err) => {
          const c = asConflict(err);
          if (!c) return;
          setServerAlts(c.alternatives);
          const first = c.alternatives[0];
          toast.error(c.message, {
            description: c.alternatives.length
              ? `Nearest free: ${c.alternatives.map(formatSlot).join(" · ")}`
              : "Nothing free nearby — try another week.",
            action: first ? { label: "Use first slot", onClick: () => applySlot(first) } : undefined,
            duration: 9000,
          });
        },
      }
    );
  };

  const hours = windowOk ? differenceInMinutes(end, start) / 60 : 0;

  return (
    <div ref={rootRef}>
      <AnimatePresence mode="wait" initial={false}>
        {booking ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-available">Request sent</p>
                <h2 className="mt-1 font-display text-2xl text-ink">
                  You&apos;re <em>in the queue.</em>
                </h2>
                <p className="mt-1 font-mono text-xs text-muted">
                  {booking.ref} · ₹{formatINR(booking.total)} + delivery
                </p>
              </div>
              <StatusPill status={booking.status} />
            </div>
            <StatusTimeline booking={booking} resource={r} />
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button asChild>
                <Link to="/requests">
                  Track in Requests
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setBooking(null)}>
                New request
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
            aria-label="Request to book"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl text-ink">Request to book</h2>
              <PriceTag amount={r.price} unit={r.unit} size="sm" />
            </div>

            {/* Window */}
            <div className="grid grid-cols-2 gap-2.5">
              <label className="space-y-1.5">
                <span className="text-xs text-muted">Start</span>
                <input type="datetime-local" step={1800} aria-invalid={!!errors.start} className={inputCls(!!errors.start)} {...register("start")} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-muted">End</span>
                <input type="datetime-local" step={1800} aria-invalid={!!errors.end} className={inputCls(!!errors.end)} {...register("end")} />
              </label>
            </div>
            <FieldError message={errors.start?.message ?? errors.end?.message} />
            {windowOk && !errors.end && (
              <p className="-mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                <CalendarDays className="size-3.5" />
                {hours % 1 === 0 ? hours : hours.toFixed(1)}h · minimum {r.minRentalHours}h
              </p>
            )}

            {/* Quantity */}
            <label className="block space-y-1.5">
              <span className="flex items-baseline justify-between text-xs text-muted">
                Quantity ({r.unitLabel})
                {remaining !== undefined && (
                  <span className={cn("font-mono", conflict ? "text-conflict" : "text-available")}>
                    {remaining} of {r.quantity} free then
                  </span>
                )}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={r.quantity}
                aria-invalid={!!errors.quantity}
                className={inputCls(!!errors.quantity)}
                {...register("quantity", { valueAsNumber: true })}
              />
            </label>
            <FieldError message={errors.quantity?.message} />

            {/* Conflict + nearest free slots */}
            <AnimatePresence initial={false}>
              {(conflict || serverAlts) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-md border border-conflict/40 bg-conflict/5 p-3" role="alert">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-conflict">
                      <AlertTriangle className="size-4" />
                      {remaining === 0 ? "Fully booked for those hours" : `Only ${remaining ?? 0} free for those hours`}
                    </p>
                    {alternatives.length > 0 ? (
                      <>
                        <p className="mt-1 text-xs text-muted">Nearest windows that fit {formatINR(need)}:</p>
                        <ul className="mt-2 space-y-1.5">
                          {alternatives.map((s) => (
                            <li key={s.startAt}>
                              <button
                                type="button"
                                onClick={() => applySlot(s)}
                                className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-left text-xs transition-colors hover:border-available/60 hover:bg-available/5"
                              >
                                <span className="font-mono text-text">{formatSlot(s)}</span>
                                <span className="shrink-0 font-mono text-available">{s.remaining} free</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-muted">Nothing free nearby — try fewer units or another week.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Delivery */}
            <div className="space-y-2.5 rounded-md border border-border bg-paper/60 p-3">
              <Controller
                control={control}
                name="delivery"
                render={({ field }) => (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.value}
                    disabled={!r.delivers}
                    onClick={() => field.onChange(!field.value)}
                    className="flex w-full items-center justify-between gap-3 text-sm text-text disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Truck className="size-4 text-muted" strokeWidth={1.75} />
                      {r.delivers ? "Deliver to my venue" : "Pickup / on-site only"}
                    </span>
                    <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", field.value ? "bg-peacock" : "bg-border")}>
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-card shadow transition-all", field.value ? "left-[18px]" : "left-0.5")} />
                    </span>
                  </button>
                )}
              />
              <AnimatePresence initial={false}>
                {values.delivery && r.delivers && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <label className="flex items-center gap-2 text-xs text-muted">
                        Venue in
                        <select className="rounded-md border border-border bg-card px-2 py-1 text-sm text-text" {...register("deliverTo")}>
                          {AREAS.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className="font-mono text-xs tabular-nums text-text">
                        {q.km} km · ₹{formatINR(q.delivery)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      ₹{formatINR(r.deliveryBase ?? 0)} flat + ₹{formatINR(r.deliveryPerKm ?? 0)}/km
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Counter + note */}
            <label className="block space-y-1.5">
              <span className="flex items-baseline justify-between text-xs text-muted">
                Counter price per unit <span className="text-muted/70">optional · list ₹{formatINR(r.price)}</span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder={`e.g. ${formatINR(Math.round(r.price * 0.85))}`}
                aria-invalid={!!errors.counter}
                className={inputCls(!!errors.counter)}
                {...register("counter", { setValueAs: optionalNumber })}
              />
            </label>
            <FieldError message={errors.counter?.message} />

            <label className="block space-y-1.5">
              <span className="text-xs text-muted">Note to provider</span>
              <textarea
                rows={2}
                placeholder="Venue access, floor, contact on the day…"
                aria-invalid={!!errors.note}
                className={cn(inputCls(!!errors.note), "h-auto resize-y py-2 font-sans")}
                data-lenis-prevent
                {...register("note")}
              />
            </label>
            <FieldError message={errors.note?.message} />

            {/* Live price summary */}
            <dl className="space-y-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">
                  ₹{formatINR(q.unitPrice)} × {formatINR(Number.isFinite(values.quantity) ? values.quantity : 0)}
                  {r.unit !== "UNIT" && ` × ${q.units}${r.unit === "HOUR" ? "h" : "d"}`}
                </dt>
                <dd className="font-mono tabular-nums text-text">₹{formatINR(q.rental)}</dd>
              </div>
              {q.savings > 0 && (
                <div className="flex justify-between gap-3 text-available">
                  <dt>Your counter</dt>
                  <dd className="font-mono tabular-nums">−₹{formatINR(q.savings)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Delivery</dt>
                <dd className="font-mono tabular-nums text-text">{q.delivery ? `₹${formatINR(q.delivery)}` : "—"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                <dt className="font-medium text-text">Total</dt>
                <dd>
                  <motion.span key={q.total} initial={{ opacity: 0.4, y: -4 }} animate={{ opacity: 1, y: 0 }} className="inline-block">
                    <PriceTag amount={q.total} size="md" />
                  </motion.span>
                </dd>
              </div>
            </dl>

            <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-border bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 lg:static lg:mx-0 lg:space-y-4 lg:border-0 lg:bg-transparent lg:p-0">
              <Button type="submit" size="lg" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Sending…" : `Send request · ₹${formatINR(q.total)}`}
              </Button>
              <p className="text-center text-[11px] text-muted">No charge until {r.business.name} confirms.</p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
