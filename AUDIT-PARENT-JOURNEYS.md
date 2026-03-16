# LYNX MOBILE — PARENT JOURNEY & TASK-PATH AUDIT
## Audit Date: 2026-03-12
## Role: Parent

---

## How To Read This Document

Each task below shows every way a Parent user can reach a destination or complete an action. Paths are listed from most natural/common to most obscure. Each step shows the screen, the action, the code file and line number, and the destination. Flags indicate friction, dead ends, wrong destinations, and missing paths.

Cross-reference screen names with AUDIT-GLOSSARY.md for detailed information about each screen.

---

## Navigation Entry Points Available to Parent

### Tab Bar

| Tab | Visible? | Route | Screen File | Notes |
|-----|----------|-------|-------------|-------|
| 1 — Home | Yes | `/(tabs)` | `index.tsx` → `DashboardRouter.tsx` → `ParentHomeScroll` | Role resolved at `DashboardRouter.tsx:142-143` |
| 2c — Schedule | Yes (parent-only) | `/(tabs)/parent-schedule` | `parent-schedule.tsx` | Only visible when `isParentOnly` is true (`_layout.tsx:260`). Hidden if user is also admin or coach. |
| 3 — Chat | Yes | `/(tabs)/chats` | `chats.tsx` | Generic chat list for all roles. Parent-specific `parent-chat.tsx` is a hidden tab. |
| 4 — More | Yes | — | `menu-placeholder.tsx` | Opens GestureDrawer (`_layout.tsx:324-326`). Not a real screen. |

**Note on Tab 2c:** The parent-only schedule tab (`parent-schedule.tsx`) is only visible when the user has NO admin or coach roles. If a coach-parent user logs in, they see Tab 2b (Game Day) instead, and `parent-schedule` becomes a hidden tab. This means coach-parents lose their parent-specific RSVP-focused schedule view from the tab bar.

### Drawer Sections Visible to Parent

A parent user sees these sections when opening the GestureDrawer (`components/GestureDrawer.tsx`):

| Section | Role Gate | Items → Routes |
|---------|-----------|----------------|
| **Quick Access** | All roles | Home → `/(tabs)`, Schedule → `/(tabs)/schedule`, Chats → `/(tabs)/chats`, Announcements → `/(tabs)/messages`, Team Wall → `/(tabs)/connect` |
| **My Family** | `parent` only | My Children → `/my-kids`, Registration → `/parent-registration-hub`, Payments → `/family-payments`, Waivers → `/my-waivers`, Evaluations → `/my-stats`, Standings → `/standings`, Achievements → `/achievements`, Invite Friends → `/invite-friends` |
| **League & Community** | All roles | Team Wall → `/(tabs)/connect`, Standings → `/standings`, Achievements → `/achievements`, Coach Directory → `/coach-directory`, Find Organizations → `/org-directory` |
| **Settings & Privacy** | All roles | My Profile → `/profile`, Settings → `/(tabs)/settings`, Notifications → `/notification-preferences`, Season History → `/season-archives`, Privacy Policy → `/privacy-policy`, Terms of Service → `/terms-of-service` |
| **Help & Support** | All roles | Help Center → `/help`, Web Features → `/web-features`, Data Rights → `/data-rights` |

**Key issues with drawer for parents:**
1. **Quick Access → Schedule** routes to `/(tabs)/schedule` (line 81), which is a hidden tab containing the coach/admin schedule (`schedule.tsx`). Parents who use the drawer "Schedule" link land on a different schedule screen than the tab bar Schedule (which is `parent-schedule.tsx`). The coach/admin schedule has event creation features parents shouldn't see.
2. **Quick Access → Announcements** routes to `/(tabs)/messages` (line 83), which is an admin/coach broadcast tool. Parents land on a screen designed for sending announcements, not reading them.
3. **My Family → Evaluations** routes to `/my-stats` (line 168), which is labeled "MY STATS" on screen. The drawer says "Evaluations" but the destination is a stats screen. Naming mismatch — the user expects evaluations/report cards but gets an ESPN-style stat dashboard.

### Home Dashboard Cards/Actions (ParentHomeScroll)

The parent home dashboard is built from multiple sub-components. Each can generate navigation actions:

| Card/Widget | Component | Action | Destination | Code Reference |
|-------------|-----------|--------|-------------|----------------|
| Notification bell (compact header) | `ParentHomeScroll` | Tap bell icon | `/notification` | `ParentHomeScroll.tsx:345` |
| Notification bell (welcome section) | `ParentHomeScroll` | Tap bell icon | `/notification` | `ParentHomeScroll.tsx:419` |
| Dynamic mascot message | `ParentHomeScroll` | Tap message | Dynamic route (RSVP/payment/chat) | `ParentHomeScroll.tsx:440` |
| Attention banner items | `AttentionBanner` | Tap attention item | Dynamic: `/(tabs)/parent-schedule`, `/family-payments`, `/child-detail?playerId=X`, `/my-waivers` | `AttentionBanner.tsx:90,110` — routes from `useParentHomeData` (lines 541, 549, 610, 618, 635, 662, 698) |
| Day strip calendar | `DayStripCalendar` | Tap date | `/(tabs)/parent-schedule?date={iso}` | `DayStripCalendar.tsx:56` |
| Billboard hero (next event) | `BillboardHero` | Tap event card | `/(tabs)/parent-schedule` | (conditional — depends on banner data) |
| Athlete card (single child) | `AthleteCard` / `AthleteCardV2` | Tap child card | `/child-detail?playerId={id}` | `AthleteCard.tsx:89,119` / `AthleteCardV2.tsx:43` |
| Family gallery link (single child) | `ParentHomeScroll` | Tap gallery | `/family-gallery` | `ParentHomeScroll.tsx:525` |
| Family gallery link (multi-child) | `ParentHomeScroll` | Tap gallery | `/family-gallery` | `ParentHomeScroll.tsx:552` |
| Metric: Team Record | `MetricGrid` | Tap | `/standings` | `MetricGrid.tsx:49` |
| Metric: Balance | `MetricGrid` | Tap | `/family-payments` | `MetricGrid.tsx:64` |
| Metric: Badges | `MetricGrid` | Tap | `/achievements?playerId={id}` | `MetricGrid.tsx:99` |
| Metric: Messages | `MetricGrid` | Tap | `/(tabs)/parent-chat` | `MetricGrid.tsx:124` |
| Team Hub preview | `TeamHubPreview` | Tap header / "See all" | `/(tabs)/parent-team-hub` | `TeamHubPreview.tsx:37,45` |
| Chat preview | `FlatChatPreview` | Tap | `/(tabs)/parent-chat` | `FlatChatPreview.tsx:23` |
| Season snapshot | `SeasonSnapshot` | Tap | `/standings` | `SeasonSnapshot.tsx:29` |
| Recent badges | `RecentBadges` | Tap "See All" | `/achievements?playerId={id}` or `/achievements` | `RecentBadges.tsx:69,83` |
| Evaluation card | `EvaluationCard` | Tap | `/child-detail?playerId={id}` | `EvaluationCard.tsx:118` |
| Incomplete profile card | `IncompleteProfileCard` | Tap "Complete" | `/complete-profile?playerId={id}&seasonId={id}` | `IncompleteProfileCard.tsx:62` |
| Registration card | `RegistrationCard` | Tap "Register" | `/register/{seasonId}` (single season) or `/registration-start` (multiple) | `RegistrationCard.tsx:66,68` |
| Registration status card | `RegistrationStatusCard` | (display only) | — | No navigation |
| Challenge verify card | `ChallengeVerifyCard` | Tap | `/challenges` | `ChallengeVerifyCard.tsx:133,143,184` |
| Trophy case widget | `TrophyCaseWidget` | Tap "See All" | `/achievements` | `ParentHomeScroll.tsx:700` |
| Also strip (more events) | `AlsoStrip` | Tap | `/(tabs)/parent-schedule` | `AlsoStrip.tsx:93` |
| Secondary events | `SecondaryEvents` | Tap "See all" | `/(tabs)/parent-schedule` | `SecondaryEvents.tsx:53` |
| Family panel (drawer) | `FamilyPanel` | Tap "Payments" | `/family-payments` | `FamilyPanel.tsx:188,209` |
| Family panel (drawer) | `FamilyPanel` | Tap "Registration" | `/parent-registration-hub` | `FamilyPanel.tsx:201` |

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

