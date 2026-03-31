/**
 * Commerce Store — Phase 4
 * Zustand store for Buy tab and Discovery feed state.
 *
 * Handles:
 * - Buy tab: scanned bottle history with affiliate links
 * - Discovery feed: mixed sponsored + organic content
 * - Affiliate click tracking
 * - Sponsored tasting game start tracking
 *
 * Spec ref: Sections 8.3, 8.4
 * Timeline: Weeks 15–17
 */

import { create } from 'zustand';
import { commerce } from '../services/api';

const useCommerceStore = create((set, get) => ({
  // ─── Buy Tab State ───
  buyTab: null,           // { bottles: [...], recentScans: [...] }
  isBuyLoading: false,

  // ─── Discovery Feed State ───
  feed: [],               // Array of feed items (sponsored + organic)
  isFeedLoading: false,
  feedHasMore: true,
  feedPage: 1,

  error: null,

  // ─── Buy Tab Actions ───

  /**
   * Fetch the buy tab data (scanned bottles with affiliate links).
   */
  fetchBuyTab: async () => {
    set({ isBuyLoading: true, error: null });
    try {
      const data = await commerce.getBuyTab();
      set({ buyTab: data, isBuyLoading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load Buy tab', isBuyLoading: false });
      return null;
    }
  },

  /**
   * Track an affiliate link click.
   * @param {object} data - { bottleId, affiliatePartner, source }
   */
  trackAffiliateClick: async (data) => {
    try {
      await commerce.trackClick(data);
    } catch {
      // Tracking failures are non-blocking — user still navigates to partner site
    }
  },

  /**
   * Open an affiliate link in a new tab/window and track the click.
   * @param {string} url - affiliate URL
   * @param {object} trackingData - { bottleId, affiliatePartner, source }
   */
  openAffiliateLink: (url, trackingData) => {
    get().trackAffiliateClick(trackingData);
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  // ─── Discovery Feed Actions ───

  /**
   * Fetch the discovery feed (paginated).
   * @param {boolean} refresh - if true, resets to page 1
   */
  fetchFeed: async (refresh = false) => {
    const page = refresh ? 1 : get().feedPage;
    set({ isFeedLoading: true, error: null });
    try {
      const data = await commerce.getFeed({ page, limit: 10 });
      const items = data.items || data.feed || [];
      set({
        feed: refresh ? items : [...get().feed, ...items],
        feedHasMore: items.length === 10,
        feedPage: page + 1,
        isFeedLoading: false,
      });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load feed', isFeedLoading: false });
      return null;
    }
  },

  /**
   * Track when a user starts a sponsored tasting game.
   * @param {string} sponsoredId
   */
  trackSponsoredStart: async (sponsoredId) => {
    try {
      await commerce.trackSponsoredStart(sponsoredId);
    } catch {
      // Non-blocking
    }
  },

  clearError: () => set({ error: null }),
}));

export default useCommerceStore;
