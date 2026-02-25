// =============================================================================
// Engagement System — Constants
// =============================================================================

/** XP level thresholds — exponential curve, fast early levels, slower later */
export const XP_LEVELS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 250 },
  { level: 4, xpRequired: 500 },
  { level: 5, xpRequired: 800 },
  { level: 6, xpRequired: 1200 },
  { level: 7, xpRequired: 1700 },
  { level: 8, xpRequired: 2300 },
  { level: 9, xpRequired: 3000 },
  { level: 10, xpRequired: 4000 },
  { level: 11, xpRequired: 5200 },
  { level: 12, xpRequired: 6500 },
  { level: 13, xpRequired: 8000 },
  { level: 14, xpRequired: 10000 },
  { level: 15, xpRequired: 12500 },
  { level: 16, xpRequired: 15500 },
  { level: 17, xpRequired: 19000 },
  { level: 18, xpRequired: 23000 },
  { level: 19, xpRequired: 27500 },
  { level: 20, xpRequired: 33000 },
] as const;

export const MAX_LEVEL = 20;

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
  shoutout_given: 10,
  shoutout_received: 15,
  challenge_completed: 50,
  challenge_won: 100,
  game_played: 10,
  practice_attended: 5,
};

/** Level tier colors (1-5 bronze, 6-10 silver, 11-15 gold, 16-20 diamond) */
export const LEVEL_TIERS = [
  { min: 1, max: 5, name: 'Bronze', color: '#CD7F32', bgColor: '#CD7F3220' },
  { min: 6, max: 10, name: 'Silver', color: '#C0C0C0', bgColor: '#C0C0C020' },
  { min: 11, max: 15, name: 'Gold', color: '#FFD700', bgColor: '#FFD70020' },
  { min: 16, max: 20, name: 'Diamond', color: '#B9F2FF', bgColor: '#B9F2FF20' },
] as const;

/** Calculate level from total XP */
export function getLevelFromXP(totalXp: number): { level: number; currentXp: number; nextLevelXp: number; progress: number } {
  let currentLevel = 1;
  for (const entry of XP_LEVELS) {
    if (totalXp >= entry.xpRequired) {
      currentLevel = entry.level;
    } else {
      break;
    }
  }

  const currentLevelXp = XP_LEVELS[currentLevel - 1].xpRequired;
  const nextLevelXp = currentLevel < MAX_LEVEL ? XP_LEVELS[currentLevel].xpRequired : XP_LEVELS[MAX_LEVEL - 1].xpRequired;
  const xpIntoLevel = totalXp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const progress = xpNeeded > 0 ? Math.min((xpIntoLevel / xpNeeded) * 100, 100) : 100;

  return { level: currentLevel, currentXp: totalXp, nextLevelXp, progress };
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

/** Achievement categories with icons and colors (all categories incl. Community) */
export const ACHIEVEMENT_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  Offensive: { label: 'Offensive', icon: 'flash', color: '#FF3B3B' },
  Defensive: { label: 'Defensive', icon: 'shield', color: '#3B82F6' },
  Playmaker: { label: 'Playmaker', icon: 'people', color: '#10B981' },
  Heart: { label: 'Heart', icon: 'heart', color: '#EC4899' },
  Community: { label: 'Community', icon: 'megaphone', color: '#F59E0B' },
  Elite: { label: 'Elite', icon: 'diamond', color: '#FFD700' },
};
