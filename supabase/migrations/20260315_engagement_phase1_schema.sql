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

-- ---------------------------------------------------------------------------
-- skill_categories: Top-level skill categories per sport (e.g., Serving, Passing)
-- Separate from sport_skill_templates which is for coach evaluation ratings.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL DEFAULT 'volleyball',
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport, name)
);

CREATE INDEX idx_skill_categories_sport ON skill_categories(sport);

-- ---------------------------------------------------------------------------
-- skill_content: Individual skill modules (Tip + Drill + optional Quiz)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  sport TEXT NOT NULL DEFAULT 'volleyball',
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  tip_text TEXT,
  tip_image_url TEXT,
  drill_title TEXT,
  drill_instructions TEXT,
  drill_reps TEXT,
  drill_location TEXT DEFAULT 'home',
  mascot_demo_frames JSONB,
  has_quiz BOOLEAN DEFAULT FALSE,
  xp_tip INTEGER DEFAULT 10,
  xp_drill INTEGER DEFAULT 20,
  xp_quiz INTEGER DEFAULT 15,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport, slug)
);

CREATE INDEX idx_skill_content_category ON skill_content(category_id);
CREATE INDEX idx_skill_content_sport_diff ON skill_content(sport, difficulty);

-- ---------------------------------------------------------------------------
-- skill_quizzes: Quiz questions tied to a skill module (2-3 per module)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_content_id UUID NOT NULL REFERENCES skill_content(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_index INTEGER NOT NULL,
  explanation TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_skill_quizzes_content ON skill_quizzes(skill_content_id);

-- ---------------------------------------------------------------------------
-- skill_progress: Tracks player progress through individual skill modules
-- Separate from player_skill_ratings which is for coach evaluation scores.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_content_id UUID NOT NULL REFERENCES skill_content(id) ON DELETE CASCADE,
  tip_viewed BOOLEAN DEFAULT FALSE,
  tip_viewed_at TIMESTAMPTZ,
  drill_completed BOOLEAN DEFAULT FALSE,
  drill_completed_at TIMESTAMPTZ,
  quiz_completed BOOLEAN DEFAULT FALSE,
  quiz_score INTEGER,
  quiz_completed_at TIMESTAMPTZ,
  is_fully_complete BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, skill_content_id)
);

CREATE INDEX idx_skill_progress_player ON skill_progress(player_id);
CREATE INDEX idx_skill_progress_content ON skill_progress(skill_content_id);

-- ---------------------------------------------------------------------------
-- journey_chapters: Chapter definitions for the Journey Path (8 volleyball chapters)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journey_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL DEFAULT 'volleyball',
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  theme TEXT,
  description TEXT,
  required_level INTEGER NOT NULL DEFAULT 1,
  badge_id UUID,
  node_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport, chapter_number)
);

CREATE INDEX idx_journey_chapters_sport ON journey_chapters(sport);

-- ---------------------------------------------------------------------------
-- journey_nodes: Individual nodes within a chapter (skill, challenge, boss, bonus)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journey_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES journey_chapters(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL DEFAULT 'skill',
  title TEXT NOT NULL,
  description TEXT,
  skill_content_id UUID REFERENCES skill_content(id) ON DELETE SET NULL,
  challenge_config JSONB,
  xp_reward INTEGER NOT NULL DEFAULT 20,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_boss BOOLEAN DEFAULT FALSE,
  is_bonus BOOLEAN DEFAULT FALSE,
  position_offset TEXT DEFAULT 'center',
  icon_emoji TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chapter_id, sort_order)
);

CREATE INDEX idx_journey_nodes_chapter ON journey_nodes(chapter_id);

-- ---------------------------------------------------------------------------
-- journey_progress: Player's completion state per journey node
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journey_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES journey_nodes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'locked',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  best_score JSONB,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, node_id)
);

CREATE INDEX idx_journey_progress_player ON journey_progress(player_id);
CREATE INDEX idx_journey_progress_node ON journey_progress(node_id);
CREATE INDEX idx_journey_progress_status ON journey_progress(player_id, status);
