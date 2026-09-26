import { Link, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { HelpCircle, LogOut, X } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';

export interface SidebarItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
}

interface SidebarProps {
  items: SidebarItem[];
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ items, open, onClose }: SidebarProps) {
  const { logout } = useAuthStore();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/50 md:hidden"
        />
      )}
      <aside
        className={`fixed md:relative z-40 h-screen w-72 flex-shrink-0 bg-navy-900 text-white flex flex-col transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="h-2.5 w-2.5 rounded-sm bg-white" />
            </span>
            HRE
          </Link>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={active ? 'sidebar-link-active' : 'sidebar-link'}
              >
                <Icon size={18} strokeWidth={2} />
                <span className="flex-1">{item.label}</span>
                {!!item.badge && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 space-y-1 border-t border-white/10">
          <button className="sidebar-link w-full">
            <HelpCircle size={18} />
            Help &amp; Support
          </button>
          <button
            onClick={() => {
              logout();
              window.location.href = '/';
            }}
            className="sidebar-link w-full text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
