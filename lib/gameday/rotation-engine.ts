/**
 * Rotation Engine — the volleyball brain.
 *
 * Encodes all rotation rules for 5-1, 6-2, and 6-6 formations.
 * Pure functions, no side-effects, fully testable.
 */
import type {
  CourtPosition,
  Formation,
  MatchState,
  Phase,
  PlayerSlot,
  RoleTemplate,
  SubEvent,
} from './match-state';
import { getFormationPositions } from './formation-positions';

// ─── Role templates per formation ───────────────────────────────
// Index in array = starter index (the fixed service-order slot).

const ROLES_5_1: RoleTemplate[] = [
  { label: 'S',   role: 'Setter' },
  { label: 'OPP', role: 'Opposite' },
  { label: 'MB',  role: 'Middle' },
  { label: 'OH',  role: 'Outside' },
  { label: 'MB',  role: 'Middle' },
  { label: 'OH',  role: 'Outside' },
];

const ROLES_6_2: RoleTemplate[] = [
  { label: 'S',  role: 'Setter' },
  { label: 'OH', role: 'Outside' },
  { label: 'MB', role: 'Middle' },
  { label: 'S',  role: 'Setter' },
  { label: 'OH', role: 'Outside' },
  { label: 'MB', role: 'Middle' },
];

const ROLES_6_6: RoleTemplate[] = [
  { label: 'P', role: 'Player' },
  { label: 'P', role: 'Player' },
  { label: 'P', role: 'Player' },
  { label: 'P', role: 'Player' },
  { label: 'P', role: 'Player' },
  { label: 'P', role: 'Player' },
];

/**
 * Get the role template array for a formation.
 */
export function getRoleTemplates(formation: Formation): RoleTemplate[] {
  switch (formation) {
    case '5-1': return ROLES_5_1;
    case '6-2': return ROLES_6_2;
    case '6-6': return ROLES_6_6;
  }
}

// ─── Core rotation mapping ──────────────────────────────────────

/**
 * Given a 0-indexed court position (0=P1 … 5=P6) and the current
 * rotation (1-6), return the 0-indexed starter-array index of the
 * player occupying that position.
 *
 * The rotation table for 5-1 in the spec shifts the lineup array
 * right by (rotation-1).  Generalised formula:
 *
 *   starterIndex = (posIndex - rotation + 7) % 6
 *
 * This works identically for all three formations because the
 * service-order loop is the same; only the role labels differ.
 */
export function starterIndexAtPosition(posIndex: number, rotation: number): number {
  return (posIndex - rotation + 7) % 6;
}

/**
 * Return which starter occupies each court position (P1-P6) for a
 * given rotation.  Result is a 6-element array indexed by court
 * position (0 = P1).
 */
export function getPlayersInRotation(
  rotation: number,
  starters: PlayerSlot[],
): PlayerSlot[] {
  return Array.from({ length: 6 }, (_, i) => starters[starterIndexAtPosition(i, rotation)]);
}

/**
 * Advance one rotation clockwise.  R6 wraps to R1.
 */
export function rotateClockwise(currentRotation: number): number {
  return currentRotation >= 6 ? 1 : currentRotation + 1;
}

// ─── Court positions with player info ───────────────────────────

/**
 * Build full CourtPosition objects for a given state.
 *
 * @param formation  5-1 | 6-2 | 6-6
 * @param rotation   1-6
 * @param phase      base | serve | serve-receive
 * @param starters   6-element service-order array
 * @param libero     optional libero player
 * @returns          6 CourtPosition objects
 */
