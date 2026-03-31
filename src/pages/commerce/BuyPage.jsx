/**
 * BuyPage — Phase 4
 * Buy tab showing scanned bottle history with affiliate purchase links.
 *
 * Spec ref: Section 8.3
 * Timeline: Weeks 16–17
 *
 * Features:
 * - Scanned bottle history sorted by most recent
 * - Affiliate partner links per bottle with pricing
 * - Click-through tracking for affiliate attribution
 * - In-app browser for partner sites (opens in new tab)
 * - Contextual affiliate links appear on scan confirm + game results too
 *   (handled in those pages; this is the dedicated Buy tab)
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCommerceStore from '../../context/commerceStore';
import { ScreenHeader, Button, Card, Spinner, EmptyState } from '../../components/ui';

const DRINK_EMOJI = {
  WINE: '🍷',
  RED: '🍷',
  WHITE: '🥂',
  BEER: '🍺',
  SPIRITS: '🥃',
  DEFAULT: '🍾',
};

function getDrinkEmoji(category) {
  if (!category) return DRINK_EMOJI.DEFAULT;
  const upper = category.toUpperCase();
  return DRINK_EMOJI[upper] || DRINK_EMOJI.DEFAULT;
}

export default function BuyPage() {
  const navigate = useNavigate();
  const { buyTab, isBuyLoading, error, fetchBuyTab, openAffiliateLink } = useCommerceStore();

  useEffect(() => {
    fetchBuyTab();
  }, [fetchBuyTab]);

  if (isBuyLoading && !buyTab) {
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-24 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const bottles = buyTab?.bottles || [];

  return (
    <div className="min-h-dvh bg-cin-black pb-24">
      <div className="px-5 pt-5">
        <ScreenHeader title="Buy" subtitle="Bottles you've scanned" />
      </div>

      {error && (
        <div className="px-5 mt-2">
          <div className="bg-cin-red/20 border border-cin-red/40 rounded-lg p-3">
            <p className="text-cin-red text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="px-5 mt-4">
        {bottles.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="No bottles yet"
            subtitle="Scan a bottle to see purchase links from our partner retailers."
            action={
              <Button variant="secondary" onClick={() => navigate('/scan')}>
                Scan a Bottle
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {bottles.map((bottle) => (
              <Card key={bottle.id} className="flex items-center gap-3 p-3">
                {/* Bottle icon */}
                <div className="w-12 h-16 rounded-md bg-cin-dark flex items-center justify-center text-2xl flex-shrink-0">
                  {getDrinkEmoji(bottle.category)}
                </div>

                {/* Bottle details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-cin-white truncate">{bottle.name}</p>
                  <p className="text-xs text-cin-muted mt-0.5">
                    {bottle.category}{bottle.subcategory ? ` · ${bottle.subcategory}` : ''}
                  </p>
                  {bottle.affiliatePartner && (
                    <p className="text-[11px] text-cin-muted mt-0.5">
                      via {bottle.affiliatePartner}
                    </p>
                  )}
                </div>

                {/* Price + Buy button */}
                <div className="flex-shrink-0 text-right">
                  {bottle.price && (
                    <p className="text-sm font-bold text-cin-white">{bottle.price}</p>
                  )}
                  {bottle.affiliateUrl ? (
                    <button
                      onClick={() => openAffiliateLink(bottle.affiliateUrl, {
                        bottleId: bottle.id,
                        affiliatePartner: bottle.affiliatePartner,
                        source: 'buy_tab',
                      })}
                      className="mt-1 px-3 py-1 rounded-md bg-cin-cyan text-cin-black text-[11px] font-bold"
                    >
                      Buy
                    </button>
                  ) : (
                    <span className="text-[11px] text-cin-muted">No link</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
