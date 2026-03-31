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

// ── Custom tooltip for the trend chart ──
function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: '#1A1A1A',
        border: '1px solid rgba(34,211,238,0.3)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ color: '#22D3EE', fontWeight: 700, marginBottom: 2 }}>
        Game {d.gameNumber}
      </div>
      <div style={{ color: '#CCCCCC' }}>
        Accuracy: <strong style={{ color: '#FFFFFF' }}>{d.accuracy}%</strong>
      </div>
      <div style={{ color: '#666666', fontSize: 10, marginTop: 2 }}>
        {d.correctGuesses}/{d.totalGuesses} correct
      </div>
      {d.date && (
        <div style={{ color: '#666666', fontSize: 10 }}>
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
      <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-24 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!profile || profile.status !== 'active') return null;

  const { overall, categoryAccuracy, strengths, weaknesses, drinkTypeAccuracy, trend } = profile;

  // Prepare trend data with moving average
  const trendData = trend && trend.length > 1 ? withMovingAverage(trend) : [];

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-24">
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
        <Card className="mt-4 p-4 border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
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
                ? 'bg-cin-cyan/20 text-cin-cyan border border-cin-cyan/30'
                : 'bg-cin-dark text-cin-muted border border-transparent'
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
            <p className="text-2xl font-bold text-white">{overall?.overallAccuracy || 0}%</p>
            <p className="text-cin-muted text-xs">Accuracy</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{overall?.gamesPlayed || 0}</p>
            <p className="text-cin-muted text-xs">Games</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{overall?.averageScore || 0}</p>
            <p className="text-cin-muted text-xs">Avg Score</p>
          </div>
        </div>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="p-3">
          <p className="text-cin-cyan text-xs font-medium mb-2">Strengths</p>
          {strengths?.map((s, i) => (
            <div key={i} className="flex justify-between items-center py-1">
              <span className="text-white text-xs truncate mr-2">{s.category}</span>
              <span className="text-cin-cyan text-xs font-medium">{s.accuracy}%</span>
            </div>
          ))}
          {(!strengths || strengths.length === 0) && (
            <p className="text-cin-muted text-xs">Play more games to see strengths</p>
          )}
        </Card>
        <Card className="p-3">
          <p className="text-orange-400 text-xs font-medium mb-2">Weaknesses</p>
          {weaknesses?.map((w, i) => (
            <div key={i} className="flex justify-between items-center py-1">
              <span className="text-white text-xs truncate mr-2">{w.category}</span>
              <span className="text-orange-400 text-xs font-medium">{w.accuracy}%</span>
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
          <p className="text-white text-sm font-medium mb-3">By Drink Type</p>
          <div className="space-y-2">
            {drinkTypeAccuracy.map((dt) => (
              <div key={dt.drinkType} className="flex items-center gap-3">
                <span className="text-cin-muted text-xs w-14">{dt.drinkType}</span>
                <div className="flex-1 h-2 bg-cin-dark rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${dt.accuracy}%`,
                      backgroundColor:
                        dt.drinkType === 'WINE' ? '#8B5CF6' :
                        dt.drinkType === 'BEER' ? '#F59E0B' : '#06B6D4',
                    }}
                  />
                </div>
                <span className="text-white text-xs font-medium w-10 text-right">
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
          <p className="text-white text-sm font-medium mb-3">Accuracy Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <defs>
                <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="gameNumber"
                tick={{ fontSize: 10, fill: '#666' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#666' }}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <Tooltip content={<TrendTooltip />} />
              <ReferenceLine y={50} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="accuracy"
                stroke="#22D3EE"
                strokeWidth={2}
                fill="url(#accuracyGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#22D3EE' }}
              />
              <Line
                type="monotone"
                dataKey="movingAvg"
                stroke="#8B5CF6"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-cin-cyan" />
              <span className="text-cin-muted text-xs">Per game</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-purple-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #8B5CF6 0, #8B5CF6 4px, transparent 4px, transparent 8px)' }} />
              <span className="text-cin-muted text-xs">3-game avg</span>
            </div>
          </div>
        </Card>
      )}

      {/* Category Accuracy (full list) */}
      {categoryAccuracy && categoryAccuracy.length > 0 && (
        <Card className="p-4 mb-4">
          <p className="text-white text-sm font-medium mb-3">All Categories</p>
          <div className="space-y-2">
            {categoryAccuracy.map((cat) => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="text-cin-muted text-xs flex-shrink-0" style={{ width: 100 }}>
                  {cat.category}
                </span>
                <div className="flex-1 h-1.5 bg-cin-dark rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cin-cyan transition-all"
                    style={{ width: `${cat.accuracy}%` }}
                  />
                </div>
                <span className="text-white text-xs font-medium w-10 text-right">
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
