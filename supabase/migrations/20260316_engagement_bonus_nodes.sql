-- =============================================================================
-- LYNX ENGAGEMENT SYSTEM — BONUS NODES FOR ALL 8 CHAPTERS
-- 16 bonus nodes with skill content across all chapters
-- These are optional "secret level" branches on the Journey Path
-- =============================================================================

-- ─── CHAPTER 1 BONUS NODES (2) ──────────────────────────────────────────────

-- Bonus 1.1: Backyard Pepper
INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'passing'),
  'volleyball', 'beginner',
  'Backyard pepper',
  'vb-bonus-backyard-pepper',
  'Pepper is the most classic volleyball warm-up drill. Two players face each other. One hits, the other digs, then sets, then hits. It''s a continuous cycle: hit-dig-set-hit-dig-set. Start slow and speed up as you get comfortable. Pepper builds every touch skill at once and it''s the most fun you can have in your backyard with a volleyball.',
  'assets/images/activitiesmascot/BACKYARDPRACTICE.png',
  'Backyard pepper rally',
  'Grab a parent, sibling, or friend. Stand 10 feet apart. Start the pepper cycle: you hit to them, they dig, set back to you, you hit again. Count your longest rally without the ball hitting the ground. Goal: 20 clean cycles. Play best of 5 rounds.',
  'Best of 5 rounds, goal: 20 cycles per round',
  'home',
  '["assets/images/activitiesmascot/BACKYARDPRACTICE.png", "assets/images/activitiesmascot/FOOLINGAROUNDWITHDAD.png"]',
  false, 10, 25, 0, 10
),

-- Bonus 1.2: Core Strength for Passers
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'passing'),
  'volleyball', 'beginner',
  'Core strength for passers',
  'vb-bonus-core-passers',
  'Your platform is only as stable as your core. A weak core means your body wobbles on contact and the ball goes off target. Three exercises that directly improve passing: Russian twists (rotational control), planks (stability), and seated ball tosses (absorbing contact while balanced). Do these 3 times a week and your passes get noticeably cleaner within 2 weeks.',
  'assets/images/activitiesmascot/RUSSIANTWIST.png',
  'Passer core circuit',
  'Circuit: (1) Russian twists with volleyball — 20 reps. (2) Plank hold — 30 seconds. (3) Sit on the ground, toss the ball up and catch it while keeping your feet off the floor — 15 reps. Rest 30 seconds. Repeat circuit 3 times.',
  '3 rounds of the circuit',
  'home',
  '["assets/images/activitiesmascot/RUSSIANTWIST.png", "assets/images/activitiesmascot/PUSHUP.png"]',
  false, 10, 25, 0, 11
)
ON CONFLICT (sport, slug) DO NOTHING;

-- Journey nodes for Ch1 bonuses
INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 1),
  'bonus', 'Backyard pepper', 'The classic warm-up',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-backyard-pepper'),
  NULL, 25, 7, false, true, 'right', NULL
),
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 1),
  'bonus', 'Core circuit', 'Strength for stable passes',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-core-passers'),
  NULL, 25, 8, false, true, 'left', NULL
)
ON CONFLICT (chapter_id, sort_order) DO NOTHING;

-- ─── CHAPTER 2 BONUS NODES (2) ──────────────────────────────────────────────

INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES

-- Bonus 2.1: Serve and Chase
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'serving'),
  'volleyball', 'beginner',
  'Serve and chase',
  'vb-bonus-serve-chase',
  'In a real game, after you serve you have to immediately get into defensive position. Most beginners serve and then stand there watching. Train yourself to serve and MOVE. The moment the ball leaves your hand, sprint to your defensive spot (position 1 or wherever your coach puts you). This drill makes the serve-to-defense transition automatic.',
  'assets/images/activitiesmascot/GETACTIVE.png',
  'Serve-sprint-ready drill',
  'Serve the ball over the net. The moment it leaves your hand, sprint to the back right corner (position 1) and get into defensive ready position before the ball crosses the net. If you are not in position before the ball reaches the other side, it does not count. 10 reps.',
  '10 serve-and-sprint reps',
  'court',
  '["assets/images/activitiesmascot/GETACTIVE.png"]',
  false, 10, 25, 0, 10
),

