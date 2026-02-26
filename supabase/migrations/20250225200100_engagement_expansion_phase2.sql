-- =============================================================================
-- ENGAGEMENT EXPANSION PHASE 2: user_achievements table for non-player roles
-- =============================================================================
-- Coaches, parents, and admins can't use player_achievements (FK to players.id).
-- This table stores achievements for any profile (keyed on profiles.id).

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  stat_value_at_unlock INTEGER,
  season_id UUID,
  UNIQUE(user_id, achievement_id)
);

-- RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Anyone can read their own + org members can see each other's
CREATE POLICY "user_achievements_read" ON user_achievements
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT ur2.user_id FROM user_roles ur2
      WHERE ur2.organization_id IN (
        SELECT organization_id FROM user_roles WHERE user_id = auth.uid() AND is_active = true
      )
      AND ur2.is_active = true
    )
  );

-- App inserts via authenticated (the engine runs client-side)
CREATE POLICY "user_achievements_insert" ON user_achievements
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON user_achievements TO authenticated;
GRANT SELECT ON user_achievements TO anon;

-- =============================================================================
-- DONE
-- =============================================================================
