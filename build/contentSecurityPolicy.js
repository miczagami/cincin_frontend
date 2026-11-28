/**
 * The app's Content-Security-Policy, built from the same variables as the app itself, so a
 * build whose API is elsewhere (a Sevalla preview, say) allows that API and nothing more.
 * documentation/CONTENT-SECURITY-POLICY.md says what each source is for.
 */
import { createHash } from 'node:crypto';

/**
 * The policy for a build whose API is at `apiUrl` and socket at `wsUrl` (VITE_API_URL,
 * VITE_WS_URL), and whose index.html carries the `inlineStyles` (the text of each <style>).
 */
export function contentSecurityPolicy({ apiUrl, wsUrl, inlineStyles = [] } = {}) {
  // Firebase Cloud Messaging: registering for push (installations, then the token)
  const connect = ["'self'", 'https://firebaseinstallations.googleapis.com', 'https://fcmregistrations.googleapis.com'];
  // Unset, the app calls its own origin ('self'): VITE_API_URL's /api, or the page's own
  for (const url of [apiUrl, wsUrl].filter(Boolean)) {
    const { origin, host, protocol } = new URL(url);
    connect.push(origin, `${protocol === 'https:' ? 'wss' : 'ws'}://${host}`);
  }
  // Only these exact <style> blocks, so an injected one is reported
  const styleHashes = inlineStyles.map((css) => `'sha256-${createHash('sha256').update(css).digest('base64')}'`);
  return [
    "default-src 'self'",
    `connect-src ${connect.join(' ')}`,
    // Google Fonts: the stylesheet in index.html, and the font files it loads
    ['style-src', "'self'", 'https://fonts.googleapis.com', ...styleHashes].join(' '),
    "font-src 'self' https://fonts.gstatic.com",
    // Bottle and avatar images are URLs from the API, on hosts it doesn't fix; scan previews and
    // share cards are the app's own data: and blob: URLs
    "img-src 'self' https: data: blob:",
  ].join('; ');
}
