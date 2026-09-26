import { Fragment } from 'react';
import { ShieldCheck, CalendarDays, Plus, Check, CheckCircle2 } from 'lucide-react';
import type { HomeResource } from '../../types/home';
import { initials } from '../../lib/hospitality';

const SPLIT = [150, 100, 50];
const REQUIRED = SPLIT.reduce((s, q) => s + q, 0);

interface MultiProviderSectionProps {
  featured: HomeResource[] | undefined;
}

export default function MultiProviderSection({ featured }: MultiProviderSectionProps) {
  const providers = featured
    ? [...new Map(featured.filter((r) => r.imageUrl).map((r) => [r.provider, r])).values()].slice(0, SPLIT.length)
    : undefined;

  return (
    <section className="bg-gradient-to-b from-[#f3f7fe] to-white py-14">
      <div className="container-wide grid items-center gap-10 lg:grid-cols-[320px_1fr]">
        <div>
          <h2 className="whitespace-nowrap text-[32px] font-bold leading-tight tracking-tight text-slate-900">
            One Requirement.
            <br />
            <span className="text-blue-600">Multiple Providers.</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            When one provider can't fulfill the complete requirement, HRE intelligently combines available capacity
            across multiple verified businesses.
          </p>
          <div className="mt-6 flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck size={28} />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500">Requirement</p>
              <p className="font-bold text-slate-900">{REQUIRED} units of Event Equipment</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <CalendarDays size={12} /> Mumbai · 25 Oct 2026
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="grid items-center gap-2.5 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.5fr]">
            {(providers ?? SPLIT.map(() => null)).map((p, idx) => (
              <Fragment key={p?.id ?? idx}>
                {p ? (
                  <div className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200">
                    <img src={p.imageUrl ?? ''} alt={p.name} className="h-24 w-full object-cover" loading="lazy" />
                    <div className="flex gap-2.5 p-3">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                        {initials(p.provider)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold leading-tight text-slate-900">{p.provider}</p>
                        <p className="text-xs text-slate-500">{SPLIT[idx]} units</p>
                        {p.providerVerified && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <Check size={12} strokeWidth={3} /> Verified
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[178px] animate-pulse rounded-xl bg-slate-100" />
                )}
                {idx < SPLIT.length - 1 ? (
                  <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow">
                    <Plus size={16} strokeWidth={3} />
                  </span>
                ) : (
                  <span className="mx-auto hidden h-px w-8 border-t-2 border-dashed border-blue-300 md:block" />
                )}
              </Fragment>
            ))}

            <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-lg shadow-emerald-900/5 ring-1 ring-emerald-100">
              <CheckCircle2 size={40} className="flex-shrink-0 fill-emerald-500 text-white" />
              <div className="whitespace-nowrap">
                <p className="text-2xl font-extrabold text-emerald-600">
                  {REQUIRED} / {REQUIRED}
                </p>
                <p className="font-bold text-emerald-700">Requirement Fulfilled</p>
                <p className="text-xs text-slate-500">{SPLIT.length} Providers · Coordinated Solution</p>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-6 left-[8%] right-[38%] hidden h-6 rounded-b-xl border-x-2 border-b-2 border-dashed border-blue-200 md:block" />
        </div>
      </div>
    </section>
  );
}
