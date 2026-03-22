# CC-PHASE5-SCHEDULE-CLEANUP-AND-MYSTUFF.md
# Lynx Mobile — Phase 5: Schedule Cleanup + My-Stuff Redistribution
# EXECUTION SPEC

---

## PURPOSE

Two cleanup tasks:

**Part A:** Eliminate remaining references to the generic `schedule.tsx` and replace it with a redirect. Every schedule reference should go to the correct role-specific screen.

**Part B:** Redistribute unique features from the 3 orphaned `-my-stuff` screens into existing accessible screens, then replace the orphans with redirects.

---

## BEFORE YOU START

1. Read `CC-LYNX-RULES.md` and `CC-PROJECT-CONTEXT.md`
2. Read `CC-SHARED-SCREEN-ARCHITECTURE.md` — specifically Sections 2 (SCHEDULE) and 10 (PROFILE / MY STUFF)

---

## RULES

1. **Execute all fixes sequentially. Produce one final report.**
2. **Do NOT delete any files.** Replace with redirects for route compatibility.
3. **Do NOT modify `parent-schedule.tsx` or `coach-schedule.tsx`.** Those are the surviving schedule screens.
4. **Do NOT modify `_layout.tsx`.** The notification handler was already fixed in Phase 1 to be role-aware for schedule.
5. **Do NOT modify the drawer `MENU_SECTIONS` array.** Phase 1's `resolveRoute` already handles the Schedule item dynamically. Phase 3 removed the duplicate Schedule from player My Stuff.
6. **When redistributing my-stuff features, add them as NEW SECTIONS to existing screens.** Do not restructure existing screen layouts.

---

## PART A: SCHEDULE CLEANUP

### A1: Fix gameday.tsx references

**File:** `app/(tabs)/gameday.tsx`

Three references still point to `/(tabs)/schedule`. These are on the Game Day tab which is seen by coaches and players. They should route to `/(tabs)/coach-schedule` for coaches/admins (since these are "Full Schedule" and "Add Event" actions).

**Line ~662** — "Full Schedule" action on section header:
```typescript
// BEFORE:
onAction={() => router.push('/(tabs)/schedule' as any)}
// AFTER:
onAction={() => router.push('/(tabs)/coach-schedule' as any)}
```

**Line ~705** — "View Full Schedule" button:
```typescript
// BEFORE:
onPress={() => router.push('/(tabs)/schedule' as any)}
// AFTER:
onPress={() => router.push('/(tabs)/coach-schedule' as any)}
```

**Line ~789** — "Add Event" tool card:
```typescript
// BEFORE:
{ icon: 'add', color: BRAND.teal, label: 'Add Event', route: '/(tabs)/schedule' },
// AFTER:
{ icon: 'add', color: BRAND.teal, label: 'Add Event', route: '/(tabs)/coach-schedule' },
```

**Note:** The Game Day tab is visible to coaches and players (not admins, not parent-only). `coach-schedule` is the correct destination for both "Full Schedule" and "Add Event" — it has event creation for coaches, and for players who reach this screen, the creation features are gated behind `isCoachOrAdmin` checks within coach-schedule itself.

### A2: Fix UpcomingSection.tsx reference

**File:** `components/team-hub/UpcomingSection.tsx` — line ~80

```typescript
// BEFORE:
onPress={() => router.push('/(tabs)/schedule' as any))
// AFTER:
onPress={() => router.push('/(tabs)/coach-schedule' as any))
```

The team hub's upcoming section "View All" should go to the full schedule. `coach-schedule` is the most feature-rich schedule and is also what `admin-schedule` re-exports.

### A3: Replace schedule.tsx with redirect

**File:** `app/(tabs)/schedule.tsx`

Replace the entire 1,083-line file with a role-aware redirect:

```typescript
/**
 * schedule.tsx — Generic schedule screen.
 * Consolidated: parent → parent-schedule, coach/admin → coach-schedule.
 * This file redirects for route compatibility.
 */
import { Redirect } from 'expo-router';
import { usePermissions } from '@/lib/permissions-context';

export default function ScheduleRedirect() {
  const { isParent, isCoach, isAdmin } = usePermissions();

  if (isParent && !isCoach && !isAdmin) {
    return <Redirect href={'/(tabs)/parent-schedule' as any} />;
  }
  return <Redirect href={'/(tabs)/coach-schedule' as any} />;
}
```

This catches any remaining references we haven't directly updated. Parents go to parent-schedule (with RSVP), everyone else goes to coach-schedule (with event creation).

### A4: Verify my-kids.tsx schedule reference

**File:** `app/my-kids.tsx` — line ~360

Phase 1 Fix 3 was supposed to change this from `/(tabs)/schedule` to `/(tabs)/parent-schedule`. **Verify this fix is in place.** If it's still pointing to `/(tabs)/schedule`, change it to `/(tabs)/parent-schedule`. If already fixed, note it and move on.

---

## PART B: MY-STUFF REDISTRIBUTION

The 3 orphaned `-my-stuff` screens contain features that should be accessible from existing screens. We redistribute the unique features, then replace the orphans with redirects.

### B1: Study Each My-Stuff Screen

Before making changes, read all three files and identify their unique features:

**`parent-my-stuff.tsx` (~400 lines) unique features:**
- Child cards with team/jersey info → already in `my-kids.tsx`
- Payment summary per child → already in `family-payments.tsx`
- Waiver status (signed/unsigned) → already in `my-waivers.tsx`
- Registration status → already in `parent-registration-hub.tsx`

