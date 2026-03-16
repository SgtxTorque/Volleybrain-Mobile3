# CC-ENGAGEMENT-PHASE1-SCHEMA-EXECUTE
# Lynx Player Engagement System — Phase 1: Database Schema
# Status: READY FOR CC EXECUTION
# Investigation: COMPLETED. Findings applied. All conflicts resolved.

---

## STANDING RULES — READ BEFORE ANYTHING

1. **Read these files first, in order, before writing any code:**
   - `SCHEMA_REFERENCE.csv` (or `.md`) in repo root
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
   - `LYNX-REFERENCE-GUIDE.md` in repo root
2. **Never invent table or column names.** If you need to reference an existing table, find it in SCHEMA_REFERENCE first. Copy exact names.
3. **Do NOT modify any existing screens, components, hooks, or UI files.** This spec is database-only.
4. **Do NOT modify any existing table structures EXCEPT the two ALTER TABLE statements explicitly called out below (xp_ledger and profiles).** Do not add columns, drop columns, or change constraints on any other existing table.
5. **Commit after each phase.** Commit message format: `[engagement-schema] Phase X: description`
6. **If something is unclear, STOP and report back.** Do not guess.
7. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Creates the database foundation for the Lynx Player Engagement System:
- Extends 2 existing tables (xp_ledger, profiles) with small additions
- Creates 14 new tables for quests, streaks, skill content, journey path, and leagues
- Adds RLS policies following the app's existing pattern
- Seeds volleyball skill categories and journey chapters

This spec does NOT wire anything to the UI. Schema only.

---

## INVESTIGATION FINDINGS APPLIED

These decisions are final. Do not revisit them:

1. **xp_ledger is the XP ledger.** We do NOT create a separate xp_transactions table. We extend xp_ledger with 2 new columns.
2. **profiles.total_xp and profiles.player_level already exist.** We do NOT create a player_levels table. We add 2 new columns to profiles (tier, xp_to_next_level).
3. **All new engagement tables use `profiles(id)` as the player FK.** This matches xp_ledger's pattern and ties engagement to the auth account, not a season-specific player record.
4. **New skill tables (skill_content, skill_progress, etc.) are separate from existing skill rating tables (player_skills, player_skill_ratings, sport_skill_templates).** Different purpose. No overlap. Do not touch the existing skill tables.
5. **Migration goes in `supabase/migrations/` using the `YYYYMMDD_` format.**
6. **RLS pattern:** Use `auth.uid()` for player self-access. Use `user_roles` subquery for coach/admin access. Match the pattern from `coach_challenges` and `xp_ledger` policies.

---

## PHASE 1: Create the migration file

Create a single file:
```
supabase/migrations/20260315_engagement_phase1_schema.sql
```

Begin the file with this header comment:

```sql
-- =============================================================================
-- LYNX ENGAGEMENT SYSTEM — PHASE 1 SCHEMA
-- Created: 2026-03-15
-- Purpose: Quest system, streak tracking, skill content library, journey path,
--          league standings, and XP boost events
-- Extends: xp_ledger (2 new columns), profiles (2 new columns)
-- Creates: 14 new tables
-- =============================================================================
```

### Step 1A: Extend xp_ledger

```sql
-- ---------------------------------------------------------------------------
-- EXTEND xp_ledger: Add team_id and multiplier columns
-- xp_ledger already has: id, player_id, organization_id, xp_amount, 
--   source_type, source_id, description, created_at
-- ---------------------------------------------------------------------------
ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS multiplier NUMERIC(3,2) DEFAULT 1.00;
```

**What these columns do:**
- `team_id` = which team context this XP was earned in (NULL for org-wide actions)
- `multiplier` = XP boost multiplier applied (1.00 = normal, 1.50 = practice day, 2.00 = game day). The `xp_amount` column stores the FINAL amount after multiplier. This column is for auditability.

### Step 1B: Extend profiles

```sql
-- ---------------------------------------------------------------------------
-- EXTEND profiles: Add tier and xp_to_next_level columns
-- profiles already has: total_xp (integer, default 0), player_level (integer, default 1)
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Rookie';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp_to_next_level INTEGER DEFAULT 100;
```

**Tier mapping (enforced in app logic, not DB constraint):**
- Level 1-4: Rookie
- Level 5-9: Bronze
- Level 10-14: Silver
- Level 15-19: Gold
- Level 20-24: Platinum
- Level 25-29: Diamond
- Level 30: Legend

