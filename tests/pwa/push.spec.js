/**
 * Background push in the installed app: one service worker handles both offline
 * caching and push, its Firebase config comes from build variables, and a push
 * that arrives while the app is closed shows a notification that opens the app.
 *
 * Runs against a production build (see the pwa project in playwright.config.js):
 * service workers don't exist on the dev server.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { signIn } from '../e2e/helpers';
import { PWA_FIREBASE_ENV, PWA_OUT_DIR } from '../../playwright.config.js';

const PLACEHOLDERS = /YOUR_FIREBASE|YOUR_SENDER_ID|YOUR_VAPID_KEY|YOUR_APP_ID|your-project/;

/** Every JavaScript file a build ships, with its contents. */
function builtScripts(outDir = PWA_OUT_DIR) {
  const files = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) files.push({ name: path.relative(outDir, full), text: fs.readFileSync(full, 'utf8') });
  });
  walk(outDir);
  return files;
}

/** Sign in with notifications already allowed, so the app sets up push on load. */
async function signInWithPushAllowed(browser) {
  const page = await signIn(browser, 'host@test.com');
  await page.context().grantPermissions(['notifications']);
  const pushReady = page.waitForEvent('console', { predicate: (msg) => msg.text().includes('[Push] Initialised'), timeout: 20_000 });
  await page.reload();
  await expect(page).not.toHaveURL(/\/auth/);
  await pushReady;
  return page;
}

/** The script URL of the worker controlling the page, once one does. */
async function controllingWorker(page) {
  return page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
    return new URL(navigator.serviceWorker.controller.scriptURL).pathname;
  });
}

test('the app keeps one service worker, and it still serves the app offline', async ({ browser }) => {
  const page = await signInWithPushAllowed(browser);

  // Every worker the browser holds for the app (installing, waiting or active) is the app's own
  const workers = await page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistrations()).flatMap((r) => [r.installing, r.waiting, r.active])
      .filter(Boolean).map((w) => new URL(w.scriptURL).pathname));
  expect([...new Set(workers)]).toEqual(['/sw.js']);
  await page.reload();
  expect(await controllingWorker(page)).toBe('/sw.js');

  // Offline, a deep link still loads the app (the worker serves the app shell for it)
  await page.context().setOffline(true);
  await page.goto('/profile');
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.context().setOffline(false);
});

test('the build ships the Firebase config from its build variables, and no placeholders', () => {
  const scripts = builtScripts();
  const worker = scripts.find((file) => file.name === 'sw.js');

  // Each value appears as its own string literal (the sender ID is also part of the app ID)
  for (const name of ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID']) {
    expect(worker.text.includes(JSON.stringify(PWA_FIREBASE_ENV[`VITE_FIREBASE_${name}`])), `sw.js carries VITE_FIREBASE_${name}`).toBe(true);
  }
  expect(scripts.filter((file) => PLACEHOLDERS.test(file.text)).map((file) => file.name)).toEqual([]);
});

test('a build without Firebase config ships no placeholders', () => {
  test.setTimeout(180_000);
  const outDir = 'dist-pwa-unconfigured';
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('VITE_FIREBASE_')));
  execFileSync('npx', ['vite', 'build', '--outDir', outDir], { env, stdio: 'ignore' });

  expect(builtScripts(outDir).filter((file) => PLACEHOLDERS.test(file.text)).map((file) => file.name)).toEqual([]);
});

/** The worker's notifications, as its registration reports them. */
async function shownNotifications(context) {
  const worker = context.serviceWorkers().find((w) => w.url().endsWith('/sw.js'));
  return worker.evaluate(async () => (await self.registration.getNotifications())
    .map((n) => ({ title: n.title, body: n.body, icon: n.icon, link: n.data?.FCM_MSG?.fcmOptions?.link })));
}

