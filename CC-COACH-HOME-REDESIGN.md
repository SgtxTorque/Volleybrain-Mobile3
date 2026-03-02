# LYNX — Coach Home Dashboard: Three-Tier Redesign
## For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)  
**Backend:** Supabase (project: uqpjvbiuokwpldjvxiby)  
**GitHub:** SgtxTorque/volleybrain-mobile3  
**Web Admin (SOURCE OF TRUTH):** `C:\Users\fuent\Downloads\volleybrain-admin\`  
**Brand Book:** `reference/design-references/brandbook/LynxBrandBook.html`  

---

## CONTEXT

The Parent Home has been redesigned using a three-tier visual system (Phases 0-9). The Coach Home now gets the same treatment. The coach experience is fundamentally different from the parent — it's operational on event days and reflective on off days. The scroll length should literally change based on how much is happening.

**The web admin has coach features that DO NOT yet exist on mobile.** This spec brings awareness of those features to the mobile home screen. The actual deep screens (Game Day Command Center, Lineup Builder, full Evaluation form) will be separate future specs — this spec only surfaces hints and entry points to them on the home scroll.

**Key web admin files to reference for query patterns and data structures:**
- `C:\Users\fuent\Downloads\volleybrain-admin\src\pages\roles\CoachDashboard.jsx` — Main coach dashboard, all data loading patterns
- `C:\Users\fuent\Downloads\volleybrain-admin\src\pages\gameprep\GamePrepPage.jsx` — Game prep workflow
- `C:\Users\fuent\Downloads\volleybrain-admin\src\pages\gameprep\GameDayCommandCenter.jsx` — Live game interface
- `C:\Users\fuent\Downloads\volleybrain-admin\src\pages\gameprep\GameJourneyPanel.jsx` — Prep checklist with checkpoints
- `C:\Users\fuent\Downloads\volleybrain-admin\src\pages\gameprep\PostGameSummary.jsx` — Post-game summary
- `C:\Users\fuent\Downloads\volleybrain-admin\src\pages\roster\PlayerDevelopmentCard.jsx` — Player evaluations, skill ratings, spider charts, goals, notes
- `C:\Users\fuent\Downloads\volleybrain-admin\src\components\engagement\GiveShoutoutModal.jsx` — Shoutout system
- `C:\Users\fuent\Downloads\volleybrain-admin\src\lib\gameCheckpoints.js` — Checklist computation logic

**Read these files to understand the Supabase tables, column names, and query patterns BEFORE writing any queries.** The web app is the source of truth for how data is structured.

---

## RULES (READ FIRST — APPLY TO ALL PHASES)

1. **Read SCHEMA_REFERENCE.csv FIRST** before writing or modifying ANY Supabase query. Verify every table name and column name against it. Cross-reference with the web admin files listed above. If a table or column doesn't exist in SCHEMA_REFERENCE.csv, STOP, flag it in a code comment, skip that query, and continue.

2. **Read the existing code before changing it.** Read entire files first. Understand what's already built. The mobile app already has a coach dashboard from a previous redesign — read it fully before touching it.

3. **Cross-reference the web admin** at `C:\Users\fuent\Downloads\volleybrain-admin\src\pages/` for ALL query patterns. Copy query patterns exactly — same table names, same column names, same joins. Do NOT invent queries.

4. **This redesign is COACH-ROLE ONLY.** Do NOT modify Parent, Admin, or Player experiences. The parent home was just redesigned (three-tier scroll system) — do NOT touch it. All changes must be role-gated.

5. **Use the existing auth/permissions pattern.** Read how the mobile app currently determines roles and coach team assignments. Match exactly.

6. **Check package.json BEFORE installing anything.** Reanimated, gesture handler, and brand fonts were installed during the parent redesign — reuse them.

7. **Reuse the theme tokens and scroll infrastructure from the parent redesign.** The `theme/colors.ts`, `theme/fonts.ts`, `theme/spacing.ts`, and `hooks/useScrollAnimations.ts` already exist. Import and use them. Do NOT create duplicates.

8. **Show your plan briefly, then execute immediately.** Do NOT wait for confirmation. Do NOT ask "should I proceed?" — just keep going. The only reason to stop is if SCHEMA_REFERENCE.csv is missing a critical table. Flag it and continue.

9. **No console.log without `__DEV__` gating.**

10. **Run `npx tsc --noEmit` after every phase.** Fix errors before committing.

11. **Commit AND push after every phase.** Format: `git add -A && git commit -m "Coach Home Phase [X]: [description]" && git push`

12. **AUTONOMOUS EXECUTION MODE.** Run ALL phases (0 through 7) without stopping. Commit and push after each. Do not ask questions. Make judgment calls and document in code comments. Stop only after Phase 7 or if a build-breaking error cannot be resolved.

13. **Animations must be 60fps.** Reuse the reanimated scroll handler and shared values from the parent redesign's hook. Same velocity detection, same threshold constants pattern.

14. **Wire up ALL tap targets as you build each section.** Do NOT leave dead taps. Every tappable element must navigate somewhere real using the app's existing navigation pattern. If the destination screen doesn't exist yet, navigate to the closest existing screen and leave a `// TODO: Navigate to [specific screen] when built` comment.

