-- =============================================================================
-- LYNX ENGAGEMENT SYSTEM — CHAPTERS 3-8 CONTENT
-- Created: 2026-03-16
-- 6 chapters, ~28 skill modules, ~36 quiz questions, 40 journey nodes
-- =============================================================================

-- ─── CHAPTER 3: NET GAME — SKILL CONTENT ────────────────────────────────────

INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES

-- 3.1 Setter Hand Position
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'setting'),
  'volleyball', 'intermediate',
  'Setter hand position',
  'vb-setting-hand-position',
  'Setting starts with your hands. Shape them like you are holding a basketball above your forehead. Fingers spread wide, thumbs pointing back toward your eyes, pinkies almost touching. The ball contacts ALL ten fingers, not just your palms. Your wrists absorb the ball and push it out in one smooth motion. Think of catching and throwing in the same beat.',
  'assets/images/activitiesmascot/SETTERHANDS.png',
  'Wall sets',
  'Stand 3 feet from a wall. Set the ball against the wall using proper hand position. Focus on: ball contacting all 10 fingers, wrists snapping forward, follow-through toward target. The ball should come off your hands with backspin. Count consecutive clean sets.',
  '3 sets of 20 wall sets',
  'home',
  '["assets/images/activitiesmascot/SETTERHANDS.png", "assets/images/activitiesmascot/WALLSETS.png"]',
  true, 10, 20, 15, 1
),

-- 3.2 Setting Footwork
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'setting'),
  'volleyball', 'intermediate',
  'Setting footwork',
  'vb-setting-footwork',
  'Great setters get to the ball early and set from a stable base. Your right foot should be slightly forward (for right-handers), feet shoulder-width apart, knees bent. You should be stopped and balanced BEFORE the ball arrives. If you are still moving when you set, the ball goes wherever your momentum takes it, not where you want it to go.',
  'assets/images/activitiesmascot/MOVEMENTDRILL.png',
  'Sprint and set',
  'Start at the right sideline. Sprint to position 2/3 (setter position). A partner tosses a ball to you just as you arrive. Set it to a target (the left antenna). Focus on stopping your feet and squaring your shoulders before the ball arrives. If you set while still moving, it does not count.',
  '10 sprint-and-set reps, 3 rounds',
  'court',
  '["assets/images/activitiesmascot/MOVEMENTDRILL.png"]',
  true, 10, 20, 15, 2
),

-- 3.3 Hitting Approach
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'hitting'),
  'volleyball', 'intermediate',
  'Hitting approach',
  'vb-hitting-approach',
  'The approach is everything. A right-handed hitter uses a 3-step approach: left-right-left. The first step is slow (timing step), the second step is explosive (power step, your right foot plants hard), and the third step closes fast (left foot joins for the jump). Your arms swing back on the second step and drive up on the jump. Timing the approach to the set is the hardest skill in volleyball.',
  'assets/images/activitiesmascot/HITAPPROACH.png',
  'Approach without a ball',
  'Practice your 3-step approach without a ball, without a net. Mark your starting position. Take your left-right-left approach and jump as high as you can. Your goal: land in the same spot every time. Do 10 approaches. Then add an arm swing (swing and snap your wrist at the peak). Your feet should be automatic before you add a ball.',
  '10 dry approaches, then 10 with arm swing',
  'home',
  '["assets/images/activitiesmascot/HITAPPROACH.png"]',
  true, 10, 20, 15, 3
),

-- 3.4 Contact Point
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'hitting'),
  'volleyball', 'intermediate',
  'Contact point',
  'vb-hitting-contact-point',
  'Hit the ball at the highest point you can reach with a fully extended arm. Your hand should be open, fingers spread, and you snap your wrist over the top of the ball at contact. Think of reaching up to put something on a high shelf, then snapping the door shut. Contact the ball slightly in front of your hitting shoulder, not directly overhead. This gives you a downward angle to keep the ball in the court.',
  'assets/images/activitiesmascot/BACKROWATTACK.png',
  'Wall hitting',
  'Stand 6 feet from a wall. Toss the ball above your head with your non-hitting hand. Hit it into the wall at the highest point you can reach. Focus on: open hand, wrist snap, contact in front of your shoulder. The ball should hit the wall with topspin and bounce down. 3 sets of 10.',
  '3 sets of 10 wall hits',
  'home',
  '["assets/images/activitiesmascot/BACKROWATTACK.png"]',
  true, 10, 20, 15, 4
)

