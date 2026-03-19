# TEAM-MANAGER-BUILD-PLAN.md
# Comprehensive Team Manager Build Plan

**Date:** 2026-03-19
**Branch:** `navigation-cleanup-complete`
**Classification:** Investigation — Build plan with exact code references.

---

## Part A: Quick Fixes Validation

### Status: ALL 6 QUICK FIXES ALREADY APPLIED

The commits on this branch (`3ab5373`, `368ff10`, `c9bb42c`) have already shipped the quick fixes identified in the audit. Validation below:

### A1. The 4 previously-blocked screens — NOW FIXED

**`app/attendance.tsx:75-79`**
```typescript
const { isAdmin, isCoach, isTeamManager, loading } = usePermissions();
if (loading) return null;
if (!isAdmin && !isCoach && !isTeamManager) {
```
Status: `isTeamManager` IS included in the destructure and the guard. **FIXED.**

**`app/volunteer-assignment.tsx:119-123`**
```typescript
const { isAdmin, isCoach, isTeamManager, loading: permLoading } = usePermissions();
if (permLoading) return null;
if (!isAdmin && !isCoach && !isTeamManager) {
```
Status: **FIXED.**

**`app/blast-composer.tsx:56-60`**
```typescript
const { isAdmin, isCoach, isTeamManager, loading } = usePermissions();
if (loading) return null;
if (!isAdmin && !isCoach && !isTeamManager) {
```
Status: **FIXED.**

**`app/blast-history.tsx:99-103`**
```typescript
const { isAdmin, isCoach, isTeamManager, loading: permLoading } = usePermissions();
if (permLoading) return null;
if (!isAdmin && !isCoach && !isTeamManager) {
```
Status: **FIXED.**

### A2. Greeting text — NOW FIXED

**`components/CoachHomeScroll.tsx:468`**
```typescript
<Text style={styles.greetingLine1}>{isTeamManager ? `Hey Team Manager! ${'\u{1F525}'}` : `Hey Coach! ${'\u{1F525}'}`}</Text>
```
Status: Role-aware greeting. **FIXED.**

Note: `usePermissions` was already imported at line 39. The `isTeamManager` flag is destructured at line 155.

**Fallback briefing at line 129:**
```typescript
return 'Welcome to your team hub.';
```
Status: Changed from "coaching hub" to "team hub". **FIXED.**

### A3. Chat channel management — NOW FIXED

**`app/(tabs)/chats.tsx:121-125`**
```typescript
const { isAdmin, isCoach, isTeamManager } = usePermissions();
const canManageChannels = isCoach || isAdmin || isTeamManager;
```
Status: `isTeamManager` IS included. **FIXED.**

### A Summary

No further quick fixes needed. All 6 items from the audit are applied.

---

## Part B: Existing Solo TM Infrastructure

### B1. Team Manager Setup Wizard (`app/team-manager-setup.tsx`)

**Wizard Steps:**

| Step | Title | Data Collected |
|------|-------|----------------|
| 1. Name your team | Team name, sport (pill selector from 6 options), age group (pill selector from 10 options) | `teamName`, `sport`, `ageGroup` |
| 2. Set your season | Season name (auto-populated e.g. "Spring 2026"), year-round toggle, start/end dates (YYYY-MM-DD text input) | `seasonName`, `seasonStart`, `seasonEnd`, `yearRound` |
| 3. Invite your players | Displays generated invite code, copy/share buttons | Read-only display |
| 4. You're ready! | Success screen with 3 nudge cards (schedule, roster, payments) + "Go to my team" button | Navigation options |

**Supabase tables written (in order, via `createTeamManagerSetup()` at line 84):**

