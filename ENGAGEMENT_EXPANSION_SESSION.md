# VOLLEYBRAIN MOBILE APP — Session Handoff (Feb 25, 2026)
# ENGAGEMENT SYSTEM EXPANSION: Coaches, Parents & Admin Badges

## What I'm Building
VolleyBrain — a dual-platform youth sports management app (React Native/Expo mobile + React/Vite web admin) with Supabase backend.
GitHub: SgtxTorque/volleybrain-mobile3

---

## COMPLETED PREVIOUSLY
- ✅ Player engagement system (badges, shoutouts, challenges, XP, levels) — fully working
- ✅ Shoutout system (all roles can give/receive)
- ✅ Coach challenges (create, opt-in, leaderboard)
- ✅ Database: shoutouts, shoutout_categories, coach_challenges, challenge_participants, xp_ledger, achievements tables all live with RLS
- ✅ Bug fixes: RLS policies, FK resolution, GRANT permissions

---

## THIS SESSION: Expand the Achievement/Badge System to All Roles

The player achievement system is working. Now we're making coaches, parents, and admins part of the fun. Every role should feel recognized and motivated. Coaches care about badges just as much as players. Parents want to feel like they're part of the team. Admins keep the machine running and deserve credit.

### RULES
- Read SCHEMA_REFERENCE.csv before any queries
- Check what already exists — the `achievements` table is already seeded with ~30 player achievements
- Do NOT break any existing player engagement functionality
- Do NOT break any existing dashboard/screen functionality
- No console.log without `__DEV__`
- Run `npx tsc --noEmit` after each phase
- Commit after each phase

---

## PHASE 1: Database — Extend Achievements for All Roles

### Step 1: Add role scoping to achievements table

The current `achievements` table may not have a `target_role` column. Add one:

```sql
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'player';
-- Values: 'player', 'coach', 'parent', 'admin', 'all'
-- 'all' means any role can earn it (e.g., shoutout-related badges)
```

Update existing player achievements to have `target_role = 'player'`.

Update existing community/shoutout achievements: if they apply to all roles (like "Give 10 shoutouts"), set them to `target_role = 'all'`.

### Step 2: Add XP/Level support for coaches and parents

Coaches and parents should also have XP and levels. The `profiles` table already has `total_xp` and `player_level` columns — these work for all roles. No schema change needed, just make sure the code doesn't filter by role when reading/writing XP.

### Step 3: Seed Coach Achievements

Insert coach-specific achievements into the `achievements` table with `target_role = 'coach'`:

**TEAM BUILDER category:**
- First Roster (Common, 25 XP) — Assign your first player to a team. stat_key: 'roster_assignments', threshold: 1
- Full Squad (Uncommon, 50 XP) — Have a full roster of 12+ players. stat_key: 'roster_size', threshold: 12
- Multi-Team Coach (Rare, 100 XP) — Coach 3 or more teams. stat_key: 'teams_coached', threshold: 3

**GAME DAY category:**
- First Whistle (Common, 25 XP) — Complete your first game. stat_key: 'games_completed', threshold: 1
- Season Veteran (Uncommon, 50 XP) — Complete 10 games. stat_key: 'games_completed', threshold: 10
- Grinder (Rare, 100 XP) — Complete 25 games in a season. stat_key: 'games_completed', threshold: 25
- Century Coach (Epic, 200 XP) — Complete 100 career games. stat_key: 'career_games', threshold: 100
- Winning Streak (Rare, 100 XP) — Win 5 games in a row. stat_key: 'win_streak', threshold: 5
- Dominant Season (Epic, 200 XP) — Win 80%+ of games in a season. stat_key: 'season_win_pct', threshold: 80

**DEVELOPMENT category:**
- Stat Tracker (Common, 25 XP) — Enter stats for your first game. stat_key: 'games_with_stats', threshold: 1
- Data Driven (Uncommon, 50 XP) — Enter stats for 10 games. stat_key: 'games_with_stats', threshold: 10
- Badge Master (Rare, 100 XP) — Award 10 badges to players. stat_key: 'badges_awarded', threshold: 10
- Player Developer (Epic, 200 XP) — Have 5 players level up under your coaching. stat_key: 'players_leveled_up', threshold: 5

