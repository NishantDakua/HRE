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
          <div className="flex items-center justify-between px-8 py-4">
            <DashboardTopbar />

            {/* Mode Switcher - Available for all users */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
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
