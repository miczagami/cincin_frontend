# CinCin — Priority 1 Changelog

## Overview

Priority 1 completes all functional stubs that block core user flows, as identified in the Phase 4 code review.

## Changes Summary

### 1. ForgotPasswordPage (was placeholder → fully implemented)

**File:** `src/pages/auth/ForgotPasswordPage.jsx` (NEW — replaces placeholder)

Three-step password reset flow:
- **Step 1:** Enter email → calls `POST /api/auth/password-reset/request`
- **Step 2:** Enter reset token (from email) + new password with validation → calls `POST /api/auth/password-reset`
- **Step 3:** Success confirmation with "Sign In" CTA

Features: Email validation, password policy enforcement (8+ chars, letters + numbers), show/hide password toggle, "try again" loop from Step 2 back to Step 1, all toast notifications.

**AppRouter change:** Replace the `ForgotPasswordPage` import from `PlaceholderPages` with the new dedicated component:
```diff
- import { ForgotPasswordPage } from './pages/PlaceholderPages';
+ import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
```

### 2. Inline Change Password Form (was stub → redirect, now inline form)

**Frontend:** `src/pages/profile/SettingsPage.jsx` (UPDATED)

The "Change password" row in Settings now expands to an inline form with:
- Current password field
- New password + confirm fields
- Show/hide toggle
- Password policy hint
- Cancel / Update buttons
- Validates before submit, shows field-level errors
- Social login accounts see a disabled state with explanation

**Backend additions** (add to existing files):

1. **`src/services/authService.js`** — add `changePassword(userId, { currentPassword, newPassword }, currentToken)`:
   - Verifies current password
   - Enforces password policy (8+ chars, letters + numbers)
   - Blocks social-only accounts
   - Invalidates all sessions except current
   - Returns success message

2. **`src/routes/auth.js`** — add `POST /api/auth/change-password` route (requireAuth)

3. **`src/validators/auth.js`** — add `changePasswordRules` validation

4. **`src/services/api.js`** (frontend) — add `auth.changePassword(currentPassword, newPassword)`

### 3. Toast Notification System (was stub → fully implemented)

**New files:**
- `src/context/toastStore.js` — Zustand store managing toast lifecycle
- `src/components/ui/ToastContainer.jsx` — Rendered toast UI component
- `src/hooks/useToast.js` — Convenience hook: `toast.success()`, `toast.error()`, `toast.info()`, `toast.warning()`

Features:
- Auto-dismiss (default 3.5s, configurable)
- Slide-in animation from top
- Manual dismiss via X button
- Four types: success (green), error (red), info (cyan), warning (orange)
- Stacks multiple toasts
- Accessible: `role="alert"`, `aria-live="polite"`
- Safe area aware (notched devices)
- Matches CinCin dark theme with `cin-*` colour tokens

**Integration:** Mount `<ToastContainer />` once in AppShell or root layout:
```jsx
import ToastContainer from '../components/ui/ToastContainer';

// In your layout component's return:
<>
  {children}
  <ToastContainer />
</>
```

**Pages now using toasts** (via SettingsPage update):
- Export data (success/error)
- B2B consent toggle (success/error)
- Anonymise history (success/error)
- Delete account (info/error)
- Change password (success/error)
- Notification preference toggle (success/error)
- Clear cache (success/info/error)
- Logout (info)

### 4. Cached Bottles Count + Clear Cache (was stub → implemented)

**File:** `src/pages/profile/SettingsPage.jsx` (UPDATED)

- **Cached bottles count:** Reads from IndexedDB via `getCachedBottles()` from `offlineGame.js` (already existed in Phase 2). Shows actual count instead of "—".
- **Clear cache:** Calls `clearBottleCache()` from `offlineGame.js` AND clears service worker caches (`caches.delete()` for cincin-* and workbox-* cache names). Shows loading state and toast confirmation.

No new IndexedDB utilities needed — the Phase 2 `offlineGame.js` already exports `getCachedBottles()` and `clearBottleCache()`.

## Files Manifest

### Frontend — New Files (4)
| File | Purpose |
|------|---------|
| `src/context/toastStore.js` | Toast notification Zustand store |
| `src/components/ui/ToastContainer.jsx` | Toast notification UI component |
| `src/hooks/useToast.js` | `useToast()` convenience hook |
| `src/pages/auth/ForgotPasswordPage.jsx` | Full password reset flow (3 steps) |

### Frontend — Updated Files (2)
| File | What Changed |
|------|-------------|
| `src/pages/profile/SettingsPage.jsx` | Inline change-password form, cached bottles count from IndexedDB, clear cache with SW cache purge, toast notifications on all actions |
| `src/pages/PlaceholderPages.jsx` | Removed ForgotPasswordPage (now has its own component) |

### Frontend — Import Changes (2)
| File | Change Needed |
|------|-------------|
| `src/AppRouter.jsx` | Change ForgotPasswordPage import from PlaceholderPages to `./pages/auth/ForgotPasswordPage` |
| `src/services/api.js` | Add `auth.changePassword()` method |

### Backend — Additions to Existing Files (3)
| File | What to Add |
|------|------------|
| `src/services/authService.js` | `changePassword()` function + add to exports |
| `src/routes/auth.js` | `POST /api/auth/change-password` route |
| `src/validators/auth.js` | `changePasswordRules` array + add to exports |

### AppShell Integration
Mount ToastContainer in your root layout:
```jsx
import ToastContainer from '../components/ui/ToastContainer';
// Add <ToastContainer /> at the end of your layout JSX
```

## Priority 1 Exit Criteria

| Item | Status |
|------|--------|
| ForgotPasswordPage fully functional (3-step flow) | ✅ |
| Change password inline form in Settings | ✅ |
| Toast notifications across Settings actions | ✅ |
| Cached bottles count reads from IndexedDB | ✅ |
| Clear cache clears IndexedDB + service worker caches | ✅ |
| Backend change-password endpoint | ✅ |
| No remaining placeholder pages | ✅ |
