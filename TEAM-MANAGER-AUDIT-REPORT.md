# TEAM-MANAGER-AUDIT-REPORT.md
# Team Manager Role Experience Audit — Complete Report

**Date:** 2026-03-18
**Branch:** `navigation-cleanup-complete`
**Classification:** Investigation Only — No files modified.

---

## TASK 1: Team Manager Identity — How is the role detected?

### 1. How is Team Manager role detected?

**Yes, there is an `isTeamManager` flag.** Defined in `lib/permissions-context.tsx`:

```typescript
// lib/permissions-context.tsx:13
isTeamManager: boolean;

// lib/permissions-context.tsx:165
const isTeamManager = effectiveRoles.includes('team_manager');
```

**Database tables:**
- **Primary:** `user_roles` table — `role = 'team_manager'`, filtered by `user_id`, `organization_id`, `is_active = true`
- **Secondary:** `team_staff` table — `staff_role = 'team_manager'`, links TM to specific teams

```typescript
// lib/permissions-context.tsx:25-30 (user_roles query)
const { data: userRoles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .eq('organization_id', profile.current_organization_id)
  .eq('is_active', true);

// lib/permissions-context.tsx:33-37 (team_staff query)
const { data: teamStaff } = await supabase
  .from('team_staff')
  .select('team_id, staff_role')
  .eq('user_id', userId)
  .eq('is_active', true);
```

### 2. Is Team Manager in the `UserRole` type?

**Yes.** Exact string value: `'team_manager'`

```typescript
// lib/permissions.ts:3
export type UserRole = 'league_admin' | 'head_coach' | 'assistant_coach' | 'team_manager' | 'parent' | 'player';
```

### 3. How does the permissions context expose TM?

Via the `isTeamManager` boolean flag in the provider value:

```typescript
// lib/permissions-context.tsx:177
value={{
  context: effectiveContext,
  loading,
  primaryRole,
  isAdmin,
  isCoach,
  isTeamManager,    // <-- boolean flag
  isParent,
  isPlayer,
  can,
  refresh: loadPermissions,
  viewAs,
  setViewAs,
}}
```

### 4. Can a user be BOTH a Team Manager and a parent?

**Yes.** The `actualRoles` array can contain multiple roles. Auto-detection adds `parent` if the user has player connections, even if they are also a `team_manager`.

```typescript
// lib/permissions-context.tsx:126-144
const actualRoles: UserRole[] = [...rolesFromTable];
// Auto-add 'parent' if user has player connections
if (hasPlayerConnections && !actualRoles.includes('parent')) {
  actualRoles.push('parent');
}
```

Role priority when multiple roles exist: TM takes precedence over parent.

### 5. What `primaryRole` does a TM get?

**4th priority** — after league_admin, head_coach, assistant_coach:

```typescript
// lib/permissions.ts:150-156
export const getPrimaryRole = (roles: UserRole[]): UserRole => {
  const priority: UserRole[] = ['league_admin', 'head_coach', 'assistant_coach', 'team_manager', 'parent', 'player'];
  for (const role of priority) {
    if (roles.includes(role)) return role;
  }
  return 'parent';
};
```

---

## TASK 2: Team Manager Signup — Can a TM create an account?

### 1. Is "Team Manager" one of the role cards?

**Yes.** It's the second card in `ROLE_CARDS`:

```typescript
// app/(auth)/signup.tsx:40-45
const ROLE_CARDS = [
  { role: 'coach', icon: 'clipboard', title: 'Coach', subtitle: 'I coach a team', color: BRAND.teal },
  { role: 'team_manager', icon: 'build-outline', title: 'Team Manager', subtitle: 'I manage team operations', color: '#E76F51' },
  { role: 'parent', icon: 'people', title: 'Parent', subtitle: 'My child plays', color: BRAND.skyBlue },
  { role: 'player', icon: 'football', title: 'Player', subtitle: "I'm a player", color: BRAND.goldBrand },
];
```

