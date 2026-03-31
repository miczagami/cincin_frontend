/**
 * Notification Store — Priority 3 (Updated)
 * Zustand store for notification centre state.
 *
 * Changes from Phase 4:
 *   - registerPushToken now calls the real push service (no longer a stub)
 *   - Added handleForegroundPush() for incoming foreground messages
 *   - removePushToken wires through to the push service revoke
 *
 * Spec ref: Sections 10.1–10.3
 */

import { create } from "zustand";
import { notifications } from "../services/api";

const useNotificationStore = create((set, get) => ({
  // ─── State ───
  items: [],
  unreadCount: 0,
  hasMore: true,
  page: 1,
  isLoading: false,
  error: null,

  // ─── Actions ───

  /**
   * Fetch notifications (paginated).
   * @param {boolean} refresh - if true, resets to page 1
   */
  fetchNotifications: async (refresh = false) => {
    const page = refresh ? 1 : get().page;
    set({ isLoading: true, error: null });
    try {
      const data = await notifications.list({ page, limit: 20 });
      const newItems = refresh
        ? data.notifications
        : [...get().items, ...data.notifications];
      set({
        items: newItems,
        unreadCount:
          data.unreadCount ?? newItems.filter((n) => !n.readAt).length,
        hasMore: data.notifications.length === 20,
        page: page + 1,
        isLoading: false,
      });
      return data;
    } catch (err) {
      set({
        error: err.response?.data?.error || "Failed to load notifications",
        isLoading: false,
      });
      return null;
    }
  },

  /**
   * Mark a single notification as read.
   */
  markRead: async (notificationId) => {
    try {
      await notifications.markRead(notificationId);
      set((state) => ({
        items: state.items.map((n) =>
          n.id === notificationId
            ? { ...n, readAt: new Date().toISOString() }
            : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // Silently fail — notification still shows as unread
    }
  },

  /**
   * Mark all notifications as read.
   */
  markAllRead: async () => {
    try {
      await notifications.markAllRead();
      set((state) => ({
        items: state.items.map((n) => ({
          ...n,
          readAt: n.readAt || new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
    } catch {
      // Silently fail
    }
  },

  /**
   * Register a push token with the backend.
   * Called by the push service after obtaining an FCM token.
   *
   * @param {string} token - FCM push token
   * @param {'web'|'ios'|'android'} platform
   */
  registerPushToken: async (token, platform = "web") => {
    try {
      await notifications.registerPushToken({ token, platform });
    } catch (err) {
      console.warn(
        "[Notifications] Failed to register push token:",
        err.message
      );
    }
  },

  /**
   * Remove push token (e.g. on logout or push permission revoke).
   */
  removePushToken: async (token) => {
    try {
      await notifications.removePushToken({ token });
    } catch {
      // Silently fail
    }
  },

  /**
   * Handle a foreground push message — prepend to the items list
   * and increment unread count without a full refetch.
   *
   * @param {object} payload - { title, body, type, data }
   */
  handleForegroundPush: (payload) => {
    const fakeNotification = {
      id: `push-${Date.now()}`,
      type: payload.type || payload.data?.type || "general",
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    set((state) => ({
      items: [fakeNotification, ...state.items],
      unreadCount: state.unreadCount + 1,
    }));
  },

  /**
   * Quick fetch of unread count only (for badge in nav).
   */
  refreshUnreadCount: async () => {
    try {
      const data = await notifications.list({ page: 1, limit: 1 });
      set({ unreadCount: data.unreadCount ?? 0 });
    } catch {
      // Silently fail
    }
  },
}));

export default useNotificationStore;
