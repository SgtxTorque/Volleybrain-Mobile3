-- =============================================================================
-- LYNX ENGAGEMENT SYSTEM — PHASE 2 CONTENT SEED
-- Chapters 1 & 2 skill content, quizzes, and journey nodes
-- =============================================================================

-- ─── CHAPTER 1: FIRST TOUCH (PASSING) ─── 5 skill modules ──────────────────

INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES

-- Module 1: Platform Basics
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'passing'),
  'volleyball', 'beginner',
  'Platform basics',
  'vb-passing-platform-basics',
  'Your platform is the flat surface you make with your forearms to pass the ball. Keep your arms straight, thumbs together and pointing down, and contact the ball on the meaty part of your forearms — not your wrists, not your hands. Angle your platform toward your target before the ball arrives.',
  'assets/images/activitiesmascot/BEGINNERPASS.png',
  'Wall passing',
  'Stand 6 feet from a flat wall. Pass the ball against the wall and let it bounce back. Focus on keeping your platform flat and angled slightly upward. Count consecutive passes without losing control. Goal: 20 in a row.',
  '3 sets of 20 passes',
  'home',
  '["assets/images/activitiesmascot/BEGINNERPASS.png", "assets/images/activitiesmascot/MOREPASSING.png"]',
  true, 10, 20, 15, 1
),

-- Module 2: Wall Passing Drill
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'passing'),
  'volleyball', 'beginner',
  'Wall passing mastery',
  'vb-passing-wall-mastery',
  'Wall passing is the single best solo drill for building passing consistency. The wall never lies — if your platform angle is off, the ball goes off target. Focus on soft hands, quiet feet, and a consistent contact point. Move your feet to the ball instead of reaching with your arms.',
  'assets/images/activitiesmascot/WALLPASS.png',
  'Alternating height wall passes',
  'Stand 8 feet from the wall. Pass the ball high on the wall (above your head height), then low (waist height), alternating. This builds control at different platform angles. If you lose control, reset and start the count over.',
  '3 sets of 15 alternating passes',
  'home',
  '["assets/images/activitiesmascot/WALLPASS.png", "assets/images/activitiesmascot/MOREPASSING.png"]',
  true, 10, 20, 15, 2
),

-- Module 3: Shuffle Step Footwork
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'passing'),
  'volleyball', 'beginner',
  'Shuffle step footwork',
  'vb-passing-shuffle-step',
  'Great passers move their feet BEFORE the ball arrives. The shuffle step keeps you balanced and ready: stay low, feet shoulder-width apart, push off the outside foot and slide laterally. Never cross your feet — crossing makes you slow and off-balance. Keep your weight on the balls of your feet.',
  'assets/images/activitiesmascot/MOVEMENTDRILL.png',
  'Lateral shuffle drill',
  'Set up two markers 10 feet apart. Shuffle from one to the other and back. Stay low in your passing stance the entire time. Touch each marker with your outside hand. Focus on quick, short steps — not big lunges.',
  '3 sets of 30 seconds, rest 15 seconds between',
  'home',
  '["assets/images/activitiesmascot/MOVEMENTDRILL.png", "assets/images/activitiesmascot/GETACTIVE.png"]',
  true, 10, 20, 15, 3
),

-- Module 4: Buddy Passing
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'passing'),
  'volleyball', 'beginner',
  'Buddy passing',
  'vb-passing-buddy-passing',
  'Passing with a partner teaches you rhythm, communication, and reading the ball off someone else''s hands. Start close (10 feet apart) and focus on passing to your partner''s chest every time. Call "mine" before every pass, even in a two-person drill. Build the habit now.',
  'assets/images/activitiesmascot/BUDDYPASS.png',
  'Partner rally',
  'Face your partner 10 feet apart. Pass back and forth without letting the ball touch the ground. Count your consecutive passes. When you hit 20, take one step back each. Keep going until you miss, then reset to 10 feet.',
  '50 total passes, try for longest rally',
  'court',
  '["assets/images/activitiesmascot/BUDDYPASS.png", "assets/images/activitiesmascot/PARENTPASS.png"]',
  true, 10, 20, 15, 4
),

-- Module 5: Call the Ball
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'passing'),
  'volleyball', 'beginner',
  'Call the ball',
  'vb-passing-call-the-ball',
  'Communication wins rallies. When the ball is coming to you, call "MINE!" loud and clear before it arrives. This tells your teammates to clear out and lets you take the ball with confidence. Never assume someone else will call it. If nobody calls it, nobody takes it, and the ball drops.',
  'assets/images/activitiesmascot/CALLBALL.png',
  'Three-person pepper with calls',
  'Get two friends. Stand in a triangle, 10 feet apart. Pass the ball around the triangle — every person MUST call "mine" before they pass. If someone forgets to call, the rally resets to zero. Goal: 15 consecutive called passes.',
  '3 rounds of 15 called passes',
  'court',
  '["assets/images/activitiesmascot/CALLBALL.png", "assets/images/activitiesmascot/3PERSONPEPPER.png"]',
  true, 10, 20, 15, 5
)

ON CONFLICT (sport, slug) DO NOTHING;

-- ─── CHAPTER 2: SERVE IT UP (SERVING) ─── 6 skill modules ──────────────────

INSERT INTO skill_content (category_id, sport, difficulty, title, slug, tip_text, tip_image_url, drill_title, drill_instructions, drill_reps, drill_location, mascot_demo_frames, has_quiz, xp_tip, xp_drill, xp_quiz, sort_order) VALUES

