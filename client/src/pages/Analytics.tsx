import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { isValid } from "date-fns";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, RefreshCw } from "lucide-react";
import { AcceptanceChart, DemandHeatmap, RevenueChart, TopCategoriesChart, UtilisationChart } from "@/components/analytics/Charts";
import { DateRangeFilter, PRESETS, describeRange, parseDay } from "@/components/analytics/DateRangeFilter";
import { ChartCard, compactINR, pct } from "@/components/analytics/theme";
import { Button } from "@/components/ui/button";
import { useAnalyticsReport } from "@/hooks/queries";
import type { DateRange, ReportTotals } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { useAppStore } from "@/store/app";

const DEFAULT_PRESET = "30d";

/** Range lives in the URL: `?range=90d` for presets, `?from=…&to=…` for custom. */
function useRangeParam() {
  const [params, setParams] = useSearchParams();
  const presetParam = params.get("range");
  const from = params.get("from");
  const to = params.get("to");

  const { range, presetId } = useMemo(() => {
    if (from && to && isValid(parseDay(from)) && isValid(parseDay(to)) && from <= to) return { range: { from, to }, presetId: undefined };
    const preset = PRESETS.find((p) => p.id === presetParam) ?? PRESETS.find((p) => p.id === DEFAULT_PRESET)!;
    return { range: preset.range(), presetId: preset.id };
  }, [presetParam, from, to]);

  const set = (r: DateRange, id?: string) =>
    setParams(id ? { range: id } : { from: r.from, to: r.to }, { replace: true });

  return { range, presetId, set };
}

interface Kpi {
  label: string;
  key: keyof ReportTotals;
  format: (v: number) => string;
  /** Lower is better (e.g. spend). */
  invert?: boolean;
  /** Show absolute percentage-point change instead of relative %. */
  points?: boolean;
}

function KpiTile({ kpi, now, prev, i }: { kpi: Kpi; now: number; prev: number; i: number }) {
  const delta = kpi.points ? (now - prev) * 100 : prev ? ((now - prev) / prev) * 100 : 0;
  const up = delta >= 0;
  const good = kpi.invert ? !up : up;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="surface p-4">
      <p className="eyebrow">{kpi.label}</p>
      <p className="mt-2 font-mono text-2xl tabular-nums text-ink">{kpi.format(now)}</p>
      <p className={cn("mt-1 inline-flex items-center gap-0.5 font-mono text-[11px]", Math.abs(delta) < 0.5 ? "text-muted" : good ? "text-available" : "text-conflict")}>
        {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
        {Math.abs(delta).toFixed(kpi.points ? 1 : 0)}
        {kpi.points ? " pts" : "%"} <span className="ml-1 text-muted">vs prev.</span>
      </p>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const mode = useAppStore((s) => s.mode);
  const { range, presetId, set } = useRangeParam();
  const { data: report, isPending, isError, isFetching, isPlaceholderData, refetch } = useAnalyticsReport(range);

  const kpis: Kpi[] =
    mode === "provider"
      ? [
          { label: "Earned", key: "earned", format: (v) => `₹${formatINR(v)}` },
          { label: "Bookings", key: "bookings", format: (v) => formatINR(v) },
          { label: "Acceptance", key: "acceptanceRate", format: (v) => pct(v), points: true },
          { label: "Utilisation", key: "utilisation", format: (v) => pct(v), points: true },
        ]
      : [
          { label: "Spent", key: "spent", format: (v) => `₹${formatINR(v)}`, invert: true },
          { label: "Requests", key: "requests", format: (v) => formatINR(v) },
          { label: "Bookings", key: "bookings", format: (v) => formatINR(v) },
          { label: "Acceptance", key: "acceptanceRate", format: (v) => pct(v), points: true },
        ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Analytics · {mode === "provider" ? "Provider" : "Seeker"}</p>
          <h1 className="mt-2 text-[clamp(1.75rem,0.9rem+4vw,2.25rem)] leading-[1.05] tracking-tightest [overflow-wrap:anywhere] md:text-5xl">
            How the <em>idle</em> is earning.
          </h1>
          <p className="mt-2 font-mono text-xs text-muted">
            {describeRange(range)}
            {report && ` · ${report.bucket === "week" ? "weekly" : "daily"} buckets`}
          </p>
        </div>
        <DateRangeFilter value={range} presetId={presetId} onChange={set} />
      </header>

      {isPending ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[108px] animate-pulse rounded-lg bg-card" />
            ))}
          </div>
          <div className="h-[340px] animate-pulse rounded-lg bg-card" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-[300px] animate-pulse rounded-lg bg-card" />
            <div className="h-[300px] animate-pulse rounded-lg bg-card" />
          </div>
        </div>
      ) : isError || !report ? (
        <div className="surface space-y-3 p-6">
          <p className="text-text">Couldn&apos;t load analytics for this range.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw /> Try again
          </Button>
        </div>
      ) : (
        <div className={cn("space-y-6 transition-opacity", isPlaceholderData && isFetching && "opacity-60")} aria-busy={isFetching}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((k, i) => (
              <KpiTile key={k.key} kpi={k} now={report.totals[k.key]} prev={report.previous[k.key]} i={i} />
            ))}
          </div>

          <ChartCard
            title={
              <>
                Revenue <em>over time</em>
              </>
            }
            kicker={`${compactINR(report.totals.earned)} earned · ${compactINR(report.totals.spent)} spent`}
            action={
              <div className="flex items-center gap-3 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full bg-terracotta" /> Earned
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0 w-4 border-t-2 border-dashed border-peacock" /> Spent
                </span>
              </div>
            }
          >
            <RevenueChart report={report} showSpent />
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title={
                <>
                  Utilisation <em>by category</em>
                </>
              }
              kicker="Booked hours ÷ bookable hours"
            >
              <UtilisationChart report={report} />
            </ChartCard>
            <ChartCard
              title={
                <>
                  Demand <em>heatmap</em>
                </>
              }
              kicker="Requests by area × weekday"
            >
              <DemandHeatmap report={report} />
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title={
                <>
                  Top <em>categories</em>
                </>
              }
              kicker="Across the exchange · share of booked value"
            >
              <TopCategoriesChart report={report} />
            </ChartCard>
            <ChartCard
              title={
                <>
                  Acceptance <em>rate</em>
                </>
              }
              kicker={`Requests that ended in a deal · ${report.bucket === "week" ? "weekly" : "daily"}`}
            >
              <AcceptanceChart report={report} />
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
