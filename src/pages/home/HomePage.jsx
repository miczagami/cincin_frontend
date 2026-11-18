import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, ScanLine, ChevronRight } from 'lucide-react';
import { Card, Pill } from '../../components/ui';
import useAuthStore from '../../context/authStore';
import Logo from '../../components/brand/Logo';

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const recentGames = [
    { name: 'Penfolds Bin 389', cat: 'Red · Shiraz/Cab', score: '+8', date: 'Today' },
    { name: 'Stone & Wood Pacific Ale', cat: 'Beer · Pale Ale', score: '+5', date: 'Yesterday' },
  ];

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

      <div className="px-5 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-display font-bold text-cin-cream">{t('home.recentGames')}</h2>
          <button className="text-xs text-cin-gold font-body flex items-center gap-0.5">{t('home.seeAll')} <ChevronRight className="w-3 h-3" /></button>
        </div>
        {recentGames.map((g, i) => (
          <Card key={i} interactive className="mb-2 flex justify-between items-center">
            <div>
              <div className="text-sm font-semibold text-cin-cream font-body">{g.name}</div>
              <div className="text-xs text-cin-muted font-body mt-0.5">{g.cat} · {g.date}</div>
            </div>
            <div className={`text-base font-display font-extrabold ${parseInt(g.score) > 0 ? 'text-cin-green' : 'text-cin-red'}`}>{g.score}</div>
          </Card>
        ))}
      </div>

      <div className="px-5 mt-6">
        <h2 className="text-base font-display font-bold text-cin-cream mb-3">{t('home.myCellarClub')}</h2>
        <Card interactive className="border-l-[3px] border-l-cin-gold" onClick={() => navigate('/clubs')}>
          <div className="flex justify-between items-center">
            <div><div className="text-sm font-bold text-cin-cream font-body">Friday Night Vino</div><div className="text-xs text-cin-muted font-body mt-0.5">Season 2 · 18 days left</div></div>
            <div className="text-right"><div className="text-base font-display font-extrabold text-cin-gold">2nd</div><div className="text-[11px] text-cin-muted font-body">of 6</div></div>
          </div>
        </Card>
      </div>

      <div className="px-5 mt-6 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-display font-bold text-cin-cream">{t('home.discover')}</h2>
          <button className="text-xs text-cin-gold font-body flex items-center gap-0.5">{t('home.browse')} <ChevronRight className="w-3 h-3" /></button>
        </div>
        <Card gradient="sponsor" className="border-cin-orange/20">
          <Pill color="orange" className="mb-2">Sponsored</Pill>
          <div className="text-sm font-bold text-cin-cream font-body">Four Pillars Rare Dry Gin</div>
          <div className="text-xs text-cin-text font-body mt-1">Double points this weekend. Can you taste the Tasmanian pepperberry?</div>
        </Card>
      </div>
    </div>
  );
}
