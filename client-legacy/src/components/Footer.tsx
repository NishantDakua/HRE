import { Link } from 'react-router-dom';
import { useState, FormEvent } from 'react';
import { ArrowRight, Linkedin, Twitter, Youtube, Instagram } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import Logo from './Logo';

const columns = [
  {
    title: 'Platform',
    links: [
      ['Marketplace', '/marketplace'],
      ['How It Works', '/how-it-works'],
      ['Resources', '/marketplace'],
      ['For Providers', '/providers'],
      ['Financing', '/financing'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About', '/about'],
      ['Contact', '/contact'],
      ['FAQ', '/faq'],
      ['Careers', '/contact'],
    ],
  },
  {
    title: 'Trust',
    links: [
      ['Verification', '/verify-business'],
      ['Privacy Policy', '/faq'],
      ['Terms of Service', '/faq'],
    ],
  },
];

const socials = [
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Twitter, label: 'Twitter' },
  { icon: Youtube, label: 'YouTube' },
  { icon: Instagram, label: 'Instagram' },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subscribe = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/newsletter', { email });
      toast.success('You are subscribed to HRE updates.');
      setEmail('');
    } catch {
      toast.error('Could not subscribe right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#0a1a3f] text-slate-300">
      <div className="container-wide pt-14 pb-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.6fr]">
          <div>
            <Logo inverted />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Connecting hospitality businesses. Discover resources, match capacity and fulfill together.
            </p>
            <div className="mt-5 flex gap-4">
              {socials.map(({ icon: Icon, label }) => (
                <span key={label} aria-label={label} className="text-slate-300 hover:text-white cursor-pointer">
                  <Icon size={18} />
                </span>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white">{col.title}</h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to} className="text-slate-400 hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-sm font-semibold text-white">Get the latest from HRE</h4>
            <form onSubmit={subscribe} className="mt-4 flex overflow-hidden rounded-lg ring-1 ring-white/20 focus-within:ring-blue-400">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                aria-label="Subscribe"
                className="flex w-12 items-center justify-center border-l border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
              >
                <ArrowRight size={18} />
              </button>
            </form>
            <p className="mt-3 text-xs text-slate-400">Product updates, industry insights and more.</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Hospitality Resource Exchange. All rights reserved.</p>
          <p>Built for the future of hospitality.</p>
        </div>
      </div>
    </footer>
  );
}
