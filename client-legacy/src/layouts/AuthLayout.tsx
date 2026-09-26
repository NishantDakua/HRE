import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  Compass,
  FilePlus2,
  ClipboardList,
  Sparkles,
  MessageSquare,
  CalendarCheck,
  Truck,
  Package,
  Wallet,
  BarChart3,
  Bell,
  Building2,
  Settings,
} from 'lucide-react';
import Sidebar, { SidebarItem } from '../components/dashboard/Sidebar';
import Topbar from '../components/dashboard/Topbar';

const menuItems: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Discover Resources', path: '/discover', icon: Compass },
  { label: 'Post Requirement', path: '/requirements/new', icon: FilePlus2 },
  { label: 'My Requirements', path: '/requirements', icon: ClipboardList },
  { label: 'Matches', path: '/matches', icon: Sparkles },
  { label: 'Negotiations', path: '/negotiations', icon: MessageSquare, badge: 2 },
  { label: 'Bookings', path: '/bookings', icon: CalendarCheck },
  { label: 'Fulfillment', path: '/fulfillment', icon: Truck },
  { label: 'My Resources', path: '/resources/my', icon: Package },
  { label: 'Payments', path: '/payments', icon: Wallet },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Business Profile', path: '/business', icon: Building2 },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function AuthLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={menuItems} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar initials="HS" onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
