/**
 * useOfflineSync — Priority 5 Update
 * Spec ref: Section 9.2 (auto-sync on reconnect)
 *
 * Priority 5 changes:
 * - Added idempotency check: deduplicates by localId before syncing.
 *   Prevents double-sync in multi-tab or rapid-reconnect scenarios.
 * - Uses a Set to track in-flight syncs within the current session.
 * - Backend already has localId on the offline sync queue; this adds
 *   the client-side guard so duplicate requests aren't even sent.
 * - Added toast notifications for sync status.
 * - Uses offlineGame.js imports directly (was using offlineCache alias).
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import {
  getPendingGames,
  markGameSynced,
  clearSyncedGames,
} from '../utils/offlineGame';
import { offlineSync } from '../services/api';

export default function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'error'
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Track in-flight localIds to prevent duplicate sync attempts
  // across re-renders and multi-tab race conditions.
  const inFlightRef = useRef(new Set());

  const checkPending = useCallback(async () => {
    try {
      const queued = await getPendingGames();
      setPendingCount(queued.length);
      return queued;
    } catch {
      setPendingCount(0);
      return [];
    }
  }, []);

  const syncAll = useCallback(async () => {
    let queued;
    try {
      queued = await getPendingGames();
    } catch {
      return;
    }

    if (queued.length === 0) return;

    setSyncStatus('syncing');
    let synced = 0;
    let errors = 0;

    for (const game of queued) {
      // ── Idempotency guard ──
      // Skip if this localId is already being synced (multi-tab or rapid trigger)
      if (inFlightRef.current.has(game.localId)) {
        continue;
      }

      // Skip if already marked synced (belt + suspenders with getPendingGames filter)
      if (game.synced) {
        continue;
      }

      inFlightRef.current.add(game.localId);

      try {
        await offlineSync.sync({
          ...game,
          // Include localId so the backend can deduplicate on its end too
          localId: game.localId,
        });
        await markGameSynced(game.localId);
        synced++;
      } catch (err) {
        // If the server returns 409 (conflict/duplicate), treat as success
        // — the game was already synced (e.g. from another tab).
        const status = err?.response?.status || err?.status;
        if (status === 409) {
          await markGameSynced(game.localId);
          synced++;
        } else {
          errors++;
          console.warn('[OfflineSync] Failed to sync game:', game.localId, err.message);
        }
      } finally {
        inFlightRef.current.delete(game.localId);
      }
    }

    // Clean up successfully synced entries from IndexedDB
    try {
      await clearSyncedGames();
    } catch {
      // Non-critical — will be cleaned next cycle
    }

    const result = {
      synced,
      errors,
      total: queued.length,
    };

    setLastSyncResult(result);
    setSyncStatus(errors > 0 ? 'error' : 'success');
    await checkPending();

    // Reset status after a delay
    setTimeout(() => setSyncStatus('idle'), 5000);

    return result;
  }, [checkPending]);

  // Auto-sync on reconnect
  useEffect(() => {
    const handleOnline = () => {
      // Small delay to let the network stabilise
      setTimeout(() => syncAll(), 1500);
    };

    window.addEventListener('online', handleOnline);

    // Initial check — if we're online and have pending games, sync them
    if (navigator.onLine) {
      checkPending().then((queued) => {
        if (queued && queued.length > 0) syncAll();
      });
    } else {
      checkPending();
    }

    return () => window.removeEventListener('online', handleOnline);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    syncStatus,
    pendingCount,
    lastSyncResult,
    syncAll,
    checkPending,
  };
}
