/**
 * What the production build ships. Share links point at playcincin.com: no cincin.app,
 * a domain CinCin may not own, is left anywhere in the app.
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { PWA_OUT_DIR } from '../../playwright.config.js';

function builtFiles(dir = PWA_OUT_DIR) {
  return fs.readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.(js|html|json|webmanifest)$/.test(entry.name))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
}

test('the built app names no cincin.app link', () => {
  const files = builtFiles();
  expect(files.length).toBeGreaterThan(0);
  expect(files.filter((file) => fs.readFileSync(file, 'utf8').includes('cincin.app'))).toEqual([]);
});

/** The built _headers file as rules: each path with its header lines (Sevalla's syntax). */
function headerRules(dir = PWA_OUT_DIR) {
  const rules = [];
  for (const line of fs.readFileSync(path.join(dir, '_headers'), 'utf8').split('\n')) {
    if (line.startsWith('/')) rules.push({ path: line.trim(), headers: [] });
    else if (line.includes(':') && !line.trim().startsWith('#')) {
      const [name, ...value] = line.split(':');
      rules.at(-1).headers.push({ name: name.trim(), value: value.join(':').trim() });
    }
  }
  return rules;
}

test('every page the site serves, deep links included, carries the report-only CSP', () => {
  const policies = headerRules().flatMap((rule) => rule.headers
    .filter((header) => header.name === 'Content-Security-Policy-Report-Only')
    .map((header) => ({ path: rule.path, value: header.value })));
  // One rule only: Sevalla joins the values of every matching rule into one header
  expect(policies.map((policy) => policy.path)).toEqual(['/*']);
  expect(policies[0].value).toContain("default-src 'self'");
});

test("the built headers file keeps the cache rules", () => {
  expect(headerRules().find((rule) => rule.path === '/assets/*')?.headers).toContainEqual({ name: 'Cache-Control', value: 'public, max-age=31536000, immutable' });
});

test("index.html changes with the policy, so an installed app's worker re-fetches it with the new header", () => {
  // The worker serves every page from its precached index.html, with the headers it was fetched with:
  // only a new index.html (a new precache revision) brings an installed app a new policy
  const policyRule = headerRules().find((rule) => rule.headers.some((header) => /^Content-Security-Policy/.test(header.name)));
  const header = policyRule.headers.find((h) => /^Content-Security-Policy/.test(h.name));
  const fingerprint = createHash('sha256').update(`${header.name}: ${header.value}`).digest('base64');
  expect(fs.readFileSync(path.join(PWA_OUT_DIR, 'index.html'), 'utf8')).toContain(fingerprint);
});