**ENGAGEMENT category:**
- First Challenge (Common, 25 XP) — Create your first coach challenge. stat_key: 'challenges_created', threshold: 1
- Challenge Accepted (Uncommon, 50 XP) — Create 5 challenges. stat_key: 'challenges_created', threshold: 5
- Motivator (Rare, 100 XP) — Have 100% player participation in a challenge. stat_key: 'full_participation_challenges', threshold: 1

**COMMUNITY category (shared with all roles):**
Already seeded: First Shoutout, Hype Machine, Community Builder, Fan Favorite, Team Legend, Most Valued
- Mark these as `target_role = 'all'` so coaches/parents/admins can earn them too

### Step 4: Seed Parent Achievements

Insert parent-specific achievements with `target_role = 'parent'`:

**TEAM SPIRIT category:**
- Super Fan (Common, 25 XP) — RSVP "Going" to your first event. stat_key: 'rsvps_going', threshold: 1
- Dedicated Fan (Uncommon, 50 XP) — RSVP "Going" to 10 events. stat_key: 'rsvps_going', threshold: 10
- Never Miss a Game (Rare, 100 XP) — RSVP "Going" to every game in a season. stat_key: 'season_rsvp_pct', threshold: 100
- Early Bird (Uncommon, 50 XP) — RSVP within 1 hour of event creation 5 times. stat_key: 'early_rsvps', threshold: 5

**SUPPORT category:**
- Volunteer Rookie (Common, 25 XP) — Sign up to volunteer for your first event. stat_key: 'volunteer_signups', threshold: 1
- Team Helper (Uncommon, 50 XP) — Volunteer for 5 events. stat_key: 'volunteer_signups', threshold: 5
- MVP Parent (Rare, 100 XP) — Volunteer for 10+ events in a season. stat_key: 'volunteer_signups', threshold: 10

**FINANCIAL category:**
- On Time (Common, 25 XP) — Make your first payment on time. stat_key: 'on_time_payments', threshold: 1
- Always Current (Uncommon, 50 XP) — Never have an overdue balance for an entire season. stat_key: 'seasons_current', threshold: 1
- Paid in Full (Rare, 100 XP) — Pay registration in full upfront. stat_key: 'full_payments', threshold: 1

**ENGAGEMENT category:**
- Team Cheerleader (Common, 25 XP) — React to 5 team wall posts. stat_key: 'post_reactions', threshold: 5
- Wall of Fame (Uncommon, 50 XP) — Create 10 team wall posts. stat_key: 'posts_created', threshold: 10
- Photo Contributor (Uncommon, 50 XP) — Upload 10 photos to the team gallery. stat_key: 'photos_uploaded', threshold: 10
- Multi-Sport Parent (Rare, 100 XP) — Have children on 2+ teams. stat_key: 'children_teams', threshold: 2

### Step 5: Seed Admin Achievements (lightweight)

Insert admin-specific achievements with `target_role = 'admin'`:

**OPERATIONS category:**
- First Season (Common, 25 XP) — Create your first season. stat_key: 'seasons_created', threshold: 1
- Organization Builder (Uncommon, 50 XP) — Have 50+ registered players. stat_key: 'total_players', threshold: 50
- Growth Machine (Rare, 100 XP) — Have 100+ registered players. stat_key: 'total_players', threshold: 100
- Multi-Season Pro (Uncommon, 50 XP) — Complete 3 seasons. stat_key: 'seasons_completed', threshold: 3
- Revenue Milestone (Rare, 100 XP) — Collect $5,000+ in a season. stat_key: 'season_revenue', threshold: 5000

**MANAGEMENT category:**
- Team Architect (Common, 25 XP) — Create 5 teams. stat_key: 'teams_created', threshold: 5
- Communication King (Uncommon, 50 XP) — Send 10 blast messages. stat_key: 'blasts_sent', threshold: 10
- Registration Master (Uncommon, 50 XP) — Process 50 registrations. stat_key: 'registrations_processed', threshold: 50

**Commit after Phase 1:** `"Engagement expansion Phase 1 - role-scoped achievements, coach/parent/admin badge seeds"`

---

## PHASE 2: Achievement Engine — Multi-Role Support

### Step 1: Update achievement-engine.ts

The current achievement engine checks player stats. Extend it to support all roles:

```typescript
// Pseudo-structure
async function checkAchievements(userId: string, userRole: string, trigger: string) {
  // 1. Get user's current earned achievements
  // 2. Get all unearned achievements where target_role = userRole OR target_role = 'all'
  // 3. For each, check if condition is met based on role-specific data sources
  // 4. Award any newly unlocked achievements + XP
}
```

