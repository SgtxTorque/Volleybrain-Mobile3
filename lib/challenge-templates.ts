// =============================================================================
// Challenge Templates — Pre-built library of 25 challenges
// =============================================================================

export type ChallengeCategory = 'game' | 'development' | 'fun' | 'team_building' | 'mental' | 'fitness';
export type TrackingType = 'stat_based' | 'verified' | 'timed';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'legendary';
export type MascotPose = 'clipboard' | 'whistle' | 'cheer';

export type ChallengeTemplate = {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  trackingType: TrackingType;
  statKey?: string;
  defaultTarget: number;
  defaultXp: number;
  defaultDurationDays: number;
  difficulty: Difficulty;
  mascotPose: MascotPose;
  icon: string;
  challengeType: 'individual' | 'team';
};

// =============================================================================
// Category metadata
// =============================================================================

export const CHALLENGE_CATEGORIES: Record<ChallengeCategory, {
  label: string;
  emoji: string;
  color: string;
}> = {
  game: { label: 'Game', emoji: '🏐', color: '#EF4444' },
  development: { label: 'Development', emoji: '📈', color: '#3B82F6' },
  fun: { label: 'Fun', emoji: '🎉', color: '#F59E0B' },
  team_building: { label: 'Team Building', emoji: '🤝', color: '#10B981' },
  mental: { label: 'Mental', emoji: '🧠', color: '#8B5CF6' },
  fitness: { label: 'Fitness', emoji: '💪', color: '#EC4899' },
};

export const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  easy: { label: 'Easy', color: '#10B981', bgColor: '#10B98115' },
  medium: { label: 'Medium', color: '#F59E0B', bgColor: '#F59E0B15' },
  hard: { label: 'Hard', color: '#EF4444', bgColor: '#EF444415' },
  legendary: { label: 'Legendary', color: '#A855F7', bgColor: '#A855F715' },
};