**Issues with notification deep links for parents:**
1. **`schedule` notification** → `/(tabs)/schedule` — same issue as drawer. Lands parent on coach/admin schedule, NOT parent-schedule.
2. **`payment` notification** → `/(tabs)/payments` — lands parent on the admin payment management screen, not the parent payment screen (`/family-payments`).
3. **`blast` notification** → `/(tabs)/messages` — lands parent on admin/coach announcement composer, not a read-only announcement inbox.
4. **`registration` notification** → `/registration-hub` — lands parent on ADMIN registration hub (approve/deny screen), not the parent registration hub (`/parent-registration-hub`).
5. **`game` / `game_reminder`** → `/game-prep` — lands parent on coach game prep screen. Parents have no reason to access game prep tools.
6. **No deep link for RSVP** — when a parent receives a notification about an upcoming game requiring RSVP, there's no notification type that routes to `parent-schedule` where RSVP buttons are.

---

## Tasks

### TASK 1: View Home Dashboard
**What the user is trying to do:** See an overview of their family's schedule, payments, and child activity.
**Expected destination:** `ParentHomeScroll` component (rendered inside `app/(tabs)/index.tsx`)

#### Path A: App launch → Home — 0 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | App opens | Root layout | `app/_layout.tsx` | 71 | Auth check → `/(tabs)` redirect |
| 2 | Lands on Home tab | `DashboardRouter` | `components/DashboardRouter.tsx` | 142-143 | `hasKids \|\| isParent` → `'parent'` |
| 3 | Sees dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | Full parent home with hero, metrics, calendar, etc. |

**Status:** ✅ Correct
**Notes:** Auto-resolves to parent dashboard. If user is also a coach (`coach_parent` type), `DashboardRouter.tsx:138-139` routes to `CoachHomeScroll` instead — parent loses their parent-specific home. The parent home dashboard is only shown for pure-parent users or `devViewAs=parent`.

#### Path B: Tab bar → Home tab — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Any screen | Any | — | — | User is anywhere in the app |
| 2 | Tap "Home" tab | Tab bar | `app/(tabs)/_layout.tsx` | 207-222 | Tab 1 always visible |
| 3 | Lands on home | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |

**Status:** ✅ Correct

#### Path C: Drawer → Home — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | Opens GestureDrawer |
| 2 | Tap "Home" | Quick Access section | `components/GestureDrawer.tsx` | 80 | Route: `/(tabs)` |
| 3 | Lands on home | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |

**Status:** ✅ Correct

---

### TASK 2: RSVP to an Event
**What the user is trying to do:** Confirm or decline attendance for their child at an upcoming game or practice.
**Expected destination:** `app/(tabs)/parent-schedule.tsx` (RSVP buttons inline on event cards)

#### Path A: Tab bar → Schedule → RSVP — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Schedule" tab | Tab bar | `app/(tabs)/_layout.tsx` | 257-270 | Tab 2c — visible only for parent-only users |
| 2 | Find event, tap RSVP chip | RSVP buttons | `app/(tabs)/parent-schedule.tsx` | 689-706 | Inline RSVP chips per child (Yes/No/Maybe) |
| 3 | RSVP persisted | Supabase write | `app/(tabs)/parent-schedule.tsx` | 312-319 | Optimistic UI → upsert `event_rsvps` |

**Status:** ✅ Correct — but only for pure-parent users.
**Issue:** Coach-parent users do NOT see Tab 2c (`isParentOnly` is false at `_layout.tsx:260`). They see Tab 2b (Game Day / `gameday.tsx`) which does NOT have parent RSVP buttons. Coach-parents must use the drawer or home dashboard to reach parent-schedule — but the drawer "Schedule" routes to `/(tabs)/schedule` (coach version), not `parent-schedule`. **There is no direct path for a coach-parent to RSVP.**

#### Path B: Home dashboard → Attention banner → Schedule — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | Attention banner visible if unconfirmed RSVPs exist |
| 2 | Tap RSVP attention item | `AttentionBanner` | `components/parent-scroll/AttentionBanner.tsx` | 90 | Route from `useParentHomeData.ts:541,549` → `/(tabs)/parent-schedule` |
| 3 | Find event, tap RSVP | RSVP buttons | `app/(tabs)/parent-schedule.tsx` | 689-706 | |

**Status:** ⚠️ Friction — Conditional. Attention banner only appears when there are unconfirmed RSVPs. If user wants to RSVP proactively (before it becomes "overdue"), this path doesn't exist.

#### Path C: Home dashboard → Day strip calendar → Schedule — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap any date on day strip | `DayStripCalendar` | `components/parent-scroll/DayStripCalendar.tsx` | 56 | Route: `/(tabs)/parent-schedule?date={iso}` |
| 3 | See event, RSVP | RSVP buttons | `app/(tabs)/parent-schedule.tsx` | 689-706 | |

**Status:** ✅ Correct

#### Path D: Home dashboard → Also strip / Secondary events → Schedule — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (scroll down) | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap "See all" on events | `AlsoStrip` / `SecondaryEvents` | `components/parent-scroll/AlsoStrip.tsx:93` / `SecondaryEvents.tsx:53` | — | Route: `/(tabs)/parent-schedule` |
| 3 | Find event, RSVP | | `app/(tabs)/parent-schedule.tsx` | 689-706 | |

**Status:** ✅ Correct

#### Path E: Drawer → Schedule — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 2 | Tap "Schedule" (Quick Access) | GestureDrawer | `components/GestureDrawer.tsx` | 81 | Route: `/(tabs)/schedule` |
| 3 | Lands on... | `schedule.tsx` | `app/(tabs)/schedule.tsx` | — | **WRONG SCREEN** — coach/admin schedule with event creation |

