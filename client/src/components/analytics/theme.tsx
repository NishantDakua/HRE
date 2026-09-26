import type { ReactNode } from "react";
import type { TooltipProps } from "recharts";

/** Hex mirrors of the CSS tokens — SVG presentation attributes can't read var(). */
export const C = {
  paper: "#FBF4E8",
  sand: "#F3E3C7",
  card: "#FFFDF8",
  ink: "#2A1F1A",
  muted: "#7A6A5E",
  line: "#E6D6BD",
  terracotta: "#D9653B",
  marigold: "#F2A93B",
  peacock: "#1F6F6B",
  conflict: "#C8412E",
  pending: "#7A6FB0",
  peach: "#F4C7A1",
  rose: "#E9B8B0",
  mint: "#B9D4C3",
  butter: "#F6DFA0",
  powder: "#CFE0E8",
} as const;

export const SERIES = [C.terracotta, C.marigold, C.peacock, C.pending, C.rose, C.mint, C.powder];

export const axisProps = {
  stroke: C.line,
  tick: { fill: C.muted, fontSize: 11, fontFamily: "JetBrains Mono, ui-monospace, monospace" },
  tickLine: false,
  axisLine: false,
} as const;

export const gridProps = { stroke: C.line, strokeDasharray: "3 4", vertical: false } as const;

export const compactINR = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `₹${(n / 1e3).toFixed(0)}k` : `₹${Math.round(n)}`;
export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

/** Warm paper tooltip shared by every chart. */
export function ChartTooltip({
  active,
  payload,
  label,
  title,
  rows,
}: TooltipProps<number, string> & {
  title?: (label: unknown, payload: NonNullable<TooltipProps<number, string>["payload"]>) => ReactNode;
  rows?: (p: NonNullable<TooltipProps<number, string>["payload"]>[number]) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[150px] rounded-md border border-border bg-card/95 px-3 py-2 text-xs shadow-card backdrop-blur">
      {(title || label !== undefined) && <p className="mb-1 font-medium text-ink">{title ? title(label, payload) : String(label)}</p>}
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <span className="size-2 rounded-full" style={{ background: p.color ?? (p.payload as { fill?: string })?.fill }} />
              {p.name}
            </span>
            <span className="font-mono tabular-nums text-ink">{rows ? rows(p) : p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartCard({
  title,
  kicker,
  action,
  className,
  children,
}: {
  title: ReactNode;
  kicker?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`surface flex flex-col p-5 ${className ?? ""}`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl tracking-tightest text-ink">{title}</h2>
          {kicker && <p className="mt-0.5 text-xs text-muted">{kicker}</p>}
        </div>
        {action}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
