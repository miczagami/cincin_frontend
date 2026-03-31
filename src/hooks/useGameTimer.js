/**
 * useGameTimer — Countdown timer for gameplay rounds
 * Spec ref: Section 4.4 (Round Timer)
 *
 * - Counts down from roundTimerSecs
 * - Triggers warning at 10 seconds remaining
 * - Calls onExpire callback when timer hits 0 (auto-skip)
 */

import { useEffect, useRef, useCallback } from 'react';
import useGameStore from '../context/gameStore';

export default function useGameTimer({ onExpire, enabled = true }) {
  const timerRemaining = useGameStore((s) => s.timerRemaining);
  const timerWarning = useGameStore((s) => s.timerWarning);
  const tickTimer = useGameStore((s) => s.tickTimer);
  const intervalRef = useRef(null);
  const expiredRef = useRef(false);

  const start = useCallback(() => {
    expiredRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      tickTimer();
    }, 1000);
  }, [tickTimer]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start/stop based on enabled prop
  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }
    return stop;
  }, [enabled, start, stop]);

  // Handle expiry
  useEffect(() => {
    if (timerRemaining <= 0 && !expiredRef.current && enabled) {
      expiredRef.current = true;
      stop();
      onExpire?.();
    }
  }, [timerRemaining, onExpire, stop, enabled]);

  return {
    remaining: timerRemaining,
    isWarning: timerWarning,
    isExpired: timerRemaining <= 0,
    start,
    stop,
    formatted: formatTime(timerRemaining),
    progress: timerRemaining / (useGameStore.getState().config.roundTimerSecs || 60),
  };
}

function formatTime(seconds) {
  if (seconds == null || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
