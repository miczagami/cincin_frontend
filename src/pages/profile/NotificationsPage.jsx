/**
 * NotificationsPage — Priority 4 (Updated)
 * Spec ref: Sections 10.1–10.3
 *
 * Changes from Phase 4:
 * - handleMarkAllRead: toast on success ('All notifications marked as read')
 * - handleMarkAllRead: toast on error
 * - markAllRead in the store silently failed before; we now surface it
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useNotificationStore from '../../context/notificationStore';
import useToast from '../../hooks/useToast';
import { ScreenHeader, Button, Spinner } from '../../components/ui';

const NOTIF_ICONS = {
  game_invite: '🎮',
  club_game_approved: '✅',
  club_game_rejected: '❌',
  season_ending: '⏰',
  season_ended: '🏆',
  palate_updated: '📊',
  palate_wrapped: '🎨',
  payment_failed: '💳',
  club_membership_reduced: '👥',
  weekly_digest: '📬',
  default: '🔔',
};

function getIcon(type) {
  return NOTIF_ICONS[type] || NOTIF_ICONS.default;
}

function getRelativeTime(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    items, unreadCount, hasMore, isLoading, error,
    fetchNotifications, markRead, markAllRead,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllRead();
      toast.success('All notifications marked as read.');
    } catch {
      toast.error('Could not mark notifications as read. Please try again.');
    }
  }, [markAllRead, toast]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) fetchNotifications(false);
  }, [isLoading, hasMore, fetchNotifications]);

  const handleNotificationTap = (notif) => {
    if (!notif.readAt) markRead(notif.id);

    const data = notif.data || {};
    switch (notif.type) {
      case 'game_invite':
        if (data.gameCode) navigate(`/game/join?code=${data.gameCode}`);
        break;
      case 'club_game_approved':
      case 'club_game_rejected':
      case 'season_ending':
      case 'season_ended':
        if (data.clubId) navigate(`/clubs/${data.clubId}`);
        break;
      case 'palate_updated':
      case 'palate_wrapped':
        navigate('/palate/profile');
        break;
      case 'payment_failed':
        navigate('/subscription');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
      <ScreenHeader title="Notifications" onBack={() => navigate('/')} />

      {/* Mark all read */}
      {unreadCount > 0 && (
        <div className="flex justify-end mt-2">
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-cin-cyan font-semibold"
          >
            Mark all as read ({unreadCount})
          </button>
        </div>
      )}

      {error && (
        <div className="bg-cin-red/20 border border-cin-red/40 rounded-lg p-3 mt-3">
          <p className="text-cin-red text-sm">{error}</p>
        </div>
      )}

      {/* Notification list */}
      <div className="mt-4">
        {items.map((notif) => {
          const isUnread = !notif.readAt;
          return (
            <div
              key={notif.id}
              onClick={() => handleNotificationTap(notif)}
              className={`flex gap-3 py-3.5 border-b border-cin-border cursor-pointer transition-opacity ${
                isUnread ? 'opacity-100' : 'opacity-60'
              }`}
            >
              {isUnread ? (
                <div className="w-2 h-2 rounded-full bg-cin-cyan mt-1.5 flex-shrink-0" />
              ) : (
                <div className="w-2 flex-shrink-0" />
              )}
              <span className="text-lg flex-shrink-0 mt-0.5">{getIcon(notif.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cin-white">{notif.title}</p>
                <p className="text-xs text-cin-text mt-0.5 line-clamp-2">{notif.body}</p>
                <p className="text-[11px] text-cin-muted mt-1">{getRelativeTime(notif.createdAt)}</p>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-center py-8"><Spinner /></div>
        )}

        {!isLoading && hasMore && items.length > 0 && (
          <div className="text-center py-4">
            <Button variant="secondary" onClick={handleLoadMore}>Load More</Button>
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🔔</p>
            <p className="text-sm text-cin-muted">No notifications yet</p>
            <p className="text-xs text-cin-muted mt-1">
              Game invites, club updates, and profile insights will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
