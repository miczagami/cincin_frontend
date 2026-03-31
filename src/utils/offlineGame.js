/**
 * Offline Game Engine — Phase 2 (Priority 5 update: DB_VERSION 3)
 * Spec ref: Section 2.7 (Offline Behaviour)
 *
 * Priority 5 changes:
 * - DB_VERSION bumped from 2 to 3 to add 'cached-data' store used by
 *   offlineDataCache.js for Palate Profile and Game History caching.
 * - All existing functionality preserved exactly as Phase 2 implemented it.
 * - The new store is created in onupgradeneeded; existing data is not affected.
 *
 * - IndexedDB bottle cache with LRU eviction (50 bottles)
 * - Pending offline game queue
 * - OfflineGameEngine class for pass-the-phone without network
 */

const DB_NAME = 'cincin-offline';
const DB_VERSION = 3; // Priority 5: bumped from 2 to add 'cached-data' store
const BOTTLE_STORE = 'bottles';
const PENDING_GAMES_STORE = 'pending-games';
const CACHED_DATA_STORE = 'cached-data'; // Priority 5: new store
const MAX_CACHED_BOTTLES = 50;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(BOTTLE_STORE)) {
        const store = db.createObjectStore(BOTTLE_STORE, { keyPath: 'id' });
        store.createIndex('lastUsed', 'lastUsed');
      }
      if (!db.objectStoreNames.contains(PENDING_GAMES_STORE)) {
        db.createObjectStore(PENDING_GAMES_STORE, { keyPath: 'localId' });
      }
      // Priority 5: Add cached-data store for profile/history offline caching
      if (!db.objectStoreNames.contains(CACHED_DATA_STORE)) {
        db.createObjectStore(CACHED_DATA_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Bottle Cache ──

export async function cacheBottle(bottleData) {
  const db = await openDB();
  const tx = db.transaction(BOTTLE_STORE, 'readwrite');
  tx.objectStore(BOTTLE_STORE).put({ ...bottleData, lastUsed: Date.now(), cachedAt: Date.now() });
  await evictOldBottles(db);
}

export async function getCachedBottle(bottleId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOTTLE_STORE, 'readwrite');
    const store = tx.objectStore(BOTTLE_STORE);
    const req = store.get(bottleId);
    req.onsuccess = () => {
      const bottle = req.result;
      if (bottle) { bottle.lastUsed = Date.now(); store.put(bottle); }
      resolve(bottle || null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedBottles() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(BOTTLE_STORE, 'readonly').objectStore(BOTTLE_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeCachedBottle(bottleId) {
  const db = await openDB();
  db.transaction(BOTTLE_STORE, 'readwrite').objectStore(BOTTLE_STORE).delete(bottleId);
}

export async function clearBottleCache() {
  const db = await openDB();
  db.transaction(BOTTLE_STORE, 'readwrite').objectStore(BOTTLE_STORE).clear();
}

async function evictOldBottles(db) {
  return new Promise((resolve) => {
    const tx = db.transaction(BOTTLE_STORE, 'readwrite');
    const store = tx.objectStore(BOTTLE_STORE);
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result <= MAX_CACHED_BOTTLES) return resolve();
      const toRemove = countReq.result - MAX_CACHED_BOTTLES;
      let removed = 0;
      const cursor = store.index('lastUsed').openCursor();
      cursor.onsuccess = (e) => {
        const c = e.target.result;
        if (c && removed < toRemove) { store.delete(c.primaryKey); removed++; c.continue(); }
        else resolve();
      };
    };
  });
}

// ── Pending Offline Games ──

export async function saveOfflineGame(gameData) {
  const db = await openDB();
  const entry = {
    ...gameData,
    localId: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    synced: false,
  };
  db.transaction(PENDING_GAMES_STORE, 'readwrite').objectStore(PENDING_GAMES_STORE).put(entry);
  return entry.localId;
}

export async function getPendingGames() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(PENDING_GAMES_STORE, 'readonly').objectStore(PENDING_GAMES_STORE).getAll();
    req.onsuccess = () => resolve((req.result || []).filter((g) => !g.synced));
    req.onerror = () => reject(req.error);
  });
}

