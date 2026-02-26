-- =============================================================================
-- ENGAGEMENT EXPANSION PHASE 1: Role-Scoped Achievements + Coach/Parent/Admin Seeds
-- =============================================================================
-- Adds target_role column to scope achievements by user role.
-- Seeds coach, parent, and admin achievements.
-- Marks community achievements as 'all' (earnable by every role).

-- =============================================================================
-- 1. ADD target_role COLUMN
-- =============================================================================
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'player';

-- =============================================================================
-- 2. UPDATE EXISTING ACHIEVEMENTS
-- =============================================================================
-- All existing achievements default to 'player' (the column default handles this).
-- Community / shoutout achievements apply to ALL roles.
UPDATE achievements SET target_role = 'all' WHERE category = 'Community';

-- =============================================================================
-- 3. SEED COACH ACHIEVEMENTS
-- =============================================================================

-- TEAM BUILDER
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport, target_role)
VALUES
  ('First Roster',       'Assign your first player to a team',          'Add a player to any team roster',             'Team Builder', 'stat_cumulative', 'common',   'roster_assignments', 1,  'lifetime', '📋', 25,  true, 100, NULL, 'coach'),
  ('Full Squad',         'Have a full roster of 12+ players',           'Build a team with at least 12 players',       'Team Builder', 'stat_cumulative', 'uncommon', 'roster_size',        12, 'lifetime', '👥', 50,  true, 101, NULL, 'coach'),
  ('Multi-Team Coach',   'Coach 3 or more teams',                       'Be assigned to 3+ teams',                     'Team Builder', 'stat_cumulative', 'rare',     'teams_coached',      3,  'lifetime', '🏫', 100, true, 102, NULL, 'coach')
ON CONFLICT DO NOTHING;

-- GAME DAY
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport, target_role)
VALUES
  ('First Whistle',      'Complete your first game',                    'Finish scoring a game',                       'Game Day', 'stat_cumulative', 'common',   'games_completed',  1,   'season',   '🏐', 25,  true, 110, 'volleyball', 'coach'),
  ('Season Veteran',     'Complete 10 games',                           'Finish scoring 10 games this season',         'Game Day', 'stat_cumulative', 'uncommon', 'games_completed',  10,  'season',   '📊', 50,  true, 111, 'volleyball', 'coach'),
  ('Grinder',            'Complete 25 games in a season',               'Finish scoring 25 games this season',         'Game Day', 'stat_cumulative', 'rare',     'games_completed',  25,  'season',   '⚙️', 100, true, 112, 'volleyball', 'coach'),
  ('Century Coach',      'Complete 100 career games',                   'Finish scoring 100 games across all seasons', 'Game Day', 'stat_cumulative', 'epic',     'career_games',     100, 'lifetime', '💯', 200, true, 113, 'volleyball', 'coach'),
  ('Winning Streak',     'Win 5 games in a row',                        'Win 5 consecutive games',                     'Game Day', 'stat_cumulative', 'rare',     'win_streak',       5,   'season',   '🔥', 100, true, 114, 'volleyball', 'coach'),
  ('Dominant Season',    'Win 80%+ of games in a season',               'Maintain 80%+ win rate for the season',       'Game Day', 'stat_cumulative', 'epic',     'season_win_pct',   80,  'season',   '👑', 200, true, 115, 'volleyball', 'coach')
ON CONFLICT DO NOTHING;

-- DEVELOPMENT
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport, target_role)
VALUES
  ('Stat Tracker',       'Enter stats for your first game',             'Submit game stats for any game',              'Development', 'stat_cumulative', 'common',   'games_with_stats',     1,  'season',   '📝', 25,  true, 120, 'volleyball', 'coach'),
  ('Data Driven',        'Enter stats for 10 games',                    'Submit game stats for 10 games',              'Development', 'stat_cumulative', 'uncommon', 'games_with_stats',     10, 'season',   '📈', 50,  true, 121, 'volleyball', 'coach'),
  ('Badge Master',       'Award 10 badges to players',                  'Recognize players with 10 badge awards',      'Development', 'stat_cumulative', 'rare',     'badges_awarded',       10, 'lifetime', '🎖️', 100, true, 122, NULL,         'coach'),
  ('Player Developer',   'Have 5 players level up under your coaching', '5 players on your teams reach a new level',   'Development', 'stat_cumulative', 'epic',     'players_leveled_up',   5,  'lifetime', '🌟', 200, true, 123, NULL,         'coach')
