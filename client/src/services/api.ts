import axios from 'axios';
import type { HomeData } from '../types/home';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

// Note: Clerk provides authentication via HTTP-only cookies and session tokens
// The backend middleware will handle Clerk authentication via clerkMiddleware()
// No need to manually add tokens here - Clerk handles it

export const authApi = {
  getCurrentUser: () =>
    api.get('/auth/me'),
  completeOnboarding: (data: any) =>
    api.post('/auth/onboarding', data),
  updateProfile: (data: any) =>
    api.put('/auth/profile', data),
};

export const resourcesApi = {
  getAll: (filters?: any) =>
    api.get('/resources', { params: filters }),
  getById: (id: string) =>
    api.get(`/resources/${id}`),
  create: (data: any) =>
    api.post('/resources', data),
  update: (id: string, data: any) =>
    api.put(`/resources/${id}`, data),
  delete: (id: string) =>
    api.delete(`/resources/${id}`),
};

export const homeApi = {
  get: (months: number) =>
    api.get<HomeData>('/home', { params: { months } }).then((res) => res.data),
};

export const categoriesApi = {
  getAll: () =>
    api.get('/categories'),
};

export const requirementsApi = {
  getAll: () =>
    api.get('/requirements'),
  getById: (id: string) =>
    api.get(`/requirements/${id}`),
  create: (data: any) =>
    api.post('/requirements', data),
  update: (id: string, data: any) =>
    api.put(`/requirements/${id}`, data),
};

export const matchesApi = {
  getByRequirement: (requirementId: string) =>
    api.get(`/matches/requirement/${requirementId}`),
};

export const negotiationsApi = {
  getAll: () =>
    api.get('/negotiations'),
  getById: (id: string) =>
    api.get(`/negotiations/${id}`),
  create: (data: any) =>
    api.post('/negotiations', data),
  update: (id: string, data: any) =>
    api.put(`/negotiations/${id}`, data),
  sendMessage: (id: string, message: string) =>
    api.post(`/negotiations/${id}/messages`, { message }),
};

export const bookingsApi = {
  getAll: () =>
    api.get('/bookings'),
  getById: (id: string) =>
    api.get(`/bookings/${id}`),
  create: (data: any) =>
    api.post('/bookings', data),
};

export const paymentsApi = {
  getAll: () =>
    api.get('/payments'),
};

export const notificationsApi = {
  getAll: () =>
    api.get('/notifications'),
  markAsRead: (id: string) =>
    api.put(`/notifications/${id}/read`),
};

export default api;
