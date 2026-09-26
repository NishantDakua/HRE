import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

const categories = [
  'Furniture',
  'Catering & Kitchen',
  'Event Infrastructure',
  'Manpower',
  'Transportation',
  'Venues & Spaces',
  'Accommodation',
  'Hospitality Supplies',
  'Technology',
  'Services',
];

const units = ['per item', 'per day', 'per person', 'per set', 'per hour', 'per event'];

export default function AddResourcePage() {
  const [category, setCategory] = useState(categories[0]);
  const [unit, setUnit] = useState(units[0]);

  return (
    <div>
      <PageHeader title="Add Resource" subtitle="List spare capacity for other businesses to discover and book" />

      <form className="card p-6 max-w-3xl space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Resource Name</label>
          <input type="text" placeholder="e.g. Premium Banquet Chairs" className="input-field" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Quantity Available</label>
            <input type="number" min={0} placeholder="e.g. 500" className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Price (&#8377;)</label>
            <input type="number" min={0} placeholder="e.g. 150" className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Unit</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="input-field">
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Location</label>
          <input type="text" placeholder="e.g. Mumbai, Maharashtra" className="input-field" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
          <textarea rows={4} placeholder="Describe condition, specifications, delivery terms..." className="input-field resize-none" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Photos</label>
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 py-10 text-center text-slate-400">
            <ImagePlus size={28} />
            <p className="text-sm font-medium text-slate-500">Drag and drop images here, or click to browse</p>
            <p className="text-xs text-slate-400">PNG, JPG up to 10MB</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
          <button type="button" className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">List Resource</button>
        </div>
      </form>
    </div>
  );
}
