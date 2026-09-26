import { Search } from 'lucide-react';

export default function DashboardTopbar() {
  return (
    <div className="flex items-center gap-3 w-full">
      {/* Search Bar */}
      <Search size={18} className="text-slate-400 flex-shrink-0" />
      <input
        type="text"
        placeholder="Search requirements, bookings, providers..."
        className="flex-1 bg-transparent text-sm placeholder-slate-400 focus:outline-none"
      />
    </div>
  );
}
