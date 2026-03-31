/**
 * Subscription Store — Phase 4
 * Zustand store for subscription state management.
 *
 * Handles:
 * - Subscription status fetching
 * - Stripe checkout session creation
 * - Billing portal session creation
 * - Cancel / reactivate flows
 * - Trial eligibility checking
 *
 * Spec ref: Sections 8.1, 8.2
 * Timeline: Weeks 14–16
 */

import { create } from 'zustand';
import { subscription } from '../services/api';

const useSubscriptionStore = create((set, get) => ({
  // ─── State ───
  status: null,         // { tier, status, plan, currentPeriodEnd, trialUsed, trialEligible, ... }
  trial: null,          // { eligible, trialDays, message }
  isLoading: false,
  error: null,

  // ─── Computed helpers ───
  isPro: () => get().status?.tier === 'PRO',
  isTrialing: () => get().status?.status === 'trialing',
  isCanceling: () => get().status?.status === 'canceling',

  // ─── Actions ───

  /**
   * Fetch current subscription status from backend.
   */
  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await subscription.getStatus();
      set({ status: data, isLoading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load subscription', isLoading: false });
      return null;
    }
  },

  /**
   * Create Stripe checkout session and redirect user.
   * @param {'monthly'|'annual'} plan
   */
  startCheckout: async (plan = 'monthly') => {
    set({ isLoading: true, error: null });
    try {
      const data = await subscription.createCheckout({
        plan,
        successUrl: `${window.location.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/subscription/cancel`,
      });

      // Redirect to Stripe Checkout (or mock URL in dev)
      if (data.url) {
        window.location.href = data.url;
      }

      set({ isLoading: false });
      return data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to start checkout';
      set({ error: errorMsg, isLoading: false });
      return { error: errorMsg };
    }
  },

  /**
   * Open Stripe billing portal for self-service management.
   */
  openBillingPortal: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await subscription.createPortal({
        returnUrl: `${window.location.origin}/settings`,
      });
      if (data.url) {
        window.location.href = data.url;
      }
      set({ isLoading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to open billing portal', isLoading: false });
      return null;
    }
  },

  /**
   * Cancel subscription at end of billing period.
   */
  cancelSubscription: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await subscription.cancel();
      // Refresh status after cancel
      await get().fetchStatus();
      set({ isLoading: false });
      return result;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to cancel subscription', isLoading: false });
      return null;
    }
  },

  /**
   * Reactivate a subscription set to cancel.
   */
  reactivateSubscription: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await subscription.reactivate();
      await get().fetchStatus();
      set({ isLoading: false });
      return result;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to reactivate', isLoading: false });
      return null;
    }
  },

  /**
   * Check if user is eligible for the 7-day trial.
   * Called after first game completion (Section 8.2).
   */
  checkTrialEligibility: async () => {
    try {
      const data = await subscription.checkTrial();
      set({ trial: data });
      return data;
    } catch {
      return { eligible: false };
    }
  },

  /**
   * Clear error state.
   */
  clearError: () => set({ error: null }),
}));

export default useSubscriptionStore;
