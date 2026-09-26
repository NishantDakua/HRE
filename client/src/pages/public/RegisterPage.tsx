import { Link } from 'react-router-dom';
import { ShieldCheck, FileCheck2, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';

const idOptions = [
  { label: 'GSTIN', hint: 'Most common' },
  { label: 'UDYAM', hint: 'MSME' },
  { label: 'CIN + DIN', hint: 'Company / LLP' },
];

const benefits = [
  { icon: ShieldCheck, title: 'Get Verified', desc: 'Build trust with buyers across the platform.' },
  { icon: FileCheck2, title: 'List Your Resources', desc: 'Reach hundreds of hospitality businesses.' },
  { icon: TrendingUp, title: 'Grow Your Business', desc: 'Turn unused capacity into new revenue.' },
];

export default function RegisterPage() {
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-blue-50 to-white min-h-[calc(100vh-72px)] flex items-center">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 right-10 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute -bottom-20 left-10 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="container-wide relative z-10 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center rounded-full bg-blue-100 border border-blue-200 px-4 py-1.5 text-xs font-bold tracking-wider text-blue-700">
                JOIN AS A PROVIDER
              </span>
              <h1 className="mt-6 text-4xl font-bold text-slate-900 leading-tight">
                Register Your Hospitality Business
              </h1>
              <p className="mt-4 text-lg text-slate-600 max-w-md">
                Verify your business and start listing your resources with confidence.
              </p>

              <div className="mt-10 max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-slate-100">
                <p className="text-sm text-slate-700 italic">
                  "Verification was seamless. We started getting genuine inquiries immediately."
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    RM
                  </span>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900">Rohit Mehta</p>
                    <p className="text-slate-500">Hotel Sunrise</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card p-6">
                <div className="flex items-center gap-3">
                  <span className="icon-chip h-11 w-11 bg-blue-50 text-blue-600">
                    <ShieldCheck size={22} />
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Verify with EntityLocker</p>
                    <p className="text-sm text-slate-500">Fast, secure and government-backed verification.</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {idOptions.map((opt) => (
                    <div key={opt.label} className="rounded-xl border border-slate-200 p-3 text-center">
                      <p className="text-sm font-bold text-slate-900">{opt.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{opt.hint}</p>
                    </div>
                  ))}
                </div>

                <Link to="/verify-business" className="btn-primary w-full mt-5">
                  Continue with EntityLocker <ArrowRight size={18} />
                </Link>

                <ul className="mt-5 space-y-2.5">
                  {[
                    'Your business details will be securely verified',
                    'No manual document upload required',
                    'Your data is safe and encrypted',
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {benefits.map((b) => {
                  const Icon = b.icon;
                  return (
                    <div key={b.title} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                      <Icon size={20} className="text-blue-600" />
                      <p className="mt-2 text-sm font-bold text-slate-900">{b.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{b.desc}</p>
                    </div>
                  );
                })}
              </div>

              <p className="text-center text-sm text-slate-700">
                Just here to buy?{' '}
                <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                  Sign in instead
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
