import { Wallet, Clock, CalendarDays, TrendingUp } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';
import StatCard from '../../components/dashboard/StatCard';

type PaymentStatus = 'Pending' | 'Released';

interface ProviderPayment {
  buyer: string;
  bookingId: string;
  amount: number;
  status: PaymentStatus;
  date: string;
}

const payments: ProviderPayment[] = [
  { buyer: 'Hotel Sunrise', bookingId: 'BKG-3021', amount: 72500, status: 'Pending', date: '2026-09-24' },
  { buyer: 'The Grand Palm', bookingId: 'BKG-3019', amount: 9600, status: 'Pending', date: '2026-09-22' },
  { buyer: 'Coastal Retreat Resort', bookingId: 'BKG-3015', amount: 18000, status: 'Released', date: '2026-09-18' },
  { buyer: 'Heritage Banquet Hall', bookingId: 'BKG-3008', amount: 50750, status: 'Released', date: '2026-09-12' },
  { buyer: 'Lakeside Convention Centre', bookingId: 'BKG-2998', amount: 30000, status: 'Pending', date: '2026-09-09' },
  { buyer: 'Hotel Sunrise', bookingId: 'BKG-2991', amount: 51000, status: 'Released', date: '2026-09-01' },
];

const statusStyles: Record<PaymentStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Released: 'bg-emerald-50 text-emerald-700',
};

export default function ProviderPaymentsPage() {
  const totalEarned = payments.filter((p) => p.status === 'Released').reduce((s, p) => s + p.amount, 0);
  const pendingRelease = payments.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);
  const thisMonth = payments.filter((p) => new Date(p.date).getMonth() === new Date('2026-09-26').getMonth()).reduce((s, p) => s + p.amount, 0);
  const avgOrderValue = Math.round(payments.reduce((s, p) => s + p.amount, 0) / payments.length);

  return (
    <div>
      <PageHeader title="Payments" subtitle="Earnings received from confirmed bookings" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Wallet} label="Total Earned" value={`₹${totalEarned.toLocaleString('en-IN')}`} color="emerald" />
        <StatCard icon={Clock} label="Pending Release" value={`₹${pendingRelease.toLocaleString('en-IN')}`} color="amber" />
        <StatCard icon={CalendarDays} label="This Month" value={`₹${thisMonth.toLocaleString('en-IN')}`} color="blue" />
        <StatCard icon={TrendingUp} label="Avg. Order Value" value={`₹${avgOrderValue.toLocaleString('en-IN')}`} color="violet" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-semibold">Buyer</th>
              <th className="px-5 py-3 font-semibold">Booking ID</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.bookingId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-5 py-4 font-medium text-slate-900">{p.buyer}</td>
                <td className="px-5 py-4 text-slate-600">{p.bookingId}</td>
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