export async function markGameSynced(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_GAMES_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_GAMES_STORE);
    const req = store.get(localId);
    req.onsuccess = () => {
      const game = req.result;
      if (game) { game.synced = true; game.syncedAt = Date.now(); store.put(game); }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearSyncedGames() {
  const db = await openDB();
  const tx = db.transaction(PENDING_GAMES_STORE, 'readwrite');
  const store = tx.objectStore(PENDING_GAMES_STORE);
  const req = store.getAll();
  return new Promise((resolve) => {
    req.onsuccess = () => {
      (req.result || []).forEach((g) => { if (g.synced) store.delete(g.localId); });
      resolve();
    };
  });
}

// ── Offline Game Engine ──

export class OfflineGameEngine {
  constructor({ bottle, players, config }) {
    this.bottle = bottle;
    this.players = players.map((p, i) => ({
      ...p, order: i, score: 0, status: 'ACTIVE', guesses: [],
    }));
    this.config = { mode: 'PARALLEL', maxRounds: 20, roundTimerSecs: 60, optOutTiming: 'START_OF_ROUND', ...config };
    this.round = 1;
    this.turnIndex = 0;
    this.claimedNotes = new Set();
    this.status = 'IN_PROGRESS';
    this.history = [];
  }

  get currentPlayer() { return this.players[this.turnIndex] || null; }
  get activePlayers() { return this.players.filter((p) => p.status === 'ACTIVE'); }

  submitGuess(guessText) {
    const player = this.currentPlayer;
    if (!player || player.status !== 'ACTIVE') return null;

    const match = this.findMatch(guessText);
    const isCorrect = !!match;
    const isSpecific = match?.isSpecific || false;

    let points = 0;
    if (isCorrect) {
      const isProducer = match.sourceTier === 'PRODUCER';
      points = isSpecific ? (isProducer ? 3 : 2) : (isProducer ? 2 : 1);
      this.claimedNotes.add(match.noteId);
    } else {
      points = -1;
    }

    player.score += points;
    const result = {
      guessText, isCorrect, isSpecific, points,
      matchedNote: match?.note || null,
      round: this.round,
      playerIndex: this.turnIndex,
    };

    player.guesses.push(result);
    this.history.push(result);
    return result;
  }

  optOut() {
    const player = this.currentPlayer;
    if (!player || player.status !== 'ACTIVE') return false;
    player.status = 'OPTED_OUT';
    return true;
  }

  advanceTurn() {
    if (this.checkGameEnd()) { this.status = 'ENDED'; return false; }

    // Move to next active player
    let attempts = 0;
    do {
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
      attempts++;
      if (this.turnIndex === 0) this.round++;
    } while (this.players[this.turnIndex].status !== 'ACTIVE' && attempts < this.players.length * 2);

    if (this.checkGameEnd()) { this.status = 'ENDED'; return false; }
    return true;
  }

  checkGameEnd() {
    if (this.activePlayers.length === 0) return true;
    if (this.round > this.config.maxRounds) return true;
    // Check if all notes are claimed (in competitive mode)
    if (this.config.mode === 'COMPETITIVE' && this.bottle?.tastingNotes) {
      const totalNotes = this.bottle.tastingNotes.length;
      if (this.claimedNotes.size >= totalNotes) return true;
    }
    return false;
  }

  findMatch(guessText) {
    if (!this.bottle?.tastingNotes || !guessText) return null;
    const normalised = guessText.trim().toLowerCase();

    for (const note of this.bottle.tastingNotes) {
      // Skip claimed notes in competitive mode
      if (this.config.mode === 'COMPETITIVE' && this.claimedNotes.has(note.id)) continue;

      // Exact match on specific note
      if (note.note.toLowerCase() === normalised) {
        return { noteId: note.id, note: note.note, isSpecific: true, sourceTier: note.sourceTier };
      }

      // Match on generic category
      if (note.genericNote && note.genericNote.toLowerCase() === normalised) {
        return { noteId: note.id, note: note.note, isSpecific: false, sourceTier: note.sourceTier };
      }
    }

    return null;
  }

  getResults() {
    return {
      players: this.players.map((p) => ({
        ...p,
        accuracy: p.guesses.length > 0
          ? Math.round((p.guesses.filter((g) => g.isCorrect).length / p.guesses.length) * 100)
          : 0,
      })).sort((a, b) => b.score - a.score),
      rounds: this.round,
      totalGuesses: this.history.length,
      bottle: this.bottle,
    };
  }

  toSyncPayload() {
    return {
      bottleId: this.bottle.id,
      mode: this.config.mode,
      roundTimerSecs: this.config.roundTimerSecs,
      maxRounds: this.config.maxRounds,
      guestPlayerNames: this.players.filter((p) => p.isGuest).map((p) => p.name),
      rounds: this.buildRoundsPayload(),
      endReason: 'HOST_ENDED',
    };
  }

  buildRoundsPayload() {
    const rounds = {};
    for (const entry of this.history) {
      if (!rounds[entry.round]) rounds[entry.round] = { guesses: [] };
      rounds[entry.round].guesses.push({
        guessText: entry.guessText,
        isGuest: this.players[entry.playerIndex]?.isGuest || false,
        guestPlayerId: this.players[entry.playerIndex]?.guestId || null,
      });
    }
    return Object.values(rounds);
  }
}
