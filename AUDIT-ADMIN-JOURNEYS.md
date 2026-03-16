# LYNX MOBILE — ADMIN JOURNEY & TASK-PATH AUDIT
## Audit Date: 2026-03-12
## Role: Admin

---

## How To Read This Document

Each task below shows every way an Admin user can reach a destination or complete an action. Paths are listed from most natural/common to most obscure. Each step shows the screen, the action, the code file and line number, and the destination. Flags indicate friction, dead ends, wrong destinations, and missing paths.

Cross-reference screen names with AUDIT-GLOSSARY.md for detailed information about each screen.

**Note on scope:** Admins have access to ALL drawer sections (Admin Tools, Game Day, Coaching Tools, Quick Access, League & Community, Settings & Privacy, Help & Support). They can do everything a coach can, plus admin-specific operations. Tasks that overlap with coach are traced independently here because the paths and entry points differ for admin users.

---

## Navigation Entry Points Available to Admin

### Tab Bar

| Tab | Visible? | Route | Screen File | Notes |
|-----|----------|-------|-------------|-------|
| 1 — Home | Yes | `/(tabs)` | `index.tsx` → `DashboardRouter.tsx` → `AdminHomeScroll` | Role resolved at `DashboardRouter.tsx:126-128`: admin always gets `AdminHomeScroll` regardless of whether they also coach. |
| 2a — Manage | Yes (admin only) | `/(tabs)/manage` | `manage.tsx` | Visible when `showManageTab` is true (`_layout.tsx:228`). Only admins see this tab. |
| 3 — Chat | Yes | `/(tabs)/chats` | `chats.tsx` | Generic chat list for all roles. |
| 4 — More | Yes | — | `menu-placeholder.tsx` | Opens GestureDrawer (`_layout.tsx:324-326`). Not a real screen. |

**Note on Tab 2a vs 2b:** Admins always see the Manage tab. They NEVER see the Game Day tab (Tab 2b), even if they also coach teams. The `showManageTab` flag is true for admins, which hides Tab 2b (`_layout.tsx:244`: `href: (!showManageTab && !isParentOnly) ? undefined : null`).

**Hidden tabs accessible to admin** (not visible in tab bar but routable):
| Hidden Tab | Route | File | Notes |
|-----------|-------|------|-------|
| admin-schedule | `/(tabs)/admin-schedule` | `admin-schedule.tsx` → re-exports `coach-schedule.tsx` | `_layout.tsx:299` |
| admin-chat | `/(tabs)/admin-chat` | `admin-chat.tsx` → re-exports `coach-chat.tsx` | `_layout.tsx:300` |
| admin-teams | `/(tabs)/admin-teams` | `admin-teams.tsx` (823 lines, standalone) | `_layout.tsx:301` |
| admin-my-stuff | `/(tabs)/admin-my-stuff` | `admin-my-stuff.tsx` (873 lines, standalone) | `_layout.tsx:302` |
| players | `/(tabs)/players` | `players.tsx` (494 lines) | Player directory, shared |
| coaches | `/(tabs)/coaches` | `coaches.tsx` (283 lines) | Coach management, shared |
| payments | `/(tabs)/payments` | `payments.tsx` (2500 lines) | Payment administration |
| jersey-management | `/(tabs)/jersey-management` | `jersey-management.tsx` (563 lines) | Jersey tracking |
| reports-tab | `/(tabs)/reports-tab` | `reports-tab.tsx` → re-exports `ReportsScreen` | Reporting |

### Drawer Sections Visible to Admin

An admin user sees ALL sections when opening the GestureDrawer (`components/GestureDrawer.tsx`):

| Section | Role Gate | Items → Routes |
|---------|-----------|----------------|
| **Quick Access** | All roles | Home → `/(tabs)`, Schedule → `/(tabs)/schedule`, Chats → `/(tabs)/chats`, Announcements → `/(tabs)/messages`, Team Wall → `/(tabs)/connect` |
| **Admin Tools** | `admin` (lines 88-118) | Registration Hub → `/registration-hub`, User Management → `/users`, Payment Admin → `/(tabs)/payments`, Payment Reminders → `/payment-reminders`, Team Management → `/team-management`, Jersey Management → `/(tabs)/jersey-management`, Coach Directory → `/coach-directory`, Season Management → `/season-settings`, Season Setup Wizard → `/season-setup-wizard`, Reports & Analytics → `/(tabs)/reports-tab`, Admin Search → `/admin-search`, Org Directory → `/org-directory`, Season Archives → `/season-archives`, Blast Composer → `/blast-composer`, Blast History → `/blast-history`, Venue Manager → `/venue-manager`, Background Checks → `/coach-background-checks`, Volunteer Assignment → `/volunteer-assignment`, Form Builder → `/web-features` (web), Waiver Editor → `/web-features` (web), Payment Gateway → `/web-features` (web), Bulk Event Create → `/bulk-event-create`, Org Settings → `/org-settings` |
| **Game Day** | `admin_coach` (lines 120-135) | Game Day Command → `/game-day-command`, Game Prep → `/game-prep`, Lineup Builder → `/lineup-builder`, Attendance → `/attendance`, Game Results → `/game-results`, Game Recap → `/game-recap` |
| **Coaching Tools** | `admin_coach` (lines 136-155) | Player Evaluations → `/evaluation-session`, Challenges → `/coach-challenge-dashboard`, Challenge Library → `/challenge-library`, Player Goals → `/player-goals`, Blast Composer → `/blast-composer`, Blast History → `/blast-history`, Coach Availability → `/coach-availability`, Coach Profile → `/coach-profile`, My Teams → `/(tabs)/my-teams`, Roster → `/(tabs)/players` |
| **League & Community** | All roles | Team Wall → `/(tabs)/connect`, Standings → `/standings`, Achievements → `/achievements`, Coach Directory → `/coach-directory`, Find Organizations → `/org-directory` |
| **Settings & Privacy** | All roles | My Profile → `/profile`, Settings → `/(tabs)/settings`, Notifications → `/notification-preferences`, Season History → `/season-archives`, Privacy Policy → `/privacy-policy`, Terms of Service → `/terms-of-service` |
| **Help & Support** | All roles | Help Center → `/help`, Web Features → `/web-features`, Data Rights → `/data-rights` |

**Key issues with drawer for admin:**
1. **Duplicate entries** — `blast-composer`, `blast-history`, `coach-directory`, `org-directory`, `season-archives` each appear in multiple sections. Not harmful but adds clutter.
2. **Quick Access → Schedule** routes to `/(tabs)/schedule` (line 81), which is different from `/(tabs)/admin-schedule`. Admin gets the generic schedule, not their admin-schedule variant.
3. **Game Day / Coaching Tools sections** use `admin_coach` role gate. The drawer logic at lines 251-260 checks `effectiveRole` which includes `'admin'` in the `admin_coach` gate, so admins DO see these sections. However, many items (game-day-command, lineup-builder, attendance, etc.) require `teamId`/`eventId` params that are NOT passed from the drawer — causing param-less landings on destination screens.
4. **Form Builder, Waiver Editor, Payment Gateway** all route to `/web-features` — a redirect page telling users to use the web app. These are intentional web-only features, not broken.

### Home Dashboard Cards/Actions (AdminHomeScroll)

The admin home dashboard is built from multiple sub-components, each producing navigation actions:

| Card/Widget | Component | Action | Destination | Code Reference |
|-------------|-----------|--------|-------------|----------------|
| Search bar | `AdminHomeScroll` | Tap search | `/(tabs)/players` | `AdminHomeScroll.tsx:196` |
| Smart Queue — item tap | `SmartQueueCard` | Tap queue item | Dynamic: `/registration-hub`, `/(tabs)/payments`, `/(tabs)/admin-schedule`, `/(tabs)/jersey-management` | `SmartQueueCard.tsx:59` via `CATEGORY_ROUTES` (lines 20-26) |
| Smart Queue — "View More" | `AdminHomeScroll` | Tap "View more" | `/registration-hub` | `AdminHomeScroll.tsx:215` |
| Team health tile | `TeamHealthTiles` | Tap team tile | `/team-roster?teamId={id}` | `TeamHealthTiles.tsx:73` |
| Payment snapshot — Send Reminders | `PaymentSnapshot` | Tap "Send All Reminders" | `/payment-reminders` | `PaymentSnapshot.tsx:81` |
| Payment snapshot — View Details | `PaymentSnapshot` | Tap "View Details" | `/(tabs)/payments` | `PaymentSnapshot.tsx:88` |
| Quick action — Create Event | `QuickActionsGrid` | Tap tile | `/(tabs)/admin-schedule` | `QuickActionsGrid.tsx:31` |
| Quick action — Quick Schedule | `QuickActionsGrid` | Tap tile | `/bulk-event-create` | `QuickActionsGrid.tsx:32` |
| Quick action — Send Reminder | `QuickActionsGrid` | Tap tile | `/payment-reminders` | `QuickActionsGrid.tsx:33` |
| Quick action — Blast All | `QuickActionsGrid` | Tap tile | `/blast-composer` | `QuickActionsGrid.tsx:34` |
| Quick action — Add Player | `QuickActionsGrid` | Tap tile | `/registration-hub` | `QuickActionsGrid.tsx:35` |
| Quick action — Season Report | `QuickActionsGrid` | Tap tile | `/season-reports` | `QuickActionsGrid.tsx:36` |
| Coach section — View Directory | `CoachSection` | Tap link | `/coach-directory` | `CoachSection.tsx:27` |
| Upcoming events — View Calendar | `UpcomingEvents` | Tap link | `/(tabs)/admin-schedule` | `UpcomingEvents.tsx:71` |
| Upcoming events — Create Event (empty) | `UpcomingEvents` | Tap link | `/(tabs)/admin-schedule` | `UpcomingEvents.tsx:82` |
| Upcoming season — Start Setup | `AdminHomeScroll` | Tap "Start Setup" | `/season-setup-wizard` | `AdminHomeScroll.tsx:263` |
| Trophy case — See All | `TrophyCaseWidget` | Tap link | `/achievements` | `TrophyCaseWidget.tsx:76,91,103` |
| Achievement celebration — View All | `AchievementCelebrationModal` | Tap button | `/achievements` | `AdminHomeScroll.tsx:325` |

