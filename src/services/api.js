/**
 * CinCin API Client — Phase 4 Updated
 *
 * Phase 4 additions:
 * - Palate Profile endpoints (GET /palate/profile, /progress, POST /wrapped)
 * - Subscription endpoints (Stripe checkout, portal, cancel, reactivate, trial)
 * - Commerce endpoints (buy tab, affiliate clicks, discovery feed)
 * - Notification centre endpoints (list, mark read, push tokens)
 * - User data export + B2B consent endpoints
 *
 * Spec ref: Sections 6, 8, 10
 * Timeline: Weeks 14–17
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach JWT ───
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('cin_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor: auto-refresh on 401 ───
api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = sessionStorage.getItem('cin_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(
  `${import.meta.env.VITE_API_URL || ''}/api/auth/refresh`,
  { refreshToken }
);
        sessionStorage.setItem('cin_access_token', data.accessToken);
        if (data.refreshToken) {
          sessionStorage.setItem('cin_refresh_token', data.refreshToken);
        }
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        sessionStorage.removeItem('cin_access_token');
        sessionStorage.removeItem('cin_refresh_token');
        window.location.href = '/auth';
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth token helpers ───
export function setAuth({ accessToken, refreshToken }) {
  sessionStorage.setItem('cin_access_token', accessToken);
  if (refreshToken) sessionStorage.setItem('cin_refresh_token', refreshToken);
}

export function clearAuth() {
  sessionStorage.removeItem('cin_access_token');
  sessionStorage.removeItem('cin_refresh_token');
}

export function getToken() {
  return sessionStorage.getItem('cin_access_token');
}

// ═══════════════════════════════════════════
//  PHASE 1 ENDPOINTS
// ═══════════════════════════════════════════

export const auth = {
  register: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  socialLogin: (data) => api.post('/auth/social', data),
  refresh: (data) => api.post('/auth/refresh', data),
  me: () => api.get('/auth/me'),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const scan = {
  label: (data) => api.post('/scan/label', data),
  barcode: (data) => api.post('/scan/barcode', data),
  search: (params) => api.get('/scan/search', { params }),
  confirm: (scanId) => api.post(`/scan/confirm/${scanId}`),
  sourceNotes: (bottleId) => api.post(`/scan/source-notes/${bottleId}`),
  taxonomyTree: () => api.get('/scan/taxonomy/tree'),
  taxonomySearch: (params) => api.get('/scan/taxonomy/search', { params }),
};

export const ageVerify = {
  initiate: (data) => api.post('/age-verify/initiate', data),
  status: () => api.get('/age-verify/status'),
};

export const users = {
  profile: () => api.get('/users/profile'),
  updateProfile: (data) => api.patch('/users/profile', data),
  notificationPrefs: (data) => api.patch('/users/notifications', data),
  // Phase 4: Data export + B2B consent
  exportCSV: () => api.get('/users/me/export/csv', { responseType: 'blob' }),
  exportJSON: () => api.get('/users/me/export', { responseType: 'blob' }),
  updateB2BConsent: (optIn) => api.patch('/users/me/b2b-consent', { optIn }),
  deleteAccount: () => api.delete('/users/me'),
  anonymiseHistory: () => api.post('/users/me/anonymise'),
};

// ═══════════════════════════════════════════
//  PHASE 2 ENDPOINTS
// ═══════════════════════════════════════════

export const games = {
  create: (data) => api.post('/games', data),
  join: (data) => api.post('/games/join', data),
  getState: (gameId) => api.get(`/games/${gameId}/state`),
  start: (gameId) => api.post(`/games/${gameId}/start`),
  addGuest: (gameId, data) => api.post(`/games/${gameId}/guests`, data),
  removeGuest: (gameId, guestId) => api.delete(`/games/${gameId}/guests/${guestId}`),
  submitGuess: (gameId, data) => api.post(`/games/${gameId}/guess`, data),
  optOut: (gameId, data) => api.post(`/games/${gameId}/opt-out`, data),
  autoSkip: (gameId, data) => api.post(`/games/${gameId}/auto-skip`, data),
  advance: (gameId) => api.post(`/games/${gameId}/advance`),
  endGame: (gameId) => api.post(`/games/${gameId}/end`),
  results: (gameId) => api.get(`/games/${gameId}/results`),
  history: (params) => api.get('/games/history', { params }),
};

export const bottleCache = {
  get: (bottleId) => api.get(`/bottles/${bottleId}/cache`),
};

export const offlineSync = {
  sync: (data) => api.post('/games/offline-sync', data),
};

// ═══════════════════════════════════════════
//  PHASE 3 ENDPOINTS
// ═══════════════════════════════════════════

export const clubs = {
  create: (data) => api.post('/clubs', data),
  get: (clubId) => api.get(`/clubs/${clubId}`),
  listMine: () => api.get('/clubs/mine'),
  archive: (clubId) => api.post(`/clubs/${clubId}/archive`),
  join: (data) => api.post('/clubs/join', data),
  leave: (clubId) => api.post(`/clubs/${clubId}/leave`),
  removeMember: (clubId, userId) => api.delete(`/clubs/${clubId}/members/${userId}`),
  getMembers: (clubId) => api.get(`/clubs/${clubId}/members`),
  tagGame: (clubId, data) => api.post(`/clubs/${clubId}/games`, data),
  getPendingGames: (clubId) => api.get(`/clubs/${clubId}/games/pending`),
  approveGame: (clubId, gameId) => api.post(`/clubs/${clubId}/games/${gameId}/approve`),
  rejectGame: (clubId, gameId) => api.post(`/clubs/${clubId}/games/${gameId}/reject`),
  getLeaderboard: (clubId, seasonId) => api.get(`/clubs/${clubId}/seasons/${seasonId}/leaderboard`),
  getActivity: (clubId, params) => api.get(`/clubs/${clubId}/activity`, { params }),
  endSeason: (clubId, seasonId) => api.post(`/clubs/${clubId}/seasons/${seasonId}/end`),
  startSeason: (clubId, data) => api.post(`/clubs/${clubId}/seasons`, data),
};

// ═══════════════════════════════════════════
//  PHASE 4 ENDPOINTS — Palate Profile
//  Spec: Sections 6.1–6.6
// ═══════════════════════════════════════════

export const palate = {
  /** Full dashboard — Pro only, requires 3+ games */
  getProfile: (view = 'all_time') => api.get('/palate/profile', { params: { view } }),
  /** Unlock progress — visible to all users as conversion incentive */
  getProgress: () => api.get('/palate/progress'),
  /** Generate Palate Wrapped shareable card */
  generateWrapped: (data) => api.post('/palate/wrapped', data),
};

