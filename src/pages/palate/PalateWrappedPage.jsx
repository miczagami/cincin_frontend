/**
 * PalateWrappedPage — Phase 4 (Priority 2 update)
 * Generate and share a Palate Wrapped card (Section 6.6).
 *
 * Spec ref: Section 6.6, Section 10.4.1
 * Timeline: Week 15
 *
 * Priority 2 changes:
 * - REPLACED text-only share with canvas-based image generation.
 * - Renders a designed shareable card to an offscreen <canvas>,
 *   converts to blob, and shares via Web Share API (with image)
 *   or downloads as PNG fallback.
 * - No S3 upload required — generates client-side for immediate sharing.
 * - Card design matches CinCin brand: dark background, cyan accents,
 *   gradient overlays, DM Sans typography.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import usePalateStore from '../../context/palateStore';
import { ScreenHeader, Button, Card, Spinner } from '../../components/ui';

// ── Brand colours ──
const COLOURS = {
  black: '#0A0A0A',
  dark: '#141414',
  card: '#1A1A1A',
  border: '#2A2A2A',
  muted: '#666666',
  text: '#CCCCCC',
  white: '#FFFFFF',
  cyan: '#22D3EE',
  green: '#4ADE80',
  red: '#F87171',
  orange: '#FB923C',
};

// ── Canvas card renderer ──
function renderWrappedCard(canvas, data) {
  const W = 1080;
  const H = 1920;
  const dpr = 1; // We render at 1080×1920 directly
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // ── Background ──
  ctx.fillStyle = COLOURS.black;
  ctx.fillRect(0, 0, W, H);

  // Radial gradient glow at top
  const grad = ctx.createRadialGradient(W / 2, 300, 50, W / 2, 300, 500);
  grad.addColorStop(0, 'rgba(34,211,238,0.15)');
  grad.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 800);

  // ── Helper functions ──
  const drawText = (text, x, y, { size = 24, weight = '400', color = COLOURS.white, align = 'center', maxWidth } = {}) => {
    ctx.font = `${weight} ${size}px "DM Sans", "Segoe UI", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    if (maxWidth) {
      ctx.fillText(text, x, y, maxWidth);
    } else {
      ctx.fillText(text, x, y);
    }
  };

  const drawRoundedRect = (x, y, w, h, r, fill, stroke) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  };

  // ── CinCin branding ──
  drawText('🍷', W / 2, 140, { size: 60 });
  drawText('CinCin', W / 2, 210, { size: 48, weight: '900', color: COLOURS.cyan });

  // ── "Palate Wrapped" pill ──
  const pillText = `Palate Wrapped · ${data.periodLabel || 'This Month'}`;
  ctx.font = '600 18px "DM Sans", sans-serif';
  const pillW = ctx.measureText(pillText).width + 40;
  drawRoundedRect((W - pillW) / 2, 240, pillW, 36, 18, 'rgba(34,211,238,0.12)', 'rgba(34,211,238,0.3)');
  drawText(pillText, W / 2, 264, { size: 18, weight: '600', color: COLOURS.cyan });

  // ── "Your Palate DNA" header ──
  drawText('Your Palate DNA', W / 2, 360, { size: 42, weight: '800' });

  // ── Main stats row ──
  const stats = [
    { label: 'Games', value: String(data.gamesPlayed || 0) },
    { label: 'Accuracy', value: `${data.overall?.overallAccuracy || 0}%` },
    { label: 'Best', value: data.strengths?.[0]?.category || '—' },
  ];

  const statY = 440;
  const statSpacing = W / (stats.length + 1);
  stats.forEach((s, i) => {
    const sx = statSpacing * (i + 1);
    drawText(s.value, sx, statY, { size: 56, weight: '900', color: COLOURS.cyan });
    drawText(s.label, sx, statY + 36, { size: 18, color: COLOURS.muted });
  });

  // ── Divider ──
  ctx.strokeStyle = COLOURS.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 520);
  ctx.lineTo(W - 80, 520);
  ctx.stroke();

  // ── Strengths section ──
  drawText('Top Strengths', W / 2, 580, { size: 22, weight: '700', color: COLOURS.text });

  const strengths = (data.strengths || []).slice(0, 5);
  strengths.forEach((s, i) => {
    const y = 625 + i * 56;
    const barW = 600;
    const barX = (W - barW) / 2;
    const fillW = Math.max(4, (s.accuracy / 100) * barW);

    // Category name + percentage
    drawText(s.category, barX, y, { size: 18, weight: '600', align: 'left', color: COLOURS.white });
    drawText(`${Math.round(s.accuracy)}%`, barX + barW, y, { size: 18, weight: '700', align: 'right', color: COLOURS.green });

    // Bar background
    drawRoundedRect(barX, y + 8, barW, 10, 5, COLOURS.dark);
    // Bar fill
    const barGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    barGrad.addColorStop(0, COLOURS.cyan);
    barGrad.addColorStop(1, COLOURS.green);
    drawRoundedRect(barX, y + 8, fillW, 10, 5, barGrad);
  });

  // ── Weaknesses section ──
  const weakY = 625 + strengths.length * 56 + 40;
  drawText('Areas to Improve', W / 2, weakY, { size: 22, weight: '700', color: COLOURS.text });

  const weaknesses = (data.weaknesses || []).slice(0, 3);
  weaknesses.forEach((w, i) => {
    const y = weakY + 45 + i * 56;
    const barW = 600;
    const barX = (W - barW) / 2;
    const fillW = Math.max(4, (w.accuracy / 100) * barW);

    drawText(w.category, barX, y, { size: 18, weight: '600', align: 'left', color: COLOURS.white });
    drawText(`${Math.round(w.accuracy)}%`, barX + barW, y, { size: 18, weight: '700', align: 'right', color: COLOURS.red });

    drawRoundedRect(barX, y + 8, barW, 10, 5, COLOURS.dark);
    drawRoundedRect(barX, y + 8, fillW, 10, 5, COLOURS.red);
  });

  // ── Drink type section ──
  const dtY = weakY + 45 + weaknesses.length * 56 + 60;
  drawText('By Drink Type', W / 2, dtY, { size: 22, weight: '700', color: COLOURS.text });

  const drinkTypes = (data.drinkTypeAccuracy || []).slice(0, 3);
  const dtSpacing = W / (drinkTypes.length + 1);
  drinkTypes.forEach((dt, i) => {
    const dx = dtSpacing * (i + 1);
    const emoji = dt.drinkType === 'WINE' ? '🍷' : dt.drinkType === 'BEER' ? '🍺' : '🥃';
    drawText(emoji, dx, dtY + 55, { size: 40 });
    drawText(`${Math.round(dt.accuracy)}%`, dx, dtY + 100, { size: 32, weight: '900', color: COLOURS.white });
    drawText(dt.drinkType?.toLowerCase() || '', dx, dtY + 130, { size: 16, color: COLOURS.muted });
  });

  // ── Mini trend sparkline ──
  const trend = data.trend || [];
  if (trend.length > 2) {
    const sparkY = dtY + 180;
    drawText('Accuracy Trend', W / 2, sparkY, { size: 22, weight: '700', color: COLOURS.text });

    const sparkX = 120;
    const sparkW = W - 240;
    const sparkH = 80;
    const sparkTop = sparkY + 20;
    const maxAcc = Math.max(...trend.map(t => t.accuracy), 100);
    const minAcc = Math.min(...trend.map(t => t.accuracy), 0);
    const range = maxAcc - minAcc || 1;

    // Gradient fill under the line
    ctx.beginPath();
    trend.forEach((t, i) => {
      const x = sparkX + (i / (trend.length - 1)) * sparkW;
      const y = sparkTop + sparkH - ((t.accuracy - minAcc) / range) * sparkH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    // Close the path for fill
    ctx.lineTo(sparkX + sparkW, sparkTop + sparkH);
    ctx.lineTo(sparkX, sparkTop + sparkH);
    ctx.closePath();
    const sparkGrad = ctx.createLinearGradient(0, sparkTop, 0, sparkTop + sparkH);
    sparkGrad.addColorStop(0, 'rgba(34,211,238,0.2)');
    sparkGrad.addColorStop(1, 'rgba(34,211,238,0.01)');
    ctx.fillStyle = sparkGrad;
    ctx.fill();

    // Line stroke
    ctx.beginPath();
    trend.forEach((t, i) => {
      const x = sparkX + (i / (trend.length - 1)) * sparkW;
      const y = sparkTop + sparkH - ((t.accuracy - minAcc) / range) * sparkH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = COLOURS.cyan;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // ── Footer ──
  drawText('cincin.app', W / 2, H - 80, { size: 20, weight: '600', color: COLOURS.muted });
  drawText('Download CinCin — the AI tasting game', W / 2, H - 50, { size: 14, color: COLOURS.border });
}

// ── Convert canvas to shareable blob ──
async function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}

export default function PalateWrappedPage() {
  const navigate = useNavigate();
  const {
    wrapped, isWrappedLoading, error,
    generateWrapped, clearError,
  } = usePalateStore();

  const canvasRef = useRef(null);
  const [cardGenerated, setCardGenerated] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(null);

  // Generate for current month on mount
  useEffect(() => {
    const now = new Date();
    generateWrapped(now.getMonth(), now.getFullYear());
  }, [generateWrapped]);

  // Render card when data arrives
  useEffect(() => {
    if (wrapped && canvasRef.current) {
      // Add period label for display
      const now = new Date();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const periodLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

      renderWrappedCard(canvasRef.current, { ...wrapped, periodLabel });
      setCardGenerated(true);
    }
  }, [wrapped]);

  // ── Share handler: image via Web Share API or PNG download ──
  const handleShare = useCallback(async () => {
    if (!canvasRef.current || !wrapped) return;
    setIsSharing(true);
    setShareSuccess(null);

    try {
      const blob = await canvasToBlob(canvasRef.current);
      const file = new File([blob], 'cincin-palate-wrapped.png', { type: 'image/png' });

      // Try Web Share API with file support
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'My CinCin Palate DNA',
          text: `🍷 ${wrapped.overall?.overallAccuracy}% accuracy across ${wrapped.gamesPlayed} games. Check out CinCin!`,
          files: [file],
        });
        setShareSuccess('shared');
      } else if (navigator.share) {
        // Fallback: share without image (text only)
        await navigator.share({
          title: 'My CinCin Palate DNA',
          text: `🍷 My CinCin Palate Profile: ${wrapped.overall?.overallAccuracy}% accuracy across ${wrapped.gamesPlayed} games. Top strength: ${wrapped.strengths?.[0]?.category}. Check out CinCin!`,
          url: 'https://cincin.app',
        });
        setShareSuccess('shared');
      } else {
        // Final fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cincin-palate-wrapped.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShareSuccess('downloaded');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        setShareSuccess('error');
      }
    } finally {
      setIsSharing(false);
    }
  }, [wrapped]);

  // ── Copy link fallback ──
  const handleCopyLink = useCallback(() => {
    const text = wrapped
      ? `🍷 My CinCin Palate Profile: ${wrapped.overall?.overallAccuracy}% accuracy across ${wrapped.gamesPlayed} games. Top strength: ${wrapped.strengths?.[0]?.category}. Check out CinCin! https://cincin.app`
      : 'https://cincin.app';
    navigator.clipboard?.writeText(text);
    setShareSuccess('copied');
    setTimeout(() => setShareSuccess(null), 2000);
  }, [wrapped]);

  if (isWrappedLoading) {
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8 flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="text-sm text-cin-muted mt-3">Generating your Palate Wrapped...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
        <ScreenHeader title="Palate Wrapped" onBack={() => navigate('/palate/profile')} />
        <div className="mt-8 text-center">
          <p className="text-sm text-cin-muted">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate('/palate/profile')}>
            Back to Profile
          </Button>
        </div>
      </div>
    );
  }

  if (!wrapped) return null;

  const topStrength = wrapped.strengths?.[0];
  const biggestMiss = wrapped.weaknesses?.[0];

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
      <ScreenHeader
        title="Palate Wrapped"
        onBack={() => navigate('/palate/profile')}
      />

      {/* ── Offscreen canvas for image generation ── */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {/* ── Preview card (HTML version for on-screen display) ── */}
      <div className="mt-4">
        <Card className="cin-gradient-card p-6 text-center">
          <div className="text-[10px] uppercase tracking-widest text-cin-cyan font-semibold mb-4">
            Palate Wrapped · {new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
          </div>

          <div className="text-xl font-black text-cin-white mb-6">Your Palate DNA</div>

          {/* Stats row */}
          <div className="flex justify-around mb-6">
            <div>
              <div className="text-3xl font-black text-cin-cyan">{wrapped.gamesPlayed}</div>
              <div className="text-[10px] text-cin-muted">Games</div>
            </div>
            <div>
              <div className="text-3xl font-black text-cin-cyan">{wrapped.overall?.overallAccuracy}%</div>
              <div className="text-[10px] text-cin-muted">Accuracy</div>
            </div>
            <div>
              <div className="text-3xl font-black text-cin-cyan">{topStrength?.category || '—'}</div>
              <div className="text-[10px] text-cin-muted">Best</div>
            </div>
          </div>

          {/* Strengths + weaknesses summary */}
          <div className="border-t border-cin-border pt-4">
            {topStrength && (
              <div className="mb-3">
                <span className="text-xs text-cin-muted">Top strength: </span>
                <span className="text-sm font-bold text-cin-green">
                  {topStrength.category} ({Math.round(topStrength.accuracy)}%)
                </span>
              </div>
            )}
            {biggestMiss && (
              <div>
                <span className="text-xs text-cin-muted">Biggest miss: </span>
                <span className="text-sm font-bold text-cin-red">
                  {biggestMiss.category} ({Math.round(biggestMiss.accuracy)}%)
                </span>
              </div>
            )}
          </div>

          {/* Drink type mini row */}
          {wrapped.drinkTypeAccuracy?.length > 0 && (
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-cin-border">
              {wrapped.drinkTypeAccuracy.slice(0, 3).map((dt) => (
                <div key={dt.drinkType} className="text-center">
                  <div className="text-lg">
                    {dt.drinkType === 'WINE' ? '🍷' : dt.drinkType === 'BEER' ? '🍺' : '🥃'}
                  </div>
                  <div className="text-sm font-bold text-cin-white">{Math.round(dt.accuracy)}%</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Share actions ── */}
      <div className="mt-6 space-y-3">
        <Button
          onClick={handleShare}
          disabled={isSharing || !cardGenerated}
        >
          {isSharing ? 'Preparing...' : 'Share as Image'}
        </Button>

        <Button variant="secondary" onClick={handleCopyLink}>
          Copy Link
        </Button>

        {shareSuccess === 'shared' && (
          <p className="text-center text-xs text-cin-green">Shared successfully!</p>
        )}
        {shareSuccess === 'downloaded' && (
          <p className="text-center text-xs text-cin-green">Image saved to downloads</p>
        )}
        {shareSuccess === 'copied' && (
          <p className="text-center text-xs text-cin-green">Copied to clipboard!</p>
        )}
        {shareSuccess === 'error' && (
          <p className="text-center text-xs text-cin-red">Share failed. Try downloading instead.</p>
        )}
      </div>
    </div>
  );
}
