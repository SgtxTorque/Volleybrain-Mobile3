// =============================================================================
// Engagement System — Constants
// =============================================================================

/** V2 XP level thresholds — 30 levels, exponential curve
 *  xpRequired = XP needed for THIS level (delta, not cumulative)
 *  cumulative = total XP to reach this level
 *  tier = tier name at this level
 *  See: LYNX-ENGAGEMENT-SYSTEM-V2.md Section 3.3 */
export const XP_LEVELS = [
  { level: 1,  xpRequired: 0,     cumulative: 0,      tier: 'Rookie' },
  { level: 2,  xpRequired: 100,   cumulative: 100,    tier: 'Rookie' },
  { level: 3,  xpRequired: 150,   cumulative: 250,    tier: 'Rookie' },
  { level: 4,  xpRequired: 200,   cumulative: 450,    tier: 'Rookie' },
  { level: 5,  xpRequired: 250,   cumulative: 700,    tier: 'Bronze' },
  { level: 6,  xpRequired: 300,   cumulative: 1000,   tier: 'Bronze' },
  { level: 7,  xpRequired: 400,   cumulative: 1400,   tier: 'Bronze' },
  { level: 8,  xpRequired: 500,   cumulative: 1900,   tier: 'Bronze' },
  { level: 9,  xpRequired: 600,   cumulative: 2500,   tier: 'Silver' },
  { level: 10, xpRequired: 700,   cumulative: 3200,   tier: 'Silver' },
  { level: 11, xpRequired: 800,   cumulative: 4000,   tier: 'Silver' },
  { level: 12, xpRequired: 900,   cumulative: 4900,   tier: 'Silver' },
  { level: 13, xpRequired: 1100,  cumulative: 6000,   tier: 'Gold' },
  { level: 14, xpRequired: 1300,  cumulative: 7300,   tier: 'Gold' },
  { level: 15, xpRequired: 1500,  cumulative: 8800,   tier: 'Gold' },
  { level: 16, xpRequired: 1700,  cumulative: 10500,  tier: 'Gold' },
  { level: 17, xpRequired: 2000,  cumulative: 12500,  tier: 'Platinum' },
  { level: 18, xpRequired: 2300,  cumulative: 14800,  tier: 'Platinum' },
  { level: 19, xpRequired: 2700,  cumulative: 17500,  tier: 'Platinum' },
  { level: 20, xpRequired: 3000,  cumulative: 20500,  tier: 'Platinum' },
  { level: 21, xpRequired: 3500,  cumulative: 24000,  tier: 'Diamond' },
  { level: 22, xpRequired: 4000,  cumulative: 28000,  tier: 'Diamond' },
  { level: 23, xpRequired: 4500,  cumulative: 32500,  tier: 'Diamond' },
  { level: 24, xpRequired: 5000,  cumulative: 37500,  tier: 'Diamond' },
  { level: 25, xpRequired: 5500,  cumulative: 43000,  tier: 'Legend' },
  { level: 26, xpRequired: 6000,  cumulative: 49000,  tier: 'Legend' },
  { level: 27, xpRequired: 7000,  cumulative: 56000,  tier: 'Legend' },
  { level: 28, xpRequired: 8000,  cumulative: 64000,  tier: 'Legend' },
  { level: 29, xpRequired: 9000,  cumulative: 73000,  tier: 'Legend' },
  { level: 30, xpRequired: 10000, cumulative: 83000,  tier: 'Legend' },
] as const;

export const MAX_LEVEL = 30;

/** XP awarded by rarity tier */
export const XP_BY_RARITY: Record<string, number> = {
  common: 25,
  uncommon: 50,
  rare: 100,
  epic: 200,
  legendary: 500,
};