---

## THREE-TIER VISUAL SYSTEM (Same as Parent)

- **Tier 1 — Cards:** Elevated, shadows, borders. For the most actionable, important content.
- **Tier 1.5 — Lightweight Cards:** Subtle background (offWhite), thin border, no shadow. For grouped data.
- **Tier 2 — Flat:** Text on page background. Tappable but ambient. For information and tools.
- **Tier 3 — Ambient:** Personality text, conditional. Appears when relevant, disappears when not.

```typescript
// Import from existing theme files:
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/fonts';
// Reuse lightCard, fullCard, ambientText, flatSection styles from parent components
```

---

## PHASE 0: PRE-FLIGHT AUDIT

**Goal:** Understand the current coach mobile dashboard and the web admin features before touching anything.

**Tasks:**

0A. Read the current mobile coach dashboard:
```bash
grep -rn "CoachDashboard\|coach-home\|coachDashboard" --include="*.tsx" --include="*.ts" -rl
```
Read every file. Map: imports, hooks, data fetching, navigation, layout structure.

0B. Read the mobile tab navigation for coaches — how are coach tabs defined and role-gated?

0C. Read the web admin CoachDashboard.jsx (full file — it's 857 lines). Note:
- All Supabase queries and table names used
- The checklist computation logic
- The engagement data (shoutouts, challenges)
- The performance grid data loading
- How team switching works

0D. Read the web admin PlayerDevelopmentCard.jsx. Note:
- Tables: `player_skill_ratings`, `player_evaluations`, `player_goals`, `player_notes`
- The skill categories: serving, passing, setting, attacking, blocking, defense, hustle, coachability, teamwork
- How evaluations are loaded and compared

0E. Read the web admin GameJourneyPanel.jsx and `lib/gameCheckpoints.js`. Note:
- How checkpoints are computed (lineup set, RSVPs reviewed, stats entered)
- The `computeCheckpoints` and `getCurrentCheckpoint` functions
- The previous matchup scouting query

0F. Verify all referenced tables exist in SCHEMA_REFERENCE.csv:
- `schedule_events`, `event_rsvps`, `team_players`, `players`
- `game_lineups`, `player_season_stats`, `game_player_stats`
- `shoutouts`, `coach_challenges`, `challenge_participants`
- `player_skill_ratings`, `player_evaluations`, `player_goals`, `player_notes`
- `chat_channels`, `chat_messages`, `channel_members`
- `messages`, `message_recipients`
- `player_achievements`

Flag any tables that DON'T exist. We'll skip features that depend on missing tables.

**Output:** Status report with findings. Then immediately proceed.

**Commit:** `git add -A && git commit -m "Coach Home Phase 0: Pre-flight audit" && git push`

**Immediately proceed to Phase 1.**

---

## PHASE 1: SCROLL SKELETON + TEAM SELECTOR

**Goal:** Create the coach scroll shell with team selector pills and the welcome briefing.

**Tasks:**

1A. **Create CoachHomeScroll component** (or modify existing coach dashboard). This is the coach equivalent of ParentHomeScroll. Same scroll infrastructure:
- Import and use `useScrollAnimations` hook (reuse, don't rebuild)
- Import brand theme tokens (COLORS, FONTS, spacing)
- `Animated.ScrollView` with scroll handler wired up
- `showsVerticalScrollIndicator={false}`
- Role-gated: ONLY renders for coach role. Other roles see their existing dashboards.

1B. **Team Selector Pills** at the top (below compact header):
- Horizontal scrollable row of team pills
- Each pill: team name, team color accent (left border or background tint)
- Active pill: filled with `COLORS.skyBlue`, white text
- Inactive pills: `COLORS.offWhite` background, `COLORS.textPrimary` text, subtle border
- Pill style: borderRadius 20, paddingHorizontal 16, paddingVertical 8, Plus Jakarta Sans 600, 13px
- Tapping a pill sets the selected team and all data below refreshes
- Query teams assigned to this coach from Supabase. Reference the web admin's `loadCoachData()` pattern in CoachDashboard.jsx for the exact query.
- If coach has only 1 team, still show the pill but no need for horizontal scroll.

1C. **Welcome Briefing** (Tier 3 — Ambient):
- Mascot (🐱 at 48px) with subtle float animation
- "Good [morning/afternoon/evening], Coach" — time-of-day aware
- Below: one contextual briefing message about ALL teams (before team filter):
  - If game today on any team: "Game day. [Team] vs [Opponent] at [Time]. [X] of [Y] confirmed."
  - If practice today: "Practice at [Time] for [Team]. [X] confirmed."
  - If events on multiple teams today: "[Team1] game at 10 AM. [Team2] practice at 4 PM."
  - If no events today: "[Team] is [W]-[L] this season. Next up: [Day]'s [event type]."
- This message is NOT filtered by team pill selection — it's the global briefing. Everything below IS filtered.
- Same flat text styling as parent welcome (no speech bubble card):
  ```
  fontSize: 17, fontFamily: FONTS.bodySemiBold, color: COLORS.textPrimary
  textAlign: 'center', lineHeight: 26, paddingHorizontal: 32
  ```

1D. **Compact Header** (same morph pattern as parent):
- Collapses on scroll: 🐱 LYNX + role selector + notification bell
- Team pills become sticky below the compact header (don't scroll away)
- Use same scroll thresholds and interpolation pattern from parent redesign

1E. **Role selector** — same component used on parent home. Place in compact header AND welcome section.

**Wiring:**
- Team pills: set selected team state, trigger data reload
- Role selector: switches dashboard view (same as parent)
- Notification bell: navigates to notifications screen

**Commit:** `git add -A && git commit -m "Coach Home Phase 1: Scroll skeleton, team selector pills, welcome briefing" && git push`

**Immediately proceed to Phase 2.**

---

## PHASE 2: GAME PLAN CARD + PREP CHECKLIST (Event Day Content)

**Goal:** Build the conditional game day command card and prep checklist that only appear on event days.

**Tasks:**

2A. **Prep Checklist** (Tier 2 — Flat, appears ABOVE the game plan card):
- Only renders when the selected team has an event today or tomorrow
- Shows checklist items as a compact single line:
  ```
  ✓ Lineup set  ✓ RSVPs (11/12)  ✗ Last game stats
  2 of 3 ready for Saturday →
  ```
- Check marks: `COLORS.success` for complete, `COLORS.error` for incomplete
- The summary line ("2 of 3 ready") in `COLORS.textMuted`
- Tapping navigates to game prep screen
- **Query pattern:** Reference `computeCheckpoints` from web admin's `lib/gameCheckpoints.js` and the checklist computation in `CoachDashboard.jsx` lines 657-694:
  - Lineup set: check `game_lineups` table for this event + team
  - RSVPs reviewed: check if 80%+ of roster has responded in `event_rsvps`
  - Last game stats entered: check `schedule_events` where `event_type='game'`, `game_status='completed'`, `stats_entered=false`
- If all items complete:
  *Tier 3:* "All set for Saturday. Trust the preparation. ✓"

2B. **Game Plan Card** (Tier 1 — Full card, conditional):
- Only renders when selected team has an upcoming event within 48 hours
- Dark navy card (#0D1B3E), same aesthetic as parent's event hero card
- Content:
  ```
  ● GAME DAY · 10:00 AM                    🏐
  BLACK HORNETS ELITE
  vs Rangers
  📍 Frisco Fieldhouse

  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐
  │Roster│ │Lineup│ │ Stats│ │Attend. │
  └──────┘ └──────┘ └──────┘ └────────┘

  11/12 confirmed · Mia not responded

  [ START GAME DAY MODE ]
  ```
- **Quick action buttons** INSIDE the card (not separate section):
  - Roster → navigate to roster management screen
  - Lineup → navigate to lineup builder screen
  - Stats → navigate to stat entry screen  
  - Attendance → navigate to attendance screen
  - Style: small lightweight pills, `COLORS.offWhite` background, 10px border-radius, Plus Jakarta Sans 600, 11px
- **"Mia not responded"** line: tappable → navigate to chat/DM with Mia's parent (or show a quick compose modal). Use `COLORS.amberWarm` for the name to draw attention.
- **"START GAME DAY MODE" button:** Prominent, full-width, `COLORS.skyBlue` background, white Bebas Neue text, 14px border-radius, 52px height. Tapping navigates to the Game Day screen (if it exists on mobile) or shows "Coming soon" toast.
- **For practice events:** Same card structure but no "vs [Opponent]", no "START GAME DAY MODE", quick actions show: Roster, Attendance, Warmup Timer. Title says "PRACTICE" not "GAME DAY".
- **If no event within 48 hours:** This entire card does not render. The scroll is shorter on quiet days.

2C. **Previous Matchup Scouting** (Tier 2 — Flat, conditional):
- Only renders for game events where the opponent has been played before this season
- Query pattern from web admin's `GameJourneyPanel.jsx` `loadPreviousMatchup()`:
  ```
  schedule_events where team_id = X, event_type = 'game', game_status = 'completed', 
  opponent_name ilike [opponent], order by event_date desc, limit 1
  ```
- Display:
  ```
  SCOUTING
  Last matchup vs Rangers: Lost 25-22, 23-25, 15-12
  Nov 15, 2025 →
  ```
- Flat text. Tapping goes to that game's detail/recap screen.
- If first matchup: "First meeting with Rangers this season."

**Wiring:**
- Checklist items → game prep screen
- Quick action buttons → their respective screens (find existing routes)
- "Mia not responded" → chat/DM compose
- START GAME DAY MODE → game day screen or toast
- Scouting line → game detail screen

**Commit:** `git add -A && git commit -m "Coach Home Phase 2: Game plan card, prep checklist, scouting context" && git push`

**Immediately proceed to Phase 3.**

---

## PHASE 3: QUICK ACTIONS + ENGAGEMENT SECTION

**Goal:** Build flat quick actions for non-event days and the social/engagement features.

**Tasks:**

3A. **Quick Actions** (Tier 2 — Flat rows):
- Show below the game plan card (or as the first major section on non-event days)
- On event days, only show actions NOT already in the game plan card:
  ```
  Send a Blast                               →
  Give a Shoutout                            →
  Review Stats                               →
  Create a Challenge                         →
  ```
- On non-event days, show the full set:
  ```
  Send a Blast                               →
  Build a Lineup                             →
  Give a Shoutout                            →
  Review Stats                               →
  Manage Roster                              →
  Create a Challenge                         →
  ```
- Style per row:
  ```
  paddingHorizontal: 24, paddingVertical: 14
  flexDirection: 'row', alignItems: 'center'
  borderBottomWidth: 1, borderBottomColor: COLORS.borderLight
  Icon: 20px emoji on left
  Label: FONTS.bodySemiBold, 15px, COLORS.textPrimary, flex: 1, marginLeft: 12
  Arrow: COLORS.textFaint, right-aligned
  ```
- Each row tappable → navigates to the correct screen

**Wiring for each action:**
- Send a Blast → blast compose screen (search for existing blast/message compose)
- Build a Lineup → lineup builder screen
- Give a Shoutout → shoutout modal or screen (reference web admin's GiveShoutoutModal)
- Review Stats → stats screen
- Manage Roster → roster screen
- Create a Challenge → challenge creation screen (if exists, else toast "Coming soon")

3B. **Active Challenge** (Tier 2 — Flat, conditional):
- Only renders if the selected team has an active challenge
- Query: `coach_challenges` where `team_id = X`, `status = 'active'`, ordered by `ends_at`
- Also query `challenge_participants` to get completion count (reference web admin CoachDashboard.jsx lines 383-404)
- Display:
  ```
  ACTIVE CHALLENGE
  "10 Aces This Week" · 4 of 12 completed              →
  ━━━━━━━━━━━━━━━━━━━░░░░░░░░░░  33%
  Ends Friday
  ```
- Progress bar: 4px, `COLORS.skyBlue` fill, `COLORS.warmGray` track
- Tapping → challenge detail screen (if exists, else toast)
- If no active challenge:
  *Tier 3:* "No active challenges. Your team could use one. →" (tappable → create challenge)
- If challenge is close to ending (within 48 hours):
  *Tier 3:* "Challenge ends tomorrow. 4 players still need 3 more aces."

3C. **Shoutout Nudge** (Tier 3 — Ambient, conditional):
- Query: count shoutouts given by this coach this week for the selected team
- Reference web admin CoachDashboard.jsx lines 371-381 for the query pattern
- If 0 shoutouts this week:
  ```
  No shoutouts this week yet.
  Who's been putting in work? →
  ```
  Tappable → Give Shoutout modal/screen. Color: `COLORS.textAmbient`.
- If 1-2 shoutouts:
  ```
  You've recognized 2 players this week.
  The team feeds off that energy. 🎯
  ```
  Not tappable. Pure ambient.
- If 3+ shoutouts:
  ```
  3 shoutouts this week. Your team feels seen.
  ```
  Not tappable. Positive reinforcement.

**Commit:** `git add -A && git commit -m "Coach Home Phase 3: Quick actions, active challenge, shoutout nudge" && git push`

**Immediately proceed to Phase 4.**

---

## PHASE 4: TEAM PULSE + ROSTER ALERTS

**Goal:** Build the operational data section — attendance, RSVPs, messages — and the smart roster that only shows players needing attention.

**Tasks:**

4A. **Team Pulse** (Tier 2 — Flat data rows):
```
  TEAM PULSE

  Attendance                              92% →
  Average over last 3 events

  RSVPs for Saturday                  11/12  →
  Mia Chen hasn't responded

  Unread Parent Messages                  3  →
```
- Each row: label on left, value right-aligned, subtitle below in `COLORS.textMuted`
- Tapping each → relevant management screen (attendance, RSVP list, messages)
- **Queries** (reference web admin CoachDashboard.jsx):
  - Attendance: average attendance rate over last 3 events for this team (lines 527-545)
  - RSVPs: count for next upcoming event from `event_rsvps` (lines 336-350)
  - Unread messages: count from chat/messages tables
- The "Mia Chen hasn't responded" subtitle is powerful — it names the specific person. Query `event_rsvps` joined with `team_players`/`players` to find who hasn't RSVP'd. Show up to 2 names. If more: "Mia Chen and 2 others haven't responded."

**Ambient moment after Team Pulse (conditional):**
- If attendance > 90%: "92% attendance. This team shows up." (Tier 3)
- If attendance dropped below 80%: "Attendance dipped this week. Worth a check-in." (Tier 3, `COLORS.amberWarm`)
- If all RSVPs in: "Full roster confirmed for Saturday. Let's go." (Tier 3, `COLORS.success`)

4B. **Roster Alerts** (Tier 1.5 — Lightweight cards, conditional):
- Section header: "ROSTER · [X] players" — tapping the header navigates to full roster
- ONLY show players who need attention. Do NOT show the full roster. Query for:
  - Players who haven't RSVP'd for the next event
  - Players who have missed 2+ of last 5 events (attendance issues)
  - Players with overdue parent payments (if accessible from coach role)
  - Players with no recent evaluation (if `player_skill_ratings` or `player_evaluations` table exists — check SCHEMA_REFERENCE.csv)
- Each alert player: lightweight card
  ```
  ┌─────────────────────────────────────────────┐
  │ 🔴 Mia Chen · No RSVP for Saturday         │
  │    Missed last 2 practices                  │
  └─────────────────────────────────────────────┘
  ```
  - Red/amber dot indicates severity
  - Tapping → player profile or DM to parent
- **If ALL players are fine:**
  *Tier 3:*
  ```
  All 12 players confirmed and current.
  Nothing to chase down this week. ✓
  ```
  No cards render. Just the ambient line. This is the reward for having a well-organized team.

4C. **Development Hint** (Tier 2 — Flat, conditional):
- Check if `player_skill_ratings` or `player_evaluations` tables exist in SCHEMA_REFERENCE.csv
- If they exist, query for players who haven't been evaluated recently (no evaluation in 30+ days):
  ```
  PLAYER DEVELOPMENT
  3 players due for evaluation this month →
  ```
- If a recent evaluation showed improvement:
  ```
  PLAYER DEVELOPMENT
  Ava's serving improved from 6 to 8 
  since your last evaluation 📈 →
  ```
- Tapping → player development screen (if exists) or roster screen
- If tables don't exist, skip this section entirely. Leave comment: `// TODO: Player evaluation tables not found in schema`

**Commit:** `git add -A && git commit -m "Coach Home Phase 4: Team pulse, roster alerts, development hint" && git push`

**Immediately proceed to Phase 5.**

---

## PHASE 5: ACTIVITY FEED + SEASON SCOREBOARD

**Goal:** Build the recent activity feed and season scoreboard with scouting context.

**Tasks:**

5A. **Pending Stats Nudge** (Tier 2 — Flat, conditional):
- Query: count of `schedule_events` where `team_id = X`, `event_type = 'game'`, `game_status = 'completed'`, `stats_entered = false` (reference web admin line 362)
- If count > 0:
  ```
  ⚠️  2 games need stats entered →
  ```
  Color: `COLORS.amberWarm`. Tappable → stat entry screen.
- If count is 0: section doesn't render.

5B. **Recent Activity Feed** (Tier 2 — Flat feed):
```
  RECENT

  You gave Ava a 🎯 Clutch Player shoutout
  Yesterday

  Parent of Mia acknowledged your blast
  "Practice Canceled" · 2d ago

  Jordan leveled up to Level 5
  3d ago
```
- Query recent activity for this team:
  - Shoutouts given by this coach (from `shoutouts` table)
  - Blast acknowledgments (from `message_recipients` where acknowledged = true, join with `messages`)
  - Player level-ups or badge earnings (from `player_achievements` if exists)
- Show last 3-5 items, most recent first
- Each item: text + relative timestamp. Flat, no cards.
- Style: same as parent's Team Hub flat feed pattern
- If no recent activity: 
  *Tier 3:* "Quiet week. Time to stir things up? →" (tappable → quick actions)

5C. **Season Scoreboard** (Tier 2 — Flat with big numbers):
- Same visual treatment as parent's Season section — big Bebas Neue numbers on the background:
  ```
  SEASON

        6    |    1
       wins      losses

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░
                86% win rate

  Next: Saturday vs Rangers (6-2)
  They beat us 25-22, 23-25, 15-12 last time
  ```
- The opponent scouting line only shows for the next game opponent. Query pattern from GameJourneyPanel.jsx `loadPreviousMatchup()`.
- If first matchup: "First meeting with Rangers this season"
- If no next game: just show the record without scouting context
- Tapping the section → schedule or game history screen

5D. **Top Performers** (Tier 2 — Flat, conditional):
- If player season stats exist (check `player_season_stats` table):
  ```
  TOP PERFORMERS

  ⚡ Ava Williams · 47 kills, 12 aces          →
  🛡️ Jordan K · 38 digs, 22 assists            →
  🎯 Sister 2 · 15 aces, 8 blocks              →
  ```
- Query: reference web admin CoachDashboard.jsx lines 366-369 — top 3 players by `total_points`
- Each row tappable → player detail screen
- If no stats data, skip this section entirely

**Commit:** `git add -A && git commit -m "Coach Home Phase 5: Activity feed, season scoreboard, top performers" && git push`

**Immediately proceed to Phase 6.**

---

## PHASE 6: CLOSING + ANIMATION + SPACING

**Goal:** Build the contextual closing, polish animations, and do the final spacing pass.

**Tasks:**

6A. **Closing** (Tier 3 — Ambient, contextual):
```typescript
// Pick ONE based on priority:
// 1. Game today → "Trust the preparation. Your team is ready."
// 2. Practice today → "Good practice makes good habits. Set the tone today."
// 3. Win yesterday → "Celebrate the win. Then get back to work."
// 4. Loss yesterday → "One loss doesn't define a season. Film review time."
// 5. Off day → "Recovery matters too. Let them rest."
// 6. Season start → "New season energy. Let's build something."
// 7. Fallback → "Go make them better today."
```
- Mascot at 40px, 30% opacity, centered
- Message in `FONTS.bodyMedium`, 14px, `COLORS.textFaint`, centered
- Bottom padding: 140px to clear nav bar

6B. **Auto-hiding bottom nav** — reuse the same pattern from parent Phase 6. The nav should auto-hide on scroll for the coach home too (same `useScrollAnimations` hook behavior). If the parent's auto-hide was disabled due to issues, disable it here too for consistency.

6C. **Compact header morph** — same crossfade pattern as parent. Welcome section collapses, compact header with LYNX branding + role selector + bell appears. Team pills stick below the header.

6D. **Spacing rhythm pass:**
```
Welcome briefing (Tier 3)
  ↕ 4px
Team pills (sticky below header on scroll)
  ↕ 16px
Prep checklist (Tier 2) — or gone
  ↕ 8px
Game plan card (Tier 1) — or gone
  ↕ 8px
Scouting (Tier 2) — or gone
  ↕ 20px
Quick actions (Tier 2)
  ↕ 16px
Active challenge (Tier 2) — or gone
  ↕ 12px
Shoutout nudge (Tier 3) — or gone
  ↕ 24px
TEAM PULSE header
  ↕ 8px
Pulse data rows (Tier 2)
  ↕ 12px
Pulse ambient (Tier 3) — or gone
  ↕ 20px
ROSTER header
  ↕ 10px
Roster alerts (Tier 1.5) — or "all clear" ambient
  ↕ 12px
Development hint (Tier 2) — or gone
  ↕ 24px
Pending stats nudge (Tier 2) — or gone
  ↕ 16px
RECENT header
  ↕ 8px
Activity feed (Tier 2)
  ↕ 24px
SEASON header
  ↕ 12px
Scoreboard (Tier 2)
  ↕ 16px
Top performers (Tier 2) — or gone
  ↕ 24px
Closing (Tier 3)
  ↕ 140px bottom padding
```

6E. **Section header consistency** — every section header uses the exact same style:
```
fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 1.1
textTransform: 'uppercase', color: COLORS.textFaint, paddingHorizontal: 24
```

6F. **Scrollbar hidden:** `showsVerticalScrollIndicator={false}`

**Commit:** `git add -A && git commit -m "Coach Home Phase 6: Closing, animations, spacing rhythm" && git push`

**Immediately proceed to Phase 7.**

---

## PHASE 7: FINAL WIRING AUDIT + SMOKE TEST

**Goal:** Verify every tap target works, all data loads, no dead ends.

**Tasks:**

7A. **Tap target audit.** Go through EVERY tappable element and verify it navigates somewhere:

| Element | Should Navigate To |
|---------|-------------------|
| Team pills | Switch selected team, reload data |
| Role selector | Switch role view |
| Notification bell | Notifications screen |
| Prep checklist | Game prep screen |
| Game plan card (tap) | Event detail screen |
| Quick actions inside card | Roster, Lineup, Stats, Attendance screens |
| "Mia not responded" | Chat/DM compose |
| START GAME DAY MODE | Game day screen or "Coming soon" |
| Scouting line | Previous game detail |
| Each quick action row | Respective screen |
| Active challenge | Challenge detail or "Coming soon" |
| Shoutout nudge (when tappable) | Shoutout compose |
| Team pulse rows | Attendance, RSVP list, Messages |
| Roster alert cards | Player profile or DM to parent |
| ROSTER header | Full roster screen |
| Development hint | Player development or roster screen |
| Pending stats nudge | Stat entry screen |
| Activity feed items | Relevant detail screen |
| Season section | Schedule or game history |
| Top performer rows | Player detail screen |

7B. **Data accuracy check:**
- Team name displays correctly
- Player names are correct (first name, not "Sister")
- Record matches actual win/loss from database
- RSVP counts are accurate
- Event details match database (date, time, location, opponent)

7C. **Conditional sections check:**
- On a day with no events: game plan card, prep checklist, and scouting should NOT render
- With no active challenges: challenge section should NOT render
- With no roster issues: roster alerts should show "all clear" ambient
- With all stats entered: pending stats nudge should NOT render
- Verify the scroll is shorter on quiet days

7D. **Other roles smoke test:**
- Switch to Parent → parent scroll home works, unchanged
- Switch to Admin → admin dashboard works, unchanged
- Switch to Player → player dashboard works, unchanged

7E. **TypeScript check:**
```bash
npx tsc --noEmit
```
Fix any errors.

**Commit:** `git add -A && git commit -m "Coach Home Phase 7: Final wiring audit, data verification, smoke test" && git push`

---

## VERIFICATION CHECKLIST

**Scroll Structure:**
- [ ] Welcome briefing references ALL teams before filter
- [ ] Team pills filter all content below
- [ ] Game plan card appears on event days, disappears on off days
- [ ] Prep checklist shows real checkpoint status
- [ ] Quick actions adapt based on event day vs off day
- [ ] Roster alerts show only players needing attention
- [ ] "All clear" ambient appears when no issues
- [ ] Season scoreboard shows scouting context for next opponent
- [ ] Closing message is contextual

**Three-Tier System:**
- [ ] Only 1 full card maximum (game plan) — maybe 0 on off days
- [ ] Lightweight cards for roster alerts only
- [ ] Everything else is flat or ambient
- [ ] Ambient moments disappear when irrelevant (no empty states)

**Data & Wiring:**
- [ ] All queries verified against SCHEMA_REFERENCE.csv
- [ ] All tap targets navigate somewhere (no dead taps)
- [ ] Team switching reloads all data
- [ ] Role switching works

**Other Roles:**
- [ ] Parent scroll home unchanged
- [ ] Admin dashboard unchanged
- [ ] Player dashboard unchanged

---

*This spec transforms the Coach Home from a card dashboard into an intelligent briefing system. On game day, it's a command center. On off days, it's a quick pulse check. The scroll length adapts to how much is happening. Cards for action, flat for information, ambient for coaching personality.*
