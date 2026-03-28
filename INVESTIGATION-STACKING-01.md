# INVESTIGATION-STACKING-01
# Season Badge Re-Earning & Stacking Audit
# Reference: LYNX-ENGAGEMENT-SYSTEM-V2.md (Section 4.4 — Season Badge Cadence Rules)

---

## Summary

The current achievement system **completely prevents badge re-earning**. Three independent mechanisms enforce this:

1. **DB unique constraint** on `(player_id, achievement_id)` — duplicate inserts are rejected
2. **Engine earnedSet** — checks all-time earned badges (no season filter) and skips any already in the set
3. **Upsert with ignoreDuplicates** — even if the earnedSet check were bypassed, the DB would silently drop duplicates

The `cadence` field exists on the `achievements` table and in the `AchievementFull` TypeScript type, but is **never read or used** by the engine or any UI component. It is a dead column today.

To implement V2 stacking (season-cadence badges re-earnable each season with x2/x3 counters), changes are needed at all three layers: DB constraint, engine earn-check logic, and UI display.

---

## Task 1: Audit player_achievements Constraints

### 1.1 What unique constraints exist on `player_achievements`?

The upsert in `lib/achievement-engine.ts` reveals the constraint:

```typescript
// Line 131-135 (checkAndUnlockAchievements)
await supabase.from('player_achievements').upsert(newUnlocks, {
  onConflict: 'player_id,achievement_id',
  ignoreDuplicates: true,
});

// Line 283-287 (checkAllAchievements)
await supabase.from('player_achievements').upsert(newUnlocks, {
  onConflict: 'player_id,achievement_id',
  ignoreDuplicates: true,
});
```

**Constraint: `(player_id, achievement_id)`** — a composite unique constraint.

### 1.2 Is it `(player_id, achievement_id)` or `(player_id, achievement_id, season_id)`?

**`(player_id, achievement_id)` only.** `season_id` is NOT part of the unique constraint.

### 1.3 Does the seed/upsert use `ON CONFLICT DO NOTHING`?

Yes — `ignoreDuplicates: true` in Supabase maps to `ON CONFLICT DO NOTHING`. This means if a player already has a row for achievement X, a second insert for achievement X is silently dropped regardless of season_id.

### 1.4 What happens today if you try to insert a duplicate `(player_id, achievement_id)` row?

The insert is **silently ignored**. No error, no update, no new row. The `ignoreDuplicates: true` flag ensures the upsert becomes a no-op for conflicts.

### 1.5 Does `user_achievements` (coach/parent/admin) have the same constraint?

Yes. From `checkRoleAchievements()` at line 697-701:

```typescript
await supabase.from('user_achievements').upsert(newUnlocks, {
  onConflict: 'user_id,achievement_id',
  ignoreDuplicates: true,
});
```

**Constraint: `(user_id, achievement_id)`** — same pattern, same behavior.

---

## Task 2: Audit How the Achievement Engine Checks "Already Earned"

### 2.1 How does `checkAndUnlockAchievements()` determine if a badge is already earned?

**Lines 47-54** — Queries ALL `player_achievements` for the given player IDs with NO season filter:

```typescript
const { data: existingRows } = await supabase
  .from('player_achievements')
  .select('player_id, achievement_id')
  .in('player_id', playerIds);

const earnedSet = new Set(
  (existingRows || []).map((r) => `${r.player_id}:${r.achievement_id}`)
);
```

### 2.2 What filter does the query use?

**Only `player_id`** — no `season_id` filter, no `achievement_id` filter. It loads ALL achievements ever earned by these players across ALL seasons.

### 2.3 Exact line numbers where the "already earned" check happens

- **Line 116** (checkAndUnlockAchievements): `if (earnedSet.has(`${pId}:${ach.id}`))`
- **Line 272** (checkAllAchievements): `if (earnedSet.has(ach.id))`
- **Line 685** (checkRoleAchievements): `if (earnedSet.has(ach.id))`

### 2.4 earnedSet key format

| Function | Key Format | Example |
|---|---|---|
| `checkAndUnlockAchievements` | `${player_id}:${achievement_id}` | `"abc-123:def-456"` |
| `checkAllAchievements` | `${achievement_id}` | `"def-456"` |
| `checkRoleAchievements` | `${achievement_id}` | `"def-456"` |

### 2.5 checkRoleAchievements — same questions

**Lines 638-642:**

