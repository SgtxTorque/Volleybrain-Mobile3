// ============================================================================
// SPORT FORMATION CONFIGURATIONS
// ============================================================================

export type PositionDef = {
  position: number;
  label: string;
  color: string;
};

export type FormationConfig = {
  id: string;
  name: string;
  sport: string;
  positions: PositionDef[];
  courtType: 'volleyball' | 'basketball' | 'soccer' | 'generic';
};

// ============================================================================
// VOLLEYBALL FORMATIONS (6 positions)
// ============================================================================

const VOLLEYBALL_FORMATIONS: FormationConfig[] = [
  {
    id: '5-1',
    name: '5-1 Offense',
    sport: 'volleyball',
    courtType: 'volleyball',
    positions: [
      { position: 1, label: 'OH', color: '#EF4444' },
      { position: 2, label: 'OPP', color: '#6366F1' },
      { position: 3, label: 'MB', color: '#F59E0B' },
      { position: 4, label: 'OH', color: '#EF4444' },
      { position: 5, label: 'MB', color: '#F59E0B' },
      { position: 6, label: 'S', color: '#10B981' },
    ],
  },
  {
    id: '6-2',
    name: '6-2 Offense',
    sport: 'volleyball',
    courtType: 'volleyball',
    positions: [
      { position: 1, label: 'S', color: '#10B981' },
      { position: 2, label: 'OH', color: '#EF4444' },
      { position: 3, label: 'MB', color: '#F59E0B' },
      { position: 4, label: 'OH', color: '#EF4444' },
      { position: 5, label: 'MB', color: '#F59E0B' },
      { position: 6, label: 'S', color: '#10B981' },
    ],
  },
  {
    id: '4-2',
    name: '4-2 Simple',
    sport: 'volleyball',
    courtType: 'volleyball',
    positions: [
      { position: 1, label: 'S', color: '#10B981' },
      { position: 2, label: 'H', color: '#EF4444' },
      { position: 3, label: 'H', color: '#EF4444' },
      { position: 4, label: 'S', color: '#10B981' },
      { position: 5, label: 'H', color: '#EF4444' },
      { position: 6, label: 'H', color: '#EF4444' },
    ],
  },
  {
    id: '6-6',
    name: '6-6 Rec',
    sport: 'volleyball',
    courtType: 'volleyball',
    positions: [
      { position: 1, label: 'P1', color: '#EF4444' },
      { position: 2, label: 'P2', color: '#6366F1' },
      { position: 3, label: 'P3', color: '#F59E0B' },
      { position: 4, label: 'P4', color: '#10B981' },
      { position: 5, label: 'P5', color: '#0EA5E9' },
      { position: 6, label: 'P6', color: '#A855F7' },
    ],
  },
];

// ============================================================================
// BASKETBALL FORMATIONS (5 positions)
// ============================================================================

const BASKETBALL_FORMATIONS: FormationConfig[] = [
  {
    id: 'standard',
    name: 'Standard',
    sport: 'basketball',
    courtType: 'basketball',
    positions: [
      { position: 1, label: 'PG', color: '#EF4444' },
      { position: 2, label: 'SG', color: '#6366F1' },
      { position: 3, label: 'SF', color: '#F59E0B' },
      { position: 4, label: 'PF', color: '#10B981' },
      { position: 5, label: 'C', color: '#0EA5E9' },
    ],
  },
  {
    id: 'small_ball',
    name: 'Small Ball',
    sport: 'basketball',
    courtType: 'basketball',
    positions: [
      { position: 1, label: 'PG', color: '#EF4444' },
      { position: 2, label: 'SG', color: '#6366F1' },
      { position: 3, label: 'SF', color: '#F59E0B' },
      { position: 4, label: 'SF', color: '#F59E0B' },
      { position: 5, label: 'PF', color: '#10B981' },
    ],
  },
];

// ============================================================================
// SOCCER FORMATIONS (11 positions)
// ============================================================================

