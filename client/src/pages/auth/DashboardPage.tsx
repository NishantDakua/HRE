import { Link } from 'react-router-dom';
import {
  ClipboardList,
  CalendarCheck,
  MessageSquare,
  Wallet,
  ArrowRight,
  MessageCircle,
  PackageCheck,
  Truck,
  BadgeCheck,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';
import StatCard from '../../components/dashboard/StatCard';

const stats = [
  { icon: ClipboardList, label: 'Active Requirements', value: '12', delta: '+2 this week', color: 'blue' as const },
  { icon: CalendarCheck, label: 'Active Bookings', value: '8', delta: '3 in progress', color: 'emerald' as const },
  { icon: MessageSquare, label: 'Pending Negotiations', value: '5', delta: '2 new offers', color: 'amber' as const },
  { icon: Wallet, label: 'Amount in Progress', value: '₹1,25,000', delta: 'Across 4 bookings', color: 'violet' as const },
];

const activity = [
  {
    icon: MessageCircle,
    color: 'bg-amber-50 text-amber-600',
    text: 'Provider B sent a counter offer for 100 Chairs',
    time: '15 minutes ago',
    tag: 'New',
    actions: true,
  },
  {
    icon: BadgeCheck,
    color: 'bg-emerald-50 text-emerald-600',
    text: 'Booking confirmed with Royal Caterers',
    time: '2 hours ago',
  },
  {
    icon: Truck,
    color: 'bg-blue-50 text-blue-600',
    text: '100 Chairs marked as dispatched',
    time: '4 hours ago',
  },
  {
    icon: Wallet,
    color: 'bg-violet-50 text-violet-600',
    text: 'Payment released to Provider A',
    time: '1 day ago',
  },
  {
    icon: ShieldCheck,
    color: 'bg-emerald-50 text-emerald-600',
    text: 'Business verification completed',
    time: '1 day ago',
  },
];

export default function DashboardPage() {
  return (
    <div className="px-8 py-6 space-y-8">
      <PageHeader
        title="Good morning, Hotel Sunrise 👋"
        subtitle="Here's what's happening with your requirements."
        verified
        action={
          <Link to="/requirements/new" className="btn-primary">
            <Plus size={18} /> Post New Requirement
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Recent Activity</h3>
            <Link to="/notifications" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {activity.map((item, idx) => {
              const Icon = item.icon;
              return (
                <li key={idx} className="flex items-center gap-4 py-3.5">
                  <span className={`icon-chip h-10 w-10 flex-shrink-0 ${item.color}`}>
                    <Icon size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.text}</p>
                      {item.tag && <span className="badge bg-rose-50 text-rose-600 flex-shrink-0">{item.tag}</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{item.time}</p>
                  </div>
                  {item.actions && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="btn-secondary py-1.5 px-3 text-sm">View</button>
                      <button className="btn-primary py-1.5 px-3 text-sm">Respond</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-slate-900 mb-4">Fulfillment Snapshot</h3>
          <div className="flex items-center gap-3 mb-4">
            <span className="icon-chip h-10 w-10 bg-blue-50 text-blue-600">
              <PackageCheck size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">Order #HRE1024</p>
              <p className="text-xs text-slate-400">300 Chairs · 3 Providers</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
            <div className="h-full bg-blue-600" style={{ width: '67%' }} />
          </div>
          <p className="text-xs text-slate-500 mb-4">2 / 3 providers fulfilled — 67%</p>
          <Link to="/fulfillment" className="text-sm font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
            Track Fulfillment <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
