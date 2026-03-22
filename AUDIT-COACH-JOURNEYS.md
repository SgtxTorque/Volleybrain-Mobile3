# LYNX MOBILE — COACH JOURNEY & TASK-PATH AUDIT
## Audit Date: 2026-03-12
## Role: Coach

---

## How To Read This Document

Each task below shows every way a Coach user can reach a destination or complete an action. Paths are listed from most natural/common to most obscure. Each step shows the screen, the action, the code file and line number, and the destination. Flags indicate friction, dead ends, wrong destinations, and missing paths.

Cross-reference screen names with AUDIT-GLOSSARY.md for detailed information about each screen.

---

## Navigation Entry Points Available to Coach

### Tab Bar

| Tab | Visible? | Route | Screen File | Notes |
|-----|----------|-------|-------------|-------|
| 1 — Home | Yes | `/(tabs)` | `index.tsx` → `DashboardRouter.tsx` → `CoachHomeScroll` | Role resolved at `DashboardRouter.tsx:140-141` (coach) or `:138-139` (coach_parent) — both render `CoachHomeScroll` |
| 2b — Game Day | Yes (coach/player, not admin, not parent-only) | `/(tabs)/gameday` | `gameday.tsx` | Visible when `!showManageTab && !isParentOnly` (`_layout.tsx:244`). Coach-parents also see this (they are NOT parent-only). |
| 3 — Chat | Yes | `/(tabs)/chats` | `chats.tsx` | Generic chat list for all roles. Coach-specific `coach-chat.tsx` is a hidden tab reachable from coach-scroll QuickActions. |
| 4 — More | Yes | — | `menu-placeholder.tsx` | Opens GestureDrawer (`_layout.tsx:324-326`). Not a real screen. |

**Note on Tab 2b:** Coaches always see the Game Day tab. If a user is an admin AND a coach, they see Tab 2a (Manage) instead — the admin role takes priority (`showManageTab` is true). Pure coaches and coach-parents always see Game Day.

### Drawer Sections Visible to Coach

A coach user sees these sections when opening the GestureDrawer (`components/GestureDrawer.tsx`):

| Section | Role Gate | Items → Routes |
|---------|-----------|----------------|
| **Quick Access** | All roles | Home → `/(tabs)`, Schedule → `/(tabs)/schedule`, Chats → `/(tabs)/chats`, Announcements → `/(tabs)/messages`, Team Wall → `/(tabs)/connect` |
| **Game Day** | `admin_coach` | Game Day Command → `/game-day-command`, Game Prep → `/game-prep`, Lineup Builder → `/lineup-builder`, Attendance → `/attendance`, Game Results → `/game-results`, Game Recap → `/game-recap` |
| **Coaching Tools** | `admin_coach` | Player Evaluations → `/evaluation-session`, Challenges → `/coach-challenge-dashboard`, Challenge Library → `/challenge-library`, Player Goals → `/player-goals`, Blast Composer → `/blast-composer`, Blast History → `/blast-history`, Coach Availability → `/coach-availability`, Coach Profile → `/coach-profile`, My Teams → `/(tabs)/my-teams`, Roster → `/(tabs)/players` |
| **My Family** | `parent` only | My Children → `/my-kids`, Registration → `/parent-registration-hub`, Payments → `/family-payments`, Waivers → `/my-waivers`, Evaluations → `/my-stats`, Standings → `/standings`, Achievements → `/achievements`, Invite Friends → `/invite-friends` |
| **League & Community** | All roles | Team Wall → `/(tabs)/connect`, Standings → `/standings`, Achievements → `/achievements`, Coach Directory → `/coach-directory`, Find Organizations → `/org-directory` |
| **Settings & Privacy** | All roles | My Profile → `/profile`, Settings → `/(tabs)/settings`, Notifications → `/notification-preferences`, Season History → `/season-archives`, Privacy Policy → `/privacy-policy`, Terms of Service → `/terms-of-service` |
| **Help & Support** | All roles | Help Center → `/help`, Web Features → `/web-features`, Data Rights → `/data-rights` |

**Key issues with drawer for coaches:**
1. **Quick Access → Schedule** routes to `/(tabs)/schedule` (line 81), which is a hidden tab. This is a DIFFERENT screen from `coach-schedule.tsx`. The `schedule.tsx` screen is yet another schedule variant. Coaches landing here get a different schedule UI than `coach-schedule.tsx` which is the intended coach schedule (with event creation, team filtering, week/month views).
2. **Quick Access → Announcements** routes to `/(tabs)/messages` (line 83). This is a valid destination for coaches — it's the broadcast/blast tool. However, the screen title may not match the drawer label "Announcements."
3. **My Family section** only appears if the user also has the `parent` role. Coach-parent users see both Game Day, Coaching Tools, AND My Family sections. Pure coaches do not see My Family.

### Home Dashboard Cards/Actions (CoachHomeScroll)

The coach home dashboard is built from multiple sub-components, each producing navigation actions:

| Card/Widget | Component | Action | Destination | Code Reference |
|-------------|-----------|--------|-------------|----------------|
| Notification bell (compact header) | `CoachHomeScroll` | Tap bell icon | `/notification` | `CoachHomeScroll.tsx:343` |
| Notification bell (welcome section) | `CoachHomeScroll` | Tap bell icon | `/notification` | `CoachHomeScroll.tsx:435` |
| Prep checklist (incomplete) | `PrepChecklist` | Tap checklist | `/(tabs)/coach-schedule` | `PrepChecklist.tsx:65` |
| Game plan card — Roster pill | `GamePlanCard` | Tap "Roster" | `/(tabs)/coach-roster` | `GamePlanCard.tsx:47,53` |
| Game plan card — Lineup pill | `GamePlanCard` | Tap "Lineup" | `/lineup-builder?eventId={id}` | `GamePlanCard.tsx:48` |
| Game plan card — Stats pill | `GamePlanCard` | Tap "Stats" | `/game-results?eventId={id}` | `GamePlanCard.tsx:49` |
| Game plan card — Attend. pill | `GamePlanCard` | Tap "Attend." | `/attendance?eventId={id}` | `GamePlanCard.tsx:50,54` |
| Game plan card — RSVP missing | `GamePlanCard` | Tap missing names | `/(tabs)/coach-chat` | `GamePlanCard.tsx:119` |
| Game plan card — START GAME DAY MODE | `GamePlanCard` | Tap button | `/game-day-command?eventId={id}&teamId={id}&opponent={name}` | `GamePlanCard.tsx:134` |
| Scouting context | `ScoutingContext` | Tap matchup line | `/(tabs)/coach-schedule` | `ScoutingContext.tsx:24` |
| Quick action — Send a Blast | `QuickActions` | Tap row | `/(tabs)/coach-chat` | `QuickActions.tsx:21` |
| Quick action — Build a Lineup | `QuickActions` | Tap row (off-day) | `/lineup-builder` | `QuickActions.tsx:22` |
| Quick action — Give a Shoutout | `QuickActions` | Tap row | (opens ShoutoutModal) | `QuickActions.tsx:65` |
| Quick action — Review Stats | `QuickActions` | Tap row | `/game-results` | `QuickActions.tsx:24` |
| Quick action — Manage Roster | `QuickActions` | Tap row (off-day) | `/(tabs)/coach-roster` | `QuickActions.tsx:25` |
| Quick action — Create a Challenge | `QuickActions` | Tap row | `/create-challenge` | `QuickActions.tsx:26` |
| Engagement nudge | `EngagementSection` | Tap nudge text | (opens ShoutoutModal) | `EngagementSection.tsx:34` |
| Challenge quick card — View Dashboard | `ChallengeQuickCard` | Tap CTA | `/coach-challenge-dashboard` | `ChallengeQuickCard.tsx:145` |
| Challenge quick card — Issue a Challenge (empty state) | `ChallengeQuickCard` | Tap CTA | `/challenge-library` | `ChallengeQuickCard.tsx:160` |
| Roster card | `CoachHomeScroll` | Tap card | `/roster?teamId={id}` | `CoachHomeScroll.tsx:538` |
| Season leaderboard — View Leaderboard | `SeasonLeaderboardCard` | Tap link | `/standings` | `SeasonLeaderboardCard.tsx:246` |
| Action items — evaluation | `ActionItems` | Tap row | `/evaluation-session?teamId={id}` | `ActionItems.tsx:81` |
| Action items — pending stats | `ActionItems` | Tap row | `/game-results?eventId={id}` or `/game-results` | `ActionItems.tsx:95` |
| Team hub preview — View All | `TeamHubPreviewCard` | Tap header / posts | `/(tabs)/connect` | `TeamHubPreviewCard.tsx:126` |
| Activity feed — items / "View all" | `ActivityFeed` | Tap items | `/(tabs)/coach-roster` | `ActivityFeed.tsx:126,137` |
| Activity feed — empty "Quiet week" | `ActivityFeed` | Tap text | `/(tabs)/coach-schedule` | `ActivityFeed.tsx:113` |
| Trophy case — "See All" | `TrophyCaseWidget` | Tap link | `/achievements` | `TrophyCaseWidget.tsx:76,91,103` |
| Achievement celebration — View All | `AchievementCelebrationModal` | Tap button | `/achievements` | `CoachHomeScroll.tsx:646` |
| Season setup — Continue Setup | `SeasonSetupCard` | Tap CTA | `/(tabs)/coach-schedule` | `SeasonSetupCard.tsx:268` |

