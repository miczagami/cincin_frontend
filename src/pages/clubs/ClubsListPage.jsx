/**
 * ClubsListPage — Phase 3
 * Timeline ref: Week 11–13 (Cellar Club Core)
 * Spec ref: Section 5.1 (Overview), 5.3 (Membership)
 *
 * Main Cellar Clubs tab:
 * - List of user's clubs with season status, rank, days remaining
 * - Create new club / join club via code
 * - Free vs Pro membership limits (1 club free, unlimited Pro — Appendix C)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useClubStore from '../../context/clubStore';
import useAuthStore from '../../context/authStore';
import { ScreenHeader, Button, Card, Input, Pill, EmptyState } from '../../components/ui';

function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default function ClubsListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isPro = user?.subscriptionTier === 'PRO';
  const { clubs, fetchMyClubs, joinClub, isLoading, isJoining, error } = useClubStore();

  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState(null);

  useEffect(() => { fetchMyClubs(); }, [fetchMyClubs]);

  const handleJoin = useCallback(async () => {
    if (!joinCode.trim()) return;
    setJoinError(null);
    const result = await joinClub(joinCode.trim().toUpperCase());
    if (result.success) { setShowJoin(false); setJoinCode(''); navigate(`/clubs/${result.data.id}`); }
    else { setJoinError(result.error); }
  }, [joinCode, joinClub, navigate]);

  const canCreateOrJoin = isPro || clubs.length < 1;

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const diff = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-24">
      <ScreenHeader title="Cellar Clubs" subtitle="Your leagues & seasons" />

      <div className="flex gap-2 mt-4 mb-6">
        {canCreateOrJoin ? (
          <>
            <Button variant="primary" className="flex-1" onClick={() => navigate('/clubs/create')}>+ Create Club</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setShowJoin(!showJoin)}>Join Club</Button>
          </>
        ) : (
          <Card className="w-full text-center py-4">
            <p className="text-sm text-cin-muted">Free accounts can join 1 club</p>
            <button className="text-xs text-cin-cyan mt-1" onClick={() => navigate('/settings/subscription')}>Upgrade to Pro for unlimited →</button>
          </Card>
        )}
      </div>

      {showJoin && (
        <Card className="mb-6">
          <p className="text-xs text-cin-muted mb-2">Enter invite code</p>
          <div className="flex gap-2">
            <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. A7K3M2" maxLength={6} className="flex-1 uppercase tracking-widest text-center font-bold" autoFocus />
            <Button variant="primary" onClick={handleJoin} loading={isJoining} disabled={joinCode.length < 6}>Join</Button>
          </div>
          {joinError && <p className="text-xs text-cin-red mt-2">{joinError}</p>}
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-cin-dark animate-pulse" />)}</div>
      ) : clubs.length === 0 ? (
        <EmptyState icon="🏆" title="No clubs yet" subtitle="Create a Cellar Club and invite your mates, or join one with an invite code." />
      ) : (
        <div className="space-y-3">
          {clubs.map((club) => {
            const daysLeft = getDaysRemaining(club.currentSeason?.endDate);
            return (
              <button key={club.id} onClick={() => navigate(`/clubs/${club.id}`)} className="w-full text-left">
                <Card className="border-l-[3px] border-l-cin-cyan">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-white truncate">{club.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-cin-muted">{club.memberCount || '?'} members</span>
                        {club.currentSeason && (<><span className="text-xs text-cin-muted">·</span><span className="text-xs text-cin-muted">{club.currentSeason.name || 'Season 1'}</span></>)}
                        {daysLeft !== null && (<><span className="text-xs text-cin-muted">·</span><span className="text-xs text-cin-muted">{daysLeft === 0 ? 'Ending today' : `${daysLeft}d left`}</span></>)}
                      </div>
                    </div>
                    {club.myRank && <p className="text-xl font-black text-cin-cyan ml-3">{club.myRank}{ordinalSuffix(club.myRank)}</p>}
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="text-xs text-cin-red text-center mt-4">{error}</p>}
    </div>
  );
}