---

## PHASE 2: Create quest tables

Commit after this phase: `[engagement-schema] Phase 2: quest tables`

### Table 1: daily_quests

```sql
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
```

**Column reference:**
- `quest_type`: 'app_checkin', 'skill_tip', 'drill_completion', 'social_action', 'quiz', 'attendance', 'stats_check'
- `verification_type`: 'automatic', 'self_report', 'coach_verified', 'content_viewed'
- `sort_order`: 0, 1, 2 for the 3 daily quests
- `target_value` / `current_value`: for progress quests (e.g., "Give 2 shoutouts" = target 2)

### Table 2: weekly_quests

```sql
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
```

**Column reference:**
- `week_start`: always a Monday date
- `quest_type`: 'attendance', 'skill_module', 'game_performance', 'community', 'consistency'

### Table 3: quest_bonus_tracking

```sql
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
```

**Column reference:**
- `bonus_type`: 'daily_all_complete' (25 XP), 'weekly_all_complete' (50 XP)
- `period_date`: quest_date for daily, week_start for weekly

---

## PHASE 3: Create streak tables

Commit after this phase: `[engagement-schema] Phase 3: streak tables`

### Table 4: streak_data

```sql
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
```

**Logic reference (enforced in app, not DB):**
- If today minus last_active_date > 1 and no freeze available: streak resets to 0
- If today minus last_active_date > 1 and freeze available: consume 1 freeze, streak preserved
- Freeze bank max: 3
- Qualifying actions: complete 1 daily quest, complete 1 skill node, attend practice, play in game, complete a drill

### Table 5: streak_milestones

```sql
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
```

---

## PHASE 4: Create skill content tables

Commit after this phase: `[engagement-schema] Phase 4: skill content tables`

**NOTE:** These tables are for the self-directed Skill Library (training tips, drills, quizzes). They are completely separate from the existing player_skills, player_skill_ratings, and sport_skill_templates tables which are for coach evaluation ratings. Do NOT touch those existing tables.

### Table 6: skill_categories

```sql
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
```

### Table 7: skill_content

```sql
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
```

**Column reference:**
- `difficulty`: 'beginner', 'intermediate', 'advanced'
- `drill_location`: 'home', 'gym', 'court'
- `mascot_demo_frames`: JSONB array of image URLs for illustrated mascot demo
- `created_by`: NULL for Lynx default library, profile id for coach-created content

### Table 8: skill_quizzes

```sql
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
```

**Column reference:**
- `options`: JSONB array of strings, e.g. `["Platform angle", "Fist bump", "Overhead catch", "Kick"]`
- `correct_option_index`: 0-based index into the options array

### Table 9: skill_progress

```sql
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
```

---

## PHASE 5: Create journey path tables

Commit after this phase: `[engagement-schema] Phase 5: journey path tables`

### Table 10: journey_chapters

```sql
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
```

### Table 11: journey_nodes

```sql
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
```

**Column reference:**
- `node_type`: 'skill', 'challenge', 'boss', 'bonus'
- `skill_content_id`: links to skill module for skill nodes (NULL for challenge/boss nodes)
- `challenge_config`: JSONB for challenge/boss nodes, e.g. `{"type": "timed_reps", "target": 20, "time_limit_seconds": 300, "description": "Pass 20 balls without dropping"}`
- `position_offset`: 'left', 'center', 'right' for visual path layout in the Journey Path UI
- `is_boss`: TRUE for boss nodes that gate the next chapter
- `is_bonus`: TRUE for optional side nodes

### Table 12: journey_progress

```sql
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
```

**Column reference:**
- `status`: 'locked', 'available', 'in_progress', 'completed'
- `best_score`: JSONB for boss/challenge nodes, e.g. `{"reps": 18, "time_seconds": 240, "passed": true}`
- `xp_earned`: total XP earned from this node (including replays at 25%)

---

## PHASE 6: Create league and boost tables

Commit after this phase: `[engagement-schema] Phase 6: league and boost tables`

### Table 13: league_standings

