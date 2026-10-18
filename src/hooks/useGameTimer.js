/**
 * useGameTimer — Countdown timer for gameplay rounds
 * Spec ref: Section 4.4 (Round Timer)
 *
 * - Counts down from durationSecs while enabled
 * - Flags a warning at 10 seconds remaining
 * - Calls onExpire once when the timer hits 0 (auto-skip)
 *
 * @param {number} durationSecs - Round length in seconds
 * @param {boolean} enabled - Whether the countdown is running
 * @param {function} onExpire - Called once when time runs out
 * @returns {{ timeLeft, isWarning, isExpired, reset }}
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const WARNING_SECS = 10;

export default function useGameTimer(durationSecs, enabled = true, onExpire) {
  const [timeLeft, setTimeLeft] = useState(durationSecs);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const reset = useCallback(() => {
    expiredRef.current = false;
    setTimeLeft(durationSecs);
  }, [durationSecs]);

  // Pick up a new round length (e.g. from the server's round-start event)
  useEffect(() => { reset(); }, [reset]);

  useEffect(() => {
    if (!enabled) return undefined;
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [enabled]);

  useEffect(() => {
    if (enabled && timeLeft <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpireRef.current?.();
    }
  }, [enabled, timeLeft]);

  return {
    timeLeft,
    isWarning: timeLeft <= WARNING_SECS,
    isExpired: timeLeft <= 0,
    reset,
  };
}
