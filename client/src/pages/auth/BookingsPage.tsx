import { Link } from 'react-router-dom';
import PageHeader from '../../components/dashboard/PageHeader';

const bookings = [
  { id: 'HRE1024', resource: '300 Chairs', providers: 3, total: 9450, status: 'In Progress', date: '25 Oct 2026' },
  { id: 'HRE1019', resource: '2 Round Tables Sets', providers: 1, total: 6000, status: 'Delivered', date: '18 Oct 2026' },
  { id: 'HRE1012', resource: 'Sound System', providers: 1, total: 2500, status: 'Delivered', date: '10 Oct 2026' },
  { id: 'HRE1005', resource: 'Grand Ballroom', providers: 1, total: 75000, status: 'Cancelled', date: '02 Oct 2026' },
];

const statusStyle: Record<string, string> = {
  'In Progress': 'bg-blue-50 text-blue-700',
  Delivered: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-rose-50 text-rose-700',
};

export default function BookingsPage() {
  return (
    <div>
      <PageHeader title="Bookings" subtitle="All your confirmed multi-provider bookings." />

      <div className="card divide-y divide-slate-100">
        {bookings.map((b) => (
          <Link key={b.id} to={`/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors">
            <div>
              <p className="font-semibold text-slate-900">#{b.id} · {b.resource}</p>
              <p className="text-xs text-slate-500 mt-0.5">{b.providers} providers · {b.date}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-slate-900">₹{b.total.toLocaleString('en-IN')}</span>
              <span className={`badge ${statusStyle[b.status]}`}>{b.status}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