-- Bonus 2.2: Visualization for Serving
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'serving'),
  'volleyball', 'beginner',
  'Visualization for serving',
  'vb-bonus-viz-serving',
  'Elite athletes visualize before they perform. Before each serve, close your eyes for 3 seconds. Picture the ball leaving your hand, crossing the net, and landing exactly where you want it. See the flight path. Feel the contact. Then open your eyes and serve to that spot. Visualization is not woo-woo. It is how your brain rehearses the motor pattern before your body executes it.',
  'assets/images/activitiesmascot/VISUALIZE.png',
  'Eyes-closed serving',
  'Before each serve: close your eyes, visualize the serve landing in zone 1 (deep right corner). Open your eyes. Serve. Track how many of 10 land in or near zone 1. Then switch to zone 5 (deep left). 10 more. Compare your accuracy with visualization vs without.',
  '10 serves to zone 1 + 10 serves to zone 5 (with visualization)',
  'court',
  '["assets/images/activitiesmascot/VISUALIZE.png"]',
  false, 10, 25, 0, 11
)
ON CONFLICT (sport, slug) DO NOTHING;

INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 2),
  'bonus', 'Serve and chase', 'Serve then move',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-serve-chase'),
  NULL, 25, 8, false, true, 'left', NULL
),
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 2),
  'bonus', 'Visualization', 'See it before you do it',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-viz-serving'),
  NULL, 20, 9, false, true, 'right', NULL
)
ON CONFLICT (chapter_id, sort_order) DO NOTHING;

-- ─── CHAPTER 3 BONUS NODES (2) ──────────────────────────────────────────────

INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES

-- Bonus 3.1: Jump Training for Hitters
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'hitting'),
  'volleyball', 'intermediate',
  'Jump training',
  'vb-bonus-jump-training',
  'A higher jump means a better attack angle and more options. The two best exercises for volleyball jump height: box jumps (explosive power) and squat jumps (full range power). Do these 2-3 times a week. Never do jump training on the same day as a game or hard practice. Your legs need to be fresh to build power.',
  'assets/images/activitiesmascot/GETACTIVE.png',
  'Jump power circuit',
  'Circuit: (1) Box jumps or step-ups — 10 reps (use a sturdy surface 12-18 inches high). (2) Squat jumps — 10 reps (squat low, explode up, land soft). (3) Single leg hops — 5 each leg. Rest 60 seconds. Repeat 3 times. Focus on landing quietly (quiet = controlled).',
  '3 rounds, rest 60 seconds between',
  'home',
  '["assets/images/activitiesmascot/GETACTIVE.png"]',
  false, 10, 30, 0, 10
),

-- Bonus 3.2: Setting Against the Wall (Solo)
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'setting'),
  'volleyball', 'intermediate',
  'Solo wall setting',
  'vb-bonus-solo-wall-sets',
  'You do not need a partner to improve your setting. Wall sets are the solo setter''s best friend. Face the wall, set the ball against it at different heights and angles. The wall forces you to have a clean, consistent release because any spin or side angle shows immediately. Work up to 50 in a row without losing control.',
  'assets/images/activitiesmascot/WALLSETS.png',
  'Progressive wall sets',
  'Start 3 feet from the wall. Set 20 balls at eye height. Then move to 5 feet and set 20 at above-head height. Then 3 feet again but set alternating high/low (10 each). Track your longest streak without losing control. Goal: 50 consecutive.',
  '3 sets of 20 at different distances, then streak challenge',
  'home',
  '["assets/images/activitiesmascot/WALLSETS.png"]',
  false, 10, 25, 0, 11
)
ON CONFLICT (sport, slug) DO NOTHING;

INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 3),
  'bonus', 'Jump training', 'Build explosive power',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-jump-training'),
  NULL, 30, 7, false, true, 'right', NULL
),
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 3),
  'bonus', 'Solo wall sets', 'No partner needed',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-solo-wall-sets'),
  NULL, 25, 8, false, true, 'left', NULL
)
ON CONFLICT (chapter_id, sort_order) DO NOTHING;

-- ─── CHAPTER 4 BONUS NODES (2) ──────────────────────────────────────────────

INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES

-- Bonus 4.1: Reaction Speed Training
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'defense'),
  'volleyball', 'intermediate',
  'Reaction speed training',
  'vb-bonus-reaction-speed',
  'Defense is about reacting fast. You can train your reaction time outside of volleyball. Tennis ball drops: a partner holds a tennis ball at shoulder height and drops it. You catch it before it bounces twice. This trains the same fast-twitch reaction you need to dig a hard-driven ball. Start at 5 feet, move closer as you improve.',
  'assets/images/activitiesmascot/defenseready.png',
  'Tennis ball reaction drill',
  'Partner holds a tennis ball at shoulder height, 5 feet from you. They drop it without warning. You lunge and catch it before the second bounce. 10 reps from the front. 10 from the left. 10 from the right. Track your catch rate. Move to 4 feet when you hit 80%.',
  '30 total drops (10 front, 10 left, 10 right)',
  'home',
  '["assets/images/activitiesmascot/defenseready.png"]',
  false, 10, 25, 0, 10
),

