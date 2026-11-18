# Production configuration checklist

**Question** ([#6](https://github.com/miczagami/cincin_frontend/issues/6), map [#5](https://github.com/miczagami/cincin_frontend/issues/5)): what does every feature built in Phases 1–5 need configured so that it works in production on Sevalla, with `playcincin.com` as the only domain?

**Code read:** `origin/main` of all three repos on 2026-11-18:

| Repo | Commit |
|---|---|
| `cincin_backend` | `0232bae` |
| `cincin_frontend` | `a0f4350` |
| `cincin_www` | `4a6a4a7` |

I traced every `process.env` and `import.meta.env` read, every config default and every provider call. Paths below are relative to the repo named in each section.

## Answer in brief

1. **Configuration alone will not make every feature work.** Six features have code gaps that no env var fixes (§0). The worst two:
   - **AI is down.** The Anthropic model is hard-coded to `claude-sonnet-4-20250514`, which Anthropic retired on 2026-06-15. Label scanning, note synthesis and AI guess matching all fail on the default provider.
   - **Nobody can pass the age gate.** The PWA never mounts the Onfido SDK and never calls `/age-verify/submit`. Games, scans, bottles and clubs all require age verification.
2. **The backend needs about 25 runtime variables on the Sevalla application.** These are hard requirements:
   - **Refuses to start:** only one, `JWT_SECRET`.
   - **No mock in production:** Stripe, Onfido and SendGrid return 503 or fail, not mock.
   - **Fail silently or near-silently:** missing `CORS_ORIGIN`, `APP_URL`, `CLIENT_IP_HEADER`, `STRIPE_WEBHOOK_SECRET`, `AGE_VERIFY_WEBHOOK_SECRET`, `EMAIL_FROM_ADDRESS` and `FIREBASE_SERVICE_ACCOUNT`.
3. **The PWA needs 9 build variables on the Sevalla static site:** `VITE_API_URL`, `VITE_WS_URL` and seven `VITE_FIREBASE_*`. They are baked in at build time, so every change needs a rebuild. Without `VITE_API_URL` the app calls `/api` on the static host, which answers every path with `index.html` and a 200 status.
4. **The marketing site has no configuration.** It needs DNS, the `/privacy` and `/terms` pages, and a mailbox for `hello@playcincin.com`.
5. **Three `getcincin.com` defaults remain in backend code** (§15):
   - the sender address `noreply@getcincin.com`
   - the APNs bundle ID `com.getcincin.app`
   - six `https://app.getcincin.com` fallbacks
   The PWA also hard-codes `https://cincin.app` as its share link.

Where each setting lives:
- **[App env]:** Sevalla application, Environment variables (runtime, `cincin_backend`).
- **[Build var]:** Sevalla static site, Environment variables (build time, `cincin_frontend`).
- **[Dashboard]:** the provider's dashboard.
- **[DNS]:** Cloudflare DNS, records set to DNS only (grey cloud), as the runbook requires.

"Required" means required for the soft launch.

---

## 0. Launch blockers that configuration cannot fix

Each of these needs a build ticket. The checklist items in later sections are still needed after the fix.

| # | Feature | Gap | Evidence |
|---|---|---|---|
| B1 | AI label scan, note synthesis, AI guess matching | All Anthropic calls use `claude-sonnet-4-20250514`. Anthropic **retired** that model on **2026-06-15** and requests to it fail. The recommended replacement is `claude-sonnet-5-5`. The OpenAI path uses `gpt-4o` and `gpt-4o-mini`; third-party reports put their API shutdown at 2027-01-14, which I could not confirm on OpenAI's own page. The model ID is not configurable. | `src/services/scanService.js` (`callAnthropicVision`, `callAnthropicLLM`), `src/services/gameService.js` (`evaluateGuessWithAI`). [Anthropic model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations) |
| B2 | Age verification (Onfido) | `AgeVerifyPage.jsx` calls `/initiate`, then only polls `/status`. A comment says "In production: mount Onfido/Jumio SDK widget". The page never loads the Onfido Web SDK and never calls `POST /api/auth/age-verify/submit`, so no Onfido check is ever created. The `ageVerified` gate is enforced on `/api/games`, `/api/scan`, `/api/bottles`, `/api/clubs` and on the Socket.io handshake. | frontend `src/pages/auth/AgeVerifyPage.jsx`. backend `src/routes/{games,scan,bottles,cellarClubs}.js`, `src/config/socketServer.js` |
| B3 | Google / Apple sign-in | The PWA sends the literal tokens `'PLACEHOLDER'` (login) and `'PLACEHOLDER_TOKEN'` (signup). It loads no Google Identity Services or Sign in with Apple JS. The backend verifies real ID tokens, so the buttons always fail with a 401, or a 503 while the client IDs are empty. | frontend `src/pages/auth/LoginPage.jsx`, `SignUpPage.jsx`. backend `src/services/socialAuthService.js` |
| B4 | Web push in the background | The service worker reads `self.__FIREBASE_CONFIG__`, which nothing sets, so it always starts with placeholder values (`"YOUR_FIREBASE_API_KEY"` and so on). It is also registered at scope `/`, the same scope as the vite-plugin-pwa Workbox worker (`registerType: 'autoUpdate'`). Only one service worker can control a scope, so offline caching and FCM will replace each other. | frontend `public/firebase-messaging-sw.js`, `src/services/pushService.js` (`registerServiceWorker`), `vite.config.js` |
| B5 | Links in pushes, emails and invites | Several links point to routes the router lacks, so they fall through to `*` (the splash page):<ul><li>backend push links `/join/:code`: the router has `/game/join`</li><li>`/clubs/:id/season`: the router has `/clubs/:id/season-end`</li><li>the club invite `${APP_URL}/club/join/:code`: no route</li></ul>The web-push `icon` and `badge` paths (`/icons/icon-192x192.png`, `/icons/badge-72x72.png`) do not exist. The real files are `/icon-192.png` and `/badge-72.png`. | backend `src/services/notificationService.js` (`buildDeepLink`, `sendFCM`), `src/services/cellarClubService.js:65`. frontend `src/AppRouter.jsx`, `public/` |
| B6 | Sharing | Season and Palate Wrapped sharing hard-codes `https://cincin.app`, which is not our domain. | frontend `src/pages/clubs/SeasonEndPage.jsx:171`, `src/pages/palate/PalateWrappedPage.jsx:296,324-325` |

Two more issues are not blockers, but production depends on them:
- **The seed is the only source of reference data.** No migration inserts the flavour taxonomy (`FlavourNode`) or a bottle catalogue; only `prisma/seed.js` creates them.
  - The seed also creates four test users with a known password, one of them on PRO, so it **must not** run in production as is.
  - On an empty catalogue, scans never match a bottle (`matchBottle` searches the database), and taxonomy-based guess matching has nothing to match against.
  - Open question Q1.
- **`/health` does not check the database.** It returns `ok` with or without a working `DATABASE_URL`, and it is the Sevalla readiness and liveness probe (`src/app.js`).

---

## 1. API core (`cincin_backend`)

The Dockerfile sets `NODE_ENV=production` and `PORT=8080` (`Dockerfile`). Sevalla sets `PORT` itself.

| Setting | Where | Req. | If missing in production | How to verify |
|---|---|---|---|---|
| `NODE_ENV=production` | Dockerfile. Do not override it in [App env]. | Yes | Set by the image. If overridden, Stripe and Onfido mocks switch on (`subscriptionService.getStripe`, `ageVerifyService.getProvider`), and `/age-verify/manual` opens. | The boot banner in the logs shows `Environment: production`. |
| `JWT_SECRET` | [App env] | Yes | **The API refuses to start** (`src/config/index.js` throws). Keep the Railway value, or every user is logged out (runbook). | The API boots, and logging in on the app works. |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | [App env] | No | Default to `1h` and `7d`. | – |
| `DATABASE_URL` | [App env], built from the Sevalla internal connection variables (runbook step 2.3) | Yes | Boot succeeds and `/health` says ok, but **every DB query throws**. | `POST /api/auth/login` returns 401 for a bad password, not a 500. The pre-deploy job log shows "No pending migrations". |
| Pre-deploy job `npx prisma migrate deploy` | Sevalla app, Processes, Job, Before deployment | Yes | The schema drifts and new columns are missing (the `20261019*` migrations are the latest). | Read the job log on each deploy. |
| Reference data (taxonomy, bottles) | One-off load (Q1) | Yes | Scans never match, and guesses match exact notes only. | `GET /api/scan/taxonomy` returns a non-empty tree. |

## 2. URLs, CORS and networking

| Setting | Where | Req. | If missing in production | How to verify |
|---|---|---|---|---|
| `CORS_ORIGIN=https://app.playcincin.com` | [App env] | Yes | The default is `http://localhost:3000`, so **every browser request and the Socket.io handshake fail CORS**. It is also sent to Onfido as the SDK-token `referrer` (§5). A comma-separated list works in code, but Sevalla breaks on commas (runbook), so keep it to one origin. | DevTools on the app shows no CORS errors. A preflight returns `Access-Control-Allow-Origin: https://app.playcincin.com`. |
| `APP_URL=https://app.playcincin.com` | [App env] | Yes | The default is `http://localhost:3000`. It is used in: <ul><li>verify-email and reset-password links</li><li>club invite links</li><li>Stripe success, cancel and portal-return defaults</li><li>email footer links</li><li>push `fcmOptions.link`</li></ul>FCM requires HTTPS for web-push links, so an `http://localhost` link is expected to be rejected (FCM v1 API reference; not tested here). The `https://app.getcincin.com` fallbacks in `notificationService.js` are dead code, because `config.appUrl` always has a default. | Sign up, then check that the email link opens `https://app.playcincin.com/auth/verify-email?token=…`. |
| `CLIENT_IP_HEADER=cf-connecting-ip` | [App env] | Yes | Every request appears to come from Sevalla's proxy IP, so **all users share one limit of 20 auth attempts per 15 minutes** (and 100 API requests). That means a global lockout within minutes. | Send 21 bad logins from one machine; a second machine can still log in. |
| `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX` | [App env] | No | Default to 100 and 20 per IP per 15 minutes. See Q4 on venues where many players share one IP. | – |
| `SHARE_BASE_URL`, `API_BASE_URL` | [App env] | No | **Never read by code.** `SHARE_BASE_URL` sits in `config.shareBaseUrl` with no consumer, and `API_BASE_URL` is not read at all. Setting them, as the runbook says, is harmless. | – |
| Webhook paths skip rate limits | Code | – | `/api/subscription/webhook` and `/api/auth/age-verify/webhook` are exempt from rate limits and receive the raw body (`src/app.js`). | – |

## 3. Redis (optional)

| Setting | Where | Req. | If missing | How to verify |
|---|---|---|---|---|
| `REDIS_URL` | [App env] (Sevalla internal connection) | No | Logs `[Redis] REDIS_URL not set — running without Redis cache`, and caching is skipped. Live game state is in memory anyway, which is why there is one instance (runbook "Why one instance"). | `/health` reports `redis: connected` or `redis: disconnected`. |

## 4. AI: label scan, note synthesis, guess evaluation

Provider routing (`src/services/scanService.js`, `src/services/gameService.js`):

- **Vision:** `AI_VISION_PROVIDER` accepts `anthropic` (the default), `openai` or **`google_vision`**.
  - `.env.example` documents the value as `google`. The code does not recognise `google` and **silently falls through to Anthropic**.
- **Text** (note synthesis): `AI_LLM_PROVIDER`, else `AI_VISION_PROVIDER`, else `anthropic`.
- **Guess evaluation:** `AI_LLM_PROVIDER`, else `anthropic`. It only runs if `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is set.
- **Undocumented alias:** `AI_SERVICE_API_KEY` is accepted in place of `ANTHROPIC_API_KEY` for scanning and synthesis.

| Setting | Where | Req. | If missing / wrong | How to verify |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | [App env]. Anthropic Console, production workspace key. | Yes (default provider) | <ul><li>Scan returns **503** "Anthropic API key not configured".</li><li>Synthesis returns `[]`, logged with `console.error`.</li><li>Guess evaluation silently falls back to exact and taxonomy matching only.</li></ul>**Even with a key, the hard-coded model is retired (B1):** scans return 502, synthesis returns `[]` and guess evaluation returns `null`. | Scan a real label. The response has a `bottle` or `alternatives`, and there is no 502 in the logs. |
| `AI_VISION_PROVIDER`, `AI_LLM_PROVIDER` | [App env] | No | Default to `anthropic`. Use `google_vision`, not `google`. | The API log shows the provider error, if any. |
| `OPENAI_API_KEY` | [App env] | Only when using OpenAI | 503 when OpenAI is selected. If the guess provider is `anthropic` and only the OpenAI key is set, the Anthropic client gets an undefined key, the error is caught, and matching stays silently non-AI. | – |
| `GOOGLE_VISION_API_KEY` | [App env]. Google Cloud: Vision API enabled, key restricted to that API. | Only with `google_vision` | 503. Google Vision returns raw OCR, not the brand and product JSON, so `matchBottle` gets no `product` or `brand` (Q3). | – |
| Billing and usage limits | [Dashboard] (Anthropic Console / OpenAI) | Yes | Requests fail with 429 or 402 once credit runs out. The scan is not counted against the free tier on failure (`incrementScanCount` runs after the vision call). | The Console usage page shows production traffic. |

## 5. Age verification (Onfido)

Flow (`src/services/ageVerifyService.js`):
1. `POST /api/auth/age-verify/initiate` creates an applicant and an SDK token. The token's `referrer` is `CORS_ORIGIN`.
2. The client runs the Onfido SDK (**not built, B2**).
3. `POST /api/auth/age-verify/submit` creates a `document` check.
4. Onfido sends the `check.completed` webhook. The API ignores the body except as a trigger: it **re-fetches** the check and its reports, and reads the date of birth from the document report.

| Setting | Where | Req. | If missing / wrong | How to verify |
|---|---|---|---|---|
| `AGE_VERIFY_PROVIDER=onfido` | [App env] | Yes, set it explicitly | The code defaults to `onfido` (`config/index.js`), but `.env.example` says `mock`; copying the example gives `mock`. In production `mock` returns **503** "Mock age verification is disabled in production". `jumio` returns 501. | `POST /initiate` returns `provider: "onfido"` and an `sdkToken`. |
| `AGE_VERIFY_API_KEY` | [App env]. Onfido Dashboard, API tokens: a **live** token, not a sandbox token. | Yes | **503** "Onfido API key not configured". A sandbox token returns simulated results in production. | `/initiate` succeeds, and the applicant appears in the Onfido Dashboard (live). |
| `AGE_VERIFY_API_BASE` | [App env] | Yes, if the account is not in the EU | Defaults to `https://api.eu.onfido.com/v3.6`. It must match the region the Onfido account lives in (EU, US or CA); a mismatched region rejects the token. Confirm with Onfido that API v3.6 is still supported. | – |
| `AGE_VERIFY_WEBHOOK_SECRET` | [App env]. This is the webhook token Onfido shows when you create the webhook. | Yes | Every webhook gets a **403**, so **no user is ever verified**. Silent from the player's side: they poll forever. | Onfido Dashboard, Webhooks: delivery shows 200. |
| Webhook endpoint | [Dashboard]. Onfido webhooks: URL `https://api.playcincin.com/api/auth/age-verify/webhook`, event `check.completed`, live environment. | Yes | Users stay unverified. | Complete a live check and confirm that `ageVerified` flips. |
| SDK-token referrer | Comes from `CORS_ORIGIN` | Yes | The API sends `https://app.playcincin.com` with no path wildcard. Onfido treats the referrer as a URL **pattern** (its examples use `https://*.example.com/*`), so an exact origin may not match `/auth/age-verify`. This is unverified; test it when B2 is built (Q2). | The SDK loads on `https://app.playcincin.com/auth/age-verify` without a referrer error. |
| `AGE_VERIFY_API_SECRET` | – | No | **Never read by code.** It can be left out. | – |
| Minimum age per region | Code (`DRINKING_AGE`: AU 18) | – | – | – |

## 6. Payments (Stripe)

Endpoints:
- Checkout: `POST /api/subscription/checkout`. It requires a verified email and creates a Stripe customer and a Checkout Session in `subscription` mode, with a 7-day trial if the player is eligible.
- Portal: `POST /api/subscription/portal`.
- Webhook: `POST /api/subscription/webhook`.

The client sends its own `successUrl`, `cancelUrl` and `returnUrl` (`window.location.origin/...`), and the API passes them to Stripe **unchecked** (Q5). Mock mode is impossible in production: without a key, `getStripe()` throws a 503.

| Setting | Where | Req. | If missing / wrong | How to verify |
|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | [App env]. A Stripe **live** secret key, or a restricted key with Customers, Checkout Sessions, Subscriptions and Billing Portal write access. | Yes, if payments are on at soft launch (see the map's "Payments go-live") | Checkout and portal return **503** "Payments are not configured", and the webhook returns 503. The boot banner shows `Stripe: mock mode` (misleading in production). | The boot banner shows `Stripe: configured`. |
| `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID` | [App env]. Stripe live: product "CinCin Pro", two **recurring AUD** prices. Code comments: AUD 12.99 per month; AUD 9.99 per month billed annually, i.e. AUD 119.88 per year. | Yes | **500** "Stripe price not configured for this plan". A test-mode price ID with a live key fails with "No such price". GST treatment is decided by the payments ticket. | Start a checkout for each plan; the Checkout page shows the right AUD amount. |
| `STRIPE_WEBHOOK_SECRET` | [App env]. The `whsec_…` signing secret of the **live** endpoint. | Yes | Webhook **503**, with a console error. **The player is charged but stays on FREE**, because the tier only changes in webhook handlers. | Stripe Dashboard, Webhooks, the endpoint, "Send test event": the endpoint returns 2xx (runbook step 6). |
| Webhook endpoint | [Dashboard]. URL `https://api.playcincin.com/api/subscription/webhook`. Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. | Yes | Any other event is logged as "Unhandled webhook event" and acknowledged. | A live test purchase flips `subscriptionTier` to PRO. A cancel in the portal sets it to cancel at period end. |
| Customer portal configuration | [Dashboard]. Settings, Billing, Customer portal: save the **live-mode** default configuration (cancel, payment method update). | Yes | `billingPortal.sessions.create` fails without a saved live default configuration (Stripe behaviour, from memory; not re-fetched). | "Manage subscription" in the app opens the Stripe portal. |
| Stripe API version | Code pins `2024-12-18.acacia` in `getStripe()`. The webhook route builds a client without a pinned version. | – | Set the endpoint's API version to match, or accept the account default. Signature checks are not affected. | – |
| Business details, AUD payouts, statement descriptor, tax settings | [Dashboard] | Yes for live mode | Live mode cannot be activated without them. | – |

## 7. Email (SendGrid)

There are two paths (`src/services/notificationService.js`):
- **Account emails** (`sendAccountEmail`): verify email and reset password. Click tracking is off.
- **Notification emails** (`sendEmailNotification`) for six types: `payment_failed`, `season_ended`, `club_membership_reduced`, `monthly_palate_wrapped`, `quarterly_summary`, `season_end_report`. Click and open tracking are **on**.

The console "mock" only applies outside production.

| Setting | Where | Req. | If missing / wrong | How to verify |
|---|---|---|---|---|
| `SENDGRID_API_KEY` | [App env]. SendGrid API key with Mail Send permission. | Yes | Production does not mock:<ul><li>**Signup** succeeds, but no verification email is sent (only a console error).</li><li>**Resend verification** returns **502** to the user.</li><li>**Password reset** tells the user "if that email exists…" and silently sends nothing.</li><li>**Notification emails** return `false` and are only logged.</li></ul>Paid checkout needs a verified email, so payments are blocked too. | Sign up with a real inbox; the email arrives. SendGrid Activity shows "Delivered". |
| `EMAIL_FROM_ADDRESS=noreply@playcincin.com` | [App env] | Yes | **Defaults to `noreply@getcincin.com`** (`config/index.js:138`, `.env.example:62`). SendGrid rejects a From address that has no verified sender identity or authenticated domain, so **every email fails**. | As above. The "From" header shows `@playcincin.com`. |
| `EMAIL_FROM_NAME` | [App env] | No | Defaults to `CinCin`. | – |
| Domain authentication for `playcincin.com` | [Dashboard] SendGrid, Settings, Sender Authentication, Authenticate a domain. [DNS] the 3 CNAMEs SendGrid generates (`emNNNN`, `s1._domainkey`, `s2._domainkey`), set to DNS only. | Yes | Without it, sends are rejected, or land in spam once a single-sender verification is used instead. | The SendGrid domain shows "Verified". Gmail "Show original" shows `DKIM: PASS` and `SPF: PASS`. |
| Link branding | [Dashboard] + [DNS] (CNAMEs SendGrid generates) | Recommended | Notification emails rewrite links through SendGrid's shared tracking domain, which hurts deliverability and looks phishy. | Links in a notification email point to a `playcincin.com` subdomain. |
| DMARC | [DNS] TXT `_dmarc.playcincin.com`, for example `v=DMARC1; p=none; rua=…` | Recommended | Gmail and Yahoo bulk-sender rules expect DMARC. | `dig TXT _dmarc.playcincin.com` |
| Dynamic templates `SG_TEMPLATE_PAYMENT_FAILED`, `SG_TEMPLATE_SEASON_ENDED`, `SG_TEMPLATE_MEMBERSHIP_REDUCED`, `SG_TEMPLATE_MONTHLY_WRAPPED`, `SG_TEMPLATE_QUARTERLY_SUMMARY`, `SG_TEMPLATE_SEASON_END_REPORT` | [App env] (`d-…` IDs). [Dashboard] SendGrid, Email API, Dynamic Templates. | **No** | If unset, the built-in inline HTML is used (`buildEmailHtml`). If set, the template replaces the HTML and text entirely. It receives `subject`, `title`, `body`, `appUrl`, `deepLink`, `year` and every key of `data` flattened to strings, and its subject must use `{{subject}}`. Account emails never use templates. | Trigger each type in staging and inspect the rendered email. |
| Apple private relay | [Dashboard] Apple Developer, Sign in with Apple for Email Communication: register `playcincin.com` / `noreply@playcincin.com`. | Yes once Apple sign-in ships | Mail to `@privaterelay.appleid.com` addresses bounces. | Send to an Apple relay address. |

## 8. Web push (Firebase Cloud Messaging)

The PWA registers its FCM token as `platform: "web"` (iOS home-screen PWA) or `"android"`. Both are sent through FCM (`pushService.detectPlatform`, `notificationService.sendPushNotification`). The in-app notification row is always created, whatever happens to push.

| Setting | Where | Req. | If missing / wrong | How to verify |
|---|---|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | [App env]. Firebase Console, Project settings, Service accounts, Generate new private key. Paste the JSON **base64-encoded** (runbook). | Yes | Mocked only when `NODE_ENV=development`. In production each send throws "FCM not configured", logged per token, so **push silently never arrives**. | Log line `[FCM] Firebase Admin SDK initialised`, then `[FCM] Sent to … messageId`. |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | [Build var]. Firebase Console, Project settings, Your apps, Web app config. **The same project** as the service account. | Yes | The page falls back to placeholders (`"YOUR_FIREBASE_API_KEY"`…). `getToken` fails, the error is logged, and push is silently unavailable. The service worker always uses placeholders (B4). | Allow notifications in the app; `POST /api/notifications/push-token` fires, and a `PushToken` row exists. |
| `VITE_FIREBASE_VAPID_KEY` | [Build var]. Firebase Console, Cloud Messaging, Web Push certificates, key pair (public key). | Yes | Placeholder `"YOUR_VAPID_KEY"`, so `getToken` fails. | As above. |
| Firebase Cloud Messaging API (V1) enabled | [Dashboard] Google Cloud console for the Firebase project | Yes | Sends fail with a permission error. | A test send from the API succeeds. |
| Browser API key restriction | [Dashboard] Google Cloud, Credentials: restrict the web key to the HTTP referrer `https://app.playcincin.com/*`. | Recommended | Without it, the key works from anywhere. If it is restricted *without* the app origin, token registration breaks. | – |
| iOS | Product decision | – | Push only works after "Add to Home Screen", on iOS 16.4 and later (map: "Not yet specified"). | Test on an installed iOS PWA. |

## 9. APNs (native iOS): not needed at launch

The `APNS_KEY_PATH`, `APNS_KEY_ID`, `APNS_TEAM_ID` and `APNS_BUNDLE_ID` settings are used only for tokens with `platform: "ios"`, which only a native app would register. The PWA never does. Leave them unset. `APNS_BUNDLE_ID` **defaults to `com.getcincin.app`** (`config/index.js:150`, `notificationService.js:391`, `.env.example:78`). That must become a `playcincin` bundle ID before the native apps ship.

## 10. Social sign-in (Google / Apple)

The backend verifies the provider ID token's signature, issuer and **audience** against the configured client IDs (`socialAuthService.js`). The PWA side is not built (B3). Configure these when it is.

| Setting | Where | Req. | If missing | How to verify |
|---|---|---|---|---|
| `GOOGLE_CLIENT_IDS` | [App env]: the OAuth 2.0 **Web** client ID, plus iOS/Android client IDs later. **Comma-separated, which Sevalla breaks on** (see Q6). | When B3 ships | 503 "GOOGLE sign-in is not configured". | Google sign-in on the app returns tokens. |
| Google OAuth client | [Dashboard] Google Cloud, Credentials, Web client: **Authorised JavaScript origins** `https://app.playcincin.com`. If a redirect flow is used, also add an authorised redirect URI on `app.playcincin.com`. OAuth consent screen: authorised domain `playcincin.com`, app home page, **privacy policy and terms URLs** (`https://playcincin.com/privacy`, `/terms`, which do not exist yet). Publishing status: In production. | When B3 ships | "origin_mismatch" or "Access blocked". Consent-screen review needs the legal pages. | – |
| `APPLE_CLIENT_IDS` | [App env]: the **Services ID** for web, plus the bundle ID later for native. | When B3 ships | 503 "APPLE sign-in is not configured". | – |
| Apple Services ID | [Dashboard] Apple Developer, Identifiers, Services IDs, Sign in with Apple. Domains: `app.playcincin.com`. Return URLs: the PWA callback URL. | When B3 ships | Apple shows "invalid_client" or "invalid redirect_uri". | – |

## 11. Scheduled jobs

| Setting | Where | Req. | Notes |
|---|---|---|---|
| `CRON_ENABLED` | [App env] | No (defaults on) | In-process `node-cron` (`src/jobs/cronScheduler.js`):<ul><li>Expired seasons: hourly.</li><li>Monthly Wrapped: `0 6 1 * *`.</li><li>Quarterly summary: `0 7 1 1,4,7,10 *`.</li><li>Weekly standings: Mon `0 9 * * 1`.</li><li>Season-ending reminders: `0 10 * * *`.</li></ul>**No timezone is set, so the jobs run on the container clock (UTC).** "Monday 09:00" fires at 19:00 or 20:00 in Sydney (Q7). Keep one instance, or jobs run once per instance (runbook). |

## 12. PWA static site (`cincin_frontend`)

| Setting | Where | Req. | If missing | How to verify |
|---|---|---|---|---|
| `VITE_API_URL=https://api.playcincin.com` (no trailing `/api`) | [Build var] | Yes | The axios base becomes `/api` on `app.playcincin.com`. `public/_redirects` (`/* /index.html 200`) answers it with **HTML and a 200 status**, so the app breaks in confusing ways rather than with clear errors. | DevTools Network: API calls go to `api.playcincin.com`. |
| `VITE_WS_URL=https://api.playcincin.com` | [Build var] | Yes | Socket.io connects to the app origin, so multi-device games never connect. | The `socket.io` request upgrades with status 101 (runbook step 6). |
| `VITE_FIREBASE_*` (7 values) | [Build var] | Yes | §8. | §8 |
| Build command `npm run build`, Node 20, publish dir `dist` | Sevalla static site settings | Yes | – | Deep link reload works (runbook step 3.4). |
| `public/_redirects`, `public/_headers` | Repo | Yes | SPA fallback and cache rules (service worker, manifest and `firebase-messaging-sw.js` set to no-cache). | Reloading `/profile` loads the app. |
| `vercel.json` | Repo | No | Unused on Sevalla. Delete it after cut-over (runbook step 7). | – |
| Dev-only UI | Code | – | The `[Dev] Skip verification` button is gated by `import.meta.env.DEV`, so production builds drop it. The backend `/age-verify/manual` returns 403 in production. | The production bundle has no "[Dev]" button. |

Build variables are baked into the bundle, so **changing any of them requires a redeploy**.

## 13. Marketing site (`cincin_www`)

There are no env vars and no build step. What it needs:
- **Domains:** `playcincin.com` and `www.playcincin.com` on the Sevalla static site.
- **Links:** CTAs point to `https://app.playcincin.com/auth/signup` and `/auth/login`.
- **`/privacy` and `/terms`:** the footer links and `sitemap.xml` reference them, but **they 404 today** (README "Footer links"; the map drafts them). Google's OAuth consent screen needs them too (§10).
- **`hello@playcincin.com`:** used in the structured data and the Contact link. It needs a mailbox, so MX records and an inbox or forwarding (Q8).
- **README placeholders:** stats and testimonials are placeholders.

## 14. DNS (Cloudflare, all DNS only)

| Record | Purpose | Source |
|---|---|---|
| `api`, `app`, `@`, `www`: records Sevalla shows when you add each domain | Hosting | runbook step 6 |
| `_acme-challenge.*`: keep them | Sevalla certificate renewal | runbook step 6 |
| SendGrid `emNNNN`, `s1._domainkey`, `s2._domainkey` CNAMEs, plus link-branding CNAMEs | Email authentication | §7 |
| `_dmarc` TXT | Deliverability | §7 |
| MX (+ SPF for the mailbox provider) | `hello@playcincin.com`, and replies to `noreply@` | Q8 |

There is no Onfido, Stripe or Firebase DNS record. Apple's Sign in with Apple email relay needs SPF to pass for the sending domain (§7).

## 15. Every `getcincin.com` (and wrong-domain) default

| Location | Value | Effect in production |
|---|---|---|
| backend `src/config/index.js:138`, `.env.example:62` | `noreply@getcincin.com` | **Live risk.** Used unless `EMAIL_FROM_ADDRESS` is set, and all email then fails or is spoof-flagged. |
| backend `src/services/notificationService.js:558, 627` | `noreply@getcincin.com` fallback | Dead code (the config always has a value), but it should go. |
| backend `src/config/index.js:150`, `.env.example:78`, `notificationService.js:72, 391` | `com.getcincin.app` | Only matters once a native iOS app exists. |
| backend `src/services/notificationService.js:457, 587, 701, 800, 802` | `https://app.getcincin.com` | Dead code (`config.appUrl` defaults to localhost). Replace with `playcincin.com`, or drop it. |
| backend `documentation/backendPHASE2-CHANGELOG.md:118` | `https://app.getcincin.com/game/results/shared/{token}` | Docs only. |
| frontend `documentation/LANDING-PAGE-INTEGRATION-GUIDE.md:5, 176, 181`, `documentation/PRIORITY6-CHANGELOG.md:237` | `getcincin.com`, `staging.getcincin.com` | Docs only. |
| frontend `src/pages/clubs/SeasonEndPage.jsx:171`, `src/pages/palate/PalateWrappedPage.jsx:296, 324-325` | `https://cincin.app` | **Live:** shared links go to a domain we do not own. |
| `cincin_www` | – | Clean: all links use `playcincin.com`. |

## 16. What falls back silently, and what fails loudly (with `NODE_ENV=production`)

| Behaviour | Settings |
|---|---|
| **Refuses to start** | `JWT_SECRET` |
| **Returns 5xx to the user** | <ul><li>Stripe key: 503</li><li>price IDs: 500</li><li>Onfido key, or provider `mock`: 503</li><li>AI key: 503</li><li>retired Anthropic model: 502</li><li>social client IDs: 503</li><li>resend verification without SendGrid: 502</li></ul> |
| **Silent or log-only** | <ul><li>`CORS_ORIGIN`: browser blocked</li><li>`APP_URL`: localhost links</li><li>`CLIENT_IP_HEADER`: shared rate limit</li><li>`STRIPE_WEBHOOK_SECRET`: paid but not upgraded</li><li>`AGE_VERIFY_WEBHOOK_SECRET`: never verified</li><li>`SENDGRID_API_KEY` or `EMAIL_FROM_ADDRESS`: no emails</li><li>`FIREBASE_SERVICE_ACCOUNT` or `VITE_FIREBASE_*`: no push</li><li>`AI_VISION_PROVIDER=google`: actually uses Anthropic</li><li>AI guess evaluation: falls back to exact matching</li><li>`VITE_API_URL` / `VITE_WS_URL`: HTML instead of JSON, no sockets</li><li>`DATABASE_URL`: `/health` still ok</li></ul> |
| **Optional** | `REDIS_URL`, `SG_TEMPLATE_*`, `APNS_*`, `RATE_LIMIT_*`, `JWT_*_EXPIRES_IN`, `CRON_ENABLED`, `EMAIL_FROM_NAME` |
| **Dead** (set or not, no effect) | `SHARE_BASE_URL`, `API_BASE_URL`, `AGE_VERIFY_API_SECRET` |
| **Never mock in production** | Stripe (`getStripe` throws), Onfido (`getProvider` throws), account email (logs only outside production) |
| **Mock only when `NODE_ENV=development`** (not `test` or anything else) | FCM, APNs, notification email |

## 17. Post-configuration smoke test (production, in order)

1. `curl https://api.playcincin.com/health` returns `status: ok`. The logs show `Environment: production` and `Stripe: configured`.
2. Sign up on `https://app.playcincin.com`:
   - There are no CORS errors.
   - The verification email arrives from `noreply@playcincin.com` with DKIM passing.
   - Its link opens `app.playcincin.com/auth/verify-email` and verifies the account.
3. Forgot password: the email arrives and the link resets the password.
4. Age verification with a real ID (after B2): the Onfido webhook is delivered with a 200, and the user becomes `ageVerified`.
5. Scan a known label (after B1 and Q1): a bottle matches. Play a solo game, and AI matching accepts a synonym.
6. Multi-device game from two devices: the socket upgrades with status 101, and both see rounds.
7. Rate-limit header check:
   - Two devices on different networks get independent `RateLimit-Remaining` values.
   - Send 21 bad logins from one IP; the 21st returns 429, and the other device still logs in.
8. Upgrade with a live card (or a test clock in a staging copy):
   - The Stripe webhook returns 2xx and the tier becomes PRO.
   - The portal opens.
   - Cancel is scheduled at period end.
   - Refund afterwards.
9. Enable push on Android Chrome and on an installed iOS PWA:
   - A `PushToken` row exists.
   - Trigger a club event and the push arrives with the app in the background. Tapping it opens the right route (after B4 and B5).
10. Wait for, or trigger, the hourly expired-season job; the log shows `[Cron] Checking for expired seasons...`.
11. `playcincin.com` and `www` load. "Get started" reaches the app. `/privacy` and `/terms` load.

## Open questions

- **Q1. Production reference data:** how do the flavour taxonomy and bottle catalogue get into the production database without the seed's test users (`host@test.com` etc. with a known password and PRO)? Does the Railway database already hold real data?
- **Q2. Onfido integration:** which Onfido SDK or flow (Web SDK vs. Studio workflow), which referrer pattern, and which account region? Build ticket for B2.
- **Q3. Vision provider for launch:** does the launch vision provider stay Anthropic (after the model fix), or move to OpenAI or Google Vision? The Google Vision path returns no `brand` or `product`, so it cannot identify bottles as written.
- **Q4. Rate limits at venues:** 100 requests and 20 auth attempts per 15 minutes per IP may lock out a group playing on one venue Wi-Fi. Should the limits be per user rather than per IP for authenticated routes?
- **Q5. Redirect URLs:** should the API ignore client-supplied Stripe `successUrl`, `cancelUrl` and `returnUrl`, or check them against `APP_URL`? As written, any authenticated caller can make Stripe redirect to any site after checkout.
- **Q6. Comma-separated values on Sevalla:** `GOOGLE_CLIENT_IDS` and `APPLE_CLIENT_IDS` are comma-separated by design, and the runbook says Sevalla breaks on unescaped commas. Is that fine while there is one web client ID each, and what happens when native apps add a second?
- **Q7. Cron timezone:** should scheduled jobs run on Australian time (node-cron `timezone` option, or `TZ`)?
- **Q8. Mailboxes:** which provider hosts `hello@playcincin.com`, and should replies to `noreply@` bounce or reach support? This ties into the "Support and data-deletion requests" item on the map.

## Sources

- Code at the commits above:
  - backend: `src/config/index.js`, `src/app.js`, `src/server.js`, `src/config/{redis,socketServer,database}.js`, `src/services/{scan,game,ageVerify,subscription,notification,socialAuth,auth,cellarClub}Service.js`, `src/routes/{subscription,ageVerify}.js`, `src/jobs/cronScheduler.js`, `prisma/seed.js`, `prisma/migrations/`, `Dockerfile`, `.env.example`, `documentation/DEPLOYMENT-SEVALLA.md`
  - frontend: `.env.example`, `src/services/{api,socketService,pushService}.js`, `public/firebase-messaging-sw.js`, `public/_redirects`, `public/_headers`, `vite.config.js`, `src/AppRouter.jsx`, `src/pages/auth/{AgeVerifyPage,LoginPage,SignUpPage}.jsx`, `src/context/subscriptionStore.js`
  - www: `index.html`, `README.md`, `sitemap.xml`
- Anthropic, [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations): `claude-sonnet-4-20250514` deprecated 2026-04-14 and retired 2026-06-15; replacement `claude-sonnet-5-5`. Fetched 2026-11-18.
- OpenAI `gpt-4o` and `gpt-4o-mini` API shutdown on 2027-01-14: third-party reports only ([SessionWatcher](https://sessionwatcher.com/news/openai-api-gpt-4o-gpt-4-1-shutdown-january-14-2027), [The New Stack](https://thenewstack.io/openai-gpt4o-api-shutdown)). OpenAI's [deprecations page](https://developers.openai.com/api/docs/deprecations/index.html) was not reachable from this session; confirm the date there.
- Stripe (portal default configuration, live and test separation), SendGrid (domain authentication CNAMEs, sender identity), Onfido (webhook token, `X-SHA2-Signature`, regions, referrer pattern), Firebase (VAPID, FCM v1 HTTPS link requirement) and Google/Apple (origins, Services ID): these come from provider documentation as I already know it. Their sites were not reachable from this session, so check the items marked unverified against the live docs before relying on them.
