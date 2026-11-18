# Running the Onfido Web SDK inside the installed PWA

Ticket: [#12](https://github.com/miczagami/cincin_frontend/issues/12). Map: [#5](https://github.com/miczagami/cincin_frontend/issues/5).
Researched 2026-11-18 against `origin/main` of `cincin_frontend` (`a0f4350`) and `cincin_backend` (`0232bae`), `onfido-sdk-ui` 14.90.0 (npm and GitHub, released 2026-11-11) and `@onfido/api` 6.3.0 (npm, the official Node client, which is generated from the API spec).

> **Source limits.** `documentation.onfido.com` and `documentation.identity.entrust.com` cannot be reached from this research session (outside its network allowlist), and neither can `sdk.onfido.com`. Everything below comes from the SDK's own GitHub repo (README, CHANGELOG, MIGRATION, older tagged READMEs), the npm tarballs, and our code. Claims I could not tie to one of those sources are marked **unverified**. Re-check them against the live CSP guide and API reference before shipping (see [Open questions](#open-questions)).

## Answer in short

1. **Install `onfido-sdk-ui` from npm (14.90.0) and import it lazily inside `AgeVerifyPage`, only when the user taps Begin.** Since v14 the npm package is a 14 KB loader (4.5 KB gzipped) that `import()`s the real SDK from `https://sdk.onfido.com/<version>/Onfido.js` when `Onfido.init()` is called [N1][G1]. So the SDK always runs from Onfido's CDN inside *our* document, and *our* CSP governs it. The service worker does not need to precache it and should not cache any Onfido traffic.
2. **It works in an installed PWA on Android Chrome and iOS (camera via `getUserMedia`)**, but there is no Onfido statement about installed PWAs (standalone mode) either way. The SDK's support statement is "latest" Chrome, Firefox, Edge and Safari [G1]. The iOS caveats are real but mostly fixed in 2025–26 releases [G2]. **Test on real devices before launch**: an iPhone with the app installed to the home screen, and an Android phone.
3. **Use an Onfido Studio workflow, not the classic `steps` + `POST /checks` flow the backend implements today.** Onfido calls the classic flow "not recommended as the majority of new features are exclusively released for Studio workflows" [G1]. Studio also removes the client-side `/submit` call, gives 5-week tokens instead of 90-minute ones, and reports abandonment. The backend as written *does* work with the classic flow if the page calls `POST /auth/age-verify/submit` from `onComplete`, so that is a valid stopgap.
4. **Results arrive by webhook at the backend; the app polls our own `/status`.** Today `/status` can only say `verified: true|false`, so a failed check makes the page poll forever. The backend has to persist failure, review and abandonment, and `/status` has to return them.
5. **Bundle cost on our side is negligible** (4.5 KB gzipped, already behind the lazily loaded `AgeVerifyPage` route). The runtime SDK from the CDN loads only on Begin, on an authenticated route that Lighthouse does not audit. Its size could not be measured from here.

## 1. Version and how to load it

| Fact | Source |
|---|---|
| Latest `onfido-sdk-ui` is **14.90.0** (2026-11-11). A new minor version ships every 1–2 weeks (14.80 → 14.90 between Aug and Nov 2026). | [N1] |
| The npm package contains only `Onfido.js` (14,131 bytes) and `types/`. No dependencies, no peer dependencies. | [N1] |
| Since v14 "the `onfido-sdk-ui` package loads the Web SDK at runtime from the Entrust CDN". By default Entrust picks the runtime version within the latest major ("Entrust Managed SDK Upgrades"). | [G1] "Integrating with an NPM package" |
| The loader's `init` calls `import(/* webpackIgnore: true */ /* @vite-ignore */ \`https://sdk.onfido.com/${version}/Onfido.js\`)`, with `version` defaulting to `"14"`. Vite will not try to bundle that URL. | [N1] `Onfido.js` |
| You can pin with `Onfido.init({ version: "14.90.0" })` (or `"14.90"` for patches only). | [G1] "Version pinning", [N1] `types/loader.d.ts` |
| "Split bundles" ended in v14. The CSS is inlined, so there is no separate stylesheet import. | [G3] 14.0.0 migration |
| The import is `import { Onfido } from 'onfido-sdk-ui'`. `init` returns a handle with an async `tearDown()`. | [G1], [G3] |
| v14 removed `useModal`, `isModalOpen`, `onModalRequestClose`, `setOptions()` and the client-side `uploadFallback`. The SDK now fills 100% of its parent container (max 600×800 px on desktop). | [G3] |
| The SDK sets one cookie, `onfido-web-sdk-analytics` (30 days). `disableAnalyticsCookies: true` turns it off. | [G1] "Cookies" |
| Onfido is now part of Entrust: the README says "Entrust CDN" and links Studio docs on `documentation.identity.entrust.com`. | [G1] |

**npm or a CDN `<script>` tag?** Use npm. It is the same runtime code from the same CDN, but the `import()` happens only when `init()` runs, which gives lazy loading for free, plus TypeScript types and a pinnable `version`. A `<script src="https://sdk.onfido.com/v14">` in `index.html` would load the full SDK on every page.

**Pin the runtime version.** Use `version: "14.90"` (or whichever version was tested on devices) so that Entrust's managed upgrades cannot change the capture flow under an installed PWA without testing. Bump it on purpose.

### Service worker (Workbox via `vite-plugin-pwa`)

- Precache: none of this is needed. `globPatterns` covers only our own build output, and the loader is part of the `AgeVerifyPage` chunk.
- **Change needed:** `vite.config.js:79` routes `urlPattern: /^https:\/\/api\./i` through `NetworkFirst` into `api-cache`. That pattern also matches Onfido's API hosts (`https://api.eu.onfido.com/...`, and the SDK's own `${onfidoApiUrl}/v4/sdk/...` calls [N1]). Workbox would then write the GET responses of an identity flow, which carry bearer tokens and applicant data, into Cache Storage on the device. Narrow the pattern to our own API origin (for example `({url}) => url.origin === import.meta.env.VITE_API_URL`) or exclude `onfido.com`.
- The image `CacheFirst` rule (`/\.(?:png|jpg|jpeg|svg|gif|webp)$/`) matches any origin, so it will cache Onfido's static UI images from `sdk.onfido.com`. That is harmless, but the same exclusion can cover it.
- Verification cannot work offline. Show an "you're offline" state on `AgeVerifyPage` instead of starting the flow.

