/**
 * Club Store (Zustand) — Phase 3
 * Timeline ref: Weeks 11–13 (Cellar Club Core)
 * Spec ref: Sections 5.1–5.7
 *
 * State management for:
 * - User's clubs list
 * - Active club detail + season + leaderboard
 * - Game approval queue
 * - Activity feed
 * - Club creation/join flow
 */

import { create } from 'zustand';
import clubApi from '../services/clubApi';

// ─── Backend → UI normalisers ───
const AWARD_META = {
  champion: { emoji: '🏆', label: 'Champion' },
  sharpestPalate: { emoji: '🎯', label: 'Sharpest Palate' },
  ironStomach: { emoji: '💪', label: 'Iron Stomach' },
  mostImproved: { emoji: '📈', label: 'Most Improved' },
  precisionKing: { emoji: '👑', label: 'Precision King' },
};

// Backend awards are keyed objects ({ champion: { displayName, value } }); the UI renders a list
function toAwardList(awards) {
  if (!awards || Array.isArray(awards)) return awards || [];
  return Object.entries(awards).map(([key, a]) => ({
    key,
    emoji: AWARD_META[key]?.emoji || '🏅',
    label: AWARD_META[key]?.label || key,
    winnerName: a.displayName,
    value: a.value,
    detail: a.label,
  }));
}

function toClub(club) {
  return {
    ...club,
    currentSeason: club.activeSeason ?? club.currentSeason ?? null,
    memberCount: club.memberCount ?? club.members?.length ?? 0,
  };
}

function toPendingGame(g) {
  return {
    ...g,
    playerCount: (g.players?.length || 0) + (g.guestPlayers?.length || 0),
    submittedBy: g.host?.displayName,
    submitterScore: g.players?.find((p) => p.userId === g.hostId)?.totalScore,
    completedAt: g.endedAt,
  };
}

const errorMessage = (err, fallback) => err?.response?.data?.error || fallback;

