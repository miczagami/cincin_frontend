/**
 * VerifyEmailPage — landing page for the emailed verification link
 * Spec ref: Section 7.2 (email verification before clubs / subscriptions)
 *
 * Route: /auth/verify-email?token=…
 * Works signed in or out; when signed in, refreshes the user so
 * email-gated features unlock immediately.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../../services/api';
import useAuthStore from '../../context/authStore';
import { ScreenHeader, Button, Card, Spinner } from '../../components/ui';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated, setUser } = useAuthStore();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in dev
    started.current = true;

    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('This verification link is incomplete.');
      return;
    }

    auth.verifyEmail(token)
      .then(async () => {
        setStatus('success');
        if (useAuthStore.getState().isAuthenticated) {
          try { setUser(await auth.me()); } catch { /* the next app load picks it up */ }
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.response?.data?.error || 'This verification link is invalid or has expired.');
      });
  }, [params, setUser]);

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-10 animate-fade-in">
      <ScreenHeader title="Verify Email" />
      <Card className="mt-8 text-center">
        {status === 'verifying' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Spinner />
            <p className="text-sm text-cin-muted font-body">Verifying your email…</p>
          </div>
        )}
        {status === 'success' && (
          <>
            <span className="text-4xl">✅</span>
            <p className="text-cin-white font-display font-bold mt-3">Email verified</p>
            <p className="text-sm text-cin-muted font-body mt-1">You can now create and join Cellar Clubs and subscribe to Pro.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <span className="text-4xl">⚠️</span>
            <p className="text-cin-white font-display font-bold mt-3">Couldn't verify your email</p>
            <p className="text-sm text-cin-muted font-body mt-1">{message}</p>
            {isAuthenticated && (
              <p className="text-xs text-cin-muted font-body mt-3">You can request a new link from Settings.</p>
            )}
          </>
        )}
      </Card>
      {status !== 'verifying' && (
        <div className="mt-6">
          {isAuthenticated ? (
            <Button onClick={() => navigate(status === 'error' ? '/settings' : '/', { replace: true })}>
              {status === 'error' ? 'Go to Settings' : 'Continue'}
            </Button>
          ) : (
            <Button onClick={() => navigate('/auth/login', { replace: true })}>Sign in</Button>
          )}
        </div>
      )}
    </div>
  );
}
