// ============================================================================
// SCORING FORMAT CONFIGURATIONS — Ported from web-admin GameScoringModal.jsx
// ============================================================================

// --- Types ---

export type VolleyballFormat = {
  id: string;
  name: string;
  description: string;
  setsToWin: number | null;
  maxSets: number;
  setScores: number[];
  winByTwo: boolean;
  caps: number[];
  noMatchWinner?: boolean;
};

export type PeriodFormat = {
  id: string;
  name: string;
  description: string;
  periods: number;
  periodName: string;
  periodAbbr: string;
  hasOvertime?: boolean;
  overtimeName?: string;
  hasExtras?: boolean;
  extrasName?: string;
  allowTie?: boolean;
};

export type ScoringFormat = VolleyballFormat | PeriodFormat;

export type SportScoringConfig = {
  name: string;
  icon: string;
  isSetBased: boolean;
  formats: ScoringFormat[];
};

// --- Helper: type guards ---

export function isVolleyballFormat(f: ScoringFormat): f is VolleyballFormat {
  return 'maxSets' in f;
}

export function isPeriodFormat(f: ScoringFormat): f is PeriodFormat {
  return 'periods' in f;
}

// --- Configs ---

export const SCORING_CONFIGS: Record<string, SportScoringConfig> = {
  volleyball: {
    name: 'Volleyball',
    icon: '🏐',
    isSetBased: true,
    formats: [
      {
        id: 'best_of_3',
        name: 'Best of 3 Sets',
        description: 'Youth/Recreational - First to win 2 sets',
        setsToWin: 2,
        maxSets: 3,
        setScores: [25, 25, 15],
        winByTwo: true,
        caps: [30, 30, 20],
      },
      {
        id: 'best_of_5',
        name: 'Best of 5 Sets',
        description: 'Competitive/High School - First to win 3 sets',
        setsToWin: 3,
        maxSets: 5,
        setScores: [25, 25, 25, 25, 15],
        winByTwo: true,
        caps: [30, 30, 30, 30, 20],
      },
      {
        id: 'two_sets',
        name: '2 Sets (No Winner)',
        description: 'Recreational - Play 2 sets, no match winner',
        setsToWin: null,
        maxSets: 2,
        setScores: [25, 25],
        winByTwo: true,
        caps: [30, 30],
        noMatchWinner: true,
      },
      {
        id: 'rally_scoring',
        name: 'Rally to 21',
        description: 'Quick format - Sets to 21',
        setsToWin: 2,
        maxSets: 3,
        setScores: [21, 21, 15],
        winByTwo: true,
        caps: [25, 25, 20],
      },
    ],
  },
  basketball: {
    name: 'Basketball',
    icon: '🏀',
    isSetBased: false,
    formats: [
      {
        id: 'four_quarters',
        name: '4 Quarters',
        description: 'Standard game with 4 quarters',
        periods: 4,
        periodName: 'Quarter',
        periodAbbr: 'Q',
        hasOvertime: true,
        overtimeName: 'OT',
      },
      {
        id: 'two_halves',
        name: '2 Halves',
        description: 'College/simplified format',
        periods: 2,
        periodName: 'Half',
        periodAbbr: 'H',
        hasOvertime: true,
        overtimeName: 'OT',
      },
    ],
  },
  soccer: {
    name: 'Soccer',
    icon: '⚽',
    isSetBased: false,
    formats: [
      {
        id: 'two_halves',
        name: '2 Halves',
        description: 'Standard soccer match',
        periods: 2,
        periodName: 'Half',
        periodAbbr: 'H',
        hasOvertime: false,
        allowTie: true,
      },
      {
        id: 'four_quarters',
        name: '4 Quarters',
        description: 'Youth format with quarters',
        periods: 4,
        periodName: 'Quarter',
        periodAbbr: 'Q',
        hasOvertime: false,
        allowTie: true,
      },
    ],
  },
  baseball: {
    name: 'Baseball',
    icon: '⚾',
    isSetBased: false,
    formats: [
      {
        id: 'six_innings',
        name: '6 Innings',
        description: 'Youth baseball (Little League)',
        periods: 6,
        periodName: 'Inning',
        periodAbbr: 'Inn',
        hasExtras: true,
        extrasName: 'Extra Innings',
      },
      {
        id: 'seven_innings',
        name: '7 Innings',
        description: 'Middle/High school',
        periods: 7,
        periodName: 'Inning',
        periodAbbr: 'Inn',
        hasExtras: true,
        extrasName: 'Extra Innings',
      },
      {
        id: 'nine_innings',
        name: '9 Innings',
        description: 'Standard baseball',
        periods: 9,
        periodName: 'Inning',
        periodAbbr: 'Inn',
        hasExtras: true,
        extrasName: 'Extra Innings',
      },
    ],
  },
  softball: {
    name: 'Softball',
    icon: '🥎',
    isSetBased: false,
    formats: [
      {
        id: 'five_innings',
        name: '5 Innings',
        description: 'Youth softball',
        periods: 5,
        periodName: 'Inning',
        periodAbbr: 'Inn',
        hasExtras: true,
      },
      {
        id: 'seven_innings',
        name: '7 Innings',
        description: 'Standard softball',
        periods: 7,
        periodName: 'Inning',
        periodAbbr: 'Inn',
        hasExtras: true,
      },
    ],
  },
  football: {
    name: 'Football',
    icon: '🏈',
    isSetBased: false,
    formats: [
      {
        id: 'four_quarters',
        name: '4 Quarters',
        description: 'Standard game',
        periods: 4,
        periodName: 'Quarter',
        periodAbbr: 'Q',
        hasOvertime: true,
        overtimeName: 'OT',
      },
    ],
  },
  hockey: {
    name: 'Hockey',
    icon: '🏒',
    isSetBased: false,
    formats: [
      {
        id: 'three_periods',
        name: '3 Periods',
        description: 'Standard hockey game',
        periods: 3,
        periodName: 'Period',
        periodAbbr: 'P',
        hasOvertime: true,
        overtimeName: 'OT',
      },
    ],
  },
};