1. **`organizations`** — Creates a "micro-org" with `name = teamName`, auto-generated `slug`, `is_active = true`. NO `created_by` field is set.
2. **`user_roles`** — Inserts `role = 'team_manager'`, `organization_id = org.id`. The TM is NOT made a `league_admin` — they are only a `team_manager`.
3. **`profiles`** — Updates `current_organization_id = org.id` for the user.
4. **`seasons`** — Creates with `status = 'active'`, `sport = sport.toLowerCase()`, auto-populated dates.
5. **`teams`** — Creates with `name = teamName`, `season_id`, `age_group`, `max_players = 20`. No `organization_id` column on teams (linked via season).
6. **`team_staff`** — Inserts `staff_role = 'team_manager'`, `is_active = true`.
7. **`team_invite_codes`** — Generates code like `LYNX-ABCD12`, `max_uses = 30`.

**Team limit:** Free tier limits to 1 team per TM (`canCreateTeam()` at line 69 checks `team_staff` count where `staff_role = 'team_manager'`).

**After wizard completion:** User lands back at `/(tabs)` via `router.replace('/(tabs)')` (line 291). Auth state triggers DashboardRouter which detects `team_manager` via `team_staff` and shows `CoachHomeScroll`.

**UX Quality:** Polished. Sliding steps with spring animation, sport/age-group pill selectors, progress dots, mascot image on success, share/copy invite code, haptic feedback on success. Visually consistent with signup flow.

**Entry points:** Only reachable from:
1. Signup flow: "Start my own team" link (line 652 of signup.tsx)
2. `TeamManagerSetupPrompt`: "Set up my team" button (line 32 of TeamManagerSetupPrompt.tsx)

### B2. Signup Flow TM Path (`app/(auth)/signup.tsx`)

**Full TM flow:**

1. Step 1: Enter name, email, password
2. Step 2: Select "Team Manager" role card → auto-advances to Step 3 (non-parent roles skip COPPA)
3. Step 3 (Connect): Two paths:
   - **Enter org code:** Validates against `invitations` then `team_invite_codes`. Creates account, inserts `user_roles` with `role = 'team_manager'`, sets `current_organization_id`. Lands in `/(tabs)`.
   - **"Start my own team":** Creates account (no org code). Marks `onboarding_completed = true`. Routes to `/team-manager-setup`. NO `user_roles` entry is created until the wizard completes.
   - **Skip:** Creates account with no org. Lands in `/(tabs)` with empty states.

