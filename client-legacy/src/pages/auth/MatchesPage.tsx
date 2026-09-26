import { useNavigate } from 'react-router-dom';
import { CheckCircle2, MapPin } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

const providers = [
  { name: 'Provider A', business: 'Hotel Sunrise', qty: 150, price: 30, status: 'Available In Stock' },
  { name: 'Provider B', business: 'Grand Events', qty: 100, price: 32, status: 'Available In Stock' },
  { name: 'Provider C', business: 'Royal Caterers', qty: 50, price: 35, status: 'Available In Stock' },
];

const totalQty = providers.reduce((s, p) => s + p.qty, 0);
const totalCost = providers.reduce((s, p) => s + p.qty * p.price, 0);

export default function MatchesPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader title="Best Options for You" subtitle="HRE combined available capacity to fully cover your requirement." />

      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-6 py-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-emerald-600" size={22} />
          <div>
            <p className="font-bold text-emerald-800">Requirement can be fully fulfilled!</p>
            <p className="text-sm text-emerald-600">
              {totalQty} Chairs from {providers.length} providers
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-emerald-600 font-semibold">Estimated Total Cost</p>
          <p className="text-xl font-bold text-emerald-800">₹{totalCost.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="card divide-y divide-slate-100">
        {providers.map((p) => (
          <div key={p.name} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                {p.name.split(' ')[1]}
              </span>
              <div>
                <p className="font-semibold text-slate-900">
                  {p.name} <span className="text-slate-400 font-normal">· {p.business}</span>
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={12} /> {p.qty} Chairs · <span className="badge bg-emerald-50 text-emerald-700">{p.status}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">₹{p.price} / chair</p>
              <p className="text-xs text-slate-400">Sub: ₹{(p.qty * p.price).toLocaleString('en-IN')}</p>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-50/60">
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-slate-400">Total Quantity</p>
              <p className="font-bold text-slate-900">{totalQty} / {totalQty} Chairs</p>
            </div>
            <div>
              <p className="text-slate-400">Providers</p>
              <p className="font-bold text-slate-900">{providers.length}</p>
            </div>
            <div>
              <p className="text-slate-400">Est. Delivery</p>
              <p className="font-bold text-slate-900">25 Oct 2026</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/negotiations')} className="btn-secondary">
              Negotiate
            </button>
            <button onClick={() => navigate('/bookings/new')} className="btn-primary">
              Book Complete Bundle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
