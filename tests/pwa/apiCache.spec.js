/**
 * What the service worker caches from the API, in a production build whose API is on another
 * origin than the app, as playcincin.com's is on api.playcincin.com.
 */
import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { servePreview } from './helpers';
import { PWA_FIREBASE_ENV } from '../../playwright.config.js';

const outDir = 'dist-pwa-api-origin';
const port = 4185;
// Not a real host: every request to it is answered by the test
const API = 'https://api.cincin.test';
// Another service's API, as Onfido's api.eu.onfido.com
const OTHER_API = 'https://api.other.test';

let server;

test.beforeAll(async () => {
  test.setTimeout(180_000);
  // Blank Firebase values (no push) rather than unset: Vite would fill unset variables from a developer's .env
  const env = { ...process.env, ...Object.fromEntries(Object.keys(PWA_FIREBASE_ENV).map((name) => [name, ''])), VITE_API_URL: API };
  execFileSync('npx', ['vite', 'build', '--outDir', outDir], { env, stdio: 'ignore' });
  server = await servePreview(outDir, port);
});

test.afterAll(() => server?.kill());

/** A page of the app whose worker controls it, with every call to either API answered `{}`. */
async function appControlledByItsWorker(browser) {
  const context = await browser.newContext({ baseURL: `http://localhost:${port}` });
  for (const origin of [API, OTHER_API]) {
    await context.route(`${origin}/**`, (route) => route.fulfill({ status: 200, json: {}, headers: { 'access-control-allow-origin': '*' } }));
  }
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
  return page;
}

/** The name of each cache that holds `url` once the page has fetched it. */
async function cachesHolding(page, url) {
  return page.evaluate(async (url) => {
    await fetch(url);
    // Workbox writes the cache after it answers the page
    for (let tries = 0; tries < 50; tries += 1) {
      const holding = [];
      for (const name of await caches.keys()) {
        if (await (await caches.open(name)).match(url)) holding.push(name);
      }
      if (holding.length) return holding;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return [];
  }, url);
}

test('a bottle fetched for offline play is kept in the bottle cache', async ({ browser }) => {
  const page = await appControlledByItsWorker(browser);
  expect(await cachesHolding(page, `${API}/api/bottles/b1/cache`)).toEqual(['bottle-cache']);
  await page.context().close();
});

test('taxonomy data is kept in the taxonomy cache', async ({ browser }) => {
  const page = await appControlledByItsWorker(browser);
  expect(await cachesHolding(page, `${API}/api/scan/taxonomy?level=1`)).toEqual(['taxonomy-cache']);
  await page.context().close();
});

test("the player's profile and palate are kept in the profile cache", async ({ browser }) => {
  const page = await appControlledByItsWorker(browser);
  expect(await cachesHolding(page, `${API}/api/users/me`)).toEqual(['profile-cache']);
  expect(await cachesHolding(page, `${API}/api/palate/profile`)).toEqual(['profile-cache']);
  await page.context().close();
});

test('other API calls are kept in the general API cache', async ({ browser }) => {
  const page = await appControlledByItsWorker(browser);
  expect(await cachesHolding(page, `${API}/api/clubs`)).toEqual(['api-cache']);
  await page.context().close();
});

test("another service's API is never cached", async ({ browser }) => {
  const page = await appControlledByItsWorker(browser);
  expect(await cachesHolding(page, `${OTHER_API}/api/clubs`)).toEqual([]);
  await page.context().close();
});
