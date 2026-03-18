# CC-TEAM-MANAGER-EXECUTE
# Lynx Team Manager Role — Comprehensive Execution Spec
# Based on two investigation reports (role system + signup/onboarding)
# Status: READY FOR CC EXECUTION

---

## STANDING RULES

1. **Read these files first:** `CC-LYNX-RULES.md`, `AGENTS.md`, `SCHEMA_REFERENCE.csv`
2. **Every change in this spec references an exact file and line number from the investigation reports.** If a line number has shifted due to earlier phases, find the equivalent code by matching the code snippet shown.
3. **Do NOT modify any file not listed in this spec.**
4. **Do NOT add any new screens or components in this spec.** This is role plumbing only. Operational UI cards (payments, registration) come in a follow-up spec.
5. **Commit after each phase.** Commit message format: `[team-manager] Phase X: description`
6. **After EACH phase, run `npx tsc --noEmit` and report any errors before proceeding.**
7. **If something is unclear, STOP and report back.**
8. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Adds Team Manager as a first-class role in Lynx. After this spec:
- A new user can download Lynx, sign up, select "Team Manager", enter an invite code, and land on their home screen
- An existing user can have Team Manager added to their roles (by admin or via invite)
- Team Manager can coexist with any other role: TM+Parent, TM+Coach, TM+Coach+Parent, TM only
- Team Manager sees the Coach Home scroll and gets Home | Schedule | Chat | More tabs
- Team Manager has access to: roster, schedule, payments, parent comms, attendance, engagement dashboard, chat
- Team Manager does NOT have access to: lineup builder, game stats entry, game day start, challenge creation, XP boost creation

---

## PHASE 1: Type System + Display Names

**These are LOW RISK, isolated changes. No runtime behavior changes.**

### 1A: lib/permissions.ts

**Line 3** — Add to UserRole union:
```typescript
// Before:
export type UserRole = 'league_admin' | 'head_coach' | 'assistant_coach' | 'parent' | 'player';
// After:
export type UserRole = 'league_admin' | 'head_coach' | 'assistant_coach' | 'team_manager' | 'parent' | 'player';
```

**Line 148** — Add to priority array (after assistant_coach, before parent):
```typescript
const priority: UserRole[] = ['league_admin', 'head_coach', 'assistant_coach', 'team_manager', 'parent', 'player'];
```

**Lines 156-162** — Add to roleDisplayName:
```typescript
export const roleDisplayName: Record<UserRole, string> = {
  league_admin: 'League Admin',
  head_coach: 'Head Coach',
  assistant_coach: 'Assistant Coach',
  team_manager: 'Team Manager',  // ADD
  parent: 'Parent',
  player: 'Player',
};
```

### 1B: app/users.tsx

**Line 26** — Add to local UserRole type:
```typescript
type UserRole = 'league_admin' | 'head_coach' | 'assistant_coach' | 'team_manager' | 'parent' | 'player';
```

**Line 396** — Add to priority array:
```typescript
// Add 'team_manager' after 'assistant_coach' in the priority sort
```

