# CC-CHALLENGE-SYSTEM.md
# Lynx Mobile — Challenge System: The Complete Experience

**Priority:** H1-03 — Players need engagement, season is active  
**Estimated time:** 8–10 hours (9 phases, commit after each)  
**Risk level:** MEDIUM — new feature with database tables, but well-defined scope

---

## WHAT THIS IS

The Challenge System is the third pillar of Lynx engagement (alongside Shoutouts and Achievements). Coaches issue challenges, players join them, progress is tracked, and completions are celebrated. This isn't a minor feature — it's a BIG DEAL in the app. When a player opens a challenge, it should feel like a call to action. When they complete one, it should feel like winning a trophy. When a parent asks their kid "did you finish coach's challenge this week?" — that's the engagement loop we're building.

Challenges are issued ONLY by coaches or admins. Verification is done by coaches or parents (not self-reported without verification). There is a pre-built library of challenges coaches can pick from, plus the ability to create custom ones.

---

## COACH MASCOT ASSETS

New coach mascot images are available. Copy them to the app's assets if not already there:

```bash
mkdir -p assets/images/coach-mascot
# Check both possible locations and copy
for img in coachlynxmale coachlynxmalecheer coachlynxmalewhistle coachlynxfemale coachlynxfemalecheer coachlynxfemalewhistle; do
  # Try assets/images/ first (may already be there)
  [ -f "assets/images/${img}.png" ] && cp -n "assets/images/${img}.png" "assets/images/coach-mascot/"
  # Try reference folder
  [ -f "reference/design-references/images/${img}.png" ] && cp -n "reference/design-references/images/${img}.png" "assets/images/coach-mascot/"
done
ls assets/images/coach-mascot/
```

**Mascot usage in challenges:**

| File | Pose | When to Use |
|------|------|-------------|
| `coachlynxmale.png` / `coachlynxfemale.png` | Clipboard, standing | Challenge creation, tracking dashboard, detail view, "in progress" states |
| `coachlynxmalecheer.png` / `coachlynxfemalecheer.png` | Cheering, clapping | Challenge completed, winner announced, milestone reached, celebration UI |
| `coachlynxmalewhistle.png` / `coachlynxfemalewhistle.png` | Whistle, authoritative | Active challenge CTA page, "Coach's Challenge!" hero, issuing a challenge |

Pick male or female randomly, or based on coach profile gender if available.

---

## REFERENCE FILES

1. `reference/design-references/player-mockups/s2-badges-challenges.tsx` — V0 mockup for challenges UI
2. `reference/design-references/brandbook/LynxBrandBook.html` — Brand system
3. `reference/supabase_schema.md` — Database schema
4. `app/achievements.tsx` — Current badges/achievements screen
5. `components/ParentHomeScroll.tsx` — Gold standard scroll architecture
6. `components/CoachHomeScroll.tsx` — Coach home patterns

---

## DATABASE SCHEMA

