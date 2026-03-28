# INVESTIGATION-DIVISION-01
# Division-Scaled Stat Thresholds Audit
# Date: 2026-03-28

---

## Summary

The V2 engagement spec requires stat badge thresholds to scale by age division: 10U gets 0.25x thresholds (capped at Rare), 12U gets 0.5x (capped at Epic), 14U+ gets full thresholds through Legendary. Today the achievement engine has **zero** division/age awareness — all players are evaluated against the same thresholds regardless of age group. The infrastructure to add this is clean: `teamId` is already a parameter in the check functions, teams have both `age_group_id` (FK) and `age_group` (free text like "12U"), and the threshold comparison is a single line that can be intercepted.

---

## Task 1: Audit the age_groups system

### 1.1 Table schema (`age_groups`)

| Column | Type |
|--------|------|
| id | uuid |
| season_id | uuid |
| name | text |
| min_grade | integer |
| max_grade | integer |
| display_order | integer |
| created_at | timestamp with time zone |

**Notable:** The `age_groups` table does NOT have `min_age`, `max_age`, `gender`, or `skill_level` columns. The season-settings UI allows creating groups by grade or by age, but the "age" grouping appears to be reflected in the `name` text field (e.g., "12U"), not in dedicated numeric columns.

### 1.2 How age groups are created

- **Season Settings page** (`app/season-settings.tsx` lines 293-329): Admin creates age groups via a modal with grade range or max age input. Groups are stored in the `age_groups` table with `season_id`.
- **Team Manager Setup** (`app/team-manager-setup.tsx` line 38): Defines a hardcoded list: `['10U', '11U', '12U', '13U', '14U', '15U', '16U', '17U', '18U', 'Open']` — this writes to `teams.age_group` (the text field), NOT to `age_groups` table.

### 1.3 Typical age group names

From the team-manager-setup hardcoded list: `10U, 11U, 12U, 13U, 14U, 15U, 16U, 17U, 18U, Open`. The season-settings flow generates names like "4th Grade", "Boys 6th/8th Grade", "Girls Competitive" — more descriptive, less standardized.

### 1.4 How age group links to team

Two paths exist:
- `teams.age_group_id` (uuid FK) → references `age_groups.id` (used by season-settings, admin-teams, team-management)
- `teams.age_group` (varchar text) — free text like "12U" (used by season-setup-wizard, team-manager-setup)

### 1.5 How team links to player

`team_players` table: `(team_id, player_id, is_primary_team, joined_at, jersey_*)`. Standard many-to-many.

### 1.6 Can a player be on multiple teams with different age groups?

**Yes.** `team_players` has no unique constraint preventing a player from being on multiple teams. The `is_primary_team` boolean exists but is always set to `true` on insert (no logic to manage it as exclusive). A player could be on a 10U team and a 12U team simultaneously.

### 1.7 Full join path

```
player_id
  → team_players.player_id = player_id
  → team_players.team_id = teams.id
  → teams.age_group_id = age_groups.id   (OR teams.age_group = '12U')
  → age_groups.name (e.g., "12U")
```

---

## Task 2: Audit the achievement engine threshold checking

### 2.1 How `checkAndUnlockAchievements()` compares stat to threshold

In `lib/achievement-engine.ts`, the function:
1. Fetches all active achievements (line 40-43)
2. Fetches already-earned set (line 47-54)
3. Fetches season stats for all players from `player_season_stats` (lines 57-70)
4. Iterates `player × achievement`, reads `playerStats[ach.stat_key]`, compares to `ach.threshold`

### 2.2 Division/age awareness today

**NO.** There is zero division or age-group logic anywhere in the achievement engine. No age_group, no division, no team lookup for age context.

### 2.3 Exact comparison line

**Line 117:** `if (currentVal >= ach.threshold) {`

This is the single stat-vs-threshold gate for `checkAndUnlockAchievements`.

**Line 273:** `if (currentVal >= ach.threshold) {`

