# CC-INTEGRATION-TEST-AUDIT
# Lynx Engagement System — Integration Test Audit
# Status: READY FOR CC EXECUTION
# Mode: INVESTIGATION + REPORT ONLY. Fix only what is explicitly allowed.

---

## STANDING RULES

1. **Read these files first:** `CC-LYNX-RULES.md`, `AGENTS.md`
2. **This is primarily a READ and TEST audit.** You are verifying that code works together.
3. **Do NOT refactor, redesign, or add features.**
4. **You MAY fix:** TypeScript compilation errors, broken imports, undefined references, missing null checks that would cause runtime crashes. These are bug fixes, not features.
5. **You may NOT fix:** design issues, layout problems, performance concerns, or "could be better" improvements. Log those in the report under "Recommendations" but do not change code for them.
6. **Commit any bug fixes as:** `[integration-fix] description of fix`
7. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Walks through every engagement system flow and verifies that the code compiles, imports resolve, types align, and the logic is internally consistent. Reports any issues found.

This is NOT a runtime test (we cannot run the app in CC). This is a static code audit that catches the problems a runtime test would find: broken imports, type mismatches, missing function arguments, undefined variables, null access without guards, and logic errors.

---

## AUDIT 1: TypeScript Compilation

Run a full type check:
```bash
npx tsc --noEmit 2>&1
```

Report: PASS (zero errors) or list every error with file and line number.

If there are errors, fix them and commit: `[integration-fix] resolve TypeScript errors`

---

## AUDIT 2: Import Chain Verification

For each of these files, verify that EVERY import resolves to a real file and that the imported name exists as an export in the target file:

**Engine services:**
- `lib/quest-engine.ts` — all imports
- `lib/streak-engine.ts` — all imports (both old and new exports)
- `lib/leaderboard-engine.ts` — all imports
- `lib/team-quest-engine.ts` — all imports
- `lib/notification-engine.ts` — all imports
- `lib/xp-boost-engine.ts` — all imports
- `lib/mascot-images.ts` — all 47 image requires resolve to actual files

**Hooks:**
- `hooks/useQuestEngine.ts` — imports from quest-engine
- `hooks/useWeeklyQuestEngine.ts` — imports from quest-engine
- `hooks/useStreakEngine.ts` — imports from streak-engine
- `hooks/useJourneyPath.ts` — imports from supabase
- `hooks/useSkillModule.ts` — imports from supabase, quest-engine, streak-engine
- `hooks/useLeaderboard.ts` — imports from leaderboard-engine
- `hooks/useTeamQuests.ts` — imports from team-quest-engine
- `hooks/useNotifications.ts` — imports from notification-engine
- `hooks/useCoachEngagement.ts` — imports from supabase
- `hooks/useGlobalSearch.ts` — imports from supabase

**Screens:**
- `screens/JourneyPathScreen.tsx` (or `app/` equivalent) — all imports
- `screens/SkillModuleScreen.tsx` (or `app/` equivalent) — all imports
- `components/journey/NodeCompletionCelebration.tsx` — all imports
- `app/engagement-leaderboard.tsx` — all imports
- `app/notification-inbox.tsx` — all imports
- `app/coach-engagement.tsx` — all imports
- `app/admin-search-results.tsx` — all imports

**Modified components:**
- `components/player-scroll/PlayerDailyQuests.tsx` — quest-engine imports
- `components/player-scroll/PlayerWeeklyQuests.tsx` — quest-engine imports
- `components/player-scroll/PlayerTeamQuests.tsx` — team-quest-engine imports
- `components/player-scroll/PlayerLeaderboardPreview.tsx` — leaderboard imports
- `components/player-scroll/PlayerContinueTraining.tsx` — journey imports
- `components/player-scroll/PlayerIdentityHero.tsx` — mascot imports
- `components/player-scroll/PlayerAmbientCloser.tsx` — mascot imports
- `components/player-scroll/PlayerChallengeCard.tsx` — mascot imports
- `components/player-scroll/CompetitiveNudge.tsx` — mascot imports
- `components/PlayerHomeScroll.tsx` — all new imports
- `components/CoachHomeScroll.tsx` — engagement card imports
- `components/AdminHomeScroll.tsx` — search imports
- `hooks/usePlayerHomeData.ts` — streak, boost, early bird imports

