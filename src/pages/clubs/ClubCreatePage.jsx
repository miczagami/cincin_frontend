/**
 * ClubCreatePage — Priority 4 (Updated)
 * Spec ref: Section 5.2 (Club Creation)
 *
 * Changes from Phase 3:
 * - handleSubmit: toast on success ('Club created!')
 * - handleSubmit: toast on error (validation or server)
 * - Inline error display kept as secondary indicator
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useClubStore from '../../context/clubStore';
import useAuthStore from '../../context/authStore';
import useToast from '../../hooks/useToast';
import { ScreenHeader, Button, Card, Input } from '../../components/ui';

const SEASON_TYPES = [
  { value: 'FIXED_DATE', label: 'Fixed End Date', desc: 'Season ends on a specific date' },
  { value: 'FIXED_LENGTH', label: 'Fixed Length', desc: 'Season runs for a set number of days' },
  { value: 'ROLLING', label: 'Rolling', desc: 'Ongoing with admin-triggered resets' },
];
const LENGTH_PRESETS = [
  { value: 30, label: '1 Month' }, { value: 60, label: '2 Months' },
  { value: 90, label: '3 Months' }, { value: 180, label: '6 Months' },
];

export default function ClubCreatePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { createClub, isLoading, error } = useClubStore();
  const toast = useToast();

  const [name, setName] = useState('');
  const [memberCap, setMemberCap] = useState('');
  const [seasonType, setSeasonType] = useState('FIXED_LENGTH');
  const [endDate, setEndDate] = useState('');
  const [lengthDays, setLengthDays] = useState(90);

  if (!user?.emailVerified) {
    return (
      <div className="min-h-dvh bg-cin-black px-5 pt-5">
        <ScreenHeader title="Create Club" onBack={() => navigate('/clubs')} />
        <Card className="mt-8">
          <p className="text-cin-white text-center mb-4">Verify your email to create a Cellar Club.</p>
          <p className="text-cin-muted text-sm text-center mb-4">Check your inbox for a verification link.</p>
          <Button variant="secondary" onClick={() => navigate('/settings')}>Go to Settings</Button>
        </Card>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Club name is required.');
      return;
    }
    const data = {
      name: name.trim(),
      memberCap: memberCap ? parseInt(memberCap) : null,
      seasonType,
      ...(seasonType === 'FIXED_DATE' && endDate ? { seasonEndDate: endDate } : {}),
      ...(seasonType === 'FIXED_LENGTH' ? { seasonLengthDays: lengthDays } : {}),
    };
    const result = await createClub(data);
    if (result.success) {
      toast.success(`${name.trim()} created!`);
      navigate(`/clubs/${result.data.id}`);
    } else {
      toast.error(result.error || 'Failed to create club. Please try again.');
    }
  };

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
      <ScreenHeader title="Create Club" onBack={() => navigate('/clubs')} />

      {/* Club Name */}
      <Card className="mb-4">
        <label className="text-cin-muted text-xs uppercase tracking-wider mb-2 block">Club Name</label>
        <Input
          placeholder="e.g. Friday Night Vino"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Card>

      {/* Member Cap */}
      <Card className="mb-4">
        <label className="text-cin-muted text-xs uppercase tracking-wider mb-2 block">Member Cap (optional)</label>
        <Input
          type="number"
          placeholder="No limit"
          value={memberCap}
          onChange={(e) => setMemberCap(e.target.value)}
          min="2"
          max="100"
        />
        <p className="text-[11px] text-cin-muted mt-1">Leave blank for unlimited members.</p>
      </Card>

      {/* Season Type */}
      <Card className="mb-4">
        <label className="text-cin-muted text-xs uppercase tracking-wider mb-3 block">Season Type</label>
        <div className="space-y-2">
          {SEASON_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setSeasonType(type.value)}
              className={`w-full text-left p-3 rounded-lg border transition-all
                ${seasonType === type.value
                  ? 'bg-cin-cyan/15 border-cin-cyan'
                  : 'bg-cin-dark border-cin-border'}`}
            >
              <span className={`text-sm font-semibold ${seasonType === type.value ? 'text-cin-cyan' : 'text-cin-white'}`}>
                {type.label}
              </span>
              <p className="text-[11px] text-cin-muted mt-0.5">{type.desc}</p>
            </button>
          ))}
        </div>

        {/* Fixed date config */}
        {seasonType === 'FIXED_DATE' && (
          <div className="mt-3">
            <label className="text-cin-muted text-xs mb-1 block">Season End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}

        {/* Fixed length config */}
        {seasonType === 'FIXED_LENGTH' && (
          <div className="mt-3">
            <label className="text-cin-muted text-xs mb-2 block">Season Length</label>
            <div className="flex gap-2 flex-wrap">
              {LENGTH_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setLengthDays(preset.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${lengthDays === preset.value
                      ? 'bg-cin-cyan/15 border border-cin-cyan text-cin-cyan'
                      : 'bg-cin-dark border border-cin-border text-cin-muted'}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {seasonType === 'ROLLING' && (
          <p className="text-[11px] text-cin-muted mt-3">
            Rolling seasons continue indefinitely. You can end the season and start a new one at any time.
          </p>
        )}
      </Card>

      {error && <p className="text-xs text-cin-red text-center mb-4">{error}</p>}

      <Button onClick={handleSubmit} loading={isLoading}>
        Create Club
      </Button>
    </div>
  );
}
