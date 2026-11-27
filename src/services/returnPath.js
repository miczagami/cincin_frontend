/**
 * Where a signed-out player was heading, such as a join link from an invite, so that
 * signing in (or signing up) finishes there instead of at Home.
 *
 * Kept in sessionStorage, like the login itself, so it survives the several steps of
 * sign-up. Only a path inside the app is ever returned to.
 */
const KEY = 'cin_return_path';

function isReturnablePath(path) {
  return typeof path === 'string'
    && path.startsWith('/')
    && !path.startsWith('//') && !path.startsWith('/\\') // another site
    && !/^\/auth(\/|\?|#|$)/.test(path); // the sign-in screens themselves
}

/** Remember the screen a signed-out player tried to open. */
export function rememberReturnPath({ pathname, search = '', hash = '' }) {
  const path = `${pathname}${search}${hash}`;
  try {
    if (isReturnablePath(path)) sessionStorage.setItem(KEY, path);
  } catch { /* storage unavailable: sign-in ends at Home */ }
}

/** Where signing in should end, without forgetting it. */
function peekReturnPath() {
  try {
    const path = sessionStorage.getItem(KEY);
    return isReturnablePath(path) ? path : '/';
  } catch {
    return '/';
  }
}

/** Where signing in should end; forgets it, so a later sign-in ends at Home. */
export function takeReturnPath() {
  const path = peekReturnPath();
  try { sessionStorage.removeItem(KEY); } catch { /* nothing to forget */ }
  return path;
}
