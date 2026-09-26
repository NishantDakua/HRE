import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, CalendarDays, ChevronDown, ArrowRight, FileText, Store } from 'lucide-react';
import type { HomeCategory } from '../../types/home';

const TABS = [
  { key: 'find', label: 'Find Resources', icon: Search, cta: 'Find Resources' },
  { key: 'post', label: 'Post Requirement', icon: FileText, cta: 'Post Requirement' },
  { key: 'list', label: 'List Resources', icon: Store, cta: 'List Resources' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

interface SearchPanelProps {
  categories: HomeCategory[] | undefined;
  locations: string[] | undefined;
}

const fieldBox = 'rounded-lg border border-slate-200 bg-white px-4 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20';
const fieldLabel = 'block text-[11px] font-medium text-slate-500';
const fieldInput = 'mt-0.5 w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none';

export default function SearchPanel({ categories, locations }: SearchPanelProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('find');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Mumbai');
  const [quantity, setQuantity] = useState('300');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (location) params.set('location', location);
    if (category) params.set('category', category);
    if (quantity) params.set('quantity', quantity);
    if (date) params.set('date', date);

    if (tab === 'find') navigate(`/marketplace?${params}`);
    else if (tab === 'post') navigate(`/requirements/new?${params}`);
    else navigate('/register');
  };

  return (
    <section className="relative z-20 -mt-20">
      <div className="container-wide">
        <div className="flex gap-1 pl-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-t-xl px-7 py-3 text-sm font-semibold transition-colors ${
                tab === key ? 'bg-white text-blue-600' : 'bg-white/70 text-slate-700 hover:bg-white/90'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <form
          onSubmit={submit}
          className="grid gap-3 rounded-2xl rounded-tl-none bg-white p-5 shadow-xl shadow-slate-900/10 md:grid-cols-2 lg:grid-cols-[2fr_1.1fr_0.9fr_1.1fr_1.3fr_auto]"
        >
          <label className={fieldBox}>
            <span className={fieldLabel}>What do you need?</span>
            <span className="flex items-center gap-2">
              <Search size={15} className="flex-shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hospitality resources..."
                className={fieldInput}
              />
            </span>
          </label>

          <label className={`${fieldBox} relative`}>
            <span className={`${fieldLabel} pl-6`}>Location</span>
            <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <select value={location} onChange={(e) => setLocation(e.target.value)} className={`${fieldInput} appearance-none pl-6`}>
              <option value="">Anywhere</option>
              {(locations ?? ['Mumbai']).map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>

          <label className={fieldBox}>
            <span className={fieldLabel}>Quantity</span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={fieldInput}
            />
          </label>

          <label className={`${fieldBox} relative`}>
            <span className={fieldLabel}>Required Date</span>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className={`${fieldInput} [&::-webkit-calendar-picker-indicator]:opacity-0`}
            />
            <CalendarDays size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          </label>

          <label className={`${fieldBox} relative`}>
            <span className={fieldLabel}>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${fieldInput} appearance-none`}>
              <option value="">All Categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>

          <button type="submit" className="btn-primary rounded-lg px-6 md:col-span-2 lg:col-span-1">
            {activeTab.cta} <ArrowRight size={17} />
          </button>
        </form>
      </div>
    </section>
  );
}
