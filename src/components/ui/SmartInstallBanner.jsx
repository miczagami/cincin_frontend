/**
 * SmartInstallBanner — Priority 6 (Phase 5)
 * Spec ref: Phase 5 Timeline — Install prompt UX refinement
 *
 * A non-intrusive install banner that slides up from the bottom.
 * Only shows when useInstallPrompt's `shouldShow` is true
 * (after first game or 3+ visits, respecting dismiss cooldown).
 *
 * Mount in AppShell alongside ToastContainer and GlobalOfflineBanner.
 *
 * Usage:
 *   import SmartInstallBanner from '../components/ui/SmartInstallBanner';
 *   <SmartInstallBanner />
 */

import { useInstallPrompt } from '../../hooks/useInstallPrompt';

export default function SmartInstallBanner() {
  const { shouldShow, install, dismiss } = useInstallPrompt();

  if (!shouldShow) return null;

  return (
    <div
      className="fixed bottom-20 left-0 right-0 z-40 px-4 animate-slide-up"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="complementary"
      aria-label="Install app banner"
    >
      <div
        className="max-w-[430px] mx-auto rounded-xl p-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, #1A1A1A 0%, rgba(34,211,238,0.08) 100%)',
          border: '1px solid rgba(34,211,238,0.2)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* App icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0A0A0A, #1A1A1A)',
            border: '1px solid rgba(34,211,238,0.3)',
          }}
        >
          <span className="text-cin-cyan text-lg font-display font-bold">C</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-display font-bold leading-tight">
            Add CinCin to Home Screen
          </p>
          <p className="text-cin-muted text-xs mt-0.5">
            Faster access, works offline
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={dismiss}
            className="text-cin-muted text-xs hover:text-white transition-colors px-2 py-1"
            aria-label="Dismiss install banner"
          >
            Later
          </button>
          <button
            onClick={install}
            className="bg-cin-cyan text-cin-black text-xs font-bold px-4 py-2 rounded-lg hover:brightness-110 transition-all"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