// ═══════════════════════════════════════════
//  PHASE 4 ENDPOINTS — Subscription (Stripe)
//  Spec: Sections 8.1, 8.2
// ═══════════════════════════════════════════

export const subscription = {
  /** Current subscription status */
  getStatus: () => api.get('/subscription/status'),
  /** Create Stripe checkout session */
  createCheckout: (data) => api.post('/subscription/checkout', data),
  /** Create billing portal session */
  createPortal: (data) => api.post('/subscription/portal', data),
  /** Cancel subscription at period end */
  cancel: () => api.post('/subscription/cancel'),
  /** Reactivate pending cancellation */
  reactivate: () => api.post('/subscription/reactivate'),
  /** Check trial eligibility */
  checkTrial: () => api.get('/subscription/trial'),
};

// ═══════════════════════════════════════════
//  PHASE 4 ENDPOINTS — Commerce (Buy + Discovery)
//  Spec: Sections 8.3, 8.4
// ═══════════════════════════════════════════

export const commerce = {
  /** Buy tab — scanned bottle history with affiliate links */
  getBuyTab: () => api.get('/commerce/buy-tab'),
  /** Affiliate links for a specific bottle */
  getBottleLinks: (bottleId) => api.get(`/commerce/bottles/${bottleId}/links`),
  /** Track affiliate click */
  trackClick: (data) => api.post('/commerce/affiliate/click', data),
  /** Discovery feed — mixed sponsored + organic content */
  getFeed: (params) => api.get('/commerce/feed', { params }),
  /** Track sponsored tasting game start */
  trackSponsoredStart: (id) => api.post(`/commerce/sponsored/${id}/start`),
};

// ═══════════════════════════════════════════
//  PHASE 4 ENDPOINTS — Notifications
//  Spec: Sections 10.1–10.3
// ═══════════════════════════════════════════

export const notifications = {
  /** In-app notification centre (paginated) */
  list: (params) => api.get('/notifications', { params }),
  /** Mark single notification as read */
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  /** Mark all notifications as read */
  markAllRead: () => api.post('/notifications/read-all'),
  /** Register push token (FCM/APNs) */
  registerPushToken: (data) => api.post('/notifications/push-token', data),
  /** Remove push token */
  removePushToken: (data) => api.delete('/notifications/push-token', { data }),
};

export const taxonomy = {
  tree: () => api.get('/taxonomy/tree'),
  search: (query) => api.get('/taxonomy/search', { params: { q: query } }),
};

export default api;
