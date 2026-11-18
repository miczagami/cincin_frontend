import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui';
import Logo from '../../components/brand/Logo';

// Welcome screen — brand guide "04 · Onboarding / Welcome"
export default function SplashPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh cin-gradient-hero flex flex-col items-center px-8 text-center">
      <div className="flex-1 flex flex-col items-center justify-center w-full pt-16">
        <Logo variant="stacked" className="w-[168px] h-auto animate-fade-in" />

        <h1 className="mt-12 text-[34px] leading-[1.1] font-display font-bold text-cin-cream animate-slide-up">
          {t('splash.headline')}{' '}
          <span className="block text-cin-gold">{t('splash.headlineAccent')}</span>
        </h1>
        <p className="mt-4 max-w-[17rem] text-[15px] text-cin-text/90 font-body font-light leading-relaxed animate-slide-up">
          {t('splash.hero')}
        </p>

        <div className="mt-10 w-full max-w-xs animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Button onClick={() => navigate('/auth/signup')}>{t('splash.getStarted')}</Button>
          <button onClick={() => navigate('/auth/login')} className="cin-btn-ghost w-full mt-3">
            {t('auth.alreadyHaveAccount')}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-cin-muted font-body font-light pb-6 pt-10">{t('splash.footnote')}</p>
    </div>
  );
}
