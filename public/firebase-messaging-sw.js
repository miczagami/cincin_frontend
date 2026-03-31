// ═══════════════════════════════════════════════════════════════
//  FIREBASE MESSAGING SERVICE WORKER — Priority 3
//  Spec ref: Sections 10.1–10.2
//
//  This file must live at the root of the public directory
//  (public/firebase-messaging-sw.js) so Firebase can register it
//  at the correct scope.
//
//  Handles:
//    - Background push notifications when app is not in foreground
//    - Notification click routing to deep links
//    - Badge management
//
//  The existing Workbox service worker (from vite-plugin-pwa) handles
//  offline caching. This file is a *separate* service worker specifically
//  for Firebase Cloud Messaging. Firebase SDK's getToken() will register
//  this worker automatically when called with { serviceWorkerRegistration }.
// ═══════════════════════════════════════════════════════════════

/* eslint-env serviceworker */
/* global firebase */

// Import Firebase scripts for service worker
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// ─── Firebase Config ───
// These values are PUBLIC and safe to embed (they identify the project,
// not grant access). The actual auth happens server-side via the
// service account. Replace these with your Firebase project values.
firebase.initializeApp({
  apiKey: self.__FIREBASE_CONFIG__?.apiKey || "YOUR_FIREBASE_API_KEY",
  authDomain: self.__FIREBASE_CONFIG__?.authDomain || "your-project.firebaseapp.com",
  projectId: self.__FIREBASE_CONFIG__?.projectId || "your-project-id",
  storageBucket: self.__FIREBASE_CONFIG__?.storageBucket || "your-project.appspot.com",
  messagingSenderId: self.__FIREBASE_CONFIG__?.messagingSenderId || "YOUR_SENDER_ID",
  appId: self.__FIREBASE_CONFIG__?.appId || "YOUR_APP_ID",
});

const messaging = firebase.messaging();

// ─── Background Message Handler ───
// Fires when a push arrives while the app is not in the foreground.
// FCM data-only messages (no notification key) ALWAYS come here.
// FCM notification messages come here ONLY when the app is backgrounded.
messaging.onBackgroundMessage((payload) => {
  console.log("[FCM SW] Background message received:", payload);

  const data = payload.data || {};
  const notification = payload.notification || {};

  const title = notification.title || data.title || "CinCin";
  const body = notification.body || data.body || "";

  const options = {
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    vibrate: [100, 50, 100],
    tag: data.type || "general", // Collapse same-type notifications
    renotify: true,
    data: {
      // Pass through for notificationclick handler
      type: data.type,
      url: data.url || buildUrl(data),
      ...data,
    },
    actions: getActions(data.type),
  };

  return self.registration.showNotification(title, options);
});

// ─── Notification Click Handler ───
self.addEventListener("notificationclick", (event) => {
  console.log("[FCM SW] Notification clicked:", event.notification.tag);

  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action; // From actionable notification buttons
  let url = data.url || "/";

  // Handle specific action buttons
  if (action === "join" && data.gameCode) {
    url = `/join/${data.gameCode}`;
  } else if (action === "dismiss") {
    return; // Just close the notification
  }

  // Focus existing window or open new one
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window and navigate
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            client.postMessage({
              type: "NOTIFICATION_CLICK",
              payload: data,
              url,
            });
            return client;
          }
        }
        // No existing window — open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// ─── Notification Close Handler ───
self.addEventListener("notificationclose", (event) => {
  // Could track dismissal analytics here
  console.log("[FCM SW] Notification dismissed:", event.notification.tag);
});

// ─── Helper: Build URL from notification data ───
function buildUrl(data) {
  if (!data || !data.type) return "/notifications";

  switch (data.type) {
    case "game_invite":
      return `/join/${data.gameCode || ""}`;
    case "club_game_approved":
    case "club_game_rejected":
    case "club_member_joined":
    case "club_approval":
      return `/clubs/${data.clubId || ""}`;
    case "season_ending":
    case "season_ended":
      return `/clubs/${data.clubId || ""}/season`;
    case "palate_updated":
      return "/palate/profile";
    case "monthly_palate_wrapped":
      return "/palate/wrapped";
    case "weekly_standings":
      return `/clubs/${data.clubId || ""}`;
    case "payment_failed":
      return "/subscription";
    default:
      return "/notifications";
  }
}

// ─── Helper: Get actionable notification buttons ───
function getActions(type) {
  switch (type) {
    case "game_invite":
      return [
        { action: "join", title: "Join Game", icon: "/icons/action-join.png" },
        { action: "dismiss", title: "Later" },
      ];
    case "club_approval":
      return [
        { action: "approve", title: "Review", icon: "/icons/action-approve.png" },
      ];
    default:
      return [];
  }
}