// --- Lookup ---

export function getScoringConfig(sportName: string): SportScoringConfig {
  const key = sportName.toLowerCase();
  return SCORING_CONFIGS[key] || SCORING_CONFIGS.volleyball;
}

// --- Helpers (ported from web-admin GameScoringModal.jsx lines 368-453) ---

export function isSetComplete(
  ourScore: number,
  theirScore: number,
  targetScore: number,
  cap: number | null,
  winByTwo: boolean,
): boolean {
  if (ourScore < targetScore && theirScore < targetScore) return false;

  if (winByTwo) {
    const diff = Math.abs(ourScore - theirScore);
    if (cap && (ourScore >= cap || theirScore >= cap)) {
      return diff >= 1; // At cap, just need to be ahead
    }
    return diff >= 2 && (ourScore >= targetScore || theirScore >= targetScore);
  }

  return ourScore >= targetScore || theirScore >= targetScore;
}

export function getSetWinner(
  ourScore: number,
  theirScore: number,
  targetScore: number,
  cap: number | null,
  winByTwo: boolean,
): 'us' | 'them' | null {
  if (!isSetComplete(ourScore, theirScore, targetScore, cap, winByTwo)) return null;
  return ourScore > theirScore ? 'us' : 'them';
}

export type SetScore = { our: number; their: number };

export function calculateMatchResult(
  setScores: SetScore[],
  format: VolleyballFormat,
): {
  result: 'win' | 'loss' | 'tie' | 'in_progress' | 'none';
  ourSetsWon: number;
  theirSetsWon: number;
  ourTotalPoints: number;
  theirTotalPoints: number;
  pointDifferential: number;
} {
  if (format.noMatchWinner) {
    const ourTotal = setScores.reduce((sum, s) => sum + (s.our || 0), 0);
    const theirTotal = setScores.reduce((sum, s) => sum + (s.their || 0), 0);
    return {
      result: 'none',
      ourSetsWon: 0,
      theirSetsWon: 0,
      ourTotalPoints: ourTotal,
      theirTotalPoints: theirTotal,
      pointDifferential: ourTotal - theirTotal,
    };
  }

  let ourSetsWon = 0;
  let theirSetsWon = 0;
  let ourTotalPoints = 0;
  let theirTotalPoints = 0;

  setScores.forEach((set, idx) => {
    const targetScore = format.setScores[idx] ?? format.setScores[format.setScores.length - 1];
    const cap = format.caps?.[idx] ?? format.caps?.[format.caps.length - 1] ?? null;
    const winner = getSetWinner(set.our || 0, set.their || 0, targetScore, cap, format.winByTwo);

    if (winner === 'us') ourSetsWon++;
    if (winner === 'them') theirSetsWon++;

    ourTotalPoints += set.our || 0;
    theirTotalPoints += set.their || 0;
  });

  let result: 'win' | 'loss' | 'tie' | 'in_progress' = 'in_progress';
  if (format.setsToWin !== null) {
    if (ourSetsWon >= format.setsToWin) result = 'win';
    else if (theirSetsWon >= format.setsToWin) result = 'loss';
  }

  return {
    result,
    ourSetsWon,
    theirSetsWon,
    ourTotalPoints,
    theirTotalPoints,
    pointDifferential: ourTotalPoints - theirTotalPoints,
  };
}

export function calculatePeriodResult(
  periodScores: SetScore[],
  format: PeriodFormat,
): {
  result: 'win' | 'loss' | 'tie' | 'in_progress';
  ourTotalPoints: number;
  theirTotalPoints: number;
  pointDifferential: number;
} {
  let ourTotal = 0;
  let theirTotal = 0;

  periodScores.forEach(p => {
    ourTotal += p.our || 0;
    theirTotal += p.their || 0;
  });

  let result: 'win' | 'loss' | 'tie' | 'in_progress' = 'in_progress';
  if (ourTotal > theirTotal) result = 'win';
  else if (theirTotal > ourTotal) result = 'loss';
  else if (format.allowTie) result = 'tie';

  return {
    result,
    ourTotalPoints: ourTotal,
    theirTotalPoints: theirTotal,
    pointDifferential: ourTotal - theirTotal,
  };
}
