import axios from 'axios';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { createDemoApi } from '../demo/backend.js';

/** The backend-free demo build (VITE_DEMO=1) runs the planning engine in the browser instead of calling the API. */
export const DEMO = import.meta.env.VITE_DEMO === '1';

const TOKEN_KEY = 'de-token';
const store = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} },
};
export const auth = { token: store.get, setToken: store.set, signedIn: () => Boolean(store.get()) };

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 180_000 });
http.interceptors.request.use((cfg) => {
  const t = store.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
http.interceptors.response.use((r) => r.data, (err) => {
  if (err.response?.status === 401 && store.get()) {
    store.set(null);
    if (!location.pathname.endsWith('/signin')) location.assign(`${import.meta.env.BASE_URL}signin`);
  }
  const message = err.response?.data?.error || (err.code === 'ECONNABORTED' ? 'The request took too long. Try again.' : 'Can’t reach the server. Check that the API is running.');
  return Promise.reject(Object.assign(new Error(message), { status: err.response?.status }));
});

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

const remoteApi = {
  health: () => http.get('/health'),
  register: (b) => http.post('/auth/register', b),
  login: (b) => http.post('/auth/login', b),
  demo: () => http.post('/auth/demo'),
  logout: () => http.post('/auth/logout'),
  updateSettings: (b) => http.put('/auth/settings', b),
  exportData: () => http.get('/auth/export'),
  deleteAccount: () => http.delete('/auth/account'),
  dashboard: () => http.get('/dashboard'),
  saveProfile: (profile) => http.post('/profile/create', { profile }),
  createDream: (b) => http.post('/dreams/create', b),
  templates: (params) => http.get('/templates/dreams', { params }),
  generateRoadmap: (dreamId, force) => http.post('/roadmap/generate', { dreamId, force }),
  planMonth: (roadmapId, month) => http.post(`/roadmap/${roadmapId}/months/${month}/plan`),
  applyAdaptation: (roadmapId, adaptationId) => http.put(`/roadmap/${roadmapId}`, { adaptationId }),
  toggleAction: (actionId, done) => http.post('/progress/checklist-complete', { actionId, done }),
  completeWeek: () => http.post('/progress/complete-week'),
  celebrate: (month) => http.post('/progress/celebrate', { month }),
  logProgress: (b) => http.post('/progress/update', b),
  statistics: () => http.get('/progress/statistics'),
  dailyMessage: (refresh) => http.get('/coaching/daily-message', { params: refresh ? { refresh: 1 } : {} }),
  coachingHistory: (archived) => http.get('/coaching/history', { params: archived ? { archived: 1 } : {} }),
  coachingFeedback: (b) => http.post('/coaching/feedback', b),
  issues: () => http.get('/coaching/issues'),
  requestAdvice: (b) => http.post('/coaching/request-advice', b),
};

export const api = DEMO ? createDemoApi({ get: store.get, set: store.set }) : remoteApi;

export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, enabled: auth.signedIn() });
export const useHealth = () => useQuery({ queryKey: ['health'], queryFn: api.health, staleTime: Infinity });