```typescript
const { data: existingRows } = await supabase
  .from('user_achievements')
  .select('achievement_id')
  .eq('user_id', userId);

const earnedSet = new Set(
  (existingRows || []).map((r) => r.achievement_id)
);
```

Same pattern: loads ALL user_achievements with no season filter, builds earnedSet keyed on `achievement_id` only.

---

## Task 3: Audit Cadence on Achievements

### 3.1 How many badges have `cadence = 'season'`?

**Cannot query DB directly**, but the `cadence` column exists on the `achievements` table (SCHEMA_REFERENCE.csv line 42). The V2 spec defines most stat-chain badges and participation badges as `season` cadence. Exact counts require a DB query.

### 3.2 How many have `cadence = 'lifetime'`?

Same — requires DB query. V2 spec assigns `lifetime` to meta-badges (Badge Collector chain, First Blood, etc.).

### 3.3 How many have `cadence = 'weekly'`?

The V2 spec mentions weekly cadence for challenge-related badges. Count requires DB query.

### 3.4 Does the achievement engine use the `cadence` field for any logic today?

**NO.** The `cadence` field is completely unused in the engine. Searching the entire codebase:

- `lib/achievement-types.ts` line 37: `cadence: string | null;` — type definition only
- `lib/achievement-engine.ts`: **zero references** to `cadence`
- `app/achievements.tsx`: **zero references** to `cadence`
- No other file references `cadence` in engagement logic

### 3.5 Where is `cadence` referenced in the codebase?

