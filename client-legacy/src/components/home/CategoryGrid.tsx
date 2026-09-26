import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { HomeCategory } from '../../types/home';
import { categoryIcon, categoryImage } from '../../lib/hospitality';

interface CategoryGridProps {
  categories: HomeCategory[] | undefined;
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <section className="container-wide py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Everything Hospitality Businesses Need</h2>
          <p className="mt-1.5 text-slate-500">Discover resources, services and capacity across the hospitality ecosystem.</p>
        </div>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 hover:ring-slate-400"
        >
          View All Categories <ArrowRight size={15} />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10">
        {categories
          ? categories.map((cat) => {
              const Icon = categoryIcon(cat.icon);
              return (
                <Link
                  key={cat.id}
                  to={`/marketplace?category=${encodeURIComponent(cat.name)}`}
                  className="group overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-blue-200"
                >
                  <div className="relative">
                    <img src={categoryImage(cat.name)} alt={cat.name} className="h-24 w-full object-cover" loading="lazy" />
                    <span className="absolute -bottom-4 left-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-md ring-1 ring-slate-100">
                      <Icon size={18} />
                    </span>
                  </div>
                  <div className="px-3 pb-3 pt-6">
                    <p className="text-[13px] font-bold leading-tight text-slate-900">{cat.name}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">{cat.description}</p>
                    <p className="mt-2 text-[11px] font-semibold text-blue-600">
                      {cat.resourceCount} {cat.resourceCount === 1 ? 'resource' : 'resources'}
                    </p>
                  </div>
                </Link>
              );
            })
          : Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="h-[196px] animate-pulse rounded-xl bg-slate-100" />
            ))}
      </div>
    </section>
  );
}