-- Module 1: Underhand Serve Form
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'serving'),
  'volleyball', 'beginner',
  'Underhand serve form',
  'vb-serving-underhand-form',
  'The underhand serve is where every player starts. Stand with your non-hitting foot forward. Hold the ball in your non-hitting hand at waist height. Swing your hitting arm straight back and forward like a pendulum — contact the ball with the heel of your open hand. Follow through toward your target.',
  'assets/images/activitiesmascot/UNDERHANDSERVE.png',
  'Underhand serve to the wall',
  'Stand 15 feet from a wall. Practice the underhand serve motion hitting the ball into the wall above a line (tape a piece of tape at net height, about 7 feet). Focus on consistent contact with the heel of your hand. The ball should travel in a flat arc, not a high lob.',
  '3 sets of 10 serves',
  'home',
  '["assets/images/activitiesmascot/UNDERHANDSERVE.png"]',
  true, 10, 20, 15, 1
),

-- Module 2: Toss Consistency
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'serving'),
  'volleyball', 'beginner',
  'Toss consistency',
  'vb-serving-toss-consistency',
  'A bad toss ruins a good serve. For underhand serves, barely toss the ball — just lift it 6 inches out of your hand. For overhand serves, toss the ball 2-3 feet above your hitting shoulder, slightly in front. The toss should go straight up, not behind you or to the side. A consistent toss is 80% of a consistent serve.',
  'assets/images/activitiesmascot/SELFPASS.png',
  'Toss and catch',
  'Stand in your serving position. Toss the ball to your hitting zone (just above your shoulder, slightly in front) and catch it WITHOUT swinging. The ball should land in the same spot every time. Do 20 tosses. If more than 3 land in a different spot, start over.',
  '20 tosses, aim for 17+ in the zone',
  'home',
  '["assets/images/activitiesmascot/SELFPASS.png"]',
  true, 10, 20, 15, 2
),

-- Module 3: Target Zones
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'serving'),
  'volleyball', 'beginner',
  'Serving to target zones',
  'vb-serving-target-zones',
  'Serving is not just getting the ball over the net. Great servers aim for specific zones. The court has 6 zones — the deep corners (zones 1 and 5) and the short middle (zone 6) are the hardest to pass. Start by just aiming left or right. As you improve, aim for specific zones. A serve that lands where you aimed is worth more than a hard serve that goes anywhere.',
  'assets/images/activitiesmascot/VISUALIZE.png',
  'Zone targeting',
  'Set up targets on the court (cones, towels, or bags) in zones 1, 5, and 6. Serve 10 balls, trying to hit each zone. Score: 3 points for hitting the target, 1 point for the correct zone, 0 for wrong zone. Track your score over time.',
  '10 serves to targets, 3 rounds',
  'court',
  '["assets/images/activitiesmascot/VISUALIZE.png"]',
  true, 10, 20, 15, 3
),

-- Module 4: Overhand Serve Intro
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'serving'),
  'volleyball', 'beginner',
  'Overhand serve intro',
  'vb-serving-overhand-intro',
  'The overhand serve gives you more power and control than underhand. Stand sideways to the net, toss the ball above your hitting shoulder, and swing through with a high elbow. Contact the ball at the highest point you can reach with the heel of your hand. Your hand should be open and firm, like you are giving the ball a high five.',
  'assets/images/activitiesmascot/OVERHANDSERVE.png',
  'Overhand serve progression',
  'Step 1: Stand at the 10-foot line (not the back line). Serve overhand over the net from close range. Get 5 over, then take one step back. Step 2: Keep stepping back until you reach the service line. Step 3: Once you can get 7 out of 10 over from the back line, you own the overhand serve.',
  'Start close, work back. 10 attempts per distance.',
  'court',
  '["assets/images/activitiesmascot/OVERHANDSERVE.png"]',
  true, 10, 20, 15, 4
),

-- Module 5: Serve Receive Awareness
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'serving'),
  'volleyball', 'beginner',
  'Serve receive awareness',
  'vb-serving-receive-awareness',
  'Understanding serve receive makes you a better server. When you know where passers stand and where they struggle, you can serve to those spots. Watch the other team during warmups. Notice which passers look uncomfortable. The short serve to zone 4 catches most beginners off guard because they are standing deep.',
  'assets/images/activitiesmascot/watchingfilm.png',
  'Watch and plan',
  'Watch one full set of volleyball (live or video). For every serve, write down: (1) where the serve landed, (2) was the pass good or bad? After 10 serves, look at your notes. Which zones produced the most bad passes? That is where you should aim.',
  'Watch 10 serves and chart results',
  'home',
  '["assets/images/activitiesmascot/watchingfilm.png"]',
  false, 10, 20, 0, 5
),

-- Module 6: Serving Under Pressure
(
  (SELECT id FROM skill_categories WHERE sport = 'volleyball' AND name = 'serving'),
  'volleyball', 'beginner',
  'Serving under pressure',
  'vb-serving-pressure',
  'Game serves feel different from practice serves. Your heart beats faster, everyone is watching, and the serve line feels 10 feet further away. The fix: simulate pressure in practice. Give yourself consequences for missed serves. Create a routine (bounce the ball twice, take a breath, pick your target) and follow it every single time. Routine beats nerves.',
  'assets/images/activitiesmascot/AREYOUREADY.png',
  'Pressure serve game',
  'Serve 10 balls. You start with 5 points. Every serve that goes in: +1 point. Every miss: -2 points. If you hit 10 points, you win. If you hit 0, start over. This simulates the pressure of a real game serve because misses cost double.',
  '10 serves per round, play 3 rounds',
  'court',
  '["assets/images/activitiesmascot/AREYOUREADY.png", "assets/images/activitiesmascot/SURPRISED.png"]',
  false, 10, 20, 0, 6
)

ON CONFLICT (sport, slug) DO NOTHING;
