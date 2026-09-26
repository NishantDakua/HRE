import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Bookmark, Clock, Gauge, Inbox, ListChecks, Wallet } from "lucide-react";
import type { AnalyticsRange, AnalyticsSummary, Role } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

interface Kpi {
  label: string;
  value: ReactNode;
  hint: string;
  icon: typeof Wallet;
  tone?: "good" | "warn" | "neutral";
  meter?: number;
}

const RANGE_LABEL: Record<AnalyticsRange, string> = { "7d": "last 7 days", "30d": "last 30 days", "90d": "last 90 days" };

function providerKpis(a: AnalyticsSummary): Kpi[] {
  return [
    { label: "Idle-to-income", value: `₹${formatINR(a.earned)}`, hint: `agreed revenue · ${RANGE_LABEL[a.range]}`, icon: Wallet, tone: "good" },
    {
      label: "Utilization",
      value: `${Math.round(a.utilisation * 100)}%`,
      hint: "booked unit-hours · next 14 days",
      icon: Gauge,
      meter: a.utilisation,
      tone: a.utilisation >= 0.3 ? "good" : "neutral",
    },
    {
      label: "Pending requests",
      value: a.pendingRequests,
      hint: a.pendingRequests ? "awaiting your reply" : "inbox zero",
      icon: Inbox,
      tone: a.pendingRequests ? "warn" : "good",
    },
    {
      label: "Avg. response",
      value: `${a.avgResponseMins} min`,
      hint: a.avgResponseMins <= 15 ? "faster than 90% of providers" : "reply under 15 min to rank higher",
      icon: Clock,
      tone: a.avgResponseMins <= 15 ? "good" : "warn",
    },
  ];
}

function seekerKpis(a: AnalyticsSummary, saved: number): Kpi[] {
  return [
    { label: "Spent", value: `₹${formatINR(a.spent)}`, hint: RANGE_LABEL[a.range], icon: Wallet },
    { label: "Active requests", value: a.activeRequests, hint: "pending, countered or confirmed", icon: ListChecks, tone: a.activeRequests ? "warn" : "neutral" },
    { label: "Bookings", value: a.bookings, hint: RANGE_LABEL[a.range], icon: Inbox },
    { label: "Saved searches", value: saved, hint: "alerts when new matches appear", icon: Bookmark },
  ];
}

export function KpiRow({ mode, analytics, savedCount = 0 }: { mode: Role; analytics?: AnalyticsSummary; savedCount?: number }) {
  if (!analytics) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading metrics">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[120px] animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
    );
  }
  const kpis = mode === "provider" ? providerKpis(analytics) : seekerKpis(analytics, savedCount);
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k, i) => (
        <motion.div
          key={k.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="surface p-5"
        >
          <dt className="flex items-center justify-between text-xs text-muted">
            {k.label}
            <k.icon className="size-4" strokeWidth={1.75} />
          </dt>
          <dd className="mt-3 font-mono text-3xl tabular-nums tracking-tight text-text">{k.value}</dd>
          {k.meter !== undefined && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <motion.span
                className="block h-full rounded-full bg-available"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(k.meter * 100)}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          )}
          <dd
            className={cn(
              "mt-2 text-[11px]",
              k.tone === "good" ? "text-available" : k.tone === "warn" ? "text-primary" : "text-muted"
            )}
          >
            {k.hint}
          </dd>
        </motion.div>
      ))}
    </dl>
  );
}