Report format per file:
```
[filename]: X imports checked, ALL RESOLVE / [list broken imports]
```

---

## AUDIT 3: Cross-Service Data Flow

Verify these critical data flow paths are logically consistent:

### Flow 1: Quest Completion > XP Award > Level Update
1. `completeQuest()` in quest-engine.ts calls `awardXp()`
2. `awardXp()` writes to `xp_ledger` — verify column names match the table
3. `awardXp()` reads `profiles.total_xp` — verify column exists
4. `awardXp()` calls `calculateLevel()` — verify it returns `{ level, tier, xpToNext }`
5. `awardXp()` updates `profiles.player_level`, `profiles.tier`, `profiles.xp_to_next_level` — verify column names

### Flow 2: Quest Completion > Streak Update
1. `completeQuest()` calls `recordQualifyingAction()` from streak-engine
2. Verify the import is correct (streak-engine exports `recordQualifyingAction`)
3. `recordQualifyingAction()` reads/writes `streak_data` — verify column names
4. `recordQualifyingAction()` checks/writes `streak_milestones` — verify column names

### Flow 3: Quest Completion > Weekly Consistency Update
1. `completeQuest()` queries `daily_quests` for unique completed dates this week
2. Updates `weekly_quests` where `quest_type = 'consistency'` — verify column names
3. If consistency quest completes, calls `completeWeeklyQuest()` — verify function exists and is accessible

### Flow 4: App Open > Quest Generation
1. `getOrCreateDailyQuests()` checks `daily_quests` for today's date
2. If none exist, calls `gatherQuestContext()` which queries: `players`, `team_players`, `schedule_events`, `coach_challenges`, `shoutouts`, `player_achievements`
3. Verify every table and column name in these queries matches SCHEMA_REFERENCE.csv

### Flow 5: App Open > Streak Check
1. `usePlayerHomeData` calls `checkStreakState()`
2. `checkStreakState()` reads `streak_data` — verify
3. If streak broke (gap > 1 day, no freeze), it updates `streak_data.current_streak = 0`
4. If freeze available and gap = 2, it consumes a freeze

### Flow 6: App Open > XP Boost Check
1. `usePlayerHomeData` calls `checkAndCreateAutoBoosts()`
2. Queries `schedule_events` for today — verify column names
3. Creates `xp_boost_events` rows — verify column names
4. `awardXp()` in quest-engine reads `xp_boost_events` to check for active boosts — verify the query matches

### Flow 7: RSVP > Early Bird
1. `usePlayerHomeData.sendRsvp()` calls `checkEarlyBird()`
2. `checkEarlyBird()` reads/writes `early_bird_claims` — verify column names
3. Awards XP via `xp_ledger` insert — verify

### Flow 8: Journey Path > Skill Module > Completion
1. `useJourneyPath` queries `journey_chapters`, `journey_nodes`, `journey_progress`, `skill_content`
2. Node status logic: first node of first chapter = 'available' if no progress exists
3. `useSkillModule` queries `skill_content` and `skill_quizzes` — verify column names
4. `completeTip/completeDrill/completeQuiz` upsert to `skill_progress` — verify column names and onConflict
5. `completeModule` upserts to `journey_progress` with status 'completed' — verify
6. Calls `recordQualifyingAction()` for streak

### Flow 9: Leaderboard Generation
1. `getOrCreateWeeklyStandings()` queries `team_players` joined with `players` to get `parent_account_id`
2. Calculates weekly XP from `xp_ledger` — verify column names
3. Upserts to `league_standings` — verify column names and onConflict

### Flow 10: Team Quest Generation
1. `getOrCreateTeamQuests()` queries `schedule_events` for this week
2. Queries `team_players` for team size
3. Inserts to `team_quests` — verify column names

### Flow 11: Notification Creation
1. `createNotification()` checks player age via `players.dob` — verify column name
2. Checks for duplicate within 1 hour — verify query
3. Checks daily limit (max 2) — verify query
4. Inserts to `player_notifications` — verify column names

