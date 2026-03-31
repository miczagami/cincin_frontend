/**
 * Placeholder Pages — Priority 1 Update
 *
 * Removed (now implemented):
 * - ForgotPasswordPage (now auth/ForgotPasswordPage)
 *
 * All Phase 4 removals still apply (BuyPage, PalatePage, ProfilePage,
 * SettingsPage, NotificationsPage).
 *
 * This file is now EMPTY — no remaining placeholders.
 * Kept as a module for any future Phase 5+ stubs.
 */

import { useNavigate } from 'react-router-dom';
import { ScreenHeader, Button, EmptyState } from '../components/ui';

function ComingSoon({ title, icon, description, backPath }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-24">
      <ScreenHeader title={title} />
      <EmptyState icon={icon} title="Coming Soon" subtitle={description}
        action={backPath && <Button variant="secondary" onClick={() => navigate(backPath)}>Go Back</Button>} />
    </div>
  );
}

// No remaining placeholders — all pages are now implemented.
// This module is kept for potential future stubs.
