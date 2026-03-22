-- =============================================================================
-- TEAM MANAGER ROLE — RLS POLICY UPDATES
-- Adds 'team_manager' to 5 engagement policies
-- Does NOT touch: coach_challenges, xp_boost_events, team_quests write policies
-- =============================================================================

-- 1. daily_quests_coach_select
DROP POLICY IF EXISTS "daily_quests_coach_select" ON daily_quests;
CREATE POLICY "daily_quests_coach_select" ON daily_quests
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      WHERE ts.user_id = auth.uid() AND ts.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('head_coach', 'assistant_coach', 'league_admin', 'team_manager')
        AND is_active = true
    )
  );

-- 2. weekly_quests_coach_select
DROP POLICY IF EXISTS "weekly_quests_coach_select" ON weekly_quests;
CREATE POLICY "weekly_quests_coach_select" ON weekly_quests
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      WHERE ts.user_id = auth.uid() AND ts.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('head_coach', 'assistant_coach', 'league_admin', 'team_manager')
        AND is_active = true
    )
  );

-- 3. league_standings_coach_select
DROP POLICY IF EXISTS "league_standings_coach_select" ON league_standings;
CREATE POLICY "league_standings_coach_select" ON league_standings
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      WHERE ts.user_id = auth.uid() AND ts.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('head_coach', 'assistant_coach', 'league_admin', 'team_manager')
        AND is_active = true
    )
  );

-- 4. streak_data_coach_select
DROP POLICY IF EXISTS "streak_data_coach_select" ON streak_data;
CREATE POLICY "streak_data_coach_select" ON streak_data
  FOR SELECT TO authenticated
  USING (
    player_id IN (
      SELECT ur2.user_id FROM user_roles ur1
      JOIN user_roles ur2 ON ur1.organization_id = ur2.organization_id
      WHERE ur1.user_id = auth.uid()
        AND ur1.role IN ('head_coach', 'assistant_coach', 'league_admin', 'team_manager')
        AND ur1.is_active = true
        AND ur2.is_active = true
    )
  );

-- 5. shoutout_categories_insert
DROP POLICY IF EXISTS "shoutout_categories_insert" ON shoutout_categories;
CREATE POLICY "shoutout_categories_insert" ON shoutout_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    is_default = false
    AND created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('head_coach', 'assistant_coach', 'league_admin', 'team_manager')
        AND is_active = true
    )
  );
