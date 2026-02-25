-- =============================================================================
-- ENGAGEMENT SYSTEM — Phase 1: Database Schema, Seeds, RLS
-- Run against Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- 1. NEW TABLES
-- =============================================================================

-- Shoutout Categories (defaults + coach custom)
CREATE TABLE IF NOT EXISTS shoutout_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  organization_id UUID REFERENCES organizations(id),
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shoutouts
CREATE TABLE IF NOT EXISTS shoutouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giver_id UUID NOT NULL REFERENCES profiles(id),
  giver_role TEXT NOT NULL,
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  receiver_role TEXT NOT NULL,
  team_id UUID REFERENCES teams(id),
  organization_id UUID NOT NULL,
  category_id UUID REFERENCES shoutout_categories(id),
  category TEXT NOT NULL,
  message TEXT,
  show_on_team_wall BOOLEAN DEFAULT true,
  post_id UUID REFERENCES team_posts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach Challenges
CREATE TABLE IF NOT EXISTS coach_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL DEFAULT 'individual',
  metric_type TEXT,
  stat_key TEXT,
  target_value INTEGER,
  xp_reward INTEGER DEFAULT 50,
  badge_id UUID REFERENCES achievements(id),
  custom_reward_text TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active',
  post_id UUID REFERENCES team_posts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge Participants
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES coach_challenges(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id),
  current_value INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  contribution INTEGER DEFAULT 0,
  opted_in_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, player_id)
);

-- XP Ledger
CREATE TABLE IF NOT EXISTS xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id),
  organization_id UUID NOT NULL,
  xp_amount INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. EXTEND PROFILES WITH XP FIELDS
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS player_level INTEGER DEFAULT 1;

-- =============================================================================
-- 3. ADD XP_REWARD COLUMN TO ACHIEVEMENTS (derived from rarity, but useful)
-- =============================================================================

ALTER TABLE achievements ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 25;

-- =============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_shoutouts_receiver ON shoutouts(receiver_id);
CREATE INDEX IF NOT EXISTS idx_shoutouts_giver ON shoutouts(giver_id);
CREATE INDEX IF NOT EXISTS idx_shoutouts_team ON shoutouts(team_id);
CREATE INDEX IF NOT EXISTS idx_shoutouts_created ON shoutouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shoutout_categories_org ON shoutout_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_coach_challenges_team ON coach_challenges(team_id);
CREATE INDEX IF NOT EXISTS idx_coach_challenges_status ON coach_challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_player ON challenge_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_player ON xp_ledger(player_id);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_created ON xp_ledger(created_at DESC);

-- =============================================================================
-- 5. SEED DEFAULT SHOUTOUT CATEGORIES
-- =============================================================================

INSERT INTO shoutout_categories (name, emoji, color, description, is_default, organization_id, created_by)
VALUES
  ('Great Effort',        '💪', '#E74C3C', 'Gave 100% effort',                              true, NULL, NULL),
  ('Leadership',          '👑', '#F39C12', 'Showed leadership on and off the court',         true, NULL, NULL),
  ('Most Improved',       '📈', '#27AE60', 'Noticeably leveling up their game',              true, NULL, NULL),
  ('Team Player',         '🤝', '#3498DB', 'Puts the team first',                            true, NULL, NULL),
  ('Clutch Player',       '🎯', '#9B59B6', 'Performs under pressure',                        true, NULL, NULL),
  ('Hardest Worker',      '🔥', '#E67E22', 'Outworks everyone',                              true, NULL, NULL),
  ('Great Communication', '📣', '#1ABC9C', 'Calls the ball, talks on the court',             true, NULL, NULL),
  ('Positive Attitude',   '☀️', '#F1C40F', 'Always uplifting, never negative',               true, NULL, NULL),
  ('Sportsmanship',       '🏅', '#2ECC71', 'Respects opponents, refs, teammates',            true, NULL, NULL),
  ('Coachable',           '🧠', '#8E44AD', 'Listens, applies feedback, grows',               true, NULL, NULL)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 6. SEED DEFAULT ACHIEVEMENTS
-- =============================================================================
-- Uses ON CONFLICT DO NOTHING to avoid duplicating if re-run.
-- We use a unique name + category combo to prevent dupes.

