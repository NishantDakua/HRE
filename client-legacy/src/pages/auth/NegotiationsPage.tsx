import { useState } from 'react';
import PageHeader from '../../components/dashboard/PageHeader';

const initialProviders = [
  { name: 'Provider A', business: 'Hotel Sunrise', qty: 150, listedPrice: 30, offer: 27, status: 'In Negotiation' },
  { name: 'Provider B', business: 'Grand Events', qty: 100, listedPrice: 32, offer: 29, status: 'In Negotiation' },
  { name: 'Provider C', business: 'Royal Caterers', qty: 50, listedPrice: 35, offer: 32, status: 'In Negotiation' },
];

export default function NegotiationsPage() {
  const [providers, setProviders] = useState(initialProviders);

  const updateOffer = (name: string, offer: number) =>
    setProviders((prev) => prev.map((p) => (p.name === name ? { ...p, offer } : p)));

  return (
    <div>
      <PageHeader title="Negotiate with Providers" subtitle="Discuss and finalize the price with each provider." />

      <div className="space-y-4">
        {providers.map((p) => (
          <div key={p.name} className="card p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                {p.name.split(' ')[1]}
              </span>
              <div>
                <p className="font-semibold text-slate-900">
                  {p.name} <span className="text-slate-400 font-normal">· {p.business}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {p.qty} Chairs · Listed at ₹{p.listedPrice}/chair
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="badge bg-amber-50 text-amber-700">{p.status}</span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Your Offer ₹</label>
                <input
                  type="number"
                  value={p.offer}
                  onChange={(e) => updateOffer(p.name, Number(e.target.value))}
                  className="input-field w-24 py-2"
                />
              </div>
              <button className="btn-primary py-2 px-4 text-sm">Send Offer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
