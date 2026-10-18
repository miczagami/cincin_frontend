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
import { getToken } from './api';

const SOCKET_URL = import.meta.env.VITE_WS_URL || '';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// ═══════════════════════════════════════════
//  CONNECTION MANAGEMENT
// ═══════════════════════════════════════════

/**
 * Initialize socket connection with JWT auth.
 * Called once when user enters a multi-device/remote game.
 */
export function connectSocket(token) {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    // Read the token on every (re)connect so a refreshed access token is used
    auth: (cb) => cb({ token: getToken() || token }),
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
//  CLIENT → SERVER EVENTS
//  Protocol: cincin_backend/src/config/socketServer.js
//  Each emit resolves with the server's ack payload, or rejects with its error.
// ═══════════════════════════════════════════

function emitWithAck(event, payload, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (!socket) { reject(new Error('Not connected')); return; }
    socket.timeout(timeoutMs).emit(event, payload, (err, res) => {
      if (err) reject(new Error('Server did not respond'));
      else if (res?.success === false) reject(new Error(res.error || 'Request failed'));
      else resolve(res);
    });
  });
}

/** Join (or rejoin after a reconnect) a game room. Player must already be in the game via REST. */
export const joinGame = (gameId) => emitWithAck('game:join', { gameId });

export function leaveGame(gameId) {
  socket?.emit('game:leave', { gameId });
}

/** Host starts a multi-device game; the server then drives rounds. */
export const startGame = (gameId) => emitWithAck('game:start', { gameId });

/** Submit a guess for the current simultaneous round. Resolves with this player's private result. */
export const submitGuess = (gameId, guessText) => emitWithAck('game:guess', { gameId, guessText });

export const optOut = (gameId) => emitWithAck('game:opt-out', { gameId });

export const endGame = (gameId) => emitWithAck('game:end', { gameId });

// ═══════════════════════════════════════════
//  SERVER → CLIENT EVENTS
// ═══════════════════════════════════════════

export const SERVER_EVENTS = {
  PLAYER_JOINED: 'game:player-joined',       // { userId, displayName, playerCount }
  PLAYER_LEFT: 'game:player-left',           // { userId, displayName }
  STARTED: 'game:started',                   // { gameId, multiplayerType, roundTimerSecs, mode }
  ROUND_START: 'game:round-start',           // { roundNumber, roundId, timerSecs, claimedNotes, activePlayers }
  PLAYER_SUBMITTED: 'game:player-submitted', // { userId, submissionsCount, totalActive }
  GUESS_RESULT: 'game:guess-result',         // private: submitGuess result
  ROUND_REVEAL: 'game:round-reveal',         // { roundNumber, claimedThisRound, scoreboard, totalClaimedNotes }
  MY_ROUND_RESULT: 'game:my-round-result',   // private: { roundNumber, guessText, isCorrect, pointsAwarded, matchedNote }
  PLAYER_OPTED_OUT: 'game:player-opted-out', // { userId, displayName }
  ENDED: 'game:ended',                       // { gameId, reason, results }
  HOST_DISCONNECTED: 'game:host-disconnected',
  PLAYER_DISCONNECTED: 'game:player-disconnected', // { userId, displayName, reconnectDeadline }
  PLAYER_RECONNECTED: 'game:player-reconnected',   // { userId, displayName }
  PLAYER_FROZEN: 'game:player-frozen',             // { userId, displayName }
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  isConnected,
  joinGame,
  leaveGame,
  startGame,
  submitGuess,
  optOut,
  endGame,
  SERVER_EVENTS,
};
