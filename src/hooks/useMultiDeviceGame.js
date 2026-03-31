/**
 * useMultiDeviceGame — Phase 3 (Weeks 10–12)
 * Spec ref: Section 3.1.2, 3.1.3, 4.1, 4.6, 4.9
 *
 * Orchestrates WebSocket events for multi-device and remote gameplay.
 * Subscribes to socket events and dispatches to gameStore handlers.
 */

import { useEffect } from 'react';
import useGameStore from '../context/gameStore';
import { useSocketEvent, useGameRoom } from './useSocket';

export default function useMultiDeviceGame(gameId) {
  const {
    config,
    handleLobbyPlayerJoined, handleLobbyPlayerLeft, handleGameStarting,
    handleRoundStart, handlePlayerSubmitted, handleRoundResults,
    handleGameEnded, handleGamePaused, handleGameResumed,
    handlePlayerDisconnected, handlePlayerReconnected, handleStateSync,
  } = useGameStore();

  const isMultiDevice = config.multiplayerType !== 'PASS_THE_PHONE';
  const { isInRoom, connectionLost, gamePaused } = useGameRoom(isMultiDevice ? gameId : null);

  useSocketEvent('lobby:player_joined', handleLobbyPlayerJoined, []);
  useSocketEvent('lobby:player_left', handleLobbyPlayerLeft, []);
  useSocketEvent('lobby:game_starting', handleGameStarting, []);
  useSocketEvent('round:start', handleRoundStart, []);
  useSocketEvent('round:player_submitted', handlePlayerSubmitted, []);
  useSocketEvent('round:results', handleRoundResults, []);
  useSocketEvent('game:ended', handleGameEnded, []);
  useSocketEvent('game:paused', handleGamePaused, []);
  useSocketEvent('game:resumed', handleGameResumed, []);
  useSocketEvent('game:state_sync', handleStateSync, []);
  useSocketEvent('player:disconnected', handlePlayerDisconnected, []);
  useSocketEvent('player:reconnected', handlePlayerReconnected, []);

  return { isMultiDevice, isInRoom, connectionLost, gamePaused };
}
