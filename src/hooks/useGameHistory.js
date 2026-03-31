/**
 * Game History Offline Cache Mixin — Priority 5
 * Spec ref: Section 9.2 (Offline Behaviour)
 *
 * This file provides the game history caching logic that should be
 * integrated into the existing gameStore.js. Rather than replacing
 * the entire 300+ line gameStore (which manages the full game lifecycle),
 * this exports a standalone hook that wraps the existing API call with
 * write-through IndexedDB caching.
 *
 * Usage in any page that shows game history:
 *   import useGameHistory from '../hooks/useGameHistory';
 *   const { history, isLoading, isCachedData, lastCachedAt, error, fetchHistory } = useGameHistory();
 */

import { useState, useCallback } from 'react';
import { games as gamesApi } from '../services/api';
import {
  cacheGameHistory,
  getCachedGameHistory,
} from '../utils/offlineDataCache';

export default function useGameHistory() {
  const [history, setHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCachedData, setIsCachedData] = useState(false);
  const [lastCachedAt, setLastCachedAt] = useState(null);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async ({ limit = 20, offset = 0 } = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await gamesApi.history({ limit, offset });
      const data = res.data || res;

      // Cache the first page (offset=0) for offline viewing
      if (offset === 0) {
        try {
          await cacheGameHistory(data);
        } catch (cacheErr) {
          console.warn('[GameHistory] Failed to cache:', cacheErr.message);
        }
      }

      setHistory(data);
      setIsCachedData(false);
      setLastCachedAt(null);
      setIsLoading(false);
      return data;
    } catch (err) {
      const status = err.response?.status || err.status;

      // 403 = not Pro — don't try cache, surface the error
      if (status === 403) {
        setError('Game history is a Pro feature.');
        setIsLoading(false);
        return null;
      }

      // Network or server error — try offline cache (first page only)
      if (offset === 0) {
        try {
          const cached = await getCachedGameHistory();
          if (cached) {
            setHistory(cached.data);
            setIsCachedData(true);
            setLastCachedAt(cached.cachedAt);
            setError(null);
            setIsLoading(false);
            return cached.data;
          }
        } catch (cacheErr) {
          console.warn('[GameHistory] Failed to read cache:', cacheErr.message);
        }
      }

      setError(err.response?.data?.error || 'Failed to load game history. You appear to be offline.');
      setIsLoading(false);
      return null;
    }
  }, []);

  return {
    history,
    isLoading,
    isCachedData,
    lastCachedAt,
    error,
    fetchHistory,
  };
}
