import PageHeader from '../../components/dashboard/PageHeader';

type RequestStatus = 'New' | 'Viewed' | 'Responded';

interface IncomingRequest {
  id: string;
  buyer: string;
  business: string;
  resource: string;
  quantity: number;
  unit: string;
  requiredDate: string;
  status: RequestStatus;
}

const requests: IncomingRequest[] = [
  { id: 'REQ-1042', buyer: 'Rajesh Patel', business: 'Hotel Sunrise', resource: 'Premium Banquet Chairs', quantity: 500, unit: 'chairs', requiredDate: '2026-10-04', status: 'New' },
  { id: 'REQ-1039', buyer: 'Anita Rao', business: 'The Grand Palm', resource: 'Round Banquet Tables', quantity: 80, unit: 'tables', requiredDate: '2026-10-06', status: 'New' },
  { id: 'REQ-1036', buyer: 'Vikram Shah', business: 'Coastal Retreat Resort', resource: 'Cocktail Lounge Furniture', quantity: 6, unit: 'sets', requiredDate: '2026-10-09', status: 'Viewed' },
  { id: 'REQ-1030', buyer: 'Rajesh Patel', business: 'Hotel Sunrise', resource: 'Round Banquet Tables', quantity: 60, unit: 'tables', requiredDate: '2026-10-08', status: 'Responded' },
  { id: 'REQ-1024', buyer: 'Neha Kapoor', business: 'Lakeside Convention Centre', resource: 'LED Stage Lighting Rig', quantity: 2, unit: 'rigs', requiredDate: '2026-10-14', status: 'Viewed' },
  { id: 'REQ-1018', buyer: 'Suresh Iyer', business: 'Heritage Banquet Hall', resource: 'Premium Banquet Chairs', quantity: 350, unit: 'chairs', requiredDate: '2026-10-16', status: 'Responded' },
];

const statusStyles: Record<RequestStatus, string> = {
  New: 'bg-blue-50 text-blue-700',
  Viewed: 'bg-slate-100 text-slate-600',
  Responded: 'bg-emerald-50 text-emerald-700',
};

export default function ProviderRequestsPage() {
  return (
    <div>
      <PageHeader title="Incoming Requests" subtitle="Requirement inquiries matched to your resources" />

      <div className="space-y-3">
        {requests.map((r) => (
          <div
            key={r.id}
            className={`card flex flex-wrap items-center justify-between gap-4 p-5 ${r.status === 'New' ? 'border-l-4 border-l-blue-600' : ''}`}
          >
            <div className="min-w-[220px]">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{r.business}</p>
                <span className={`badge ${statusStyles[r.status]}`}>{r.status}</span>
              </div>
              <p className="text-xs text-slate-400">{r.buyer} &middot; {r.id}</p>
            </div>

            <div className="text-sm text-slate-600">
              <p className="text-xs text-slate-400">Resource Requested</p>
              <p className="font-medium text-slate-900">{r.resource}</p>
            </div>

            <div className="text-sm text-slate-600">
              <p className="text-xs text-slate-400">Quantity</p>
              <p className="font-medium text-slate-900">{r.quantity} {r.unit}</p>
            </div>

            <div className="text-sm text-slate-600">
              <p className="text-xs text-slate-400">Required Date</p>
              <p className="font-medium text-slate-900">
                {new Date(r.requiredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>

            <div className="flex gap-2">
              <button className="btn-secondary text-sm py-2 px-4">View</button>
              <button className="btn-primary text-sm py-2 px-4">Respond</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
