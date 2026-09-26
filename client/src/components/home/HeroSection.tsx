import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Check } from 'lucide-react';
import type { HomeCategory, HomeStats } from '../../types/home';
import { HERO_IMAGE, categoryImage } from '../../lib/hospitality';

const HUB_SLOTS = [
  { category: 'Event Infrastructure', x: 200, y: 0 },
  { category: 'Catering & Kitchen', x: 0, y: 78 },
  { category: 'Venues & Spaces', x: 400, y: 78 },
  { category: 'Manpower', x: 0, y: 196 },
  { category: 'Transportation', x: 400, y: 196 },
];
const CARD_W = 200;
const CARD_H = 84;
const HUB = { x: 300, y: 190 };

interface HeroSectionProps {
  categories: HomeCategory[] | undefined;
  stats: HomeStats | undefined;
}

export default function HeroSection({ categories, stats }: HeroSectionProps) {
  const slots = HUB_SLOTS.map((slot) => ({
    ...slot,
    data: categories?.find((c) => c.name === slot.category),
  }));

  return (
    <section className="relative overflow-hidden bg-[#eef4fd] pt-24">
      <div className="absolute inset-y-0 right-0 hidden w-[62%] lg:block">
        <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#eef4fd] via-[#eef4fd]/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#eef4fd]/80 to-transparent" />
      </div>

      <div className="container-wide relative z-10 grid items-center gap-10 pb-28 pt-6 lg:grid-cols-[1fr_600px] lg:pb-32">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">B2B Hospitality Resource Exchange</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl xl:text-[56px]">
            Find Hospitality
            <br />
            Resources.
            <br />
            <span className="text-blue-600">Fulfill More.</span> Together.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
            Connect with verified hospitality businesses, intelligently match available capacity, and coordinate
            multi-provider fulfillment through one marketplace.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/marketplace" className="btn-primary rounded-lg px-7">
              Find Resources <ArrowRight size={17} />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center rounded-lg bg-white px-7 py-3 font-semibold text-slate-800 ring-1 ring-slate-300 hover:ring-slate-400"
            >
              List Your Resources
            </Link>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-sm text-slate-700">
            {['Verified Businesses', 'Multi-Provider Matching', 'Hospitality-Focused'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 size={17} className="fill-emerald-500 text-white" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative hidden h-[380px] w-[600px] lg:block" aria-label="HRE smart match network">
          <svg className="absolute inset-0" width="600" height="380" aria-hidden="true">
            {slots.map((slot) => (
              <line
                key={slot.category}
                x1={HUB.x}
                y1={HUB.y}
                x2={slot.x + CARD_W / 2}
                y2={slot.y + CARD_H / 2}
                stroke="#ffffff"
                strokeOpacity="0.9"
                strokeWidth="1.5"
              />
            ))}
            <line x1={HUB.x} y1={HUB.y} x2={HUB.x} y2={330} stroke="#ffffff" strokeOpacity="0.9" strokeWidth="1.5" />
            {slots.map((slot) => (
              <circle key={slot.category} cx={slot.x + CARD_W / 2} cy={slot.y + CARD_H / 2} r="3" fill="#fff" />
            ))}
          </svg>

          {slots.map(({ category, x, y, data }) => (
            <div
              key={category}
              className="absolute flex gap-2.5 rounded-xl bg-white/95 p-2 shadow-lg shadow-slate-900/10 ring-1 ring-white"
              style={{ left: x, top: y, width: CARD_W, height: CARD_H }}
            >
              <img src={categoryImage(category, 200)} alt="" className="h-full w-16 flex-shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 py-0.5">
                <p className="truncate text-[12px] font-bold text-slate-900">{category}</p>
                {data?.topProvider ? (
                  <>
                    <p className="truncate text-[11px] text-slate-500">{data.topProvider.name}</p>
                    {data.topProvider.verified && (
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <Check size={11} strokeWidth={3} /> Verified
                      </p>
                    )}
                  </>
                ) : (
                  <div className="mt-1 h-3 w-20 animate-pulse rounded bg-slate-200" />
                )}
                <p className="truncate text-[10px] text-slate-400">
                  {data?.description?.split(', ').slice(0, 3).join(' · ')}
                </p>
              </div>
            </div>
          ))}

          <div
            className="absolute flex flex-col items-center justify-center rounded-2xl bg-white shadow-xl shadow-blue-900/15"
            style={{ left: HUB.x - 58, top: HUB.y - 58, width: 116, height: 116 }}
          >
            <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
              <path d="M20 2 36 11v18L20 38 4 29V11z" fill="#1d4ed8" />
              <path d="M20 2 36 11 20 20 4 11z" fill="#60a5fa" />
              <path d="M20 20v18L4 29V11z" fill="#2563eb" />
            </svg>
            <p className="mt-1.5 text-lg font-extrabold text-slate-900">HRE</p>
            <p className="text-[11px] font-medium text-slate-600">Smart Match</p>
          </div>

          <div
            className="absolute flex items-center gap-3 rounded-xl bg-white/95 px-4 shadow-lg shadow-slate-900/10"
            style={{ left: 170, top: 306, width: 260, height: 68 }}
          >
            <CheckCircle2 size={30} className="flex-shrink-0 fill-emerald-500 text-white" />
            <div>
              <p className="text-sm font-bold text-slate-900">Coordinated Fulfillment</p>
              {stats ? (
                <p className="text-[11px] text-slate-500">
                  {stats.resources} listings · {stats.providers} providers · {stats.avgFulfillmentRate}% fulfilled
                </p>
              ) : (
                <div className="mt-1 h-3 w-40 animate-pulse rounded bg-slate-200" />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
