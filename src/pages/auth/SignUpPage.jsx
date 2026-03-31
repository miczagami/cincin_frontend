/**
 * SignUpPage — Priority 4 (Updated)
 * Spec ref: Section 7.1
 *
 * Changes from Phase 1:
 * - Network/server errors on register/social now show as toast
 * - Field validation errors remain inline (correct UX for form errors)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Apple, Chrome } from 'lucide-react';
import { Button, Input, ScreenHeader, Divider } from '../../components/ui';
import useAuthStore from '../../context/authStore';
import useToast from '../../hooks/useToast';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { register, socialLogin, isLoading } = useAuthStore();
  const toast = useToast();

  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.displayName.trim()) e.displayName = 'Required';
    if (!form.email.includes('@')) e.email = 'Enter a valid email';
    if (form.password.length < 8) e.password = 'At least 8 characters';
    else if (!/\d/.test(form.password) || !/[a-zA-Z]/.test(form.password)) {
      e.password = 'Must include a letter and a number';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const result = await register(form);
    if (result.success) {
      navigate('/auth/age-verify');
    } else {
      const msg = result.error || 'Registration failed';
      // Email already exists → inline; network errors → toast
      if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('server') || msg.toLowerCase().includes('try again')) {
        toast.error(msg);
      } else {
        setErrors({ general: msg });
      }
    }
  };

  const handleSocial = async (provider) => {
    const result = await socialLogin(provider, 'PLACEHOLDER_TOKEN');
    if (result.success) {
      navigate('/auth/age-verify');
    } else {
      toast.error(result.error || `${provider} sign-up failed. Please try again.`);
    }
  };

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-10 animate-fade-in">
      <ScreenHeader title={t('auth.createAccount')} subtitle={t('auth.subtitle')} />
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
          label={t('auth.displayName')}
          placeholder="Your name"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          error={errors.displayName}
        />
        <Input
          label={t('auth.email')}
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
        />
        <Input
          label={t('auth.password')}
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
        />
        {errors.general && <p className="text-xs text-cin-red text-center">{errors.general}</p>}
        <div className="pt-2">
          <Button loading={isLoading} onClick={handleSubmit}>{t('auth.createAccount')}</Button>
        </div>
        <p className="text-[11px] text-cin-muted text-center leading-relaxed mt-2">{t('auth.termsNotice')}</p>
        <button onClick={() => navigate('/auth/login')} className="cin-btn-ghost w-full mt-2">
          {t('auth.alreadyHaveAccount')}
        </button>
      </div>
    </div>
  );
}