### Notification Deep Links (from `app/_layout.tsx`, lines 89-125)

| Notification Type | Destination | Params Passed | Code Reference |
|-------------------|-------------|---------------|----------------|
| `chat` | `/chat/{channelId}` or `/(tabs)/chats` | channelId (if present) | `_layout.tsx:90-91` |
| `schedule` | `/(tabs)/schedule` | — | `_layout.tsx:93-94` |
| `payment` | `/(tabs)/payments` | — | `_layout.tsx:96-97` |
| `blast` | `/(tabs)/messages` | — | `_layout.tsx:99-100` |
| `registration` | `/registration-hub` | — | `_layout.tsx:102-103` |
| `game` / `game_reminder` | `/game-prep?eventId={eid}` or `/game-prep` | eventId (if present) | `_layout.tsx:106-109` |
| `challenge_*` | `/challenge-cta?challengeId={id}` or `/challenges` | challengeId (if present) | `_layout.tsx:114-121` |
| Default | `/(tabs)` | — | `_layout.tsx:123-124` |

**Issues with notification deep links for coaches:**
1. **`schedule` notification** → `/(tabs)/schedule` — routes to the generic schedule tab, not `coach-schedule`. Different features and UI.
2. **`payment` notification** → `/(tabs)/payments` — routes to admin payment management. Coaches don't manage payments; this is an admin screen. No guard prevents coach from landing here.
3. **`game` / `game_reminder`** → `/game-prep` — this is a valid coach destination, but routes to `game-prep.tsx` (the legacy game prep screen) rather than the newer `game-prep-wizard.tsx`. The newer wizard is what `coach-schedule.tsx` and `gameday.tsx` link to.
4. **`challenge_*`** → `/challenge-cta` or `/challenges` — valid for coaches who manage challenges. However, the coach-specific dashboard is at `/coach-challenge-dashboard`, not `/challenges` (which is the player-facing challenges screen).

---

## Tasks

### TASK 1: View Home Dashboard
**What the user is trying to do:** See a coaching overview — upcoming events, team health, roster status, preparation checklist, and season record.
**Expected destination:** `CoachHomeScroll` component (rendered inside `app/(tabs)/index.tsx`)

#### Path A: App launch → Home — 0 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | App opens | Root layout | `app/_layout.tsx` | 71 | Auth check → `/(tabs)` redirect |
| 2 | Lands on Home tab | `DashboardRouter` | `components/DashboardRouter.tsx` | 140-141 | Coach with teams → `'coach'` type |
| 3 | Sees dashboard | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | Full coach home with hero event, prep checklist, quick actions, etc. |

**Status:** ✅ Correct
**Notes:** `DashboardRouter.tsx:138-139` — if coach also has kids, type is `coach_parent` but BOTH coach and coach_parent render `CoachHomeScroll` (lines 189-194). Coach-parent users never see `ParentHomeScroll` from the home tab — they must use RoleSelector to switch views.

#### Path B: Tab bar → Home tab — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Any screen | Any | — | — | User is anywhere in the app |
| 2 | Tap "Home" tab | Tab bar | `app/(tabs)/_layout.tsx` | 209-222 | Tab 1 always visible |
| 3 | Lands on home | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |

**Status:** ✅ Correct

#### Path C: Drawer → Home — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | Opens GestureDrawer |
| 2 | Tap "Home" | Quick Access section | `components/GestureDrawer.tsx` | 80 | Route: `/(tabs)` |
| 3 | Lands on home | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |

**Status:** ✅ Correct

---

### TASK 2: Create a Practice Event
**What the user is trying to do:** Add a new practice to the team schedule.
**Expected destination:** `app/(tabs)/coach-schedule.tsx` (event creation form within schedule)

#### Path A: Drawer → Game Day → (no direct "Create Event") — 2+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 2 | Open "Game Day" section | GestureDrawer | `components/GestureDrawer.tsx` | 122-134 | Section collapsed by default (`defaultOpen: false`) |
| 3 | No "Create Event" item | — | — | — | Game Day section has Game Day Command, Game Prep, Lineup Builder, Attendance, Game Results, Game Recap — NO "Create Event" or "Add Practice" |

**Status:** 🔇 Missing path — The Game Day drawer section has no item for creating events.

#### Path B: Tab bar → Game Day → Coach Tools → Add Event — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Game Day" tab | Tab bar | `app/(tabs)/_layout.tsx` | 241-254 | Tab 2b |
| 2 | Scroll to "Coach Tools" section | `gameday.tsx` | `app/(tabs)/gameday.tsx` | 780-808 | Horizontal scroll of tool cards |
| 3 | Tap "Add Event" | Coach tool card | `app/(tabs)/gameday.tsx` | 789 | Route: `/(tabs)/schedule` |
| 4 | Lands on | `schedule.tsx` | `app/(tabs)/schedule.tsx` | — | Generic schedule screen — NOT `coach-schedule.tsx` |

**Status:** ⚠️ Friction — Routes to `/(tabs)/schedule` (generic hidden tab) instead of `/(tabs)/coach-schedule` (coach-specific schedule with event creation form). Both screens can create events, but the coach-schedule has better team filtering and UX.

#### Path C: Home → Season Setup card → coach-schedule — 2 taps (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | Season Setup card only visible during first 30 days of season |
| 2 | Tap "Continue Setup" | `SeasonSetupCard` | `components/coach-scroll/SeasonSetupCard.tsx` | 268 | Route: `/(tabs)/coach-schedule` |
| 3 | Lands on coach schedule | Coach schedule | `app/(tabs)/coach-schedule.tsx` | — | Correct destination with event creation |

**Status:** ⚠️ Friction — Conditional. Only visible during early season setup. Not a reliable path.

