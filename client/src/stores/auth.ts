import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  businessId?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  userRole: 'buyer' | 'provider' | null;
  dashboardMode: 'buyer' | 'seller';
  token: string | null;
  login: (user: User, token: string, role: 'buyer' | 'provider') => void;
  logout: () => void;
  setDashboardMode: (mode: 'buyer' | 'seller') => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('auth_token'),
  user: localStorage.getItem('auth_user') ? JSON.parse(localStorage.getItem('auth_user')!) : null,
  userRole: (localStorage.getItem('auth_role') as 'buyer' | 'provider') || null,
  dashboardMode: (localStorage.getItem('dashboard_mode') as 'buyer' | 'seller') || 'buyer',
  token: localStorage.getItem('auth_token'),
  login: (user, token, role) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_role', role);
    set({ isAuthenticated: true, user, token, userRole: role });
  },
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('dashboard_mode');
    set({ isAuthenticated: false, user: null, token: null, userRole: null, dashboardMode: 'buyer' });
  },
  setDashboardMode: (mode) => {
    localStorage.setItem('dashboard_mode', mode);
    set({ dashboardMode: mode });
  }
}));
