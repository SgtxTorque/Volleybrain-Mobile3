# CC-ENGAGEMENT-PHASE2-SKILL-CONTENT
# Lynx Player Engagement System — Phase 2: Skill Content Seeding
# Status: READY FOR CC EXECUTION
# Depends on: Phase 1 complete (all tables exist, quest engine running)

---

## STANDING RULES

1. **Read these files first, in order:**
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
   - `SCHEMA_REFERENCE.csv` in repo root
2. **Do NOT modify any existing hooks, components, screens, or service files.**
3. **Do NOT modify any existing database table structures.**
4. **Commit after each phase.** Commit message format: `[engagement-content] Phase X: description`
5. **If something is unclear, STOP and report back.**
6. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Seeds the `skill_content`, `skill_quizzes`, and `journey_nodes` tables with real volleyball training content for Chapters 1 (First Touch) and 2 (Serve It Up). Maps mascot illustrations from `assets/images/activitiesmascot/` to each piece of content. After this spec, the Journey Path has playable content.

This spec creates:
1. A migration file with INSERT statements for skill content, quizzes, and journey nodes
2. An asset mapping reference file that documents which mascot image maps to which content

---

## ASSET INVENTORY

The following mascot illustrations exist in `assets/images/activitiesmascot/`:

**Passing / Chapter 1 (First Touch):**
- BEGINNERPASS.png — cub in basic passing stance
- WALLPASS.png — cub passing against a wall
- MOREPASSING.png — cub mid-pass, ball in motion
- BUDDYPASS.png — two cubs passing together on court
- SELFPASS.png — cub self-passing (toss and pass)
- PARENTPASS.png — cub passing with parent (dark brown lynx)
- DIVEPASS.png — cub diving for a pass
- PANCAKE.png — cub doing a pancake dig
- CALLBALL.png — cub calling the ball with open mouth, ready stance
- 3PERSONPEPPER.png — three cubs in pepper drill formation

**Serving / Chapter 2 (Serve It Up):**
- UNDERHANDSERVE.png — cub in underhand serve posture
- OVERHANDSERVE.png — dark brown cub in overhand serve motion
- BEGINNERJUMPSERVE.png — cub mid-jump serve approach
- ADVANCEJUMPSERVE.png — cub in full jump serve motion, aggressive

**Setting / Hitting / Net Play:**
- SETTERHANDS.png — cub showing setter hand position
- HITAPPROACH.png — cub in hitting approach footwork
- BACKROWATTACK.png — cub attacking from back row

**Defense:**
- defenseready.png — cub in low defensive ready position with wristbands
- DIVEPASS.png — reusable for defense chapter too

**Movement / Conditioning:**
- MOVEMENTDRILL.png — cub with directional arrows showing lateral movement
- GETACTIVE.png — cub doing agility ladder drill
- RUSSIANTWIST.png — cub doing Russian twist exercise
- PUSHUP.png — cub in pushup position with ball

**Streak / Engagement States:**
- NOSTREAK.png — sleepy/bored cub
- 2DAYSTREAKNEXTLEVEL.png — cub looking determined, fist up
- 3DAYSTREAK.png — cub surrounded by flames, confident
- 7DAYSTREAK.png — cub with flames, fist pump
- EXERCISESTREAK.png — cub flexing after workout
- 100DAYSTREAKLEGENDARY.png — legendary golden aura cub
- onfire.png — cub engulfed in flames

**Social / Team:**
- ENCOURAGINGTEAMMATE.png — two cubs, one encouraging the other
- HELPINGTEAMMATE.png — cub helping another cub up
- HELPINGNERVOUSETEAMMATE.png — cub comforting nervous teammate
- SPORTSMANSHIP.png — two cubs high-fiving
- TEAMHUDDLE.png — three cubs in team huddle
- TEAMACHIEVEMENT.png — cubs celebrating with trophy

**General / UI:**
- LYNXREADY.png — cub in confident ready stance
- AREYOUREADY.png — cub with open arms, welcoming
- VISUALIZE.png — cub meditating, thinking about volleyball
- confused.png — cub with question mark, confused pose
- SURPRISED.png — cub with wide eyes, surprised
- EXCITEDACHIEVEMENT.png — cub jumping with celebration glow
- watchingfilm.png — cub with dad watching tablet
- LIVEEATSLEEPVOLLEYBALL.png — cub sleeping with volleyball
- BACKYARDPRACTICE.png — cub and parent playing in yard
- FOOLINGAROUNDWITHDAD.png — cub and dad goofing around
- ADVANCECOACH.png — adult lynx in coach attire
- WALLSETS.png — cub setting against wall