**Status:** ❌ Wrong destination — Parent lands on coach/admin schedule instead of parent-schedule. No RSVP buttons. Has event creation features parents shouldn't see.

#### Path F: Notification deep link → Schedule — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap `schedule` notification | Deep link handler | `app/_layout.tsx` | 93-94 | Route: `/(tabs)/schedule` |
| 2 | Lands on... | `schedule.tsx` | `app/(tabs)/schedule.tsx` | — | **WRONG SCREEN** — same issue as Path E |

**Status:** ❌ Wrong destination — same problem. Parent lands on coach/admin schedule.

#### Missing Paths:
- No notification type routes to `parent-schedule` for RSVP reminders.
- Coach-parent users have no discoverable path to `parent-schedule`.

#### Screen Name Confusion:
- Drawer "Schedule" and notification "schedule" both route to `/(tabs)/schedule` (coach version). Parent-specific schedule is `/(tabs)/parent-schedule`. User has no way to know these are different screens.

---

### TASK 3: Check Upcoming Schedule
**What the user is trying to do:** See what games and practices are coming up for their child(ren).
**Expected destination:** `app/(tabs)/parent-schedule.tsx`

#### Path A: Tab bar → Schedule — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Schedule" tab | Tab bar | `app/(tabs)/_layout.tsx` | 257-270 | Tab 2c — parent-only |
| 2 | Lands on schedule | Parent schedule | `app/(tabs)/parent-schedule.tsx` | — | Week/month calendar with child filter tabs |

**Status:** ✅ Correct — but only for pure-parent users.

#### Path B: Home dashboard → Day strip → Schedule — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap date on day strip | `DayStripCalendar` | `components/parent-scroll/DayStripCalendar.tsx` | 56 | Route: `/(tabs)/parent-schedule?date={iso}` |
| 3 | Schedule with date pre-selected | | `app/(tabs)/parent-schedule.tsx` | — | |

**Status:** ✅ Correct

#### Path C: My Kids → Schedule quick action — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" → "My Children" | Drawer | `components/GestureDrawer.tsx` | 164 | Route: `/my-kids` |
| 2 | Lands on My Kids | My Kids | `app/my-kids.tsx` | — | |
| 3 | Tap "Schedule" quick action | Action button | `app/my-kids.tsx` | 360 | Route: `/(tabs)/schedule` |
| 4 | Lands on... | `schedule.tsx` | `app/(tabs)/schedule.tsx` | — | **WRONG SCREEN** — coach/admin schedule |

**Status:** ❌ Wrong destination — My Kids "Schedule" quick action routes to `/(tabs)/schedule` (coach version) at line 360, not `/(tabs)/parent-schedule`.

#### Path D: Drawer → Schedule — 2 taps
(Same as TASK 2 Path E — wrong destination)

**Status:** ❌ Wrong destination

---

### TASK 4: View Child's Stats / Evaluations
**What the user is trying to do:** See their child's game statistics, skill ratings, and coach evaluations.
**Expected destination:** `app/my-stats.tsx` (stats) or `app/child-detail.tsx` (combined profile)

#### Path A: Drawer → My Family → Evaluations — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 2 | Tap "Evaluations" (My Family) | GestureDrawer | `components/GestureDrawer.tsx` | 168 | Route: `/my-stats` |
| 3 | Lands on stats | MY STATS screen | `app/my-stats.tsx` | — | Auto-resolves child via `parent_account_id` (line 168) or `player_guardians` (line 183) |

**Status:** ⚠️ Friction — Screen title says "MY STATS" but drawer item says "Evaluations." User expects coach evaluation reports but gets a sports statistics dashboard. Skill ratings and evaluations ARE included (lines 279-293) but they're at the bottom of a long scroll — the primary content is game stats. **Multi-child issue:** If parent has multiple children, `my-stats.tsx` auto-selects the first child found (line 168-203, limit 1). No child picker. Parent cannot switch between children's stats without navigating away and back.

#### Path B: Home dashboard → Athlete card → Child detail → (stats visible) — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap child's athlete card | `AthleteCard` / `AthleteCardV2` | `components/parent-scroll/AthleteCard.tsx:89` / `AthleteCardV2.tsx:43` | — | Route: `/child-detail?playerId={id}` |
| 3 | Lands on child detail | Child Detail | `app/child-detail.tsx` | — | Shows stats, achievements, schedule, etc. |

**Status:** ✅ Correct — Child detail has season stats (line 196), upcoming games (line 241), recent games (line 253), and achievements (line 215). This is actually a better destination for "see my child's info" than my-stats.

#### Path C: Home → Evaluation card → Child detail — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | Evaluation card visible when new evals exist |
| 2 | Tap evaluation card | `EvaluationCard` | `components/parent-scroll/EvaluationCard.tsx` | 118 | Route: `/child-detail?playerId={id}` |
| 3 | Lands on child detail | | `app/child-detail.tsx` | — | Conditional — only visible when evaluations exist |

**Status:** ⚠️ Friction — Conditional visibility. Evaluation card only appears on home dashboard when new evaluations exist for the child. Not a persistent path.

#### Path D: My Kids → (no stats link) — Dead end
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Drawer → "My Children" | GestureDrawer | `components/GestureDrawer.tsx` | 164 | Route: `/my-kids` |
| 2 | Lands on My Kids | | `app/my-kids.tsx` | — | Shows children list with payments and events |
| 3 | **No tap target for stats** | | | | My Kids has no link to `my-stats` or `child-detail` |

**Status:** 🚫 Dead end — `my-kids.tsx` shows children but has no "View Stats" or "View Detail" action. Quick actions are: Schedule (`/(tabs)/schedule` — wrong), Chat (`/(tabs)/chats`), Pay Now (`/family-payments`). No route to `child-detail` or `my-stats` from this screen.

#### Path E: Parent My Stuff → Child card → Child detail — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | (Navigate to parent-my-stuff via hidden tab) | | `app/(tabs)/parent-my-stuff.tsx` | — | No discoverable entry point in tab bar or drawer for pure parents |
| 2 | Tap child card | Child row | `app/(tabs)/parent-my-stuff.tsx` | 383 | Route: `/child-detail?playerId={id}` |
| 3 | Lands on child detail | | `app/child-detail.tsx` | — | |

**Status:** ⚠️ Friction — `parent-my-stuff` is a hidden tab with no drawer entry for parents. Only reachable if the user somehow navigates to `/(tabs)/parent-my-stuff` directly. The drawer "My Stuff" section (id: `player`) is player-only, not parent.

#### Missing Paths:
- No "View Stats" action on the My Kids screen.
- `my-stats.tsx` has no child picker for multi-child parents.
- `parent-my-stuff.tsx` has a rich parent dashboard but no way to navigate there from drawer or tab bar.

---

### TASK 5: View Child's Player Card / Trading Card
**What the user is trying to do:** See the FIFA/trading card style view of their child with stats and OVR rating.
**Expected destination:** `app/player-card.tsx`