-- OFFENSIVE
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport)
VALUES
  ('First Blood',         'Record your first kill',              'Get 1 kill in any game',                   'Offensive', 'stat_cumulative', 'common',    'total_kills',  1,  'season', '⚔️', 25,  true, 1,  'volleyball'),
  ('Kill Shot',           '25 kills in a season',                'Accumulate 25 kills across season games',  'Offensive', 'stat_cumulative', 'uncommon',  'total_kills',  25, 'season', '💀', 50,  true, 2,  'volleyball'),
  ('Attack Machine',      '50 kills in a season',                'Accumulate 50 kills across season games',  'Offensive', 'stat_cumulative', 'rare',      'total_kills',  50, 'season', '🔨', 100, true, 3,  'volleyball'),
  ('Ace Sniper',          '10 aces in a season',                 'Serve 10 aces across season games',        'Offensive', 'stat_cumulative', 'uncommon',  'total_aces',   10, 'season', '🎯', 50,  true, 4,  'volleyball'),
  ('Service Ace Master',  '25 aces in a season',                 'Serve 25 aces across season games',        'Offensive', 'stat_cumulative', 'rare',      'total_aces',   25, 'season', '🚀', 100, true, 5,  'volleyball'),
  ('Untouchable',         '5 aces in a single game',             'Serve 5 aces in one game',                 'Offensive', 'stat_single_game','epic',      'aces',         5,  'game',   '⚡', 200, true, 6,  'volleyball')
ON CONFLICT DO NOTHING;

-- DEFENSIVE
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport)
VALUES
  ('First Dig',           'Record your first dig',               'Get 1 dig in any game',                    'Defensive', 'stat_cumulative', 'common',    'total_digs',   1,  'season', '🛡️', 25,  true, 10, 'volleyball'),
  ('Ground Zero',         '25 digs in a season',                 'Accumulate 25 digs across season games',   'Defensive', 'stat_cumulative', 'uncommon',  'total_digs',   25, 'season', '💥', 50,  true, 11, 'volleyball'),
  ('Iron Fortress',       '50 digs in a season',                 'Accumulate 50 digs across season games',   'Defensive', 'stat_cumulative', 'rare',      'total_digs',   50, 'season', '🏰', 100, true, 12, 'volleyball'),
  ('Wall Breaker',        '10 blocks in a season',               'Record 10 blocks across season games',     'Defensive', 'stat_cumulative', 'uncommon',  'total_blocks', 10, 'season', '🧱', 50,  true, 13, 'volleyball'),
  ('Block Party',         '5 blocks in a single game',           'Get 5 blocks in one game',                 'Defensive', 'stat_single_game','epic',      'blocks',       5,  'game',   '🎉', 200, true, 14, 'volleyball')
ON CONFLICT DO NOTHING;

-- PLAYMAKER
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport)
VALUES
  ('Assist King',         '25 assists in a season',              'Record 25 assists across season games',    'Playmaker', 'stat_cumulative', 'uncommon',  'total_assists', 25, 'season', '👑', 50,  true, 20, 'volleyball'),
  ('Court General',       '50 assists in a season',              'Record 50 assists across season games',    'Playmaker', 'stat_cumulative', 'rare',      'total_assists', 50, 'season', '🎖️', 100, true, 21, 'volleyball'),
  ('Puppet Master',       '10 assists in a single game',         'Get 10 assists in one game',               'Playmaker', 'stat_single_game','epic',      'assists',       10, 'game',   '🎭', 200, true, 22, 'volleyball')
ON CONFLICT DO NOTHING;

-- HEART & HUSTLE
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport)
VALUES
  ('Iron Player',         'Attend 10 consecutive practices',     'Show up to 10 practices in a row',         'Heart',     'attendance',      'uncommon',  NULL, 10, 'streak',  '💪', 50,  true, 30, 'volleyball'),
  ('Never Miss',          'Perfect attendance for a season',     'Attend every event in the season',          'Heart',     'attendance',      'rare',      NULL, 1,  'season',  '✨', 100, true, 31, 'volleyball'),
  ('Streak Machine',      '20 consecutive practices attended',   'Show up to 20 practices in a row',          'Heart',     'attendance',      'epic',      NULL, 20, 'streak',  '🔥', 200, true, 32, 'volleyball')
ON CONFLICT DO NOTHING;

-- COMMUNITY (shoutout-driven)
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport)
VALUES
  ('First Shoutout',      'Give your first shoutout',            'Send a shoutout to a teammate',             'Community', 'shoutout_given',  'common',    'shoutouts_given',    1,  'lifetime', '📢', 25,  true, 40, NULL),
  ('Hype Machine',        'Give 10 shoutouts',                   'Send 10 shoutouts to teammates',            'Community', 'shoutout_given',  'uncommon',  'shoutouts_given',    10, 'lifetime', '📣', 50,  true, 41, NULL),
  ('Community Builder',   'Give 25 shoutouts',                   'Send 25 shoutouts to teammates',            'Community', 'shoutout_given',  'rare',      'shoutouts_given',    25, 'lifetime', '🏗️', 100, true, 42, NULL),
  ('Fan Favorite',        'Receive 10 shoutouts',                'Get recognized by 10 shoutouts',            'Community', 'shoutout_received','uncommon', 'shoutouts_received', 10, 'lifetime', '⭐', 50,  true, 43, NULL),
  ('Team Legend',         'Receive 25 shoutouts',                'Get recognized by 25 shoutouts',            'Community', 'shoutout_received','rare',     'shoutouts_received', 25, 'lifetime', '🏆', 100, true, 44, NULL),
  ('Most Valued',         'Receive 50 shoutouts',                'Get recognized by 50 shoutouts',            'Community', 'shoutout_received','epic',     'shoutouts_received', 50, 'lifetime', '💎', 200, true, 45, NULL)