const useClubStore = create((set, get) => ({
  // ═══════════════════════════════════════════
  //  STATE
  // ═══════════════════════════════════════════

  /** List of user's clubs */
  clubs: [],

  /** Currently viewed club detail */
  activeClub: null,

  /** Current season leaderboard for active club */
  leaderboard: [],

  /** Pending games awaiting admin approval */
  pendingGames: [],

  /** Club activity feed items */
  activityFeed: [],

  /** Season end results (awards, final standings) */
  seasonResults: null,

  /** Season history for active club */
  seasonHistory: [],

  /** Members of active club */
  members: [],

  /** Loading states */
  isLoading: false,
  isCreating: false,
  isJoining: false,

  /** Error message */
  error: null,

  // ═══════════════════════════════════════════
  //  CLUB LIST
  // ═══════════════════════════════════════════

  /** Fetch all clubs the user belongs to */
  fetchMyClubs: async () => {
    set({ isLoading: true, error: null });
    try {
      const clubs = await clubApi.listMyClubs();
      set({ clubs: clubs.map(toClub), isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load clubs', isLoading: false });
    }
  },

  // ═══════════════════════════════════════════
  //  CLUB DETAIL
  // ═══════════════════════════════════════════

  /** Fetch full club detail with current season */
  fetchClub: async (clubId) => {
    set({ isLoading: true, error: null });
    try {
      const club = toClub(await clubApi.getClub(clubId));
      set({
        activeClub: club,
        leaderboard: club.leaderboard || [],
        members: club.members || [],
        isLoading: false,
      });
      return club;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load club', isLoading: false });
      return null;
    }
  },

  /** Alias used by club pages */
  loadClub: (clubId) => get().fetchClub(clubId),

  /** Clear active club (when navigating away) */
  clearActiveClub: () => {
    set({
      activeClub: null,
      leaderboard: [],
      pendingGames: [],
      activityFeed: [],
      seasonResults: null,
      seasonHistory: [],
      members: [],
    });
  },

  // ═══════════════════════════════════════════
  //  CREATE & JOIN
  // ═══════════════════════════════════════════

  /** Create a new Cellar Club (Section 5.2) */
  createClub: async (data) => {
    set({ isCreating: true, error: null });
    try {
      const newClub = toClub(await clubApi.createClub(data));
      set((state) => ({
        clubs: [...state.clubs, newClub],
        activeClub: newClub,
        isCreating: false,
      }));
      return { success: true, data: newClub };
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create club';
      set({ error: msg, isCreating: false });
      return { success: false, error: msg };
    }
  },

  /** Join a club via invite code (Section 5.3) */
  joinClub: async (inviteCode) => {
    set({ isJoining: true, error: null });
    try {
      const res = await clubApi.joinClub(inviteCode);
      const club = { id: res.clubId, name: res.clubName };
      set({ isJoining: false });
      get().fetchMyClubs();
      return { success: true, data: club };
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to join club';
      set({ error: msg, isJoining: false });
      return { success: false, error: msg };
    }
  },

  // ═══════════════════════════════════════════
  //  MEMBERSHIP
  // ═══════════════════════════════════════════

  /** Leave a club voluntarily (Section 5.3) */
  leaveClub: async (clubId) => {
    try {
      await clubApi.leaveClub(clubId);
      set((state) => ({
        clubs: state.clubs.filter((c) => c.id !== clubId),
        activeClub: state.activeClub?.id === clubId ? null : state.activeClub,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to leave club' };
    }
  },

  /** Admin removes a member */
  removeMember: async (clubId, userId) => {
    try {
      await clubApi.removeMember(clubId, userId);
      set((state) => ({
        members: state.members.filter((m) => m.userId !== userId),
        leaderboard: state.leaderboard.filter((p) => p.userId !== userId),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to remove member' };
    }
  },

  /** Fetch club members (part of the club detail response) */
  fetchMembers: async (clubId) => {
    const club = await get().fetchClub(clubId);
    return club?.members || [];
  },

  // ═══════════════════════════════════════════
  //  GAME APPROVAL (Section 5.4)
  // ═══════════════════════════════════════════

  /** Tag a completed game to a club — goes to the admin's approval queue */
  tagGameToClub: async (clubId, gameId) => {
    try {
      const result = await clubApi.tagGame(clubId, gameId);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: errorMessage(err, 'Failed to tag game') };
    }
  },

  /** Fetch pending games for approval (admin only) */
  fetchPendingGames: async (clubId) => {
    try {
      const games = await clubApi.getPendingGames(clubId);
      set({ pendingGames: games.map(toPendingGame) });
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load pending games' });
    }
  },

  /** Approve a game (admin only) */
  approveGame: async (clubId, gameId) => {
    try {
      await clubApi.approveGame(clubId, gameId);
      set((state) => ({
        pendingGames: state.pendingGames.filter((g) => g.id !== gameId),
      }));
      // Refresh leaderboard after approval
      get().fetchSeasonLeaderboard(clubId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to approve game' };
    }
  },

  /** Reject a game (admin only) */
  rejectGame: async (clubId, gameId) => {
    try {
      await clubApi.rejectGame(clubId, gameId);
      set((state) => ({
        pendingGames: state.pendingGames.filter((g) => g.id !== gameId),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to reject game' };
    }
  },

  // ═══════════════════════════════════════════
  //  SEASON (Sections 5.5–5.6)
  // ═══════════════════════════════════════════

  /** Fetch current season leaderboard */
  fetchSeasonLeaderboard: async (clubId) => {
    try {
      const res = await clubApi.getLeaderboard(clubId);
      set({ leaderboard: res.leaderboard || [] });
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load leaderboard' });
    }
  },

  /** Start a new season (admin only — Section 5.6) */
  startNewSeason: async (clubId, data) => {
    try {
      const season = await clubApi.startNewSeason(clubId, data);
      // Refresh club detail to pick up new season
      get().fetchClub(clubId);
      return { success: true, data: season };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to start season' };
    }
  },

  /** End current season (admin only — rolling seasons) */
  endSeason: async (clubId, seasonId) => {
    try {
      const sid = seasonId || get().activeClub?.currentSeason?.id;
      if (!sid) return { success: false, error: 'No active season' };
      const res = await clubApi.endSeason(clubId, sid);
      const results = { ...res, awards: toAwardList(res.awards) };
      set({ seasonResults: results });
      return { success: true, data: results };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to end season' };
    }
  },

  /** Fetch season end results (awards, final standings) from season history */
  fetchSeasonResults: async (clubId, seasonId) => {
    try {
      const seasons = await clubApi.getSeasonHistory(clubId);
      const season = seasons.find((s) => s.id === seasonId);
      if (!season) throw new Error('Season not found');
      const results = { season, leaderboard: season.finalStandings || [], awards: toAwardList(season.awards) };
      set({ seasonResults: results });
      return results;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load season results' });
      return null;
    }
  },

  /** Fetch season history */
  fetchSeasonHistory: async (clubId) => {
    try {
      const seasons = await clubApi.getSeasonHistory(clubId);
      set({ seasonHistory: seasons });
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load season history' });
    }
  },

  // ═══════════════════════════════════════════
  //  ACTIVITY FEED (Section 5.7)
  // ═══════════════════════════════════════════

  /** Fetch club activity feed */
  fetchActivity: async (clubId, opts = {}) => {
    try {
      const res = await clubApi.getActivity(clubId, opts);
      const items = res.activities || [];
      if (opts.offset && opts.offset > 0) {
        // Append for pagination
        set((state) => ({ activityFeed: [...state.activityFeed, ...items] }));
      } else {
        set({ activityFeed: items });
      }
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load activity' });
    }
  },

  /** Alias used by club pages */
  fetchActivityFeed: (clubId, opts) => get().fetchActivity(clubId, opts),

  // ═══════════════════════════════════════════
  //  ARCHIVE (Section 5.6)
  // ═══════════════════════════════════════════

  /** Archive a club (admin only) */
  archiveClub: async (clubId) => {
    try {
      await clubApi.archiveClub(clubId);
      set((state) => ({
        clubs: state.clubs.filter((c) => c.id !== clubId),
        activeClub: null,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to archive club' };
    }
  },
}));

export default useClubStore;
