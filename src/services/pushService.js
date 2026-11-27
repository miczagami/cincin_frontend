/**
 * Push Notification Service — Priority 3
 * Spec ref: Sections 10.1–10.3
 *
 * Client-side Firebase Cloud Messaging integration for the PWA.
 *
 * Responsibilities:
 *   - Initialise Firebase Messaging in the browser
 *   - Request notification permission from the user
 *   - Obtain FCM push token and register with backend
 *   - Handle foreground messages (show in-app toast)
 *   - Token refresh management
 *
 * Usage:
 *   import { initPushNotifications, requestPushPermission } from '../services/pushService';
 *
 *   // In App.jsx or AppShell after auth:
 *   useEffect(() => { initPushNotifications(); }, []);
 *
 *   // When user taps "Enable push" or during onboarding:
 *   const granted = await requestPushPermission();
 */

import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { notifications } from "./api";
import { firebaseConfig, firebaseConfigured } from "./firebaseConfig";

// VAPID key for web push (from Firebase Console → Cloud Messaging → Web Push certificates)
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Push needs a Firebase project configured at build time
const FIREBASE_CONFIGURED = firebaseConfigured && Boolean(VAPID_KEY);

// ─── Singleton state ───
let _app = null;
let _messaging = null;
let _currentToken = null;
let _onForegroundMessage = null; // Callback for foreground messages

/**
 * Check if the browser supports Firebase Messaging.
 * Returns false for Safari < 16.4, Firefox private mode, etc.
 */
export async function isPushSupported() {
  try {
    if (!FIREBASE_CONFIGURED) {
      console.info("[Push] Off: no Firebase project configured at build time");
      return false;
    }

    // Check Firebase-level support
    const firebaseSupported = await isSupported();
    if (!firebaseSupported) return false;

    // Check browser Notification API
    if (!("Notification" in window)) return false;

    // Check service worker support
    if (!("serviceWorker" in navigator)) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current permission state.
 * Returns 'granted' | 'denied' | 'default' | 'unsupported'
 */
export function getPermissionState() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Initialise Firebase Messaging.
 * Call once on app startup (after authentication).
 * Does NOT request permission — call requestPushPermission() for that.
 *
 * If permission was already granted, silently retrieves the token
 * and registers it with the backend.
 */
export async function initPushNotifications() {
  try {
    const supported = await isPushSupported();
    if (!supported) {
      console.log("[Push] Not supported in this browser");
      return false;
    }

    // Initialise Firebase
    _app = initializeApp(firebaseConfig);
    _messaging = getMessaging(_app);

    // Push arrives through the app's own service worker (src/sw.js)
    const swRegistration = await appServiceWorker();
    if (!swRegistration) {
      console.warn("[Push] No service worker controls the app");
      return false;
    }

    // If permission already granted, get token silently
    if (Notification.permission === "granted") {
      await acquireToken(swRegistration);
    }

    // Listen for foreground messages
    setupForegroundListener();


    console.log("[Push] Initialised successfully");
    return true;
  } catch (err) {
    console.error("[Push] Initialisation failed:", err.message);
    return false;
  }
}

/**
 * Request push notification permission from the user.
 * Call this when the user explicitly opts in (onboarding or settings).
 *
 * @returns {boolean} Whether permission was granted and token registered.
 */
export async function requestPushPermission() {
  try {
    const supported = await isPushSupported();
    if (!supported) {
      console.log("[Push] Not supported");
      return false;
    }

    // Ensure Firebase is initialised
    if (!_messaging) {
      const initialised = await initPushNotifications();
      if (!initialised) return false;
    }

    // Request browser notification permission
    const permission = await Notification.requestPermission();
    console.log("[Push] Permission result:", permission);

    if (permission !== "granted") {
      return false;
    }

    const swRegistration = await appServiceWorker();

    if (!swRegistration) {
      console.warn("[Push] No service worker registration found");
      return false;
    }

    // Acquire and register the token
    await acquireToken(swRegistration);
    return true;
  } catch (err) {
    console.error("[Push] Permission request failed:", err.message);
    return false;
  }
}

/**
 * Revoke push notifications — remove token from backend and unsubscribe.
 * Call on logout or when user disables push in settings.
 */
export async function revokePushNotifications() {
  try {
    if (_currentToken) {
      // Remove from backend
      await notifications.removePushToken({ token: _currentToken });
      console.log("[Push] Token removed from backend");
    }

    _currentToken = null;
    return true;
  } catch (err) {
    console.error("[Push] Revoke failed:", err.message);
    return false;
  }
}

/**
 * Set a callback for foreground messages.
 * Used by the notification store or toast system.
 *
 * @param {function} callback - (payload: { title, body, data }) => void
 */
export function onForegroundNotification(callback) {
  _onForegroundMessage = callback;
}

/**
 * Get the current FCM token (if available).
 */
export function getCurrentToken() {
  return _currentToken;
}

// ═══════════════════════════════════════════
//  INTERNAL HELPERS
// ═══════════════════════════════════════════

/**
 * The app's service worker registration (src/sw.js), which also receives push. A production
 * build always registers it, but only once the page has loaded, so wait for it to be ready.
 * The dev server has no worker: null.
 */
async function appServiceWorker() {
  if (!import.meta.env.PROD) return null;
  return navigator.serviceWorker.ready;
}

/**
 * Acquire FCM token and register with backend.
 */
async function acquireToken(swRegistration) {
  try {
    const token = await getToken(_messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      console.warn("[Push] No token received — permission may have been denied");
      return null;
    }

    // Only register if token changed
    if (token !== _currentToken) {
      _currentToken = token;

      // Detect platform
      const platform = detectPlatform();

      // Register with backend
      await notifications.registerPushToken({ token, platform });
      console.log(`[Push] Token registered (${platform}): ${token.slice(0, 20)}...`);
    }

    return token;
  } catch (err) {
    console.error("[Push] Token acquisition failed:", err.message);

    // If the error is about permission, don't retry
    if (err.code === "messaging/permission-blocked") {
      console.warn("[Push] Permission blocked by user");
    }

    return null;
  }
}

/**
 * Detect the platform for token registration.
 */
function detectPlatform() {
  const ua = navigator.userAgent || "";

  // Check if running as installed PWA
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  // iOS Safari 16.4+ supports push for installed PWAs
  if (/iPhone|iPad|iPod/.test(ua) && isStandalone) {
    // Register as web — iOS PWA push uses the web push standard,
    // not APNs. Native iOS app would register as "ios".
    return "web";
  }

  // Android — still uses FCM through the browser
  if (/Android/.test(ua)) return "android";

  // Desktop / other
  return "web";
}

/**
 * Set up listener for foreground push messages.
 * When the app is in the foreground, FCM delivers messages via
 * onMessage instead of showing a system notification.
 */
function setupForegroundListener() {
  if (!_messaging) return;

  onMessage(_messaging, (payload) => {
    console.log("[Push] Foreground message:", payload);

    const data = payload.data || {};
    const notification = payload.notification || {};

    const parsed = {
      title: notification.title || data.title || "CinCin",
      body: notification.body || data.body || "",
      type: data.type || "general",
      data,
    };

    // Dispatch to the registered callback (usually shows a toast)
    if (_onForegroundMessage) {
      _onForegroundMessage(parsed);
    }
  });
}