This is the equivalent gate inside `checkAllAchievements` (the on-demand comprehensive check).

### 2.4 Data available at comparison point

At line 117 (`checkAndUnlockAchievements`):
- `playerId` — current player being checked
- `ach.id`, `ach.stat_key`, `ach.threshold`, `ach.rarity`, `ach.engagement_category`, `ach.cadence`
- `teamId` — passed as parameter in `CheckParams`
- `seasonId` — passed as parameter in `CheckParams`
- `gameId` — passed as parameter
- `currentVal` — the player's current stat value

At line 273 (`checkAllAchievements`):
- `playerId` — current player
- Same achievement fields
- `seasonId` — optional parameter
- **No `teamId`** — not a parameter. Would need to be resolved.

### 2.5 Could we insert a threshold override lookup without restructuring?

**Yes, cleanly.** At both comparison points, we could:
1. Before the loop, resolve the player's division from team → age_group
2. Look up an override threshold (or apply a multiplier) based on division
3. Also check a max_rarity cap per division

The `teamId` is already available in `checkAndUnlockAchievements`. For `checkAllAchievements`, we'd need to resolve teamId from `team_players`.

### 2.6 How does the engine handle `threshold_type`?

The `threshold_type` field exists on achievements but is only used in `getAttendanceValue()` (line 371-423) where it distinguishes 'streak' vs 'season' for attendance counting. For stat badges, threshold_type is not referenced in the comparison — all stat comparisons use the single `ach.threshold` value.

The `cadence` field (on `AchievementFull`) appears to be a V2 addition but is NOT used in any threshold logic today. It exists in the type definition but the engine ignores it.

### 2.7 Does it filter by `rarity`?

**No.** The engine does not filter by rarity at all. All active achievements are evaluated regardless of rarity. Adding a `max_rarity` filter per division would be straightforward — skip the achievement if its rarity exceeds the division's cap.

---

## Task 3: Audit stat badges that need scaling

### 3.1 How many badges have `engagement_category = 'stat'`?

The `engagement_category` column exists on the `achievements` table (SCHEMA_REFERENCE.csv line 43). The V2 categories are: `stat`, `milestone`, `coach`, `journey`, `community`.

**Cannot query the DB directly from this investigation.** However, the spec's intent is clear: only `engagement_category = 'stat'` badges need division scaling. Other categories (milestone, coach, journey, community) are not stat-dependent and don't need scaling.

### 3.2 Unique `stat_key` values for stat badges

From the `player_season_stats` schema, the volleyball-relevant stat keys are:
- `total_kills`, `total_aces`, `total_digs`, `total_blocks`, `total_assists`
- `total_serves`, `total_service_errors`, `total_attacks`, `total_attack_errors`
- `total_block_assists`, `total_receptions`, `total_reception_errors`, `total_points`
- `games_played`, `games_started`
- Per-game averages: `aces_per_game`, `kills_per_game`, `blocks_per_game`, `digs_per_game`, `assists_per_game`, `points_per_game`
- Percentages: `hitting_percentage`, `serve_percentage`

The actual `stat_key` values used in achievement records would need a DB query. The V2 spec example uses `total_kills` for the kill chain.

### 3.3 Threshold values across rarity tiers (from V2 spec, kill chain example)

| Badge | Rarity | 14U+ | 12U | 10U |
|-------|--------|------|-----|-----|
| First Blood | Common | 1 | 1 | 1 |
| Kill Streak I | Common | 10/season | 7/season | 4/season |
| Kill Streak II | Uncommon | 25/season | 15/season | 8/season |
| Kill Streak III | Rare | 50/season | 25/season | 12/season |
| Terminator | Epic | 100/season | 40/season | N/A (capped) |
| Kill Record | Legendary | 200/season | N/A (capped) | N/A (capped) |

### 3.4 Which stat badges have `cadence = 'season'` vs `cadence = 'lifetime'`?

