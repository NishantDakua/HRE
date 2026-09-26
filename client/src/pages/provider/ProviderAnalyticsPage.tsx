import { CheckCircle2, Star, ShoppingBag, Users } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';
import StatCard from '../../components/dashboard/StatCard';

const ordersByCategory = [
  { label: 'Chairs', value: 42 },
  { label: 'Tables', value: 28 },
  { label: 'Lighting', value: 9 },
  { label: 'Lounge', value: 15 },
  { label: 'Staging', value: 6 },
];

const revenueTrend = [
  { label: 'May', value: 180000 },
  { label: 'Jun', value: 220000 },
  { label: 'Jul', value: 195000 },
  { label: 'Aug', value: 260000 },
  { label: 'Sep', value: 310000 },
];

const maxOrders = Math.max(...ordersByCategory.map((d) => d.value));
const maxRevenue = Math.max(...revenueTrend.map((d) => d.value));

export default function ProviderAnalyticsPage() {
  return (
    <div>
      <PageHeader title="Analytics" subtitle="Your performance across bookings and buyers" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={CheckCircle2} label="Fulfillment Rate" value="96%" color="emerald" />
        <StatCard icon={Star} label="Avg Rating" value="4.7" color="amber" />
        <StatCard icon={ShoppingBag} label="Total Orders" value="100" color="blue" />
        <StatCard icon={Users} label="Repeat Buyers" value="34" color="violet" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="mb-1">Orders by Category</h3>
          <p className="mb-6 text-sm text-slate-500">Last 6 months</p>
          <div className="flex items-end gap-4 h-48">
            {ordersByCategory.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">{d.value}</span>
                <div
                  className="w-full rounded-t-lg bg-blue-500"
                  style={{ height: `${(d.value / maxOrders) * 100}%` }}
                />
                <span className="text-xs text-slate-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="mb-1">Revenue Over Time</h3>
          <p className="mb-6 text-sm text-slate-500">Gross revenue per month</p>
          <div className="flex items-end gap-4 h-48">
            {revenueTrend.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">&#8377;{Math.round(d.value / 1000)}k</span>
                <div
                  className="w-full rounded-t-lg bg-emerald-500"
                  style={{ height: `${(d.value / maxRevenue) * 100}%` }}
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
