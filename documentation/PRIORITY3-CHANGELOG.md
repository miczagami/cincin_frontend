# Priority 3 — Production Notification Infrastructure

## Summary

Priority 3 replaces all notification stubs from Phase 4 with production SDK integrations:

- **Firebase Cloud Messaging (FCM)** — real push delivery for Web (PWA) and Android
- **Apple Push Notification Service (APNs)** — real push delivery for iOS native
- **SendGrid HTML email templates** — 6 branded, dark-theme email designs matching CinCin brand

---

## Files Delivered

### Backend (drop-in replacements)

| File | Replaces | Description |
|------|----------|-------------|
| `backend/notificationService.js` | `src/services/notificationService.js` | Full production notification service with real FCM, APNs, and SendGrid SDK calls |

### Frontend (new files + 1 updated)

| File | Location | Description |
|------|----------|-------------|
| `frontend/firebase-messaging-sw.js` | `public/firebase-messaging-sw.js` | **NEW** — Firebase Messaging service worker for background push |
| `frontend/pushService.js` | `src/services/pushService.js` | **NEW** — Client-side FCM SDK integration (init, permission, token, foreground) |
| `frontend/usePushNotifications.js` | `src/hooks/usePushNotifications.js` | **NEW** — React hook connecting push service to store + toasts |
| `frontend/notificationStore.js` | `src/context/notificationStore.js` | **UPDATED** — Removed stub comments, added `handleForegroundPush()` |

### Configuration

| File | Description |
|------|-------------|
| `.env.priority3` | Environment variable template with all required keys |

---

## Integration Guide

### Step 1: Install npm dependencies

**Backend:**
```bash
cd cincin-backend
npm install firebase-admin @parse/node-apn @sendgrid/mail
```

**Frontend:**
```bash
cd cincin-frontend
npm install firebase
```

### Step 2: Drop in files

```bash
# Backend
cp backend/notificationService.js  ../cincin-backend/src/services/notificationService.js

# Frontend
cp frontend/firebase-messaging-sw.js  ../cincin-frontend/public/firebase-messaging-sw.js
cp frontend/pushService.js            ../cincin-frontend/src/services/pushService.js
cp frontend/usePushNotifications.js   ../cincin-frontend/src/hooks/usePushNotifications.js
cp frontend/notificationStore.js      ../cincin-frontend/src/context/notificationStore.js
```

### Step 3: Environment variables

Add all variables from `.env.priority3` to your `.env` file.

**Firebase setup:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project (or use existing)
3. Enable Cloud Messaging
4. **Backend:** Project Settings → Service Accounts → Generate New Private Key → save as `FIREBASE_SERVICE_ACCOUNT`
5. **Frontend:** Project Settings → General → Your Apps → Add Web App → copy config values to `VITE_FIREBASE_*`
6. **Frontend:** Cloud Messaging → Web Push Certificates → Generate Key Pair → copy to `VITE_FIREBASE_VAPID_KEY`

**APNs setup (iOS only — skip for PWA-only launch):**
1. Apple Developer → Certificates, Identifiers & Profiles → Keys → Create a new key with APNs enabled
2. Download the `.p8` file → set path as `APNS_KEY_PATH`
3. Copy Key ID → `APNS_KEY_ID`
4. Copy Team ID → `APNS_TEAM_ID`

