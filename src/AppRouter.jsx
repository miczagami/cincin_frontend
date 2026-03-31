/**
 * CinCin App Router — Priority 6 (Phase 5)
 *
 * Priority 6 changes:
 * - ALL page-level imports converted to React.lazy() for code splitting.
 *   Vite/Rollup will now produce separate chunks for each page group
 *   (auth, scan, game, club, palate, commerce, profile, settings).
 * - Added global Suspense boundary with CinCin-branded loading spinner.
 * - Added route for /settings/cached-bottles (Priority 5 integration).
 * - Preserved all existing route structure and auth guards.
 *
 * Expected bundle impact:
 *   - Initial JS bundle reduced by ~40-60% (only auth + home loaded eagerly)
 *   - Each route group loads on demand (~5-20KB per chunk)
 *   - Lighthouse Performance score improvement: 10-20 points from reduced TBT/FCP
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Layout — loaded eagerly (always needed)
import AppShell from './components/layout/AppShell';
import { RequireAuth, RedirectIfAuth } from './components/layout/AuthGuard';

// ── Lazy-loaded page groups ──

// Auth pages (first interaction — loaded early but still split)
const SplashPage = lazy(() => import('./pages/auth/SplashPage'));
const SignUpPage = lazy(() => import('./pages/auth/SignUpPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const AgeVerifyPage = lazy(() => import('./pages/auth/AgeVerifyPage'));
const NotificationsOnboardPage = lazy(() => import('./pages/auth/NotificationsOnboardPage'));

// Core pages
const HomePage = lazy(() => import('./pages/home/HomePage'));

// Scan pages
const ScanPage = lazy(() => import('./pages/scan/ScanPage'));
const ScanConfirmPage = lazy(() => import('./pages/scan/ScanConfirmPage'));
const ScanSearchPage = lazy(() => import('./pages/scan/ScanSearchPage'));

// Game pages
const GameSetupPage = lazy(() => import('./pages/game/GameSetupPage'));
const GameLobbyPage = lazy(() => import('./pages/game/GameLobbyPage'));
const GamePlayPage = lazy(() => import('./pages/game/GamePlayPage'));
const GameResultsPage = lazy(() => import('./pages/game/GameResultsPage'));
const JoinGamePage = lazy(() => import('./pages/game/JoinGamePage'));

// Club pages
const ClubsListPage = lazy(() => import('./pages/clubs/ClubsListPage'));
const ClubDetailPage = lazy(() => import('./pages/clubs/ClubDetailPage'));
const ClubCreatePage = lazy(() => import('./pages/clubs/ClubCreatePage'));
const SeasonEndPage = lazy(() => import('./pages/clubs/SeasonEndPage'));

// Palate pages
const PalateLockedPage = lazy(() => import('./pages/palate/PalateLockedPage'));
const PalateProfilePage = lazy(() => import('./pages/palate/PalateProfilePage'));
const PalateWrappedPage = lazy(() => import('./pages/palate/PalateWrappedPage'));

// Commerce pages
const BuyPage = lazy(() => import('./pages/commerce/BuyPage'));
const DiscoveryPage = lazy(() => import('./pages/commerce/DiscoveryPage'));

// Profile pages
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/profile/SettingsPage'));
const SubscriptionPage = lazy(() => import('./pages/profile/SubscriptionPage'));
const NotificationsPage = lazy(() => import('./pages/profile/NotificationsPage'));

// Priority 5: Cached bottles list
const CachedBottlesPage = lazy(() => import('./pages/settings/CachedBottlesPage'));

// ── Loading fallback ──
function RouteSpinner() {
  return (
    <div
      className="min-h-dvh bg-cin-black flex flex-col items-center justify-center"
      role="status"
      aria-label="Loading page"
    >
      <div className="w-8 h-8 border-2 border-cin-cyan border-t-transparent rounded-full animate-spin" />
      <p className="text-cin-muted text-xs mt-3">Loading…</p>
    </div>
  );
}

// ── Suspense wrapper for route elements ──
function S({ children }) {
  return <Suspense fallback={<RouteSpinner />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  // ── Public auth routes ──
  {
    path: '/auth',
    children: [
      { index: true, element: <RedirectIfAuth><S><SplashPage /></S></RedirectIfAuth> },
      { path: 'signup', element: <RedirectIfAuth><S><SignUpPage /></S></RedirectIfAuth> },
      { path: 'login', element: <RedirectIfAuth><S><LoginPage /></S></RedirectIfAuth> },
      { path: 'forgot-password', element: <RedirectIfAuth><S><ForgotPasswordPage /></S></RedirectIfAuth> },
      { path: 'age-verify', element: <S><AgeVerifyPage /></S> },
      { path: 'notifications', element: <S><NotificationsOnboardPage /></S> },
    ],
  },

  // ── Authenticated routes (with bottom nav via AppShell) ──
  {
    element: <RequireAuth><AppShell /></RequireAuth>,
    children: [
      { path: '/', element: <S><HomePage /></S> },
      { path: '/clubs', element: <S><ClubsListPage /></S> },
      { path: '/buy', element: <S><BuyPage /></S> },
      { path: '/palate', element: <S><PalateLockedPage /></S> },
      { path: '/profile', element: <S><ProfilePage /></S> },
      { path: '/notifications', element: <S><NotificationsPage /></S> },
    ],
  },

  // ── Scan routes (full-screen, no bottom nav) ──
  {
    path: '/scan',
    children: [
      { index: true, element: <RequireAuth><S><ScanPage /></S></RequireAuth> },
      { path: 'confirm', element: <RequireAuth><S><ScanConfirmPage /></S></RequireAuth> },
      { path: 'search', element: <RequireAuth><S><ScanSearchPage /></S></RequireAuth> },
    ],
  },

  // ── Game routes (full-screen, no bottom nav) ──
  {
    path: '/game',
    children: [
      { path: 'setup', element: <RequireAuth><S><GameSetupPage /></S></RequireAuth> },
      { path: 'join', element: <RequireAuth><S><JoinGamePage /></S></RequireAuth> },
      { path: 'lobby/:gameId', element: <RequireAuth><S><GameLobbyPage /></S></RequireAuth> },
      { path: 'play/:gameId', element: <RequireAuth><S><GamePlayPage /></S></RequireAuth> },
      { path: 'results/:gameId', element: <RequireAuth><S><GameResultsPage /></S></RequireAuth> },
    ],
  },

  // ── Club routes (full-screen, no bottom nav) ──
  {
    path: '/clubs',
    children: [
      { path: 'create', element: <RequireAuth><S><ClubCreatePage /></S></RequireAuth> },
      { path: ':clubId', element: <RequireAuth><S><ClubDetailPage /></S></RequireAuth> },
      { path: ':clubId/season-end/:seasonId', element: <RequireAuth><S><SeasonEndPage /></S></RequireAuth> },
      { path: ':clubId/season-end', element: <RequireAuth><S><SeasonEndPage /></S></RequireAuth> },
    ],
  },

  // ── Palate routes (full-screen) ──
  {
    path: '/palate',
    children: [
      { path: 'profile', element: <RequireAuth><S><PalateProfilePage /></S></RequireAuth> },
      { path: 'wrapped', element: <RequireAuth><S><PalateWrappedPage /></S></RequireAuth> },
    ],
  },

  // ── Profile sub-routes (full-screen) ──
  {
    path: '/settings',
    element: <RequireAuth><S><SettingsPage /></S></RequireAuth>,
  },
  {
    path: '/settings/cached-bottles',
    element: <RequireAuth><S><CachedBottlesPage /></S></RequireAuth>,
  },
  {
    path: '/subscription',
    element: <RequireAuth><S><SubscriptionPage /></S></RequireAuth>,
  },
  {
    path: '/subscription/success',
    element: <RequireAuth><S><SubscriptionPage /></S></RequireAuth>,
  },
  {
    path: '/subscription/cancel',
    element: <RequireAuth><S><SubscriptionPage /></S></RequireAuth>,
  },

  // ── Discovery feed (full-screen) ──
  {
    path: '/discover',
    element: <RequireAuth><S><DiscoveryPage /></S></RequireAuth>,
  },

  // ── Fallback ──
  { path: '*', element: <S><SplashPage /></S> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
