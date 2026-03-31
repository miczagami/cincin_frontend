/**
 * useNotificationBadge — Phase 4
 * Hook that periodically refreshes the unread notification count
 * for display as a badge on the bottom nav or notification bell icon.
 *
 * Spec ref: Section 10.1
 * Timeline: Week 17
 *
 * Polls every 60 seconds when the tab is visible.
 * Uses Page Visibility API to pause when the tab is hidden.
 */

import { useEffect, useRef } from 'react';
import useNotificationStore from '../context/notificationStore';

const POLL_INTERVAL = 60 * 1000; // 60 seconds

export default function useNotificationBadge() {
  const { unreadCount, refreshUnreadCount } = useNotificationStore();
  const intervalRef = useRef(null);

  useEffect(() => {
    // Initial fetch
    refreshUnreadCount();

    // Set up polling
    const startPolling = () => {
      intervalRef.current = setInterval(refreshUnreadCount, POLL_INTERVAL);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Page Visibility API: pause polling when tab is hidden
    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        refreshUnreadCount(); // Immediate refresh when tab becomes visible
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshUnreadCount]);

  return { unreadCount };
}
