import { ChevronRight } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

type FulfillmentStatus = 'Preparing' | 'In Transit' | 'Delivered';
type PaymentStatus = 'Pending' | 'Released';

interface ProviderBooking {
  id: string;
  buyer: string;
  resource: string;
  quantity: number;
  unit: string;
  agreedPrice: number;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
}

const bookings: ProviderBooking[] = [
  { id: 'BKG-3021', buyer: 'Hotel Sunrise', resource: 'Premium Banquet Chairs', quantity: 500, unit: 'chairs', agreedPrice: 145, fulfillmentStatus: 'Preparing', paymentStatus: 'Pending' },
  { id: 'BKG-3019', buyer: 'The Grand Palm', resource: 'Round Banquet Tables', quantity: 80, unit: 'tables', agreedPrice: 120, fulfillmentStatus: 'In Transit', paymentStatus: 'Pending' },
  { id: 'BKG-3015', buyer: 'Coastal Retreat Resort', resource: 'Cocktail Lounge Furniture', quantity: 6, unit: 'sets', agreedPrice: 3000, fulfillmentStatus: 'Delivered', paymentStatus: 'Released' },
  { id: 'BKG-3008', buyer: 'Heritage Banquet Hall', resource: 'Premium Banquet Chairs', quantity: 350, unit: 'chairs', agreedPrice: 145, fulfillmentStatus: 'Delivered', paymentStatus: 'Released' },
  { id: 'BKG-2998', buyer: 'Lakeside Convention Centre', resource: 'LED Stage Lighting Rig', quantity: 2, unit: 'rigs', agreedPrice: 15000, fulfillmentStatus: 'In Transit', paymentStatus: 'Pending' },
];

const fulfillmentStyles: Record<FulfillmentStatus, string> = {
  Preparing: 'bg-amber-50 text-amber-700',
  'In Transit': 'bg-blue-50 text-blue-700',
  Delivered: 'bg-emerald-50 text-emerald-700',
};

const paymentStyles: Record<PaymentStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Released: 'bg-emerald-50 text-emerald-700',
};

export default function ProviderBookingsPage() {
  return (
    <div>
      <PageHeader title="Bookings" subtitle="Confirmed orders awaiting or in fulfillment" />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-semibold">Booking ID</th>
              <th className="px-5 py-3 font-semibold">Buyer</th>
              <th className="px-5 py-3 font-semibold">Resource / Qty</th>
              <th className="px-5 py-3 font-semibold">Agreed Price</th>
              <th className="px-5 py-3 font-semibold">Fulfillment</th>
              <th className="px-5 py-3 font-semibold">Payment</th>
              <th className="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-5 py-4 font-medium text-slate-900">{b.id}</td>
                <td className="px-5 py-4 text-slate-600">{b.buyer}</td>
                <td className="px-5 py-4 text-slate-600">{b.resource} &middot; {b.quantity} {b.unit}</td>
                <td className="px-5 py-4 text-slate-600">&#8377;{b.agreedPrice.toLocaleString('en-IN')}</td>
                <td className="px-5 py-4">
                  <span className={`badge ${fulfillmentStyles[b.fulfillmentStatus]}`}>{b.fulfillmentStatus}</span>
                </td>
                <td className="px-5 py-4">
                  <span className={`badge ${paymentStyles[b.paymentStatus]}`}>{b.paymentStatus}</span>
                </td>
                <td className="px-5 py-4">
                  <button className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
                    View
                    <ChevronRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
