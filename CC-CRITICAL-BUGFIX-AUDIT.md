# CC-CRITICAL-BUGFIX-AUDIT.md
# Code-Verified Mobile Audit — March 8, 2026

## ⚠️ MANDATORY RULES — READ BEFORE TOUCHING ANY CODE

1. **READ EVERY FILE FULLY** before modifying it. Do not skim. Do not assume.
2. **DO NOT refactor, rename, reorganize, or "improve" anything** not explicitly listed below.
3. **DO NOT move files, change imports, update folder structures, or touch navigation configuration** unless a specific bug below requires it.
4. **DO NOT add new packages or dependencies.**
5. **DO NOT change any component that is working correctly.** If it's not listed below, don't touch it.
6. **If a fix requires changing shared code** (hooks, utils, context providers), explain the change in a comment and verify it doesn't break other consumers of that code BEFORE applying it.
7. **NEVER use early returns before hooks or ScrollViews.** This has caused crashes before. All hooks must be called unconditionally at the top of every component.
8. **After EVERY fix, grep the codebase** for other places the same pattern exists and fix those too — don't leave landmines.
9. **Test your mental model**: Before writing code, state what file you're changing, what the current behavior is, what the fix is, and what the expected behavior will be.

---

## PRIORITY 1: SECURITY — Parent Accessing Admin Registration Screen

### Bug 1.1: FamilyPanel "View All Registrations" routes to admin screen

**File:** `components/FamilyPanel.tsx`, line ~288
**Current code:**
```tsx
onPress={() => { router.push('/registration-hub' as any); onClose(); }}
```
**Problem:** `/registration-hub` maps to `app/registration-hub.tsx` which is the ADMIN registration management screen. It has ZERO role checks (confirmed: grep for isAdmin/isParent/usePermission returns nothing). A parent sees all 36 registrations, approval workflows, payment data, org-wide stats.

**Fix:** Change the route in `components/FamilyPanel.tsx` from `/registration-hub` to `/parent-registration-hub`:
```tsx
onPress={() => { router.push('/parent-registration-hub' as any); onClose(); }}
```
The file `app/parent-registration-hub.tsx` already exists and is properly parent-scoped — it shows only open seasons and the parent's own children's registrations.

**ALSO FIX:** The "View All Payments" button on the next line already correctly routes to `/family-payments`. Verify this is still correct.

**ALSO FIX:** Check `hooks/useParentHomeData.ts` — the waiver attention item (around line ~504) routes to `/registration-hub`:
```tsx
route: '/registration-hub',
```
Change this to `/parent-registration-hub` or `/my-waivers`.

### Bug 1.2: Add role guard to app/registration-hub.tsx

**File:** `app/registration-hub.tsx`
**Problem:** No role check exists anywhere in this file. Any user who navigates here sees full admin data.

**Fix:** Add role guard at the top of the component. IMPORTANT: Place this AFTER all hooks are called. Do NOT put an early return before hooks.

```tsx
import { usePermissions } from '@/lib/permissions-context';
// ... inside component, AFTER all other hooks:
const { isAdmin } = usePermissions();

// Role guard — AFTER all hooks
if (!isAdmin) {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Access denied</Text>
    </SafeAreaView>
  );
}
```

### Bug 1.3: Gesture menu parent routes are clean (no fix needed)

**File:** `components/GestureDrawer.tsx`, MENU_SECTIONS array
**Verified:** Parent "My Family" section routes are all parent-scoped:
- `/my-kids` ✓
- `/parent-registration-hub` ✓
- `/family-payments` ✓
- `/my-waivers` ✓
- `/standings` (shared, read-only) ✓
- `/achievements` (shared) ✓
- `/invite-friends` (shared) ✓

**No changes needed to GestureDrawer.** The bug is only in FamilyPanel.tsx and useParentHomeData.ts.

---

## PRIORITY 2: Missing Children (9 kids, only 3 shown)

### Bug 2.1: Parent home MY ATHLETES shows fewer children than exist

**File:** `hooks/useParentHomeData.ts`
**Analysis:** The hook uses 3 methods to find children (lines ~206-220):
1. `player_guardians` table (guardian_id = user.id)
2. `players` table (parent_account_id = user.id)
3. `players` table (parent_email ilike user email)

