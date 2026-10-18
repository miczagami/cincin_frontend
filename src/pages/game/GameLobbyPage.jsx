/**
 * GameLobbyPage — Phase 3 Updated
 * Spec ref: Section 3.7 (Game Lobby)
 *
 * Changes from Phase 2:
 * - WebSocket real-time player join/leave for multi-device/remote
 * - Share game code via native share API
 * - Connection lost banner
 * - Lobby syncs via socket events, not polling
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useGameStore from '../../context/gameStore';
import useMultiDeviceGame from '../../hooks/useMultiDeviceGame';
import { ScreenHeader, Button, Card, Pill } from '../../components/ui';

export default function GameLobbyPage() {
  const navigate = useNavigate();
  const { gameId } = useParams();

  const {
    gameCode, status, isHost, players, bottle, noteRange, config,
    startGame, isLoading, error,
  } = useGameStore();

  // Phase 3: WebSocket event handling for multi-device
  const { isMultiDevice, connectionLost } = useMultiDeviceGame(gameId);

  const [lobbyTimer, setLobbyTimer] = useState(10 * 60);

  // Lobby countdown (10 min timeout, Section 3.7)
  useEffect(() => {
    if (status !== 'LOBBY') return;
    const interval = setInterval(() => {
      setLobbyTimer((t) => {
        if (t <= 1) { clearInterval(interval); navigate('/'); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, navigate]);

  const handleStart = useCallback(async () => {
    const result = await startGame();
    if (result.success) navigate(`/game/play/${gameId}`, { replace: true });
  }, [startGame, gameId, navigate]);

  // If game already started, redirect to play
  useEffect(() => {
    if (status === 'IN_PROGRESS') navigate(`/game/play/${gameId}`, { replace: true });
  }, [status, gameId, navigate]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleShareCode = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my CinCin game!',
          text: `Join my tasting game! Game code: ${gameCode}`,
          url: `${window.location.origin}/game/join?code=${gameCode}`,
        });
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard?.writeText(gameCode);
    }
  };

  const allPlayers = players || [];
  const canStart = isHost && allPlayers.length >= 2;

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
      <ScreenHeader
        title="Game Lobby"
        subtitle={bottle ? `${bottle.name} ${bottle.vintage || ''}`.trim() : ''}
        onBack={() => navigate('/')}
      />

      {/* Connection lost banner (Phase 3) */}
      {connectionLost && (
        <div className="bg-cin-red/20 border border-cin-red/40 rounded-lg p-3 mb-4">
          <p className="text-cin-red text-sm font-medium">Connection lost. Reconnecting...</p>
        </div>
      )}

      {/* Game code */}
      {gameCode && (
        <Card className="mb-4 text-center">
          <p className="text-cin-muted text-xs uppercase tracking-wider mb-2">Game Code</p>
          <button
            className="text-cin-cyan text-3xl font-mono tracking-[0.3em] font-bold"
            onClick={handleShareCode}
            title="Tap to share"
          >
            {gameCode}
          </button>
          <p className="text-cin-muted text-xs mt-2">
            {navigator.share ? 'Tap to share' : 'Tap to copy'}
          </p>
        </Card>
      )}

      {/* Mode indicator */}
      <div className="flex items-center justify-between mb-4">
        <Pill variant="cyan">
          {config.multiplayerType === 'PASS_THE_PHONE' ? 'Pass the Phone' :
           config.multiplayerType === 'MULTI_DEVICE' ? 'Multi-Device' : 'Remote'}
        </Pill>
        <span className="text-cin-muted text-sm">{formatTimer(lobbyTimer)}</span>
      </div>

      {/* Note range */}
      {noteRange && (
        <p className="text-cin-muted text-xs text-center mb-4">{noteRange.low}–{noteRange.high} tasting notes to find</p>
      )}

      {/* Player list */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-cin-muted text-xs uppercase tracking-wider">
            Players ({allPlayers.length})
          </label>
          {isMultiDevice && (
            <span className="text-cin-muted text-xs">Waiting for players...</span>
          )}
        </div>
        {allPlayers.map((player, i) => (
          <div key={player.id || i} className="flex items-center gap-3 py-2 border-b border-cin-border last:border-0">
            <div className="w-8 h-8 rounded-full bg-cin-dark flex items-center justify-center text-cin-muted text-sm font-bold">
              {(player.displayName || player.name || '?')[0].toUpperCase()}
            </div>
            <span className="text-cin-white text-sm flex-1">
              {player.displayName || player.name}
            </span>
            {player.isHost && <Pill variant="cyan" size="sm">Host</Pill>}
            {player.isGuest && <Pill variant="muted" size="sm">Guest</Pill>}
          </div>
        ))}
        {allPlayers.length === 0 && (
          <p className="text-cin-muted text-sm text-center py-4">No players yet</p>
        )}
      </Card>

      {error && <p className="text-cin-red text-sm text-center mb-4">{error}</p>}

      {/* Start button (host only) */}
      {isHost && (
        <Button
          variant="primary" className="w-full"
          onClick={handleStart}
          disabled={!canStart || isLoading}
        >
          {isLoading ? 'Starting...' : `Start Game (${allPlayers.length} players)`}
        </Button>
      )}

      {/* Non-host waiting message */}
      {!isHost && (
        <Card className="text-center">
          <div className="animate-pulse text-cin-cyan text-lg mb-2">⏳</div>
          <p className="text-cin-muted text-sm">Waiting for host to start the game...</p>
        </Card>
      )}
    </div>
  );
}
