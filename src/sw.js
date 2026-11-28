/**
 * The app's one service worker: offline caching (Workbox) and background push
 * (Firebase Cloud Messaging). Vite builds it (vite-plugin-pwa injectManifest), so
 * the Firebase config comes from the VITE_FIREBASE_* build variables
 * (services/firebaseConfig.js, shared with the page).
 *
 * Push messages the backend sends carry a `notification` block; the Firebase SDK
 * shows those itself and opens their link when tapped. Data-only messages are
 * shown here.
 */

/* eslint-env serviceworker */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { firebaseConfig, firebaseConfigured } from './services/firebaseConfig';
import { API_BASE_URL } from './services/apiBaseUrl';
import { isCinCinApiRequest } from './utils/apiRequest';
import { WORKER_CACHES, PLAYER_LEFT } from './services/workerCaches';

// ─── Offline caching ───

// A new version takes over straight away (registerType: 'autoUpdate')
self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
// Deep links load the app shell, which routes them in the browser
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

const DAY = 86400;

// CinCin's API, which in production is on another origin than the app. Its routes match the path
// under the API base (utils/apiRequest.js): a plain regular expression would only ever match a
// cross-origin URL from its first character. No other service's API is cached on the device
// (such as Onfido's identity checks).
const API_BASE = new URL(API_BASE_URL, self.location.origin);
// A player who logs out takes their API responses with them, including any still on the way: a
// response to a request made before the page said they left (PLAYER_LEFT) is not cached
let playerVisit = 0;
const onlyThisPlayersVisit = {
  requestWillFetch: async ({ request, state }) => { state.visit = playerVisit; return request; },
  cacheWillUpdate: async ({ response, state }) => (state.visit === playerVisit ? response : null),
  // A response that passed the check above just before PLAYER_LEFT arrived can be written after
  // the caches were emptied: take it out again
  cacheDidUpdate: async ({ cacheName, request, state }) => {
    if (state.visit !== playerVisit) await (await caches.open(cacheName)).delete(request);
  },
};
// The page empties the caches too (services/workerCaches.js); the worker does so as well, after
// the count has moved on, so a write that was under way when the page did is not left behind
self.addEventListener('message', (event) => {
  if (event.data?.type !== PLAYER_LEFT) return;
  playerVisit += 1;
  event.waitUntil(Promise.all([WORKER_CACHES.profile, WORKER_CACHES.api].map((name) => caches.delete(name))));
});

/** Matches CinCin API calls whose path under the API base matches `path` (any path without one). */
const apiRoute = (path) => ({ url }) => isCinCinApiRequest(url, API_BASE, path);

// Taxonomy data changes rarely: serve from cache, revalidate in the background
registerRoute(apiRoute(/^\/scan\/taxonomy/i), new StaleWhileRevalidate({
  cacheName: WORKER_CACHES.taxonomy,
  plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 7 * DAY }), new CacheableResponsePlugin({ statuses: [0, 200] })],
}));

// Bottles fetched for offline play; their tasting notes don't change once published
registerRoute(apiRoute(/^\/bottles\/[^/]+\/cache/i), new CacheFirst({
  cacheName: WORKER_CACHES.bottles,
  plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * DAY }), new CacheableResponsePlugin({ statuses: [0, 200] })],
}));

// Profile and palate: fresh when online, cached copy when offline. Only the profile itself: the
// player's data export and other /users/me/... calls stay in the shorter-lived API cache.
registerRoute(apiRoute(/^\/(palate\/|users\/me$)/i), new NetworkFirst({
  cacheName: WORKER_CACHES.profile,
  networkTimeoutSeconds: 5,
  plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: DAY }), new CacheableResponsePlugin({ statuses: [0, 200] }), onlyThisPlayersVisit],
}));

// Other API calls
registerRoute(apiRoute(), new NetworkFirst({
  cacheName: WORKER_CACHES.api,
  networkTimeoutSeconds: 5,
  // What NetworkFirst caches by default (successful and opaque responses), which a plugin that
  // decides what to cache would otherwise replace
  plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 3600 }), new CacheableResponsePlugin({ statuses: [0, 200] }), onlyThisPlayersVisit],
}));

// Images
registerRoute(/\.(?:png|jpg|jpeg|svg|gif|webp)$/, new CacheFirst({
  cacheName: 'image-cache',
  plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * DAY })],
}));

// ─── Background push ───

// Without a Firebase project configured at build time, the app has no push
if (firebaseConfigured) {
  const messaging = getMessaging(initializeApp(firebaseConfig));

  onBackgroundMessage(messaging, (payload) => {
    if (payload.notification) return; // the Firebase SDK shows these itself

    const data = payload.data || {};
    return self.registration.showNotification(data.title || 'CinCin', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: data.type || 'general', // collapse notifications of the same type
      renotify: true,
      data: { ...data, url: data.url || appPathFor(data) },
    });
  });
}

// Tapping a notification opens (or focuses) the app at its screen. The Firebase SDK handles a
// plain tap on the notifications it showed (they carry FCM_MSG) but ignores their action
// buttons, so those are handled here for every notification.
self.addEventListener('notificationclick', (event) => {
  const shown = event.notification.data || {};
  const fromFirebase = Boolean(shown.FCM_MSG);
  if (fromFirebase && !event.action) return;

  event.notification.close();
  if (event.action === 'dismiss') return;
  const data = fromFirebase ? shown.FCM_MSG.data || {} : shown;
  event.waitUntil(openApp(event.action ? appPathFor(data) : data.url || '/'));
});

async function openApp(path) {
  // Only the app: a link to another site opens the app's home instead
  const target = new URL(path, self.location.origin);
  const url = target.origin === self.location.origin ? target.href : new URL('/', self.location.origin).href;
  // Only a window this worker controls can be navigated (a hard-reloaded tab can't), so any other
  // app tab is left alone and a new window opens instead
  const windows = await self.clients.matchAll({ type: 'window' });
  const open = windows.find((client) => 'focus' in client);
  if (open) {
    await open.focus();
    return open.navigate(url);
  }
  return self.clients.openWindow(url);
}

/** The app screen a notification of this type opens. */
function appPathFor(data) {
  switch (data.type) {
    case 'game_invite':
      return data.gameCode ? `/game/join?code=${encodeURIComponent(data.gameCode)}` : '/game/join';
    case 'season_ended': // that season's final standings and awards
      if (data.clubId && data.seasonId) return `/clubs/${encodeURIComponent(data.clubId)}/season-end/${encodeURIComponent(data.seasonId)}`;
      // without a season, its club
    case 'club_game_submitted': // eslint-disable-line no-fallthrough
    case 'club_game_approved':
    case 'club_game_rejected':
    case 'club_member_joined':
    case 'club_approval':
    case 'weekly_standings':
    case 'season_ending': // the club screen shows the season that is ending
      return data.clubId ? `/clubs/${encodeURIComponent(data.clubId)}` : '/clubs';
    case 'palate_updated':
      return '/palate/profile';
    case 'monthly_palate_wrapped':
      return '/palate/wrapped';
    case 'payment_failed':
      return '/subscription';
    default:
      return '/notifications';
  }
}
