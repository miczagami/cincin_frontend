# CinCin PWA — Phase 4 Frontend

Phase 4 adds the **Profile & Monetisation** layer: Palate Profile analytics, Stripe Pro subscriptions, Buy tab, discovery feed, notification centre, and full user profile/settings management.

## What's Included (Phase 4 — Profile & Monetisation)

### Palate Profile (Weeks 14–15)
- **Locked page** — progress bar visible to all users showing X/3 games played (conversion incentive per Section 6.2)
- **Full dashboard** (Pro only, 3+ games) — accuracy by flavour category with confidence indicators, strengths (top 5), weaknesses (bottom 5), accuracy by drink type (wine/beer/spirits), trend-over-time chart, all-time and recent-form (last 10 games) toggle
- **Palate Wrapped** — shareable card with key stats (games, accuracy, top strength, biggest miss), Web Share API integration

### Pro Subscription (Weeks 14–16)
- Pricing page with monthly ($12.99/mo) and annual ($9.99/mo, ~20% savings) plan cards
- Pro feature list matching Appendix C
- 7-day trial CTA (shown after first game, Section 8.2)
- Stripe Checkout redirect (hosted page, not embedded Elements)
- Active subscription management: billing portal, cancel at period end, reactivate
- Email verification gate for paid features (Section 7.2)

### Buy Tab (Weeks 16–17)
- Scanned bottle history with affiliate partner links and pricing
- Click-through tracking for affiliate attribution
- Opens partner sites in new tab

### Discovery Feed (Weeks 15–16)
- Mixed feed: sponsored tastings (double-point games, brand content) + organic content (trending, seasonal, most-scanned)
- Pro users see ad-free feed (Section 8.1)
- Infinite scroll pagination

### Notification Centre (Weeks 16–17)
- Paginated notification list with unread indicators (cyan dot)
- Mark individual / mark all as read
- Tap notification to navigate to relevant screen
- 60-second polling for unread count badge (pauses when tab hidden)

### Profile & Settings (Week 17)
- User profile: avatar, name, bio, location, drink preferences, quick stats, inline editing
- Settings: notification preferences (per-category toggles), subscription management, data export (JSON + CSV), game history anonymisation, B2B data opt-in (Pro only), account deletion with confirmation
- Logout

## API Endpoint Coverage

### Palate Profile → `/api/palate/*`
- `GET /profile?view=all_time|recent` — Full dashboard (Pro, 3+ games)
- `GET /progress` — Unlock progress (all users)
- `POST /wrapped` — Generate Palate Wrapped card

### Subscription → `/api/subscription/*`
- `GET /status` — Current subscription status
- `POST /checkout` — Create Stripe checkout session
- `POST /portal` — Create billing portal session
- `POST /cancel` — Cancel at period end
- `POST /reactivate` — Undo pending cancellation
- `GET /trial` — Check trial eligibility

### Commerce → `/api/commerce/*`
- `GET /buy-tab` — Scanned bottles + affiliate links
- `GET /bottles/:id/links` — Affiliate links for specific bottle
- `POST /affiliate/click` — Track affiliate click
- `GET /feed` — Discovery feed
- `POST /sponsored/:id/start` — Track sponsored game start

### Notifications → `/api/notifications/*`
- `GET /` — Paginated notification list
- `PATCH /:id/read` — Mark single notification read
- `POST /read-all` — Mark all read
- `POST /push-token` — Register push token
- `DELETE /push-token` — Remove push token

### Users → `/api/users/*` (Phase 4 additions)
- `GET /me/export/csv` — Data export (CSV)
- `PATCH /me/b2b-consent` — B2B data opt-in

## Project Structure

```
src/
├── components/          # Phase 1 design system (unchanged)
├── context/
│   ├── authStore.js           # Phase 1
│   ├── scanStore.js           # Phase 1
│   ├── gameStore.js           # Phase 2
│   ├── clubStore.js           # Phase 3
│   ├── subscriptionStore.js   # Phase 4 ← NEW
│   ├── palateStore.js         # Phase 4 ← NEW
│   ├── notificationStore.js   # Phase 4 ← NEW
│   └── commerceStore.js       # Phase 4 ← NEW
├── hooks/
│   ├── useNotificationBadge.js # Phase 4 ← NEW
│   └── (Phase 1–3 hooks unchanged)
├── pages/
│   ├── palate/                 # Phase 4 ← NEW
│   ├── commerce/               # Phase 4 ← NEW
│   ├── profile/                # Phase 4 ← NEW
│   ├── club/                   # Phase 3
│   ├── game/                   # Phase 2+3
│   └── PlaceholderPages.jsx    # Updated
├── services/
│   └── api.js                  # Updated with Phase 4 endpoints
├── i18n/
│   ├── en.json                 # Updated
│   └── en-phase4.json          # NEW (merge into en.json)
└── AppRouter.jsx               # Updated with Phase 4 routes
```

## Phase 4 Exit Criteria

| Milestone | Status |
|-----------|--------|
| Pro user with 3+ games sees full analytics dashboard | ✅ |
| Palate Wrapped card generates and is shareable | ✅ |
| Free user hits scan limit, is prompted to upgrade | ✅ |
| Can subscribe via Stripe, sees Pro features unlock | ✅ |
| Discovery feed serving content | ✅ |
| Buy tab showing affiliate links | ✅ |
| Notifications delivering across all channels | ✅ |
| Data export functional | ✅ |

## Tech Stack
- React 18 + Vite 5
- React Router v6
- Zustand (state management — 8 stores)
- i18next + react-i18next
- vite-plugin-pwa (service worker + manifest)
- Stripe Checkout (hosted, via redirect)
- Instrument Sans (display) + DM Sans (body) typography

## Getting Started

```bash
npm install
npm run dev
```

Dev server runs on `http://localhost:3000` with API proxy to `http://localhost:4000`.

## Next Phases

- [ ] **Phase 5 (Weeks 18–20):** PWA optimisation, offline hardening, QA, soft launch, public release