ON CONFLICT DO NOTHING;

-- ENGAGEMENT (coach-specific)
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport, target_role)
VALUES
  ('First Challenge',    'Create your first coach challenge',           'Post a challenge for your team',              'Engagement', 'stat_cumulative', 'common',   'challenges_created',             1, 'lifetime', '🎯', 25,  true, 130, NULL, 'coach'),
  ('Challenge Accepted', 'Create 5 challenges',                         'Post 5 challenges for your teams',            'Engagement', 'stat_cumulative', 'uncommon', 'challenges_created',             5, 'lifetime', '🏋️', 50,  true, 131, NULL, 'coach'),
  ('Motivator',          'Have 100% player participation in a challenge','Every player on a team opts into a challenge','Engagement', 'stat_cumulative', 'rare',     'full_participation_challenges',  1, 'lifetime', '💪', 100, true, 132, NULL, 'coach')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 4. SEED PARENT ACHIEVEMENTS
-- =============================================================================

-- TEAM SPIRIT
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport, target_role)
VALUES
  ('Super Fan',          'RSVP "Going" to your first event',            'Mark yourself as attending any event',        'Team Spirit', 'stat_cumulative', 'common',   'rsvps_going',     1,   'lifetime', '🎉', 25,  true, 200, NULL, 'parent'),
  ('Dedicated Fan',      'RSVP "Going" to 10 events',                   'RSVP going to 10 team events',               'Team Spirit', 'stat_cumulative', 'uncommon', 'rsvps_going',     10,  'lifetime', '📣', 50,  true, 201, NULL, 'parent'),
  ('Never Miss a Game',  'RSVP "Going" to every game in a season',      'Attend every game event in the season',       'Team Spirit', 'stat_cumulative', 'rare',     'season_rsvp_pct', 100, 'season',   '🏟️', 100, true, 202, NULL, 'parent'),
  ('Early Bird',         'RSVP within 1 hour of event creation 5 times','Be one of the first to RSVP 5 times',        'Team Spirit', 'stat_cumulative', 'uncommon', 'early_rsvps',     5,   'lifetime', '⏰', 50,  true, 203, NULL, 'parent')
ON CONFLICT DO NOTHING;

-- SUPPORT
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport, target_role)
VALUES
  ('Volunteer Rookie',   'Sign up to volunteer for your first event',   'Volunteer for any team event',                'Support', 'stat_cumulative', 'common',   'volunteer_signups', 1,  'lifetime', '🤝', 25,  true, 210, NULL, 'parent'),
  ('Team Helper',        'Volunteer for 5 events',                      'Sign up to volunteer for 5 events',           'Support', 'stat_cumulative', 'uncommon', 'volunteer_signups', 5,  'lifetime', '🙌', 50,  true, 211, NULL, 'parent'),
  ('MVP Parent',         'Volunteer for 10+ events in a season',        'Volunteer for at least 10 events this season','Support', 'stat_cumulative', 'rare',     'volunteer_signups', 10, 'season',   '🏆', 100, true, 212, NULL, 'parent')
ON CONFLICT DO NOTHING;

-- FINANCIAL
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport, target_role)
VALUES
  ('On Time',            'Make your first payment on time',              'Submit a payment before its due date',        'Financial', 'stat_cumulative', 'common',   'on_time_payments', 1, 'lifetime', '💰', 25,  true, 220, NULL, 'parent'),
  ('Always Current',     'Never have an overdue balance for a season',  'Stay current on all payments for the season', 'Financial', 'stat_cumulative', 'uncommon', 'seasons_current',  1, 'season',   '✅', 50,  true, 221, NULL, 'parent'),
  ('Paid in Full',       'Pay registration in full upfront',             'Make a lump-sum registration payment',        'Financial', 'stat_cumulative', 'rare',     'full_payments',    1, 'lifetime', '💎', 100, true, 222, NULL, 'parent')