#### Path A: Standings → Tap player → Player card — 3+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Drawer → "Standings" (My Family or League) | GestureDrawer | `components/GestureDrawer.tsx` | 169 or 201 | Route: `/standings` |
| 2 | Switch to "Leaderboard" tab | | `app/standings.tsx` | — | Second tab in standings |
| 3 | Tap child's name in leaderboard | Player row | `app/standings.tsx` | 279 | Route: `/player-card?playerId={id}` |
| 4 | Lands on player card | Player Card | `app/player-card.tsx` | — | FIFA-style card with OVR, stats |

**Status:** ⚠️ Friction — Indirect. Must navigate to standings, switch tabs, find child in leaderboard, then tap. Child must have enough stats to appear in leaderboard rankings.

#### Path B: No direct drawer or home path — Missing
- Player card is NOT in the "My Family" drawer section.
- No athlete card on the home dashboard links to `/player-card` (they link to `/child-detail`).
- The drawer "My Player Card" item (`/player-card` at line 185) is in the **player-only** "My Stuff" section, gated by `roleGate: 'player'`. Parents cannot see it.

**Status:** 🔇 Missing path — No direct path to player-card for parents. The only path is through standings leaderboard, which requires the child to appear in leaderboard data. There is no "View Player Card" button on `child-detail.tsx` either.

#### Missing Paths:
- No "View Player Card" link on child-detail, my-kids, or home dashboard.
- Drawer "My Player Card" is player-only — parents can't see it.
- `player-card.tsx` auto-resolves player from `parent_account_id` (line 82) and `player_guardians` (line 91) if no `playerId` param, but there's no navigation path that would trigger this resolution for a parent.

#### Screen Name Confusion:
- `child-detail.tsx` shows player stats and profile but is NOT the "trading card" view. Parents who want the card-style presentation must find it through standings.
- `player-card.tsx` and `child-detail.tsx` show overlapping data (stats, jersey, team) in different presentations. Which one does the parent expect when they think "player card"?

---

### TASK 6: Pay Fees / View Payment Status
**What the user is trying to do:** See outstanding balances and make payments for their child's registration, uniforms, etc.
**Expected destination:** `app/family-payments.tsx` → `components/payments-parent.tsx`

#### Path A: Drawer → My Family → Payments — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 2 | Tap "Payments" (My Family) | GestureDrawer | `components/GestureDrawer.tsx` | 166 | Route: `/family-payments`, badge: `unpaidPaymentsParent` |
| 3 | Lands on parent payments | `ParentPaymentsScreen` | `components/payments-parent.tsx` | — | Shows fees by child, payment history, Stripe checkout |

**Status:** ✅ Correct — Badge shows unpaid count.

#### Path B: Home dashboard → Metric grid → Payments — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | Balance metric visible in grid |
| 2 | Tap "Balance" metric | `MetricGrid` | `components/parent-scroll/MetricGrid.tsx` | 64 | Route: `/family-payments` |
| 3 | Lands on payments | `ParentPaymentsScreen` | `components/payments-parent.tsx` | — | |

**Status:** ✅ Correct — Conditional on having a balance to display.

#### Path C: Home dashboard → Attention banner → Payments — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap payment attention item | `AttentionBanner` | `components/parent-scroll/AttentionBanner.tsx` | 90 | Route from `useParentHomeData.ts:610,618` → `/family-payments` |
| 3 | Lands on payments | | `components/payments-parent.tsx` | — | Conditional — only when unpaid balance exists |

**Status:** ✅ Correct — Conditional.

#### Path D: Home dashboard → Family panel → Payments — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Open family panel (swipe/tap) | `FamilyPanel` | `components/FamilyPanel.tsx` | — | Bottom sheet panel |
| 3 | Tap "Payments" | `FamilyPanel` | `components/FamilyPanel.tsx` | 188,209 | Route: `/family-payments` |

**Status:** ✅ Correct

#### Path E: My Kids → Pay Now — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Drawer → "My Children" | GestureDrawer | `components/GestureDrawer.tsx` | 164 | Route: `/my-kids` |
| 2 | Lands on My Kids | | `app/my-kids.tsx` | — | |
| 3 | Tap "Pay Now" | Balance card / quick action | `app/my-kids.tsx` | 242,377 | Route: `/family-payments` |

**Status:** ✅ Correct — Multiple pay buttons visible.

#### Path F: Notification deep link → Payments — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap `payment` notification | Deep link handler | `app/_layout.tsx` | 96-97 | Route: `/(tabs)/payments` |
| 2 | Lands on... | Admin payments | `app/(tabs)/payments.tsx` | — | **WRONG SCREEN** — admin payment management with verify/reject |

**Status:** ❌ Wrong destination — Notification routes parent to admin payment screen at `/(tabs)/payments`, not the parent payment screen at `/family-payments`.

---

### TASK 7: View Family Gallery / Photos
**What the user is trying to do:** See photos and info about their children in a swipeable gallery format.
**Expected destination:** `app/family-gallery.tsx` → `components/FamilyGallery.tsx`

#### Path A: Home dashboard → Gallery link (single child) — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap gallery area | Gallery action | `components/ParentHomeScroll.tsx` | 525 | Route: `/family-gallery` |
| 3 | Lands on gallery | `FamilyGallery` | `components/FamilyGallery.tsx` | — | Swipeable child pages with avatar, stats, team, next event, payments |

**Status:** ✅ Correct

#### Path B: Home dashboard → Gallery link (multi-child) — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap gallery row | Gallery action | `components/ParentHomeScroll.tsx` | 552 | Route: `/family-gallery` |
| 3 | Lands on gallery | `FamilyGallery` | `components/FamilyGallery.tsx` | — | Multi-child swipeable gallery |

**Status:** ✅ Correct

#### Outbound from FamilyGallery:
| Action | Destination | Code Reference |
|--------|-------------|----------------|
| "View Schedule" | `/(tabs)/parent-schedule` | `FamilyGallery.tsx:176` |
| "View Payments" | `/family-payments` | `FamilyGallery.tsx:184` |
| "Player Profile" | `/child-detail?playerId={id}` | `FamilyGallery.tsx:192` |
| Back | `router.back()` | `FamilyGallery.tsx:236` |

**Notes:** FamilyGallery has no entry in the drawer or tab bar. Only reachable from home dashboard. Single entry point — fragile.

---

### TASK 8: Access Team Wall / Team Hub
**What the user is trying to do:** See their child's team wall posts, roster, photos, and team activity.
**Expected destination:** `app/(tabs)/connect.tsx` → `TeamHubScreen` or `app/(tabs)/parent-team-hub.tsx` → `TeamHubScreen`

#### Path A: Drawer → Team Wall (Quick Access) — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 2 | Tap "Team Wall" (Quick Access) | GestureDrawer | `components/GestureDrawer.tsx` | 84 | Route: `/(tabs)/connect` |
| 3 | Resolves parent's teams | `connect.tsx` | `app/(tabs)/connect.tsx` | 91-121 | 3-source child resolution → team_players → teams |
| 4 | Renders TeamHubScreen | | `TeamHubScreen` component | — | Team wall, roster, stats tabs |

**Status:** ✅ Correct

#### Path B: Drawer → Team Wall (League & Community) — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Team Wall" (League & Community) | GestureDrawer | `components/GestureDrawer.tsx` | 200 | Route: `/(tabs)/connect` (same destination) |