export function getCourtPositions(
  formation: Formation,
  rotation: number,
  phase: Phase,
  starters: PlayerSlot[],
  libero?: PlayerSlot,
): CourtPosition[] {
  const posData = getFormationPositions(formation, rotation, phase);
  const roles = getRoleTemplates(formation);
  const players = getPlayersInRotation(rotation, starters);
  const liberoTarget = getLiberoTarget(formation, rotation, starters, libero);

  return posData.map((pos, i) => {
    const starterIdx = starterIndexAtPosition(i, rotation);
    const rt = roles[starterIdx];
    const isBackRow = i === 0 || i === 4 || i === 5; // P1, P5, P6
    const isServer = i === 0; // P1 always serves

    // If libero is active and this is the replacement target, show libero
    let player = players[i];

    // Guard: if starter slot is empty, render placeholder
    if (!player) {
      return {
        slot: `P${i + 1}`,
        x: pos.x,
        y: pos.y,
        label: rt.label,
        role: rt.role,
        playerId: undefined,
        jerseyNumber: undefined,
        isServer: false,
        isLibero: false,
        isFrontRow: !isBackRow,
      };
    }

    let showAsLibero = false;
    if (libero && liberoTarget && player.playerId === liberoTarget.playerId && isBackRow) {
      player = libero;
      showAsLibero = true;
    }

    return {
      slot: `P${i + 1}`,
      x: pos.x,
      y: pos.y,
      label: showAsLibero ? 'L' : rt.label,
      role: showAsLibero ? 'Libero' : rt.role,
      playerId: player.playerId,
      jerseyNumber: player.jerseyNumber,
      isServer: isServer && phase !== 'serve-receive',
      isLibero: showAsLibero,
      isFrontRow: !isBackRow,
    };
  });
}

// ─── Server identification ──────────────────────────────────────

/**
 * The player at P1 (index 0) in the current rotation is the server.
 */
export function getNextServer(rotation: number, starters: PlayerSlot[]): PlayerSlot | undefined {
  return starters[starterIndexAtPosition(0, rotation)];
}

// ─── Libero logic ───────────────────────────────────────────────

/**
 * Determine which back-row player the libero should replace.
 *
 * Convention:
 * - 5-1 / 6-2: libero replaces the middle blocker who is in the
 *   back row.  If both MBs are back-row (never happens with proper
 *   setup), prefer the one at P6 then P5 then P1.
 * - 6-6: no automatic libero target (coach chooses manually).
 *
 * Returns null if no libero, no valid target, or 6-6 formation.
 */
export function getLiberoTarget(
  formation: Formation,
  rotation: number,
  starters: PlayerSlot[],
  libero?: PlayerSlot,
): PlayerSlot | null {
  if (!libero) return null;
  if (formation === '6-6') return null;

  const roles = getRoleTemplates(formation);
  // Back-row positions: P1 (idx 0), P5 (idx 4), P6 (idx 5)
  const backRowIndices = [0, 5, 4]; // prioritise P1, P6, P5

  for (const posIdx of backRowIndices) {
    const starterIdx = starterIndexAtPosition(posIdx, rotation);
    if (roles[starterIdx].label === 'MB' && starters[starterIdx]) {
      return starters[starterIdx];
    }
  }

  return null;
}

/**
 * Should the libero be on court in this rotation?
 * True when there is a middle blocker in the back row.
 */
export function isLiberoInPlay(
  formation: Formation,
  rotation: number,
  starters: PlayerSlot[],
  libero?: PlayerSlot,
): boolean {
  return getLiberoTarget(formation, rotation, starters, libero) !== null;
}

// ─── Substitution validation ────────────────────────────────────

export interface SubValidation {
  valid: boolean;
  reason?: string;
}

/**
 * Validate a proposed substitution against volleyball rules:
 *
 * 1. Max subs per set not exceeded.
 * 2. Re-entry rule: a player who was subbed out can only re-enter
 *    for the player who replaced them (1-for-1 pairing).
 * 3. Cannot sub the libero through normal substitution (use
 *    libero replacement instead).
 */