**Expected finding:** Most parent-my-stuff features already exist in other accessible screens. If ALL features are duplicated elsewhere, no redistribution is needed — just redirect.

**`coach-my-stuff.tsx` (~715 lines) unique features:**
- Team cards with roster counts → available via team hub / players screen
- Coach certifications (background check status, coaching license) → available in `coach-profile.tsx`
- "My Availability" menu link → already in drawer (Coaching Tools)
- Team-roster navigation → now handled by unified players.tsx with teamId param

**Expected finding:** Most features duplicated. Certifications display is the most unique — check if `coach-profile.tsx` already shows them.

**`admin-my-stuff.tsx` (~873 lines) unique features:**
- Season list with status/dates → available in `season-settings.tsx`
- Registration toggle (open/close) → should be in `season-settings.tsx` or `registration-hub.tsx`
- Financial overview (collected/outstanding) → available in `manage.tsx` and `payments.tsx`
- Invitation management → check if this exists elsewhere
- Banner upload → check if this exists elsewhere

**Expected finding:** Season management and financials are duplicated. Invitation management and banner upload MAY be unique — check carefully.

### B2: Redistribute Unique Features (If Any)

**For each my-stuff screen:**

1. If ALL features exist elsewhere → no redistribution needed, skip to B3
2. If a feature is TRULY unique (exists nowhere else) → add it as a new section in the most logical existing screen:
   - Invitation management → add to `registration-hub.tsx`
   - Banner upload → add to `org-settings.tsx`
   - Coach certifications → add to `coach-profile.tsx` (if not already there)

**Important:** When adding features, copy the relevant data fetching AND UI rendering from the my-stuff file. Do not create new queries — use the same Supabase queries that the my-stuff screen used. Add the feature as a clearly labeled section at the bottom of the target screen.

**If redistribution is needed for more than 2 features, STOP and report what needs to be moved and where.** Do not proceed with large-scale redistribution without confirmation.

### B3: Replace My-Stuff Files with Redirects

**File:** `app/(tabs)/parent-my-stuff.tsx`
```typescript
// Features redistributed to my-kids, family-payments, my-waivers
import { Redirect } from 'expo-router';
export default function ParentMyStuffRedirect() {
  return <Redirect href={'/my-kids' as any} />;
}
```

**File:** `app/(tabs)/coach-my-stuff.tsx`
```typescript
// Features redistributed to coach-profile, players screen
import { Redirect } from 'expo-router';
export default function CoachMyStuffRedirect() {
  return <Redirect href={'/coach-profile' as any} />;
}
```

**File:** `app/(tabs)/admin-my-stuff.tsx`
```typescript
// Features redistributed to manage tab, season-settings, org-settings
import { Redirect } from 'expo-router';
export default function AdminMyStuffRedirect() {
  return <Redirect href={'/(tabs)/manage' as any} />;
}
```

These redirect to the most logical "home" screen for each role when someone somehow navigates to the old route.

---

## VERIFICATION

After all changes:

1. **Run `npx tsc --noEmit`** — report result
2. **List every file modified**
3. **Confirm `schedule.tsx` is a redirect** — show the role-aware logic
4. **Confirm all 3 gameday.tsx references updated**
5. **Confirm UpcomingSection.tsx updated**
6. **Confirm my-kids.tsx schedule reference** — was it already fixed or needed updating?
7. **For each my-stuff screen, report:**
   - Features found
   - Which were already duplicated elsewhere
   - Which were truly unique and needed redistribution
   - What was redistributed and where
   - Or if none needed redistribution
8. **Confirm all 3 my-stuff files are redirects**
9. **Net lines saved**

---

## FINAL REPORT FORMAT

```
Phase 5 Final Report
====================

TypeScript: [PASS/FAIL]
Files modified: [count] — [list]

Part A — Schedule Cleanup:
- gameday.tsx references fixed: [count]
- UpcomingSection.tsx fixed: [yes/no]  
- schedule.tsx: [line count before] → [line count after (redirect)]
- my-kids.tsx: [already fixed / needed fixing]

Part B — My-Stuff Redistribution:
| Screen | Unique Features Found | Already Elsewhere? | Redistributed To |
|--------|----------------------|-------------------|------------------|
| parent-my-stuff | ... | ... | ... |
| coach-my-stuff | ... | ... | ... |
| admin-my-stuff | ... | ... | ... |

Lines before: [total across schedule.tsx + 3 my-stuff files]
Lines after: [total after redirects]
Net saved: [total]
```

---

## MANUAL QA

| # | Test | Expected |
|---|------|----------|
| 1 | Game Day tab → "Full Schedule" link | Goes to coach-schedule |
| 2 | Game Day tab → "Add Event" tool | Goes to coach-schedule |
| 3 | Team Hub → Upcoming → "View All" | Goes to coach-schedule |
| 4 | Navigate to `/(tabs)/schedule` as parent | Redirects to parent-schedule |
| 5 | Navigate to `/(tabs)/schedule` as coach | Redirects to coach-schedule |
| 6 | Navigate to `/(tabs)/parent-my-stuff` | Redirects to my-kids |
| 7 | Navigate to `/(tabs)/coach-my-stuff` | Redirects to coach-profile |
| 8 | Navigate to `/(tabs)/admin-my-stuff` | Redirects to manage tab |