**Status:** ✅ Correct — duplicate entry point, same destination.

#### Path C: Home dashboard → Team Hub preview — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (scroll to Team Hub section) | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap Team Hub preview header or "See All" | `TeamHubPreview` | `components/parent-scroll/TeamHubPreview.tsx` | 37,45 | Route: `/(tabs)/parent-team-hub` |
| 3 | Resolves parent's teams | `parent-team-hub.tsx` | `app/(tabs)/parent-team-hub.tsx` | 43-101 | Same 3-source resolution as connect.tsx |
| 4 | Renders TeamHubScreen | | `TeamHubScreen` component | — | |

**Status:** ✅ Correct

#### Screen Name Confusion:
- Drawer "Team Wall" routes to `connect.tsx`. Home dashboard "Team Hub" routes to `parent-team-hub.tsx`. Both render `TeamHubScreen` but resolve teams through different code paths. Two parallel implementations.
- `connect.tsx` (307 lines) does multi-role resolution. `parent-team-hub.tsx` (229 lines) does parent-only resolution. Both end at the same `TeamHubScreen` component.

---

### TASK 9: Open a Chat / Send a Message
**What the user is trying to do:** Read team chat messages or send a direct message to a coach or other parent.
**Expected destination:** `app/(tabs)/chats.tsx` (channel list) → `app/chat/[id].tsx` (chat room)

#### Path A: Tab bar → Chat — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "Chat" tab | Tab bar | `app/(tabs)/_layout.tsx` | 273-287 | Tab 3 — visible for all roles |
| 2 | Lands on chat list | `chats.tsx` | `app/(tabs)/chats.tsx` | — | Generic chat with channel list |
| 3 | Tap channel | Channel row | `app/(tabs)/chats.tsx` | 504 | Route: `/chat/[id]` |
| 4 | Lands in chat room | Chat room | `app/chat/[id].tsx` | — | Full messaging |

**Status:** ✅ Correct — but uses generic chat screen, not parent-specific.

#### Path B: Home dashboard → Chat preview — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap chat preview | `FlatChatPreview` | `components/parent-scroll/FlatChatPreview.tsx` | 23 | Route: `/(tabs)/parent-chat` |
| 3 | Lands on parent chat | Parent chat | `app/(tabs)/parent-chat.tsx` | — | Parent-specific chat list |
| 4 | Tap channel | Channel row | `app/(tabs)/parent-chat.tsx` | 491 | Route: `/chat/[id]` |

**Status:** ✅ Correct — routes to parent-specific chat (hidden tab).

#### Path C: Home dashboard → Metric grid → Chat — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap "Messages" metric | `MetricGrid` | `components/parent-scroll/MetricGrid.tsx` | 124 | Route: `/(tabs)/parent-chat` |
| 3 | Lands on parent chat | | `app/(tabs)/parent-chat.tsx` | — | |

**Status:** ✅ Correct

#### Path D: Drawer → Chats (Quick Access) — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Chats" | GestureDrawer | `components/GestureDrawer.tsx` | 82 | Route: `/(tabs)/chats` |
| 3 | Lands on generic chat | `chats.tsx` | `app/(tabs)/chats.tsx` | — | Generic chat — NOT parent-chat |

**Status:** ⚠️ Friction — Drawer "Chats" routes to the generic chat (`chats.tsx`) while home dashboard routes to parent-specific chat (`parent-chat.tsx`). Two different chat screens, subtly different features and styling. User sees different UI depending on entry point.

#### Path E: Notification deep link → Chat — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap `chat` notification | Deep link | `app/_layout.tsx` | 90-91 | Route: `/chat/{channelId}` or `/(tabs)/chats` |
| 2 | Lands in chat room (if channelId) or generic chat list | | `app/chat/[id].tsx` or `app/(tabs)/chats.tsx` | — | |

**Status:** ✅ Correct — goes directly to the right channel.

#### Screen Name Confusion:
- Tab bar "Chat" → `chats.tsx` (generic). Home dashboard "Chat" → `parent-chat.tsx` (parent-specific). Drawer "Chats" → `chats.tsx` (generic). Three entry points, two destinations. `parent-chat.tsx` has different styling and pinning features not in `chats.tsx`.

---

### TASK 10: View Notifications
**What the user is trying to do:** See all their in-app notifications and mark them as read.
**Expected destination:** `app/notification.tsx`

#### Path A: Home dashboard → Bell icon — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap bell icon (compact header) | Notification icon | `components/ParentHomeScroll.tsx` | 345 | Route: `/notification` |
| 3 | Lands on notifications | Notifications | `app/notification.tsx` | — | Feed with mark-all-read |

**Status:** ✅ Correct

#### Path B: Home dashboard → Welcome bell — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (at top, before scrolling) | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap bell icon (welcome section) | Notification icon | `components/ParentHomeScroll.tsx` | 419 | Route: `/notification` |

**Status:** ✅ Correct

#### Path C: Drawer → Notifications — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Notifications" (Settings & Privacy) | GestureDrawer | `components/GestureDrawer.tsx` | 216 | Route: `/notification-preferences` |
| 3 | Lands on... | Notification Preferences | `app/notification-preferences.tsx` | — | **WRONG SCREEN** — notification SETTINGS, not notification LIST |

**Status:** ❌ Wrong destination — Drawer "Notifications" routes to preferences/settings, not the notification feed. The notification list (`/notification`) has no drawer entry at all.

#### Missing Paths:
- No drawer entry for the notification feed (`/notification`). Only entry points are the bell icons on the home dashboard.
- If user navigates away from home and wants to check notifications, they must return to Home tab first.

---

### TASK 11: Register a Child for a Season
**What the user is trying to do:** Sign up their child for an upcoming season of their sport.
**Expected destination:** `app/parent-registration-hub.tsx` → `app/registration-start.tsx` → `app/register/[seasonId].tsx`

#### Path A: Drawer → My Family → Registration — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Registration" (My Family) | GestureDrawer | `components/GestureDrawer.tsx` | 165 | Route: `/parent-registration-hub` |
| 3 | Lands on parent reg hub | Parent Registration Hub | `app/parent-registration-hub.tsx` | — | Open seasons list + "My Registrations" tab |
| 4 | Tap season card | Season card | `app/parent-registration-hub.tsx` | 453 | Route: `/register/{seasonId}` |
| 5 | Registration wizard | 6-step form | `app/register/[seasonId].tsx` | — | Children → Player info → Guardian → Medical → Waivers → Review |

**Status:** ✅ Correct — full registration flow.

#### Path B: Home dashboard → Registration card — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | Registration card visible when open seasons exist |
| 2 | Tap "Register" button | `RegistrationCard` | `components/parent-scroll/RegistrationCard.tsx` | 66,68 | Single season → `/register/{seasonId}`, multiple → `/registration-start` |
| 3 | (If multiple seasons) Select season | Season selector | `app/registration-start.tsx` | 222 | Route: `/register/{seasonId}` |
| 4 | Registration wizard | | `app/register/[seasonId].tsx` | — | |