/** Close the app, then deliver a push the way the browser's push service would. */
async function closeAppAndPush(page, baseURL, message) {
  const context = page.context();
  await expect.poll(() => controllingWorker(page)).toBe('/sw.js');

  // A blank tab to talk to the browser from, then close the app itself
  const devtoolsTab = await context.newPage();
  const cdp = await context.newCDPSession(devtoolsTab);
  const registrationId = new Promise((resolve) => cdp.on('ServiceWorker.workerRegistrationUpdated', ({ registrations }) => {
    const app = registrations.find((r) => r.scopeURL === `${baseURL}/`);
    if (app) resolve(app.registrationId);
  }));
  await cdp.send('ServiceWorker.enable');
  await page.close();
  // The app counts as closed once its worker sees no window (Firebase hands a push to an open app instead)
  const worker = context.serviceWorkers().find((w) => w.url().endsWith('/sw.js'));
  await expect.poll(() => worker.evaluate(async () => (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).length)).toBe(0);

  await cdp.send('ServiceWorker.deliverPushMessage', {
    origin: baseURL,
    registrationId: await registrationId,
    data: JSON.stringify({ from: PWA_FIREBASE_ENV.VITE_FIREBASE_MESSAGING_SENDER_ID, fcmMessageId: `test-${Date.now()}`, ...message }),
  });
  return devtoolsTab;
}

test('a push that arrives while the app is closed shows a notification with the app icon, linked to the app', async ({ browser, baseURL }) => {
  const page = await signInWithPushAllowed(browser);
  const context = page.context();

  // What Firebase delivers for the backend's game-invite push (notificationService.sendFcm)
  const link = `${baseURL}/game/join?code=ABC123`;
  const devtoolsTab = await closeAppAndPush(page, baseURL, {
    notification: { title: 'Game invite', body: 'Sam invited you to a game', icon: '/icon-192.png', badge: '/badge-72.png' },
    data: { type: 'game_invite', gameCode: 'ABC123' },
    fcmOptions: { link },
  });

  await expect.poll(() => shownNotifications(context)).toEqual([
    expect.objectContaining({ title: 'Game invite', body: 'Sam invited you to a game', link }),
  ]);
  const [{ icon }] = await shownNotifications(context);
  const iconResponse = await devtoolsTab.request.get(icon);
  expect(iconResponse.ok()).toBe(true);
  expect(iconResponse.headers()['content-type']).toContain('image/png');
});

test('a data-only push shows its own notification, with the app icon and the screen it opens', async ({ browser, baseURL }) => {
  const page = await signInWithPushAllowed(browser);
  const context = page.context();

  const devtoolsTab = await closeAppAndPush(page, baseURL, {
    data: { type: 'palate_updated', title: 'Palate updated', body: 'Your profile has new notes' },
  });

  await expect.poll(() => shownNotifications(context)).toEqual([
    expect.objectContaining({ title: 'Palate updated', body: 'Your profile has new notes' }),
  ]);
  const worker = context.serviceWorkers().find((w) => w.url().endsWith('/sw.js'));
  const [shown] = await worker.evaluate(async () => (await self.registration.getNotifications())
    .map((n) => ({ icon: n.icon, url: n.data?.url })));
  expect(shown.url).toBe('/palate/profile');
  const iconResponse = await devtoolsTab.request.get(shown.icon);
  expect(iconResponse.headers()['content-type']).toContain('image/png');
});

/**
 * Tap the worker's one notification (optionally one of its action buttons) and return where the
 * worker tried to open the app. Headless Chromium can't tap a real notification, so this dispatches
 * the click event inside the worker and records clients.openWindow instead of opening one.
 */
async function tapNotification(context, action = '') {
  const worker = context.serviceWorkers().find((w) => w.url().endsWith('/sw.js'));
  return worker.evaluate(async (tapAction) => {
    const [notification] = await self.registration.getNotifications();
    const opened = [];
    self.clients.openWindow = async (url) => { opened.push(url); return null; };
    const event = new NotificationEvent('notificationclick', { notification, action: tapAction });
    const pending = [];
    event.waitUntil = (promise) => pending.push(promise); // a script-made event can't extend itself
    self.dispatchEvent(event);
    await Promise.all(pending);
    return { opened, stillShown: (await self.registration.getNotifications()).length };
  }, action);
}

