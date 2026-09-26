import { useState } from 'react';
import { KeyRound, Trash2 } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

function ToggleRow({ label, description, defaultChecked }: { label: string; description: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        onClick={() => setChecked((v) => !v)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account preferences and security" />

      <div className="space-y-6 max-w-3xl">
        <div className="card p-6">
          <h3 className="mb-4">Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
              <input type="text" defaultValue="Rajesh Patel" className="input-field" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input type="email" defaultValue="buyer@hotelsunrise.com" className="input-field" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn-primary">Save Profile</button>
          </div>
        </div>

        <div className="card p-6 divide-y divide-slate-50">
          <h3 className="mb-2">Notifications</h3>
          <ToggleRow label="Email notifications" description="Offers, bookings, and payment updates" defaultChecked={true} />
          <ToggleRow label="SMS notifications" description="Critical booking and delivery alerts" defaultChecked={true} />
          <ToggleRow label="Push notifications" description="Real-time updates in your browser" defaultChecked={false} />
        </div>

        <div className="card p-6">
          <h3 className="mb-4">Security</h3>
          <button className="btn-secondary">
            <KeyRound size={16} />
            Change Password
          </button>
        </div>

        <div className="card p-6 border-rose-200">
          <h3 className="mb-1 text-rose-600">Danger Zone</h3>
          <p className="mb-4 text-sm text-slate-500">Deleting your account is permanent and cannot be undone.</p>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-6 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100">
            <Trash2 size={16} />
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
