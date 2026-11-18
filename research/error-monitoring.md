# Error monitoring for CinCin

Ticket: [#13](https://github.com/miczagami/cincin_frontend/issues/13). Map: [#5](https://github.com/miczagami/cincin_frontend/issues/5).
Researched 2026-11-18 against `origin/main` of `cincin_frontend` (`a0f4350`) and `cincin_backend` (`0232bae`), the Sentry docs source (`getsentry/sentry-docs` at `80202b4`, 2026-11-17), and the npm tarballs of `@sentry/react`, `@sentry/node`, `@sentry/core`, `@sentry/server-utils` and `@sentry/bundler-plugins` 11.14.0 (published 2026-11-17).

> **Source limits.** This session's network blocks `sentry.io`, `docs.sentry.io`, the other vendors' sites, `docs.sevalla.com` and `oaic.gov.au`. Sentry facts come from the docs' own source repo on GitHub and the SDK code on npm, both first-party. Sentry's plan prices, the other vendors' facts, Sevalla's build settings and the OAIC guidance come from web-search extracts of the vendors' own pages, marked **[search]**. Check those against the live pages before you spend money. Anything I could not tie to a source is marked **unverified**.

## Recommendation

**Use Sentry (SaaS), in a new organisation created in the EU (Frankfurt) data region, with one project for the app and one for the API.**

- **Soft launch:** the free Developer plan (5k errors a month, one user, email alerts).
- **Public launch, or earlier if a second person needs access or you want Slack:** the Team plan, US$26/month billed annually or US$29 monthly [search]. It includes 50k errors a month, unlimited users and the Slack integration.

Why Sentry:

1. **It covers all three runtimes with the least code.**
   - **API:** `expressIntegration` captures Express 5 route and middleware errors on its own, with no error middleware to register [D14][N1].
   - **Cron jobs:** `nodeCronIntegration` turns each named `node-cron` 3.x job into a check-in monitor [N1].
   - **App:** the Vite plugin uploads source maps by debug ID, so no release bookkeeping is needed on Sevalla [D7][D9].
   - **Offline:** `makeBrowserOfflineTransport` queues events in IndexedDB while the PWA is offline [D12].
2. **It has the strongest PII controls of the options.**
   - In the SDK, `dataCollection` switches off IP, cookies, request bodies, query strings and headers, each on its own [D5][N1].
   - On the server, the default scrubbers run, plus "Additional Sensitive Fields" and the advanced rules (email, IP, credit-card and regex matchers) [D3][D4].
3. **Everything we need is in the free tier for the soft launch,** with predictable per-error pricing after that [D2].
4. **The SDK choice is portable.** GlitchTip accepts the same Sentry SDKs [G3]. If the legal research decides that error data must stay in Australia, only the DSN changes, and we self-host GlitchTip on Sevalla in Sydney (see [Open questions](#open-questions)).

Ruled out:

- **Highlight.io:** its hosted service was shut down on 2026-02-28 and moved into LaunchDarkly [H1].
- **Rollbar:** US-only storage (Iowa) [R2].
- **Bugsnag:** no documented data region [B2].
- **Hosted GlitchTip:** a 1k-event free tier, and fewer of the features we use (unverified for cron check-ins and debug-ID source maps).

## What the code does today

| Area | Today | Gap |
|---|---|---|
| React render errors | `AppRouter.jsx` uses `createBrowserRouter` with **no `errorElement` and no error boundary**. Only a `<Suspense>` wrapper exists. | React Router's default boundary "swallows" route errors in production, so even an SDK would not see them until a custom `errorElement` calls `captureException` [D10]. |
| Caught frontend errors | `console.error` in `SettingsPage`, `CachedBottlesPage`, `PalateWrappedPage`, `pushService`, `usePushNotifications`. | These are visible only in the user's browser. |
| Service workers | Workbox `generateSW` worker from `vite-plugin-pwa`. Separate `public/firebase-messaging-sw.js` (Firebase compat scripts via `importScripts`). | Sentry documents Web Workers only, not service workers [D13]. No SDK captures errors inside either worker automatically. |
| Offline | `useOfflineSync` queues games in IndexedDB. Workbox caches API reads. | Errors raised offline would be lost without an offline transport. |
| Express | `middleware/errorHandler.js`: 4xx → `console.warn`, everything else → `console.error`. Prisma `P2002`→409 and `P2025`→404 and validation→400 are mapped **without** a `statusCode` on the error. | Without a filter, Sentry would count those mapped Prisma and validation errors as 500s (see the `shouldHandleError` filter below). |
| Socket.io | Every handler in `config/socketServer.js` catches, logs `err.message` and acks `{ success: false }`. | No uncaught errors reach the process, so they need explicit capture. |
| Cron | `jobs/cronScheduler.js`: 5 `node-cron` 3.0.3 jobs, each wrapped in try/catch → `console.error(err.message)`. They run only when `CRON_ENABLED`. | Failures and missed runs are silent. |
| Process | `server.js` handles `SIGTERM` and calls `process.exit(0)` once HTTP closes. | Events still queued are dropped unless the SDK is flushed first. |
| **PII in logs** | `notificationService.js:598,652` log `Sent to ${email}` **in production**. Mock paths log emails and reset `actionUrl`s. | The Node SDK turns `console` calls into breadcrumbs [D5], so these emails would ride along on every later error. |

## Comparison

| | Sentry | GlitchTip | Rollbar | Bugsnag | Highlight |
|---|---|---|---|---|---|
| React 18 + Vite source maps | Vite plugin, debug IDs, delete maps after upload [D7][D9] | Accepts Sentry SDKs [G3]. Source-map upload with Sentry tooling is unverified. | Yes, source-map upload [search] | Yes (unverified detail) | n/a |
| PWA offline queue | `makeBrowserOfflineTransport` (IndexedDB, 30 events default) [D12] | Same SDK, so same transport (unverified that the server accepts late events) | unverified | unverified | n/a |
| Service-worker errors | Not documented (Web Workers only) [D13] | Same | unverified | unverified | n/a |
| Express 5 | Automatic. Instruments `express` 4 and `router` 2 (which Express 5 uses) [N1] | Same SDK | SDK middleware | SDK plugin | n/a |
| Socket.io | Manual `captureException` (no integration in the SDK) [N1] | Same | Manual | Manual | n/a |
| Prisma | `prismaIntegration` for tracing spans only. Prisma 5 needs `previewFeatures = ["tracing"]` [D16]. Errors arrive through Express anyway. | Same SDK | Manual | Manual | n/a |
| In-process cron | `nodeCronIntegration` check-ins (missed or late runs) for `node-cron` ≥3 <5 [N1]. 1 monitor free, then $0.78/monitor/month [D2]. | Uptime monitoring only (no cron check-ins, unverified) | No | No | n/a |
| Data region | US (Iowa) or EU (Frankfurt). **No Australia.** Fixed at org creation [D1]. | Hosted US (NYC1) or EU (FRA1). **Self-host anywhere, including Sevalla Sydney** [G2] | US (Iowa) [R2] | GCP, region not stated [B2] | Shut down [H1] |
| PII controls | SDK `dataCollection` + `beforeSend`. Server scrubbers, advanced rules, "prevent storing IP" [D3][D4][D5] | Sentry SDK side only. Server-side scrubbing unverified. | Server-side scrubbing fields [search] | unverified | n/a |
| Free tier | 5k errors, 1 user, email alerts [search][D2] | 1k events/month hosted [G1] | 5k occurrences, unlimited users, 30-day retention [R1] | Solo plan, 7-day retention [B1] | n/a |
| Next tier | Team $26/mo annual, $29 monthly: 50k errors, unlimited users, integrations [search] | $15/mo for 100k events [G1] | Essentials from $9/mo for 10k [R1] | unverified | n/a |
| Slack alerts | Team plan and up (Developer: email only) [search][D17] | unverified | unverified | unverified | n/a |

## Volumes and cost

Assumptions match `research/object-storage.md`: soft launch ≈ 500 MAU, public launch ≈ 20,000 MAU. Error volume is not measured anywhere yet. The figures below are budgets, not forecasts. Prices are USD, before tax [D2].

| | Soft launch | Public launch |
|---|---|---|
| Plan | Developer, $0 | Team, $29/mo (or $26/mo annual) |
| Errors included | 5,000/month. Over that, events are **dropped**, since Developer has no pay-as-you-go budget. | 50,000/month |
| Overage | n/a | Pay-as-you-go $0.0003625/error from 50k to 100k ($18.13 for the full extra 50k). Reserved volume is $0.00029 [D2]. |
| Cron monitors | 1 included: the hourly expired-seasons job | All 5 jobs: 4 extra × $0.78 = **$3.12/mo** [D2] |
| Uptime monitor | 1 included: `https://api.playcincin.com/health` | same |
| Expected total | **$0** | **≈ $32/mo** monthly billing, before overage |

Keep within quota:

- Turn on **Spike Protection** per project [D19].
- Turn on the inbound filters for browser extensions, legacy browsers and crawlers.
- Skip 4xx errors (the default) [D14].
- Leave tracing, replay and profiling **off** at launch: each is billed separately [D2], and replay is a PII surface.

## Data region and Australian privacy

- **No vendor here stores error data in Australia** unless we self-host.
  - Sentry offers US (Iowa) or EU (Frankfurt) [D1].
  - Hosted GlitchTip offers New York or Frankfurt [G2].
  - Rollbar is in Iowa [R2].
- **Sentry's region choice is permanent:** "once selected, your data storage location can't be changed", except by creating a new organisation [D1].
- **Some Sentry data stays in the US whichever region you pick** [D1]:
  - user accounts, organisation settings and integration metadata;
  - **cron check-ins**, DSN keys and usage data.

  None of these carry player PII in the setup below.
- **Why EU:** it puts event data under GDPR-grade handling, it matches Onfido's EU API base in `.env.example`, and it suits the planned UK expansion. US would also be acceptable. Either way, the data leaves Australia.
- **The Privacy Act, if it applies to CinCin:**
  - Sending personal information to an overseas service is normally a **disclosure** under APP 8. APP 8.1 requires reasonable steps (in practice, the vendor's DPA), and s 16C keeps CinCin accountable for the recipient's breaches [O1][search].
  - The "use, not disclosure" carve-out for cloud storage is narrow, and the OAIC says not to overstate it [O1][search].
  - Whether the Act applies at all, given the small-business exemption (≤ A$3M turnover, with exceptions) [O2][search], is for the legal research ticket to settle, not this one.
- **Design for minimisation, so that the question barely matters.** Events carry:
  - **only the internal user ID**: no email, name, IP, cookies, bodies or query strings;
  - plus server-side scrubbers as a backstop.

  The remaining personal data is pseudonymous: user ID, user agent, URL path, stack traces.
- **Update the privacy policy:** the `/privacy` draft for `cincin_www` should name Sentry as an overseas recipient and give the country (Germany if EU). That APP 1 requires this is **unverified** here; legal should confirm.

## Setup steps

### 0. Sentry account

1. **Create the organisation** with **Data Storage Location: European Union**. Name it `cincin`.
2. **Create two projects:**
   - `cincin-app` (platform React)
   - `cincin-api` (platform Express)
3. **Org Settings → Security & Privacy** (org-wide, so it overrides project settings [D3]):
   - **Data Scrubber:** on. **Use Default Scrubbers:** on.
   - **Prevent Storing of IP Addresses:** on.
   - **Additional Sensitive Fields:** `email`, `phone`, `firstName`, `lastName`, `first_name`, `last_name`, `displayName`, `dob`, `dateOfBirth`, `date_of_birth`, `address`, `document`, `applicant`, `sdkToken`, `refreshToken`, `idToken`, `pushToken`, `fcmToken`, `deviceToken`, `stripe-signature`, `x-sha2-signature`, `customer_email`.
     - Beware: entries also remove any *value* that contains the string [D3], so do not add short fragments like `exp`.
   - **Advanced Data Scrubbing rules** [D3][D4]:
     - `[Remove] [Email addresses] from [**]`
     - `[Remove] [IP addresses] from [**]`
     - `[Remove] [Anything] from [$user.geo.**]` (geo is derived from IP even with IP storage off [D3])
     - `[Mask] [Credit card numbers] from [**]`
4. **Turn on Spike Protection** for both projects [D19], and the inbound filters.
5. **Create an Organization Auth Token** (for source-map upload) [D7].
6. **Set up monitors:**
   - an uptime monitor on `https://api.playcincin.com/health`;
   - the cron monitors appear on their own once jobs check in (see §2).

### 1. App (`cincin_frontend`)

Packages:
- `npm i @sentry/react`
- `npm i -D @sentry/bundler-plugins`

Both need Node ≥ 20.19 at build time [N1]. Set the Sevalla static site's Node version to `20` (preinstalled) or `22` [S1].

**`src/sentry.js`**, imported first in `src/main.jsx` (before `./i18n` and the auth bootstrap):

```js
import * as Sentry from '@sentry/react';

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const scrub = (s) => (typeof s === 'string' ? s.replace(EMAIL, '[email]') : s);
const dsn = import.meta.env.VITE_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn) && import.meta.env.PROD,
  // Sevalla build variables apply to production AND preview builds, so tell them apart at runtime
  environment: window.location.hostname === 'app.playcincin.com' ? 'production' : 'preview',
  transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),
  transportOptions: { flushAtStartup: true },
  dataCollection: { userInfo: false, cookies: false, urlQueryParams: false, httpHeaders: false },
  // No tracesSampleRate, no replay, no httpClientIntegration at launch
  beforeSend(event) {
    event.exception?.values?.forEach((v) => { v.value = scrub(v.value); });
    if (event.message) event.message = scrub(event.message);
    return event;
  },
  beforeBreadcrumb(crumb) {
    if (crumb.message) crumb.message = scrub(crumb.message);
    return crumb;
  },
});
```

Why these settings:
- `urlQueryParams: false` keeps `verify-email?token=…` and Stripe `session_id` values out of events [D5].
- `makeBrowserOfflineTransport` stores up to 30 events while offline and sends them on reconnect [D12].
- Do not add `Sentry.replayIntegration()`. Session Replay captures console output and network metadata [D5].

**User context.** In `authStore`, after `init`, `login` and `register`:
- call `Sentry.setUser({ id: user.id })`;
- call `Sentry.setUser(null)` on logout.

Never pass email or display name. `setUser` data is "always sent" [D5].

**Route errors.** Add a root `errorElement` to the `createBrowserRouter` config in `AppRouter.jsx`. It is a component that reads `useRouteError()`, calls `Sentry.captureException(error)` in an effect, and renders a branded "Something went wrong / Reload" screen [D10]. Optionally, wrap `<RouterProvider>` in `<Sentry.ErrorBoundary fallback={…}>` for errors outside the router: in React 18 the boundary is the main capture tool [D11].

**Caught errors.** Add `Sentry.captureException(err)` next to the existing `console.error` calls in `pushService` (SW registration, token), `useOfflineSync` (sync failure) and the Settings export/delete handlers. Do not capture axios 4xx responses.

**Service workers.** No SDK integration exists [D13]:
- Leave the Workbox worker uninstrumented.
- The page already catches `navigator.serviceWorker.register` failures in `pushService`; report those.

**Source maps.** In `vite.config.js`:

```js
import { sentryVitePlugin } from '@sentry/bundler-plugins/vite';
// ...
build: { sourcemap: 'hidden' },          // no sourceMappingURL comment in the shipped JS
plugins: [
  react(),
  VitePWA({ /* unchanged */ }),
  sentryVitePlugin({                      // must be last [D7]
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    disable: !process.env.SENTRY_AUTH_TOKEN, // local and GitHub CI builds skip upload
    telemetry: false,                        // the plugin otherwise reports its own errors to Sentry [D8]
    sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
  }),
],
```

How this behaves:
- **Releases:** debug IDs tie each bundle to its map, so "creating a release is no longer required" [D9].
- **Release detection:** if no release name is given, the plugin uses the git `HEAD` SHA when the build directory is a git repo, and otherwise creates no release [D8]. Whether Sevalla's build checkout keeps `.git` is unverified; run the first build with `debug: true` and look.
- **Upload target:** the default `url` is right for SaaS. The org token carries the EU region [D8].
- **Service-worker precache:** Workbox's `globPatterns` does not include `.map`, so deleting maps does not touch the precache.

**Sevalla static-site environment variables** (build-time; they apply to production and preview deployments [S1]):

| Variable | Value | Secret? |
|---|---|---|
| `VITE_SENTRY_DSN` | `cincin-app` DSN (`https://…@o….ingest.de.sentry.io/…`) | No: public and baked into the bundle |
| `SENTRY_AUTH_TOKEN` | Org auth token | **Yes.** Never prefix it with `VITE_`, or it ships to browsers. |
| `SENTRY_ORG` | `cincin` | No |
| `SENTRY_PROJECT` | `cincin-app` | No |

There is no CSP today (`index.html`, `public/_headers`). If one is added, allow `connect-src https://*.ingest.de.sentry.io`.

### 2. API (`cincin_backend`)

Package: `npm i @sentry/node`. Node ≥ 20.19 [N1]. The Docker image uses `node:20-bookworm-slim`, which resolves to the latest 20.x. Bump `engines.node` in `package.json` from `>=18` to `>=20.19`.

**`src/instrument.js`:**

```js
require("dotenv").config();
const Sentry = require("@sentry/node");

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const scrub = (s) => (typeof s === "string" ? s.replace(EMAIL, "[email]") : s);

Sentry.init({
  dsn: process.env.SENTRY_DSN,                       // unset → SDK off (dev, tests, CI)
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,               // optional
  // No tracesSampleRate: errors only, so no Prisma or HTTP spans and no span billing
  dataCollection: {
    userInfo: false,            // no IP (Sevalla/Cloudflare client IPs)
    cookies: false,
    httpBodies: [],             // no signup/login bodies, base64 scans, Stripe or Onfido webhook payloads
    urlQueryParams: false,
    httpHeaders: { request: { allow: ["user-agent", "content-type", "content-length"] }, response: false },
  },
  includeLocalVariables: false,  // stack locals would include user rows and request objects
  integrations: [
    Sentry.expressIntegration({
      shouldHandleError(err) {
        // errorHandler.js maps these to 4xx without setting statusCode
        if (err.code === "P2002" || err.code === "P2025" || err.type === "validation") return false;
        return Number(err.status ?? err.statusCode ?? 500) >= 500;
      },
    }),
    Sentry.nodeCronIntegration(),
  ],
  beforeSend(event) {
    event.exception?.values?.forEach((v) => { v.value = scrub(v.value); });
    if (event.message) event.message = scrub(event.message);
    return event;
  },
  // notificationService logs "Sent to <email>" in production: keep console logs out of events
  beforeBreadcrumb: (crumb) => (crumb.category === "console" ? null : crumb),
});
```

Why these settings:
- `httpBodies: []` matters most. By default the Node SDK attaches **incoming request bodies, cookies, headers and the client IP** to error events [D5][N1].
- `sendDefaultPii` no longer exists in v11. `dataCollection` replaces it [N1].
- The email regex in `beforeSend` also covers Prisma validation errors, whose messages can echo the call's arguments (unverified for Prisma 5.22 specifically; the scrub is cheap).

**Start command.** The SDK must load through `--import`. In v11, `--require` "is no longer supported" [N1][D15].
- `Dockerfile`: `CMD ["node", "--import", "./src/instrument.js", "src/server.js"]`
- `package.json`: `"start": "node --import ./src/instrument.js src/server.js"`, and the same for `dev` (nodemon `--exec`).

With the runtime hook loaded, `expressIntegration` captures Express errors with no extra middleware [D14]. `setupExpressErrorHandler` is deprecated [N1].

**User context.** In `middleware/auth.js`, once the JWT is verified, call `Sentry.setUser({ id: user.id })`.

**Socket.io.** Add a helper and call it in each handler's `catch` in `config/socketServer.js`:

```js
const report = (event, err) => {
  if (!err.statusCode || err.statusCode >= 500) Sentry.captureException(err, { tags: { ws_event: event } });
};
```

Also set `Sentry.setUser({ id: socket.user.id })` inside the `connection` handler.

**Cron.** In `jobs/cronScheduler.js`:
1. **Name each job,** for example `cron.schedule("0 * * * *", fn, { name: "expire-seasons" })`. Use `monthly-wrapped`, `quarterly-summary`, `weekly-standings` and `season-reminders` for the rest. The monitor slug is the `name`. Unnamed jobs are not monitored [N1].
2. **Capture errors in each `catch`:** `Sentry.captureException(err, { tags: { cron: "<name>" } })`.

The jobs swallow their errors, so check-ins report "ok". The monitors catch **missed and late runs**, and the captured exceptions catch failures.

On Developer (one monitor), exclude all but `expire-seasons` with `nodeCronIntegration({ excludeJobs: [...] })` [N1]. With more than one API instance, every job would check in twice; the runbook already pins the API to one instance.

**Shutdown.** In the `SIGTERM` handler, call `await Sentry.close(2000)` before `process.exit(0)`.

**Sevalla application environment variables** (runtime):

| Variable | Value |
|---|---|
| `SENTRY_DSN` | `cincin-api` DSN |
| `SENTRY_ENVIRONMENT` | `production` |
| `SENTRY_RELEASE` | optional, for example the deployed git SHA if Sevalla exposes one (unverified) |

Add all three to `.env.example` and to `research/production-config-checklist.md`.

### 3. Alert routing

| Alert [D18] | Developer (soft launch) | Team (public launch) |
|---|---|---|
| New issue, `environment:production`, both projects | Email | Slack `#cincin-alerts` + email |
| Regression (resolved → unresolved) | Email | Slack |
| Issue seen > 50 times in 1 h (escalation) | Email | Slack + email to on-call |
| Cron monitor missed or failed | Email | Slack |
| Uptime `/health` down | Email | Slack + email |
| `environment:preview` | none | none |
| Quota and spike notifications | Email (Settings → Notifications) | same |

Slack setup (Team plan):
1. Settings → Integrations → Slack → Add Workspace [D17].
2. Invite `@sentry` to the alerts channel.
3. Optionally run `/sentry link team` to route a team's alerts [D17].

### 4. Verify

1. **App:** deploy a preview, throw from a temporary route, and check that:
   - the event arrives in `cincin-app` with a de-minified stack trace;
   - `dist/` holds no `.map` files on the live site.
2. **App offline:** go offline in DevTools, trigger an error, go back online, and check that the event arrives.
3. **API:** hit a temporary `/debug-sentry` route that throws, and check that:
   - the event has no `request.data`, no cookies and no IP;
   - the user is an ID only.
4. **API 4xx:** `POST /api/auth/login` with a bad password, and check that no event is created.
5. **Cron:** after an hour, `expire-seasons` shows an "ok" check-in.

## Open questions

1. **Must error data stay in Australia?**
   - If the legal research says yes, self-host GlitchTip (Postgres, optional Valkey; "runs with as little as 512MB of ram" [G3]) on Sevalla in Sydney. Keep the same SDK setup with a new DSN, and accept the loss of cron check-ins and Sentry's server-side scrubbing (both unverified for GlitchTip).
   - Decide this **before** creating the Sentry organisation, because the region cannot be changed [D1].
2. **Who gets alerts, and is there a Slack workspace?** This decides between Developer and Team for the soft launch.
3. **Does Sevalla's static-site build directory contain `.git`?** This affects only release naming, not source maps [D8][D9]. Check on the first build.
4. **Production logs contain player emails** (`notificationService.js:598,652`: `Sent to ${email}`). This leaks into Sevalla's logs whatever error tool we choose. Log the user ID instead. *Proposed ticket.*
5. **The app has no route `errorElement` or error boundary today.** A render error shows React Router's default page. *Part of the build ticket.*
6. **Service-worker errors stay invisible** in any tool. Accept this for launch, or decide later whether to load the Sentry CDN bundle in `firebase-messaging-sw.js` with `importScripts` (unverified that this is supported).
7. **Node 20 is past end of life** (April 2026, per the Node.js release schedule; unverified here). Sentry v11 still supports 20.19+, but the backend image and the Sevalla static-site builds should move to Node 22. *Proposed separate ticket.*

## Sources

Sentry docs, cited from the source repo `getsentry/sentry-docs` at `80202b445ae9` (2026-11-17). The live URL is `https://docs.sentry.io/` plus the path without `docs/` and `.mdx`.

- [D1] `docs/organization/data-storage-location/index.mdx`: US = Iowa, EU = Frankfurt; what is stored where; region permanent.
- [D2] `docs/pricing/index.mdx`: per-category prices; paid plans include 50k errors, 1 cron and 1 uptime monitor; cron $0.78/monitor; data over budget is dropped.
- [D3] `docs/security-legal-pii/scrubbing/server-side-scrubbing/index.mdx`: default scrubbers, Additional Sensitive Fields, IP and geo.
- [D4] `docs/security-legal-pii/scrubbing/advanced-datascrubbing.mdx`: rule syntax and data types.
- [D5] `docs/platforms/javascript/common/data-management/data-collected/index.mdx`: defaults for IP, bodies, cookies, headers, query, console breadcrumbs, replay.
- [D7] `docs/platforms/javascript/common/sourcemaps/uploading/vite.mdx`: `@sentry/bundler-plugins/vite`, `sourcemap: "hidden"`, plugin last, `filesToDeleteAfterUpload`.
- [D8] `docs/platforms/javascript/common/sourcemaps/uploading/bundler-plugin-options.mdx`: `release.name` detection, `url`, `telemetry`, `disable`.
- [D9] `includes/debug-ids/index.mdx`: debug IDs; a release is no longer required.
- [D10] `docs/platforms/javascript/guides/react/features/react-router/v6.mdx` and `v8.mdx`: custom `errorElement`; route errors are swallowed in production.
- [D11] `docs/platforms/javascript/guides/react/features/error-boundary.mdx`: React 18 uses `ErrorBoundary`.
- [D12] `docs/platforms/javascript/common/best-practices/offline-caching.mdx` and `platform-includes/configuration/offline/javascript.mdx`.
- [D13] `docs/platforms/javascript/common/best-practices/web-workers.mdx`: Web Workers only.
- [D14] `docs/platforms/javascript/guides/express/index.mdx` and `platform-includes/getting-started-capture-errors/javascript.express.mdx`: automatic capture, `shouldHandleError`, 3xx/4xx skipped.
- [D15] `platform-includes/getting-started-node/javascript.mdx`: `node --import ./instrument.js`.
- [D16] `docs/platforms/javascript/common/configuration/integrations/prisma.mdx`: Prisma 5 needs the `tracing` preview feature.
- [D17] `docs/integrations/notification-incidents/slack/index.mdx`.
- [D18] `docs/product/monitors-and-alerts/alerts/index.mdx`.
- [D19] `docs/pricing/quotas/spike-protection.mdx`.

SDK code:

- [N1] npm tarballs, version 11.14.0, of `@sentry/node`, `@sentry/react`, `@sentry/core`, `@sentry/server-utils` and `@sentry/bundler-plugins`:
  - `engines.node` is `>=20.19.0 <22.0.0 || >=22.12.0 <23.0.0 || >=23.2.0`;
  - `@sentry/react` peers `react` 17–19 and `react-router` 6–8, and exports `wrapCreateBrowserRouter` and `ErrorBoundary`;
  - the Node `init` warns that `--require` is unsupported;
  - the default integrations include `requestData`, `console`, `onUncaughtException` and `express`;
  - `nodeCronIntegration` monitors named tasks, supports `node-cron` `>=3.0.0 <5` and takes `excludeJobs`;
  - `expressErrorHandler`/`setupExpressErrorHandler` are deprecated;
  - Express instrumentation covers `express >=4 <5` and `router >=2 <3`;
  - `DataCollection` types: `userInfo`, `cookies`, `httpHeaders`, `httpBodies`, `urlQueryParams`.

Other vendors and Sevalla, from web-search extracts of first-party pages ([search]):

- Sentry plans: <https://sentry.io/pricing/>. Developer: free, 1 user, email alerts, 5k errors. Team: $26/mo annual ($29 monthly), unlimited users, third-party integrations.
- [H1] <https://www.highlight.io/blog/launchdarkly-migration>: hosted Highlight deprecated 2026-02-28 and moved to LaunchDarkly.
- [G1] <https://glitchtip.com/pricing/>: 1k events/month free; $15/100k, $50/500k, $250/3M.
- [G2] <https://glitchtip.com/documentation/hosted-architecture/>: US on DigitalOcean NYC1, EU on FRA1, no replication between them.
- [G3] <https://gitlab.com/glitchtip/glitchtip-backend> README, fetched directly: "Sentry API compatible", Postgres, 512 MB RAM, Valkey optional.
- [R1] <https://rollbar.com/pricing-for-agents>: free 5k occurrences, Essentials from $9/mo for 10k.
- [R2] <https://docs.rollbar.com/docs/security>: primary data centre in Iowa, on GCP.
- [B1] <https://www.bugsnag.com/pricing/>: free solo tier, 7-day retention.
- [B2] <https://www.bugsnag.com/product/security/>: GCP, no region named.
- [S1] <https://docs.sevalla.com/static-sites/build-settings>: Node 16/18/20/22 preinstalled; env vars apply to production and preview on every branch.
- [S2] <https://docs.sevalla.com/platform/locations>: Sydney region for applications and databases.
- [O1] <https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-8-app-8-cross-border-disclosure-of-personal-information>: APP 8, s 16C, use vs disclosure.
- [O2] <https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/small-business>: the A$3M exemption and its exceptions.

Code, at the `origin/main` commits above:

- `cincin_frontend`: `src/main.jsx`, `src/AppRouter.jsx`, `vite.config.js`, `src/services/pushService.js`, `src/context/authStore.js`, `public/_headers`, `public/firebase-messaging-sw.js`.
- `cincin_backend`: `src/server.js`, `src/app.js`, `src/middleware/errorHandler.js`, `src/config/socketServer.js`, `src/jobs/cronScheduler.js`, `src/services/notificationService.js`, `Dockerfile`, `package.json`, `.env.example`, `documentation/DEPLOYMENT-SEVALLA.md`.
