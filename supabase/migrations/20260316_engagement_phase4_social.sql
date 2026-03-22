-- =============================================================================
-- LYNX ENGAGEMENT SYSTEM — PHASE 4: SOCIAL + LOCK-IN
-- Notification engine, team quests, leaderboard support
-- =============================================================================

-- ─── In-app notifications ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  mascot_image TEXT,
  mascot_tone TEXT NOT NULL DEFAULT 'positive',
  action_url TEXT,
  action_data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_player_notifications_player ON player_notifications(player_id, is_read, created_at DESC);
CREATE INDEX idx_player_notifications_type ON player_notifications(notification_type);

ALTER TABLE player_notifications ENABLE ROW LEVEL SECURITY;

-- Players read their own notifications
CREATE POLICY "notifications_player_select" ON player_notifications
  FOR SELECT TO authenticated
  USING (player_id = auth.uid());

-- Players can mark their own as read
CREATE POLICY "notifications_player_update" ON player_notifications
  FOR UPDATE TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- Service/system can insert
CREATE POLICY "notifications_service_insert" ON player_notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ─── Team quests ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  quest_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  xp_reward_per_player INTEGER NOT NULL,
  target_value INTEGER NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  week_start DATE NOT NULL,
  is_auto_generated BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_team_quests_team_week ON team_quests(team_id, week_start);
CREATE INDEX idx_team_quests_active ON team_quests(team_id, is_completed);

ALTER TABLE team_quests ENABLE ROW LEVEL SECURITY;

-- All team members can read their team's quests
CREATE POLICY "team_quests_member_select" ON team_quests
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT tp.team_id FROM team_players tp
      JOIN players p ON p.id = tp.player_id
      WHERE p.parent_account_id = auth.uid()
    )
    OR
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      WHERE ts.user_id = auth.uid() AND ts.is_active = true
    )
  );

-- Coaches can create team quests
CREATE POLICY "team_quests_coach_insert" ON team_quests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_staff ts
      JOIN user_roles ur ON ur.user_id = ts.user_id
      WHERE ts.user_id = auth.uid()
        AND ts.team_id = team_id
        AND ts.is_active = true
        AND ur.role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND ur.is_active = true
    )
  );

-- Service can insert auto-generated quests and update progress
CREATE POLICY "team_quests_service_insert" ON team_quests
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "team_quests_service_update" ON team_quests
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Team quest individual contributions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_quest_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_quest_id UUID NOT NULL REFERENCES team_quests(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contribution_value INTEGER NOT NULL DEFAULT 0,
  last_contributed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_quest_id, player_id)
);

CREATE INDEX idx_tq_contributions_quest ON team_quest_contributions(team_quest_id);
CREATE INDEX idx_tq_contributions_player ON team_quest_contributions(player_id);

ALTER TABLE team_quest_contributions ENABLE ROW LEVEL SECURITY;

-- Team members can read contributions
-- Under-13 check happens in app logic, not RLS
CREATE POLICY "tq_contributions_select" ON team_quest_contributions
  FOR SELECT TO authenticated
  USING (
    team_quest_id IN (
      SELECT tq.id FROM team_quests tq
      WHERE tq.team_id IN (
        SELECT tp.team_id FROM team_players tp
        JOIN players p ON p.id = tp.player_id
        WHERE p.parent_account_id = auth.uid()
      )
    )
    OR
    team_quest_id IN (
      SELECT tq.id FROM team_quests tq
      WHERE tq.team_id IN (
        SELECT ts.team_id FROM team_staff ts
        WHERE ts.user_id = auth.uid() AND ts.is_active = true
      )
    )
  );

-- Service can insert/update
CREATE POLICY "tq_contributions_service_insert" ON team_quest_contributions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "tq_contributions_service_update" ON team_quest_contributions
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Early Bird RSVP tracking ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS early_bird_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rsvp_order INTEGER NOT NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, player_id)
);

CREATE INDEX idx_early_bird_event ON early_bird_claims(event_id);

ALTER TABLE early_bird_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "early_bird_select" ON early_bird_claims
  FOR SELECT TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "early_bird_insert" ON early_bird_claims
  FOR INSERT TO authenticated
  WITH CHECK (true);
