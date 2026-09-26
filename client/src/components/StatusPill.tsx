import { cn } from "@/lib/utils";
import type { BookingStatus, OfferStatus, StatusTone } from "@/lib/types";

const TONE: Record<StatusTone, string> = {
  available: "text-available bg-available/10 border-available/25",
  conflict: "text-conflict bg-conflict/10 border-conflict/25",
  pending: "text-pending bg-pending/10 border-pending/25",
  primary: "text-primary bg-primary/10 border-primary/25",
  muted: "text-muted bg-surface border-border",
};

const DOT: Record<StatusTone, string> = {
  available: "bg-available",
  conflict: "bg-conflict",
  pending: "bg-pending",
  primary: "bg-primary",
  muted: "bg-muted",
};

type KnownStatus = BookingStatus | OfferStatus | "available" | "unavailable" | "limited";

const STATUS_MAP: Record<KnownStatus, { tone: StatusTone; label: string }> = {
  PENDING: { tone: "pending", label: "Pending" },
  COUNTERED: { tone: "primary", label: "Countered" },
  ACCEPTED: { tone: "available", label: "Accepted" },
  CONFIRMED: { tone: "available", label: "Confirmed" },
  IN_USE: { tone: "pending", label: "In use" },
  COMPLETED: { tone: "muted", label: "Completed" },
  REJECTED: { tone: "conflict", label: "Rejected" },
  CANCELLED: { tone: "muted", label: "Cancelled" },
  OPEN: { tone: "pending", label: "Open" },
  EXPIRED: { tone: "muted", label: "Expired" },
  available: { tone: "available", label: "Available" },
  limited: { tone: "primary", label: "Limited" },
  unavailable: { tone: "conflict", label: "Booked" },
};

interface StatusPillProps {
  status?: KnownStatus;
  tone?: StatusTone;
  label?: string;
  pulse?: boolean;
  className?: string;
}

export function StatusPill({ status, tone, label, pulse, className }: StatusPillProps) {
  const mapped = status ? STATUS_MAP[status] : undefined;
  const t = tone ?? mapped?.tone ?? "muted";
  const text = label ?? mapped?.label ?? status ?? "";
  const live = pulse ?? status === "IN_USE";

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium tracking-wide",
        TONE[t],
        className
      )}
    >
      <span className="relative flex size-1.5">
        {live && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", DOT[t])} />}
        <span className={cn("relative size-1.5 rounded-full", DOT[t])} />
      </span>
      {text}
    </span>
  );
}
