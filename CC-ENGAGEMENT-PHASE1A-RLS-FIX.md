# CC-ENGAGEMENT-PHASE1A-RLS-FIX
# Lynx Player Engagement System — Phase 1A: RLS Policy Fix
# Status: READY FOR CC EXECUTION
# Priority: MUST RUN BEFORE Phase 1B

---

## STANDING RULES

1. **Read these files first:** `CC-LYNX-RULES.md`, `AGENTS.md`, `SCHEMA_REFERENCE.csv`
2. **Do NOT modify any UI files, hooks, components, or screens.**
3. **Do NOT modify any existing tables or their columns.**
4. **Only modify RLS policies on the 14 engagement tables created in Phase 1.**
5. **Branch:** `navigation-cleanup-complete`
6. **Commit message:** `[engagement-schema] Phase 1A: fix RLS policies - user_roles has no team_id`

---

## THE BUG

Four RLS policies created in Phase 1 reference `SELECT team_id FROM user_roles`. But `user_roles` does NOT have a `team_id` column. It only has: `id`, `organization_id`, `user_id`, `role`, `granted_by`, `granted_at`, `revoked_at`, `revoked_by`, `is_active`.

The correct path from a coach/admin to their teams is through `team_staff`:
- `team_staff.user_id` = the coach/admin's profiles.id
- `team_staff.team_id` = the team they're assigned to
- `team_staff.is_active` = whether the assignment is active

**Affected policies:**
1. `daily_quests_coach_select`
2. `weekly_quests_coach_select`
3. `league_standings_player_select`
4. `league_standings_coach_select`

---

## THE FIX

Create a new migration file:
```
supabase/migrations/20260315_engagement_rls_fix.sql
```

### Step 1: Verify team_staff table structure

Before writing the migration, confirm `team_staff` has these columns:
- `user_id` (UUID, references profiles.id or similar)
- `team_id` (UUID, references teams.id)
- `is_active` (BOOLEAN)
- `role` or equivalent column for role checking

**If team_staff does NOT have a role column**, the coach/admin check must combine `team_staff` (for team access) with `user_roles` (for role verification). Adjust the policies accordingly.

### Step 2: Drop and recreate the 4 broken policies

```sql
-- =============================================================================
-- FIX: RLS policies that incorrectly referenced user_roles.team_id
-- user_roles has organization_id only. Team access goes through team_staff.
-- =============================================================================

-- Fix 1: daily_quests_coach_select
DROP POLICY IF EXISTS "daily_quests_coach_select" ON daily_quests;
CREATE POLICY "daily_quests_coach_select" ON daily_quests
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      JOIN user_roles ur ON ur.user_id = ts.user_id AND ur.organization_id = (
        SELECT organization_id FROM teams WHERE id = ts.team_id
      )
      WHERE ts.user_id = auth.uid()
        AND ts.is_active = true
        AND ur.role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND ur.is_active = true
    )
  );

-- Fix 2: weekly_quests_coach_select
DROP POLICY IF EXISTS "weekly_quests_coach_select" ON weekly_quests;
CREATE POLICY "weekly_quests_coach_select" ON weekly_quests
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      JOIN user_roles ur ON ur.user_id = ts.user_id AND ur.organization_id = (
        SELECT organization_id FROM teams WHERE id = ts.team_id
      )
      WHERE ts.user_id = auth.uid()
        AND ts.is_active = true
        AND ur.role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND ur.is_active = true
    )
  );

-- Fix 3: league_standings_player_select
-- Players should see standings for teams they're ON (via team_players, not user_roles)
DROP POLICY IF EXISTS "league_standings_player_select" ON league_standings;
CREATE POLICY "league_standings_player_select" ON league_standings
  FOR SELECT TO authenticated
  USING (
    player_id = auth.uid()
    OR
    team_id IN (
      SELECT tp.team_id FROM team_players tp
      JOIN players p ON p.id = tp.player_id
      WHERE p.parent_account_id = auth.uid()
    )
  );

-- Fix 4: league_standings_coach_select
DROP POLICY IF EXISTS "league_standings_coach_select" ON league_standings;
CREATE POLICY "league_standings_coach_select" ON league_standings
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      JOIN user_roles ur ON ur.user_id = ts.user_id AND ur.organization_id = (
        SELECT organization_id FROM teams WHERE id = ts.team_id
      )
      WHERE ts.user_id = auth.uid()
        AND ts.is_active = true
        AND ur.role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND ur.is_active = true
    )
  );
```

**IMPORTANT:** Before executing, verify the exact column names on `team_staff` by checking SCHEMA_REFERENCE.csv. If the columns are named differently (e.g., `staff_id` instead of `user_id`, or `active` instead of `is_active`), adjust the SQL accordingly.

Also check: does `team_staff` have its own `role` column? If so, you could simplify by checking `team_staff.role` directly instead of joining to `user_roles`. But the join approach above is safer since it matches the pattern used by `coach_challenges` RLS.

### Step 3: Also fix streak_data_coach_select

The `streak_data_coach_select` policy uses a different pattern (org-scoped via user_roles.organization_id) which should work, but verify it:

```sql
-- Verify this existing policy works (user_roles DOES have organization_id)
-- streak_data_coach_select uses:
--   player_id IN (
--     SELECT ur2.user_id FROM user_roles ur1
--     JOIN user_roles ur2 ON ur1.organization_id = ur2.organization_id
--     WHERE ur1.user_id = auth.uid()
--       AND ur1.role IN ('head_coach', 'assistant_coach', 'league_admin')
--       AND ur1.is_active = true
--       AND ur2.is_active = true
--   )
-- This is org-scoped, not team-scoped. It should work because user_roles HAS organization_id.
-- But note: it lets coaches see streak data for ALL players in the org, not just their team.
-- This is acceptable for now. Can be tightened later if needed.
```

No change needed on `streak_data_coach_select` unless you want to tighten it to team-scoped.

---

## VERIFICATION

After running the migration:

1. Confirm the 4 policies were replaced (not duplicated). Run: `SELECT policyname FROM pg_policies WHERE tablename IN ('daily_quests', 'weekly_quests', 'league_standings') ORDER BY tablename, policyname;`
2. Confirm the total RLS policy count is still 33 (4 dropped + 4 created = net zero change).
3. Confirm no other tables or policies were modified.

**Report back with:**
- List of replaced policies
- Total policy count
- Any errors or adjustments made to column names
