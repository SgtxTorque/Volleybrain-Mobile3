# CC-SPEC-1-FOUNDATION.md
# Spec 1 of 3: Foundation — Auth, Navigation, and Data Queries

> **Run this FIRST. Specs 2 and 3 depend on this being complete.**  
> **Priority:** P0  
> **Rule:** Read every file mentioned BEFORE writing any code. Do NOT invent table names. Verify column names against the actual database schema.

---

## CRITICAL CONTEXT — READ BEFORE TOUCHING ANY CODE

### Standing Rules (violating these causes regressions):
- ScrollViews must ALWAYS be mounted — never replaced by loading states or early returns before ScrollViews
- Never invent table names or column names. If unsure, run: `npx supabase gen types typescript --project-id uqpjvbiuokwpldjvxiby` or inspect the actual table
- Gold/yellow text only on dark backgrounds
- Brand tokens everywhere — no hardcoded colors or raw fontWeight strings
- NEVER use `upsert` with `onConflict` on profiles — it overwrites existing data

### What happened:
A previous CC session introduced a destructive `upsert` in `lib/auth.tsx` that resets `onboarding_completed` to `false` for existing users when a profile query transiently fails. This broke ALL home screens (showing "Not connected to an organization") because org loading is gated behind the onboarding check. The platform admin was affected. Additionally, the gesture drawer shows ALL role sections instead of filtering to the current "viewing as" role, and multiple navigation links go to wrong destinations.

---

## FIX 1: Profile Upsert Destroying Existing Users (P0)

### File: `lib/auth.tsx`, lines ~157-175

### Problem:
```typescript
if (!prof) {
  const meta = session.user.user_metadata;
  const { data: newProf } = await supabase
    .from('profiles')
    .upsert({
      id: session.user.id,
      email: session.user.email,
      full_name: meta?.full_name || meta?.name || '',
      onboarding_completed: false,   // ← THIS OVERWRITES EXISTING PROFILES
    }, { onConflict: 'id' })          // ← THIS MEANS "UPDATE IF EXISTS"
```

If the profile SELECT query returns null for ANY reason (network timeout, RLS issue, Supabase hiccup), this upsert fires and overwrites the existing profile with `onboarding_completed: false`. This destroys the user's setup state and blocks org loading.

### Fix:
Replace the entire profile loading block (from `// Load profile` through the early return after `setNeedsOnboarding(true)`) with:

1. Capture the error from the profile query: `const { data: prof, error: profError } = ...`
2. If `!prof && profError` → query FAILED. Log error, retry once after 1s delay. If retry succeeds, use that profile. If retry fails, bail gracefully — do NOT create/upsert anything.
3. If `!prof && !profError` → profile genuinely doesn't exist. Use `.insert()` (NOT `.upsert()`!) to create. If insert fails with unique constraint, re-fetch (race condition). 
4. If `prof` exists → use it normally (existing behavior).

**KEY PRINCIPLE: NEVER use `.upsert()` on the profiles table. Only `.insert()` for new profiles.**

### Also fix: Audit other users
After fixing the code, add a one-time migration or have the developer run:
```sql
UPDATE profiles SET onboarding_completed = true 
WHERE onboarding_completed = false 
  AND id IN (SELECT DISTINCT user_id FROM user_roles WHERE is_active = true);
```

---

## FIX 2: Gesture Drawer Shows All Roles Instead of Current Role

### File: `components/GestureDrawer.tsx`, lines ~422-428

### Problem:
The visible sections filter uses the boolean flags `isAdmin`, `isCoach`, `isParent`, `isPlayer` which reflect ALL roles the user has, not the role they're currently "viewing as." A user with all 4 roles sees ALL menu sections regardless of which role pill is selected.

### Current code:
```typescript
const visibleSections = MENU_SECTIONS.filter((s) => {
  if (!s.roleGate) return true;
  if (s.roleGate === 'admin') return isAdmin;
  if (s.roleGate === 'coach') return isCoach;
  if (s.roleGate === 'admin_coach') return isAdmin || isCoach;
  if (s.roleGate === 'parent') return isParent;
  if (s.roleGate === 'player') return isPlayer;
});
```

### Fix:
Use `currentRoleKey` (line ~261) — which IS the "viewing as" role — instead of the boolean flags:

```typescript
const visibleSections = MENU_SECTIONS.filter((s) => {
  if (!s.roleGate) return true; // "League & Community" — always visible
  
  const viewingAsAdmin = currentRoleKey === 'league_admin';
  const viewingAsCoach = currentRoleKey === 'head_coach' || currentRoleKey === 'assistant_coach';
  const viewingAsParent = currentRoleKey === 'parent';
  const viewingAsPlayer = currentRoleKey === 'player';

  if (s.roleGate === 'admin') return viewingAsAdmin;
  if (s.roleGate === 'coach') return viewingAsCoach;
  if (s.roleGate === 'admin_coach') return viewingAsAdmin || viewingAsCoach;
  if (s.roleGate === 'parent') return viewingAsParent;
  if (s.roleGate === 'player') return viewingAsPlayer;
  return false;
});
```

### Verification:
- Switch to Coach role → only see Quick Access + Coach Tools + Coaching sections
- Switch to Admin role → only see Quick Access + Admin Tools sections
- Switch to Parent role → only see Quick Access + My Family sections

---

## FIX 3: team_players.role Column Does Not Exist (PGRST204 Error)

### File: `app/registration-hub.tsx`, line ~588

### Problem:
The `assignToTeam` function inserts into `team_players` with a `role: 'player'` field. The `team_players` table does NOT have a `role` column. This causes PGRST204 error: "Could not find the 'role' column of 'team_players' in the schema cache."