**Status:** ✅ Correct — smart routing based on season count.
**Note:** `registration-start.tsx` auto-redirects with `router.replace()` (line 107) if only one season — good UX, prevents back-stack clutter.

#### Path C: Home dashboard → Family panel → Registration — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Open family panel | `FamilyPanel` | `components/FamilyPanel.tsx` | — | Bottom sheet |
| 3 | Tap "Registration" | Action button | `components/FamilyPanel.tsx` | 201 | Route: `/parent-registration-hub` |

**Status:** ✅ Correct

#### Path D: Notification deep link → Registration — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap `registration` notification | Deep link | `app/_layout.tsx` | 102-103 | Route: `/registration-hub` |
| 2 | Lands on... | ADMIN Registration Hub | `app/registration-hub.tsx` | — | **WRONG SCREEN** — admin approve/deny interface |

**Status:** ❌ Wrong destination — Notification routes to admin registration hub, not parent registration hub.

---

### TASK 12: View Achievements / Badges
**What the user is trying to do:** See their child's earned achievements, badges, and trophy case.
**Expected destination:** `app/achievements.tsx`

#### Path A: Drawer → My Family → Achievements — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Achievements" (My Family) | GestureDrawer | `components/GestureDrawer.tsx` | 170 | Route: `/achievements` |
| 3 | Lands on Trophy Case | Achievements | `app/achievements.tsx` | — | Auto-resolves child via `parent_account_id` (line 234) or `player_guardians` (line 243) |

**Status:** ✅ Correct — auto-resolves player for parent context.

#### Path B: Drawer → League & Community → Achievements — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Achievements" (League & Community) | GestureDrawer | `components/GestureDrawer.tsx` | 202 | Route: `/achievements` (same destination) |

**Status:** ✅ Correct — duplicate entry, same destination.

#### Path C: Home dashboard → Trophy case widget — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (scroll down) | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap "See All" on trophy case | `TrophyCaseWidget` | `components/ParentHomeScroll.tsx` | 700 | Route: `/achievements` |

**Status:** ✅ Correct

#### Path D: Home dashboard → Metric grid → Badges — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap "Badges" metric | `MetricGrid` | `components/parent-scroll/MetricGrid.tsx` | 99 | Route: `/achievements?playerId={id}` |

**Status:** ✅ Correct — passes playerId for specific child.

#### Path E: Home dashboard → Recent badges → See All — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (scroll down) | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap "See All" on recent badges | `RecentBadges` | `components/parent-scroll/RecentBadges.tsx` | 69,83 | Route: `/achievements?playerId={id}` or `/achievements` |

**Status:** ✅ Correct

#### Path F: Child detail → Achievements — 3+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to child detail | (any path) | `app/child-detail.tsx` | — | |
| 2 | Scroll to achievements section | | | — | |
| 3 | Tap "View All Achievements" | Button | `app/child-detail.tsx` | 810 | Route: `/achievements` |

**Status:** ⚠️ Friction — note that `child-detail.tsx` navigates to `/achievements` WITHOUT passing `playerId`. The achievements screen must auto-resolve the player, and may pick a different child than the one being viewed on child-detail if there are multiple children.

---

### TASK 13: View Leaderboards / Standings
**What the user is trying to do:** See how their child's team ranks and how their child compares to peers.
**Expected destination:** `app/standings.tsx`

#### Path A: Drawer → My Family → Standings — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Standings" (My Family) | GestureDrawer | `components/GestureDrawer.tsx` | 169 | Route: `/standings` |
| 3 | Lands on standings | "STANDINGS" | `app/standings.tsx` | — | Team standings tab + Player leaderboard tab |

**Status:** ✅ Correct — Highlights parent's child's team. Child highlighting via `parent_account_id` (line 197) and `player_guardians` (line 210).

#### Path B: Drawer → League & Community → Standings — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Standings" (League & Community) | GestureDrawer | `components/GestureDrawer.tsx` | 201 | Route: `/standings` (same) |

**Status:** ✅ Correct — duplicate entry.

#### Path C: Home dashboard → Metric grid → Team Record — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap "Team Record" metric | `MetricGrid` | `components/parent-scroll/MetricGrid.tsx` | 49 | Route: `/standings` |

**Status:** ✅ Correct

#### Path D: Home dashboard → Season snapshot — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard (scroll down) | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap season snapshot widget | `SeasonSnapshot` | `components/parent-scroll/SeasonSnapshot.tsx` | 29 | Route: `/standings` |

**Status:** ✅ Correct

#### Outbound from standings:
- Tap player in leaderboard → `/player-card?playerId={id}` (`standings.tsx:279`)

---

### TASK 14: Switch Between Multiple Children
**What the user is trying to do:** Change which child's data they're viewing when they have 2+ children registered.
**Expected destination:** No single destination — this is a cross-cutting concern.

#### Mechanism A: Home dashboard child cards — passive
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard shows athlete cards for ALL children | `AthleteCard` / `AthleteCardV2` | `components/parent-scroll/AthleteCard.tsx:89` / `AthleteCardV2.tsx:43` | — | Each card links to `/child-detail?playerId={id}` |
| 2 | Tap specific child | Card tap | | — | Navigates to that child's detail |

**Status:** ✅ Correct — home dashboard is multi-child aware. Each child gets their own card.

#### Mechanism B: Family Gallery swipe — active
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to `/family-gallery` | | `components/FamilyGallery.tsx` | — | |
| 2 | Swipe left/right between children | Swipeable gallery | `components/FamilyGallery.tsx` | — | One page per child |

**Status:** ✅ Correct

#### Mechanism C: Parent schedule child tabs — active
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to parent-schedule | | `app/(tabs)/parent-schedule.tsx` | — | |
| 2 | Tap child filter tab | Team/child tabs | `app/(tabs)/parent-schedule.tsx` | — | Filter by team (which corresponds to child) |

**Status:** ✅ Correct — tabs filter by team, implicitly by child.

#### ❌ Missing: my-stats.tsx child picker
**Issue:** `my-stats.tsx` auto-selects the first child found (line 168, `limit(1)`). When parent has multiple children, there is no picker, no tabs, no way to switch. The parent sees stats for whichever child the query returns first. To see another child's stats, the parent must navigate to `child-detail` for that specific child — but `child-detail` doesn't link to `my-stats` either.

#### ❌ Missing: achievements.tsx child picker
**Issue:** `achievements.tsx` auto-resolves to one child when accessed without `playerId` param (line 234, takes first result). Some home dashboard paths pass `playerId` (MetricGrid, RecentBadges) but the drawer "Achievements" entry does NOT. Multi-child parents see achievements for one arbitrary child.

#### ❌ Missing: my-waivers.tsx child picker
**Note:** `my-waivers.tsx` shows waivers for ALL children (resolved via 3-source pattern). This actually works correctly for multi-child — no switching needed.

---

### TASK 15: View Waivers
**What the user is trying to do:** See which waivers they've signed and what's still required for their children.
**Expected destination:** `app/my-waivers.tsx`