### Step 2: Role-Specific Data Resolvers

Create functions that calculate current values for each role's stat_keys:

**Coach stat resolvers:**
- `roster_assignments` → COUNT of players on coach's teams
- `roster_size` → MAX players on any single team
- `teams_coached` → COUNT of teams where coach is assigned
- `games_completed` → COUNT of completed games for coach's teams
- `career_games` → same but across all seasons
- `win_streak` → calculate from game results
- `season_win_pct` → wins / total games * 100
- `games_with_stats` → COUNT of games with stat entries
- `badges_awarded` → COUNT of player_achievements awarded by this coach
- `players_leveled_up` → COUNT of level-up events for players on coach's teams
- `challenges_created` → COUNT of coach_challenges by this coach
- `full_participation_challenges` → COUNT of challenges where all team players opted in

**Parent stat resolvers:**
- `rsvps_going` → COUNT of RSVPs with status 'going' by this parent
- `season_rsvp_pct` → percentage of season events RSVPed 'going'
- `early_rsvps` → COUNT of RSVPs made within 1 hour of event creation
- `volunteer_signups` → COUNT of volunteer assignments for this parent
- `on_time_payments` → COUNT of payments made before due date
- `seasons_current` → COUNT of seasons with no overdue balance
- `full_payments` → COUNT of lump-sum payments
- `post_reactions` → COUNT of reactions on team wall posts
- `posts_created` → COUNT of team wall posts by this parent
- `photos_uploaded` → COUNT of gallery photos uploaded
- `children_teams` → COUNT DISTINCT teams across all children

**Admin stat resolvers:**
- `seasons_created` → COUNT of seasons
- `total_players` → COUNT of active players in org
- `seasons_completed` → COUNT of completed seasons
- `season_revenue` → SUM of payments for current season
- `teams_created` → COUNT of teams
- `blasts_sent` → COUNT of blast messages
- `registrations_processed` → COUNT of approved registrations

### Step 3: Trigger Points

When to check achievements for each role:

**Coach triggers:**
- After game completion → check game-related badges
- After stat entry → check stat tracking badges
- After roster change → check team builder badges
- After challenge creation → check engagement badges
- After awarding a player badge → check badge master

**Parent triggers:**
- After RSVP → check team spirit badges
- After volunteer signup → check support badges
- After payment → check financial badges
- After team wall post/reaction → check engagement badges
- After photo upload → check photo contributor

**Admin triggers:**
- After season creation → check operations badges
- After registration approval → check management badges
- After blast message → check communication badges
- On dashboard load (periodic) → check milestone badges (player count, revenue)

**Commit after Phase 2:** `"Engagement expansion Phase 2 - multi-role achievement engine with stat resolvers"`

---

## PHASE 3: UI — Coach Achievement Experience

### Coach Dashboard Integration

Add to the coach dashboard/home screen:
- **Level & XP bar** — same component used for players, now showing the coach's level
- **Badge showcase** — horizontal scroll of earned badges (most rare first)
- **"Almost there" nudge** — if a coach is 80%+ toward any achievement, show it

### Coach Profile / My Stuff

Add an "Achievements" section in the coach's My Stuff or profile area:
- Full achievement grid (same component as player, filtered to `target_role IN ('coach', 'all')`)
- Shows earned vs locked with progress bars
- Categories: Team Builder, Game Day, Development, Engagement, Community
- Level and XP prominently displayed

### Coach Achievement Celebrations

When a coach unlocks a badge:
- Same celebration modal as players (confetti, badge reveal, XP earned)
- "Share to Team Wall" button — posts "[Coach Name] earned [Badge]! 🏆"
- Push notification

**Commit after Phase 3:** `"Engagement expansion Phase 3 - coach achievement UI"`

---

## PHASE 4: UI — Parent Achievement Experience

### Parent Dashboard Integration

Add to the parent dashboard/home screen:
- **Parent Level & XP bar** — compact, below the main content or in a "My Engagement" section
- **Badge pills** — small horizontal row of recently earned badges
- **Nudge cards** — "You're 1 volunteer signup away from Team Helper! 🤝"

### Parent My Stuff / Profile

Add an "My Achievements" section:
- Achievement grid filtered to `target_role IN ('parent', 'all')`
- Categories: Team Spirit, Support, Financial, Engagement, Community
- Level and XP bar
- Shoutout profile section (received and given counts with category breakdown)

