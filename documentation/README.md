# CinCin PWA — Phase 1 Frontend

The foundation-phase frontend for the CinCin AI tasting game, built to match the Phase 1 backend implementation.

## What's Included (Phase 1 — Foundation)

### Design System
- Brand tokens (colours, typography, spacing, shadows, animations)
- Reusable component library: Button, Card, Input, Toggle, Pill, ConfidenceBadge, Divider, SocialButton
- Layout components: BottomNav, ScreenHeader, OfflineBanner, InstallPrompt
- CSS custom properties for consistent theming

### Auth & Age Verification Flow
- **Splash** → **Sign Up** (email/password + Apple/Google social login) → **Age Verification** (Onfido/Jumio SDK integration point) → **Notification Preferences** → **Home**
- **Login** flow with forgot-password path
- Auth context provider with token management and auto-refresh
- Route guards: unauthenticated, age-pending, authenticated states

### AI Scan Flow (Pipeline v1)
- **Camera Scan**: Viewfinder UI with scan frame, corner accents, animated scan line, flash toggle, mode switcher (camera/barcode/search)
- **Scan Confirm**: Bottle hero card with confidence badge (high ≥80% / medium 50–79% / low <50%), alternative guesses, confirm/correct actions
- **Manual Search**: Debounced autocomplete, empty states, fallback from camera

### PWA Shell
- Vite + vite-plugin-pwa with full manifest and service worker config
- Runtime caching: NetworkFirst for API, CacheFirst for fonts
- Online/offline detection with visible banner
- beforeinstallprompt capture with install prompt UI
- Safe area support for notched devices
- Responsive container (max-width 430px, centred)

### API Service Layer
Maps 1:1 to all Phase 1 backend endpoints:
- `authService`: register, login, socialLogin, me, refreshToken, logout, verifyEmail, forgotPassword, resetPassword
- `ageVerifyService`: initiate, status, mockVerify
- `scanService`: labelScan, barcodeScan, textSearch, confirm, sourceNotes, taxonomyTree, taxonomySearch

### i18n Framework
- English translations covering all screens
- i18next + react-i18next + browser language detection
- Ready for additional languages

## Tech Stack
- React 18 + Vite 5
- React Router v6 (file-based-style routes)
- i18next for internationalisation
- vite-plugin-pwa for service worker + manifest
- Instrument Sans (display) + DM Sans (body) typography

## Getting Started

```bash
npm install
npm run dev
```

Dev server runs on `http://localhost:3000` with API proxy to `http://localhost:4000`.

## Project Structure

```
src/
├── components/
│   ├── auth/          # Splash, SignUp, Login, AgeVerify, OnboardNotifs
│   ├── layout/        # AppShell, HomeScreen
│   ├── scan/          # ScanCamera, ScanConfirm, ScanManual
│   └── ui/            # Design system components
├── context/           # AuthContext provider
├── hooks/             # useOnlineStatus, useInstallPrompt, useCamera, useBarcodeScanner, useDebounce
├── i18n/              # Translations
├── services/          # API layer (auth, ageVerify, scan)
└── styles/            # Design tokens CSS
```

## Phase 1 Exit Criteria Met

| Milestone | Status |
|-----------|--------|
| Auth flow complete (sign up → login → age verify → home) | ✅ |
| AI scan flow (camera → confirm → manual search) | ✅ |
| Design system components reviewed | ✅ |
| PWA installable (manifest + service worker) | ✅ |
| i18n framework scaffolded | ✅ |
| API layer wired to all backend endpoints | ✅ |
