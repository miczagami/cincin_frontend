/**
 * LoginPage — Priority 4 (Updated)
 * Spec ref: Section 7.1
 *
 * Changes from Phase 1:
 * - Network-level errors (fetch failure, server 5xx) now show as toast instead of inline <p>
 * - Field validation errors (empty email/password) remain inline — clearer UX for form errors
 * - Social login errors show as toast
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Apple, Chrome } from 'lucide-react';
import { Button, Input, ScreenHeader, Divider } from '../../components/ui';
import useAuthStore from '../../context/authStore';
import useToast from '../../hooks/useToast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, socialLogin, isLoading } = useAuthStore();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = async () => {
    setFieldError('');
    // Field validation stays inline
    if (!email || !password) {
      setFieldError(t('auth.emailPasswordRequired', 'Email and password required'));
      return;
    }
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    } else {
      // Auth errors (wrong password, unverified) stay inline for clarity
      // Network/server errors go to toast
      const msg = result.error || 'Login failed';
      if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('server') || msg.toLowerCase().includes('try again')) {
        toast.error(msg);
      } else {
        setFieldError(msg);
      }
    }
  };

  const handleSocial = async (provider) => {
    const result = await socialLogin(provider, 'PLACEHOLDER');
    if (result.success) {
      navigate('/');
    } else {
      toast.error(result.error || `${provider} sign-in failed. Please try again.`);
    }
  };

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-10 animate-fade-in">
      <ScreenHeader title={t('auth.signIn')} subtitle="Welcome back to CinCin" />
      <div className="mt-6 space-y-3">
        <button
          onClick={() => handleSocial('apple')}
          className="cin-card w-full flex items-center gap-3 cursor-pointer text-cin-white text-sm font-body"
        >
          <Apple className="w-5 h-5" /> {t('auth.continueApple')}
        </button>
        <button
          onClick={() => handleSocial('google')}
          className="cin-card w-full flex items-center gap-3 cursor-pointer text-cin-white text-sm font-body"
        >
          <Chrome className="w-5 h-5" /> {t('auth.continueGoogle')}
        </button>
        <Divider text={t('common.or')} />
        <Input
          label={t('auth.email')}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={t('auth.password')}
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        {/* Inline field errors only — network errors go to toast */}
        {fieldError && <p className="text-xs text-cin-red text-center">{fieldError}</p>}
        <div className="pt-2">
          <Button loading={isLoading} onClick={handleSubmit}>{t('auth.signIn')}</Button>
        </div>
        <button onClick={() => navigate('/auth/forgot-password')} className="cin-btn-ghost w-full text-cin-cyan">
          {t('auth.forgotPassword')}
        </button>
        <button onClick={() => navigate('/auth/signup')} className="cin-btn-ghost w-full">
          Don't have an account? {t('auth.signUp')}
        </button>
      </div>
    </div>
  );
}
