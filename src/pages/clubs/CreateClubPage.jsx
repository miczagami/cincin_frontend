/**
 * CreateClubPage — Phase 3 (Weeks 11–13)
 * Spec ref: Section 5.2 (Club Creation)
 * Requires email verification (Section 7.2)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useClubStore from '../../context/clubStore';
import useAuthStore from '../../context/authStore';
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

export default function CreateClubPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { createClub, isLoading, error } = useClubStore();
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
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      memberCap: memberCap ? parseInt(memberCap) : null,
      seasonType,
      ...(seasonType === 'FIXED_DATE' && endDate ? { seasonEndDate: endDate } : {}),
      ...(seasonType === 'FIXED_LENGTH' ? { seasonLengthDays: lengthDays } : {}),
    };
    const result = await createClub(data);
    if (result.success) navigate(`/clubs/${result.data.id}`);
  };

  return (
    <div className="min-h-dvh bg-cin-black px-5 pt-5 pb-8">
      <ScreenHeader title="Create Club" onBack={() => navigate('/clubs')} />
      <Card className="mb-4">
        <label className="text-cin-muted text-xs uppercase tracking-wider mb-2 block">Club Name</label>
        <Input placeholder="e.g. Friday Night Tasters" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
      </Card>
      <Card className="mb-4">
        <label className="text-cin-muted text-xs uppercase tracking-wider mb-2 block">Member Cap <span className="normal-case">(optional)</span></label>
        <Input type="number" placeholder="No limit" value={memberCap} onChange={(e) => setMemberCap(e.target.value)} min={2} />
        <p className="text-cin-muted text-xs mt-1">Leave blank for unlimited members.</p>
      </Card>
      <Card className="mb-4">
        <label className="text-cin-muted text-xs uppercase tracking-wider mb-3 block">Season Type</label>
        <div className="space-y-2">
          {SEASON_TYPES.map((type) => (
            <button key={type.value} className={`w-full text-left p-3 rounded-lg border transition-colors ${seasonType === type.value ? 'border-cin-cyan bg-cin-cyan/10' : 'border-cin-border'}`} onClick={() => setSeasonType(type.value)}>
              <p className={`text-sm font-medium ${seasonType === type.value ? 'text-cin-cyan' : 'text-cin-white'}`}>{type.label}</p>
              <p className="text-cin-muted text-xs">{type.desc}</p>
            </button>
          ))}
        </div>
      </Card>
      {seasonType === 'FIXED_DATE' && (
        <Card className="mb-4">
          <label className="text-cin-muted text-xs uppercase tracking-wider mb-2 block">Season End Date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} />
        </Card>
      )}
      {seasonType === 'FIXED_LENGTH' && (
        <Card className="mb-4">
          <label className="text-cin-muted text-xs uppercase tracking-wider mb-3 block">Season Length</label>
          <div className="grid grid-cols-2 gap-2">
            {LENGTH_PRESETS.map((p) => (
              <button key={p.value} className={`p-3 rounded-lg border text-sm font-medium ${lengthDays === p.value ? 'border-cin-cyan bg-cin-cyan/10 text-cin-cyan' : 'border-cin-border text-cin-muted'}`} onClick={() => setLengthDays(p.value)}>{p.label}</button>
            ))}
          </div>
        </Card>
      )}
      {error && <p className="text-cin-red text-sm mb-4">{error}</p>}
      <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={name.trim().length < 2 || isLoading}>
        {isLoading ? 'Creating...' : 'Create Club'}
      </Button>
    </div>
  );
}
