# CC-CHALLENGE-TEAM-FIX-FINAL

## Priority: CRITICAL — Exact root cause identified from diagnostic logs

---

## ROOT CAUSE (confirmed from console output)

Every query path in `app/create-challenge.tsx` fails with:
```
column teams.organization_id does not exist
```

**The `teams` table does NOT have an `organization_id` column.**

The correct schema path to get the organization ID is:
```
teams.season_id → seasons.organization_id
```

This means every query that does `teams(organization_id)` or `teams(id, organization_id, ...)` will fail. The queries must instead join through `seasons`:
```
teams(id, season_id, seasons(organization_id))
```

## ALSO CONFIRMED FROM LOGS

- `team_staff` has ZERO rows for this user → Path 1 will always fail (even with correct schema)
- `coaches` table has a valid record with `profile_id` matching the user
- `team_coaches` has a valid entry: team_id `8b7f7c0d-3cd9-4d21-8b54-fd86c9f82317`, role `head`
- The working `useCoachHomeData` hook finds this team correctly because it does NOT query `organization_id` from teams

## FIX INSTRUCTIONS

### File: `app/create-challenge.tsx`

Replace the entire team/org resolution `useEffect` with the following. This is the ONLY change needed. Also remove the temporary diagnostic logs added in the previous spec.

```typescript
// ─── Resolve team and org ──────────────────────────────────
useEffect(() => {
  if (!user?.id) return;
  (async () => {
    setResolving(true);

    // Path 1: team_staff → teams → seasons (for org_id)
    try {
      const { data: staffRows } = await supabase
        .from('team_staff')
        .select('team_id, is_active, teams(id, season_id, seasons(organization_id))')
        .eq('user_id', user.id);

      const active = (staffRows || []).filter((r: any) => r.is_active !== false);
      const match = workingSeason?.id
        ? active.find((r: any) => (r.teams as any)?.season_id === workingSeason.id)
        : null;
      const best = match || active[0];

      if (best?.team_id) {
        const orgId = (best.teams as any)?.seasons?.organization_id || null;
        setTeamId(best.team_id);
        setOrgId(orgId);
        setResolving(false);
        return;
      }
    } catch {}

    // Path 2: coaches → team_coaches → teams → seasons (for org_id)
    try {
      const { data: coachRecord } = await supabase
        .from('coaches')
        .select('id, team_coaches(team_id, teams(id, season_id, seasons(organization_id)))')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (coachRecord) {
        const tcEntries = Array.isArray(coachRecord.team_coaches)
          ? coachRecord.team_coaches
          : coachRecord.team_coaches ? [coachRecord.team_coaches] : [];

        const match = workingSeason?.id
          ? tcEntries.find((tc: any) => (tc.teams as any)?.season_id === workingSeason.id)
          : null;
        const best = match || tcEntries.find((tc: any) => tc.teams);

        if (best?.team_id) {
          const orgId = (best.teams as any)?.seasons?.organization_id || null;
          setTeamId(best.team_id);
          setOrgId(orgId);
          setResolving(false);
          return;
        }
      }
    } catch {}

    // Path 3: fallback — grab first team in current season
    if (workingSeason?.id) {
      try {
        const { data: seasonTeam } = await supabase
          .from('teams')
          .select('id, season_id, seasons(organization_id)')
          .eq('season_id', workingSeason.id)
          .limit(1)
          .maybeSingle();

        if (seasonTeam) {
          setTeamId(seasonTeam.id);
          setOrgId((seasonTeam.seasons as any)?.organization_id || null);
        }
      } catch {}
    }

    setResolving(false);
  })();
}, [user?.id, workingSeason?.id]);
```

### Key differences from the broken version:
1. **Never queries `teams(organization_id)`** — that column does not exist
2. **Always goes through `teams(id, season_id, seasons(organization_id))`** — correct FK path
3. **Each path wrapped in try/catch** — one path failing won't block the others
4. **Path 2 handles both array and single object** for `team_coaches` (Supabase can return either)

### Also:
- Remove ALL `[ChallengeTeamResolve]`, `[DEBUG]`, and `[CoachHomeTeams]` console.log lines from both `app/create-challenge.tsx` and `hooks/useCoachHomeData.ts`
- Remove any temporary debug `useEffect` blocks
- Do NOT modify any other files

## VERIFICATION

After applying the fix:
1. Open app → Coach role → Create Challenge
2. The "No team found" error should be GONE
3. The ISSUE CHALLENGE button should be ENABLED (teal, not gray)
4. Fill in a test challenge and confirm it submits successfully
5. Check the terminal — there should be NO diagnostic log output (all removed)

If it still fails, log ONLY the final result:
```
console.log('[ChallengeResolve] Final:', { teamId, orgId });
```
And report back.

## COMMIT

```
Fix challenge team resolution — organization_id is on seasons table, not teams
```
