// Unit tests: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { contentSecurityPolicy } from '../../build/contentSecurityPolicy.js';

/** The policy's sources for `directive`, as a list. */
function sources(policy, directive) {
  const found = policy.split(';').map((part) => part.trim().split(/\s+/)).find(([name]) => name === directive);
  return found ? found.slice(1) : undefined;
}

const PRODUCTION = { apiUrl: 'https://api.playcincin.com', wsUrl: 'https://api.playcincin.com' };

test("the app may call its API and open its socket on the API's own origin", () => {
  const connect = sources(contentSecurityPolicy(PRODUCTION), 'connect-src');
  assert.ok(connect?.includes('https://api.playcincin.com'), `connect-src: ${connect}`);
  assert.ok(connect?.includes('wss://api.playcincin.com'), `connect-src: ${connect}`);
});

test("a build that calls the app's own /api (no VITE_API_URL) allows only the app's own origin to connect", () => {
  assert.deepEqual(sources(contentSecurityPolicy({}), 'connect-src')?.filter((source) => !source.includes('googleapis')), ["'self'"]);
});

test('a socket on its own host is allowed there, over ws:// when the API is plain http', () => {
  const connect = sources(contentSecurityPolicy({ apiUrl: 'http://192.168.1.20:4000', wsUrl: 'http://sockets.local:4001' }), 'connect-src');
  assert.ok(connect?.includes('http://192.168.1.20:4000'), `connect-src: ${connect}`);
  assert.ok(connect?.includes('ws://sockets.local:4001'), `connect-src: ${connect}`);
});

test("the page's own inline styles are allowed by their hash, and no other inline style is", () => {
  // SHA-256 of the empty string
  const styles = sources(contentSecurityPolicy({ inlineStyles: [''] }), 'style-src');
  assert.ok(styles?.includes("'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='"), `style-src: ${styles}`);
  assert.ok(!styles.includes("'unsafe-inline'"), `style-src: ${styles}`);
});

test('push can register with Firebase: every origin the messaging SDK calls is allowed', () => {
  // Read from the installed SDK, so an upgrade that moves its endpoints shows up here
  const sdk = ['node_modules/@firebase/messaging/dist/esm/index.esm.js', 'node_modules/@firebase/installations/dist/esm/index.esm.js']
    .map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const calls = [...new Set([...sdk.matchAll(/https:\/\/[a-z0-9.-]+\.googleapis\.com/g)].map(([origin]) => origin))];
  assert.ok(calls.length > 0, 'found no endpoints in the SDK');
  const connect = sources(contentSecurityPolicy({}), 'connect-src');
  assert.deepEqual(calls.filter((origin) => !connect.includes(origin)), []);
});

test("images may come from any https host (bottle and avatar URLs from the API), and from the app's own data: and blob: URLs (scan previews, share cards)", () => {
  const images = sources(contentSecurityPolicy({}), 'img-src');
  for (const source of ["'self'", 'https:', 'data:', 'blob:']) assert.ok(images?.includes(source), `img-src: ${images}`);
});

test('a VITE_API_URL that is not a full URL stops the build with an error that names it', () => {
  assert.throws(() => contentSecurityPolicy({ apiUrl: 'api.playcincin.com' }),
    (error) => ['VITE_API_URL', '"api.playcincin.com"', 'https://'].every((part) => error.message.includes(part)));
});

test('a socket URL given as wss:// also allows its https:// origin, for Socket.io polling', () => {
  const connect = sources(contentSecurityPolicy({ wsUrl: 'wss://api.playcincin.com' }), 'connect-src');
  assert.ok(connect?.includes('https://api.playcincin.com'), `connect-src: ${connect}`);
  assert.ok(connect?.includes('wss://api.playcincin.com'), `connect-src: ${connect}`);
});
