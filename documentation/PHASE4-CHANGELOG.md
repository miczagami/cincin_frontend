# CinCin Frontend — Phase 4 Changelog

## Overview

Phase 4 implements the **Profile & Monetisation** frontend (Weeks 14–17):
- Palate Profile analytics dashboard (locked, profile, wrapped views)
- Stripe Pro subscription flow (upgrade, manage, cancel, reactivate)
- Buy tab with affiliate links and click tracking
- Discovery feed with sponsored + organic content
- In-app notification centre with read state management
- User profile page with stats and edit capabilities
- Settings page (notifications, data export, B2B consent, account management)

## Files Changed (from Phase 3)

### Updated Files

| File | What Changed |
|------|-------------|
| `src/AppRouter.jsx` | Real page imports replace Phase 4 placeholders. New routes: `/palate/*`, `/buy`, `/discover`, `/profile`, `/settings`, `/subscription`, `/notifications`. Stripe redirect targets. |
| `src/pages/PlaceholderPages.jsx` | Removed BuyPage, PalatePage, ProfilePage, SettingsPage, NotificationsPage. Only `ForgotPasswordPage` remains. |
| `src/services/api.js` | Added 5 endpoint groups: `palate` (3), `subscription` (6), `commerce` (5), `notifications` (5), `users` Phase 4 additions (export, B2B, delete, anonymise). |
| `src/i18n/en.json` | Merge with `en-phase4.json` for all Phase 4 translation keys. |

### New Files

| File | Purpose |
|------|---------|
| **Stores** | |
| `src/context/subscriptionStore.js` | Zustand store: Stripe checkout, billing portal, cancel/reactivate, trial eligibility. |
| `src/context/palateStore.js` | Zustand store: profile data, progress, wrapped card, view switching. |
| `src/context/notificationStore.js` | Zustand store: paginated notifications, read state, push token registration. |
| `src/context/commerceStore.js` | Zustand store: buy tab, discovery feed, affiliate click tracking. |
| **Palate Pages** | |
| `src/pages/palate/PalateLockedPage.jsx` | Locked state: progress bar (visible to all), Pro upgrade CTA, feature preview. |
| `src/pages/palate/PalateProfilePage.jsx` | Full dashboard: category accuracy bars, strengths/weaknesses, drink type breakdown, trend chart, view toggle. |
| `src/pages/palate/PalateWrappedPage.jsx` | Shareable card: key stats, top strength, biggest miss. Web Share API. |
| **Commerce Pages** | |
| `src/pages/commerce/BuyPage.jsx` | Scanned bottle history with affiliate links, pricing, partner attribution. |
| `src/pages/commerce/DiscoveryPage.jsx` | Mixed feed: sponsored tastings (hidden for Pro), organic trending content. |
| **Profile Pages** | |
| `src/pages/profile/ProfilePage.jsx` | User profile: avatar, name, bio, stats, menu navigation, inline edit. |
| `src/pages/profile/SettingsPage.jsx` | Settings: notifications, subscription, data export (JSON/CSV), B2B consent, account deletion. |
| `src/pages/profile/SubscriptionPage.jsx` | Subscription: pricing cards, feature list, Stripe checkout, manage/cancel flows. |
| `src/pages/profile/NotificationsPage.jsx` | Notification centre: paginated list, unread indicators, mark read, tap navigation. |
| **Hooks** | |
| `src/hooks/useNotificationBadge.js` | Polls unread notification count every 60s for nav badge display. |
| **i18n** | |
| `src/i18n/en-phase4.json` | Phase 4 translation keys (merge into main en.json). |
| **Docs** | |
| `PHASE4-CHANGELOG.md` | This file. |
| `README4.md` | Phase 4 README. |

## Phase 4 Exit Criteria

| Milestone | Status |
|-----------|--------|
| Pro user with 3+ games sees full analytics dashboard | ✅ |
| Palate Wrapped card generates and is shareable | ✅ (text share; image gen is Phase 5 stub) |
| Free user hits scan limit, is prompted to upgrade | ✅ (existing from Phase 1 + subscription page) |
| Can subscribe via Stripe, sees Pro features unlock | ✅ (Stripe Checkout redirect) |
| Discovery feed serving content | ✅ |
| Buy tab showing affiliate links | ✅ |
| Notifications delivering across all channels | ✅ (in-app centre; push/email backend stubbed) |
| Data export functional | ✅ (JSON + CSV download from Settings) |

## Stub Functions (to be completed in Phase 5)

