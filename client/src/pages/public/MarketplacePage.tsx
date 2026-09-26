import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, LayoutGrid, List, SlidersHorizontal, ChevronDown } from 'lucide-react';

const categories = ['All', 'Furniture', 'Catering Equipment', 'Event Equipment', 'Manpower', 'Transportation', 'Venue Resources'];

const resources = [
  {
    id: 1,
    name: 'Banquet Chairs',
    category: 'Furniture',
    provider: 'Hotel Sunrise',
    distance: '2 km',
    available: 150,
    price: 30,
    unit: 'chair',
    rating: 4.8,
    verified: true,
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&q=80',
  },
  {
    id: 2,
    name: 'Round Tables',
    category: 'Furniture',
    provider: 'Grand Events',
    distance: '4 km',
    available: 50,
    price: 120,
    unit: 'table',
    rating: 4.6,
    verified: true,
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=500&q=80',
  },
  {
    id: 3,
    name: 'Sound System',
    category: 'Event Equipment',
    provider: 'AudioPro Events',
    distance: '8 km',
    available: 5,
    price: 2500,
    unit: 'day',
    rating: 4.3,
    verified: true,
    image: 'https://images.unsplash.com/photo-1520170350707-b2da59970118?w=500&q=80',
  },
  {
    id: 4,
    name: 'Event Stage',
    category: 'Event Equipment',
    provider: 'Royal Caterers',
    distance: '6 km',
    available: 2,
    price: 5000,
    unit: 'day',
    rating: 4.5,
    verified: true,
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&q=80',
  },
  {
    id: 5,
    name: 'Professional Catering',
    category: 'Catering Equipment',
    provider: 'Royal Caterers',
    distance: '6 km',
    available: 500,
    price: 450,
    unit: 'person',
    rating: 4.8,
    verified: true,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561a1f?w=500&q=80',
  },
  {
    id: 6,
    name: 'Grand Ballroom',
    category: 'Venue Resources',
    provider: 'Urban Banquets',
    distance: '3 km',
    available: 1,
    price: 75000,
    unit: 'day',
    rating: 4.7,
    verified: true,
    image: 'https://images.unsplash.com/photo-1519167758993-dafa5e938804?w=500&q=80',
  },
];

export default function MarketplacePage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const filtered = activeCategory === 'All' ? resources : resources.filter((r) => r.category === activeCategory);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 py-8">
        <div className="container-wide">
          <h1 className="text-3xl font-bold text-slate-900">Explore Resources</h1>
          <p className="text-slate-500 mt-1">Find verified hospitality businesses and available resources.</p>

          <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`pill-tab flex-shrink-0 ${
                  activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button className="btn-secondary py-2 px-4 text-sm">
              <SlidersHorizontal size={16} /> Filters
            </button>
            <div className="flex items-center gap-3">
              <button className="btn-secondary py-2 px-4 text-sm">
                Sort by <ChevronDown size={14} />
              </button>
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1">
                <button className="p-1.5 rounded-lg bg-blue-600 text-white">
                  <LayoutGrid size={16} />
                </button>
                <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-wide py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((r) => (
            <Link key={r.id} to={`/marketplace/${r.id}`} className="card overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="relative">
                <img src={r.image} alt={r.name} className="w-full h-40 object-cover" />
                <button
                  onClick={(e) => e.preventDefault()}
                  className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 hover:text-rose-500"
                >
                  <Heart size={16} />
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-slate-900">{r.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{r.available} available</p>
                <p className="text-sm font-semibold text-blue-600 mt-0.5">
                  ₹{r.price.toLocaleString('en-IN')} / {r.unit}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                      {r.provider.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500 truncate">{r.provider} · {r.distance}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-700">{r.rating}</span>
                    {r.verified && <span className="badge-verified ml-1">Verified</span>}
                  </div>
                  <span className="text-xs font-semibold text-blue-600 group-hover:underline">View Details</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
