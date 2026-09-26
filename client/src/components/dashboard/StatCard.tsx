import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: string;
  color: 'blue' | 'emerald' | 'amber' | 'violet';
}

const colorMap: Record<StatCardProps['color'], { chip: string; delta: string }> = {
  blue: { chip: 'bg-blue-50 text-blue-600', delta: 'bg-blue-50 text-blue-700' },
  emerald: { chip: 'bg-emerald-50 text-emerald-600', delta: 'bg-emerald-50 text-emerald-700' },
  amber: { chip: 'bg-amber-50 text-amber-600', delta: 'bg-amber-50 text-amber-700' },
  violet: { chip: 'bg-violet-50 text-violet-600', delta: 'bg-violet-50 text-violet-700' },
};

export default function StatCard({ icon: Icon, label, value, delta, color }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="stat-card">
      <span className={`icon-chip h-10 w-10 ${c.chip}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      {delta && (
        <span className={`badge ${c.delta} self-start`}>{delta}</span>
      )}
    </div>
  );
}
