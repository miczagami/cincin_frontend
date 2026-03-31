/**
 * Club API Client — Phase 3
 * Timeline ref: Weeks 11–13 (Cellar Club Core + Season & Approval)
 * Spec ref: Sections 5.1–5.7
 *
 * REST endpoints for:
 * - Club CRUD (create, get, list, update, archive)
 * - Membership (join, leave, remove member)
 * - Season management (start new, end, leaderboard)
 * - Game approval workflow
 * - Activity feed
 */

import api from './api';

const clubApi = {
  // ═══════════════════════════════════════════
  //  CLUB CRUD
  // ═══════════════════════════════════════════

  /** Create a new Cellar Club (Section 5.2) */
  createClub: (data) =>
    api.post('/api/clubs', data),
  // data: { name, memberCap?, seasonType, seasonEndDate?, seasonLengthDays? }

  /** Get club detail with current season + leaderboard */
  getClub: (clubId) =>
    api.get(`/api/clubs/${clubId}`),

  /** List user's clubs */
  listMyClubs: () =>
    api.get('/api/clubs/mine'),

  /** Archive a club (admin only — Section 5.6) */
  archiveClub: (clubId) =>
    api.post(`/api/clubs/${clubId}/archive`),

  // ═══════════════════════════════════════════
  //  MEMBERSHIP (Section 5.3)
  // ═══════════════════════════════════════════

  /** Join a club via invite code */
  joinClub: (inviteCode) =>
    api.post('/api/clubs/join', { inviteCode }),

  /** Leave a club voluntarily */
  leaveClub: (clubId) =>
    api.post(`/api/clubs/${clubId}/leave`),

  /** Admin removes a member */
  removeMember: (clubId, userId) =>
    api.delete(`/api/clubs/${clubId}/members/${userId}`),

  /** Get club members list */
  getMembers: (clubId) =>
    api.get(`/api/clubs/${clubId}/members`),

  // ═══════════════════════════════════════════
  //  GAME APPROVAL (Section 5.4)
  // ═══════════════════════════════════════════

  /** Get pending games for approval (admin only) */
  getPendingGames: (clubId) =>
    api.get(`/api/clubs/${clubId}/games/pending`),

  /** Approve a game (admin only) */
  approveGame: (clubId, gameId) =>
    api.post(`/api/clubs/${clubId}/games/${gameId}/approve`),

  /** Reject a game (admin only) */
  rejectGame: (clubId, gameId) =>
    api.post(`/api/clubs/${clubId}/games/${gameId}/reject`),

  /** Get all club games (approved + pending + rejected) */
  getClubGames: (clubId, { limit = 20, offset = 0 } = {}) =>
    api.get(`/api/clubs/${clubId}/games?limit=${limit}&offset=${offset}`),

  // ═══════════════════════════════════════════
  //  SEASON (Sections 5.5–5.6)
  // ═══════════════════════════════════════════

  /** Get season leaderboard */
  getSeasonLeaderboard: (clubId, seasonId) =>
    api.get(`/api/clubs/${clubId}/seasons/${seasonId}/leaderboard`),

  /** Start a new season (admin only — Section 5.6) */
  startNewSeason: (clubId, data) =>
    api.post(`/api/clubs/${clubId}/seasons`, data),
  // data: { seasonType, endDate?, lengthDays?, name? }

  /** End the current season manually (admin only — rolling seasons) */
  endSeason: (clubId, seasonId) =>
    api.post(`/api/clubs/${clubId}/seasons/${seasonId}/end`),

  /** Get season history */
  getSeasonHistory: (clubId) =>
    api.get(`/api/clubs/${clubId}/seasons`),

  /** Get season end results (awards, final standings) */
  getSeasonResults: (clubId, seasonId) =>
    api.get(`/api/clubs/${clubId}/seasons/${seasonId}/results`),

  // ═══════════════════════════════════════════
  //  ACTIVITY FEED (Section 5.7)
  // ═══════════════════════════════════════════

  /** Get club activity feed (paginated) */
  getActivity: (clubId, { limit = 20, offset = 0 } = {}) =>
    api.get(`/api/clubs/${clubId}/activity?limit=${limit}&offset=${offset}`),

  // ═══════════════════════════════════════════
  //  INVITE LINK
  // ═══════════════════════════════════════════

  /** Generate/refresh invite link */
  getInviteLink: (clubId) =>
    api.get(`/api/clubs/${clubId}/invite`),
};

export default clubApi;
