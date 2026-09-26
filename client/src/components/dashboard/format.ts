import { differenceInMinutes, format, isSameDay, parseISO } from "date-fns";

/** "Sat 27 Sep · 6:00 AM – 2:00 PM (8h)" — spans days when needed. */
export function formatWindow(startISO: string, endISO: string) {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const hours = Math.round(differenceInMinutes(end, start) / 6) / 10;
  const span = isSameDay(start, end)
    ? `${format(start, "EEE d MMM · h:mm a")} – ${format(end, "h:mm a")}`
    : `${format(start, "EEE d MMM, h:mm a")} – ${format(end, "EEE d MMM, h:mm a")}`;
  return `${span} (${hours}h)`;
}
