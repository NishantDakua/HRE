import { addMinutes, format, parseISO } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Hourglass, PackageCheck, Send, Undo2 } from "lucide-react";
import type { Booking, ResourceWithBusiness } from "@/lib/types";
import { cn } from "@/lib/utils";

type StepState = "done" | "active" | "upcoming";

/** Preview of what happens next for a freshly created (PENDING) request. */
export function StatusTimeline({ booking, resource }: { booking: Booking; resource: ResourceWithBusiness }) {
  const reduced = useReducedMotion();
  const created = parseISO(booking.createdAt);
  const start = parseISO(booking.startAt);
  const end = parseISO(booking.endAt);

  const steps: { icon: typeof Send; title: string; detail: string; state: StepState }[] = [
    { icon: Send, title: "Request sent", detail: format(created, "h:mm a"), state: "done" },
    {
      icon: Hourglass,
      title: `${resource.business.name} reviews`,
      detail: `usually replies by ${format(addMinutes(created, resource.business.avgResponseMins), "h:mm a")}`,
      state: "active",
    },
    { icon: Check, title: "Confirmed & locked", detail: "inventory held, calendar blocked", state: "upcoming" },
    {
      icon: PackageCheck,
      title: resource.delivers ? "Delivered to your venue" : "Handover on-site",
      detail: format(start, "EEE d MMM, h:mm a"),
      state: "upcoming",
    },
    { icon: Undo2, title: "Returned", detail: format(end, "EEE d MMM, h:mm a"), state: "upcoming" },
  ];

  return (
    <ol className="relative" aria-label="What happens next">
      {steps.map((s, i) => (
        <motion.li
          key={s.title}
          initial={reduced ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex gap-3 pb-5 last:pb-0"
        >
          {i < steps.length - 1 && (
            <motion.span
              aria-hidden
              className={cn("absolute left-[13px] top-7 w-px origin-top", s.state === "done" ? "bg-available" : "bg-border")}
              style={{ height: "calc(100% - 1.5rem)" }}
              initial={reduced ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.25 + i * 0.12, duration: 0.35 }}
            />
          )}
          <span
            className={cn(
              "relative grid size-7 shrink-0 place-items-center rounded-full border",
              s.state === "done" && "border-available bg-available text-card",
              s.state === "active" && "border-pending bg-pending/10 text-pending",
              s.state === "upcoming" && "border-border bg-card text-muted"
            )}
          >
            {s.state === "active" && !reduced && (
              <span className="absolute inset-0 animate-ping rounded-full bg-pending/25" aria-hidden />
            )}
            <s.icon className="relative size-3.5" strokeWidth={2} />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={cn("text-sm", s.state === "upcoming" ? "text-muted" : "text-text")}>{s.title}</p>
            <p className="font-mono text-[11px] text-muted">{s.detail}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