Then deduplicates by `first_name + last_name` lowercase (lines ~354-371).

**Likely root causes (investigate in order):**

1. **Name-based dedup is eating children.** The dedup key is `${child.firstName.toLowerCase()}_${child.lastName.toLowerCase()}`. If any two children share the exact same first AND last name, one gets dropped. Fix: use `playerId` as the dedup key instead of name.

2. **Not all children are linked.** Some of the 9 children may only exist via a `family_id` linkage or were created through registration but never linked to the parent account via any of the 3 methods. To investigate:
   - Query `player_guardians` for this parent's user.id — count results
   - Query `players` for parent_account_id = user.id — count results
   - Query `players` for parent_email matching — count results
   - Compare total unique player IDs found vs expected 9

3. **The `.order('created_at', { ascending: false })` on the players query** (line ~230) should not limit results, but verify no `.limit()` was accidentally added.

**Fix for dedup (do this regardless):** In `hooks/useParentHomeData.ts`, change the dedup from name-based to ID-based:
```tsx
// REPLACE the nameMap dedup block (lines ~354-371) with:
const idMap = new Map<string, FamilyChild>();
familyChildren.forEach(child => {
  const existing = idMap.get(child.playerId);
  if (existing) {
    // Merge teams from duplicate entries
    const existingTeamIds = new Set(existing.teams.map(t => t.teamId));
    child.teams.forEach(t => {
      if (!existingTeamIds.has(t.teamId)) {
        existing.teams.push(t);
      }
    });
  } else {
    idMap.set(child.playerId, { ...child, teams: [...child.teams] });
  }
});
const mergedFamilyChildren = [...idMap.values()];
```

**If children are missing from all 3 link methods:** Add a 4th method — check if there's a `family_id` column on the `players` table or a `families` table that groups children. Query it.

### Bug 2.2: FamilyPanel shows different subset than home page

**File:** `components/FamilyPanel.tsx` receives `allChildren` as props from `ParentHomeScroll.tsx` (line ~699).

This is the SAME data source. If the panel shows fewer children, it's because:
1. A child has `teams.length === 0` so the team row section is empty (but the child header should still render)
2. The FamilyPanel's `allChildren` prop is stale or was passed before the async fetch completed

**This will be resolved by Bug 2.1 fix.** Once all 9 children load correctly in the hook, both views will show them.

---

## PRIORITY 3: Design Issues (DEFERRED)

### Bug 3.1: Full-size player cards on parent home — DEFERRED
The CC-PARENT-HOME-REDESIGN spec (already written, in repo root) redesigns these. Do NOT change in this pass.

### Bug 3.2: No swipe-left for Family View — DEFERRED
`FamilyPanel.tsx` line 1 comment explicitly says: "Button-only opening (no right-swipe gesture) to avoid conflicts with GestureDrawer's left swipe." This needs a separate gesture composition spec.

---

## PRIORITY 4: Photo Upload Broken Everywhere

### Bug 4.1: Photo upload fails across all roles and screens

**Core files:**
- `lib/media-utils.ts` — shared upload utility
- `app/profile.tsx` — profile avatar (uses `media` bucket)
- `components/TeamWall.tsx` — team wall/banner (uses `media` bucket)
- `app/chat/[id].tsx` — chat media (uses `chat-media` bucket)

**The code logic looks structurally sound.** The upload flow is: pick → compress → fetch as blob → arrayBuffer → Supabase storage upload → get public URL.

**Investigate these root causes in order:**

1. **Supabase storage bucket policies.** This is the most likely cause. Run this diagnostic at the top of any upload attempt:
```tsx
const { data: bucketList, error: bucketError } = await supabase.storage.from('media').list('', { limit: 1 });
console.log('Bucket test:', { bucketList, bucketError });
```
If this errors, the bucket doesn't exist or the user lacks access.