export function validateSubstitution(
  playerInId: string,
  playerOutId: string,
  subLog: SubEvent[],
  subsUsed: number,
  maxSubs: number,
  libero?: PlayerSlot,
): SubValidation {
  // Max subs check
  if (subsUsed >= maxSubs) {
    return { valid: false, reason: `Maximum substitutions reached (${maxSubs})` };
  }

  // Cannot sub the libero via normal substitution
  if (libero && (playerInId === libero.playerId || playerOutId === libero.playerId)) {
    return { valid: false, reason: 'Use libero replacement, not a substitution' };
  }

  // Re-entry rule: build sub-pair history from the log
  // For each set, track which pairs have been established
  const pairs = new Map<string, string>(); // playerOut → playerIn (first sub)
  for (const sub of subLog) {
    if (sub.isLibero) continue;
    if (!pairs.has(sub.playerOut)) {
      pairs.set(sub.playerOut, sub.playerIn);
    }
  }

  // If playerIn was previously subbed out, they can only return for
  // the player who replaced them
  if (pairs.has(playerInId)) {
    const allowedReplacementFor = pairs.get(playerInId)!;
    if (playerOutId !== allowedReplacementFor) {
      return {
        valid: false,
        reason: `#${playerInId} can only re-enter for the player who replaced them`,
      };
    }
  }

  // If playerOut was previously subbed in for someone, that someone
  // is the only one who can replace them
  for (const [out, inPlayer] of pairs) {
    if (inPlayer === playerOutId && out !== playerInId) {
      return {
        valid: false,
        reason: `Only the original starter can replace this player`,
      };
    }
  }

  return { valid: true };
}

// ─── Score / side-out logic ─────────────────────────────────────

export interface ScoreResult {
  homeScore: number;
  awayScore: number;
  newRotation: number;
  isServing: boolean;
  rotated: boolean;
  /** Alert message for libero changes, if any */
  liberoAlert?: string;
}

/**
 * Process a point and determine new state.
 *
 * @param pointFor    who scored
 * @param homeScore   current home score
 * @param awayScore   current away score
 * @param rotation    current rotation (1-6)
 * @param isServing   true if we currently have serve
 * @param formation   current formation
 * @param starters    service-order starters
 * @param libero      optional libero
 */
export function processPoint(
  pointFor: 'home' | 'away',
  homeScore: number,
  awayScore: number,
  rotation: number,
  isServing: boolean,
  formation: Formation,
  starters: PlayerSlot[],
  libero?: PlayerSlot,
): ScoreResult {
  let newHome = homeScore;
  let newAway = awayScore;
  let newRotation = rotation;
  let newServing = isServing;
  let rotated = false;
  let liberoAlert: string | undefined;

  if (pointFor === 'home') {
    newHome += 1;
    if (!isServing) {
      // Side-out: we gained serve → rotate
      newServing = true;
      newRotation = rotateClockwise(rotation);
      rotated = true;
    }
  } else {
    newAway += 1;
    if (isServing) {
      // Side-out: they gained serve (no rotation for us)
      newServing = false;
    }
  }

  // Check for libero changes after rotation
  if (rotated && libero) {
    const prevTarget = getLiberoTarget(formation, rotation, starters, libero);
    const newTarget = getLiberoTarget(formation, newRotation, starters, libero);

    if (!prevTarget && newTarget) {
      liberoAlert = `LIBERO IN for #${newTarget.jerseyNumber} ${newTarget.lastName}`;
    } else if (prevTarget && !newTarget) {
      liberoAlert = `LIBERO OUT, #${prevTarget.jerseyNumber} ${prevTarget.lastName} back in`;
    } else if (prevTarget && newTarget && prevTarget.playerId !== newTarget.playerId) {
      liberoAlert = `LIBERO: #${prevTarget.jerseyNumber} back in, replaces #${newTarget.jerseyNumber}`;
    }
  }

  return {
    homeScore: newHome,
    awayScore: newAway,
    newRotation,
    isServing: newServing,
    rotated,
    liberoAlert,
  };
}

