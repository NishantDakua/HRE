import { Link } from 'react-router-dom';
import { Package, ShoppingBag, MessageSquare, Wallet, Plus } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';
import StatCard from '../../components/dashboard/StatCard';

const stats = [
  { icon: Package, label: 'Resources Listed', value: '42', color: 'blue' as const },
  { icon: ShoppingBag, label: 'Active Orders', value: '6', color: 'emerald' as const },
  { icon: MessageSquare, label: 'Pending Negotiations', value: '3', color: 'amber' as const },
  { icon: Wallet, label: 'Pending Payments', value: '₹82,400', color: 'violet' as const },
];

const inquiries = [
  { business: 'Event Zenith', resource: 'Banquet Chairs', qty: '150 Chairs', date: '26 Oct 2026' },
  { business: 'Hotel Sunrise', resource: 'Round Tables', qty: '50 Tables', date: '28 Oct 2026' },
  { business: 'Royal Caterers', resource: 'Sound System', qty: '5 Units', date: '28 Oct 2026' },
];

const inventory = [
  { name: 'Banquet Chairs', available: 150, reserved: 50, total: 200, status: 'Available' },
  { name: 'Round Tables', available: 50, reserved: 10, total: 60, status: 'Available' },
  { name: 'Sound System', available: 5, reserved: 2, total: 7, status: 'Available' },
  { name: 'Event Stage', available: 2, reserved: 1, total: 3, status: 'Low Stock' },
];

export default function ProviderDashboardPage() {
  return (
    <div>
      <PageHeader
        title="Good evening, Grand Events 👋"
        subtitle="Here's your business update."
        action={
          <Link to="/provider/resources" className="btn-primary">
            <Plus size={18} /> Add Resource
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Recent Inquiries</h3>
            <Link to="/provider/requests" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {inquiries.map((inq) => (
              <li key={inq.business} className="flex items-center justify-between gap-3 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">
                    {inq.business.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{inq.business}</p>
                    <p className="text-xs text-slate-400">{inq.resource} · {inq.qty} · {inq.date}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button className="btn-secondary py-1.5 px-3 text-sm">View</button>
                  <button className="btn-primary py-1.5 px-3 text-sm">Respond</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Inventory Overview</h3>
            <Link to="/provider/resources" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase">
                <th className="pb-2 font-semibold">Resource</th>
                <th className="pb-2 font-semibold">Avail.</th>
                <th className="pb-2 font-semibold">Reserved</th>
                <th className="pb-2 font-semibold">Total</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.map((item) => (
                <tr key={item.name}>
                  <td className="py-2.5 font-medium text-slate-800">{item.name}</td>
                  <td className="py-2.5 text-slate-600">{item.available}</td>
                  <td className="py-2.5 text-slate-600">{item.reserved}</td>
                  <td className="py-2.5 text-slate-600">{item.total}</td>
                  <td className="py-2.5">
                    <span
                      className={`badge ${
                        item.status === 'Available' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-semibold text-slate-700">Overall Progress</span>
              <span className="font-bold text-slate-900">2 / 3 providers fulfilled — 67%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: '67%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
