# VOLLEYBRAIN MOBILE APP — Session Handoff (Feb 25, 2026)
# ENGAGEMENT SYSTEM: Player Badges, Shoutouts, Coach Challenges

## What I'm Building
VolleyBrain — a dual-platform youth sports management app (React Native/Expo mobile + React/Vite web admin) with Supabase backend.
GitHub: SgtxTorque/volleybrain-mobile3

---

## COMPLETED PREVIOUSLY (all committed)
- ✅ All role dashboards (Parent, Coach, Admin, Player)
- ✅ Admin Phase 1-3, Coach Phase A-D, Player Phase 1-4
- ✅ Sprint 1-3 beta prep, Stripe payments, email notifications, chat UX
- ✅ Parent UX Redesign Phase 1-7
- ✅ Team Hub fixes (alignment, achievements in hero, parent/player parity, PhotoViewer)

---

## THIS SESSION: Build the Engagement System

Three interconnected systems that make VolleyBrain feel alive. This is the "Call of Duty grind for camos and calling cards, but for real life sports" — the killer feature that differentiates VolleyBrain from every other youth sports app.

### RULES
- Read SCHEMA_REFERENCE.csv before ANY queries — check what tables already exist (achievements, player_achievements, player_badges, player_season_stats, team_posts, etc.)
- Do NOT break any existing functionality
- No console.log without `__DEV__`
- Run `npx tsc --noEmit` after each phase
- Commit after each phase

---

## PHASE 1: Database Schema & Foundation

### Step 1: Audit Existing Tables

Before creating anything, check what ALREADY EXISTS in the database. The following tables may already be created:
- `achievements` — master catalog of all possible achievements
- `player_achievements` — player's earned achievements
- `player_badges` — player badge records
- `player_season_stats` — aggregated season stats
- `team_posts` — team wall posts (already supports post types including "shoutout")

Run queries against SCHEMA_REFERENCE.csv and/or Supabase to confirm what exists, what columns they have, and what's missing.

### Step 2: Create/Extend Tables as Needed

**Shoutouts Table** (new — or extend team_posts if shoutout type exists):
```sql
CREATE TABLE IF NOT EXISTS shoutouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who gave the shoutout
  giver_id UUID NOT NULL REFERENCES profiles(id),
  giver_role TEXT NOT NULL, -- 'coach', 'parent', 'player', 'admin'
  
  -- Who received the shoutout
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  receiver_role TEXT NOT NULL,
  
  -- Context
  team_id UUID REFERENCES teams(id),
  organization_id UUID NOT NULL,
  category TEXT NOT NULL, -- 'great_effort', 'leadership', 'improving', 'team_player', etc.
  message TEXT, -- optional personal message
  
  -- Visibility
  show_on_team_wall BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Shoutout Categories Table** (supports fixed defaults + coach custom):
```sql
CREATE TABLE IF NOT EXISTS shoutout_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL, -- 'Great Effort', 'Leadership', 'Most Improved', etc.
  emoji TEXT NOT NULL, -- '💪', '👑', '📈', etc.
  description TEXT,
  color TEXT, -- hex color for the badge/chip display
  
  -- Scope
  is_default BOOLEAN DEFAULT false, -- true = system-wide default, false = custom
  organization_id UUID REFERENCES organizations(id), -- null for defaults
  created_by UUID REFERENCES profiles(id), -- coach who created it (null for defaults)
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Coach Challenges Table** (new):
```sql
CREATE TABLE IF NOT EXISTS coach_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Challenge creator
  coach_id UUID NOT NULL REFERENCES profiles(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  organization_id UUID NOT NULL,
  
  -- Challenge details
  title TEXT NOT NULL, -- "First to 50 Serves"
  description TEXT, -- "Hit 50 successful serves in practice this week"
  challenge_type TEXT NOT NULL DEFAULT 'individual', -- 'individual', 'team'
  
  -- Tracking
  metric_type TEXT, -- 'stat_based' (auto-tracked), 'coach_verified' (manual), 'self_report'
  stat_key TEXT, -- if stat_based: 'total_serves', 'total_aces', etc.
  target_value INTEGER, -- the goal number
  
  -- Rewards
  xp_reward INTEGER DEFAULT 50,
  badge_id UUID REFERENCES achievements(id), -- optional special badge for winner
  custom_reward_text TEXT, -- "Pizza party for the team" or "Gets to pick warmup music"
  
  -- Timeline
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active', -- 'draft', 'active', 'completed', 'cancelled'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Challenge Participants Table** (new):
```sql
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  challenge_id UUID NOT NULL REFERENCES coach_challenges(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Progress
  current_value INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- For team challenges
  contribution INTEGER DEFAULT 0,
  
  opted_in_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(challenge_id, player_id)
);
```

**XP Ledger Table** (new — tracks all XP events for players):
```sql
CREATE TABLE IF NOT EXISTS xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  player_id UUID NOT NULL REFERENCES profiles(id),
  organization_id UUID NOT NULL,
  
  -- XP event
  xp_amount INTEGER NOT NULL, -- can be negative for corrections
  source_type TEXT NOT NULL, -- 'achievement', 'shoutout_received', 'shoutout_given', 'challenge', 'game_played', 'attendance', 'coach_award'
  source_id UUID, -- references the achievement/shoutout/challenge that triggered it
  description TEXT, -- "Earned 'Ace Sniper' badge", "Received 'Great Effort' shoutout from Coach Carlos"
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Extend profiles or player-related table with XP fields** (if not already present):
```sql
-- Add to whatever player profile/stats table makes sense
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS player_level INTEGER DEFAULT 1;
```

