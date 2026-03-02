# VolleyBrain — Coach UX Redesign Spec
## For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)
**Backend:** Supabase (project: uqpjvbiuokwpldjvxiby)
**GitHub:** SgtxTorque/volleybrain-mobile3

---

## RULES (READ FIRST — APPLY TO ALL PHASES)

1. **Read SCHEMA_REFERENCE.csv FIRST** before writing or modifying ANY query. Verify every table name and column name against it. If a table or column doesn't exist in SCHEMA_REFERENCE.csv, flag it and ask — do NOT guess.

2. **Read the existing code before changing it.** Before modifying any file, read the entire file first. Understand what's already built and working. Do NOT break existing functionality.

3. **This mobile app shares a Supabase backend with the web admin portal located at `C:\Users\fuent\Downloads\volleybrain-admin`.** When you need to verify correct table names, column names, or query patterns, read the web app's source files as the source of truth — specifically:
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\contexts\AuthContext.jsx` (auth patterns)
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\MainApp.jsx` (feature list and routing)
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\lib\supabase.js` (client config)
   - Any page in `C:\Users\fuent\Downloads\volleybrain-admin\src\pages/` for query patterns
   - The web app is the source of truth for database schema and query patterns. Make the mobile app's queries match.

4. **Full file replacements only** when creating new screens. Do NOT remove or break existing functionality in shared files. When modifying navigation or shared components, add conditional logic — don't delete what other roles depend on.

5. **Verify all queries against SCHEMA_REFERENCE.csv.** Flag anything that doesn't match, fix it. No query should reference a table or column that doesn't exist.

6. **Match the existing visual style.** Review existing screens to understand the current design patterns — tappable cards (not hyperlinks), smooth animations, consistent trading card/hero visual style, accent colors, theming. Keep everything consistent with the parent experience that was just redesigned.

7. **Show me your plan first for each phase**, then deliver. Don't start coding without showing the approach.

8. **Complete each phase fully, commit, then pause for me to test** before moving to the next phase.

9. **No console.log without `__DEV__` gating.**

10. **Review ADMIN_PARITY_AUDIT.md** (project root) if you need additional context on what's already been built and audited.

11. **Use the existing auth/permissions pattern.** Check how the app currently determines user roles — use `usePermissions()` or whatever the established pattern is. Do NOT use `profile?.role` directly unless that's the existing pattern.

12. **Check what packages are already installed** in package.json before adding new dependencies. If @gorhom/bottom-sheet, expo-calendar, react-native-reanimated, or other packages are already there, use them. If not, install and note it.

13. **After all work in each phase, run `npx tsc --noEmit`** to confirm zero new TypeScript errors.

14. **The Parent UX Redesign has already been completed.** Parents now use: Home | Schedule | Chat | Team | My Stuff. Read the parent tab navigator code to understand the role-gating pattern already in place. Follow the SAME pattern for coach — do NOT rewrite the role-gating logic, extend it.

---

## OVERVIEW

We are redesigning the Coach experience in the VolleyBrain mobile app. Coaches are the second highest-volume users after parents. They need operational speed (game prep, attendance, stats) AND social connection (team wall, chat, announcements) on the same experience.

This involves:

1. **Coach-specific bottom navigation** (same 5 tabs as parents, coach-flavored content)
2. **Redesigned Coach Home** with team selector, season overview, quick actions, and previews
3. **Schedule tab with coach additions** (Create Event FAB, RSVP counts, Game Prep entry)
4. **Chat tab with Blast Message** capability
5. **Team Hub with coach actions** (roster management, message parent, attendance history)
6. **My Stuff tab for coaches** (coach tools, availability, blast history)
7. **Game Prep Workflow** (RSVPs → Attendance → Lineup — connected step-by-step flow)
8. **Game Day Command Center** (live stat tracking with court view — dark modern UI)

### CRITICAL: This redesign is COACH-ROLE ONLY.
Do not modify Parent, Admin, or Player experiences. The parent redesign is already complete — do NOT touch it. Use the same role-gating pattern already established in the tab navigator. Before changing ANY shared component or navigation file, verify it won't break other roles.

---

## PHASE 1: Coach Navigation + Home Screen

### Task 1A: Extend tab navigation for Coach role

Read the current tab navigator file. The parent role-gating is already implemented. Extend it for coaches.

**Coach tabs (same structure as parents, different content):**

| Tab | Label | Icon | Screen Component |
|-----|-------|------|-----------------|
| 1 | Home | house icon | CoachDashboard (redesigned) |
| 2 | Schedule | calendar icon | CoachScheduleScreen (extends parent schedule) |
| 3 | Chat | message-circle icon | ChatListScreen (same as parent, with blast option) |
| 4 | Team | users icon | CoachTeamHubScreen (redesigned) |
| 5 | My Stuff | user icon | CoachMyStuffScreen (new) |

**Implementation:**
- Follow the exact same role-gating pattern used for parents
- Coaches currently use the old tab layout (Home | Game Day | Team | Manage | Me) — switch them to the new 5-tab layout
- Do NOT modify the parent tab config or admin/player tabs
- The old Game Day, Manage, and Me screens must still exist for Admin and Player roles

### Task 1B: Build Coach Home Screen (CoachDashboard)

Read the current coach dashboard code first. Understand what data it fetches and what components it uses. Reuse existing components and queries where possible.

**Layout — top to bottom:**

**1. Team Selector (top)**
- Pill tabs for each team the coach manages
- Switching teams refreshes ALL content below
- Default to first team
- Query: Check SCHEMA_REFERENCE.csv for how coaches are linked to teams (likely `team_staff` table — verify). Cross-reference how the existing coach dashboard fetches team assignments.

**2. Season Overview Card**
- Season record (W-L-T) — verify column names in SCHEMA_REFERENCE.csv for game results
- Roster count (active players on selected team)
- Average attendance trend (last 4 events)
- Next game countdown
- Games needing stats count (games completed but no stats entered)
- Tap navigates to a full season stats screen (use existing if available)

**3. Next Event Hero Carousel**
- Same hero-style carousel pattern as the parent redesign — find and reuse that component
- 3 swipeable hero cards showing next 3 events for the selected team
- Each card shows: event type, date/time, location, opponent, RSVP count ("9 of 12 confirmed"), game prep completion indicator ("Prep: 2/3 ✓")
- Tap a card → enters Game Prep workflow for that specific event (Phase 3)
- 4th position: "View Full Schedule →" navigates to Schedule tab

**4. Quick Action Buttons**
- One horizontal row, 4 buttons: **Game Day | Game Prep | Roster | Enter Stats**
- Contextual behavior:
  - On a game day: Game Day button gets pulse/glow animation (use Animated API)
  - When games need stats: Enter Stats button shows badge count
  - On non-game days: Game Day is less emphasized (muted), could swap to Blast Message
- Game Day → opens Game Day Command Center (Phase 4, full-screen)
- Game Prep → opens Game Prep workflow (Phase 3)
- Roster → navigates to Team tab roster view
- Enter Stats → shows list of recent games needing stats, tap one to enter stats

**5. Team Hub Preview**
- Latest team wall post for the selected team
- Same component as parent home — reuse it
- Tap navigates to Team tab

**6. Chat Preview**
- Last conversation snippet — same as parent home, reuse component
- Tap jumps to that conversation in Chat tab

**7. Team Badges Preview**
- Team achievements for the selected team
- Same pattern as parent home

---

## PHASE 2: Coach Schedule + Chat Tabs

### Task 2A: Coach Schedule Tab

Read the parent Schedule screen that was just built. The coach version extends it with additional features — do NOT rebuild from scratch, add to it.

**Same as parent schedule, plus:**
- RSVP count visible on each event card ("9 of 12 going") — parents only see their own RSVP, coaches see the team count
- "Game Prep" button/chip on each event card — tap enters Game Prep workflow for that event
- "Add to Calendar" and "Get Directions" same as parents (coaches attend games too)
- Inline RSVP chips for the coach themselves (coaches can mark if they can't attend)
- **Create Event FAB** — floating action button in bottom-right corner. Opens event creation form. Only renders for coach and admin roles.
- Team filter pills at top if coach manages multiple teams

**Event detail bottom sheet** — same as parent, plus "Who's Going" with full RSVP breakdown showing player names and statuses.

### Task 2B: Coach Chat Tab

Read the parent Chat tab that was just built. The coach version is the same with one addition.

**Same as parent chat tab, plus:**
- The FAB (new message button) offers TWO options when tapped:
  - "New Message" — standard DM or group chat (same as parent)
  - "📢 Blast Message" — opens blast composer
- Blast composer: coach picks team(s), writes message, sends
- Blast delivery (wire up all three if possible, otherwise flag what's missing):
  - Push notification to all team members
  - Pinned/highlighted message in the team chat channel with "📢 Coach Announcement" visual styling (different from normal messages)
  - Auto-post to the Team Wall as an announcement card
- Check SCHEMA_REFERENCE.csv for blast/announcement related tables before writing queries
- Check existing blast composer code in the app — it was previously built under Manage → Coach Tools. Reuse that component.

---

## PHASE 3: Game Prep Workflow

### Task: Build connected Game Prep flow (full-screen workflow)

**Entry points:** Home carousel card tap, Schedule event card "Game Prep" button, Quick Action button. All entry points navigate to the same Game Prep screen with the specific event pre-loaded.

This is a full-screen step-by-step workflow, NOT a tab or modal. It should feel like a wizard/checklist the coach moves through.

**Step 1: Check RSVPs**
- List of all players on the team roster
- Each player shows their RSVP status: ✓ Going (green), ✗ Not Going (red), ? Maybe (yellow), No Response (gray)
- "Send Reminder" button — sends a push notification to all non-responders
- Summary at top: "9 of 12 responded, 7 going"
- "Next →" button advances to Step 2
- Check SCHEMA_REFERENCE.csv for RSVP/attendance tables

**Step 2: Attendance / Check-in**
- List of players with checkboxes
- Pre-populated based on RSVPs: everyone who said "Going" starts checked, others unchecked. Coach adjusts based on who actually showed up.
- After submitting attendance, show insight toasts: flag players with poor attendance ("Sarah has missed 3 of last 5 practices")
- "Next →" button advances to Step 3
- Check SCHEMA_REFERENCE.csv for attendance tables

**Step 3: Set Lineup**
- Only players marked present in Step 2 are available to place
- Visual court layout: 6 positions in volleyball formation (3 front, 3 back)
- Tap a position → pick a player from the available list
- Set rotation order
- Assign subs per position (if player X is in position 4, player Y is their designated sub)
- Coach can save lineup presets for reuse
- "Save & Done" completes game prep
- Check SCHEMA_REFERENCE.csv for lineup/rotation related tables. If they don't exist, flag it — we may need a migration.

**Completion tracking:**
- Game prep progress shows on Home carousel cards: "Prep: 1/3 ✓", "2/3 ✓", "3/3 ✓"
- All steps complete = green checkmark badge on the event card
- Progress state stored per event per coach — check schema for where to persist this

---

## PHASE 4: Game Day Command Center + Stat Tracking

### Task: Build full-screen live stat tracker

**This is the biggest build. Show me your plan before coding.**

**Entry points:** Quick Action "Game Day" button (only prominent on game days), or tapping a game card that's happening today.

**UI: Dark modern palette** — not pure black, but a refined dark mode. Easy on the eyes in gym lighting. Think dark navy/charcoal backgrounds with teal and white accents matching the VolleyBrain brand.

**Layout — top to bottom on a single scrollable screen:**

**Match Header (sticky top)**
- Team name vs Opponent name
- Current set indicator: "SET 2"

**Court View**
- 6 player positions in standard volleyball formation (3 front row, 3 back row)
- Each position shows: player photo (from their profile — fall back to initials if no photo), jersey number as overlay badge, player name below
- Tap a player to select them → stat buttons appear below
- Players visually animate to new positions when rotation occurs (use Animated API or Reanimated)
- The court should show NET at the top, a dividing line for front/back row

**Rotation Controls (below court)**
- "Rotate" button — manually triggers rotation. All 6 players animate one position clockwise.
- "Lost Rally" button — triggers rotation AND gives point to opponent
- "Opp Error" button — triggers rotation AND gives point to your team (rally won without a stat-worthy action)
- Rotation is automatic: Lost Rally and Opp Error both rotate players visually

**Serving Indicator (below rotation controls)**
- Shows who is currently serving (based on rotation position)
- Player photo + "#[number] [Name]" + "SERVING" label
- Three buttons: ✓ Serve In (checkmark/green), ✗ Serve Error (X/red), ⭐ Ace (star/gold)
- App tracks serving based on Position 1 in the rotation

**Stat Tracking (appears when a player is tapped on the court)**
- Selected player shows larger with their photo and name
- Primary stat buttons (large, one tap): **Pass | Dig | Kill | Block**
- Secondary stat buttons (smaller row or expandable): **Attack Error | Pass Error | Block Error | Attack Attempt**
- After logging a stat, a quick toast appears next to the player's image on the court showing running tally: "2 kills, 1 dig"
- Tapping another player immediately switches the stat context to them
- "Tap a player on the court to track stats" placeholder text when no one is selected

**Subs (triggered from court view)**
- If a player on the court has an assigned sub (set during Game Prep lineup), tapping that player shows a "Sub In: [Sub Name]" option below the court
- Tap to execute sub — players swap visually on the court
- Sub history is logged: "Vava #7 → Maria #15"
- Subs can also be done manually if no pre-assigned sub exists

**Scoreboard (persistent, near bottom)**
- [Your Team] [score] VS [score] [Opponent]
- +/- buttons on each side to add or remove points
- Sets won shown below each team name: "Sets: 1"

**Set Navigation (bottom)**
- Set 1 | Set 2 | Set 3 | Set 4 | Set 5 tabs
- Active set highlighted
- "End Set" button — saves set stats, prompts for set winner confirmation, advances to next set tab
- On final set: "End Match" button → saves all stats → prompts "Share recap with parents?" → if yes, auto-posts game recap to Team Wall → navigates back to Home

**Post-Game Flow:**
- If stats were tracked live: game card on Home updates with final score + "Stats Complete ✓"
- If stats were NOT tracked live: game card shows "Stats Needed" orange badge
- Enter Stats quick action → shows list of games needing stats → tap one → opens a "Film Review" mode (same stat categories but not real-time — more detailed, relaxed entry for post-game review)

**Data persistence:**
- Check SCHEMA_REFERENCE.csv for all stat-related tables: player_stats, game_stats, match_results, set_scores, etc.
- If tables for live stat tracking don't exist, flag it and propose a migration SQL. Do NOT run migrations — just show me the SQL and I'll run it in Supabase.
- Stats should save per-player, per-set, per-game

---

## PHASE 5: Coach Team Hub + My Stuff

### Task 5A: Coach Team Hub

Read the parent Team Hub that was just built. The coach version follows the same structure with additional coach capabilities.

**Same as parent Team Hub, plus:**

**Hero Header** — same compact design: team name, colors, season record

**Team Selector Pills** — same as parent (multi-team coaches switch here)

**Quick Access Row** — Schedule, Roster, Achievements, Player Stats (4 items)

**Team Wall** — same social feed. Coaches can post AND pin announcements. Pinned posts stick to the top of the wall with a "📌 Pinned" badge.

**Roster (coach-enhanced):**
When coach taps a player in the roster, the player profile opens with coach-specific actions:
- "Message Parent" button → opens a DM in Chat with that player's parent
- Attendance history: "Attended 8 of 10 practices" with visual bar
- Player stats summary
- Coach notes field (editable by coach only)
- Emergency contacts and medical info visible (coaches need this for safety)
- Check SCHEMA_REFERENCE.csv for how players link to parents (likely through a family/guardian relationship table)

### Task 5B: Coach My Stuff Tab

Read the parent My Stuff tab. Coach version has different sections.

**Layout:**

**Profile Banner** — Name, avatar, tap to edit. Same component as parent.

**My Teams** — List of teams they coach, tap for team detail.

**Coach Tools:**
- Blast history with delivery/read stats
- Coach availability settings (mark dates available/unavailable)
- Coach certifications/documents (SafeSport, background check, etc.)

**Organization** — Org directory, org info. Same as parent.

**Settings** — Notification preferences, dark mode, accent color, data & privacy, help & support, sign out. Same as parent.

---

## STAT INDICATOR SYSTEM

Games without stats entered show "Stats Needed" badge on:
- Home hero carousel game cards
- Schedule event cards (for completed games)
- Season Overview Card (count: "2 games need stats")

Badge clears automatically when stats are saved for that game.

For completed games on the Schedule tab, replace the RSVP chips with the game result: score and W/L indicator.

---

## COMMIT & TEST CHECKPOINTS

After each phase:
1. Commit with descriptive message: "Coach UX Phase [X]: [description]"
2. Verify the app boots without errors: `npx tsc --noEmit`
3. Test as Coach role — verify the new UI works
4. Test as Parent role — verify NOTHING changed (their redesign is already complete)
5. Test as Admin role — verify NOTHING changed
6. Test as Player role — verify NOTHING changed
7. Report what was done and any issues found

Do NOT move to the next phase until the current one is committed and stable.

---

## EXECUTION ORDER

**Phase 1:** Navigation + Coach Home (biggest structural change, must be stable first)
**Phase 2:** Schedule + Chat tabs (extend parent versions with coach features)
**Phase 3:** Game Prep Workflow (new full-screen flow, self-contained)
**Phase 4:** Game Day Command Center (biggest build, most complex, self-contained)
**Phase 5:** Team Hub + My Stuff (polish and reorganization)

Phases 3 and 4 are the most complex. Show your plan before coding those. For Phases 1, 2, and 5 — read existing code, reuse components from the parent redesign, and extend rather than rebuild.
