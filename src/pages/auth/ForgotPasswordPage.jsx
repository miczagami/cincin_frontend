/**
 * ForgotPasswordPage — Priority 1 (Phase 5)
 * Full password reset flow replacing the Phase 4 placeholder.
 *
 * Spec ref: Section 7.1 (Authentication)
 * Backend endpoints:
 *   POST /api/auth/password-reset/request  → sends reset email
 *   POST /api/auth/password-reset          → resets with token
 *
 * Three-step flow:
 *   1. Enter email → request reset link
 *   2. Enter reset token (from email) + new password
 *   3. Success confirmation → navigate to login
 *
 * Design: Matches CinCin dark theme, cin-* tokens, same layout as LoginPage.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, Mail, ShieldCheck, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button, Input, ScreenHeader, Card } from '../../components/ui';
import { auth } from '../../services/api';
import useToast from '../../hooks/useToast';

const STEPS = {
  REQUEST: 'request',
  RESET: 'reset',
  SUCCESS: 'success',
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  const [step, setStep] = useState(STEPS.REQUEST);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Step 1: Request reset email ──
  const handleRequestReset = async () => {
    setErrors({});

    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setIsLoading(true);
    try {
      await auth.forgotPassword(email);
      toast.success('If that email exists, a reset link has been sent.');
      setStep(STEPS.RESET);
    } catch (err) {
      // Backend always returns success to prevent email enumeration,
      // so errors here are network-level issues.
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Reset with token ──
  const handleResetPassword = async () => {
    setErrors({});
    const newErrors = {};

    if (!token.trim()) {
      newErrors.token = 'Reset token is required';
    }
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      newErrors.newPassword = 'Password must contain both letters and numbers';
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      await auth.resetPassword({ token: token.trim(), newPassword });
      toast.success('Password reset successfully!');
      setStep(STEPS.SUCCESS);
    } catch (err) {
      const message = err?.response?.data?.error || 'Invalid or expired reset token.';
      setErrors({ token: message });
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 1 UI: Request ──
  if (step === STEPS.REQUEST) {
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-10 animate-fade-in">
        <ScreenHeader title="Reset Password" subtitle="Enter your email and we'll send you a reset link." />

        <div className="mt-8 flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-cin-cyan/10 border border-cin-cyan/20 flex items-center justify-center">
            <Mail className="w-8 h-8 text-cin-cyan" />
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            onKeyDown={(e) => e.key === 'Enter' && handleRequestReset()}
          />

          <div className="pt-2">
            <Button loading={isLoading} onClick={handleRequestReset}>
              Send Reset Link
            </Button>
          </div>

          <button
            onClick={() => navigate('/auth/login')}
            className="cin-btn-ghost w-full flex items-center justify-center gap-2 text-cin-cyan"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2 UI: Enter token + new password ──
  if (step === STEPS.RESET) {
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-10 animate-fade-in">
        <ScreenHeader
          title="New Password"
          subtitle="Check your email for the reset token, then enter your new password."
        />

        <div className="mt-8 flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-cin-cyan/10 border border-cin-cyan/20 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-cin-cyan" />
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Input
            label="Reset token"
            type="text"
            placeholder="Paste the token from your email"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            error={errors.token}
          />

          <div className="relative">
            <Input
              label="New password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={errors.newPassword}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-cin-muted hover:text-cin-white transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Input
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />

          <p className="text-[11px] text-cin-muted leading-relaxed">
            Must be at least 8 characters with both letters and numbers.
          </p>

          <div className="pt-2">
            <Button loading={isLoading} onClick={handleResetPassword}>
              Reset Password
            </Button>
          </div>

          <button
            onClick={() => setStep(STEPS.REQUEST)}
            className="cin-btn-ghost w-full text-cin-muted"
          >
            Didn't receive the email? Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3 UI: Success ──
  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-10 animate-fade-in flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 rounded-full bg-cin-green/15 border border-cin-green/30 flex items-center justify-center mb-6">
        <ShieldCheck className="w-10 h-10 text-cin-green" />
      </div>

      <h1 className="text-2xl font-display font-extrabold text-cin-white mb-2">
        Password Reset!
      </h1>
      <p className="text-sm text-cin-muted font-body mb-8 max-w-[280px] leading-relaxed">
        Your password has been updated. All existing sessions have been logged out for security.
      </p>

      <div className="w-full max-w-[320px]">
        <Button onClick={() => navigate('/auth/login')}>
          Sign In
        </Button>
      </div>
    </div>
  );
}
