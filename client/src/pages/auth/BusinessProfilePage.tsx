import { Building2, MapPin, Phone, Mail, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

export default function BusinessProfilePage() {
  return (
    <div>
      <PageHeader title="Business Profile" subtitle="Manage your business details and verification" />

      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          <span className="icon-chip h-16 w-16 bg-blue-50 text-blue-600">
            <Building2 size={28} />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3>Hotel Sunrise</h3>
              <span className="badge-verified">
                <ShieldCheck size={13} />
                Verified Business
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Hotel &middot; Mumbai, Maharashtra</p>
            <div className="mt-3 flex flex-wrap gap-5 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> Mumbai, Maharashtra</span>
              <span className="flex items-center gap-1.5"><Phone size={14} className="text-slate-400" /> +91-22-1234-5678</span>
              <span className="flex items-center gap-1.5"><Mail size={14} className="text-slate-400" /> contact@hotelsunrise.com</span>
            </div>
          </div>
        </div>
      </div>

      <form className="card p-6 max-w-3xl space-y-5" onSubmit={(e) => e.preventDefault()}>
        <h3 className="mb-1">Business Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Business Name</label>
            <input type="text" defaultValue="Hotel Sunrise" className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">GSTIN</label>
            <input type="text" defaultValue="GST123456789" readOnly className="input-field cursor-not-allowed text-slate-400" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
          <input type="text" defaultValue="Marine Drive, Mumbai, Maharashtra 400020" className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
            <input type="text" defaultValue="+91-22-1234-5678" className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input type="email" defaultValue="contact@hotelsunrise.com" className="input-field" />
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-5">
          <button type="submit" className="btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  );
}
