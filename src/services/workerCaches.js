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

/** Empties the caches holding the signed-in player's own API responses (on logout). */
export function clearPlayerCaches() {
  return deleteCaches([WORKER_CACHES.profile, WORKER_CACHES.api]);
}

/** Empties every one of them (Settings' Clear cache). */
export function clearWorkerCaches() {
  return deleteCaches(Object.values(WORKER_CACHES));
}
