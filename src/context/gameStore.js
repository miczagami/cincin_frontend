/**
 * Game Store — Phase 3 Updated
 * Spec ref: Section 3, 4
 *
 * Changes from Phase 2:
 * - Multi-device/remote game support via WebSocket
 * - Simultaneous round orchestration + delayed reveal (Section 4.6)
 * - Disconnection handling (Section 4.9)
 * - Cellar Club tag for games (Section 5.4)
 * - WebSocket event handlers for real-time state sync
 */

import { create } from 'zustand';
import { games as gamesApi } from '../services/api';
import socketService from '../services/socketService';

const useGameStore = create((set, get) => ({
  // ── Game config ──
  config: {
    multiplayerType: 'PASS_THE_PHONE', // 'PASS_THE_PHONE' | 'MULTI_DEVICE' | 'REMOTE'
    gameMode: 'PARALLEL',
    roundTimer: 60,
    maxRounds: 20,
    optOutTiming: 'START_OF_ROUND',
    scoreboardVisible: true,
    cellarClubId: null, // Phase 3: tag game to club
  },
  guestPlayerNames: [],

  // ── Game state ──
  status: null, gameId: null, gameCode: null,
  bottle: null, noteRange: null, isHost: false,

  // ── Players ──
  players: [], currentPlayer: null, currentRound: 1, turnOrder: [],

  // ── Gameplay ──
  claimedNotes: [], scores: {},
  lastGuessResult: null,
  roundResults: null, // Phase 3: delayed reveal for multi-device

  // ── Multi-device state (Phase 3) ──
  submittedPlayers: [],
  waitingForResults: false,
  disconnectedPlayers: [],
  gamePaused: false,

  // ── Taxonomy ──
  taxonomySuggestions: [],

  // ── UI state ──
  isLoading: false, error: null,

  // ── Config actions ──
  updateConfig: (updates) => set((s) => ({ config: { ...s.config, ...updates } })),
  addGuestPlayer: (name) => set((s) => ({ guestPlayerNames: [...s.guestPlayerNames, name] })),
  removeGuestPlayer: (index) => set((s) => ({ guestPlayerNames: s.guestPlayerNames.filter((_, i) => i !== index) })),
  setBottle: (bottle, noteRange) => set({ bottle, noteRange }),
  setCellarClubTag: (clubId) => set((s) => ({ config: { ...s.config, cellarClubId: clubId } })),

  // ── Create game ──
  createGame: async (bottleId) => {
    set({ isLoading: true, error: null });
    try {
      const state = get();
      const payload = {
        bottleId,
        multiplayerType: state.config.multiplayerType,
        gameMode: state.config.gameMode,
        roundTimer: state.config.roundTimer,
        maxRounds: state.config.maxRounds,
        optOutTiming: state.config.optOutTiming,
        scoreboardVisible: state.config.scoreboardVisible,
        cellarClubId: state.config.cellarClubId,
        ...(state.config.multiplayerType === 'PASS_THE_PHONE' ? { guestPlayerNames: state.guestPlayerNames } : {}),
      };
      const res = await gamesApi.create(payload);
      const game = res.data;
      set({ gameId: game.id, gameCode: game.gameCode, status: 'LOBBY', isHost: true, players: game.players || [], isLoading: false });
      if (state.config.multiplayerType !== 'PASS_THE_PHONE') socketService.joinRoom(game.id);
      return { success: true, data: game };
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to create game', isLoading: false });
      return { success: false };
    }
  },

  // ── Join game (Phase 3: multi-device/remote) ──
  joinGame: async (gameCode) => {
    set({ isLoading: true, error: null });
    try {
      const res = await gamesApi.join(gameCode);
      const game = res.data;
      set({
        gameId: game.id, gameCode: game.gameCode, status: 'LOBBY', isHost: false,
        bottle: game.bottle, noteRange: game.noteRange, players: game.players || [],
        config: { ...get().config, multiplayerType: game.multiplayerType || 'MULTI_DEVICE', gameMode: game.gameMode, roundTimer: game.roundTimer, maxRounds: game.maxRounds, optOutTiming: game.optOutTiming, scoreboardVisible: game.scoreboardVisible },
        isLoading: false,
      });
      return { success: true, data: game };
    } catch (err) {
      set({ error: err.response?.data?.error || 'Invalid game code', isLoading: false });
      return { success: false };
    }
  },

  // ── Start game ──
  startGame: async () => {
    set({ isLoading: true, error: null });
    try {
      const { gameId, config } = get();
      const res = await gamesApi.start(gameId);
      if (config.multiplayerType !== 'PASS_THE_PHONE') socketService.startGame(gameId);
      set({ status: 'IN_PROGRESS', currentRound: 1, turnOrder: res.data.turnOrder || [], currentPlayer: res.data.currentPlayer || null, isLoading: false });
      return { success: true, data: res.data };
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to start', isLoading: false });
      return { success: false };
    }
  },

  // ── Submit guess ──
  submitGuess: async (guessText, isGuest = false, guestPlayerId = null) => {
    set({ isLoading: true, error: null });
    try {
      const { gameId, config, currentRound } = get();
      if (config.multiplayerType !== 'PASS_THE_PHONE') {
        socketService.submitGuess(gameId, { guessText, round: currentRound });
        set({ waitingForResults: true, isLoading: false });
        return { success: true };
      }
      const res = await gamesApi.guess(gameId, { guessText, isGuest, guestPlayerId });
      set({ lastGuessResult: res.data, claimedNotes: res.data.claimedNotes || get().claimedNotes, scores: res.data.scores || get().scores, isLoading: false });
      return { success: true, data: res.data };
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to submit', isLoading: false });
      return { success: false };
    }
  },

  optOut: async (isGuest = false, guestPlayerId = null) => {
    try {
      const { gameId, config } = get();
      if (config.multiplayerType !== 'PASS_THE_PHONE') { socketService.submitOptOut(gameId); return { success: true }; }
      await gamesApi.optOut(gameId, { isGuest, guestPlayerId });
      return { success: true };
    } catch (err) { return { success: false, error: err.response?.data?.error }; }
  },

  advanceToNextTurn: async () => {
    try {
      const res = await gamesApi.advance(get().gameId);
      set({ currentPlayer: res.data.currentPlayer, currentRound: res.data.currentRound, claimedNotes: res.data.claimedNotes || get().claimedNotes, lastGuessResult: null });
      if (res.data.gameEnded) set({ status: 'ENDED' });
      return { success: true, data: res.data };
    } catch (err) { return { success: false }; }
  },

  endGame: async () => {
    try {
      const { gameId, config } = get();
      if (config.multiplayerType !== 'PASS_THE_PHONE') socketService.endGame(gameId);
      await gamesApi.end(gameId);
      set({ status: 'ENDED' });
      return { success: true };
    } catch (err) { return { success: false }; }
  },

  loadResults: async () => {
    try { const res = await gamesApi.results(get().gameId); return { success: true, data: res.data }; }
    catch (err) { return { success: false }; }
  },

  // ── Taxonomy ──
  loadTaxonomy: async () => { /* STUB: loaded via scan service, same as Phase 2 */ },
  searchTaxonomy: async (query) => {
    if (!query || query.length < 2) { set({ taxonomySuggestions: [] }); return; }
    try { const { scan } = await import('../services/api'); const res = await scan.taxonomySearch(query); set({ taxonomySuggestions: res.data.results || res.data }); }
    catch { set({ taxonomySuggestions: [] }); }
  },

  // ── Phase 3: WebSocket event handlers (called by useMultiDeviceGame) ──
  handleLobbyPlayerJoined: (data) => set((s) => ({ players: [...s.players.filter((p) => p.id !== data.player?.id), data.player].filter(Boolean) })),
  handleLobbyPlayerLeft: (data) => set((s) => ({ players: s.players.filter((p) => p.id !== data.playerId) })),
  handleGameStarting: (data) => set({ status: 'IN_PROGRESS', currentRound: data.round || 1 }),
  handleRoundStart: (data) => set({ currentRound: data.round, submittedPlayers: [], waitingForResults: false, roundResults: null, lastGuessResult: null }),
  handlePlayerSubmitted: (data) => set((s) => ({ submittedPlayers: [...s.submittedPlayers, data.playerId] })),
  handleRoundResults: (data) => set({ roundResults: data, waitingForResults: false, claimedNotes: data.claimedNotes || [], scores: data.scores || {}, lastGuessResult: data.myResult || null }),
  handleGameEnded: () => set({ status: 'ENDED' }),
  handleGamePaused: () => set({ gamePaused: true }),
  handleGameResumed: () => set({ gamePaused: false }),
  handlePlayerDisconnected: (data) => set((s) => ({ disconnectedPlayers: [...s.disconnectedPlayers, data.playerId] })),
  handlePlayerReconnected: (data) => set((s) => ({ disconnectedPlayers: s.disconnectedPlayers.filter((id) => id !== data.playerId) })),
  handleStateSync: (data) => set({ status: data.status, currentRound: data.currentRound, claimedNotes: data.claimedNotes || [], scores: data.scores || {}, players: data.players || [], submittedPlayers: data.submittedPlayers || [], disconnectedPlayers: data.disconnectedPlayers || [] }),

  // ── Reset ──
  resetGame: () => set({
    status: null, gameId: null, gameCode: null, bottle: null, noteRange: null, isHost: false,
    players: [], currentPlayer: null, currentRound: 1, turnOrder: [],
    claimedNotes: [], scores: {}, lastGuessResult: null, roundResults: null,
    submittedPlayers: [], waitingForResults: false, disconnectedPlayers: [], gamePaused: false,
    guestPlayerNames: [],
    config: { multiplayerType: 'PASS_THE_PHONE', gameMode: 'PARALLEL', roundTimer: 60, maxRounds: 20, optOutTiming: 'START_OF_ROUND', scoreboardVisible: true, cellarClubId: null },
    isLoading: false, error: null,
  }),
  resetTimer: () => {},
  clearError: () => set({ error: null }),
}));

export default useGameStore;
