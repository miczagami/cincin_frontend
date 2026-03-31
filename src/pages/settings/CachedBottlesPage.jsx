/**
 * CachedBottlesPage — Priority 5 (Phase 5)
 * Spec ref: Section 9.2 (Cache management UI)
 *
 * Displays the full list of cached bottles in IndexedDB with:
 * - Bottle name, category, vintage, cached date
 * - Swipe-to-delete (touch) or delete button (desktop) per bottle
 * - Clear all button
 * - Empty state when no cached bottles
 *
 * Navigable from Settings → "View cached bottles" row.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCachedBottles, removeCachedBottle, clearBottleCache } from '../../utils/offlineGame';
import useToast from '../../hooks/useToast';
import { ScreenHeader, Button, Card } from '../../components/ui';

export default function CachedBottlesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  const [bottles, setBottles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  const loadBottles = useCallback(async () => {
    try {
      const cached = await getCachedBottles();
      // Sort by most recently used first
      cached.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
      setBottles(cached);
    } catch (err) {
      console.error('[CachedBottles] Failed to load:', err);
      setBottles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBottles();
  }, [loadBottles]);

  const handleDeleteBottle = async (bottleId, bottleName) => {
    try {
      await removeCachedBottle(bottleId);
      setBottles((prev) => prev.filter((b) => b.id !== bottleId));
      toast.success(t('settings.cachedBottleRemoved', { name: bottleName || 'Bottle' }));
    } catch (err) {
      toast.error(t('settings.cachedBottleRemoveFailed'));
    }
  };

  const handleClearAll = async () => {
    if (bottles.length === 0) return;
    setIsClearing(true);
    try {
      await clearBottleCache();
      setBottles([]);
      toast.success(t('settings.cacheCleared'));
    } catch (err) {
      toast.error(t('settings.cacheClearFailed'));
    } finally {
      setIsClearing(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatSize = (bottle) => {
    const size = JSON.stringify(bottle).length;
    if (size > 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${size} B`;
  };

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-24">
      <ScreenHeader
        title={t('settings.cachedBottles', 'Cached Bottles')}
        onBack={() => navigate('/settings')}
      />

      {/* Summary bar */}
      <div className="flex items-center justify-between mt-4 mb-4">
        <p className="text-cin-muted text-sm">
          {bottles.length} {bottles.length === 1 ? 'bottle' : 'bottles'} cached
        </p>
        {bottles.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={isClearing}
            className="text-red-400 text-xs"
          >
            {isClearing ? 'Clearing...' : 'Clear All'}
          </Button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-cin-cyan border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && bottles.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🍾</div>
          <p className="text-cin-muted text-sm">
            {t('settings.noCachedBottles', 'No bottles cached for offline play.')}
          </p>
          <p className="text-cin-muted text-xs mt-1">
            {t('settings.cachedBottlesHint', 'Bottles are cached automatically when you scan them.')}
          </p>
        </div>
      )}

      {/* Bottle list */}
      {!isLoading && bottles.length > 0 && (
        <div className="space-y-2">
          {bottles.map((bottle) => (
            <SwipeableBottleRow
              key={bottle.id}
              bottle={bottle}
              onDelete={() => handleDeleteBottle(bottle.id, bottle.name)}
              formatDate={formatDate}
              formatSize={formatSize}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * SwipeableBottleRow — a single cached bottle with swipe-to-delete on touch.
 * Falls back to a visible delete button on desktop (no touch events).
 */
function SwipeableBottleRow({ bottle, onDelete, formatDate, formatSize }) {
  const rowRef = useRef(null);
  const startXRef = useRef(null);
  const currentXRef = useRef(0);
  const [translateX, setTranslateX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteBtn, setShowDeleteBtn] = useState(false);

  const DELETE_THRESHOLD = -80;

  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
  };

  const handleTouchMove = (e) => {
    if (startXRef.current === null) return;
    const diff = e.touches[0].clientX - startXRef.current;
    const newX = Math.min(0, Math.max(-120, currentXRef.current + diff));
    setTranslateX(newX);
  };

  const handleTouchEnd = () => {
    startXRef.current = null;
    if (translateX < DELETE_THRESHOLD) {
      setShowDeleteBtn(true);
      setTranslateX(-80);
    } else {
      setShowDeleteBtn(false);
      setTranslateX(0);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete();
  };

  // Category label colour
  const categoryColour = {
    WINE: '#8B5CF6',
    BEER: '#F59E0B',
    SPIRITS: '#06B6D4',
  }[bottle.category] || '#6B7280';

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete action behind the row */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-600 transition-opacity"
        style={{
          width: 80,
          opacity: showDeleteBtn ? 1 : 0.5,
        }}
      >
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-white text-xs font-medium px-3 py-2"
        >
          {isDeleting ? '...' : 'Delete'}
        </button>
      </div>

      {/* Main row content */}
      <div
        ref={rowRef}
        className="relative bg-cin-dark rounded-lg p-3 transition-transform"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: startXRef.current !== null ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {bottle.name || 'Unknown Bottle'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {bottle.category && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${categoryColour}20`,
                    color: categoryColour,
                  }}
                >
                  {bottle.category}
                </span>
              )}
              {bottle.vintage && (
                <span className="text-cin-muted text-xs">{bottle.vintage}</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-cin-muted text-xs">
                Cached {formatDate(bottle.cachedAt)}
              </span>
              <span className="text-cin-muted text-xs opacity-50">
                {formatSize(bottle)}
              </span>
            </div>
          </div>

          {/* Desktop fallback delete button (visible when not using touch) */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full text-cin-muted hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
            aria-label="Remove cached bottle"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
