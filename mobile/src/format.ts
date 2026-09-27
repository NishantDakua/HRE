import type { BookingStatus, PriceUnit } from "./types";

export function inr(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function perUnit(unit: PriceUnit): string {
  if (unit === "HOUR") return "hour";
  if (unit === "DAY") return "day";
  return "unit";
}

export function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function statusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    PENDING: "Pending",
    COUNTERED: "Countered",
    ACCEPTED: "Accepted",
    CONFIRMED: "Confirmed",
    IN_USE: "In use",
    COMPLETED: "Completed",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
  };
  return labels[status];
}

export function tomorrowEvening(): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(18, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 0, 0, 0);
  return { start, end };
}

export function shiftHours(date: Date, hours: number): Date {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}
