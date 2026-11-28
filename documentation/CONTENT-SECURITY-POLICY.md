# Content-Security-Policy

The app sends a Content-Security-Policy in **report-only** mode: browsers report what the policy
would block, and block nothing. This page says where the policy comes from, what each source is
for, how to check it after a deploy, and how to move it to enforcing mode.

## Where it is set

- **The policy:** `build/contentSecurityPolicy.js` builds it from the same build variables as the
  app: `VITE_API_URL` and `VITE_WS_URL`, plus the `<style>` blocks in `index.html`, which it allows
  by their SHA-256 hash. So a build whose API is somewhere else, such as a Sevalla preview, allows
  that API and nothing more.
- **The header:** `vite.config.js` appends it to the built `_headers` file as the
  `Content-Security-Policy-Report-Only` header of one rule for `/*`. The cache rules in
  `public/_headers` stay as they are.
- **Locally:** `vite preview` sends the same header, so the PWA tests run under it.
- **Vercel:** `vercel.json` doesn't carry it. The app moves to Sevalla (cincin_backend
  `documentation/DEPLOYMENT-SEVALLA.md`), and Vercel goes at the end of that move.

**Keep the CSP in that one rule.** When several `_headers` rules match a request and set the same
header, Sevalla sends one header with all their values joined by `, `, which would break the
policy. If one line of `_headers` can't be parsed, Sevalla publishes the deployment with **none**
of the file's headers, the CSP included. So check the deployment log for
`Headers processed successfully!` after changing it.

## Deep links get it too

Sevalla applies `_headers` rules by the **requested** path, "to every response for a matching path,
including redirects and 404 pages" ([Custom headers](https://docs.sevalla.com/static-sites/headers)).
A deep link such as `/clubs/abc` is answered with `index.html` by the SPA fallback in
`public/_redirects` (`/*  /index.html  200`), and it matches `/*`. So it carries the policy, as do
`/`, the assets and the service worker script `/sw.js`. The policy of `/sw.js` governs what the
service worker itself may fetch.

**Check after each deploy that changes it:**

```bash
curl -sI https://app.playcincin.com/clubs/any-id | grep -i content-security-policy-report-only
curl -sI https://app.playcincin.com/sw.js | grep -i content-security-policy-report-only
```

Both should print the policy.

## What it allows, and why

| Directive | Sources | For |
| --- | --- | --- |
| `default-src` | `'self'` | Everything not listed below: the app's own scripts, its service worker, the manifest. |
| `connect-src` | `'self'`, the API's origin from `VITE_API_URL`, and the socket's `https`/`wss` origins from `VITE_WS_URL` | API calls and Socket.io (polling, then the WebSocket upgrade). |
| | `https://firebaseinstallations.googleapis.com`, `https://fcmregistrations.googleapis.com` | Registering for push with Firebase Cloud Messaging. A unit test reads these from the installed Firebase SDK, so an upgrade that moves them fails it. |
| `style-src` | `'self'`, `https://fonts.googleapis.com`, and the hash of each `<style>` block in `index.html` | The app's CSS, the Google Fonts stylesheet, and the critical CSS inlined for the first paint. Editing that CSS changes the hash, and the build follows it. |
| `font-src` | `'self'`, `https://fonts.gstatic.com` | The Poppins font files. |
| `img-src` | `'self'`, `https:`, `data:`, `blob:` | Bottle and avatar images are URLs from the API, on hosts nothing fixes. Scan previews and share cards are the app's own `blob:` and `data:` URLs. |

`tests/pwa/csp.spec.js` checks that signing up, scanning and playing, Settings and the installed
app raise no reports under this policy.

## Reports

There is no reporting endpoint yet, so reports only appear in each player's browser console:
`[Report Only] Refused to …`. When Sentry is added (cincin_frontend#43), point the policy at
Sentry's security endpoint with `report-uri`, and `report-to` alongside it, so reports reach the
team. Then leave it in report-only mode long enough to see real players' reports: at least a few
weeks after launch.

## Moving to enforcing mode

1. Reports have reached Sentry for at least a few weeks, and each one is either fixed or allowed in
   `build/contentSecurityPolicy.js`.
2. **Add Onfido's origins first.** The Onfido age-verification SDK is deferred for now. When it
   ships, add the origins its documentation lists for a Content-Security-Policy: its scripts, its
   API (`connect-src`, for the region set by the backend's `AGE_VERIFY_API_BASE`), its frames and
   any `blob:`/`data:` media its camera capture uses. Then run the age-verification flow under the
   report-only policy until it raises no reports. An enforcing policy without them would break age
   verification, and with it sign-up.
3. Add the directives that only matter when enforcing:
   - `object-src 'none'`
   - `base-uri 'self'`
   - `form-action 'self'`
   - `frame-ancestors 'none'`

   Consider narrowing `img-src` to the image hosts the reports show.
4. In `vite.config.js`, change `CSP_HEADER` to `Content-Security-Policy`. Deploy, check the two
   `curl` lines above, and run the main flows on the deployed app.
5. If something breaks, change it back to report-only and redeploy. Sevalla's **Rollback** of the
   static site does the same.
