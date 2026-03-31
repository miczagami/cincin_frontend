/**
 * ScanConfirmPage — Priority 4 (Updated)
 * Spec ref: Section 3.3
 *
 * Changes from Phase 1:
 * - handleConfirm: shows toast on source-notes error (non-blocking — user still proceeds to game setup)
 * - handleConfirm: shows info toast "Bottle confirmed!" on success
 * - Errors no longer silently fail
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { Button, Card, Pill, ScreenHeader, Spinner } from '../../components/ui';
import useScanStore from '../../context/scanStore';
import useToast from '../../hooks/useToast';

export default function ScanConfirmPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { scanResult, confirmedBottle, confirmBottle, sourceNotes, isSourcing, reset } = useScanStore();
  const toast = useToast();

  useEffect(() => {
    if (!scanResult && !confirmedBottle) navigate('/scan');
  }, [scanResult, confirmedBottle, navigate]);

  const bottle = confirmedBottle || scanResult?.topCandidate || scanResult?.candidates?.[0];
  if (!bottle) return null;

  const pct = Math.round((bottle.confidence || bottle.score || 0.9) * 100);
  const color = pct >= 80 ? 'green' : pct >= 50 ? 'orange' : 'red';
  const tags = [bottle.category, bottle.varietal, bottle.subRegion, bottle.region, bottle.country].filter(Boolean);

  const handleConfirm = async () => {
    if (bottle.id) {
      const confirmResult = await confirmBottle(bottle.id);
      if (confirmResult && !confirmResult.success) {
        toast.error('Could not confirm bottle. Please try scanning again.');
        return;
      }

      // Source notes — non-blocking, game setup can proceed without tasting notes sourced yet
      const notesResult = await sourceNotes(bottle.id);
      if (notesResult && !notesResult.success) {
        toast.warning('Tasting notes are loading in the background.');
      }
    }

    toast.success('Bottle confirmed!');
    navigate('/game/setup');
  };

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-3 pb-10 animate-fade-in">
      <ScreenHeader
        title={t('scan.bottleIdentified')}
        back={t('scan.scanAgain')}
        onBack={() => { reset(); navigate('/scan'); }}
      />
      <div className="mt-4">
        <Card className="p-0 overflow-hidden">
          <div className="h-44 cin-gradient-card flex items-center justify-center border-b border-cin-border">
            <div className="text-center">
              <span className="text-4xl">🍷</span>
              <div className="text-[11px] text-cin-muted font-body mt-1">Label photo</div>
            </div>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-display font-extrabold text-cin-white">
                  {bottle.name || bottle.productName || 'Unknown'}
                </h2>
                <p className="text-sm text-cin-text font-body mt-0.5">
                  {[bottle.varietal, bottle.vintage].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Pill color={color}>{pct}%</Pill>
            </div>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((tag, i) => <Pill key={i} color="muted" className="text-[10px]">{tag}</Pill>)}
              </div>
            )}
            {bottle.producer && (
              <div className="mt-3 pt-3 border-t border-cin-border text-xs text-cin-muted font-body">
                {bottle.producer} · {bottle.region || bottle.country}
              </div>
            )}
          </div>
        </Card>

        <Card className="mt-3 text-center bg-cin-cyan-dim border-cin-cyan/20">
          {isSourcing ? (
            <div className="flex items-center justify-center gap-2 py-1">
              <Spinner size="sm" />
              <p className="text-sm text-cin-cyan">{t('scan.sourcingNotes')}</p>
            </div>
          ) : (
            <p className="text-sm text-cin-cyan">✓ {t('scan.notesReady', 'Tasting notes ready')}</p>
          )}
        </Card>

        {bottle.vivino_url || bottle.sourceUrl ? (
          <a
            href={bottle.vivino_url || bottle.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-cin-muted mt-2 hover:text-cin-cyan transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> View source
          </a>
        ) : null}

        <div className="mt-6 space-y-3">
          <Button onClick={handleConfirm} disabled={isSourcing}>
            {isSourcing ? t('scan.sourcingNotes') : t('scan.confirmAndSetup', 'Confirm & Setup Game')}
          </Button>
          <Button variant="secondary" onClick={() => { reset(); navigate('/scan/search'); }}>
            {t('scan.searchManually', 'Search Manually')}
          </Button>
        </div>
      </div>
    </div>
  );
}
