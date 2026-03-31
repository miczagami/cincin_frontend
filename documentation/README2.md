# CinCin PWA — Phase 2 Frontend

The core game frontend for the CinCin AI tasting game. Phase 2 builds the playable heart of the product on top of the Phase 1 foundation.

## What's Included

### Phase 1 — Foundation (unchanged)
- Design system (brand tokens, component library)
- Auth & age verification flow
- AI scan pipeline UI (camera, barcode, manual search)
- PWA shell (service worker, install prompt, offline detection)
- API service layer for all Phase 1 endpoints
- i18n framework

### Phase 2 — Core Game (NEW)

#### Game Setup (Section 3.6, Appendix A)
- Multiplayer type selection (pass-the-phone implemented; multi-device/remote stubbed)
- Mode: Parallel (free) / Competitive (Pro only)
- Player name entry with host designation and reordering
- Round timer, max rounds, opt-out timing, scoreboard visibility
- Free vs Pro setting restrictions per Appendix A

#### Game Lobby (Section 3.7)
- 6-digit game code display with share functionality
- Real-time player list with host/guest/ready status
- 10-minute lobby timeout countdown
- Host-only start (requires ≥2 players)

#### Pass-the-Phone Gameplay (Sections 4.1–4.7)
- Sequential turns with "pass the phone to [Name]" interstitial
- Claimed notes shown between turns (no attribution per Section 4.6)
- Guess input: taxonomy autocomplete + free text + quick category pills
- Countdown timer with 10-second visual/colour warning
- Immediate feedback: correct/incorrect, exact points, matched note
- Precision bonus for specific variant matches
- Opt-out with score lock and confirmation
- Host end-game with confirmation prompt
- Scoreboard overlay (toggleable, respects config)

#### Results Screen (Section 4.10)
- Winner spotlight with score and accuracy
- Three-tab layout: Leaderboard, Tasting Notes, Breakdown
- Full tasting note reveal with Producer/Critic/AI source tags
- Per-player guess history with round numbers and point values
- Bottle information card with category tags
- Share via Web Share API
- Play again (scan new bottle) and home navigation

#### Offline Game Support (Section 2.7)
- Bottle cache via IndexedDB (LRU eviction, 50 bottle limit)
- OfflineGameEngine: full pass-the-phone with cached bottles
- Pending game queue with auto-sync on reconnect
- Cache management utilities

### API Service Layer (Phase 2 additions)
Maps to Phase 2 backend endpoints:
- `games`: create, join, start, getState, guess, optOut, advance, end, results, shareLink
- `bottleCache`: getForCache
- `offlineSync`: sync

## Project Structure

```
src/
├── components/
│   ├── auth/          # Splash, SignUp, Login, AgeVerify, OnboardNotifs
│   ├── layout/        # AppShell, HomeScreen
│   ├── scan/          # ScanCamera, ScanConfirm, ScanManual
│   └── ui/            # Design system components
├── context/
│   ├── authStore.js   # Auth lifecycle (Phase 1)
│   ├── scanStore.js   # Scan pipeline state (Phase 1)
│   └── gameStore.js   # Game lifecycle state (Phase 2) ← NEW
├── hooks/
│   ├── useOnlineStatus.js
│   ├── useInstallPrompt.js
│   ├── useCamera.js
│   ├── useBarcodeScanner.js
│   ├── useDebounce.js
│   ├── useGameTimer.js     ← NEW
│   └── useOfflineSync.js   ← NEW
├── i18n/
│   └── en.json        # English translations (updated)
├── pages/
│   ├── auth/          # Auth flow pages
│   ├── home/          # Home screen
│   ├── scan/          # Scan flow pages
│   └── game/          # Game pages (Phase 2) ← NEW
│       ├── GameSetupPage.jsx
│       ├── GameLobbyPage.jsx
│       ├── GamePlayPage.jsx
│       └── GameResultsPage.jsx
├── services/
│   ├── api.js         # API client (updated with game endpoints)
│   └── gameApi.js     # Game-specific API client ← NEW
├── utils/
│   └── offlineGame.js # Offline engine + IndexedDB cache ← NEW
└── styles/
    └── tokens.css     # Design tokens
```

## Phase 2 Exit Criteria

| Milestone | Status |
|-----------|--------|
| Scan → confirm flow (all 3 input methods) | ✅ |
| Game setup with full configuration | ✅ |
| Playable pass-the-phone (2+ players, scoring, opt-out, timer) | ✅ |
| Results screen with all data | ✅ |
| Offline game with cached bottles + sync on reconnect | ✅ |
| API layer wired to all Phase 2 backend endpoints | ✅ |
| i18n translations for all new screens | ✅ |

## Tech Stack
- React 18 + Vite 5
- React Router v6
- Zustand (state management)
- i18next + react-i18next
- vite-plugin-pwa (service worker + manifest)
- IndexedDB (offline bottle cache + pending games)
- Instrument Sans (display) + DM Sans (body) typography

## Getting Started

```bash
npm install
npm run dev
```

Dev server runs on `http://localhost:3000` with API proxy to `http://localhost:4000`.

## Next Phases

- [ ] **Phase 3 (Weeks 10–13):** WebSocket multiplayer, join-by-code, Cellar Club
- [ ] **Phase 4 (Weeks 14–17):** Palate Profile, Pro subscription, Buy tab
- [ ] **Phase 5 (Weeks 18–20):** PWA optimisation, offline hardening, QA, launch