2. **Silent failures.** The current code returns `null` on error without logging. Add explicit error logging:
   - In `lib/media-utils.ts` `uploadMedia` function: the catch block on line ~172 logs in __DEV__ but the error from `supabase.storage.upload` on line ~165 might not be caught if it returns `{ error }` instead of throwing.
   - Add: `if (error) { console.error('Supabase upload error:', JSON.stringify(error)); return null; }`

3. **HEIC format issue.** iOS photos are often HEIC. The `compressImage` function converts to JPEG via ImageManipulator, which should handle this. But if ImageManipulator fails, the compressed URI might be invalid. Wrap `compressImage` in try/catch with logging.

4. **Blob/ArrayBuffer conversion.** The `fetch(media.uri) → blob → arrayBuffer` chain can fail if the URI is invalid after compression. Add logging between steps.

**Fix approach:**
Add diagnostic logging to `lib/media-utils.ts`:
```tsx
export const uploadMedia = async (media, folderPath, bucket = 'chat-media') => {
  try {
    console.log('[uploadMedia] Starting:', { uri: media.uri?.substring(0, 50), type: media.type, bucket, folderPath });
    
    const fileExt = media.type === 'image' ? 'jpg' : media.type === 'audio' ? 'm4a' : 'mp4';
    const filePath = `${folderPath}/${Date.now()}.${fileExt}`;

    const response = await fetch(media.uri);
    if (!response.ok) {
      console.error('[uploadMedia] fetch failed:', response.status, response.statusText);
      return null;
    }
    const blob = await response.blob();
    console.log('[uploadMedia] blob size:', blob.size);
    
    const arrayBuffer = await new Response(blob).arrayBuffer();
    console.log('[uploadMedia] arrayBuffer size:', arrayBuffer.byteLength);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType: media.type === 'image' ? 'image/jpeg' : media.type === 'audio' ? 'audio/m4a' : 'video/mp4',
        upsert: false,
      });

    if (error) {
      console.error('[uploadMedia] Supabase upload error:', JSON.stringify(error));
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    console.log('[uploadMedia] Success:', data.publicUrl?.substring(0, 80));
    return data.publicUrl;
  } catch (error) {
    console.error('[uploadMedia] Exception:', error);
    return null;
  }
};
```

**If the bucket doesn't exist or has wrong policies:** Document this as a Supabase dashboard fix Carlos needs to do. The buckets `media` and `chat-media` must exist with:
- Public read access (for public URLs to work)
- Authenticated user upload access
- File size limit appropriate for images (10MB+)

---

## PRIORITY 5: Admin Navigation & Feature Gaps

### Bug 5.1: Admin Schedule gesture menu route is correct

**File:** `components/GestureDrawer.tsx`, Quick Access section:
```tsx
{ icon: 'calendar', label: 'Schedule', route: '/(tabs)/schedule' }
```
**This is correct.** It points to `app/(tabs)/schedule.tsx`. If Carlos saw it go to an event detail, it was likely a stale navigation state or auto-redirect. CC should verify by testing the route fresh.

**If it reproduces:** Check `app/(tabs)/schedule.tsx` for any `useEffect` that auto-navigates to a specific event on mount (e.g., navigating to "today's event" on load).

### Bug 5.2: Admin Home has no day-strip calendar

**File:** `components/AdminHomeScroll.tsx`
**Confirmed:** No DayStripCalendar import or usage exists. Parent home has it at `components/parent-scroll/DayStripCalendar.tsx`.

**Fix:**
1. Import: `import DayStripCalendar from './parent-scroll/DayStripCalendar';`
2. Check `hooks/useAdminHomeData.ts` — does it expose `eventDates`? If not, add it:
   - The hook already fetches upcoming events. Collect event dates into a `Set<string>` and return it.
3. In the AdminHomeScroll render, add after the header area and before the content:
```tsx
<DayStripCalendar scrollY={scrollY} eventDates={data.eventDates || new Set()} />
```
4. Verify the DayStripCalendar component doesn't have parent-specific styling that would look wrong in admin context.

### Bug 5.3: Bulk Event Create exists in gesture menu

**File:** `components/GestureDrawer.tsx`, Admin Tools section:
```tsx
{ icon: 'add-circle-outline', label: 'Bulk Event Create', route: '/bulk-event-create' }
```
**This exists.** The route works. Carlos may not have found it because Admin Tools is collapsible.

