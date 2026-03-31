/**
 * usePushNotifications Hook — Priority 3
 * Spec ref: Sections 10.1–10.3
 *
 * Integrates the push notification service with the app lifecycle.
 *
 * Responsibilities:
 *   - Auto-initialise push on mount (if already granted)
 *   - Provide requestPermission/revoke methods to components
 *   - Route foreground messages to the toast system
 *   - Refresh notification badge on foreground message
 *   - Clean up on unmount / logout
 *
 * Usage:
 *   // In AppShell or a top-level layout component:
 *   const { isSupported, permissionState, requestPermission } = usePushNotifications();
 *
 *   // In settings toggle:
 *   <Toggle checked={permissionState === 'granted'} onChange={requestPermission} />
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  initPushNotifications,
  requestPushPermission,
  revokePushNotifications,
  onForegroundNotification,
  isPushSupported,
  getPermissionState,
} from "../services/pushService";
import useNotificationStore from "../context/notificationStore";
import useToastStore from "../context/toastStore";

export default function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permissionState, setPermissionState] = useState("default");
  const [isInitialising, setIsInitialising] = useState(false);
  const initialisedRef = useRef(false);

  const refreshUnreadCount = useNotificationStore(
    (s) => s.refreshUnreadCount
  );
  const addToast = useToastStore?.((s) => s.addToast);

  // ─── Check support & permission state on mount ───
  useEffect(() => {
    let cancelled = false;

    async function check() {
      const isAvailable = await isPushSupported();
      if (!cancelled) {
        setSupported(isAvailable);
        setPermissionState(getPermissionState());
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Auto-initialise if permission already granted ───
  useEffect(() => {
    if (!supported || initialisedRef.current) return;
    if (permissionState !== "granted") return;

    initialisedRef.current = true;

    initPushNotifications().then(() => {
      // Register foreground message handler
      onForegroundNotification(handleForegroundMessage);
    });
  }, [supported, permissionState]);

  // ─── Handle foreground push messages ───
  const handleForegroundMessage = useCallback(
    (payload) => {
      // Show a toast for the incoming notification
      if (addToast) {
        addToast({
          type: "info",
          title: payload.title,
          message: payload.body,
          duration: 5000,
        });
      }

      // Refresh the notification badge count
      refreshUnreadCount();
    },
    [addToast, refreshUnreadCount]
  );

  // ─── Request permission (for UI buttons) ───
  const requestPermission = useCallback(async () => {
    if (!supported) return false;

    setIsInitialising(true);

    try {
      const granted = await requestPushPermission();

      setPermissionState(getPermissionState());

      if (granted) {
        // Register foreground handler after permission granted
        onForegroundNotification(handleForegroundMessage);

        if (addToast) {
          addToast({
            type: "success",
            title: "Notifications enabled",
            message: "You'll receive push notifications for game invites and updates.",
          });
        }
      }

      return granted;
    } catch (err) {
      console.error("[usePushNotifications] Request failed:", err);
      return false;
    } finally {
      setIsInitialising(false);
    }
  }, [supported, handleForegroundMessage, addToast]);

  // ─── Revoke permission (for UI toggles / logout) ───
  const revoke = useCallback(async () => {
    try {
      await revokePushNotifications();
      // Note: We can't programmatically revoke browser permission,
      // but we can remove the token from the backend so no more
      // notifications are sent. The user must manually revoke
      // browser permission via browser settings.
      if (addToast) {
        addToast({
          type: "info",
          title: "Notifications paused",
          message: "You won't receive push notifications.",
        });
      }
      return true;
    } catch {
      return false;
    }
  }, [addToast]);

  return {
    /** Whether push notifications are supported in this browser */
    isSupported: supported,
    /** Current permission state: 'granted' | 'denied' | 'default' | 'unsupported' */
    permissionState,
    /** Whether we're currently requesting permission */
    isInitialising,
    /** Request push notification permission */
    requestPermission,
    /** Revoke push notifications (remove token from backend) */
    revoke,
  };
}