const SOCCER_FORMATIONS: FormationConfig[] = [
  {
    id: '4-4-2',
    name: '4-4-2',
    sport: 'soccer',
    courtType: 'soccer',
    positions: [
      { position: 1, label: 'GK', color: '#F59E0B' },
      { position: 2, label: 'LB', color: '#3B82F6' },
      { position: 3, label: 'CB', color: '#3B82F6' },
      { position: 4, label: 'CB', color: '#3B82F6' },
      { position: 5, label: 'RB', color: '#3B82F6' },
      { position: 6, label: 'LM', color: '#10B981' },
      { position: 7, label: 'CM', color: '#10B981' },
      { position: 8, label: 'CM', color: '#10B981' },
      { position: 9, label: 'RM', color: '#10B981' },
      { position: 10, label: 'ST', color: '#EF4444' },
      { position: 11, label: 'ST', color: '#EF4444' },
    ],
  },
  {
    id: '4-3-3',
    name: '4-3-3',
    sport: 'soccer',
    courtType: 'soccer',
    positions: [
      { position: 1, label: 'GK', color: '#F59E0B' },
      { position: 2, label: 'LB', color: '#3B82F6' },
      { position: 3, label: 'CB', color: '#3B82F6' },
      { position: 4, label: 'CB', color: '#3B82F6' },
      { position: 5, label: 'RB', color: '#3B82F6' },
      { position: 6, label: 'CM', color: '#10B981' },
      { position: 7, label: 'CM', color: '#10B981' },
      { position: 8, label: 'CM', color: '#10B981' },
      { position: 9, label: 'LW', color: '#EF4444' },
      { position: 10, label: 'ST', color: '#EF4444' },
      { position: 11, label: 'RW', color: '#EF4444' },
    ],
  },
  {
    id: '3-5-2',
    name: '3-5-2',
    sport: 'soccer',
    courtType: 'soccer',
    positions: [
      { position: 1, label: 'GK', color: '#F59E0B' },
      { position: 2, label: 'CB', color: '#3B82F6' },
      { position: 3, label: 'CB', color: '#3B82F6' },
      { position: 4, label: 'CB', color: '#3B82F6' },
      { position: 5, label: 'LM', color: '#10B981' },
      { position: 6, label: 'CM', color: '#10B981' },
      { position: 7, label: 'CM', color: '#10B981' },
      { position: 8, label: 'CM', color: '#10B981' },
      { position: 9, label: 'RM', color: '#10B981' },
      { position: 10, label: 'ST', color: '#EF4444' },
      { position: 11, label: 'ST', color: '#EF4444' },
    ],
  },
];

// ============================================================================
// GENERIC / FALLBACK (use position numbers)
// ============================================================================

const GENERIC_FORMATIONS: FormationConfig[] = [
  {
    id: 'generic_6',
    name: 'Standard',
    sport: 'generic',
    courtType: 'generic',
    positions: [
      { position: 1, label: 'P1', color: '#EF4444' },
      { position: 2, label: 'P2', color: '#6366F1' },
      { position: 3, label: 'P3', color: '#F59E0B' },
      { position: 4, label: 'P4', color: '#10B981' },
      { position: 5, label: 'P5', color: '#0EA5E9' },
      { position: 6, label: 'P6', color: '#A855F7' },
    ],
  },
];

// ============================================================================
// LOOKUP
// ============================================================================

export const SPORT_FORMATIONS: Record<string, FormationConfig[]> = {
  volleyball: VOLLEYBALL_FORMATIONS,
  basketball: BASKETBALL_FORMATIONS,
  soccer: SOCCER_FORMATIONS,
};

export function getFormationsForSport(sportName?: string | null): FormationConfig[] {
  if (!sportName) return VOLLEYBALL_FORMATIONS;
  const key = sportName.toLowerCase();
  return SPORT_FORMATIONS[key] || GENERIC_FORMATIONS;
}

export function getFormationById(sportName: string | null | undefined, formationId: string): FormationConfig | null {
  const formations = getFormationsForSport(sportName);
  return formations.find(f => f.id === formationId) || formations[0] || null;
}

/**
 * Get the court row layout for a formation's court type.
 * Returns arrays of position indices for each row (top to bottom on screen).
 */
export function getCourtRows(formation: FormationConfig): number[][] {
  switch (formation.courtType) {
    case 'volleyball':
      // Front: P4, P3, P2 | Back: P5, P6, P1
      return [[4, 3, 2], [5, 6, 1]];
    case 'basketball':
      // Front: SF, PF, C | Back: PG, SG
      return [[3, 5, 4], [1, 2]];
    case 'soccer':
      // Group by position label type: GK -> DEF -> MID -> FWD
      return getSoccerRows(formation);
    default:
      // Generic: split into 2 rows
      const half = Math.ceil(formation.positions.length / 2);
      return [
        formation.positions.slice(0, half).map(p => p.position),
        formation.positions.slice(half).map(p => p.position),
      ];
  }
}

function getSoccerRows(formation: FormationConfig): number[][] {
  const gk: number[] = [];
  const def: number[] = [];
  const mid: number[] = [];
  const fwd: number[] = [];

  for (const pos of formation.positions) {
    const label = pos.label.toUpperCase();
    if (label === 'GK') gk.push(pos.position);
    else if (['LB', 'CB', 'RB', 'SW'].includes(label)) def.push(pos.position);
    else if (['LM', 'CM', 'RM', 'CDM', 'CAM'].includes(label)) mid.push(pos.position);
    else fwd.push(pos.position);
  }

  // Top to bottom: FWD -> MID -> DEF -> GK (attack at top, goal at bottom)
  const rows: number[][] = [];
  if (fwd.length > 0) rows.push(fwd);
  if (mid.length > 0) rows.push(mid);
  if (def.length > 0) rows.push(def);
  if (gk.length > 0) rows.push(gk);
  return rows;
}