### `challenge_templates` table (the pre-built library)
```sql
CREATE TABLE IF NOT EXISTS challenge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('game', 'development', 'fun', 'team_building', 'mental', 'fitness')),
  tracking_type TEXT NOT NULL CHECK (tracking_type IN ('stat_based', 'verified', 'timed')),
  stat_category TEXT,
  default_target INTEGER,
  default_xp INTEGER DEFAULT 50,
  default_duration_days INTEGER DEFAULT 7,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'legendary')),
  mascot_pose TEXT DEFAULT 'whistle',
  badge_style TEXT,
  badge_color TEXT,
  icon TEXT,
  is_system BOOLEAN DEFAULT true,
  sport TEXT DEFAULT 'volleyball',
  age_group TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `challenges` table (active instances)
```sql
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES challenge_templates(id),
  team_id UUID REFERENCES teams(id) NOT NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('individual', 'team')),
  tracking_type TEXT NOT NULL CHECK (tracking_type IN ('stat_based', 'verified', 'timed')),
  stat_category TEXT,
  target_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 50,
  bonus_xp_winner INTEGER DEFAULT 100,
  level_reward INTEGER,
  custom_reward_text TEXT,
  badge_style TEXT,
  badge_color TEXT,
  mascot_pose TEXT DEFAULT 'whistle',
  icon TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'expired', 'cancelled')),
  winner_id UUID REFERENCES profiles(id),
  verification_type TEXT DEFAULT 'coach' CHECK (verification_type IN ('coach', 'parent', 'either')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `challenge_participants` table
```sql
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) NOT NULL,
  player_id UUID REFERENCES profiles(id) NOT NULL,
  current_value INTEGER DEFAULT 0,
  verified_value INTEGER DEFAULT 0,
  verification_notes TEXT,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  opted_in_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  UNIQUE(challenge_id, player_id)
);
```

### RLS Policies
- Players: read challenges for their team, insert/update own participation
- Coaches: full CRUD on challenges for their teams, verify any participant
- Parents: read challenges, verify their own children's submissions
- Admins: full CRUD on all challenges in their org

### Seed the Library (~25 templates)

**Game:**
1. "Ace Hunter" — Get 10 aces (stat_based, aces, medium, +75 XP)
2. "Zero Error Game" — Play a game with no hitting errors (verified, hard, +150 XP)
3. "Kill Machine" — Record 25 kills in a tournament (stat_based, kills, hard, +100 XP)
4. "Serve Streak" — Land 5 consecutive good serves (verified, medium, +75 XP)
5. "Dig Deep" — 15 digs in a single match (stat_based, digs, medium, +75 XP)
6. "Block Party" — 5 blocks in one game (stat_based, blocks, hard, +100 XP)

**Development:**
7. "Setting Practice" — Practice setting 15 min daily for a week (timed, easy, +50 XP)
8. "Wall Ball Warrior" — 100 wall ball reps outside practice (verified, medium, +75 XP)
9. "Serve 100" — 100 serve reps at home this week (verified, medium, +75 XP)
10. "Footwork Focus" — 20 min footwork drills daily for 5 days (timed, medium, +75 XP)
11. "Video Study" — Watch 3 full matches and share what you learned (verified, easy, +50 XP)
12. "Passing Perfection" — 50 perfect passes at practice (verified, medium, +75 XP)

**Fun:**
13. "Loudest Cheerleader" — Most vocal on the bench for 3 games (verified, easy, +50 XP)
14. "Hype Squad" — Give 5 shoutouts to teammates this week (stat_based, shoutouts, easy, +50 XP)
15. "New Handshake" — Create a team handshake with a teammate (verified, easy, +25 XP)
16. "Photo Day" — Get a teammate action photo of you (verified, easy, +25 XP)

**Team Building:**
17. "Full House" — Team: everyone RSVPs to next 3 events (team, verified, medium, +100 XP)
18. "100 Club" — Team: collect 100 total kills this month (team, stat_based, hard, +150 XP)
19. "Practice Perfect" — Team: 100% attendance for 2 weeks (team, verified, hard, +150 XP)
20. "Spirit Chain" — Team: every player gives a shoutout to every other player (team, verified, legendary, +200 XP)

**Mental:**
21. "Bounce Back" — After losing a set, win the next one (verified, medium, +75 XP)
22. "Calm Under Pressure" — No unforced errors in a deciding set (verified, hard, +100 XP)
23. "Captain's Log" — Write a 3-sentence reflection after each game for 4 weeks (verified, medium, +75 XP)

**Fitness:**
24. "Plank Challenge" — Hold a plank for 2 minutes (timed, medium, +50 XP)
25. "Endurance Run" — Run 1 mile under 8 minutes (timed, medium, +50 XP)

---

## PHASE 1: DATABASE + ASSETS + DATA LAYER

### 1A. Copy coach mascot assets (see command above)
### 1B. Create database tables and seed templates
### 1C. Create `lib/challenges.ts` with all CRUD, participation, progress, verification, completion, and query functions
### 1D. Create `hooks/useChallenges.ts` with hooks for challenges, detail, templates, and coach dashboard
### 1E. Add RLS policies

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: challenge system - database, template library (25 challenges), data layer, hooks"
git push
```

---

## PHASE 2: CHALLENGE LIBRARY + COACH CREATION

### 2A. `app/challenge-library.tsx`

Coach browses pre-built templates or creates custom. Coach mascot (clipboard) in the header. Category pill filter. 2-column grid of template cards with difficulty badges, XP, duration. Tap a template to customize it. "Create Your Own" button for fully custom.

### 2B. `app/create-challenge.tsx`

Single scrollable form (not multi-step — keep it fast). Pre-filled from template if selected. Sections: The Challenge (title, description, category, icon), Rules (type, tracking, verification, target, timeline with presets), Rewards (XP, level, custom prize, badge preview). Coach mascot (clipboard) beside the preview. "ISSUE CHALLENGE" big teal button.

On create: insert to DB, auto-post to team wall with coach mascot (whistle), push notification to team.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: challenge library with 25 templates, create/customize flow"
git push
```

---

## PHASE 3: PLAYER CALL-TO-ACTION PAGE

### 3A. `app/challenge-cta.tsx`

FULL-SCREEN, dark PLAYER_THEME, immersive. Coach mascot (whistle, 140px) centered. "COACH'S CHALLENGE" gold label. Title MASSIVE. Difficulty badge with glow (legendary = purple animated pulse). Target in gold text. Rewards preview (XP badge, level badge, custom prize). Participant avatar bubbles with join count and completion counter. Pulsing "ACCEPT CHALLENGE" button (60px tall). Join animation: haptic + cheering mascot slides in + confetti + "YOU'RE IN!" + avatar bubbles update. Share button for social.

If already joined: progress ring replaces CTA, "Submit Progress" and "View Leaderboard" buttons.
If completed: cheering mascot + "CHALLENGE COMPLETE!" + XP/badge earned.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: full-screen challenge CTA page with join animation, share, progress view"
git push
```

---

## PHASE 4: CHALLENGE DETAIL + LEADERBOARD

### 4A. `app/challenge-detail.tsx`

Large progress ring (140px). Leaderboard with gold/silver/bronze rank medals, player photos, progress bars, verified values. Highlighted row for viewing player. Submit progress flow: bottom sheet with number input, optional photo proof, "Submit for Coach Review." Coach verification flow: pending submissions queue, verify/adjust/reject.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: challenge detail, leaderboard, progress submission, verification flow"
git push
```

---

## PHASE 5: COACH CHALLENGE DASHBOARD

### 5A. `app/coach-challenge-dashboard.tsx`

Coach mascot (clipboard). Stats bar: Active / Joined / Needs Verification / Completed. Verification queue prioritized (shows first). Active challenges with mini leaderboards. Completed with "Reissue" option. FAB for creating new. Wired into CoachHomeScroll and coach tools.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: coach challenge dashboard with verification queue and management"
git push
```

---

## PHASE 6: CHALLENGE CARDS + TEAM WALL + NOTIFICATIONS

### 6A. `components/ChallengeCard.tsx` — 3 variants (active/needs-verification/completed)
### 6B. Team wall auto-posts: creation, milestones, completions, winners (with coach mascots)
### 6C. Push notifications for all challenge events

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 6: challenge cards, team wall integration, push notifications"
git push
```

---

## PHASE 7: HOME SCROLL INTEGRATION (ALL ROLES)

### 7A. Player home: "MY CHALLENGES" section with personal progress
### 7B. Parent home: child's challenges + verification action cards
### 7C. Coach home: "CHALLENGES" section with quick stats + CTA
### 7D. Achievements screen: CHALLENGES tab with active/available/completed

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 7: challenge integration into all role home scrolls and achievements"
git push
```

---

## PHASE 8: COMPLETION + CELEBRATION + XP

### 8A. Auto-completion: check target reached or deadline passed, determine winner
### 8B. XP awards via xp_ledger, level rewards, badge generation
### 8C. Full-screen celebration UI: winner gets confetti + cheering mascot + XP animation + badge unlock. Completers get encouraging celebration. Expired gets "try next time" with stats.
### 8D. Stat-based auto-tracking: game stats update challenge progress automatically (no manual verification needed for stat-based)

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 8: challenge completion, celebrations, XP/badge awards, stat auto-tracking"
git push
```

---

## PHASE 9: NAVIGATION + VERIFY EVERYTHING

### 9A. Wire all entry points:
- Team Hub → challenge library
- Coach Home → coach dashboard
- Coach Tools → challenges
- Team Wall post → CTA or detail
- Player Home → challenge detail
- Parent Home → challenge detail / verify
- Achievements → challenges tab
- Push notifications → appropriate screen

### 9B. Full verification (files exist, types compile, integration points wired, mascots used)

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 9: challenge system - all navigation wired, full verification"
git push
```

---

## EXPECTED RESULTS

1. **25 Pre-Built Templates** across 6 categories — coaches pick and customize, or create from scratch
2. **Challenge Library** — browseable, filterable, with coach mascot (clipboard)
3. **Full-Screen Player CTA** — immersive call to action with whistle mascot, pulsing join button, avatar bubbles, join animation with confetti and cheering mascot
4. **Leaderboard + Progress** — ranked participants with medals, progress bars, verified values, photo proof submission
5. **Coach Dashboard** — stats, verification queue (prioritized), active/completed management, reissue
6. **Coach/Parent Verification** — submissions require coach or parent approval (not self-reported), with verify/adjust/reject
7. **3 Challenge Card Variants** — active (gold border), needs-verification (parent CTA), completed (subdued)
8. **Team Wall Auto-Posts** — with coach mascots at creation, milestones, completion, winner announcement
9. **All Roles Engaged** — coaches create/manage, players join/track/celebrate, parents verify/watch proudly
10. **6 Coach Mascots** — contextually placed (clipboard=planning, whistle=active, cheering=celebration)
11. **Full Celebration UI** — winners get confetti + cheering mascot + XP count-up + badge unlock
12. **Stat Auto-Tracking** — game stats from Command Center auto-update challenge progress
13. **9 commits** — one per phase, each pushed
