// Browser smoke tests — see tests/e2e/README.md
import { defineConfig, devices } from '@playwright/test';

// The service worker only exists in a production build, so the pwa project runs against one,
// built with stand-in Firebase values (the browser never reaches Firebase in these tests).
export const PWA_FIREBASE_ENV = {
  VITE_FIREBASE_API_KEY: 'test-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'cincin-test.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'cincin-test',
  VITE_FIREBASE_STORAGE_BUCKET: 'cincin-test.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789012',
  VITE_FIREBASE_APP_ID: '1:123456789012:web:0123456789abcdef',
  VITE_FIREBASE_VAPID_KEY: 'test-vapid-key',
};
export const PWA_OUT_DIR = 'dist-pwa-test';

export default defineConfig({
  // The flows share one seeded backend database
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Pixel 7'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'smoke', testDir: './tests/e2e', use: { baseURL: 'http://localhost:3000' } },
    { name: 'pwa', testDir: './tests/pwa', use: { baseURL: 'http://localhost:4173' } },
  ],
  // Both servers proxy /api and /socket.io to the backend on :4000.
  // The backend itself must already be running against a seeded database.
  webServer: [
    {
      command: 'npm run dev -- --port 3000 --strictPort',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npx vite build --outDir ${PWA_OUT_DIR} && npx vite preview --outDir ${PWA_OUT_DIR} --port 4173 --strictPort`,
      url: 'http://localhost:4173',
      env: PWA_FIREBASE_ENV,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