ON CONFLICT (sport, slug) DO NOTHING;

-- Chapter 3 Quizzes
INSERT INTO skill_quizzes (skill_content_id, question_text, options, correct_option_index, explanation, sort_order) VALUES
((SELECT id FROM skill_content WHERE slug = 'vb-setting-hand-position'), 'How many fingers should contact the ball when setting?', '["4 fingers", "6 fingers", "All 10 fingers", "Only thumbs and index fingers"]', 2, 'All 10 fingers contact the ball for maximum control and even distribution of force.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-setting-hand-position'), 'What spin should the ball have after a clean set?', '["Topspin", "Backspin", "Sidespin", "No spin"]', 1, 'A clean set produces backspin. This indicates even finger contact and proper follow-through.', 2),
((SELECT id FROM skill_content WHERE slug = 'vb-setting-footwork'), 'When should you be stopped and balanced relative to the ball arriving?', '["After the ball arrives", "Before the ball arrives", "It does not matter", "While jumping"]', 1, 'Stop and square up before the ball gets to you. Setting while moving causes inaccuracy.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-setting-footwork'), 'Which foot should be slightly forward for a right-handed setter?', '["Left foot", "Right foot", "Feet even", "Back foot"]', 1, 'Right foot slightly forward opens your body to the left side hitter, your primary target.', 2),
((SELECT id FROM skill_content WHERE slug = 'vb-hitting-approach'), 'What is the 3-step approach pattern for a right-handed hitter?', '["Right-left-right", "Left-right-left", "Left-left-right", "Right-right-left"]', 1, 'Left-right-left. The right foot is the power plant step, the left foot closes for the jump.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-hitting-approach'), 'What is the purpose of the first step in the approach?', '["Power", "Timing", "Speed", "Balance"]', 1, 'The first step is your timing step. It is slow and deliberate, letting you read the set.', 2),
((SELECT id FROM skill_content WHERE slug = 'vb-hitting-contact-point'), 'Where should you contact the ball relative to your shoulder?', '["Directly overhead", "Slightly in front of hitting shoulder", "Behind your head", "At waist level"]', 1, 'Contact slightly in front of your hitting shoulder gives you a downward angle to keep it in the court.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-hitting-contact-point'), 'What should your hand look like at contact?', '["Fist", "Open hand with wrist snap", "Flat palm", "Cupped hand"]', 1, 'Open hand, fingers spread, with a wrist snap over the top. This creates topspin and control.', 2);

-- Chapter 3 Journey Nodes
INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 3), 'skill', 'Setter hands', 'Shape the perfect set', (SELECT id FROM skill_content WHERE slug = 'vb-setting-hand-position'), NULL, 25, 1, false, false, 'left', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 3), 'skill', 'Setting footwork', 'Get there early', (SELECT id FROM skill_content WHERE slug = 'vb-setting-footwork'), NULL, 25, 2, false, false, 'right', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 3), 'skill', 'Hitting approach', 'The 3-step launch sequence', (SELECT id FROM skill_content WHERE slug = 'vb-hitting-approach'), NULL, 30, 3, false, false, 'left', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 3), 'skill', 'Contact point', 'Hit at the peak', (SELECT id FROM skill_content WHERE slug = 'vb-hitting-contact-point'), NULL, 30, 4, false, false, 'right', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 3), 'challenge', 'Set-hit combo', 'Put it together', NULL, '{"type": "combo_drill", "description": "Self-set against the wall 5 times, then hit 5 balls with proper approach. All in 3 minutes.", "target": 10, "time_limit_seconds": 180, "mascot_image": "assets/images/activitiesmascot/SETTERHANDS.png"}', 35, 5, false, false, 'center', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 3), 'boss', 'Net warrior', 'Prove your net game', NULL, '{"type": "combo_challenge", "description": "Complete a setting + hitting combo drill: 10 clean sets, then 10 approach hits. Alternating. Under 5 minutes.", "target": 20, "time_limit_seconds": 300, "mascot_image": "assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png"}', 50, 6, true, false, 'center', NULL)
ON CONFLICT (chapter_id, sort_order) DO NOTHING;

-- ─── CHAPTER 4: DEFENSE WINS — SKILL CONTENT ────────────────────────────────

INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES

-- 4.1 Defensive Ready Position
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'defense'),
  'volleyball', 'intermediate',
  'Defensive ready position',
  'vb-defense-ready-position',
  'Defense starts before the ball is hit. Get low with your feet wider than shoulder-width, weight forward on the balls of your feet, hands apart and in front of your knees. Your eyes track the hitter''s arm, not the ball. Read the hitter''s shoulder angle to predict where the ball is going. React AFTER you read, not before. Guessing is how balls hit the floor.',
  'assets/images/activitiesmascot/defenseready.png',
  'Ready position holds',
  'Get in your defensive ready position. Hold it for 30 seconds. A partner randomly tosses balls at you from 10 feet away (left, right, straight on). Dig each ball up without resetting your base. The goal: stay low the entire time. If you stand up between digs, start over.',
  '3 rounds of 30-second holds with random tosses',
  'court',
  '["assets/images/activitiesmascot/defenseready.png"]',
  true, 10, 20, 15, 1
),

-- 4.2 Dig Technique
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'defense'),
  'volleyball', 'intermediate',
  'Dig technique',
  'vb-defense-dig-technique',
  'A dig is a controlled pass off a hard-driven ball. Unlike a free-ball pass, you do not swing your arms. Keep your platform still and let the ball bounce off your forearms. The harder the hit, the less you move. Angle your platform toward your setter. Your job is not to make a perfect pass. Your job is to keep the ball alive and playable.',
  'assets/images/activitiesmascot/DIVEPASS.png',
  'Rapid-fire digs',
  'A partner stands on a box or chair and hits balls at you from 8 feet away. Start with medium-speed hits. Dig each ball up to a target (a bucket or another player). Focus on keeping your platform quiet and angled. Track the ball all the way into your arms. 3 sets of 10.',
  '3 sets of 10 digs',
  'court',
  '["assets/images/activitiesmascot/DIVEPASS.png"]',
  true, 10, 20, 15, 2
),

-- 4.3 Dive and Roll Recovery
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'defense'),
  'volleyball', 'intermediate',
  'Dive and roll recovery',
  'vb-defense-dive-roll',
  'Sometimes the ball is too far away for a normal dig. That is when you dive. Extend your body toward the ball, contact it with one arm (the pancake) or your platform, and roll to absorb the impact. The roll keeps you from slamming the floor. Roll onto the same-side hip and shoulder, NOT flat on your stomach. Practice the roll WITHOUT a ball first until it feels natural.',
  'assets/images/activitiesmascot/PANCAKE.png',
  'Progressive dive drill',
  'Step 1: Practice the rolling motion on a mat without a ball. Roll left 5 times, roll right 5 times. Step 2: Start on your knees. A partner tosses a ball just out of reach. Extend and dig it, then roll. Step 3: Start standing. Same drill. The progression teaches your body the motion safely.',
  'Step 1: 10 rolls. Step 2: 10 digs from knees. Step 3: 10 digs standing.',
  'court',
  '["assets/images/activitiesmascot/PANCAKE.png", "assets/images/activitiesmascot/DIVEPASS.png"]',
  true, 10, 20, 15, 3
)

ON CONFLICT (sport, slug) DO NOTHING;

-- Chapter 4 Quizzes
INSERT INTO skill_quizzes (skill_content_id, question_text, options, correct_option_index, explanation, sort_order) VALUES
((SELECT id FROM skill_content WHERE slug = 'vb-defense-ready-position'), 'What should you watch to predict where the ball is going?', '["The ball", "The setter", "The hitter''s shoulder angle", "Your coach"]', 2, 'Read the hitter''s arm and shoulder angle. Their body tells you where the ball is going before they hit it.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-defense-ready-position'), 'Where should your weight be in defensive ready position?', '["On your heels", "Forward on the balls of your feet", "Evenly distributed", "On your toes"]', 1, 'Weight forward and low lets you explode in any direction when you read the hit.', 2),
((SELECT id FROM skill_content WHERE slug = 'vb-defense-dig-technique'), 'On a hard-driven ball, how much should you swing your arms?', '["Big swing", "Medium swing", "Keep your platform still", "Swing upward"]', 2, 'On hard hits, keep your arms still. Let the ball bounce off your platform. The ball supplies the energy.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-defense-dig-technique'), 'What is the primary goal of a dig?', '["Perfect pass to setter", "Keep the ball alive and playable", "Hit it over the net", "Send it to zone 3"]', 1, 'Keep the ball off the floor and playable. A dig does not need to be perfect, just up.', 2),
((SELECT id FROM skill_content WHERE slug = 'vb-defense-dive-roll'), 'When diving, what should you roll onto?', '["Your stomach", "Your back", "Same-side hip and shoulder", "Your knees"]', 2, 'Roll onto your same-side hip and shoulder. This absorbs the impact safely and gets you back up fast.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-defense-dive-roll'), 'What should you practice FIRST before diving for balls?', '["Full-speed dives", "The rolling motion without a ball", "Jumping", "Sprinting"]', 1, 'Practice the roll without a ball until it is natural. Your body needs to know the motion before adding game speed.', 2);

