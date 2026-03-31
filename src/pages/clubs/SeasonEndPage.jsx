/**
 * SeasonEndPage — Priority 4 (Updated)
 * Spec ref: Sections 5.5–5.6
 *
 * Changes from Phase 3 (Priority 2 delivered the canvas card work):
 * - handleEndSeason: toast on success/error
 * - handleNewSeason: toast on success ('New season started!') and error
 * - handleArchive: toast on success ('Club archived') and error
 * - handleShareResults: toast replaces inline shareStatus text
 * - All silent failures now surfaced
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useClubStore from '../../context/clubStore';
import useAuthStore from '../../context/authStore';
import useToast from '../../hooks/useToast';
import { ScreenHeader, Button, Card } from '../../components/ui';
import { renderSeasonCard, canvasToBlob } from '../../utils/canvasCards';

const SEASON_TYPES = [
  { value: 'FIXED_DATE', label: 'Fixed End Date' },
  { value: 'FIXED_LENGTH', label: 'Fixed Length' },
  { value: 'ROLLING', label: 'Rolling' },
];

function SeasonConfigOverlay({ onConfirm, onClose }) {
  const [seasonType, setSeasonType] = useState('FIXED_LENGTH');
  const [lengthDays, setLengthDays] = useState(90);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
      <div className="w-full max-w-[430px] mx-auto bg-cin-dark rounded-t-2xl p-5 pb-8 border-t border-cin-border">
        <div className="w-10 h-1 bg-cin-border rounded mx-auto mb-5" />
        <h3 className="text-cin-white font-semibold text-lg mb-4">New Season Settings</h3>

        <div className="space-y-2 mb-4">
          {SEASON_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setSeasonType(t.value)}
              className={`w-full text-left p-3 rounded-lg border text-sm transition-all
                ${seasonType === t.value
                  ? 'bg-cin-cyan/15 border-cin-cyan text-cin-cyan'
                  : 'bg-cin-card border-cin-border text-cin-muted'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {seasonType === 'FIXED_LENGTH' && (
          <div className="mb-4">
            <p className="text-xs text-cin-muted mb-2">Season Length</p>
            <div className="flex gap-2 flex-wrap">
              {[30, 60, 90, 180].map((d) => (
                <button
                  key={d}
                  onClick={() => setLengthDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${lengthDays === d
                      ? 'bg-cin-cyan text-cin-black'
                      : 'bg-cin-card border border-cin-border text-cin-muted'}`}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>
        )}

        <Button onClick={() => onConfirm({ seasonType, lengthDays })}>
          Start New Season
        </Button>
        <Button variant="secondary" onClick={onClose} className="mt-2">
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function SeasonEndPage() {
  const navigate = useNavigate();
  const { clubId } = useParams();
  const user = useAuthStore((s) => s.user);
  const { activeClub, leaderboard, isLoading, loadClub, endSeason, startNewSeason, archiveClub } = useClubStore();
  const toast = useToast();

  const [phase, setPhase] = useState('confirm');
  const [seasonData, setSeasonData] = useState(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showModifyConfig, setShowModifyConfig] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const canvasRef = useRef(null);
  const isAdmin = activeClub?.role === 'ADMIN' || activeClub?.adminId === user?.id;

  useEffect(() => { if (!activeClub) loadClub(clubId); }, [clubId, activeClub]);

  const handleEndSeason = async () => {
    const result = await endSeason(clubId);
    if (result.success) {
      setSeasonData(result.data);
      setPhase('celebration');
      toast.success('Season ended! Final standings are in.');
    } else {
      toast.error(result.error || 'Failed to end season.');
    }
  };

  const handleNewSeason = async (config) => {
    const data = config || {
      seasonType: activeClub?.currentSeason?.seasonType || 'FIXED_LENGTH',
      lengthDays: 90,
    };
    const result = await startNewSeason(clubId, data);
    if (result.success) {
      toast.success('New season started!');
      navigate(`/clubs/${clubId}`);
    } else {
      toast.error(result.error || 'Failed to start new season.');
    }
  };

  const handleModifiedSeason = (config) => {
    setShowModifyConfig(false);
    handleNewSeason(config);
  };

  const handleArchive = async () => {
    const result = await archiveClub(clubId);
    if (result.success) {
      toast.info(`${activeClub?.name} has been archived.`);
      navigate('/clubs');
    } else {
      toast.error(result.error || 'Failed to archive club.');
    }
  };

  const handleShareResults = useCallback(async () => {
    const lb = seasonData?.leaderboard || leaderboard;
    if (!canvasRef.current || !lb?.length) {
      toast.error('Nothing to share yet.');
      return;
    }

    setIsSharing(true);
    try {
      renderSeasonCard(canvasRef.current, {
        clubName: activeClub?.name,
        seasonLabel: `Season ${activeClub?.currentSeason?.seasonNumber || ''} Complete`,
        champion: lb[0],
        awards: seasonData?.awards || [],
        standings: lb,
      });

      const blob = await canvasToBlob(canvasRef.current);
      const file = new File([blob], 'cincin-season-results.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${activeClub?.name} Season Results`,
          text: `🏆 ${lb[0]?.displayName} won with ${lb[0]?.totalScore} points!`,
          files: [file],
        });
        toast.success('Season results shared!');
      } else if (navigator.share) {
        await navigator.share({
          title: `${activeClub?.name} Season Results`,
          text: `🏆 ${lb[0]?.displayName} won ${activeClub?.name} with ${lb[0]?.totalScore} points! Play CinCin.`,
          url: 'https://cincin.app',
        });
        toast.success('Season results shared!');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'cincin-season-results.png';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Image saved to downloads!');
      }
    } catch (err) {
      if (err.name !== 'AbortError') toast.error('Share failed. Try again.');
    } finally {
      setIsSharing(false);
    }
  }, [seasonData, leaderboard, activeClub, toast]);

  const offscreenCanvas = <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden="true" />;

  // Phase: confirm end
  if (phase === 'confirm') {
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
        {offscreenCanvas}
        <ScreenHeader title="End Season" onBack={() => navigate(`/clubs/${clubId}`)} />
        <Card className="mt-4">
          <h3 className="text-cin-white font-semibold text-lg mb-2">End Current Season?</h3>
          <p className="text-cin-muted text-sm mb-4">
            This will finalise standings, generate awards, and notify all members.
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => navigate(`/clubs/${clubId}`)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleEndSeason} disabled={isLoading}>
              {isLoading ? 'Ending…' : 'End Season'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Phase: celebration (after season ended, show results)
  if (phase === 'celebration') {
    const lb = seasonData?.leaderboard || leaderboard;
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
        {offscreenCanvas}
        <ScreenHeader title="Season Complete! 🏆" />

        {/* Awards */}
        {seasonData?.awards?.length > 0 && (
          <Card className="mt-4">
            <h3 className="text-cin-white font-semibold mb-3">Awards</h3>
            {seasonData.awards.map((award, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-cin-border last:border-0">
                <span className="text-xl">{award.emoji || '🏅'}</span>
                <div>
                  <p className="text-sm font-semibold text-cin-white">{award.label}</p>
                  <p className="text-xs text-cin-muted">{award.winnerName}</p>
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Final standings */}
        <Card className="mt-4">
          <h3 className="text-cin-white font-semibold mb-3">Final Standings</h3>
          {lb.map((e, i) => (
            <div key={e.userId || i} className="flex items-center gap-3 py-2 border-b border-cin-border last:border-0">
              <span className={`w-6 text-sm font-bold ${i === 0 ? 'text-cin-cyan' : 'text-cin-muted'}`}>{i + 1}</span>
              <p className="flex-1 text-cin-white text-sm">{e.displayName}</p>
              <span className="text-cin-white font-bold">{e.totalScore}</span>
            </div>
          ))}
        </Card>

        <Button
          variant="secondary"
          className="w-full mt-4"
          onClick={handleShareResults}
          disabled={isSharing}
        >
          {isSharing ? 'Generating…' : 'Share Results as Image'}
        </Button>

        {isAdmin ? (
          <Button variant="primary" className="w-full mt-3" onClick={() => setPhase('decision')}>
            What's Next?
          </Button>
        ) : (
          <Button variant="primary" className="w-full mt-3" onClick={() => navigate(`/clubs/${clubId}`)}>
            Back to Club
          </Button>
        )}
      </div>
    );
  }

  // Phase: decision (admin chooses next action)
  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
      {offscreenCanvas}
      <ScreenHeader title="What's Next?" />

      <Card className="mb-4 cursor-pointer hover:border-cin-cyan/40" onClick={() => handleNewSeason()}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <h3 className="text-cin-white font-semibold">New Season (Same Settings)</h3>
            <p className="text-cin-muted text-sm mt-1">Start fresh with the same rules.</p>
          </div>
        </div>
      </Card>

      <Card className="mb-4 cursor-pointer hover:border-cin-cyan/40" onClick={() => setShowModifyConfig(true)}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚙️</span>
          <div>
            <h3 className="text-cin-white font-semibold">New Season (Modified)</h3>
            <p className="text-cin-muted text-sm mt-1">Change season type, length, or settings.</p>
          </div>
        </div>
      </Card>

      <Card className="mb-4 cursor-pointer hover:border-cin-red/40" onClick={() => setShowArchiveConfirm(true)}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">📦</span>
          <div>
            <h3 className="text-cin-white font-semibold">Archive Club</h3>
            <p className="text-cin-muted text-sm mt-1">No new season. Club becomes read-only.</p>
          </div>
        </div>
      </Card>

      {/* Archive confirm */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="w-full max-w-[430px] mx-auto bg-cin-dark rounded-t-2xl p-5 pb-8 border-t border-cin-border">
            <h3 className="text-cin-white font-semibold text-lg mb-2">Archive {activeClub?.name}?</h3>
            <p className="text-cin-muted text-sm mb-4">
              The club will become read-only. Members can view history but no new games can be added.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowArchiveConfirm(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1 !bg-cin-red" onClick={handleArchive}>Archive</Button>
            </div>
          </div>
        </div>
      )}

      {/* Season config overlay */}
      {showModifyConfig && (
        <SeasonConfigOverlay onConfirm={handleModifiedSeason} onClose={() => setShowModifyConfig(false)} />
      )}
    </div>
  );
}