**However:** The "Create Event" button/action on the admin home (if it exists in QuickActionsGrid) should also offer a path to bulk creation. Check `components/admin-scroll/QuickActionsGrid.tsx` and add a "Bulk Create" option if there's a "Create Event" action.

### Bug 5.4: Venue picker is a TODO stub

**File:** `app/(tabs)/schedule.tsx`, lines 156-158:
```tsx
const fetchVenues = async () => {
  // TODO: Implement when organization_venues table is created
  setVenues([]);
};
```

**The `venues` table EXISTS** in Supabase with columns: id, organization_id, name, address, city, state, zip, is_home, courts_available, etc. The web admin queries it correctly in `src/pages/settings/VenueManagerPage.jsx`.

**Fix:** Replace the TODO with:
```tsx
const fetchVenues = async () => {
  if (!organization?.id) { setVenues([]); return; }
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('id, name, address, city, state, zip, is_home, courts_available')
      .eq('organization_id', organization.id)
      .order('name');
    if (!error && data) {
      setVenues(data.map(v => ({
        id: v.id,
        name: v.name,
        address: [v.address, v.city, v.state, v.zip].filter(Boolean).join(', '),
        type: (v.is_home ? 'practice' : 'both') as 'game' | 'practice' | 'both',
      })));
    }
  } catch (err) {
    if (__DEV__) console.error('Fetch venues error:', err);
  }
};
```

Ensure `organization` is available — check if `useAuth()` is already imported (it likely is). The venue dropdown UI already exists in the schedule screen (lines 774-853) and will activate once `venues.length > 0`.

**ALSO FIX:** `app/bulk-event-create.tsx` has plain text venue fields (lines 85-86) with no org venue lookup. Add the same fetchVenues logic and a venue picker dropdown there.

---

## PRIORITY 6: Verification Checklist

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | FamilyPanel "View All Registrations" route | `/parent-registration-hub` | |
| 2 | `app/registration-hub.tsx` has role guard | Blocks non-admin access | |
| 3 | Waiver attention item route in useParentHomeData | Not `/registration-hub` | |
| 4 | Parent sees ALL children in MY ATHLETES | All 9 for test parent | |
| 5 | FamilyPanel shows same children as home | Identical list | |
| 6 | Photo upload diagnostic logging added | Errors visible in console | |
| 7 | Photo upload works (or bucket issue documented) | Upload succeeds OR clear error | |
| 8 | Admin gesture menu → Schedule | Goes to calendar screen | |
| 9 | Admin Home has day-strip calendar | Calendar strip visible | |
| 10 | Venue picker in schedule event creation | Shows org venues dropdown | |
| 11 | Venue picker in bulk event creation | Shows org venues dropdown | |
| 12 | No hooks called after early returns | grep: no violations | |
| 13 | No ScrollViews conditionally rendered after loading | grep: no violations | |

---

## KNOWN LANDMINES — Do Not Repeat

- **Touch blocking:** GestureDrawer scrim + ScrollView unmounting. NEVER early returns before ScrollViews.
- **Achievement engine:** Crashes for parent users (profile ID vs player ID mismatch). Fixed with role guard.
- **Hooks order:** `useMemo` after early return in achievements.tsx was fixed. Do not reintroduce.
- **Registration-hub role guard:** Put AFTER all hooks. Not before.

---

## DEFERRED ITEMS (NOT in this pass)

- Full-size player cards on parent home → CC-PARENT-HOME-REDESIGN spec
- Swipe-left gesture for Family View → Needs separate gesture spec
- Venue Manager mobile screen (currently "Coming Soon") → Future feature
- Admin/Player home role selectors possibly lost → Next QA pass

---

## OUTPUT REQUIRED

1. List of every file modified with one-line description
2. Completed verification checklist with pass/fail
3. Any additional issues discovered (do NOT fix — document only)
4. For Bug 2.1: Supabase query results showing which linkage method is failing for the 9-child test parent
5. For Bug 4.1: Console output from upload diagnostic logging showing where the failure occurs