The `cadence` column exists on achievements. From the V2 spec:
- Most stat chains are season-cadence (reset each season, re-earnable)
- "First Blood" (1 kill) is likely lifetime — you earn it once

### 3.5 Do lifetime-cadence stat badges need scaling?

**Generally no.** Badges like "First Blood" (1 kill) have threshold = 1, which is the same at any age. However, if a lifetime badge has a higher threshold (e.g., "Career 500 kills"), those would NOT need division scaling because they accumulate across seasons and the player's age/division changes over time.

**Recommendation:** Only scale `cadence = 'season'` stat badges. Leave `cadence = 'lifetime'` and `cadence = null` (legacy) unchanged.

---

## Task 4: Audit how teams and players relate

### 4.1 `team_players` table schema

| Column | Type |
|--------|------|
| id | uuid |
| team_id | uuid |
| player_id | uuid |
| jersey_number | integer |
| is_primary_team | boolean |
| joined_at | timestamp with time zone |
| jersey_assigned_at | timestamp with time zone |
| jersey_needs_order | boolean |
| jersey_ordered_at | timestamp with time zone |
| jersey_preference_result | text |

### 4.2 How does the app resolve "which team is this player on"?

Multiple patterns exist:
- `team_players` query filtered by `player_id`, often with `.limit(1)` or `.maybeSingle()`
- The `is_primary_team` flag exists but is always set to `true` on insert — not reliably used to disambiguate
- `usePlayerHomeData` resolves primary team as `teams[0]`

### 4.3 Can a player be on multiple teams in the same season?

**Yes.** There's no unique constraint on `(player_id, season)` in `team_players`. However, in practice it's uncommon in youth sports.

### 4.4 If a player is on a 10U team AND a 12U team, which age group applies?

**No existing logic handles this.** Recommendation: Use the team that `player_season_stats` references (it has `team_id`), OR fall back to the primary team, OR use the highest age group (most restrictive = fairest).

### 4.5 How does `checkAndUnlockAchievements()` receive the team context?

`CheckParams` includes `teamId: string` — the team is explicitly passed in when stats are saved for a game. This is the team the game was played for, making it the correct context for division scaling.

For `checkAllAchievements()`, there is **no teamId parameter**. The function would need to resolve the player's team to determine division.

---

## Task 5: Check for existing division/age logic

### Grep results (non-reference, non-archive files)

**No engagement/achievement files reference age groups or divisions.** Zero matches in:
- `lib/achievement-engine.ts`
- `lib/engagement-constants.ts`
- `lib/xp-award-service.ts`
- `lib/season-rank-engine.ts`
- `hooks/useSeasonRank.ts`
- `hooks/usePlayerHomeData.ts`

Age group references exist only in:
- Team management screens (`admin-teams.tsx`, `teams.tsx`, `team-management.tsx`, `season-settings.tsx`)
- Registration flow (`registration-start.tsx`, `registration-hub.tsx`)
- Season setup wizard (`season-setup-wizard.tsx`, `team-manager-setup.tsx`)
- Reports system (`reports.ts`, `ReportViewerScreen.tsx`)
- Player card expanded (`PlayerCardExpanded.tsx` — displays `age_group_name`)

**Conclusion:** The engagement system is completely age-group-blind today.

---

## Task 6: Check player_season_stats

### 6.1 Does `player_season_stats` exist? Columns?

**Yes.** Full schema (93 columns). Key columns:
- `id` (uuid), `player_id` (uuid), `team_id` (uuid), `season_id` (uuid)
- Volleyball: `games_played`, `total_kills`, `total_aces`, `total_digs`, `total_blocks`, `total_assists`, `total_serves`, `total_attacks`, etc.
- Also includes basketball, soccer, baseball, football, hockey stats
- Per-game averages and percentages

### 6.2 Does it have `team_id` or `age_group_id`?

- **`team_id`: YES** — uuid FK
- **`age_group_id`: NO** — not present

