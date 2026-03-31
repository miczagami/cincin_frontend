/**
 * Socket.io Client Service — Phase 3
 * Timeline ref: Weeks 10–11 (Real-Time Infrastructure)
 * Spec ref: Sections 3.1.2, 3.1.3 (Multi-Device & Remote Play)
 *
 * Manages WebSocket connection for:
 * - Game lobby real-time player sync
 * - Simultaneous round orchestration
 * - Delayed reveal broadcasts
 * - Disconnection/reconnection handling (2-min window per Section 4.9)
 * - Live scoreboard updates
 *
 * Architecture: Singleton socket instance, JWT-authenticated,
 * auto-reconnect with exponential backoff.
 */

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WS_URL || '';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes per Section 4.9

// ═══════════════════════════════════════════
//  CONNECTION MANAGEMENT
// ═══════════════════════════════════════════

/**
 * Initialize socket connection with JWT auth.
 * Called once when user enters a multi-device/remote game.
 */
export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    reconnectAttempts = 0;
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    reconnectAttempts++;
    console.warn('[Socket] Connection error:', err.message, `(attempt ${reconnectAttempts})`);
  });

  return socket;
}

/**
 * Disconnect and clean up socket.
 */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    reconnectAttempts = 0;
  }
}

/**
 * Get the current socket instance. Returns null if not connected.
 */
export function getSocket() {
  return socket;
}

/**
 * Check if socket is currently connected.
 */
export function isConnected() {
  return socket?.connected ?? false;
}

// ═══════════════════════════════════════════
//  GAME ROOM EVENTS
// ═══════════════════════════════════════════

/**
 * Host creates a game room on the server.
 * Server responds with 'room:created' containing the game code.
 */
export function createRoom(gameId) {
  if (!socket) return;
  socket.emit('room:create', { gameId });
}

/**
 * Player joins a game room by code.
 * Server responds with 'room:joined' or 'room:error'.
 */
export function joinRoom(gameCode) {
  if (!socket) return;
  socket.emit('room:join', { gameCode });
}

/**
 * Leave the current game room.
 */
export function leaveRoom(gameId) {
  if (!socket) return;
  socket.emit('room:leave', { gameId });
}

// ═══════════════════════════════════════════
//  LOBBY EVENTS
// ═══════════════════════════════════════════

/**
 * Host starts the game from the lobby.
 * Server broadcasts 'game:started' to all players in the room.
 */
export function emitStartGame(gameId) {
  if (!socket) return;
  socket.emit('game:start', { gameId });
}

// ═══════════════════════════════════════════
//  GAMEPLAY EVENTS (Simultaneous Rounds)
// ═══════════════════════════════════════════

/**
 * Submit a guess during a simultaneous round.
 * Server evaluates and holds result until all players submit or timer expires.
 * Then broadcasts 'round:results' with delayed reveal.
 */
export function emitGuess(gameId, roundNumber, guessText) {
  if (!socket) return;
  socket.emit('game:guess', { gameId, roundNumber, guessText });
}

/**
 * Player opts out of the game.
 */
export function emitOptOut(gameId) {
  if (!socket) return;
  socket.emit('game:opt-out', { gameId });
}

/**
 * Notify server that player's timer expired (auto-skip).
 */
export function emitTimerExpired(gameId, roundNumber) {
  if (!socket) return;
  socket.emit('game:timer-expired', { gameId, roundNumber });
}

// ═══════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════

/**
 * Register event listeners for game state updates.
 * Returns an unsubscribe function.
 *
 * Events from server:
 * - room:player-joined    { player, players }
 * - room:player-left      { playerId, players }
 * - game:started          { gameState }
 * - round:started         { roundNumber, timerSeconds, claimedNotes }
 * - round:player-submitted { playerId }  (no content — just "someone submitted")
 * - round:results         { roundNumber, results[], claimedNotes }
 * - game:completed        { finalResults }
 * - player:disconnected   { playerId, reconnectDeadline }
 * - player:reconnected    { playerId }
 * - player:frozen         { playerId }  (exceeded 2-min reconnect window)
 * - game:paused           { reason }    (host disconnected)
 * - game:resumed          {}
 * - error                 { message, code }
 */
export function onGameEvents(handlers) {
  if (!socket) return () => {};

  const eventMap = {
    'room:player-joined': handlers.onPlayerJoined,
    'room:player-left': handlers.onPlayerLeft,
    'game:started': handlers.onGameStarted,
    'round:started': handlers.onRoundStarted,
    'round:player-submitted': handlers.onPlayerSubmitted,
    'round:results': handlers.onRoundResults,
    'game:completed': handlers.onGameCompleted,
    'player:disconnected': handlers.onPlayerDisconnected,
    'player:reconnected': handlers.onPlayerReconnected,
    'player:frozen': handlers.onPlayerFrozen,
    'game:paused': handlers.onGamePaused,
    'game:resumed': handlers.onGameResumed,
    'error': handlers.onError,
  };

  for (const [event, handler] of Object.entries(eventMap)) {
    if (handler) {
      socket.on(event, handler);
    }
  }

  return () => {
    for (const [event, handler] of Object.entries(eventMap)) {
      if (handler) {
        socket.off(event, handler);
      }
    }
  };
}

/**
 * One-off listener for a specific event.
 */
export function once(event, callback) {
  if (!socket) return;
  socket.once(event, callback);
}

// ═══════════════════════════════════════════
//  RECONNECTION HELPERS
// ═══════════════════════════════════════════

/**
 * Attempt to rejoin a game room after reconnection.
 * Server will restore player state if within the 2-min window.
 */
export function rejoinRoom(gameId) {
  if (!socket) return;
  socket.emit('room:rejoin', { gameId });
}

/**
 * Check if we're within the reconnection window.
 */
export function isWithinReconnectWindow(disconnectedAt) {
  if (!disconnectedAt) return false;
  return Date.now() - disconnectedAt < RECONNECT_WINDOW_MS;
}

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  isConnected,
  createRoom,
  joinRoom,
  leaveRoom,
  emitStartGame,
  emitGuess,
  emitOptOut,
  emitTimerExpired,
  onGameEvents,
  once,
  rejoinRoom,
  isWithinReconnectWindow,
};
