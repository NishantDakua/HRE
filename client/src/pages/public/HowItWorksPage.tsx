import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FilePlus2,
  Sparkles,
  Users2,
  IndianRupee,
  PackageCheck,
  CheckCircle2,
} from 'lucide-react';

const steps = [
  {
    icon: FilePlus2,
    color: 'bg-blue-50 text-blue-600',
    title: 'Post Requirement',
    desc: 'Tell us what you need, when, and how much — HRE captures every detail in one form.',
  },
  {
    icon: Sparkles,
    color: 'bg-violet-50 text-violet-600',
    title: 'Smart Matching',
    desc: 'HRE finds verified providers with live availability that match your requirement.',
  },
  {
    icon: Users2,
    color: 'bg-amber-50 text-amber-600',
    title: 'Multi-Provider Match',
    desc: 'We combine capacity across providers when no single one can fulfill it alone.',
  },
  {
    icon: IndianRupee,
    color: 'bg-emerald-50 text-emerald-600',
    title: 'Negotiate & Book',
    desc: 'Negotiate price individually with each provider, then confirm the bundle atomically.',
  },
  {
    icon: PackageCheck,
    color: 'bg-rose-50 text-rose-600',
    title: 'Deliver & Release',
    desc: 'Track fulfillment in real time and release payment automatically after delivery.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="bg-white">
      <section className="container-wide py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <span className="section-label">HOW HRE WORKS</span>
            <h1 className="mt-3 text-4xl font-bold text-slate-900">From Requirement to Fulfillment</h1>
            <p className="mt-4 text-slate-500 text-lg max-w-md">
              A seamless, intelligent and collaborative process for modern hospitality
              businesses.
            </p>

            <ol className="mt-10 space-y-7">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <li key={step.title} className="flex gap-4">
                    <span className={`icon-chip h-12 w-12 flex-shrink-0 ${step.color} font-bold`}>
                      <Icon size={22} />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-400 mb-0.5">
                        {String(idx + 1).padStart(2, '0')}
                      </p>
                      <p className="font-bold text-slate-900">{step.title}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{step.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <Link to="/register" className="btn-primary mt-10">
              Try It Now <ArrowRight size={18} />
            </Link>
          </div>

          <div className="relative hidden lg:block">
            <div className="rounded-3xl overflow-hidden shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1519167758993-dafa5e938804?w=900&q=80"
                alt="Elegant banquet hall"
                className="w-full h-[420px] object-cover"
              />
            </div>

            <div className="absolute -left-10 top-8 w-72 rounded-2xl bg-white shadow-2xl p-4">
              <p className="text-sm font-bold text-slate-900">300 Chairs Required</p>
              <p className="text-xs text-slate-500 mt-0.5">25 Oct 2026 · Mumbai</p>
            </div>

            <div className="absolute -right-6 top-40 w-64 rounded-2xl bg-white shadow-2xl p-4">
              <p className="text-xs font-bold text-slate-400 mb-2">Matching Providers...</p>
              <div className="space-y-1.5">
                {[
                  ['Provider A', 150],
                  ['Provider B', 100],
                  ['Provider C', 50],
                ].map(([name, qty]) => (
                  <div key={name as string} className="flex justify-between text-xs">
                    <span className="text-slate-600">{name}</span>
                    <span className="font-semibold text-slate-900">{qty} chairs</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold text-center py-1.5">
                300 Fulfilled
              </div>
            </div>

            <div className="absolute -bottom-8 left-4 w-80 rounded-2xl bg-white shadow-2xl p-4">
              <p className="text-sm text-slate-600 italic">
                "HRE helped us fulfil a large event with multiple verified suppliers in one go.
                Smooth and reliable experience."
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  EM
                </span>
                <div className="text-xs">
                  <p className="font-semibold text-slate-900">Event Manager</p>
                  <p className="text-slate-400">Grand Banquet, Mumbai</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="container-wide grid sm:grid-cols-3 gap-6 text-center">
          {[
            'No single provider can fulfill your entire order',
            'Every provider is verified before they can list',
            'Payments release automatically after delivery',
          ].map((text) => (
            <div key={text} className="card p-6 flex flex-col items-center gap-3">
              <CheckCircle2 className="text-emerald-500" size={28} />
              <p className="text-sm font-medium text-slate-700">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
