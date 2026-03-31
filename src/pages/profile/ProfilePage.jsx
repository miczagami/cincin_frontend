/**
 * ProfilePage — Priority 4 (Updated)
 * Spec ref: Section 3.3
 *
 * Changes from Phase 4:
 * - handleSave: toast on success ('Profile updated!') and on error
 * - Removed silent console.error-only failure on save
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../context/authStore';
import useSubscriptionStore from '../../context/subscriptionStore';
import useToast from '../../hooks/useToast';
import { users } from '../../services/api';
import { ScreenHeader, Button, Card, Pill, Input, Spinner } from '../../components/ui';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuthStore();
  const { status, fetchStatus, isPro } = useSubscriptionStore();
  const toast = useToast();

  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
    fetchStatus();
  }, [fetchStatus]);

  const loadProfile = async () => {
    try {
      const data = await users.profile();
      setProfileData(data);
      setEditForm({
        displayName: data.displayName || '',
        bio: data.bio || '',
        location: data.location || '',
      });
    } catch (err) {
      toast.error('Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editForm.displayName?.trim()) {
      toast.error('Display name is required.');
      return;
    }
    setIsSaving(true);
    try {
      await users.updateProfile(editForm);
      await loadProfile();
      refreshUser?.();
      setIsEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    const p = profileData || user || {};
    setEditForm({
      displayName: p.displayName || '',
      bio: p.bio || '',
      location: p.location || '',
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-24 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const p = profileData || user || {};
  const stats = p.stats || {};
  const initial = (p.displayName || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-dvh bg-cin-black pb-24">
      <div className="px-5 pt-5">
        <ScreenHeader title="Profile" />
      </div>

      {/* Avatar + Name */}
      <div className="px-5 text-center">
        <div className="w-20 h-20 rounded-full bg-cin-cyan mx-auto mb-3 flex items-center justify-center text-3xl font-black text-cin-black">
          {p.avatarUrl ? (
            <img src={p.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : initial}
        </div>

        {isEditing ? (
          <div className="space-y-3 text-left mt-2">
            <Input
              label="Display Name"
              value={editForm.displayName}
              onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
              placeholder="Your name"
            />
            <Input
              label="Bio"
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              placeholder="Tell people about your palate"
            />
            <Input
              label="Location"
              value={editForm.location}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              placeholder="e.g. Sydney, Australia"
            />
            <div className="flex gap-2 mt-3">
              <Button variant="secondary" className="flex-1" onClick={handleCancelEdit}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} loading={isSaving}>Save</Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-display font-extrabold text-cin-white">{p.displayName}</h2>
            {p.bio && <p className="text-sm text-cin-muted mt-1">{p.bio}</p>}
            {p.location && <p className="text-xs text-cin-muted mt-0.5">📍 {p.location}</p>}
            <div className="flex items-center justify-center gap-2 mt-2">
              {isPro?.() && <Pill color="cyan">PRO</Pill>}
              {p.emailVerified && <Pill color="green">Verified</Pill>}
            </div>
            <button onClick={() => setIsEditing(true)} className="mt-3 text-xs text-cin-cyan font-semibold">
              Edit Profile
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      {!isEditing && (
        <div className="px-5 mt-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Games', value: stats.gamesPlayed ?? 0 },
              { label: 'Bottles', value: stats.bottlesScanned ?? 0 },
              { label: 'Clubs', value: stats.clubsJoined ?? 0 },
            ].map((stat) => (
              <Card key={stat.label} className="text-center py-3">
                <p className="text-xl font-display font-extrabold text-cin-white">{stat.value}</p>
                <p className="text-[11px] text-cin-muted mt-0.5">{stat.label}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Navigation links */}
      {!isEditing && (
        <div className="px-5 mt-5 space-y-2">
          <Card
            className="flex items-center gap-3 cursor-pointer hover:border-cin-cyan/30 transition-colors"
            onClick={() => navigate(isPro?.() ? '/palate/profile' : '/palate')}
          >
            <span className="text-xl">🧬</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-cin-white">Palate Profile</p>
              <p className="text-xs text-cin-muted">Your tasting DNA & analytics</p>
            </div>
            <span className="text-cin-muted text-xs">›</span>
          </Card>

          <Card
            className="flex items-center gap-3 cursor-pointer hover:border-cin-cyan/30 transition-colors"
            onClick={() => navigate('/subscription')}
          >
            <span className="text-xl">👑</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-cin-white">Subscription</p>
              <p className="text-xs text-cin-muted">
                {isPro?.() ? `Pro · ${status?.plan || 'monthly'}` : 'Free — upgrade to Pro'}
              </p>
            </div>
            <span className="text-cin-muted text-xs">›</span>
          </Card>

          <Card
            className="flex items-center gap-3 cursor-pointer hover:border-cin-cyan/30 transition-colors"
            onClick={() => navigate('/settings')}
          >
            <span className="text-xl">⚙️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-cin-white">Settings</p>
              <p className="text-xs text-cin-muted">Account, notifications, data</p>
            </div>
            <span className="text-cin-muted text-xs">›</span>
          </Card>
        </div>
      )}
    </div>
  );
}