#### Path D: Drawer → Quick Access → Schedule — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 2 | Tap "Schedule" (Quick Access) | GestureDrawer | `components/GestureDrawer.tsx` | 81 | Route: `/(tabs)/schedule` |
| 3 | Lands on | `schedule.tsx` | `app/(tabs)/schedule.tsx` | — | Generic schedule, NOT coach-schedule |

**Status:** ⚠️ Friction — Same issue as Path B. Lands on generic schedule instead of coach-specific schedule.

#### Missing Paths:
- No drawer item routes directly to `coach-schedule.tsx`. The coach-specific schedule is only reachable via home dashboard cards (PrepChecklist, ScoutingContext, ActivityFeed empty state, SeasonSetupCard) — none of which are persistent/reliable.
- The drawer "Schedule" item (Quick Access) goes to the wrong schedule screen for coaches.

---

### TASK 3: Create a Game Event
**What the user is trying to do:** Schedule a new game with an opponent.
**Expected destination:** `app/(tabs)/coach-schedule.tsx` (event creation form)

All paths are identical to TASK 2 (Create a Practice Event) — the same schedule screen handles both event types. The same friction issues apply: no direct path from drawer to coach-schedule, and the drawer/gameday "Add Event" routes land on the wrong schedule variant.

**Status:** ⚠️ Same friction as TASK 2

---

### TASK 4: Run Live Game (Game Day Command Center)
**What the user is trying to do:** Start a live scoring session during a game — track points, sets, substitutions.
**Expected destination:** `app/game-day-command.tsx`

#### Path A: Home → Game Plan Card → START GAME DAY MODE — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (game within 48hrs) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | GamePlanCard renders only when hero event is within 48 hours |
| 2 | Tap "START GAME DAY MODE" | `GamePlanCard` | `components/coach-scroll/GamePlanCard.tsx` | 134 | Route: `/game-day-command?eventId={id}&teamId={id}&opponent={name}` |
| 3 | Lands on command center | Game Day Command | `app/game-day-command.tsx` | — | Full params passed: eventId, teamId, opponent |

**Status:** ✅ Correct — but conditional. Only appears when a game event is within 48 hours.

#### Path B: Tab bar → Game Day → Hero card → Start Game — 2 taps (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Game Day" tab | Tab bar | `app/(tabs)/_layout.tsx` | 241-254 | |
| 2 | Tap "Start Game" on hero card | `gameday.tsx` | `app/(tabs)/gameday.tsx` | 477 | Route: `/game-day-command?eventId={id}&teamId={id}&opponent={name}` |
| 3 | Lands on command center | | `app/game-day-command.tsx` | — | |

**Status:** ✅ Correct — but conditional on having a next game event.

#### Path C: Tab bar → Game Day → Resume in-progress match — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Game Day" tab | Tab bar | `app/(tabs)/_layout.tsx` | 241-254 | |
| 2 | Tap in-progress banner | `gameday.tsx` | `app/(tabs)/gameday.tsx` | 387 | Route: `/game-day-command?matchId={id}` — note: uses `matchId` not `eventId` |
| 3 | Lands on command center | | `app/game-day-command.tsx` | — | Resumes existing match |

**Status:** ✅ Correct — conditional on having an in-progress match.

#### Path D: Drawer → Game Day → Game Day Command — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → open Game Day section | GestureDrawer | `components/GestureDrawer.tsx` | 128 | Route: `/game-day-command` |
| 2 | Lands on command center | | `app/game-day-command.tsx` | — | **NO PARAMS** — eventId, teamId, opponent all missing |

**Status:** ⚠️ Friction — Drawer route passes NO params. The screen expects `eventId`, `teamId`, and `opponent` via `useLocalSearchParams`. Without these, the command center must auto-resolve the game context or show a team/event picker. Behavior depends on the screen's fallback logic.

---

### TASK 5: Enter / Review Post-Game Stats
**What the user is trying to do:** Enter player stats after a completed game, or review stats from a past game.
**Expected destination:** `app/game-results.tsx`

#### Path A: Home → Quick Actions → Review Stats — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap "Review Stats" in Quick Actions | `QuickActions` | `components/coach-scroll/QuickActions.tsx` | 24 | Route: `/game-results` — NO eventId |

**Status:** ⚠️ Friction — No `eventId` passed. `game-results.tsx` uses `useLocalSearchParams<{ eventId?: string }>()` — without an eventId, the screen must show a game picker or empty state.

#### Path B: Home → Action Items → "X games need stats entered" — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (scroll to Action Items) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | Only renders if pendingStatsCount > 0 |
| 2 | Tap pending stats row | `ActionItems` | `components/coach-scroll/ActionItems.tsx` | 95 | Route: `/game-results?eventId={firstPendingEventId}` or `/game-results` if no pending event found |

**Status:** ✅ Correct when eventId resolved — conditional visibility. ActionItems fetches the first pending-stats event (lines 53-63) and passes its ID. Falls back to no-param route if query fails.

#### Path C: Home → Game Plan Card → Stats pill — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (game within 48hrs) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap "Stats" pill on hero card | `GamePlanCard` | `components/coach-scroll/GamePlanCard.tsx` | 49 | Route: `/game-results?eventId={event.id}` |

**Status:** ✅ Correct — eventId passed. Only visible when game event is within 48 hours.

#### Path D: Tab bar → Game Day → Recent result → Game results — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Game Day" tab | Tab bar | `app/(tabs)/_layout.tsx` | 241-254 | |
| 2 | Scroll to recent results, tap game | `gameday.tsx` | `app/(tabs)/gameday.tsx` | 741 | Route: `/game-results?eventId={game.id}` |

**Status:** ✅ Correct — eventId passed.

#### Path E: Drawer → Game Day → Game Results — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → open Game Day section | GestureDrawer | `components/GestureDrawer.tsx` | 132 | Route: `/game-results` |
| 2 | Lands on game results | | `app/game-results.tsx` | — | **NO eventId** — must auto-resolve |

**Status:** ⚠️ Friction — Same no-param issue as Path A. Drawer doesn't pass eventId.

---

### TASK 6: View Roster
**What the user is trying to do:** See all players on the team — names, jersey numbers, status.
**Expected destination:** `app/(tabs)/players.tsx` (via `coach-roster.tsx` re-export) or `app/roster.tsx`

#### Path A: Home → Roster card — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap roster card | Inline card | `components/CoachHomeScroll.tsx` | 538 | Route: `/roster?teamId={selectedTeamId}` |
| 3 | Lands on | Roster | `app/roster.tsx` | — | Standalone roster screen (264 lines) |

**Status:** ✅ Correct — teamId passed.

#### Path B: Home → Quick Actions → Manage Roster — 1 tap (off-day only)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (no event today) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap "Manage Roster" in Quick Actions | `QuickActions` | `components/coach-scroll/QuickActions.tsx` | 25 | Route: `/(tabs)/coach-roster` → re-exports `players.tsx` |

**Status:** ✅ Correct — but only visible on non-event days (`offDayOnly: true`). Routes to `coach-roster.tsx` which is a 7-line re-export of `players.tsx`.

#### Path C: Home → Game Plan Card → Roster pill — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (event within 48hrs) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap "Roster" pill | `GamePlanCard` | `components/coach-scroll/GamePlanCard.tsx` | 47 | Route: `/(tabs)/coach-roster` |

**Status:** ✅ Correct

#### Path D: Drawer → Coaching Tools → Roster — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → open Coaching Tools | GestureDrawer | `components/GestureDrawer.tsx` | 153 | Route: `/(tabs)/players` |
| 2 | Lands on players screen | | `app/(tabs)/players.tsx` | — | Same underlying screen as `coach-roster` |

