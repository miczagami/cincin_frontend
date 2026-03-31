/**
 * DiscoveryPage — Phase 4
 * Discovery feed with sponsored and organic content.
 *
 * Spec ref: Section 8.4
 * Timeline: Weeks 15–16
 *
 * Features:
 * - Mixed feed: sponsored tastings + organic trending/seasonal content
 * - Sponsored items: double-point games, tasting badges, brand-sponsored
 * - Organic items: trending bottles, seasonal picks, most-scanned
 * - Pro users see ad-free feed (Section 8.1)
 * - Infinite scroll pagination
 * - Click-through to scan confirm (start a game with that bottle)
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useCommerceStore from '../../context/commerceStore';
import useSubscriptionStore from '../../context/subscriptionStore';
import { ScreenHeader, Button, Card, Pill, Spinner } from '../../components/ui';

export default function DiscoveryPage() {
  const navigate = useNavigate();
  const { feed, isFeedLoading, feedHasMore, error, fetchFeed, trackSponsoredStart } = useCommerceStore();
  const { isPro } = useSubscriptionStore();

  useEffect(() => {
    fetchFeed(true);
  }, [fetchFeed]);

  const handleLoadMore = useCallback(() => {
    if (!isFeedLoading && feedHasMore) {
      fetchFeed(false);
    }
  }, [isFeedLoading, feedHasMore, fetchFeed]);

  const handleItemClick = (item) => {
    if (item.type === 'sponsored') {
      trackSponsoredStart(item.id);
    }
    // Navigate to scan confirm with the bottle pre-loaded
    // The scan confirm page handles starting a game from here
    navigate('/scan/confirm', { state: { bottleId: item.bottleId, fromDiscovery: true } });
  };

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
      <ScreenHeader
        title="Discover"
        subtitle="Trending bottles & sponsored tastings"
        onBack={() => navigate('/')}
      />

      {error && (
        <div className="bg-cin-red/20 border border-cin-red/40 rounded-lg p-3 mt-2 mb-4">
          <p className="text-cin-red text-sm">{error}</p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {feed.map((item, i) => {
          const isSponsored = item.type === 'sponsored';

          // Pro users don't see sponsored content (Section 8.1)
          if (isSponsored && isPro()) return null;

          return (
            <Card
              key={item.id || i}
              className={`cursor-pointer transition-opacity hover:opacity-90 ${
                isSponsored ? 'border-cin-orange/20' : ''
              }`}
              style={
                isSponsored
                  ? { background: 'linear-gradient(135deg, #1A1A1A 0%, rgba(251,146,60,0.08) 100%)' }
                  : undefined
              }
              onClick={() => handleItemClick(item)}
            >
              {/* Sponsored header pills */}
              {isSponsored && (
                <div className="flex justify-between items-center mb-2">
                  <Pill variant="warning">Sponsored</Pill>
                  {item.pointMultiplier && item.pointMultiplier > 1 && (
                    <Pill variant="success">{item.pointMultiplier}× Points</Pill>
                  )}
                </div>
              )}

              {/* Content */}
              <p className="text-sm font-semibold text-cin-white">{item.title || item.name}</p>
              {item.description && (
                <p className="text-xs text-cin-text mt-1 leading-relaxed">{item.description}</p>
              )}
              {item.category && (
                <p className="text-xs text-cin-muted mt-1">{item.category}</p>
              )}
              {item.trendLabel && (
                <p className="text-[11px] text-cin-cyan mt-1">{item.trendLabel}</p>
              )}

              {/* Sponsored CTA */}
              {isSponsored && (
                <Button className="mt-3 w-full">Play Now</Button>
              )}
            </Card>
          );
        })}

        {/* Load more */}
        {feedHasMore && (
          <div className="text-center py-4">
            <Button variant="secondary" onClick={handleLoadMore} disabled={isFeedLoading}>
              {isFeedLoading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}

        {!isFeedLoading && feed.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm text-cin-muted">No discoveries yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
