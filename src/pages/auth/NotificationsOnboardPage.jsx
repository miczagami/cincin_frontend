import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Toggle, ScreenHeader } from '../../components/ui';

const CATS = [
  { key: 'gameInvites', label: 'Game invites', desc: 'When someone invites you to play', on: true },
  { key: 'cellarClub', label: 'Cellar Club activity', desc: 'Game approvals & season updates', on: true },
  { key: 'seasonReminders', label: 'Season reminders', desc: '7 days & 1 day before season ends', on: true },
  { key: 'palateUpdates', label: 'Palate Profile updates', desc: 'New insights after games (Pro)', on: false },
  { key: 'weeklyDigests', label: 'Weekly digests', desc: 'Club standings summary', on: false },
];

export default function NotificationsOnboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState(Object.fromEntries(CATS.map(c => [c.key, c.on])));

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-10 animate-fade-in">
      <ScreenHeader title={t('notifications.title')} subtitle={t('notifications.subtitle')} />
      <div className="mt-5 space-y-2.5">
        {CATS.map((cat) => (
          <Card key={cat.key} className="flex justify-between items-center">
            <div className="flex-1 mr-4">
              <div className="text-sm text-cin-white font-body font-semibold">{cat.label}</div>
              <div className="text-xs text-cin-muted font-body mt-0.5">{cat.desc}</div>
            </div>
            <Toggle checked={prefs[cat.key]} onChange={(v) => setPrefs(p => ({ ...p, [cat.key]: v }))} />
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <Button onClick={() => navigate('/')}>{t('common.next')}</Button>
        <button onClick={() => navigate('/')} className="cin-btn-ghost w-full mt-2">{t('common.skip')}</button>
      </div>
    </div>
  );
}
