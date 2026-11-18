# Object storage for scan images and share cards

Ticket: [#14](https://github.com/miczagami/cincin_frontend/issues/14). Map: [#5](https://github.com/miczagami/cincin_frontend/issues/5).
Researched 2026-11-18 against `origin/main` of `cincin_backend` and `cincin_frontend`.

## Recommendation

**Use Cloudflare R2 directly, on the same Cloudflare account that holds the `playcincin.com` zone.** Create two buckets, both with the `oc` (Oceania) location hint:

| Bucket | Access | Domain | Lifecycle |
|---|---|---|---|
| `cincin-scans` | private (S3 API only) | none; the API reads and writes it | expire objects after 90 days; abort incomplete multipart uploads after 1 day |
| `cincin-share` | public read | `media.playcincin.com` (R2 custom domain); `r2.dev` URL left off | expire objects after 365 days |

Why R2 over the other two:

- **Over Sevalla object storage:** Sevalla's buckets *are* R2 buckets, run in Sevalla's Cloudflare account, so the storage, CDN and `oc` hint are the same. But a public Sevalla bucket is served only from `<bucket>.sevalla.storage` and "can't have custom domains", so every share-card URL saved in the database and posted to social media would carry a Sevalla hostname, and moving off Sevalla would break them. Sevalla also documents no lifecycle rules, has no free allowance, and charges $0.02/GB-month against R2's $0.015.
- **Over S3 `ap-southeast-2`:** S3 is the only option with a guaranteed Australian region, but public share cards pay internet egress ($0.114/GB in Sydney after the first 100 GB/month), and a branded HTTPS domain needs CloudFront in front of it. R2 has no egress charge at all, which matters for share cards: a viral card is cheap on R2 and expensive on S3.

The one reason to change this: if a privacy review decides scan images must stay in Australia (R2's `oc` hint is "best effort", not a guarantee, and there is no Australian R2 jurisdiction), put **only** `cincin-scans` in S3 `ap-southeast-2`. Private scans have almost no egress, so S3's main cost doesn't apply to them. Share cards stay on R2. See [Open questions](#open-questions).

Sevalla object storage is an acceptable fallback if the team prefers one vendor and one bill and is content with `*.sevalla.storage` share URLs.

## What the code needs today

- **Scan images.** `POST` label scans arrive at the API as base64 in a JSON body (`express.json({ limit: "10mb" })` in `src/app.js`). `scanService.scanLabel` sends them to the vision provider and stores a `BottleScan` row with `rawImageUrl: null, // TODO: upload to S3 in production` (`src/services/scanService.js:33`). Nothing reads `rawImageUrl` yet. Since the API already holds the bytes, the simplest path is a server-side `PutObject` to the private bucket, storing the object key (not a URL) in `rawImageUrl`. A presigned browser upload is not needed for scans at launch.
- **Share cards.** Both cards are rendered in the browser on a 1080x1920 canvas and shared as a PNG file through the Web Share API, with a download fallback; `PalateWrappedPage.jsx` says "No S3 upload required — generates client-side for immediate sharing." The database has `EngagementSummary.shareableCardUrl  // S3 URL to generated shareable image` (`prisma/schema.prisma`), and `palateProfileService.generateWrappedCard` says "Actual image generation is handled separately (S3 upload)", but nothing writes `shareableCardUrl` today. A hosted card is only needed for link sharing (Open Graph previews) and for putting the card in the monthly Wrapped / season-end emails (`SG_TEMPLATE_MONTHLY_WRAPPED`, `SG_TEMPLATE_SEASON_END_REPORT` in `.env.example`).
- **Bug found on the way:** `SeasonEndPage.jsx` imports `renderSeasonCard` and `canvasToBlob` from `src/utils/canvasCards.js`, which are stubs that return `null` and log a warning. The season share button therefore builds `new File([null], ...)`; the card is never drawn. `PalateWrappedPage.jsx` has its own working copies.

## Comparison

| | Sevalla object storage | Cloudflare R2 | AWS S3 `ap-southeast-2` |
|---|---|---|---|
| What it is | R2 buckets in Sevalla's Cloudflare account, keys scoped to one bucket [S1][S2] | R2 in our Cloudflare account | S3 |
| Australian region | `oc` (Oceania) location hint; location fixed at creation [S3][S5] | `oc` location hint, best effort, not a guarantee; no Oceania jurisdiction [R1] | Yes, Sydney region |
| Storage price | $0.02/GB-month, no free allowance [S1][S6] | Standard $0.015/GB-month; first 10 GB/month free [R2] | ~$0.025/GB-month [A1] |
| Operations | free [S1] | Class A (writes, lists) $4.50/M, 1M/month free; Class B (reads) $0.36/M, 10M/month free [R2] | PUT ~$0.0055/1k; GET ~$0.00044/1k [A1] |
| Egress | free [S1] | free [R2] | ~$0.114/GB to internet after 100 GB/month free [A1] |
| Private objects | default [S1] | default | default |
| Public read | whole bucket, via `<bucket>.sevalla.storage` on Cloudflare's CDN; no per-object visibility [S1][S2] | custom domain (production) or `r2.dev` (dev only, rate-limited) [R3] | bucket policy, or CloudFront with origin access control |
| Custom domain | not possible on a bucket [S2] | yes, if the domain is a zone on the same Cloudflare account, full (not partial) setup [R3][R4] | via CloudFront + ACM certificate |
| CDN | Cloudflare (built in) | Cloudflare cache on the custom domain [R3] | CloudFront (separate service) |
| Presigned URLs | yes, S3 API endpoint [S4] | yes, S3 API endpoint only, not custom domains; expiry 1 s to 7 days [R5] | yes |
| CORS | rules via dashboard/CLI/API; rules cannot be edited, only replaced [S2] | bucket CORS rules [R5] | bucket CORS |
| Lifecycle / retention | not documented | expire by prefix after N days; abort incomplete multipart uploads; up to 1,000 rules [R6] | full lifecycle rules |
| Node SDK | `@aws-sdk/client-s3`, `region: "auto"`, R2 endpoint [S4] | `@aws-sdk/client-s3`, `region: "auto"`, `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` [R5] | `@aws-sdk/client-s3`, `region: "ap-southeast-2"` |
| Billing | on the Sevalla invoice | separate Cloudflare bill | separate AWS bill |

### Cost at two volumes

Assumptions (none of these are measured; adjust as real numbers arrive):

- Scan image: client resizes before upload, ~0.3 MB JPEG. 6 scans per monthly active user (free tier caps at 5). Kept 90 days.
- Share card: re-encoded from 1080x1920 PNG to JPEG/WebP, ~0.4 MB. 2 cards per MAU per month. Kept 12 months. Each card viewed 25 times.
- Soft launch: 500 MAU, three months in. Public launch: 20,000 MAU, twelve months in.
- Every view is counted as a bucket read and egress (on R2 the Cloudflare cache would absorb many of them, so R2 numbers are an upper bound).

| | Soft launch | Public launch |
|---|---|---|
| Stored | ~4 GB (2.7 GB scans + 1.2 GB cards) | ~300 GB (108 GB scans + 192 GB cards) |
| Writes / month | ~4,000 | ~160,000 |
| Card views / month | ~25,000 | ~1,000,000 |
| Egress / month | ~10 GB | ~400 GB |
| **R2** | **$0** (inside free tier) | **~$4.35** (290 GB x $0.015; ops inside free tier) |
| **Sevalla** | **~$0.08** | **~$6.00** |
| **S3 Sydney, direct** | **~$0.13** | **~$43** (storage $7.50, requests ~$1.30, egress 300 GB x $0.114 = $34.20) |

All three are cheap at soft launch. The difference is egress: at public launch S3 costs ~10x R2 unless CloudFront is added (whose free allowance would absorb this volume, at the cost of another service to configure). A card that goes viral to 10 TB of views costs nothing extra on R2 or Sevalla and roughly $1,100 on S3 direct.

## How it would work with R2

### Setup (once)

1. In the Cloudflare account that holds `playcincin.com`, create `cincin-scans` and `cincin-share` with location hint `oc`. A hint is honoured only on first creation of a bucket name [R1].
2. On `cincin-share`, connect custom domain `media.playcincin.com`; leave `r2.dev` access disabled [R3]. R2 creates and manages the DNS record for the custom domain itself, and it is served through Cloudflare's proxy and cache. This does not change the other records in the zone, which can stay DNS-only. It does require the zone to use Cloudflare's nameservers (full setup) and to be on the same account as the bucket [R4].
3. Lifecycle rules [R6]: `cincin-scans` expire after 90 days and abort incomplete multipart uploads after 1 day; `cincin-share` expire after 365 days.
4. CORS on `cincin-share`, only if the browser uploads cards directly: allow `PUT` from `https://playcincin.com` (and the staging origin) with header `content-type`.
5. Create one R2 API token per environment, Object Read & Write, scoped to these two buckets.

### Node configuration

```js
// cincin_backend/src/config/storage.js (sketch)
const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: "auto", // required by the SDK, ignored by R2
  endpoint: process.env.STORAGE_ENDPOINT, // https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  },
});
```

New dependencies: `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` [R5]. Because the code only uses the S3 API, switching to Sevalla or S3 later changes only the env vars (for S3: `region: "ap-southeast-2"` and no custom endpoint).

### Scan images (private)

- In `scanLabel`, after the vision call, `PutObject` to `cincin-scans` with key `scans/<userId>/<scanId>.jpg` and store the key in `rawImageUrl`. Strip EXIF (GPS) before storing.
- To show a scan to staff or the user, sign a short-lived `GetObject` URL (minutes, not days). Never make this bucket public.

### Share cards (public)

1. Client asks the API for an upload slot. The API checks the user may share this card, chooses an unguessable key such as `cards/<cuid>.jpg`, and returns a presigned `PUT` URL (expiry ~5 minutes) for `cincin-share`. Presigned URLs only work on the `r2.cloudflarestorage.com` endpoint, not on `media.playcincin.com` [R5].
2. Client `PUT`s the rendered blob to that URL.
3. Client tells the API the upload is done. The API `HeadObject`s it, rejects and deletes anything over a size cap or with the wrong content type, and saves `shareableCardUrl = ${STORAGE_PUBLIC_BASE_URL}/cards/<cuid>.jpg`.

Alternative with fewer moving parts: render the card on the server (the email jobs need a server-side image anyway) and `PutObject` it directly, which needs no CORS and no presigned upload.

## Env vars

Backend (`cincin_backend`, add to `.env.example` and Sevalla):

| Name | Example | Notes |
|---|---|---|
| `STORAGE_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | S3 API endpoint |
| `STORAGE_REGION` | `auto` | `ap-southeast-2` if S3 |
| `STORAGE_ACCESS_KEY_ID` | | R2 API token, secret |
| `STORAGE_SECRET_ACCESS_KEY` | | R2 API token, secret |
| `STORAGE_SCANS_BUCKET` | `cincin-scans` | private |
| `STORAGE_SHARE_BUCKET` | `cincin-share` | public via custom domain |
| `STORAGE_PUBLIC_BASE_URL` | `https://media.playcincin.com` | prefix for saved share-card URLs |

Provider-neutral names are deliberate, so a later move to Sevalla or S3 is a config change. When unset in development, the API can keep today's behaviour (`rawImageUrl: null`). The frontend needs no new env var: it gets presigned URLs and public URLs from the API.

## Open questions

1. **Must scan images stay in Australia?** Label photos can catch faces, homes and EXIF GPS. R2's `oc` hint is best effort and Cloudflare has no Australian jurisdiction. If the privacy policy promises Australian storage, or the APP 8 cross-border analysis says so, put `cincin-scans` in S3 `ap-southeast-2` instead.
2. **Do we keep scan images at all, and for how long?** Nothing reads `rawImageUrl` today. The 90-day expiry above is a placeholder; the privacy policy has to state the real period, and "don't store them" is also an option.
3. **Are hosted share cards in launch scope?** Cards are shared today as files through the Web Share API with no upload. Hosting is only needed for link previews and email. If not in scope, only `cincin-scans` is needed at launch.
4. **Which Cloudflare account holds `playcincin.com`, and is it a full (nameserver) setup?** R2 custom domains need both [R4].

Found on the way, not storage questions:

- `SeasonEndPage.jsx` share card is broken: `src/utils/canvasCards.js` is a stub returning `null`.
- Share fallbacks hard-code `https://cincin.app` (`SeasonEndPage.jsx:171`, `PalateWrappedPage.jsx:296`, `:324-325`) instead of the launch domain.

## Sources

The session's network blocked direct fetches of `docs.sevalla.com`, `developers.cloudflare.com` and `aws.amazon.com`, so these pages were read through web-search extracts of the official pages. The AWS figures in particular came from extracts that disagree with older copies; confirm them on the AWS pricing page (Asia Pacific (Sydney)) before relying on exact numbers.

- [S1] Sevalla docs, Object storage overview: https://docs.sevalla.com/object-storage/overview
- [S2] Sevalla docs, Object storage infrastructure and settings: https://docs.sevalla.com/object-storage/infrastructure, https://docs.sevalla.com/object-storage/settings
- [S3] Sevalla API, Create object storage bucket (location hints incl. `oc`, `public_access`): https://api-docs.sevalla.com/v3/object-storages/create-object-storage-bucket
- [S4] Sevalla docs, Connect to object storage: https://docs.sevalla.com/object-storage/connect-to-object-storage
- [S5] Sevalla docs, Add an object storage: https://docs.sevalla.com/object-storage/add-an-object-storage
- [S6] Sevalla docs, Pricing: https://docs.sevalla.com/billing/pricing
- [R1] Cloudflare R2, Data location (location hints, jurisdictions): https://developers.cloudflare.com/r2/reference/data-location/
- [R2] Cloudflare R2, Pricing: https://developers.cloudflare.com/r2/pricing/
- [R3] Cloudflare R2, Public buckets: https://developers.cloudflare.com/r2/buckets/public-buckets/
- [R4] Cloudflare docs change on R2 custom domains and partial zones: https://github.com/cloudflare/cloudflare-docs/pull/22011
- [R5] Cloudflare R2, Presigned URLs and aws-sdk-js-v3 example: https://developers.cloudflare.com/r2/api/s3/presigned-urls/, https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
- [R6] Cloudflare R2, Object lifecycles: https://developers.cloudflare.com/r2/buckets/object-lifecycles/
- [A1] AWS, Amazon S3 pricing (select Asia Pacific (Sydney)): https://aws.amazon.com/s3/pricing/
- Code: `cincin_backend` `src/services/scanService.js`, `src/services/palateProfileService.js`, `prisma/schema.prisma`, `src/app.js`, `.env.example`; `cincin_frontend` `src/utils/canvasCards.js`, `src/pages/palate/PalateWrappedPage.jsx`, `src/pages/clubs/SeasonEndPage.jsx`.
