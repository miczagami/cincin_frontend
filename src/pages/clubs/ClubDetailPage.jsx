/**
 * ClubDetailPage — Priority 4 (Updated)
 * Spec ref: Sections 5.4–5.7
 *
 * Changes from Phase 3:
 * - PendingGameCard: toast on approve success/error and reject success/error
 * - handleShare/handleCopyInvite: toast on clipboard copy ('Invite link copied!')
 * - handleLeave: toast on success ('You've left the club') and error
 * - Admin actions that trigger notifications now confirmed with toast
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useClubStore from '../../context/clubStore';
import useAuthStore from '../../context/authStore';
import useToast from '../../hooks/useToast';
import { ScreenHeader, Button, Card, Pill } from '../../components/ui';

const ACTIVITY_ICONS = {
  GAME_SUBMITTED: '🎮', GAME_APPROVED: '✅', GAME_REJECTED: '❌',
  MEMBER_JOINED: '👋', MEMBER_LEFT: '👤', MEMBER_REMOVED: '🚫',
  SEASON_STARTED: '🏁', SEASON_ENDED: '🏆', LEADERBOARD_CHANGE: '📊',
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getDaysRemaining(endDate) {
  if (!endDate) return null;
  return Math.max(0, Math.ceil((new Date(endDate) - new Date()) / 86400000));
}

/** Pending game approval card (Section 5.4) */
function PendingGameCard({ game, clubId, toast }) {
  const { approveGame, rejectGame } = useClubStore();
  const [acting, setActing] = useState(null);

  const handleApprove = async () => {
    setActing('approve');
    const result = await approveGame(clubId, game.id);
    setActing(null);
    if (result?.success !== false) {
      toast.success('Game approved and added to standings.');
    } else {
      toast.error(result?.error || 'Failed to approve game.');
    }
  };

  const handleReject = async () => {
    setActing('reject');
    const result = await rejectGame(clubId, game.id);
    setActing(null);
    if (result?.success !== false) {
      toast.info('Game rejected.');
    } else {
      toast.error(result?.error || 'Failed to reject game.');
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{game.bottle?.name || 'Unknown Bottle'}</p>
          <p className="text-xs text-cin-muted mt-0.5">
            Played by {game.submittedBy?.displayName || 'Unknown'} · {formatRelativeTime(game.completedAt || game.createdAt)}
          </p>
          {game.playerCount && (
            <p className="text-xs text-cin-muted">{game.playerCount} players · Score: {game.submitterScore ?? '?'}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={handleApprove}
          loading={acting === 'approve'}
          disabled={!!acting}
        >
          Approve
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 !border-cin-red/40 !text-cin-red"
          onClick={handleReject}
          loading={acting === 'reject'}
          disabled={!!acting}
        >
          Reject
        </Button>
      </div>
    </Card>
  );
}

export default function ClubDetailPage() {
  const navigate = useNavigate();
  const { clubId } = useParams();
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const {
    activeClub, leaderboard, pendingGames, activityFeed, isLoading,
    loadClub, fetchPendingGames, fetchActivityFeed, fetchSeasonLeaderboard,
    leaveClub,
  } = useClubStore();

  const [activeTab, setActiveTab] = useState('leaderboard');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const isAdmin = activeClub?.adminId === user?.id || activeClub?.role === 'ADMIN';
  const currentSeason = activeClub?.currentSeason;

  useEffect(() => {
    loadClub(clubId);
    fetchSeasonLeaderboard(clubId);
    fetchActivityFeed(clubId);
    if (isAdmin) fetchPendingGames(clubId);
  }, [clubId]);

  const handleShare = useCallback(async () => {
    const inviteUrl = `${window.location.origin}/game/join?code=${activeClub?.inviteCode}`;
    const shareData = {
      title: `Join ${activeClub?.name} on CinCin`,
      text: `Join my Cellar Club on CinCin! Code: ${activeClub?.inviteCode}`,
      url: inviteUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Invite shared!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          // Fall back to clipboard
          await handleCopyInvite();
        }
      }
    } else {
      await handleCopyInvite();
    }
  }, [activeClub, toast]);

  const handleCopyInvite = useCallback(async () => {
    const inviteUrl = `${window.location.origin}/game/join?code=${activeClub?.inviteCode}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied!');
    } catch {
      toast.error('Could not copy invite link.');
    }
  }, [activeClub, toast]);

  const handleLeave = async () => {
    const result = await leaveClub(clubId);
    if (result.success) {
      toast.info(`You've left ${activeClub?.name}.`);
      navigate('/clubs');
    } else {
      toast.error(result.error || 'Could not leave club. Admins cannot leave their own club.');
      setShowLeaveConfirm(false);
    }
  };

  if (isLoading && !activeClub) {
    return (
      <div className="min-h-dvh bg-cin-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cin-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!activeClub) {
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5">
        <p className="text-cin-muted text-center mt-12">Club not found.</p>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate('/clubs')}>Back to Clubs</Button>
      </div>
    );
  }

  const daysLeft = getDaysRemaining(currentSeason?.endDate);

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
      <ScreenHeader title={activeClub.name} onBack={() => navigate('/clubs')} />

      {/* Season status bar */}
      {currentSeason && (
        <Card className="mt-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-cin-muted">Season {currentSeason.seasonNumber}</p>
            <p className="text-sm font-semibold text-cin-white">{currentSeason.name || 'Active Season'}</p>
          </div>
          {daysLeft !== null && (
            <div className="text-right">
              <p className="text-xs text-cin-muted">Ends in</p>
              <p className={`text-sm font-bold ${daysLeft < 7 ? 'text-cin-red' : 'text-cin-cyan'}`}>
                {daysLeft}d
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs text-cin-muted">Members</p>
            <p className="text-sm font-bold text-cin-white">{activeClub.memberCount || '—'}</p>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex mt-5 border-b border-cin-border">
        {[
          { key: 'leaderboard', label: 'Standings' },
          { key: 'activity', label: 'Activity' },
          ...(isAdmin && pendingGames?.length > 0 ? [{ key: 'pending', label: `Approve (${pendingGames.length})` }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-xs font-semibold font-display uppercase tracking-wider transition-colors
              ${activeTab === tab.key ? 'text-cin-cyan border-b-2 border-cin-cyan' : 'text-cin-muted'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {/* Leaderboard */}
        {activeTab === 'leaderboard' && (
          leaderboard.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-sm text-cin-muted">No games approved yet this season.</p>
            </Card>
          ) : (
            leaderboard.map((entry, i) => (
              <div key={entry.userId || i} className="flex items-center gap-3 px-3 py-2.5 bg-cin-card rounded-lg border border-cin-border">
                <span className={`w-6 text-sm font-bold ${i === 0 ? 'text-cin-cyan' : 'text-cin-muted'}`}>{i + 1}</span>
                <span className="flex-1 text-sm text-cin-white">{entry.displayName}</span>
                {entry.rankChange !== 0 && (
                  <span className={`text-xs ${entry.rankChange > 0 ? 'text-cin-green' : 'text-cin-red'}`}>
                    {entry.rankChange > 0 ? `↑${entry.rankChange}` : `↓${Math.abs(entry.rankChange)}`}
                  </span>
                )}
                <span className="text-sm font-bold text-cin-white">{entry.totalScore}</span>
              </div>
            ))
          )
        )}

        {/* Activity feed */}
        {activeTab === 'activity' && (
          activityFeed?.length === 0 ? (
            <Card className="text-center py-8"><p className="text-sm text-cin-muted">No activity yet</p></Card>
          ) : (
            activityFeed?.map((item, i) => (
              <div key={item.id || i} className="flex gap-3 py-2.5 border-b border-cin-border last:border-0">
                <span className="text-base">{ACTIVITY_ICONS[item.type] || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cin-white">{item.description}</p>
                  <p className="text-[11px] text-cin-muted mt-0.5">{formatRelativeTime(item.createdAt)}</p>
                </div>
              </div>
            ))
          )
        )}

        {/* Pending approvals */}
        {activeTab === 'pending' && (
          pendingGames?.length === 0 ? (
            <Card className="text-center py-8"><p className="text-sm text-cin-muted">No games pending approval</p></Card>
          ) : (
            pendingGames?.map((game) => (
              <PendingGameCard key={game.id} game={game} clubId={clubId} toast={toast} />
            ))
          )
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-6">
        {isAdmin && pendingGames?.length > 0 && activeTab !== 'pending' && (
          <Button variant="primary" className="flex-1" onClick={() => setActiveTab('pending')}>
            Approve Games ({pendingGames.length})
          </Button>
        )}
        <Button variant="secondary" className="flex-1" onClick={handleShare}>Invite</Button>
      </div>

      {isAdmin && currentSeason?.seasonType === 'ROLLING' && (
        <Button
          variant="secondary"
          fullWidth
          onClick={() => navigate(`/clubs/${clubId}/season-end`)}
          className="mt-4"
        >
          End Season & See Results
        </Button>
      )}

      {/* Leave club */}
      <div className="mt-8 text-center">
        {showLeaveConfirm ? (
          <Card className="text-center">
            <p className="text-sm text-cin-text mb-3">
              Leave {activeClub.name}? Your historical scores will remain.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowLeaveConfirm(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1 !bg-cin-red" onClick={handleLeave}>Leave Club</Button>
            </div>
          </Card>
        ) : (
          <button className="text-xs text-cin-muted underline" onClick={() => setShowLeaveConfirm(true)}>
            Leave this club
          </button>
        )}
      </div>
    </div>
  );
}
