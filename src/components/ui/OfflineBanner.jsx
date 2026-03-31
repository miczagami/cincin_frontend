/**
 * OfflineBanner — Priority 5 (Phase 5)
 * Spec ref: Section 9.2 (Offline indicators)
 *
 * A small, dismissible banner that appears when data is being served
 * from the offline cache rather than the network. Shows the staleness
 * time (e.g., "Cached 2 hours ago") and a refresh button.
 *
 * Also includes a general "You're offline" banner variant when
 * navigator.onLine is false.
 *
 * Usage:
 *   <OfflineBanner isCachedData={true} lastCachedAt={timestamp} onRefresh={fetchProfile} />
 *   <OfflineBanner /> (auto-detects offline status)
 */

import { useState, useEffect } from 'react';

export function OfflineBanner({ isCachedData, lastCachedAt, onRefresh }) {
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when the data source changes
  useEffect(() => {
    if (isCachedData) setDismissed(false);
  }, [isCachedData]);

  if (!isCachedData || dismissed) return null;

  const staleness = lastCachedAt ? formatStaleness(lastCachedAt) : '';

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
      style={{
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
      }}
    >
      {/* Offline icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
      >
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>

      <p className="text-xs flex-1" style={{ color: '#F59E0B' }}>
        Viewing offline data{staleness ? ` · ${staleness}` : ''}
      </p>

      {onRefresh && navigator.onLine && (
        <button
          onClick={onRefresh}
          className="text-xs font-medium px-2 py-0.5 rounded"
          style={{ color: '#22D3EE', backgroundColor: 'rgba(34, 211, 238, 0.1)' }}
        >
          Refresh
        </button>
      )}

      <button
        onClick={() => setDismissed(true)}
        className="text-xs opacity-50 hover:opacity-100 ml-1"
        style={{ color: '#F59E0B' }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * GlobalOfflineBanner — shows "You're offline" when navigator.onLine is false.
 * Mount once in AppShell; auto-hides when back online.
 */
export function GlobalOfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-1.5 px-4"
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.95)',
        paddingTop: 'max(6px, env(safe-area-inset-top))',
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mr-2 flex-shrink-0"
      >
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      <p className="text-white text-xs font-medium">
        You're offline — some features may be limited
      </p>
    </div>
  );
}

// ── Helpers ──

function formatStaleness(cachedAt) {
  const diffMs = Date.now() - cachedAt;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default OfflineBanner;
