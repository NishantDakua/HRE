import { useMemo } from "react";
import { addDays, format, isToday, startOfDay } from "date-fns";
import { useAvailability } from "@/hooks/queries";
import { dayRemaining, prepareAvailability, toneFor, type SlotTone } from "@/lib/availability";
import { cn } from "@/lib/utils";

const TONE: Record<SlotTone, string> = {
  free: "bg-available/25",
  partial: "bg-marigold/50",
  booked: "conflict-stripes bg-conflict/25",
};

/** 14-day booking strip for one listing: green free, amber partly booked, red fully booked. */
export function ListingStrip({ resourceId, days = 14 }: { resourceId: string; days?: number }) {
  const { data, isPending, isError } = useAvailability(resourceId);
  const cells = useMemo(() => {
    if (!data) return [];
    const p = prepareAvailability(data);
    const today = startOfDay(new Date());
    return Array.from({ length: days }, (_, i) => {
      const day = addDays(today, i);
      const remaining = dayRemaining(p, day);
      return { day, remaining, tone: toneFor(p, remaining), quantity: p.quantity };
    });
  }, [data, days]);

  if (isError) return <span className="text-[11px] text-muted">—</span>;
  if (isPending) return <div className="h-6 w-[182px] animate-pulse rounded bg-surface" aria-label="Loading calendar" />;

  return (
    <ol className="flex gap-0.5" aria-label={`Next ${days} days`}>
      {cells.map((c) => (
        <li
          key={c.day.toISOString()}
          title={`${format(c.day, "EEE d MMM")} · ${c.remaining}/${c.quantity} free at peak`}
          aria-label={`${format(c.day, "EEE d MMM")}: ${c.tone === "free" ? "free" : c.tone === "booked" ? "fully booked" : `${c.remaining} of ${c.quantity} free`}`}
          className={cn("relative h-6 w-3 rounded-[3px]", TONE[c.tone], isToday(c.day) && "outline outline-1 outline-offset-1 outline-ink/40")}
        />
      ))}
    </ol>
  );
}
