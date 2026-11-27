/**
 * The links the backend sends in pushes, emails and invites open the app's real screens,
 * and a signed-out player who opens a join link is returned to it after signing in.
 *
 * The backend lists every app path it links to in src/services/appLinks.js. This suite
 * loads that file from the backend checkout (BACKEND_DIR, else ./backend as in CI, else
 * ../cincin_backend beside this repo) and opens each path in it.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';
import { signIn, signUp, fillLogin } from './helpers';

function backendDir() {
  const candidates = [process.env.BACKEND_DIR, 'backend', '../cincin_backend'].filter(Boolean);
  const found = candidates.find((dir) => fs.existsSync(path.join(dir, 'src/services/appLinks.js')));
  if (!found) throw new Error(`No backend checkout with src/services/appLinks.js in: ${candidates.join(', ')}`);
  return path.resolve(found);
}

const BACKEND = backendDir();
const { appPaths } = createRequire(import.meta.url)(path.join(BACKEND, 'src/services/appLinks.js'));

/** Which backend checkout the links came from, so a run against a stale sibling checkout shows it. */
function backendRevision() {
  try {
    return execFileSync('git', ['-C', BACKEND, 'log', '-1', '--format=%h %d'], { encoding: 'utf8' }).trim();
  } catch {
    return 'not a git checkout';
  }
}

const heading = (page, name) => page.getByRole('heading', { name });

/**
 * The screen each backend link must open, by its name in appLinks.js. A link the backend adds
 * fails the test below until it is given its screen here.
 */
const SCREENS = {
  home: (page) => page.getByText('Scan a Bottle'),
  gameJoin: (page) => heading(page, 'Join Game'),
  clubJoin: (page) => page.getByPlaceholder('e.g. A7K3M2'),
  club: (page, club) => heading(page, club.name),
  seasonResults: (page) => heading(page, 'Season Complete! 🏆'),
  palateProfile: (page) => heading(page, 'Palate Profile'),
  palateWrapped: (page) => heading(page, 'Palate Wrapped'),
  subscription: (page) => heading(page, 'Subscription'),
  subscriptionSuccess: (page) => heading(page, 'Subscription'),
  subscriptionCancel: (page) => heading(page, 'Subscription'),
  subscriptionMockSuccess: (page) => heading(page, 'Subscription'),
  notifications: (page) => heading(page, 'Notifications'),
  settings: (page) => heading(page, 'Settings'),
  verifyEmail: (page) => heading(page, 'Verify Email'),
  resetPassword: (page) => heading(page, /reset password|new password/i),
};

/** Call the API as the signed-in player. */
function api(page, method, apiPath, body) {
  return page.evaluate(async ({ method, apiPath, body }) => (await fetch(`/api${apiPath}`, {
    method,
    headers: { Authorization: `Bearer ${sessionStorage.getItem('cin_access_token')}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  })).json(), { method, apiPath, body });
}

/** A new club of the host's (a Pro player) whose first season has ended, as a "season ended" notice follows. */
async function clubWithEndedSeason(page, seasonSettings = { seasonType: 'ROLLING' }) {
  const club = await api(page, 'POST', '/clubs', { name: `Links Club ${Date.now()}`, ...seasonSettings });
  const [season] = club.seasons;
  await api(page, 'POST', `/clubs/${club.id}/seasons/${season.id}/end`);
  return { club, seasonId: season.id };
}

/** The seeded club the host runs ("Friday Night Vino", invite code FNV001). */
async function seededClub(page) {
  const clubs = await api(page, 'GET', '/clubs');
  const club = clubs.find((c) => c.name === 'Friday Night Vino');
  if (!club) throw new Error(`The seeded club is missing from /api/clubs: ${JSON.stringify(clubs).slice(0, 200)}`);
  return club;
}

test('every app link the backend sends opens a real screen', async ({ browser }) => {
  test.info().annotations.push({ type: 'backend', description: `${BACKEND} @ ${backendRevision()}` });
  const page = await signIn(browser, 'host@test.com');
  const { club, seasonId } = await clubWithEndedSeason(page);
  const params = { gameCode: 'ABC123', inviteCode: 'FNV001', clubId: club.id, seasonId, token: 'not-a-real-token' };

  for (const [name, pathFor] of Object.entries(appPaths)) {
    const link = pathFor(params);
    await test.step(`${name}: ${link}`, async () => {
      expect(SCREENS[name], `the screen the backend's "${name}" link opens (add it to SCREENS)`).toBeDefined();
      await page.goto(link);
      await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === link);
      await expect(SCREENS[name](page, club).first()).toBeVisible();
    });
  }
});

test("a club invite link opens the club join form with the invite's code", async ({ browser }) => {
  const page = await signIn(browser, 'player3@test.com');

  await page.goto(appPaths.clubJoin({ inviteCode: 'FNV001' }));

  await expect(page.getByPlaceholder('e.g. A7K3M2')).toHaveValue('FNV001');
});

