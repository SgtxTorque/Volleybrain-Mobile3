-- =============================================================================
-- FIX: RLS policies that incorrectly referenced user_roles.team_id
-- user_roles has organization_id only (no team_id).
-- teams has no organization_id column (links via seasons.organization_id).
-- Team access goes through team_staff (user_id, team_id, is_active).
-- Role verification goes through user_roles (user_id, role, is_active).
-- =============================================================================

-- Fix 1: daily_quests_coach_select
-- Coaches/admins see quests for teams they are active staff on.
DROP POLICY IF EXISTS "daily_quests_coach_select" ON daily_quests;
CREATE POLICY "daily_quests_coach_select" ON daily_quests
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      WHERE ts.user_id = auth.uid()
        AND ts.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND is_active = true
    )
  );

-- Fix 2: weekly_quests_coach_select
DROP POLICY IF EXISTS "weekly_quests_coach_select" ON weekly_quests;
CREATE POLICY "weekly_quests_coach_select" ON weekly_quests
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      WHERE ts.user_id = auth.uid()
        AND ts.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND is_active = true
    )
  );

-- Fix 3: league_standings_player_select
-- Players see standings for teams they are on (via team_players + players.parent_account_id)
-- OR their own rows (player_id = auth.uid())
DROP POLICY IF EXISTS "league_standings_player_select" ON league_standings;
CREATE POLICY "league_standings_player_select" ON league_standings
  FOR SELECT TO authenticated
  USING (
    player_id = auth.uid()
    OR
    team_id IN (
      SELECT tp.team_id FROM team_players tp
      JOIN players p ON p.id = tp.player_id
      WHERE p.parent_account_id = auth.uid()
    )
  );

-- Fix 4: league_standings_coach_select
DROP POLICY IF EXISTS "league_standings_coach_select" ON league_standings;
CREATE POLICY "league_standings_coach_select" ON league_standings
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      WHERE ts.user_id = auth.uid()
        AND ts.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND is_active = true
    )
  );
