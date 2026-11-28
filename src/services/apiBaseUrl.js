/**
 * Where CinCin's API lives: VITE_API_URL's /api, or the app's own /api in development
 * (Vite proxies it to the backend). Both the API client (services/api.js) and the service
 * worker (sw.js) read it, so the worker caches exactly the API the app calls.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