### Step 3: Seed Default Shoutout Categories

Insert these as system defaults (is_default = true, organization_id = null):

| Name | Emoji | Color | Description |
|------|-------|-------|-------------|
| Great Effort | 💪 | #E74C3C | Gave 100% effort |
| Leadership | 👑 | #F39C12 | Showed leadership on and off the court |
| Most Improved | 📈 | #27AE60 | Noticeably leveling up their game |
| Team Player | 🤝 | #3498DB | Puts the team first |
| Clutch Player | 🎯 | #9B59B6 | Performs under pressure |
| Hardest Worker | 🔥 | #E67E22 | Outworks everyone |
| Great Communication | 📣 | #1ABC9C | Calls the ball, talks on the court |
| Positive Attitude | ☀️ | #F1C40F | Always uplifting, never negative |
| Sportsmanship | 🏅 | #2ECC71 | Respects opponents, refs, teammates |
| Coachable | 🧠 | #8E44AD | Listens, applies feedback, grows |

### Step 4: Seed Default Player Achievements/Badges

Check what achievements already exist in the database. If the `achievements` table is empty or sparse, seed a starter set. If it already has data, ADD to it — don't overwrite.

**Achievement categories:** Offensive, Defensive, Playmaker, Heart & Hustle, Elite, Community

**Rarity tiers:** Common, Uncommon, Rare, Epic, Legendary

**XP values by rarity:** Common = 25, Uncommon = 50, Rare = 100, Epic = 200, Legendary = 500

**Sample achievements to seed (if not already present):**

OFFENSIVE:
- First Blood (Common) — Record your first kill. 25 XP.
- Kill Shot (Uncommon) — 25 kills in a season. 50 XP.
- Attack Machine (Rare) — 50 kills in a season. 100 XP.
- Ace Sniper (Uncommon) — 10 aces in a season. 50 XP.
- Service Ace Master (Rare) — 25 aces in a season. 100 XP.
- Untouchable (Epic) — 5 aces in a single game. 200 XP.

DEFENSIVE:
- First Dig (Common) — Record your first dig. 25 XP.
- Ground Zero (Uncommon) — 25 digs in a season. 50 XP.
- Iron Fortress (Rare) — 50 digs in a season. 100 XP.
- Wall Breaker (Uncommon) — 10 blocks in a season. 50 XP.
- Block Party (Epic) — 5 blocks in a single game. 200 XP.

PLAYMAKER:
- Assist King/Queen (Uncommon) — 25 assists in a season. 50 XP.
- Court General (Rare) — 50 assists in a season. 100 XP.
- Puppet Master (Epic) — 10 assists in a single game. 200 XP.