/** XP awarded for engagement actions */
export const XP_BY_SOURCE: Record<string, number> = {
  // Player actions
  shoutout_given: 10,
  shoutout_received: 15,
  challenge_completed: 50,
  challenge_won: 100,
  game_played: 10,
  practice_attended: 5,
  // Coach actions
  game_stats_entered: 15,
  evaluation_completed: 20,
  challenge_created: 15,
  game_won: 25,
  blast_sent: 10,
  // Parent actions
  rsvp_submitted: 5,
  payment_on_time: 15,
  volunteer_signup: 20,
  photo_uploaded: 5,
  referral_completed: 50,
  // Admin actions
  registration_processed: 5,
  season_completed: 100,
  // Universal
  team_wall_post: 10,
  daily_login: 2,
};

/** V2 level tier visual config — 7 tiers */
export const LEVEL_TIERS = [
  { min: 1,  max: 4,  name: 'Rookie',   color: '#94A3B8', bgColor: '#94A3B820' },
  { min: 5,  max: 8,  name: 'Bronze',   color: '#CD7F32', bgColor: '#CD7F3220' },
  { min: 9,  max: 12, name: 'Silver',   color: '#C0C0C0', bgColor: '#C0C0C020' },
  { min: 13, max: 16, name: 'Gold',     color: '#FFD700', bgColor: '#FFD70020' },
  { min: 17, max: 20, name: 'Platinum', color: '#E5E4E2', bgColor: '#E5E4E220' },
  { min: 21, max: 24, name: 'Diamond',  color: '#B9F2FF', bgColor: '#B9F2FF20' },
  { min: 25, max: 30, name: 'Legend',   color: '#FF6B35', bgColor: '#FF6B3520' },
] as const;

/** Calculate level info from total XP — SINGLE SOURCE OF TRUTH
 *  Returns superset of both old shapes so all consumers work. */
export function getLevelFromXP(totalXp: number): {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  progress: number;
  tier: string;
  xpToNext: number;
} {
  let currentLevel = 1;
  for (const entry of XP_LEVELS) {
    if (totalXp >= entry.cumulative) {
      currentLevel = entry.level;
    } else {
      break;
    }
  }

  const currentEntry = XP_LEVELS[currentLevel - 1];
  const nextEntry = currentLevel < MAX_LEVEL ? XP_LEVELS[currentLevel] : null;
  const nextCumulative = nextEntry ? nextEntry.cumulative : currentEntry.cumulative;
  const xpIntoLevel = totalXp - currentEntry.cumulative;
  const xpNeeded = nextCumulative - currentEntry.cumulative;
  const progress = xpNeeded > 0 ? Math.min((xpIntoLevel / xpNeeded) * 100, 100) : 100;

  return {
    level: currentLevel,
    currentXp: totalXp,
    nextLevelXp: nextCumulative,
    progress,
    tier: currentEntry.tier,
    xpToNext: nextEntry ? nextEntry.cumulative - totalXp : 0,
  };
}

/** Get tier config for a given level */
export function getLevelTier(level: number) {
  return LEVEL_TIERS.find((t) => level >= t.min && level <= t.max) || LEVEL_TIERS[0];
}

/** Check if adding XP causes a level-up */
export function checkLevelUp(oldXp: number, newXp: number): { leveledUp: boolean; oldLevel: number; newLevel: number } {
  const oldLevel = getLevelFromXP(oldXp).level;
  const newLevel = getLevelFromXP(newXp).level;
  return { leveledUp: newLevel > oldLevel, oldLevel, newLevel };
}

/** Default shoutout categories (mirrors SQL seed, for use in app before DB fetch) */
export const DEFAULT_SHOUTOUT_CATEGORIES = [
  { name: 'Great Effort', emoji: '💪', color: '#E74C3C', description: 'Gave 100% effort' },
  { name: 'Leadership', emoji: '👑', color: '#F39C12', description: 'Showed leadership on and off the court' },
  { name: 'Most Improved', emoji: '📈', color: '#27AE60', description: 'Noticeably leveling up their game' },
  { name: 'Team Player', emoji: '🤝', color: '#3498DB', description: 'Puts the team first' },
  { name: 'Clutch Player', emoji: '🎯', color: '#9B59B6', description: 'Performs under pressure' },
  { name: 'Hardest Worker', emoji: '🔥', color: '#E67E22', description: 'Outworks everyone' },
  { name: 'Great Communication', emoji: '📣', color: '#1ABC9C', description: 'Calls the ball, talks on the court' },
  { name: 'Positive Attitude', emoji: '☀️', color: '#F1C40F', description: 'Always uplifting, never negative' },
  { name: 'Sportsmanship', emoji: '🏅', color: '#2ECC71', description: 'Respects opponents, refs, teammates' },
  { name: 'Coachable', emoji: '🧠', color: '#8E44AD', description: 'Listens, applies feedback, grows' },
] as const;