## 2. Installed PWA: iOS standalone and Android Chrome

What the primary sources say:

- **Supported browsers:** the latest Chrome, Firefox, Edge and Safari [G1]. The README, CHANGELOG and migration guide never mention PWAs, standalone mode or `display: standalone`, so there is no statement either way [G1][G2][G3].
- **Webviews** are flagged as limited: "they have limitations in terms of accessing device features such as the camera, microphone, and local files". The `permissions_unavailable` error "may occur when the Web SDK is loaded within a webview or other custom browsers" [G1]. An installed PWA is **not** a webview on either platform: Android runs it in Chrome, and iOS runs home-screen apps in WebKit with `getUserMedia` support. So this warning does not apply directly. It *would* apply if the app were later wrapped in Capacitor/TWA or opened inside a social app's in-app browser (Instagram and Facebook links). **Unverified** that the SDK treats iOS standalone mode as a normal browser rather than a webview; confirm on a device.
- **Document capture by camera works on mobile only.** Since 14.61.0 (2026-01-21), "only mobiles, tablets and tablet PCs are now able to capture document using camera. Desktop can use manual upload or cross device flow" [G2 line 337]. On desktop the SDK sends the user to the cross-device flow (QR code, SMS or copy link to `id.onfido.com`) [G1 "Cross-device navigation"]. That is fine for us: CinCin is phone-first.
- **File-upload fallback** (choosing a photo instead of using the live camera) is off by default since v13. It came back in 14.15 as a client-side parameter that "is disabled by default and requires activation through the Onfido Support Team" [G1 "Upload fallback"]. Ask for it when the account is created. Without it, a user who denied camera permission gets `no_camera` or `permissions_unavailable` and cannot continue.
- **Recent iOS fixes** in the changelog show that iOS Safari is actively tested and still breaks now and then: Motion camera feed black screen on iOS Safari (fixed 14.89 and 14.90), front/rear camera mix-up on some iPhones, overexposed photos on iOS 18.4, `passive_signals` freeze on iOS 18.7, intro animations not loading after the back button [G2]. **Pinning a known-good version and testing on a current iPhone matters more than any setting.**
- **Permissions screen.** The SDK has its own camera/microphone primer and, since 13.5.0, "permission screen instructions ... to guide users on various devices/browsers to recover from denied access to the camera" [G2].