**Lines 430-432** — Add TM to role filter options (if there's a filter dropdown).

### 1C: app/(tabs)/me.tsx

**Lines 125-131** — Add team_manager label to role labels map.

### 1D: app/(tabs)/settings.tsx

**Lines 162-166** — Add team_manager option to role switch list.

### 1E: lib/achievement-engine.ts

**Lines 14-17** — Add team_manager to ROLE_DB_MAP:
```typescript
const ROLE_DB_MAP: Record<string, string[]> = {
  coach: ['head_coach', 'assistant_coach'],
  team_manager: ['team_manager'],  // ADD
  parent: ['parent'],
  admin: ['league_admin'],
  player: ['player'],
};
```

### 1F: hooks/useGlobalSearch.ts

**Lines 202 and 290** — Add 'team_manager' to staff search:
```typescript
.in('primary_role', ['head_coach', 'assistant_coach', 'league_admin', 'team_manager'])
```

**Commit:** `[team-manager] Phase 1: type system and display names`
**Run `npx tsc --noEmit` and report.**

---

## PHASE 2: Permission Engine

**HIGH RISK. Changes affect what every user can do. Be precise.**

### 2A: lib/permissions.ts — Permission grants

**Line 82-84** — `manageTeam`: Add team_manager
```typescript
// Before: t.role === 'head_coach'
// After:  t.role === 'head_coach' || t.role === 'team_manager'
```

**Line 99-101** — `viewTeamPayments`: Add team_manager
```typescript
// Before: t.role === 'head_coach'
// After:  t.role === 'head_coach' || t.role === 'team_manager'
```

**Line 103-105** — `sendTeamBlasts`: Add team_manager
```typescript
// Before: t.role === 'head_coach'
// After:  t.role === 'head_coach' || t.role === 'team_manager'
```

**Line 107-109** — `createTeamInviteCodes`: Add team_manager
```typescript
// Before: t.role === 'head_coach'
// After:  t.role === 'head_coach' || t.role === 'team_manager'
```

**Lines 112-129** — Chat permissions: Add 'team_manager' to every role array that includes coach roles:
```typescript
// postInTeamChat, postInPlayerChat, viewPlayerChat
// Add 'team_manager' alongside 'head_coach', 'assistant_coach'
```

**Line 131-133** — `moderateChat`: Add team_manager
```typescript
// Before: t.role === 'head_coach'
// After:  t.role === 'head_coach' || t.role === 'team_manager'
```

**DO NOT ADD team_manager to these (lines 86-92):**
- `addAssistantCoach` — TM cannot add coaches
- `assignPlayers` — TM cannot assign players to teams (admin/head coach only)

**DO NOT ADD team_manager to admin-only permissions (lines 57-79):**
- All org management permissions stay admin-only

### 2B: lib/permissions-context.tsx — Role detection

**Lines 7-25** — Add isTeamManager to PermissionsContextType:
```typescript
isTeamManager: boolean;  // ADD to the interface
```

**Line 27 (default context)** — Add default:
```typescript
isTeamManager: false,  // ADD to default
```

**Lines 122-147** — Add Team Manager auto-detection.
Find where coach auto-detection happens (checking team_staff for coach roles). Add a SEPARATE check for team_manager. This is critical: do NOT merge TM detection with coach detection.

```typescript
// After the existing coach auto-detection block:
// Auto-detect team_manager from team_staff
if (!actualRoles.includes('team_manager')) {
  const { data: tmStaff } = await supabase
    .from('team_staff')
    .select('id')
    .eq('user_id', userId)
    .eq('staff_role', 'team_manager')
    .eq('is_active', true)
    .limit(1);

  if (tmStaff && tmStaff.length > 0) {
    actualRoles.push('team_manager');
  }
}
```

**Lines 158-161** — Add isTeamManager boolean:
```typescript
const isTeamManager = effectiveRoles.includes('team_manager');
```

**Lines 144-147** — Player preview: Add TM to the check that allows non-player roles to preview as player:
```typescript
// Before: if (hasAdminRole || hasCoachRole) { ... add player preview }
// After: if (hasAdminRole || hasCoachRole || actualRoles.includes('team_manager')) { ... }
```

**Expose isTeamManager in the context value** (find the return/value object and add it).

**Commit:** `[team-manager] Phase 2: permission engine`
**Run `npx tsc --noEmit` and report.**

---

## PHASE 3: Dashboard Routing

**HIGH RISK. Wrong priority order = wrong home screen.**

### 3A: components/DashboardRouter.tsx

**Line 20** — Add to DashboardType:
```typescript
type DashboardType = 'admin' | 'coach' | 'team_manager' | 'parent' | 'coach_parent' | 'player' | 'loading';
```

**Lines 106-122** — Add team_manager to viewAs/devModeRole handling. Add AFTER the coach check but BEFORE parent:
```typescript
if (devModeRole === 'team_manager') {
  return 'team_manager';
}
```

**Lines 152-176** — Fix checkIfCoachHasTeams() cascade. This is the #1 risk.

The current code queries `team_staff` without checking `staff_role`. A TM-only user would be misdetected as a coach. Fix:

```typescript
// In the natural detection flow, BEFORE checking team_staff for coach:
// Check if user is a team_manager (but NOT a coach)
if (isTeamManager && !isCoach) {
  // Check if TM has teams
  const { data: tmTeams } = await supabase
    .from('team_staff')
    .select('team_id')
    .eq('user_id', userId)
    .eq('staff_role', 'team_manager')
    .eq('is_active', true)
    .limit(1);

  if (tmTeams && tmTeams.length > 0) {
    // TM with teams and also has kids? → team_manager (they see coach scroll with TM cards)
    // TM with teams and no kids? → team_manager
    return hasKids ? 'team_manager' : 'team_manager';
  }
}
```

**In the dashboard component render**, map 'team_manager' to CoachHomeScroll:
```typescript
case 'team_manager':
  return <CoachHomeScroll />;
```

This is intentional. Team Manager sees the Coach Home scroll. The operational cards (payments, registration) will be added in a follow-up spec based on role detection within CoachHomeScroll.

**Commit:** `[team-manager] Phase 3: dashboard routing`
**Run `npx tsc --noEmit` and report.**

---

## PHASE 4: Tab Bar

**HIGH RISK. Wrong boolean logic = wrong tabs for all users.**

### 4A: app/(tabs)/_layout.tsx

**Read the current boolean logic carefully before changing anything.**

Current (lines 67-69):
```typescript
const showManageTab = isAdmin;
const isParentOnly = isParent && !isAdmin && !isCoach;
const isPlayerMode = viewAs === 'player' || (!isAdmin && !isCoach && !isParent && isPlayer);
```

**Add isTeamManager to the destructure from usePermissions():**
```typescript
const { isAdmin, isCoach, isParent, isPlayer, isTeamManager, viewAs } = usePermissions();
```

**Add Team Manager booleans:**
```typescript
const isTeamManagerMode = isTeamManager && !isAdmin && !isCoach;
// TM who is also a coach sees Coach tabs (with Game Day), not TM tabs
```

**Update isParentOnly to exclude TM:**
```typescript
const isParentOnly = isParent && !isAdmin && !isCoach && !isTeamManager;
```

**Update isPlayerMode to exclude TM:**
```typescript
const isPlayerMode = viewAs === 'player' || (!isAdmin && !isCoach && !isParent && !isTeamManager && isPlayer);
```

**Tab 2 slot logic — Add Schedule tab for TM:**

Find the tab definitions. The Team Manager gets the Schedule tab (coach-schedule screen) as their Tab 2. Add a new conditional for the schedule tab:

If using Expo Router's `href: null` pattern:
```typescript
// For the coach-schedule tab (or add a new tab entry):
// Show for TM-only users (not already showing as coach's Game Day tab)
href: isTeamManagerMode ? undefined : (/* existing condition for other roles */)
```

**Critical: Make sure Game Day tab does NOT show for TM-only users:**
```typescript
// gameday tab href:
href: (!showManageTab && !isParentOnly && !isTeamManagerMode) ? undefined : null
// This ensures TM-only doesn't get Game Day
```

**If TM is also a Coach** (`isTeamManager && isCoach`): they see Coach tabs (Game Day), NOT the TM Schedule tab. The coach tabs include Game Day which is more important. The TM operational features are accessible via the drawer.

**Commit:** `[team-manager] Phase 4: tab bar configuration`
**Run `npx tsc --noEmit` and report.**

---

## PHASE 5: Gesture Drawer + Role Selector

**MEDIUM RISK. Mostly additive.**

### 5A: components/RoleSelector.tsx

**Lines 15-21** — Add TM to roleOptions (after assistant_coach, before parent):
```typescript
{ key: 'team_manager', label: 'Team Mgr', icon: 'build-outline', color: '#E76F51' },
```

**Line 40** — Add to priority order.

### 5B: components/GestureDrawer.tsx

**Lines 233-237** — Add TM to role options:
```typescript
{ key: 'team_manager', label: 'Team Manager', icon: 'build-outline', color: '#E76F51' },
```

**Line 241** — Add to priority order (after 'assistant_coach', before 'parent').

**Line 402** — Add drawer section visibility for TM. Find the section that shows coaching tools. Add a parallel check for TM:
```typescript
const viewingAsTeamManager = viewAs === 'team_manager' || (!viewAs && isTeamManager && !isCoach && !isAdmin);
```

Show operational drawer items for TM:
- Roster (link to /(tabs)/players)
- Schedule (link to /(tabs)/coach-schedule)
- Payments (link to /(tabs)/payments)
- Attendance (link to /attendance)
- Volunteers (link to /volunteer-assignment)
- Engagement (link to /coach-engagement)

These can go in the same "Coaching Tools" section (renamed to "Team Tools" when viewingAsTeamManager) OR in a new "Team Operations" section. Choose whichever is simpler.

**Line 432** — Schedule route for TM: TM should route to coach-schedule, not parent-schedule:
```typescript
// If TM, route to coach-schedule
```

### 5C: hooks/useCoachHomeData.ts

**Line 22** — Expand role type:
```typescript
role: 'head_coach' | 'assistant_coach' | 'team_manager'
```

**Line 181** — Handle team_manager staff_role:
```typescript
// When resolving role from team_staff, handle 'team_manager':
const role = staffData?.staff_role || 'assistant_coach';
// This already works if staff_role is 'team_manager' — just ensure the type accepts it
```

**Commit:** `[team-manager] Phase 5: drawer and role selector`
**Run `npx tsc --noEmit` and report.**

---

## PHASE 6: Signup Flow

**LOW RISK. Additive changes to signup screen.**

### 6A: app/(auth)/signup.tsx

**Line 25** — Add to SelectedRole:
```typescript
type SelectedRole = 'coach' | 'parent' | 'player' | 'team_manager' | null;
```

**Lines 40-44** — Add TM card to ROLE_CARDS array. Place it AFTER Coach, BEFORE Parent:
```typescript
{
  key: 'team_manager',
  title: 'Team Manager',
  subtitle: 'I manage team operations',
  icon: 'build-outline',  // Ionicons wrench
  color: '#E76F51',       // Coral/warm orange
},
```

**Lines 237-241** — Add to roleMap:
```typescript
const roleMap: Record<string, string> = {
  coach: 'head_coach',
  team_manager: 'team_manager',  // ADD
  parent: 'parent',
  player: 'player',
};
```

**Lines 512-515** — Add TM-specific subtitle for Step 3:
```typescript
selectedRole === 'team_manager'
  ? 'Have an invite code from your organization?'
  : selectedRole === 'player'
    ? 'Your coach may have given you a code'
    : 'Have an invite code?'
```

**Line 563** — Keep "Create org" link hidden for TM (it's currently coach-only, no change needed since the condition checks `selectedRole === 'coach'`).

### 6B: components/empty-states/NoTeamState.tsx

**Line 7** — Add to role type:
```typescript
role: 'admin' | 'coach' | 'parent' | 'player' | 'team_manager'
```

**Lines 10-23** — Add TM message:
```typescript
case 'team_manager':
  return 'Your admin will assign you to a team. Once assigned, your team dashboard will appear here.';
```

**Commit:** `[team-manager] Phase 6: signup flow`
**Run `npx tsc --noEmit` and report.**

---

## PHASE 7: Screen Access Guards

**MEDIUM RISK. Expanding existing guards.**

### 7A: app/(tabs)/coach-schedule.tsx (line 106)

Add isTeamManager to the access check:
```typescript
const { isCoach, isAdmin, isTeamManager } = usePermissions();
// Allow access if coach, admin, or team_manager
```

### 7B: app/attendance.tsx (~line 60)

Add isTeamManager to coach access check.

### 7C: app/volunteer-assignment.tsx (~line 155)

Add isTeamManager to coach team resolution.

### 7D: app/coach-engagement.tsx (~line 48)

Add isTeamManager to coach access check.

### 7E: app/(tabs)/payments.tsx (line 101)

Add isTeamManager to the access check. TM should see team-scoped payment data:
```typescript
const { isAdmin, isParent, isTeamManager } = usePermissions();
// isTeamManager should see payments for their team
```

**Note:** The payments screen (25,694 lines) is complex. Only add the role guard expansion. Do NOT restructure the payment views in this spec.

### 7F: app/(tabs)/connect.tsx (line 46)

Add TM to role determination:
```typescript
const role = isAdmin ? 'admin' : (isCoach || isTeamManager) ? 'coach' : isParent ? 'parent' : 'player';
```

### 7G: hooks/useDrawerBadges.ts (line 28)

Add isTeamManager to badge visibility logic.

### 7H: app/challenges.tsx (line 62)

Do NOT add team_manager here. TM cannot manage challenges. Verify the guard excludes TM.

**Commit:** `[team-manager] Phase 7: screen access guards`
**Run `npx tsc --noEmit` and report.**

---

## PHASE 8: RLS Policy Migration

Create a new migration:
```
supabase/migrations/20260316_team_manager_rls.sql
```

**Only update the 5 policies identified in the investigation. Do NOT touch the 4 excluded policies.**

```sql
-- =============================================================================
-- TEAM MANAGER ROLE — RLS POLICY UPDATES
-- Adds 'team_manager' to 5 engagement policies
-- Does NOT touch: coach_challenges, xp_boost_events, team_quests write policies
-- =============================================================================

-- 1. daily_quests_coach_select
DROP POLICY IF EXISTS "daily_quests_coach_select" ON daily_quests;
CREATE POLICY "daily_quests_coach_select" ON daily_quests
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      WHERE ts.user_id = auth.uid() AND ts.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('head_coach', 'assistant_coach', 'league_admin', 'team_manager')
        AND is_active = true
    )
  );

-- 2. weekly_quests_coach_select
DROP POLICY IF EXISTS "weekly_quests_coach_select" ON weekly_quests;
CREATE POLICY "weekly_quests_coach_select" ON weekly_quests
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      WHERE ts.user_id = auth.uid() AND ts.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('head_coach', 'assistant_coach', 'league_admin', 'team_manager')
        AND is_active = true
    )
  );

-- 3. league_standings_coach_select
DROP POLICY IF EXISTS "league_standings_coach_select" ON league_standings;
CREATE POLICY "league_standings_coach_select" ON league_standings
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      WHERE ts.user_id = auth.uid() AND ts.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('head_coach', 'assistant_coach', 'league_admin', 'team_manager')
        AND is_active = true
    )
  );

-- 4. streak_data_coach_select
DROP POLICY IF EXISTS "streak_data_coach_select" ON streak_data;
CREATE POLICY "streak_data_coach_select" ON streak_data
  FOR SELECT TO authenticated
  USING (
    player_id IN (
      SELECT ur2.user_id FROM user_roles ur1
      JOIN user_roles ur2 ON ur1.organization_id = ur2.organization_id
      WHERE ur1.user_id = auth.uid()
        AND ur1.role IN ('head_coach', 'assistant_coach', 'league_admin', 'team_manager')
        AND ur1.is_active = true
        AND ur2.is_active = true
    )
  );

-- 5. shoutout_categories_insert
DROP POLICY IF EXISTS "shoutout_categories_insert" ON shoutout_categories;
CREATE POLICY "shoutout_categories_insert" ON shoutout_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    is_default = false
    AND created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('head_coach', 'assistant_coach', 'league_admin', 'team_manager')
        AND is_active = true
    )
  );
```

**IMPORTANT:** Before executing the DROP + CREATE statements, verify the current policy definitions match what the investigation found. If earlier specs changed the policy structure (e.g., the Phase 1A RLS fix changed the join pattern), use the CURRENT policy structure and only add 'team_manager' to the role IN (...) clause. Do NOT revert any earlier fixes.

**Commit:** `[team-manager] Phase 8: RLS policy migration`

---

## PHASE 9: Verification

### Type check:
```bash
npx tsc --noEmit
```
Must pass with zero errors.

### Verify each change category:

```
## VERIFICATION REPORT: Team Manager Role

### Phase 1 — Type System:
- UserRole type includes 'team_manager': YES / NO
- Priority array includes 'team_manager': YES / NO
- Display name 'Team Manager' added: YES / NO
- Achievement engine ROLE_DB_MAP: YES / NO
- Global search includes 'team_manager': YES / NO
- users.tsx, me.tsx, settings.tsx updated: YES / NO

### Phase 2 — Permissions:
- isTeamManager boolean exposed in context: YES / NO
- Auto-detection from team_staff.staff_role = 'team_manager': YES / NO
- manageTeam: TM included: YES / NO
- viewTeamPayments: TM included: YES / NO
- sendTeamBlasts: TM included: YES / NO
- createTeamInviteCodes: TM included: YES / NO
- Chat permissions: TM included: YES / NO
- moderateChat: TM included: YES / NO
- addAssistantCoach: TM EXCLUDED: YES / NO
- assignPlayers: TM EXCLUDED: YES / NO
- Org management: TM EXCLUDED: YES / NO

### Phase 3 — Dashboard:
- DashboardType includes 'team_manager': YES / NO
- viewAs 'team_manager' routes correctly: YES / NO
- TM-only user with team_staff entry does NOT get coach dashboard: YES / NO
- TM user gets CoachHomeScroll: YES / NO

### Phase 4 — Tab Bar:
- isTeamManagerMode boolean: YES / NO
- isParentOnly excludes TM: YES / NO
- isPlayerMode excludes TM: YES / NO
- TM-only gets Schedule as Tab 2: YES / NO
- TM-only does NOT get Game Day tab: YES / NO
- TM+Coach gets Coach tabs (Game Day): YES / NO

### Phase 5 — Drawer:
- RoleSelector includes TM option: YES / NO
- GestureDrawer includes TM role pill: YES / NO
- Drawer shows operational items for TM: YES / NO

### Phase 6 — Signup:
- 4th role card on signup: YES / NO
- roleMap includes team_manager: YES / NO
- Step 3 subtitle for TM: YES / NO
- Create Org hidden for TM: YES / NO
- NoTeamState has TM message: YES / NO

### Phase 7 — Screen Access:
- coach-schedule: TM allowed: YES / NO
- attendance: TM allowed: YES / NO
- volunteer-assignment: TM allowed: YES / NO
- coach-engagement: TM allowed: YES / NO
- payments: TM allowed: YES / NO
- connect: TM treated as coach-like: YES / NO
- challenges: TM BLOCKED: YES / NO

### Phase 8 — RLS:
- 5 policies updated: YES / NO
- 4 policies untouched (challenges, xp_boost, team_quests, lineups): YES / NO

### Type Check: PASS / FAIL
### Errors: NONE / [list]

### Files Modified: [total count]
### Files NOT Modified (confirmed safe): [list key files]

### Negation Check (critical):
- isParentOnly now excludes TM: YES / NO
- Game Day tab now excludes TM-only: YES / NO
- isPlayerMode now excludes TM: YES / NO
```

---

## IMPORTANT: RLS MIGRATION NEEDS SUPABASE APPLICATION

After CC commits Phase 8, Carlos needs to paste the SQL from `supabase/migrations/20260316_team_manager_rls.sql` into the Supabase SQL Editor and run it.

---

## WHAT COMES NEXT (NOT IN THIS SPEC)

1. **Team Manager Operational Cards:** Add ManagerPaymentCard, ManagerRegistrationCard, ManagerAvailabilityCard to CoachHomeScroll (conditionally shown when role = team_manager)
2. **Admin assigns Team Manager UI:** Add ability for admin to assign team_manager role to a user and add them to team_staff
3. **Team-scoped payment view:** Filter the payments screen for TM to show only their team's data
