/**
 * useMultiDeviceGame — Phase 3 (Weeks 10–12)
 * Spec ref: Section 3.1.2, 3.1.3, 4.1, 4.6, 4.9
 *
 * Orchestrates WebSocket events for multi-device and remote gameplay.
 * Connects the shared socket, joins the game room (and rejoins after a
 * reconnect), and dispatches server events to gameStore handlers.
 *
 * The socket stays open across lobby → play navigation; gameStore.resetGame()
 * disconnects it when the player leaves the game.
 */

import { useEffect, useState } from 'react';
import useGameStore from '../context/gameStore';
import useAuthStore from '../context/authStore';
import socketService, { SERVER_EVENTS as E } from '../services/socketService';

export default function useMultiDeviceGame(gameId) {
  const multiplayerType = useGameStore((s) => s.config.multiplayerType);
  const gamePaused = useGameStore((s) => s.gamePaused);
  const token = useAuthStore((s) => s.token);
  const isMultiDevice = multiplayerType !== 'PASS_THE_PHONE';

  const [connected, setConnected] = useState(socketService.isConnected());
  const [connectionLost, setConnectionLost] = useState(false);

  useEffect(() => {
    if (!isMultiDevice || !gameId || !token) return undefined;

    const store = useGameStore.getState();
    const socket = socketService.connectSocket(token);
    const refresh = () => useGameStore.getState().refreshState(gameId);

    const join = () => {
      socketService.joinGame(gameId).then(refresh).catch((err) => {
        // Already in the room (e.g. lobby → play navigation) — just resync
        console.warn('[Socket] game:join:', err.message);
        refresh();
      });
    };

    const handlers = {
      connect: () => { setConnected(true); setConnectionLost(false); join(); },
      disconnect: () => { setConnected(false); setConnectionLost(true); },
      [E.PLAYER_JOINED]: refresh,
      [E.PLAYER_LEFT]: refresh,
      [E.PLAYER_OPTED_OUT]: refresh,
      [E.STARTED]: store.handleGameStarted,
      [E.ROUND_START]: store.handleRoundStart,
      [E.PLAYER_SUBMITTED]: store.handlePlayerSubmitted,
      [E.GUESS_RESULT]: store.handleGuessResult,
      [E.ROUND_REVEAL]: store.handleRoundReveal,
      [E.MY_ROUND_RESULT]: store.handleMyRoundResult,
      [E.ENDED]: store.handleGameEnded,
      [E.HOST_DISCONNECTED]: store.handleHostDisconnected,
      [E.PLAYER_DISCONNECTED]: store.handlePlayerDisconnected,
      [E.PLAYER_RECONNECTED]: store.handlePlayerReconnected,
    };

    for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);
    if (socket.connected) handlers.connect();

    return () => {
      for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler);
    };
  }, [isMultiDevice, gameId, token]);

  return { isMultiDevice, isInRoom: connected && !!gameId, connectionLost, gamePaused };
}
