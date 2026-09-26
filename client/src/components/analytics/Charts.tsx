import { format } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { AREAS } from "@/lib/geo";
import { CATEGORY_LABEL, type AnalyticsReport } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { parseDay } from "./DateRangeFilter";
import { C, ChartTooltip, SERIES, axisProps, compactINR, gridProps, pct } from "./theme";

const bucketLabel = (d: string, bucket: AnalyticsReport["bucket"]) => format(parseDay(d), bucket === "week" ? "'w/c' d MMM" : "EEE d MMM");

/* ---------------- Revenue over time ---------------- */

export function RevenueChart({ report, showSpent }: { report: AnalyticsReport; showSpent: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={report.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="earnedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.terracotta} stopOpacity={0.35} />
            <stop offset="100%" stopColor={C.terracotta} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" {...axisProps} tickFormatter={(d: string) => format(parseDay(d), "d MMM")} minTickGap={24} />
        <YAxis {...axisProps} width={52} tickFormatter={compactINR} />
        <Tooltip
          cursor={{ stroke: C.ink, strokeOpacity: 0.15 }}
          content={<ChartTooltip title={(l) => bucketLabel(String(l), report.bucket)} rows={(p) => `₹${formatINR(Number(p.value))}`} />}
        />
        <Area
          type="monotone"
          dataKey="earned"
          name="Earned"
          stroke={C.terracotta}
          strokeWidth={2}
          fill="url(#earnedFill)"
          activeDot={{ r: 4, fill: C.card, stroke: C.terracotta, strokeWidth: 2 }}
        />
        {showSpent && (
          <Area type="monotone" dataKey="spent" name="Spent" stroke={C.peacock} strokeWidth={1.75} strokeDasharray="5 4" fill="none" activeDot={{ r: 3.5, fill: C.peacock }} />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------------- Utilisation by category ---------------- */

export function UtilisationChart({ report }: { report: AnalyticsReport }) {
  const data = [...report.utilisationByCategory]
    .sort((a, b) => b.utilisation - a.utilisation)
    .map((d) => ({ ...d, label: CATEGORY_LABEL[d.category] }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap={8}>
        <XAxis type="number" domain={[0, 1]} hide />
        <YAxis type="category" dataKey="label" {...axisProps} tick={{ ...axisProps.tick, fontFamily: "DM Sans, sans-serif", fill: C.ink }} width={118} />
        <Tooltip cursor={{ fill: C.sand, fillOpacity: 0.5 }} content={<ChartTooltip rows={(p) => pct(Number(p.value), 1)} />} />
        <Bar dataKey="utilisation" name="Utilisation" radius={[0, 999, 999, 0]} background={{ fill: C.sand, radius: 999 }}>
          {data.map((d) => (
            <Cell key={d.category} fill={d.utilisation >= 0.7 ? C.terracotta : d.utilisation >= 0.4 ? C.marigold : C.peach} />
          ))}
          <LabelList dataKey="utilisation" position="right" formatter={(v: number) => pct(v)} style={{ fill: C.muted, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------------- Demand heatmap: area × weekday ---------------- */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Interpolate paper → butter → marigold → terracotta. */
function heat(t: number) {
  const stops = [C.paper, C.butter, C.marigold, C.terracotta].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const x = Math.min(0.999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const rgb = stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f));
  return `rgb(${rgb.join(",")})`;
}

interface HeatCellProps {
  cx?: number;
  cy?: number;
  xAxis?: { width: number };
  yAxis?: { height: number };
  payload?: { requests: number; t: number };
}

function HeatCell({ cx = 0, cy = 0, xAxis, yAxis, payload }: HeatCellProps) {
  const w = (xAxis?.width ?? 0) / 7;
  const h = (yAxis?.height ?? 0) / AREAS.length;
  const t = payload?.t ?? 0;
  return (
    <g>
      <rect x={cx - w / 2 + 2} y={cy - h / 2 + 2} width={Math.max(0, w - 4)} height={Math.max(0, h - 4)} rx={6} fill={heat(t)} stroke={C.line} strokeOpacity={t < 0.1 ? 1 : 0} />
      {w > 34 && (
        <text x={cx} y={cy} dy="0.35em" textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono, monospace" fill={t > 0.65 ? C.card : C.ink} fillOpacity={0.85}>
          {payload?.requests}
        </text>
      )}
    </g>
  );
}

export function DemandHeatmap({ report }: { report: AnalyticsReport }) {
  const max = Math.max(1, ...report.heatmap.map((d) => d.requests));
  const data = report.heatmap.map((d) => ({ ...d, y: AREAS.indexOf(d.area), t: d.requests / max }));
  return (
    <div>
      <ResponsiveContainer width="100%" height={AREAS.length * 44 + 32}>
        <ScatterChart margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
          <XAxis type="number" dataKey="weekday" domain={[-0.5, 6.5]} ticks={[0, 1, 2, 3, 4, 5, 6]} tickFormatter={(i: number) => WEEKDAYS[i]} {...axisProps} interval={0} />
          <YAxis
            type="number"
            dataKey="y"
            domain={[-0.5, AREAS.length - 0.5]}
            ticks={AREAS.map((_, i) => i)}
            tickFormatter={(i: number) => AREAS[i]}
            reversed
            {...axisProps}
            tick={{ ...axisProps.tick, fontFamily: "DM Sans, sans-serif", fill: C.ink }}
            width={84}
            interval={0}
          />
          <ZAxis range={[1, 1]} />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !d) return null;
              return (
                <div className="rounded-md border border-border bg-card/95 px-3 py-2 text-xs shadow-card">
                  <p className="font-medium text-ink">
                    {d.area} · {WEEKDAYS[d.weekday]}
                  </p>
                  <p className="font-mono text-muted">
                    {d.requests} requests · {pct(d.t)} of peak
                  </p>
                </div>
              );
            }}
          />
          <Scatter data={data} shape={<HeatCell />} isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-end gap-2 font-mono text-[10px] text-muted">
        <span>fewer</span>
        <span className="h-2 w-28 rounded-full" style={{ background: `linear-gradient(90deg, ${heat(0)}, ${heat(0.33)}, ${heat(0.66)}, ${heat(1)})` }} />
        <span>more</span>
      </div>
    </div>
  );
}

/* ---------------- Top categories ---------------- */

export function TopCategoriesChart({ report }: { report: AnalyticsReport }) {
  const data = report.topCategories.slice(0, 6).map((d, i) => ({ ...d, name: CATEGORY_LABEL[d.category], fill: SERIES[i % SERIES.length] }));
  const total = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
      <div className="relative mx-auto size-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="revenue" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={2} stroke={C.card} strokeWidth={2} cornerRadius={4}>
              {data.map((d) => (
                <Cell key={d.category} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip rows={(p) => `₹${formatINR(Number(p.value))}`} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-mono text-base tabular-nums text-ink">{compactINR(total)}</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">booked</p>
          </div>
        </div>
      </div>
      <ol className="space-y-2">
        {data.map((d, i) => (
          <li key={d.category} className="flex items-center gap-2 text-sm">
            <span className="w-4 font-mono text-[11px] text-muted">{i + 1}</span>
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.fill }} />
            <span className="min-w-0 flex-1 truncate text-text">{d.name}</span>
            <span className="font-mono text-xs tabular-nums text-muted">{d.bookings} bk</span>
            <span className="w-14 text-right font-mono text-xs tabular-nums text-ink">{total ? pct(d.revenue / total) : "—"}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------- Acceptance rate ---------------- */

export function AcceptanceChart({ report }: { report: AnalyticsReport }) {
  const rate = report.totals.acceptanceRate;
  const prev = report.previous.acceptanceRate;
  const gauge = [{ name: "Accepted", value: rate * 100, fill: rate >= 0.6 ? C.peacock : rate >= 0.4 ? C.marigold : C.conflict }];
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[170px_1fr]">
      <div className="relative mx-auto h-[150px] w-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart data={gauge} startAngle={210} endAngle={-30} innerRadius="78%" outerRadius="100%" barSize={14}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar dataKey="value" cornerRadius={999} background={{ fill: C.sand }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-3xl text-ink">{pct(rate)}</p>
            <p className="font-mono text-[10px] text-muted">
              {rate >= prev ? "▲" : "▼"} {Math.abs(Math.round((rate - prev) * 100))} pts
            </p>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={report.acceptance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="date" {...axisProps} tickFormatter={(d: string) => format(parseDay(d), "d MMM")} minTickGap={28} />
          <YAxis {...axisProps} domain={[0, 1]} ticks={[0, 0.5, 1]} tickFormatter={(v: number) => pct(v)} width={40} />
          <Tooltip
            cursor={{ stroke: C.ink, strokeOpacity: 0.15 }}
            content={({ active, payload, label }) => {
              const d = payload?.[0]?.payload as AnalyticsReport["acceptance"][number] | undefined;
              if (!active || !d) return null;
              return (
                <div className="rounded-md border border-border bg-card/95 px-3 py-2 text-xs shadow-card">
                  <p className="font-medium text-ink">{bucketLabel(String(label), report.bucket)}</p>
                  <p className="font-mono text-muted">
                    {d.accepted}/{d.total} accepted · {pct(d.rate)}
                  </p>
                </div>
              );
            }}
          />
          <Line type="monotone" dataKey="rate" name="Acceptance" stroke={C.peacock} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: C.card, stroke: C.peacock, strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
