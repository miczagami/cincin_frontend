/**
 * GamePlayPage — Phase 3 Updated
 * Spec ref: Section 4.1–4.7, 4.9
 *
 * Changes from Phase 2:
 * - Dual mode: pass-the-phone (sequential) AND multi-device (simultaneous)
 * - Simultaneous rounds: submit guess, wait for all players, then reveal
 * - Delayed reveal (Section 4.6): results shown together after all submit
 * - Disconnection handling (Section 4.9): banners, paused state
 * - Player submission progress indicator
 * - Game paused overlay when host disconnects
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useGameStore from '../../context/gameStore';
import useGameTimer from '../../hooks/useGameTimer';
import useMultiDeviceGame from '../../hooks/useMultiDeviceGame';
import { Button, Card, Pill, Input } from '../../components/ui';

const PHASE = {
  INTERSTITIAL: 'interstitial', // Pass-the-phone only
  GUESSING: 'guessing',
  WAITING: 'waiting',           // Multi-device: waiting for others
  FEEDBACK: 'feedback',
};

export default function GamePlayPage() {
  const navigate = useNavigate();
  const { gameId } = useParams();

  const {
    status, bottle, currentRound, config, currentPlayer,
    turnOrder, claimedNotes, scores, lastGuessResult, roundResults,
    isHost, isLoading, error, players,
    submitGuess, optOut, advanceToNextTurn, endGame, loadResults,
    loadTaxonomy, searchTaxonomy, taxonomySuggestions,
    submittedPlayers, waitingForResults, disconnectedPlayers, gamePaused,
  } = useGameStore();

  // Phase 3: multi-device WebSocket orchestration
  const { isMultiDevice, connectionLost } = useMultiDeviceGame(gameId);

  const [phase, setPhase] = useState(isMultiDevice ? PHASE.GUESSING : PHASE.INTERSTITIAL);
  const [guessText, setGuessText] = useState('');
  const [confirmOptOut, setConfirmOptOut] = useState(false);
  const [confirmEndGame, setConfirmEndGame] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { loadTaxonomy(); }, [loadTaxonomy]);

  // Timer
  const timerDuration = config.roundTimer || 60;
  const { timeLeft, isWarning, isExpired, reset: resetCountdown } = useGameTimer(
    timerDuration,
    phase === PHASE.GUESSING,
    async () => {
      // Auto-skip on timer expiry — server handles multi-device via socket
      if (!isMultiDevice) await advanceToNextTurn();
    }
  );

  // Phase 3: when round results arrive, show feedback
  useEffect(() => {
    if (isMultiDevice && roundResults) setPhase(PHASE.FEEDBACK);
  }, [isMultiDevice, roundResults]);

  // Game ended → navigate to results
  useEffect(() => {
    if (status === 'ENDED') navigate(`/game/results/${gameId}`, { replace: true });
  }, [status, gameId, navigate]);

  // Taxonomy autocomplete debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (guessText.length >= 2) searchTaxonomy(guessText);
    }, 300);
    return () => clearTimeout(timeout);
  }, [guessText, searchTaxonomy]);

  const handleGuess = async () => {
    if (!guessText.trim()) return;
    const result = await submitGuess(guessText.trim());
    if (result.success) {
      setGuessText('');
      setPhase(isMultiDevice ? PHASE.WAITING : PHASE.FEEDBACK);
    }
  };

  const handleOptOut = async () => {
    await optOut();
    setConfirmOptOut(false);
    if (!isMultiDevice) setPhase(PHASE.FEEDBACK);
  };

  const handleNextTurn = async () => {
    if (isMultiDevice) {
      setPhase(PHASE.GUESSING);
      resetCountdown();
    } else {
      const result = await advanceToNextTurn();
      if (result.success && !result.data?.gameEnded) {
        setPhase(PHASE.INTERSTITIAL);
        resetCountdown();
      }
    }
  };

  const totalPlayers = players?.length || 0;
  const submittedCount = submittedPlayers?.length || 0;

  // ── Connection lost banner component ──
  const ConnectionBanner = connectionLost ? (
    <div className="bg-cin-red/20 border border-cin-red/40 rounded-lg p-3 mb-4">
      <p className="text-cin-red text-sm">Connection lost. Reconnecting...</p>
    </div>
  ) : null;

  // ── Game paused overlay (Section 4.9: host disconnected) ──
  if (gamePaused) {
    return (
      <div className="min-h-dvh bg-cin-black flex items-center justify-center px-5">
        <Card className="text-center">
          <span className="text-4xl mb-4 block">⏸️</span>
          <h3 className="text-cin-white text-lg font-bold mb-2">Game Paused</h3>
          <p className="text-cin-muted text-sm">The host has disconnected. Waiting for them to reconnect...</p>
          <p className="text-cin-muted text-xs mt-2">Game will end if the host doesn't return within 2 minutes.</p>
        </Card>
      </div>
    );
  }

  // ── Interstitial (pass-the-phone only) ──
  if (phase === PHASE.INTERSTITIAL && !isMultiDevice) {
    return (
      <div className="min-h-dvh bg-cin-black flex flex-col items-center justify-center px-5">
        <span className="text-5xl mb-6">📱</span>
        <h2 className="text-cin-white text-xl font-bold mb-2">Pass the phone to</h2>
        <p className="text-cin-cyan text-2xl font-bold mb-8">
          {currentPlayer?.displayName || currentPlayer?.name || 'Next Player'}
        </p>

        {claimedNotes.length > 0 && (
          <Card className="w-full max-w-sm mb-6">
            <p className="text-cin-muted text-xs uppercase tracking-wider mb-2">Claimed Notes ({claimedNotes.length})</p>
            <div className="flex flex-wrap gap-2">
              {claimedNotes.map((note, i) => <Pill key={i} variant="muted">{note}</Pill>)}
            </div>
          </Card>
        )}

        <p className="text-cin-muted text-sm mb-6">Round {currentRound} · {bottle?.name}</p>
        <Button variant="primary" className="w-full max-w-sm" onClick={() => { setPhase(PHASE.GUESSING); resetCountdown(); }}>
          I'm Ready
        </Button>
      </div>
    );
  }

  // ── Waiting for other players (multi-device, Phase 3) ──
  if (phase === PHASE.WAITING) {
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
        {ConnectionBanner}
        <div className="text-center mt-12">
          <div className="animate-pulse text-5xl mb-6">⏳</div>
          <h2 className="text-cin-white text-xl font-bold mb-2">Guess Submitted!</h2>
          <p className="text-cin-muted text-sm mb-6">Waiting for other players...</p>
          <div className="w-full max-w-xs mx-auto bg-cin-dark rounded-full h-3 mb-4">
            <div className="bg-cin-cyan h-3 rounded-full transition-all duration-500"
              style={{ width: `${totalPlayers > 0 ? (submittedCount / totalPlayers) * 100 : 0}%` }} />
          </div>
          <p className="text-cin-muted text-sm">{submittedCount} / {totalPlayers} submitted</p>
          {disconnectedPlayers.length > 0 && (
            <p className="text-cin-orange text-xs mt-4">
              {disconnectedPlayers.length} player{disconnectedPlayers.length !== 1 ? 's' : ''} disconnected
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Feedback phase ──
  if (phase === PHASE.FEEDBACK) {
    const result = isMultiDevice ? roundResults : lastGuessResult;
    const myResult = result?.myResult || result;
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
        {ConnectionBanner}
        <div className="text-center mt-8">
          <p className="text-cin-muted text-sm mb-2">Round {currentRound}</p>

          {myResult && (
            <Card className={`mb-4 border-${myResult.correct ? 'cin-green' : 'cin-red'}/30`}>
              <span className="text-3xl">{myResult.correct ? '✅' : '❌'}</span>
              <p className="text-cin-white text-lg font-bold mt-2">{myResult.correct ? 'Correct!' : 'Wrong'}</p>
              <p className="text-cin-muted text-sm">
                {myResult.correct ? `+${myResult.points} points` : `${myResult.points} points`}
              </p>
              {myResult.precisionTip && (
                <p className="text-cin-cyan text-xs mt-2">{myResult.precisionTip}</p>
              )}
            </Card>
          )}

          {result?.roundClaimedNotes?.length > 0 && (
            <Card className="mb-4">
              <p className="text-cin-muted text-xs uppercase tracking-wider mb-2">Claimed This Round</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {result.roundClaimedNotes.map((note, i) => <Pill key={i} variant="success">{note}</Pill>)}
              </div>
            </Card>
          )}

          {config.scoreboardVisible && (
            <Card className="mb-4">
              <p className="text-cin-muted text-xs uppercase tracking-wider mb-2">Scoreboard</p>
              {Object.entries(scores).sort(([, a], [, b]) => b - a).map(([name, score], i) => (
                <div key={name} className="flex items-center justify-between py-1">
                  <span className="text-cin-text text-sm">{i + 1}. {name}</span>
                  <span className="text-cin-white font-bold">{score}</span>
                </div>
              ))}
            </Card>
          )}

          <Button variant="primary" className="w-full" onClick={handleNextTurn}>Next Round</Button>
        </div>
      </div>
    );
  }

  // ── Guessing phase ──
  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
      {ConnectionBanner}

      {/* Round & timer header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-cin-muted text-xs">Round {currentRound}</p>
          {!isMultiDevice && currentPlayer && (
            <p className="text-cin-white text-sm font-medium">
              {currentPlayer.displayName || currentPlayer.name}'s turn
            </p>
          )}
        </div>
        <div className={`text-2xl font-mono font-bold ${isWarning ? 'text-cin-red animate-pulse' : 'text-cin-white'}`}>
          {timeLeft}s
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full bg-cin-dark rounded-full h-2 mb-6">
        <div className={`h-2 rounded-full transition-all duration-1000 ${isWarning ? 'bg-cin-red' : 'bg-cin-cyan'}`}
          style={{ width: `${(timeLeft / timerDuration) * 100}%` }} />
      </div>

      {/* Claimed notes */}
      {claimedNotes.length > 0 && (
        <div className="mb-4">
          <p className="text-cin-muted text-xs mb-2">Claimed ({claimedNotes.length})</p>
          <div className="flex flex-wrap gap-1">
            {claimedNotes.map((note, i) => <Pill key={i} variant="muted" size="sm">{note}</Pill>)}
          </div>
        </div>
      )}

      {bottle && (
        <p className="text-cin-muted text-xs mb-4">{bottle.name} · {bottle.noteRange || 'several'} notes to find</p>
      )}

      {/* Guess input with taxonomy autocomplete */}
      <Card className="mb-4">
        <Input ref={inputRef} placeholder="Type a tasting note..." value={guessText}
          onChange={(e) => setGuessText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGuess()} autoFocus />

        {taxonomySuggestions.length > 0 && (
          <div className="mt-2 max-h-40 overflow-y-auto">
            {taxonomySuggestions.map((s, i) => (
              <button key={i} className="w-full text-left px-3 py-2 text-cin-text text-sm hover:bg-cin-dark rounded"
                onClick={() => { setGuessText(s.name); inputRef.current?.focus(); }}>
                <span>{s.name}</span>
                {s.isSpecific && <span className="text-cin-cyan text-xs ml-2">+bonus</span>}
              </button>
            ))}
          </div>
        )}

        <Button variant="primary" className="w-full mt-3" onClick={handleGuess}
          disabled={!guessText.trim() || isLoading}>Submit Guess</Button>
      </Card>

      {/* Opt-out */}
      {!confirmOptOut ? (
        <button className="w-full text-cin-muted text-sm py-2" onClick={() => setConfirmOptOut(true)}>
          Opt Out (lock score)
        </button>
      ) : (
        <Card className="border-cin-red/30">
          <p className="text-cin-white text-sm mb-3">Are you sure? Your score will be locked and you can't rejoin.</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmOptOut(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1 !bg-cin-red" onClick={handleOptOut}>Opt Out</Button>
          </div>
        </Card>
      )}

      {/* Host end game */}
      {isHost && (
        <button className="w-full text-cin-red text-xs mt-4 py-2" onClick={() => setConfirmEndGame(true)}>
          End Game
        </button>
      )}

      {/* End game confirmation modal */}
      {confirmEndGame && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-5">
          <Card className="w-full max-w-sm">
            <h3 className="text-cin-white font-semibold text-lg mb-2">End Game?</h3>
            <p className="text-cin-muted text-sm mb-4">All players will see results based on current scores.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmEndGame(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1 !bg-cin-red" onClick={async () => { await endGame(); }}>End Game</Button>
            </div>
          </Card>
        </div>
      )}

      {error && <p className="text-cin-red text-sm text-center mt-4">{error}</p>}
    </div>
  );
}
