/**
 * Game Day Command Center — TypeScript interfaces.
 *
 * Every type used across the match lifecycle lives here:
 * lineup → live scoring → end-of-set → post-game sync.
 */

// ── Enums / Unions ──────────────────────────────────────────────

export type Formation = '5-1' | '6-2' | '6-6';

export type Phase = 'base' | 'serve' | 'serve-receive';

export type SyncStatus = 'local' | 'syncing' | 'synced';

export type ActionType =
  | 'score'
  | 'undo_score'
  | 'sub'
  | 'rotation'
  | 'serve'
  | 'rally_stat'
  | 'libero_in'
  | 'libero_out'
  | 'timeout'
  | 'set_end'
  | 'match_end';

export type ServeResult = 'in' | 'ace' | 'error';

export type RallyActionType =
  | 'good_pass'
  | 'bad_pass'
  | 'good_hit'
  | 'hit_error'
  | 'kill'
  | 'good_set'
  | 'bad_set'
  | 'block'
  | 'dig'
  | 'assist'
  | 'error';

// ── Player / Lineup ─────────────────────────────────────────────

export interface PlayerSlot {
  playerId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  /** Registered position: OH, MB, S, OPP, L, DS, etc. */
  position: string;
  photoUrl?: string;
}

export interface SubPair {
  starterId: string;
  subId: string;
}

// ── Events logged during a set ──────────────────────────────────

export interface SubEvent {
  id: string;
  timestamp: string;
  setNumber: number;
  playerIn: string;
  playerOut: string;
  isLibero: boolean;
}

export interface ServeEvent {
  id: string;
  timestamp: string;
  setNumber: number;
  serverId: string;
  /** Tap location on opponent court, 0-100 normalised */
  x: number;
  y: number;
  result: ServeResult;
}

export interface RallyAction {
  playerId: string;
  action: RallyActionType;
}

export interface RallyEvent {
  id: string;
  timestamp: string;
  setNumber: number;
  rallyNumber: number;
  actions: RallyAction[];
  pointFor: 'home' | 'away';
  /** Player who scored or committed the error */
  pointPlayer?: string;
}

// ── Set state ───────────────────────────────────────────────────

export interface SetState {
  setNumber: number;
  homeScore: number;
  awayScore: number;
  /** Which rotation the team is in (1-6) */
  currentRotation: number;
  /** true = we are serving */
  isServing: boolean;
  subsUsed: number;
  subLog: SubEvent[];
  rallyLog: RallyEvent[];
  serveLog: ServeEvent[];
  setComplete: boolean;
  winner?: 'home' | 'away';
}

// ── Match state (top-level, persisted) ──────────────────────────

export interface MatchState {
  id: string;
  /** Links to the Supabase schedule_events row */
  eventId: string;
  teamId: string;
  opponentName: string;
  formation: Formation;

  // Lineup
  /** 6 starters in fixed service-order positions P1-P6 for rotation 1 */
  starters: PlayerSlot[];
  /** Bench players */
  subs: PlayerSlot[];
  libero?: PlayerSlot;
  subPairs: SubPair[];

  // Match state
  currentSet: number;
  sets: SetState[];
  matchComplete: boolean;

  // Rules (configurable per league)
  bestOf: 3 | 5;
  /** Points to win a regular set (typically 25) */
  pointsToWin: number;
  /** Points to win the deciding set (typically 15) */
  decidingSetPoints: number;
  /** Hard cap on points per set (0 = no cap) */
  pointCap: number;
  /** Max substitutions per set (typically 12 for youth) */
  maxSubs: number;
  /** Whether the libero is allowed to serve */
  liberoCanServe: boolean;
  /** Whether rotation resets between sets */
  resetRotationBetweenSets: boolean;

  // Tier 2 toggle
  trackRallyStats: boolean;

  // Sync
  syncStatus: SyncStatus;
  pendingActions: MatchAction[];
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Action queue (offline replay) ───────────────────────────────

export interface MatchAction {
  id: string;
  timestamp: string;
  type: ActionType;
  /** Payload shape varies by type */
  data: Record<string, any>;
}

// ── Court position (rendered on the court diagram) ──────────────

export interface CourtPosition {
  /** P1-P6 slot */
  slot: string;
  /** 0-100 normalised horizontal position (0 = left) */
  x: number;
  /** 0-100 normalised vertical position (0 = back endline, 50 = net) */
  y: number;
  /** Short label: S, OPP, MB, OH, L, DS, P */
  label: string;
  /** Full role name */
  role: string;
  playerId?: string;
  jerseyNumber?: number;
  isServer?: boolean;
  isLibero?: boolean;
  isFrontRow: boolean;
}

// ── Formation role template ─────────────────────────────────────

export interface RoleTemplate {
  /** Short label displayed on court: S, OPP, MB, OH */
  label: string;
  /** Full role name */
  role: string;
}