### 6.3 Are stats aggregated per-team or per-player across all teams?

Stats are **per player per team per season** (the unique key is `player_id + team_id + season_id`). A player on two teams would have two separate `player_season_stats` rows.

### 6.4 If a player plays on two teams, are their stats combined or separate?

**Separate.** Each team gets its own row. The achievement engine's `gatherAllStats()` (line 336-369) queries `player_season_stats` with `.eq('player_id', playerId).eq('season_id', seasonId).maybeSingle()`. If there are two rows (two teams), `.maybeSingle()` would return an arbitrary one or error.

**Bug potential:** If a player is on multiple teams, `gatherAllStats()` may silently pick one team's stats. This is a pre-existing issue, not introduced by division scaling.

---

## Task 7: Architecture recommendation

### 7.1 New table vs. column approach

**Recommended: New `division_thresholds` table.**

```sql
division_thresholds (
  id uuid PRIMARY KEY,
  achievement_id uuid REFERENCES achievements(id),
  division text NOT NULL,        -- '10u', '12u', '14u_plus'
  threshold_override integer,    -- scaled threshold value
  max_rarity text,               -- 'rare', 'epic', 'legendary'
  created_at timestamptz DEFAULT now()
  UNIQUE(achievement_id, division)
)
```

**Why not columns on achievements?** Adding `threshold_10u`, `threshold_12u`, `threshold_14u` would work for 3 divisions but couples the schema to a specific division structure. A separate table is:
- More flexible (add "Open" or "8U" divisions later)
- Cleaner to seed (one insert per achievement × division)
- Easier to query/maintain independently

### 7.2 Where to inject the logic

**`lib/achievement-engine.ts`:**

**A. `checkAndUnlockAchievements()` (line 34-183):**
- After line 70 (stats loaded), resolve division: query `teams.age_group` or `teams.age_group_id → age_groups.name` using the `teamId` param
- Before line 94 (player loop), batch-fetch `division_thresholds` for the resolved division
- At line 117, replace `ach.threshold` with `overrideThreshold ?? ach.threshold`
- Before line 117, add rarity cap check: `if (maxRarity && RARITY_ORDER[ach.rarity] > RARITY_ORDER[maxRarity]) continue`

**B. `checkAllAchievements()` (line 194-330):**
- After line 210, resolve player's team: `team_players.eq('player_id', playerId).limit(1)` → get teamId → get age_group
- Batch-fetch division_thresholds
- At line 273, same threshold override + rarity cap

**C. `getTrackedProgress()` (line 524-554):**
- At line 539-540, the target value should also use the override for display accuracy

### 7.3 How to resolve division from player → team → age_group

```typescript
async function resolvePlayerDivision(playerId: string, teamId?: string): Promise<string> {
  // If teamId provided (from game context), use it directly
  let targetTeamId = teamId;
  if (!targetTeamId) {
    const { data } = await supabase
      .from('team_players')
      .select('team_id')
      .eq('player_id', playerId)
      .limit(1)
      .maybeSingle();
    targetTeamId = data?.team_id;
  }
  if (!targetTeamId) return '14u_plus'; // default

  const { data: team } = await supabase
    .from('teams')
    .select('age_group, age_group_id')
    .eq('id', targetTeamId)
    .maybeSingle();

  // Try text field first (most reliable, "12U" format)
  if (team?.age_group) {
    return parseDivisionFromAgeGroup(team.age_group);
  }

  // Fall back to age_groups table
  if (team?.age_group_id) {
    const { data: ag } = await supabase
      .from('age_groups')
      .select('name')
      .eq('id', team.age_group_id)
      .maybeSingle();
    if (ag?.name) return parseDivisionFromAgeGroup(ag.name);
  }

  return '14u_plus'; // default to full thresholds
}

function parseDivisionFromAgeGroup(name: string): string {
  const match = name.match(/(\d+)/);
  if (!match) return '14u_plus';
  const age = parseInt(match[1]);
  if (age <= 10) return '10u';
  if (age <= 12) return '12u';
  return '14u_plus';
}
```

