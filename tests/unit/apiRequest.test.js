// Unit tests: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCinCinApiRequest } from '../../src/utils/apiRequest.js';

const PRODUCTION_API = new URL('https://api.playcincin.com/api');

test('a call to the CinCin API is an API request', () => {
  assert.equal(isCinCinApiRequest(new URL('https://api.playcincin.com/api/games/history'), PRODUCTION_API), true);
});

test("another service's api. host is not an API request", () => {
  assert.equal(isCinCinApiRequest(new URL('https://api.eu.onfido.com/v3.6/applicants'), PRODUCTION_API), false);
});

test("a look-alike host that only starts with CinCin's API host is not an API request", () => {
  assert.equal(isCinCinApiRequest(new URL('https://api.playcincin.com.example.net/api/games/history'), PRODUCTION_API), false);
});

// In development the API client calls the app's own /api, which Vite proxies to the backend
const DEVELOPMENT_API = new URL('http://localhost:3000/api');

test("in development, a call to the app's own /api is an API request", () => {
  assert.equal(isCinCinApiRequest(new URL('http://localhost:3000/api/users/me'), DEVELOPMENT_API), true);
});

test("in development, the app's own pages and files are not API requests", () => {
  assert.equal(isCinCinApiRequest(new URL('http://localhost:3000/assets/index.js'), DEVELOPMENT_API), false);
});

test('a path that only starts with the same letters as /api is not an API request', () => {
  assert.equal(isCinCinApiRequest(new URL('http://localhost:3000/apiary.png'), DEVELOPMENT_API), false);
});

// The worker caches some API calls in caches of their own, chosen by the path under /api
const BOTTLE_CACHE = /^\/bottles\/[^/]+\/cache/i;

test('a call to an API path the pattern names is a request for that path', () => {
  assert.equal(isCinCinApiRequest(new URL('https://api.playcincin.com/api/bottles/b1/cache'), PRODUCTION_API, BOTTLE_CACHE), true);
});

test('a call to another API path is not a request for the pattern', () => {
  assert.equal(isCinCinApiRequest(new URL('https://api.playcincin.com/api/bottles/b1'), PRODUCTION_API, BOTTLE_CACHE), false);
});
