import { Bell, Search } from 'lucide-react';
import { UserButton } from '@clerk/react';

export default function DashboardTopbar() {
  return (
    <div className="flex items-center justify-between gap-6 flex-1">
      {/* Search Bar */}
      <div className="hidden lg:flex items-center gap-2 flex-1 max-w-md">
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          className="flex-1 bg-transparent text-sm placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
            3
          </span>
        </button>

        {/* User Menu */}
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
}
