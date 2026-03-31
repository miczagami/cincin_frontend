import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui';

export default function SplashPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh cin-gradient-hero flex flex-col items-center justify-center px-10 text-center">
      <div className="animate-fade-in">
        <h1 className="text-[56px] font-display font-black text-cin-white tracking-tight leading-none">CinCin</h1>
        <div className="text-[11px] font-display text-cin-cyan tracking-[0.3em] uppercase mt-2">{t('common.tagline')}</div>
      </div>
      <p className="text-[15px] text-cin-text font-body mt-8 leading-relaxed animate-slide-up">{t('splash.hero')}</p>
      <div className="mt-12 w-full max-w-xs animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <Button onClick={() => navigate('/auth/signup')}>{t('splash.getStarted')}</Button>
        <button onClick={() => navigate('/auth/login')} className="cin-btn-ghost w-full mt-3">{t('auth.alreadyHaveAccount')}</button>
      </div>
      <p className="text-[11px] text-cin-muted/40 font-body mt-auto pb-6 pt-16">getcincin.com</p>
    </div>
  );
}
