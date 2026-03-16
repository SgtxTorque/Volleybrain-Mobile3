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
