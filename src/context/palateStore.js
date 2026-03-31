/**
 * Palate Profile Store — Phase 4 (Priority 5 update: offline caching)
 * Zustand store for Palate Profile analytics state.
 *
 * Handles:
 * - Profile data fetching (all-time + recent views)
 * - Unlock progress tracking
 * - Palate Wrapped card generation
 * - **Priority 5: Offline caching via IndexedDB write-through**
 *
 * Spec ref: Sections 6.1–6.6, 9.2
 * Timeline: Weeks 14–15 (Phase 4), Week 18 (Priority 5 offline hardening)
 *
 * Priority 5 changes:
 * - fetchProfile() now caches successful responses to IndexedDB and
 *   serves cached data when the network request fails (offline).
 * - fetchProgress() follows the same write-through pattern.
 * - Added `isCachedData` flag so the UI can display a staleness indicator.
 * - Added `lastCachedAt` timestamp for "last updated" display.
 */

import { create } from 'zustand';
import { palate } from '../services/api';
import {
  cachePalateProfile,
  getCachedPalateProfile,
  cachePalateProgress,
  getCachedPalateProgress,
} from '../utils/offlineDataCache';

const usePalateStore = create((set, get) => ({
  // ─── State ───
  profile: null,
  progress: null,
  wrapped: null,
  currentView: 'all_time',
  isLoading: false,
  isWrappedLoading: false,
  error: null,

  // Priority 5: offline indicators
  isCachedData: false,
  lastCachedAt: null,

  // ─── Actions ───

  /**
   * Fetch full Palate Profile dashboard.
   * Write-through: caches on success, serves from cache on failure.
   */
  fetchProfile: async (view) => {
    const targetView = view || get().currentView;
    set({ isLoading: true, error: null, currentView: targetView });

    try {
      const data = await palate.getProfile(targetView);

      // Cache the successful response for offline use
      try {
        await cachePalateProfile(targetView, data);
      } catch (cacheErr) {
        console.warn('[PalateStore] Failed to cache profile:', cacheErr.message);
      }

      set({
        profile: data,
        isLoading: false,
        isCachedData: false,
        lastCachedAt: null,
      });
      return data;
    } catch (err) {
      const status = err.response?.status;

      if (status === 403) {
        set({
          profile: { status: 'requires_pro' },
          isLoading: false,
          isCachedData: false,
        });
        return null;
      }

      // Network error or server error — try serving from cache
      try {
        const cached = await getCachedPalateProfile(targetView);
        if (cached) {
          set({
            profile: cached.data,
            isLoading: false,
            isCachedData: true,
            lastCachedAt: cached.cachedAt,
            error: null,
          });
          return cached.data;
        }
      } catch (cacheErr) {
        console.warn('[PalateStore] Failed to read cache:', cacheErr.message);
      }

      // No cache available — show error
      set({
        error: err.response?.data?.error || 'Failed to load profile. You appear to be offline.',
        isLoading: false,
        isCachedData: false,
      });
      return null;
    }
  },

  /**
   * Fetch unlock progress (visible to all users).
   * Write-through with offline fallback.
   */
  fetchProgress: async () => {
    try {
      const data = await palate.getProgress();

      // Cache for offline
      try {
        await cachePalateProgress(data);
      } catch (cacheErr) {
        console.warn('[PalateStore] Failed to cache progress:', cacheErr.message);
      }

      set({ progress: data });
      return data;
    } catch {
      // Try cached progress
      try {
        const cached = await getCachedPalateProgress();
        if (cached) {
          set({ progress: cached.data });
          return cached.data;
        }
      } catch {
        // Silently fail
      }
      return null;
    }
  },

  /**
   * Generate Palate Wrapped shareable card data.
   * Not cached — requires current data and is a POST action.
   */
  generateWrapped: async (month, year) => {
    set({ isWrappedLoading: true, error: null });
    try {
      const data = await palate.generateWrapped({ month, year });
      set({ wrapped: data, isWrappedLoading: false });
      return data;
    } catch (err) {
      set({
        error: err.response?.data?.error || 'Failed to generate wrapped card',
        isWrappedLoading: false,
      });
      return null;
    }
  },

  /**
   * Switch between all-time and recent views.
   */
  switchView: (view) => {
    const newView = view === 'recent' ? 'recent' : 'all_time';
    if (newView !== get().currentView) {
      get().fetchProfile(newView);
    }
  },

  /**
   * Clear error state.
   */
  clearError: () => set({ error: null }),

  /**
   * Reset store (e.g. on logout).
   */
  reset: () =>
    set({
      profile: null,
      progress: null,
      wrapped: null,
      currentView: 'all_time',
      isLoading: false,
      isWrappedLoading: false,
      error: null,
      isCachedData: false,
      lastCachedAt: null,
    }),
}));

export default usePalateStore;
