-- =============================================================================
-- ENGAGEMENT SYSTEM — Fixes for RLS policies + GRANT permissions
-- =============================================================================

-- =============================================================================
-- Fix 1: RLS policies use wrong role names ('coach','admin')
-- Actual roles: 'head_coach','assistant_coach','league_admin'
-- =============================================================================

-- Drop and recreate coach_challenges INSERT policy
DROP POLICY IF EXISTS "coach_challenges_insert" ON coach_challenges;
CREATE POLICY "coach_challenges_insert" ON coach_challenges
  FOR INSERT TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND is_active = true
    )
  );

-- Drop and recreate coach_challenges UPDATE policy (same role issue)
DROP POLICY IF EXISTS "coach_challenges_update" ON coach_challenges;
CREATE POLICY "coach_challenges_update" ON coach_challenges
  FOR UPDATE TO authenticated
  USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'league_admin'
        AND is_active = true
    )
  )
  WITH CHECK (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'league_admin'
        AND is_active = true
    )
  );

-- Drop and recreate shoutout_categories INSERT policy
DROP POLICY IF EXISTS "shoutout_categories_insert" ON shoutout_categories;
CREATE POLICY "shoutout_categories_insert" ON shoutout_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    is_default = false
    AND created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND is_active = true
    )
  );

-- =============================================================================
-- Fix 3: Explicit GRANTs for new tables
-- Supabase default privileges should handle this, but adding explicitly
-- to be safe (required for PostgREST to access the tables).
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON shoutout_categories TO authenticated;
GRANT SELECT ON shoutout_categories TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON shoutouts TO authenticated;
GRANT SELECT ON shoutouts TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON coach_challenges TO authenticated;
GRANT SELECT ON coach_challenges TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON challenge_participants TO authenticated;
GRANT SELECT ON challenge_participants TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON xp_ledger TO authenticated;
GRANT SELECT ON xp_ledger TO anon;

-- =============================================================================
-- DONE
-- =============================================================================
