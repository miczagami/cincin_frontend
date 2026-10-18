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
import { games as gamesApi, scan as scanApi } from '../services/api';
import socketService from '../services/socketService';
import useAuthStore from './authStore';

// ─── Backend → UI normalisers ───
// Backend game statuses: LOBBY | IN_PROGRESS | COMPLETED | ABANDONED. The UI uses ENDED for finished games.
const toStatus = (s) => (s === 'COMPLETED' || s === 'ABANDONED' ? 'ENDED' : s);

function toGuessResult(r) {
  if (!r) return null;
  return {
    ...r,
    correct: r.isCorrect,
    points: r.pointsAwarded,
    roundClaimedNotes: r.matchedNote?.note ? [r.matchedNote.note] : r.matchedNote ? [r.matchedNote] : [],
  };
}

// Applies GET /games/:id/state ({ game, bottle, noteRange, currentTurn, claimedNotes, players })
function fromGameState(state, prevConfig) {
  const { game, players = [] } = state;
  const userId = useAuthStore.getState().user?.id;
  return {
    gameId: game.id,
    gameCode: game.gameCode,
    status: toStatus(game.status),
    isHost: game.hostId === userId,
    currentRound: game.currentRound || 1,
    bottle: state.bottle,
    noteRange: state.noteRange,
    claimedNotes: state.claimedNotes || [],
    players: players.map((p) => ({ ...p, isHost: p.userId === game.hostId, isGuest: p.type === 'guest' })),
    scores: Object.fromEntries(players.map((p) => [p.displayName, p.totalScore])),
    currentPlayer: state.currentTurn
      ? { id: state.currentTurn.playerId, displayName: state.currentTurn.displayName, type: state.currentTurn.type }
      : null,
    config: {
      ...prevConfig,
      multiplayerType: game.multiplayerType,
      gameMode: game.mode,
      roundTimer: game.roundTimerSecs,
      maxRounds: game.maxRounds,
      optOutTiming: game.optOutTiming,
      scoreboardVisible: game.scoreboardVisible,
    },
  };
}

// Maps GET /games/:id/results onto the shape GameResultsPage renders
function toResults(r) {
  return {
    ...r,
    leaderboard: (r.leaderboard || []).map((p) => ({ ...p, score: p.totalScore })),
    tastingNotes: (r.noteReveal || []).map((n) => ({ ...n, category: n.genericNote, correct: n.guessed })),
    playerBreakdowns: (r.leaderboard || []).map((p) => ({
      userId: p.userId || p.displayName,
      displayName: p.displayName,
      correct: p.correctCount,
      wrong: p.guessCount - p.correctCount,
      precisionBonus: (p.guesses || []).filter((g) => g.isCorrect && g.isSpecific).length,
    })),
    clubId: r.game?.cellarClubId || null,
  };
}

