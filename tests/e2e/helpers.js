import fs from 'node:fs';
import { expect } from '@playwright/test';

export const PASSWORD = 'TestPass1';
export const BOTTLE = 'Penfolds Bin 389';

/** Fill in and submit the login form the page is showing. */
export async function fillLogin(page, email) {
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
}

/** Sign in through the login form in a fresh browser context. */
export async function signIn(browser, email) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/auth/login');
  await fillLogin(page, email);
  await expect(page).not.toHaveURL(/\/auth\/login/);
  return page;
}

/** Scan search → confirm → game setup for the seeded Penfolds bottle. */
export async function pickBottle(page) {
  await page.goto('/scan/search');
  await page.locator('input').first().fill('Penfolds');
  await page.getByText(BOTTLE).first().click();
  await expect(page).toHaveURL(/\/scan\/confirm/);
  await page.getByRole('button', { name: /confirm|play|start/i }).first().click();
  await expect(page).toHaveURL(/\/game\/setup/);
}

/**
 * Without SendGrid the backend logs account emails as
 * "[Email Mock] → user <userId> | <subject> | <url>", naming the user by ID, never by address.
 * Point BACKEND_LOG at its output to test emailed links.
 *
 * Until the backend change that logs IDs (miczagami/cincin_backend#6) is on both repos' main
 * branches, CI can pair this suite with a backend that still logs "[Email Mock] → <email> | …",
 * so that form is matched too. Drop it once both have merged.
 */
export async function emailedLink({ userId, email }, path) {
  const log = process.env.BACKEND_LOG;
  const logPrefixes = [`[Email Mock] → user ${userId} `, `[Email Mock] → ${email} `];
  for (let i = 0; i < 40; i++) {
    const line = fs.readFileSync(log, 'utf8').split('\n').reverse()
      .find((l) => logPrefixes.some((prefix) => l.includes(prefix)) && l.includes(path));
    if (line) {
      const url = new URL(line.split(' | ').pop().trim());
      return url.pathname + url.search;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no ${path} email logged for user ${userId}`);
}

/** The signed-in user's ID, read from the app's auth store. */
export async function currentUserId(page) {
  return page.evaluate(async () => {
    const { default: useAuthStore } = await import('/src/context/authStore.js');
    return useAuthStore.getState().user.id;
  });
}

export async function signUp(page, { name, email }) {
  await page.goto('/auth/signup');
  await page.getByPlaceholder('Your name').fill(name);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: /sign up|create/i }).first().click();
  await expect(page).toHaveURL(/\/auth\/age-verify/);
}
