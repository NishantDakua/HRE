import { Link } from 'react-router-dom';
import { Plus, Package, ClipboardList, Star, IndianRupee } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';
import StatCard from '../../components/dashboard/StatCard';

type ResourceStatus = 'Active' | 'Low Stock' | 'Inactive';

interface ProviderResource {
  id: string;
  name: string;
  available: number;
  reserved: number;
  total: number;
  price: number;
  unit: string;
  status: ResourceStatus;
}

const resources: ProviderResource[] = [
  { id: 'RES-101', name: 'Premium Banquet Chairs', available: 1200, reserved: 800, total: 2000, price: 150, unit: 'per chair', status: 'Active' },
  { id: 'RES-102', name: 'Round Banquet Tables', available: 180, reserved: 120, total: 300, price: 120, unit: 'per table', status: 'Active' },
  { id: 'RES-103', name: 'Portable Dance Floor', available: 2, reserved: 3, total: 5, price: 22000, unit: 'per event', status: 'Low Stock' },
  { id: 'RES-104', name: 'LED Stage Lighting Rig', available: 0, reserved: 4, total: 4, price: 15000, unit: 'per day', status: 'Inactive' },
  { id: 'RES-105', name: 'Cocktail Lounge Furniture Set', available: 40, reserved: 10, total: 50, price: 3200, unit: 'per set', status: 'Active' },
];

const statusStyles: Record<ResourceStatus, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  'Low Stock': 'bg-amber-50 text-amber-700',
  Inactive: 'bg-slate-100 text-slate-500',
};

export default function ProviderResourcesPage() {
  const totalValue = resources.reduce((sum, r) => sum + r.total * r.price, 0);
  const activeOrders = 7;

  return (
    <div>
      <PageHeader
        title="My Resources"
        subtitle="Manage the inventory you list on the HRE marketplace"
        action={
          <Link to="/provider/resources" className="btn-primary">
            <Plus size={18} />
            Add Resource
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Package} label="Resources Listed" value={String(resources.length)} color="blue" />
        <StatCard icon={ClipboardList} label="Active Orders" value={String(activeOrders)} color="amber" />
        <StatCard icon={Star} label="Avg Rating" value="4.7" color="violet" />
        <StatCard icon={IndianRupee} label="Total Inventory Value" value={`₹${totalValue.toLocaleString('en-IN')}`} color="emerald" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-semibold">Resource</th>
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
