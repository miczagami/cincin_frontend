# CinCin Frontend — Phase 3 Changelog

## Overview

Phase 3 implements **Multiplayer & Cellar Clubs** frontend (Weeks 10–13):
- WebSocket real-time infrastructure for multi-device/remote play
- Join-by-code flow for separate-device games
- Simultaneous round orchestration with delayed reveal
- Disconnection handling (2-min reconnect window, host pause)
- Cellar Club CRUD: create, join, leave, leaderboard, activity feed
- Season management: end season, awards, admin decisions
- Game approval workflow for club admins

## Files Changed (from Phase 2)

### Updated Files

| File | What Changed |
|------|-------------|
| `src/AppRouter.jsx` | Added club routes, `/game/join` route. Replaced `ClubsPage` placeholder with real `ClubsListPage`. |
| `src/pages/PlaceholderPages.jsx` | Removed `ClubsPage`. Phase 4+ stubs remain. |
| `src/services/api.js` | Added `clubs` (15 endpoints), `notifications` (4 endpoints). |
| `src/pages/game/GameSetupPage.jsx` | Multi-Device/Remote now ENABLED. Cellar Club tag now FUNCTIONAL. |
| `src/pages/game/GameLobbyPage.jsx` | WebSocket integration. Real-time player sync. Connection status. |
| `src/pages/game/GamePlayPage.jsx` | Dual-mode: sequential + simultaneous. Delayed reveal. Game paused state. |
| `src/i18n/en.json` | All Phase 3 keys: clubs, join, multiplayer, season end. |

### New Files

| File | Purpose |
|------|---------|
| `src/services/socketService.js` | Socket.io client — connection, rooms, gameplay events, reconnection. |
| `src/services/clubApi.js` | Club REST API client (CRUD, membership, approval, seasons, activity). |
| `src/context/clubStore.js` | Zustand store for club state lifecycle. |
| `src/hooks/useSocket.js` | React hook for socket lifecycle with reconnect handling. |
| `src/pages/game/JoinGamePage.jsx` | Join-by-code for multi-device/remote players. |
| `src/pages/club/ClubsListPage.jsx` | Main Cellar Clubs tab with club list. |
| `src/pages/club/ClubDetailPage.jsx` | Club detail: leaderboard, activity, approval. |
| `src/pages/club/ClubCreatePage.jsx` | Club creation form with season config. |
| `src/pages/club/SeasonEndPage.jsx` | Season celebration: awards, standings, admin decisions. |

## Stub Functions

| Stub | Location | Deferred To |
|------|----------|-------------|
| Shareable summary card image | `SeasonEndPage` → `handleShare()` | Phase 5 |
| Modified season settings form | `SeasonEndPage` → "Modify Settings" button | Phase 4/5 |
| Player disconnect toast | `GamePlayPage` → `onPlayerDisconnected` | Phase 4 |
| Player frozen toast | `GamePlayPage` → `onPlayerFrozen` | Phase 4 |
| Push notification delivery | Backend `notificationService.send()` | Phase 4 |
| `mostImproved`/`precisionKing` award calc | Backend aggregation | Phase 3 backend follow-up |

## Phase 3 Exit Criteria

| Milestone | Status |
|-----------|--------|
| Lobby + join working (players join via code, lobby shows all) | ✅ |
| Multi-device game complete (simultaneous rounds, delayed reveal, disconnection) | ✅ |
| Cellar Club season playable (create, tag, approve, leaderboard, season end) | ✅ |

## Dependencies

```bash
npm install socket.io-client
```

```env
VITE_WS_URL=    # WebSocket server URL
```
