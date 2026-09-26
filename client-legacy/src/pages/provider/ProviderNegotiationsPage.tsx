import { Send } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

type NegotiationStatus = 'Awaiting Response' | 'Countered' | 'Accepted';

interface ProviderNegotiation {
  id: string;
  buyer: string;
  resource: string;
  quantity: number;
  unit: string;
  yourOffer: number;
  buyerCounter: number | null;
  status: NegotiationStatus;
}

const negotiations: ProviderNegotiation[] = [
  { id: 'NEG-501', buyer: 'Hotel Sunrise', resource: 'Premium Banquet Chairs', quantity: 500, unit: 'chairs', yourOffer: 150, buyerCounter: 140, status: 'Countered' },
  { id: 'NEG-498', buyer: 'The Grand Palm', resource: 'Round Banquet Tables', quantity: 80, unit: 'tables', yourOffer: 120, buyerCounter: null, status: 'Awaiting Response' },
  { id: 'NEG-495', buyer: 'Coastal Retreat Resort', resource: 'Cocktail Lounge Furniture', quantity: 6, unit: 'sets', yourOffer: 3200, buyerCounter: 3000, status: 'Countered' },
  { id: 'NEG-488', buyer: 'Heritage Banquet Hall', resource: 'Premium Banquet Chairs', quantity: 350, unit: 'chairs', yourOffer: 145, buyerCounter: 145, status: 'Accepted' },
];

const statusStyles: Record<NegotiationStatus, string> = {
  'Awaiting Response': 'bg-amber-50 text-amber-700',
  Countered: 'bg-blue-50 text-blue-700',
  Accepted: 'bg-emerald-50 text-emerald-700',
};

export default function ProviderNegotiationsPage() {
  return (
    <div>
      <PageHeader title="Negotiations" subtitle="Active price negotiations with buyers" />

      <div className="space-y-3">
        {negotiations.map((n) => (
          <div key={n.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-[200px]">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{n.buyer}</p>
                <span className={`badge ${statusStyles[n.status]}`}>{n.status}</span>
              </div>
              <p className="text-xs text-slate-400">{n.id} &middot; {n.resource} &middot; {n.quantity} {n.unit}</p>
            </div>

            <div className="text-sm text-slate-600">
              <p className="text-xs text-slate-400">Your Offer</p>
              <p className="font-medium text-slate-900">&#8377;{n.yourOffer.toLocaleString('en-IN')}</p>
            </div>

            <div className="text-sm text-slate-600">
              <p className="text-xs text-slate-400">Buyer's Counter</p>
              <p className="font-medium text-slate-900">{n.buyerCounter ? `₹${n.buyerCounter.toLocaleString('en-IN')}` : '—'}</p>
            </div>

            <button className="btn-primary text-sm py-2 px-4">
              <Send size={14} />
              Send Counter Offer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
