/**
 * RecoveryScreen: what a player sees when a screen fails to render, in place
 * of a blank page or a raw stack. It offers a way back: reload, or go home.
 *
 * Both actions load the page afresh rather than navigating in-app, so they
 * still work when the router or app state is what broke.
 */

import Logo from '../brand/Logo';
import { Button } from '../ui';
import useAuthStore from '../../context/authStore';

/** Clear the session, then load the auth screen afresh. */
async function signOut() {
  try { await useAuthStore.getState().logout(); } finally { window.location.assign('/auth'); }
}

export default function RecoveryScreen() {
  return (
    <div className="min-h-dvh bg-cin-espresso px-5 flex flex-col items-center justify-center text-center animate-fade-in">
      <Logo variant="mark" width={64} aria-hidden="true" />
      <h1 className="font-display font-bold text-xl text-cin-cream mt-6">Something went wrong</h1>
      <p className="text-sm text-cin-muted font-body mt-2 max-w-xs">
        This screen couldn't load. Try again, or head back home.
      </p>
      <div className="w-full max-w-xs mt-8 flex flex-col gap-3">
        <Button onClick={() => window.location.reload()}>Try again</Button>
        {/* Home is where "Go home" leads, so when Home itself is broken, signing out is the way back */}
        {window.location.pathname === '/'
          ? <Button variant="outline" onClick={signOut}>Sign out</Button>
          : <Button variant="outline" onClick={() => window.location.assign('/')}>Go home</Button>}
      </div>
    </div>
  );
}
