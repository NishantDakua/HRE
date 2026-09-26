import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Armchair, Minus, Plus, Check } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

const steps = [
  'What do you need?',
  'When do you need it?',
  'Where?',
  'Budget',
  'Additional details',
  'Review & Submit',
];

export default function PostRequirementPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    category: 'Furniture',
    resource: 'Banquet Chairs',
    quantity: 300,
    date: '2026-10-25',
    startTime: '18:00',
    endTime: '23:00',
    location: 'Mumbai',
    address: '',
    budgetMin: 25,
    budgetMax: 35,
    notes: '',
  });

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const isLast = step === steps.length - 1;

  return (
    <div>
      <PageHeader title="Post Requirement" subtitle="Tell us what you need, and HRE will find the right providers." />

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <div className="card p-4">
          <ol className="space-y-1">
            {steps.map((label, idx) => (
              <li key={label}>
                <button
                  onClick={() => setStep(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                    idx === step ? 'bg-blue-600 text-white' : idx < step ? 'text-emerald-700' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      idx === step
                        ? 'bg-white text-blue-600'
                        : idx < step
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {idx < step ? <Check size={13} /> : idx + 1}
                  </span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="card p-8">
          {step === 0 && (
            <div>
              <h3 className="font-bold text-slate-900 text-lg">What do you need?</h3>
              <p className="text-sm text-slate-500 mt-1">Select the resource and quantity.</p>

              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                  <select className="input-field" value={form.category} onChange={(e) => update({ category: e.target.value })}>
                    <option>Furniture</option>
                    <option>Catering Equipment</option>
                    <option>Event Equipment</option>
                    <option>Manpower</option>
                    <option>Transportation</option>
                    <option>Venue Resources</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Resource</label>
                  <select className="input-field" value={form.resource} onChange={(e) => update({ resource: e.target.value })}>
                    <option>Banquet Chairs</option>
                    <option>Round Tables</option>
                    <option>Sound System</option>
                    <option>Event Stage</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
                <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 max-w-xs">
                  <button
                    onClick={() => update({ quantity: Math.max(1, form.quantity - 10) })}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <Minus size={16} />
                  </button>
                  <div className="flex-1 flex flex-col items-center">
                    <Armchair size={22} className="text-blue-600 mb-1" />
                    <span className="text-xl font-bold text-slate-900">{form.quantity}</span>
                  </div>
                  <button
                    onClick={() => update({ quantity: form.quantity + 10 })}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="font-bold text-slate-900 text-lg">When do you need it?</h3>
              <p className="text-sm text-slate-500 mt-1">Pick the date and time window.</p>
              <div className="mt-6 grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Required Date</label>
                  <input type="date" className="input-field" value={form.date} onChange={(e) => update({ date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
                  <input type="time" className="input-field" value={form.startTime} onChange={(e) => update({ startTime: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
                  <input type="time" className="input-field" value={form.endTime} onChange={(e) => update({ endTime: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Where?</h3>
              <p className="text-sm text-slate-500 mt-1">Where should providers deliver?</p>
              <div className="mt-6 space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                  <input className="input-field" value={form.location} onChange={(e) => update({ location: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Address</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="Venue name, street, landmark..."
                    value={form.address}
                    onChange={(e) => update({ address: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Budget</h3>
              <p className="text-sm text-slate-500 mt-1">Set a target price range per unit.</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Min ₹ / unit</label>
                  <input type="number" className="input-field" value={form.budgetMin} onChange={(e) => update({ budgetMin: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Max ₹ / unit</label>
                  <input type="number" className="input-field" value={form.budgetMax} onChange={(e) => update({ budgetMax: Number(e.target.value) })} />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Additional details</h3>
              <p className="text-sm text-slate-500 mt-1">Anything providers should know?</p>
              <textarea
                className="input-field mt-6 max-w-md"
                rows={4}
                placeholder="e.g. Chairs must match white theme, setup required by 5 PM..."
                value={form.notes}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </div>
          )}

          {step === 5 && (
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Review &amp; Submit</h3>
              <p className="text-sm text-slate-500 mt-1">Confirm your requirement before posting.</p>
              <dl className="mt-6 divide-y divide-slate-100 max-w-md">
                {[
                  ['Resource', `${form.quantity} × ${form.resource}`],
                  ['Category', form.category],
                  ['Date', `${form.date} · ${form.startTime}-${form.endTime}`],
                  ['Location', form.location],
                  ['Budget', `₹${form.budgetMin} - ₹${form.budgetMax} / unit`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2.5 text-sm">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-semibold text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="btn-secondary disabled:opacity-40"
            >
              Back
            </button>
            <button
              onClick={() => (isLast ? navigate('/matches') : setStep((s) => s + 1))}
              className="btn-primary"
            >
              {isLast ? 'Submit Requirement' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
