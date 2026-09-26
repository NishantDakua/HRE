import { Outlet } from 'react-router-dom';
import { ShoppingCart, Store } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import DashboardTopbar from '../components/dashboard/DashboardTopbar';

export default function DashboardLayout() {
  const { dashboardMode, setDashboardMode } = useAuthStore();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <DashboardSidebar mode={dashboardMode} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar + Mode Switcher */}
        <div className="border-b border-slate-200 bg-white">
          <div className="flex items-center gap-6 px-8 py-3">
            {/* Mode Switcher - Left */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 flex-shrink-0">
              <button
                onClick={() => setDashboardMode('buyer')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                  dashboardMode === 'buyer'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart size={18} />
                I'm Buying
              </button>
              <button
                onClick={() => setDashboardMode('seller')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                  dashboardMode === 'seller'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Store size={18} />
                I'm Selling
              </button>
            </div>

            {/* Search Bar - Center */}
            <div className="flex-1">
              <DashboardTopbar />
            </div>

            {/* Right Actions - Notifications & Profile */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Notifications */}
              <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  3
                </span>
              </button>

              {/* User Profile - Clickable */}
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900">Hotel Sunrise</p>
                  <p className="text-xs text-slate-500">Verified</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-bold text-white flex-shrink-0">
                  S
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
