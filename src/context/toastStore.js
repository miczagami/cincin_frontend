/**
 * Toast Store — Priority 1 (Phase 5)
 * Zustand store for global toast notifications.
 *
 * Provides app-wide success/error/info feedback toasts.
 * Toasts auto-dismiss after a configurable duration.
 *
 * Usage:
 *   import useToastStore from '../context/toastStore';
 *   const { addToast } = useToastStore();
 *   addToast({ type: 'success', message: 'Data exported!' });
 *   addToast({ type: 'error', message: 'Export failed.' });
 *   addToast({ type: 'info', message: 'Link copied to clipboard.' });
 */

import { create } from 'zustand';

let toastId = 0;

const useToastStore = create((set, get) => ({
  toasts: [],

  /**
   * Add a toast notification.
   * @param {Object} toast
   * @param {'success'|'error'|'info'|'warning'} toast.type
   * @param {string} toast.message
   * @param {number} [toast.duration=3500] - auto-dismiss ms (0 = persistent)
   */
  addToast: ({ type = 'info', message, duration = 3500 }) => {
    const id = ++toastId;
    const toast = { id, type, message, duration, visible: true };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    if (duration > 0) {
      // Start exit animation slightly before removal
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.map((t) =>
            t.id === id ? { ...t, visible: false } : t
          ),
        }));
      }, duration);

      // Remove from DOM after exit animation completes
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration + 400);
    }
  },

  /**
   * Dismiss a specific toast immediately.
   */
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, visible: false } : t
      ),
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 400);
  },

  /**
   * Clear all toasts.
   */
  clearAll: () => set({ toasts: [] }),
}));

export default useToastStore;
