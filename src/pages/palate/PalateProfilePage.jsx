/**
 * PalateProfilePage — Phase 4 (Priority 5 update: offline caching)
 * Spec ref: Sections 6.1–6.5, 9.2
 *
 * Priority 5 changes:
 * - Added OfflineBanner that shows when data is served from IndexedDB cache
 * - Profile data now gracefully degrades to cached view when offline
 * - All existing functionality (Recharts, view toggle, etc.) preserved
 *
 * Priority 2 changes (preserved):
 * - REPLACED CSS bar chart stub with Recharts LineChart (Section 6.3.4)
 *   with tooltips, axis labels, responsive sizing, and gradient fill.
 * - Added moving-average overlay line for smoothed trend visibility.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import usePalateStore from '../../context/palateStore';
import useSubscriptionStore from '../../context/subscriptionStore';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ScreenHeader, Button, Card, Pill, Spinner } from '../../components/ui';
import { colors, drinkColors, alpha, fonts } from '../../theme/brand';

// ── Custom tooltip for the trend chart ──
function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${alpha(colors.gold, 0.3)}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        fontFamily: fonts.family,
      }}
    >
      <div style={{ color: colors.gold, fontWeight: 700, marginBottom: 2 }}>
        Game {d.gameNumber}
      </div>
      <div style={{ color: colors.text }}>
        Accuracy: <strong style={{ color: colors.cream }}>{d.accuracy}%</strong>
      </div>
      <div style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>
        {d.correctGuesses}/{d.totalGuesses} correct
      </div>
      {d.date && (
        <div style={{ color: colors.muted, fontSize: 10 }}>
          {new Date(d.date).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
          })}
        </div>
      )}
    </div>
  );
}

// ── Compute 3-game moving average for smoothed trend line ──
function withMovingAverage(trend, window = 3) {
  return trend.map((point, i) => {
    if (i < window - 1) return { ...point, movingAvg: null };
    const slice = trend.slice(i - window + 1, i + 1);
    const avg = slice.reduce((sum, p) => sum + p.accuracy, 0) / window;
    return { ...point, movingAvg: Math.round(avg * 10) / 10 };
  });
}

export default function PalateProfilePage() {
  const navigate = useNavigate();
  const {
    profile, currentView, isLoading, error,
    isCachedData, lastCachedAt,
    fetchProfile, switchView, clearError,
  } = usePalateStore();
  const { isPro } = useSubscriptionStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // If not Pro, redirect to locked page
  if (profile?.status === 'requires_pro') {
    navigate('/palate', { replace: true });
    return null;
  }

  // If profile is still locked (not enough games)
  if (profile?.status === 'locked') {
    navigate('/palate', { replace: true });
    return null;
  }

  if (isLoading && !profile) {
    return (
      <div className="min-h-dvh bg-cin-espresso px-5 pt-5 pb-24 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!profile || profile.status !== 'active') return null;

  const { overall, categoryAccuracy, strengths, weaknesses, drinkTypeAccuracy, trend } = profile;

  // Prepare trend data with moving average
  const trendData = trend && trend.length > 1 ? withMovingAverage(trend) : [];

  return (
    <div className="min-h-dvh bg-cin-espresso px-5 pt-5 pb-24">
      <ScreenHeader
        title="Palate Profile"
        onBack={() => navigate('/')}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/palate/wrapped')}>
            Wrapped
          </Button>
        }
      />

      {/* Priority 5: Offline data banner */}
      <OfflineBanner
        isCachedData={isCachedData}
        lastCachedAt={lastCachedAt}
        onRefresh={() => fetchProfile(currentView)}
      />

      {/* Error state */}
      {error && (
        <Card className="mt-4 p-4 border-cin-red/30">
          <p className="text-cin-red text-sm">{error}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={clearError}>
            Dismiss
          </Button>
        </Card>
      )}

      {/* View toggle */}
      <div className="flex gap-2 mt-4 mb-4">
        {['all_time', 'recent'].map((v) => (
          <button
            key={v}
            onClick={() => switchView(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === v
                ? 'bg-cin-gold/20 text-cin-gold border border-cin-gold/30'
                : 'bg-cin-surface text-cin-muted border border-transparent'
            }`}
          >
            {v === 'all_time' ? 'All Time' : 'Recent (Last 10)'}
          </button>
        ))}
      </div>

      {/* Overall stats */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-cin-cream">{overall?.overallAccuracy || 0}%</p>
            <p className="text-cin-muted text-xs">Accuracy</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-cin-cream">{overall?.gamesPlayed || 0}</p>
            <p className="text-cin-muted text-xs">Games</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-cin-cream">{overall?.averageScore || 0}</p>
            <p className="text-cin-muted text-xs">Avg Score</p>
          </div>
        </div>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="p-3">
          <p className="text-cin-gold text-xs font-medium mb-2">Strengths</p>
          {strengths?.map((s, i) => (
            <div key={i} className="flex justify-between items-center py-1">
              <span className="text-cin-cream text-xs truncate mr-2">{s.category}</span>
              <span className="text-cin-gold text-xs font-medium">{s.accuracy}%</span>
            </div>
          ))}
          {(!strengths || strengths.length === 0) && (
            <p className="text-cin-muted text-xs">Play more games to see strengths</p>
          )}
        </Card>
        <Card className="p-3">
          <p className="text-cin-orange text-xs font-medium mb-2">Weaknesses</p>
          {weaknesses?.map((w, i) => (
            <div key={i} className="flex justify-between items-center py-1">
              <span className="text-cin-cream text-xs truncate mr-2">{w.category}</span>
              <span className="text-cin-orange text-xs font-medium">{w.accuracy}%</span>
            </div>
          ))}
          {(!weaknesses || weaknesses.length === 0) && (
            <p className="text-cin-muted text-xs">Play more games to see weaknesses</p>
          )}
        </Card>
      </div>

      {/* Drink Type Accuracy */}
      {drinkTypeAccuracy && drinkTypeAccuracy.length > 0 && (
        <Card className="p-4 mb-4">
          <p className="text-cin-cream text-sm font-medium mb-3">By Drink Type</p>
          <div className="space-y-2">
            {drinkTypeAccuracy.map((dt) => (
              <div key={dt.drinkType} className="flex items-center gap-3">
                <span className="text-cin-muted text-xs w-14">{dt.drinkType}</span>
                <div className="flex-1 h-2 bg-cin-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${dt.accuracy}%`,
                      backgroundColor: drinkColors[dt.drinkType] || drinkColors.OTHER,
                    }}
                  />
                </div>
                <span className="text-cin-cream text-xs font-medium w-10 text-right">
                  {dt.accuracy}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Trend Chart */}
      {trendData.length > 1 && (
        <Card className="p-4 mb-4">
          <p className="text-cin-cream text-sm font-medium mb-3">Accuracy Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <defs>
                <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.gold} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(colors.cream, 0.06)} />
              <XAxis
                dataKey="gameNumber"
                tick={{ fontSize: 10, fill: colors.muted }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: colors.muted }}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <Tooltip content={<TrendTooltip />} />
              <ReferenceLine y={50} stroke={alpha(colors.cream, 0.12)} strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="accuracy"
                stroke={colors.gold}
                strokeWidth={2}
                fill="url(#accuracyGradient)"
                dot={false}
                activeDot={{ r: 4, fill: colors.gold }}
              />
              <Line
                type="monotone"
                dataKey="movingAvg"
                stroke={colors.wine}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-cin-gold" />
              <span className="text-cin-muted text-xs">Per game</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${colors.wine} 0, ${colors.wine} 4px, transparent 4px, transparent 8px)` }} />
              <span className="text-cin-muted text-xs">3-game avg</span>
            </div>
          </div>
        </Card>
      )}

      {/* Category Accuracy (full list) */}
      {categoryAccuracy && categoryAccuracy.length > 0 && (
        <Card className="p-4 mb-4">
          <p className="text-cin-cream text-sm font-medium mb-3">All Categories</p>
          <div className="space-y-2">
            {categoryAccuracy.map((cat) => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="text-cin-muted text-xs flex-shrink-0" style={{ width: 100 }}>
                  {cat.category}
                </span>
                <div className="flex-1 h-1.5 bg-cin-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cin-gold transition-all"
                    style={{ width: `${cat.accuracy}%` }}
                  />
                </div>
                <span className="text-cin-cream text-xs font-medium w-10 text-right">
                  {cat.accuracy}%
                </span>
                {cat.gamesAppearedIn < 5 && (
                  <Pill size="xs" variant="warning">Low data</Pill>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
