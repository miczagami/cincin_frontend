/**
 * The Content-Security-Policy (report-only for now) leaves the app's main flows alone: signing
 * up, scanning and playing, Settings and the installed app raise no reports.
 *
 * Runs against the pwa project's production build, which vite preview serves with the same
 * Content-Security-Policy-Report-Only header as the built _headers file (vite.config.js).
 */
import { test, expect } from '@playwright/test';
import { signIn, signUp, pickBottle } from '../e2e/helpers';

/** The script URL of the worker controlling the page, once one does. */
async function controllingWorker(page) {
  return page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
    return new URL(navigator.serviceWorker.controller.scriptURL).pathname;
  });
}

/**
 * The CSP reports `page` raises from now on: Chromium logs each one to the page's console
 * ("[Report Only] Refused to … because it violates the following Content Security Policy directive").
 */
function cspReports(page) {
  const reports = [];
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) reports.push(message.text());
  });
  return reports;
}

test('a deep link is served under the report-only policy (so the checks below run under it)', async ({ page }) => {
  const response = await page.goto('/clubs/any-club');
  expect(response.headers()['content-security-policy-report-only']).toContain("default-src 'self'");
});

test('signing up and starting age verification raise no CSP reports', async ({ page }) => {
  const reports = cspReports(page);
  await signUp(page, { name: 'CSP Check', email: `csp${Date.now()}@test.com` });
  // A production build has no dev skip: start the check and let it poll its status once
  const polled = page.waitForResponse('**/api/auth/age-verify/status*');
  await page.getByRole('button', { name: 'Begin Verification' }).click();
  await polled;

  expect(reports).toEqual([]);
});

test('scanning a bottle and playing a game raise no CSP reports', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const reports = cspReports(page);
  await page.reload();
  await pickBottle(page);
  await page.getByPlaceholder('Add player name').fill('Guesty');
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: /start|create/i }).last().click();
  await expect(page).toHaveURL(/\/game\/lobby\//);
  await page.getByRole('button', { name: /start game/i }).click();
  await expect(page).toHaveURL(/\/game\/play\//);
  await page.getByRole('button', { name: /i'm ready/i }).click();
  await page.getByPlaceholder('Type a tasting note...').fill('blackberry');
  await page.getByRole('button', { name: /submit guess/i }).click();
  await expect(page.getByText(/Correct!|Wrong/)).toBeVisible();

  expect(reports).toEqual([]);
  await page.context().close();
});

test('Settings raises no CSP reports', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const reports = cspReports(page);
  await page.goto('/settings');
  await expect(page.getByText('Cached bottles')).toBeVisible();
  await page.getByText('Clear cache', { exact: true }).click();
  await page.goto('/settings/cached-bottles');
  await page.goto('/profile');
  await expect(page.getByRole('navigation')).toBeVisible();

  expect(reports).toEqual([]);
  await page.context().close();
});

test('the installed app (its worker, push and an offline reload) raises no CSP reports', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const reports = cspReports(page);
  await page.context().grantPermissions(['notifications']);
  const push = page.waitForEvent('console', { predicate: (message) => message.text().startsWith('[Push]'), timeout: 20_000 });
  await page.reload();
  await push;
  expect(await controllingWorker(page)).toBe('/sw.js');

  await page.context().setOffline(true);
  await page.goto('/profile');
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.context().setOffline(false);

  expect(reports).toEqual([]);
  await page.context().close();
});
