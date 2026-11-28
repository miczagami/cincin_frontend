/**
 * What the service worker caches from the API, in a production build whose API is on another
 * origin than the app, as playcincin.com's is on api.playcincin.com.
 */
import { test as base, expect } from '@playwright/test';
import { servePreview, buildWithoutFirebase, controllingWorker } from './helpers';

const outDir = 'dist-pwa-api-origin';
const port = 4185;
// Not a real host: every request to it is answered by the test
const API = 'https://api.cincin.test';
// Another service's API, as Onfido's api.eu.onfido.com
const OTHER_API = 'https://api.other.test';

let server;

// app: a page of the app whose worker controls it, with every call to either API answered `{}`
const test = base.extend({
  app: async ({ browser }, use) => {
    const context = await browser.newContext({ baseURL: `http://localhost:${port}` });
    for (const origin of [API, OTHER_API]) {
      await context.route(`${origin}/**`, (route) => route.fulfill({ status: 200, json: {}, headers: { 'access-control-allow-origin': '*' } }));
    }
    const page = await context.newPage();
    await page.goto('/');
    await controllingWorker(page);
    await use(page);
    await context.close();
  },
});

test.beforeAll(async () => {
  test.setTimeout(180_000);
  buildWithoutFirebase(outDir, { VITE_API_URL: API });
  server = await servePreview(outDir, port);
});

test.afterAll(() => server?.kill());

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

test('a bottle fetched for offline play is kept in the bottle cache', async ({ app: page }) => {
  expect(await cachesHolding(page, `${API}/api/bottles/b1/cache`)).toEqual(['bottle-cache']);
});

test('taxonomy data is kept in the taxonomy cache', async ({ app: page }) => {
  expect(await cachesHolding(page, `${API}/api/scan/taxonomy?level=1`)).toEqual(['taxonomy-cache']);
});

test("the player's profile and palate are kept in the profile cache", async ({ app: page }) => {
  expect(await cachesHolding(page, `${API}/api/users/me`)).toEqual(['profile-cache']);
  expect(await cachesHolding(page, `${API}/api/palate/profile`)).toEqual(['profile-cache']);
});

test("the player's data export is not kept with the profile, which outlives it", async ({ app: page }) => {
  expect(await cachesHolding(page, `${API}/api/users/me/export`)).toEqual(['api-cache']);
});

test('other API calls are kept in the general API cache', async ({ app: page }) => {
  expect(await cachesHolding(page, `${API}/api/clubs`)).toEqual(['api-cache']);
});

test('an API call that fails is not kept', async ({ app: page }) => {
  await page.context().route(`${API}/api/clubs/missing`, (route) => route.fulfill({ status: 404, json: { error: 'Not found' }, headers: { 'access-control-allow-origin': '*' } }));
  expect(await cachesHolding(page, `${API}/api/clubs/missing`)).toEqual([]);
});

test("another service's API is never cached", async ({ app: page }) => {
  expect(await cachesHolding(page, `${OTHER_API}/api/clubs`)).toEqual([]);
});
