# CC-NEXT-FIVE-BUILD-v2 — Lynx Mobile: Features + Design

**Date:** 2026-03-03  
**Repo:** volleybrain-mobile (Expo/React Native)  
**Branch:** Continue on `feat/next-five-build` (Feature 0 already completed)  
**Replaces:** CC-NEXT-FIVE-BUILD.md (v1 was bones only — this version includes full design direction)

---

## RULES — READ ALL OF THIS BEFORE WRITING A SINGLE LINE OF CODE

### Rule 1: Read the reference files first
Before building ANY feature, read these files in the project:

```bash
# Find and read brand reference files
find . -name "*brand*" -o -name "*restyle*" -o -name "*brandbook*" | grep -v node_modules
cat theme/colors.ts
cat theme/fonts.ts
cat theme/spacing.ts
cat lib/design-tokens.ts  # if it exists
```

### Rule 2: Read the web admin reference folder
There is a `reference/` folder in the project root containing the web admin source code. **Before building each feature, search this folder for the web version of that feature.** The mobile version MUST use the same database tables, column names, and business logic as the web version. Do NOT invent new tables if the web already has them. Do NOT guess at field names.

```bash
# For each feature, search like this:
# Feature 1: 
find reference/ -name "*game*" -o -name "*scoring*" -o -name "*lineup*" | head -20
grep -r "game_day\|gameday\|game_prep\|GamePrep\|scoring\|setScores" reference/ --include="*.jsx" --include="*.tsx" -l

# Feature 2:
grep -r "challenge\|Challenge" reference/ --include="*.jsx" --include="*.tsx" -l

# Feature 3:
grep -r "evaluation\|Evaluation\|skill_rating\|player_eval" reference/ --include="*.jsx" --include="*.tsx" -l

# Feature 4:
grep -r "season.*setup\|setup.*wizard\|SeasonSetup\|create.*season" reference/ --include="*.jsx" --include="*.tsx" -l

# Feature 5:
grep -r "bulk.*event\|recurring\|BulkCreate\|bulk_create" reference/ --include="*.jsx" --include="*.tsx" -l
```

Read the web components you find. Understand what tables they query, what fields they save, what validation they do. Then build the mobile version to match.

### Rule 3: Study the existing home scrolls before building
Read these files FULLY before building any new screen:

- `components/ParentHomeScroll.tsx` — the gold standard for scroll architecture, card patterns, section headers, spacing, and animations
- `components/CoachHomeScroll.tsx` — the coach version with team selector pills and compact header morphing
- `components/PlayerHomeScroll.tsx` — the dark theme variant with the PLAYER_THEME
- `hooks/useScrollAnimations.ts` — the shared scroll animation utilities

These are your design reference. Every new screen must feel like it belongs with these.

### Rule 4: The three-tier visual system
Every section of every screen falls into one of three tiers. This is how Lynx screens are designed:

**TIER 1 — Actionable Cards (hero treatment)**
- Full-width cards with visual presence (backgrounds, gradients, icons)
- These are things the user needs to ACT on: score entry, lineup, RSVP, payment
- Tappable with clear CTA
- Examples: Event hero cards, game score panel, "Start Game Day Mode" button
- Use `PressableCard` with shadow, rounded corners (16px), brand accent colors

**TIER 2 — Flat Content (informational rows)**  
- Compact, no card wrapper — just clean rows of information
- These are things the user needs to SEE but not necessarily act on right now
- Lower visual weight than Tier 1
- Examples: Stat rows, player list items, schedule list, notes
- Use flat rows with subtle dividers, no shadows, no card backgrounds

**TIER 3 — Ambient / Personality Moments**
- Lightweight, adds personality without demanding attention
- The Lynx cub mascot appears here with contextual messages
- Motivational closings, celebration hints, "since you were last here" moments
- Examples: ClosingMotivation, AmbientCelebration, ClosingMascot
- Subtle animations, smaller text, personality-driven

