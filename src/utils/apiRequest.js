/**
 * Which requests are calls to CinCin's own API. The service worker caches only those, so
 * responses from other services' APIs (such as Onfido's identity checks) never land in
 * Cache Storage on the player's device.
 */

/**
 * Whether `url` is a call to the CinCin API at `apiBase` (the API client's base URL) and,
 * given a `path` pattern, to a path under the API base that it matches (such as
 * /^\/bottles\// for https://api.playcincin.com/api/bottles/b1).
 */
export function isCinCinApiRequest(url, apiBase, path = /^/) {
  return url.origin === apiBase.origin
    && url.pathname.startsWith(`${apiBase.pathname}/`)
    && path.test(url.pathname.slice(apiBase.pathname.length));
}
