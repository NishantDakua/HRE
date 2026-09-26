import { useState } from 'react';
import { Wallet, PackageCheck, Users, Gauge, ArrowUpRight, ArrowDownRight, ChevronDown, type LucideIcon } from 'lucide-react';
import type { Procurement } from '../../types/home';
import { formatINR, formatINRCompact } from '../../lib/hospitality';

const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
const OTHER = '#b4b2ab';
const PERIODS = [3, 6, 12];

interface ProcurementPanelProps {
  procurement: Procurement | undefined;
  months: number;
  onMonthsChange: (months: number) => void;
  refreshing: boolean;
}

export default function ProcurementPanel({ procurement, months, onMonthsChange, refreshing }: ProcurementPanelProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#f3f7fe] to-white p-5 ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">See Your Procurement Clearly.</h2>
          <p className="mt-0.5 text-sm text-slate-500">Make better decisions with real insights.</p>
        </div>
        <label className="relative">
          <span className="sr-only">Time period</span>
          <select
            value={months}
            onChange={(e) => onMonthsChange(Number(e.target.value))}
            className="appearance-none rounded-lg bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 focus:outline-none focus:ring-blue-400"
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>Last {p} Months</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        </label>
      </div>

      {procurement ? (
        <div className={`transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={Wallet} value={formatINRCompact(procurement.totalSpend)} label="Procurement Spend" delta={procurement.deltas.spend} unit="%" />
            <Kpi icon={PackageCheck} value={procurement.resourcesAcquired.toLocaleString('en-IN')} label="Resources Acquired" delta={procurement.deltas.resources} unit="%" />
            <Kpi icon={Users} value={String(procurement.providersUsed)} label="Providers Used" delta={procurement.deltas.providers} unit="%" />
            <Kpi icon={Gauge} value={`${procurement.fulfillmentRate}%`} label="Fulfillment Rate" delta={procurement.deltas.fulfillment} unit=" pts" />
          </div>

          {procurement.totalSpend === 0 ? (
            <p className="mt-4 rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
              No bookings in this period yet.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <MonthlyChart monthly={procurement.monthly} />
              <CategoryDonut distribution={procurement.categoryDistribution} total={procurement.totalSpend} />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
          <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
        </div>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, value, label, delta, unit }: { icon: LucideIcon; value: string; label: string; delta: number | null; unit: string }) {
  const up = delta !== null && delta >= 0;
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Icon size={15} />
        </span>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{label}</p>
      {delta !== null && (
        <p className={`mt-1 flex items-center gap-0.5 text-[11px] font-semibold ${up ? 'text-emerald-700' : 'text-rose-700'}`}>
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {up ? '+' : ''}
          {delta}
          {unit} <span className="font-normal text-slate-400">vs prior</span>
        </p>
      )}
    </div>
  );
}

function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function MonthlyChart({ monthly }: { monthly: Procurement['monthly'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceCeiling(Math.max(...monthly.map((m) => m.amount)));
  const latest = monthly.length - 1;

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-slate-900">Monthly Procurement</p>
      <div className="mt-3 flex gap-2">
        <div className="flex h-40 flex-col justify-between pb-5 text-right text-[10px] text-slate-400">
          <span>{formatINRCompact(max)}</span>
          <span>{formatINRCompact(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative h-40 flex-1">
          <div className="absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between" aria-hidden="true">
            {[0, 1, 2].map((i) => <span key={i} className="border-t border-slate-100" />)}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-5 flex items-end gap-[2px]" role="list" aria-label="Monthly procurement spend">
            {monthly.map((m, idx) => {
              const pct = (m.amount / max) * 100;
              const active = hover === idx;
              return (
                <div
                  key={`${m.label}-${idx}`}
                  role="listitem"
                  aria-label={`${m.label}: ${formatINR(m.amount)}`}
                  className="relative flex h-full flex-1 items-end justify-center"
                  onMouseEnter={() => setHover(idx)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div
                    className={`w-full max-w-[22px] rounded-t-[4px] transition-colors ${
                      idx === latest || active ? 'bg-[#1d5fb8]' : 'bg-[#2a78d6]/75'
                    }`}
                    style={{ height: `${Math.max(pct, 1)}%` }}
                  />
                  {(active || (hover === null && idx === latest)) && (
                    <span
                      className="absolute z-10 -translate-y-1.5 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white shadow"
                      style={{ bottom: `${Math.max(pct, 1)}%` }}
                    >
                      {active ? `${m.label}: ` : ''}
                      {formatINRCompact(m.amount)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex gap-[2px] text-[10px] text-slate-400">
            {monthly.map((m, idx) => (
              <span key={`${m.label}-${idx}`} className="flex-1 text-center">
                {monthly.length > 6 && idx % 2 === 1 ? '' : m.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryDonut({ distribution, total }: { distribution: Procurement['categoryDistribution']; total: number }) {
  const [hover, setHover] = useState<number | null>(null);

  const top = distribution.slice(0, SERIES.length);
  const rest = distribution.slice(SERIES.length);
  const restAmount = rest.reduce((s, d) => s + d.amount, 0);
  const segments = [
    ...top.map((d, i) => ({ name: d.name, amount: d.amount, color: SERIES[i] })),
    ...(restAmount > 0 ? [{ name: 'Others', amount: restAmount, color: OTHER }] : []),
  ].map((s) => ({ ...s, share: total ? Math.round((s.amount / total) * 100) : 0 }));

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const gap = segments.length > 1 ? 2 : 0;
  let offset = 0;
  const focused = hover !== null ? segments[hover] : null;

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-slate-900">Category Distribution</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-24 w-24 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Spend by category">
            {segments.map((s, idx) => {
              const length = (s.amount / total) * circumference;
              const dash = Math.max(length - gap, 0.5);
              const circle = (
                <circle
                  key={s.name}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={hover === idx ? 17 : 14}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  className="cursor-pointer transition-[stroke-width]"
                  onMouseEnter={() => setHover(idx)}
                  onMouseLeave={() => setHover(null)}
                >
                  <title>{`${s.name}: ${formatINR(s.amount)} (${s.share}%)`}</title>
                </circle>
              );
              offset += length;
              return circle;
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-bold text-slate-900">{focused ? `${focused.share}%` : formatINRCompact(total)}</span>
            <span className="max-w-[70px] truncate text-[9px] text-slate-500">{focused ? focused.name : 'Total spend'}</span>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {segments.map((s, idx) => (
            <li
              key={s.name}
              className={`flex items-center gap-2 rounded px-1 text-[11px] ${hover === idx ? 'bg-slate-50' : ''}`}
              onMouseEnter={() => setHover(idx)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="flex-1 truncate text-slate-600" title={s.name}>{s.name}</span>
              <span className="font-semibold text-slate-900">{s.share}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
