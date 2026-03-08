# CC-MOBILE-RLS-ALIGNMENT.md
## Lynx Mobile -- RLS Alignment + Post-Sprint Cleanup
### For Claude Code Execution

**Repo:** Volleybrain-Mobile3
**Branch:** feat/next-five-build
**Backend:** Supabase (project: uqpjvbiuokwpldjvxiby)
**Date:** March 7, 2026

---

## RULES

1. **Read CC-LYNX-RULES.md** in the project root if it exists.
2. **Read SCHEMA_REFERENCE.csv** for column names.
3. **Read each file FULLY before modifying.**
4. **Archive before replace** -- `_archive/rls-alignment/`.
5. **Do NOT touch:** `lib/auth.ts`, `lib/supabase.ts`, `lib/theme.ts`.
6. **Commit after each phase.**
7. **Run `npx tsc --noEmit`** after each phase.

---

## CONTEXT

RLS policies were updated on March 7, 2026 in Supabase. The new policies are role-scoped:
- **payments:** Parents see own kids only, coaches see team only, admins see all org
- **players:** Same role scoping
- **chat_messages:** Channel members only
- **waiver_signatures:** Parents see own, admins see org
- **profiles:** Same org only, own profile editable

The mobile app currently relies on client-side filtering in many places. The Supabase queries will now return LESS data than before because RLS is doing the filtering server-side. This is correct behavior, but some queries may need adjustment if they were using broad org-level fetches and then filtering client-side.

This spec verifies the mobile app works correctly with the new RLS and fixes any queries that break.

---

## PHASE 1: Verify Critical Queries

Check these files and verify the Supabase queries will work with role-scoped RLS. The queries don't need to change if they already filter correctly -- RLS just adds a server-side safety net. But if any query fetches ALL org data and then filters client-side, it will now return fewer rows and may need adjustment.

### Files to check:

1. **`app/(tabs)/payments.tsx`** -- Admin payments view
   - If admin queries `payments` filtered by `season_id`, this still works (admin RLS allows all org).
   - If parent queries `payments`, RLS now only returns their children's. Verify `family-payments.tsx` doesn't assume org-wide data.

2. **`components/ParentDashboard.tsx`** -- Parent home
   - Verify payment status queries filter by parent's children, not by org.
   - Should work as-is since it already scopes to the parent's kids.

3. **`app/(tabs)/chats.tsx`** and **`app/chat/[id].tsx`** -- Chat
   - RLS now requires channel membership. Verify channel list query joins through `channel_members` where `user_id = auth.uid()`.
   - Message queries must go through channels the user is a member of.

4. **`components/AdminDashboard.tsx`** -- Admin home
   - Admin queries should still work since admin RLS allows all org data.

5. **`app/my-waivers.tsx`** -- Parent waivers
   - RLS now scopes to `signed_by_user_id = auth.uid()` or parent's children.
   - Verify query matches.

### For each file:
- Read the Supabase queries
- If the query already filters by the user's scope (parent_account_id, team membership, etc.), mark as GOOD
- If the query fetches broad org data and filters client-side, note it as NEEDS FIX
- Do NOT change any query that already works correctly

**Commit:** `"RLS alignment Phase 1: query audit -- verified critical data paths"`

---

## PHASE 2: Fix Any Broken Queries

For any queries identified in Phase 1 as NEEDS FIX:
- Update the Supabase query to match what RLS will return
- Remove any client-side filtering that is now redundant (RLS handles it)
- Test that the data still loads correctly

Common pattern fix:
```typescript
// BEFORE (broad fetch, client filter):
const { data } = await supabase
  .from('payments')
  .select('*')
  .eq('season_id', seasonId)
// then filter in JS: data.filter(p => p.player_id === myPlayerId)

// AFTER (let RLS handle it, just fetch):
const { data } = await supabase
  .from('payments')
  .select('*')
  .eq('season_id', seasonId)
// RLS already filters to only this parent's children's payments
```

**Commit:** `"RLS alignment Phase 2: fix queries that relied on client-side filtering"`

---

## PHASE 3: Error Handling for Empty Results

With tighter RLS, some queries that previously returned data may now return empty arrays for certain roles. Verify the app handles empty states gracefully:

1. **Coach viewing payments** -- coaches can now see team payments but not all org payments. If the coach payments UI shows "No payments found" instead of crashing, it's fine.
2. **Parent viewing other families' data** -- should return empty, not error. Check that empty states render correctly.
3. **Player viewing admin data** -- should redirect or show empty state, not crash.

For any screen that crashes or shows a broken state when data is empty, add a proper empty state.

**Commit:** `"RLS alignment Phase 3: empty state handling for role-scoped data"`

---

## PHASE 4: Verification

1. Run `npx tsc --noEmit` -- zero new errors.
2. All 4 roles render without crashes.
3. Parent dashboard loads payment data for their kids only.
4. Chat loads only channels the user belongs to.
5. Admin dashboard still shows all org data.
6. Report any issues.

**Commit:** `"RLS alignment Phase 4: verified all roles work with new RLS policies"`

---

## DONE

After this spec, the mobile app is fully aligned with the role-scoped RLS policies applied on March 7. Client-side and server-side access controls are in sync.
