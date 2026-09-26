import { Link } from 'react-router-dom';
import {
  Plus,
  ChevronRight,
  MapPin,
  CalendarDays,
  Armchair,
  ChefHat,
  Building2,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

type RequirementStatus = 'Open' | 'Matching' | 'Booked' | 'Fulfilled';

interface Requirement {
  id: string;
  resourceName: string;
  category: string;
  icon: LucideIcon;
  quantity: number;
  unit: string;
  status: RequirementStatus;
  requiredDate: string;
  location: string;
  matchedPercent: number;
}

const requirements: Requirement[] = [
  {
    id: 'REQ-1042',
    resourceName: 'Banquet Chairs - Premium',
    category: 'Furniture',
    icon: Armchair,
    quantity: 500,
    unit: 'chairs',
    status: 'Matching',
    requiredDate: '2026-10-04',
    location: 'Mumbai, Maharashtra',
    matchedPercent: 65,
  },
  {
    id: 'REQ-1041',
    resourceName: 'Buffet Catering Service',
    category: 'Catering & Kitchen',
    icon: ChefHat,
    quantity: 300,
    unit: 'plates',
    status: 'Booked',
    requiredDate: '2026-10-02',
    location: 'Mumbai, Maharashtra',
    matchedPercent: 100,
  },
  {
    id: 'REQ-1038',
    resourceName: 'Grand Ballroom Venue',
    category: 'Venues & Spaces',
    icon: Building2,
    quantity: 1,
    unit: 'hall',
    status: 'Fulfilled',
    requiredDate: '2026-09-18',
    location: 'Mumbai, Maharashtra',
    matchedPercent: 100,
  },
  {
    id: 'REQ-1035',
    resourceName: 'Guest Transportation Fleet',
    category: 'Transportation',
    icon: Truck,
    quantity: 12,
    unit: 'vehicles',
    status: 'Open',
    requiredDate: '2026-10-11',
    location: 'Mumbai, Maharashtra',
    matchedPercent: 0,
  },
  {
    id: 'REQ-1030',
    resourceName: 'Round Banquet Tables',
    category: 'Furniture',
    icon: Armchair,
    quantity: 60,
    unit: 'tables',
    status: 'Matching',
    requiredDate: '2026-10-08',
    location: 'Mumbai, Maharashtra',
    matchedPercent: 30,
  },
];

const statusStyles: Record<RequirementStatus, string> = {
  Open: 'bg-blue-50 text-blue-700',
  Matching: 'bg-amber-50 text-amber-700',
  Booked: 'bg-violet-50 text-violet-700',
  Fulfilled: 'bg-emerald-50 text-emerald-700',
};

export default function RequirementsPage() {
  return (
    <div>
      <PageHeader
        title="My Requirements"
        subtitle="Track and manage the resource requirements you've posted"
        action={
          <Link to="/requirements/new" className="btn-primary">
            <Plus size={18} />
            Post Requirement
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {requirements.map((req) => {
          const Icon = req.icon;
          return (
            <div key={req.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="icon-chip h-11 w-11 bg-blue-50 text-blue-600">
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{req.resourceName}</p>
                    <p className="text-xs text-slate-500">{req.id} &middot; {req.category}</p>
                  </div>
                </div>
                <span className={`badge ${statusStyles[req.status]}`}>{req.status}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div>
                  <p className="text-xs text-slate-400">Quantity</p>
                  <p className="font-medium text-slate-900">{req.quantity} {req.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Required Date</p>
                  <p className="flex items-center gap-1 font-medium text-slate-900">
                    <CalendarDays size={14} className="text-slate-400" />
                    {new Date(req.requiredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400">Location</p>
                  <p className="flex items-center gap-1 font-medium text-slate-900">
                    <MapPin size={14} className="text-slate-400" />
                    {req.location}
                  </p>
                </div>
              </div>

              {req.status !== 'Open' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Matched capacity</span>
                    <span className="font-semibold text-slate-700">{req.matchedPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-blue-600"
                      style={{ width: `${req.matchedPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <Link
                to={`/requirements/${req.id}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                View Details
                <ChevronRight size={16} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