-- Chapter 4 Journey Nodes
INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 4), 'skill', 'Ready position', 'Defense starts here', (SELECT id FROM skill_content WHERE slug = 'vb-defense-ready-position'), NULL, 25, 1, false, false, 'right', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 4), 'skill', 'Dig technique', 'Keep the ball alive', (SELECT id FROM skill_content WHERE slug = 'vb-defense-dig-technique'), NULL, 30, 2, false, false, 'left', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 4), 'skill', 'Dive and roll', 'Leave it all on the floor', (SELECT id FROM skill_content WHERE slug = 'vb-defense-dive-roll'), NULL, 30, 3, false, false, 'right', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 4), 'challenge', 'Dig gauntlet', 'Survive the barrage', NULL, '{"type": "timed_reps", "description": "Dig 10 balls in a row from a rapid-fire tosser without missing. If you miss, start the count over.", "target": 10, "time_limit_seconds": 120, "mascot_image": "assets/images/activitiesmascot/defenseready.png"}', 35, 4, false, false, 'center', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 4), 'boss', 'Wall of steel', 'Nothing hits the floor', NULL, '{"type": "endurance_challenge", "description": "React to 15 rapid-fire digs from a hitter. Must keep 12 or more alive. Under 2 minutes.", "target": 15, "pass_threshold": 12, "time_limit_seconds": 120, "mascot_image": "assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png"}', 50, 5, true, false, 'center', NULL)
ON CONFLICT (chapter_id, sort_order) DO NOTHING;

-- ─── CHAPTER 5: COURT COMMANDER — SKILL CONTENT ─────────────────────────────

INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES

-- 5.1 Court Positions 1-6
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'court_iq'),
  'volleyball', 'intermediate',
  'Court positions 1-6',
  'vb-courtiq-positions',
  'The volleyball court has 6 positions numbered 1 through 6. Standing at the net facing the opponent: position 4 is front left, 3 is front middle, 2 is front right. Position 5 is back left, 6 is back middle, 1 is back right (the serving position). Players rotate clockwise after winning a side-out. Every player passes through every position. Know where you are at all times.',
  'assets/images/activitiesmascot/VISUALIZE.png',
  'Position walk-through',
  'Walk through all 6 positions on a court (or draw a court with tape at home). Start in position 1. Call out your position number at each spot. Rotate clockwise through all 6. Do 3 full rotations. Then have a partner call a random position number. Sprint to that spot. 10 random call-outs.',
  '3 full rotations + 10 random position sprints',
  'court',
  '["assets/images/activitiesmascot/VISUALIZE.png"]',
  true, 10, 20, 15, 1
),

-- 5.2 Rotation Basics
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'court_iq'),
  'volleyball', 'intermediate',
  'Rotation basics',
  'vb-courtiq-rotations',
  'Your team rotates clockwise one position every time you win a side-out (you were receiving and now you serve). You MUST be in your correct rotational position when the server contacts the ball. After the serve, you can move anywhere. Front row players must stay in front of their matching back row player. Left side must stay left of middle. Overlap violations give the other team a point.',
  'assets/images/activitiesmascot/MOVEMENTDRILL.png',
  'Rotation simulation',
  'With 6 players (or markers), walk through 6 rotations. At each rotation: everyone freezes in their base position, then the "server" serves, and everyone transitions to their defensive assignments. Do each rotation twice. Focus on: who am I in front of? Who am I beside? Where do I go after the serve?',
  '6 rotations, each practiced twice',
  'court',
  '["assets/images/activitiesmascot/MOVEMENTDRILL.png"]',
  true, 10, 20, 15, 2
),

