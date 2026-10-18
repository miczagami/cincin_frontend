/**
 * SettingsPage — Priority 1 Update (Phase 5)
 * Settings with account management, subscription, data privacy, app config.
 *
 * Spec ref: Sections 3.3, 7.4, 7.5, 8.2, 10.3
 *
 * Priority 1 changes from Phase 4:
 * - ✅ Inline change-password form (was stub → forgot-password redirect)
 * - ✅ Cached bottles count from IndexedDB (was "—")
 * - ✅ Clear cache implementation (was no-op)
 * - ✅ Toast notifications for all actions (export, anonymise, delete, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronRight, ChevronDown } from 'lucide-react';
import useSubscriptionStore from '../../context/subscriptionStore';
import useAuthStore from '../../context/authStore';
import { users, auth } from '../../services/api';
import { getCachedBottles, clearBottleCache } from '../../utils/offlineGame';
import useToast from '../../hooks/useToast';
import { ScreenHeader, Button, Card, Toggle, Input } from '../../components/ui';

export default function SettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { status, fetchStatus, openBillingPortal, isPro } = useSubscriptionStore();
  const { user, logout } = useAuthStore();

  // ── Notification preferences ──
  const [notifPrefs, setNotifPrefs] = useState({
    notifGameInvites: true,
    notifCellarClubActivity: true,
    notifSeasonReminders: true,
    notifPalateUpdates: false,
    notifWeeklyDigests: false,
    notifEmail: true,
    notifPush: true,
  });

  // ── Data & Privacy ──
  const [b2bOptIn, setB2bOptIn] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Change Password (Priority 1 — NEW) ──
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwFields, setShowPwFields] = useState(false);

  // ── Cached Bottles (Priority 1 — NEW) ──
  const [cachedBottleCount, setCachedBottleCount] = useState(null);
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Check if user has a password-based account (social login users can't change password)
  const isSocialOnly = user?.authProvider && user.authProvider !== 'EMAIL';

  useEffect(() => {
    fetchStatus();
    loadPrefs();
    loadCachedBottleCount();
  }, [fetchStatus]);

  const loadPrefs = async () => {
    try {
      const data = await users.profile();
      setNotifPrefs({
        notifGameInvites: data.notifGameInvites ?? true,
        notifCellarClubActivity: data.notifCellarClubActivity ?? true,
        notifSeasonReminders: data.notifSeasonReminders ?? true,
        notifPalateUpdates: data.notifPalateUpdates ?? false,
        notifWeeklyDigests: data.notifWeeklyDigests ?? false,
        notifEmail: data.notifEmail ?? true,
        notifPush: data.notifPush ?? true,
      });
      setB2bOptIn(data.b2bDataOptIn ?? false);
    } catch {
      // Use defaults
    }
  };

  // ── Priority 1: Load cached bottle count from IndexedDB ──
  const loadCachedBottleCount = useCallback(async () => {
    try {
      const bottles = await getCachedBottles();
      setCachedBottleCount(bottles.length);
    } catch {
      setCachedBottleCount(0);
    }
  }, []);

  // ── Notification toggle ──
  const handleNotifToggle = async (key) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    try {
      await users.notificationPrefs(updated);
      toast.success('Notification preference updated.');
    } catch {
      setNotifPrefs(notifPrefs); // Revert
      toast.error('Failed to update preference.');
    }
  };

  // ── Data export with toast ──
  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      const blob = format === 'csv'
        ? await users.exportCSV()
        : await users.exportJSON();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cincin-data-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Data exported as ${format.toUpperCase()}.`);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── B2B toggle with toast ──
  const handleB2BToggle = async () => {
    const newVal = !b2bOptIn;
    setB2bOptIn(newVal);
    try {
      await users.updateB2BConsent(newVal);
      toast.success(newVal ? 'Data sharing enabled.' : 'Data sharing disabled.');
    } catch {
      setB2bOptIn(!newVal);
      toast.error('Failed to update data sharing preference.');
    }
  };

  // ── Anonymise with toast ──
  const handleAnonymise = async () => {
    if (!window.confirm('This will permanently remove your identity from game history. This cannot be undone.')) return;
    try {
      await users.anonymiseHistory();
      toast.success('Game history anonymised.');
    } catch (err) {
      console.error('Anonymise failed:', err);
      toast.error('Failed to anonymise history.');
    }
  };

  // ── Delete account ──
  const handleDeleteAccount = async () => {
    try {
      await users.deleteAccount();
      toast.info('Account deleted.');
      logout();
      navigate('/auth');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete account.');
    }
  };

  // ── Priority 1: Change Password ──
  const handleChangePassword = async () => {
    setPwErrors({});
    const errors = {};

    if (!pwForm.currentPassword) errors.currentPassword = 'Current password is required';
    if (!pwForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (pwForm.newPassword.length < 8) {
      errors.newPassword = 'Must be at least 8 characters';
    } else if (!/[a-zA-Z]/.test(pwForm.newPassword) || !/[0-9]/.test(pwForm.newPassword)) {
      errors.newPassword = 'Must contain both letters and numbers';
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setPwErrors(errors);
      return;
    }

    setPwLoading(true);
    try {
      await auth.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowChangePassword(false);
    } catch (err) {
      const message = err?.response?.data?.error || 'Failed to change password.';
      if (message.toLowerCase().includes('current password')) {
        setPwErrors({ currentPassword: message });
      } else {
        setPwErrors({ general: message });
      }
      toast.error(message);
    } finally {
      setPwLoading(false);
    }
  };

  // ── Priority 1: Clear Cache ──
  const handleClearCache = async () => {
    if (cachedBottleCount === 0) {
      toast.info('Cache is already empty.');
      return;
    }
    setIsClearingCache(true);
    try {
      await clearBottleCache();

      // Also clear service worker caches if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => name.startsWith('cincin-') || name.startsWith('workbox-'))
            .map((name) => caches.delete(name))
        );
      }

      setCachedBottleCount(0);
      toast.success('Cache cleared.');
    } catch (err) {
      console.error('Clear cache failed:', err);
      toast.error('Failed to clear cache.');
    } finally {
      setIsClearingCache(false);
    }
  };

  // ═══════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
      <ScreenHeader title="Settings" onBack={() => navigate('/profile')} />

      {isExporting && (
        <div className="bg-cin-cyan/10 border border-cin-cyan/30 rounded-lg p-3 mt-2">
          <p className="text-cin-cyan text-sm">Exporting your data...</p>
        </div>
      )}

      {/* ── Account Section ── */}
      <div className="mt-5">
        <h3 className="text-[11px] font-bold text-cin-muted uppercase tracking-wider mb-2">Account</h3>
        <Card>
          {/* Edit Profile */}
          <SettingsRow label="Edit profile" onAction={() => navigate('/profile')} />

          {/* Change Password — Priority 1: Inline form replaces redirect */}
          <div className="border-b border-cin-border">
            <div
              onClick={() => !isSocialOnly && setShowChangePassword(!showChangePassword)}
              className={`flex items-center justify-between py-3 ${isSocialOnly ? 'opacity-50' : 'cursor-pointer'}`}
            >
              <div>
                <span className="text-sm text-cin-white font-body">Change password</span>
                {isSocialOnly && (
                  <p className="text-[11px] text-cin-muted mt-0.5">Not available for social login accounts</p>
                )}
              </div>
              {!isSocialOnly && (
                showChangePassword
                  ? <ChevronDown className="w-4 h-4 text-cin-muted" />
                  : <ChevronRight className="w-4 h-4 text-cin-muted" />
              )}
            </div>

            {/* Inline Change Password Form */}
            {showChangePassword && !isSocialOnly && (
              <div className="pb-4 space-y-3 animate-fade-in">
                <div className="relative">
                  <Input
                    label="Current password"
                    type={showPwFields ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    error={pwErrors.currentPassword}
                  />
                </div>
                <Input
                  label="New password"
                  type={showPwFields ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  error={pwErrors.newPassword}
                />
                <Input
                  label="Confirm new password"
                  type={showPwFields ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  error={pwErrors.confirmPassword}
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPwFields(!showPwFields)}
                    className="text-cin-muted hover:text-cin-white transition-colors flex items-center gap-1 text-xs"
                  >
                    {showPwFields ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPwFields ? 'Hide' : 'Show'} passwords
                  </button>
                </div>

                {pwErrors.general && (
                  <p className="text-xs text-cin-red">{pwErrors.general}</p>
                )}

                <p className="text-[11px] text-cin-muted leading-relaxed">
                  8+ characters, must include both letters and numbers.
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowChangePassword(false);
                      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setPwErrors({});
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    loading={pwLoading}
                    onClick={handleChangePassword}
                    className="flex-1"
                  >
                    Update
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Notifications Section ── */}
      <div className="mt-5">
        <h3 className="text-[11px] font-bold text-cin-muted uppercase tracking-wider mb-2">Notifications</h3>
        <Card>
          {[
            { label: 'Game invites', key: 'notifGameInvites' },
            { label: 'Club activity', key: 'notifCellarClubActivity' },
            { label: 'Season reminders', key: 'notifSeasonReminders' },
            { label: 'Palate updates', key: 'notifPalateUpdates' },
            { label: 'Weekly digests', key: 'notifWeeklyDigests' },
            { label: 'Email notifications', key: 'notifEmail' },
            { label: 'Push notifications', key: 'notifPush' },
          ].map((item, i, arr) => (
            <div
              key={item.key}
              className={`flex items-center justify-between py-3 ${
                i < arr.length - 1 ? 'border-b border-cin-border' : ''
              }`}
            >
              <span className="text-sm text-cin-white font-body">{item.label}</span>
              <Toggle
                checked={notifPrefs[item.key]}
                onChange={() => handleNotifToggle(item.key)}
              />
            </div>
          ))}
        </Card>
      </div>

      {/* ── Subscription Section ── */}
      <div className="mt-5">
        <h3 className="text-[11px] font-bold text-cin-muted uppercase tracking-wider mb-2">Subscription</h3>
        <Card>
          <SettingsRow
            label="Current plan"
            value={isPro() ? `Pro (${status?.plan || 'monthly'})` : 'Free'}
          />
          {isPro() ? (
            <>
              <SettingsRow label="Manage subscription" onAction={() => openBillingPortal()} />
              {status?.currentPeriodEnd && (
                <SettingsRow
                  label="Renews"
                  value={new Date(status.currentPeriodEnd).toLocaleDateString()}
                  isLast
                />
              )}
            </>
          ) : (
            <SettingsRow label="Upgrade to Pro" onAction={() => navigate('/subscription')} isLast />
          )}
        </Card>
      </div>

      {/* ── Data & Privacy Section ── */}
      <div className="mt-5">
        <h3 className="text-[11px] font-bold text-cin-muted uppercase tracking-wider mb-2">Data & Privacy</h3>
        <Card>
          <SettingsRow label="Export my data (JSON)" onAction={() => handleExport('json')} />
          <SettingsRow label="Export my data (CSV)" onAction={() => handleExport('csv')} />
          <SettingsRow label="Anonymise game history" onAction={handleAnonymise} />
          {isPro() && (
            <div className="flex items-center justify-between py-3 border-b border-cin-border">
              <div>
                <span className="text-sm text-cin-white font-body">B2B data sharing</span>
                <p className="text-[11px] text-cin-muted mt-0.5">Allow anonymised data for industry insights</p>
              </div>
              <Toggle checked={b2bOptIn} onChange={handleB2BToggle} />
            </div>
          )}
          <SettingsRow
            label="Delete account"
            onAction={() => setShowDeleteConfirm(true)}
            danger
            isLast
          />
        </Card>
      </div>

      {/* ── App Section (Priority 1: cached bottles + clear cache) ── */}
      <div className="mt-5">
        <h3 className="text-[11px] font-bold text-cin-muted uppercase tracking-wider mb-2">App</h3>
        <Card>
          <SettingsRow
            label="Cached bottles"
            value={cachedBottleCount !== null ? String(cachedBottleCount) : '—'}
          />
          <SettingsRow
            label="Clear cache"
            onAction={handleClearCache}
            loading={isClearingCache}
          />
          {/* Language selector — still English only, i18n framework ready */}
          <SettingsRow label="Language" value="English" isLast />
        </Card>
      </div>

      {/* ── Log Out ── */}
      <div className="mt-6">
        <Button
          variant="secondary"
          onClick={() => {
            logout();
            toast.info('Logged out.');
            navigate('/auth');
          }}
        >
          Log Out
        </Button>
      </div>

      {/* ── Delete Account Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5">
          <div className="cin-card max-w-sm w-full p-6">
            <h3 className="text-lg font-display font-bold text-cin-white mb-2">Delete Account?</h3>
            <p className="text-sm text-cin-muted font-body mb-6 leading-relaxed">
              This permanently deletes your account and all associated data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
                Cancel
              </Button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-3 rounded-xl bg-cin-red/20 border border-cin-red/40 text-cin-red text-sm font-display font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper: Settings Row ──
function SettingsRow({ label, value, onAction, toggle, danger, isLast, loading, sublabel }) {
  return (
    <div
      onClick={onAction || undefined}
      className={`flex items-center justify-between py-3 ${
        !isLast ? 'border-b border-cin-border' : ''
      } ${onAction ? 'cursor-pointer' : ''}`}
    >
      <div>
        <span className={`text-sm font-body ${danger ? 'text-cin-red' : 'text-cin-white'}`}>
          {label}
        </span>
        {sublabel && <p className="text-[11px] text-cin-muted mt-0.5">{sublabel}</p>}
      </div>
      {value && <span className="text-sm text-cin-muted font-body">{value}</span>}
      {onAction && !value && (
        loading
          ? <span className="text-xs text-cin-muted animate-pulse">...</span>
          : <ChevronRight className="w-4 h-4 text-cin-muted" />
      )}
    </div>
  );
}
