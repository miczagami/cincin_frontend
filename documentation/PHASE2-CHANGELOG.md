# CinCin Frontend — Phase 2 Changelog

## Overview

Phase 2 implements the **Core Game** frontend (Weeks 5–9):
- Game setup with full host configuration
- Pass-the-phone gameplay loop with scoring engine
- Results screen with full note reveal
- Offline game support with sync

## Files Changed (from Phase 1)

### Updated Files

| File | What Changed |
|------|-------------|
| `src/AppRouter.jsx` | Game routes now point to real components. Added `/game/lobby/:gameId`. Removed game placeholder imports. |
| `src/pages/PlaceholderPages.jsx` | Removed `GameSetupPage`, `GamePlayPage`, `GameResultsPage`. Kept Phase 3+ stubs. |
| `src/services/api.js` | Added `games`, `bottleCache`, `offlineSync` endpoint groups for Phase 2 backend. |
| `src/i18n/en.json` | Added game setup, lobby, play, feedback, results, and offline translation keys. |

### New Files

| File | Purpose |
|------|---------|
| `src/services/gameApi.js` | Standalone game API client. |
| `src/context/gameStore.js` | Zustand store: game config → lobby → gameplay → results lifecycle. |
| `src/pages/game/GameSetupPage.jsx` | Configuration: mode, players, timer, rounds, opt-out, scoreboard. Free vs Pro per Appendix A. |
| `src/pages/game/GameLobbyPage.jsx` | 6-digit code, player list, 10-min countdown, host start. |
| `src/pages/game/GamePlayPage.jsx` | Interstitial + guess input + timer + feedback + opt-out + scoreboard. |
| `src/pages/game/GameResultsPage.jsx` | Leaderboard + note reveal + breakdown + share + play again. |
| `src/hooks/useGameTimer.js` | Countdown timer with 10s warning and auto-skip. |
| `src/hooks/useOfflineSync.js` | Auto-syncs pending offline games on reconnect. |
| `src/utils/offlineGame.js` | IndexedDB bottle cache (LRU), pending game queue, OfflineGameEngine. |

## Phase 2 Exit Criteria

| Milestone | Status |
|-----------|--------|
| Scan → confirm flow | ✅ |
| Game setup with configuration | ✅ |
| Playable pass-the-phone (2+ players, scoring, opt-out, timer) | ✅ |
| Results screen with all data | ✅ |
| Offline game with cached bottles + sync | ✅ |
