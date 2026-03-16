# CC-PHASE1-CRITICAL-WIRING-FIXES.md
# Lynx Mobile — Phase 1: Critical Navigation Wiring Fixes
# EXECUTION SPEC — Run this with Claude Code

---

## PURPOSE

Fix the highest-impact navigation bugs identified in the March 2026 task-path audit. These are routing and permission fixes only — no screen redesigns, no consolidation, no new features.

This is Phase 1 of 4. It addresses wrong destinations, security gaps, and broken drawer links.

---

## BEFORE YOU START — READ THESE FILES

1. `CC-LYNX-RULES.md`
2. `AGENTS.md`
3. `CC-PROJECT-CONTEXT.md`
4. `CC-SHARED-SCREEN-ARCHITECTURE.md` (reference only — do NOT execute consolidation)

---

## ABSOLUTE RULES

1. **Do NOT consolidate screens.** No merging chat, roster, schedule, or any other files. That is Phase 3-4 work.
2. **Do NOT rename files or routes.** All current filenames stay as-is.
3. **Do NOT redesign any screen's visual layout.** No component changes beyond what's specified below.
4. **Do NOT fix adjacent issues you notice.** If you see a bug that isn't in this spec, leave it alone.
5. **Do NOT modify any home scroll component.** `ParentHomeScroll`, `CoachHomeScroll`, `AdminHomeScroll`, `PlayerHomeScroll` are off-limits.
6. **Execute one fix at a time.** Complete it, verify it, report it, then move to the next.

---

## DO NOT TOUCH LIST

These files must NOT be modified under any circumstances during Phase 1:

- `components/ParentHomeScroll.tsx`
- `components/PlayerHomeScroll.tsx`
- `components/CoachHomeScroll.tsx` (and all files in `components/coach-scroll/`)
- `components/admin-scroll/` (all files)
- `components/parent-scroll/` (all files)
- `components/player-scroll/` (all files)
- `components/DashboardRouter.tsx`
- `components/TeamHubScreen.tsx`
- `app/(tabs)/index.tsx`
- Any file in `lib/` except where explicitly instructed
- Any file in `hooks/` 
- Any `.sql` or migration file
- `package.json`, `app.json`, `tsconfig.json`

---

## FIX 1: Role-Aware Notification Deep Links

**File:** `app/_layout.tsx`
**Lines:** 89-125 (the notification handler switch/case block)

**Current behavior:** Every notification type routes every user to the same destination regardless of role.

**New behavior:** The handler checks the user's role before routing. Add role-aware routing inside the existing notification handler.

**Implementation:**

Before the switch statement, retrieve the user's role context. Use the existing `usePermissions()` hook or equivalent auth context that is already available in `_layout.tsx`. You need to determine: `isAdmin`, `isCoach`, `isParent`, `isPlayer`.

Then modify each case:

```
case 'schedule':
  if (isParent && !isCoach && !isAdmin) {
    router.push('/(tabs)/parent-schedule');
  } else if (isCoach || isAdmin) {
    router.push('/(tabs)/coach-schedule');
  } else {
    router.push('/(tabs)/schedule');
  }
  break;

case 'payment':
  if (isAdmin) {
    router.push('/(tabs)/payments');
  } else if (isParent) {
    router.push('/family-payments');
  } else {
    router.push('/(tabs)');  // players don't need payment screens
  }
  break;

case 'blast':
  router.push('/(tabs)/chats');  // route to chat list until read-only inbox exists
  break;

case 'registration':
  if (isAdmin) {
    router.push('/registration-hub');
  } else if (isParent) {
    router.push('/parent-registration-hub');
  } else {
    router.push('/(tabs)');  // players don't manage registration
  }
  break;

case 'game':
case 'game_reminder':
  if (isCoach || isAdmin) {
    // keep existing game-prep routing with eventId
    const eid = data?.eventId;
    router.push(eid ? `/game-prep?eventId=${eid}` : '/game-prep');
  } else {
    // parents and players go to game day tab
    router.push('/(tabs)/gameday');
  }
  break;

case 'challenge_new':
case 'challenge_joined':
case 'challenge_progress':
case 'challenge_completed':
case 'challenge_winner':
case 'challenge_verify':
  if (isCoach || isAdmin) {
    router.push('/coach-challenge-dashboard');
  } else {
    // keep existing player challenge routing
    const cid = data?.challengeId;
    router.push(cid ? `/challenge-cta?challengeId=${cid}` : '/challenges');
  }
  break;
```