**Status:** ✅ Correct

#### Path E: Home → Activity Feed → coach-roster — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap activity feed item or "View all" | `ActivityFeed` | `components/coach-scroll/ActivityFeed.tsx` | 126,137 | Route: `/(tabs)/coach-roster` |

**Status:** ⚠️ Friction — Activity feed items (player achievements) route to the roster screen, not to the specific player's detail. User taps "Player X earned Badge Y" and lands on the full roster grid — not on Player X's detail page.

#### Screen Name Confusion:
- There are 4 roster-related screens: `coach-roster.tsx` (re-export of `players.tsx`), `players.tsx` (grid/list), `roster.tsx` (standalone 264 lines), `team-roster.tsx` (team-specific with `teamId` param). The home dashboard roster card goes to `roster.tsx` while Quick Actions and drawer go to `coach-roster`/`players.tsx`. These are DIFFERENT screens showing the same data.

---

### TASK 7: View a Player's Card / Detail
**What the user is trying to do:** See a specific player's profile — stats, evaluations, achievements, jersey number.
**Expected destination:** `app/player-card.tsx` (trading card view, 267 lines) or `app/child-detail.tsx` (detailed profile, 1555 lines)

#### Path A: Home → Roster card → roster → (no player tap) — Dead end
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap roster card | Inline card | `components/CoachHomeScroll.tsx` | 538 | Route: `/roster?teamId={id}` |
| 3 | Lands on roster | Roster | `app/roster.tsx` | — | Shows player list — 264 lines. No `router.push` calls found. |

**Status:** 🚫 Dead end — `roster.tsx` has NO outbound navigation. Coach can see the player list but cannot tap a player to view their card or detail. The screen is display-only.

#### Path B: Drawer → Coaching Tools → Roster → (no player tap) — Dead end
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Coaching Tools → Roster | GestureDrawer | `components/GestureDrawer.tsx` | 153 | Route: `/(tabs)/players` |
| 2 | Lands on players | Players grid | `app/(tabs)/players.tsx` | — | Shows player grid/list — 494 lines. No `router.push` calls found. |

**Status:** 🚫 Dead end — `players.tsx` also has NO outbound navigation. Same as Path A — display-only roster with no tap-to-detail.

#### Path C: Coach My Stuff → Team card → Team roster → Player detail — 3+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to coach-my-stuff (hidden tab) | | `app/(tabs)/coach-my-stuff.tsx` | — | No direct drawer or tab entry |
| 2 | Tap team card | Team row | `app/(tabs)/coach-my-stuff.tsx` | 278 | Route: `/team-roster?teamId={id}` |
| 3 | Tap player row | Player card | `app/team-roster.tsx` | 87 | Route: `/child-detail?playerId={id}` |
| 4 | Lands on child detail | Child Detail | `app/child-detail.tsx` | — | Full player profile with stats, schedule, achievements |

**Status:** ⚠️ Friction — `coach-my-stuff.tsx` is a hidden tab with no drawer or tab bar entry for pure coaches. This is the ONLY path that reaches a player detail page from the coach flow, but it requires knowing about the hidden tab.

#### Path D: Standings → Player card — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to standings (drawer or home link) | | `app/standings.tsx` | — | |
| 2 | Tap player name in leaderboard | Player row | `app/standings.tsx` | 279 | Route: `/player-card?playerId={id}` |
| 3 | Lands on player card | Player Card | `app/player-card.tsx` | — | Trading card style view |

**Status:** ✅ Correct — but indirect. Requires going to standings first.

#### Missing Paths:
- No direct "View Player" action from the primary roster screens (`roster.tsx`, `players.tsx`). Both are display-only dead ends.
- `coach-my-stuff.tsx` (the only path to `team-roster` → `child-detail`) has no drawer or tab bar entry.
- Activity feed items (player achievement notifications) route to `coach-roster` (the full roster), not the specific player.

---

### TASK 8: Run Player Evaluations
**What the user is trying to do:** Evaluate players on their skills — rate abilities, write notes, track progress.
**Expected destination:** `app/evaluation-session.tsx` (572 lines) → `app/player-evaluations.tsx` (1040 lines)

#### Path A: Drawer → Coaching Tools → Player Evaluations — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → open Coaching Tools | GestureDrawer | `components/GestureDrawer.tsx` | 144 | Route: `/evaluation-session` |
| 2 | Lands on evaluation session | Evaluation Session | `app/evaluation-session.tsx` | — | Team/player selection screen. Uses `teamId` param if provided. |

**Status:** ✅ Correct — Drawer passes no teamId, so screen must show team picker first.

#### Path B: Home → Action Items → "X players due for evaluation" — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (scroll to Action Items) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | Only renders if evalCount > 0 |
| 2 | Tap evaluation action item | `ActionItems` | `components/coach-scroll/ActionItems.tsx` | 81 | Route: `/evaluation-session?teamId={id}` |
| 3 | Lands on evaluation session | | `app/evaluation-session.tsx` | — | Pre-filtered to selected team |

**Status:** ✅ Correct — teamId passed. Only visible when players are overdue for evaluation (no eval in last 30 days).

#### Evaluation Flow (continuation):
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 3 | Select players, choose eval type, tap Start | `evaluation-session.tsx` | `app/evaluation-session.tsx` | 125-126 | Route: `/player-evaluations?teamId={id}&type={type}&playerIds={ids}` |
| 4 | Complete evaluations | `player-evaluations.tsx` | `app/player-evaluations.tsx` | — | Multi-step evaluation wizard |
| 5 | On complete → `router.back()` | | `app/player-evaluations.tsx` | 327 | Returns to evaluation session |

**Status:** ✅ Correct flow — evaluation-session acts as a setup screen, player-evaluations is the actual evaluation wizard.

---

### TASK 9: Manage Challenges (Create, Review)
**What the user is trying to do:** Create new challenges for players, review active challenges, verify completions.
**Expected destination:** `app/coach-challenge-dashboard.tsx` (741 lines)

#### Path A: Drawer → Coaching Tools → Challenges — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → open Coaching Tools | GestureDrawer | `components/GestureDrawer.tsx` | 145 | Route: `/coach-challenge-dashboard` |
| 2 | Lands on coach challenge dashboard | | `app/coach-challenge-dashboard.tsx` | — | Lists active/completed challenges with verification badges |

**Status:** ✅ Correct

#### Path B: Home → Challenge Quick Card → View Dashboard — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | ChallengeQuickCard visible when team has active challenges |
| 2 | Tap "View Dashboard" | `ChallengeQuickCard` | `components/coach-scroll/ChallengeQuickCard.tsx` | 145 | Route: `/coach-challenge-dashboard` |

**Status:** ✅ Correct — conditional on having active challenges.

#### Path C: Home → Quick Actions → Create a Challenge — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap "Create a Challenge" | `QuickActions` | `components/coach-scroll/QuickActions.tsx` | 26 | Route: `/create-challenge` |
| 3 | Lands on create challenge | | `app/create-challenge.tsx` | — | Challenge creation form (382 lines) |

**Status:** ✅ Correct

#### Path D: Home → Challenge Quick Card (empty) → Issue a Challenge — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (no active challenges) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap "Issue a Challenge" | `ChallengeQuickCard` | `components/coach-scroll/ChallengeQuickCard.tsx` | 160 | Route: `/challenge-library` |
| 3 | Lands on challenge library | | `app/challenge-library.tsx` | — | Browse challenge templates (656 lines) |

**Status:** ✅ Correct