-- Bonus 4.2: Sprawl and Recovery
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'defense'),
  'volleyball', 'intermediate',
  'Sprawl and recovery',
  'vb-bonus-sprawl-recovery',
  'The sprawl is the defensive move between a normal dig and a full dive. You extend forward, play the ball, and land on your chest/stomach, then pop right back up. The key is the recovery: after you sprawl, you need to be back on your feet and in position for the next ball. Practice the pop-up motion until it is automatic. Sprawl, push up, feet under you, ready position. 2 seconds.',
  'assets/images/activitiesmascot/PANCAKE.png',
  'Sprawl pop-up drill',
  'Start standing. On a partner''s signal, sprawl forward onto a mat (extend, land on chest). Immediately push up and get back to defensive ready position. Partner signals again. Sprawl, pop up, ready. 10 reps. Then add a ball: partner tosses short, you sprawl to dig it, pop up. 10 more.',
  '10 dry sprawl pop-ups + 10 with ball',
  'court',
  '["assets/images/activitiesmascot/PANCAKE.png", "assets/images/activitiesmascot/DIVEPASS.png"]',
  false, 10, 25, 0, 11
)
ON CONFLICT (sport, slug) DO NOTHING;

INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 4),
  'bonus', 'Reaction speed', 'Train your reflexes',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-reaction-speed'),
  NULL, 25, 6, false, true, 'left', NULL
),
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 4),
  'bonus', 'Sprawl recovery', 'Hit the floor, pop back up',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-sprawl-recovery'),
  NULL, 25, 7, false, true, 'right', NULL
)
ON CONFLICT (chapter_id, sort_order) DO NOTHING;

-- ─── CHAPTER 5 BONUS NODES (2) ──────────────────────────────────────────────

INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES

-- Bonus 5.1: Film Study Basics
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'court_iq'),
  'volleyball', 'intermediate',
  'Film study basics',
  'vb-bonus-film-study',
  'The best players study the game when they are not playing it. Watch a full set of volleyball (YouTube, TV, or your own game film if available). Do not just watch the ball. Pick one player and follow ONLY them for an entire rotation. Watch where they stand before the serve. Watch how fast they transition. Watch what they do when the ball is not coming to them. This is how you see the game within the game.',
  'assets/images/activitiesmascot/watchingfilm.png',
  'One-player film study',
  'Watch a full set (25 points) of any volleyball match. Pick one player to follow. Track: (1) where they stand in each rotation, (2) how many times they call the ball, (3) what they do between plays (communicate? celebrate? stand around?). Write 3 things they do well and 1 thing you would do differently.',
  'Watch 1 set, track 1 player, write observations',
  'home',
  '["assets/images/activitiesmascot/watchingfilm.png"]',
  false, 10, 20, 0, 10
),

-- Bonus 5.2: Hand Signals and Play Calling
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'court_iq'),
  'volleyball', 'intermediate',
  'Hand signals',
  'vb-bonus-hand-signals',
  'Setters and coaches use hand signals behind their back to call plays before the serve. The most common: one finger = quick set to the middle, two fingers = set to the outside, three = back set to the right side, a fist = go for the dump (setter attacks). Learning to read and give signals makes you part of the team''s tactical communication. It is like learning a secret language.',
  'assets/images/activitiesmascot/TEAMHUDDLE.png',
  'Signal recognition drill',
  'Have a partner flash hand signals behind their back. You call out the play within 2 seconds. Start with 3 basic signals, add more as you memorize them. Then reverse: you flash signals and your partner calls them. 20 signals each way. Track accuracy.',
  '20 signals each way, track accuracy',
  'court',
  '["assets/images/activitiesmascot/TEAMHUDDLE.png"]',
  false, 10, 25, 0, 11
)
ON CONFLICT (sport, slug) DO NOTHING;

INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 5),
  'bonus', 'Film study', 'Watch the game within the game',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-film-study'),
  NULL, 20, 9, false, true, 'left', NULL
),
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 5),
  'bonus', 'Hand signals', 'Learn the secret language',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-hand-signals'),
  NULL, 25, 10, false, true, 'right', NULL
)
ON CONFLICT (chapter_id, sort_order) DO NOTHING;

