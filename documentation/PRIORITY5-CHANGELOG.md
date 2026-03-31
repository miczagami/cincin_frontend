# CinCin — Priority 5 Changelog: Offline Hardening

## Overview

Priority 5 implements offline hardening for the CinCin PWA (Phase 5, Week 18).
The codebase now caches critical user data in IndexedDB for offline viewing,
adds an idempotency guard to the sync queue, provides a browsable cached bottles
list with individual delete, and tunes the Workbox service worker caching
strategies for taxonomy and bottle data.

**No backend changes are required.** This is entirely frontend work.

---

## What's New

### 1. Offline Data Cache Layer (`src/utils/offlineDataCache.js`) — NEW

A generic IndexedDB persistence layer that stores JSON blobs in a new
`cached-data` object store (DB_VERSION bumped to 3). Provides write-through
caching for:

- **Palate Profile** (all-time and recent views)
- **Palate Progress** (unlock progress bar)
- **Game History** (first page / last-fetched snapshot)
- **User Profile** (summary data)

Each cached entry stores the data, a `cachedAt` timestamp, and an `isCached`
flag so the UI can display staleness indicators.

Also exposes `getOfflineDataCacheStats()` for the Settings page to show
the number and approximate size of cached data entries.

### 2. Cached Palate Profile (`src/context/palateStore.js`) — UPDATED

`fetchProfile()` and `fetchProgress()` now follow a write-through pattern:

1. Attempt network request
2. On success → cache the response in IndexedDB, serve fresh data
3. On failure → attempt to serve from IndexedDB cache
4. No cache → show error message

New store fields: `isCachedData` (boolean) and `lastCachedAt` (timestamp)
allow the UI to render a staleness banner.

### 3. Cached Game History (`src/hooks/useGameHistory.js`) — NEW

A standalone hook that wraps the existing `gamesApi.history()` call with
the same write-through caching pattern. Caches the first page (offset=0)
of game history for offline viewing.

Usage:
```jsx
import useGameHistory from '../hooks/useGameHistory';
const { history, isLoading, isCachedData, lastCachedAt, error, fetchHistory } = useGameHistory();
```

This is provided as a hook rather than modifying the 300+ line gameStore,
keeping the offline concern separate from the game lifecycle.

### 4. Sync Queue Idempotency (`src/hooks/useOfflineSync.js`) — UPDATED

The offline sync hook now includes three layers of deduplication:

1. **In-flight Set** — tracks `localId`s currently being synced, preventing
   duplicate attempts in multi-tab or rapid-reconnect scenarios.
2. **Pre-sync check** — skips entries already marked `synced` in IndexedDB.
3. **409 handling** — if the server returns 409 (conflict), treats it as
   success and marks the game synced locally.

Also adds a 1.5s delay on the `online` event before syncing to let the
network stabilise after reconnection.

### 5. Cached Bottles List Page (`src/pages/settings/CachedBottlesPage.jsx`) — NEW

A full-page view of all cached bottles with:

- Bottle name, category pill, vintage, cached date, approximate size
- **Swipe-to-delete** on touch devices (slide left to reveal delete button)
- **Desktop delete button** (visible on non-touch via `hidden sm:flex`)
- Clear All button in the summary bar
- Empty state with explanation text

Navigate to via Settings → "View cached bottles" row.

### 6. Offline Banner Component (`src/components/ui/OfflineBanner.jsx`) — NEW

Two components:

- `<OfflineBanner>` — contextual banner shown when data is served from cache.
  Shows staleness time ("Cached 2h ago"), refresh button, and dismiss.
- `<GlobalOfflineBanner>` — fixed top banner that auto-shows when
  `navigator.onLine` is false and auto-hides when back online.

### 7. Workbox Caching Strategies (`vite.config.js`) — UPDATED

Three new runtime caching rules added ahead of the generic API rule:

| Pattern | Strategy | Cache Name | TTL |
|---------|----------|------------|-----|
| `/api/taxonomy` | StaleWhileRevalidate | `taxonomy-cache` | 7 days |
| `/api/bottles/:id/cache` | CacheFirst | `bottle-cache` | 30 days |
| `/api/(palate\|users/me)` | NetworkFirst | `profile-cache` | 24 hours |

The generic `api-cache` maxEntries increased from 50 to 100.

### 8. offlineGame.js DB_VERSION Bump (`src/utils/offlineGame.js`) — UPDATED

DB_VERSION bumped from 2 to 3. The `onupgradeneeded` handler now creates
the `cached-data` store alongside the existing `bottles` and `pending-games`
stores. All existing data is preserved during the upgrade.

### 9. i18n Keys (`src/i18n/en-priority5.json`) — NEW

Translation keys for offline features. Merge into `en.json`.

---

## Files Manifest

### New Files (5)

