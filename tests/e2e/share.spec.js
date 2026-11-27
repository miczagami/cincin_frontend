/**
 * Every share action links to the app on playcincin.com (one constant, SHARE_URL in
 * src/services/shareLinks.js, overridable with VITE_SHARE_URL), never to cincin.app.
 */
import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

const APP_LINK = 'https://app.playcincin.com';
const BOTTLE_ID = 'seed-penfolds-bin-389-cabernet-shiraz';

/** Call the API as the signed-in player. */
function api(page, method, apiPath, body) {
  return page.evaluate(async ({ method, apiPath, body }) => (await fetch(`/api${apiPath}`, {
    method,
    headers: { Authorization: `Bearer ${sessionStorage.getItem('cin_access_token')}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  })).json(), { method, apiPath, body });
}

/** Record what the page shares, as a phone without file sharing would (text and link only). */
async function recordShares(page) {
  await page.evaluate(() => {
    window.shared = [];
    navigator.canShare = () => false;
    navigator.share = async (data) => { window.shared.push(data); };
  });
  return () => page.evaluate(() => window.shared);
}

test('Palate Wrapped shares and copies a playcincin.com link', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com'); // Pro, with games this month
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/palate/wrapped');
  const share = page.getByRole('button', { name: 'Share as Image' });
  await expect(share).toBeEnabled();
  const shared = await recordShares(page);

  await share.click();
  await expect.poll(shared).toEqual([expect.objectContaining({ url: APP_LINK })]);

  await page.getByRole('button', { name: 'Copy Link' }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(APP_LINK);
  expect(copied).not.toContain('cincin.app');
});

test('season results share a playcincin.com link', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  // A club whose season ended with standings: one game played, tagged and approved
  const club = await api(page, 'POST', '/clubs', { name: `Share Club ${Date.now()}`, seasonType: 'ROLLING' });
  const game = await api(page, 'POST', '/games', { bottleId: BOTTLE_ID, multiplayerType: 'PASS_THE_PHONE', guestPlayerNames: ['Guesty'] });
  await api(page, 'POST', `/games/${game.id}/start`);
  await api(page, 'POST', `/games/${game.id}/guess`, { guessText: 'vanilla' });
  await api(page, 'POST', `/games/${game.id}/end`);
  await api(page, 'POST', `/clubs/${club.id}/games/${game.id}/tag`);
  await api(page, 'POST', `/clubs/${club.id}/games/${game.id}/approve`);
  await api(page, 'POST', `/clubs/${club.id}/seasons/${club.seasons[0].id}/end`);
  await page.goto(`/clubs/${club.id}/season-end/${club.seasons[0].id}`);
  await expect(page.getByText('Final Standings')).toBeVisible();
  const shared = await recordShares(page);

  await page.getByRole('button', { name: 'Share Results as Image' }).click();

  await expect.poll(shared).toEqual([expect.objectContaining({ url: APP_LINK })]);
});
