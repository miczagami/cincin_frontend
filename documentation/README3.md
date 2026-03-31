# CinCin PWA — Phase 3 Frontend

Multiplayer & Cellar Clubs frontend for the CinCin AI tasting game. Phase 3 extends from single-device to multi-device/remote play and builds the full Cellar Club system.

## What's Included

### Phase 1 — Foundation (unchanged)
- Design system (brand tokens, component library)
- Auth & age verification flow
- AI scan pipeline UI (camera, barcode, manual search)
- PWA shell (service worker, install prompt, offline detection)
- API service layer, i18n framework

### Phase 2 — Core Game (unchanged)
- Game setup with configuration
- Pass-the-phone gameplay loop with scoring engine
- Results screen with full note reveal
- Offline game support with sync

### Phase 3 — Multiplayer & Clubs (NEW)

#### Real-Time Infrastructure (Weeks 10–11)
- Socket.io client with JWT-authenticated connections
- Game room management (create, join, leave, rejoin)
- Connection status indicators (connected/reconnecting/disconnected)
- Automatic reconnection with exponential backoff

#### Multi-Device & Remote Play (Weeks 11–12)
- All three game modes now enabled: Pass-the-Phone, Multi-Device, Remote
- Join-by-code page (`/game/join`) with 6-char visual input and deep-link support
- Simultaneous round orchestration — all players guess at the same time
- Delayed reveal: results held by server until all players submit or timer expires
- "Waiting for others" state with submission counter
- Disconnection handling: 2-minute reconnect window per Section 4.9
- Host disconnect pauses game for all players
- Player frozen after 2-min timeout (score locked, auto-skip)

#### Cellar Club Core (Weeks 11–13)
- Club list page with create/join actions
- Club creation: name, member cap, season type (fixed date/length/rolling)
- Join via 6-digit invite code
- Free tier: 1 club max; Pro: unlimited (Appendix C enforcement)
- Club detail: leaderboard, activity feed, admin pending games tab
- Member management: leave club with confirmation

#### Season & Approval (Weeks 12–13)
- Game tagging to Cellar Club at setup (functional — was placeholder in Phase 2)
- Admin approval workflow: pending games tab with approve/reject buttons
- Cumulative season leaderboard from approved games
- Season end celebration: awards (Champion, Sharpest Palate, Most Improved, etc.)
- Admin decisions: start new season (same/modified settings) or archive club

#### Club Activity Feed (Week 13)
- Activity feed with 9 event types: game submitted/approved/rejected, member joined/left/removed, season started/ended, leaderboard change
- Relative timestamps (just now, 2h ago, yesterday, etc.)

## File Structure (Phase 3 additions)

```
src/
├── services/
│   ├── socketService.js    # 🆕 Socket.io client singleton
│   ├── clubApi.js          # 🆕 Club REST API client
│   ├── api.js              # Updated with clubs + notifications endpoints
│   └── gameApi.js          # Phase 2 (unchanged)
├── context/
│   ├── clubStore.js        # 🆕 Zustand store for club state
│   ├── gameStore.js        # Phase 2 (unchanged)
│   └── authStore.js        # Phase 1 (unchanged)
├── hooks/
│   ├── useSocket.js        # 🆕 Socket lifecycle hook
│   ├── useGameTimer.js     # Phase 2 (unchanged)
│   └── useOfflineSync.js   # Phase 2 (unchanged)
├── pages/
│   ├── club/
│   │   ├── ClubsListPage.jsx   # 🆕 Main clubs tab
│   │   ├── ClubDetailPage.jsx  # 🆕 Club leaderboard + activity
│   │   ├── ClubCreatePage.jsx  # 🆕 Create club form
│   │   └── SeasonEndPage.jsx   # 🆕 Season celebration + admin
│   ├── game/
│   │   ├── JoinGamePage.jsx    # 🆕 Join by code
│   │   ├── GameSetupPage.jsx   # Updated: modes enabled, club tag
│   │   ├── GameLobbyPage.jsx   # Updated: WebSocket player sync
│   │   ├── GamePlayPage.jsx    # Updated: simultaneous rounds
│   │   └── GameResultsPage.jsx # Phase 2 (unchanged)
│   └── PlaceholderPages.jsx    # Updated: removed ClubsPage
├── i18n/
│   └── en.json                 # Updated with Phase 3 keys
└── AppRouter.jsx               # Updated with club + join routes
```

## Next Phases

- [ ] **Phase 4 (Weeks 14–17):** Palate Profile dashboard, Pro subscription (Stripe), Buy tab, discovery feed, notifications
- [ ] **Phase 5 (Weeks 18–20):** PWA optimisation, offline hardening, QA, soft launch