#### Path E: Drawer → Coaching Tools → Challenge Library — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Coaching Tools → Challenge Library | GestureDrawer | `components/GestureDrawer.tsx` | 146 | Route: `/challenge-library` |
| 2 | Tap template → create from template | | `app/challenge-library.tsx` | 77-80 | Route: `/create-challenge?templateId={id}` |

**Status:** ✅ Correct

#### Challenge Dashboard Navigation (continuation):
| Step | Action | Code File | Line | Route |
|------|--------|-----------|------|-------|
| Tap challenge row | `coach-challenge-dashboard.tsx` | 223 | `/challenge-detail?challengeId={id}` |
| Tap "Create" FAB | `coach-challenge-dashboard.tsx` | 313 | `/create-challenge` |
| Tap "Library" | `coach-challenge-dashboard.tsx` | 328 | `/challenge-library` |

**Status:** ✅ Full challenge management flow is well-connected.

#### Notification Deep Link Issue:
- `challenge_*` notifications route to `/challenge-cta` or `/challenges` — the PLAYER-facing challenge screens. Coach challenge dashboard is at `/coach-challenge-dashboard`. A coach receiving a challenge notification lands on the player view, not the management dashboard.

---

### TASK 10: View Leaderboards / Standings
**What the user is trying to do:** See team standings, win-loss records, and player stat leaderboards.
**Expected destination:** `app/standings.tsx` (682 lines)

#### Path A: Home → Season Leaderboard Card → View Leaderboard — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (scroll to Season Leaderboard card) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap "View Leaderboard →" link | `SeasonLeaderboardCard` | `components/coach-scroll/SeasonLeaderboardCard.tsx` | 246 | Route: `/standings` |

**Status:** ✅ Correct — only visible when stats exist.

#### Path B: Tab bar → Game Day → Standings card — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Game Day" tab | Tab bar | `app/(tabs)/_layout.tsx` | 241-254 | |
| 2 | Tap "Standings" card | `gameday.tsx` | `app/(tabs)/gameday.tsx` | 639 | Route: `/standings` |

**Status:** ✅ Correct

#### Path C: Drawer → League & Community → Standings — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → League & Community → Standings | GestureDrawer | `components/GestureDrawer.tsx` | 201 | Route: `/standings` |

**Status:** ✅ Correct

---

### TASK 11: Access Team Hub / Team Wall
**What the user is trying to do:** View the team's social wall — posts, shoutouts, photos, announcements.
**Expected destination:** `app/(tabs)/connect.tsx` (307 lines) → `TeamHubScreen` component

#### Path A: Home → Team Hub Preview → View All — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (scroll to Team Hub Preview) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap "View All →" or any post | `TeamHubPreviewCard` | `components/coach-scroll/TeamHubPreviewCard.tsx` | 126 | Route: `/(tabs)/connect` |

**Status:** ✅ Correct

#### Path B: Drawer → Quick Access → Team Wall — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Team Wall | GestureDrawer | `components/GestureDrawer.tsx` | 84 | Route: `/(tabs)/connect` |

**Status:** ✅ Correct

#### Path C: Drawer → League & Community → Team Wall — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → League & Community → Team Wall | GestureDrawer | `components/GestureDrawer.tsx` | 200 | Route: `/(tabs)/connect` |

**Status:** ✅ Correct — duplicate entry (same destination from two drawer sections).

#### Path D: Coach Team Hub (hidden tab) — no discoverable path
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to `/(tabs)/coach-team-hub` | Hidden tab | `app/(tabs)/coach-team-hub.tsx` | — | No drawer item or tab routes here |

**Status:** 🔇 Missing path — `coach-team-hub.tsx` (243 lines) exists as a hidden tab with team selector pills + TeamHubScreen, but nothing routes to it. Coaches always land on `connect.tsx` which is the all-role equivalent. The coach-specific variant is orphaned.

---

### TASK 12: Send a Chat Message / Blast
**What the user is trying to do:** Send a direct message, group message, or team-wide blast.
**Expected destination:** `app/(tabs)/chats.tsx` (generic) or `app/(tabs)/coach-chat.tsx` (coach-specific with FAB + blast)

#### Path A: Tab bar → Chat — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Chat" tab | Tab bar | `app/(tabs)/_layout.tsx` | 272-287 | Tab 3 — always visible |
| 2 | Lands on generic chat | Chat list | `app/(tabs)/chats.tsx` | — | 777 lines. Generic chat for all roles. |

**Status:** ⚠️ Friction — Coach lands on the GENERIC chat (`chats.tsx`), not the coach-specific chat (`coach-chat.tsx` — 1100 lines). The coach-chat has a FAB with blast shortcut, admin channel browsing, and expanded features that the generic version lacks.

#### Path B: Drawer → Quick Access → Chats — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Chats | GestureDrawer | `components/GestureDrawer.tsx` | 82 | Route: `/(tabs)/chats` |

**Status:** ⚠️ Friction — Same issue. Routes to generic chat, not coach-chat.

#### Path C: Home → Quick Actions → Send a Blast — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap "Send a Blast" | `QuickActions` | `components/coach-scroll/QuickActions.tsx` | 21 | Route: `/(tabs)/coach-chat` |

**Status:** ✅ Correct — Routes to coach-specific chat with blast FAB.

#### Path D: Home → Game Plan Card → RSVP missing → coach-chat — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (game within 48hrs, missing RSVPs) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap missing RSVP names | `GamePlanCard` | `components/coach-scroll/GamePlanCard.tsx` | 119 | Route: `/(tabs)/coach-chat` |

**Status:** ⚠️ Friction — Routes to coach-chat list, not to a specific DM with the missing player's parent. The TODO comment at line 118 says "Navigate to chat/DM with missing player's parent when built."

#### Path E: Drawer → Coaching Tools → Blast Composer — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Coaching Tools → Blast Composer | GestureDrawer | `components/GestureDrawer.tsx` | 148 | Route: `/blast-composer` |
| 2 | Lands on blast composer | | `app/blast-composer.tsx` | — | Full blast composition screen (735 lines) |

**Status:** ✅ Correct — Direct path to blast composition.

#### Missing Paths:
- No tab bar or drawer entry routes to `coach-chat.tsx`. The only way to reach the coach-specific chat is via home dashboard actions (QuickActions "Send a Blast" or GamePlanCard RSVP missing).
- Notification deep link for `chat` routes to `/(tabs)/chats` (generic), not `/(tabs)/coach-chat`.

---

### TASK 13: View Schedule
**What the user is trying to do:** See upcoming games, practices, and events for their team(s).
**Expected destination:** `app/(tabs)/coach-schedule.tsx` (1324 lines)

#### Path A: Tab bar → Game Day — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Game Day" tab | Tab bar | `app/(tabs)/_layout.tsx` | 241-254 | Tab 2b |
| 2 | Lands on Game Day | | `app/(tabs)/gameday.tsx` | — | Shows hero event, weekly schedule, standings — NOT a full calendar view |

**Status:** ⚠️ Friction — Game Day is a dashboard, not a traditional schedule/calendar view. It shows the next event prominently and a weekly snapshot, but doesn't provide the full month/week calendar that `coach-schedule.tsx` offers.

#### Path B: Tab bar → Game Day → "View full schedule" — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Game Day" tab | Tab bar | | | |
| 2 | Tap "View full schedule" or "See all" in upcoming section | `gameday.tsx` | `app/(tabs)/gameday.tsx` | 662, 705 | Route: `/(tabs)/schedule` — NOT `coach-schedule` |

**Status:** ❌ Wrong destination — Routes to `/(tabs)/schedule` (generic schedule) instead of `/(tabs)/coach-schedule`. The generic schedule is a different screen with different features.