```sql
-- ---------------------------------------------------------------------------
-- league_standings: Weekly leaderboard league positions per player per team
-- Separate from team_standings which tracks team win/loss records.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS league_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  league_tier TEXT NOT NULL DEFAULT 'Bronze',
  week_start DATE NOT NULL,
  weekly_xp INTEGER NOT NULL DEFAULT 0,
  rank_in_team INTEGER,
  promotion_status TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, team_id, week_start)
);

CREATE INDEX idx_league_standings_team_week ON league_standings(team_id, week_start);
CREATE INDEX idx_league_standings_player ON league_standings(player_id);
```

**Column reference:**
- `league_tier`: 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'
- `promotion_status`: 'none', 'promoted', 'demoted', 'maintained'
- Weekly reset every Monday. Previous week's final rankings determine promotion/demotion.

### Table 14: xp_boost_events

```sql
-- ---------------------------------------------------------------------------
-- xp_boost_events: Active XP multiplier events (Game Day 2x, Weekend Warrior, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xp_boost_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  boost_type TEXT NOT NULL,
  multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.50,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  applicable_sources TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_xp_boost_events_team ON xp_boost_events(team_id);
CREATE INDEX idx_xp_boost_events_active ON xp_boost_events(starts_at, ends_at);
```

**Column reference:**
- `boost_type`: 'game_day', 'practice_day', 'weekend_warrior', 'custom'
- `applicable_sources`: TEXT array of xp_ledger source_type values this boost applies to. NULL = all sources.
- `team_id`: NULL for global boosts, specific team_id for team-scoped boosts

---

## PHASE 7: RLS Policies

Commit after this phase: `[engagement-schema] Phase 7: RLS policies`

Enable RLS on all 14 new tables, then add policies following the app's existing pattern.

```sql
-- ---------------------------------------------------------------------------
-- ENABLE RLS ON ALL NEW TABLES
-- ---------------------------------------------------------------------------
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_bonus_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_boost_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- PLAYER SELF-ACCESS POLICIES
-- Pattern: player_id = auth.uid() for personal data
-- ---------------------------------------------------------------------------

-- Daily quests: players read/update their own
CREATE POLICY "daily_quests_player_select" ON daily_quests
  FOR SELECT TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "daily_quests_player_update" ON daily_quests
  FOR UPDATE TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- Weekly quests: players read/update their own
CREATE POLICY "weekly_quests_player_select" ON weekly_quests
  FOR SELECT TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "weekly_quests_player_update" ON weekly_quests
  FOR UPDATE TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- Quest bonus tracking: players read their own
CREATE POLICY "quest_bonus_player_select" ON quest_bonus_tracking
  FOR SELECT TO authenticated
  USING (player_id = auth.uid());

-- Streak data: players read/update their own
CREATE POLICY "streak_data_player_select" ON streak_data
  FOR SELECT TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "streak_data_player_update" ON streak_data
  FOR UPDATE TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- Streak milestones: players read their own
CREATE POLICY "streak_milestones_player_select" ON streak_milestones
  FOR SELECT TO authenticated
  USING (player_id = auth.uid());

-- Skill progress: players read/insert/update their own
CREATE POLICY "skill_progress_player_select" ON skill_progress
  FOR SELECT TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "skill_progress_player_insert" ON skill_progress
  FOR INSERT TO authenticated
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "skill_progress_player_update" ON skill_progress
  FOR UPDATE TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- Journey progress: players read/insert/update their own
CREATE POLICY "journey_progress_player_select" ON journey_progress
  FOR SELECT TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "journey_progress_player_insert" ON journey_progress
  FOR INSERT TO authenticated
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "journey_progress_player_update" ON journey_progress
  FOR UPDATE TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- League standings: players read their own team's standings
CREATE POLICY "league_standings_player_select" ON league_standings
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM user_roles WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- PUBLIC READ POLICIES
-- Pattern: All authenticated users can read content/config tables
-- ---------------------------------------------------------------------------

-- Skill categories: all authenticated users can read
CREATE POLICY "skill_categories_read" ON skill_categories
  FOR SELECT TO authenticated
  USING (true);

-- Skill content: all authenticated users can read published content
CREATE POLICY "skill_content_read" ON skill_content
  FOR SELECT TO authenticated
  USING (is_published = true);

-- Skill quizzes: all authenticated users can read
CREATE POLICY "skill_quizzes_read" ON skill_quizzes
  FOR SELECT TO authenticated
  USING (true);

-- Journey chapters: all authenticated users can read published chapters
CREATE POLICY "journey_chapters_read" ON journey_chapters
  FOR SELECT TO authenticated
  USING (is_published = true);

-- Journey nodes: all authenticated users can read
CREATE POLICY "journey_nodes_read" ON journey_nodes
  FOR SELECT TO authenticated
  USING (true);

-- XP boost events: all authenticated users can read
CREATE POLICY "xp_boost_events_read" ON xp_boost_events
  FOR SELECT TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- COACH/ADMIN ACCESS POLICIES
-- Pattern: coaches and admins can read player data for their teams
-- Matches existing pattern from coach_challenges RLS
-- ---------------------------------------------------------------------------

-- Daily quests: coaches can see their team's player quests
CREATE POLICY "daily_quests_coach_select" ON daily_quests
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM user_roles 
      WHERE user_id = auth.uid() 
        AND role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND is_active = true
    )
  );

-- Weekly quests: coaches can see their team's player quests
CREATE POLICY "weekly_quests_coach_select" ON weekly_quests
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM user_roles 
      WHERE user_id = auth.uid() 
        AND role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND is_active = true
    )
  );

-- Streak data: coaches can see their players' streaks via org
CREATE POLICY "streak_data_coach_select" ON streak_data
  FOR SELECT TO authenticated
  USING (
    player_id IN (
      SELECT ur2.user_id FROM user_roles ur1
      JOIN user_roles ur2 ON ur1.organization_id = ur2.organization_id
      WHERE ur1.user_id = auth.uid()
        AND ur1.role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND ur1.is_active = true
        AND ur2.is_active = true
    )
  );

-- League standings: coaches can see their team's standings
CREATE POLICY "league_standings_coach_select" ON league_standings
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM user_roles 
      WHERE user_id = auth.uid() 
        AND role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- SERVICE ROLE INSERT POLICIES
-- Pattern: Quest generation and XP awards happen via Edge Functions (service role)
-- These WITH CHECK (true) policies allow service role inserts
-- Matches existing pattern from xp_ledger
-- ---------------------------------------------------------------------------

CREATE POLICY "daily_quests_service_insert" ON daily_quests
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "weekly_quests_service_insert" ON weekly_quests
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "quest_bonus_service_insert" ON quest_bonus_tracking
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "streak_data_service_insert" ON streak_data
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "streak_milestones_service_insert" ON streak_milestones
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "league_standings_service_insert" ON league_standings
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "league_standings_service_update" ON league_standings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "xp_boost_events_admin_insert" ON xp_boost_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
        AND role IN ('head_coach', 'league_admin')
        AND is_active = true
    )
  );
```