iOS standalone caveats to test (from platform knowledge, **unverified** here because WebKit sources are unreachable):

1. `getUserMedia` in home-screen web apps has worked since iOS 13.4. Before that, standalone apps had no camera.
2. In standalone mode iOS may ask for camera permission again on each launch, and Settings → Safari → Camera governs it. If the user denies it, recovery means going to iOS Settings, not a browser prompt. The SDK's recovery instructions are written for Safari, so check that they make sense from a home-screen app.
3. External links the SDK opens (privacy policy, Onfido terms) leave the app's scope and open in an in-app Safari sheet. Pass `onExternalLink` [G1] and open them with `window.open(url, '_blank', 'noopener')` so the PWA keeps its state.
4. If the app goes to the background mid-capture, iOS may suspend or reload the page. The flow must then restart cleanly: tear the SDK down, then call `initiate` again.
5. Our manifest sets `orientation: 'portrait'`. Document capture works in portrait (the SDK frames ID cards with an overlay), so nothing needs to change, but check that capture works with landscape locked.

Android Chrome installed PWAs share Chrome's site permissions for `playcincin.com`, so the browser and the installed app behave the same.

**Do not set `Permissions-Policy: camera=()`** anywhere. If the app adds a `Permissions-Policy` header later, it must include `camera=(self)` (and `microphone=(self)` if the Motion liveness variant is enabled).

## 3. Studio workflow or classic checks, and what the backend does today

### What `cincin_backend` does (`src/services/ageVerifyService.js`, `src/routes/ageVerify.js`)

| Aspect | Backend today | Current Onfido API (`@onfido/api` 6.3.0, API v3.6) | Match? |
|---|---|---|---|
| API version / base | `https://api.eu.onfido.com/v3.6`, overridable via `AGE_VERIFY_API_BASE` (`:252`) | v3.6 is current; the client's `BASE_PATH` is `https://api.eu.onfido.com/v3.6`; regions are **EU, US, CA** only [A1] | Yes |
| Auth header | `Authorization: Token token=<key>` | Same (`'Token token=' + apiToken`), plus optional OAuth2 client credentials [A1] | Yes |
| Integration style | **Classic**: `POST /applicants` → `POST /sdk_token` → (user captures) → `POST /checks { report_names: ["document"] }` | Classic is still supported; README says "not recommended" [G1] | Works, not the recommended flow |
| Applicant | Created on **every** `initiate`, named from `displayName` split, `last_name` falls back to the user-id suffix (`:276`) | `first_name`, `last_name` required; `dob`, `email`, `location` optional [A1] | Valid. A new applicant per retry goes against Onfido's advice to reuse "the recommended single applicant profile" [G1 "Cookies"] |
| SDK token | `POST /sdk_token { applicant_id, referrer: CORS_ORIGIN \|\| "*" }` (`:287`) | Fields `applicant_id`, `referrer?`, `application_id?`, `cross_device_url?` [A1]. Tokens "expire after 90 minutes" [G1] | Shape OK. See the referrer note below |
| Check | Started by `POST /age-verify/submit` → `POST /checks` (`:294`) | `CheckBuilder` requires `applicant_id`, `report_names` [A1] | Yes. **The frontend never calls `/submit`** |
| Webhook verification | HMAC-SHA256 of the raw body with `AGE_VERIFY_WEBHOOK_SECRET`, hex, compared in constant time to `X-SHA2-Signature` (`:306`). Raw body is kept by `express.raw` in `app.js` | `WebhookEventVerifier.readPayload(rawBody, hexSignature)` does exactly HMAC-SHA256, hex, `timingSafeEqual` [A1] | Yes |
| Webhook event | Acts only on `payload.resource_type === "check"` and `action === "check.completed"` (`:311`) | Valid event; Studio uses `workflow_run.completed` instead [A1] | Yes for classic; would ignore Studio |
| Result fetch | Does not trust the body: `GET /checks/{id}`, `GET /reports?check_id=`, reads the `document` report's `properties.date_of_birth` (`:317–319`) | `Check.result` is `clear \| consider`; `DocumentProperties.date_of_birth` exists [A1] | Yes |
| Pass rule | `check.result === "clear"` **and** a DOB is present **and** the age from that DOB ≥ the region's drinking age (AU 18) | n/a | Sound |
| Stored fields | On pass: `ageVerified = true`, `ageVerifiedAt`, `dateOfBirth`, `ageVerifyRef = null`. On start: `ageVerifyRef` (applicant id, unique), `ageVerifyRegion` | n/a | **On fail, nothing is stored**, and `ageVerifyRef` stays set |
| Status endpoint | `GET /age-verify/status` → `{ verified, verifiedAt }` (`:196`) | n/a | Cannot say "failed", "review" or "abandoned" |

