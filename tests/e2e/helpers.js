import fs from 'node:fs';
import { expect } from '@playwright/test';

export const PASSWORD = 'TestPass1';
export const BOTTLE = 'Penfolds Bin 389';

/** Sign in through the login form in a fresh browser context. */
export async function signIn(browser, email) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
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
 * "[Email Mock] → <to> | <subject> | <url>". Point BACKEND_LOG at its output to test emailed links.
 */
export async function emailedLink(to, path) {
  const log = process.env.BACKEND_LOG;
  for (let i = 0; i < 40; i++) {
    const line = fs.readFileSync(log, 'utf8').split('\n').reverse()
      .find((l) => l.includes(`[Email Mock] → ${to} `) && l.includes(path));
    if (line) return new URL(line.split(' | ').pop().trim()).pathname + new URL(line.split(' | ').pop().trim()).search;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no ${path} email logged for ${to}`);
}

export async function signUp(page, { name, email }) {
  await page.goto('/auth/signup');
  await page.getByPlaceholder('Your name').fill(name);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: /sign up|create/i }).first().click();
  await expect(page).toHaveURL(/\/auth\/age-verify/);
}