**Only in the TypeScript type definition** at `lib/achievement-types.ts:37`. It is fetched from the DB as part of the `achievements` select (since it's a column on the table), but never read, checked, or used in any conditional logic anywhere in the codebase.

---

## Task 4: Audit season_id on player_achievements

### 4.1 Is `season_id` populated on existing `player_achievements` rows?

The `season_id` column exists on `player_achievements` (SCHEMA_REFERENCE.csv line 788). Whether existing rows have it populated depends on how they were inserted.

### 4.2 When a badge is earned, is `season_id` passed to the insert?

**Yes, in `checkAndUnlockAchievements()`** — Lines 119-129:

```typescript
newUnlocks.push({
  player_id: pId,
  achievement_id: ach.id,
  season_id: seasonId,  // ← passed from function parameter
  earned_at: now,
  // ...
});
```

**In `checkAllAchievements()`** — Lines 274-281:

```typescript
newUnlocks.push({
  player_id: playerId,
  achievement_id: ach.id,
  season_id: seasonId || undefined,  // ← optional, may be undefined
  earned_at: now,
  // ...
});
```

### 4.3 Are there badges earned WITHOUT a `season_id` (NULL)?

**Likely yes** — `checkAllAchievements` passes `seasonId || undefined`, meaning if `seasonId` is null/undefined, the column will be NULL. Badges earned outside a season context (e.g., role-based) would have NULL season_id.

### 4.4 For `user_achievements` — same questions

`user_achievements` has a `season_id` column (SCHEMA_REFERENCE.csv line 1541). In `checkRoleAchievements()` at lines 687-695:

```typescript
newUnlocks.push({
  user_id: userId,
  achievement_id: ach.id,
  season_id: seasonId || undefined,
  earned_at: now,
  // ...
});
```

Same pattern — season_id is included when available, NULL otherwise.

---

## Task 5: Audit Badge Display UI for Stacking Potential

### 5.1 `app/achievements.tsx`

**How it queries earned badges (lines 287-297):**

```typescript
const { data: earned } = await supabase
  .from('player_achievements')
  .select('achievement_id, earned_at')
  .eq('player_id', resolvedPlayerId);

const map: Record<string, string> = {};
(earned || []).forEach(e => {
  map[e.achievement_id] = e.earned_at;
});
setEarnedMap(map);
```

- **Keyed by `achievement_id`** — if duplicates existed, later rows would overwrite earlier ones
- **No GROUP BY, no count** — stores only latest earned_at per achievement
- **No season filter** — shows all-time earned badges
- **Stacking potential:** Would need to change from `Record<string, string>` to `Record<string, { count: number; firstEarned: string; lastEarned: string }>` or similar. Moderate restructuring needed.

### 5.2 `components/player-scroll/PlayerTrophyCase.tsx`

- Receives `badges: PlayerBadge[]` prop — an array of badge objects
- Displays up to 8 badges in a grid with PopBadge cells
- **No grouping, no counting** — each badge is shown individually
- **Stacking potential:** Could add a count overlay (e.g., "x2" badge) on the PopBadge without major restructuring. Would need the data source to include count info.

### 5.3 `components/TrophyCaseWidget.tsx`

- Uses `getRoleAchievements()` from `lib/role-achievements.ts`
- Returns unique achievements with an `earned: boolean` flag
- Filters to earned, sorts by date, shows top 6
- **No duplicate awareness** — achievements are unique by definition in the current model
- **Stacking potential:** Would need `getRoleAchievements()` to return earn count per achievement. Moderate change.

### 5.4 `components/AchievementCelebrationModal.tsx`

- Takes `unseen: UnseenAchievement[]` prop
- Shows confetti, rarity-colored glow, badge image, name, description
- **No first-time vs re-earn distinction** — treats all badges the same
- **Stacking potential:** Could add a conditional message like "Earned again! (x2)" with minimal UI change. Would need an `earnCount` field on `UnseenAchievement` type.

---

## Task 6: Edge Cases to Consider

### 6.1 Constraint change impact on lifetime badges

If the constraint changes to `(player_id, achievement_id, season_id)`:

- **Lifetime badges with `season_id = NULL`:** Two inserts with NULL season_id would both have the same key `(player_id, achievement_id, NULL)` — most databases treat `NULL = NULL` as NOT equal in unique constraints (SQL standard), meaning **two NULLs would NOT conflict**. This is dangerous — lifetime badges could accidentally be inserted multiple times.
- **Fix needed:** The engine must check `cadence` BEFORE inserting. For `cadence = 'lifetime'`, always check all-time (no season filter). For `cadence = 'season'`, check current season only.
- **Alternative:** Keep the DB constraint as `(player_id, achievement_id)` for lifetime badges and use `(player_id, achievement_id, season_id)` only for season badges — but this requires different tables or a partial unique index.

### 6.2 "Badge Collector" meta-badges

Should a re-earned badge count as a NEW badge for the Badge Collector chain?

- **Recommendation: YES** — the `badges_earned` counter on `season_rank_progress` is season-scoped. Re-earning a badge in a new season should count toward that season's badge count.
- For the lifetime Badge Collector chain (if any), re-earnings should probably NOT count — otherwise a player could re-earn the same 5 badges every season and eventually hit high collector tiers.
- **Decision needed:** Separate counters for "unique badges earned" vs "total badge earn events."

### 6.3 Season rank `badges_earned` counter

Should a re-earned badge increment the season rank `badges_earned`?

- **Recommendation: YES** — season rank progress is season-scoped. If a player re-earns "Kill Streak Bronze" in a new season, it should count as a badge earned this season.
- This already works correctly if the engine awards the badge and the XP/rank system credits it — the question is just whether the engine will LET it be awarded again.

### 6.4 XP award for re-earning

Should re-earning give XP again?

- **Recommendation: YES** — XP is season-scoped (resets each season per V2 rules). Re-earning a badge in a new season should award XP for that season's rank progression.
- Consider a diminishing XP model: first earn = full XP, second earn = 75%, third = 50%. Or keep it simple: full XP every time.

### 6.5 Celebration modal for re-earn

Should it show differently?

- **Recommendation: YES** — Show "Earned Again! (x2)" with the stack count. Could add a subtle visual difference (e.g., a small "x2" badge overlay) but keep the same confetti celebration.

---

## Task 7: Architecture Recommendation

### 7.1 Constraint change vs `badge_earn_count` column

**Recommended approach: BOTH**

1. **Change unique constraint** to `(player_id, achievement_id, season_id)` for season-cadence badges — allows one earn per season
2. **Add `earn_count` column** to `player_achievements` (default 1) — tracks total lifetime earn count for display
3. **Keep `(player_id, achievement_id)` behavior** for lifetime-cadence badges — use a check in the engine, NOT a constraint split

Why both: The constraint change enables the DB to store per-season earn records (needed for history). The earn_count gives a quick lookup for "x3" display without counting rows.

**Alternative considered:** Add a separate `player_achievement_history` table to log each earn event while keeping the main table as-is. This is cleaner for auditing but adds a table and requires JOIN logic for counts.

### 7.2 "Already earned" check for season vs lifetime

**Engine changes needed in three functions:**

For `checkAndUnlockAchievements()` (lines 47-54):
```
// Current: loads ALL player_achievements (no season filter)
// Change to:
//   - For season-cadence badges: load only THIS season's player_achievements
//   - For lifetime-cadence badges: load ALL player_achievements (no change)
// Implementation: load all, then filter in earnedSet construction based on cadence
```

Concrete approach:
1. Fetch ALL `player_achievements` for player (includes `season_id`)
2. For each achievement to check:
   - If `cadence = 'season'`: check if earned THIS season (`season_id = currentSeasonId`)
   - If `cadence = 'lifetime'`: check if earned EVER (any season_id)
   - If `cadence = 'weekly'`: check if earned THIS week
3. Build two sets: `earnedLifetimeSet` and `earnedThisSeasonSet`

### 7.3 Minimal code changes in achievement engine

**`lib/achievement-engine.ts` changes:**

1. **Lines 47-54** (checkAndUnlockAchievements earnedSet):
   - Add `season_id` to the select: `.select('player_id, achievement_id, season_id')`
   - Build TWO sets: `earnedEverSet` and `earnedThisSeasonSet`
   - `earnedEverSet`: all `${player_id}:${achievement_id}` (same as today)
   - `earnedThisSeasonSet`: only rows where `season_id === currentSeasonId`

2. **Line 116** (earn check):
   - Change from: `if (earnedSet.has(...))`
   - Change to: `if (ach.cadence === 'season' ? earnedThisSeasonSet.has(...) : earnedEverSet.has(...))`

3. **Lines 131-135** (upsert):
   - For season-cadence re-earns: cannot use `ignoreDuplicates` if constraint changes
   - Use a regular insert (not upsert) since constraint now includes season_id
   - OR: keep upsert but change onConflict to `'player_id,achievement_id,season_id'`

4. **Same pattern** for `checkAllAchievements` (lines 220-287) and `checkRoleAchievements` (lines 636-701)

### 7.4 UI components needing updates

| Component | Change Needed | Effort |
|---|---|---|
| `app/achievements.tsx` | Change `earnedMap` to include count per achievement | Medium |
| `PlayerTrophyCase.tsx` | Add "xN" overlay on PopBadge for count > 1 | Small |
| `TrophyCaseWidget.tsx` | Pass earn count from data source | Small |
| `AchievementCelebrationModal.tsx` | Add "Earned Again! (xN)" text when count > 1 | Small |
| `UnseenAchievement` type | Add `earnCount: number` field | Trivial |

### 7.5 Recommended phasing

**Phase 1: DB Migration** (no code changes)
- Add `earn_count` column to `player_achievements` (default 1, not null)
- Add `earn_count` column to `user_achievements` (default 1, not null)
- Do NOT change the unique constraint yet — this is a data-only migration

**Phase 2: Engine Logic** (core behavior change)
- Modify all three check functions to be cadence-aware
- For season-cadence: check this-season-only in earnedSet
- For lifetime-cadence: check all-time (no change)
- On re-earn: increment `earn_count` via update, insert new season row
- Change upsert to handle the new stacking logic

**Phase 3: DB Constraint Migration**
- Change unique constraint to `(player_id, achievement_id, season_id)`
- Handle NULL season_id for lifetime badges (add CHECK constraint or default)
- Backfill existing rows to ensure season_id is populated where possible

**Phase 4: UI Updates**
- Update `earnedMap` structure in achievements.tsx
- Add stack count display to PlayerTrophyCase
- Update celebration modal for re-earn messaging
- Add "x2"/"x3" visual to badge components

**Phase 5: Testing & Edge Cases**
- Test season transition: player with earned badges → new season → progress resets → can re-earn
- Test lifetime badges: still blocked from re-earning
- Test Badge Collector counting logic
- Test XP awards on re-earn

---

## Key Risk: NULL season_id in Unique Constraint

The biggest technical risk is the NULL season_id behavior in unique constraints. PostgreSQL treats `(player_id, achievement_id, NULL)` as unique from another `(player_id, achievement_id, NULL)` — meaning lifetime badges with NULL season_id could be inserted multiple times.

**Mitigation options:**
1. **Always populate season_id** — even for lifetime badges, use the season when earned. The cadence field controls re-earning logic, not the season_id.
2. **Use a sentinel value** — e.g., `'lifetime'` as season_id for lifetime badges. Ugly but effective.
3. **Partial unique index** — `CREATE UNIQUE INDEX ... ON player_achievements(player_id, achievement_id) WHERE cadence = 'lifetime'` plus `CREATE UNIQUE INDEX ... ON player_achievements(player_id, achievement_id, season_id) WHERE cadence = 'season'`. Cleanest but requires raw SQL migration.

**Recommendation: Option 1** — always populate season_id. It's the simplest and most maintainable approach. The engine already passes season_id on most inserts; just ensure it's never NULL.