---

## PHASE 8: Seed data

Commit after this phase: `[engagement-schema] Phase 8: seed data`

### Seed volleyball skill categories

```sql
-- ---------------------------------------------------------------------------
-- SEED: Volleyball skill categories
-- ---------------------------------------------------------------------------
INSERT INTO skill_categories (sport, name, display_name, icon, sort_order) VALUES
  ('volleyball', 'serving', 'Serving', '🏐', 1),
  ('volleyball', 'passing', 'Passing', '🤲', 2),
  ('volleyball', 'setting', 'Setting', '🙌', 3),
  ('volleyball', 'hitting', 'Hitting', '💥', 4),
  ('volleyball', 'defense', 'Defense', '🛡️', 5),
  ('volleyball', 'court_iq', 'Court IQ', '🧠', 6)
ON CONFLICT (sport, name) DO NOTHING;
```

### Seed volleyball journey chapters

```sql
-- ---------------------------------------------------------------------------
-- SEED: Volleyball journey chapters (8 chapters)
-- ---------------------------------------------------------------------------
INSERT INTO journey_chapters (sport, chapter_number, title, theme, description, required_level, node_count, sort_order) VALUES
  ('volleyball', 1, 'First Touch', 'passing_foundations', 'Master the basics of ball control and platform passing', 1, 6, 1),
  ('volleyball', 2, 'Serve It Up', 'serving_foundations', 'Build your serve from the ground up', 1, 7, 2),
  ('volleyball', 3, 'Net Game', 'setting_hitting', 'Setting and hitting fundamentals at the net', 5, 6, 3),
  ('volleyball', 4, 'Defense Wins', 'defensive_skills', 'Dig, dive, and defend like a wall', 5, 5, 4),
  ('volleyball', 5, 'Court Commander', 'court_awareness', 'Rotations, coverage, and game IQ', 10, 8, 5),
  ('volleyball', 6, 'Advanced Arsenal', 'advanced_offense', 'Advanced serves and attacks under pressure', 10, 7, 6),
  ('volleyball', 7, 'Team Synergy', 'team_play', 'Team coordination and communication', 15, 6, 7),
  ('volleyball', 8, 'Championship Road', 'mastery', 'Full-game simulation and mastery', 15, 8, 8)
ON CONFLICT (sport, chapter_number) DO NOTHING;
```

