/**
 * GameSetupPage — Priority 4 (Updated)
 * Spec ref: Section 3.6 (Game Configuration), Appendix A
 *
 * Changes from Phase 3:
 * - handleStart: createGame failure now shows toast instead of relying only on inline error text
 * - The inline `error` display is kept as a secondary fallback
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useGameStore from '../../context/gameStore';
import useAuthStore from '../../context/authStore';
import useClubStore from '../../context/clubStore';
import useToast from '../../hooks/useToast';
import {
  ScreenHeader, Button, Card, Input, Toggle, Pill,
} from '../../components/ui';

const TIMER_OPTIONS = [30, 45, 60, 90, 120];
const ROUND_OPTIONS = [5, 10, 15, 20, 30, 50];
const OPT_OUT_OPTIONS = [
  { value: 'ANY_MOMENT', label: 'Any time' },
  { value: 'START_OF_ROUND', label: 'Start of round' },
  { value: 'AFTER_RESULTS', label: 'After results' },
];

export default function GameSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const bottle = location.state?.bottle || null;
  const noteRange = location.state?.noteRange || null;
  const toast = useToast();

  const user = useAuthStore((s) => s.user);
  const isPro = user?.subscriptionTier === 'PRO';

  const {
    config, guestPlayerNames,
    updateConfig, addGuestPlayer, removeGuestPlayer,
    setBottle, createGame, isLoading, error,
  } = useGameStore();

  const { clubs, fetchMyClubs } = useClubStore();
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState('');

  useEffect(() => {
    if (bottle) setBottle(bottle, noteRange);
  }, [bottle, noteRange, setBottle]);

  useEffect(() => { fetchMyClubs(); }, [fetchMyClubs]);

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name || guestPlayerNames.includes(name)) return;
    addGuestPlayer(name);
    setNewPlayerName('');
  };

  const handleStart = async () => {
    if (!bottle?.id) return;
    if (config.multiplayerType === 'PASS_THE_PHONE' && guestPlayerNames.length < 1) return;

    const result = await createGame(bottle.id, { clubId: selectedClubId });
    if (result.success) {
      navigate(`/game/lobby/${result.data.id}`);
    } else {
      toast.error(result.error || 'Failed to create game. Please try again.');
    }
  };

  const isPassThePhone = config.multiplayerType === 'PASS_THE_PHONE';
  const totalPlayers = isPassThePhone ? guestPlayerNames.length + 1 : 1;
  const canStart = (isPassThePhone ? totalPlayers >= 2 : true) && bottle?.id;

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
      <ScreenHeader
        title="Game Setup"
        subtitle={bottle ? `${bottle.name} · ${bottle.vintage || ''}` : 'Configure your game'}
        back="Back"
        onBack={() => navigate(-1)}
      />

      {/* Bottle card */}
      {bottle && (
        <Card className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            {bottle.imageUrl && (
              <img src={bottle.imageUrl} alt={bottle.name} className="w-12 h-16 rounded object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{bottle.name}</p>
              <p className="text-xs text-cin-muted">{bottle.producer} · {bottle.region}</p>
              {noteRange && (
                <p className="text-xs text-cin-cyan mt-1">{noteRange.min}–{noteRange.max} tasting notes to find</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Multiplayer Mode */}
      <section className="mb-5">
        <label className="text-xs text-cin-muted mb-2 block">Game Type</label>
        <div className="flex gap-2">
          {[
            { value: 'PASS_THE_PHONE', label: 'Pass the Phone', desc: 'Share one device' },
            { value: 'MULTI_DEVICE', label: 'Multi-Device', desc: 'Same room, own devices' },
            { value: 'REMOTE', label: 'Remote', desc: 'Different locations' },
          ].map((opt) => {
            const locked = opt.value !== 'PASS_THE_PHONE' && !isPro;
            return (
              <button
                key={opt.value}
                onClick={() => !locked && updateConfig({ multiplayerType: opt.value })}
                className={`flex-1 py-2.5 px-2 rounded-lg text-center transition-all
                  ${config.multiplayerType === opt.value
                    ? 'bg-cin-cyan/15 border border-cin-cyan text-cin-cyan'
                    : 'bg-cin-dark border border-cin-border text-cin-muted'}
                  ${locked ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              >
                <span className="text-[11px] font-semibold block">{opt.label}</span>
                <span className="text-[10px] opacity-70">{locked ? 'Pro' : opt.desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Timer */}
      <section className="mb-5">
        <label className="text-xs text-cin-muted mb-2 block">Round Timer</label>
        <div className="flex gap-2 flex-wrap">
          {TIMER_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => updateConfig({ roundTimer: t })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${config.roundTimer === t
                  ? 'bg-cin-cyan/15 border border-cin-cyan text-cin-cyan'
                  : 'bg-cin-dark border border-cin-border text-cin-muted'}`}
            >
              {t}s
            </button>
          ))}
        </div>
      </section>

      {/* Rounds */}
      <section className="mb-5">
        <label className="text-xs text-cin-muted mb-2 block">Rounds</label>
        <div className="flex gap-2 flex-wrap">
          {ROUND_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => updateConfig({ totalRounds: r })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${config.totalRounds === r
                  ? 'bg-cin-cyan/15 border border-cin-cyan text-cin-cyan'
                  : 'bg-cin-dark border border-cin-border text-cin-muted'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      {/* Scoreboard visibility */}
      <section className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs text-cin-muted block">Scoreboard Visibility</label>
            <span className="text-[10px] text-cin-muted">
              {config.scoreboardVisible ? 'Players see scores during game' : 'Hidden until game ends'}
            </span>
          </div>
          <Toggle
            checked={config.scoreboardVisible}
            onChange={(v) => updateConfig({ scoreboardVisible: v })}
            disabled={!isPro}
          />
        </div>
      </section>

      {/* Opt-out rule */}
      <section className="mb-5">
        <label className="text-xs text-cin-muted mb-2 block">Opt-Out Timing</label>
        <div className="flex gap-2">
          {OPT_OUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateConfig({ optOutRule: opt.value })}
              className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-semibold text-center transition-all
                ${config.optOutRule === opt.value
                  ? 'bg-cin-cyan/15 border border-cin-cyan text-cin-cyan'
                  : 'bg-cin-dark border border-cin-border text-cin-muted'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Guest players (pass-the-phone) */}
      {isPassThePhone && (
        <section className="mb-6">
          <label className="text-xs text-cin-muted mb-2 block">Players</label>
          <div className="space-y-1.5 mb-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-cin-dark rounded-lg">
              <span className="text-xs text-cin-white flex-1">{user?.displayName || 'You'} (host)</span>
              <Pill color="cyan" className="text-[10px]">Host</Pill>
            </div>
            {guestPlayerNames.map((name) => (
              <div key={name} className="flex items-center gap-2 px-3 py-2 bg-cin-dark rounded-lg border border-cin-border">
                <span className="text-xs text-cin-white flex-1">{name}</span>
                <button
                  onClick={() => removeGuestPlayer(name)}
                  className="text-cin-muted hover:text-cin-red text-xs transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add player name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              className="flex-1"
            />
            <Button variant="secondary" onClick={handleAddPlayer} className="flex-shrink-0">Add</Button>
          </div>
        </section>
      )}

      {/* Cellar Club tag */}
      {clubs.length > 0 && (
        <section className="mb-6">
          <label className="text-xs text-cin-muted mb-2 block">Tag to Cellar Club</label>
          <div className="space-y-1.5">
            <button
              onClick={() => setSelectedClubId(null)}
              className={`w-full p-3 rounded-lg text-left text-xs transition-all
                ${!selectedClubId
                  ? 'bg-cin-cyan/15 border border-cin-cyan text-cin-cyan'
                  : 'bg-cin-dark border border-cin-border text-cin-muted'}`}
            >
              No club (standalone game)
            </button>
            {clubs.map((club) => (
              <button
                key={club.id}
                onClick={() => setSelectedClubId(club.id)}
                className={`w-full p-3 rounded-lg text-left transition-all
                  ${selectedClubId === club.id
                    ? 'bg-cin-cyan/15 border border-cin-cyan'
                    : 'bg-cin-dark border border-cin-border'}`}
              >
                <span className={`text-xs font-semibold ${selectedClubId === club.id ? 'text-cin-cyan' : 'text-white'}`}>
                  {club.name}
                </span>
                {club.currentSeason && (
                  <span className="text-[10px] text-cin-muted block mt-0.5">
                    {club.currentSeason.name || 'Active season'} · Requires admin approval
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Inline error (kept as secondary — toast fires on failure too) */}
      {error && <p className="text-xs text-cin-red text-center mb-4">{error}</p>}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleStart}
        disabled={!canStart || isLoading}
        loading={isLoading}
      >
        {isLoading ? 'Creating…' : 'Create Game'}
      </Button>

      {!canStart && isPassThePhone && guestPlayerNames.length < 1 && (
        <p className="text-xs text-cin-muted text-center mt-2">Add at least 1 other player</p>
      )}
    </div>
  );
}
