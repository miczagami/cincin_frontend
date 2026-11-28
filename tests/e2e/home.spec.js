/**
 * Home shows only what the API sends: no hard-coded brands or offers (ABAC copy audit, #39).
 */
import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

const discover = (page) => page.getByRole('region', { name: 'Discover' });

test('with nothing in the discovery feed, Discover shows a neutral empty state', async ({ browser }) => {
  const page = await signIn(browser, 'player2@test.com');
  await page.goto('/');

  await expect(discover(page).getByText('Nothing to discover right now. Check back soon.')).toBeVisible();
  await expect(discover(page).getByText('Sponsored')).toHaveCount(0);
});

/** A sponsored tasting as GET /commerce/feed sends it (cincin_backend commerceService). */
const SPONSORED = {
  id: 'sp-1',
  type: 'sponsored',
  isSponsored: true,
  title: 'Taste the Coastal Shiraz',
  subtitle: 'Can you pick the pepper and plum?',
  imageUrl: null,
  bottle: { id: 'b-1', name: 'Coastal Shiraz', producer: 'Example Estate', imageUrl: null, category: 'RED_WINE' },
  badgeText: 'Double Points',
  doublePoints: true,
  brandName: 'Example Estate',
};

test('sponsored tastings come from the API, labelled Sponsored, with no double-points wording', async ({ browser }) => {
  const page = await signIn(browser, 'player2@test.com');
  await page.route('**/api/commerce/feed*', (route) => route.fulfill({ json: { items: [SPONSORED], total: 1 } }));
  await page.goto('/');

  await expect(discover(page).getByText('Taste the Coastal Shiraz')).toBeVisible();
  await expect(discover(page).getByText('Can you pick the pepper and plum?')).toBeVisible();
  await expect(discover(page).getByText('Sponsored', { exact: true })).toBeVisible();
  await expect(discover(page).getByText(/double|points/i)).toHaveCount(0);
  await expect(discover(page).getByText('Nothing to discover right now. Check back soon.')).toHaveCount(0);
});

test('while the feed is loading, Discover does not claim there is nothing to discover', async ({ browser }) => {
  const page = await signIn(browser, 'player2@test.com');
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  let requested;
  const feedRequested = new Promise((resolve) => { requested = resolve; });
  await page.route('**/api/commerce/feed*', async (route) => {
    requested();
    await held;
    await route.fulfill({ json: { items: [SPONSORED], total: 1 } });
  });
  await page.goto('/');
  await feedRequested;

  await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible();
  await expect(discover(page).getByText('Nothing to discover right now. Check back soon.')).toHaveCount(0);
  release();
  await expect(discover(page).getByText('Taste the Coastal Shiraz')).toBeVisible();
});

test('when the feed request fails, Discover falls back to the empty state', async ({ browser }) => {
  const page = await signIn(browser, 'player2@test.com');
  await page.route('**/api/commerce/feed*', (route) => route.fulfill({ status: 500, json: { error: 'boom' } }));
  await page.goto('/');

  await expect(discover(page).getByText('Nothing to discover right now. Check back soon.')).toBeVisible();
});

test('Discover previews at most two feed items', async ({ browser }) => {
  const page = await signIn(browser, 'player2@test.com');
  const items = ['First', 'Second', 'Third'].map((title, i) => ({ ...SPONSORED, id: `sp-${i}`, title }));
  await page.route('**/api/commerce/feed*', (route) => route.fulfill({ json: { items, total: 3 } }));
  await page.goto('/');

  await expect(discover(page).getByText('Second', { exact: true })).toBeVisible();
  await expect(discover(page).getByText('First', { exact: true })).toBeVisible();
  await expect(discover(page).getByText('Third', { exact: true })).toHaveCount(0);
});