const errorMessage = (err, fallback) => err?.response?.data?.error || err?.message || fallback;

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

  // ── Load / refresh authoritative state from the backend ──
  refreshState: async (gameId = get().gameId) => {
    if (!gameId) return { success: false };
    try {
      const state = await gamesApi.getState(gameId);
      set((s) => fromGameState(state, s.config));
      return { success: true, data: state };
    } catch (err) {
      set({ error: errorMessage(err, 'Failed to load game') });
      return { success: false };
    }
  },

  // ── Create game ──
  createGame: async (bottleId, { clubId } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { config, guestPlayerNames } = get();
      const payload = {
        bottleId,
        multiplayerType: config.multiplayerType,
        mode: config.gameMode,
        roundTimerSecs: config.roundTimer,
        maxRounds: config.maxRounds,
        optOutTiming: config.optOutTiming,
        scoreboardVisible: config.scoreboardVisible,
        ...((clubId || config.cellarClubId) ? { cellarClubId: clubId || config.cellarClubId } : {}),
        ...(config.multiplayerType === 'PASS_THE_PHONE' ? { guestPlayerNames } : {}),
      };
      const game = await gamesApi.create(payload);
      set({ gameId: game.id, gameCode: game.gameCode, status: 'LOBBY', isHost: true, noteRange: game.noteRange });
      await get().refreshState(game.id);
      set({ isLoading: false });
      return { success: true, data: game };
    } catch (err) {
      const error = errorMessage(err, 'Failed to create game');
      set({ error, isLoading: false });
      return { success: false, error };
    }
  },

  // ── Join game (Phase 3: multi-device/remote) ──
  joinGame: async (gameCode) => {
    set({ isLoading: true, error: null });
    try {
      const game = await gamesApi.join({ gameCode });
      set({ gameId: game.id, gameCode: game.gameCode, status: 'LOBBY', isHost: false });
      await get().refreshState(game.id);
      set({ isLoading: false });
      return { success: true, data: game };
    } catch (err) {
      const error = errorMessage(err, 'Invalid game code');
      set({ error, isLoading: false });
      return { success: false, error };
    }
  },

  // ── Start game ──
  // Multi-device/remote games start over the socket so the server can run the rounds.
  startGame: async () => {
    set({ isLoading: true, error: null });
    try {
      const { gameId, config } = get();
      if (config.multiplayerType !== 'PASS_THE_PHONE') {
        await socketService.startGame(gameId);
      } else {
        await gamesApi.start(gameId);
      }
      await get().refreshState(gameId);
      set({ status: 'IN_PROGRESS', isLoading: false });
      return { success: true };
    } catch (err) {
      set({ error: errorMessage(err, 'Failed to start'), isLoading: false });
      return { success: false };
    }
  },

  // Pass-the-phone: the host's device plays every turn, so guests are identified explicitly
  _turnIdentity: () => {
    const { currentPlayer } = get();
    return currentPlayer?.type === 'guest'
      ? { isGuest: true, guestPlayerId: currentPlayer.id }
      : { isGuest: false };
  },

  // ── Submit guess ──
  submitGuess: async (guessText) => {
    set({ isLoading: true, error: null });
    try {
      const { gameId, config } = get();
      if (config.multiplayerType !== 'PASS_THE_PHONE') {
        const result = await socketService.submitGuess(gameId, guessText);
        // The reveal may already have arrived if this was the last submission of the round
        set((s) => ({
          lastGuessResult: toGuessResult(result),
          waitingForResults: !s.roundResults,
          roundResults: s.roundResults ? { ...s.roundResults, myResult: s.roundResults.myResult || toGuessResult(result) } : null,
          isLoading: false,
        }));
        return { success: true, data: result };
      }
      const result = await gamesApi.submitGuess(gameId, { guessText, ...get()._turnIdentity() });
      set({ lastGuessResult: toGuessResult(result), isLoading: false });
      await get().refreshState(gameId);
      return { success: true, data: result };
    } catch (err) {
      set({ error: errorMessage(err, 'Failed to submit'), isLoading: false });
      return { success: false };
    }
  },

  optOut: async () => {
    try {
      const { gameId, config } = get();
      if (config.multiplayerType !== 'PASS_THE_PHONE') {
        await socketService.optOut(gameId);
        return { success: true };
      }
      await gamesApi.optOut(gameId, get()._turnIdentity());
      await get().refreshState(gameId);
      return { success: true };
    } catch (err) { return { success: false, error: errorMessage(err) }; }
  },

  // Pass-the-phone: move to the next player's turn (or next round)
  advanceToNextTurn: async () => {
    try {
      const { gameId } = get();
      const result = await gamesApi.advance(gameId);
      // advance returns the completed game when an end condition is hit
      if (result.status === 'COMPLETED') {
        set({ status: 'ENDED', lastGuessResult: null });
        return { success: true, data: { gameEnded: true } };
      }
      set({ lastGuessResult: null });
      await get().refreshState(gameId);
      return { success: true, data: { ...result, gameEnded: false } };
    } catch (err) { return { success: false, error: errorMessage(err) }; }
  },

  // Pass-the-phone: turn timer ran out — record a 0-point skip, then advance
  skipTurn: async () => {
    const { gameId, currentPlayer } = get();
    try {
      await gamesApi.autoSkip(gameId, currentPlayer?.type === 'guest'
        ? { isGuest: true, guestPlayerId: currentPlayer.id }
        : { playerId: currentPlayer?.id });
    } catch { /* still advance — the skip record is non-critical */ }
    return get().advanceToNextTurn();
  },

  endGame: async () => {
    try {
      // REST end also broadcasts game:ended to multi-device players
      await gamesApi.endGame(get().gameId);
      set({ status: 'ENDED' });
      return { success: true };
    } catch (err) { return { success: false, error: errorMessage(err) }; }
  },

  loadResults: async (gameId = get().gameId) => {
    try { return { success: true, data: toResults(await gamesApi.results(gameId)) }; }
    catch (err) { return { success: false, error: errorMessage(err) }; }
  },

  // ── Taxonomy ──
  loadTaxonomy: async () => { /* suggestions are fetched on demand by searchTaxonomy */ },
  searchTaxonomy: async (query) => {
    if (!query || query.length < 2) { set({ taxonomySuggestions: [] }); return; }
    try {
      const results = await scanApi.taxonomySearch({ q: query });
      set({ taxonomySuggestions: (results || []).map((n) => ({ ...n, isSpecific: !n.isGeneric })) });
    } catch { set({ taxonomySuggestions: [] }); }
  },

  // ── Phase 3: WebSocket event handlers (wired up by useMultiDeviceGame) ──
  // Payloads follow the server events in cincin_backend/src/config/socketServer.js
  handleGameStarted: () => set({ status: 'IN_PROGRESS' }),
  handleRoundStart: (data) => set((s) => ({
    currentRound: data.roundNumber,
    claimedNotes: data.claimedNotes || s.claimedNotes,
    config: data.timerSecs ? { ...s.config, roundTimer: data.timerSecs } : s.config,
    submittedPlayers: [], waitingForResults: false, roundResults: null, lastGuessResult: null,
  })),
  handlePlayerSubmitted: (data) => set((s) => ({
    submittedPlayers: s.submittedPlayers.includes(data.userId) ? s.submittedPlayers : [...s.submittedPlayers, data.userId],
  })),
  handleGuessResult: (data) => set({ lastGuessResult: toGuessResult(data) }),
  handleRoundReveal: (data) => set((s) => {
    const roundClaimedNotes = (data.claimedThisRound || []).map((n) => n.note);
    return {
      roundResults: { ...data, roundClaimedNotes, myResult: s.lastGuessResult },
      waitingForResults: false,
      claimedNotes: [...new Set([...s.claimedNotes, ...roundClaimedNotes])],
      scores: data.scoreboard ? Object.fromEntries(data.scoreboard.map((p) => [p.displayName, p.score])) : s.scores,
    };
  }),
  handleMyRoundResult: (data) => set((s) => ({
    lastGuessResult: toGuessResult({ ...data, matchedNote: data.matchedNote ? { note: data.matchedNote } : null }),
    roundResults: s.roundResults
      ? { ...s.roundResults, myResult: toGuessResult({ ...data, matchedNote: data.matchedNote ? { note: data.matchedNote } : null }) }
      : s.roundResults,
  })),
  handleGameEnded: () => set({ status: 'ENDED' }),
  handleHostDisconnected: () => set({ gamePaused: true }),
  handlePlayerDisconnected: (data) => set((s) => ({
    disconnectedPlayers: s.disconnectedPlayers.includes(data.userId) ? s.disconnectedPlayers : [...s.disconnectedPlayers, data.userId],
  })),
  handlePlayerReconnected: (data) => set((s) => ({
    disconnectedPlayers: s.disconnectedPlayers.filter((id) => id !== data.userId),
    gamePaused: false,
  })),

  // ── Reset ──
  resetGame: () => {
    socketService.disconnectSocket();
    set({
    status: null, gameId: null, gameCode: null, bottle: null, noteRange: null, isHost: false,
    players: [], currentPlayer: null, currentRound: 1, turnOrder: [],
    claimedNotes: [], scores: {}, lastGuessResult: null, roundResults: null,
    submittedPlayers: [], waitingForResults: false, disconnectedPlayers: [], gamePaused: false,
    guestPlayerNames: [],
    config: { multiplayerType: 'PASS_THE_PHONE', gameMode: 'PARALLEL', roundTimer: 60, maxRounds: 20, optOutTiming: 'START_OF_ROUND', scoreboardVisible: true, cellarClubId: null },
    isLoading: false, error: null,
    });
  },
  resetTimer: () => {},
  clearError: () => set({ error: null }),
}));

export default useGameStore;