**Key issues with home dashboard:**
1. **Search bar** routes to `/(tabs)/players` which is the player directory — there is no universal admin search from home. The dedicated `/admin-search` is only reachable from drawer or manage tab.
2. **DayStripCalendar** is rendered but has no tap handler — it's display-only on admin home (unlike parent home where it filters events).

### Manage Tab (Command Center)

The Manage tab (`manage.tsx`) provides a structured admin command center with attention cards and categorized action tiles:

**Attention Cards (2x2 grid, lines 216-245):**
| Card | Count Source | Tap Destination | Route |
|------|-------------|-----------------|-------|
| Pending Registrations | `registrations` WHERE status='new' | Registration Hub | `/registration-hub` (line 222) |
| Unpaid Balances | `payments` WHERE paid=false | Payments | `/(tabs)/payments` (line 229) |
| Unrostered Players | `registrations` WHERE rostered_at IS NULL | Team Management | `/team-management` (line 236) |
| Pending Approvals | `profiles` WHERE pending_approval=true | User Management | `/users` (line 243) |

**Action Tiles (grouped, lines 254-296):**
| Section | Tiles → Routes |
|---------|----------------|
| People | Players → `/(tabs)/players`, Coaches → `/(tabs)/coaches`, Users → `/users`, Directory → `/org-directory` |
| Teams & Seasons | Teams → `/team-management`, Seasons → `/season-settings`, Archives → `/season-archives`, Setup Wizard → `/season-setup-wizard` |
| Money | Payments → `/(tabs)/payments`, Registration → `/registration-hub`, Reminders → `/payment-reminders` |
| Communication | Blasts → `/blast-composer`, Blast History → `/blast-history` |
| Data | Reports → `/(tabs)/reports-tab`, Jerseys → `/(tabs)/jersey-management`, Search → `/admin-search` |

**Additional navigation:**
- Org Snapshot section — display-only, no navigation (lines 385-420)
- Recent Activity — "View All Activity" → `/(tabs)/reports-tab` (line 445)

**Issues with Manage tab:**
1. **No access to Game Day tools** — admins who also coach cannot reach game-day-command, lineup-builder, etc. from the Manage tab. They must use the drawer.
2. **Non-admin guard** — line 310: `if (!isAdmin)` shows lock screen. Properly guarded.

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

**Issues with notification deep links for admin:**
1. **`schedule` notification** → `/(tabs)/schedule` — generic schedule, not `/(tabs)/admin-schedule`. Different screen with different features.
2. **`registration` notification** → `/registration-hub` — correct for admin, admin-guarded screen.
3. **`payment` notification** → `/(tabs)/payments` — correct for admin, properly role-checked.
4. **`game` / `game_reminder`** → `/game-prep` — valid for admin who also coaches, but uses legacy game-prep.tsx rather than newer game-prep-wizard.tsx.

---

## Tasks

### TASK 1: View Home Dashboard
**What the user is trying to do:** See an admin overview — queue items, team health, payment snapshot, upcoming events, and quick actions.
**Expected destination:** `AdminHomeScroll` component (rendered inside `app/(tabs)/index.tsx`)

#### Path A: App launch → Home — 0 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | App opens | Root layout | `app/_layout.tsx` | 71 | Auth check → `/(tabs)` redirect |
| 2 | Lands on Home tab | `DashboardRouter` | `components/DashboardRouter.tsx` | 126-128 | `isAdmin` check takes priority → always `AdminHomeScroll` |
| 3 | Sees dashboard | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | Full admin home: welcome briefing, queue, team health, payments, quick actions, upcoming events |

**Status:** ✅ Correct
**Notes:** Admin ALWAYS gets `AdminHomeScroll` even if they also coach teams. The `isAdmin` check at `DashboardRouter.tsx:126` is evaluated before the coach checks at lines 138-141. An admin who is also a coach never sees `CoachHomeScroll` from the home tab.

#### Path B: Tab bar → Home tab — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Home tab | Tab bar | `app/(tabs)/_layout.tsx` | 220 | First tab, always visible |
| 2 | Renders `AdminHomeScroll` | `DashboardRouter` | `components/DashboardRouter.tsx` | 126-128 | Same as Path A |

**Status:** ✅ Correct

#### Path C: Drawer → Home — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap "More" tab | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | Opens GestureDrawer |
| 2 | Tap "Home" | Drawer Quick Access | `components/GestureDrawer.tsx` | 77 | Routes to `/(tabs)` |

**Status:** ✅ Correct

---

### TASK 2: View Manage Tab (Command Center)
**What the user is trying to do:** Access the centralized admin command center with attention cards, action tiles, org snapshot, and activity feed.
**Expected destination:** `manage.tsx`

#### Path A: Tab bar → Manage — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | `app/(tabs)/_layout.tsx` | 228 | `href: showManageTab ? undefined : null` — only visible to admin |
| 2 | Renders Command Center | `ManageScreen` | `app/(tabs)/manage.tsx` | 81 | Full manage screen with attention cards, action grid, snapshot, activity |

**Status:** ✅ Correct
**Notes:** Non-admins see a lock screen if they somehow reach this route (line 310-318). Title says "Command Center" (line 335).

---

### TASK 3: Manage Registrations
**What the user is trying to do:** View, approve, or deny player registrations for the current season.
**Expected destination:** `registration-hub.tsx`

#### Path A: Home → Smart Queue → Registration item — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | Queue items visible |
| 2 | Tap registration queue item | `SmartQueueCard` | `components/admin-scroll/SmartQueueCard.tsx` | 59 | Routes via `CATEGORY_ROUTES.registration` → `/registration-hub` |
| 3 | Lands on Registration Hub | `RegistrationHub` | `app/registration-hub.tsx` | — | Full registration management |

**Status:** ✅ Correct

#### Path B: Home → "View More" queue link — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap "View more" below queue | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | 215 | Routes to `/registration-hub` |

**Status:** ✅ Correct

#### Path C: Home → Quick Actions → Add Player — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap "Add Player" tile | `QuickActionsGrid` | `components/admin-scroll/QuickActionsGrid.tsx` | 35 | Routes to `/registration-hub` |

**Status:** ✅ Correct

#### Path D: Manage tab → Pending Registrations attention card — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | `app/(tabs)/_layout.tsx` | 228 | |
| 2 | Tap "Pending Registrations" card | `ManageScreen` | `app/(tabs)/manage.tsx` | 222,347 | Routes to `/registration-hub` |

**Status:** ✅ Correct

#### Path E: Manage tab → Money section → Registration tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to Money section | `ManageScreen` | `app/(tabs)/manage.tsx` | 273-279 | |
| 3 | Tap "Registration" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 277 | Routes to `/registration-hub` |

**Status:** ✅ Correct

#### Path F: Drawer → Admin Tools → Registration Hub — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | `app/(tabs)/_layout.tsx` | 324-326 | |
| 2 | Tap "Registration Hub" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 89 | Routes to `/registration-hub` |

**Status:** ✅ Correct

#### Path G: Admin My Stuff → Registration Hub row — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Navigate to admin-my-stuff (hidden tab) | Drawer | | | Route: `/(tabs)/admin-my-stuff` |
| 3 | Tap "Registration Hub" menu row | `AdminMyStuffScreen` | `app/(tabs)/admin-my-stuff.tsx` | 456 | Routes to `/registration-hub` |

**Status:** ✅ Correct

#### Path H: Notification deep link — 0 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap `registration` notification | `_layout.tsx` | `app/_layout.tsx` | 102-103 | Routes to `/registration-hub` |

**Status:** ✅ Correct

**Destination screen analysis (`registration-hub.tsx`, ~1200 lines):**
- Admin guard: `usePermissions()` → `isAdmin` (line 10). Duplicate guard at lines 176 and 986.
- No route params accepted.
- Queries 13+ Supabase tables: `sports`, `seasons`, `players`, `registrations`, `payments`, `team_players`, `teams`, `waiver_templates`, `waiver_signatures`, `season_fees`, `schedule_events`, `team_coaches`, `coaches`, `event_rsvps`.
- Only navigation: `router.back()` at lines 184, 990.
- **Issue: Duplicate role guard** — role check appears both before hooks (line 176) and after hooks (line 986). The early guard could cause conditional hook execution.

---