-- 5.3 Serve Receive Formations
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'court_iq'),
  'volleyball', 'intermediate',
  'Serve receive formations',
  'vb-courtiq-serve-receive',
  'Serve receive is how your team lines up to pass the opponent''s serve. The most common youth formation is a W (5 players receiving in a W shape). Your best passers take the most court. Weaker passers take less space. The setter hides at the net. Communication is everything: call "mine", call "out", call "short." Every ball must have a name on it.',
  'assets/images/activitiesmascot/TEAMHUDDLE.png',
  'Serve receive walk-through',
  'Set up a W formation with 5 players. A server serves 10 balls. After each serve, the receiver calls "mine" and passes to the setter at position 2/3. Rotate receivers every 10 serves so everyone practices each spot. Focus on spacing (nobody too close, nobody too far) and verbal calls.',
  '10 serves per rotation, each player practices 2 spots',
  'court',
  '["assets/images/activitiesmascot/TEAMHUDDLE.png", "assets/images/activitiesmascot/CALLBALL.png"]',
  true, 10, 20, 15, 3
),

-- 5.4 Transition Offense
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'court_iq'),
  'volleyball', 'intermediate',
  'Transition offense',
  'vb-courtiq-transition',
  'Transition is what happens after your team digs the ball. The dig goes to the setter, and front row hitters need to pull off the net, get in their approach position, and attack. This happens in 2-3 seconds. The key: do not stand and watch the dig. The moment your team digs, MOVE to your approach spot. Every second you waste standing means one less option for the setter.',
  'assets/images/activitiesmascot/GETACTIVE.png',
  'Dig-transition drill',
  'Start in defensive position. A coach hits a ball at your side. Someone digs it. The moment the ball is dug, sprint to your approach spot and call for the set. The setter sets you. Hit. Reset and repeat. The focus is on the speed of your transition, not the quality of the hit. 10 reps.',
  '10 dig-transition-attack reps',
  'court',
  '["assets/images/activitiesmascot/GETACTIVE.png"]',
  true, 10, 20, 15, 4
),

-- 5.5 Free Ball Plays
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'court_iq'),
  'volleyball', 'intermediate',
  'Free ball plays',
  'vb-courtiq-free-ball',
  'A free ball is a gift. When the other team cannot attack and just sends an easy ball over, your team should pounce. Someone calls "FREE!" and everyone shifts: back row moves up to pass, front row pulls off the net for approaches, and the setter gets to the net. A free ball should ALWAYS result in a good set and a strong attack. If your team wastes free balls, you are giving away points.',
  'assets/images/activitiesmascot/AREYOUREADY.png',
  'Free ball recognition drill',
  'A coach alternates between hitting hard-driven balls and sending easy free balls over the net. When the team recognizes a free ball, they must call "FREE!" and transition. Score: +2 for a kill off a free ball, +1 for a good attack, 0 for a wasted free ball. Play to 15 points.',
  'Play to 15 points',
  'court',
  '["assets/images/activitiesmascot/AREYOUREADY.png"]',
  true, 10, 20, 15, 5
),

-- 5.6 Coverage
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'court_iq'),
  'volleyball', 'intermediate',
  'Hitter coverage',
  'vb-courtiq-coverage',
  'When your teammate attacks, the other team might block the ball back onto your side. Coverage means your team surrounds the hitter in a low semicircle so those blocked balls do not hit the floor. The rule: if you are not setting and not hitting, you should be covering. Get low, get close, and be ready for the ball to come straight down off the block.',
  'assets/images/activitiesmascot/ENCOURAGINGTEAMMATE.png',
  'Coverage positions drill',
  'Run a hitting drill. After the set goes up, all non-hitters sprint to coverage positions (semicircle around the hitter, 6-8 feet away, LOW). A coach on the other side randomly blocks balls back. Coverage players must dig the blocked ball. 10 reps per hitter.',
  '10 coverage reps per rotation',
  'court',
  '["assets/images/activitiesmascot/ENCOURAGINGTEAMMATE.png"]',
  false, 10, 20, 0, 6
)

ON CONFLICT (sport, slug) DO NOTHING;