/** What the backend's game-invite push looks like once Firebase delivers it (notificationService.sendFCM). */
function gameInvitePush(baseURL) {
  return {
    notification: {
      title: 'Game invite', body: 'Sam invited you to a game', icon: '/icon-192.png', badge: '/badge-72.png',
      actions: [{ action: 'join', title: 'Join Game' }, { action: 'dismiss', title: 'Later' }],
    },
    data: { type: 'game_invite', gameCode: 'ABC123' },
    fcmOptions: { link: `${baseURL}/notifications` },
  };
}

test('"Join Game" on a game-invite notification opens the join screen for that game', async ({ browser, baseURL }) => {
  const page = await signInWithPushAllowed(browser);
  const context = page.context();
  await closeAppAndPush(page, baseURL, gameInvitePush(baseURL));
  await expect.poll(() => shownNotifications(context)).toHaveLength(1);

  const { opened, stillShown } = await tapNotification(context, 'join');

  expect(opened).toEqual([`${baseURL}/game/join?code=ABC123`]);
  expect(stillShown).toBe(0);
});

test('"Later" on a game-invite notification just closes it', async ({ browser, baseURL }) => {
  const page = await signInWithPushAllowed(browser);
  const context = page.context();
  await closeAppAndPush(page, baseURL, gameInvitePush(baseURL));
  await expect.poll(() => shownNotifications(context)).toHaveLength(1);

  const { opened, stillShown } = await tapNotification(context, 'dismiss');

  expect(opened).toEqual([]);
  expect(stillShown).toBe(0);
});

test('a notification only ever opens the app, never another site', async ({ browser, baseURL }) => {
  const page = await signInWithPushAllowed(browser);
  const context = page.context();
  await closeAppAndPush(page, baseURL, { data: { type: 'general', title: 'Hi', url: 'https://example.org/elsewhere' } });
  await expect.poll(() => shownNotifications(context)).toHaveLength(1);

  const { opened } = await tapNotification(context);

  expect(opened).toEqual([`${baseURL}/`]);
});

test("a club notification opens that club's screen, whatever the club ID holds", async ({ browser, baseURL }) => {
  const page = await signInWithPushAllowed(browser);
  const context = page.context();
  await closeAppAndPush(page, baseURL, { data: { type: 'club_member_joined', title: 'New member', clubId: '../../settings' } });
  await expect.poll(() => shownNotifications(context)).toHaveLength(1);

  const { opened } = await tapNotification(context);

  expect(opened).toEqual([`${baseURL}/clubs/..%2F..%2Fsettings`]);
});

test("push still sets up when the app's first load runs before its worker has registered", async ({ browser, baseURL, request }) => {
  // A player already signed in, with notifications allowed, opening the app in a fresh browser:
  // the app sets up push on mount, before the page has finished loading and registered the worker
  const login = await (await request.post(`${baseURL}/api/auth/login`, { data: { email: 'host@test.com', password: 'TestPass1' } })).json();
  const context = await browser.newContext();
  await context.grantPermissions(['notifications']);
  await context.addInitScript(({ accessToken, refreshToken }) => {
    sessionStorage.setItem('cin_access_token', accessToken);
    sessionStorage.setItem('cin_refresh_token', refreshToken);
  }, login);
  const page = await context.newPage();
  const pushOutcome = page.waitForEvent('console', {
    predicate: (msg) => /\[Push\] (Initialised|No service worker)/.test(msg.text()),
    timeout: 20_000,
  });

  await page.goto('/');

  expect((await pushOutcome).text()).toContain('[Push] Initialised');
});
