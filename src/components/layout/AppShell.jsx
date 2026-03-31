/**
 * AppShell — Priority 4 (Updated)
 * Root authenticated layout wrapper.
 *
 * Changes from Phase 4:
 * - Mounts <ToastContainer /> — required for global toast notifications (Priority 1 system)
 * - Initialises usePushNotifications — auto-registers push token if permission already granted (Priority 3)
 *
 * All pages rendered inside AppShell now have access to toasts automatically.
 */

import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import ToastContainer from '../ui/ToastContainer';
import usePushNotifications from '../../hooks/usePushNotifications';

export default function AppShell() {
  // Initialise push notifications (Priority 3) — silently registers token if already granted
  usePushNotifications();

  return (
    <div className="min-h-dvh bg-cin-black">
      <main className="pb-24">
        <Outlet />
      </main>
      <BottomNav />
      {/* Global toast container — renders above all other content */}
      <ToastContainer />
    </div>
  );
}