---

## PHASE 1: Create the content migration file

Create a new file:
```
supabase/migrations/20260315_engagement_phase2_content.sql
```

### Step 1A: Chapter 1 — First Touch (Passing) Skill Content

The `skill_categories` table already has a 'passing' category from Phase 1 seed. We need its UUID. Use a subquery to reference it.

```sql
-- =============================================================================
-- LYNX ENGAGEMENT SYSTEM — PHASE 2 CONTENT SEED
-- Chapters 1 & 2 skill content, quizzes, and journey nodes
-- =============================================================================

-- ─── CHAPTER 1: FIRST TOUCH (PASSING) ─── 6 skill modules ──────────────────

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
```

### Step 1B: Chapter 2 — Serve It Up (Serving) Skill Content

```sql
-- ─── CHAPTER 2: SERVE IT UP (SERVING) ─── 7 skill modules ──────────────────

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
```

**Commit:** `[engagement-content] Phase 1: skill content for chapters 1 and 2`

---

## PHASE 2: Quiz Questions

Insert quiz questions for each skill module that has `has_quiz = true`.

```sql
-- =============================================================================
-- QUIZ QUESTIONS — Chapter 1: First Touch
-- =============================================================================

-- Platform Basics quiz
INSERT INTO skill_quizzes (skill_content_id, question_text, options, correct_option_index, explanation, sort_order) VALUES
(
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-platform-basics'),
  'Where should the ball contact your arms when passing?',
  '["Wrists", "Hands", "Forearms (meaty part)", "Elbows"]',
  2,
  'The ball should contact the flat, meaty part of your forearms. Wrists and hands cause unpredictable bounces.',
  1
),
(
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-platform-basics'),
  'What should your thumbs do when forming a platform?',
  '["Point up", "Point down and together", "Wrap around the ball", "Stay apart"]',
  1,
  'Thumbs together and pointing down creates a flat, stable platform surface.',
  2
),
(
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-platform-basics'),
  'When should you angle your platform toward your target?',
  '["After the ball hits your arms", "Before the ball arrives", "It does not matter", "Only on hard serves"]',
  1,
  'Set your platform angle before the ball arrives. Reacting after contact is too late.',
  3
);

-- Wall Passing Mastery quiz
INSERT INTO skill_quizzes (skill_content_id, question_text, options, correct_option_index, explanation, sort_order) VALUES
(
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-wall-mastery'),
  'Why is wall passing a great solo drill?',
  '["The wall is soft", "It builds arm strength", "The wall gives honest feedback on platform angle", "It is the only drill you can do alone"]',
  2,
  'The wall never lies. If your platform is off angle, the ball goes off target. Instant feedback.',
  1
),
(
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-wall-mastery'),
  'If the ball keeps going too far right, what should you adjust?',
  '["Hit harder", "Angle your platform slightly left", "Move closer to the wall", "Use your hands instead"]',
  1,
  'Adjust your platform angle toward your target. The ball goes where your platform faces.',
  2
);

-- Shuffle Step quiz
INSERT INTO skill_quizzes (skill_content_id, question_text, options, correct_option_index, explanation, sort_order) VALUES
(
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-shuffle-step'),
  'Why should you avoid crossing your feet when shuffling?',
  '["It is against the rules", "It makes you slow and off-balance", "It looks bad", "Coaches do not like it"]',
  1,
  'Crossing your feet makes you slow to change direction and puts you off balance for the pass.',
  1
),
(
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-shuffle-step'),
  'Where should your weight be when in ready position?',
  '["On your heels", "On the balls of your feet", "Evenly distributed", "On your toes"]',
  1,
  'Balls of your feet. This lets you push off quickly in any direction.',
  2
);

-- Buddy Passing quiz
INSERT INTO skill_quizzes (skill_content_id, question_text, options, correct_option_index, explanation, sort_order) VALUES
(
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-buddy-passing'),
  'How far apart should beginners start when partner passing?',
  '["5 feet", "10 feet", "20 feet", "As far as possible"]',
  1,
  '10 feet is the sweet spot. Close enough to control the ball, far enough to practice real passing angles.',
  1
),
(
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-buddy-passing'),
  'What should you call before every pass, even in a two-person drill?',
  '["Help", "Ball", "Mine", "Ready"]',
  2,
  'Always call "mine" before every pass. Build the communication habit now so it is automatic in games.',
  2
);

-- Call the Ball quiz
INSERT INTO skill_quizzes (skill_content_id, question_text, options, correct_option_index, explanation, sort_order) VALUES
(
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-call-the-ball'),
  'What happens when nobody calls the ball?',
  '["Someone else gets it", "The ball drops", "The ref calls a foul", "Nothing bad"]',
  1,
  'If nobody calls it, nobody takes it, and the ball hits the floor. Communication prevents easy errors.',
  1
),
(
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-call-the-ball'),
  'When should you call the ball?',
  '["After you pass it", "Before it arrives", "Only in games", "Only when the coach tells you"]',
  1,
  'Call the ball BEFORE it arrives. This gives your teammates time to clear out.',
  2
);

-- =============================================================================
-- QUIZ QUESTIONS — Chapter 2: Serve It Up
-- =============================================================================

-- Underhand Serve Form quiz
INSERT INTO skill_quizzes (skill_content_id, question_text, options, correct_option_index, explanation, sort_order) VALUES
(
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-underhand-form'),
  'What part of your hand contacts the ball on an underhand serve?',
  '["Fingertips", "Fist", "Heel of your open hand", "Back of your hand"]',
  2,
  'Contact with the heel of your open hand gives you the most control and a clean, flat trajectory.',
  1
),
(
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-underhand-form'),
  'Which foot should be forward when serving underhand?',
  '["Hitting-side foot", "Non-hitting-side foot", "Both feet even", "It does not matter"]',
  1,
  'Non-hitting-side foot forward. This opens your body and lets your hitting arm swing freely.',
  2
);

-- Toss Consistency quiz
INSERT INTO skill_quizzes (skill_content_id, question_text, options, correct_option_index, explanation, sort_order) VALUES
(
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-toss-consistency'),
  'How high should you toss the ball for an overhand serve?',
  '["As high as possible", "2-3 feet above your hitting shoulder", "Just above your head", "Behind you"]',
  1,
  '2-3 feet above your hitting shoulder, slightly in front. Higher tosses add variables and inconsistency.',
  1
),
(
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-toss-consistency'),
  'What percentage of a good serve comes from a consistent toss?',
  '["20%", "50%", "80%", "100%"]',
  2,
  'A consistent toss is roughly 80% of a consistent serve. Fix the toss, fix the serve.',
  2
);

-- Target Zones quiz
INSERT INTO skill_quizzes (skill_content_id, question_text, options, correct_option_index, explanation, sort_order) VALUES
(
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-target-zones'),
  'Which court zones are hardest to pass from a serve?',
  '["Zones 2 and 3 (front row)", "Zones 1 and 5 (deep corners)", "Zone 4 only", "All zones are equal"]',
  1,
  'Deep corners (zones 1 and 5) force passers to move far and pass at tough angles. Smart servers target these.',
  1
),
(
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-target-zones'),
  'Is a hard serve always better than a placed serve?',
  '["Yes, power wins", "No, placement beats power", "Only in advanced play", "Only for jump serves"]',
  1,
  'A well-placed serve that lands in a tough zone is more effective than a hard serve that goes to a comfortable passer.',
  2
);

-- Overhand Serve Intro quiz
INSERT INTO skill_quizzes (skill_content_id, question_text, options, correct_option_index, explanation, sort_order) VALUES
(
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-overhand-intro'),
  'Where should you contact the ball on an overhand serve?',
  '["Below your waist", "At the highest point you can reach", "At shoulder height", "Behind your head"]',
  1,
  'Contact at the highest point. A high contact point gives you the best angle to clear the net and drive the ball down.',
  1
),
(
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-overhand-intro'),
  'What is a good way to learn the overhand serve?',
  '["Start from the back line and hit hard", "Start close to the net and gradually move back", "Only practice with a team", "Watch videos and skip practice"]',
  1,
  'Start close (10-foot line) to build the motion and confidence, then gradually move back to the service line.',
  2
);
```

