import { Check, Package, Truck, ClipboardCheck, PackageCheck } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

const trackerSteps = [
  { label: 'Booked', icon: Check },
  { label: 'Preparing', icon: Package },
  { label: 'In Transit', icon: Truck },
  { label: 'Delivered', icon: PackageCheck },
  { label: 'Confirmed', icon: ClipboardCheck },
];

const currentStepIndex = 2;

const providers = [
  { name: 'Provider A', qty: 150, status: 'Delivered', detail: 'Payment Pending', amount: 4200, done: true },
  { name: 'Provider B', qty: 100, status: 'In Transit', detail: 'ETA 3 hours · Payment Pending', amount: 3100, done: false },
  { name: 'Provider C', qty: 50, status: 'Preparing', detail: 'Expected Today · Payment Pending', amount: 1700, done: false },
];

export default function FulfillmentPage() {
  return (
    <div>
      <PageHeader
        title="Order #HRE1024"
        subtitle="300 Chairs · 3 Providers · 25 Oct 2026"
        action={<span className="badge bg-blue-50 text-blue-700">In Progress</span>}
      />

      <div className="card p-6 mb-6">
        <div className="flex items-center">
          {trackerSteps.map((step, idx) => {
            const Icon = step.icon;
            const active = idx <= currentStepIndex;
            return (
              <div key={step.label} className="flex-1 flex items-center last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Icon size={17} />
                  </span>
                  <span className={`text-xs font-semibold ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < trackerSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${idx < currentStepIndex ? 'bg-blue-600' : 'bg-slate-100'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card divide-y divide-slate-100 mb-6">
        {providers.map((p) => (
          <div key={p.name} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                {p.name.split(' ')[1]}
              </span>
              <div>
                <p className="font-semibold text-slate-900">{p.name} <span className="text-slate-400 font-normal">· {p.qty} Chairs</span></p>
                <p className="text-xs text-slate-500 mt-0.5">{p.detail}</p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`badge ${
                  p.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' : p.status === 'In Transit' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {p.status}
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1">₹{p.amount.toLocaleString('en-IN')}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold text-slate-700">Overall Progress</span>
          <span className="font-bold text-slate-900">2 / 3 providers fulfilled — 67%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-blue-600" style={{ width: '67%' }} />
        </div>
      </div>
    </div>
  );
}
