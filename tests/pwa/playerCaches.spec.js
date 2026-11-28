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
  // The server answers while the player is signed in, but the answers only reach the worker after they log out
  let deliver;
  const delivered = new Promise((resolve) => { deliver = resolve; });
  const reachedServer = [];
  const answeredWorker = [];
  for (const path of late) {
    let reached;
    reachedServer.push(new Promise((resolve) => { reached = resolve; }));
    let answered;
    answeredWorker.push(new Promise((resolve) => { answered = resolve; }));
    await page.context().route(`**${path}`, async (route) => {
      const response = await route.fetch();
      reached(response.status());
      await delivered;
      await route.fulfill({ response });
      answered();
    });
  }
  // Not awaited: logging out reloads the page, which ends these calls on the page's side
  for (const path of late) api(page, 'GET', path.replace(/^\/api/, '')).catch(() => {});
  expect(await Promise.all(reachedServer)).toEqual([200, 200]);

  await page.getByRole('button', { name: 'Log Out' }).click();
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
  deliver();
  await Promise.all(answeredWorker);
  // Workbox writes the cache after it answers the page
  await page.waitForTimeout(1000);
  // Their answers don't go through setOffline
  await page.context().unrouteAll();

  expect(await servedOffline(page, late)).toEqual([]);
});