// ─── Set / match completion ─────────────────────────────────────

/**
 * Check whether a set is complete.
 */
export function isSetComplete(
  homeScore: number,
  awayScore: number,
  setNumber: number,
  bestOf: 3 | 5,
  pointsToWin: number,
  decidingSetPoints: number,
  pointCap: number,
): boolean {
  const isDecidingSet = setNumber === bestOf;
  const target = isDecidingSet ? decidingSetPoints : pointsToWin;

  // Standard win: reached target with 2-point lead
  if (homeScore >= target && homeScore - awayScore >= 2) return true;
  if (awayScore >= target && awayScore - homeScore >= 2) return true;

  // Point cap (if set)
  if (pointCap > 0) {
    if (homeScore >= pointCap || awayScore >= pointCap) return true;
  }

  return false;
}

/**
 * Determine the set winner.
 */
export function getSetWinner(homeScore: number, awayScore: number): 'home' | 'away' {
  return homeScore > awayScore ? 'home' : 'away';
}

/**
 * Check whether the match is complete (one side has won enough sets).
 */
export function isMatchComplete(
  sets: { winner?: 'home' | 'away'; setComplete: boolean }[],
  bestOf: 3 | 5,
): boolean {
  const setsToWin = Math.ceil(bestOf / 2);
  let homeWins = 0;
  let awayWins = 0;
  for (const s of sets) {
    if (!s.setComplete) continue;
    if (s.winner === 'home') homeWins++;
    else if (s.winner === 'away') awayWins++;
  }
  return homeWins >= setsToWin || awayWins >= setsToWin;
}

/**
 * Get the match winner (call only when isMatchComplete is true).
 */
export function getMatchWinner(
  sets: { winner?: 'home' | 'away'; setComplete: boolean }[],
): 'home' | 'away' {
  let homeWins = 0;
  let awayWins = 0;
  for (const s of sets) {
    if (s.winner === 'home') homeWins++;
    else if (s.winner === 'away') awayWins++;
  }
  return homeWins > awayWins ? 'home' : 'away';
}

// ─── Auto-fill lineup ───────────────────────────────────────────

/**
 * Auto-assign players to formation slots based on their registered
 * position.  Best-effort: fills what it can, leaves gaps for the
 * coach to resolve.
 *
 * Returns a 6-element array (some may be undefined if not enough
 * players for a role).
 */
export function autoFillLineup(
  formation: Formation,
  availablePlayers: PlayerSlot[],
): (PlayerSlot | undefined)[] {
  const roles = getRoleTemplates(formation);
  const result: (PlayerSlot | undefined)[] = new Array(6).fill(undefined);
  const used = new Set<string>();

  // Map player positions to role labels
  const posToRole: Record<string, string> = {
    S: 'S', SET: 'S', SETTER: 'S',
    OPP: 'OPP', RS: 'OPP', OPPOSITE: 'OPP',
    OH: 'OH', OUTSIDE: 'OH',
    MB: 'MB', MH: 'MB', MIDDLE: 'MB',
    L: 'L', LIBERO: 'L',
    DS: 'DS',
    P: 'P',
  };

  // First pass: exact role matches
  for (let i = 0; i < 6; i++) {
    const targetLabel = roles[i].label;
    const match = availablePlayers.find(
      p => !used.has(p.playerId) && posToRole[p.position?.toUpperCase()] === targetLabel,
    );
    if (match) {
      result[i] = match;
      used.add(match.playerId);
    }
  }

  // Second pass: fill remaining with any unused players
  for (let i = 0; i < 6; i++) {
    if (result[i]) continue;
    const match = availablePlayers.find(
      p => !used.has(p.playerId) && posToRole[p.position?.toUpperCase()] !== 'L',
    );
    if (match) {
      result[i] = match;
      used.add(match.playerId);
    }
  }

  return result;
}
