/**
 * useSocket Hook — Phase 3
 * Timeline ref: Weeks 10–11 (Real-Time Infrastructure)
 * Spec ref: Sections 3.1.2, 3.1.3, 4.9
 *
 * React hook for managing socket connection lifecycle.
 * Handles:
 * - Connect on mount with JWT auth
 * - Disconnect on unmount
 * - Reconnection state tracking
 * - Connection status for UI indicators
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  connectSocket, disconnectSocket, isConnected,
  onGameEvents, rejoinRoom, isWithinReconnectWindow, getSocket,
} from '../services/socketService';
import useAuthStore from '../context/authStore';

/**
 * useGameRoom — join/leave a specific game room with connection status.
 * @param {string|null} gameId
 * @returns {{ isInRoom, connectionLost, gamePaused }}
 */
export function useGameRoom(gameId) {
  const [isInRoom, setIsInRoom] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const { connected, reconnecting } = useSocket(gameId, {
    onRoomJoined: () => setIsInRoom(true),
    onRoomLeft: () => setIsInRoom(false),
    onGamePaused: (paused) => setGamePaused(paused),
  });

  useEffect(() => {
    setConnectionLost(!connected && reconnecting);
  }, [connected, reconnecting]);

  useEffect(() => {
    if (!gameId) {
      setIsInRoom(false);
      setGamePaused(false);
    }
  }, [gameId]);

  return { isInRoom: connected && !!gameId, connectionLost, gamePaused };
}

/**
 * useSocketEvent — subscribe to a single socket event while mounted.
 * @param {string} event - Socket event name
 * @param {function} handler - Event handler
 * @param {array} deps - Dependency array for handler
 */
export function useSocketEvent(event, handler, deps = []) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const wrappedHandler = (...args) => handlerRef.current(...args);
    socket.on(event, wrappedHandler);
    return () => socket.off(event, wrappedHandler);
  }, [event, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * @param {string} gameId - The game to connect to (for rejoin on reconnect)
 * @param {object} handlers - Event handler map (see socketService.onGameEvents)
 * @returns {{ connected, reconnecting, disconnectedAt, error }}
 */
export default function useSocket(gameId, handlers = {}) {
  const token = useAuthStore((s) => s.accessToken);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [disconnectedAt, setDisconnectedAt] = useState(null);
  const [error, setError] = useState(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Connect socket on mount
  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    const onConnect = () => {
      setConnected(true);
      setReconnecting(false);
      setError(null);

      // If reconnecting to an active game, rejoin the room
      if (gameId && disconnectedAt && isWithinReconnectWindow(disconnectedAt)) {
        rejoinRoom(gameId);
      }
      setDisconnectedAt(null);
    };

    const onDisconnect = () => {
      setConnected(false);
      setDisconnectedAt(Date.now());
      setReconnecting(true);
    };

    const onConnectError = (err) => {
      setError(err.message);
      setReconnecting(true);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Set initial state
    setConnected(isConnected());

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      disconnectSocket();
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Register game event handlers
  useEffect(() => {
    if (!connected) return;

    const unsubscribe = onGameEvents({
      ...handlersRef.current,
      onError: (err) => {
        setError(err.message || 'Socket error');
        handlersRef.current.onError?.(err);
      },
    });

    return unsubscribe;
  }, [connected]);

  return {
    connected,
    reconnecting,
    disconnectedAt,
    error,
  };
}
