/**
 * CinCin Game API Client — Phase 2
 * Maps to backend: /api/games/*, /api/bottles/:id/cache, /api/games/offline-sync
 */

import { getToken, ApiError } from './api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function gameRequest(endpoint, options = {}) {
  const { body, method = 'GET', headers = {} } = options;
  const config = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };

  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('cin:auth-expired'));
  }

  const data = res.headers.get('content-type')?.includes('json')
    ? await res.json()
    : await res.text();

  if (!res.ok) throw new ApiError(res.status, typeof data === 'string' ? { message: data } : data);
  return data;
}

// ── Game Lifecycle ──

export const games = {
  create: (config) =>
    gameRequest('/games', { method: 'POST', body: config }),

  join: (gameCode) =>
    gameRequest('/games/join', { method: 'POST', body: { gameCode } }),

  start: (gameId) =>
    gameRequest(`/games/${gameId}/start`, { method: 'POST' }),

  getState: (gameId) =>
    gameRequest(`/games/${gameId}/state`),

  guess: (gameId, guessText) =>
    gameRequest(`/games/${gameId}/guess`, { method: 'POST', body: { guessText } }),

  optOut: (gameId) =>
    gameRequest(`/games/${gameId}/opt-out`, { method: 'POST' }),

  advance: (gameId) =>
    gameRequest(`/games/${gameId}/advance`, { method: 'POST' }),

  end: (gameId) =>
    gameRequest(`/games/${gameId}/end`, { method: 'POST' }),

  results: (gameId) =>
    gameRequest(`/games/${gameId}/results`),

  shareLink: (gameId) =>
    gameRequest(`/games/${gameId}/share`),
};

// ── Bottle Cache for Offline Play (Section 2.7) ──

export const bottleCache = {
  getForCache: (bottleId) =>
    gameRequest(`/bottles/${bottleId}/cache`),
};

// ── Offline Game Sync ──

export const offlineSync = {
  sync: (gamePayload) =>
    gameRequest('/games/offline-sync', { method: 'POST', body: gamePayload }),
};

export { taxonomy } from './api';

export default { games, bottleCache, offlineSync };