### Flow 12: Coach Engagement Dashboard
1. `useCoachEngagement` queries: `team_players` + `players`, `profiles`, `streak_data`, `league_standings`, `daily_quests`, `weekly_quests`, `journey_progress`, `journey_nodes`
2. Verify every join path and column name
3. "Send nudge" calls `createNotification()` — verify import

For each flow, report:
```
Flow X: [name] — CONSISTENT / ISSUE: [describe]
```

---

## AUDIT 4: RLS Policy Consistency

Verify that RLS policies allow the operations each engine performs:

1. **Quest generation** (client-side, authenticated as player): inserts to `daily_quests` and `weekly_quests` — which INSERT policy allows this? Is it the service insert with `WITH CHECK (true)`?

2. **Quest completion** (client-side, authenticated as player): updates `daily_quests.is_completed` — does the player UPDATE policy allow this (`player_id = auth.uid()`)?

3. **XP award** (client-side): inserts to `xp_ledger` — what INSERT policy allows this? (Should be the existing `WITH CHECK (true)` policy)

4. **Streak update** (client-side): inserts/updates `streak_data` — verify INSERT and UPDATE policies for player

5. **Skill progress** (client-side): upserts to `skill_progress` — verify INSERT and UPDATE policies

6. **Journey progress** (client-side): upserts to `journey_progress` — verify INSERT and UPDATE policies

7. **Team quest contributions** (client-side): inserts to `team_quest_contributions` — which policy allows this?

8. **Notification creation** (client-side, from quest/streak engine): inserts to `player_notifications` — which policy?

9. **Leaderboard standings** (client-side): inserts/updates to `league_standings` — which policy?

10. **Early bird claims** (client-side): inserts to `early_bird_claims` — which policy?

For each, report:
```
Operation X: [description] — POLICY EXISTS / MISSING POLICY: [which operation lacks a policy]
```

If a missing policy would cause a runtime RLS error, create a fix migration and commit it.

---

## AUDIT 5: Null Safety Check

For each engine service, check that Supabase query results are properly null-guarded before access:

- Does every `.single()` call have a null check before accessing properties?
- Does every `.select()` result get checked for null/empty before `.map()` or `.forEach()`?
- Are optional chaining (`?.`) and nullish coalescing (`??`) used appropriately?
- Could any `await supabase.from(...).select(...)` return `{ data: null, error: ... }` and cause a crash?

Report any unguarded null access with file name and line number. Fix critical ones (would cause a crash) and commit.

---

## AUDIT 6: Supabase Query Pattern Check

Verify that Supabase queries follow patterns that actually work:

1. **`.or()` syntax**: Supabase `.or()` takes a string like `"col1.ilike.%val%,col2.ilike.%val%"`. Verify that all `.or()` calls use the correct string format, not object format.

2. **`.ilike()` pattern**: Verify that pattern strings are properly formatted (e.g., `%${query}%` not `%query%`).

3. **`.upsert()` onConflict**: Verify that onConflict values match actual UNIQUE constraints on the tables.

4. **`.in()` with empty arrays**: Supabase `.in('col', [])` can behave unexpectedly. Verify that `.in()` calls check for empty arrays before executing.

5. **`.maybeSingle()` vs `.single()`**: `.single()` throws if no row found. `.maybeSingle()` returns null. Verify the correct one is used based on context.

Report any issues found. Fix query syntax errors and commit.

---

## FINAL REPORT FORMAT

```
## INTEGRATION TEST AUDIT REPORT

### Audit 1: TypeScript Compilation
- Status: PASS / FAIL
- Errors found: [count]
- Errors fixed: [count]

### Audit 2: Import Chain
- Files checked: [count]
- Total imports verified: [count]
- Broken imports found: [count] [list]
- Fixed: [count]

### Audit 3: Data Flow
- Flows verified: 12/12
- Issues found: [count] [list each]
- Fixed: [count]

### Audit 4: RLS Policy
- Operations checked: 10/10
- Missing policies: [count] [list]
- Fixed: [count]

### Audit 5: Null Safety
- Critical null access risks: [count] [list]
- Fixed: [count]

### Audit 6: Query Patterns
- Issues found: [count] [list]
- Fixed: [count]

### Total Bug Fixes Committed: [count]
### Remaining Recommendations (do NOT fix): [list]

### OVERALL STATUS: CLEAN / NEEDS ATTENTION
```