-- ─── CHAPTER 6 BONUS NODES (2) ──────────────────────────────────────────────

INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES

-- Bonus 6.1: Arm Conditioning for Power
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'hitting'),
  'volleyball', 'advanced',
  'Arm conditioning',
  'vb-bonus-arm-conditioning',
  'Power comes from your whole body, but your arm and shoulder need to be conditioned to handle the volume. Three exercises that build hitting endurance: wall ball slams (power), resistance band pull-aparts (shoulder health), and overhead med ball throws (transfer). Do this circuit 2-3 times a week. Your arm should never be the reason you slow down in a long match.',
  'assets/images/activitiesmascot/EXERCISESTREAK.png',
  'Arm power circuit',
  'Circuit: (1) Wall ball slams — slam a volleyball or med ball against the floor 15 times. (2) Resistance band pull-aparts — 20 reps (hold band in front, pull apart to shoulders). (3) Overhead med ball throw — throw forward as far as you can, 10 reps. Rest 45 seconds. 3 rounds.',
  '3 rounds of the circuit',
  'home',
  '["assets/images/activitiesmascot/EXERCISESTREAK.png"]',
  false, 10, 30, 0, 10
),

-- Bonus 6.2: Serve Receive Under Pressure
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'serving'),
  'volleyball', 'advanced',
  'Receive under pressure',
  'vb-bonus-receive-pressure',
  'The hardest skill in volleyball is not hitting or serving. It is passing a great serve under pressure. When the other team has a tough server and the score is close, the pass determines everything. Train this by having the toughest server on your team serve at you while someone keeps score out loud. "Match point. 24-23." The pressure is simulated, but your body does not know the difference.',
  'assets/images/activitiesmascot/AREYOUREADY.png',
  'Pressure passing game',
  'Your team''s best server serves at you. A coach or teammate calls fake scores before each serve: "23-24, their match point." You pass to the setter target. Good pass = +1. Bad pass or ace = -2. Play to 10 points. If you go negative, start over. The scoring pressure simulates real game intensity.',
  'Play to 10 points with pressure scoring',
  'court',
  '["assets/images/activitiesmascot/AREYOUREADY.png", "assets/images/activitiesmascot/SURPRISED.png"]',
  false, 10, 30, 0, 11
)
ON CONFLICT (sport, slug) DO NOTHING;

INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 6),
  'bonus', 'Arm conditioning', 'Build hitting endurance',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-arm-conditioning'),
  NULL, 30, 8, false, true, 'left', NULL
),
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 6),
  'bonus', 'Pressure passing', 'Handle the heat',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-receive-pressure'),
  NULL, 30, 9, false, true, 'right', NULL
)
ON CONFLICT (chapter_id, sort_order) DO NOTHING;

-- ─── CHAPTER 7 BONUS NODES (2) ──────────────────────────────────────────────

INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES

-- Bonus 7.1: Team Celebration Rituals
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'court_iq'),
  'volleyball', 'advanced',
  'Celebration rituals',
  'vb-bonus-celebrations',
  'Watch any great volleyball team and you will notice they celebrate EVERY point. Not just the big ones. A quick huddle, a fist bump circle, a specific cheer. This is not just fun. Research shows that teams who celebrate together perform better under pressure. Create a team celebration ritual with your squad. It should take 3 seconds max, involve everyone, and happen after every single point you score.',
  'assets/images/activitiesmascot/SPORTSMANSHIP.png',
  'Build your team ritual',
  'Task 1: Watch 3 different volleyball teams celebrate points (YouTube). Note what they do. Task 2: With your team, brainstorm 3 celebration ideas. Try each one for a set in practice. Task 3: Vote on the best one. Use it in your next game after EVERY point. Track: did your team''s energy change?',
  'Watch, brainstorm, vote, implement',
  'court',
  '["assets/images/activitiesmascot/SPORTSMANSHIP.png", "assets/images/activitiesmascot/TEAMACHIEVEMENT.png"]',
  false, 10, 20, 0, 10
),