### Gap between the backend and the SDK

1. **Nothing mounts the SDK.** `AgeVerifyPage.jsx:30` has a comment where `Onfido.init` should go, then starts polling.
2. **Nothing calls `/submit`.** `api.js` defines `ageVerify.submit()`, but `authStore` and the page never use it. With the classic backend, no check is ever created, so no webhook ever arrives.
3. **Failure is invisible.** `processWebhook` returns `{ passed: false, reason }` to Onfido's webhook call, but persists nothing. `/status` only reports `verified`. `authStore.checkAgeVerifyStatus` (`authStore.js:77`) maps everything else to `pending`. The page's `status === 'failed'` branch can never fire, and the 3-second `setInterval` never stops (it is also not cleared on unmount).
4. **Retry creates a new applicant and a new token each time**, so one person can end up with many Onfido applicants and several billed checks.
5. **Referrer pattern (unverified).** The token is bound to `referrer: CORS_ORIGIN || "*"`. In production `CORS_ORIGIN` would be `https://playcincin.com`. As I recall, Onfido's referrer is a URL *pattern* matched against the full page URL (for example `https://playcincin.com/*`), so a bare origin may be rejected with `invalid_token`, and the `"*"` fallback accepts any site. Check against the `POST /sdk_token` reference, and set an explicit `AGE_VERIFY_SDK_REFERRER=https://playcincin.com/*`.
6. **Document report vs. a made-up applicant name (unverified).** The document report compares extracted data with the applicant record. With `first_name`/`last_name` taken from a display name (or a user-id suffix), that comparison may push results to `consider`, which our rule treats as a fail. Studio, or omitting names where the API allows it, avoids this. Confirm with Onfido when the account is set up.

### Recommendation: a Studio workflow

Why Studio fits CinCin better:

- It is the documented default ("All Onfido Smart Capture SDKs are orchestrated using Onfido Studio workflows"), and new features ship there first [G1].
- **Token lifetime:** Studio SDK tokens "remain valid for a period of five weeks", while manual tokens "expire after 90 minutes" [G1]. An installed PWA that gets suspended in the background loses fewer sessions.
- **There is no client-triggered check.** The workflow creates the reports itself once capture is done, so the `/submit` round trip and its "user closed the app before submit" failure mode go away.
- **Abandonment is first-class:** `WorkflowRunStatus` includes `abandoned` and `error` as well as `approved`, `declined`, `review`, `processing` and `awaiting_input` [A1], and the SDK raises `workflow_abandoned` [G1].
- Cross-device options, the welcome and complete screens, and the upload fallback move into the Workflow Builder, not app code [G1].

Backend changes for Studio (`ageVerifyService` onfido provider):

