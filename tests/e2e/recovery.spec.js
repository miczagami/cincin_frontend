/**
 * When a screen throws while rendering, the app shows a branded recovery
 * screen with a way back instead of a blank page or a raw stack.
 *
 * The dev server serves each page as its own module, so a test swaps one
 * page's module for one that throws while rendering.
 */
import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

const RENDER_ERROR = 'Kaboom while rendering';
const BOUNDARY_ERROR = 'Kaboom in the route boundary';

/** Serve a module whose default-exported component throws `message` when it renders. */
async function breakModule(page, modulePath, message = RENDER_ERROR) {
  await page.route(`**${modulePath}*`, (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `export default function Broken() { throw new Error(${JSON.stringify(message)}); }`,
  }));
}

const recoveryScreen = (page) => page.getByRole('heading', { name: 'Something went wrong' });

/** Open the forgot-password screen with its page module broken. */
async function openBrokenForgotPassword(page) {
  await breakModule(page, '/src/pages/auth/ForgotPasswordPage.jsx');
  await page.goto('/auth/forgot-password');
}

/** Sign in as the seeded host, then open Home with its page module broken. */
async function openBrokenHome(browser) {
  const page = await signIn(browser, 'host@test.com');
  await breakModule(page, '/src/pages/home/HomePage.jsx');
  await page.goto('/');
  return page;
}

/** Collect every console error that came through reportError(). */
function collectReports(page) {
  const reports = [];
  page.on('console', (msg) => { if (msg.type() === 'error' && msg.text().includes('[reportError]')) reports.push(msg.text()); });
  return () => reports.join('\n');
}

test.describe('recovery screen', () => {
  test('a render error in a route shows the recovery screen, not a raw error', async ({ page }) => {
    await openBrokenForgotPassword(page);

    await expect(recoveryScreen(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go home' })).toBeVisible();
    await expect(page.getByText('Try again, or head back home.')).toBeVisible();
    await expect(page.getByText(RENDER_ERROR)).toHaveCount(0);
    await expect(page.getByText('Unexpected Application Error')).toHaveCount(0);
  });

  test('a render error in a signed-in screen shows the recovery screen too', async ({ browser }) => {
    const page = await signIn(browser, 'host@test.com');
    await breakModule(page, '/src/pages/profile/ProfilePage.jsx');
    await page.goto('/profile');

    await expect(recoveryScreen(page)).toBeVisible();
    await expect(page.getByText(RENDER_ERROR)).toHaveCount(0);
  });

  test('when Home itself is broken, signing out is the way back', async ({ browser }) => {
    const page = await openBrokenHome(browser);
    await expect(recoveryScreen(page)).toBeVisible();
    // The explanation names the way back this screen actually offers
    await expect(page.getByText('Try again, or sign out and back in.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go home' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/auth$/);

    // Signed out for real: Home now sends the player to the auth splash instead of failing again
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth$/);
    await expect(recoveryScreen(page)).toHaveCount(0);
  });

  test('Sign out shows it is working while a slow logout finishes', async ({ browser }) => {
    const page = await openBrokenHome(browser);
    // Logout is only requested on click, so routing it after Home has loaded is in time
    await page.route('**/api/auth/logout', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });

    const signOut = page.getByRole('button', { name: 'Sign out' });
    await signOut.click();

    await expect(signOut).toBeDisabled();
    await expect(page).toHaveURL(/\/auth$/);
  });

  test('Sign out still signs out when the server never answers', async ({ browser }) => {
    const page = await openBrokenHome(browser);
    // Logout is only requested on click, so routing it after Home has loaded is in time
    await page.route('**/api/auth/logout', () => {}); // never fulfilled

    await page.getByRole('button', { name: 'Sign out' }).click();
    // Try again would reload and cancel the sign-out, so it waits too
    await expect(page.getByRole('button', { name: 'Try again' })).toBeDisabled();

    await expect(page).toHaveURL(/\/auth$/, { timeout: 10_000 });
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("Sign out empties the player's cached API responses even when the server never answers", async ({ browser }) => {
    const page = await openBrokenHome(browser);
    // As the service worker leaves them in a production build (services/workerCaches.js)
    await page.evaluate(async () => {
      for (const name of ['profile-cache', 'api-cache']) await (await caches.open(name)).put('/api/users/me', new Response('{}'));
    });
    await page.route('**/api/auth/logout', () => {}); // never fulfilled

    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/auth$/, { timeout: 10_000 });
    expect(await page.evaluate(() => caches.keys())).not.toEqual(expect.arrayContaining(['profile-cache']));
    expect(await page.evaluate(() => caches.keys())).not.toEqual(expect.arrayContaining(['api-cache']));
  });

  test('the render error is reported', async ({ page }) => {
    const reportedText = collectReports(page);
    await openBrokenForgotPassword(page);
    await expect(recoveryScreen(page)).toBeVisible();

    await expect.poll(reportedText).toContain(`[reportError] route Error: ${RENDER_ERROR}`);
  });

  test('"Go home" leaves the broken screen', async ({ page }) => {
    await openBrokenForgotPassword(page);

    await page.getByRole('button', { name: 'Go home' }).click();

    // Signed out, home sends the player on to the auth splash
    await expect(page).toHaveURL(/\/auth$/);
    await expect(recoveryScreen(page)).toHaveCount(0);
  });

  test('"Try again" reloads the same screen, which renders once the fault is gone', async ({ page }) => {
    await openBrokenForgotPassword(page);
    await expect(recoveryScreen(page)).toBeVisible();
    await page.unrouteAll();

    await page.getByRole('button', { name: 'Try again' }).click();

    await expect(page).toHaveURL(/\/auth\/forgot-password$/);
    await expect(recoveryScreen(page)).toHaveCount(0);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('when the route-level recovery itself fails, the app-level boundary still recovers', async ({ page }) => {
    const reportedText = collectReports(page);
    await breakModule(page, '/src/components/layout/RouteErrorBoundary.jsx', BOUNDARY_ERROR);
    await openBrokenForgotPassword(page);

    await expect(recoveryScreen(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go home' })).toBeVisible();
    await expect(page.getByText(RENDER_ERROR)).toHaveCount(0);
    await expect(page.getByText(BOUNDARY_ERROR)).toHaveCount(0);
    await expect.poll(reportedText).toContain(`[reportError] app Error: ${BOUNDARY_ERROR}`);
  });
});