#### Path A: Drawer → My Family → Waivers — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Waivers" (My Family) | GestureDrawer | `components/GestureDrawer.tsx` | 167 | Route: `/my-waivers`, badge: `unsignedWaivers` |
| 3 | Lands on My Waivers | "My Waivers" | `app/my-waivers.tsx` | — | Shows all children's waivers |

**Status:** ✅ Correct — badge shows unsigned count.

#### Path B: Home dashboard → Attention banner → Waivers — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | |
| 2 | Tap waiver attention item | `AttentionBanner` | `components/parent-scroll/AttentionBanner.tsx` | 90 | Route from `useParentHomeData.ts:662` → `/my-waivers` |

**Status:** ⚠️ Friction — Conditional. Only appears when unsigned waivers exist.

#### Missing Paths:
- No waiver link from `child-detail.tsx`. Parent viewing a specific child's profile cannot navigate to that child's waivers.

---

### TASK 16: Edit Profile
**What the user is trying to do:** Update their name, phone, emergency contacts, avatar, or password.
**Expected destination:** `app/profile.tsx`

#### Path A: Drawer → Settings & Privacy → My Profile — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "My Profile" (Settings & Privacy) | GestureDrawer | `components/GestureDrawer.tsx` | 214 | Route: `/profile` |
| 3 | Lands on profile | "My Profile" | `app/profile.tsx` | — | Avatar, name, phone, emergency contact, password, data rights link |

**Status:** ✅ Correct

#### Path B: Drawer profile header — 1 tap (from drawer)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab (drawer opens) | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap avatar/name area at top of drawer | Profile header | `components/GestureDrawer.tsx` | — | Route: `/profile` (if profile header is tappable) |

**Status:** ⚠️ Friction — depends on whether the drawer profile header links to `/profile`. Needs runtime verification.

#### Outbound from profile:
- Data Rights → `/data-rights` (`profile.tsx:414`)
- Back → `router.back()` (`profile.tsx:258`)

---

### TASK 17: Access Settings
**What the user is trying to do:** Change app settings like theme, notification preferences, or view legal docs.
**Expected destination:** `app/(tabs)/settings.tsx`

#### Path A: Drawer → Settings & Privacy → Settings — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Settings" (Settings & Privacy) | GestureDrawer | `components/GestureDrawer.tsx` | 215 | Route: `/(tabs)/settings` |
| 3 | Lands on settings | "Settings" | `app/(tabs)/settings.tsx` | — | Theme, dev mode, org info, legal links |

**Status:** ✅ Correct

#### Outbound from settings:
- Privacy Policy → `/privacy-policy` (`settings.tsx:369`)
- Terms of Service → `/terms-of-service` (`settings.tsx:376`)

**Note:** Settings screen has admin-only features (user management, org info) that are visible to parents but non-functional. These sections conditionally render based on role.

---

### TASK 18: Invite Friends
**What the user is trying to do:** Share a link to invite other families to join the organization.
**Expected destination:** `app/invite-friends.tsx`

#### Path A: Drawer → My Family → Invite Friends — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Invite Friends" (My Family) | GestureDrawer | `components/GestureDrawer.tsx` | 171 | Route: `/invite-friends` |
| 3 | Lands on Invite Friends | "Invite Friends" | `app/invite-friends.tsx` | — | Share via SMS, WhatsApp, Email, clipboard |

**Status:** ✅ Correct

**Notes:** Dead-end screen — only `router.back()` (line 98) for navigation out. This is appropriate for an informational/action screen.

---

### TASK 19: View Game Results / Recap
**What the user is trying to do:** See the outcome, scores, and player stats from a completed game.
**Expected destination:** `app/game-results.tsx` or `app/game-recap.tsx`

#### Path A: my-stats → Game history row — 3+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to my-stats (Drawer → My Family → Evaluations) | GestureDrawer | `components/GestureDrawer.tsx` | 168 | Route: `/my-stats` |
| 2 | Scroll to game-by-game history | | `app/my-stats.tsx` | — | Past games listed |
| 3 | Tap game row | Game history | `app/my-stats.tsx` | 593 | Route: `/game-results?eventId={id}` |
| 4 | Lands on game results | "Game Recap" | `app/game-results.tsx` | — | Set scores, player stats, sport-aware |

**Status:** ✅ Correct — child resolution via 3-source pattern (line 119-137).

#### Path B: child-detail → Recent game — 3+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to child-detail | (any path) | `app/child-detail.tsx` | — | |
| 2 | Scroll to "Recent Games" section | | | — | Shows recent completed games |
| 3 | Tap game row | Game card | | — | No outbound navigation to game-results. Games are displayed inline without a "View Details" link. |

**Status:** 🚫 Dead end — `child-detail.tsx` shows recent game results inline (lines 253-260) but has NO `router.push` to `/game-results` or `/game-recap`. Parent can see the score but cannot drill into full stats.

#### Missing Paths:
- No direct path to game results from home dashboard.
- No drawer entry for game results (Game Day section is `admin_coach` gated — `GestureDrawer.tsx:126`).
- `game-recap.tsx` (different screen) is only reachable via `/game-recap?eventId=X` but NO parent navigation path produces this route. It exists in the coach drawer only.
- Parent notification for `game` routes to `/game-prep` (coach screen), not game results.

#### Screen Name Confusion:
- Two game result screens exist: `game-results.tsx` (title "Game Recap") and `game-recap.tsx` (title "GAME RECAP"). Both show game data in different layouts. Parents can only reach `game-results.tsx` via my-stats; `game-recap.tsx` has no parent path at all.

---

### TASK 20: Complete a Child's Profile (Missing Fields)
**What the user is trying to do:** Fill in missing registration fields for their child (e.g., emergency contact, medical info).
**Expected destination:** `app/complete-profile.tsx`

#### Path A: Home dashboard → Incomplete profile card — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | Incomplete profile card visible when fields are missing |
| 2 | Tap "Complete" | `IncompleteProfileCard` | `components/parent-scroll/IncompleteProfileCard.tsx` | 62 | Route: `/complete-profile?playerId={id}&seasonId={id}` |
| 3 | Lands on form | "Complete Profile" | `app/complete-profile.tsx` | — | Shows only missing fields |

**Status:** ✅ Correct — conditional visibility. Only appears when `checkProfileCompleteness` detects missing fields.

#### Missing Paths:
- No way to reach `complete-profile` from `child-detail.tsx` or `my-kids.tsx`.
- If the home dashboard card disappears (fields completed), there's no way to re-access this screen.
- Single entry point — fragile.

---

### TASK 21: View Data Rights / Request Data Export or Deletion
**What the user is trying to do:** Review their children's data, request exports, or request deletion per GDPR/privacy rights.
**Expected destination:** `app/data-rights.tsx`

#### Path A: Drawer → Help & Support → Data Rights — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Data Rights" (Help & Support) | GestureDrawer | `components/GestureDrawer.tsx` | 231 | Route: `/data-rights` |
| 3 | Lands on data rights | "Data Rights" | `app/data-rights.tsx` | — | Per-child data review, export request, deletion request |