ON CONFLICT DO NOTHING;

-- ENGAGEMENT (parent-specific)
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport, target_role)
VALUES
  ('Team Cheerleader',   'React to 5 team wall posts',                  'Like or react to 5 posts on the team wall',  'Engagement', 'stat_cumulative', 'common',   'post_reactions',  5,  'lifetime', '👏', 25,  true, 230, NULL, 'parent'),
  ('Wall of Fame',       'Create 10 team wall posts',                   'Post 10 messages on the team wall',           'Engagement', 'stat_cumulative', 'uncommon', 'posts_created',   10, 'lifetime', '📝', 50,  true, 231, NULL, 'parent'),
  ('Photo Contributor',  'Upload 10 photos to the team gallery',        'Share 10 photos in the team gallery',         'Engagement', 'stat_cumulative', 'uncommon', 'photos_uploaded', 10, 'lifetime', '📸', 50,  true, 232, NULL, 'parent'),
  ('Multi-Sport Parent', 'Have children on 2+ teams',                   'Register children on at least 2 teams',       'Engagement', 'stat_cumulative', 'rare',     'children_teams',  2,  'lifetime', '⚽', 100, true, 233, NULL, 'parent')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 5. SEED ADMIN ACHIEVEMENTS
-- =============================================================================

-- OPERATIONS
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport, target_role)
VALUES
  ('First Season',         'Create your first season',                   'Set up a new season for your organization',    'Operations', 'stat_cumulative', 'common',   'seasons_created',    1,    'lifetime', '📅', 25,  true, 300, NULL, 'admin'),
  ('Organization Builder', 'Have 50+ registered players',                'Grow your organization to 50 players',         'Operations', 'stat_cumulative', 'uncommon', 'total_players',      50,   'lifetime', '🏢', 50,  true, 301, NULL, 'admin'),
  ('Growth Machine',       'Have 100+ registered players',               'Grow your organization to 100 players',        'Operations', 'stat_cumulative', 'rare',     'total_players',      100,  'lifetime', '🚀', 100, true, 302, NULL, 'admin'),
  ('Multi-Season Pro',     'Complete 3 seasons',                          'Successfully run 3 full seasons',             'Operations', 'stat_cumulative', 'uncommon', 'seasons_completed',  3,    'lifetime', '🔄', 50,  true, 303, NULL, 'admin'),
  ('Revenue Milestone',    'Collect $5,000+ in a season',                 'Process $5,000 or more in season payments',   'Operations', 'stat_cumulative', 'rare',     'season_revenue',     5000, 'season',   '💵', 100, true, 304, NULL, 'admin')
ON CONFLICT DO NOTHING;

-- MANAGEMENT
INSERT INTO achievements (name, description, how_to_earn, category, type, rarity, stat_key, threshold, threshold_type, icon, xp_reward, is_active, display_order, sport, target_role)
VALUES
  ('Team Architect',        'Create 5 teams',                            'Build 5 teams in your organization',           'Management', 'stat_cumulative', 'common',   'teams_created',            5,  'lifetime', '🏗️', 25,  true, 310, NULL, 'admin'),
  ('Communication King',    'Send 10 blast messages',                    'Send 10 announcements to your organization',   'Management', 'stat_cumulative', 'uncommon', 'blasts_sent',              10, 'lifetime', '📡', 50,  true, 311, NULL, 'admin'),
  ('Registration Master',   'Process 50 registrations',                  'Approve 50 player registrations',              'Management', 'stat_cumulative', 'uncommon', 'registrations_processed',  50, 'lifetime', '📋', 50,  true, 312, NULL, 'admin')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 6. GRANT ACCESS TO target_role COLUMN
-- =============================================================================
-- No explicit GRANT needed for a column — the existing table-level GRANTs cover it.

-- =============================================================================
-- DONE — Phase 1 migration complete
-- =============================================================================