HEART & HUSTLE:
- Iron Player (Uncommon) — Attend 10 consecutive practices. 50 XP.
- Never Miss (Rare) — Perfect attendance for a full season. 100 XP.
- Streak Machine (Epic) — 20 consecutive practices attended. 200 XP.

COMMUNITY (shoutout-driven):
- First Shoutout (Common) — Give your first shoutout. 25 XP.
- Hype Machine (Uncommon) — Give 10 shoutouts. 50 XP.
- Community Builder (Rare) — Give 25 shoutouts. 100 XP.
- Fan Favorite (Uncommon) — Receive 10 shoutouts. 50 XP.
- Team Legend (Rare) — Receive 25 shoutouts. 100 XP.
- Most Valued (Epic) — Receive 50 shoutouts. 200 XP.

ELITE:
- Triple Threat (Epic) — Record kills, aces, and digs in a single game. 200 XP.
- MVP (Legendary) — Coach-awarded MVP for a game. 500 XP.
- Season Champion (Legendary) — Win a season/tournament championship. 500 XP.
- Perfect Season (Legendary) — Undefeated season record. 500 XP.

### Step 5: XP Level Thresholds

```javascript
// Level calculation — exponential curve, fast early levels, slower later
const XP_LEVELS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 250 },
  { level: 4, xpRequired: 500 },
  { level: 5, xpRequired: 800 },
  { level: 6, xpRequired: 1200 },
  { level: 7, xpRequired: 1700 },
  { level: 8, xpRequired: 2300 },
  { level: 9, xpRequired: 3000 },
  { level: 10, xpRequired: 4000 },
  { level: 11, xpRequired: 5200 },
  { level: 12, xpRequired: 6500 },
  { level: 13, xpRequired: 8000 },
  { level: 14, xpRequired: 10000 },
  { level: 15, xpRequired: 12500 },
  { level: 16, xpRequired: 15500 },
  { level: 17, xpRequired: 19000 },
  { level: 18, xpRequired: 23000 },
  { level: 19, xpRequired: 27500 },
  { level: 20, xpRequired: 33000 },
];
```

### Step 6: Enable RLS

Add Row Level Security policies on all new tables. Follow the same patterns used for existing tables like team_posts. Key rules:
- Shoutouts: any authenticated user in the same org can read. Only the giver can create.
- Shoutout categories: anyone can read defaults. Org members can read org-specific. Only coaches/admins can create custom.
- Coach challenges: team members can read. Only coaches can create/edit.
- Challenge participants: players can opt themselves in. Coaches can update progress.
- XP ledger: players can read their own. System can insert (via triggers or app logic).

**Commit after Phase 1:** `"Engagement system Phase 1 - database schema, seeds, RLS"`

---

## PHASE 2: Shoutout System (All Roles)

### The Concept
Any user can give any user a shoutout. Shoutouts are the social currency of VolleyBrain. They show up on the team wall, stack on player profiles, and give XP to BOTH the giver AND receiver.

### XP Values
- Giving a shoutout: 10 XP to the giver
- Receiving a shoutout: 15 XP to the receiver

### UI: Give a Shoutout Flow

**Entry points (where users can tap to give a shoutout):**
1. Team Wall — the "What's on your mind?" composer should have a "Shoutout" post type option (may already exist as a post type)
2. Roster — tap a player → their profile → "Give Shoutout" button
3. After a game — coach sees a "Give Shoutouts" prompt on the game recap screen

**The shoutout flow:**
1. User taps "Give Shoutout"
2. **Select recipient** — searchable list of teammates/coaches/parents in the same org. If launched from a player profile, recipient is pre-filled.
3. **Pick category** — grid of category chips showing emoji + name. Show defaults first, then any coach-custom categories for the team. Categories should feel fun and tappable — use the emoji prominently.
4. **Optional message** — text input: "Add a message (optional)". Max 200 characters.
5. **Preview & Send** — show a preview of the shoutout card as it will appear on the team wall. Confirm button.

**On send:**
- Create shoutout record in database
- Create team_post of type "shoutout" (so it appears in the team wall feed)
- Award XP to giver (10 XP) and receiver (15 XP) via xp_ledger
- Recalculate player_level for both giver and receiver
- Send push notification to receiver: "[Name] gave you a [Category] shoutout! 🎉"
- Check if either user just unlocked a shoutout-related achievement (First Shoutout, Hype Machine, Fan Favorite, etc.)

