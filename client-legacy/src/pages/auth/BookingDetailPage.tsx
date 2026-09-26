import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

const items = [
  { name: 'Provider A', business: 'Hotel Sunrise', qty: 150, price: 28 },
  { name: 'Provider B', business: 'Grand Events', qty: 100, price: 31 },
  { name: 'Provider C', business: 'Royal Caterers', qty: 50, price: 34 },
];

const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
const delivery = 450;
const total = subtotal + delivery;

export default function BookingDetailPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader title="Confirm Your HRE Bundle" subtitle="Here's your booking summary." />

      <div className="card divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                {item.name.split(' ')[1]}
              </span>
              <div>
                <p className="font-semibold text-slate-900">
                  {item.name} <span className="text-slate-400 font-normal">· {item.business}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{item.qty} Chairs × ₹{item.price}</p>
              </div>
            </div>
            <p className="font-bold text-slate-900">₹{(item.qty * item.price).toLocaleString('en-IN')}</p>
          </div>
        ))}

        <div className="px-6 py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold text-slate-800">₹{subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Delivery Charges</span>
            <span className="font-semibold text-slate-800">₹{delivery.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-900">Grand Total</span>
            <span className="font-bold text-blue-600 text-lg">₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60">
          <p className="flex items-center gap-2 text-xs text-slate-500 max-w-sm">
            <Info size={14} className="flex-shrink-0" />
            Payment will be held securely and released to each provider after delivery is confirmed.
          </p>
          <button onClick={() => navigate('/fulfillment')} className="btn-primary">
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  );
}