| Step | Call |
|---|---|
| initiate | Reuse the user's applicant if one exists (new column `onfidoApplicantId`), else `POST /applicants`. Then `POST /workflow_runs { workflow_id: ONFIDO_WORKFLOW_ID, applicant_id, customer_user_id: user.id }`. Return `{ workflowRunId: run.id, sdkToken: run.sdk_token }` [A1] |
| store | `ageVerifyRef = run.id` (the workflow run id), `ageVerifyRegion`, `ageVerifyStatus = 'pending'` |
| webhook | Same HMAC verification. Act on `resource_type: "workflow_run"`, `action: "workflow_run.completed"`. Re-fetch `GET /workflow_runs/{id}` and branch on `status` [A1] |
| DOB | Configure the workflow's **output** to expose the document's date of birth (`WorkflowRun.output` "contains all of the properties configured on the Workflow version" [A1]). Keep the server-side age ≥ 18 check: never trust a pass without our own DOB arithmetic |
| persist | `approved` + DOB ≥ 18 → verified. `declined` → failed (+ `reasons`). `review` → review. `abandoned`/`error` → abandoned. Store `ageVerifyStatus` and `ageVerifyReason` |
| remove | `/submit` and `submitCheck` |

Using Studio means `cincin_frontend` passes `workflowRunId` as well as `token` to `Onfido.init` (`StudioSdkParameters` [N1]).

## 4. How the result comes back, and abandon / retry / failure

The **webhook is the source of truth** and lands at `POST /api/auth/age-verify/webhook`; it must be registered in the Onfido dashboard with the matching secret. Treat the SDK's `onComplete` only as "capture finished". It carries no verification result, and Onfido is removing even the partial data it returns today [G1].

The app learns the result by **polling our `/status`** (with backoff, for example 2 s → 5 s → 10 s, capped at a few minutes, then "we'll let you know"). Alternatively the backend emits a Socket.io event to the user's room when the webhook lands. The socket server already exists, so this avoids polling, but keep polling as the fallback for when the socket is down.

`/status` should return `{ status: 'unverified' | 'pending' | 'verified' | 'failed' | 'review' | 'abandoned', reason?, verifiedAt? }`.

Frontend handling (`AgeVerifyPage`):

| Event | Source | App behaviour |
|---|---|---|
| Begin | user | `initiate` → `const { Onfido } = await import('onfido-sdk-ui')` → `Onfido.init({ token, workflowRunId, containerEl, version, showExitButton: true, onComplete, onError, onUserExit, onExternalLink, disableAnalyticsCookies })` |
| `onComplete` | SDK | `await handle.tearDown()`, show "checking", start polling (classic stopgap: call `ageVerify.submit()` first) |
| `onUserExit('user_exit')` | SDK (needs `showExitButton: true`) [G1][N1] | tear down, back to intro. Studio marks the run abandoned later |
| `onError` `expired_token` | SDK [G1] | tear down, call `initiate` again for a fresh token, re-init. **`await tearDown()` before re-init** [G1] |
| `onError` `user_consent_denied` | SDK [G1][G3] | tear down, explain that verification is required to play, back to intro |
| `onError` `permissions_unavailable` / `no_camera` | SDK [G1] | show "allow camera in Settings" help (iOS: Settings → Safari → Camera), retry button |
| `onError` `workflow_abandoned` / `workflow_error` / `exception` / `invalid_token` | SDK [G1] | tear down, generic failure, retry button that calls `initiate` |
| `onError` `geoblocked_request` / `unsupported` | SDK [G1] | non-retryable message |
| webhook → `failed` | backend | "We couldn't verify you" + reason. Retry allowed, but rate-limit retries server-side, since each is a billed check |
| webhook → `review` | backend | "Being reviewed, we'll notify you". Push or email when settled |
| route unmount | React | `useEffect` cleanup calls `handle.tearDown()` and clears the poll timer |

## 5. Bundle size and Lighthouse

- Our bundle: the loader is **14,131 B raw, 4,529 B gzipped** [N1]. With `await import('onfido-sdk-ui')` inside the Begin handler it gets its own chunk, fetched only on tap. `AgeVerifyPage` is already `React.lazy` in `AppRouter.jsx:33`.
- Runtime SDK: fetched from `sdk.onfido.com` only when `init()` runs. The Document Capture module uses WebAssembly (OpenCV) and Motion uses TensorFlow [G4], so expect a download of several MB on the capture screen. **The size was not measured** (CDN unreachable here). Measure it in DevTools on a real phone before deciding how much loading UI is needed.
- Lighthouse 90+: unaffected if the SDK is loaded only on Begin. Lighthouse audits public entry routes, and `/auth/age-verify` sits behind sign-up. To speed up the first frame on that page only, a `<link rel="preconnect" href="https://sdk.onfido.com">` can be rendered by `AgeVerifyPage` itself. Do not add it to `index.html`.

