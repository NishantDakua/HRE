import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Check, CircleSlash, X } from "lucide-react";
import type { BookingDetail, BookingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type State = "done" | "current" | "upcoming" | "failed";

interface Step {
  key: string;
  label: string;
  at?: string;
  hint?: string;
  state: State;
}

const FLOW: BookingStatus[] = ["PENDING", "COUNTERED", "ACCEPTED", "CONFIRMED", "IN_USE", "COMPLETED"];
const LABEL: Partial<Record<BookingStatus, string>> = {
  PENDING: "Requested",
  COUNTERED: "Negotiating",
  ACCEPTED: "Accepted",
  CONFIRMED: "Confirmed & locked",
  IN_USE: "In use",
  COMPLETED: "Completed",
};

const fmt = (iso: string) => format(parseISO(iso), "EEE d MMM, h:mm a");

function stepState(status: BookingStatus, index: number, at: number, confirmedIndex: number, terminal: boolean): State {
  if (terminal) return index <= at ? "done" : "upcoming";
  if (status === "CONFIRMED" && index <= confirmedIndex) return "done";
  if (index < at || (index === at && status === "COMPLETED")) return "done";
  if (index === at) return "current";
  return "upcoming";
}

function buildSteps(b: BookingDetail): Step[] {
  const offers = b.offers.filter((o) => o.resourceId === b.lines[0]?.resourceId);
  const firstCounter = offers.find((o) => o.round > 1);
  const terminal = b.status === "REJECTED" || b.status === "CANCELLED";
  const at = terminal ? (offers.length > 1 ? 1 : 0) : FLOW.indexOf(b.status);
  const confirmedIndex = FLOW.indexOf("CONFIRMED");

  const times: Partial<Record<BookingStatus, { at?: string; hint?: string }>> = {
    PENDING: { at: b.createdAt },
    COUNTERED: firstCounter ? { at: firstCounter.createdAt, hint: `${offers.length} offers` } : { hint: "skipped — accepted as asked" },
    ACCEPTED: { at: b.confirmedAt },
    CONFIRMED: { at: b.confirmedAt, hint: "inventory held" },
    IN_USE: b.status === "IN_USE" || b.status === "COMPLETED"
      ? { at: b.dispatchedAt ?? b.startAt, hint: "handover" }
      : { at: b.startAt, hint: "handover" },
    COMPLETED: b.status === "COMPLETED"
      ? { at: b.completedAt ?? b.endAt, hint: "return" }
      : { at: b.endAt, hint: "return" },
  };

  const steps: Step[] = FLOW.map((status, i) => ({
    key: status,
    label: LABEL[status] ?? status,
    ...times[status],
    state: stepState(b.status, i, at, confirmedIndex, terminal),
  }));

  if (!firstCounter && at > 1) steps[1].state = "done";

  if (terminal) {
    return [
      ...steps.slice(0, at + 1).map((s) => ({ ...s, state: "done" as const })),
      {
        key: b.status,
        label: b.status === "REJECTED" ? "Declined" : "Cancelled",
        at: offers.at(-1)?.createdAt,
        state: "failed",
      },
    ];
  }
  return steps;
}

export function RequestTimeline({ booking }: { booking: BookingDetail }) {
  const steps = buildSteps(booking);
  return (
    <ol className="relative space-y-0" aria-label="Status timeline">
      {steps.map((s, i) => (
        <motion.li
          key={s.key}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="relative flex gap-3 pb-6 last:pb-0"
          aria-current={s.state === "current" ? "step" : undefined}
        >
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn("absolute left-[11px] top-6 w-px", s.state === "done" ? "bg-available" : "bg-border")}
              style={{ height: "calc(100% - 1.25rem)" }}
            />
          )}
          <span
            className={cn(
              "relative grid size-6 shrink-0 place-items-center rounded-full border",
              s.state === "done" && "border-available bg-available text-card",
              s.state === "current" && "border-pending bg-pending/10 text-pending",
              s.state === "upcoming" && "border-border bg-card text-muted",
              s.state === "failed" && "border-conflict bg-conflict text-card"
            )}
          >
            {s.state === "current" && <span className="absolute inset-0 animate-ping rounded-full bg-pending/25 motion-reduce:animate-none" aria-hidden />}
            {s.state === "done" && <Check className="size-3" strokeWidth={3} />}
            {s.state === "failed" && (s.key === "REJECTED" ? <X className="size-3" strokeWidth={3} /> : <CircleSlash className="size-3" />)}
            {s.state === "current" && <span className="size-2 rounded-full bg-pending" />}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={cn("text-sm", s.state === "upcoming" ? "text-muted" : "text-text", s.state === "failed" && "text-conflict")}>{s.label}</p>
            <p className="font-mono text-[11px] text-muted">
              {s.at ? (s.state === "upcoming" ? `scheduled ${fmt(s.at)}` : fmt(s.at)) : s.hint ?? "—"}
              {s.at && s.hint && s.state !== "upcoming" ? ` · ${s.hint}` : ""}
            </p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