**Status:** ✅ Correct — triple child resolution (guardian, parent_account_id, email).

#### Path B: Profile → Data Rights — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Drawer → "My Profile" | GestureDrawer | `components/GestureDrawer.tsx` | 214 | Route: `/profile` |
| 2 | Scroll to bottom of profile | | `app/profile.tsx` | — | |
| 3 | Tap "Data Rights" link | Button | `app/profile.tsx` | 414 | Route: `/data-rights` |

**Status:** ✅ Correct

---

### TASK 22: View Coach Directory
**What the user is trying to do:** See who the coaches are in their organization.
**Expected destination:** `app/coach-directory.tsx`

#### Path A: Drawer → League & Community → Coach Directory — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Coach Directory" (League & Community) | GestureDrawer | `components/GestureDrawer.tsx` | 203 | Route: `/coach-directory` |
| 3 | Lands on directory | "Coach Directory" | `app/coach-directory.tsx` | — | Lists coaches with search, filter, team assignments |

**Status:** ⚠️ Friction — `coach-directory.tsx` includes admin-level features: role assignment changes (`team_coaches` update at line 133, insert at line 135, delete at line 145). Parent accessing this screen can VIEW coaches but the screen doesn't guard its write operations by role. No explicit permission check for the role-change actions — relies on RLS.

---

### TASK 23: View Challenges (Parent Perspective)
**What the user is trying to do:** See what challenges their child is participating in and view progress.
**Expected destination:** `app/challenges.tsx`

#### Path A: Home dashboard → Challenge verify card — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Home dashboard | `ParentHomeScroll` | `components/ParentHomeScroll.tsx` | — | Challenge verify card visible when child has active challenges |
| 2 | Tap challenge card | `ChallengeVerifyCard` | `components/parent-scroll/ChallengeVerifyCard.tsx` | 133,143,184 | Route: `/challenges` |
| 3 | Lands on challenges | "Challenges" | `app/challenges.tsx` | — | Role-aware: parent sees read-only view of child's challenges |

**Status:** ⚠️ Friction — Conditional. Challenge card only appears when child has active challenges. No persistent path.

#### Path B: Notification deep link → Challenge — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap `challenge_*` notification | Deep link | `app/_layout.tsx` | 114-121 | Route: `/challenge-cta?challengeId={id}` or `/challenges` |
| 2 | Lands on CTA or list | Challenge CTA/List | `app/challenge-cta.tsx` or `app/challenges.tsx` | — | |

**Status:** ⚠️ Friction — `challenge-cta.tsx` is designed for players to accept challenges. Parent landing here sees an acceptance flow they can't act on (they're not the player).

#### Missing Paths:
- No drawer entry for challenges under "My Family." The "Achievements" entry is there (line 170) but not "Challenges."
- No path from `child-detail.tsx` to challenges.
- Parent must rely on home dashboard conditional card or notification deep link.

---

## AUDIT SUMMARY

### Overall Statistics
| Metric | Count |
|--------|-------|
| Total tasks audited | 23 |
| Tasks with at least one ✅ path | 22 |
| Tasks with ❌ wrong destination | 5 (Tasks 2, 3, 6, 10, 11) |
| Tasks with 🚫 dead end | 2 (Tasks 4, 19) |
| Tasks with 🔇 missing path | 1 (Task 5) |
| Tasks with ⚠️ friction only | 7 |

### Critical Issues (❌ Wrong Destination)

| # | Issue | Root Cause | Affected Paths |
|---|-------|-----------|----------------|
| 1 | **Drawer "Schedule" routes parent to coach/admin schedule** | `GestureDrawer.tsx:81` → `/(tabs)/schedule` instead of `/(tabs)/parent-schedule` | Tasks 2, 3 |
| 2 | **Notification `schedule` routes parent to coach/admin schedule** | `_layout.tsx:93-94` → `/(tabs)/schedule` | Task 2 |
| 3 | **Notification `payment` routes parent to admin payment screen** | `_layout.tsx:96-97` → `/(tabs)/payments` instead of `/family-payments` | Task 6 |
| 4 | **Notification `registration` routes parent to admin registration hub** | `_layout.tsx:102-103` → `/registration-hub` instead of `/parent-registration-hub` | Task 11 |
| 5 | **Notification `blast` routes parent to admin announcement composer** | `_layout.tsx:99-100` → `/(tabs)/messages` (write-mode, not read) | Entry points section |
| 6 | **Notification `game`/`game_reminder` routes parent to coach game prep** | `_layout.tsx:106-109` → `/game-prep` (coach tool) | Entry points section |
| 7 | **Drawer "Notifications" routes to preferences, not feed** | `GestureDrawer.tsx:216` → `/notification-preferences` instead of `/notification` | Task 10 |
| 8 | **My Kids "Schedule" quick action routes to coach schedule** | `my-kids.tsx:360` → `/(tabs)/schedule` instead of `/(tabs)/parent-schedule` | Task 3 |

### Data Consistency Issues

| # | Issue | Files Affected |
|---|-------|---------------|
| 1 | **game-recap.tsx uses incomplete child resolution** — only `parent_account_id`, missing `player_guardians` and `parent_email` fallbacks | `game-recap.tsx:174-185` vs `game-results.tsx:119-137` (correct 3-source) |
| 2 | **child-detail.tsx → achievements doesn't pass playerId** — multi-child parents may see wrong child's achievements | `child-detail.tsx:810` → `/achievements` (no param) |
| 3 | **my-stats.tsx has no child picker** — multi-child parents stuck on first child (limit 1) | `my-stats.tsx:168` |
| 4 | **my-kids.tsx only resolves via parent_account_id** — missing `player_guardians` and `parent_email` resolution | `my-kids.tsx:89` |
| 5 | **claim-account.tsx uses player_parents table** — different from all other screens that use `player_guardians` | `claim-account.tsx:47` |

### Navigation Architecture Issues

| # | Issue | Impact |
|---|-------|--------|
| 1 | **Parent-specific screens unreachable for coach-parents** — `parent-schedule`, `parent-chat`, `parent-my-stuff` are hidden tabs with no drawer entries for coach-parent users | Coach-parents lose RSVP, parent chat, parent dashboard |
| 2 | **parent-my-stuff.tsx is a rich parent dashboard with no entry point** — not in drawer, not in tab bar for parents | Orphaned screen with child cards, payment summary, waiver status |
| 3 | **Two chat screens with inconsistent entry points** — Tab bar → `chats.tsx`, Home dashboard → `parent-chat.tsx` | User sees different UI depending on how they navigate |
| 4 | **Two team hub screens with different code** — `connect.tsx` (drawer) vs `parent-team-hub.tsx` (home) both render `TeamHubScreen` via different resolution code | Maintenance risk |
| 5 | **Notification deep links not role-aware** — all notifications route to the same destination regardless of user role | Parents land on admin/coach screens |
| 6 | **FamilyGallery has single entry point** — only reachable from home dashboard athlete cards | If parent scrolls past it, no way back without returning to home |
| 7 | **Player card unreachable for parents** — the "My Player Card" drawer item is player-only; parents have no direct path to the trading card view | Task 5 |