| Function | Location | Description |
|----------|----------|-------------|
| `PalateWrappedPage` image generation | `palate/PalateWrappedPage.jsx` | Currently text-only share. Phase 5: generate designed image card via canvas/SVG, upload to S3, share image URL. |
| Trend chart | `palate/PalateProfilePage.jsx` | Currently CSS bar chart. Phase 5: replace with Recharts LineChart with tooltips and axis labels. |
| Push token registration | `context/notificationStore.js` | `registerPushToken()` is ready. Phase 5: integrate with service worker push subscription (FCM). |
| Change password | `profile/SettingsPage.jsx` | Currently redirects to forgot-password. Phase 5: add inline change-password form. |
| Cached bottles count | `profile/SettingsPage.jsx` | Currently shows "—". Phase 5: read from IndexedDB bottle cache. |
| Language selector | `profile/SettingsPage.jsx` | Currently English only. Phase 5: locale picker with i18next language switching. |
| Clear cache | `profile/SettingsPage.jsx` | Phase 5: clear IndexedDB bottle cache and service worker caches. |
| Toast notifications | Multiple pages | Inline success/error confirmations (export complete, link copied, etc.). |

## Architecture Decisions

### Zustand Store Per Domain
Each Phase 4 domain gets its own Zustand store (subscription, palate, notifications, commerce) rather than adding to the existing stores. This keeps each store focused and testable. The stores don't directly depend on each other — cross-domain coordination happens at the page level.

### Stripe Checkout (not Elements)
Matches the backend decision: we redirect to Stripe's hosted Checkout page rather than embedding Stripe Elements. This avoids PCI compliance complexity, handles 3D Secure automatically, and provides Apple/Google Pay. The tradeoff is less UI customisation, but subscription checkout doesn't need it.

### Notification Polling (not WebSocket)
The notification badge uses a 60-second polling interval rather than real-time WebSocket events. This is simpler and the notification count doesn't need sub-second freshness. Phase 5 can upgrade to WebSocket push if needed. The Page Visibility API pauses polling when the tab is hidden to avoid unnecessary requests.

### Discovery Feed Filtering
Pro users don't see sponsored content in the feed (Section 8.1: ad-free experience). This is handled client-side by filtering — the backend still returns sponsored items in the response. This allows the same API endpoint for both tiers while respecting the Pro benefit.

## File Structure (Phase 4 additions)

```
src/
├── services/
│   └── api.js              # Updated: palate, subscription, commerce, notifications endpoints
├── context/
│   ├── subscriptionStore.js # 🆕 Stripe subscription state
│   ├── palateStore.js       # 🆕 Palate Profile analytics state
│   ├── notificationStore.js # 🆕 Notification centre state
│   ├── commerceStore.js     # 🆕 Buy tab + discovery feed state
│   ├── authStore.js         # Phase 1 (unchanged)
│   ├── gameStore.js         # Phase 2 (unchanged)
│   ├── scanStore.js         # Phase 1 (unchanged)
│   └── clubStore.js         # Phase 3 (unchanged)
├── hooks/
│   ├── useNotificationBadge.js  # 🆕 Unread count polling
│   ├── useSocket.js             # Phase 3 (unchanged)
│   ├── useGameTimer.js          # Phase 2 (unchanged)
│   └── useOfflineSync.js        # Phase 2 (unchanged)
├── pages/
│   ├── palate/
│   │   ├── PalateLockedPage.jsx    # 🆕 Locked state + progress bar
│   │   ├── PalateProfilePage.jsx   # 🆕 Full analytics dashboard
│   │   └── PalateWrappedPage.jsx   # 🆕 Shareable card
│   ├── commerce/
│   │   ├── BuyPage.jsx             # 🆕 Affiliate links
│   │   └── DiscoveryPage.jsx       # 🆕 Sponsored + organic feed
│   ├── profile/
│   │   ├── ProfilePage.jsx         # 🆕 User profile + stats
│   │   ├── SettingsPage.jsx        # 🆕 All settings
│   │   ├── SubscriptionPage.jsx    # 🆕 Pro subscription
│   │   └── NotificationsPage.jsx   # 🆕 Notification centre
│   ├── club/                        # Phase 3 (unchanged)
│   ├── game/                        # Phase 2+3 (unchanged)
│   └── PlaceholderPages.jsx         # Updated: only ForgotPasswordPage remains
├── i18n/
│   ├── en.json                      # Updated: merge with en-phase4.json
│   └── en-phase4.json               # 🆕 Phase 4 translation keys
└── AppRouter.jsx                    # Updated: Phase 4 routes
```

## Next Phases

- [ ] **Phase 5 (Weeks 18–20):** PWA optimisation, offline hardening, QA, soft launch, public release
