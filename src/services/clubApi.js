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

// Paths are relative to the shared axios client, whose baseURL already ends in /api.
// Routes: cincin_backend/src/routes/cellarClubs.js
const clubApi = {
  // ═══════════════════════════════════════════
  //  CLUB CRUD
  // ═══════════════════════════════════════════

  /** Create a new Cellar Club (Section 5.2) */
  createClub: (data) =>
    api.post('/clubs', data),
  // data: { name, memberCap?, seasonType, seasonEndDate?, seasonLengthDays? }

  /** Get club detail: members, active season, leaderboard, recent games */
  getClub: (clubId) =>
    api.get(`/clubs/${clubId}`),

  /** List user's clubs */
  listMyClubs: () =>
    api.get('/clubs'),

  /** Archive a club (admin only — Section 5.6) */
  archiveClub: (clubId) =>
    api.post(`/clubs/${clubId}/archive`),

  // ═══════════════════════════════════════════
  //  MEMBERSHIP (Section 5.3)
  // ═══════════════════════════════════════════

  /** Join a club via invite code */
  joinClub: (inviteCode) =>
    api.post('/clubs/join', { inviteCode }),

  /** Leave a club voluntarily */
  leaveClub: (clubId) =>
    api.post(`/clubs/${clubId}/leave`),

  /** Admin removes a member */
  removeMember: (clubId, userId) =>
    api.delete(`/clubs/${clubId}/members/${userId}`),

  // ═══════════════════════════════════════════
  //  GAME APPROVAL (Section 5.4)
  // ═══════════════════════════════════════════

  /** Tag a completed game to a club for approval */
  tagGame: (clubId, gameId) =>
    api.post(`/clubs/${clubId}/games/${gameId}/tag`),

  /** Get pending games for approval (admin only) */
  getPendingGames: (clubId) =>
    api.get(`/clubs/${clubId}/games/pending`),

  /** Approve a game (admin only) */
  approveGame: (clubId, gameId) =>
    api.post(`/clubs/${clubId}/games/${gameId}/approve`),

  /** Reject a game (admin only) */
  rejectGame: (clubId, gameId) =>
    api.post(`/clubs/${clubId}/games/${gameId}/reject`),

  // ═══════════════════════════════════════════
  //  SEASON (Sections 5.5–5.6)
  // ═══════════════════════════════════════════

  /** Current season leaderboard → { leaderboard, season } */
  getLeaderboard: (clubId) =>
    api.get(`/clubs/${clubId}/leaderboard`),

  /** Start a new season (admin only — Section 5.6) */
  startNewSeason: (clubId, data) =>
    api.post(`/clubs/${clubId}/seasons`, data),
  // data: { seasonType, endDate?, lengthDays?, name? }

  /** End the current season manually (admin only — rolling seasons) → { season, leaderboard, awards } */
  endSeason: (clubId, seasonId) =>
    api.post(`/clubs/${clubId}/seasons/${seasonId}/end`),

  /** Season history, including awards and final standings of ended seasons */
  getSeasonHistory: (clubId) =>
    api.get(`/clubs/${clubId}/seasons`),

  // ═══════════════════════════════════════════
  //  ACTIVITY FEED (Section 5.7)
  // ═══════════════════════════════════════════

  /** Get club activity feed (paginated) → { activities, total, limit, offset } */
  getActivity: (clubId, { limit = 20, offset = 0 } = {}) =>
    api.get(`/clubs/${clubId}/activity`, { params: { limit, offset } }),
};

export default clubApi;