### TASK 4: Review & Manage Payments
**What the user is trying to do:** View payment status across all players, mark payments as paid/verified, manage installments.
**Expected destination:** `payments.tsx` (hidden tab)

#### Path A: Manage tab → Unpaid Balances attention card — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | `app/(tabs)/_layout.tsx` | 228 | |
| 2 | Tap "Unpaid Balances" card | `ManageScreen` | `app/(tabs)/manage.tsx` | 229,347 | Routes to `/(tabs)/payments` |

**Status:** ✅ Correct

#### Path B: Home → Payment Snapshot → View Details — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap "View Details" on payment card | `PaymentSnapshot` | `components/admin-scroll/PaymentSnapshot.tsx` | 88 | Routes to `/(tabs)/payments` |

**Status:** ✅ Correct

#### Path C: Home → Smart Queue → Payment item — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap payment queue item | `SmartQueueCard` | `components/admin-scroll/SmartQueueCard.tsx` | 59 | `CATEGORY_ROUTES.payment` → `/(tabs)/payments` |

**Status:** ✅ Correct

#### Path D: Manage tab → Money section → Payments tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | | | | |
| 2 | Scroll to Money section | `ManageScreen` | `app/(tabs)/manage.tsx` | 273-279 | |
| 3 | Tap "Payments" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 276 | Routes to `/(tabs)/payments` |

**Status:** ✅ Correct

#### Path E: Admin My Stuff → Financials card — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to admin-my-stuff | Drawer/route | `app/(tabs)/admin-my-stuff.tsx` | — | |
| 2 | Tap Financials card | `AdminMyStuffScreen` | `app/(tabs)/admin-my-stuff.tsx` | 584 | Routes to `/(tabs)/payments` |

**Status:** ✅ Correct

#### Path F: Drawer → Admin Tools → Payment Admin — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Payment Admin" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 93 | Routes to `/(tabs)/payments` |

**Status:** ✅ Correct

#### Path G: Notification deep link — 0 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap `payment` notification | `_layout.tsx` | `app/_layout.tsx` | 96-97 | Routes to `/(tabs)/payments` |

**Status:** ✅ Correct

**Destination screen analysis (`payments.tsx`, ~2500 lines):**
- Permission checks: `isAdmin` and `isParent` from `usePermissions()` (line 101). Admin sees full management UI; parent sees limited view.
- No route params.
- Queries 12+ Supabase tables including `players`, `season_fees`, `payments`, `sports`, `families`, `payment_installments`.
- No forward navigation — this is a terminal screen. All operations (mark paid, verify, manage installments) are modal-based within the screen.
- **No dead ends for admin** — screen is fully functional.

---

### TASK 5: Manage Teams (View, Create, Roster Players)
**What the user is trying to do:** View all teams, create new teams, assign players to rosters, see team health/compliance.
**Expected destinations:** `admin-teams.tsx`, `team-management.tsx`

#### Path A: Manage tab → Unrostered Players attention card — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Tap "Unrostered Players" card | `ManageScreen` | `app/(tabs)/manage.tsx` | 236,347 | Routes to `/team-management` |

**Status:** ✅ Correct

#### Path B: Manage tab → Teams & Seasons → Teams tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | | | | |
| 2 | Scroll to Teams & Seasons | `ManageScreen` | `app/(tabs)/manage.tsx` | 264-271 | |
| 3 | Tap "Teams" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 267 | Routes to `/team-management` |

**Status:** ✅ Correct

#### Path C: Drawer → Admin Tools → Team Management — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Team Management" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 95 | Routes to `/team-management` |

**Status:** ✅ Correct

#### Path D: Home → Team Health Tile → Team Roster — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | | | |
| 2 | Tap team health tile | `TeamHealthTiles` | `components/admin-scroll/TeamHealthTiles.tsx` | 73 | Routes to `/team-roster?teamId={id}` |

**Status:** ⚠️ Routes to `team-roster.tsx` (222 lines) NOT `team-management.tsx` (937 lines). `team-roster.tsx` is a read-only roster view with outbound nav to `/child-detail?playerId={id}`. Different screen, different purpose — the admin may expect to land on the management screen.

#### Path E: Season Reports → Admin Teams — 2+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to season-reports | Various | `app/season-reports.tsx` | — | |
| 2 | Tap team-related report card | `SeasonReports` | `app/season-reports.tsx` | 231,260,276 | Routes to `/(tabs)/admin-teams` |

**Status:** ✅ Correct — routes to the admin-teams hidden tab.

**Destination screen analysis:**

**`team-management.tsx` (937 lines):**
- Admin guard: `usePermissions()` → `isAdmin` (line 59). Blocks non-admins (lines 63-76).
- No route params.
- Full CRUD: create teams, assign players, manage coaches, jersey integration.
- Outbound nav: `router.push('/(tabs)/jersey-management' as any)` (line 692) — **unsafe type cast**, `router.push('/(tabs)/teams')` (line 609).
- Queries 11 tables: `teams`, `age_groups`, `players`, `coaches`, `team_players`, `team_coaches`, `schedule_events`, `waiver_templates`, `waiver_signatures`, `chat_channels`, `channel_members`.
- **Issue:** Jersey management navigation at line 692 uses `as any` type cast and passes no context params.

**`admin-teams.tsx` (823 lines):**
- No permission check — any authenticated user can access.
- Full team management with create modal, quick-assign unrostered players.
- Outbound nav: `router.push('/(tabs)/players')` (line 357), `router.push({ pathname: '/team-wall', params: { teamId: team.id } })` (line 435).
- **Issue: Missing permission check** — no `isAdmin` guard on this screen despite being an admin-specific hidden tab.

---

### TASK 6: Manage Users
**What the user is trying to do:** View all users in the organization, approve pending users, change roles, suspend accounts.
**Expected destination:** `users.tsx`

#### Path A: Manage tab → Pending Approvals attention card — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Tap "Pending Approvals" card | `ManageScreen` | `app/(tabs)/manage.tsx` | 243,347 | Routes to `/users` |

**Status:** ✅ Correct

#### Path B: Manage tab → People section → Users tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | | | | |
| 2 | Scroll to People section | `ManageScreen` | `app/(tabs)/manage.tsx` | 254-262 | |
| 3 | Tap "Users" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 260 | Routes to `/users` |

**Status:** ✅ Correct

#### Path C: Drawer → Admin Tools → User Management — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "User Management" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 90 | Routes to `/users` |

**Status:** ✅ Correct

#### Path D: Admin Search → User result — 3+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to admin-search | Drawer/Manage | | | |
| 2 | Search for user | `AdminSearch` | `app/admin-search.tsx` | 164-168 | Searches `profiles` table |
| 3 | Tap user result | `AdminSearch` | `app/admin-search.tsx` | 179,195 | Routes to `/users` |

**Status:** ⚠️ Routes to user list, not directly to the specific user. No `userId` param is passed — the admin lands on the full user list and must find the user again.

**Destination screen analysis (`users.tsx`, ~850 lines):**
- Admin guard: `usePermissions()` → `isAdmin` (line 49). Blocks non-admins (lines 53-66).
- No route params — no deep linking support.
- Queries 4 tables: `profiles`, `user_roles`, `players`, `coaches`.
- Self-protection checks prevent changing own role (line 672) or suspending self (line 700).
- Only navigation: `router.back()` (line 454).
- **Issue: No deep linking** — cannot navigate to a specific user from search results or notifications.

---

### TASK 7: Manage Schedule / Create Events
**What the user is trying to do:** View the team calendar, create individual events or bulk-create multiple events across teams.
**Expected destinations:** `admin-schedule.tsx` (re-exports `coach-schedule.tsx`), `bulk-event-create.tsx`

#### Path A: Home → Quick Actions → Create Event — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap "Create Event" tile | `QuickActionsGrid` | `components/admin-scroll/QuickActionsGrid.tsx` | 31 | Routes to `/(tabs)/admin-schedule` |

**Status:** ✅ Correct

#### Path B: Home → Upcoming Events → View Calendar — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap "View Calendar" link | `UpcomingEvents` | `components/admin-scroll/UpcomingEvents.tsx` | 71 | Routes to `/(tabs)/admin-schedule` |

**Status:** ✅ Correct

#### Path C: Home → Upcoming Events → Create Event (empty state) — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap "Create Event" link | `UpcomingEvents` | `components/admin-scroll/UpcomingEvents.tsx` | 82 | Routes to `/(tabs)/admin-schedule` |

**Status:** ✅ Correct

#### Path D: Home → Quick Actions → Quick Schedule (bulk) — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap "Quick Schedule" tile | `QuickActionsGrid` | `components/admin-scroll/QuickActionsGrid.tsx` | 32 | Routes to `/bulk-event-create` |

**Status:** ✅ Correct

#### Path E: Home → Smart Queue → Schedule item — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap schedule queue item | `SmartQueueCard` | `components/admin-scroll/SmartQueueCard.tsx` | 59 | `CATEGORY_ROUTES.schedule` → `/(tabs)/admin-schedule` |

**Status:** ✅ Correct

#### Path F: Drawer → Admin Tools → Bulk Event Create — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Bulk Event Create" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 116 | Routes to `/bulk-event-create` |

**Status:** ✅ Correct

