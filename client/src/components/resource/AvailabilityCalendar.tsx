import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  set,
  startOfDay,
  startOfHour,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dayRemaining, remainingDuring, toneFor, type PreparedAvailability, type SlotTone } from "@/lib/availability";
import { isLocal, parseLocal, toLocal } from "@/lib/datetime";
import type { ResourceWithBusiness } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { RequestValues } from "./requestForm";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 – 23:00
const WEEK = { weekStartsOn: 1 } as const;

const TONE_CELL: Record<SlotTone, string> = {
  free: "bg-available/15 hover:bg-available/30",
  partial: "bg-marigold/30 hover:bg-marigold/45",
  booked: "conflict-stripes bg-conflict/10 hover:bg-conflict/20",
};

const TONE_TEXT: Record<SlotTone, string> = {
  free: "text-available",
  partial: "text-ink",
  booked: "text-conflict",
};

type View = "week" | "month";

interface AvailabilityCalendarProps {
  resource: ResourceWithBusiness;
  prepared?: PreparedAvailability;
  loading: boolean;
  error: boolean;
}

export function AvailabilityCalendar({ resource, prepared, loading, error }: AvailabilityCalendarProps) {
  const { watch, setValue, trigger } = useFormContext<RequestValues>();
  const [startV, endV, qty] = watch(["start", "end", "quantity"]);
  const selStart = isLocal(startV) ? parseLocal(startV) : undefined;
  const selEnd = isLocal(endV) ? parseLocal(endV) : undefined;
  const need = Number.isFinite(qty) && qty > 0 ? qty : 1;

  const today = startOfDay(new Date());
  const horizon = prepared ? new Date(prepared.to) : addDays(today, 60);
  const [view, setView] = useState<View>("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selStart ?? today, WEEK));
  const [monthStart, setMonthStart] = useState(() => startOfMonth(selStart ?? today));

  const durationMins =
    selStart && selEnd && isAfter(selEnd, selStart)
      ? differenceInMinutes(selEnd, selStart)
      : Math.max(resource.minRentalHours, 4) * 60;

  const setWindow = (s: Date, e: Date) => {
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    setValue("start", toLocal(s), opts);
    setValue("end", toLocal(e), opts);
    void trigger("quantity");
  };

  const pickHour = (cellStart: Date, extend: boolean) => {
    if (extend && selStart && isAfter(cellStart, selStart)) setWindow(selStart, addHours(cellStart, 1));
    else setWindow(cellStart, new Date(cellStart.getTime() + durationMins * 60_000));
  };

  const pickDay = (day: Date) => {
    const s = set(day, { hours: selStart?.getHours() ?? 18, minutes: selStart?.getMinutes() ?? 0, seconds: 0, milliseconds: 0 });
    setWindow(s, new Date(s.getTime() + durationMins * 60_000));
    setWeekStart(startOfWeek(day, WEEK));
    setView("week");
  };

  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }), [weekStart]);
  const monthDays = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(monthStart, WEEK), end: endOfWeek(endOfMonth(monthStart), WEEK) }),
    [monthStart]
  );

  const canPrev = view === "week" ? isAfter(weekStart, today) : isAfter(monthStart, startOfMonth(today));
  const canNext = view === "week" ? isBefore(addWeeks(weekStart, 1), horizon) : isBefore(addMonths(monthStart, 1), horizon);
  const title =
    view === "week"
      ? `${format(weekStart, "d MMM")} – ${format(addDays(weekStart, 6), isSameMonth(weekStart, addDays(weekStart, 6)) ? "d" : "d MMM")}`
      : format(monthStart, "MMMM yyyy");

  return (
    <section className="space-y-4" aria-labelledby="calendar-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 id="calendar-title" className="font-sans text-base font-medium tracking-normal text-text">
            Availability
          </h2>
          <div role="tablist" aria-label="Calendar view" className="flex rounded-full border border-border bg-card p-0.5">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "h-7 rounded-full px-3 text-xs capitalize transition-colors",
                  view === v ? "bg-ink text-paper" : "text-muted hover:text-text"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={view === "week" ? "Previous week" : "Previous month"}
            disabled={!canPrev}
            onClick={() => (view === "week" ? setWeekStart((w) => addWeeks(w, -1)) : setMonthStart((m) => addMonths(m, -1)))}
            className="grid size-8 place-items-center rounded-full border border-border text-muted transition-colors hover:text-text disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[8.5rem] text-center font-mono text-xs tabular-nums text-text">{title}</span>
          <button
            type="button"
            aria-label={view === "week" ? "Next week" : "Next month"}
            disabled={!canNext}
            onClick={() => (view === "week" ? setWeekStart((w) => addWeeks(w, 1)) : setMonthStart((m) => addMonths(m, 1)))}
            className="grid size-8 place-items-center rounded-full border border-border text-muted transition-colors hover:text-text disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {loading || !prepared ? (
        error ? (
          <p className="text-sm text-muted">Availability is unavailable right now.</p>
        ) : (
          <div className="h-[420px] animate-pulse rounded-lg border border-border bg-card" aria-busy="true" aria-label="Loading availability" />
        )
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view + (view === "week" ? weekStart.toISOString() : monthStart.toISOString())}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {view === "week" ? (
              <div className="overflow-x-auto rounded-lg border border-border bg-card p-2" data-lenis-prevent>
                <div className="grid min-w-[560px] grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-px" role="grid" aria-label="Week availability by hour">
                  <div />
                  {weekDays.map((d) => (
                    <div key={d.toISOString()} role="columnheader" className={cn("pb-1.5 text-center", isSameDay(d, today) && "text-primary")}>
                      <div className="text-[10px] uppercase tracking-[0.1em] text-muted">{format(d, "EEE")}</div>
                      <div className="font-mono text-xs tabular-nums text-text">{format(d, "d")}</div>
                    </div>
                  ))}
                  {HOURS.map((h) => (
                    <div key={h} role="row" className="contents">
                      <div className="pr-1.5 text-right font-mono text-[10px] leading-7 tabular-nums text-muted">{String(h).padStart(2, "0")}:00</div>
                      {weekDays.map((d) => {
                        const cellStart = set(d, { hours: h, minutes: 0, seconds: 0, milliseconds: 0 });
                        const cellEnd = addHours(cellStart, 1);
                        const past = isBefore(cellEnd, startOfHour(new Date()));
                        const beyond = !isBefore(cellStart, horizon);
                        const remaining = remainingDuring(prepared, cellStart, cellEnd);
                        const tone = toneFor(prepared, remaining);
                        const selected = !!selStart && !!selEnd && !isBefore(cellStart, selStart) && isBefore(cellStart, selEnd);
                        const clash = selected && remaining < need;
                        return (
                          <button
                            key={d.toISOString()}
                            type="button"
                            role="gridcell"
                            disabled={past || beyond}
                            aria-selected={selected}
                            aria-label={`${format(cellStart, "EEE d MMM, HH:mm")} — ${remaining} of ${prepared.quantity} free`}
                            title={`${format(cellStart, "HH:mm")} · ${remaining}/${prepared.quantity} free · shift-click to extend`}
                            onClick={(e) => pickHour(cellStart, e.shiftKey)}
                            className={cn(
                              "relative h-7 rounded-[4px] font-mono text-[10px] tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-35",
                              TONE_CELL[tone],
                              TONE_TEXT[tone],
                              selected && "z-10 outline outline-2 -outline-offset-1",
                              selected && (clash ? "bg-conflict/30 text-conflict outline-conflict" : "bg-primary/50 text-ink outline-primary")
                            )}
                          >
                            {tone === "partial" && remaining}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Month availability by day">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} role="columnheader" className="pb-1 text-center text-[10px] uppercase tracking-[0.1em] text-muted">
                      {d}
                    </div>
                  ))}
                  {monthDays.map((d) => {
                    const inMonth = isSameMonth(d, monthStart);
                    const disabled = isBefore(d, today) || !isBefore(d, horizon);
                    const remaining = dayRemaining(prepared, d);
                    const tone = toneFor(prepared, remaining);
                    const selected =
                      !!selStart && !!selEnd && !isBefore(startOfDay(d), startOfDay(selStart)) && !isAfter(startOfDay(d), startOfDay(selEnd));
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        role="gridcell"
                        disabled={disabled}
                        aria-selected={selected}
                        aria-label={`${format(d, "EEEE d MMMM")} — ${tone === "free" ? "free all day" : tone === "booked" ? "fully booked at peak" : `${remaining} of ${prepared.quantity} free at peak`}`}
                        onClick={() => pickDay(d)}
                        className={cn(
                          "flex aspect-square flex-col justify-between rounded-md p-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-30 sm:aspect-[4/3]",
                          TONE_CELL[tone],
                          !inMonth && "opacity-40",
                          selected && "outline outline-2 -outline-offset-1 outline-primary"
                        )}
                      >
                        <span className={cn("font-mono text-xs tabular-nums", isSameDay(d, today) ? "text-primary" : "text-text")}>{format(d, "d")}</span>
                        <span className={cn("hidden text-[10px] leading-none sm:block", TONE_TEXT[tone])}>
                          {tone === "free" ? "Free" : tone === "booked" ? "Booked" : `${remaining} left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted" aria-label="Legend">
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-available/30" /> Free
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-marigold/45" /> Partial (remaining shown)
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="conflict-stripes size-3 rounded-sm bg-conflict/15" /> Booked
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-primary/35 outline outline-2 -outline-offset-1 outline-primary" /> Your request
        </li>
        {view === "week" && <li className="text-muted/80">Click to start · shift-click to extend</li>}
      </ul>
    </section>
  );
}
