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

/** Play one finished pass-the-phone game as the signed-in player; returns its ID. */
async function playGame(page) {
  const game = await api(page, 'POST', '/games', { bottleId: BOTTLE_ID, multiplayerType: 'PASS_THE_PHONE', guestPlayerNames: ['Guesty'] });
  await api(page, 'POST', `/games/${game.id}/start`);
  await api(page, 'POST', `/games/${game.id}/guess`, { guessText: 'vanilla' });
  await api(page, 'POST', `/games/${game.id}/end`);
  return game.id;
}

/**
 * Record what the page shares: as most phones do, sharing the image file (`files: true`), or as
 * one that can't share files, text and link only. Returns a reader for what was shared.
 */
async function recordShares(page, { files }) {
  await page.evaluate((canShareFiles) => {
    window.shared = [];
    navigator.canShare = () => canShareFiles;
    navigator.share = async ({ files: shared, ...data }) => { window.shared.push({ ...data, files: shared?.length ?? 0 }); };
  }, files);
  return () => page.evaluate(() => window.shared);
}

/** What a share puts in front of the person it reaches: its text and link together. */
const sharedWords = (share) => `${share.text ?? ''} ${share.url ?? ''}`;

test('Palate Wrapped shares and copies a playcincin.com link', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com'); // a Pro player
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await playGame(page); // Wrapped needs a game this month
  await page.goto('/palate/wrapped');
  const share = page.getByRole('button', { name: 'Share as Image' });
  await expect(share).toBeEnabled();

  // Image share, as on most phones: the image goes with a caption that carries the link
  let shared = await recordShares(page, { files: true });
  await share.click();
  await expect.poll(shared).toHaveLength(1);
  expect((await shared())[0].files).toBe(1);
  expect(sharedWords((await shared())[0])).toContain(APP_LINK);
  expect(sharedWords((await shared())[0])).not.toContain('undefined');

  // Without file sharing: text and link
  shared = await recordShares(page, { files: false });
  await share.click();
  await expect.poll(shared).toEqual([expect.objectContaining({ url: APP_LINK, files: 0 })]);

  await page.getByRole('button', { name: 'Copy Link' }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(APP_LINK);
  expect(copied).not.toContain('cincin.app');
  expect(copied).not.toContain('undefined');
});

test('season results share a playcincin.com link', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  // A club whose season ended with standings: one game played, tagged and approved
  const club = await api(page, 'POST', '/clubs', { name: `Share Club ${Date.now()}`, seasonType: 'ROLLING' });
  const gameId = await playGame(page);
  await api(page, 'POST', `/clubs/${club.id}/games/${gameId}/tag`);
  await api(page, 'POST', `/clubs/${club.id}/games/${gameId}/approve`);
  await api(page, 'POST', `/clubs/${club.id}/seasons/${club.seasons[0].id}/end`);
  await page.goto(`/clubs/${club.id}/season-end/${club.seasons[0].id}`);
  await expect(page.getByText('Final Standings')).toBeVisible();
  const shareResults = page.getByRole('button', { name: 'Share Results as Image' });

  let shared = await recordShares(page, { files: true });
  await shareResults.click();
  await expect.poll(shared).toHaveLength(1);
  expect((await shared())[0].files).toBe(1);
  expect(sharedWords((await shared())[0])).toContain(APP_LINK);

  shared = await recordShares(page, { files: false });
  await shareResults.click();
  await expect.poll(shared).toEqual([expect.objectContaining({ url: APP_LINK, files: 0 })]);
});