test("a season-ended link shows that season's final standings, not the admin's end-season step", async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const { club, seasonId } = await clubWithEndedSeason(page);

  await page.goto(appPaths.seasonResults({ clubId: club.id, seasonId }));

  await expect(heading(page, 'Season Complete! 🏆')).toBeVisible();
  await expect(page.getByText('Final Standings')).toBeVisible();
  await expect(page.getByRole('button', { name: 'End Season' })).toHaveCount(0);
});

test("a season link that isn't a season says so", async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const club = await seededClub(page);

  await page.goto(appPaths.seasonResults({ clubId: club.id, seasonId: 'not-a-season' }));

  await expect(page.getByText("We couldn't find that season's results.")).toBeVisible();
});

test('a season link for a season still running opens the club screen instead', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const club = await api(page, 'POST', '/clubs', { name: `Running Club ${Date.now()}`, seasonType: 'ROLLING' });

  await page.goto(appPaths.seasonResults({ clubId: club.id, seasonId: club.seasons[0].id }));

  await expect(page).toHaveURL((url) => url.pathname === `/clubs/${club.id}`);
  await expect(heading(page, club.name)).toBeVisible();
});

test("an old season's link offers the admin no next-season choices once a newer season is running", async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const { club, seasonId } = await clubWithEndedSeason(page);
  await api(page, 'POST', `/clubs/${club.id}/seasons`, { seasonType: 'ROLLING' });

  await page.goto(appPaths.seasonResults({ clubId: club.id, seasonId }));

  await expect(heading(page, 'Season Complete! 🏆')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to Club' })).toBeVisible();
  await expect(page.getByRole('button', { name: "What's Next?" })).toHaveCount(0);
});

test("from a season's link, a new season with the same settings keeps that season's type", async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const { club, seasonId } = await clubWithEndedSeason(page); // a ROLLING season
  await page.goto(appPaths.seasonResults({ clubId: club.id, seasonId }));

  await page.getByRole('button', { name: "What's Next?" }).click();
  await page.getByText('New Season (Same Settings)').click();

  await expect(page).toHaveURL((url) => url.pathname === `/clubs/${club.id}`);
  const after = await api(page, 'GET', `/clubs/${club.id}`);
  expect(after.activeSeason.seasonType).toBe('ROLLING');
});

test("from a season's link, a new season with the same settings keeps a fixed season's length", async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const { club, seasonId } = await clubWithEndedSeason(page, { seasonType: 'FIXED_LENGTH', seasonLengthDays: 30 });
  await page.goto(appPaths.seasonResults({ clubId: club.id, seasonId }));

  await page.getByRole('button', { name: "What's Next?" }).click();
  await page.getByText('New Season (Same Settings)').click();

  await expect(page).toHaveURL((url) => url.pathname === `/clubs/${club.id}`);
  const after = await api(page, 'GET', `/clubs/${club.id}`);
  expect(after.activeSeason).toMatchObject({ seasonType: 'FIXED_LENGTH', lengthDays: 30 });
});

test('the admin who ends a season on its screen goes on to choose what comes next', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const club = await api(page, 'POST', '/clubs', { name: `Ending Club ${Date.now()}`, seasonType: 'ROLLING' });
  await page.goto(`/clubs/${club.id}/season-end`);

  await page.getByRole('button', { name: 'End Season' }).click();

  await expect(heading(page, 'Season Complete! 🏆')).toBeVisible();
  await expect(page.getByRole('button', { name: "What's Next?" })).toBeVisible();
});

test("a season link opened from another club's screen judges the linked club, not the one already loaded", async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const { club, seasonId } = await clubWithEndedSeason(page);
  const seeded = await seededClub(page); // the host's other club, with a season running
  await page.goto(`/clubs/${seeded.id}`);
  await expect(heading(page, seeded.name)).toBeVisible();

  // Move within the app (as a tap on an in-app notification would), keeping the loaded club
  await page.evaluate((link) => { window.history.pushState({}, '', link); window.dispatchEvent(new PopStateEvent('popstate')); },
    appPaths.seasonResults({ clubId: club.id, seasonId }));

  await expect(heading(page, 'Season Complete! 🏆')).toBeVisible();
  await expect(page.getByRole('button', { name: "What's Next?" })).toBeVisible();
});

test('join codes in links are cleaned, and a malformed one is ignored', async ({ browser }) => {
  const page = await signIn(browser, 'player3@test.com');
  const codeField = page.getByPlaceholder('e.g. A7K3M2');

  await page.goto(appPaths.gameJoin({ gameCode: ' abc-123 ' }));
  await expect(page.locator('input').first()).toHaveValue('ABC123');

  await page.goto(appPaths.clubJoin({ inviteCode: ' fnv-001 ' }));
  await expect(codeField).toHaveValue('FNV001');

  await page.goto(appPaths.clubJoin({ inviteCode: 'FNV0019999' })); // too long: not a code
  await expect(page.getByRole('heading', { name: 'Cellar Clubs' })).toBeVisible();
  await expect(codeField).toHaveCount(0);
});

test('a code pasted into the club join form is cleaned whole, as on the game join screen', async ({ browser }) => {
  const page = await signIn(browser, 'player3@test.com');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/clubs');
  await page.getByRole('button', { name: 'Join Club' }).click();
  const codeField = page.getByPlaceholder('e.g. A7K3M2');

  await page.evaluate(() => navigator.clipboard.writeText('  fnv-001  '));
  await codeField.focus();
  await page.keyboard.press('ControlOrMeta+V');

  await expect(codeField).toHaveValue('FNV001');
});

