import { Link, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, Search, ArrowRight } from 'lucide-react';
import { useAuth, UserButton } from '@clerk/react';
import Logo from './Logo';

const links = [
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Marketplace', to: '/marketplace' },
  { label: 'For Providers', to: '/providers' },
  { label: 'Financing', to: '/financing' },
  { label: 'About', to: '/about' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const location = useLocation();
  const overlay = location.pathname === '/' && !isScrolled;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`${location.pathname === '/' ? 'fixed inset-x-0' : 'sticky'} top-0 z-40 transition-all ${
        overlay ? 'bg-transparent' : 'bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm'
      }`}
    >
      <nav className="container-wide flex items-center justify-between py-3.5">
        <Logo />

        <div className="hidden lg:flex items-center gap-9">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-slate-700 hover:text-slate-950'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link
            to="/marketplace"
            aria-label="Search marketplace"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-blue-600"
          >
            <Search size={17} />
          </Link>
          {isSignedIn ? (
            <>
              <Link to="/dashboard" className="btn-primary py-2.5">
                Dashboard <ArrowRight size={16} />
              </Link>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 hover:ring-slate-400"
              >
                Login
              </Link>
              <Link to="/register" className="btn-primary rounded-lg py-2.5 text-sm">
                Get Started <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-slate-700"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200">
          <div className="container-wide py-4 space-y-1">
            {links.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-700">
                {link.label}
              </Link>
            ))}
            <div className="flex gap-3 pt-3">
              {isSignedIn ? (
                <>
                  <Link to="/dashboard" className="btn-primary flex-1">Dashboard</Link>
                  <UserButton afterSignOutUrl="/" />
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary flex-1">Login</Link>
                  <Link to="/register" className="btn-primary flex-1">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