### Current code (line ~586-592):
```typescript
const { error: teamError } = await supabase
  .from('team_players')
  .upsert({
    team_id: teamId,
    player_id: playerId,
    role: 'player',           // ← THIS COLUMN DOES NOT EXIST
    joined_at: new Date().toISOString(),
  });
```

### Fix:
Remove the `role` field and `joined_at` (verify this column exists too). Use the correct schema matching `app/(tabs)/teams.tsx` line 173:
```typescript
const { error: teamError } = await supabase
  .from('team_players')
  .upsert({
    team_id: teamId,
    player_id: playerId,
    is_primary_team: true,
  }, { onConflict: 'team_id,player_id' });
```

**Before writing this fix:** Run `SELECT column_name FROM information_schema.columns WHERE table_name = 'team_players' ORDER BY ordinal_position;` in Supabase SQL editor to confirm the actual columns. Do NOT guess.

---

## FIX 4: Standardize Team Resolution Across All Coach Screens

### Problem:
Multiple screens independently resolve the coach's team using different query patterns. Some find teams, others don't — causing data mismatches:
- `useCoachHomeData.ts` → has a 3-path fallback chain (team_staff → coaches/team_coaches → all teams). **This one works.**
- `app/coach-challenge-dashboard.tsx` → uses only team_staff with `is_active = true`. **This one often fails.**
- `app/create-challenge.tsx` → uses team_staff then coaches. **Sometimes fails.**
- `app/evaluation-session.tsx` → uses team_staff with `is_active = true`. **Often fails.**
- `app/bulk-event-create.tsx` → depends on `organization?.id` from auth context. **Fails when org is null.**

### Fix:
Create a shared `useCoachTeam()` hook in `hooks/useCoachTeam.ts` that encapsulates the working 3-path fallback from `useCoachHomeData.ts`:

```typescript
export function useCoachTeam() {
  // 1. Try team_staff (user_id = auth user id) — NO is_active filter
  // 2. Try coaches.profile_id → team_coaches
  // 3. Fallback: all teams in current season if coach record exists
  // Returns: { teamId, teams, loading }
}
```

Then replace the independent team resolution in:
- `app/coach-challenge-dashboard.tsx` (lines ~61-82)
- `app/create-challenge.tsx` (lines ~117-150)
- `app/evaluation-session.tsx` (lines ~63-74)

Each should call `useCoachTeam()` instead of doing its own query.

**Do NOT change `useCoachHomeData.ts`** — it already works. Extract its pattern into the shared hook.

---

## FIX 5: Schedule Navigation Opens Event Detail Instead of Schedule List

### Investigation needed:
The gesture drawer correctly routes to `/(tabs)/schedule`. But Carlos reported landing on a single event detail (Practice, Mar 17) instead of the full schedule.

Check if `app/(tabs)/schedule.tsx` auto-opens an EventDetailModal on mount based on some condition (e.g., if there's only one upcoming event, or if a "next event" auto-selection fires).

Look for any `useEffect` that calls `setSelectedEvent` or `setShowEventModal(true)` on mount. If found, remove the auto-open behavior — the schedule should always show the full list first.

Also check: the event detail showed "No players linked to your account on this team" with a raw UID `(uid: 8e9894f6-59d7-47a1-8dc4-c2271a5e9275, team: )`. Find where this message is rendered (likely in `EventDetailModal.tsx`) and:
1. Never show raw UUIDs to users
2. The "no players linked" message only applies to parent role. For coach/admin roles, this section shouldn't render at all — coaches aren't "linked" to teams via player records.

---

## FIX 6: Game Recap "Game not found"

### File: `app/game-recap.tsx`

### Problem:
Navigating from the "2 games need stats" link on coach home leads to Game Recap showing "Game not found." The navigation likely passes no eventId/matchId parameter, or the query uses the wrong column.

### Investigation:
1. Find where "2 need stats" navigates to: search for `pendingStatsCount` or `need stats` in `components/CoachHomeScroll.tsx` and trace the onPress handler.
2. Check what parameters `game-recap.tsx` expects: `useLocalSearchParams` for `eventId`, `matchId`, etc.
3. If the navigation doesn't pass the required param, fix the navigation to pass the first pending-stats event ID.
4. If the issue is the query itself, trace the game recap's data loading and fix the query.

---

## EXECUTION ORDER
1. Fix 1 (auth upsert) — deploy and verify login works
2. Fix 2 (gesture drawer roles) — verify role switching filters menu
3. Fix 3 (team_players.role) — verify registration approval works
4. Fix 4 (shared team hook) — verify challenges, evals, and bulk events find teams
5. Fix 5 (schedule navigation)
6. Fix 6 (game recap)

## VERIFICATION CHECKLIST
- [ ] Log in as Carlos → sees Admin home, NOT onboarding wizard or NoOrgState
- [ ] Force-kill and reopen 5 times → `onboarding_completed` stays `true`
- [ ] Gesture drawer in Coach mode → only shows coach-relevant sections
- [ ] Gesture drawer in Admin mode → only shows admin-relevant sections
- [ ] Registration hub → approve player → assign to team → no PGRST204 error
- [ ] Coach Challenge Dashboard → shows the 1 active challenge (matches home card)
- [ ] Evaluation Session (from coach tools) → loads roster players
- [ ] Bulk Event Create → shows teams to select
- [ ] Schedule link in drawer → shows full schedule list, not single event detail
- [ ] "2 need stats" on coach home → navigates to game recap with data
