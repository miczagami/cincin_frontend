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

/** Serve a page module whose component throws when it renders. */
async function breakModule(page, modulePath) {
  await page.route(`**${modulePath}*`, (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `export default function Broken() { throw new Error(${JSON.stringify(RENDER_ERROR)}); }`,
  }));
}

const recoveryScreen = (page) => page.getByRole('heading', { name: 'Something went wrong' });

test.describe('recovery screen', () => {
  test('a render error in a route shows the recovery screen, not a raw error', async ({ page }) => {
    await breakModule(page, '/src/pages/auth/ForgotPasswordPage.jsx');
    await page.goto('/auth/forgot-password');

    await expect(recoveryScreen(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go home' })).toBeVisible();
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

  test('the render error is reported', async ({ page }) => {
    const reports = [];
    page.on('console', (msg) => { if (msg.type() === 'error' && msg.text().includes('[reportError]')) reports.push(msg.text()); });
    await breakModule(page, '/src/pages/auth/ForgotPasswordPage.jsx');
    await page.goto('/auth/forgot-password');
    await expect(recoveryScreen(page)).toBeVisible();

    await expect.poll(() => reports.join('\n')).toContain(`[reportError] route Error: ${RENDER_ERROR}`);
  });

  test('"Go home" leaves the broken screen', async ({ page }) => {
    await breakModule(page, '/src/pages/auth/ForgotPasswordPage.jsx');
    await page.goto('/auth/forgot-password');

    await page.getByRole('button', { name: 'Go home' }).click();

    await expect(page).not.toHaveURL(/forgot-password/);
    await expect(recoveryScreen(page)).toHaveCount(0);
  });

  test('"Try again" reloads the same screen, which renders once the fault is gone', async ({ page }) => {
    await breakModule(page, '/src/pages/auth/ForgotPasswordPage.jsx');
    await page.goto('/auth/forgot-password');
    await expect(recoveryScreen(page)).toBeVisible();
    await page.unrouteAll();

    await page.getByRole('button', { name: 'Try again' }).click();

    await expect(page).toHaveURL(/\/auth\/forgot-password$/);
    await expect(recoveryScreen(page)).toHaveCount(0);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