**Important:** Do NOT change the `chat` case or the default case — those already work correctly.

**Important:** If `usePermissions()` is not already available in `_layout.tsx`, check how the existing code accesses role info. The root layout may use `useAuth()` instead. Use whatever auth/role context is already imported — do NOT add new providers.

**After completing Fix 1, STOP and report:**
- Exact lines changed
- How role context was accessed
- Which notification types were modified
- Which were left unchanged

---

## FIX 2: Drawer Schedule Route — Role-Conditional

**File:** `components/GestureDrawer.tsx`
**Target:** The `MENU_SECTIONS` array, specifically the Quick Access section's Schedule item (currently line ~81)

**Current behavior:** Schedule item routes to `/(tabs)/schedule` for all roles.

**New behavior:** Schedule item routes to the correct schedule per role.

**Implementation approach:** The `MENU_SECTIONS` array is currently a static `const`. The Schedule item needs to become dynamic based on role.

Option A (preferred — minimal change): Keep `MENU_SECTIONS` static but override the Schedule route at render time. In the section rendering logic (where items are mapped to UI), check the role before navigating:

```typescript
// When handling navigation for a drawer item:
const resolveRoute = (item: MenuItem) => {
  if (item.label === 'Schedule' && item.route === '/(tabs)/schedule') {
    if (isParent && !isCoach && !isAdmin) return '/(tabs)/parent-schedule';
    if (isCoach || isAdmin) return '/(tabs)/coach-schedule';
    return '/(tabs)/schedule'; // player fallback
  }
  return item.route;
};
```

Add this resolution inside the existing navigation handler function — look for where `router.push(item.route)` is called and wrap it with this logic.

**Important:** `isParent`, `isCoach`, `isAdmin` should already be available in `GestureDrawer.tsx` — the file already uses `usePermissions()` for role gates on drawer sections. Use the same variables.

**Do NOT change the `MENU_SECTIONS` array structure.** Just intercept the route at navigation time.

**After completing Fix 2, STOP and report:**
- Exact lines changed
- How the route resolution was implemented
- Confirm MENU_SECTIONS array was NOT modified

---

## FIX 3: My Kids Schedule Quick Action

**File:** `app/my-kids.tsx`
**Target:** Line ~360 (the "Schedule" quick action)

**Current behavior:** Routes to `/(tabs)/schedule` (coach/admin schedule).

**New behavior:** Routes to `/(tabs)/parent-schedule`.

**Implementation:** Find the `router.push` call for the Schedule quick action (around line 360) and change the route string:

```
// BEFORE:
router.push('/(tabs)/schedule')

// AFTER:
router.push('/(tabs)/parent-schedule')
```

This is a one-line change.

**After completing Fix 3, STOP and report:**
- Exact line changed
- Old route vs new route

---

## FIX 4: Drawer Notifications Route

**File:** `components/GestureDrawer.tsx`
**Target:** The Settings & Privacy section, "Notifications" item (currently line ~216)

**Current behavior:** Routes to `/notification-preferences` (settings screen).

**New behavior:** Routes to `/notification` (inbox/feed screen).

**Implementation:** In the `MENU_SECTIONS` array, find the Notifications item in the Settings & Privacy section and change its route:

```
// BEFORE:
{ icon: 'notifications-outline', label: 'Notifications', route: '/notification-preferences' }

// AFTER:
{ icon: 'notifications-outline', label: 'Notification Inbox', route: '/notification' }
```

Then add a separate item for notification settings below it:

```
{ icon: 'options-outline', label: 'Notification Settings', route: '/notification-preferences' }
```

