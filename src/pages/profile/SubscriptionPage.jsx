/**
 * SubscriptionPage — Priority 4 (Updated)
 * Spec ref: Sections 8.1, 8.2
 *
 * Changes from Phase 4:
 * - handleCheckout: toast 'Redirecting to checkout…' (info) before Stripe redirect
 * - handleCheckout: toast error on failure instead of alert()
 * - handleCheckout: email verification gate now uses toast instead of alert()
 * - handleCancel: toast on success/error
 * - handleReactivate: toast on success/error
 * - handleBillingPortal: toast 'Opening billing portal…' and on error
 * - clearError: no longer needed for display — errors go to toast
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useSubscriptionStore from '../../context/subscriptionStore';
import useAuthStore from '../../context/authStore';
import useToast from '../../hooks/useToast';
import { ScreenHeader, Button, Card, Pill, Spinner } from '../../components/ui';

const PRO_FEATURES = [
  'Unlimited bottle scans',
  'Full Palate Profile & analytics',
  'Unlimited Cellar Club memberships',
  'Custom game settings',
  'Game history & replay',
  'Global leaderboards',
  'Ad-free experience',
  'Priority AI scanning',
];

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const {
    status, trial, isLoading,
    fetchStatus, checkTrialEligibility, startCheckout,
    cancelSubscription, reactivateSubscription, openBillingPortal,
    isPro, isTrialing, isCanceling, clearError,
  } = useSubscriptionStore();
  const { user } = useAuthStore();

  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    fetchStatus();
    checkTrialEligibility();

    // Handle Stripe redirect back to app
    const stripeResult = searchParams.get('stripe');
    if (stripeResult === 'success') {
      toast.success('Subscription activated! Welcome to Pro.');
      fetchStatus(); // Refresh subscription state
    } else if (stripeResult === 'cancel') {
      toast.info('Checkout cancelled — you can upgrade any time.');
    }
  }, [fetchStatus, checkTrialEligibility]);

  const handleCheckout = async () => {
    // Email verification gate
    if (!user?.emailVerified) {
      toast.warning('Please verify your email before subscribing. Check your inbox for a verification link.');
      return;
    }

    toast.info('Redirecting to checkout…');
    const result = await startCheckout(selectedPlan);
    if (!result?.success) {
      toast.error(result?.error || 'Could not start checkout. Please try again.');
    }
    // On success Stripe redirects the browser, so no toast needed here
  };

  const handleCancel = async () => {
    const result = await cancelSubscription();
    setShowCancelConfirm(false);
    if (result?.success) {
      toast.info('Subscription cancelled. You will retain Pro access until the end of your billing period.');
    } else {
      toast.error(result?.error || 'Could not cancel subscription. Please try again.');
    }
  };

  const handleReactivate = async () => {
    const result = await reactivateSubscription();
    if (result?.success) {
      toast.success('Subscription reactivated! Pro access continues as normal.');
    } else {
      toast.error(result?.error || 'Could not reactivate subscription. Please try again.');
    }
  };

  const handleBillingPortal = async () => {
    toast.info('Opening billing portal…');
    const result = await openBillingPortal();
    if (!result?.success) {
      toast.error(result?.error || 'Could not open billing portal. Please try again.');
    }
  };

  if (isLoading && !status) {
    return (
      <div className="min-h-dvh bg-cin-black flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const isActivePro = isPro?.();
  const isCancellingState = isCanceling?.();
  const isOnTrial = isTrialing?.();

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
      <ScreenHeader title="Subscription" onBack={() => navigate('/profile')} />

      {/* Active subscription state */}
      {isActivePro && (
        <>
          <Card className="mt-4 bg-cin-cyan/10 border-cin-cyan/30">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👑</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-cin-white">
                  {isOnTrial ? 'Pro Trial' : 'Pro'} — Active
                </p>
                <p className="text-xs text-cin-muted">
                  {isCancellingState
                    ? `Access until ${new Date(status?.periodEnd).toLocaleDateString()}`
                    : `Renews ${new Date(status?.periodEnd).toLocaleDateString()}`}
                </p>
              </div>
              <Pill color="cyan">PRO</Pill>
            </div>
          </Card>

          <div className="mt-4 space-y-2">
            <Button variant="secondary" fullWidth onClick={handleBillingPortal}>
              Manage Billing
            </Button>

            {isCancellingState ? (
              <Button variant="secondary" fullWidth onClick={handleReactivate} loading={isLoading}>
                Reactivate Subscription
              </Button>
            ) : (
              showCancelConfirm ? (
                <Card className="border-cin-red/30">
                  <p className="text-sm text-cin-text mb-3">
                    Cancel Pro? Your subscription will remain active until the end of the current billing period.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowCancelConfirm(false)}>
                      Keep Pro
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1 !bg-cin-red"
                      onClick={handleCancel}
                      loading={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full text-xs text-cin-muted text-center py-2"
                >
                  Cancel subscription
                </button>
              )
            )}
          </div>
        </>
      )}

      {/* Free / upgrade state */}
      {!isActivePro && (
        <>
          <div className="mt-5 text-center">
            <h2 className="text-2xl font-display font-extrabold text-cin-white">Go Pro</h2>
            <p className="text-sm text-cin-muted mt-1">Unlock the full CinCin experience</p>
          </div>

          {/* Plan toggle */}
          <div className="flex gap-2 mt-5">
            {[
              { value: 'monthly', label: 'Monthly', price: '$12.99/mo' },
              { value: 'annual', label: 'Annual', price: '$9.99/mo', badge: 'Save ~20%' },
            ].map((plan) => (
              <button
                key={plan.value}
                onClick={() => setSelectedPlan(plan.value)}
                className={`flex-1 py-3 rounded-xl border text-center transition-all
                  ${selectedPlan === plan.value
                    ? 'bg-cin-cyan/15 border-cin-cyan'
                    : 'bg-cin-card border-cin-border'}`}
              >
                <p className={`text-sm font-bold ${selectedPlan === plan.value ? 'text-cin-cyan' : 'text-cin-white'}`}>
                  {plan.label}
                </p>
                <p className="text-xs text-cin-muted">{plan.price}</p>
                {plan.badge && (
                  <span className="text-[10px] text-cin-green font-semibold">{plan.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Feature list */}
          <Card className="mt-4">
            <p className="text-xs text-cin-muted font-semibold uppercase tracking-wider mb-3">What you get</p>
            <div className="space-y-2">
              {PRO_FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <span className="text-cin-cyan text-sm">✓</span>
                  <span className="text-sm text-cin-white">{feature}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* CTA */}
          <div className="mt-5">
            {trial?.eligible ? (
              <>
                <Button fullWidth onClick={handleCheckout} loading={isLoading}>
                  Start 7-Day Free Trial
                </Button>
                <p className="text-[11px] text-cin-muted text-center mt-2">
                  Trial starts after your first game. Cancel anytime.
                </p>
              </>
            ) : (
              <Button fullWidth onClick={handleCheckout} loading={isLoading}>
                Subscribe — {selectedPlan === 'annual' ? '$9.99/mo' : '$12.99/mo'}
              </Button>
            )}
          </div>

          {!user?.emailVerified && (
            <p className="text-[11px] text-cin-orange text-center mt-3">
              ⚠️ Email verification required before subscribing.{' '}
              <button className="underline text-cin-cyan" onClick={() => navigate('/settings')}>
                Verify now →
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}