// =============================================================================
// 25 Templates
// =============================================================================

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // ─── Game (6) ───────────────────────────────────────────
  {
    id: 'tpl-ace-hunter',
    title: 'Ace Hunter',
    description: 'Get 10 aces across games this week.',
    category: 'game',
    trackingType: 'stat_based',
    statKey: 'total_aces',
    defaultTarget: 10,
    defaultXp: 75,
    defaultDurationDays: 7,
    difficulty: 'medium',
    mascotPose: 'whistle',
    icon: '🎯',
    challengeType: 'individual',
  },
  {
    id: 'tpl-zero-error',
    title: 'Zero Error Game',
    description: 'Play a game with no hitting errors.',
    category: 'game',
    trackingType: 'verified',
    defaultTarget: 1,
    defaultXp: 150,
    defaultDurationDays: 14,
    difficulty: 'hard',
    mascotPose: 'whistle',
    icon: '🛡️',
    challengeType: 'individual',
  },
  {
    id: 'tpl-kill-machine',
    title: 'Kill Machine',
    description: 'Record 25 kills in a tournament.',
    category: 'game',
    trackingType: 'stat_based',
    statKey: 'total_kills',
    defaultTarget: 25,
    defaultXp: 100,
    defaultDurationDays: 7,
    difficulty: 'hard',
    mascotPose: 'whistle',
    icon: '⚡',
    challengeType: 'individual',
  },
  {
    id: 'tpl-serve-streak',
    title: 'Serve Streak',
    description: 'Land 5 consecutive good serves in a match.',
    category: 'game',
    trackingType: 'verified',
    defaultTarget: 5,
    defaultXp: 75,
    defaultDurationDays: 7,
    difficulty: 'medium',
    mascotPose: 'whistle',
    icon: '🏐',
    challengeType: 'individual',
  },
  {
    id: 'tpl-dig-deep',
    title: 'Dig Deep',
    description: '15 digs in a single match.',
    category: 'game',
    trackingType: 'stat_based',
    statKey: 'total_digs',
    defaultTarget: 15,
    defaultXp: 75,
    defaultDurationDays: 7,
    difficulty: 'medium',
    mascotPose: 'whistle',
    icon: '🐱',
    challengeType: 'individual',
  },
  {
    id: 'tpl-block-party',
    title: 'Block Party',
    description: '5 blocks in one game.',
    category: 'game',
    trackingType: 'stat_based',
    statKey: 'total_blocks',
    defaultTarget: 5,
    defaultXp: 100,
    defaultDurationDays: 7,
    difficulty: 'hard',
    mascotPose: 'whistle',
    icon: '🧱',
    challengeType: 'individual',
  },

  // ─── Development (6) ────────────────────────────────────
  {
    id: 'tpl-setting-practice',
    title: 'Setting Practice',
    description: 'Practice setting 15 min daily for a week.',
    category: 'development',
    trackingType: 'timed',
    defaultTarget: 7,
    defaultXp: 50,
    defaultDurationDays: 7,
    difficulty: 'easy',
    mascotPose: 'clipboard',
    icon: '🤲',
    challengeType: 'individual',
  },
  {
    id: 'tpl-wall-ball',
    title: 'Wall Ball Warrior',
    description: '100 wall ball reps outside practice.',
    category: 'development',
    trackingType: 'verified',
    defaultTarget: 100,
    defaultXp: 75,
    defaultDurationDays: 7,
    difficulty: 'medium',
    mascotPose: 'clipboard',
    icon: '🧱',
    challengeType: 'individual',
  },
  {
    id: 'tpl-serve-100',
    title: 'Serve 100',
    description: '100 serve reps at home this week.',
    category: 'development',
    trackingType: 'verified',
    defaultTarget: 100,
    defaultXp: 75,
    defaultDurationDays: 7,
    difficulty: 'medium',
    mascotPose: 'clipboard',
    icon: '🏐',
    challengeType: 'individual',
  },
  {
    id: 'tpl-footwork',
    title: 'Footwork Focus',
    description: '20 min footwork drills daily for 5 days.',
    category: 'development',
    trackingType: 'timed',
    defaultTarget: 5,
    defaultXp: 75,
    defaultDurationDays: 7,
    difficulty: 'medium',
    mascotPose: 'clipboard',
    icon: '👟',
    challengeType: 'individual',
  },
  {
    id: 'tpl-video-study',
    title: 'Video Study',
    description: 'Watch 3 full matches and share what you learned.',
    category: 'development',
    trackingType: 'verified',
    defaultTarget: 3,
    defaultXp: 50,
    defaultDurationDays: 14,
    difficulty: 'easy',
    mascotPose: 'clipboard',
    icon: '📺',
    challengeType: 'individual',
  },
  {
    id: 'tpl-passing-perfection',
    title: 'Passing Perfection',
    description: '50 perfect passes at practice.',
    category: 'development',
    trackingType: 'verified',
    defaultTarget: 50,
    defaultXp: 75,
    defaultDurationDays: 14,
    difficulty: 'medium',
    mascotPose: 'clipboard',
    icon: '🎯',
    challengeType: 'individual',
  },

  // ─── Fun (4) ────────────────────────────────────────────
  {
    id: 'tpl-loudest-cheer',
    title: 'Loudest Cheerleader',
    description: 'Most vocal on the bench for 3 games.',
    category: 'fun',
    trackingType: 'verified',
    defaultTarget: 3,
    defaultXp: 50,
    defaultDurationDays: 14,
    difficulty: 'easy',
    mascotPose: 'cheer',
    icon: '📣',
    challengeType: 'individual',
  },
  {
    id: 'tpl-hype-squad',
    title: 'Hype Squad',
    description: 'Give 5 shoutouts to teammates this week.',
    category: 'fun',
    trackingType: 'stat_based',
    statKey: 'total_shoutouts',
    defaultTarget: 5,
    defaultXp: 50,
    defaultDurationDays: 7,
    difficulty: 'easy',
    mascotPose: 'cheer',
    icon: '🔥',
    challengeType: 'individual',
  },
  {
    id: 'tpl-new-handshake',
    title: 'New Handshake',
    description: 'Create a team handshake with a teammate.',
    category: 'fun',
    trackingType: 'verified',
    defaultTarget: 1,
    defaultXp: 25,
    defaultDurationDays: 7,
    difficulty: 'easy',
    mascotPose: 'cheer',
    icon: '🤝',
    challengeType: 'individual',
  },
  {
    id: 'tpl-photo-day',
    title: 'Photo Day',
    description: 'Get a teammate action photo of you.',
    category: 'fun',
    trackingType: 'verified',
    defaultTarget: 1,
    defaultXp: 25,
    defaultDurationDays: 7,
    difficulty: 'easy',
    mascotPose: 'cheer',
    icon: '📸',
    challengeType: 'individual',
  },

  // ─── Team Building (4) ──────────────────────────────────
  {
    id: 'tpl-full-house',
    title: 'Full House',
    description: 'Everyone RSVPs to the next 3 events.',
    category: 'team_building',
    trackingType: 'verified',
    defaultTarget: 3,
    defaultXp: 100,
    defaultDurationDays: 21,
    difficulty: 'medium',
    mascotPose: 'clipboard',
    icon: '🏠',
    challengeType: 'team',
  },
  {
    id: 'tpl-100-club',
    title: '100 Club',
    description: 'Collect 100 total kills as a team this month.',
    category: 'team_building',
    trackingType: 'stat_based',
    statKey: 'total_kills',
    defaultTarget: 100,
    defaultXp: 150,
    defaultDurationDays: 30,
    difficulty: 'hard',
    mascotPose: 'whistle',
    icon: '💯',
    challengeType: 'team',
  },
  {
    id: 'tpl-practice-perfect',
    title: 'Practice Perfect',
    description: '100% attendance for 2 weeks.',
    category: 'team_building',
    trackingType: 'verified',
    defaultTarget: 1,
    defaultXp: 150,
    defaultDurationDays: 14,
    difficulty: 'hard',
    mascotPose: 'clipboard',
    icon: '✅',
    challengeType: 'team',
  },
  {
    id: 'tpl-spirit-chain',
    title: 'Spirit Chain',
    description: 'Every player gives a shoutout to every other player.',
    category: 'team_building',
    trackingType: 'verified',
    defaultTarget: 1,
    defaultXp: 200,
    defaultDurationDays: 30,
    difficulty: 'legendary',
    mascotPose: 'cheer',
    icon: '⛓️',
    challengeType: 'team',
  },

  // ─── Mental (3) ─────────────────────────────────────────
  {
    id: 'tpl-bounce-back',
    title: 'Bounce Back',
    description: 'After losing a set, win the next one.',
    category: 'mental',
    trackingType: 'verified',
    defaultTarget: 1,
    defaultXp: 75,
    defaultDurationDays: 14,
    difficulty: 'medium',
    mascotPose: 'whistle',
    icon: '💎',
    challengeType: 'individual',
  },
  {
    id: 'tpl-calm-pressure',
    title: 'Calm Under Pressure',
    description: 'No unforced errors in a deciding set.',
    category: 'mental',
    trackingType: 'verified',
    defaultTarget: 1,
    defaultXp: 100,
    defaultDurationDays: 14,
    difficulty: 'hard',
    mascotPose: 'whistle',
    icon: '🧊',
    challengeType: 'individual',
  },
  {
    id: 'tpl-captains-log',
    title: "Captain's Log",
    description: 'Write a 3-sentence reflection after each game for 4 weeks.',
    category: 'mental',
    trackingType: 'verified',
    defaultTarget: 4,
    defaultXp: 75,
    defaultDurationDays: 28,
    difficulty: 'medium',
    mascotPose: 'clipboard',
    icon: '📝',
    challengeType: 'individual',
  },

  // ─── Fitness (2) ────────────────────────────────────────
  {
    id: 'tpl-plank',
    title: 'Plank Challenge',
    description: 'Hold a plank for 2 minutes.',
    category: 'fitness',
    trackingType: 'timed',
    defaultTarget: 120,
    defaultXp: 50,
    defaultDurationDays: 7,
    difficulty: 'medium',
    mascotPose: 'whistle',
    icon: '🏋️',
    challengeType: 'individual',
  },
  {
    id: 'tpl-endurance-run',
    title: 'Endurance Run',
    description: 'Run 1 mile under 8 minutes.',
    category: 'fitness',
    trackingType: 'timed',
    defaultTarget: 1,
    defaultXp: 50,
    defaultDurationDays: 7,
    difficulty: 'medium',
    mascotPose: 'whistle',
    icon: '🏃',
    challengeType: 'individual',
  },
];

// =============================================================================
// Helpers
// =============================================================================

export function getTemplatesByCategory(category: ChallengeCategory): ChallengeTemplate[] {
  return CHALLENGE_TEMPLATES.filter(t => t.category === category);
}

export function getTemplateById(id: string): ChallengeTemplate | undefined {
  return CHALLENGE_TEMPLATES.find(t => t.id === id);
}