ON CONFLICT DO NOTHING;

-- ELITE
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport)
VALUES
  ('Triple Threat',       'Record kills, aces, and digs in one game', 'Get at least 1 kill, 1 ace, and 1 dig in a single game', 'Elite', 'stat_multi_game', 'epic',      NULL, 1, 'game',   '🔱', 200, true, 50, 'volleyball'),
  ('MVP',                 'Coach-awarded MVP for a game',        'Be named MVP by your coach',                'Elite', 'coach_awarded',   'legendary', NULL, 1, 'game',   '🏅', 500, true, 51, 'volleyball'),
  ('Season Champion',     'Win a season championship',           'Win the championship for your season',      'Elite', 'coach_awarded',   'legendary', NULL, 1, 'season', '🏆', 500, true, 52, 'volleyball'),
  ('Perfect Season',      'Undefeated season record',            'Finish the season with zero losses',        'Elite', 'team_record',     'legendary', NULL, 1, 'season', '💯', 500, true, 53, 'volleyball')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 7. UPDATE XP_REWARD FOR ANY EXISTING ACHIEVEMENTS BASED ON RARITY
-- =============================================================================
-- This ensures any previously seeded achievements get the proper xp_reward

UPDATE achievements SET xp_reward = 25  WHERE rarity = 'common'    AND (xp_reward IS NULL OR xp_reward = 25);
UPDATE achievements SET xp_reward = 50  WHERE rarity = 'uncommon'  AND (xp_reward IS NULL OR xp_reward = 25);
UPDATE achievements SET xp_reward = 100 WHERE rarity = 'rare'      AND (xp_reward IS NULL OR xp_reward = 25);
UPDATE achievements SET xp_reward = 200 WHERE rarity = 'epic'      AND (xp_reward IS NULL OR xp_reward = 25);
UPDATE achievements SET xp_reward = 500 WHERE rarity = 'legendary' AND (xp_reward IS NULL OR xp_reward = 25);

-- =============================================================================
-- 8. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE shoutout_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoutouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;

-- SHOUTOUT CATEGORIES: anyone authenticated can read defaults + their org's categories
CREATE POLICY "shoutout_categories_read" ON shoutout_categories
  FOR SELECT TO authenticated
  USING (
    is_default = true
    OR organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Only coaches/admins can insert custom categories
CREATE POLICY "shoutout_categories_insert" ON shoutout_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    is_default = false
    AND created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('coach', 'admin') AND is_active = true
    )
  );

-- Only creator can update their custom categories
CREATE POLICY "shoutout_categories_update" ON shoutout_categories
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND is_default = false)
  WITH CHECK (created_by = auth.uid() AND is_default = false);

-- SHOUTOUTS: org members can read, giver can create
CREATE POLICY "shoutouts_read" ON shoutouts
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "shoutouts_insert" ON shoutouts
  FOR INSERT TO authenticated
  WITH CHECK (giver_id = auth.uid());

-- COACH CHALLENGES: team members can read
CREATE POLICY "coach_challenges_read" ON coach_challenges
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Only coaches can create challenges
CREATE POLICY "coach_challenges_insert" ON coach_challenges
  FOR INSERT TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('coach', 'admin') AND is_active = true
    )
  );

-- Only the creating coach can update
CREATE POLICY "coach_challenges_update" ON coach_challenges
  FOR UPDATE TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- CHALLENGE PARTICIPANTS: participants can read their own, coaches can read all for their challenges
CREATE POLICY "challenge_participants_read" ON challenge_participants
  FOR SELECT TO authenticated
  USING (
    player_id = auth.uid()
    OR challenge_id IN (
      SELECT id FROM coach_challenges WHERE coach_id = auth.uid()
    )
  );

-- Players can opt themselves in
CREATE POLICY "challenge_participants_insert" ON challenge_participants
  FOR INSERT TO authenticated
  WITH CHECK (player_id = auth.uid());

-- Coaches can update progress, players can update their own
CREATE POLICY "challenge_participants_update" ON challenge_participants
  FOR UPDATE TO authenticated
  USING (
    player_id = auth.uid()
    OR challenge_id IN (
      SELECT id FROM coach_challenges WHERE coach_id = auth.uid()
    )
  );

-- XP LEDGER: players can read their own
CREATE POLICY "xp_ledger_read" ON xp_ledger
  FOR SELECT TO authenticated
  USING (player_id = auth.uid());

-- App can insert XP entries (via service role or authenticated)
CREATE POLICY "xp_ledger_insert" ON xp_ledger
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================================================
-- DONE — Phase 1 migration complete
-- =============================================================================