/** V2 Engagement Categories — the 5 parent categories for all badges
 *  See: LYNX-ENGAGEMENT-SYSTEM-V2.md Section 2 */
export const ENGAGEMENT_CATEGORIES: Record<string, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  stat:      { label: 'Stat Badges',      icon: 'stats-chart',     color: '#EF4444', description: 'Auto-earned from game performance' },
  milestone: { label: 'Milestones',        icon: 'ribbon',          color: '#6366F1', description: 'Auto-earned from showing up' },
  coach:     { label: 'Coach Badges',      icon: 'clipboard',       color: '#F59E0B', description: 'Coach-awarded and challenge completion' },
  journey:   { label: 'Journey Badges',    icon: 'map',             color: '#10B981', description: 'Earned from skill path progress' },
  community: { label: 'Community',         icon: 'people-circle',   color: '#EC4899', description: 'Social actions and discovery' },
};

/** Achievement categories with icons and colors (all roles) */
export const ACHIEVEMENT_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  // Player categories
  Offensive: { label: 'Offensive', icon: 'flash', color: '#FF3B3B' },
  Defensive: { label: 'Defensive', icon: 'shield', color: '#3B82F6' },
  Playmaker: { label: 'Playmaker', icon: 'people', color: '#10B981' },
  Heart: { label: 'Heart', icon: 'heart', color: '#EC4899' },
  Community: { label: 'Community', icon: 'megaphone', color: '#F59E0B' },
  Elite: { label: 'Elite', icon: 'diamond', color: '#FFD700' },
  // Coach categories
  Coaching: { label: 'Coaching', icon: 'clipboard', color: '#6366F1' },
  Management: { label: 'Management', icon: 'settings', color: '#64748B' },
  Development: { label: 'Development', icon: 'trending-up', color: '#10B981' },
  Winning: { label: 'Winning', icon: 'trophy', color: '#F59E0B' },
  Engagement: { label: 'Engagement', icon: 'chatbubbles', color: '#EC4899' },
  Communication: { label: 'Communication', icon: 'megaphone', color: '#3B82F6' },
  Career: { label: 'Career', icon: 'ribbon', color: '#8B5CF6' },
  // Parent categories
  Reliability: { label: 'Reliability', icon: 'checkmark-circle', color: '#22C55E' },
  Financial: { label: 'Financial', icon: 'wallet', color: '#10B981' },
  Volunteer: { label: 'Volunteer', icon: 'hand-left', color: '#F97316' },
  Social: { label: 'Social', icon: 'share-social', color: '#EC4899' },
  Referral: { label: 'Referral', icon: 'gift', color: '#8B5CF6' },
  Loyalty: { label: 'Loyalty', icon: 'heart-circle', color: '#EF4444' },
  // Shared categories
  Streaks: { label: 'Streaks', icon: 'flame', color: '#F59E0B' },
  Challenges: { label: 'Challenges', icon: 'flag', color: '#6366F1' },
  Levels: { label: 'Levels', icon: 'star', color: '#FFD700' },
  Meta: { label: 'Meta', icon: 'infinite', color: '#64748B' },
  Fun: { label: 'Fun', icon: 'happy', color: '#F472B6' },
  // Basketball-specific
  Scoring: { label: 'Scoring', icon: 'basketball', color: '#EF4444' },
  Rebounding: { label: 'Rebounding', icon: 'arrow-up', color: '#F59E0B' },
  Playmaking: { label: 'Playmaking', icon: 'git-branch', color: '#10B981' },
  Defense: { label: 'Defense', icon: 'shield-checkmark', color: '#3B82F6' },
  // Sport-specific
  Volleyball: { label: 'Volleyball', icon: 'basketball', color: '#4BB9EC' },
  Basketball: { label: 'Basketball', icon: 'basketball', color: '#F97316' },
  // Admin / Lifecycle
  Season: { label: 'Season', icon: 'calendar', color: '#6366F1' },
  Onboarding: { label: 'Onboarding', icon: 'log-in', color: '#22C55E' },
  Growth: { label: 'Growth', icon: 'trending-up', color: '#10B981' },
  Operations: { label: 'Operations', icon: 'construct', color: '#64748B' },
  Setup: { label: 'Setup', icon: 'build', color: '#6366F1' },
};