#### Path G: Drawer → Quick Access → Schedule — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Schedule" | Drawer Quick Access | `components/GestureDrawer.tsx` | 81 | Routes to `/(tabs)/schedule` |

**Status:** ⚠️ Routes to `/(tabs)/schedule` — the GENERIC schedule tab, NOT `/(tabs)/admin-schedule`. These are different screens. The admin lands on the parent/generic schedule view instead of the admin variant with event creation controls.

#### Path H: Notification deep link — 0 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap `schedule` notification | `_layout.tsx` | `app/_layout.tsx` | 93-94 | Routes to `/(tabs)/schedule` |

**Status:** ⚠️ Same issue as Path G — routes to generic schedule, not admin-schedule.

**Destination screen analysis:**

**`admin-schedule.tsx` (3 lines):** Re-exports `coach-schedule.tsx`. All actual logic is in `coach-schedule.tsx` (referenced in AUDIT-COACH-JOURNEYS.md Task 3). Supports event creation, team filtering, week/month views. Coach-schedule is itself somewhat orphaned from primary nav (see coach audit).

**`bulk-event-create.tsx` (875 lines):**
- **No permission check** — any authenticated user can access.
- No route params.
- Queries 3 tables: `teams`, `venues`, `schedule_events` (INSERT).
- Only navigation: `router.back()` at lines 287, 301.
- **Issue: No auth validation** — should verify admin role before allowing bulk event creation.
- Successful creation shows Alert then calls `router.back()` — no option to view created events.

---

### TASK 8: Manage Seasons
**What the user is trying to do:** Configure current season settings — name, dates, registration status, fee structure, age groups.
**Expected destination:** `season-settings.tsx`

#### Path A: Manage tab → Teams & Seasons → Seasons tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to Teams & Seasons | `ManageScreen` | `app/(tabs)/manage.tsx` | 264-271 | |
| 3 | Tap "Seasons" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 268 | Routes to `/season-settings` |

**Status:** ✅ Correct

#### Path B: Drawer → Admin Tools → Season Management — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Season Management" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 98 | Routes to `/season-settings` |

**Status:** ✅ Correct

#### Path C: Admin My Stuff → Season row — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to admin-my-stuff | Drawer/route | `app/(tabs)/admin-my-stuff.tsx` | — | |
| 2 | Tap any season row | `AdminMyStuffScreen` | `app/(tabs)/admin-my-stuff.tsx` | 314,473,488,503,529 | Calls `navigateToSeason()` → sets working season then routes to `/season-settings` |

**Status:** ✅ Correct
**Notes:** `navigateToSeason` at line 310-315 first calls `setWorkingSeason(fullSeason)` to switch context, then navigates to `/season-settings`. This is the only place in the app where a season switch + navigate happens atomically.

**Destination screen analysis (`season-settings.tsx`, 936 lines):**
- Admin guard: `usePermissions()` → `isAdmin` (line 81). Blocks non-admins (lines 86-99).
- No route params — season is determined from `useSeason()` context.
- Queries 5 tables: `seasons`, `sports`, `age_groups`, `teams`, `team_players`.
- Outbound nav: `router.push('/(tabs)/teams')` at lines 609, 645 — **routes to non-existent `/(tabs)/teams` tab**. The actual admin teams tab is `/(tabs)/admin-teams`. This navigation may fail silently or render wrong content.
- Multiple `router.back()` calls at lines 398, 430, 454.
- **Issue: Wrong outbound route** — `/(tabs)/teams` is not a registered route. Should be `/(tabs)/admin-teams` or `/team-management`.
- **Issue: Missing deps** in `useEffect` at line 176 — depends only on `workingSeason?.id` but `fetchData` uses `profile`, `workingSeason`, and `refreshSeasons`.

---

### TASK 9: Run Season Setup Wizard
**What the user is trying to do:** Create a new season with a guided multi-step wizard (name, sport, teams).
**Expected destination:** `season-setup-wizard.tsx`

#### Path A: Home → Upcoming Season banner → Start Setup — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | Banner visible when upcoming season detected |
| 2 | Tap "Start Setup" | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | 263 | Routes to `/season-setup-wizard` |

**Status:** ✅ Correct

#### Path B: Manage tab → Teams & Seasons → Setup Wizard tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to Teams & Seasons | `ManageScreen` | `app/(tabs)/manage.tsx` | 264-271 | |
| 3 | Tap "Setup Wizard" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 270 | Routes to `/season-setup-wizard` |

**Status:** ✅ Correct

#### Path C: Drawer → Admin Tools → Season Setup Wizard — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Season Setup Wizard" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 99 | Routes to `/season-setup-wizard` |

**Status:** ✅ Correct

**Destination screen analysis (`season-setup-wizard.tsx`, 993 lines):**
- **No permission check** — any authenticated user can create seasons. Should be admin-only.
- No route params.
- Multi-step wizard: Step 1 (name, sport, fee), Step 2 (create/select teams).
- Queries/inserts: `teams` SELECT (lines 89-93), `seasons` INSERT (lines 174-185), `teams` INSERT (lines 197-203).
- Only navigation: `router.back()` at lines 214, 262.
- **Issue: No role verification** — relies on screen being linked from admin-only contexts, but no guard prevents direct navigation.
- **Issue: Dead end after creation** — creates season and teams, then only offers `router.back()`. No option to navigate to the newly created season's settings or team management.

---

### TASK 10: Manage Jerseys
**What the user is trying to do:** Track jersey assignments, mark jersey orders, assign jerseys to players.
**Expected destination:** `jersey-management.tsx` (hidden tab)

#### Path A: Home → Smart Queue → Jersey item — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap jersey queue item | `SmartQueueCard` | `components/admin-scroll/SmartQueueCard.tsx` | 59 | `CATEGORY_ROUTES.jersey` → `/(tabs)/jersey-management` |

**Status:** ✅ Correct

#### Path B: Manage tab → Data section → Jerseys tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to Data section | `ManageScreen` | `app/(tabs)/manage.tsx` | 288-294 | |
| 3 | Tap "Jerseys" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 292 | Routes to `/(tabs)/jersey-management` |

**Status:** ✅ Correct

#### Path C: Drawer → Admin Tools → Jersey Management — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Jersey Management" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 96 | Routes to `/(tabs)/jersey-management` |

**Status:** ✅ Correct

#### Path D: Team Management → Jersey Management link — 3+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to team-management | Various | `app/team-management.tsx` | — | |
| 2 | Tap jersey management link | `TeamManagement` | `app/team-management.tsx` | 692 | `router.push('/(tabs)/jersey-management' as any)` — **unsafe cast** |

**Status:** ⚠️ Works but uses `as any` type cast indicating potential type mismatch. No context params passed (teamId, etc.).

**Destination screen analysis (`jersey-management.tsx`, 563 lines):**
- **No permission check** — only checks if user exists (`useAuth()` line 56), no role verification.
- No route params.
- Queries: `teams`, `v_jersey_status`, `v_jersey_alerts`, `jersey_assignments` UPDATE, `assign_jersey` RPC.
- No forward navigation — terminal screen with modal-based operations.
- **Issue: Missing role gate** — any authenticated user can view and modify jersey assignments.

---

### TASK 11: View Coach Directory
**What the user is trying to do:** Browse all coaches in the organization, view their details and team assignments.
**Expected destination:** `coach-directory.tsx`

#### Path A: Home → Coach Section → View Directory — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap "View Coach Directory" link | `CoachSection` | `components/admin-scroll/CoachSection.tsx` | 27 | Routes to `/coach-directory` |

**Status:** ✅ Correct

#### Path B: Drawer → Admin Tools → Coach Directory — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Coach Directory" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 97 | Routes to `/coach-directory` |

**Status:** ✅ Correct

#### Path C: Drawer → League & Community → Coach Directory — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Coach Directory" | Drawer League & Community | `components/GestureDrawer.tsx` | 164 | Routes to `/coach-directory` |

**Status:** ✅ Correct (duplicate path — same destination reached from two drawer sections)

#### Path D: Manage tab → People section → Coaches tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to People section | `ManageScreen` | `app/(tabs)/manage.tsx` | 254-262 | |
| 3 | Tap "Coaches" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 259 | Routes to `/(tabs)/coaches` |

**Status:** ⚠️ Routes to `/(tabs)/coaches` (hidden tab, 283 lines) — a DIFFERENT screen from `/coach-directory` (616 lines). `coaches.tsx` is a coach MANAGEMENT screen with create/edit modals; `coach-directory.tsx` is a read-only directory with search/filter. The Manage tab sends admin to the management variant, while home dashboard and drawer send to the directory variant. Inconsistent destination.

**Destination screen analysis (`coach-directory.tsx`, 616 lines):**
- No permission check — any authenticated user can browse.
- No route params.
- Queries 3 tables: `coaches`, `teams`, `team_coaches`.
- Only navigation: `router.back()` (line 196).
- Modal-only UI for viewing coach details — no forward navigation to coach profiles or team assignments.
- No pagination — loads all coaches in one query.

---

### TASK 12: Review Background Checks
**What the user is trying to do:** View background check status for all coaches in the organization.
**Expected destination:** `coach-background-checks.tsx`

#### Path A: Drawer → Admin Tools → Background Checks — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Background Checks" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 111 | Routes to `/coach-background-checks` |

