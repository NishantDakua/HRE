import { useParams } from 'react-router-dom';
import { Armchair, CalendarDays, MapPin, IndianRupee, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

type RequirementStatus = 'Open' | 'Matching' | 'Booked' | 'Fulfilled';

interface MatchedProvider {
  name: string;
  initials: string;
  quantity: number;
  price: number;
  verified: boolean;
}

interface RequirementDetail {
  id: string;
  resourceName: string;
  category: string;
  quantity: number;
  unit: string;
  status: RequirementStatus;
  requiredDate: string;
  location: string;
  budget: number;
  description: string;
  providers: MatchedProvider[];
}

const requirementsById: Record<string, RequirementDetail> = {
  'REQ-1042': {
    id: 'REQ-1042',
    resourceName: 'Banquet Chairs - Premium',
    category: 'Furniture',
    quantity: 500,
    unit: 'chairs',
    status: 'Matching',
    requiredDate: '2026-10-04',
    location: 'Mumbai, Maharashtra',
    budget: 75000,
    description: 'Need 500 premium banquet chairs for a 3-day corporate conference in the main ballroom and two breakout halls. Delivery and setup required by 8 AM on the event day.',
    providers: [
      { name: 'Metro Hospitality', initials: 'MH', quantity: 300, price: 150, verified: true },
      { name: 'Urban Banquets', initials: 'UB', quantity: 225, price: 145, verified: true },
    ],
  },
};

const fallback = requirementsById['REQ-1042'];

const statusStyles: Record<RequirementStatus, string> = {
  Open: 'bg-blue-50 text-blue-700',
  Matching: 'bg-amber-50 text-amber-700',
  Booked: 'bg-violet-50 text-violet-700',
  Fulfilled: 'bg-emerald-50 text-emerald-700',
};

export default function RequirementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const requirement = (id && requirementsById[id]) || fallback;
  const showProviders = requirement.status === 'Matching' || requirement.status === 'Booked' || requirement.status === 'Fulfilled';
  const total = requirement.providers.reduce((sum, p) => sum + p.quantity * p.price, 0);

  return (
    <div>
      <PageHeader
        title={requirement.resourceName}
        subtitle={`${requirement.id} · ${requirement.quantity} ${requirement.unit} requested`}
        action={<span className={`badge ${statusStyles[requirement.status]}`}>{requirement.status}</span>}
      />

      <div className="card p-6 mb-6">
        <h3 className="mb-4">Requirement Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <span className="icon-chip h-10 w-10 bg-blue-50 text-blue-600">
              <Armchair size={18} />
            </span>
            <div>
              <p className="text-xs text-slate-400">Category</p>
              <p className="font-medium text-slate-900">{requirement.category}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="icon-chip h-10 w-10 bg-emerald-50 text-emerald-600">
              <MapPin size={18} />
            </span>
            <div>
              <p className="text-xs text-slate-400">Location</p>
              <p className="font-medium text-slate-900">{requirement.location}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="icon-chip h-10 w-10 bg-amber-50 text-amber-600">
              <CalendarDays size={18} />
            </span>
            <div>
              <p className="text-xs text-slate-400">Required Date</p>
              <p className="font-medium text-slate-900">
                {new Date(requirement.requiredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="icon-chip h-10 w-10 bg-violet-50 text-violet-600">
              <IndianRupee size={18} />
            </span>
            <div>
              <p className="text-xs text-slate-400">Budget</p>
              <p className="font-medium text-slate-900">&#8377;{requirement.budget.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
        <p className="mt-6 text-sm leading-relaxed text-slate-600">{requirement.description}</p>
      </div>

      {showProviders && (
        <div className="card p-6">
          <h3 className="mb-4">Matched Providers</h3>
          <div className="space-y-3">
            {requirement.providers.map((p) => (
              <div key={p.name} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {p.initials}
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5 font-medium text-slate-900">
                      {p.name}
                      {p.verified && (
                        <CheckCircle2 size={14} className="text-emerald-600" />
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{p.quantity} {requirement.unit} offered &middot; &#8377;{p.price}/{requirement.unit.replace(/s$/, '')}</p>
                  </div>
                </div>
                <p className="font-semibold text-slate-900">&#8377;{(p.quantity * p.price).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-500">Total across providers</p>
            <p className="text-lg font-bold text-slate-900">&#8377;{total.toLocaleString('en-IN')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