#### Path C: Drawer → Quick Access → Schedule — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Schedule | GestureDrawer | `components/GestureDrawer.tsx` | 81 | Route: `/(tabs)/schedule` |

**Status:** ❌ Wrong destination — Same issue. Routes to generic `schedule.tsx`, not `coach-schedule.tsx`.

#### Path D: Home → PrepChecklist (incomplete) → coach-schedule — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (event day, checklist incomplete) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap checklist | `PrepChecklist` | `components/coach-scroll/PrepChecklist.tsx` | 65 | Route: `/(tabs)/coach-schedule` |

**Status:** ✅ Correct — but conditional. Only appears on event days when prep items are incomplete.

#### Path E: Home → ScoutingContext → coach-schedule — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (game with previous matchup) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap scouting line | `ScoutingContext` | `components/coach-scroll/ScoutingContext.tsx` | 24 | Route: `/(tabs)/coach-schedule` |

**Status:** ✅ Correct — but conditional. Only appears when there's a previous matchup with the upcoming opponent.

#### Missing Paths:
- **No persistent, reliable path to `coach-schedule.tsx`** from any tab or drawer. The drawer "Schedule" goes to the wrong screen. All paths to the correct coach schedule are conditional (prep checklist, scouting context, season setup, activity feed empty state).
- The `coach-schedule.tsx` hidden tab is the coach's best schedule experience (week/month calendar, team filtering, event creation) but is essentially orphaned from primary navigation.

---

### TASK 14: Take Attendance
**What the user is trying to do:** Mark which players attended a practice or game.
**Expected destination:** `app/attendance.tsx` (977 lines)

#### Path A: Drawer → Game Day → Attendance — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Game Day → Attendance | GestureDrawer | `components/GestureDrawer.tsx` | 131 | Route: `/attendance` |
| 2 | Lands on attendance | | `app/attendance.tsx` | — | No eventId param — must show event picker |

**Status:** ⚠️ Friction — No eventId passed. The screen must auto-resolve the current/next event or show a picker.

#### Path B: Home → Game Plan Card → Attend. pill — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (event within 48hrs) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap "Attend." pill | `GamePlanCard` | `components/coach-scroll/GamePlanCard.tsx` | 50,54 | Route: `/attendance?eventId={id}` |

**Status:** ✅ Correct — eventId passed. Only visible when event is within 48 hours.

#### Path C: Tab bar → Game Day → Coach Tools → Attendance — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Game Day" tab | Tab bar | | | |
| 2 | Scroll to Coach Tools | `gameday.tsx` | `app/(tabs)/gameday.tsx` | 790 | |
| 3 | Tap "Attendance" | Tool card | `app/(tabs)/gameday.tsx` | 790 | Route: `/attendance` — NO eventId |

**Status:** ⚠️ Friction — No eventId passed from this path either.

---

### TASK 15: Build a Lineup
**What the user is trying to do:** Set the starting lineup and rotation for a game.
**Expected destination:** `app/lineup-builder.tsx` (2475 lines)

#### Path A: Home → Quick Actions → Build a Lineup — 1 tap (off-day only)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (no event today) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap "Build a Lineup" | `QuickActions` | `components/coach-scroll/QuickActions.tsx` | 22 | Route: `/lineup-builder` — NO eventId |

**Status:** ⚠️ Friction — No eventId passed. The `offDayOnly: true` flag means this action disappears on event days — exactly when lineup building is most urgent.

#### Path B: Home → Game Plan Card → Lineup pill — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (game within 48hrs) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap "Lineup" pill | `GamePlanCard` | `components/coach-scroll/GamePlanCard.tsx` | 48 | Route: `/lineup-builder?eventId={id}` |

**Status:** ✅ Correct — eventId passed. Only visible when a game is within 48 hours.

#### Path C: Drawer → Game Day → Lineup Builder — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Game Day → Lineup Builder | GestureDrawer | `components/GestureDrawer.tsx` | 130 | Route: `/lineup-builder` — NO eventId |

**Status:** ⚠️ Friction — No eventId. Lineup builder must auto-resolve event.

#### Path D: Tab bar → Game Day → Coach Tools → Lineup — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Game Day" tab → scroll → Lineup | `gameday.tsx` | `app/(tabs)/gameday.tsx` | 791 | Route: `/lineup-builder` — NO eventId |

**Status:** ⚠️ Friction — No eventId.

#### Path E: Tab bar → Game Day → Hero → Start Game → (within game-prep) — 3+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Game prep wizard | | `app/game-prep-wizard.tsx` | 500 | Route: `/lineup-builder?eventId={id}&teamId={id}` |

**Status:** ✅ Correct — eventId AND teamId passed. Requires going through game prep wizard first.

#### Missing Paths:
- Quick Actions hides "Build a Lineup" on event days (`offDayOnly: true`) — the opposite of when it's most needed.

---

### TASK 16: View Game Prep
**What the user is trying to do:** Review pre-game preparation — lineup status, RSVPs, opponent scouting, previous matchup data.
**Expected destination:** `app/game-prep.tsx` (1924 lines) or `app/game-prep-wizard.tsx` (1596 lines)

#### Path A: Drawer → Game Day → Game Prep — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Game Day → Game Prep | GestureDrawer | `components/GestureDrawer.tsx` | 129 | Route: `/game-prep` |
| 2 | Lands on game prep | | `app/game-prep.tsx` | — | Legacy game prep screen (1924 lines). No params needed — auto-resolves events. |

**Status:** ✅ Correct

#### Path B: Tab bar → Game Day → Coach Tools → Game Prep — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Game Day" → Coach Tools → Game Prep | `gameday.tsx` | `app/(tabs)/gameday.tsx` | 792 | Route: `/game-prep-wizard` — different screen |

**Status:** ⚠️ Friction — Routes to `game-prep-wizard.tsx` (1596 lines), which is a DIFFERENT screen than what the drawer routes to (`game-prep.tsx`). Two different game prep screens with different UIs.

#### Path C: Coach schedule → event → game prep wizard — 2+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On coach schedule, tap event | `coach-schedule.tsx` | `app/(tabs)/coach-schedule.tsx` | 768 | Route: `/game-prep-wizard?eventId={id}&teamId={id}` |

**Status:** ✅ Correct — full params passed to the wizard version.

#### Path D: Notification deep link → game-prep — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap `game`/`game_reminder` notification | Deep link | `app/_layout.tsx` | 106-109 | Route: `/game-prep?eventId={eid}` or `/game-prep` |

**Status:** ✅ Correct — routes to legacy game-prep, with eventId if available.

#### Screen Name Confusion:
- **Two game prep screens exist:** `game-prep.tsx` (legacy, 1924 lines) and `game-prep-wizard.tsx` (newer, 1596 lines). The drawer and notifications route to the legacy version; the gameday tab Coach Tools and coach-schedule route to the wizard version. User encounters different UIs depending on entry point.

---

### TASK 17: Access Coach Profile
**What the user is trying to do:** View/edit their coaching profile — certifications, background check status, coaching level.
**Expected destination:** `app/coach-profile.tsx` (423 lines)

#### Path A: Drawer → Coaching Tools → Coach Profile — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Coaching Tools → Coach Profile | GestureDrawer | `components/GestureDrawer.tsx` | 151 | Route: `/coach-profile` |
| 2 | Lands on coach profile | | `app/coach-profile.tsx` | — | Certifications, coaching level, background check status |

**Status:** ✅ Correct