**When building a new screen, explicitly decide which tier each section belongs to before coding it.**

### Rule 5: Don't make everything a card
This is critical. If every section is a card, nothing stands out. Use cards for Tier 1 (actionable items). Use flat content for Tier 2 (information). Use ambient treatment for Tier 3. The contrast between cards and flat content is what makes the cards pop.

### Rule 6: Scroll behavior patterns
- New full-screen routes should use `Animated.ScrollView` (not plain ScrollView) unless they're a fixed-layout tool
- Section spacing: 16-20px between sections, not more
- Content should feel dense and information-rich, not spacious with wasted whitespace
- If the screen has a hero/header element, consider compact header morphing on scroll (like CoachHomeScroll does — the header shrinks as you scroll down)
- Reuse `useScrollAnimations` hooks where applicable

### Rule 7: Mascot companion
The Lynx cub mascot should appear contextually on new screens as a Tier 3 ambient element:
- Empty states: mascot with encouraging message instead of generic "No data" text
- Success moments: mascot celebrates
- Closing sections: mascot with contextual sign-off
- Check how `ClosingMascot.tsx` and `ClosingMotivation.tsx` work and follow the same pattern

### Rule 8: Match brand tokens — no hardcoded colors
All colors must come from `theme/colors.ts` or `lib/design-tokens.ts`. All fonts from `theme/fonts.ts`. All spacing from `theme/spacing.ts`. Zero hardcoded hex values.

### Rule 9: Reuse components aggressively
These exist — use them: `PressableCard`, `SectionHeader`, `Avatar`, `Badge`, `StatBox`, `PillTabs`, `EventCard`, `PlayerCard`, `PlayerCardExpanded`, `CircularProgress`, `AnimatedStatBar`, `AnimatedNumber`. Find them in `components/` and `components/ui/` before building anything new.

### Rule 10: Commit after each feature, then continue
```bash
git add . && git commit -m "descriptive message" && git push
```

---

## FEATURE 1: GAME DAY COMMAND CENTER

**Priority:** HIGH | **Roles:** Coach | **Route:** `app/game-day-command.tsx`

### What to read first
```bash
# Web reference — find how the web handles game day, scoring, stats entry
grep -r "GamePrep\|game_prep\|scoring\|setScores\|game_completion\|GameCompletion" reference/ --include="*.jsx" --include="*.tsx" -l
# Read all files found above

# Mobile reference — existing game day components
cat components/GameCompletionWizard.tsx
cat app/game-prep-wizard.tsx
cat app/game-results.tsx
cat app/lineup-builder.tsx
cat components/VolleyballCourt.tsx
```

Study the web's scoring data model. What tables store set scores? What tables store live stats? Use the SAME tables.

### The design concept: "The Coaching Cockpit"

This is NOT a regular app screen. This is a focused, immersive tool designed for courtside use under pressure. Think ESPN scoreboard meets a coach's clipboard.

**Visual treatment:**
- Dark background (deep navy from brand palette — NOT pure black, use the lynx-navy or a dark value from `theme/colors.ts`)
- High contrast elements — white and bright teal for scores, text
- Large tap targets everywhere (minimum 48px, preferably 56-64px for score buttons)
- Minimal decorative elements — this is a TOOL, every pixel serves a purpose
- No mascot on this screen — it's all business

**Screen type:** Full-screen stack route (not modal, not tab). Immersive — hide the tab bar.

### Layout: Sticky header + scrollable body

