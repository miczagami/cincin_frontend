/**
 * The service worker's runtime caches for CinCin's API, by name. The worker (sw.js) fills them;
 * the page empties them, so a player who leaves takes their API responses with them.
 */
export const WORKER_CACHES = {
  taxonomy: 'taxonomy-cache',
  bottles: 'bottle-cache',
  profile: 'profile-cache',
  api: 'api-cache',
};

async function deleteCaches(names) {
  // No Cache Storage (an insecure origin such as the dev server over a LAN address): nothing to empty
  if (typeof caches === 'undefined') return;
  await Promise.all(names.map((name) => caches.delete(name)));
}

/** The message the page sends the worker when a player leaves (sw.js). */
export const PLAYER_LEFT = 'PLAYER_LEFT';

/**
 * A player is leaving (logout): empties their caches, and tells the worker not to cache any of
 * their responses still on the way, which would otherwise fill the caches again.
 */
export function clearPlayerCaches() {
  navigator.serviceWorker?.controller?.postMessage({ type: PLAYER_LEFT });
  return deleteCaches([WORKER_CACHES.profile, WORKER_CACHES.api]);
}

/** Empties every one of the worker's API caches (Settings' Clear cache). */
export function clearWorkerCaches() {
  return deleteCaches(Object.values(WORKER_CACHES));
}
