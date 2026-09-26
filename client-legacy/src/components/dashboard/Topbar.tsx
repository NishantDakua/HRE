import { Bell, Menu } from 'lucide-react';

interface TopbarProps {
  initials: string;
  onMenuClick: () => void;
}

export default function Topbar({ initials, onMenuClick }: TopbarProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3">
      <button onClick={onMenuClick} className="md:hidden text-slate-500 hover:text-slate-900">
        <Menu size={22} />
      </button>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">3</span>
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
          {initials}
        </div>
      </div>
    </header>
  );
}