**Commit:** `[engagement-content] Phase 2: quiz questions for chapters 1 and 2`

---

## PHASE 3: Journey Nodes

Link skill content to journey nodes for Chapters 1 and 2. Each node references a skill_content row. The boss node has a challenge_config instead of a skill_content link.

```sql
-- =============================================================================
-- JOURNEY NODES — Chapter 1: First Touch (6 nodes)
-- =============================================================================

INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES

-- Node 1: Platform Basics (skill)
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 1),
  'skill', 'Platform basics', 'Learn the foundation of every pass',
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-platform-basics'),
  NULL, 20, 1, false, false, 'right', NULL
),
-- Node 2: Wall Passing (skill)
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 1),
  'skill', 'Wall passing', 'Build consistency with wall drills',
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-wall-mastery'),
  NULL, 20, 2, false, false, 'left', NULL
),
-- Node 3: Shuffle Step (skill)
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 1),
  'skill', 'Shuffle step', 'Move your feet before the ball',
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-shuffle-step'),
  NULL, 25, 3, false, false, 'right', NULL
),
-- Node 4: Buddy Passing (skill)
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 1),
  'skill', 'Buddy passing', 'Partner passing builds rhythm',
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-buddy-passing'),
  NULL, 25, 4, false, false, 'left', NULL
),
-- Node 5: Call the Ball (skill)
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 1),
  'skill', 'Call the ball', 'Communication wins rallies',
  (SELECT id FROM skill_content WHERE slug = 'vb-passing-call-the-ball'),
  NULL, 30, 5, false, false, 'center', NULL
),
-- Node 6: BOSS — First Touch Master
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 1),
  'boss', 'First touch master', 'Prove your passing mastery',
  NULL,
  '{"type": "timed_reps", "target": 20, "time_limit_seconds": 120, "description": "Pass 20 balls against the wall without dropping. 2 minute time limit.", "mascot_image": "assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png"}',
  50, 6, true, false, 'center', NULL
)

ON CONFLICT (chapter_id, sort_order) DO NOTHING;

-- =============================================================================
-- JOURNEY NODES — Chapter 2: Serve It Up (7 nodes)
-- =============================================================================

INSERT INTO journey_nodes (chapter_id, node_type, title, description, skill_content_id, challenge_config, xp_reward, sort_order, is_boss, is_bonus, position_offset, icon_emoji) VALUES

-- Node 1: Underhand Form (skill)
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 2),
  'skill', 'Underhand form', 'Start with the fundamentals',
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-underhand-form'),
  NULL, 20, 1, false, false, 'left', NULL
),
-- Node 2: Toss Consistency (skill)
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 2),
  'skill', 'Toss consistency', 'A good toss makes a good serve',
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-toss-consistency'),
  NULL, 20, 2, false, false, 'right', NULL
),
-- Node 3: Target Zones (skill)
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 2),
  'skill', 'Target zones', 'Aim with purpose',
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-target-zones'),
  NULL, 25, 3, false, false, 'left', NULL
),
-- Node 4: Overhand Intro (skill)
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 2),
  'skill', 'Overhand serve', 'Level up your serve game',
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-overhand-intro'),
  NULL, 25, 4, false, false, 'right', NULL
),
-- Node 5: Serve Receive Awareness (skill)
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 2),
  'skill', 'Serve receive IQ', 'Think like a server',
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-receive-awareness'),
  NULL, 25, 5, false, false, 'center', NULL
),
-- Node 6: Serving Under Pressure (skill)
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 2),
  'skill', 'Pressure serves', 'Routine beats nerves',
  (SELECT id FROM skill_content WHERE slug = 'vb-serving-pressure'),
  NULL, 30, 6, false, false, 'left', NULL
),
-- Node 7: BOSS — Serve Certified
(
  (SELECT id FROM journey_chapters WHERE sport = 'volleyball' AND chapter_number = 2),
  'boss', 'Serve certified', 'Earn your serve badge',
  NULL,
  '{"type": "accuracy_challenge", "target": 10, "zones": [1, 5, 6], "description": "Land 10 serves in target zones. Mix underhand and overhand.", "mascot_image": "assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png"}',
  50, 7, true, false, 'center', NULL
)

ON CONFLICT (chapter_id, sort_order) DO NOTHING;
```

