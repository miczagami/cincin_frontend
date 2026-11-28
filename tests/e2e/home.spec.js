/**
 * Home shows only what the API sends: no hard-coded brands or offers (ABAC copy audit, #39).
 */
import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

const discover = (page) => page.getByRole('region', { name: 'Discover' });
const recentGames = (page) => page.getByRole('region', { name: 'Recent Games' });
const BOTTLE_ID = 'seed-penfolds-bin-389-cabernet-shiraz';

/** Call the API as the signed-in player. */
function api(page, method, apiPath, body) {
  return page.evaluate(async ({ method, apiPath, body }) => (await fetch(`/api${apiPath}`, {
    method,
    headers: { Authorization: `Bearer ${sessionStorage.getItem('cin_access_token')}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  })).json(), { method, apiPath, body });
}

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

test('Recent Games lists the games a Pro player has played, from their history', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const game = await api(page, 'POST', '/games', { bottleId: BOTTLE_ID, multiplayerType: 'PASS_THE_PHONE', guestPlayerNames: ['Guesty'] });
  await api(page, 'POST', `/games/${game.id}/start`);
  await api(page, 'POST', `/games/${game.id}/end`);
  await page.goto('/');

  await expect(recentGames(page).getByText('Penfolds Bin 389').first()).toBeVisible();
});

test('a free player, whose game history is Pro-only, sees no Recent Games section and no error', async ({ browser }) => {
  const page = await signIn(browser, 'player2@test.com');
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  const history = page.waitForResponse('**/api/games/history*');
  await page.goto('/');

  expect((await history).status()).toBe(403);
  await expect(discover(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent Games' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

/** One game as GET /games/history sends it (cincin_backend gameService.getGameHistory). */
const PLAYED = {
  gameId: 'g-1',
  bottle: { id: 'b-1', name: 'Coastal Shiraz', vintage: 2021, category: 'RED_WINE', imageUrl: null },
  yourScore: 12,
  yourRank: 1,
  totalPlayers: 2,
  topScore: 12,
  status: 'COMPLETED',
  mode: 'PASS_THE_PHONE',
  playedAt: '2026-03-14T10:00:00.000Z',
};

test('each recent game shows the player\'s score and the day it was played', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  await page.route('**/api/games/history*', (route) => route.fulfill({ json: [PLAYED] }));
  await page.goto('/');

  const card = recentGames(page).getByRole('listitem').filter({ hasText: 'Coastal Shiraz' });
  await expect(card.getByText('+12')).toBeVisible();
  await expect(card.getByText(/Mar 14|14 Mar/)).toBeVisible();
});

test('a Pro player with no games yet sees no Recent Games section', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  await page.route('**/api/games/history*', (route) => route.fulfill({ json: [] }));
  await page.goto('/');

  await expect(discover(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent Games' })).toHaveCount(0);
});

test('a game the player scored nothing in shows 0, not +0', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  await page.route('**/api/games/history*', (route) => route.fulfill({ json: [{ ...PLAYED, yourScore: 0 }] }));
  await page.goto('/');

  const card = recentGames(page).getByRole('listitem').filter({ hasText: 'Coastal Shiraz' });
  await expect(card.getByText('0', { exact: true })).toBeVisible();
});

test('Recent Games lists at most the three latest games', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const played = ['One', 'Two', 'Three', 'Four'].map((name, i) => ({ ...PLAYED, gameId: `g-${i}`, bottle: { ...PLAYED.bottle, name } }));
  await page.route('**/api/games/history*', (route) => route.fulfill({ json: played }));
  await page.goto('/');

  await expect(recentGames(page).getByRole('listitem')).toHaveCount(3);
  await expect(recentGames(page).getByText('Four')).toHaveCount(0);
});

test('a sponsored tasting shows on Home even when organic items come first in the feed', async ({ browser }) => {
  const page = await signIn(browser, 'player2@test.com');
  // The backend puts a sponsored tasting at every 4th place and then cuts the list to `limit`
  const organic = ['Trending One', 'Trending Two', 'Trending Three', 'Trending Four'].map((title, i) => ({
    id: `org-${i}`, type: 'trending', isSponsored: false, title, subtitle: null, imageUrl: null, bottle: null, linkUrl: null, data: null,
  }));
  const feedRequest = page.waitForRequest('**/api/commerce/feed*');
  await page.route('**/api/commerce/feed*', (route) => route.fulfill({
    json: { items: [...organic, SPONSORED], total: 5 },
  }));
  await page.goto('/');

  // Asking for fewer than 5 would cut the sponsored slot off a feed with 4 organic items
  const limit = new URL((await feedRequest).url()).searchParams.get('limit');
  expect(limit === null || Number(limit) >= 5).toBe(true);
  await expect(discover(page).getByText('Taste the Coastal Shiraz')).toBeVisible();
});

test('organic discovery items show on Home without a Sponsored label', async ({ browser }) => {
  const page = await signIn(browser, 'player2@test.com');
  const trending = {
    id: 'org-1', type: 'trending', isSponsored: false, title: 'Trending this week', subtitle: 'What players are tasting',
    imageUrl: null, bottle: null, linkUrl: null, data: null,
  };
  await page.route('**/api/commerce/feed*', (route) => route.fulfill({ json: { items: [trending], total: 1 } }));
  await page.goto('/');

  await expect(discover(page).getByText('Trending this week')).toBeVisible();
  await expect(discover(page).getByText('Sponsored', { exact: true })).toHaveCount(0);
});
