import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Button, Card, ScreenHeader } from '../../components/ui';
import useAuthStore from '../../context/authStore';

function detectRegion() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (tz.includes('Australia')) return { code: 'AU', name: 'Australia', age: 18 };
  if (tz.includes('Auckland')) return { code: 'NZ', name: 'New Zealand', age: 18 };
  if (tz.includes('London')) return { code: 'GB', name: 'United Kingdom', age: 18 };
  if (tz.includes('America')) return { code: 'US', name: 'United States', age: 21 };
  return { code: 'AU', name: 'Australia', age: 18 };
}

export default function AgeVerifyPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { initiateAgeVerify, checkAgeVerifyStatus, devVerify, ageVerified } = useAuthStore();
  const [region] = useState(detectRegion);
  const [step, setStep] = useState('intro');

  useEffect(() => { if (ageVerified) navigate('/auth/notifications'); }, [ageVerified, navigate]);

  const handleBegin = async () => {
    setStep('verifying');
    const result = await initiateAgeVerify(region.code);
    if (result.success) {
      // In production: mount Onfido/Jumio SDK widget using result.data.sdkToken
      const interval = setInterval(async () => {
        const status = await checkAgeVerifyStatus();
        if (status === 'verified') { clearInterval(interval); setStep('success'); setTimeout(() => navigate('/auth/notifications'), 1500); }
        else if (status === 'failed') { clearInterval(interval); setStep('failed'); }
      }, 3000);
    } else { setStep('failed'); }
  };

  const handleDev = async () => {
    setStep('verifying');
    const result = await devVerify('1990-01-15');
    if (result.success) { setStep('success'); setTimeout(() => navigate('/auth/notifications'), 1000); }
    else setStep('failed');
  };

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-10 flex flex-col animate-fade-in">
      <ScreenHeader title={t('ageVerify.title')} subtitle={t('ageVerify.subtitle')} />
      <div className="flex-1 flex flex-col items-center justify-center gap-6 mt-6">
        <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 ${
          step === 'success' ? 'bg-cin-green/15' : step === 'failed' ? 'bg-cin-red/15' : step === 'verifying' ? 'bg-cin-cyan-dim animate-pulse' : 'bg-cin-cyan-dim'
        }`}>
          {step === 'verifying' ? <Loader2 className="w-12 h-12 text-cin-cyan animate-spin" />
            : step === 'success' ? <ShieldCheck className="w-12 h-12 text-cin-green" />
            : <span className="text-5xl">🪪</span>}
        </div>
        {step === 'intro' && (
          <div className="text-center">
            <p className="text-sm text-cin-text font-body leading-relaxed">{t('ageVerify.scanId')}</p>
            <p className="text-xs text-cin-muted font-body mt-2 leading-relaxed">{t('ageVerify.privacyNote')}</p>
          </div>
        )}
        {step === 'verifying' && <p className="text-sm text-cin-cyan font-body">{t('ageVerify.verifying')}</p>}
        {step === 'success' && <p className="text-sm text-cin-green font-display font-bold">{t('ageVerify.verified')}</p>}
        {step === 'failed' && (
          <div className="text-center">
            <p className="text-sm text-cin-red font-display font-bold">{t('ageVerify.failed')}</p>
            <p className="text-xs text-cin-muted mt-2">You must be {region.age}+ in {region.name}.</p>
          </div>
        )}
        <Card className="w-full flex justify-between items-center">
          <span className="text-sm text-cin-text">{t('ageVerify.yourRegion')}</span>
          <span className="text-sm text-cin-white font-display font-bold">{region.name} ({region.age}+)</span>
        </Card>
      </div>
      <div className="mt-6 space-y-2">
        {step === 'intro' && (
          <>
            <Button onClick={handleBegin}>{t('ageVerify.beginVerification')}</Button>
            {import.meta.env.DEV && <button onClick={handleDev} className="cin-btn-ghost w-full text-cin-orange">[Dev] Skip verification</button>}
          </>
        )}
        {step === 'failed' && <Button onClick={() => setStep('intro')}>{t('common.retry')}</Button>}
      </div>
    </div>
  );
}
