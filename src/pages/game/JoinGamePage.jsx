/**
 * JoinGamePage — Phase 3
 * Timeline ref: Weeks 10–11 (Real-Time Infrastructure)
 * Spec ref: Sections 3.1.2, 3.1.3 (Multi-Device & Remote)
 *
 * Standalone page for joining a game by code:
 * - 6-character code input with paste support
 * - Validates code format before attempting join
 * - On success → navigate to lobby
 * - Deep-linkable: /game/join?code=A7K3M2
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useGameStore from '../../context/gameStore';
import { ScreenHeader, Button, Input } from '../../components/ui';

export default function JoinGamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { joinGame, isLoading, error } = useGameStore();

  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState(null);
  const inputRef = useRef(null);

  // Auto-fill from URL param (deep link: /game/join?code=A7K3M2)
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode && urlCode.length === 6) {
      setCode(urlCode.toUpperCase());
    }
  }, [searchParams]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCodeChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(val);
    setJoinError(null);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(pasted);
    setJoinError(null);
  };

  const handleJoin = async () => {
    if (code.length !== 6) {
      setJoinError('Code must be 6 characters');
      return;
    }

    setJoinError(null);
    const result = await joinGame(code);

    if (result.success) {
      navigate(`/game/lobby/${result.data.id}`, { replace: true });
    } else {
      setJoinError(result.error || 'Game not found. Check the code and try again.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleJoin();
    }
  };

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8 flex flex-col">
      <ScreenHeader
        title="Join Game"
        back="Home"
        onBack={() => navigate('/')}
      />

      <div className="flex-1 flex flex-col items-center justify-center -mt-12">
        <p className="text-sm text-cin-muted mb-6 text-center">
          Enter the 6-character game code to join
        </p>

        {/* Code input — large character display */}
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-12 h-16 rounded-lg flex items-center justify-center text-2xl font-black font-display
                ${code[i]
                  ? 'bg-cin-dark border border-cin-cyan text-cin-cyan'
                  : 'bg-cin-dark border border-cin-border text-cin-muted'}
              `}
            >
              {code[i] || '·'}
            </div>
          ))}
        </div>

        {/* Hidden actual input (captures keyboard + paste) */}
        <input
          ref={inputRef}
          value={code}
          onChange={handleCodeChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          maxLength={6}
          className="sr-only"
          aria-label="Game code"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
        />

        {/* Tap to focus (in case focus is lost on mobile) */}
        <button
          onClick={() => inputRef.current?.focus()}
          className="text-xs text-cin-muted mb-6 underline"
        >
          Tap to type code
        </button>

        {/* Error */}
        {(joinError || error) && (
          <p className="text-xs text-cin-red text-center mb-4">
            {joinError || error}
          </p>
        )}

        {/* Join button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleJoin}
          loading={isLoading}
          disabled={code.length !== 6 || isLoading}
          className="max-w-xs"
        >
          {isLoading ? 'Joining…' : 'Join Game'}
        </Button>
      </div>
    </div>
  );
}
