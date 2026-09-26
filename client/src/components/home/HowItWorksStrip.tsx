import { Link } from 'react-router-dom';
import { ArrowRight, FileText, SearchCheck, Boxes, MessagesSquare, Combine, Truck, PackageCheck } from 'lucide-react';

const steps = [
  { icon: FileText, title: 'Tell HRE What You Need' },
  { icon: SearchCheck, title: 'Verify & Discover' },
  { icon: Boxes, title: 'Match Available Capacity' },
  { icon: MessagesSquare, title: 'Negotiate Directly' },
  { icon: Combine, title: 'Book the Best Combination' },
  { icon: Truck, title: 'Track Fulfillment' },
  { icon: PackageCheck, title: 'Complete Delivery' },
];

export default function HowItWorksStrip() {
  return (
    <section className="container-wide py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">How HRE Works</h2>
          <p className="mt-1.5 text-slate-500">From requirement to fulfillment — a seamless process.</p>
        </div>
        <Link
          to="/how-it-works"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 hover:ring-slate-400"
        >
          Learn More <ArrowRight size={15} />
        </Link>
      </div>

      <ol className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-7">
        {steps.map(({ icon: Icon, title }, idx) => (
          <li key={title} className="relative flex items-start gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <Icon size={20} />
            </span>
            <div>
              <p className="text-xs font-semibold text-blue-600">{String(idx + 1).padStart(2, '0')}</p>
              <p className="text-sm font-semibold leading-snug text-slate-900">{title}</p>
            </div>
            {idx < steps.length - 1 && (
              <span className="absolute -right-4 top-5 hidden w-5 border-t-2 border-dotted border-slate-300 lg:block" />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
