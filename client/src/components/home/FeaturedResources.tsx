import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Heart, Star, MapPin, Check } from 'lucide-react';
import type { HomeResource } from '../../types/home';
import { formatINR, formatUnit, initials, categoryImage } from '../../lib/hospitality';

interface FeaturedResourcesProps {
  featured: HomeResource[] | undefined;
}

export default function FeaturedResources({ featured }: FeaturedResourcesProps) {
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const toggleSaved = (id: string) =>
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight text-slate-900">Explore What's Available</h2>
      <p className="mt-1.5 text-slate-500">Discover resources and services from verified hospitality businesses.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {featured
          ? featured.slice(0, 4).map((r) => (
              <Link
                key={r.id}
                to={`/marketplace/${r.id}`}
                className="group overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 transition hover:shadow-lg"
              >
                <div className="relative">
                  <img
                    src={r.imageUrl ?? categoryImage(r.category)}
                    alt={r.name}
                    className="h-32 w-full object-cover"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    aria-label={saved.has(r.id) ? 'Remove from saved' : 'Save resource'}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSaved(r.id);
                    }}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow hover:text-rose-500"
                  >
                    <Heart size={15} className={saved.has(r.id) ? 'fill-rose-500 text-rose-500' : ''} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold text-slate-900">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.category}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700">
                      {initials(r.provider)}
                    </span>
                    <span className="truncate text-slate-600">{r.provider}</span>
                    {r.providerVerified && (
                      <span className="flex flex-shrink-0 items-center gap-0.5 font-semibold text-emerald-600">
                        <Check size={11} strokeWidth={3} /> Verified
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin size={12} /> {r.location.split(',')[0]}
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {formatINR(r.price)} <span className="font-medium text-slate-500">/ {formatUnit(r.unit)}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {r.rating !== null ? (
                      <>
                        {r.rating.toFixed(1)} <span className="text-slate-400">({r.reviews})</span>
                      </>
                    ) : (
                      <span className="text-slate-400">New listing</span>
                    )}
                  </p>
                </div>
              </Link>
            ))
          : Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[292px] animate-pulse rounded-xl bg-slate-100" />)}
      </div>
    </div>
  );
}