#### Path B: Drawer → Settings & Privacy → My Profile — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Settings → My Profile | GestureDrawer | `components/GestureDrawer.tsx` | 214 | Route: `/profile` |
| 2 | Lands on generic profile | | `app/profile.tsx` | — | Generic profile editor (all roles) — NOT coach-specific |

**Status:** ⚠️ Friction — `profile.tsx` is the generic user profile (name, email, avatar). `coach-profile.tsx` has coaching-specific fields (certifications, coaching level, background check). Two different "profile" screens. The drawer has both — Coaching Tools → "Coach Profile" and Settings → "My Profile" — but user may not understand the difference.

#### Screen Name Confusion:
- "Coach Profile" (`/coach-profile`) shows coaching certifications and background check. "My Profile" (`/profile`) shows basic user info. Both say "profile" — user must know which is which.

---

### TASK 18: Set Coach Availability
**What the user is trying to do:** Mark dates/times when the coach is available or unavailable.
**Expected destination:** `app/coach-availability.tsx` (595 lines)

#### Path A: Drawer → Coaching Tools → Coach Availability — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Coaching Tools → Coach Availability | GestureDrawer | `components/GestureDrawer.tsx` | 150 | Route: `/coach-availability` |
| 2 | Lands on availability | | `app/coach-availability.tsx` | — | Calendar-based availability management |

**Status:** ✅ Correct

#### Missing Paths:
- No home dashboard card or Game Day tab link to coach availability. Only reachable from the drawer. Single entry point — fragile.
- Coach My Stuff (`coach-my-stuff.tsx`) has a dynamic menu that includes `coach-availability` (line 187), but coach-my-stuff itself has no discoverable entry point from drawer or tab bar.

---

### TASK 19: View Game Recap
**What the user is trying to do:** See a summary of a completed game — score, key stats, highlights.
**Expected destination:** `app/game-recap.tsx` (974 lines)

#### Path A: Drawer → Game Day → Game Recap — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Game Day → Game Recap | GestureDrawer | `components/GestureDrawer.tsx` | 133 | Route: `/game-recap` |
| 2 | Lands on game recap | | `app/game-recap.tsx` | — | Uses `useLocalSearchParams<{ eventId?: string; playerId?: string }>()` (line 106). No eventId from drawer — must auto-resolve. |

**Status:** ⚠️ Friction — No eventId passed. Screen must show a game picker or find the most recent completed game.

#### Path B: Tab bar → Game Day → Coach Tools → Recap — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Game Day" → Coach Tools → Recap | `gameday.tsx` | `app/(tabs)/gameday.tsx` | 793 | Route: `/game-recap` — NO eventId |

**Status:** ⚠️ Friction — Same no-param issue.

