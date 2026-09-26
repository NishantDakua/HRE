import { useState } from 'react';
import { Search, Star, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';

const categories = ['All', 'Furniture', 'Catering & Kitchen', 'Venues & Spaces', 'Transportation', 'Manpower'];

interface DiscoverResource {
  id: string;
  name: string;
  category: string;
  provider: string;
  rating: number;
  verified: boolean;
  available: number;
  unit: string;
  price: number;
  image: string;
}

const resources: DiscoverResource[] = [
  { id: 'r1', name: 'Premium Banquet Chairs', category: 'Furniture', provider: 'Metro Hospitality', rating: 4.6, verified: true, available: 2000, unit: 'chairs', price: 150, image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400' },
  { id: 'r2', name: 'Full-Service Buffet Catering', category: 'Catering & Kitchen', provider: 'Royal Caterers', rating: 4.8, verified: true, available: 500, unit: 'plates', price: 450, image: 'https://images.unsplash.com/photo-1555939594-58d7cb561a1f?w=400' },
  { id: 'r3', name: 'Grand Ballroom Venue', category: 'Venues & Spaces', provider: 'Urban Banquets', rating: 4.7, verified: true, available: 1, unit: 'hall/day', price: 75000, image: 'https://images.unsplash.com/photo-1519167758993-dafa5e938804?w=400' },
  { id: 'r4', name: 'Guest Shuttle Fleet', category: 'Transportation', provider: 'Grand Events', rating: 4.5, verified: true, available: 15, unit: 'vehicles', price: 4500, image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400' },
  { id: 'r5', name: 'Event Staffing Team', category: 'Manpower', provider: 'Elite Services', rating: 4.4, verified: true, available: 60, unit: 'staff/day', price: 800, image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400' },
  { id: 'r6', name: 'Round Banquet Tables', category: 'Furniture', provider: 'Metro Hospitality', rating: 4.6, verified: true, available: 300, unit: 'tables', price: 120, image: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=400' },
];

export default function DiscoverPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');

  const filtered = resources.filter((r) => {
    const matchesCategory = activeCategory === 'All' || r.category === activeCategory;
    const matchesQuery = r.name.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div>
      <PageHeader title="Discover Resources" subtitle="Browse available capacity from verified providers" />

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search resources..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`pill-tab ${activeCategory === c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {filtered.map((r) => (
          <div key={r.id} className="card overflow-hidden">
            <img src={r.image} alt={r.name} className="h-40 w-full object-cover" />
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{r.category}</p>
              <h4 className="mt-1">{r.name}</h4>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                <span>{r.provider}</span>
                {r.verified && <CheckCircle2 size={14} className="text-emerald-600" />}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-500">{r.available} {r.unit} available</span>
                <span className="flex items-center gap-1 font-medium text-amber-500">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  {r.rating}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="font-semibold text-slate-900">&#8377;{r.price.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">/{r.unit}</span></p>
                <button className="btn-secondary text-sm py-2 px-4">View Details</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