**After "Start my own team" wizard completes:**
- Role assigned: `team_manager` (via wizard, NOT `league_admin`)
- The TM is NOT made an admin of their auto-created org. They are strictly `team_manager`.
- Their first login shows the CoachHomeScroll (or TeamManagerSetupPrompt if wizard hasn't completed yet).

### B3. DashboardRouter TM Routing (`components/DashboardRouter.tsx`)

**TM detection logic (lines 138-153):**
```typescript
// Team Manager (not also a coach) gets team_manager dashboard
if (isTeamManager && !isCoach) {
  const { data: tmTeams } = await supabase
    .from('team_staff')
    .select('team_id')
    .eq('user_id', user.id)
    .eq('staff_role', 'team_manager')
    .eq('is_active', true)
    .limit(1);

  if (tmTeams && tmTeams.length > 0) {
    setDashboardType('team_manager');    // Has a team → CoachHomeScroll
  } else {
    setDashboardType('team_manager_setup'); // No team → TeamManagerSetupPrompt
  }
  return;
}
```

**Switch rendering (lines 210-218):**
```typescript
case 'team_manager':
  return <CoachHomeScroll />;
case 'team_manager_setup':
  return <TeamManagerSetupPrompt />;
```

**Key observation:** `team_manager` currently renders `CoachHomeScroll` — there is no `TeamManagerHomeScroll` component.

**`TeamManagerSetupPrompt`** (`components/empty-states/TeamManagerSetupPrompt.tsx`):
- Shows mascot image + "Let's set up your team!" title
- Primary button: "Set up my team" → routes to `/team-manager-setup`
- Secondary link: "I have an invite code" → routes to `/(auth)/redeem-code`
- Clean, polished UI matching the app's design system

---

## Part C: TM Home Dashboard Design

### C1. What the TM Currently Sees (CoachHomeScroll)

| # | Section | Component | Lines | TM Relevance | Verdict |
|---|---------|-----------|-------|-------------|---------|
| 1 | Compact mascot greeting | inline | 456-488 | YES — now role-aware | **KEEP** |
| 1b | Dynamic message bar | `DynamicMessageBar` | 491-501 | PARTIAL — game-day CTA routes to game-day-command (not for TM) | **MODIFY** |
| 3 | Game Day hero card | `GameDayHeroCard` | 503-510 | LOW — TMs don't run game command, but event info is useful | **MODIFY** |
| 3b | TM payment card | `ManagerPaymentCard` | 516-523 | YES — core TM feature | **KEEP** |
| 3b | TM availability card | `ManagerAvailabilityCard` | 524-535 | YES — core TM feature | **KEEP** |
| 3b | TM roster card | `ManagerRosterCard` | 537-543 | YES — core TM feature | **KEEP** |
| 4 | Momentum cards (record/attendance/performers) | `MomentumCardsRow` | 548-554 | LOW — coach stats, but attendance rate is relevant to TMs | **REMOVE for TM** |
| 5 | Squad faces row (top performers) | `SquadFacesRow` | 557-564 | NONE — performance ranking is coaching | **REMOVE for TM** |
| 6 | Smart nudge card (shoutout suggestions) | `SmartNudgeCard` | 567-575 | NONE — shoutouts are coaching feature | **REMOVE for TM** |
| 6b | Team engagement card | `CoachEngagementCard` | 578-580 | LOW — could be relevant but is framed as coaching | **REMOVE for TM** |
| 7 | Action grid 2x2 (shoutout, lineup, etc.) | `ActionGrid2x2` | 583-587 | NONE — coaching actions | **REMOVE for TM** |
| 8 | Coach pulse feed | `CoachPulseFeed` | 590-592 | NONE — coaching activity feed | **REMOVE for TM** |
| 9 | Coach trophy case | `CoachTrophyCase` | 595-599 | NONE — coaching achievements | **REMOVE for TM** |
| 10 | Team stats bar chart | `TeamStatsChart` | 602-604 | NONE — coaching analytics | **REMOVE for TM** |
| 11 | Ambient closer | `AmbientCloser` | 607-611 | LOW — generic team context | **REMOVE for TM** |

**Summary:** 8 coach-specific sections should be removed for TMs. Only the greeting, dynamic message bar (modified), hero card (modified), and the 3 TM-specific cards should remain.

### C2. Existing TM-Specific Cards

**`ManagerPaymentCard`** (`components/coach-scroll/ManagerPaymentCard.tsx`):
- Shows: overdue payments (count + amount), pending payments, total collected
- Data source: `useTeamManagerData` → `overduePayments`, `overdueAmount`, `pendingPayments`, `totalCollected`
- Action: Taps to `/(tabs)/payments`
- Quality: Polished — alert/ok status bar, 3-column summary

**`ManagerAvailabilityCard`** (`components/coach-scroll/ManagerAvailabilityCard.tsx`):
- Shows: Next event with type badge, RSVP visual bar (confirmed/maybe/no response), send reminder button
- Data source: `useTeamManagerData` → `nextEventTitle`, `nextEventDate`, `rsvpConfirmed/Maybe/NoResponse`
- Action: Taps to `/(tabs)/coach-schedule`, reminder button sends notifications to unresponded parents
- Quality: Polished — RSVP bar visualization, actionable reminder

**`ManagerRosterCard`** (`components/coach-scroll/ManagerRosterCard.tsx`):
- Shows: Player count, pending approval badge
- Data source: `useTeamManagerData` → `rosterCount`
- Action: Taps to `/(tabs)/players`
- Quality: Simple but clean — icon, count, chevron

### C3. What the TM Home SHOULD Show

**Ideal TM Home Scroll Order:**

| # | Section | Description | Component | Status |
|---|---------|-------------|-----------|--------|
| 1 | **Greeting** | Role-aware greeting with mascot, team name, briefing message | Reuse from CoachHomeScroll (already role-aware) | EXISTS |
| 2 | **Dynamic message bar** | Next event info, payment alerts — but NO game-day-command CTA | `DynamicMessageBar` with TM-specific route targets | EXISTS (needs TM route filtering) |
| 3 | **Event hero card** | Next upcoming event (practice/game/tournament) — but hero CTA should go to schedule, not game-day-command | `GameDayHeroCard` (or simplified variant) | EXISTS (CTA needs modification) |
| 4 | **Payment health** | Overdue/pending/collected at a glance | `ManagerPaymentCard` | EXISTS |
| 5 | **RSVP / Availability** | Next event RSVP breakdown with send-reminder | `ManagerAvailabilityCard` | EXISTS |
| 6 | **Roster snapshot** | Player count, pending approvals | `ManagerRosterCard` | EXISTS |
| 7 | **Quick actions grid** | 4-6 TM-relevant actions: Take Attendance, Send Blast, View Payments, Manage Volunteers, Invite Parents, View Schedule | NEW — `TMActionGrid` | NEEDS CREATION |
| 8 | **Upcoming events** | Next 3 events with type/date/RSVP preview | Could reuse event list from hero data | NEEDS CREATION (simple) |
| 9 | **Ambient closer** | Motivational closer or team identity | Could reuse `AmbientCloser` | EXISTS |

**Data hook:**
- `useCoachHomeData()` works for TMs (it queries `team_staff` which includes TMs). It provides: teams, events, hero event, RSVP summary, season record, upcoming events.
- `useTeamManagerData(teamId)` provides TM-specific data: payments, RSVP, registration, roster count.
- **No new data hook needed.** Both hooks together supply all the data the TM home requires.

### C4. Build vs. Filter Decision

#### Option A: New `TeamManagerHomeScroll.tsx` Component

**Pros:**
- Clean separation of concerns — TM home evolves independently of coach home
- No risk of breaking coach experience when modifying TM layout
- Follows the established pattern: `AdminHomeScroll`, `CoachHomeScroll`, `ParentHomeScroll`, `PlayerHomeScroll`
- Can use simpler data hook (only `useTeamManagerData` + lightweight event fetching)
- Easier to test in isolation

**Cons:**
- Some code duplication (greeting section, event display, animations)
- Need to replicate the compact header + team pills if TMs have multiple teams
- Requires updating `DashboardRouter` to render the new component

#### Option B: Add TM conditionals inside `CoachHomeScroll.tsx`

**Pros:**
- Less code duplication — shared greeting, header, animations
- Data hooks are already wired up (both `useCoachHomeData` and `useTeamManagerData`)
- TM-specific cards already render conditionally inside CoachHomeScroll (lines 512-545)

**Cons:**
- CoachHomeScroll is already 830 lines — adding more conditionals makes it harder to maintain
- Every future coach change risks breaking TM view
- Testing requires toggling between roles
- Violates the established pattern where each role has its own home component

#### RECOMMENDATION: **Option A — New `TeamManagerHomeScroll.tsx`**

This matches the app's architecture pattern perfectly. Every other role has its own home scroll component. The TM home is fundamentally different from the coach home (no stats, no shoutouts, no evaluations, no lineup). The 3 TM cards already exist as separate components. The code duplication is minimal — only the greeting section needs to be shared (which can be extracted to a common component if desired later).

**Estimated effort:** 2-3 hours. The component is simpler than CoachHomeScroll since most sections already exist as standalone components.

---

## Part D: Signup Flow Adjustments

### D1. Current Role Cards

```typescript
// app/(auth)/signup.tsx:40-45
const ROLE_CARDS = [
  { role: 'coach',        icon: 'clipboard',     title: 'Coach',        subtitle: 'I coach a team',           color: BRAND.teal },
  { role: 'team_manager', icon: 'build-outline',  title: 'Team Manager', subtitle: 'I manage team operations', color: '#E76F51' },
  { role: 'parent',       icon: 'people',         title: 'Parent',       subtitle: 'My child plays',           color: BRAND.skyBlue },
  { role: 'player',       icon: 'football',       title: 'Player',       subtitle: "I'm a player",             color: BRAND.goldBrand },
];
```

4 cards displayed in order: Coach → Team Manager → Parent → Player.

### D2. Proposed Signup Simplification

**Product vision questions answered:**

**Q1. Should "I run a team" replace TM card or be a new 5th card?**
RECOMMENDATION: **Replace the "Team Manager" card with "I run a team."** The current TM card's subtitle "I manage team operations" is vague. "I run a team" is clearer and matches the solo setup wizard path. The existing org-code TM path (joining an existing org as TM) can still work — the Step 3 connect screen already handles both paths.

Proposed card:
```typescript
{ role: 'team_manager', icon: 'rocket-outline', title: 'I Run a Team', subtitle: 'Set up and manage my own team', color: '#E76F51' },
```

**Q2. Should "I run a team" lead to existing wizard or new flow?**
RECOMMENDATION: **Keep the existing `team-manager-setup.tsx` wizard.** It's polished, functional, and creates all necessary database rows. No need for a new flow. Just improve the entry path (make the "Start my own team" button more prominent in Step 3).

**Q3. What role(s) does "I run a team" get?**
RECOMMENDATION: Keep `team_manager` role. The wizard already creates this correctly. Adding `head_coach` would grant coaching features (evaluations, lineups, game-day command) which aren't part of the TM's job. If a solo TM later wants coaching features, they can be promoted.

**Q4. How does this affect the "Coach" card?**
No change. A coach who selects "Coach" without an org code can still:
- Enter a code to join an org
- Create a new organization (existing "create a new organization" link on line 640-649)
- Skip for now

No redirect to "I run a team" is needed — the roles have different functions.

### D3. Org Code vs Self-Setup Branching

**Current Step 3 by role:**

| Role | Step 3 Prompt | Org Code Path | Skip Path | Extra Option |
|------|--------------|---------------|-----------|-------------|
| Coach | "Have an invite code?" | Join org as head_coach | Empty states | "Create a new organization" |
| Team Manager | "Have an invite code from your organization?" | Join org as team_manager | Empty states | "Start my own team" → wizard |
| Parent | "Have an invite code?" | Join org as parent | Empty states | (none) |
| Player | "Your coach may have given you a code" | Join org as player | Empty states | (none) |

**Proposed change for "I run a team":**
Make the "Start my own team" button the PRIMARY action rather than a secondary link. Current UX:
- Primary: code input + "Enter Code" button
- Secondary link: "Or, start my own team"

Proposed UX:
- Primary: "Set Up My Team" button (goes to wizard)
- Secondary: "I have an invite code" link (shows code input)

This better matches the "I run a team" intent — most people selecting this card want to create their own team, not join an existing org.

---

## Part E: Tab Bar and Drawer for Solo TM

### E1. Tab Bar for TM

**Current TM tab bar** (from `app/(tabs)/_layout.tsx:47`):

```typescript
const isTeamManagerMode = isTeamManager && !isAdmin && !isCoach;
```

| Tab | Screen | Visible to TM? |
|-----|--------|----------------|
| Home | `index` | YES |
| Manage | `manage` | NO (admin only) |
| Game Day | `gameday` | NO (hidden when `isTeamManagerMode`) |
| Schedule | `coach-schedule` | YES (shown when `isTeamManagerMode`, line 318) |
| Chat | `chats` | YES |
| More (hamburger) | `menu-placeholder` | YES |

**Effective TM tabs: Home | Schedule | Chat | More**

**Proposed Solo TM tabs:** Same as current. This is correct and appropriate.
- **Home** — TM dashboard
- **Schedule** — Team events (uses full coach-schedule which includes event creation)
- **Chat** — Team communication
- **More** — Drawer with Team Operations, Settings

No changes needed in `_layout.tsx` for the tab bar.

### E2. Drawer for Solo TM

**Current TM drawer section** (`GestureDrawer.tsx:158-175`):
```
Team Operations (defaultOpen: true)
├── Roster → /(tabs)/players
├── Schedule → /(tabs)/coach-schedule
├── Payments → /(tabs)/payments
├── Attendance → /attendance
├── Volunteers → /volunteer-assignment
├── Engagement → /coach-engagement
├── Blast Composer → /blast-composer
└── Blast History → /blast-history
```

**Assessment for Solo TM:**

| Item | Keep? | Notes |
|------|-------|-------|
| Roster | YES | Core TM function |
| Schedule | YES | Core TM function |
| Payments | YES | Core TM function |
| Attendance | YES | Now unblocked (quick fix applied) |
| Volunteers | YES | Now unblocked |
| Engagement | MAYBE | Useful but not critical for MVP |
| Blast Composer | YES | Now unblocked |
| Blast History | YES | Now unblocked |

**Recommended additions for Solo TM drawer:**

| New Item | Priority | Route | Notes |
|----------|----------|-------|-------|
| Invite Parents | HIGH | `/team-manager-setup` (step 3 redisplay or new share screen) | Most important action for new Solo TMs |
| Team Settings | LOW | New screen | Team name, logo, sport, age group editing |

**Recommended approach:** Add an "Invite Parents" item to the Team Operations section. This could open a simple modal or route to a new screen that displays the team invite code with copy/share options (similar to Step 3 of the setup wizard).

For the initial release, no drawer changes are required. The existing 8 items cover all core TM workflows. "Invite Parents" can be added in a fast follow-up.

---

## Part F: Data Scoping

### F1. Single-Team Scoping

**Does `useCoachHomeData` work for a single-team TM?**
YES. The hook queries `team_staff` table (line 101-104):
```typescript
const { data: staffTeams } = await supabase
  .from('team_staff')
  .select('team_id, staff_role, teams ( id, name, season_id )')
  .eq('user_id', user.id);
```
This returns the TM's team(s). For a single-team TM, it returns exactly 1 team. The `selectedTeamId` auto-defaults to the first (and only) team (line 203-204).

**Does season context resolve correctly?**
YES — if the Solo TM setup wizard created a season, `useSeason()` picks it up because the profile's `current_organization_id` is set and the season is linked to that org.

**Does team context resolve?**
YES — the hook queries `team_staff` which is populated by the wizard.

**"Select a team" dropdown issue?**
For a single-team TM, the team selector pill in CoachHomeScroll (lines 473-486) only renders when `data.teams.length > 1`. Single-team users see no dropdown. **No issue.**

The sticky team pills bar (lines 397-427) also renders only the team pills from `data.teams`. With 1 team, it shows a single pill. This is fine but slightly redundant — in the new `TeamManagerHomeScroll`, we could omit the team pills entirely for single-team users.

### F2. Database Rows Created for Solo TM

When the setup wizard completes (`createTeamManagerSetup()` at line 84 of `team-manager-setup.tsx`), the following rows exist:

| Table | Row Data | Notes |
|-------|----------|-------|
| `organizations` | `name = teamName`, `slug = auto`, `is_active = true` | "Micro-org" — no `created_by`, no branding |
| `user_roles` | `user_id`, `organization_id = org.id`, `role = 'team_manager'`, `is_active = true` | NOT league_admin |
| `profiles` | `current_organization_id = org.id` | Updated (not inserted) |
| `seasons` | `organization_id = org.id`, `name = auto`, `start_date`, `end_date`, `status = 'active'`, `sport = lowercase` | Standard season |
| `teams` | `name = teamName`, `season_id`, `age_group`, `max_players = 20` | No `organization_id` on teams (linked via season) |
| `team_staff` | `team_id`, `user_id`, `staff_role = 'team_manager'`, `is_active = true` | Links TM to team |
| `team_invite_codes` | `code = LYNX-XXXX`, `team_id`, `is_active = true`, `max_uses = 30`, `created_by = userId` | Share with parents |

**Minimum viable data for TM to function:**
All 7 rows above. The wizard creates them all in a single transaction-like sequence. If any step fails, the user sees an error alert and can retry.

**Missing:** No `organization_sports` entry is created (unlike the coach "Create Org" flow which inserts one). This is minor — sports context is on the season.

---

## Part G: Risk Assessment

### G1. Could a new TeamManagerHomeScroll break existing functionality?

**Risk: LOW.** The new component would be imported only in `DashboardRouter.tsx` where `case 'team_manager'` currently returns `<CoachHomeScroll />`. Changing it to `<TeamManagerHomeScroll />` is a single-line edit. No other file references the TM dashboard type. CoachHomeScroll is untouched.

The only risk is if `TeamManagerHomeScroll` crashes on render — this would break the TM home. Mitigate with: error boundary, thorough testing with a TM account.

### G2. What if a Solo TM later joins a real org?

**Current behavior:** If someone invites a Solo TM to an org via code, the TM would:
1. Enter the code on the org-directory or redeem-code screen
2. A new `user_roles` entry is created for the new org
3. The user's `current_organization_id` switches to the new org

**Issue:** The user's old micro-org data (team, season, roster) lives under the old org. If `current_organization_id` changes, `usePermissions` queries roles for the NEW org. If the new org doesn't have a `team_manager` role entry for this user, they'd lose their TM flags.

**Mitigation:** This is an edge case for v1. Document that Solo TMs should not simultaneously manage teams in two orgs. Future: org switcher UI.

### G3. Role conflicts: Org TM + solo team?

**Current:** A user can have multiple `user_roles` entries across different organizations. However, `current_organization_id` determines which roles are active. Only one org context is active at a time.

**If an Org TM also creates a solo team:** They'd have two organizations. Switching between them via org switcher would work, but there's no org switcher in the mobile app yet. The user would need to use the web admin to switch.

**Recommendation for v1:** Don't solve this. Solo TMs are single-org users by design. The team limit check (`canCreateTeam()`) already limits to 1 team.

### G4. Supabase RLS implications?

The micro-org created by the wizard is a standard `organizations` row. RLS policies that filter by `organization_id` will work correctly because:
- `user_roles` links the user to the org
- `team_staff` links the user to the team
- `team_players` links players to the team

No special RLS changes needed for solo teams. The existing policies treat them identically to normal org teams.

### G5. Testing surface

| Area | Screens to Test | Method |
|------|----------------|--------|
| Signup → solo TM wizard | signup.tsx, team-manager-setup.tsx | Create new TM account |
| TM home dashboard | TeamManagerHomeScroll (new), DashboardRouter | View as TM |
| Role guards | attendance, volunteers, blast-composer, blast-history | Navigate from drawer |
| Chat management | chats.tsx | Create/manage channel as TM |
| Tab bar | _layout.tsx | Verify correct 4 tabs |
| Drawer items | GestureDrawer.tsx | Verify all Team Operations items work |
| Data hooks | useCoachHomeData, useTeamManagerData | Verify data loads for TM |

**Total screens to test:** ~12 screens minimum.

---

## Execution Plan

### Phase 1: TM Home Dashboard (NEW — highest impact)

**Goal:** Replace `CoachHomeScroll` with a dedicated `TeamManagerHomeScroll` that shows only TM-relevant content.

**Files to create:**
| File | Description |
|------|-------------|
| `components/TeamManagerHomeScroll.tsx` | New TM home scroll (~250-350 lines) |

**Files to modify:**
| File | Change |
|------|--------|
| `components/DashboardRouter.tsx:215-216` | Change `case 'team_manager': return <CoachHomeScroll />` to `return <TeamManagerHomeScroll />` |

**`TeamManagerHomeScroll` structure:**
1. Compact greeting (reimplement simply — role-aware, first name, briefing)
2. Dynamic message bar (reuse `DynamicMessageBar` but filter out game-day-command routes)
3. `ManagerPaymentCard` (existing)
4. `ManagerAvailabilityCard` (existing)
5. `ManagerRosterCard` (existing)
6. Quick action buttons (4-cell grid: Attendance, Send Blast, Volunteers, Invite Parents)
7. Upcoming events list (next 3, from `useCoachHomeData` events)
8. Ambient closer or motivational message

**Data hooks:** Use `useCoachHomeData()` for teams/events and `useTeamManagerData(teamId)` for payments/RSVP/roster. Both already work for TMs.

**Estimated effort:** 2-3 hours

**Dependencies:** None — can be built and tested independently.

---

### Phase 2: Signup Flow Polish (LOW priority — functional as-is)

**Goal:** Make the "I run a team" path more prominent and intuitive.

**Files to modify:**
| File | Change |
|------|--------|
| `app/(auth)/signup.tsx:41` | Update TM card: title → "I Run a Team", subtitle → "Set up and manage my own team", icon → "rocket-outline" |
| `app/(auth)/signup.tsx:586-663` | Reorder Step 3 for TM: Primary = "Set Up My Team" button, Secondary = code input |

**Estimated effort:** 30-45 minutes

**Dependencies:** None.

---

### Phase 3: Invite Parents Feature (MEDIUM priority)

**Goal:** Make it easy for Solo TMs to share their team code after initial setup.

**Options:**
A. Add "Invite Parents" item to drawer → opens a modal showing team code with copy/share
B. Add "Invite Parents" as a quick action on the TM home dashboard

**Files to create:**
| File | Description |
|------|-------------|
| `components/InviteCodeModal.tsx` | Reusable modal showing team invite code with copy/share buttons (~100 lines) |

**Files to modify:**
| File | Change |
|------|--------|
| `components/GestureDrawer.tsx` | Add "Invite Parents" to Team Operations section |
| `components/TeamManagerHomeScroll.tsx` | Add "Invite Parents" to quick actions grid |

**Estimated effort:** 1-1.5 hours

**Dependencies:** Phase 1 (TeamManagerHomeScroll) should be built first.

---

### Phase 4: Tab Bar and Drawer Adjustments (NO CHANGES NEEDED for v1)

The current tab bar configuration for TMs is correct:
- Home | Schedule | Chat | More

The current drawer configuration is correct:
- Team Operations section has all necessary items
- All 4 previously-blocked screens are now accessible

**No files to modify.** This phase is complete by virtue of the quick fixes already applied.

---

### Phase Summary

| Phase | Description | Files Changed | Effort | Priority |
|-------|-------------|--------------|--------|----------|
| 1 | TM Home Dashboard | 2 (1 new, 1 modified) | 2-3 hours | **P0 — Ship first** |
| 2 | Signup Flow Polish | 1 modified | 30-45 min | P2 — Nice to have |
| 3 | Invite Parents Feature | 2-3 (1 new, 1-2 modified) | 1-1.5 hours | P1 — Important for activation |
| 4 | Tab Bar / Drawer | 0 | 0 | DONE (quick fixes applied) |

**Recommended execution order:** Phase 1 → Phase 3 → Phase 2

**After Phase 1, the TM experience is:**
- Dedicated home dashboard (no coach cards)
- All 8 core workflows functional (roster, schedule, payments, attendance, volunteers, blasts, chat, engagement)
- Correct tab bar (Home, Schedule, Chat, More)
- Correct drawer (Team Operations with 8 items)
- Role-aware greeting ("Hey Team Manager!")
- Channel management in chat

---

## END OF REPORT
