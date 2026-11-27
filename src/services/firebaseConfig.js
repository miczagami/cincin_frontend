/**
 * The app's Firebase project: public identifiers baked in at build time from the
 * VITE_FIREBASE_* variables. Both the page (services/pushService.js) and the
 * service worker (sw.js) read it, so the two always agree on the project.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Without every value set at build time, the app has no push. */
export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);
