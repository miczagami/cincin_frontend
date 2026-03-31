# CinCin Landing Page — Integration Guide

## Overview

Marketing landing page for CinCin (`getcincin.com/welcome`). Public-facing, SEO-optimised, fully integrated with the existing PWA router and design system.

---

## File Locations

All paths are relative to your project root (`cincin-frontend/`).

| File | Destination | Purpose |
|------|-------------|---------|
| `LandingPage.jsx` | `src/pages/marketing/LandingPage.jsx` | Main landing page component |
| `LandingMeta.jsx` | `src/pages/marketing/LandingMeta.jsx` | SEO meta tags (Open Graph, Twitter, JSON-LD) |
| `AppRouter.patch.jsx` | *(reference only)* | Shows changes needed in `src/AppRouter.jsx` |
| `generate-og-image.js` | `scripts/generate-og-image.js` | Generates `public/og-image.png` (1200×630) |
| `robots.txt` | `public/robots.txt` | Search engine crawl rules |
| `sitemap.xml` | `public/sitemap.xml` | Sitemap for Google/Bing indexing |
| `vercel.json` | `vercel.json` *(project root)* | Vercel hosting config (skip if using AWS) |

### Directory structure after integration:

```
cincin-frontend/
├── public/
│   ├── robots.txt           ← NEW
│   ├── sitemap.xml          ← NEW
│   ├── og-image.png         ← NEW (generated or designed manually)
│   ├── favicon.svg          (existing)
│   └── ...
├── scripts/
│   └── generate-og-image.js ← NEW
├── src/
│   ├── pages/
│   │   ├── marketing/       ← NEW DIRECTORY
│   │   │   ├── LandingPage.jsx
│   │   │   └── LandingMeta.jsx
│   │   ├── auth/            (existing)
│   │   ├── home/            (existing)
│   │   ├── game/            (existing)
│   │   └── ...
│   ├── AppRouter.jsx        ← MODIFIED (add landing route)
│   └── main.jsx             ← MODIFIED (add HelmetProvider)
├── vercel.json              ← NEW (if deploying to Vercel)
└── package.json             ← MODIFIED (add react-helmet-async)
```

---

## Integration Steps

### Step 1: Install dependency

```bash
npm install react-helmet-async
```

### Step 2: Create the marketing directory

```bash
mkdir -p src/pages/marketing
```

### Step 3: Copy files

```bash
cp LandingPage.jsx   src/pages/marketing/LandingPage.jsx
cp LandingMeta.jsx   src/pages/marketing/LandingMeta.jsx
cp robots.txt        public/robots.txt
cp sitemap.xml       public/sitemap.xml
```

### Step 4: Wrap root App with HelmetProvider

In `src/main.jsx`:

```jsx
import { HelmetProvider } from 'react-helmet-async';

// Wrap your existing root:
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
```

### Step 5: Add landing route to AppRouter.jsx

Open `src/AppRouter.jsx` and apply the changes described in `AppRouter.patch.jsx`:

**5a.** Add lazy import at the top:

```jsx
const LandingPage = lazy(() => import('./pages/marketing/LandingPage'));
```

**5b.** Add route BEFORE the auth routes in createBrowserRouter:

```jsx
{
  path: '/welcome',
  element: (
    <Suspense fallback={<LoadingSpinner />}>
      <LandingPage />
    </Suspense>
  ),
},
```

**5c.** Add SmartRedirect for the catch-all:

```jsx
function SmartRedirect() {
  const { user, isInitialised } = useAuthStore();
  if (!isInitialised) return <LoadingSpinner />;
  return <Navigate to={user ? '/' : '/welcome'} replace />;
}

// Replace existing catch-all:
{ path: '*', element: <SmartRedirect /> }
```

### Step 6: Add LandingMeta to LandingPage (optional enhancement)

At the top of LandingPage's return JSX:

```jsx
import LandingMeta from './LandingMeta';

// Inside the return:
<div className="min-h-screen ...">
  <LandingMeta />
  {/* ... rest of page */}
</div>
```

### Step 7: Generate OG image

Either:

**Option A — Puppeteer** (if available):
```bash
mkdir -p scripts
cp generate-og-image.js scripts/
npx puppeteer install chromium
node scripts/generate-og-image.js
```

**Option B — Manual**: Create a 1200×630 image following the spec in the script comments. Save as `public/og-image.png`.

### Step 8: Copy SEO files to public

```bash
cp robots.txt public/robots.txt
cp sitemap.xml public/sitemap.xml
```