## 6. CSP and `_headers`

**Today `public/_headers` sets no CSP**, so nothing blocks the SDK. If the app adds one (recommended before launch), it must allow Onfido, because the loader injects the SDK into our document and so our CSP governs it.

The current CSP guide (`documentation.onfido.com/sdk/sdk-csp-guide`) was unreachable. The last policy Onfido published in the README itself (v14.23.0, April 2024) was [G4]:

```
default-src 'self' https://assets.onfido.com https://sdk.onfido.com;
script-src 'self' 'unsafe-eval' https://assets.onfido.com https://sentry.io https://*.sardine.ai/;
style-src 'self' 'unsafe-inline' https://assets.onfido.com https://sdk.onfido.com;
font-src 'self' https://sdk.onfido.com;
connect-src 'self' data: blob: *.onfido.com wss://*.onfido.com https://sentry.io;
img-src 'self' data: blob: https://assets.onfido.com/ https://sdk.onfido.com;
media-src blob: https://assets.onfido.com https://sdk.onfido.com;
worker-src 'self' blob:;
object-src 'self' blob:;
frame-src 'self' data: blob: https://*.sardine.ai/;
```

Later changelog entries changed it: `data:` was added to `media-src` (14.32 and 14.34), there were "CSP updates" (14.23.1), and a passkey-module CSP fix (14.52) [G2]. Onfido's own note on `'unsafe-eval'`: npm-bundle customers with a CSP "may not be able to run `WebAssembly` code without the `unsafe-eval` policy". The modules affected are Motion (TensorFlow) and Document Capture (OpenCV) [G4]. The SDK's `script-src 'self'` in our context means our origin, and the loader `import()`s from `sdk.onfido.com`, so that host must be in `script-src` even though the 2024 snippet only listed `assets.onfido.com` (that snippet predates the v14 loader pattern).

Proposed addition to `public/_headers`. Start as **Report-Only**, merge in the hosts the rest of the app uses, and check against the live CSP guide:

```
/*
  Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://sdk.onfido.com https://assets.onfido.com https://*.sardine.ai; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://sdk.onfido.com https://assets.onfido.com; font-src 'self' https://fonts.gstatic.com https://sdk.onfido.com; connect-src 'self' <API origin> <wss API origin> https://*.onfido.com wss://*.onfido.com https://sentry.io <Firebase hosts>; img-src 'self' data: blob: https://sdk.onfido.com https://assets.onfido.com; media-src 'self' data: blob: https://sdk.onfido.com https://assets.onfido.com; worker-src 'self' blob:; frame-src 'self' https://*.sardine.ai; object-src 'none'; base-uri 'self'
```

Notes on that proposal:

