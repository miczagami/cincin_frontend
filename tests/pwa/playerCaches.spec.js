/**
 * What the service worker's API caches keep once a player leaves: on a shared device the next
 * player must never be served the last one's API responses.
 *
 * Runs against the pwa project's production build, which calls the app's own /api.
 */
import { test, expect } from '@playwright/test';
import { signIn, BOTTLE_ID } from '../e2e/helpers';
import { controllingWorker } from './helpers';

/** Fetch `paths` as the signed-in player, and wait until the worker has cached each one. */
async function fetchAndCache(page, paths) {
  await page.evaluate(async (paths) => {
    const headers = { Authorization: `Bearer ${sessionStorage.getItem('cin_access_token')}` };
    for (const path of paths) {
      if (!(await fetch(path, { headers })).ok) throw new Error(`${path} failed`);
      // Workbox writes the cache after it answers the page
      for (let tries = 0; !(await caches.match(path)); tries += 1) {
        if (tries === 50) throw new Error(`${path} was never cached`);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }, paths);
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

test("after a player logs out, the worker serves none of their API responses offline", async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  await controllingWorker(page);
  const theirs = ['/api/users/me', '/api/clubs'];
  await fetchAndCache(page, theirs);

  await logOut(page);

  await expect.poll(() => servedOffline(page, theirs)).toEqual([]);
  await page.context().close();
});

// Published bottles and the taxonomy belong to no player
const SHARED = [`/api/bottles/${BOTTLE_ID}/cache`, '/api/scan/taxonomy'];

test('logging out keeps the bottles and taxonomy fetched for offline play', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  await controllingWorker(page);
  await fetchAndCache(page, SHARED);

  await logOut(page);

  expect(await servedOffline(page, SHARED)).toEqual(SHARED);
  await page.context().close();
});

test("Settings' Clear cache empties every API cache the worker keeps", async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  await controllingWorker(page);
  const everything = ['/api/users/me', '/api/clubs', ...SHARED];
  await fetchAndCache(page, everything);

  await page.goto('/settings');
  await page.getByText('Clear cache', { exact: true }).click();

  await expect.poll(() => servedOffline(page, everything)).toEqual([]);
  await page.context().close();
});

test('Clear cache also empties the bottles saved on the device for offline play', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
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
  await page.context().close();
});