**After completing Fix 4, STOP and report:**
- Exact lines changed
- Confirm both inbox and settings are now accessible

---

## FIX 5: Permission Guards on 8 Admin Screens

**Files to modify (in this order):**

1. `app/coach-background-checks.tsx` — **DO THIS FIRST** (sensitive data)
2. `app/(tabs)/admin-teams.tsx`
3. `app/admin-search.tsx`
4. `app/season-setup-wizard.tsx`
5. `app/bulk-event-create.tsx`
6. `app/(tabs)/jersey-management.tsx`
7. `app/org-settings.tsx`
8. `app/season-reports.tsx`

**For each file, add the same pattern at the top of the component function:**

```typescript
const { isAdmin } = usePermissions();

if (!isAdmin) {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 16, color: '#666' }}>Access restricted to administrators.</Text>
      <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
        <Text style={{ fontSize: 14, color: '#4BB9EC', marginTop: 12 }}>Go Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
```

**Before adding this guard, check each file:**
- Does it already import `usePermissions`? If not, add the import.
- Does it already import `SafeAreaView`, `Text`, `TouchableOpacity`? Add only what's missing.
- Does it already import `useRouter`? It likely does. If not, add it.

**Important:** Place the guard AFTER all hooks but BEFORE any data fetching or rendering logic. React hooks must be called unconditionally — the guard goes after hooks, not before them.

**Pattern:**
```typescript
export default function SomeAdminScreen() {
  const router = useRouter();
  const { isAdmin } = usePermissions();
  const { user } = useAuth();
  // ... other hooks ...

  // Permission guard — after all hooks
  if (!isAdmin) {
    return (/* unauthorized view */);
  }

  // ... rest of the component (data fetching, rendering) ...
}
```

**After completing Fix 5 for ALL 8 files, STOP and report:**
- List of all 8 files modified
- Confirm the guard is placed after hooks in each file
- Confirm no other logic was changed in any file
- Any files that already had partial guards (note what existed vs what was added)

---

## FIX 6: Fix season-settings.tsx Broken Route

**File:** `app/season-settings.tsx`
**Target:** Lines ~609 and ~645

**Current behavior:** Routes to `/(tabs)/teams` — a route that does not exist.

**New behavior:** Routes to `/team-management`.

**Implementation:** Find both `router.push` calls that reference `/(tabs)/teams` and change them:

```
// BEFORE:
router.push('/(tabs)/teams')

// AFTER:
router.push('/team-management')
```

**After completing Fix 6, STOP and report:**
- Exact lines changed
- Confirm both occurrences were updated

---

## VERIFICATION AFTER ALL FIXES

After completing all 6 fixes:

1. **Run `npx tsc --noEmit`** and report the result.
2. **List every file that was modified** across all 6 fixes.
3. **Confirm no files outside the scope were modified.**
4. **For each fix, describe the before/after behavior in one sentence.**

---

## MANUAL QA CHECKLIST (for Carlos to test)

After CC completes this spec, test these scenarios:

| # | Test | Expected Result |
|---|------|----------------|
| 1 | As parent, tap a schedule notification | Lands on parent-schedule with RSVP buttons |
| 2 | As coach, tap a schedule notification | Lands on coach-schedule with event creation |
| 3 | As parent, tap a payment notification | Lands on family-payments |
| 4 | As player, tap a game notification | Lands on Game Day tab |
| 5 | As coach, tap a challenge notification | Lands on coach-challenge-dashboard |
| 6 | Open drawer as parent, tap Schedule | Lands on parent-schedule |
| 7 | Open drawer as coach, tap Schedule | Lands on coach-schedule |
| 8 | Open My Kids, tap Schedule quick action | Lands on parent-schedule |
| 9 | Open drawer, tap "Notification Inbox" | Lands on notification feed, NOT preferences |
| 10 | As a non-admin, navigate to `/coach-background-checks` via URL | Sees "Access restricted" message, not the screen |
| 11 | As admin, navigate to `/coach-background-checks` | Screen loads normally |
| 12 | Open season-settings, tap team management link | Lands on team-management screen, not an error |