- `'wasm-unsafe-eval'` (CSP Level 3) allows WebAssembly compilation without allowing JS `eval`. Onfido's 2024 text asks for `'unsafe-eval'`. **Unverified** whether the current SDK runs with `'wasm-unsafe-eval'` alone. Report-Only mode on a device test will show it: if violations name `eval`, fall back to `'unsafe-eval'`.
- `object-src 'none'` is stricter than Onfido's `'self' blob:`. Revert it if the report shows violations.
- `*.onfido.com` in `connect-src` covers the region API (`api.eu.onfido.com`, from the SDK token's `onfido_api_url` [N1]), `id.onfido.com` (cross-device) and websocket sync. It can be narrowed once the account region is fixed.
- `_headers` on Sevalla's static hosting: the existing file already relies on Netlify-style `_headers`. Confirm that Sevalla applies a `/*` rule to `index.html` (the SPA fallback), not just to real files.
- Keep `/sw.js` `no-cache` (already set) so a CSP or Workbox change reaches installed PWAs promptly.

## Smart Capture Link (alternative, not recommended for now)

Studio workflow runs can also return `link.url`, a "Link to access the Workflow Run without the need to integrate with Onfido's SDKs", with `completed_redirect_url` and `expired_redirect_url` [A1]. That page runs on Onfido's origin, so our CSP and `'unsafe-eval'` stop mattering [G4]. In an installed PWA, though, leaving the app's scope opens an in-app browser sheet on iOS, and getting back into the standalone app from the redirect is awkward (**unverified**, needs a device test). Keep it as the fallback if the embedded SDK fails device testing.

## Open questions

1. **Live CSP guide.** Fetch `documentation.onfido.com/sdk/sdk-csp-guide` (blocked from this session) and reconcile it with the Report-Only policy above. Specifically: does the SDK need `'unsafe-eval'` or is `'wasm-unsafe-eval'` enough?
2. **Data residency for Australia.** Onfido API regions are EU, US and CA only [A1]; there is no Australian region. Is sending AU users' ID images to the EU acceptable under the Privacy Act (APP 8, cross-border disclosure), and does the privacy policy need to name Entrust/Onfido and the region? This decides the region chosen at account creation.
3. **Account setup asks for Onfido/Entrust:** enable the upload fallback; confirm the workflow output can expose the document DOB; confirm the referrer pattern format for `https://playcincin.com/*`; confirm whether made-up applicant names affect the document report's data comparison.
4. **Device test.** Run the pinned SDK version in an installed PWA on a current iPhone (iOS 26) and a mid-range Android: camera permission prompt, deny-then-recover, app backgrounded mid-capture, external links, portrait lock.
5. **Runtime SDK size.** Measure the bytes the SDK downloads from `sdk.onfido.com` on the capture screen over 4G.

## Sources

- **[N1]** npm registry, `onfido-sdk-ui`: `https://registry.npmjs.org/onfido-sdk-ui` (dist-tags `latest: 14.90.0`, release times) and tarball `onfido-sdk-ui-14.90.0.tgz`: `package.json`, `Onfido.js` (loader `init`, CDN URL, `/v4/sdk/analytics`, `/v4/sdk/capture/configuration`), `types/loader.d.ts`, `types/shared/SdkParameters.d.ts`.
- **[G1]** `github.com/onfido/onfido-sdk-ui` `README.md` at `dcaaa6c` (2026-11-11): sections "Importing the library", "Integrating with an NPM package", "Version pinning", "SDK authentication", "Integrating in a webview", "Handling callbacks", "SDK tear-down", "Advanced flow customization", "Manual SDK authentication", "onExternalLink callback", "Cookies", "Supported browsers", "Troubleshooting".
- **[G2]** same repo, `CHANGELOG.md` at `dcaaa6c` (entries 14.90.0 down to 12.x; CSP, iOS, camera, permission and upload-fallback entries).
- **[G3]** same repo, `MIGRATION.md` at `dcaaa6c` ("Onfido web SDK 14.0.0 Migration Guide").
- **[G4]** same repo, `README.md` at tags `14.15.0` and `14.23.0`: "General Content Security Policy (CSP) issues" and "`unsafe-eval` and Content Security Policy (CSP)". These were replaced by a link to the docs site in 14.24.0.
- **[A1]** npm registry, `@onfido/api` 6.3.0 (`github.com/onfido/onfido-node`): `README.md` ("This version uses Onfido API v3.6"), `dist/esm/base.js` (`BASE_PATH`), `dist/esm/configuration.js` (`Region` EU/US/CA), `dist/esm/webhook-event-verifier.js`, `dist/esm/api.d.ts` (`ApplicantBuilder`, `SdkTokenBuilder`, `CheckBuilder`, `CheckResultEnum`, `DocumentProperties`, `WorkflowRun`, `WorkflowRunBuilder`, `WorkflowRunLink`, `WorkflowRunStatus`, `WebhookEventType`, `WebhookEventPayload`).
- **Code:** `cincin_backend@0232bae` `src/services/ageVerifyService.js`, `src/routes/ageVerify.js`, `src/app.js`, `prisma/schema.prisma`, `.env.example`. `cincin_frontend@a0f4350` `src/pages/auth/AgeVerifyPage.jsx`, `src/context/authStore.js`, `src/services/api.js`, `src/AppRouter.jsx`, `vite.config.js`, `public/_headers`, `index.html`.
