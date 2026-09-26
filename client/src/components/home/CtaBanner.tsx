import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, ShieldCheck, PackageCheck } from 'lucide-react';
import { CTA_IMAGE } from '../../lib/hospitality';

const features = [
  { icon: Clock3, title: 'Save Time', desc: 'One platform, multiple providers' },
  { icon: ShieldCheck, title: 'Verified Businesses', desc: 'Trade with confidence' },
  { icon: PackageCheck, title: 'Complete Fulfillment', desc: 'From negotiation to delivery' },
];

export default function CtaBanner() {
  return (
    <section className="relative overflow-hidden bg-[#0b2350]">
      <div className="absolute inset-y-0 left-0 hidden w-[26%] xl:block">
        <img src={CTA_IMAGE} alt="" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0b2350]/40 to-[#0b2350]" />
      </div>
      <div className="container-wide relative grid items-center gap-10 py-12 xl:grid-cols-[1fr_auto] xl:gap-8 xl:pl-[22%]">
        <div>
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-white xl:text-[28px]">
            Your Next Hospitality Requirement Shouldn't Require Ten Phone Calls.
          </h2>
          <p className="mt-3 text-slate-300">Discover, negotiate and fulfill through one connected marketplace.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/marketplace" className="btn-primary rounded-lg">
              Find Resources <ArrowRight size={17} />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center rounded-lg px-6 py-3 font-semibold text-white ring-1 ring-white/40 hover:bg-white/10"
            >
              List Your Resources
            </Link>
          </div>
        </div>
        <ul className="grid grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex w-[124px] flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full text-white ring-1 ring-white/40">
                <Icon size={22} />
              </span>
              <p className="mt-3 text-sm font-semibold text-white">{title}</p>
              <p className="mt-1 text-xs text-slate-400">{desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