**Commit:** `[engagement-content] Phase 3: journey nodes for chapters 1 and 2`

---

## PHASE 4: Asset Mapping Reference File

Create a reference file in the repo root that documents the full mascot-to-content mapping. This is for human reference, not consumed by code.

Create file:
```
MASCOT-ASSET-MAP.md
```

```markdown
# Lynx Mascot Asset Map
# Which mascot image maps to which feature/content

## Skill Content (Journey Path Nodes)

| Image | Skill Module | Chapter |
|-------|-------------|---------|
| BEGINNERPASS.png | Platform basics | 1: First Touch |
| WALLPASS.png | Wall passing mastery | 1: First Touch |
| MOVEMENTDRILL.png | Shuffle step footwork | 1: First Touch |
| BUDDYPASS.png | Buddy passing | 1: First Touch |
| CALLBALL.png | Call the ball | 1: First Touch |
| UNDERHANDSERVE.png | Underhand serve form | 2: Serve It Up |
| SELFPASS.png | Toss consistency | 2: Serve It Up |
| VISUALIZE.png | Serving to target zones | 2: Serve It Up |
| OVERHANDSERVE.png | Overhand serve intro | 2: Serve It Up |
| watchingfilm.png | Serve receive awareness | 2: Serve It Up |
| AREYOUREADY.png | Serving under pressure | 2: Serve It Up |

## Drill Demo Frames (secondary images in modules)

| Image | Used In |
|-------|---------|
| MOREPASSING.png | Platform basics, Wall passing (drill demo) |
| GETACTIVE.png | Shuffle step (drill demo) |
| PARENTPASS.png | Buddy passing (drill demo) |
| 3PERSONPEPPER.png | Call the ball (drill demo) |
| SURPRISED.png | Serving under pressure (drill demo) |

## Boss / Achievement Moments

| Image | Usage |
|-------|-------|
| EXCITEDACHIEVEMENT.png | Chapter boss completion celebration |
| TEAMACHIEVEMENT.png | Team quest completion |
| 100DAYSTREAKLEGENDARY.png | 100-day streak milestone |

## Streak States

| Image | Streak State |
|-------|-------------|
| NOSTREAK.png | Streak broken / no active streak |
| 2DAYSTREAKNEXTLEVEL.png | Building momentum (2-day streak) |
| 3DAYSTREAK.png | 3-day streak active |
| 7DAYSTREAK.png | 7-day streak milestone |
| EXERCISESTREAK.png | Post-workout streak check-in |
| onfire.png | Hot streak (14+ days) |
| 100DAYSTREAKLEGENDARY.png | Legendary 100-day streak |

## Social / Team Quests

| Image | Usage |
|-------|-------|
| ENCOURAGINGTEAMMATE.png | Shoutout quest card |
| HELPINGTEAMMATE.png | Team quest progress |
| HELPINGNERVOUSETEAMMATE.png | New player encouragement |
| SPORTSMANSHIP.png | Sportsmanship badge art |
| TEAMHUDDLE.png | Team quest header |

## General UI / Ambient

| Image | Usage |
|-------|-------|
| LYNXREADY.png | Default mascot state, app open greeting |
| confused.png | Error states, "no data" empty states |
| LIVEEATSLEEPVOLLEYBALL.png | Late night push notification art |
| BACKYARDPRACTICE.png | Home drill context |
| FOOLINGAROUNDWITHDAD.png | Parent-child engagement moments |
| ADVANCECOACH.png | Coach challenge cards |
| WALLSETS.png | Setting chapter (future) |
| SETTERHANDS.png | Setting chapter (future) |
| HITAPPROACH.png | Hitting chapter (future) |
| BACKROWATTACK.png | Advanced hitting chapter (future) |
| defenseready.png | Defense chapter (future) |
| DIVEPASS.png | Defense chapter (future) |
| PANCAKE.png | Advanced defense chapter (future) |
| RUSSIANTWIST.png | Conditioning drills (future) |
| PUSHUP.png | Conditioning drills (future) |

## Unmapped (available for future use)

| Image | Suggested Use |
|-------|--------------|
| ChatGPT Image Mar 15, 2026, 04_13_11 PM.png | Rename and assign |
```

