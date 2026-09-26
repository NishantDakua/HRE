import { IndianRupee, CheckCircle2, Clock, Users } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';
import StatCard from '../../components/dashboard/StatCard';

const spendByCategory = [
  { label: 'Catering', value: 420000 },
  { label: 'Furniture', value: 180000 },
  { label: 'Venues', value: 310000 },
  { label: 'Transport', value: 95000 },
  { label: 'Manpower', value: 140000 },
];

const fulfillmentTrend = [
  { label: 'May', value: 68 },
  { label: 'Jun', value: 74 },
  { label: 'Jul', value: 71 },
  { label: 'Aug', value: 83 },
  { label: 'Sep', value: 91 },
];

const maxSpend = Math.max(...spendByCategory.map((d) => d.value));

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader title="Analytics" subtitle="Procurement performance across your requirements" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={IndianRupee} label="Total Spend" value="₹1,145,000" color="violet" />
        <StatCard icon={CheckCircle2} label="Requirements Fulfilled" value="38" color="emerald" />
        <StatCard icon={Clock} label="Avg. Fulfillment Time" value="3.2 days" color="amber" />
        <StatCard icon={Users} label="Active Providers" value="12" color="blue" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="mb-1">Spend by Category</h3>
          <p className="mb-6 text-sm text-slate-500">Last 6 months</p>
          <div className="flex items-end gap-4 h-48">
            {spendByCategory.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">&#8377;{Math.round(d.value / 1000)}k</span>
                <div
                  className="w-full rounded-t-lg bg-blue-500"
                  style={{ height: `${(d.value / maxSpend) * 100}%` }}
                />
                <span className="text-xs text-slate-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="mb-1">Fulfillment Rate Over Time</h3>
          <p className="mb-6 text-sm text-slate-500">Percentage of requirements fully matched</p>
          <div className="flex items-end gap-4 h-48">
            {fulfillmentTrend.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">{d.value}%</span>
                <div
                  className="w-full rounded-t-lg bg-emerald-500"
                  style={{ height: `${d.value}%` }}
                />
                <span className="text-xs text-slate-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
