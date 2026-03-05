/**
 * Match Store — offline-first persistence via AsyncStorage.
 *
 * Every state mutation writes to local storage immediately.
 * A pending-actions queue stores timestamped events for
 * replay against Supabase when the network returns.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MatchAction, MatchState, SetState, SyncStatus } from './match-state';

// ── Storage keys ────────────────────────────────────────────────
const MATCH_KEY_PREFIX = '@gdcc_match:';
const MATCH_INDEX_KEY = '@gdcc_match_index';

function matchKey(id: string): string {
  return `${MATCH_KEY_PREFIX}${id}`;
}

// ── Index (list of known match IDs) ─────────────────────────────

async function getIndex(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(MATCH_INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function addToIndex(id: string): Promise<void> {
  const idx = await getIndex();
  if (!idx.includes(id)) {
    idx.push(id);
    await AsyncStorage.setItem(MATCH_INDEX_KEY, JSON.stringify(idx));
  }
}

async function removeFromIndex(id: string): Promise<void> {
  const idx = await getIndex();
  const filtered = idx.filter(x => x !== id);
  await AsyncStorage.setItem(MATCH_INDEX_KEY, JSON.stringify(filtered));
}

// ── CRUD ────────────────────────────────────────────────────────

/**
 * Create a new match and persist it.
 */
export async function createMatch(
  eventId: string,
  teamId: string,
  opponentName: string,
  formation: MatchState['formation'],
  options?: Partial<Pick<
    MatchState,
    'bestOf' | 'pointsToWin' | 'decidingSetPoints' | 'pointCap' |
    'maxSubs' | 'liberoCanServe' | 'resetRotationBetweenSets' | 'trackRallyStats'
  >>,
): Promise<MatchState> {
  const id = generateId();
  const now = new Date().toISOString();

  const firstSet: SetState = {
    setNumber: 1,
    homeScore: 0,
    awayScore: 0,
    currentRotation: 1,
    isServing: true, // will be set by coin toss / coach choice
    subsUsed: 0,
    subLog: [],
    rallyLog: [],
    serveLog: [],
    setComplete: false,
  };

  const match: MatchState = {
    id,
    eventId,
    teamId,
    opponentName,
    formation,

    starters: [],
    subs: [],
    subPairs: [],

    currentSet: 1,
    sets: [firstSet],
    matchComplete: false,

    bestOf: options?.bestOf ?? 3,
    pointsToWin: options?.pointsToWin ?? 25,
    decidingSetPoints: options?.decidingSetPoints ?? 15,
    pointCap: options?.pointCap ?? 0,
    maxSubs: options?.maxSubs ?? 12,
    liberoCanServe: options?.liberoCanServe ?? false,
    resetRotationBetweenSets: options?.resetRotationBetweenSets ?? false,
    trackRallyStats: options?.trackRallyStats ?? false,

    syncStatus: 'local',
    pendingActions: [],
    createdAt: now,
    updatedAt: now,
  };

  await saveMatch(match);
  await addToIndex(id);
  return match;
}

/**
 * Load a match by ID.  Returns null if not found.
 */
export async function loadMatch(matchId: string): Promise<MatchState | null> {
  const raw = await AsyncStorage.getItem(matchKey(matchId));
  return raw ? JSON.parse(raw) : null;
}

/**
 * Persist the full match state.
 */
export async function saveMatch(match: MatchState): Promise<void> {
  match.updatedAt = new Date().toISOString();
  await AsyncStorage.setItem(matchKey(match.id), JSON.stringify(match));
}

/**
 * Append an action to the pending queue AND save match.
 */
export async function addAction(match: MatchState, action: MatchAction): Promise<void> {
  match.pendingActions.push(action);
  await saveMatch(match);
}

/**
 * Delete a match from storage.
 */
export async function deleteMatch(matchId: string): Promise<void> {
  await AsyncStorage.removeItem(matchKey(matchId));
  await removeFromIndex(matchId);
}

// ── Sync helpers ────────────────────────────────────────────────

/**
 * Get all matches that still have pending sync data.
 */
export async function getPendingMatches(): Promise<MatchState[]> {
  const idx = await getIndex();
  const results: MatchState[] = [];
  for (const id of idx) {
    const m = await loadMatch(id);
    if (m && m.syncStatus !== 'synced') {
      results.push(m);
    }
  }
  return results;
}

/**
 * Mark a match as synced and clear its pending queue.
 */
export async function markSynced(matchId: string): Promise<void> {
  const match = await loadMatch(matchId);
  if (!match) return;
  match.syncStatus = 'synced';
  match.pendingActions = [];
  match.lastSyncedAt = new Date().toISOString();
  await saveMatch(match);
}

/**
 * Update sync status without clearing the queue.
 */
export async function setSyncStatus(matchId: string, status: SyncStatus): Promise<void> {
  const match = await loadMatch(matchId);
  if (!match) return;
  match.syncStatus = status;
  await saveMatch(match);
}

/**
 * Get all stored matches (for listing in-progress / recent matches).
 */
export async function getAllMatches(): Promise<MatchState[]> {
  const idx = await getIndex();
  const results: MatchState[] = [];
  for (const id of idx) {
    const m = await loadMatch(id);
    if (m) results.push(m);
  }
  return results;
}

/**
 * Find a match in progress (not yet complete).
 */
export async function getInProgressMatch(): Promise<MatchState | null> {
  const all = await getAllMatches();
  return all.find(m => !m.matchComplete) ?? null;
}

// ── Utility ─────────────────────────────────────────────────────

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `match_${ts}_${rand}`;
}

/**
 * Generate a unique action ID.
 */
export function generateActionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `act_${ts}_${rand}`;
}
