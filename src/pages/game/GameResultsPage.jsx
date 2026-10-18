/**
 * GameResultsPage — Priority 4 (Updated)
 * Spec ref: Section 4.10, Section 5.4
 *
 * Changes from Phase 3:
 * - handleShare: toast on Web Share success ('Results shared!') and on error
 * - handleCopyLink: toast on clipboard copy ('Link copied!')
 * - Club tag success/error toasts
 * - Removed silent fail on share errors
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useGameStore from '../../context/gameStore';
import useClubStore from '../../context/clubStore';
import useToast from '../../hooks/useToast';
import { ScreenHeader, Button, Card, Pill } from '../../components/ui';

const TABS = ['Leaderboard', 'Tasting Notes', 'Breakdown'];

export default function GameResultsPage() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const { loadResults, bottle, config, resetGame } = useGameStore();
  const { clubs, fetchMyClubs, tagGameToClub } = useClubStore();
  const toast = useToast();

  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await loadResults(gameId);
      if (res.success) setResults(res.data);
      setIsLoading(false);
    })();
    fetchMyClubs();
  }, [gameId]);

  const handleShare = useCallback(async () => {
    const w = results?.leaderboard?.[0];
    const shareData = {
      title: 'CinCin Results',
      text: `${w?.displayName} won with ${w?.score} points! 🏆`,
      url: results?.shareUrl || window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Results shared!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          toast.error('Share failed. Try copying the link instead.');
        }
      }
    } else {
      // Fallback: copy URL
      handleCopyLink();
    }
  }, [results, toast]);

  const handleCopyLink = useCallback(async () => {
    const url = results?.shareUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    } catch {
      toast.error('Could not copy link.');
    }
  }, [results, toast]);

  const handlePlayAgain = () => { resetGame(); navigate('/scan'); };

  const handleTagToClub = async (clubId) => {
    const result = await tagGameToClub(clubId, gameId);
    if (result?.success) {
      toast.success('Game tagged to club — pending admin approval.');
    } else {
      toast.error(result?.error || 'Failed to tag game to club.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-cin-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cin-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5">
        <p className="text-cin-muted text-center mt-12">Results not available.</p>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate('/')}>Home</Button>
      </div>
    );
  }

  const winner = results.leaderboard?.[0];

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
      <ScreenHeader title="Game Results" />

      {/* Winner banner */}
      {winner && (
        <Card className="mt-4 text-center bg-cin-cyan/10 border-cin-cyan/30">
          <p className="text-3xl mb-2">🏆</p>
          <h2 className="text-xl font-display font-extrabold text-cin-white">{winner.displayName}</h2>
          <p className="text-cin-cyan font-semibold">{winner.score} points</p>
          {bottle && <p className="text-xs text-cin-muted mt-1">{bottle.name}</p>}
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-0 mt-5 border-b border-cin-border">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-2.5 text-xs font-semibold font-display uppercase tracking-wider transition-colors
              ${activeTab === i ? 'text-cin-cyan border-b-2 border-cin-cyan' : 'text-cin-muted'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {/* Leaderboard tab */}
        {activeTab === 0 && (
          <div className="space-y-2">
            {results.leaderboard?.map((player, i) => (
              <div key={player.userId || i} className="flex items-center gap-3 px-3 py-2.5 bg-cin-card rounded-lg border border-cin-border">
                <span className={`w-6 text-sm font-bold ${i === 0 ? 'text-cin-cyan' : 'text-cin-muted'}`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-cin-white font-body">{player.displayName}</span>
                <span className="text-sm font-bold text-cin-white">{player.score}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tasting Notes tab */}
        {activeTab === 1 && (
          <div className="space-y-2">
            {results.tastingNotes?.map((note, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5 bg-cin-card rounded-lg border border-cin-border">
                <span className={`text-xs font-semibold mt-0.5 ${note.correct ? 'text-cin-green' : 'text-cin-red'}`}>
                  {note.correct ? '✓' : '✗'}
                </span>
                <span className="text-sm text-cin-white font-body flex-1">{note.note}</span>
                {note.category && <Pill color="muted" className="text-[10px]">{note.category}</Pill>}
              </div>
            )) || (
              <p className="text-cin-muted text-sm text-center py-6">No tasting note breakdown available.</p>
            )}
          </div>
        )}

        {/* Breakdown tab */}
        {activeTab === 2 && (
          <div className="space-y-3">
            {results.playerBreakdowns?.map((player) => (
              <Card key={player.userId}>
                <p className="text-sm font-semibold text-cin-white mb-2">{player.displayName}</p>
                <div className="flex gap-4 text-xs text-cin-muted">
                  <span>Correct: <span className="text-cin-green font-bold">{player.correct}</span></span>
                  <span>Wrong: <span className="text-cin-red font-bold">{player.wrong}</span></span>
                  <span>Precision: <span className="text-cin-cyan font-bold">{player.precisionBonus}</span></span>
                </div>
              </Card>
            )) || (
              <p className="text-cin-muted text-sm text-center py-6">No breakdown available.</p>
            )}
          </div>
        )}
      </div>

      {/* Club tag (if not already tagged) */}
      {clubs.length > 0 && !results.clubId && (
        <Card className="mt-5">
          <p className="text-xs text-cin-muted mb-2">Tag this game to a club</p>
          <div className="space-y-1.5">
            {clubs.map((club) => (
              <button
                key={club.id}
                onClick={() => handleTagToClub(club.id)}
                className="w-full text-left text-xs px-3 py-2 bg-cin-dark rounded-lg border border-cin-border text-cin-text hover:border-cin-cyan/40 transition-colors"
              >
                {club.name}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleShare}>
            Share
          </Button>
          <Button variant="secondary" className="flex-1" onClick={handleCopyLink}>
            Copy Link
          </Button>
        </div>
        <Button onClick={handlePlayAgain}>Play Again</Button>
        <Button variant="secondary" onClick={() => navigate('/')}>Home</Button>
      </div>
    </div>
  );
}
