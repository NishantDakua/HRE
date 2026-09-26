import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Inbox,
  MessageSquare,
  CalendarCheck,
  Truck,
  Wallet,
  BarChart3,
  Building2,
  Settings,
} from 'lucide-react';
import Sidebar, { SidebarItem } from '../components/dashboard/Sidebar';
import Topbar from '../components/dashboard/Topbar';

const menuItems: SidebarItem[] = [
  { label: 'Dashboard', path: '/provider/dashboard', icon: LayoutDashboard },
  { label: 'My Resources', path: '/provider/resources', icon: Package },
  { label: 'Incoming Requests', path: '/provider/requests', icon: Inbox, badge: 3 },
  { label: 'Negotiations', path: '/provider/negotiations', icon: MessageSquare },
  { label: 'Bookings', path: '/provider/bookings', icon: CalendarCheck },
  { label: 'Fulfillment', path: '/provider/fulfillment', icon: Truck },
  { label: 'Payments', path: '/provider/payments', icon: Wallet },
  { label: 'Analytics', path: '/provider/analytics', icon: BarChart3 },
  { label: 'Business Profile', path: '/provider/business', icon: Building2 },
  { label: 'Settings', path: '/provider/settings', icon: Settings },
];

export default function ProviderLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar items={menuItems} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar initials="GE" onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