-- Chapter 5 Quizzes
INSERT INTO skill_quizzes (skill_content_id, question_text, options, correct_option_index, explanation, sort_order) VALUES
((SELECT id FROM skill_content WHERE slug = 'vb-courtiq-positions'), 'Which position is the serving position?', '["Position 3", "Position 1", "Position 6", "Position 4"]', 1, 'Position 1 (back right) is the serving position.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-courtiq-positions'), 'Which direction do teams rotate?', '["Counter-clockwise", "Clockwise", "Front to back", "It varies"]', 1, 'Teams always rotate clockwise.', 2),
((SELECT id FROM skill_content WHERE slug = 'vb-courtiq-rotations'), 'What is an overlap violation?', '["Hitting the net", "Being in the wrong rotational order when the serve is contacted", "Stepping on the line", "Touching the ball twice"]', 1, 'Players must be in correct rotational order at the moment of serve contact. Out of order = point for the other team.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-courtiq-rotations'), 'When can players move to their preferred positions?', '["Before the serve", "After the server contacts the ball", "Only during timeouts", "Never"]', 1, 'After the serve is contacted, players can move anywhere on their side. Before that, they must hold rotational order.', 2),
((SELECT id FROM skill_content WHERE slug = 'vb-courtiq-serve-receive'), 'What does the W formation look like?', '["5 players in a straight line", "5 players in a W shape with best passers taking most court", "3 players in front, 2 in back", "All 6 players receive"]', 1, 'The W shape distributes 5 passers with the best ones covering the most area. The setter hides at the net.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-courtiq-transition'), 'When should you start moving to your approach spot?', '["After the set", "After the dig", "The moment your team digs the ball", "When the coach tells you"]', 2, 'The moment the ball is dug, move. Every second standing still is a wasted option for your setter.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-courtiq-free-ball'), 'What should your team call when the opponent sends an easy ball over?', '["Ball!", "Help!", "Free!", "Mine!"]', 2, 'Call "FREE!" so everyone shifts into attack mode. Free balls are opportunities, not just plays.', 1);

-- Chapter 5 Journey Nodes
INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 5), 'skill', 'Positions 1-6', 'Know your court', (SELECT id FROM skill_content WHERE slug = 'vb-courtiq-positions'), NULL, 25, 1, false, false, 'left', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 5), 'skill', 'Rotation basics', 'Spin to win', (SELECT id FROM skill_content WHERE slug = 'vb-courtiq-rotations'), NULL, 25, 2, false, false, 'right', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 5), 'skill', 'Serve receive', 'Own the W', (SELECT id FROM skill_content WHERE slug = 'vb-courtiq-serve-receive'), NULL, 30, 3, false, false, 'left', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 5), 'skill', 'Transition offense', 'Dig and attack', (SELECT id FROM skill_content WHERE slug = 'vb-courtiq-transition'), NULL, 30, 4, false, false, 'right', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 5), 'skill', 'Free ball plays', 'Punish the gift', (SELECT id FROM skill_content WHERE slug = 'vb-courtiq-free-ball'), NULL, 30, 5, false, false, 'center', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 5), 'skill', 'Hitter coverage', 'Nothing drops', (SELECT id FROM skill_content WHERE slug = 'vb-courtiq-coverage'), NULL, 30, 6, false, false, 'left', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 5), 'challenge', 'Rotation quiz blitz', 'Prove your IQ', NULL, '{"type": "timed_quiz", "description": "Answer 10 rotation and position questions in 3 minutes. Must get 8 or more correct.", "target": 10, "pass_threshold": 8, "time_limit_seconds": 180, "mascot_image": "assets/images/activitiesmascot/VISUALIZE.png"}', 40, 7, false, false, 'right', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 5), 'boss', 'Court IQ', 'Command the court', NULL, '{"type": "combined_challenge", "description": "Full rotation walk-through quiz + dig-transition-attack drill. Must complete both. Quiz: 6/8 correct. Drill: 7/10 successful attacks.", "mascot_image": "assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png"}', 60, 8, true, false, 'center', NULL)
ON CONFLICT (chapter_id, sort_order) DO NOTHING;

-- ─── CHAPTER 6: ADVANCED ARSENAL — SKILL CONTENT ────────────────────────────

INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES

-- 6.1 Float Serve
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'serving'),
  'volleyball', 'advanced',
  'Float serve',
  'vb-serving-float',
  'A float serve has zero spin, which makes it move unpredictably in the air, like a knuckleball in baseball. The key: contact the ball with a stiff wrist and STOP your hand at contact. Do not follow through. Hit the center back of the ball with the heel of your hand. A short, sharp pop. The less spin, the more the ball moves. Float serves are harder to pass than power serves because passers cannot predict the path.',
  'assets/images/activitiesmascot/OVERHANDSERVE.png',
  'Float serve drill',
  'Serve 20 balls with a focus on zero spin. Watch the ball after you hit it. If it wobbles and moves, that is a float. If it spins, you followed through too much. Aim for 10 out of 20 with visible float movement. Stand at the back line.',
  '20 serves, track float count',
  'court',
  '["assets/images/activitiesmascot/OVERHANDSERVE.png"]',
  true, 10, 25, 15, 1
),

-- 6.2 Jump Serve Intro
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'serving'),
  'volleyball', 'advanced',
  'Jump serve intro',
  'vb-serving-jump-intro',
  'The jump serve combines your approach with a serve for maximum power. Toss the ball high (8-10 feet) and slightly in front of you. Use your hitting approach (left-right-left for righties) timed to the toss. Contact the ball at the peak of your jump with an open hand and full arm swing. This is the most powerful serve in volleyball but also the hardest to control. Master the toss first.',
  'assets/images/activitiesmascot/BEGINNERJUMPSERVE.png',
  'Jump serve progression',
  'Step 1: Stand at the back line. Toss and hit without jumping. Get 7/10 in. Step 2: Add a one-step approach. Toss, one step, jump, hit. Get 5/10 in. Step 3: Full approach. Toss, left-right-left, jump, hit. Control first, power second.',
  'Step 1: 10 reps. Step 2: 10 reps. Step 3: 10 reps.',
  'court',
  '["assets/images/activitiesmascot/BEGINNERJUMPSERVE.png", "assets/images/activitiesmascot/ADVANCEJUMPSERVE.png"]',
  true, 10, 25, 15, 2
),

-- 6.3 Off-Speed Shots
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'hitting'),
  'volleyball', 'advanced',
  'Off-speed shots',
  'vb-hitting-offspeed',
  'The best hitters are not the hardest hitters. They are the ones who keep blockers guessing. Off-speed shots include the tip (push the ball with your fingertips over the block), the roll shot (a slow topspin shot that drops behind the block), and the cut shot (a sharp angle cross-body). Use the same approach as a hard hit so the blockers commit, then change at the last second.',
  'assets/images/activitiesmascot/HITAPPROACH.png',
  'Tip and roll drill',
  'Run your normal approach. Alternate between: (1) a full swing, (2) a tip over the block (fingertips), and (3) a roll shot (slow topspin). A partner or coach calls "swing", "tip", or "roll" right before you jump. You must change your shot mid-air. 5 of each, 15 total.',
  '15 attacks: 5 full swings, 5 tips, 5 roll shots',
  'court',
  '["assets/images/activitiesmascot/HITAPPROACH.png"]',
  true, 10, 25, 15, 3
),

-- 6.4 Line vs Cross Shot Selection
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'hitting'),
  'volleyball', 'advanced',
  'Shot selection',
  'vb-hitting-shot-selection',
  'Where you hit depends on where the block is. One blocker? Hit around them. Double block with a seam? Hit through the seam. Block taking the line? Go cross. Block taking cross? Go line. Read the block while you are in the air. Your eyes should move from the set to the block to your target in a split second. Do not decide before you jump. Decide in the air.',
  'assets/images/activitiesmascot/BACKROWATTACK.png',
  'Block reading drill',
  'A coach or blocker stands at the net with their arms in different positions: blocking line, blocking cross, split block. You approach and hit to the open area. The blocker does not tell you their position. You must read it mid-air. 20 attacks, track how many you hit to the correct open zone.',
  '20 attacks with live block reading',
  'court',
  '["assets/images/activitiesmascot/BACKROWATTACK.png"]',
  true, 10, 25, 15, 4
),