**SendGrid setup:**
1. Create account at [sendgrid.com](https://sendgrid.com)
2. Settings → API Keys → Create API Key (Full Access) → `SENDGRID_API_KEY`
3. Verify a sender identity for `EMAIL_FROM_ADDRESS`
4. **(Optional)** Create Dynamic Templates for each email type and set the `SG_TEMPLATE_*` IDs

### Step 4: Wire push into the app shell

In your main `AppShell.jsx` (or equivalent layout component), add:

```jsx
import usePushNotifications from '../hooks/usePushNotifications';

export default function AppShell({ children }) {
  // Initialise push notifications — auto-registers token if permission already granted
  const { isSupported, permissionState } = usePushNotifications();

  // ... existing code ...
}
```

### Step 5: Expose React Router navigate for notification click routing

In your `AppRouter.jsx` or wherever you create the router:

```jsx
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function NavigateExposer() {
  const navigate = useNavigate();
  useEffect(() => {
    window.__ROUTER_NAVIGATE__ = navigate;
    return () => { delete window.__ROUTER_NAVIGATE__; };
  }, [navigate]);
  return null;
}

// Add <NavigateExposer /> inside your <Router> component
```

### Step 6: Update Settings push toggle

In `SettingsPage.jsx`, the push notification toggle can now use the real hook:

```jsx
import usePushNotifications from '../../hooks/usePushNotifications';

// Inside the component:
const { isSupported, permissionState, requestPermission, revoke } = usePushNotifications();

// Toggle handler:
const handlePushToggle = async (enabled) => {
  if (enabled) {
    await requestPermission();
  } else {
    await revoke();
  }
};

// Render:
<Toggle
  disabled={!isSupported || permissionState === 'denied'}
  checked={permissionState === 'granted'}
  onChange={handlePushToggle}
/>
{permissionState === 'denied' && (
  <p className="text-xs text-cin-muted mt-1">
    Push notifications are blocked. Enable them in your browser settings.
  </p>
)}
```

### Step 7: Update vite.config.js (if not already done)

Ensure the Firebase Messaging service worker is NOT processed by vite-plugin-pwa. It should be served as a static file from `/public`:

```js
// vite.config.js — the file public/firebase-messaging-sw.js is automatically
// served at /firebase-messaging-sw.js by Vite. No additional config needed
// as long as it's in the public/ directory.
```

### Step 8: Graceful shutdown (backend)

In your server shutdown handler (e.g. `server.js`):

```js
const notificationService = require('./services/notificationService');

process.on('SIGTERM', async () => {
  await notificationService.shutdown();
  // ... other cleanup ...
  process.exit(0);
});
```

---

## Architecture Notes

### FCM → Web + Android, APNs → iOS

The backend `sendPushNotification()` routes by platform:
- `platform === 'ios'` → APNs via `@parse/node-apn`
- `platform === 'web'` or `'android'` → FCM via `firebase-admin`

The frontend PWA always registers as platform `'web'` (even on Android), because the browser handles FCM natively. The `'ios'` and `'android'` platforms are reserved for future native apps that register tokens through their own SDKs.

### Two Service Workers

The PWA now has two service workers:
1. **Workbox SW** (from vite-plugin-pwa) — handles offline caching, runtime caching strategies
2. **Firebase Messaging SW** (`firebase-messaging-sw.js`) — handles background push messages

These coexist fine because they're registered at different scopes/URLs. Firebase's `getToken()` explicitly receives the SW registration to use.

### Email Template Hierarchy

1. **SendGrid Dynamic Templates** (if `SG_TEMPLATE_*` env vars are set) — use these for designer-customised templates with drag-and-drop editor
2. **Inline HTML Templates** (fallback) — 6 CinCin-branded dark theme templates built into `notificationService.js`

The inline templates are fully functional production emails with:
- Dark theme (#0A0A0A background, #141414 content card)
- CinCin branding with cyan (#22D3EE) accent colour
- Responsive layout (max-width 600px, mobile-friendly)
- Outlook/MSO compatibility
- Stat cards, champion spotlights, CTA buttons
- Manage preferences + unsubscribe links in footer
- Open and click tracking enabled

### Development Mode

When `NODE_ENV=development` and SDK credentials are not set:
- FCM → console logs `[FCM Mock]`
- APNs → console logs `[APNs Mock]`
- Email → console logs `[Email Mock]`

No external calls are made. This preserves the existing dev experience.

---

## Test Checklist

| Scenario | Expected |
|----------|----------|
| Dev mode, no credentials | Mock logs in console, no errors |
| FCM with valid token | Push delivered to Chrome/Android |
| FCM with expired token | Token auto-removed from DB, error logged |
| APNs with valid token | Push delivered to iOS device |
| APNs with expired token | Token auto-removed (410 Gone) |
| SendGrid with template ID | Dynamic template rendered |
| SendGrid without template ID | Inline HTML template sent |
| User opts out of category | In-app notification only, no push/email |
| Foreground push received | Toast shown, badge count incremented |
| Background push received | System notification shown |
| Notification click (background) | App opens, navigates to deep link |
| Notification click (foreground) | React Router navigates to deep link |
| Browser denies permission | `permissionState === 'denied'`, toggle disabled |
| Logout | Push token removed from backend |
| Payment failed email | Red CTA button, urgent styling |
| Monthly Wrapped email | Stat cards, strength/weakness, brand styling |
| Season End email | Champion spotlight with trophy |
