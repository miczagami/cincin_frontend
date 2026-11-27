/**
 * RecoveryScreen: what a player sees when a screen fails to render, in place
 * of a blank page or a raw stack. It offers a way back: reload, or go home.
 *
 * Both actions load the page afresh rather than navigating in-app, so they
 * still work when the router or app state is what broke.
 */

import { useState } from 'react';
import Logo from '../brand/Logo';
import { Button } from '../ui';
import useAuthStore from '../../context/authStore';
import { clearAuth } from '../../services/api';

// How long Sign out waits for the server before ending the session on this device anyway
const SIGN_OUT_WAIT_MS = 5000;

/** End the session (on the server if it answers in time, on this device always), then load the auth screen afresh. */
async function signOut() {
  try {
    await Promise.race([
      useAuthStore.getState().logout(),
      new Promise((resolve) => setTimeout(resolve, SIGN_OUT_WAIT_MS)),
    ]);
  } finally {
    clearAuth();
    window.location.assign('/auth');
  }
}

export default function RecoveryScreen() {
  // Home is where "Go home" leads, so when Home itself is broken, signing out is the way back
  const onHome = window.location.pathname === '/';
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="min-h-dvh bg-cin-espresso px-5 flex flex-col items-center justify-center text-center animate-fade-in">
      <Logo variant="mark" width={64} aria-hidden="true" />
      <h1 className="font-display font-bold text-xl text-cin-cream mt-6">Something went wrong</h1>
      <p className="text-sm text-cin-muted font-body mt-2 max-w-xs">
        This screen couldn't load. {onHome ? 'Try again, or sign out and back in.' : 'Try again, or head back home.'}
      </p>
      <div className="w-full max-w-xs mt-8 flex flex-col gap-3">
        {/* Reloading mid-sign-out would cancel it, so Try again waits for Sign out */}
        <Button disabled={signingOut} onClick={() => window.location.reload()}>Try again</Button>
        {onHome
          ? <Button variant="outline" loading={signingOut} onClick={() => { setSigningOut(true); signOut(); }}>Sign out</Button>
          : <Button variant="outline" onClick={() => window.location.assign('/')}>Go home</Button>}
      </div>
    </div>
  );
}
