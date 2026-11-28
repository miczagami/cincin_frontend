import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, ScanLine, ChevronRight } from 'lucide-react';
import { Card, Pill } from '../../components/ui';
import useAuthStore from '../../context/authStore';
import Logo from '../../components/brand/Logo';
import { commerce, games } from '../../services/api';

/** How many discovery-feed items Home previews; the rest are on /discover. */
const DISCOVER_PREVIEW = 2;
/** How many of the player's latest games Home lists. */
const RECENT_GAMES = 3;

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [discoverItems, setDiscoverItems] = useState(null); // null until the feed answers

  useEffect(() => {
    let live = true;
    commerce.getFeed({ limit: DISCOVER_PREVIEW })
      .then((data) => { if (live) setDiscoverItems(data.items.slice(0, DISCOVER_PREVIEW)); })
      .catch(() => { if (live) setDiscoverItems([]); });
    return () => { live = false; };
  }, []);

  // Game history is Pro-only: for free players (403) and players with no games, the section hides
  const [recentGames, setRecentGames] = useState([]);

  useEffect(() => {
    let live = true;
    games.history({ limit: RECENT_GAMES })
      .then((history) => { if (live) setRecentGames(history.slice(0, RECENT_GAMES)); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="px-5 pt-3 flex justify-between items-center">
        <h1 className="m-0"><Logo variant="horizontal" height={30} /></h1>
        <button onClick={() => navigate('/notifications')} className="relative w-9 h-9 rounded-full bg-cin-card border border-cin-border flex items-center justify-center">
          <Bell className="w-4 h-4 text-cin-text" />
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cin-red border-2 border-cin-espresso" />
        </button>
      </div>

      {user && <div className="px-5 mt-2"><p className="text-sm text-cin-muted font-body">Welcome back, <span className="text-cin-cream font-semibold">{user.displayName || 'taster'}</span></p></div>}

      <div className="px-5 mt-5">
        <Card interactive gradient="hero" className="text-center py-7 px-5 border-cin-gold/20" onClick={() => navigate('/scan')}>
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-full bg-cin-gold/10 flex items-center justify-center">
              <ScanLine className="w-7 h-7 text-cin-gold" />
            </div>
          </div>
          <div className="text-lg font-display font-extrabold text-cin-cream">{t('home.scanBottle')}</div>
          <div className="text-sm text-cin-text font-body mt-1">{t('home.scanSubtitle')}</div>
          <Pill color="gold" className="mt-3">{t('home.scansRemaining', { count: 3, total: 5 })}</Pill>
        </Card>
      </div>

      {recentGames.length > 0 && (
        <section aria-labelledby="home-recent-games" className="px-5 mt-6">
          <div className="flex justify-between items-center mb-3">
            <h2 id="home-recent-games" className="text-base font-display font-bold text-cin-cream">{t('home.recentGames')}</h2>
            <button className="text-xs text-cin-gold font-body flex items-center gap-0.5">{t('home.seeAll')} <ChevronRight className="w-3 h-3" /></button>
          </div>
          <ul>
            {recentGames.map((g) => (
              <li key={g.gameId}>
                <Card interactive className="mb-2 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-semibold text-cin-cream font-body">{g.bottle?.name}</div>
                    <div className="text-xs text-cin-muted font-body mt-0.5">{new Date(g.playedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                  </div>
                  <div className={`text-base font-display font-extrabold ${g.yourScore > 0 ? 'text-cin-green' : 'text-cin-red'}`}>{g.yourScore > 0 ? `+${g.yourScore}` : g.yourScore}</div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="px-5 mt-6">
        <h2 className="text-base font-display font-bold text-cin-cream mb-3">{t('home.myCellarClub')}</h2>
        <Card interactive className="border-l-[3px] border-l-cin-gold" onClick={() => navigate('/clubs')}>
          <div className="flex justify-between items-center">
            <div><div className="text-sm font-bold text-cin-cream font-body">Friday Night Vino</div><div className="text-xs text-cin-muted font-body mt-0.5">Season 2 · 18 days left</div></div>
            <div className="text-right"><div className="text-base font-display font-extrabold text-cin-gold">2nd</div><div className="text-[11px] text-cin-muted font-body">of 6</div></div>
          </div>
        </Card>
      </div>

      <section aria-labelledby="home-discover" className="px-5 mt-6 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 id="home-discover" className="text-base font-display font-bold text-cin-cream">{t('home.discover')}</h2>
          <button className="text-xs text-cin-gold font-body flex items-center gap-0.5">{t('home.browse')} <ChevronRight className="w-3 h-3" /></button>
        </div>
        {discoverItems?.length === 0 && (
          <p className="text-sm text-cin-muted font-body">{t('home.discoverEmpty')}</p>
        )}
        {/* Only the item's own title and subtitle: never the brand's badge text or a points
            offer, which the alcohol-marketing code warns against (ABAC copy audit) */}
        {discoverItems?.map((item) => (
          <Card key={item.id} gradient={item.isSponsored ? 'sponsor' : undefined} className={`mb-2 ${item.isSponsored ? 'border-cin-orange/20' : ''}`}>
            {item.isSponsored && <Pill color="orange" className="mb-2">{t('home.sponsored')}</Pill>}
            <div className="text-sm font-bold text-cin-cream font-body">{item.title}</div>
            {item.subtitle && <div className="text-xs text-cin-text font-body mt-1">{item.subtitle}</div>}
          </Card>
        ))}
      </section>
    </div>
  );
}
