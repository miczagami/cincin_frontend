/**
 * SeasonHistoryPage — Phase 3 (Week 13)
 * Spec ref: Section 5.6 (season history preserved)
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useClubStore from '../../context/clubStore';
import { ScreenHeader, Card, Pill } from '../../components/ui';

export default function SeasonHistoryPage() {
  const navigate = useNavigate();
  const { clubId } = useParams();
  const { seasonHistory, loadSeasonHistory, activeClub, loadClub } = useClubStore();
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!activeClub) loadClub(clubId);
    loadSeasonHistory(clubId);
  }, [clubId]);

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-24">
      <ScreenHeader title="Season History" onBack={() => navigate(`/clubs/${clubId}`)} />
      {seasonHistory.length === 0 && (
        <p className="text-cin-muted text-sm text-center py-12">No past seasons yet.</p>
      )}
      {seasonHistory.map((season) => (
        <Card key={season.id} className="mb-3 cursor-pointer" onClick={() => setExpanded(expanded === season.id ? null : season.id)}>
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-cin-white font-semibold text-sm">{season.name || `Season ${season.seasonNumber || ''}`}</h4>
            <Pill variant={season.status === 'ENDED' ? 'muted' : 'success'} size="sm">{season.status}</Pill>
          </div>
          <p className="text-cin-muted text-xs">
            {new Date(season.startDate).toLocaleDateString()} — {season.endDate ? new Date(season.endDate).toLocaleDateString() : 'Ongoing'}
          </p>
          {season.winner && <p className="text-cin-cyan text-xs mt-1">🏆 {season.winner.displayName} — {season.winner.totalScore} pts</p>}
          {expanded === season.id && season.leaderboard && (
            <div className="mt-3 pt-3 border-t border-cin-border">
              {season.leaderboard.map((e, i) => (
                <div key={e.userId} className="flex items-center gap-3 py-1">
                  <span className="w-6 text-cin-muted text-sm text-center">{i + 1}</span>
                  <span className="flex-1 text-cin-text text-sm">{e.displayName}</span>
                  <span className="text-cin-white text-sm font-medium">{e.totalScore}</span>
                </div>
              ))}
              {season.awards?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-cin-border">
                  {season.awards.map((a, i) => <p key={i} className="text-cin-muted text-xs py-0.5">{a.type}: {a.playerName}</p>)}
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
