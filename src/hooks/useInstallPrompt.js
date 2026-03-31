/**
 * useInstallPrompt — Priority 6 Update (Phase 5)
 * Spec ref: Phase 5 Timeline — Install prompt UX refinement
 *
 * Priority 6 changes:
 * - Smart timing: prompt only shows after the user completes their first game
 *   OR after 3 app visits, whichever comes first. This avoids showing the
 *   install prompt before the user has experienced the core value.
 * - Dismiss with expiry: once dismissed, the prompt won't re-appear for 7 days
 *   (stored in localStorage). After 7 days it re-surfaces once.
 * - Permanent dismiss: if dismissed twice, never shows again.
 * - Already-installed detection unchanged from Phase 1.
 * - Exposes `shouldShow` (boolean) and `dismiss()` for the install banner UI.
 *
 * Usage:
 *   const { canInstall, installed, install, shouldShow, dismiss } = useInstallPrompt();
 *   if (shouldShow) { <InstallBanner onInstall={install} onDismiss={dismiss} /> }
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cin-install-prompt';
const VISIT_COUNT_KEY = 'cin-visit-count';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_DISMISSALS = 2;
const MIN_VISITS_TO_SHOW = 3;

function getDismissState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, lastDismissed: null };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lastDismissed: null };
  }
}

function setDismissState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — degrade gracefully
  }
}

function getVisitCount() {
  try {
    return parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function incrementVisitCount() {
  try {
    const count = getVisitCount() + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(count));
    return count;
  } catch {
    return 0;
  }
}

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [hasCompletedGame, setHasCompletedGame] = useState(false);

  useEffect(() => {
    // Already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    // Track visit count
    const visits = incrementVisitCount();

    // Listen for the beforeinstallprompt event
    const handlePrompt = (e) => {
      e.preventDefault();
      setPrompt(e);
    };

    const handleInstalled = () => setInstalled(true);

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);

    // Listen for custom event from game results (first game completed)
    const handleGameComplete = () => setHasCompletedGame(true);
    window.addEventListener('cin:game-completed', handleGameComplete);

    // Check if enough visits have occurred
    if (visits >= MIN_VISITS_TO_SHOW) {
      setHasCompletedGame(true); // Treat visit threshold same as game completion
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('cin:game-completed', handleGameComplete);
    };
  }, []);

  // Determine if we should show the prompt
  useEffect(() => {
    if (!prompt || installed) {
      setShouldShow(false);
      return;
    }

    // Must have completed a game or visited enough times
    if (!hasCompletedGame) {
      setShouldShow(false);
      return;
    }

    // Check dismiss state
    const state = getDismissState();

    // Permanently dismissed after MAX_DISMISSALS
    if (state.count >= MAX_DISMISSALS) {
      setShouldShow(false);
      return;
    }

    // Temporarily dismissed — check if cooldown has expired
    if (state.lastDismissed) {
      const elapsed = Date.now() - state.lastDismissed;
      if (elapsed < DISMISS_DURATION_MS) {
        setShouldShow(false);
        return;
      }
    }

    setShouldShow(true);
  }, [prompt, installed, hasCompletedGame]);

  const install = useCallback(async () => {
    if (!prompt) return false;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    setShouldShow(false);
    return outcome === 'accepted';
  }, [prompt]);

  const dismiss = useCallback(() => {
    const state = getDismissState();
    setDismissState({
      count: state.count + 1,
      lastDismissed: Date.now(),
    });
    setShouldShow(false);
  }, []);

  return {
    canInstall: !!prompt && !installed,
    installed,
    install,
    shouldShow,
    dismiss,
  };
}

export default useInstallPrompt;
