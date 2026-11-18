# Sevalla runbook review: API, app and www

Ticket: [#10](https://github.com/miczagami/cincin_frontend/issues/10). Map: [#5](https://github.com/miczagami/cincin_frontend/issues/5).
Reviewed 2026-11-18: `cincin_backend/documentation/DEPLOYMENT-SEVALLA.md` at `cincin_backend@0232bae` (`origin/main`), checked against `cincin_backend@0232bae`, `cincin_frontend@a0f4350` and `cincin_www@4a6a4a7`.

**About the sources:** `docs.sevalla.com` and `sevalla.com` were blocked by this session's network allowlist. The Sevalla facts below come from search-indexed excerpts of the official `docs.sevalla.com` pages listed under [Sources](#sources). Kinsta-hosted preview mirrors of the docs were not used. Where Sevalla's own pages disagree, or a fact wasn't in the excerpts, the text says **verify** and names what to check in the dashboard.

## Answer

**Not yet.** The runbook's architecture is right: two static sites, one Dockerfile application with a pre-deploy migration job, one Postgres database, Cloudflare in DNS-only mode, and a single API instance. Most steps match the code and Sevalla's docs. But following it start to finish would hit these problems:

1. **The data restore (step 5) can leave Prisma's migration history inconsistent.** It restores over a database the step-2 deploy has already migrated, and `--clean` only drops objects that are in the dump. ([W1](#w1))
2. **The `DATABASE_URL` recipe uses variable names Sevalla doesn't create.** Sevalla creates `DB_URL` and `DB_*` variables. ([W2](#w2))
3. **There is no rollback plan:** no record of the old DNS values, no point of no return, and no way back once Sevalla has taken writes. ([Rollback plan](#rollback-plan-to-add))
4. **"Copy everything else from Railway" is not safe.** Railway's raw variables include Railway's own `DATABASE_URL` and `RAILWAY_*`. They also carry the retired `getcincin.com` values, and they may not include the six SendGrid template IDs or the Onfido region. ([Env vars](#missing-and-unsafe-env-vars))
5. **`www.playcincin.com` and `playcincin.com` would both serve the site without a redirect,** and the publish directory (the repo root) would also make `README.md`, `CLAUDE.md` and `docs/agents/*` public. ([G6](#g6), [G7](#g7))
6. **The commas in `GOOGLE_CLIENT_IDS` and `APPLE_CLIENT_IDS` haven't been checked.** The runbook only checks commas for `CORS_ORIGIN`, and Sevalla's own pages disagree on whether commas survive. ([W4](#w4))

When those are fixed, the runbook ends with everything on Sevalla and nothing left on Railway or Vercel. One question it doesn't answer is what happens to `getcincin.com` when the Vercel projects are deleted ([G9](#g9)).

Some features would still be broken after a correct migration. Those are code problems, not runbook problems, and they have their own section: [Not runbook problems](#not-runbook-problems-that-still-break-every-feature-working).

## What checks out

| Runbook claim | Checked against | Result |
|---|---|---|
| Dockerfile build, `node src/server.js`, listens on `PORT` | `Dockerfile` sets `ENV PORT=8080` as a fallback; `src/config/index.js` reads `PORT`. Sevalla sets `PORT`, default 8080 [S14][S10] | ✅ |
| Probes on `/health`, port 8080 | `src/app.js` serves `GET /health` before the rate limiter. Sevalla probes run on the web process's port, 8080 by default [S13] | ✅ The probe doesn't touch the database, so a wrong `DATABASE_URL` still passes it. The runbook's "log in" check catches that. |
| `npx prisma migrate deploy` as a job that runs *before deployment* | `prisma` is in `dependencies`, so it's in the `--omit=dev` image. Sevalla runs before-deployment jobs first, and a failed job stops the rollout with the old version still running [S10][S11][S12] | ✅ The job must finish in about **5 minutes** or the deploy fails [S12]. The three current migrations are well within that. |
| `NODE_ENV` comes from the image | `Dockerfile` has `ENV NODE_ENV=production`; `src/config/index.js` throws without `JWT_SECRET` in production | ✅ |
| `public/_redirects` gives the SPA fallback | `/*  /index.html  200` ships in `dist/` (Vite copies `public/`). Sevalla reads `_redirects` from the publish directory first, and without `!` a rule doesn't shadow real files [S1] | ✅ The "Error file → index.html" fallback in step 3.4 isn't needed. |
| `public/_headers` sets the cache rules | Netlify-style syntax, applied at the edge [S2]. The paths match what `vite-plugin-pwa` emits (`sw.js`, `registerSW.js`, `manifest.webmanifest`) plus `firebase-messaging-sw.js` | ✅ See [G8](#g8) for `index.html`. |
| Publish directory `dist`, Node 20 | `vite build` with no `build.outDir`, so the output is `dist`. CI builds on Node 20 | ✅ Sevalla installs dependencies from the lockfile [S3], so the `vite: not found` fallback shouldn't be needed. |
| `VITE_API_URL` / `VITE_WS_URL` without `/api` | `src/services/api.js` appends `/api`; `src/services/socketService.js` uses the origin as given | ✅ |
| Socket.io works through Sevalla | Server and client both use `transports: ["websocket","polling"]`. Sevalla lists WebSockets as an application use case [S14] | ✅ Keep the runbook's 101-upgrade check, because Sevalla documents no WebSocket idle timeout. Socket.io pings every 10 s, which keeps the connection alive. |
| `CLIENT_IP_HEADER=cf-connecting-ip` | `src/app.js` keys both rate limiters on that header when it's set. All Sevalla application traffic goes through Cloudflare, including the `*.sevalla.app` domain [S15][S16], and Cloudflare sets `CF-Connecting-IP` on requests to the origin [C1] | ✅ The runbook doesn't verify it after cutover ([G4](#g4)). |
| `FIREBASE_SERVICE_ACCOUNT` as base64 | `src/services/notificationService.js` accepts JSON, base64 JSON, or a path | ✅ Base64 also avoids the comma and quote rules. |
| Same region for the app and the database | Internal connections are within a region; Sydney (`australia-southeast1`) is a Sevalla location [S18] | ✅ The runbook should **name Sydney**, not just "close to your players". |
| Apex CNAME through Cloudflare flattening; DNS only | With Cloudflare nameservers, Sevalla verifies with a CNAME, uses a CNAME at the apex, and asks for DNS-only until the domain is Active [S7] | ✅ The runbook's reason, "proxying breaks certificate renewals", isn't what the docs say. The docs only require DNS-only until Active and an unproxied `_acme-challenge` [S7][S9]. Staying grey is still the right choice, because it keeps `CLIENT_IP_HEADER` simple. |
| One web instance | In-memory `gameRooms` / `disconnectTimers` in `src/config/socketServer.js`; `node-cron` in-process in `src/jobs/cronScheduler.js`, behind `CRON_ENABLED` | ✅ The analysis is correct. |

## Wrong steps

<a id="w1"></a>**W1. Step 5.4: restoring over a migrated database.** Step 2 deploys first, so the pre-deploy job creates the full current schema and fills `_prisma_migrations` in `cincin-db`. Then `pg_restore --clean --if-exists` drops and recreates **only the objects in Railway's dump**. If `main` has a migration that Railway never ran (for example `20261019010000_age_verify_reference`), then:
- the tables and columns that migration created on Sevalla survive the restore,
- Railway's `_prisma_migrations` rows replace Sevalla's,
- so the redeploy in step 5.6 runs that migration again, it fails with "already exists", and Sevalla keeps the old (empty-data) version [S12].

`--clean` also doesn't run in a single transaction, so a partial failure leaves a half-restored database.

**Fix:** restore into an **empty** schema:
```bash
psql "$SEVALLA_EXTERNAL_URL" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
pg_restore --no-owner --no-acl --single-transaction -d "$SEVALLA_EXTERNAL_URL" cincin.dump
```
Then redeploy so the job applies whatever Railway was missing. **Verify** that the Sevalla database user owns `public`. If it doesn't, run `DROP OWNED BY CURRENT_USER CASCADE` instead. Before stopping Railway, compare `SELECT migration_name FROM _prisma_migrations ORDER BY 1` on both databases. After the restore, compare row counts for `users`, `games` and `subscriptions`.

<a id="w2"></a>**W2. Step 2.3: `DATABASE_URL` built from `${DATABASE_USER}` and similar names.** With "Add environment variables to the application" ticked, Sevalla creates `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` and `DB_URL` [S4]. The names can be edited in the same sheet [S4]. Prisma's own Sevalla guide says to rename the variable to `DATABASE_URL` [P1]. `${KEY}` references do work in application variables [S5], but the names in the runbook would leave `DATABASE_URL` holding the literal text `${DATABASE_USER}`.

**Fix:** in the connection sheet, rename `DB_URL` to `DATABASE_URL` and delete the hand-built line. That also removes the URL-encoding caveat. Do the same for Redis: rename to `REDIS_URL` (Redis and Valkey have a password and no user [S17]). Make sure the variable is available at **runtime**, because the pre-deploy job and the web process both read it. Don't use it in the build, since the database isn't reachable during a build [S4].

<a id="w3"></a>**W3. Step 2.4: "copy everything else from Railway".** See [Missing and unsafe env vars](#missing-and-unsafe-env-vars). The raw-editor copy brings Railway's `DATABASE_URL` (and `REDIS_URL`), which would override or clash with the internal-connection value, plus `RAILWAY_*` and `PORT`.

<a id="w4"></a>**W4. Step 2.4: "commas are fine because `CORS_ORIGIN` is a single origin".** The code reads three comma-separated variables: `CORS_ORIGIN`, `GOOGLE_CLIENT_IDS` (web plus iOS/Android) and `APPLE_CLIENT_IDS` (Services ID plus bundle ID). Sevalla's application environment-variables page says values reach the app literally, commas included [S5]. Its global-variables and static-site pages say commas are delimiters [S6]. **Fix:** after the first deploy, open the web terminal and run `printenv GOOGLE_CLIENT_IDS APPLE_CLIENT_IDS`. Sign in with Google and with Apple on the preview build before cutover (see [G1](#g1)).

**W5. Step 5.1 ordering: the API goes down before its domain can verify.** Under Cloudflare nameservers, Sevalla verifies `api` with a CNAME on the hostname itself [S7]. That record can only exist once Railway's record is gone. So the outage covers stop → dump → restore → redeploy → DNS → verification → certificate issuance, not just the restore. Sevalla says to allow 5–10 minutes for propagation [S9], so "10–20 minutes" is optimistic. **Fix:**
- Rehearse the dump and restore first ([G1](#g1)) to measure it.
- Switch `app`, `www` and the apex **before** `api`. They are stateless, quick to reverse, and exercise the Cloudflare/Sevalla verification flow before the stateful cutover.
- Add the `api` domain in Sevalla before the window, so the `_acme-challenge` CNAME (a different hostname) is already in place.
- Set a go/no-go time: if `api` isn't Active with a certificate by T+30 min, roll back.

**W6. Step 6 table: elided DNS targets.** `…vercel-dns-017.com` can't be re-entered during a rollback. **Fix:** record the full old values before deleting them, or export the zone first (Cloudflare → DNS → Export).

**W7. Step 6 check: "Stripe → Webhooks → Send test event".** Use `stripe trigger` from the Stripe CLI, or resend a real recent event from the endpoint's delivery list. Either confirms a 2xx through Sevalla. Also check Onfido's webhook delivery log for the outage window and resend anything that failed. Both webhook paths skip the rate limiter (`WEBHOOK_PATHS` in `src/app.js`), so throttling won't cause failures.

## Gaps

<a id="g1"></a>**G1. No end-to-end rehearsal of the new API.** The runbook only tests the static site on the preview URL, against Railway. Before cutover, run a full rehearsal:
1. Dump Railway without stopping it.
2. Restore into `cincin-db` the [W1](#w1) way.
3. Temporarily set `CORS_ORIGIN=https://app.playcincin.com,https://<site>.sevalla.page`. This also tests [W4](#w4).
4. Build a preview of the app with `VITE_API_URL` / `VITE_WS_URL` set to `https://<api>.sevalla.app`.
5. Run the step-6 checks: login, a multi-device game, a scan, a test webhook.

This turns the cutover into a repeat of a known procedure. Afterwards, reset `CORS_ORIGIN` and the app's build variables, then rebuild.

**G2. No backups.** Sevalla on Google Cloud takes a daily snapshot and allows up to 5 manual backups, with 7-day retention per the backups page [S17]. Add these steps:
- take a manual backup of `cincin-db` right after the restore and before every deploy that adds a migration;
- keep the step-5 `cincin.dump` file until Railway is deleted.

Prisma migrations are forward-only, so rolling back code doesn't undo the schema.

**G3. Auto-deploy on `main` restarts the only instance, which kills live games.** A deploy replaces the single pod. Room state, round timers and the 2-minute reconnect timers are in memory (`src/config/socketServer.js`). So every push to `main` drops in-progress multi-device games. On reconnect, `handleJoinRoom` finds no `disconnectTimers` entry and takes the "new join" path. The runbook ticks automatic deployment without mentioning this. **Fix:** in production, turn auto-deploy off and deploy deliberately at low-traffic hours (AEST). Or accept the risk explicitly. The code fix is the same Redis work as scaling out (see [Open questions](#open-questions)).

<a id="g4"></a>**G4. `CLIENT_IP_HEADER` isn't verified.** After cutover, send `GET /api/...` from two different networks, such as Wi-Fi and phone data. Each should get its own `RateLimit-Remaining` count. If they share one count, the header isn't arriving and every user shares a single 100-requests-per-15-minutes limit.

**G5. Cron runs in UTC.** `node-cron` schedules in `src/jobs/cronScheduler.js` have no `timezone` option, and the image doesn't set `TZ`. So "Mondays 09:00" is 19:00–20:00 in Sydney, and "daily 10:00" is 20:00–21:00. Railway was presumably UTC too, so this isn't a regression, but the runbook should say it's intended. If the jobs later move to a Sevalla **Cron job** process, as "Why one instance" plans, that process has its own custom time zone setting [S19]. See [Open questions](#open-questions) for the launch decision.

<a id="g6"></a>**G6. No `www` → apex redirect.** Sevalla treats each hostname as its own domain and never redirects one to another. The primary-domain setting doesn't redirect either [S8][S1]. As written, `www.playcincin.com` and `playcincin.com` serve duplicate content. **Fix:** add a `_redirects` file to `cincin_www`:
```
https://www.playcincin.com/*  https://playcincin.com/:splat  301!
```
This works once both domains are on the site [S1]. Or choose `www` as canonical and update `sitemap.xml` and `robots.txt`, which currently use the apex.

<a id="g7"></a>**G7. `cincin_www` publishes the whole repo.** With no build command, Sevalla deploys the unbuilt repository contents [S3]. That makes `/README.md`, `/CLAUDE.md`, `/docs/agents/*.md` and `/.gitignore` public. **Fix:** move the site files into `public/` and publish that directory, or add forced 404 rules for those paths to `_redirects`.

<a id="g8"></a>**G8. `index.html` has no cache rule.** `_headers` covers hashed assets and the service workers, but not the HTML shell or the SPA routes rewritten to it. **Verify** that Sevalla purges static-site HTML from its CDN on deploy. If it doesn't, add `/index.html` and `/` with `Cache-Control: no-cache` to `public/_headers`. Because `registerType: 'autoUpdate'` is set, a stale shell keeps clients on the old bundle until the service worker updates.

<a id="g9"></a>**G9. `getcincin.com` and other Vercel/Railway leftovers.** The runbook deletes both Vercel projects but never says whether `getcincin.com` (retired, per the map) was attached to either one, or what it should do afterwards: redirect to `playcincin.com`, or nothing. It also doesn't mention:
- removing Vercel/Railway verification TXT records other than `_railway-verify.api`;
- `documentation/LANDING-PAGE-INTEGRATION-GUIDE.md` in `cincin_frontend`, which still describes `vercel.json`.

**G10. CAA records.** If `playcincin.com` has CAA records, Sevalla's certificate authority has to be allowed, or verification shows "Fix domain error" [S9]. Check before cutover. (This session couldn't query DNS.)

## Missing and unsafe env vars

The runbook's explicit list is `JWT_SECRET`, `CORS_ORIGIN`, `APP_URL`, `SHARE_BASE_URL`, `API_BASE_URL` and `CLIENT_IP_HEADER`, plus "copy the rest". Compared with every `process.env` read in `cincin_backend/src` and with `.env.example`:

| Variable | Problem |
|---|---|
| `DATABASE_URL`, `REDIS_URL` | Must come from the internal connection ([W2](#w2)), **not** from Railway's raw editor. Exclude them, `PORT` and all `RAILWAY_*` from the copy. |
| `EMAIL_FROM_ADDRESS` | The code defaults to `noreply@getcincin.com`. Railway's value is probably the same, and the map retires `getcincin.com`. Must be set to a `playcincin.com` sender, which needs SendGrid domain authentication for `playcincin.com` (DNS records in Cloudflare that the runbook doesn't list). |
| `APNS_BUNDLE_ID` | Defaults to `com.getcincin.app`, which the map retires. APNs only matters for native iOS, which comes after launch, so it can be left unset for now, but it must not carry the old ID across silently. |
| `AGE_VERIFY_PROVIDER` | Must be `onfido`. `.env.example` sets `mock`, so check that Railway doesn't have `mock`. |
| `AGE_VERIFY_API_BASE` | Not mentioned. Defaults to the **EU** Onfido API. It must match the region of the Onfido account used for Australia. |
| `AGE_VERIFY_API_SECRET`, `AGE_VERIFY_WEBHOOK_SECRET` | Covered by "Onfido", but the webhook secret must be the one for the endpoint at `api.playcincin.com`. |
| `SG_TEMPLATE_PAYMENT_FAILED`, `SG_TEMPLATE_SEASON_ENDED`, `SG_TEMPLATE_MEMBERSHIP_REDUCED`, `SG_TEMPLATE_MONTHLY_WRAPPED`, `SG_TEMPLATE_QUARTERLY_SUMMARY`, `SG_TEMPLATE_SEASON_END_REPORT` | Not mentioned. Without them, those emails fall back to inline HTML. Decide whether that's acceptable. |
| `AI_VISION_PROVIDER`, `AI_LLM_PROVIDER` | Not mentioned. They default to `anthropic`, so only the matching key is required. |
| `GOOGLE_CLIENT_IDS`, `APPLE_CLIENT_IDS` | Comma-separated ([W4](#w4)). Social login is rejected while they are empty. |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `CRON_ENABLED` | Optional with safe defaults. Copy them only if Railway sets them deliberately. |
| `API_BASE_URL`, `SHARE_BASE_URL` | Set by the runbook but **read by nothing** in `src/`; `shareBaseUrl` is loaded into config and never used. They're harmless, but don't count them as working configuration. |
| App: `VITE_FIREBASE_VAPID_KEY` | Covered by "every `VITE_FIREBASE_*`", but without it web push can't get a token. Call it out by name. |

## Rollback plan to add

Add this as a new section between steps 5 and 6. The plan assumes the old platforms stay intact until step 7.

**Before the window:**
- Export the Cloudflare zone, or write down every record the runbook deletes, with full values.
- Keep both Vercel projects with their domains still attached, and keep the Railway Postgres running.
- Take a manual backup of `cincin-db`.

**App or www fails after its DNS switch** (stateless, any time before step 7):
1. In Cloudflare, delete the Sevalla pointing record and recreate the Vercel record.
2. Vercel serves again once DNS propagates.
3. The Sevalla `_acme-challenge` record can stay.

**API fails before any user writes reach Sevalla** (go/no-go at T+30 min):
1. Recreate the Railway CNAME and the `_railway-verify.api` TXT.
2. Restart the Railway deployment.

No data was lost, because Railway's database was only read.

**API fails after Sevalla has taken writes:** stop the Sevalla web process first, so nothing else gets written. Then:
1. `pg_dump` from Sevalla over the external connection.
2. Restore into Railway the [W1](#w1) way.
3. Restart Railway and revert DNS.

Set a **point of no return**, for example 24 hours after a clean cutover. After that, fix forward on Sevalla.

**Bad deploy later on Sevalla:**
- Use **Rollback**, which redeploys the last successful image without rebuilding, or **Redeploy** an older commit [S11].
- A failed pre-deploy job already leaves the old version running [S11][S12].
- Because migrations are forward-only, a code rollback past a migration needs the old code to work with the new schema. Otherwise, restore the pre-deploy backup ([G2](#g2)).

## Linking the production configuration checklist

The runbook should own **how to host on Sevalla**, and the checklist (`research/production-config-checklist.md`) should own **what each feature needs in production**. Concretely:

- **Replace** step 2.4's "everything else" row and step 3.3's `VITE_FIREBASE_*` bullet with one line: *"Set every variable the [production configuration checklist](https://github.com/miczagami/cincin_frontend/blob/claude/sharp-gauss-5tdzpq/research/production-config-checklist.md) marks **API runtime** (step 2) or **App build** (step 3). Don't copy Railway's or Vercel's variables wholesale."* Use an absolute GitHub URL, because the runbook lives in `cincin_backend` and the checklist in `cincin_frontend`. Update the link when the checklist moves out of `research/` into a permanent doc.
- **Keep in the runbook** only the variables whose value depends on the hosting, plus the Sevalla value-format rules:
  - variables Sevalla provides (`PORT`) or the image sets (`NODE_ENV`);
  - variables from internal connections (`DATABASE_URL`, `REDIS_URL`);
  - variables tied to Sevalla's proxy and the domains (`CLIENT_IP_HEADER`, `CORS_ORIGIN`, `APP_URL`, `VITE_API_URL`, `VITE_WS_URL`);
  - the format rules: base64 for `FIREBASE_SERVICE_ACCOUNT`, commas ([W4](#w4)), and no parentheses [S6].
- **Add to "Before you start":** "The production configuration checklist is complete, and every value in it is to hand." That makes the checklist a precondition rather than something to look up mid-cutover.
- **Point the post-cutover checks at the checklist's per-feature verification**, such as push, email sender, Onfido webhook and Stripe live webhook, rather than growing the step-6 list. Webhook URLs, provider dashboards and non-Sevalla DNS records (for example SendGrid domain authentication) belong in the checklist, and the runbook should link to them rather than repeat them.

## Not runbook problems that still break "every feature working"

These come up during this review but belong to their own tickets:

- **Background web push can't work.** `public/firebase-messaging-sw.js` initialises Firebase from `self.__FIREBASE_CONFIG__`, which nothing sets. `registerServiceWorker()` in `src/services/pushService.js` only has a comment saying it's set, so the service worker runs with `"YOUR_FIREBASE_API_KEY"` placeholders. That service worker is also registered with `scope: "/"`, the same scope as the Workbox `sw.js` from `vite-plugin-pwa`, and a scope holds only one registration, so the two service workers replace each other.
- **`/privacy` and `/terms` return 404 on `cincin_www`.** They are linked from the footer and listed in `sitemap.xml`. The map already drafts them.
- **The Onfido SDK referrer is `CORS_ORIGIN`** (`src/services/ageVerifyService.js`), which is a bare origin with no path wildcard. **Verify** against Onfido's referrer-pattern rules that `https://app.playcincin.com` covers the age-verification page, and that this coupling still holds if `CORS_ORIGIN` ever lists two origins.

## Open questions

1. **What does `getcincin.com` do after the Vercel projects are deleted?** Redirect to `playcincin.com`, or go dark? This decides whether anything has to stay on Vercel.
2. **Which timezone should scheduled jobs use for an Australian launch?** Options are `TZ=Australia/Sydney` on the web process, or per-job `timezone` in `node-cron`. Weekly digests and reminders currently go out in the Sydney evening.
3. **Should production auto-deploy on every push to `main`,** given that each deploy drops live multi-device games ([G3](#g3))? Or should game state move to Redis before launch, which is the same work the runbook lists for scaling out?
4. **Which Onfido region is the account in?** `AGE_VERIFY_API_BASE` defaults to the EU endpoint.
5. **Does Sevalla purge static-site HTML on deploy, and do commas survive in application env vars?** Sevalla's pages disagree on the commas. A five-minute test on the first deploy answers both ([W4](#w4), [G8](#g8)).

## Sources

Code (all at `origin/main` on 2026-11-18):
- `cincin_backend`: `documentation/DEPLOYMENT-SEVALLA.md`, `Dockerfile`, `.dockerignore`, `package.json`, `.env.example`, `src/app.js`, `src/server.js`, `src/config/index.js`, `src/config/socketServer.js`, `src/config/redis.js`, `src/jobs/cronScheduler.js`, `src/services/notificationService.js`, `src/services/ageVerifyService.js`, `prisma/schema.prisma`, `prisma/migrations/`
- `cincin_frontend`: `vite.config.js`, `public/_redirects`, `public/_headers`, `public/firebase-messaging-sw.js`, `src/services/pushService.js`, `src/services/socketService.js`, `src/services/api.js`, `.env.example`, `vercel.json`, `.github/workflows/ci.yml`
- `cincin_www`: `index.html`, `README.md`, `robots.txt`, `sitemap.xml`

Sevalla (official docs, `docs.sevalla.com`):
- [S1] Static sites: redirects: https://docs.sevalla.com/static-sites/redirects
- [S2] Static sites: headers: https://docs.sevalla.com/static-sites/headers
- [S3] Static sites: add a static site / settings: https://docs.sevalla.com/static-sites/get-started/add-a-static-site, https://docs.sevalla.com/static-sites/settings
- [S4] Databases: networking (internal connections): https://docs.sevalla.com/databases/networking
- [S5] Applications: environment variables: https://docs.sevalla.com/applications/environment-variables
- [S6] Global variables; static-site environment variables: https://docs.sevalla.com/tools/global-variables, https://docs.sevalla.com/static-sites/environment-variables
- [S7] Applications: domains: https://docs.sevalla.com/applications/domains
- [S8] Static sites: domains: https://docs.sevalla.com/static-sites/domains
- [S9] Load balancers: domains (proxy after Active, CAA, `_cf-custom-hostname`): https://docs.sevalla.com/load-balancers/domains
- [S10] Applications: go-live checklist: https://docs.sevalla.com/applications/go-live-checklist
- [S11] Applications: deployments: https://docs.sevalla.com/applications/deployments
- [S12] Applications: failed deployment: https://docs.sevalla.com/applications/troubleshooting/failed-deployment
- [S13] Health checks quick start: https://docs.sevalla.com/quick-starts/python/fastapi/health-checks
- [S14] Deploy JavaScript applications: https://docs.sevalla.com/guides/javascript/overview
- [S15] DDoS protection: https://docs.sevalla.com/service-information/ddos-protection
- [S16] Applications: CDN: https://docs.sevalla.com/applications/cdn
- [S17] Databases: overview and backups: https://docs.sevalla.com/databases/overview, https://docs.sevalla.com/databases/backups
- [S18] Data center locations: https://docs.sevalla.com/service-information/data-center-locations
- [S19] Applications: processes (cron job time zones): https://docs.sevalla.com/applications/processes

Other primary sources:
- [P1] Prisma: Deploy to Sevalla: https://www.prisma.io/docs/orm/prisma-client/deployment/traditional/deploy-to-sevalla
- [C1] Cloudflare: HTTP headers (`CF-Connecting-IP`): https://developers.cloudflare.com/fundamentals/reference/http-headers/
