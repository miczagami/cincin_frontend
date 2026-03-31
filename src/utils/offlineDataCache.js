/**
 * Offline Data Cache — Priority 5 (Phase 5)
 * Spec ref: Section 9.2 (Offline Behaviour), Section 6.1 (Palate Profile)
 *
 * IndexedDB persistence layer for offline viewing of:
 *   - Palate Profile dashboard data (all-time + recent views)
 *   - Game history (paginated, last-fetched snapshot)
 *   - User profile summary
 *
 * Uses the same IndexedDB database as offlineGame.js (DB_VERSION bumped to 3)
 * to avoid opening multiple databases. Adds two new object stores:
 *   - 'cached-data' — key-value store for JSON blobs (profile, history, etc.)
 *   - Reuses existing 'bottles' and 'pending-games' stores unchanged.
 *
 * Pattern: write-through cache. Network responses are cached on success;
 * cached data is served when the network is unavailable.
 */

const DB_NAME = 'cincin-offline';
const DB_VERSION = 3;
const CACHED_DATA_STORE = 'cached-data';

// Existing stores (must be preserved during upgrade)
const BOTTLE_STORE = 'bottles';
const PENDING_GAMES_STORE = 'pending-games';

// Cache keys
const KEY_PALATE_PROFILE_ALL_TIME = 'palate-profile:all_time';
const KEY_PALATE_PROFILE_RECENT = 'palate-profile:recent';
const KEY_PALATE_PROGRESS = 'palate-progress';
const KEY_GAME_HISTORY = 'game-history';
const KEY_USER_PROFILE = 'user-profile';

// ── Database ──

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Preserve existing stores from Phase 2
      if (!db.objectStoreNames.contains(BOTTLE_STORE)) {
        const store = db.createObjectStore(BOTTLE_STORE, { keyPath: 'id' });
        store.createIndex('lastUsed', 'lastUsed');
      }
      if (!db.objectStoreNames.contains(PENDING_GAMES_STORE)) {
        db.createObjectStore(PENDING_GAMES_STORE, { keyPath: 'localId' });
      }

      // New store for Priority 5
      if (!db.objectStoreNames.contains(CACHED_DATA_STORE)) {
        db.createObjectStore(CACHED_DATA_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Generic get/set for cached-data store ──

async function setCachedData(key, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHED_DATA_STORE, 'readwrite');
    tx.objectStore(CACHED_DATA_STORE).put({
      key,
      data,
      cachedAt: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getCachedData(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHED_DATA_STORE, 'readonly');
    const req = tx.objectStore(CACHED_DATA_STORE).get(key);
    req.onsuccess = () => {
      const entry = req.result;
      if (!entry) return resolve(null);
      resolve({
        data: entry.data,
        cachedAt: entry.cachedAt,
        isCached: true,
      });
    };
    req.onerror = () => reject(req.error);
  });
}

async function removeCachedData(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHED_DATA_STORE, 'readwrite');
    tx.objectStore(CACHED_DATA_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearAllCachedData() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHED_DATA_STORE, 'readwrite');
    tx.objectStore(CACHED_DATA_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Palate Profile Cache ──

export async function cachePalateProfile(view, profileData) {
  const key = view === 'recent' ? KEY_PALATE_PROFILE_RECENT : KEY_PALATE_PROFILE_ALL_TIME;
  await setCachedData(key, profileData);
}

export async function getCachedPalateProfile(view) {
  const key = view === 'recent' ? KEY_PALATE_PROFILE_RECENT : KEY_PALATE_PROFILE_ALL_TIME;
  return getCachedData(key);
}

export async function cachePalateProgress(progressData) {
  await setCachedData(KEY_PALATE_PROGRESS, progressData);
}

export async function getCachedPalateProgress() {
  return getCachedData(KEY_PALATE_PROGRESS);
}

// ── Game History Cache ──

export async function cacheGameHistory(historyData) {
  await setCachedData(KEY_GAME_HISTORY, historyData);
}

export async function getCachedGameHistory() {
  return getCachedData(KEY_GAME_HISTORY);
}

// ── User Profile Cache ──

export async function cacheUserProfile(profileData) {
  await setCachedData(KEY_USER_PROFILE, profileData);
}

export async function getCachedUserProfile() {
  return getCachedData(KEY_USER_PROFILE);
}

// ── Cache Management ──

/**
 * Clear all offline data caches (profile, history, etc.).
 * Does NOT clear bottle cache or pending games — those are
 * managed separately via offlineGame.js.
 */
export async function clearOfflineDataCache() {
  await clearAllCachedData();
}

/**
 * Get cache stats for the Settings page display.
 * Returns the count and total approximate size of cached data entries.
 */
export async function getOfflineDataCacheStats() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHED_DATA_STORE, 'readonly');
    const store = tx.objectStore(CACHED_DATA_STORE);
    const countReq = store.count();
    const allReq = store.getAll();

    allReq.onsuccess = () => {
      const entries = allReq.result || [];
      const totalSize = entries.reduce((sum, entry) => {
        return sum + JSON.stringify(entry.data).length;
      }, 0);

      resolve({
        entryCount: countReq.result || entries.length,
        approximateSizeBytes: totalSize,
        entries: entries.map((e) => ({
          key: e.key,
          cachedAt: e.cachedAt,
        })),
      });
    };
    allReq.onerror = () => reject(allReq.error);
  });
}

export default {
  cachePalateProfile,
  getCachedPalateProfile,
  cachePalateProgress,
  getCachedPalateProgress,
  cacheGameHistory,
  getCachedGameHistory,
  cacheUserProfile,
  getCachedUserProfile,
  clearOfflineDataCache,
  getOfflineDataCacheStats,
};