### 7.4 Edge cases

| Edge Case | Recommendation |
|-----------|---------------|
| `age_group` is NULL on team | Default to `14u_plus` (full thresholds). Player gets the hardest targets — fairest default. |
| Player on multiple teams with different divisions | Use the team from `checkAndUnlockAchievements` `teamId` param (game context). For `checkAllAchievements`, use `player_season_stats.team_id` or first team found. |
| No `division_thresholds` row for an achievement | Fall back to `ach.threshold` (the base 14U+ value). No scaling = no change. |
| Division is "Open" or unrecognized | Map to `14u_plus`. |
| `cadence = 'lifetime'` badges | Skip division scaling entirely. Only scale `cadence = 'season'`. |
| Grade-based age groups (e.g., "4th Grade") | Parse the number: grades 1-4 → 10u, grades 5-6 → 12u, grades 7+ → 14u_plus. |

### 7.5 Seed data generation

For each stat achievement with `engagement_category = 'stat'` and `cadence = 'season'`:

```
10u threshold = ROUND(base_threshold * 0.25)  (min 1)
12u threshold = ROUND(base_threshold * 0.50)  (min 1)
14u_plus threshold = base_threshold (no override needed, or omit row)
```

Rarity caps:
```
10u: max_rarity = 'rare'
12u: max_rarity = 'epic'
14u_plus: max_rarity = 'legendary' (or no cap)
```

Seed script approach:
1. Query all achievements where `engagement_category = 'stat'` AND `cadence = 'season'`
2. For each, insert 2 rows into `division_thresholds` (10u and 12u; 14u_plus is the default)
3. Review per-stat adjustments (digs are more common than blocks, so ratios may need tuning)

---

## Recommended Execution Approach

### Phase 1: Create `division_thresholds` table migration + constants
- Define table schema
- Add `DIVISION_CONFIGS` constant with scaling ratios and rarity caps
- Add `parseDivisionFromAgeGroup()` and `resolvePlayerDivision()` utilities

### Phase 2: Add division resolution to achievement engine
- Modify `checkAndUnlockAchievements()`: resolve division from teamId, apply threshold override + rarity cap
- Modify `checkAllAchievements()`: resolve division from team_players, apply same
- Modify `getTrackedProgress()`: use override thresholds for display

### Phase 3: Seed division thresholds
- Generate insert rows for all stat/season achievements × 2 divisions (10u, 12u)
- Manually review ratios for each stat type

### Phase 4: UI — show division context
- On achievement cards, show the division-specific threshold ("25 kills" vs "50 kills")
- On progress bars, use the correct target value for the player's division
- Consider showing "12U" badge on achievement cards for clarity

### Phase 5: Verification
- tsc, test with mock data for each division
- Verify rarity caps work (10U player can't earn Epic/Legendary stat badges)
- Verify lifetime badges are unaffected

### Pre-existing issue to address
- `gatherAllStats()` uses `.maybeSingle()` which may fail for players on multiple teams. Consider changing to `.limit(1)` with a `team_id` filter when available.

---

## File Reference

| File | Relevance |
|------|-----------|
| `lib/achievement-engine.ts` | **PRIMARY** — threshold comparisons at lines 117 and 273 |
| `lib/achievement-types.ts` | `AchievementFull` type — has `engagement_category`, `cadence`, `rarity` |
| `lib/engagement-constants.ts` | `ENGAGEMENT_CATEGORIES` — stat category definition |
| `SCHEMA_REFERENCE.csv` | `achievements`, `team_players`, `teams`, `age_groups`, `player_season_stats` schemas |
| `app/season-settings.tsx` | Age group creation UI (reference for naming patterns) |
| `app/team-manager-setup.tsx` | Hardcoded age group list: 10U-18U, Open |
| `app/achievements.tsx` | Calls `checkAllAchievements()` — needs division context |
