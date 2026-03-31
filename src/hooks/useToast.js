/**
 * useToast — Priority 1 (Phase 5)
 * Convenience hook wrapping toastStore for common patterns.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Profile updated!');
 *   toast.error('Failed to save changes.');
 *   toast.info('Link copied to clipboard.');
 *   toast.warning('You are offline.');
 */

import useToastStore from '../context/toastStore';

export default function useToast() {
  const addToast = useToastStore((s) => s.addToast);

  return {
    success: (message, duration) => addToast({ type: 'success', message, duration }),
    error: (message, duration) => addToast({ type: 'error', message, duration }),
    info: (message, duration) => addToast({ type: 'info', message, duration }),
    warning: (message, duration) => addToast({ type: 'warning', message, duration }),
  };
}
