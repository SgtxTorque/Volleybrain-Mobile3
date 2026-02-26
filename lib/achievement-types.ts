// =============================================================================
// Achievement System — Shared Types
// =============================================================================

/** Full achievement record matching all DB columns */
export type AchievementFull = {
  id: string;
  name: string;
  description: string | null;
  how_to_earn: string | null;
  category: string;
  type: string | null;
  rarity: string;
  stat_key: string | null;
  threshold: number | null;
  threshold_type: string | null;
  requires_verification: boolean;
  icon: string | null;
  icon_url: string | null;
  color_primary: string | null;
  color_secondary: string | null;
  color_glow: string | null;
  banner_gradient: string | null;
  sport: string | null;
  is_active: boolean;
  display_order: number | null;
  created_at?: string;
  frame_url: string | null;
  glow_url: string | null;
  unlock_effect_url: string | null;
  xp_reward: number | null;
  target_role: string | null; // 'player' | 'coach' | 'parent' | 'admin' | 'all'
};

/** A player_achievements row joined with its achievement */
export type PlayerAchievementRecord = {
  id: string;
  player_id: string;
  achievement_id: string;
  earned_at: string | null;
  game_id: string | null;
  team_id: string | null;
  season_id: string | null;
  stat_value_at_unlock: number | null;
  verified_by: string | null;
  verified_at: string | null;
  achievements: AchievementFull;
};

/** Progress toward a single achievement */
export type AchievementProgress = {
  achievement_id: string;
  current_value: number;
  target_value: number;
  pct: number;
  achievement: AchievementFull;
};

/** An achievement the player hasn't seen the unlock for yet */
export type UnseenAchievement = PlayerAchievementRecord & {
  gameName?: string; // e.g., "vs Banks"
  gameDate?: string; // e.g., "Feb 24"
};

export type RarityLevel = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Rarity visual config for glow, color, animation */
export const RARITY_CONFIG: Record<
  string,
  { glowColor: string; borderColor: string; animate: 'shimmer' | 'pulse' | 'static' | 'thin' | 'none'; intensity: number; label: string }
> = {
  legendary: { glowColor: '#FFD700', borderColor: '#FFD700', animate: 'shimmer', intensity: 0.8, label: 'Legendary' },
  epic: { glowColor: '#A855F7', borderColor: '#A855F7', animate: 'pulse', intensity: 0.6, label: 'Epic' },
  rare: { glowColor: '#3B82F6', borderColor: '#3B82F6', animate: 'static', intensity: 0.4, label: 'Rare' },
  uncommon: { glowColor: '#10B981', borderColor: '#10B981', animate: 'thin', intensity: 0.25, label: 'Uncommon' },
  common: { glowColor: '#94A3B8', borderColor: '#94A3B8', animate: 'none', intensity: 0, label: 'Common' },
};