---

## PHASE 9: Verification

**Do NOT skip this phase.** After all SQL has been executed, verify everything:

### Checklist:

1. **List all new tables.** Confirm these 14 exist:
   - daily_quests, weekly_quests, quest_bonus_tracking
   - streak_data, streak_milestones
   - skill_categories, skill_content, skill_quizzes, skill_progress
   - journey_chapters, journey_nodes, journey_progress
   - league_standings, xp_boost_events

2. **Verify xp_ledger was extended.** Confirm these 2 columns exist:
   - team_id (UUID, nullable)
   - multiplier (NUMERIC, default 1.00)

3. **Verify profiles was extended.** Confirm these 2 columns exist:
   - tier (TEXT, default 'Rookie')
   - xp_to_next_level (INTEGER, default 100)

4. **Verify NO existing tables were dropped or had columns removed.** Specifically confirm these tables are untouched:
   - players, profiles (except the 2 new columns), teams
   - player_skills, player_skill_ratings, sport_skill_templates
   - player_badges, player_achievements
   - coach_challenges, challenge_participants
   - event_attendance, schedule_events
   - shoutouts, shoutout_categories
   - team_standings
   - xp_ledger (except the 2 new columns)

5. **Verify RLS is enabled** on all 14 new tables.

6. **Count RLS policies.** Should be approximately 30 policies total across all tables.

7. **Verify seed data:**
   - skill_categories: 6 rows (volleyball)
   - journey_chapters: 8 rows (volleyball)

8. **Verify all indexes were created.** Should be approximately 20 indexes across all tables.

### Report format:

```
## VERIFICATION REPORT

### Tables Created: [count]/14
[list each with column count]

### Tables Extended: 2/2
- xp_ledger: [confirm team_id + multiplier]
- profiles: [confirm tier + xp_to_next_level]

### Existing Tables: UNTOUCHED / MODIFIED (should be UNTOUCHED)

### RLS: [count] policies across [count] tables

### Seed Data:
- skill_categories: [count] rows
- journey_chapters: [count] rows

### Indexes: [count] created

### Errors: [list any, or NONE]
```

---

## TABLE SUMMARY (FINAL)

| # | Table | Type | Purpose |
|---|-------|------|---------|
| -- | xp_ledger | EXTENDED | Added team_id + multiplier columns |
| -- | profiles | EXTENDED | Added tier + xp_to_next_level columns |
| 1 | daily_quests | NEW | 3 quests per player per day |
| 2 | weekly_quests | NEW | 3-5 quests per player per week |
| 3 | quest_bonus_tracking | NEW | Daily/weekly all-complete bonuses |
| 4 | streak_data | NEW | Current streak state per player |
| 5 | streak_milestones | NEW | Streak milestone history |
| 6 | skill_categories | NEW | Sport skill categories |
| 7 | skill_content | NEW | Skill modules (tips/drills) |
| 8 | skill_quizzes | NEW | Quiz questions per module |
| 9 | skill_progress | NEW | Player progress per module |
| 10 | journey_chapters | NEW | Chapter definitions |
| 11 | journey_nodes | NEW | Node definitions |
| 12 | journey_progress | NEW | Player progress per node |
| 13 | league_standings | NEW | Weekly league positions |
| 14 | xp_boost_events | NEW | XP multiplier events |

---

## WHAT COMES NEXT (NOT IN THIS SPEC)

After this schema is deployed and verified:
- **Phase 1B:** Quest generation Edge Function (generates 3 daily quests per player at midnight)
- **Phase 1C:** XP award function (quest completed -> write to xp_ledger -> update profiles.total_xp/player_level/tier)
- **Phase 1D:** Streak engine (daily check, freeze logic, milestone awards)
- **Phase 1E:** Wire usePlayerHomeData to read from new tables instead of client-side formula
- **Phase 1F:** Wire PlayerDailyQuests to read from daily_quests table instead of buildQuests()

Each of those will be a separate CC spec.