### UI: Shoutout Display on Team Wall

Shoutout posts on the team wall should look SPECIAL — not like a regular text post. They should feel celebratory:
- Colored border or background tint matching the category color
- Large emoji from the category
- "[Giver Name] gave [Receiver Name] a [Category] shoutout!"
- The optional message below in quotes
- Heart/fire/clap reaction buttons (using existing post reactions system)
- The receiver's mini player card or avatar next to the shoutout

### UI: Shoutout Profile Section

On a player's profile (and coach profiles), add a "Shoutouts" section:
- Shows total shoutouts received
- Breakdown by category: "💪 Great Effort x5, 👑 Leadership x3, 🔥 Hardest Worker x2"
- Category chips are visual — show the emoji, name, and count
- "Given" tab showing shoutouts this person has given (encourages giving)

### Coach Custom Categories

Coaches can create custom shoutout categories for their team:
- Accessed from Team Hub → Settings/Gear icon, or from My Stuff → Coach Tools
- "Manage Shoutout Categories" screen
- Shows all default categories (can't delete, but can hide from their team)
- "Add Custom Category" button: name, emoji picker, color picker, description
- Custom categories are scoped to the organization (all teams in the org can use them)
- Only coaches and admins can create/edit custom categories

**Commit after Phase 2:** `"Engagement system Phase 2 - shoutout system with team wall integration"`

---

## PHASE 3: Player Achievement System

### The Concept
Players earn badges/achievements automatically as they hit milestones. Progress is visible, locked badges are tantalizing, and every unlock feels like a dopamine hit.

### UI: Achievements Screen (Player-facing)

This screen is accessible from:
- Player dashboard (trophy icon or achievements section)
- Team Hub → Achievements button in hero header
- Player profile → Achievements tab

**Layout:**

**Top: Level & XP Bar**
- Current level displayed prominently with a glow/pulse effect
- XP progress bar: "450 / 800 XP to Level 5"
- Animated fill bar
- Level badge with tier color (1-5 bronze, 6-10 silver, 11-15 gold, 16-20 diamond)

**Filter tabs:** All | Offensive | Defensive | Playmaker | Heart & Hustle | Community | Elite

**Achievement Grid:**
- Cards/tiles in a grid (2-3 columns)
- **Earned badges:** Full color, glow effect based on rarity, checkmark, earned date
- **Locked badges:** Grayed out / silhouette, progress bar showing current/target (e.g., "7/10 aces"), percentage complete
- **Close to unlocking (80%+):** Subtle pulse/glow to create excitement — "Almost there!"
- Tap a badge for detail modal: name, description, how to earn, rarity, XP value, who else on the team has earned it, date earned (if unlocked)

**Rarity visual treatment:**
- Common: Bronze border/glow
- Uncommon: Silver border/glow
- Rare: Gold border/glow
- Epic: Diamond/blue border + shimmer
- Legendary: Prismatic/rainbow border + animated glow

### Auto-Award Logic

Create a utility/service that checks achievement progress. This can run:
1. After a game's stats are entered (check stat-based achievements)
2. After attendance is recorded (check attendance-based achievements)
3. After a shoutout is given/received (check community achievements)
4. On-demand when viewing achievements screen (recalculate progress)

```typescript
// Pseudo-logic for auto-checking achievements
async function checkPlayerAchievements(playerId: string, trigger: 'stats' | 'attendance' | 'shoutout') {
  // 1. Get all achievements the player hasn't earned yet
  // 2. For each, check if the condition is now met
  // 3. If met: insert player_achievement, insert xp_ledger, update total_xp/level
  // 4. Return newly unlocked achievements for celebration UI
}
```

### Unlock Celebration

When a player unlocks an achievement (either auto-detected or on screen load):
- Full-screen celebration modal with confetti/particle animation
- Badge reveal with rarity glow
- "🏆 Achievement Unlocked!" header
- Badge name, description, XP earned
- "Share to Team Wall" button (auto-creates a post: "[Player] just earned [Badge]! 🏆")
- "View All Achievements" button
- This modal should feel like a loot box opening — exciting, rewarding, share-worthy

### Player Profile Integration

The player profile/trading card should showcase achievements:
- "Trophy Shelf" section: horizontal scroll of earned badges (most rare first)
- Top 3 badges displayed prominently on the trading card itself
- Level badge visible on the trading card
- Total XP displayed

### Tracked Achievements

Players can "pin" up to 5 achievements they're working toward:
- Shown on their dashboard/home screen
- Each shows a progress bar with current/target
- When progress updates (after a game, etc.), animate the bar filling
- These create personal goals that keep players engaged between games

**Commit after Phase 3:** `"Engagement system Phase 3 - player achievement system with auto-award and celebrations"`

---

## PHASE 4: Coach Challenges

### The Concept
Coaches create challenges to drive engagement and effort between games. "First to 50 serves this week" or "Team goal: 100 digs at Saturday's tournament." Players opt in, progress is tracked, and winners get XP + bragging rights.

### UI: Coach Creates a Challenge

**Entry point:** Team Hub → FAB or quick action → "Create Challenge"
Also accessible from: My Stuff → Coach Tools → Challenges

**Challenge creation form:**
1. **Title** — "First to 50 Serves" (required)
2. **Description** — "Let's see who can hit 50 successful serves in practice this week" (optional)
3. **Challenge Type** — Individual (each player vs each other) or Team (collective goal)
4. **Tracking Method:**
   - Stat-based (auto): select a stat from dropdown (aces, kills, digs, serves, etc.) — progress auto-updates when stats are entered
   - Coach-verified: coach manually updates player progress
   - Self-report: players log their own progress, coach can verify
5. **Target** — number to reach (e.g., 50)
6. **Timeline** — start date and end date (datepicker)
7. **Rewards:**
   - XP bonus (default 50, coach can adjust 25-500)
   - Optional: select a special badge from achievements catalog
   - Optional: custom reward text ("Winner picks warmup music for a week")
8. **Preview & Create**

**On create:**
- Challenge appears in team feed as a special post: "🏆 Coach Challenge: [Title] — [Date range]"
- Push notification to all team players: "New challenge from Coach [Name]! 🏆"
- Players see "Opt In" button on the challenge card

### UI: Challenge Card (Team Wall & Challenge Detail)

**Challenge card on team wall:**
- Special styling — distinct from regular posts (maybe a gradient border or banner)
- Trophy icon + "COACH CHALLENGE" badge
- Title, description, timeline
- Progress indicator: "12 of 15 players opted in"
- For individual: leaderboard preview (top 3 players + their progress)
- For team: collective progress bar (e.g., "67/100 digs — 67%")
- "Opt In" / "View Details" button

**Challenge detail screen (tap to expand):**
- Full leaderboard: all opted-in players ranked by progress
- Each player row: name, avatar, progress bar, current value / target
- For team challenges: total team progress + individual contributions
- Time remaining countdown
- Challenge description and reward details
- If coach: "Update Progress" button for coach-verified challenges

### UI: Player Sees Challenges

**On player dashboard:**
- Active challenges section (if any exist)
- Shows challenge card with their personal progress
- "View Leaderboard" to see where they stand
- For self-report: "Log Progress" button

**Opt-in flow:**
- Player taps "Opt In" on challenge card
- Confirmation: "Join this challenge? You'll be tracked against other players."
- Once opted in, the card updates to show their progress

### Challenge Completion

When a challenge ends or someone hits the target:
- **Individual winner:** celebration notification, XP awarded, badge if applicable, winner announced in team feed: "🏆 [Player] won the [Challenge Title] challenge!"
- **Team goal met:** collective celebration, XP to all participants, team feed post
- **Challenge expired without winner:** "Challenge ended! Here's how everyone did:" + final leaderboard
- Coach gets a summary: who participated, final standings, completion rate

### Active Challenge Widget

On the Team Hub, if there are active challenges, show a compact "Active Challenges" section above or near the team wall:
- Shows 1-2 active challenge cards
- Tap to expand to full detail
- Creates urgency and visibility

**Commit after Phase 4:** `"Engagement system Phase 4 - coach challenges with leaderboard and tracking"`

---

## PHASE 5: XP & Level Integration

### Connect Everything to XP

Make sure all XP-granting events properly flow through the xp_ledger and update the player's total_xp and player_level:

| Event | XP Earned |
|-------|-----------|
| Give a shoutout | +10 |
| Receive a shoutout | +15 |
| Unlock Common achievement | +25 |
| Unlock Uncommon achievement | +50 |
| Unlock Rare achievement | +100 |
| Unlock Epic achievement | +200 |
| Unlock Legendary achievement | +500 |
| Complete a challenge | +50 (or coach-set amount) |
| Win a challenge | +100 bonus |
| Game played (attendance) | +10 |
| Practice attended | +5 |

### Level-Up Celebration

When a player's XP crosses a level threshold:
- Full-screen "LEVEL UP!" animation
- New level displayed with tier color
- "You are now Level [X]!" 
- Show what was earned to get here
- Auto-post to team wall: "[Player] reached Level [X]! 🚀"

### XP Visibility Across the App

- **Player trading card:** Level badge + XP bar
- **Player dashboard:** Level prominently displayed, XP progress bar
- **Roster view:** Each player shows their level next to their name
- **Team Hub leaderboard:** Top players by level/XP (accessible from Team Hub)

**Commit after Phase 5:** `"Engagement system Phase 5 - XP ledger integration, level-ups, visibility"`

---

## PHASE 6: Polish & Notifications

### Push Notifications for Engagement Events

- "🎉 [Name] gave you a Great Effort shoutout!"
- "🏆 Achievement Unlocked: Ace Sniper!"
- "🚀 You reached Level 5!"
- "⚡ New Coach Challenge: First to 50 Serves"
- "🏆 You won the [Challenge] challenge!"
- "📈 You're 80% of the way to [Achievement]! Keep going!"

### Team Wall Integration

All engagement events should auto-post to the team wall (with appropriate post types):
- Shoutouts appear as shoutout post type
- Achievement unlocks appear as milestone/achievement post type
- Challenge announcements appear as challenge post type
- Level-ups appear as milestone post type
- This keeps the team wall feeling ALIVE with activity

### Achievement Progress Nudges

When a player is 80%+ toward an achievement, show a subtle nudge:
- On their dashboard: "Almost there! 8/10 aces for Ace Sniper"
- Optional push notification (don't spam — once per achievement when they cross 80%)

### Testing Checklist

After all phases, verify:
- [ ] Shoutout flow works end-to-end (give → team wall → notification → XP → profile)
- [ ] All default shoutout categories display correctly
- [ ] Coach can create custom shoutout categories
- [ ] Achievement grid shows earned vs locked correctly
- [ ] Achievement progress updates after stat entry
- [ ] Achievement unlock triggers celebration modal
- [ ] Coach can create, manage, and complete challenges
- [ ] Players can opt into challenges
- [ ] Challenge leaderboard updates correctly
- [ ] XP accumulates correctly from all sources
- [ ] Level-up triggers celebration
- [ ] Push notifications fire for engagement events
- [ ] Team wall shows all engagement event types
- [ ] No type errors: `npx tsc --noEmit`

---

## ORDER OF OPERATIONS

1. Phase 1: Database schema, seeds, RLS → commit
2. Phase 2: Shoutout system (all roles) → commit
3. Phase 3: Player achievements with auto-award → commit
4. Phase 4: Coach challenges → commit
5. Phase 5: XP & level integration → commit
6. Phase 6: Polish, notifications, team wall integration → commit
7. Final `npx tsc --noEmit` check

---

## IMPORTANT CONTEXT

- The `achievements` table likely already exists — CHECK before creating. Extend, don't overwrite.
- The `team_posts` table already supports a "shoutout" post type — CHECK how it currently works and build on it.
- The player dashboard already has an achievements section and level/XP display — enhance what's there, don't rebuild from scratch.
- The Team Hub hero header already has an "Achievements" button — make sure it routes to the new achievements screen.
- Player trading cards already exist — add level badge and top badges to them.
- Push notification infrastructure already exists (push_tokens, Edge Functions, cron job) — use the same patterns for new notification types.

## INFRASTRUCTURE
- Supabase project: uqpjvbiuokwpldjvxiby
- GitHub: SgtxTorque/volleybrain-mobile3
- SCHEMA_REFERENCE.csv in project root