// =============================================================================
// Season Rank System — V2
// =============================================================================

/** Season rank tiers with score thresholds and XP multipliers */
export const SEASON_RANK_TIERS = [
  { rank: 'unranked',  label: 'Unranked',  scoreMin: 0,     multiplier: 1.0,   color: '#6B7280', bgColor: '#6B728020' },
  { rank: 'bronze',    label: 'Bronze',    scoreMin: 300,   multiplier: 1.15,  color: '#CD7F32', bgColor: '#CD7F3220' },
  { rank: 'silver',    label: 'Silver',    scoreMin: 800,   multiplier: 1.3,   color: '#C0C0C0', bgColor: '#C0C0C020' },
  { rank: 'gold',      label: 'Gold',      scoreMin: 2000,  multiplier: 1.5,   color: '#FFD700', bgColor: '#FFD70020' },
  { rank: 'diamond',   label: 'Diamond',   scoreMin: 4000,  multiplier: 1.75,  color: '#B9F2FF', bgColor: '#B9F2FF20' },
] as const;

export type SeasonRankTier = typeof SEASON_RANK_TIERS[number]['rank'];

/** Season score formula weights */
export const SEASON_SCORE_WEIGHTS = {
  xpWeight: 0.5,          // Season XP × 0.5
  badgeMultiplier: 20,    // Badges earned × 20
  activityWeight: 0.3,    // Activity score × 0.3
} as const;

// =============================================================================
// Division Scaling — V2
// =============================================================================

/** Division configs for stat badge threshold scaling */
export const DIVISION_CONFIGS = {
  '10u':      { label: '10U & Under', scaleFactor: 0.25, maxRarity: 'rare',      maxRarityOrder: 3 },
  '12u':      { label: '12U',         scaleFactor: 0.50, maxRarity: 'epic',       maxRarityOrder: 4 },
  '14u_plus': { label: '14U+',        scaleFactor: 1.00, maxRarity: 'legendary',  maxRarityOrder: 5 },
} as const;

export type Division = keyof typeof DIVISION_CONFIGS;

/** Rarity ordering for cap comparison */
export const RARITY_ORDER: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

/** Parse an age group name (e.g., "12U", "4th Grade") into a division key */
export function parseDivisionFromAgeGroup(name: string): Division {
  if (!name) return '14u_plus';
  const match = name.match(/(\d+)/);
  if (!match) return '14u_plus';
  const num = parseInt(match[1]);
  // Grade-based: grades 1-4 → 10u, 5-6 → 12u, 7+ → 14u_plus
  // Age-based: direct mapping
  if (name.toLowerCase().includes('grade')) {
    if (num <= 4) return '10u';
    if (num <= 6) return '12u';
    return '14u_plus';
  }
  // Age-based (e.g., "10U", "12U", "14U")
  if (num <= 10) return '10u';
  if (num <= 12) return '12u';
  return '14u_plus';
}

/** Get rank tier from season score */
export function getSeasonRankFromScore(score: number): typeof SEASON_RANK_TIERS[number] {
  let currentRank: typeof SEASON_RANK_TIERS[number] = SEASON_RANK_TIERS[0]; // unranked
  for (const tier of SEASON_RANK_TIERS) {
    if (score >= tier.scoreMin) {
      currentRank = tier;
    } else {
      break;
    }
  }
  return currentRank;
}