- **Title:** "Team Manager"
- **Subtitle:** "I manage team operations"
- **Icon:** build-outline (wrench)
- **Color:** #E76F51 (burnt orange)

### 2. What happens after TM selects role and enters org code?

TMs skip COPPA consent (parent-only) and go directly to Step 3 (Connect):

```typescript
// app/(auth)/signup.tsx:104-110
const handleRoleSelect = (role: SelectedRole) => {
  setSelectedRole(role);
  setCoppaConsent(false);
  if (role !== 'parent') {
    setTimeout(() => animateToStep(3), 500);
  }
};
```

On submit with valid org code, the role `'team_manager'` is inserted into `user_roles`:

```typescript
// app/(auth)/signup.tsx:227-240
const roleMap: Record<string, string> = {
  coach: 'head_coach',
  team_manager: 'team_manager',
  parent: 'parent',
  player: 'player',
};
const dbRole = roleMap[selectedRole || 'parent'];

await supabase.from('user_roles').insert({
  user_id: user.id,
  organization_id: organizationId,
  role: dbRole,  // 'team_manager'
  is_active: true,
});
```

### 3. What happens if a TM skips the org code?

No `user_roles` entry is created. The TM lands in `/(tabs)` with no organization, no role. Empty states will guide them.

**TM also gets a unique "Start my own team" option:**

```typescript
// app/(auth)/signup.tsx:651-662
{selectedRole === 'team_manager' && (
  <TouchableOpacity onPress={handleStartMyOwnTeam} style={s.textBtn} disabled={submitting}>
    <Text style={s.textBtnLabel}>
      Or, <Text style={{ fontFamily: FONTS.bodyBold }}>start my own team</Text>
    </Text>
  </TouchableOpacity>
)}
```

This routes to `/team-manager-setup` wizard (no org, no role inserted yet — wizard handles it).

### 4. After signup, where does the TM land?

- **With org code:** Lands in `/(tabs)` via auth state change. DashboardRouter detects `team_manager` role and shows `CoachHomeScroll` (or `TeamManagerSetupPrompt` if no team assigned).
- **With "Start my own team":** Routes to `/team-manager-setup` wizard.
- **Skipping code:** Lands in `/(tabs)` with empty states.

---

## TASK 3: Team Manager Home Screen — What do they see?

### 1. What component renders for a Team Manager?

**`CoachHomeScroll`** — there is NO dedicated TM home scroll:

```typescript
// components/DashboardRouter.tsx:215-216
case 'team_manager':
  return <CoachHomeScroll />;
```

If TM has no team yet:
```typescript
// components/DashboardRouter.tsx:218
case 'team_manager_setup':
  return <TeamManagerSetupPrompt />;
```

### 2. Does the greeting say "Hey Coach!"?

**YES — CRITICAL UX BUG.** The greeting is hardcoded:

```typescript
// components/CoachHomeScroll.tsx:468
<Text style={styles.greetingLine1}>Hey Coach! {'\u{1F525}'}</Text>
```

The fallback briefing message is also coach-centric:
```typescript
// components/CoachHomeScroll.tsx:129
return 'Welcome to your coaching hub.';
```

**A Team Manager who is NOT a coach sees "Hey Coach!" — this is confusing and wrong.**

### 3. Are there coach-specific sections that don't apply to TMs?

**Yes — 8+ irrelevant sections are shown to TMs:**

| Section | Line | TM Relevance |
|---------|------|-------------|
| Momentum Cards (seasonRecord, attendanceRate, topPerformers) | 548-554 | LOW — coaching stats |
| Squad Faces Row (top performers) | 557-564 | NONE — coaching metric |
| Smart Nudge Card (shoutout suggestions) | 567-575 | NONE — coaching feature |
| Team Engagement Card | 578-580 | LOW — coaching metric |
| Action Grid ("Give Shoutout" etc.) | 583-587 | NONE — coaching actions |
| Coach Pulse Feed | 591 | NONE — coaching activity |
| Coach Trophy Case | 595-599 | NONE — coaching achievements |
| Team Stats Bar Chart | 602-604 | NONE — coaching analytics |