**Status:** ✅ Correct
**Notes:** This is the ONLY path to reach background checks. Not available from home dashboard, manage tab, or any other entry point.

**Destination screen analysis (`coach-background-checks.tsx`, 653 lines):**
- **No permission check** — uses `useAuth()` for organization context but no role verification.
- No route params.
- Queries 3 tables: `teams` (lines 109-112), `team_coaches` (lines 123-126), `coaches` (lines 137-140).
- Only navigation: `router.back()` (line 289).
- **Issue: No auth validation** — any authenticated user can view coach background check data (sensitive information).
- **Issue: Single entry point** — only reachable from drawer. Could benefit from a link in coach-directory or coaches management screen.

---

### TASK 13: Manage Volunteers
**What the user is trying to do:** Assign volunteer roles to parents for events (snack duty, scorekeeping, etc.).
**Expected destination:** `volunteer-assignment.tsx`

#### Path A: Drawer → Admin Tools → Volunteer Assignment — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Volunteer Assignment" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 112 | Routes to `/volunteer-assignment` |

**Status:** ✅ Correct
**Notes:** This is the ONLY path. Not available from home dashboard, manage tab, or any other entry point. Same single-entry-point issue as background checks.

**Destination screen analysis:** Volunteer assignment screen is referenced in the drawer but requires separate verification of implementation. If it follows the same pattern as other admin screens, it likely has no permission check and limited outbound navigation.

---

### TASK 14: Send a Blast
**What the user is trying to do:** Compose and send a broadcast message (blast) to parents/families.
**Expected destination:** `blast-composer.tsx`

#### Path A: Home → Quick Actions → Blast All — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap "Blast All" tile | `QuickActionsGrid` | `components/admin-scroll/QuickActionsGrid.tsx` | 34 | Routes to `/blast-composer` |

**Status:** ✅ Correct

#### Path B: Manage tab → Communication → Blasts tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to Communication section | `ManageScreen` | `app/(tabs)/manage.tsx` | 281-286 | |
| 3 | Tap "Blasts" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 284 | Routes to `/blast-composer` |

**Status:** ✅ Correct

#### Path C: Drawer → Admin Tools → Blast Composer — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Blast Composer" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 108 | Routes to `/blast-composer` |

**Status:** ✅ Correct

#### Path D: Drawer → Coaching Tools → Blast Composer — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Blast Composer" | Drawer Coaching Tools | `components/GestureDrawer.tsx` | 147 | Routes to `/blast-composer` |

**Status:** ✅ Correct (duplicate entry — same destination from two drawer sections)

**Destination screen analysis (`blast-composer.tsx`, 735 lines):**
- Referenced in AUDIT-COACH-JOURNEYS.md Task 14.
- No admin-specific guard — accessible to coaches too (which is correct).
- Queries teams, players for recipient selection.
- Only navigation: `router.back()` after successful send.

---

### TASK 15: View Blast History
**What the user is trying to do:** Review previously sent blasts and their delivery status.
**Expected destination:** `blast-history.tsx`

#### Path A: Manage tab → Communication → Blast History tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to Communication section | `ManageScreen` | `app/(tabs)/manage.tsx` | 281-286 | |
| 3 | Tap "Blast History" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 285 | Routes to `/blast-history` |

**Status:** ✅ Correct

#### Path B: Drawer → Admin Tools → Blast History — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Blast History" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 109 | Routes to `/blast-history` |

**Status:** ✅ Correct

#### Path C: Drawer → Coaching Tools → Blast History — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Blast History" | Drawer Coaching Tools | `components/GestureDrawer.tsx` | 148 | Routes to `/blast-history` |

**Status:** ✅ Correct (duplicate entry)

**Destination screen analysis (`blast-history.tsx`, 519 lines):**
- Referenced in AUDIT-COACH-JOURNEYS.md Task 15.
- No route params. Only navigation: `router.back()`.
- Shows sent blasts with expandable detail view.

---

### TASK 16: View Reports & Analytics
**What the user is trying to do:** Access reporting dashboards with org-wide analytics.
**Expected destinations:** `reports-tab.tsx` (re-export), `season-reports.tsx`

#### Path A: Manage tab → Data → Reports tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to Data section | `ManageScreen` | `app/(tabs)/manage.tsx` | 288-294 | |
| 3 | Tap "Reports" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 291 | Routes to `/(tabs)/reports-tab` |

**Status:** ✅ Correct

#### Path B: Manage tab → Recent Activity → "View All Activity" — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to Recent Activity | `ManageScreen` | `app/(tabs)/manage.tsx` | 422-453 | |
| 3 | Tap "View All Activity" | `ManageScreen` | `app/(tabs)/manage.tsx` | 445 | Routes to `/(tabs)/reports-tab` |

**Status:** ✅ Correct

#### Path C: Drawer → Admin Tools → Reports & Analytics — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Reports & Analytics" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 100 | Routes to `/(tabs)/reports-tab` |

**Status:** ✅ Correct

#### Path D: Home → Quick Actions → Season Report — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap "Season Report" tile | `QuickActionsGrid` | `components/admin-scroll/QuickActionsGrid.tsx` | 36 | Routes to `/season-reports` |

**Status:** ✅ Correct — `/season-reports` file exists (384 lines, verified).

**Destination screen analysis:**

**`reports-tab.tsx` (3 lines):** Re-export wrapper. Delegates to `@/components/ReportsScreen`. No logic in the tab itself.

**`season-reports.tsx` (384 lines):**
- No explicit permission check — uses `profile?.current_organization_id` (line 55).
- No route params.
- Queries 8 tables: `players`, `teams`, `schedule_events`, `payments`, `registrations`, `team_players`, `waiver_templates`, `waiver_signatures`.
- Outbound nav: `/(tabs)/admin-schedule` (lines 201, 300), `/(tabs)/payments` (line 216), `/(tabs)/admin-teams` (lines 231, 260, 276), `/registration-hub` (line 246).
- **Issue: Three cards route to same destination** — `/(tabs)/admin-teams` used for team stats, coach stats, AND roster stats. Should differentiate or use params.

---

### TASK 17: Admin Search
**What the user is trying to do:** Search across all entity types (players, teams, events, users) in the organization.
**Expected destination:** `admin-search.tsx`

#### Path A: Manage tab → Data → Search tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to Data section | `ManageScreen` | `app/(tabs)/manage.tsx` | 288-294 | |
| 3 | Tap "Search" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 293 | Routes to `/admin-search` |

**Status:** ✅ Correct

#### Path B: Drawer → Admin Tools → Admin Search — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Admin Search" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 101 | Routes to `/admin-search` |

**Status:** ✅ Correct

**Destination screen analysis (`admin-search.tsx`, 451 lines):**
- **No permission check** — any authenticated user can search all entities.
- No route params.
- Queries 4 tables: `players` (line 97-101), `teams` (lines 119-124), `schedule_events` (lines 141-146), `profiles` (lines 164-168).
- Outbound nav (line 195): `router.push(result.route as any)` — dynamic route based on result type:
  - Players → `/child-detail?playerId=${id}` (line 112)
  - Teams → `/team-management` (line 135) — **no teamId param**
  - Events → `/(tabs)/schedule` (line 157) — **no eventId param, generic schedule not admin-schedule**
  - Users → `/users` (line 179) — **no userId param**
- **Issue: Missing search context** — team results route to `/team-management` without a team ID, losing the search context. Events route to generic `/(tabs)/schedule` instead of `/(tabs)/admin-schedule` and without an event ID. Users route to `/users` without highlighting the found user.
- **Issue: No role-based filtering** — search results show all entities regardless of admin's org scope. Should filter by `organization_id`.

---

### TASK 18: Edit Org Settings
**What the user is trying to do:** Update organization name, contact info, and description.
**Expected destination:** `org-settings.tsx`

#### Path A: Drawer → Admin Tools → Org Settings — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Org Settings" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 118 | Routes to `/org-settings` |

**Status:** ✅ Correct
**Notes:** This is the ONLY path to org settings. Not available from home dashboard or manage tab.

**Destination screen analysis (`org-settings.tsx`, 196 lines):**
- **No permission check** — any user with `current_organization_id` can edit org settings.
- No route params.
- Queries 1 table: `organizations` (SELECT at lines 47-51, UPDATE at lines 66-74).
- Outbound: `router.back()` (line 100), `Linking.openURL('https://thelynxapp.com')` (line 142) — external link.
- **Issue: No admin guard** — any authenticated user could potentially edit organization settings if they navigate directly to this route.
- **Issue: Single entry point** — only reachable from drawer Admin Tools section.

---

### TASK 19: Manage Venues
**What the user is trying to do:** Create and manage venue locations for scheduling events.
**Expected destination:** `venue-manager.tsx`

#### Path A: Drawer → Admin Tools → Venue Manager — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Venue Manager" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 110 | Routes to `/venue-manager` |

**Status:** 🚫 PLACEHOLDER
**Notes:** This is the ONLY path. Not available from home dashboard or manage tab.

**Destination screen analysis (`venue-manager.tsx`, 73 lines):**
- **Placeholder screen** — shows "Coming Soon" message with no functional implementation.
- No queries, no forms, no venue management functionality.
- Only navigation: `router.back()` (line 18).
- **Issue: Dead end** — user reaches a placeholder with no action available. Unlike other web-only features (Form Builder, Waiver Editor) which redirect to `/web-features` with a "use web app" message, the venue manager shows a generic "Coming Soon" with no web redirect.

