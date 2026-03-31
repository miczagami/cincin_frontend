/**
 * ToastContainer — Priority 1 (Phase 5)
 * Renders global toast notifications.
 *
 * Mount once in AppShell or at the root layout level:
 *   import ToastContainer from '../components/ui/ToastContainer';
 *   <ToastContainer />
 *
 * Toasts slide in from the top, auto-dismiss, and support manual dismiss.
 * Styled to match the CinCin dark design system.
 */

import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import useToastStore from '../../context/toastStore';

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const COLORS = {
  success: {
    bg: 'bg-cin-green/15',
    border: 'border-cin-green/30',
    icon: 'text-cin-green',
    text: 'text-cin-green',
  },
  error: {
    bg: 'bg-cin-red/15',
    border: 'border-cin-red/30',
    icon: 'text-cin-red',
    text: 'text-cin-red',
  },
  info: {
    bg: 'bg-cin-cyan/15',
    border: 'border-cin-cyan/30',
    icon: 'text-cin-cyan',
    text: 'text-cin-cyan',
  },
  warning: {
    bg: 'bg-cin-orange/15',
    border: 'border-cin-orange/30',
    icon: 'text-cin-orange',
    text: 'text-cin-orange',
  },
};

function Toast({ toast, onDismiss }) {
  const { type, message, visible, id } = toast;
  const Icon = ICONS[type] || ICONS.info;
  const colors = COLORS[type] || COLORS.info;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm
        ${colors.bg} ${colors.border}
        transition-all duration-300 ease-out
        ${visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-2 pointer-events-none'
        }
      `}
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${colors.icon}`} />
      <p className={`text-sm font-body flex-1 leading-relaxed ${colors.text}`}>
        {message}
      </p>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 mt-0.5 text-cin-muted hover:text-cin-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
      style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}
    >
      <div className="max-w-[430px] mx-auto px-4 pt-3 space-y-2 pointer-events-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}