**TM-specific sections DO exist and render correctly:**

```typescript
// components/CoachHomeScroll.tsx:513-545
{isTeamManager && !tmData.loading && data.selectedTeamId && (
  <>
    <ManagerPaymentCard ... />
    <ManagerAvailabilityCard ... />
    <ManagerRosterCard ... />
  </>
)}
```

### 4. What data hooks power the TM home?

- **`useCoachHomeData()`** — returns coaching-focused data (stats, performers, events). Works for TMs but provides mostly irrelevant data.
- **`useTeamManagerData(teamId)`** — returns TM-specific data (overduePayments, overdueAmount, pendingPayments, totalCollected, RSVP counts, registration stats, rosterCount). This is the correct data source for TMs.

---

## TASK 4: Team Manager Tab Bar — What tabs do they see?

```typescript
// app/(tabs)/_layout.tsx:47
const isTeamManagerMode = isTeamManager && !isAdmin && !isCoach;
```

| Tab | Route | Visible to TM? | Condition |
|-----|-------|----------------|-----------|
| Home | `index` | YES | Always visible |
| Game Day | `gameday` | **NO** | `isTeamManagerMode` hides it (line 248) |
| Schedule | `coach-schedule` | **YES** | `isTeamManagerMode ? undefined : null` (line 318) |
| Chat | `chats` | YES | Always visible |
| More (☰) | `menu-placeholder` | YES | Always visible |

**TM tab configuration:**
```typescript
// app/(tabs)/_layout.tsx:248
href: (!showManageTab && !isParentOnly && !isTeamManagerMode) ? undefined : null,
// When isTeamManagerMode=true → evaluates to null → HIDDEN

// app/(tabs)/_layout.tsx:318
href: isTeamManagerMode ? undefined : null,
// When isTeamManagerMode=true → evaluates to undefined → VISIBLE
```

