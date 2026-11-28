/**
 * Which requests are calls to CinCin's own API. The service worker caches only those, so
 * responses from other services' APIs (such as Onfido's identity checks) never land in
 * Cache Storage on the player's device.
 */

/** Whether `url` is a call to the CinCin API at `apiBase` (the API client's base URL). */
export function isCinCinApiRequest(url, apiBase) {
  return url.origin === apiBase.origin && url.pathname.startsWith(`${apiBase.pathname}/`);
}
