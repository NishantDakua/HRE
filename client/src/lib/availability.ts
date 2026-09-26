import { addMinutes, endOfDay, formatISO, parseISO, startOfDay, startOfHour } from "date-fns";
import type { Availability, SlotSuggestion } from "./types";

/*
 * Availability math shared by the calendar, the request form and the mock API.
 * Blocks are pre-parsed to epoch ms once; queries sweep overlapping blocks to
 * find the peak concurrent booked quantity in a window.
 */

export interface PreparedAvailability {
  quantity: number;
  from: number;
  to: number;
  blocks: { s: number; e: number; q: number }[];
}

export function prepareAvailability(av: Availability): PreparedAvailability {
  return {
    quantity: av.quantity,
    from: parseISO(av.from).getTime(),
    to: parseISO(av.to).getTime(),
    blocks: av.blocks
      .map((b) => ({ s: parseISO(b.startAt).getTime(), e: parseISO(b.endAt).getTime(), q: b.quantity }))
      .sort((a, b) => a.s - b.s),
  };
}

/** Peak quantity already booked at any moment within [start, end). */
export function bookedDuring(p: PreparedAvailability, start: Date, end: Date): number {
  const s = start.getTime();
  const e = end.getTime();
  const events: [number, number][] = [];
  for (const b of p.blocks) {
    if (b.s >= e) break;
    if (b.e <= s) continue;
    events.push([Math.max(b.s, s), b.q], [Math.min(b.e, e), -b.q]);
  }
  if (events.length === 0) return 0;
  // At equal times, process releases before new bookings.
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let current = 0;
  let peak = 0;
  for (const [, delta] of events) {
    current += delta;
    peak = Math.max(peak, current);
  }
  return peak;
}

export function remainingDuring(p: PreparedAvailability, start: Date, end: Date): number {
  return Math.max(0, p.quantity - bookedDuring(p, start, end));
}

export type SlotTone = "free" | "partial" | "booked";

export function toneFor(p: PreparedAvailability, remaining: number): SlotTone {
  if (remaining <= 0) return "booked";
  return remaining < p.quantity ? "partial" : "free";
}

export function dayRemaining(p: PreparedAvailability, day: Date) {
  return remainingDuring(p, startOfDay(day), endOfDay(day));
}

interface SuggestOptions {
  count?: number;
  stepMinutes?: number;
  horizonDays?: number;
  /** Earliest / latest hour a suggestion may start (local time). */
  dayStartHour?: number;
  dayEndHour?: number;
  now?: Date;
}

/**
 * The `count` free windows of the same length closest to the requested start
 * that can fit `quantity`, searching forwards and backwards (never in the past).
 */
export function nearestFreeSlots(
  p: PreparedAvailability,
  start: Date,
  end: Date,
  quantity: number,
  { count = 3, stepMinutes = 60, horizonDays = 21, dayStartHour = 6, dayEndHour = 22, now = new Date() }: SuggestOptions = {}
): SlotSuggestion[] {
  const duration = end.getTime() - start.getTime();
  if (duration <= 0) return [];
  const earliest = startOfHour(addMinutes(now, 59)).getTime();
  const maxSteps = Math.ceil((horizonDays * 24 * 60) / stepMinutes);
  const picks: SlotSuggestion[] = [];

  for (let k = 1; k <= maxSteps && picks.length < count; k++) {
    for (const dir of [1, -1]) {
      if (picks.length >= count) break;
      const s = addMinutes(start, dir * k * stepMinutes);
      const t = s.getTime();
      if (t < earliest || t + duration > p.to) continue;
      const hour = s.getHours();
      if (hour < dayStartHour || hour > dayEndHour) continue;
      if (picks.some((x) => Math.abs(parseISO(x.startAt).getTime() - t) < duration)) continue;
      const e = new Date(t + duration);
      const remaining = remainingDuring(p, s, e);
      if (remaining >= quantity) picks.push({ startAt: formatISO(s), endAt: formatISO(e), remaining });
    }
  }
  return picks.sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime());
}