**Assessment:** Game Day is correctly hidden (TMs don't run game command). Schedule tab correctly shows the coach-schedule screen (full event management).

---

## TASK 5: Team Manager Drawer — What menu items do they have?

### 1. Team Operations section

```typescript
// components/GestureDrawer.tsx:158-175
{
  id: 'team_ops',
  title: 'Team Operations',
  collapsible: true,
  defaultOpen: true,
  roleGate: 'team_manager',
  items: [
    { icon: 'people', label: 'Roster', route: '/(tabs)/players' },
    { icon: 'calendar', label: 'Schedule', route: '/(tabs)/coach-schedule' },
    { icon: 'card', label: 'Payments', route: '/(tabs)/payments' },
    { icon: 'checkmark-circle', label: 'Attendance', route: '/attendance' },
    { icon: 'hand-left-outline', label: 'Volunteers', route: '/volunteer-assignment' },
    { icon: 'bar-chart', label: 'Engagement', route: '/coach-engagement' },
    { icon: 'megaphone', label: 'Blast Composer', route: '/blast-composer' },
    { icon: 'time', label: 'Blast History', route: '/blast-history' },
  ],
}
```

**Other sections visible to TM:**

| Section | Items |
|---------|-------|
| Quick Access (all roles) | Home, Schedule, Chats, Team Wall |
| Settings & Privacy (all roles) | My Profile, Settings, Notification Inbox, Notification Settings, Season History, Find Organizations, Privacy Policy, Terms of Service, Help Center, Data Rights |

### 2. Items that link to screens the TM can't actually use?

**YES — 4 screens are BLOCKED by role guards (see Task 8):**

| Drawer Item | Route | Guard | TM Blocked? |
|-------------|-------|-------|-------------|
| Attendance | `/attendance` | `!isAdmin && !isCoach` | **YES — BLOCKED** |
| Volunteers | `/volunteer-assignment` | `!isAdmin && !isCoach` | **YES — BLOCKED** |
| Blast Composer | `/blast-composer` | `!isAdmin && !isCoach` | **YES — BLOCKED** |
| Blast History | `/blast-history` | `!isAdmin && !isCoach` | **YES — BLOCKED** |

**TMs can navigate to these from the drawer, but they see "Access Restricted — Staff permissions required." and a "Go Home" button.**

### 3. Missing items TMs SHOULD have?

| Feature | Admin Has? | TM Has? | Notes |
|---------|-----------|---------|-------|
| Registration Management | Yes (`/registration-hub`) | No | TM should see pending registrations |
| Waiver Collection | Yes (web-only) | No | TM should verify waiver status |

### 4. Does the drawer show other sections?

Yes — Quick Access and Settings & Privacy are visible to all roles.

---

## TASK 6: Team Manager Core Workflows — Do they actually work?

### 6a. Viewing their team roster — ✅ WORKS

- **Route:** `/(tabs)/players` (via drawer → "Roster")
- **Guard:** None. Screen destructures `isAdmin, isCoach` only for conditional UI (line 47)
- **Data:** Loads correctly — queries filter by user's team
- **Limitation:** "Add Player" button is gated to `isAdmin` only (line 252-256). TMs can view but not add players.

### 6b. Viewing/managing the schedule — ✅ WORKS

- **Route:** `/(tabs)/coach-schedule` (tab bar + drawer)
- **Guard:** None. Explicitly destructures `isTeamManager` (line 107)
- **Data:** Loads correctly — TMs linked via `team_staff` table
- **Capabilities:** TMs CAN create events, view events, filter by team, add to calendar, see RSVP counts
- **Note:** Event creation has NO role guard — TMs can create events just like coaches

### 6c. Tracking payments — ✅ WORKS

- **Route:** `/(tabs)/payments` (via drawer → "Payments")
- **Guard:** None. Destructures `isAdmin, isParent, isTeamManager` (line 101)
- **Data:** Loads correctly for TMs
- **Capabilities:** TMs can view payment status, mark payments, send reminders

### 6d. Taking attendance — ❌ BLOCKED

- **Route:** `/attendance` (via drawer → "Attendance")
- **Guard:** `!isAdmin && !isCoach` (line 79-92)
- **Destructures:** `isAdmin, isCoach, loading` — does NOT check `isTeamManager`
- **Result:** TM sees "Access Restricted — Staff permissions required." lock screen

```typescript
// app/attendance.tsx:75
const { isAdmin, isCoach, loading } = usePermissions();

// app/attendance.tsx:79
if (!isAdmin && !isCoach) {
  // Shows lock screen with "Staff permissions required."
}
```

### 6e. Managing volunteers — ❌ BLOCKED

- **Route:** `/volunteer-assignment` (via drawer → "Volunteers")
- **Guard:** `!isAdmin && !isCoach` (line 123-136)
- **Destructures:** `isAdmin, isCoach, loading: permLoading` — does NOT check `isTeamManager`
- **Result:** TM sees "Access Restricted — Staff permissions required." lock screen

```typescript
// app/volunteer-assignment.tsx:119
const { isAdmin, isCoach, loading: permLoading } = usePermissions();

// app/volunteer-assignment.tsx:123
if (!isAdmin && !isCoach) {
  // Shows lock screen with "Staff permissions required."
}
```

### 6f. Sending blast messages — ❌ BLOCKED (both screens)

**Blast Composer:**
- **Route:** `/blast-composer` (via drawer → "Blast Composer")
- **Guard:** `!isAdmin && !isCoach` (line 60-73)
- **Destructures:** `isAdmin, isCoach, loading` — does NOT check `isTeamManager`

```typescript
// app/blast-composer.tsx:56
const { isAdmin, isCoach, loading } = usePermissions();

// app/blast-composer.tsx:60
if (!isAdmin && !isCoach) {
  // Shows lock screen with "Staff permissions required."
}
```

**Blast History:**
- **Route:** `/blast-history` (via drawer → "Blast History")
- **Guard:** `!isAdmin && !isCoach` (line 103-116)
- **Destructures:** `isAdmin, isCoach, loading: permLoading` — does NOT check `isTeamManager`

```typescript
// app/blast-history.tsx:99
const { isAdmin, isCoach, loading: permLoading } = usePermissions();

// app/blast-history.tsx:103
if (!isAdmin && !isCoach) {
  // Shows lock screen with "Staff permissions required."
}
```

### 6g. Chat/communication — ⚠️ PARTIAL

- **Route:** `/(tabs)/chats` (tab bar)
- **Guard:** None — screen is accessible to all roles
- **Limitation:** `canManageChannels = isCoach || isAdmin` (line 125) — TMs CANNOT create or manage channels
- **TM role in channels:** Falls through to `profile.account_type` instead of being recognized as staff

```typescript
// app/(tabs)/chats.tsx:121
const { isAdmin, isCoach } = usePermissions();

// app/(tabs)/chats.tsx:125
const canManageChannels = isCoach || isAdmin;
// TM is NOT included — cannot create channels
```

---

## TASK 7: Team Manager Greeting and Branding

### 7a. "Hey Coach" and coach-specific greeting text

| File | Line | Text | TM Sees It? |
|------|------|------|-------------|
| `components/CoachHomeScroll.tsx` | 468 | `Hey Coach! 🔥` | **YES — BUG** |
| `components/CoachHomeScroll.tsx` | 129 | `Welcome to your coaching hub.` | **YES — BUG** (fallback) |

**Only 2 occurrences in actual code.** Other occurrences are in spec/audit markdown files.

### 7b. "Team Manager" UI text — where is the role acknowledged?

| File | Line | Context | Text Shown |
|------|------|---------|-----------|
| `app/(auth)/signup.tsx` | 42 | Role card title | "Team Manager" |
| `app/(auth)/signup.tsx` | 42 | Role card subtitle | "I manage team operations" |
| `app/(tabs)/settings.tsx` | 148 | Role display label | "Team Manager" |
| `lib/permissions.ts` | 163 | Global display name | "Team Manager" |
| `components/GestureDrawer.tsx` | 48 | Drawer role short name | "Team Mgr" |
| `components/GestureDrawer.tsx` | 35 | Role color | `#E76F51` (coral) |
| `components/GestureDrawer.tsx` | 161 | Menu section title | "Team Operations" |
| `components/empty-states/NoTeamState.tsx` | 24-26 | Empty state message | "Your admin will assign you to a team..." |
| `components/empty-states/TeamManagerSetupPrompt.tsx` | — | Setup wizard prompt | "Let's set up your team!" |
| `components/coach-scroll/ManagerPaymentCard.tsx` | — | Home card | Payment health for TM |
| `components/coach-scroll/ManagerAvailabilityCard.tsx` | — | Home card | RSVP breakdown for TM |
| `components/coach-scroll/ManagerRosterCard.tsx` | — | Home card | Roster glance for TM |

**Assessment:** TM is well-branded throughout EXCEPT the home screen greeting ("Hey Coach!") and fallback briefing ("Welcome to your coaching hub.").

---

## TASK 8: Team Manager Role Guards — What we broke

### Critical Finding

The role guards added in the recent PR use `!isAdmin && !isCoach` as the blocking condition. Since Team Manager is a SEPARATE role (not `isCoach`), TMs are blocked from screens they need.

### Complete Guard Audit — All 21 Screens

#### Admin-Only Screens (6) — TM Correctly Blocked

| # | Screen | Guard | TM Should Access? |
|---|--------|-------|--------------------|
| 1 | `app/(tabs)/coaches.tsx` | `!isAdmin` | No |
| 13 | `app/coach-directory.tsx` | `!isAdmin` | No |
| 14 | `components/ReportViewerScreen.tsx` | `!isAdmin` | No |
| 15 | `components/ReportsScreen.tsx` | `!isAdmin` | No |
| 20 | `app/venue-manager.tsx` | `!isAdmin` | No |
| 21 | `app/web-features.tsx` | `!isAdmin` | No |

#### Coach+Admin Screens (11) — TM Correctly Blocked

| # | Screen | Guard | TM Should Access? |
|---|--------|-------|--------------------|
| 2 | `app/player-evaluations.tsx` | `!isAdmin && !isCoach` | No — coaching feature |
| 3 | `app/player-evaluation.tsx` | `!isAdmin && !isCoach` | No — coaching feature |
| 4 | `app/player-goals.tsx` | `!isAdmin && !isCoach` | No — coaching feature |
| 5 | `app/game-day-command.tsx` | `!isAdmin && !isCoach` | No — coaching feature |
| 6 | `app/lineup-builder.tsx` | `!isAdmin && !isCoach` | No — coaching feature |
| 7 | `app/evaluation-session.tsx` | `!isAdmin && !isCoach` | No — coaching feature |
| 10 | `app/coach-challenge-dashboard.tsx` | `!isAdmin && !isCoach` | No — coaching feature |
| 11 | `app/game-prep-wizard.tsx` | `!isAdmin && !isCoach` | No — coaching feature |
| 16 | `app/challenge-library.tsx` | `!isAdmin && !isCoach` | No — coaching feature |
| 18 | `app/coach-availability.tsx` | `!isAdmin && !isCoach` | No — coaching feature |
| 19 | `app/coach-profile.tsx` | `!isAdmin && !isCoach` | No — coaching feature |

#### TM Screens (4) — ❌ INCORRECTLY BLOCKED

| # | Screen | Guard | TM Should Access? | Fix Required |
|---|--------|-------|--------------------|--------------|
| 8 | `app/blast-composer.tsx` | `!isAdmin && !isCoach` | **YES** | Add `&& !isTeamManager` |
| 9 | `app/blast-history.tsx` | `!isAdmin && !isCoach` | **YES** | Add `&& !isTeamManager` |
| 12 | `app/attendance.tsx` | `!isAdmin && !isCoach` | **YES** | Add `&& !isTeamManager` |
| 17 | `app/volunteer-assignment.tsx` | `!isAdmin && !isCoach` | **YES** | Add `&& !isTeamManager` |

**These 4 screens are listed in the TM drawer menu ("Team Operations" section in GestureDrawer.tsx) but the TM is blocked by the role guards.**

---

## TASK 9: Team Manager vs Coach — Capability Matrix

| Capability | Coach | Team Manager | Notes |
|------------|-------|-------------|-------|
| View roster | ✅ | ✅ | Both can view; only Admin can add players |
| Game Day tools | ✅ | ❌ | Correctly hidden from TM tab bar |
| Lineups | ✅ | ❌ | Coaching feature, correctly blocked |
| Evaluations | ✅ | ❌ | Coaching feature, correctly blocked |
| Challenges | ✅ | ❌ | Coaching feature, correctly blocked |
| Schedule (view) | ✅ | ✅ | TM uses coach-schedule tab |
| Schedule (create) | ✅ | ✅ | No role guard on event creation |
| Attendance | ✅ | ❌ **BUG** | Should be ✅ — blocked by guard |
| Payments | ✅ | ✅ | TM can view/manage payments |
| Blast messages | ✅ | ❌ **BUG** | Should be ✅ — blocked by guard |
| Volunteers | ✅ | ❌ **BUG** | Should be ✅ — blocked by guard |
| Chat (view) | ✅ | ✅ | Both can view channels |
| Chat (manage channels) | ✅ | ❌ | TM excluded from `canManageChannels` |
| Shoutouts | ✅ | ❌ | Coaching feature |
| Game Prep Wizard | ✅ | ❌ | Coaching feature, correctly blocked |
| Reports | Admin only | ❌ | Correctly blocked |
| Coach Profile | ✅ | ❌ | Coaching feature, correctly blocked |

---

## TASK 10: Summary and Fix Plan

### 1. Critical Issues — Broken or embarrassing for TMs right now

| # | Issue | Severity | File(s) |
|---|-------|----------|---------|
| C1 | **4 core TM screens blocked by role guards** — attendance, volunteers, blast-composer, blast-history all show "Access Restricted" to TMs | **P0 — BROKEN** | `attendance.tsx`, `volunteer-assignment.tsx`, `blast-composer.tsx`, `blast-history.tsx` |
| C2 | **Home screen says "Hey Coach!"** to Team Managers | **P1 — EMBARRASSING** | `CoachHomeScroll.tsx:468` |
| C3 | **8+ coach-specific cards shown to TMs** (top performers, trophy case, stats chart, pulse feed, etc.) | **P1 — CONFUSING** | `CoachHomeScroll.tsx:548-611` |

### 2. Quick Fixes — Under an hour each

| # | Fix | Effort | Files to Change |
|---|-----|--------|----------------|
| Q1 | **Update 4 role guards** to include `isTeamManager`: change `!isAdmin && !isCoach` to `!isAdmin && !isCoach && !isTeamManager` | 15 min | `attendance.tsx`, `volunteer-assignment.tsx`, `blast-composer.tsx`, `blast-history.tsx` |
| Q2 | **Fix greeting text** — make it role-aware: `isTeamManager ? "Hey Team Manager!" : "Hey Coach!"` (or use first name) | 15 min | `CoachHomeScroll.tsx:468` |
| Q3 | **Fix fallback briefing** — change "Welcome to your coaching hub." to role-aware text | 5 min | `CoachHomeScroll.tsx:129` |
| Q4 | **Add `isTeamManager` to `canManageChannels`** in chats for TM channel creation | 10 min | `chats.tsx:125` |

### 3. Larger Changes — Need more thought or design decisions

| # | Change | Effort | Notes |
|---|--------|--------|-------|
| L1 | **Create dedicated `TeamManagerHomeScroll`** — remove coach cards, enlarge TM cards (payments, availability, roster), add registration widget | 2-4 hours | Prevents future drift; requires design decision on TM home layout |
| L2 | **Add registration management screen for TMs** — view pending registrations, approve players | 4-8 hours | Currently admin-only (`/registration-hub`); TMs need at least a read-only view |
| L3 | **Add waiver verification for TMs** — view which players have completed waivers | 2-4 hours | Currently admin/web-only |
| L4 | **Scope blast messages to TM's team** — ensure TMs can only blast their team, not the whole org | 1-2 hours | Need to verify blast-composer already scopes by team |

### 4. Role Guard Conflicts — Specific screens to update

| File | Current Guard | Required Guard | Line |
|------|---------------|---------------|------|
| `app/attendance.tsx` | `!isAdmin && !isCoach` | `!isAdmin && !isCoach && !isTeamManager` | 79 |
| `app/volunteer-assignment.tsx` | `!isAdmin && !isCoach` | `!isAdmin && !isCoach && !isTeamManager` | 123 |
| `app/blast-composer.tsx` | `!isAdmin && !isCoach` | `!isAdmin && !isCoach && !isTeamManager` | 60 |
| `app/blast-history.tsx` | `!isAdmin && !isCoach` | `!isAdmin && !isCoach && !isTeamManager` | 103 |

Each file also needs to add `isTeamManager` to the `usePermissions()` destructure.

### 5. Recommendation

**Team Manager is NOT ready for day-one users.**

The 4 blocked screens (Q1) are a P0 — TMs literally cannot do their core job (attendance, volunteers, blasts). However, these are all **15-minute fixes**. The greeting bug (Q2) is embarrassing but not blocking.

**Recommended path:**
1. **Quick fixes Q1-Q3** (30-40 minutes) — Unblock TM role immediately
2. **Ship to day-one users** — TM experience is functional after quick fixes
3. **Sprint on L1-L4** in a future cycle — Dedicated TM home, registration management, waiver verification

After quick fixes Q1-Q3, Team Manager can:
- ✅ View roster
- ✅ Manage schedule (create/view events)
- ✅ Track and manage payments
- ✅ Take attendance (after Q1 fix)
- ✅ Manage volunteers (after Q1 fix)
- ✅ Send blast messages (after Q1 fix)
- ✅ View blast history (after Q1 fix)
- ✅ Chat with parents
- ⚠️ See coach cards on home (cosmetic — fixable in L1)

---

## END OF REPORT