| File | Destination | Purpose |
|------|-------------|---------|
| `offlineDataCache.js` | `src/utils/offlineDataCache.js` | IndexedDB cache layer for profile/history |
| `useGameHistory.js` | `src/hooks/useGameHistory.js` | Game history hook with offline fallback |
| `CachedBottlesPage.jsx` | `src/pages/settings/CachedBottlesPage.jsx` | Browsable cached bottles list |
| `OfflineBanner.jsx` | `src/components/ui/OfflineBanner.jsx` | Offline/cached data banner components |
| `en-priority5.json` | `src/i18n/en-priority5.json` | i18n keys (merge into en.json) |

### Updated Files (5)

| File | Destination | What Changed |
|------|-------------|-------------|
| `palateStore.js` | `src/context/palateStore.js` | Write-through caching + isCachedData/lastCachedAt |
| `useOfflineSync.js` | `src/hooks/useOfflineSync.js` | Idempotency guard + 409 handling + reconnect delay |
| `PalateProfilePage.jsx` | `src/pages/palate/PalateProfilePage.jsx` | OfflineBanner integration |
| `offlineGame.js` | `src/utils/offlineGame.js` | DB_VERSION 3 + cached-data store |
| `vite.config.js` | `vite.config.js` | Taxonomy/bottle/profile Workbox strategies |

---

## Integration Steps

### 1. Drop in files

Copy new files to their destinations. Replace updated files.

### 2. Add route for CachedBottlesPage

In `AppRouter.jsx`, add:

```jsx
import CachedBottlesPage from './pages/settings/CachedBottlesPage';

// Inside your route config:
<Route path="/settings/cached-bottles" element={<CachedBottlesPage />} />
```

### 3. Add navigation from SettingsPage

In `SettingsPage.jsx`, find the cached bottles row and add navigation:

```jsx
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();

// In the cached bottles section, add a "View" button:
<button onClick={() => navigate('/settings/cached-bottles')}>
  View cached bottles
</button>
```

### 4. Mount GlobalOfflineBanner in AppShell

In your root layout (`AppShell.jsx`):

```jsx
import { GlobalOfflineBanner } from '../components/ui/OfflineBanner';

// At the top of your layout JSX:
<>
  <GlobalOfflineBanner />
  {children}
  <ToastContainer />
</>
```

### 5. Merge i18n keys

Merge `en-priority5.json` into your main `en.json` file under the
`settings` and `offline` namespaces.

### 6. Use useGameHistory in any game history view

If you have a dedicated game history page or tab:

```jsx
import useGameHistory from '../hooks/useGameHistory';
import { OfflineBanner } from '../components/ui/OfflineBanner';

function GameHistoryPage() {
  const { history, isLoading, isCachedData, lastCachedAt, error, fetchHistory } = useGameHistory();

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <>
      <OfflineBanner isCachedData={isCachedData} lastCachedAt={lastCachedAt} onRefresh={fetchHistory} />
      {/* render history list */}
    </>
  );
}
```

---

## Test Checklist

| Scenario | Expected |
|----------|----------|
| Open Palate Profile online | Fresh data displayed, no banner |
| Open Palate Profile, then go offline, reload | Cached data shown with amber "Viewing offline data" banner |
| Click "Refresh" on offline banner while online | Fresh data replaces cached, banner disappears |
| Dismiss offline banner | Banner hides, does not reappear until next cache serve |
| Open game history online | Fresh data, cached to IndexedDB |
| Open game history offline | Cached first page shown with offline banner |
| Game history as Free user | "Pro feature" error, no cache attempt |
| Sync 2 pending games on reconnect | Both synced, count goes to 0 |
| Sync same game from two tabs | First tab syncs, second tab skips (in-flight guard) |
| Server returns 409 for duplicate sync | Treated as success, game marked synced |
| Navigate to Settings → View cached bottles | Full list with bottle details |
| Swipe left on a bottle (touch) | Delete button revealed, tap to remove |
| Click delete icon (desktop) | Bottle removed, toast shown |
| Clear All on cached bottles page | All bottles removed, empty state shown |
| Go airplane mode | Red "You're offline" banner at top |
| Come back online | Red banner disappears |
| Workbox: visit taxonomy endpoint, go offline, revisit | Cached response served instantly (StaleWhileRevalidate) |
| Workbox: scan a bottle (cache endpoint), go offline | Bottle data available from service worker cache |
| IndexedDB upgrade from v2 to v3 | Existing bottles and pending games preserved, new store created |

---

## Priority 5 Exit Criteria

| Item | Status |
|------|--------|
| Palate Profile viewable offline (cached in IndexedDB) | ✅ |
| Game history viewable offline (first page cached) | ✅ |
| Sync queue idempotency check (localId dedup + 409 handling) | ✅ |
| Cached bottles list view with individual delete | ✅ |
| Workbox: taxonomy uses StaleWhileRevalidate | ✅ |
| Workbox: bottle cache uses CacheFirst | ✅ |
| Offline indicators (banners) on cached data views | ✅ |
| Global offline banner when navigator.onLine is false | ✅ |
| DB upgrade preserves existing data | ✅ |

---

*CinCin Priority 5 — Offline Hardening · 23 March 2026*
