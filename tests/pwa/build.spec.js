/**
 * What the production build ships. Share links point at playcincin.com: no cincin.app,
 * a domain CinCin may not own, is left anywhere in the app.
 */
import fs from 'node:fs';
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
