-- =============================================================================
-- LYNX ENGAGEMENT SYSTEM — PHASE 1 SCHEMA
-- Created: 2026-03-15
-- Purpose: Quest system, streak tracking, skill content library, journey path,
--          league standings, and XP boost events
-- Extends: xp_ledger (2 new columns), profiles (2 new columns)
-- Creates: 14 new tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTEND xp_ledger: Add team_id and multiplier columns
-- xp_ledger already has: id, player_id, organization_id, xp_amount,
--   source_type, source_id, description, created_at
-- ---------------------------------------------------------------------------
ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS multiplier NUMERIC(3,2) DEFAULT 1.00;

-- ---------------------------------------------------------------------------
-- EXTEND profiles: Add tier and xp_to_next_level columns
-- profiles already has: total_xp (integer, default 0), player_level (integer, default 1)
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Rookie';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp_to_next_level INTEGER DEFAULT 100;

-- ---------------------------------------------------------------------------
-- daily_quests: 3 generated quests per player per day
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quest_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INTEGER NOT NULL,
  verification_type TEXT NOT NULL DEFAULT 'automatic',
  target_value INTEGER DEFAULT 1,
  current_value INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, quest_date, sort_order)
);

CREATE INDEX idx_daily_quests_player_date ON daily_quests(player_id, quest_date);
CREATE INDEX idx_daily_quests_date ON daily_quests(quest_date);

-- ---------------------------------------------------------------------------
-- weekly_quests: 3-5 generated quests per player per week (reset Monday)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weekly_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  week_start DATE NOT NULL,
  quest_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INTEGER NOT NULL,
  verification_type TEXT NOT NULL DEFAULT 'automatic',
  target_value INTEGER DEFAULT 1,
  current_value INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, week_start, sort_order)
);

CREATE INDEX idx_weekly_quests_player_week ON weekly_quests(player_id, week_start);
CREATE INDEX idx_weekly_quests_week ON weekly_quests(week_start);

-- ---------------------------------------------------------------------------
-- quest_bonus_tracking: Tracks daily all-3 bonus and weekly all-complete bonus
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quest_bonus_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bonus_type TEXT NOT NULL,
  period_date DATE NOT NULL,
  xp_awarded INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, bonus_type, period_date)
);

CREATE INDEX idx_quest_bonus_player ON quest_bonus_tracking(player_id, bonus_type, period_date);

-- ---------------------------------------------------------------------------
-- streak_data: One row per player. Current streak state + freeze inventory.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS streak_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  streak_freezes_available INTEGER NOT NULL DEFAULT 0,
  streak_freeze_used_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id)
);

CREATE INDEX idx_streak_data_player ON streak_data(player_id);

-- ---------------------------------------------------------------------------
-- streak_milestones: Records when player hits streak milestones (7, 14, 30, 60, 100)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS streak_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  milestone_days INTEGER NOT NULL,
  reached_at TIMESTAMPTZ DEFAULT now(),
  freeze_awarded BOOLEAN DEFAULT TRUE,
  badge_id UUID,
  UNIQUE(player_id, milestone_days)
);

CREATE INDEX idx_streak_milestones_player ON streak_milestones(player_id);
