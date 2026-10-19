/**
 * Browser smoke tests for the core flows: auth, email links, scan → game
 * (pass-the-phone and multi-device), and clubs. Needs the backend running
 * against a freshly seeded database — see tests/e2e/README.md.
 */
import { test, expect } from '@playwright/test';
import { signIn, signUp, pickBottle, emailedLink, PASSWORD } from './helpers';

test('login survives a page reload', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  await page.reload();
  await expect(page).not.toHaveURL(/\/auth/);
  await page.goto('/profile');
  await expect(page.getByText('Test Host').first()).toBeVisible();
});

test('concurrent requests after the access token expires share one refresh', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  const refreshes = [];
  page.on('request', (req) => { if (req.url().endsWith('/api/auth/refresh')) refreshes.push(req); });

  const results = await page.evaluate(async () => {
    const { default: api } = await import('/src/services/api.js');
    sessionStorage.setItem('cin_access_token', 'expired.or.invalid');
    const calls = await Promise.allSettled([api.get('/users/me'), api.get('/clubs'), api.get('/notifications')]);
    return calls.map((c) => c.status);
  });

  expect(results).toEqual(['fulfilled', 'fulfilled', 'fulfilled']);
  // Refresh tokens are single-use: a second refresh with the same token would revoke the session
  expect(refreshes).toHaveLength(1);
  await page.reload();
  await expect(page).not.toHaveURL(/\/auth/);
});

test('signup → age verification (dev) → onboarding', async ({ page }) => {
  await signUp(page, { name: 'E2E User', email: `e2e${Date.now()}@test.com` });
  await page.getByText('[Dev] Skip verification').click();
  await expect(page).toHaveURL(/\/auth\/notifications/);
  await page.reload();
  const me = await page.evaluate(async () => (await fetch('/api/users/me', {
    headers: { Authorization: `Bearer ${sessionStorage.getItem('cin_access_token')}` },
  })).json());
  expect(me.ageVerified).toBe(true);
});

test.describe('emailed links', () => {
  test.skip(!process.env.BACKEND_LOG, 'set BACKEND_LOG to the backend output file to test emailed links');

  test('verify email, then reset password from the link', async ({ page }) => {
    const email = `verify${Date.now()}@test.com`;
    await signUp(page, { name: 'Verify Me', email });
    await page.getByText('[Dev] Skip verification').click();
    await expect(page).toHaveURL(/\/auth\/notifications/);

    await test.step('Settings offers verification while unverified', async () => {
      await page.goto('/settings');
      await expect(page.getByText('Verify your email')).toBeVisible();
    });

    await test.step('the emailed link verifies the account and unlocks clubs', async () => {
      await page.goto(await emailedLink(email, '/auth/verify-email'));
      await expect(page.getByText('Email verified')).toBeVisible();
      await page.goto('/clubs/create');
      await expect(page.getByText('Verify your email to create')).toHaveCount(0);
    });

    await test.step('the reset link opens the form and the new password works', async () => {
      await page.evaluate(() => sessionStorage.clear());
      await page.goto('/auth/forgot-password');
      await page.locator('input').first().fill(email);
      await page.getByRole('button', { name: /send|reset/i }).first().click();
      await page.goto(await emailedLink(email, '/auth/forgot-password'));
      const fields = page.locator('input[type="password"]');
      await fields.nth(0).fill('NewPass123');
      await fields.nth(1).fill('NewPass123');
      await page.getByRole('button', { name: /reset/i }).last().click();
      await expect(page.getByText('Password Reset!')).toBeVisible();
      const status = await page.evaluate(async (e) => (await fetch('/api/auth/login', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: e, password: 'NewPass123' }),
      })).status, email);
      expect(status).toBe(200);
    });
  });
});