-- Bonus 7.2: Helping a Nervous Teammate
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'court_iq'),
  'volleyball', 'advanced',
  'Helping a nervous teammate',
  'vb-bonus-nervous-teammate',
  'Not everyone handles pressure the same way. If you notice a teammate getting nervous (shaky hands, avoiding the ball, going quiet), here is what works: (1) Stand next to them during a timeout and say something specific and positive: "Your serve was great last game." (2) Give them an easy job: "Just get me the ball, I will handle it." (3) Celebrate them loudly when they do anything right. Never say "relax" or "don''t be nervous." That makes it worse.',
  'assets/images/activitiesmascot/HELPINGNERVOUSETEAMMATE.png',
  'Teammate support practice',
  'In your next practice, pick one teammate (don''t tell them). Your job: give them 5 specific positive comments during practice. Not generic "good job" but specific: "Great platform on that pass" or "Smart serve to zone 1." After practice, ask them how they felt. Notice if their play improved after your comments.',
  '5 specific positive comments to one teammate per practice',
  'court',
  '["assets/images/activitiesmascot/HELPINGNERVOUSETEAMMATE.png", "assets/images/activitiesmascot/ENCOURAGINGTEAMMATE.png"]',
  false, 10, 20, 0, 11
)
ON CONFLICT (sport, slug) DO NOTHING;

INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 7),
  'bonus', 'Team rituals', 'Celebrate every point',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-celebrations'),
  NULL, 20, 7, false, true, 'left', NULL
),
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 7),
  'bonus', 'Support a teammate', 'Be the calm in the storm',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-nervous-teammate'),
  NULL, 20, 8, false, true, 'right', NULL
)
ON CONFLICT (chapter_id, sort_order) DO NOTHING;

-- ─── CHAPTER 8 BONUS NODES (2) ──────────────────────────────────────────────

INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES

-- Bonus 8.1: Pre-Game Visualization Routine
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'court_iq'),
  'volleyball', 'advanced',
  'Pre-game visualization',
  'vb-bonus-pregame-viz',
  'Before your next game, find a quiet spot. Close your eyes for 5 minutes. Visualize yourself making your 3 best plays: a perfect pass, a kill, and a clutch dig. See the court. See the ball. Feel the contact. Hear the crowd. Now visualize one mistake and see yourself executing your reset routine. Open your eyes. You just rehearsed success AND recovery. You are ready for anything.',
  'assets/images/activitiesmascot/VISUALIZE.png',
  'Full visualization session',
  'Find a quiet spot before your next game. Set a timer for 5 minutes. Visualize: (1) Your best serve landing in zone 1. (2) A perfect pass to the setter. (3) A kill from the outside. (4) A mistake. Breathe. Reset. Next play. (5) The final point. Your team celebrates. Open your eyes. Go compete.',
  '5-minute visualization before next 3 games',
  'home',
  '["assets/images/activitiesmascot/VISUALIZE.png", "assets/images/activitiesmascot/LYNXREADY.png"]',
  false, 10, 20, 0, 10
),

-- Bonus 8.2: Play for Fun Challenge
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'court_iq'),
  'volleyball', 'advanced',
  'Play for fun',
  'vb-bonus-play-for-fun',
  'You started this journey because volleyball is fun. After 8 chapters of drills, quizzes, and challenges, the most important skill is remembering why you play. This is not a drill. This is a reminder. Go play volleyball with no score. No positions. No rotations. Just a ball, a net, and your friends. Laugh. Mess around. Try crazy shots. Do trick plays. This is the game. Everything else is just preparation for moments like these.',
  'assets/images/activitiesmascot/FOOLINGAROUNDWITHDAD.png',
  'Freestyle volleyball',
  'Gather friends, family, or teammates. Play volleyball with one rule: there are no rules. No score. No rotations. Try behind-the-back sets. Jump serves from the 10-foot line. Pancake everything. Play for 30 minutes minimum. No coaching allowed. Just fun.',
  '30 minutes of pure fun volleyball',
  'court',
  '["assets/images/activitiesmascot/FOOLINGAROUNDWITHDAD.png", "assets/images/activitiesmascot/BACKYARDPRACTICE.png"]',
  false, 10, 20, 0, 11
)
ON CONFLICT (sport, slug) DO NOTHING;

INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 8),
  'bonus', 'Pre-game viz', 'Rehearse success',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-pregame-viz'),
  NULL, 20, 9, false, true, 'left', NULL
),
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 8),
  'bonus', 'Play for fun', 'Remember why you started',
  (SELECT id FROM skill_content WHERE slug = 'vb-bonus-play-for-fun'),
  NULL, 20, 10, false, true, 'right', NULL
)
ON CONFLICT (chapter_id, sort_order) DO NOTHING;