test('leaving a club invite for the Clubs tab closes its join form', async ({ browser }) => {
  const page = await signIn(browser, 'player3@test.com');
  await page.goto(appPaths.clubJoin({ inviteCode: 'FNV001' }));
  await expect(page.getByPlaceholder('e.g. A7K3M2')).toHaveValue('FNV001');

  await page.getByRole('navigation').getByText('Clubs').click();

  await expect(page).toHaveURL((url) => url.pathname === '/clubs' && url.search === '');
  await expect(page.getByPlaceholder('e.g. A7K3M2')).toHaveCount(0);
});

test("a club's Invite button shares the club join link", async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const club = await seededClub(page);
  await page.goto(`/clubs/${club.id}`);
  await page.evaluate(() => { navigator.share = async (data) => { window.sharedInvite = data; }; });

  await page.getByRole('button', { name: 'Invite' }).click();

  const shared = await page.waitForFunction(() => window.sharedInvite).then((handle) => handle.jsonValue());
  expect(new URL(shared.url).pathname + new URL(shared.url).search).toBe(appPaths.clubJoin({ inviteCode: 'FNV001' }));
});

test.describe('a signed-out player who opens a join link', () => {
  /** From the auth splash a join link sends them to, sign in as `email`. */
  async function logInFromSplash(page, email) {
    await expect(page).toHaveURL(/\/auth$/);
    await page.getByRole('button', { name: 'Already playing? Log in' }).click();
    await fillLogin(page, email);
  }

  test('lands on the game join, with its code, after logging in', async ({ page }) => {
    const link = appPaths.gameJoin({ gameCode: 'ABC123' });
    await page.goto(link);

    await logInFromSplash(page, 'player2@test.com');

    await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === link);
    await expect(page.locator('input').first()).toHaveValue('ABC123');
  });

  test('lands on the club join, with its code, after logging in', async ({ page }) => {
    const link = appPaths.clubJoin({ inviteCode: 'FNV001' });
    await page.goto(link);

    await logInFromSplash(page, 'player3@test.com');

    await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === link);
    await expect(page.getByPlaceholder('e.g. A7K3M2')).toHaveValue('FNV001');
  });

  test('lands on the join after signing up instead', async ({ page }) => {
    // The test's clock: once paused, age verification's move-on timer only runs when the test says
    const clockStart = Date.now();
    await page.clock.install({ time: clockStart });
    const link = appPaths.gameJoin({ gameCode: 'ABC123' });
    await page.goto(link);
    await expect(page).toHaveURL(/\/auth$/);

    await signUp(page, { name: 'Link User', email: `link${Date.now()}@test.com` });
    // Stop the page's clock before verification sets its 1s move-on timer, so that timer can't fire
    // before Next. The clock keeps moving until paused (pausing in the past throws), so pause at a
    // point safely ahead of it: sign-up takes well under 20s.
    await page.clock.pauseAt(clockStart + 20_000);
    await page.getByText('[Dev] Skip verification').click();
    await expect(page).toHaveURL(/\/auth\/notifications/);
    // Straight away, as a quick player would: age verification must not bring them back here
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === link);
    await page.clock.runFor(10_000); // well past every timer age verification sets
    await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === link);
  });

  test('going Back from the notifications step of sign-up does not reopen age verification', async ({ page }) => {
    await page.goto(appPaths.gameJoin({ gameCode: 'ABC123' }));
    await signUp(page, { name: 'Back User', email: `back${Date.now()}@test.com` });
    await page.getByText('[Dev] Skip verification').click();
    await expect(page).toHaveURL(/\/auth\/notifications/);

    await page.goBack();

    // Signed up, so the sign-up screen sends them on into the app rather than back to verification
    await expect(page).not.toHaveURL(/\/auth\//);
  });

  test('is never sent off the app by a stored return path', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/auth/login');
    const appHost = new URL(page.url()).host;
    await page.evaluate(() => sessionStorage.setItem('cin_return_path', '//example.org/phish'));

    await fillLogin(page, 'player2@test.com');

    // Home, on the app, and without the browser having to refuse a move to another site
    await expect(page).toHaveURL((url) => url.host === appHost && url.pathname === '/');
    expect(errors).toEqual([]);
  });

  test('is not sent back to it on a later, ordinary sign-in', async ({ page }) => {
    await page.goto(appPaths.gameJoin({ gameCode: 'ABC123' }));
    await logInFromSplash(page, 'player2@test.com');
    await expect(page).toHaveURL(/\/game\/join/);

    // Sign out and back in from the login screen: home, not the old join
    await page.evaluate(() => sessionStorage.removeItem('cin_access_token'));
    await page.evaluate(() => sessionStorage.removeItem('cin_refresh_token'));
    await page.goto('/auth/login');
    await fillLogin(page, 'player2@test.com');

    await expect(page).toHaveURL((url) => url.pathname === '/');
  });
});