test('pass-the-phone game from scan to results', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  await pickBottle(page);
  await expect(page.getByText(/Penfolds Bin 389/).first()).toBeVisible();

  await test.step('create with a guest and start', async () => {
    await page.getByPlaceholder('Add player name').fill('Guesty');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByRole('button', { name: /start|create/i }).last().click();
    await expect(page).toHaveURL(/\/game\/lobby\//);
    await expect(page.getByText('Guesty')).toBeVisible();
    await page.getByRole('button', { name: /start game/i }).click();
    await expect(page).toHaveURL(/\/game\/play\//);
  });

  await test.step('host turn', async () => {
    await expect(page.getByText('Pass the phone to')).toBeVisible();
    await expect(page.getByText('Test Host').first()).toBeVisible();
    await page.getByRole('button', { name: /i'm ready/i }).click();
    await page.getByPlaceholder('Type a tasting note...').fill('blackberry');
    await page.getByRole('button', { name: /submit guess/i }).click();
    await expect(page.getByText(/Correct!|Wrong/)).toBeVisible();
  });

  await test.step('guest turn', async () => {
    await page.getByRole('button', { name: /next turn/i }).click();
    await expect(page.getByText('Guesty').first()).toBeVisible();
    await page.getByRole('button', { name: /i'm ready/i }).click();
    await page.getByPlaceholder('Type a tasting note...').fill('vanilla');
    await page.getByRole('button', { name: /submit guess/i }).click();
    await expect(page.getByText(/Correct!|Wrong/)).toBeVisible();
  });

  await test.step('round 2, then end and see results', async () => {
    await page.getByRole('button', { name: /next turn/i }).click();
    await expect(page.getByText('Round 2').first()).toBeVisible();
    await page.getByRole('button', { name: /i'm ready/i }).click();
    await page.getByRole('button', { name: /^end game$/i }).click();
    await page.getByRole('button', { name: /^end game$/i }).last().click();
    await expect(page).toHaveURL(/\/game\/results\//);
    await expect(page.getByText('Guesty').first()).toBeVisible();
  });
});

test('clubs list and detail', async ({ browser }) => {
  const page = await signIn(browser, 'host@test.com');
  await page.goto('/clubs');
  await page.getByText('Friday Night Vino').first().click();
  await expect(page).toHaveURL(/\/clubs\/[^/]+$/);
  await expect(page.getByText('Season 1').first()).toBeVisible();
});

test('multi-device game between two players', async ({ browser }) => {
  const host = await signIn(browser, 'host@test.com');
  const p2 = await signIn(browser, 'player2@test.com');

  let code;
  await test.step('host creates a multi-device game', async () => {
    await pickBottle(host);
    await host.getByText('Multi-Device').click();
    await host.getByRole('button', { name: /start|create/i }).last().click();
    await expect(host).toHaveURL(/\/game\/lobby\//);
    code = (await host.locator('button.font-mono').innerText()).trim();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  await test.step('player 2 joins and the host lobby updates live', async () => {
    await p2.goto('/game/join');
    await p2.locator('input').first().fill(code);
    await p2.getByRole('button', { name: /join/i }).last().click();
    await expect(p2).toHaveURL(/\/game\/lobby\//);
    await expect(host.getByText(/Players \(2\)/)).toBeVisible();
  });

  await test.step('host starts; both reach round 1', async () => {
    await host.getByRole('button', { name: /start game/i }).click();
    await expect(host).toHaveURL(/\/game\/play\//);
    await expect(p2).toHaveURL(/\/game\/play\//);
    await expect(host.getByText('Round 1').first()).toBeVisible();
    await expect(p2.getByText('Round 1').first()).toBeVisible();
  });

  await test.step('both guess → simultaneous reveal → round 2', async () => {
    await host.getByPlaceholder('Type a tasting note...').fill('blackberry');
    await host.getByRole('button', { name: /submit guess/i }).click();
    await expect(host.getByText('Guess Submitted!')).toBeVisible();
    // The reveal shows for ~3s before the server opens the next round, so watch both at once
    const reveals = Promise.all([
      expect(host.getByText(/Correct!|Wrong/)).toBeVisible(),
      expect(p2.getByText(/Correct!|Wrong/)).toBeVisible(),
    ]);
    await p2.getByPlaceholder('Type a tasting note...').fill('cedar');
    await p2.getByRole('button', { name: /submit guess/i }).click();
    await reveals;
    await expect(host.getByText('Round 2').first()).toBeVisible();
    await expect(p2.getByText('Round 2').first()).toBeVisible();
  });

  await test.step('host ends; both see results', async () => {
    await host.getByRole('button', { name: /^end game$/i }).click();
    await host.getByRole('button', { name: /^end game$/i }).last().click();
    await expect(host).toHaveURL(/\/game\/results\//);
    await expect(p2).toHaveURL(/\/game\/results\//);
  });
});
