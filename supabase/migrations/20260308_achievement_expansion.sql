-- ============================================================
-- Achievement System Expansion — Schema Updates
-- Phase 1: min_level, stacks_into, flavor_text, cadence, xp_reward
-- ============================================================

-- 1a. Add new columns to achievements table
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS min_level INTEGER DEFAULT 1;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS stacks_into TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS flavor_text TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS cadence TEXT DEFAULT 'lifetime';
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 25;

-- 1b. Ensure user_achievements table exists (for coach/parent/admin achievements)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  stat_value_at_unlock INTEGER,
  season_id UUID,
  UNIQUE(user_id, achievement_id)
);
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- 1c. Add XP columns to profiles if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS player_level INTEGER DEFAULT 1;
