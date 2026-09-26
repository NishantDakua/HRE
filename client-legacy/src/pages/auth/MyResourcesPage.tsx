import { Link } from 'react-router-dom';
import { Plus, Package, Layers, IndianRupee, Gauge } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';
import StatCard from '../../components/dashboard/StatCard';

type ResourceStatus = 'Active' | 'Low Stock' | 'Inactive';

interface OwnedResource {
  id: string;
  name: string;
  category: string;
  available: number;
  reserved: number;
  total: number;
  price: number;
  unit: string;
  status: ResourceStatus;
}

const resources: OwnedResource[] = [
  { id: 'RES-201', name: 'Executive Conference Hall', category: 'Venues & Spaces', available: 1, reserved: 0, total: 1, price: 45000, unit: 'per day', status: 'Active' },
  { id: 'RES-202', name: 'Round Banquet Tables', category: 'Furniture', available: 40, reserved: 20, total: 60, price: 120, unit: 'per table', status: 'Active' },
  { id: 'RES-203', name: 'Linen & Table Runners', category: 'Hospitality Supplies', available: 15, reserved: 85, total: 100, price: 60, unit: 'per set', status: 'Low Stock' },
  { id: 'RES-204', name: 'Event Staffing Pool', category: 'Manpower', available: 25, reserved: 5, total: 30, price: 800, unit: 'per staff/day', status: 'Active' },
  { id: 'RES-205', name: 'Portable Stage Kit', category: 'Event Infrastructure', available: 0, reserved: 2, total: 2, price: 18000, unit: 'per event', status: 'Inactive' },
];

const statusStyles: Record<ResourceStatus, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  'Low Stock': 'bg-amber-50 text-amber-700',
  Inactive: 'bg-slate-100 text-slate-500',
};

export default function MyResourcesPage() {
  const totalValue = resources.reduce((sum, r) => sum + r.total * r.price, 0);
  const activeCount = resources.filter((r) => r.status === 'Active').length;
  const avgUtilization = Math.round(
    (resources.reduce((sum, r) => sum + r.reserved / r.total, 0) / resources.length) * 100
  );

  return (
    <div>
      <PageHeader
        title="My Resources"
        subtitle="Spare capacity you're listing on the HRE marketplace"
        action={
          <Link to="/resources/new" className="btn-primary">
            <Plus size={18} />
            Add Resource
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Package} label="Total Resources" value={String(resources.length)} color="blue" />
        <StatCard icon={Layers} label="Active Listings" value={String(activeCount)} color="emerald" />
        <StatCard icon={IndianRupee} label="Total Inventory Value" value={`₹${totalValue.toLocaleString('en-IN')}`} color="violet" />
        <StatCard icon={Gauge} label="Avg. Utilization" value={`${avgUtilization}%`} color="amber" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-semibold">Resource</th>
              <th className="px-5 py-3 font-semibold">Category</th>
              <th className="px-5 py-3 font-semibold">Available</th>
              <th className="px-5 py-3 font-semibold">Reserved</th>
              <th className="px-5 py-3 font-semibold">Total</th>
              <th className="px-5 py-3 font-semibold">Price</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-900">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.id}</p>
                </td>
                <td className="px-5 py-4 text-slate-600">{r.category}</td>
                <td className="px-5 py-4 text-slate-600">{r.available}</td>
                <td className="px-5 py-4 text-slate-600">{r.reserved}</td>
                <td className="px-5 py-4 text-slate-600">{r.total}</td>
                <td className="px-5 py-4 text-slate-600">&#8377;{r.price.toLocaleString('en-IN')} <span className="text-xs text-slate-400">{r.unit}</span></td>
                <td className="px-5 py-4">
                  <span className={`badge ${statusStyles[r.status]}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