#### Missing Paths:
- No path passes eventId to game-recap from the drawer or Game Day tab. The only way to reach it with an eventId would be via a direct deep link or programmatic navigation (which doesn't exist in the current codebase for game-recap).

#### Screen Name Confusion:
- `game-recap.tsx` (recap view) vs `game-results.tsx` (stats entry/review). Both deal with post-game data but serve different purposes. The drawer has both under Game Day: "Game Results" (stats) and "Game Recap" (summary). User might not know which to use.

---

### TASK 20: View Reports / Analytics
**What the user is trying to do:** See aggregate reports, analytics, and data visualizations about team performance.
**Expected destination:** `app/(tabs)/reports-tab.tsx`

#### Path A: Drawer → Coaching Tools — No reports item
The Coaching Tools drawer section does NOT include a Reports & Analytics item. Reports is only in the Admin Tools section (line 104, roleGate: `admin`).

**Status:** 🔇 Missing path — Coaches have no drawer entry for reports. Only admins see "Reports & Analytics" in their Admin Tools section.

#### Path B: Tab bar → Game Day → (no reports link)
The Game Day tab does not have a link to reports.

**Status:** 🔇 Missing path

#### Path C: Home dashboard → (no reports card)
No coach-scroll component navigates to reports.

**Status:** 🔇 Missing path

#### Missing Paths:
- **No coach path to reports at all.** Reports & Analytics (`/(tabs)/reports-tab`) is gated to admin only in the drawer. Coaches have no way to access analytics or performance reports unless they also have the admin role.

---

### TASK 21: Manage Volunteers
**What the user is trying to do:** Assign parent volunteers for game-day duties (scorekeeping, line judging, etc.).
**Expected destination:** `app/volunteer-assignment.tsx` (1319 lines)

#### Path A: Drawer — No coach entry
The Volunteer Assignment item is in the Admin Tools drawer section (line 112, roleGate: `admin`). It is NOT in the Game Day or Coaching Tools sections.

**Status:** 🔇 Missing path — Coaches cannot access volunteer assignment. Only admins see this drawer item.

#### Path B: Coach schedule → event → (no volunteer link)
`coach-schedule.tsx` shows event details with RSVP tracking and volunteer assignments (line 281 fetches `event_volunteers`), but the data is display-only — no navigation to the volunteer assignment management screen.

**Status:** 🔇 Missing path

#### Missing Paths:
- **No coach path to volunteer management.** Coaches can see volunteer data on their schedule events but cannot manage assignments.

---

### TASK 22: View My Teams
**What the user is trying to do:** See all teams they are coaching, with roster counts and basic info.
**Expected destination:** `app/(tabs)/my-teams.tsx` (817 lines)

#### Path A: Drawer → Coaching Tools → My Teams — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Coaching Tools → My Teams | GestureDrawer | `components/GestureDrawer.tsx` | 152 | Route: `/(tabs)/my-teams` |
| 2 | Lands on My Teams | | `app/(tabs)/my-teams.tsx` | — | Team list with roster counts |

**Status:** ✅ Correct

#### Path B: Home → Team selector pills — 0 extra taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | 467-482 | Team pills inline on home — tap to filter dashboard by team |

**Status:** ⚠️ Friction — Team pills let the coach SWITCH between teams on the home dashboard, but don't navigate to a "My Teams" management screen. They filter the home content, not navigate away.

---

### TASK 23: View Blast History
**What the user is trying to do:** See past blasts/announcements they've sent.
**Expected destination:** `app/blast-history.tsx` (519 lines)

#### Path A: Drawer → Coaching Tools → Blast History — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Coaching Tools → Blast History | GestureDrawer | `components/GestureDrawer.tsx` | 149 | Route: `/blast-history` |

**Status:** ✅ Correct

#### Path B: After sending blast → Blast History — 1 tap (post-action)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Complete sending a blast | `blast-composer.tsx` | `app/blast-composer.tsx` | 258 | Route: `/blast-history` (via Alert success action) |

**Status:** ✅ Correct — appears as success action after sending.

---

### TASK 24: View Player Goals
**What the user is trying to do:** Review and manage individual player development goals.
**Expected destination:** `app/player-goals.tsx` (791 lines)

#### Path A: Drawer → Coaching Tools → Player Goals — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Coaching Tools → Player Goals | GestureDrawer | `components/GestureDrawer.tsx` | 147 | Route: `/player-goals` |

**Status:** ✅ Correct

#### Path B: Child detail → Player goals — 2+ taps (indirect)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to child detail (via standings → player card → my-stats, or coach-my-stuff → team-roster → child-detail) | | `app/child-detail.tsx` | — | |
| 2 | Tap goals section | | `app/child-detail.tsx` | 554 | Route: `/player-goals?playerId={id}` |

**Status:** ✅ Correct — but reaching child-detail itself is difficult for coaches (see TASK 7).

#### Missing Paths:
- No home dashboard card links to Player Goals. Only reachable from drawer or deep within child-detail (which itself is hard to reach).

---

### TASK 25: View Achievements / Badges
**What the user is trying to do:** See earned badges and achievements for their team or themselves.
**Expected destination:** `app/achievements.tsx` (2355 lines)

#### Path A: Home → Trophy Case Widget → See All — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (scroll to trophy case) | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap "See All" | `TrophyCaseWidget` | `components/TrophyCaseWidget.tsx` | 76,91,103 | Route: `/achievements` |

**Status:** ✅ Correct

#### Path B: Home → Achievement celebration → View All — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home loads, unseen achievements exist | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | 185-193 | Modal auto-appears |
| 2 | Tap "View All Trophies" | `AchievementCelebrationModal` | `components/CoachHomeScroll.tsx` | 646 | Route: `/achievements` |

**Status:** ✅ Correct — conditional on having unseen achievements.

#### Path C: Drawer → League & Community → Achievements — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → League & Community → Achievements | GestureDrawer | `components/GestureDrawer.tsx` | 202 | Route: `/achievements` |

**Status:** ✅ Correct

---

### TASK 26: View Notifications
**What the user is trying to do:** See all push notifications and in-app alerts.
**Expected destination:** `app/notification.tsx` (220 lines)

#### Path A: Home → Bell icon — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `CoachHomeScroll` | `components/CoachHomeScroll.tsx` | — | |
| 2 | Tap bell icon (compact or welcome section) | | `components/CoachHomeScroll.tsx` | 343, 435 | Route: `/notification` |

**Status:** ✅ Correct

#### Missing Paths:
- No drawer item for notifications list (only "Notifications" in Settings which is notification preferences/settings, not the notification inbox).

---

### TASK 27: Edit Profile
**What the user is trying to do:** Update their name, email, avatar.
**Expected destination:** `app/profile.tsx`

#### Path A: Drawer → Settings & Privacy → My Profile — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → Settings → My Profile | GestureDrawer | `components/GestureDrawer.tsx` | 214 | Route: `/profile` |

**Status:** ✅ Correct

---

## Cross-Cutting Issues Summary

### 1. Schedule Screen Confusion
There are 4 schedule screens: `schedule.tsx` (generic), `coach-schedule.tsx` (coach-specific), `parent-schedule.tsx` (parent-specific), `admin-schedule.tsx` (re-export of coach-schedule). The coach's best schedule (`coach-schedule.tsx`) has NO persistent navigation path. The drawer, Game Day tab, and notifications all route to `schedule.tsx` (generic). Coach-schedule is only reachable from conditional home dashboard cards.

### 2. Roster Screen Fragmentation
There are 4 roster screens: `roster.tsx` (standalone, no outbound nav), `players.tsx` (grid, no outbound nav), `coach-roster.tsx` (re-export of players), `team-roster.tsx` (with player tap → child-detail). Only `team-roster.tsx` allows viewing player detail, but it's only reachable from `coach-my-stuff.tsx` which itself has no entry point.

### 3. Missing Params Pattern
Many drawer items route to screens that expect params (`eventId`, `teamId`) but pass none: Game Day Command, Game Results, Game Recap, Attendance, Lineup Builder. The screens must auto-resolve or show pickers, creating friction.

### 4. Two Game Prep Screens
`game-prep.tsx` (legacy, 1924 lines) and `game-prep-wizard.tsx` (newer, 1596 lines) serve similar purposes. Drawer and notifications route to the legacy version; Coach Tools and coach-schedule route to the wizard.

### 5. Coach-Chat Orphaned from Primary Nav
The coach-specific chat (`coach-chat.tsx`, 1100 lines) with FAB + blast shortcut is only reachable from home dashboard QuickActions. Tab bar and drawer both route to generic chat (`chats.tsx`, 777 lines) which lacks coach features.

### 6. Coach-My-Stuff Unreachable
`coach-my-stuff.tsx` (715 lines) is a hidden tab with team cards, certifications, and useful navigation (team-roster → child-detail). No drawer or tab bar entry points to it. It's orphaned.

### 7. Coach-Team-Hub Orphaned
`coach-team-hub.tsx` (243 lines) exists as a coach-specific team hub but nothing routes to it. All Team Wall navigation goes to `connect.tsx` (all-role version).

### 8. Reports Not Available to Coaches
Reports & Analytics is admin-gated. No coach path exists to `/(tabs)/reports-tab`.

### 9. Volunteer Management Not Available to Coaches
Volunteer Assignment is admin-gated. Coaches can see volunteer data on schedule events but cannot manage assignments.

### 10. Activity Feed Misdirected
Activity feed items (player achievements) link to the roster grid, not the specific player's detail. User taps "Player X earned Badge Y" and lands on the full roster with no way to view Player X's profile.

---

## Task Status Summary

| # | Task | Status | Best Path | Issues |
|---|------|--------|-----------|--------|
| 1 | View Home Dashboard | ✅ | App launch / Tab 1 | Coach-parents always see CoachHomeScroll, never ParentHomeScroll |
| 2 | Create a Practice Event | ⚠️ | No reliable path to coach-schedule | Drawer/gameday route to wrong schedule screen |
| 3 | Create a Game Event | ⚠️ | Same as Task 2 | Same issues |
| 4 | Run Live Game | ✅ | Home hero card / Game Day hero | Drawer passes no params |
| 5 | Enter/Review Post-Game Stats | ⚠️ | Home action items / Game Day recent results | Many paths lack eventId |
| 6 | View Roster | ✅ | Home roster card / Drawer | 4 roster screens, activity feed misdirects |
| 7 | View Player Card / Detail | 🚫 | Standings → player-card | Primary roster screens are dead ends |
| 8 | Run Player Evaluations | ✅ | Drawer / Home action items | Well-connected flow |
| 9 | Manage Challenges | ✅ | Drawer / Home challenge card | Well-connected flow |
| 10 | View Leaderboards / Standings | ✅ | Home / Game Day / Drawer | Multiple correct paths |
| 11 | Access Team Hub | ✅ | Home preview / Drawer | Coach-team-hub orphaned |
| 12 | Send Chat / Blast | ⚠️ | Home QuickActions → coach-chat | Tab bar/drawer route to generic chat |
| 13 | View Schedule | ❌ | No reliable path to coach-schedule | All persistent paths go to wrong screen |
| 14 | Take Attendance | ⚠️ | Home hero card pill | Drawer/gameday pass no eventId |
| 15 | Build a Lineup | ⚠️ | Home hero card pill | QuickActions hidden on event days |
| 16 | View Game Prep | ⚠️ | Drawer / Coach Tools | Two different game-prep screens |
| 17 | Access Coach Profile | ✅ | Drawer | Two "profile" screens may confuse |
| 18 | Set Availability | ✅ | Drawer | Single entry point |
| 19 | View Game Recap | ⚠️ | Drawer / Coach Tools | No eventId passed |
| 20 | View Reports / Analytics | 🔇 | None | Admin-gated, no coach path |
| 21 | Manage Volunteers | 🔇 | None | Admin-gated, no coach path |
| 22 | View My Teams | ✅ | Drawer | |
| 23 | View Blast History | ✅ | Drawer / Post-blast | |
| 24 | View Player Goals | ✅ | Drawer | |
| 25 | View Achievements | ✅ | Home / Drawer | |
| 26 | View Notifications | ✅ | Home bell icon | No drawer inbox entry |
| 27 | Edit Profile | ✅ | Drawer | |

**Totals:**
- ✅ Correct: 14 tasks
- ⚠️ Friction: 8 tasks
- ❌ Wrong destination: 1 task
- 🚫 Dead end: 1 task
- 🔇 Missing path: 3 tasks
