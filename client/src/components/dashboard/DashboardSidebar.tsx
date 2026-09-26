import { Link, useLocation } from 'react-router-dom';
import { HelpCircle, LogOut, ShoppingCart, ClipboardList, MessageSquare, Package, TrendingUp, Zap, Store, BarChart3, FileText } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import Logo from '../Logo';

interface DashboardSidebarProps {
  mode: 'buyer' | 'seller';
}

const buyerNavItems = [
  { label: 'Dashboard', path: '/dashboard', icon: ShoppingCart },
  { label: 'Browse Resources', path: '/dashboard/discover', icon: Zap },
  { label: 'My Requirements', path: '/dashboard/requirements', icon: ClipboardList },
  { label: 'Matches', path: '/dashboard/matches', icon: TrendingUp },
  { label: 'Negotiations', path: '/dashboard/negotiations', icon: MessageSquare },
  { label: 'Bookings', path: '/dashboard/bookings', icon: Package },
  { label: 'Fulfillment', path: '/dashboard/fulfillment', icon: FileText },
  { label: 'Payments', path: '/dashboard/payments', icon: BarChart3 },
  { label: 'Analytics', path: '/dashboard/analytics', icon: TrendingUp },
];

const sellerNavItems = [
  { label: 'Dashboard', path: '/dashboard/seller', icon: Store },
  { label: 'My Resources', path: '/dashboard/seller/resources', icon: Package },
  { label: 'Incoming Orders', path: '/dashboard/seller/orders', icon: FileText },
  { label: 'Negotiations', path: '/dashboard/seller/negotiations', icon: MessageSquare },
  { label: 'Fulfillment', path: '/dashboard/seller/fulfillment', icon: ClipboardList },
  { label: 'Payments', path: '/dashboard/seller/payments', icon: BarChart3 },
  { label: 'Analytics', path: '/dashboard/seller/analytics', icon: TrendingUp },
];

export default function DashboardSidebar({ mode }: DashboardSidebarProps) {
  const { logout } = useAuthStore();
  const location = useLocation();
  const navItems = mode === 'buyer' ? buyerNavItems : sellerNavItems;

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside className="hidden md:flex w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex-col border-r border-slate-700">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-700">
        <Logo inverted={true} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 space-y-2 border-t border-slate-700">
        <button className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white font-medium transition-all">
          <HelpCircle size={20} />
          <span>Help &amp; Support</span>
        </button>
        <button
          onClick={() => {
            logout();
            window.location.href = '/';
          }}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 font-medium transition-all"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