---

### TASK 20: View Org Directory
**What the user is trying to do:** Browse other organizations in the platform.
**Expected destination:** `org-directory.tsx`

#### Path A: Manage tab → People section → Directory tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to People section | `ManageScreen` | `app/(tabs)/manage.tsx` | 254-262 | |
| 3 | Tap "Directory" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 261 | Routes to `/org-directory` |

**Status:** ✅ Correct

#### Path B: Drawer → Admin Tools → Org Directory — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Org Directory" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 103 | Routes to `/org-directory` |

**Status:** ✅ Correct

#### Path C: Drawer → League & Community → Find Organizations — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Find Organizations" | Drawer League & Community | `components/GestureDrawer.tsx` | 165 | Routes to `/org-directory` |

**Status:** ✅ Correct (duplicate entry from different drawer section)

#### Path D: Admin My Stuff → Org Directory row — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to admin-my-stuff | Drawer/route | `app/(tabs)/admin-my-stuff.tsx` | — | |
| 2 | Tap "Org Directory" menu row | `AdminMyStuffScreen` | `app/(tabs)/admin-my-stuff.tsx` | 438 | Routes to `/org-directory` |

**Status:** ✅ Correct

**Destination screen analysis (`org-directory.tsx`, 258 lines):**
- No permission check needed — this is a public directory (intentional).
- No route params.
- Queries `organizations` table (lines 67-71) — `is_active=true`.
- Only navigation: `router.back()` (line 153).
- Well-implemented with search/filter and detail view modal.

---

### TASK 21: Send Payment Reminders
**What the user is trying to do:** Select families with outstanding balances and send payment reminder notifications.
**Expected destination:** `payment-reminders.tsx`

#### Path A: Home → Payment Snapshot → Send All Reminders — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap "Send All Reminders" | `PaymentSnapshot` | `components/admin-scroll/PaymentSnapshot.tsx` | 81 | Routes to `/payment-reminders` |

**Status:** ✅ Correct

#### Path B: Home → Quick Actions → Send Reminder — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap "Send Reminder" tile | `QuickActionsGrid` | `components/admin-scroll/QuickActionsGrid.tsx` | 33 | Routes to `/payment-reminders` |

**Status:** ✅ Correct

#### Path C: Manage tab → Money → Reminders tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to Money section | `ManageScreen` | `app/(tabs)/manage.tsx` | 273-279 | |
| 3 | Tap "Reminders" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 278 | Routes to `/payment-reminders` |

**Status:** ✅ Correct

#### Path D: Drawer → Admin Tools → Payment Reminders — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Payment Reminders" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 94 | Routes to `/payment-reminders` |

**Status:** ✅ Correct

**Destination screen analysis (`payment-reminders.tsx`, 541 lines):**
- **Proper admin guard**: `usePermissions()` → `isAdmin` (line 46). Non-admins get access-denied screen (lines 51-64). Best-guarded admin screen in the app.
- No route params.
- Queries 2 tables: `players` (lines 79-82), `payments` (lines 87-91).
- Multiple `router.back()` calls at lines 59, 234, 248, 273.
- Well-implemented family grouping, selective sending, success feedback.

---

### TASK 22: View Season Archives
**What the user is trying to do:** Browse completed/archived seasons and review historical data.
**Expected destination:** `season-archives.tsx`

#### Path A: Manage tab → Teams & Seasons → Archives tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to Teams & Seasons | `ManageScreen` | `app/(tabs)/manage.tsx` | 264-271 | |
| 3 | Tap "Archives" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 269 | Routes to `/season-archives` |

**Status:** ✅ Correct

#### Path B: Drawer → Admin Tools → Season Archives — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Season Archives" | Drawer Admin Tools | `components/GestureDrawer.tsx` | 107 | Routes to `/season-archives` |

**Status:** ✅ Correct

#### Path C: Drawer → Settings & Privacy → Season History — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Season History" | Drawer Settings & Privacy | `components/GestureDrawer.tsx` | 172 | Routes to `/season-archives` |

**Status:** ✅ Correct (duplicate entry from different drawer section)

**Destination screen analysis (`season-archives.tsx`, 423 lines):**
- No explicit permission check.
- No route params.
- Queries 5 tables: `seasons`, `teams`, `team_players`, `payments`, `schedule_events`.
- Only navigation: `router.back()` (line 235).
- Expandable accordion UI — loads archive details inline, no forward navigation to archived season detail screens.

---

### TASK 23: View Player Directory
**What the user is trying to do:** Browse all players in the current season, search and filter by team.
**Expected destination:** `players.tsx` (hidden tab)

#### Path A: Home → Search bar — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | |
| 2 | Tap search bar | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | 196 | Routes to `/(tabs)/players` |

**Status:** ✅ Correct

#### Path B: Manage tab → People → Players tile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Manage tab | Tab bar | | | |
| 2 | Scroll to People section | `ManageScreen` | `app/(tabs)/manage.tsx` | 254-262 | |
| 3 | Tap "Players" tile | `ManageScreen` | `app/(tabs)/manage.tsx` | 258 | Routes to `/(tabs)/players` |

**Status:** ✅ Correct

#### Path C: Admin Teams → All Players card — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to admin-teams | Route | `app/(tabs)/admin-teams.tsx` | — | |
| 2 | Tap "All Players" card | `AdminTeamsScreen` | `app/(tabs)/admin-teams.tsx` | 357 | Routes to `/(tabs)/players` |

**Status:** ✅ Correct

#### Path D: Drawer → Coaching Tools → Roster — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Roster" | Drawer Coaching Tools | `components/GestureDrawer.tsx` | 155 | Routes to `/(tabs)/players` |

**Status:** ✅ Correct

**Destination screen analysis (`players.tsx`, 494 lines):**
- Permission checks: `isAdmin` and `isCoach` from `usePermissions()` (line 41). Admin sees "Add Player" button (line 307).
- No route params.
- Queries 3 tables: `teams` (lines 69-73), `players` (lines 86-90), `team_players` (lines 99-101).
- No forward navigation — terminal screen.
- **Issue: N+1 query** — `team_players` query at lines 99-101 has NO WHERE clause, fetching ALL team_players in the database. Should filter by season/team.
- **Issue: Incomplete "Add Player" flow** — modal says "Use the public registration form" but button at line 432 just closes modal with no actual navigation to registration.

---

### TASK 24: View Admin My Stuff (Profile, Settings, Seasons, Invites)
**What the user is trying to do:** Access their profile, manage organization settings, view seasons, pending invites, financials, and app settings.
**Expected destination:** `admin-my-stuff.tsx` (hidden tab)

#### Path A: Drawer → Settings & Privacy → Settings — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Settings" | Drawer Settings & Privacy | `components/GestureDrawer.tsx` | 170 | Routes to `/(tabs)/settings` |

**Status:** ⚠️ Routes to `/(tabs)/settings`, which may be the generic settings tab — not `/(tabs)/admin-my-stuff`. The admin-specific My Stuff screen has organization management, season switching, financial overview, and invitation management that the generic settings screen lacks.

**Notes on reachability:** `admin-my-stuff` is a hidden tab (`_layout.tsx:302`) that can be navigated to via `router.push('/(tabs)/admin-my-stuff')`, but there is no primary entry point in the tab bar, drawer, or home dashboard that directly links to it. This screen appears to be reachable only if some other screen explicitly pushes to it.

**Destination screen analysis (`admin-my-stuff.tsx`, 873 lines):**
- No explicit admin guard — relies on being a hidden tab that only admin routes would push to.
- Extensive functionality:
  - Profile card → `/profile` (line 368)
  - Org Directory → `/org-directory` (line 438)
  - Invite Friends → `/invite-friends` (line 439)
  - Registration Hub → `/registration-hub` (line 456)
  - Season rows → `/season-settings` via `navigateToSeason()` (line 314)
  - Financials card → `/(tabs)/payments` (line 584)
  - Notification Preferences → `/notification-preferences` (line 700)
  - Privacy & Data → `/data-rights` (line 701)
  - Privacy Policy → `/privacy-policy` (line 702)
  - Terms of Service → `/terms-of-service` (line 703)
  - Help & Support → `/help` (line 704)
  - Admin Portal → external `https://login.thelynxapp.com` (line 424)
  - Banner upload → Supabase storage (line 237-280)
  - Registration toggle → `seasons` UPDATE (line 188-200)
  - Invite management — resend/revoke (lines 202-225)
  - Sign out (line 227-232)
- Queries: `seasons`, `invitations`, `players`, `payments`, `waiver_templates`, `waiver_signatures`.
- **Issue: Orphaned from navigation** — despite being the most feature-rich admin screen, it has no clear primary entry point. The drawer "Settings" routes to `/(tabs)/settings`, not `/(tabs)/admin-my-stuff`.

---

## Coach-Inherited Tasks (Traced for Admin)

Admins have access to all Game Day and Coaching Tools features via the drawer. However, admin home is `AdminHomeScroll` (not `CoachHomeScroll`), and Tab 2a is Manage (not Game Day). This means many coach-inherited paths are different for admin.

