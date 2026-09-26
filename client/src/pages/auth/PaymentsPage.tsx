import { Wallet, Clock, ShieldCheck, CalendarDays } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';
import StatCard from '../../components/dashboard/StatCard';

type PaymentStatus = 'Paid' | 'Pending' | 'Escrow' | 'Released';

interface PaymentRow {
  bookingId: string;
  provider: string;
  amount: number;
  status: PaymentStatus;
  date: string;
}

const payments: PaymentRow[] = [
  { bookingId: 'BKG-3021', provider: 'Royal Caterers', amount: 135000, status: 'Paid', date: '2026-09-20' },
  { bookingId: 'BKG-3019', provider: 'Metro Hospitality', amount: 75000, status: 'Released', date: '2026-09-18' },
  { bookingId: 'BKG-3015', provider: 'Urban Banquets', amount: 45000, status: 'Escrow', date: '2026-09-14' },
  { bookingId: 'BKG-3012', provider: 'Grand Events', amount: 92500, status: 'Pending', date: '2026-09-11' },
  { bookingId: 'BKG-3008', provider: 'Elite Services', amount: 18000, status: 'Paid', date: '2026-09-06' },
  { bookingId: 'BKG-3005', provider: 'Royal Caterers', amount: 60000, status: 'Released', date: '2026-09-02' },
  { bookingId: 'BKG-2998', provider: 'Metro Hospitality', amount: 24000, status: 'Pending', date: '2026-08-27' },
  { bookingId: 'BKG-2991', provider: 'Urban Banquets', amount: 51000, status: 'Paid', date: '2026-08-21' },
];

const statusStyles: Record<PaymentStatus, string> = {
  Paid: 'bg-emerald-50 text-emerald-700',
  Released: 'bg-emerald-50 text-emerald-700',
  Escrow: 'bg-violet-50 text-violet-700',
  Pending: 'bg-amber-50 text-amber-700',
};

export default function PaymentsPage() {
  const totalPaid = payments.filter((p) => p.status === 'Paid' || p.status === 'Released').reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);
  const escrow = payments.filter((p) => p.status === 'Escrow').reduce((s, p) => s + p.amount, 0);
  const thisMonth = payments.filter((p) => new Date(p.date).getMonth() === new Date('2026-09-26').getMonth()).reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <PageHeader title="Payments" subtitle="Track transactions across all your bookings" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Wallet} label="Total Paid" value={`₹${totalPaid.toLocaleString('en-IN')}`} color="emerald" />
        <StatCard icon={Clock} label="Pending Payments" value={`₹${pending.toLocaleString('en-IN')}`} color="amber" />
        <StatCard icon={ShieldCheck} label="In Escrow" value={`₹${escrow.toLocaleString('en-IN')}`} color="violet" />
        <StatCard icon={CalendarDays} label="This Month" value={`₹${thisMonth.toLocaleString('en-IN')}`} color="blue" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-semibold">Booking ID</th>
              <th className="px-5 py-3 font-semibold">Provider</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.bookingId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-5 py-4 font-medium text-slate-900">{p.bookingId}</td>
                <td className="px-5 py-4 text-slate-600">{p.provider}</td>
                <td className="px-5 py-4 text-slate-600">&#8377;{p.amount.toLocaleString('en-IN')}</td>
                <td className="px-5 py-4">
                  <span className={`badge ${statusStyles[p.status]}`}>{p.status}</span>
                </td>
                <td className="px-5 py-4 text-slate-500">
                  {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