### Parent Achievement Celebrations

When a parent unlocks a badge:
- Celebration modal (same component, works for any role)
- "Share to Team Wall" option
- Push notification: "🏆 You earned the Dedicated Fan badge!"

### Parent Visibility of Child's Achievements

The parent dashboard already shows child engagement summary (from previous session). Ensure it also shows:
- Child's badge count with "View All" link to the child's full achievement grid
- Child's recent badge unlocks as a mini feed

**Commit after Phase 4:** `"Engagement expansion Phase 4 - parent achievement UI"`

---

## PHASE 5: UI — Admin Achievement Experience (Lightweight)

Admin achievements are less about gamification and more about recognition for running the organization.

### Admin Dashboard

- Small "Org Milestones" card showing earned admin badges
- No XP bar on the main dashboard (keep it clean/professional) — but accessible in profile
- Milestone celebrations are more subtle — a toast notification rather than full-screen confetti

### Admin Profile / Settings

- "Achievements" section with admin-specific badges
- Level visible but understated

**Commit after Phase 5:** `"Engagement expansion Phase 5 - admin achievement UI (lightweight)"`

---

## PHASE 6: Cross-Role Polish

### Achievement Screen — Role-Aware Filtering

The achievements screen component should be shared across all roles. When opened:
- Detect the current user's role
- Filter achievements to show `target_role = [current_role]` AND `target_role = 'all'`
- Show the correct categories for that role
- Same visual treatment (earned/locked/progress) for all roles

### Team Wall — All Role Achievements Show Up

When ANY user (coach, parent, admin) unlocks a badge and shares it:
- It appears on the team wall with the same celebratory card styling
- "[Coach Carlos] earned Winning Streak! 🏆" looks just as cool as a player badge

### Shoutout XP — Works for All Roles

Verify that giving/receiving shoutouts awards XP to ALL roles, not just players:
- Coach gives a shoutout → coach gets 10 XP
- Parent receives a shoutout → parent gets 15 XP
- Community badges (Hype Machine, Community Builder, etc.) should be earnable by everyone

### Leaderboard (Optional but Cool)

If time permits, add a simple "Team Leaderboard" accessible from Team Hub:
- Tab between: Players | Coaches | Parents
- Each shows ranked list by XP/Level
- This creates friendly competition across ALL roles
- "Most Active Parent", "Top Coach", "Rising Star Player"

### Testing Checklist

- [ ] Coach can view their achievements from dashboard and My Stuff
- [ ] Coach badges unlock correctly (test: create a challenge → check "First Challenge" badge)
- [ ] Parent can view their achievements from dashboard and My Stuff
- [ ] Parent badges unlock correctly (test: RSVP to an event → check "Super Fan" badge)
- [ ] Admin can view their achievements from profile
- [ ] Community badges (shoutouts) work for all roles
- [ ] XP accumulates for coaches and parents
- [ ] Level-up celebration fires for non-player roles
- [ ] Achievement celebrations work for all roles
- [ ] Team wall shows badge unlocks from all roles
- [ ] No type errors: `npx tsc --noEmit`

---

## ORDER OF OPERATIONS

1. Phase 1: Database — role-scoped achievements + seeds → commit
2. Phase 2: Achievement engine — multi-role stat resolvers + triggers → commit
3. Phase 3: Coach achievement UI → commit
4. Phase 4: Parent achievement UI → commit
5. Phase 5: Admin achievement UI (lightweight) → commit
6. Phase 6: Cross-role polish + verification → commit
7. Final `npx tsc --noEmit` check

---

## IMPORTANT CONTEXT

- The `achievements` table already has ~30 player achievements — ADD to it, don't overwrite
- The achievement engine (`lib/achievement-engine.ts`) already works for players — EXTEND it
- The celebration modal (`components/AchievementCelebrationModal.tsx`) already exists — REUSE it for all roles
- The LevelBadge component already exists — REUSE for coaches/parents
- XP columns already exist on `profiles` table — they work for all roles
- Shoutout service already handles multi-role giving — just verify XP flows to non-players
- The Team Hub "Achievements" button already exists — make it role-aware

## INFRASTRUCTURE
- Supabase project: uqpjvbiuokwpldjvxiby
- GitHub: SgtxTorque/volleybrain-mobile3
- SCHEMA_REFERENCE.csv in project root