**Commit:** `[engagement-content] Phase 4: mascot asset mapping reference`

---

## PHASE 5: Verification

### Verify:

1. **skill_content rows:** Should be 11 total (5 for Chapter 1 passing + 6 for Chapter 2 serving)
2. **skill_quizzes rows:** Should be 22 total (2-3 questions per module that has_quiz = true)
3. **journey_nodes rows:** Should be 13 total (6 for Chapter 1 + 7 for Chapter 2)
4. **All subqueries resolved:** Verify that every `(SELECT id FROM ...)` subquery found a matching row. If any returned NULL, the INSERT would fail. Report which ones.
5. **Mascot image paths:** Verify that the image paths in tip_image_url and mascot_demo_frames match actual files in `assets/images/activitiesmascot/`. List any mismatches.
6. **No existing tables modified**
7. **MASCOT-ASSET-MAP.md exists** in repo root

### Report back with:

```
## VERIFICATION REPORT: Phase 2

### Content Counts:
- skill_content: [count] rows (expected 11)
- skill_quizzes: [count] rows (expected 22)  
- journey_nodes: [count] rows (expected 13)

### Subquery Resolution: ALL RESOLVED / [list failures]

### Image Path Verification:
- [count] paths checked
- Mismatches: NONE / [list]

### Asset Map: MASCOT-ASSET-MAP.md created: YES / NO

### Files Created:
- supabase/migrations/20260315_engagement_phase2_content.sql
- MASCOT-ASSET-MAP.md

### Files Modified: NONE

### Errors: NONE / [list]
```
