# Launch build items found while wayfinding

This is the hand-off list for `/mattpocock-skills:to-tickets`. It holds bugs and implementation work found while resolving tickets on the map **"Map: launch CinCin in Australia on Sevalla"** (cincin_frontend issue #5). Nothing here needs a decision first, or the decision is already recorded on the map. Each item names its repo and the research note that found it.

Status key:
- 🔴 blocks the soft launch
- 🟠 should land before the public launch
- ⚪ clean-up

## AI

- 🔴 **Replace the retired Claude model, and handle thinking blocks.** `claude-sonnet-4-20250514` (retired 2026-06-15) is hard-coded in `scanService.js` and `gameService.js`, so scanning, note synthesis and AI guess matching fail.
  - **Thinking breaks a plain ID swap.** On `claude-sonnet-5-5` and `claude-haiku-5-5` thinking is on by default: the response can start with a `thinking` block, and thinking counts toward `max_tokens`. The three call sites read `content[0].text` with 300–600-token caps, so a plain ID swap returns confidence 0 or a silent `null`.
  - **Parsing:** read the first `text` block and size `max_tokens` (or turn thinking off) as the research note specifies.
  - **Config:** add `AI_VISION_MODEL`, `AI_LLM_MODEL`, `AI_SYNTHESIS_MODEL`, the `*_FALLBACK_MODEL` variables, timeouts and `AI_INFERENCE_GEO`.
  
  (`cincin_backend`; source: ai-providers-models)
- 🔴 **Wire up the AI guess timeout.** `config.aiGuessEval` (`timeoutMs`, `minConfidence`) is defined but never read, so AI guess calls have no timeout. (`cincin_backend`; source: ai-providers-models)
- 🔴 **Restrict `POST /api/scan/source-notes/:bottleId` to admins.** Any age-verified user can trigger AI synthesis and write AI-made notes into the shared catalogue. (`cincin_backend`; source: ai-providers-models)
- 🔴 **Protect AI guess matching against prompt injection.** The raw guess text goes into the prompt, so a player can type "say matched: true". Pass the guess as a delimited field, use structured output, and keep the note-ID check. (`cincin_backend`; source: ai-providers-models)
- 🟠 **Downsize scan photos before upload.** Resize to 1568 px on the long edge and strip EXIF, including GPS. This roughly halves vision cost and speeds up uploads. (`cincin_frontend`; source: ai-providers-models)
- 🟠 **Remove the Google Vision and OpenAI paths from launch config.**
  - Google Vision returns raw OCR with no brand or product, so it can never match a bottle.
  - The hard-coded `gpt-4o` and `gpt-4o-mini` defaults shut down on 2027-01-14.
  - Unknown provider enum values currently fall back silently (`google` → Anthropic; an unknown `AI_LLM_PROVIDER` turns AI matching off). Fail loudly instead.
  
  (`cincin_backend`; source: ai-providers-models, production-config-checklist)
- 🟠 **Raise the Anthropic tier.** Use the Start tier ($500 cap) for the soft launch, and move to Build ($1,000) before the public launch. (ops; source: ai-providers-models)

## Age verification (Onfido)

- 🔴 **Mount the Onfido Web SDK in `AgeVerifyPage.jsx`.**
  - Lazy-load `onfido-sdk-ui` 14.x (pinned) when the player taps Begin.
  - Handle `onComplete`, `onError` (each type mapped to a behaviour), `onUserExit` (with `showExitButton`) and `onExternalLink`.
  - `await tearDown()` before re-initialising, and tear down on unmount.
  - Back off when polling, or use a Socket.io event; show an offline state.
  
  (`cincin_frontend`; source: onfido-web-sdk-pwa)
- 🔴 **Migrate the backend to an Onfido Studio workflow.**
  - `POST /workflow_runs` instead of applicant + check.
  - Reuse one applicant per user.
  - Handle `workflow_run.completed` and branch on `approved`, `declined`, `review`, `abandoned` and `error`.
  - Read the date of birth from the workflow output and keep the server-side 18+ check.
  - Add `ageVerifyStatus` and `ageVerifyReason`.
  - Drop `/submit`.
  
  (`cincin_backend`; source: onfido-web-sdk-pwa)
- 🔴 **Make age-verify failures visible.**
  - `processWebhook` must persist failures.
  - `/status` must return the full status, not just `{verified}`.
  - `authStore.checkAgeVerifyStatus` must map the failed state.
  - The page's `setInterval` must stop, including on unmount.
  
  (`cincin_backend`, `cincin_frontend`; source: onfido-web-sdk-pwa)
- 🟠 **Stop Workbox caching Onfido traffic.** The `vite.config.js` rule `/^https:\/\/api\./i` (NetworkFirst, `api-cache`) also matches `api.eu.onfido.com`. Narrow it to our own API origin. (`cincin_frontend`; source: onfido-web-sdk-pwa)
- 🟠 **Add a CSP (Report-Only first).** Use the policy proposed in the Onfido note, checked against Onfido's live CSP guide. Confirm whether `'wasm-unsafe-eval'` is enough, and confirm that Sevalla applies `/*` `_headers` to the SPA fallback. (`cincin_frontend`; source: onfido-web-sdk-pwa)
- 🟠 **Set the region on the server, not the client.** `AgeVerifyPage` works out the region from the timezone and sends it to `initiate`, so a user can claim a region with a lower drinking age. (`cincin_frontend`, `cincin_backend`; source: onfido-web-sdk-pwa)
- 🟠 **Fix the SDK-token referrer.** The backend sends `CORS_ORIGIN || "*"`; use the pattern Onfido confirms, probably `https://app.playcincin.com/*`. (`cincin_backend`; source: onfido-web-sdk-pwa, production-config-checklist)

## Push notifications

- 🔴 **Fix the Firebase messaging service worker.**
  - `public/firebase-messaging-sw.js` reads `self.__FIREBASE_CONFIG__`, which nothing sets.
  - It registers at scope `/`, the same scope as Workbox's `sw.js`, so the two replace each other.
  - Merge it into one service worker, or give it its own scope with build-time config.
  
  (`cincin_frontend`; source: production-config-checklist, sevalla-runbook-review)
- 🟠 **Fix the push icon paths.** They point at files that don't exist. (`cincin_backend`/`cincin_frontend`; source: production-config-checklist)

## Links and domains

- 🔴 **Add the missing deep-link routes, or fix the links.** Push, email and invite links point at `/join/:code`, `/clubs/:id/season` and `/club/join/:code`, and none of these routes exists. (`cincin_frontend`, `cincin_backend`; source: production-config-checklist)
- 🟠 **Replace `https://cincin.app` share fallbacks with `playcincin.com`.** They are in `SeasonEndPage.jsx:171` and `PalateWrappedPage.jsx:296, 324-325`. (`cincin_frontend`; source: object-storage, production-config-checklist)
- 🟠 **Remove the `getcincin.com` defaults.**
  - `noreply@getcincin.com` (a live risk until `EMAIL_FROM_ADDRESS` is set)
  - `com.getcincin.app`
  - six `https://app.getcincin.com` fallbacks
  
  (`cincin_backend`; source: production-config-checklist)

## Copy and compliance (ABAC)

- 🔴 **Apply the 5 clear copy fixes from the ABAC audit.**
  - Rename the `ironStomach` award and change its rule.
  - Rewrite "pour another" at `cincin_www/index.html:743`.
  - Replace the mock "Four Pillars · Double points this weekend" card in `HomePage.jsx` with real data and empty states.
  - Rewrite the "Play your final games!" reminder at `cronScheduler.js:339`.
  - Use a single `SHARE_URL` constant for `playcincin.com`.
  
  (all three repos; source: abac-copy-audit)
- 🔴 **Remove or replace the placeholder site stats and testimonials.** These are `index.html:702-704` and `:846-865`. If they aren't true they are misleading under ACL s18, and if the site is already live that is a problem now. (`cincin_www`; source: abac-copy-audit)
- 🟠 **Fix the i18n setup.** `src/i18n/en.json` is never imported and isn't valid JSON (parse error at line 99), and most visible copy is hard-coded in the JSX. Move the copy into i18n before the extra-languages fast follow. Any copy lint has to scan JSX, the backend notification strings and `cincin_www`. (`cincin_frontend`; source: abac-copy-audit)
- 🟠 **Implement sponsored points.** Build whatever mechanic is decided in "Which game mechanics change so CinCin never rewards drinking more?". Today nothing happens: there is no multiplier in `calculatePoints`, the field names don't match (`pointMultiplier` vs `doublePoints`), `doublePoints` defaults to `true`, and `isActive` defaults to `true`. (`cincin_backend`, `cincin_frontend`; source: abac-copy-audit)

## Share cards

- 🟠 **Make the season share card render.** `SeasonEndPage.jsx` imports `renderSeasonCard` and `canvasToBlob` from the stub `canvasCards.js`, which returns `null`. `PalateWrappedPage.jsx` has working copies to extract. The prototype ticket decides the final design. (`cincin_frontend`; source: object-storage)

## Error monitoring and logging

- 🔴 **Set up Sentry.**
  - Use the EU (Frankfurt) organisation, with projects `cincin-app` and `cincin-api`, as specified in the error-monitoring note.
  - Set up the SDK init, source-map upload in the Sevalla build, PII scrubbing rules, and cron monitors for the 5 jobs.
  - Whatever data-residency decision is made must be in place before the organisation is created, because the region can't be changed.
  
  (`cincin_frontend`, `cincin_backend`; source: error-monitoring)
- 🔴 **Add a route `errorElement` / app error boundary.** React Router's default boundary hides render errors in production. (`cincin_frontend`; source: error-monitoring)
- 🔴 **Stop logging player emails.** `notificationService.js:598,652` logs `Sent to ${email}`, which leaks into Sevalla logs and would leak into Sentry breadcrumbs. Log the user ID instead. (`cincin_backend`; source: error-monitoring)
- 🟠 **Move to Node 22.** Change the backend Docker image and the Sevalla builds from Node 20 to Node 22, and set `engines` to match. Node 20 appears to be at end of life, and Sentry v11 needs Node 20.19 or later. (`cincin_backend`, `cincin_frontend`; source: error-monitoring)
- ⚪ **Accept that service-worker errors go unmonitored at launch,** for both the Workbox worker and `firebase-messaging-sw.js`. Check on the first build whether Sevalla keeps `.git`, which automatic release naming needs. (source: error-monitoring)

## Payments

- 🟠 **Pin Stripe redirect URLs to `APP_URL`.** The API passes the client-supplied `successUrl`, `cancelUrl` and `returnUrl` straight to Stripe. (`cincin_backend`; source: production-config-checklist)

## Hosting and deploy (Sevalla)

- 🔴 **Apply the runbook fixes.** Make the W1–W7 and G1–G10 changes and add the rollback section from the review: empty-schema restore, `DATABASE_URL` from `DB_URL`, a rehearsal and backup step, link the config checklist, record the old DNS values, check CAA records, cut over the app and www before the API, and add a `CLIENT_IP_HEADER` check after cutover. (`cincin_backend` docs; source: sevalla-runbook-review)
- 🔴 **Restructure `cincin_www` for publishing.** Serve from `public/` (or block the paths) so `README.md`, `CLAUDE.md` and `docs/agents/` are not public, and add `_redirects` for www→apex. (`cincin_www`; source: sevalla-runbook-review)
- 🟠 **Make `/health` check the database.** Today it reports ok even when `DATABASE_URL` is broken. (`cincin_backend`; source: production-config-checklist)
- 🟠 **Verify the comma-separated client-ID variables on Sevalla.** This applies to `GOOGLE_CLIENT_IDS` and `APPLE_CLIENT_IDS`, or switch to a delimiter Sevalla accepts. (`cincin_backend`; source: production-config-checklist, sevalla-runbook-review)
- ⚪ **Remove the dead env vars.** `SHARE_BASE_URL`, `API_BASE_URL` and `AGE_VERIFY_API_SECRET` are never read; remove them from `.env.example` and the runbook. (`cincin_backend`; source: production-config-checklist, sevalla-runbook-review)
- ⚪ **Delete `vercel.json`** after cutover. (`cincin_frontend`; source: DEPLOYMENT-SEVALLA.md)