**STICKY SECTION (always visible, doesn't scroll):**

This is a Tier 1 element — the most important thing on screen.

```
┌─────────────────────────────────────────────────┐
│  [← Back]    GAME DAY        [⏸ Pause] [🏁 End]│
│                                                 │
│   HOME                          AWAY            │
│   Black Hornets     VS     Rival Club           │
│                                                 │
│   S1    S2    S3    S4    S5                     │
│   25    18    --    --    --                     │
│   21    25    --    --    --                     │
│                                                 │
│   ┌─ CURRENT: SET 3 ────────────────────┐       │
│   │                                     │       │
│   │   HOME  [ 14 ]     [ 11 ]  AWAY    │       │
│   │         [  +  ]     [  +  ]         │       │
│   │              [ UNDO ]               │       │
│   │                                     │       │
│   └─────────────────────────────────────┘       │
│                                                 │
│   Timeouts: ●● (2 left)    Sets: 1 - 1         │
└─────────────────────────────────────────────────┘
```

Design details for the sticky header:
- Team names in bold brand font (Tele-Grotesk or Bebas Neue — whatever `theme/fonts.ts` specifies for display)
- Set scores in a horizontal row, completed sets show final scores, future sets show "--"
- Current set score should be LARGE (48-56pt font) and centered
- Score increment buttons: large circles (64px) with "+" inside, teal for home, coral/red for away
- Undo button: smaller, centered below the score buttons, subtle styling
- Auto-advance logic: when a team reaches 25 (or 15 for set 5) with 2+ point lead, prompt "End Set?" confirmation
- Timeout tracker: filled/unfilled dots (max 2 per set)

**SCROLLABLE BODY (below sticky header):**

**Section A: Active Lineup — Tier 1 card**
- Show current 6 on-court players in a volleyball rotation layout
- Prefer a simplified 2-row layout over the full court SVG for this context:
  ```
  Front:  [OH]  [MB]  [S/OPP]
  Back:   [LIB] [MB]  [OH]
  ```
- Each position shows: jersey #, first name, position abbreviation
- Each player has a "SUB" button → opens bottom sheet with bench players
- Sub animations: brief highlight/swap animation
- If the lineup builder has a saved lineup for this event, pre-load it

**Section B: Quick Stats — Tier 2 flat content**
- Horizontal scrollable row of stat category buttons: Kill | Error | Ace | Block | Dig | Assist
- Tapping a stat → opens a quick player picker (modal or bottom sheet) showing the roster
- Tap player → stat incremented, toast confirmation, auto-dismiss
- Below the buttons: compact running stat totals for current set (flat row, no cards)
- Design: think of it like a cash register — fast, repetitive, no friction

**Section C: Set Controls — Tier 1 card**
- "Call Timeout" button (decrements available timeouts)
- "End Set" button → confirmation → records set score → advances
- "End Match" button → confirmation → navigates to GameCompletionWizard or game-results

**Section D: Quick Notes — Tier 2 flat**
- Simple text input, saves per set
- Flat, no card wrapper — just an input field with a label
- Coach types quick observations courtside

**Section E: Closing — Tier 3 ambient**
- NOT a mascot here (too serious a context)
- Instead: a small "Game started at [time] · [duration] elapsed" timestamp

### Navigation wiring
- Replace `Alert.alert("Coming Soon")` in `components/coach-scroll/GamePlanCard.tsx` (the "START GAME DAY MODE" button) with `router.push('/game-day-command?eventId=${eventId}')` 
- Register `app/game-day-command.tsx` as a stack screen in the root layout
- Set `options={{ headerShown: false, tabBarStyle: { display: 'none' } }}` to go fully immersive

### Data
- Use whatever scoring tables the web uses (found in your reference/ search above)
- If the web stores set scores in `game_sets` or similar, use that same table
- Stats should use the same `game_stats` or `player_game_stats` table the web uses
- Lineup data comes from the lineup builder's saved lineup for this event
- If no existing tables found, store temporarily in component state during match, commit to database on "End Match"

```bash
git add . && git commit -m "feat: Game Day Command Center — immersive coaching cockpit with live scoring, lineup, quick stats" && git push
```

---

## FEATURE 2: CHALLENGE SYSTEM

**Priority:** MEDIUM | **Roles:** Coach (create), Player (participate), Parent (view)  
**Routes:** `app/challenges.tsx` (list), CreateChallengeModal (modal)

### What to read first
```bash
# Web reference
grep -r "challenge\|Challenge" reference/ --include="*.jsx" --include="*.tsx" -l
# Read all files found

# Mobile reference — existing challenge components
cat components/CreateChallengeModal.tsx
cat components/ChallengeCard.tsx
cat components/ChallengeDetailModal.tsx
cat lib/challenge-service.ts
cat lib/engagement-types.ts

# Check if tables exist
cat SCHEMA_REFERENCE.csv | grep -i challenge
```

If the web already has challenge tables, use those exact tables. If challenge components exist in the mobile codebase, build on them — don't rebuild from scratch.

### Database
Only create tables if they don't already exist in the schema or reference code. If you need to create them:

```sql
CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  season_id UUID REFERENCES seasons(id),
  team_id UUID REFERENCES teams(id),
  created_by UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  target_type TEXT NOT NULL DEFAULT 'count',
  target_value INTEGER NOT NULL,
  target_stat TEXT,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  xp_reward INTEGER DEFAULT 50,
  badge_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  is_team_wide BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id),
  current_progress INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  opted_in_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, player_id)
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- Add appropriate RLS policies matching your existing pattern
```

### Screen design: Challenge List (`app/challenges.tsx`)

This is a scrollable stack screen. Different views per role.

**Header area:**
- Screen title: "Challenges"
- Filter pills: Active | Completed | Expired (using `PillTabs` component)
- For coaches: FAB "Create Challenge" button (bottom right)

**Challenge cards — Tier 1 treatment for active challenges:**
Each active challenge is a card:

```
┌──────────────────────────────────────────┐
│  🏐  100 Serves Challenge          +50XP│
│                                          │
│  Hit 100 serves before March 15th        │
│                                          │
│  ████████████░░░░░  72/100               │
│                                          │
│  ⏰ 12 days left         👥 8 players    │
│  [Join Challenge]  or  [View Progress]   │
└──────────────────────────────────────────┘
```

- Progress bar: teal fill on neutral background
- Deadline countdown text
- Participant count
- Action button changes based on whether the player has joined
- Card uses brand rounded corners, shadows, padding from design tokens
- Tapping the card body opens `ChallengeDetailModal`

**Completed/expired challenges — Tier 2 flat rows:**
- Compact rows, no card treatment
- Show title, completion date, result (completed ✓ / failed ✗ / expired)
- Dimmed styling

**Empty state — Tier 3 mascot:**
- Lynx cub mascot with encouraging message
- Coach: "Create your first challenge to motivate your players!"
- Player: "No challenges yet — your coach will post some soon!"

### Create Challenge Modal
Use `CreateChallengeModal.tsx` if it exists and has the right structure. If it needs rebuilding:

- Bottom sheet modal (not full screen)
- Fields: Title, Description, Category picker (Attendance/Stats/Effort/Custom), Target type (Count/Streak), Target value, End date, XP reward
- If stats-based: stat picker (kills, aces, digs, etc.)
- "Create" button at bottom
- Match the modal styling from other modals in the app (check `GiveShoutoutModal.tsx` for patterns)

### Wire into home scrolls
- **Coach:** Replace "Create a Challenge" stub in `coach-scroll/QuickActions.tsx` → navigate to challenges screen or open create modal
- **Player:** Replace `player-scroll/ActiveChallengeCard.tsx` (currently always null) → query the player's most active challenge, show a compact progress card. Tap → challenges screen. If no challenges, show mascot with "No challenges yet" (Tier 3)

```bash
git add . && git commit -m "feat: Challenge system — list screen, create modal, progress tracking, home scroll wiring" && git push
```

---

## FEATURE 3: PLAYER EVALUATIONS (MOBILE FORM)

**Priority:** MEDIUM | **Roles:** Coach  
**Route:** `app/player-evaluation.tsx`

### What to read first
```bash
# Web reference — this is critical, the web has the full eval form
grep -r "evaluation\|Evaluation\|skill_rating\|player_eval\|radar\|spider" reference/ --include="*.jsx" --include="*.tsx" -l
# Read ALL files found — understand the exact skills, scale, and data model

# Check schema
cat SCHEMA_REFERENCE.csv | grep -i eval
```

The web has a 9-skill evaluation with a spider/radar chart. Read the web code to get the EXACT skill names and rating scale. Use the same table and column names.

### Database
Only create if not found in schema or web reference:

```sql
CREATE TABLE IF NOT EXISTS player_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES profiles(id),
  evaluator_id UUID REFERENCES profiles(id),
  team_id UUID REFERENCES teams(id),
  season_id UUID REFERENCES seasons(id),
  -- Use the EXACT skill names from the web version
  serving INTEGER CHECK (serving BETWEEN 1 AND 10),
  passing INTEGER CHECK (passing BETWEEN 1 AND 10),
  setting INTEGER CHECK (setting BETWEEN 1 AND 10),
  hitting INTEGER CHECK (hitting BETWEEN 1 AND 10),
  blocking INTEGER CHECK (blocking BETWEEN 1 AND 10),
  digging INTEGER CHECK (digging BETWEEN 1 AND 10),
  defense INTEGER CHECK (defense BETWEEN 1 AND 10),
  court_awareness INTEGER CHECK (court_awareness BETWEEN 1 AND 10),
  communication INTEGER CHECK (communication BETWEEN 1 AND 10),
  overall_notes TEXT,
  skill_notes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add RLS policies matching your existing pattern
```

### Screen design: Card-per-skill swipe flow

This screen is optimized for courtside use. One skill at a time, large targets, minimal reading.

**Screen type:** Full-screen stack route with horizontal page navigation (like onboarding screens).

**Top bar — persistent across all steps:**
- Back button (with "Save Draft?" confirmation if partially completed)
- Player name + photo (small, in the header)
- Progress indicator: "3 of 9" with a thin progress bar spanning the width
- This is a Tier 2 element — informational, not visually heavy

**Each skill page — Tier 1 card treatment:**

```
┌──────────────────────────────────────────┐
│                                          │
│              SERVING                     │
│                                          │
│    How would you rate this skill?        │
│                                          │
│    ①  ②  ③  ④  ⑤  ⑥  ⑦  ⑧  ⑨  ⑩     │
│         (large tappable circles)         │
│                                          │
│    Previous: 6/10   ▲ Change: +1         │
│                                          │
│    Notes: [________________________]     │
│                                          │
│    [← Previous]            [Next →]      │
│                                          │
└──────────────────────────────────────────┘
```

Design details:
- Skill name in large display font (brand display font, bold, uppercase)
- Rating circles: 48-56px each, arranged in a row. Unselected = outlined. Selected = filled with teal. Numbers 1-4 get a warm/coral tint, 5-6 neutral, 7-10 teal gradient (visual indicator of quality)
- Previous rating shown if one exists, with delta arrow (▲ improvement, ▼ decline)
- Optional notes text input per skill — flat, not prominent
- Swipe left/right OR use Previous/Next buttons to navigate between skills
- Smooth horizontal page transition (use PagerView or FlatList with pagingEnabled)

**Player selection step (Step 0, if not pre-selected):**
- Team selector (if multi-team coach)
- Player list with search — use existing `PlayerCard` component in compact mode
- Tap player → begins evaluation flow

**Summary step (final page after all 9 skills):**
- Grid showing all 9 skills with selected ratings
- Overall notes text area
- "Submit Evaluation" button — Tier 1 CTA button (full width, teal, bold)
- On submit: save to database, show success toast with mascot celebration, navigate back

### Entry points
- From coach roster → tap player → "Evaluate" button
- From `coach-scroll/ActionItems.tsx` eval hints → tap → pre-selects player
- Accessible from GestureDrawer under coach tools

```bash
git add . && git commit -m "feat: Player evaluation — courtside skill rating with swipe cards, 9-skill form" && git push
```

---

## FEATURE 4: ADMIN SEASON SETUP WIZARD

**Priority:** MEDIUM | **Roles:** Admin  
**Route:** `app/season-setup-wizard.tsx`

### What to read first
```bash
# Web reference — how does the web create seasons?
grep -r "season.*create\|create.*season\|SeasonModal\|season.*setup\|SetupWizard" reference/ --include="*.jsx" --include="*.tsx" -l
# Read all files found

# Mobile reference
cat app/season-settings.tsx
```

### Screen design: Step-by-step wizard

**Screen type:** Full-screen stack route with step navigation.

**Progress bar — persistent top element (Tier 2):**
- 5 numbered dots connected by a line
- Current step filled, completed steps checkmarked, future steps outlined
- Step labels below dots: Basics → Teams → Registration → Schedule → Review

**Each step renders as a single scrollable page.** Transition between steps with a horizontal slide animation.

**Step 1: Season Basics — mostly Tier 2 flat form fields**
- Season name text input
- Sport selector (pre-filled from org, editable)
- Start date / End date (date pickers)
- Status toggle: Draft / Active
- Clean form layout — labels above inputs, generous spacing
- No card wrappers on form fields — flat, clean, iOS Settings-style

**Step 2: Teams — Tier 1 cards for team selection**
- List of existing teams as selectable cards (checkbox + team name + age group)
- Each team card: compact, shows team name, player count, coach name
- "Create New Team" button at the bottom → inline expansion (team name input + age group + level)
- Selected teams get a teal checkmark and subtle highlight

**Step 3: Registration — Tier 2 flat form**
- Registration open/close dates
- Fee amount
- Online registration toggle
- Require waivers toggle
- Note: "Advanced form builder available on web" text (don't try to build the full form builder)

**Step 4: Schedule Template — Tier 1 interactive**
- Day-of-week selector: 7 pill buttons (M T W T F S S), multi-select
- Selected days get teal fill
- Default practice time picker
- Default location text input
- Preview text: "This will create weekly practices on Tue & Thu at 6:00 PM"

**Step 5: Review & Launch — mixed tiers**
- Summary card (Tier 1): season name, dates, team count, schedule pattern
- All the selections displayed in a clean review layout
- Two buttons at bottom:
  - "Save as Draft" — secondary/outline button
  - "Activate Season" — primary teal button, full width
- On activate: success animation (use `LevelUpCelebrationModal` pattern or a simple confetti burst), then navigate back to admin home

**Mascot moment (Tier 3):** On the Review step, the Lynx cub appears with "Looking good! Ready to kick off [Season Name]?"

### Navigation wiring
- Replace "Start Setup" stub on `AdminHomeScroll.tsx`
- Replace "Coming Soon" alert for season setup wherever it appears
- Wire from `coach-scroll/SeasonSetupCard.tsx` "Continue Setup" if applicable

```bash
git add . && git commit -m "feat: Admin season setup wizard — 5-step guided season creation with review" && git push
```

---

## FEATURE 5: BULK EVENT CREATION

**Priority:** MEDIUM | **Roles:** Admin, Coach  
**Route:** `app/bulk-event-create.tsx`

### What to read first
```bash
# Web reference — how does the web do bulk/recurring event creation?
grep -r "bulk\|recurring\|Recurring\|BulkCreate\|repeat.*event" reference/ --include="*.jsx" --include="*.tsx" -l
# Read all files found

# Mobile reference — how are single events created?
grep -r "createEvent\|create_event\|insertEvent\|schedule_events" app/ components/ --include="*.tsx" -l
```

Use the same event creation pattern (table, fields, validation) as existing single-event creation, just in a batch.

### Screen design: 4-step creation flow

**Screen type:** Full-screen stack route with step navigation (same progress pattern as Season Setup Wizard for consistency).

**Step 1: Event Type & Team — Tier 1 interactive**
- Event type: large selectable cards (not a dropdown)
  - Practice (green accent), Game (red accent), Tournament (orange accent), Other (gray)
  - Each card: icon + label, tap to select, selected gets teal border + checkmark
- Team selector below: pill buttons or selectable list
- For admin: multi-team selection possible

**Step 2: Recurrence Pattern — Tier 1 interactive**
- Day-of-week pills: M T W T F S S (same pattern as Season Setup Step 4)
- Time picker: start time + duration (or start + end)
- Date range: "From [date] to [date]" with two date pickers
- Live preview text: "This will create 24 Tuesday & Thursday practices"
- The preview count updates as they change selections

**Step 3: Location — Tier 2 flat form**
- Location text input
- If venues exist in the database, show a dropdown/picker
- "Apply to all events" is the default

**Step 4: Preview & Confirm — mixed tiers**

This is the most important step. The user needs to see exactly what they're about to create.

- Scrollable list of every event that will be created (Tier 2 flat rows)
- Each row: date (bold), day of week, time, team, type, location
- Swipe-to-delete on individual rows (for holidays, conflicts, etc.)
- Running count at top: "Creating 22 events" (updates as rows are removed)
- "Create All" button at bottom — Tier 1 CTA (full width, teal)
- On success: celebration toast, navigate to schedule or home

**Empty state:** If no events would be created (bad date range, no days selected), show mascot with "Adjust your settings to generate events"

### Navigation wiring
- Replace "Create Event" stub in `admin-scroll/UpcomingEvents.tsx`
- Wire from `admin-scroll/QuickActionsGrid.tsx` if one of the 6 actions is event creation
- Accessible from schedule screens for coaches

```bash
git add . && git commit -m "feat: Bulk event creation — recurring practice/game batch creator with preview" && git push
```

---

## BONUS QUICK FIXES

After all 5 features are done, knock these out:

### Fix 1: DayStripCalendar taps
`components/parent-scroll/DayStripCalendar.tsx` — Days have `TouchableOpacity` but no `onPress`. Tapping a day should navigate to `/(tabs)/parent-schedule` with that date pre-selected, or scroll the schedule to that day's events.

### Fix 2: PhotoStrip taps
`components/player-scroll/PhotoStrip.tsx` — Photos have `TouchableOpacity` but no `onPress`. Tap → open `ImagePreviewModal` with that photo, or navigate to `team-gallery`.

### Fix 3: Player Chat wiring
`components/player-scroll/ChatPeek.tsx` — Replace "Chat coming soon" stub with a real preview of the player's most recent team chat message. Tap → `/(tabs)/chats` or directly to the team chat thread. Use the same pattern as `parent-scroll/FlatChatPreview.tsx`.

### Fix 4: Admin queue "View more"
`AdminHomeScroll.tsx` — "View more" for smart queue has no `onPress`. Wire to the relevant management screen based on queue type (registrations, payments, or waivers).

### Fix 5: TeamHealthTiles taps
`admin-scroll/TeamHealthTiles.tsx` — Tiles have no `onPress`. Tap a team tile → navigate to that team's roster or team detail screen.

```bash
git add . && git commit -m "fix: Quick fixes — DayStrip, PhotoStrip, ChatPeek, admin queue, team tile navigation" && git push
```

---

## FINAL CHECKLIST

- [ ] `npx tsc --noEmit` — zero errors
- [ ] All new routes registered in root `_layout.tsx`
- [ ] All new screens use `Animated.ScrollView` (not plain ScrollView) where scrollable
- [ ] All new screens follow the three-tier visual system
- [ ] No hardcoded colors — everything from theme tokens
- [ ] Web reference folder was consulted for each feature's data model
- [ ] Database tables match the web version (same names, same columns)
- [ ] All replaced "Coming Soon" stubs are fully functional
- [ ] Mascot appears in empty states and closing sections where appropriate
- [ ] Cards have proper rounded corners, shadows, and spacing from design tokens
- [ ] Flat content sections are NOT wrapped in unnecessary card containers
- [ ] SQL migration blocks are clearly documented (don't auto-run)
- [ ] All commits are clean and descriptive

```bash
git log --oneline -10
```
