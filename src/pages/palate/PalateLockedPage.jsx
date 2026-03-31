/**
 * PalateLockedPage — Phase 4
 * Shown when Palate Profile is not yet unlocked.
 * Two states: needs more games, or needs Pro subscription.
 *
 * Spec ref: Section 6.2
 * Timeline: Weeks 14–15
 *
 * The progress bar is visible to all users as a conversion incentive.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePalateStore from '../../context/palateStore';
import useSubscriptionStore from '../../context/subscriptionStore';
import { ScreenHeader, Button, Card, Spinner } from '../../components/ui';

export default function PalateLockedPage() {
  const navigate = useNavigate();
  const { progress, fetchProgress, fetchProfile } = usePalateStore();
  const { status, fetchStatus } = useSubscriptionStore();

  useEffect(() => {
    fetchProgress();
    fetchStatus();
  }, [fetchProgress, fetchStatus]);

  // If unlocked and Pro, redirect to profile
  useEffect(() => {
    if (progress?.isUnlocked && !progress?.requiresPro) {
      fetchProfile().then((data) => {
        if (data?.status === 'active') {
          navigate('/palate/profile', { replace: true });
        }
      });
    }
  }, [progress, fetchProfile, navigate]);

  if (!progress) {
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-24 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { gamesPlayed, gamesRequired, isUnlocked, requiresPro } = progress;
  const progressPct = Math.min(1, gamesPlayed / gamesRequired) * 100;

  return (
    <div className="min-h-dvh bg-cin-black pb-24">
      <div className="px-5 pt-5">
        <ScreenHeader title="Palate Profile" />
      </div>

      <div className="px-8 pt-10 text-center">
        {/* Lock icon */}
        <div className="w-24 h-24 rounded-full bg-cin-cyan/15 mx-auto mb-5 flex items-center justify-center text-5xl">
          {isUnlocked ? '📊' : '🔒'}
        </div>

        <h2 className="text-xl font-black text-cin-white">
          {isUnlocked ? 'Unlock Your Analytics' : 'Unlock Your Palate Profile'}
        </h2>

        <p className="text-sm text-cin-text mt-2 leading-relaxed">
          {isUnlocked
            ? 'Your tasting data is ready! Upgrade to Pro to see which flavours you nail and which you miss.'
            : `Play ${gamesRequired - gamesPlayed} more game${gamesRequired - gamesPlayed !== 1 ? 's' : ''} to generate your tasting DNA. See which flavours you nail and which you miss.`
          }
        </p>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs text-cin-muted">Progress</span>
            <span className="text-xs font-bold text-cin-cyan">
              {gamesPlayed} of {gamesRequired} games
            </span>
          </div>
          <div className="h-2 bg-cin-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-cin-cyan rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Subscription prompt */}
        {requiresPro && (
          <Card className="mt-6 p-4 text-left">
            <p className="text-xs text-cin-muted mb-2">Requires Pro subscription</p>
            <Button onClick={() => navigate('/subscription')}>
              Upgrade to Pro
            </Button>
          </Card>
        )}

        {/* Preview of what they'll get */}
        <div className="mt-8 text-left">
          <h3 className="text-xs font-bold text-cin-muted uppercase tracking-wider mb-3">
            What you'll unlock
          </h3>
          {[
            { icon: '🎯', title: 'Accuracy by Category', desc: 'See your hit rate for each flavour family' },
            { icon: '💪', title: 'Strengths & Weaknesses', desc: 'Your top 5 best and worst categories' },
            { icon: '📈', title: 'Trend Over Time', desc: 'Track how your palate improves with each game' },
            { icon: '🍷', title: 'By Drink Type', desc: 'Compare your wine, beer, and spirits accuracy' },
            { icon: '🎨', title: 'Palate Wrapped', desc: 'Shareable card with your tasting DNA stats' },
          ].map((feature, i) => (
            <div key={i} className="flex gap-3 mb-3">
              <span className="text-xl">{feature.icon}</span>
              <div>
                <p className="text-sm font-semibold text-cin-white">{feature.title}</p>
                <p className="text-xs text-cin-muted">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