### TASK 25: Start Game Day Mode
**What the user is trying to do:** Enter live game management mode for a specific event.
**Expected destination:** `game-day-command.tsx`

#### Path A: Drawer → Game Day → Game Day Command — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Game Day Command" | Drawer Game Day | `components/GestureDrawer.tsx` | 121 | Routes to `/game-day-command` |

**Status:** ⚠️ Routes WITHOUT required params. `game-day-command.tsx` expects `eventId`, `teamId`, `opponent`, and `matchId` via `useLocalSearchParams()`. Drawer passes none of these — screen will render with undefined/empty values.

**Notes:** Admin does NOT have `CoachHomeScroll`, so the `GamePlanCard` "START GAME DAY MODE" button (which passes all required params) is NOT available. The only admin path to game day command is through the drawer, which is param-less.

**Destination screen analysis (`game-day-command.tsx`, 223 lines):**
- Expects params: `eventId`, `teamId`, `opponent`, `matchId`.
- Without params, the screen will attempt to load with undefined values — likely showing empty/broken state.
- **Issue: Unreachable with valid params for admin** — admin home has no game plan card equivalent. Admin must navigate to coach-schedule first, then start game day mode from there (if that path exists).

---

### TASK 26: Game Prep
**What the user is trying to do:** Prepare for an upcoming game — review roster, attendance, opponent info.
**Expected destinations:** `game-prep.tsx`, `game-prep-wizard.tsx`

#### Path A: Drawer → Game Day → Game Prep — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Game Prep" | Drawer Game Day | `components/GestureDrawer.tsx` | 122 | Routes to `/game-prep` |

**Status:** ⚠️ Lands on `game-prep.tsx` (1924 lines), which is the LEGACY game prep screen. The newer `game-prep-wizard.tsx` (1596 lines) is what coach-schedule and gameday tab link to. Param `startLive` is expected but not passed.

#### Path B: Notification deep link — 0 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap `game` / `game_reminder` notification | `_layout.tsx` | `app/_layout.tsx` | 106-109 | Routes to `/game-prep?eventId={eid}` or `/game-prep` |

**Status:** ⚠️ Routes to legacy `game-prep.tsx`, passes `eventId` if available. Same legacy vs. wizard mismatch.

**Notes:** Admin has NO direct path to `game-prep-wizard.tsx`. The wizard is only reachable from `coach-schedule.tsx` and `gameday.tsx` — but admin doesn't have the Game Day tab. Admin would need to navigate to `/(tabs)/admin-schedule` (which re-exports `coach-schedule.tsx`) and trigger game prep from there — an indirect 3+ tap path.

---

### TASK 27: Build Lineup
**What the user is trying to do:** Create or edit the player lineup for a game.
**Expected destination:** `lineup-builder.tsx`

#### Path A: Drawer → Game Day → Lineup Builder — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Lineup Builder" | Drawer Game Day | `components/GestureDrawer.tsx` | 123 | Routes to `/lineup-builder` |

**Status:** ⚠️ Routes WITHOUT required params. `lineup-builder.tsx` expects `eventId` and `teamId` via `useLocalSearchParams()`. Drawer passes none — screen will render with undefined values and likely show empty/broken state.

**Destination screen analysis (`lineup-builder.tsx`, 2475 lines):**
- Expects params: `eventId`, `teamId`.
- Without params, cannot load event or team data.
- **Issue: Param-less landing** — same as coach audit finding.

---

### TASK 28: Take Attendance
**What the user is trying to do:** Mark player attendance for a practice or game.
**Expected destination:** `attendance.tsx`

#### Path A: Drawer → Game Day → Attendance — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Attendance" | Drawer Game Day | `components/GestureDrawer.tsx` | 124 | Routes to `/attendance` |

**Status:** ⚠️ Routes WITHOUT required `eventId` param. `attendance.tsx` expects `eventId` via `useLocalSearchParams()`.

---

### TASK 29: Record Game Results
**What the user is trying to do:** Enter scores, stats, and results for a completed game.
**Expected destination:** `game-results.tsx`

#### Path A: Drawer → Game Day → Game Results — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Game Results" | Drawer Game Day | `components/GestureDrawer.tsx` | 125 | Routes to `/game-results` |

**Status:** ⚠️ Routes WITHOUT required `eventId` param. `game-results.tsx` (672 lines) expects `eventId` via `useLocalSearchParams()`.

---

### TASK 30: View Game Recap
**What the user is trying to do:** Review game summary after completion.
**Expected destination:** `game-recap.tsx`

#### Path A: Drawer → Game Day → Game Recap — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Game Recap" | Drawer Game Day | `components/GestureDrawer.tsx` | 126 | Routes to `/game-recap` |

**Status:** ⚠️ Routes WITHOUT required params. `game-recap.tsx` (974 lines) expects `eventId` and optionally `playerId`.

---

### TASK 31: Run Player Evaluations
**What the user is trying to do:** Evaluate players on skills across categories.
**Expected destination:** `evaluation-session.tsx`

#### Path A: Drawer → Coaching Tools → Player Evaluations — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Player Evaluations" | Drawer Coaching Tools | `components/GestureDrawer.tsx` | 137 | Routes to `/evaluation-session` |

**Status:** ⚠️ Routes WITHOUT `teamId` param. `evaluation-session.tsx` (572 lines) expects `teamId` via `useLocalSearchParams()`. Screen may show empty or all-teams view without it.

---

### TASK 32: Manage Challenges
**What the user is trying to do:** Create, manage, and track player challenges.
**Expected destinations:** `coach-challenge-dashboard.tsx`, `create-challenge.tsx`, `challenge-library.tsx`

#### Path A: Drawer → Coaching Tools → Challenges — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Challenges" | Drawer Coaching Tools | `components/GestureDrawer.tsx` | 138 | Routes to `/coach-challenge-dashboard` |

**Status:** ✅ Correct — `coach-challenge-dashboard.tsx` (741 lines) works without params, loads all challenges.

#### Path B: Drawer → Coaching Tools → Challenge Library — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Challenge Library" | Drawer Coaching Tools | `components/GestureDrawer.tsx` | 139 | Routes to `/challenge-library` |

**Status:** ✅ Correct — `challenge-library.tsx` (656 lines) works without params.

---

### TASK 33: Set Player Goals
**What the user is trying to do:** Define and track individual player goals.
**Expected destination:** `player-goals.tsx`

#### Path A: Drawer → Coaching Tools → Player Goals — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Player Goals" | Drawer Coaching Tools | `components/GestureDrawer.tsx` | 140 | Routes to `/player-goals` |

**Status:** ✅ Correct — `player-goals.tsx` (791 lines) works without params, loads all goals.

---

### TASK 34: Manage Coach Availability
**What the user is trying to do:** Set availability for coaching assignments.
**Expected destination:** `coach-availability.tsx`

#### Path A: Drawer → Coaching Tools → Coach Availability — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Coach Availability" | Drawer Coaching Tools | `components/GestureDrawer.tsx` | 149 | Routes to `/coach-availability` |

**Status:** ✅ Correct — `coach-availability.tsx` (595 lines) works without params.

---

### TASK 35: View/Edit Coach Profile
**What the user is trying to do:** View or update their coaching profile.
**Expected destination:** `coach-profile.tsx`

#### Path A: Drawer → Coaching Tools → Coach Profile — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Coach Profile" | Drawer Coaching Tools | `components/GestureDrawer.tsx` | 150 | Routes to `/coach-profile` |

**Status:** ✅ Correct — `coach-profile.tsx` (423 lines) works without params.

---

### TASK 36: View Standings
**What the user is trying to do:** See league standings and team rankings.
**Expected destination:** `standings.tsx`

#### Path A: Drawer → League & Community → Standings — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Standings" | Drawer League & Community | `components/GestureDrawer.tsx` | 162 | Routes to `/standings` |

**Status:** ✅ Correct

---

### TASK 37: View Achievements
**What the user is trying to do:** Browse earned achievements and badges.
**Expected destination:** `achievements.tsx`

#### Path A: Home → Trophy Case → See All — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | TrophyCaseWidget visible |
| 2 | Tap "See All" | `TrophyCaseWidget` | `TrophyCaseWidget.tsx` | 76,91,103 | Routes to `/achievements` |

**Status:** ✅ Correct

#### Path B: Home → Achievement Celebration → View All — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | View admin home | `AdminHomeScroll` | `components/AdminHomeScroll.tsx` | — | Modal appears on new achievement |
| 2 | Tap "View All" in modal | `AchievementCelebrationModal` | `components/AdminHomeScroll.tsx` | 325 | Routes to `/achievements` |

**Status:** ✅ Correct

#### Path C: Drawer → League & Community → Achievements — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Achievements" | Drawer League & Community | `components/GestureDrawer.tsx` | 163 | Routes to `/achievements` |

**Status:** ✅ Correct

---

### TASK 38: Chat
**What the user is trying to do:** View and participate in team chat channels.
**Expected destination:** `chats.tsx`

#### Path A: Tab bar → Chat — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Chat tab | Tab bar | `app/(tabs)/_layout.tsx` | 252 | Third visible tab |

**Status:** ✅ Correct

