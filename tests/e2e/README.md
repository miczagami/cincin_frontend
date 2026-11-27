# Browser smoke tests

Playwright checks of the core flows in a real browser: login persistence,
signup + age verification, emailed verification / reset links, a pass-the-phone
game from scan to results, clubs, and a two-player multi-device game over
sockets.

They need the backend running on `localhost:4000` against a migrated and
**freshly seeded** database (they sign in as the seed users, e.g.
`host@test.com`), with `AGE_VERIFY_PROVIDER=mock` and generous rate limits.
Playwright starts the Vite dev server itself.

```bash
# in cincin_backend
npx prisma migrate deploy && node prisma/seed.js
AGE_VERIFY_PROVIDER=mock RATE_LIMIT_MAX=100000 AUTH_RATE_LIMIT_MAX=100000 \
  npm start > /tmp/cincin-backend.log 2>&1 &

# in cincin_frontend
npx playwright install chromium   # first time only
BACKEND_LOG=/tmp/cincin-backend.log npm run test:e2e
```

`BACKEND_LOG` is optional: without it the emailed-link test is skipped (the
backend logs account emails there when SendGrid isn't configured).

CI (`.github/workflows/ci.yml`) checks out the backend branch with the same
name (or `main`), seeds a Postgres service and runs the suite.

## Push and offline (production build)

`tests/pwa/` runs against a production build, since the service worker only exists there.
Playwright builds it into `dist-pwa-test/` with stand-in Firebase values (see
`PWA_FIREBASE_ENV` in `playwright.config.js`) and serves it with `vite preview` on :4183,
which also proxies `/api` to the backend. Run one project with `--project smoke` or `--project pwa`.