-- 6.5 Back Row Attack
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'hitting'),
  'volleyball', 'advanced',
  'Back row attack',
  'vb-hitting-back-row',
  'Back row players CAN attack, but they must jump from behind the 10-foot line (attack line). The approach is the same, but you take off earlier and farther from the net. Back row attacks are valuable because the other team is not expecting them. The setter back-sets to a back row hitter who takes a big approach and crushes the ball from behind the line.',
  'assets/images/activitiesmascot/BACKROWATTACK.png',
  'Back row approach drill',
  'Mark the attack line with tape. Practice your approach starting well behind the line. Your last step must be behind the line. Jump and swing. If you land on or past the line, it does not count. 10 approaches. Then add a setter tossing a high set behind the line. Hit 10 more.',
  '10 dry approaches + 10 with sets',
  'court',
  '["assets/images/activitiesmascot/BACKROWATTACK.png"]',
  false, 10, 25, 0, 5
)

ON CONFLICT (sport, slug) DO NOTHING;

-- Chapter 6 Quizzes
INSERT INTO skill_quizzes (skill_content_id, question_text, options, correct_option_index, explanation, sort_order) VALUES
((SELECT id FROM skill_content WHERE slug = 'vb-serving-float'), 'What makes a float serve move unpredictably?', '["Heavy topspin", "Zero spin", "Sidespin", "Hitting it hard"]', 1, 'Zero spin causes the ball to move unpredictably in the air, like a knuckleball.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-serving-float'), 'What should your wrist do at contact on a float serve?', '["Snap forward", "Stay stiff and stop", "Go limp", "Rotate"]', 1, 'Stiff wrist, stop at contact. No follow-through. That is what creates zero spin.', 2),
((SELECT id FROM skill_content WHERE slug = 'vb-serving-jump-intro'), 'How high should the toss be for a jump serve?', '["2-3 feet", "5 feet", "8-10 feet", "As high as possible"]', 2, '8-10 feet gives you time to run your approach and meet the ball at the peak of your jump.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-hitting-offspeed'), 'Why should you use the same approach for off-speed shots?', '["It is easier", "So blockers commit to a hard hit, then you change", "There is only one approach", "Coaches require it"]', 1, 'Same approach sells the hard hit. Changing your shot at the last second catches the defense off guard.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-hitting-shot-selection'), 'When should you decide where to hit?', '["Before your approach", "During your approach", "In the air after reading the block", "After you hit"]', 2, 'Decide in the air. Read the block and hit to the open area. Deciding early makes you predictable.', 1),
((SELECT id FROM skill_content WHERE slug = 'vb-hitting-shot-selection'), 'If the block is taking the line, where should you hit?', '["Line", "Cross", "Straight down", "Over the block"]', 1, 'Hit cross. Go to the open area that the block is not covering.', 2);

-- Chapter 6 Journey Nodes
INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 6), 'skill', 'Float serve', 'The knuckleball', (SELECT id FROM skill_content WHERE slug = 'vb-serving-float'), NULL, 30, 1, false, false, 'right', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 6), 'skill', 'Jump serve intro', 'Maximum power', (SELECT id FROM skill_content WHERE slug = 'vb-serving-jump-intro'), NULL, 35, 2, false, false, 'left', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 6), 'skill', 'Off-speed shots', 'Keep them guessing', (SELECT id FROM skill_content WHERE slug = 'vb-hitting-offspeed'), NULL, 30, 3, false, false, 'right', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 6), 'skill', 'Shot selection', 'Read and react', (SELECT id FROM skill_content WHERE slug = 'vb-hitting-shot-selection'), NULL, 35, 4, false, false, 'left', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 6), 'skill', 'Back row attack', 'Attack from anywhere', (SELECT id FROM skill_content WHERE slug = 'vb-hitting-back-row'), NULL, 35, 5, false, false, 'center', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 6), 'challenge', 'Serve variety test', 'Float, jump, or place', NULL, '{"type": "variety_challenge", "description": "Serve 15 balls: 5 float, 5 overhand placed, 5 jump attempts. Must get 10 total in.", "target": 15, "pass_threshold": 10, "mascot_image": "assets/images/activitiesmascot/ADVANCEJUMPSERVE.png"}', 40, 6, false, false, 'right', NULL),
((SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 6), 'boss', 'Elite player', 'Arsenal unleashed', NULL, '{"type": "combined_challenge", "description": "Advanced serve + hit under timer. 5 float serves in, then 5 attacks with shot selection (read the block). 3 minute time limit.", "target": 10, "time_limit_seconds": 180, "mascot_image": "assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png"}', 60, 7, true, false, 'center', NULL)
ON CONFLICT (chapter_id, sort_order) DO NOTHING;