#### Path B: Drawer → Quick Access → Chats — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Open drawer | Tab bar | | | |
| 2 | Tap "Chats" | Drawer Quick Access | `components/GestureDrawer.tsx` | 82 | Routes to `/(tabs)/chats` |

**Status:** ✅ Correct

#### Path C: Notification deep link — 0 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap `chat` notification | `_layout.tsx` | `app/_layout.tsx` | 90-91 | Routes to `/chat/{channelId}` or `/(tabs)/chats` |

**Status:** ✅ Correct

**Notes:** Admin also has a hidden `/(tabs)/admin-chat` tab that re-exports `coach-chat.tsx`. This is reachable only via direct route — no UI path navigates to it. The primary chat experience for admin is through the `chats.tsx` tab (Tab 3).

---

## Cross-Cutting Issues Summary

### 1. Missing Permission Checks (Critical)
Multiple admin-specific screens have NO role/permission verification:
| Screen | File | Impact |
|--------|------|--------|
| admin-teams.tsx | `app/(tabs)/admin-teams.tsx` | Any user can view/create teams, assign players |
| admin-search.tsx | `app/admin-search.tsx` | Any user can search all players, teams, events, users |
| season-setup-wizard.tsx | `app/season-setup-wizard.tsx` | Any user can create seasons and teams |
| bulk-event-create.tsx | `app/bulk-event-create.tsx` | Any user can bulk-create events |
| jersey-management.tsx | `app/(tabs)/jersey-management.tsx` | Any user can modify jersey assignments |
| org-settings.tsx | `app/org-settings.tsx` | Any user can edit organization settings |
| coach-background-checks.tsx | `app/coach-background-checks.tsx` | Any user can view sensitive coach data |
| season-reports.tsx | `app/season-reports.tsx` | Any user can view org-wide analytics |

**Well-guarded screens (model examples):** `payment-reminders.tsx` (line 46), `registration-hub.tsx` (line 10), `users.tsx` (line 49), `manage.tsx` (line 83), `season-settings.tsx` (line 81), `team-management.tsx` (line 59).

### 2. Param-less Drawer Navigation (Game Day Tools)
All 6 Game Day drawer items route WITHOUT required params:
| Drawer Item | Missing Params | Impact |
|-------------|----------------|--------|
| Game Day Command | eventId, teamId, opponent, matchId | Broken/empty screen |
| Game Prep | startLive | Lands on legacy screen without event context |
| Lineup Builder | eventId, teamId | Cannot load lineup data |
| Attendance | eventId | Cannot load attendance data |
| Game Results | eventId | Cannot load results data |
| Game Recap | eventId, playerId | Cannot load recap data |

**Root cause:** Admin has no `CoachHomeScroll` (where `GamePlanCard` provides all required params). The drawer is the only path for admin to reach Game Day tools, but drawer items never pass params. Admin would need to navigate to `/(tabs)/admin-schedule` first, then access game day tools from event context — but admin-schedule (which re-exports coach-schedule) may not wire these flows either.

### 3. Admin Home Missing Coach Features
`AdminHomeScroll` does NOT include:
- `GamePlanCard` (coach's primary game day entry point)
- `PrepChecklist` (game preparation tracker)
- `ActionItems` (evaluation/stats nudges)
- `QuickActions` with coach-specific items (Send a Blast, Build a Lineup, Review Stats)
- `ScoutingContext` (opponent scouting data)

This means admin who also coaches has NO home-level access to coaching workflow. They must use the drawer or navigate to admin-schedule.

### 4. Schedule Screen Fragmentation
Admin encounters 3+ schedule variants:
| Context | Route | Screen |
|---------|-------|--------|
| Home Quick Actions / Upcoming Events | `/(tabs)/admin-schedule` | `coach-schedule.tsx` (via re-export) |
| Drawer Quick Access | `/(tabs)/schedule` | `schedule.tsx` (generic) |
| Notification deep link | `/(tabs)/schedule` | `schedule.tsx` (generic) |
| Smart Queue schedule item | `/(tabs)/admin-schedule` | `coach-schedule.tsx` (via re-export) |

Admin gets different schedule experiences depending on how they navigate.

### 5. Route Mismatches
| Source | Route Used | Issue |
|--------|-----------|-------|
| season-settings.tsx line 609, 645 | `/(tabs)/teams` | Route does not exist — should be `/(tabs)/admin-teams` or `/team-management` |
| admin-search.tsx line 157 | `/(tabs)/schedule` | Generic schedule, should be `/(tabs)/admin-schedule` for admin |
| admin-search.tsx line 135 | `/team-management` | No teamId passed, loses search context |

### 6. Single-Entry-Point Screens
These screens are ONLY reachable from the drawer (no home dashboard, manage tab, or notification path):
- Background Checks (`/coach-background-checks`)
- Volunteer Assignment (`/volunteer-assignment`)
- Venue Manager (`/venue-manager`) — and it's just a placeholder
- Org Settings (`/org-settings`)

### 7. Admin My Stuff Orphaned
`admin-my-stuff.tsx` (873 lines) is the most feature-rich admin screen with:
- Season management with context switching
- Registration toggle
- Financial overview
- Invitation management
- Banner upload
- Full settings suite

Yet it has NO clear primary entry point — no tab bar link, no drawer item, no home dashboard card. The drawer's "Settings" routes to `/(tabs)/settings` instead.

### 8. Dual Team Management Screens
Admin has TWO different team management experiences:
- `team-management.tsx` (937 lines) — standalone screen via Manage tab/drawer, admin-guarded
- `admin-teams.tsx` (823 lines) — hidden tab, NO permission check, different UI with create/assign modal

These screens overlap in functionality but differ in access control, UI, and navigation patterns.

---

## Task Status Summary

| # | Task | Status | Primary Path Taps | Issues |
|---|------|--------|------------------|--------|
| 1 | View Home Dashboard | ✅ | 0 | — |
| 2 | View Manage Tab | ✅ | 1 | — |
| 3 | Manage Registrations | ✅ | 2 | Duplicate role guard in registration-hub.tsx |
| 4 | Review/Manage Payments | ✅ | 2 | Terminal screen, no forward nav |
| 5 | Manage Teams | ✅ | 2 | Dual screens (team-management vs admin-teams), missing perm check on admin-teams |
| 6 | Manage Users | ✅ | 2 | No deep linking from search results |
| 7 | Manage Schedule / Create Events | ✅ | 2 | Schedule fragmentation; drawer Quick Access routes to wrong schedule |
| 8 | Manage Seasons | ✅ | 3 | Wrong outbound route `/(tabs)/teams`; missing useEffect deps |
| 9 | Season Setup Wizard | ✅ | 2-3 | No permission check; dead end after creation |
| 10 | Manage Jerseys | ✅ | 2 | No permission check |
| 11 | View Coach Directory | ✅ | 2 | Manage tab routes to different screen (coaches.tsx vs coach-directory.tsx) |
| 12 | Background Checks | ✅ | 2 | No permission check; single entry point; sensitive data exposed |
| 13 | Manage Volunteers | ✅ | 2 | Single entry point (drawer only) |
| 14 | Send a Blast | ✅ | 2 | — |
| 15 | View Blast History | ✅ | 2-3 | — |
| 16 | View Reports | ✅ | 2-3 | reports-tab is just a wrapper re-export |
| 17 | Admin Search | ✅ | 2-3 | No perm check; missing params in search result routes |
| 18 | Edit Org Settings | ✅ | 2 | No perm check; single entry point |
| 19 | Manage Venues | 🚫 | 2 | Placeholder only — "Coming Soon" |
| 20 | View Org Directory | ✅ | 2-3 | — |
| 21 | Send Payment Reminders | ✅ | 2 | Best-guarded admin screen |
| 22 | View Season Archives | ✅ | 2-3 | — |
| 23 | View Player Directory | ✅ | 2 | N+1 query on team_players; incomplete Add Player flow |
| 24 | Admin My Stuff | ⚠️ | ? | Orphaned — no clear primary entry point |
| 25 | Start Game Day Mode | ⚠️ | 2 | Param-less landing from drawer; broken without eventId/teamId |
| 26 | Game Prep | ⚠️ | 2 | Routes to legacy screen; no path to wizard for admin |
| 27 | Build Lineup | ⚠️ | 2 | Param-less landing; broken without eventId/teamId |
| 28 | Take Attendance | ⚠️ | 2 | Param-less landing; broken without eventId |
| 29 | Record Game Results | ⚠️ | 2 | Param-less landing; broken without eventId |
| 30 | View Game Recap | ⚠️ | 2 | Param-less landing; broken without eventId |
| 31 | Run Evaluations | ⚠️ | 2 | Param-less landing; may show all-teams fallback |
| 32 | Manage Challenges | ✅ | 2 | — |
| 33 | Set Player Goals | ✅ | 2 | — |
| 34 | Coach Availability | ✅ | 2 | — |
| 35 | Coach Profile | ✅ | 2 | — |
| 36 | View Standings | ✅ | 2 | — |
| 37 | View Achievements | ✅ | 2 | — |
| 38 | Chat | ✅ | 1 | admin-chat hidden tab orphaned |

**Totals: 38 tasks** — 22 ✅ Correct, 9 ⚠️ Issues, 1 🚫 Placeholder, 0 ❌ Broken (but 6 game day tasks are functionally broken due to param-less drawer nav)