### Step 9: Deploy config (Vercel only)

If deploying to Vercel, copy `vercel.json` to the project root. If using AWS (per the existing deployment guide), the SPA redirect in CloudFront already handles this — no additional config needed.

---

## How It Connects to the App

The landing page uses the **existing design system** (cin-card, cin-btn-primary, cin-btn-secondary, cin-eyebrow, cin-gradient-hero, cin-gradient-card classes from `src/styles/global.css`). No new CSS is needed.

**Navigation flow:**

```
Unauthenticated user hits getcincin.com
    → SmartRedirect → /welcome (LandingPage)
        → "Get Started" button → /auth/signup (existing SignUpPage)
        → "Log In" button → /auth/login (existing LoginPage)

Authenticated user hits getcincin.com
    → SmartRedirect → / (existing HomePage)
```

The landing page is completely outside the auth-gated shell — it has its own nav bar, no bottom nav, and no AppShell wrapper. It's a standalone public page that funnels visitors into the existing auth flow.

---

## Tailwind Classes Used

All classes in LandingPage.jsx use existing tokens from your `tailwind.config.js`:

| Token | Value | Usage |
|-------|-------|-------|
| `cin-black` | `#0A0A0A` | Page background |
| `cin-dark` | `#141414` | Mobile menu bg |
| `cin-card` | `#1A1A1A` | Cards |
| `cin-border` | `#2A2A2A` | Borders, dividers |
| `cin-muted` | `#666666` | Secondary text |
| `cin-text` | `#CCCCCC` | Body text |
| `cin-white` | `#FFFFFF` | Headings |
| `cin-cyan` | `#22D3EE` | Accent, links, CTAs |
| `font-display` | Instrument Sans | Headings |
| `font-body` | DM Sans | Body text |

No new design tokens or Tailwind extensions are needed.

---

## Pre-Launch Checklist

- [ ] Replace placeholder testimonials with real beta feedback
- [ ] Generate or design `public/og-image.png` (1200×630)
- [ ] Update `sitemap.xml` lastmod dates
- [ ] Test meta tags: https://metatags.io or Facebook Sharing Debugger
- [ ] Test mobile menu hamburger on iOS Safari + Android Chrome
- [ ] Verify smooth scroll works on all sections
- [ ] Submit sitemap to Google Search Console
- [ ] Set up Google Analytics / Plausible on the /welcome route
- [ ] Add Apple Smart Banner meta tag if/when native apps launch

---

## Notes

- The landing page uses `useNavigate` from React Router, so it must be inside the RouterProvider (which it already is via the route definition).
- Intersection Observer animations degrade gracefully — content is visible even without JS animation support.
- The mobile nav menu is a CSS-animated collapsible with no JS library dependencies.
- FAQ accordion is pure React state, no external accordion package needed.
- All pricing figures match the SubscriptionPage: Free, $12.99/mo monthly, $9.99/mo annual.

## V2 Refinements

The landing page has been significantly upgraded from the initial version:

- **Phone mockup in hero**: A CSS-only animated phone frame that cycles through 3 live app screens (Scan Confirm → Gameplay → Results) with a cyan glow shadow. Matches the wireframe phone frame dimensions and style.
- **Animated stat counters**: "Bottles scanned", "Games played", "Cellar Clubs" count up with an ease-in-quad curve when scrolled into view. Placeholder numbers — update before launch.
- **Grain/noise texture**: A subtle SVG-based film grain overlay at 2.5% opacity across the whole page for visual depth.
- **Dot-grid background**: Features section uses a faint cyan dot pattern instead of line grid.
- **Star ratings on testimonials**: 5-star visual rating above each quote.
- **Richer nav**: Separator pipe between logo and tagline, between nav links and auth buttons.
- **Feature card glow**: Hover state adds a cyan inset glow ring + outer shadow.
- **Palate Profile card highlighted**: The "Pro" feature gets a gradient background and badge to emphasise the upsell.
- **Two-column "How It Works"**: Steps are in a 2×2 grid on desktop instead of a single column, making the section more compact.
- **No external dependencies added**: Everything is pure React + CSS. The `useCounter` hook uses `requestAnimationFrame` — no animation library needed.

### Production file note

The `LandingPage.jsx` in this archive is the V2 refined version. To adapt it for the existing codebase, add `useNavigate` from React Router where the preview uses plain buttons (the preview is standalone so it doesn't include React Router calls — the production file in the first archive does).
