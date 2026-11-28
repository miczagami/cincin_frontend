/**
 * What the service worker's API caches keep once a player leaves: on a shared device the next
 * player must never be served the last one's API responses.
 *
 * Runs against the pwa project's production build, which calls the app's own /api.
 */
import { test as base, expect } from '@playwright/test';
import { signIn, api, BOTTLE_ID } from '../e2e/helpers';
import { controllingWorker } from './helpers';

// player: the seeded host, signed in, in a page the worker controls
const test = base.extend({
  player: async ({ browser }, use) => {
    const page = await signIn(browser, 'host@test.com');
    await controllingWorker(page);
    await use(page);
    await page.context().close();
  },
});

/** Wait until the worker has cached `path` (Workbox writes the cache after it answers the page). */
async function cached(page, path) {
  await expect.poll(() => page.evaluate(async (path) => Boolean(await caches.match(path)), path)).toBe(true);
}

/** Fetch `paths` (under /api) as the signed-in player, and wait until the worker has cached each one. */
async function fetchAndCache(page, paths) {
  for (const path of paths) {
    await api(page, 'GET', path.replace(/^\/api/, ''));
    await cached(page, path);
  }
}

/**
 * Log out from Settings, as a player does, and wait for the signed-out screen. The app goes to
 * /auth before logout finishes (and bounces via Home until it has), so the URL alone isn't enough:
 * the welcome screen only shows once the player is fully signed out.
 */
async function logOut(page) {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Log Out' }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
}

/** Which of `paths` the worker can still answer while the device is offline. */
async function servedOffline(page, paths) {
  await page.context().setOffline(true);
  const served = await page.evaluate(async (paths) => {
    const answered = [];
    for (const path of paths) {
      try { await fetch(path); answered.push(path); } catch { /* nothing cached to answer with */ }
    }
    return answered;
  }, paths);
  await page.context().setOffline(false);
  return served;
}

test("after a player logs out, the worker serves none of their API responses offline", async ({ player: page }) => {
  const theirs = ['/api/users/me', '/api/clubs'];
  await fetchAndCache(page, theirs);

  await logOut(page);

  await expect.poll(() => servedOffline(page, theirs)).toEqual([]);
});

// Published bottles and the taxonomy belong to no player
const SHARED = [`/api/bottles/${BOTTLE_ID}/cache`, '/api/scan/taxonomy'];

test('logging out keeps the bottles and taxonomy fetched for offline play', async ({ player: page }) => {
  await fetchAndCache(page, SHARED);

  await logOut(page);

  expect(await servedOffline(page, SHARED)).toEqual(SHARED);
});

test("Settings' Clear cache empties every API cache the worker keeps", async ({ player: page }) => {
  const everything = ['/api/users/me', '/api/clubs', ...SHARED];
  await fetchAndCache(page, everything);

  await page.goto('/settings');
  await page.getByText('Clear cache', { exact: true }).click();

  await expect.poll(() => servedOffline(page, everything)).toEqual([]);
});

test('Clear cache also empties the bottles saved on the device for offline play', async ({ player: page }) => {
  await page.goto('/settings');
  // The Settings row: its label, then the count
  const cachedBottles = page.getByText('Cached bottles', { exact: true }).locator('xpath=../..');
  await expect(cachedBottles).toHaveText(/^Cached bottles\s*0$/);
  // Nothing in the app saves one yet, so put one where offline play keeps them (utils/offlineGame.js)
  await page.evaluate((id) => new Promise((resolve, reject) => {
    const open = indexedDB.open('cincin-offline');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('bottles', 'readwrite');
      tx.objectStore('bottles').put({ id, name: 'Saved bottle', lastUsed: Date.now(), cachedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  }), BOTTLE_ID);
  await page.reload();
  await expect(cachedBottles).toHaveText(/^Cached bottles\s*1$/);

  await page.getByText('Clear cache', { exact: true }).click();
  await expect(cachedBottles).toHaveText(/^Cached bottles\s*0$/);
  await page.reload();
  await expect(cachedBottles).toHaveText(/^Cached bottles\s*0$/);
});

test("a player's responses still on their way when they log out are not kept", async ({ player: page }) => {
  await page.goto('/settings');
  // One for each of the player's caches (profile-cache, api-cache)
  const late = ['/api/palate/progress', '/api/clubs'];
  // and one for a cache that keeps what it gets (taxonomy-cache), answered after them: once it is
  // cached, the worker has been through theirs
  const control = '/api/scan/taxonomy';
  // The server answers while the player is signed in, but the answers only reach the worker after they log out
  let deliver;
  const delivered = new Promise((resolve) => { deliver = resolve; });
  const reachedServer = [];
  const answeredWorker = [];
  for (const path of [...late, control]) {
    let reached;
    reachedServer.push(new Promise((resolve) => { reached = resolve; }));
    let answered;
    answeredWorker.push(new Promise((resolve) => { answered = resolve; }));
    await page.context().route(`**${path}`, async (route) => {
      const response = await route.fetch();
      reached(response.status());
      await delivered;
      // The control's answer goes last
      if (path === control) await Promise.all(answeredWorker.slice(0, late.length));
      await route.fulfill({ response });
      answered();
    });
  }
  // Not awaited: logging out reloads the page, which ends these calls on the page's side
  for (const path of [...late, control]) api(page, 'GET', path.replace(/^\/api/, '')).catch(() => {});
  expect(await Promise.all(reachedServer)).toEqual([200, 200, 200]);

  await page.getByRole('button', { name: 'Log Out' }).click();
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
  deliver();
  await Promise.all(answeredWorker);
  await cached(page, control);
  // Their answers don't go through setOffline
  await page.context().unrouteAll();

  expect(await servedOffline(page, late)).toEqual([]);
});

test("closing the app while the server is slow to log the player out still drops their API responses", async ({ player: page }) => {
  const theirs = ['/api/users/me', '/api/clubs'];
  await fetchAndCache(page, theirs);
  await page.context().route('**/api/auth/logout', () => {}); // never answered

  await page.goto('/settings');
  const loggingOut = page.waitForRequest('**/api/auth/logout');
  await page.getByRole('button', { name: 'Log Out' }).click();
  await loggingOut;
  await page.close();

  const next = await page.context().newPage();
  await next.goto('/auth');
  await controllingWorker(next);
  await next.context().unrouteAll({ behavior: 'ignoreErrors' });
  expect(await servedOffline(next, theirs)).toEqual([]);
});

test("responses fetched while the server is slow to log the player out aren't kept either", async ({ player: page }) => {
  let answerLogout;
  const logoutAnswered = new Promise((resolve) => { answerLogout = resolve; });
  await page.context().route('**/api/auth/logout', async (route) => { await logoutAnswered; await route.continue(); });

  await page.goto('/settings');
  const loggingOut = page.waitForRequest('**/api/auth/logout');
  await page.getByRole('button', { name: 'Log Out' }).click();
  await loggingOut;
  // The player is still signed in until the server answers, and the app keeps calling the API
  await fetchAndCache(page, ['/api/clubs']);
  answerLogout();
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();

  await page.context().unrouteAll({ behavior: 'ignoreErrors' });
  expect(await servedOffline(page, ['/api/clubs'])).toEqual([]);
});
