# LYNX — Mobile Leaderboards Build
## For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)
**Backend:** Supabase (project: uqpjvbiuokwpldjvxiby)
**Web Reference:** `C:\Users\fuent\Downloads\volleybrain-admin\src\pages\leaderboards\SeasonLeaderboardsPage.jsx`

---

## CONTEXT

The mobile app's `standings.tsx` screen has team standings working but the leaderboards section shows "Coming Soon." The web admin has a fully working leaderboard page (`SeasonLeaderboardsPage.jsx`) that queries `player_season_stats` and displays ranked players across 8 stat categories. We need to bring this to mobile — same data, native mobile UX.

---

## RULES (READ FIRST)

1. **Read SCHEMA_REFERENCE.csv FIRST.** Verify `player_season_stats` table exists and confirm all column names before writing any query. Also verify `players` and `teams` tables and their join columns.

2. **Read the web admin implementation FIRST:**
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\pages\leaderboards\SeasonLeaderboardsPage.jsx` — This is the source of truth for the query pattern, stat categories, and data processing. Read the ENTIRE file.

3. **Read the existing mobile standings screen:**
   - `app/standings.tsx` — understand what's already built and where the "Coming Soon" stub is
   - `components/coach-scroll/SeasonLeaderboardCard.tsx` — the coach home's leaderboard preview card (currently navigates to coach-roster, should reference leaderboards)

4. **Cross-reference with web admin.** Use the EXACT same Supabase query pattern from `SeasonLeaderboardsPage.jsx`. Do not invent a new query.

5. **Follow the app's design system.** Read `lib/design-tokens.ts` and `theme/colors.ts` for colors. Read `theme/fonts.ts` for font families. Use existing UI components from `components/ui/` where possible.

6. **Role-aware.** Coaches see their teams highlighted. Players see themselves highlighted. Parents see their children highlighted. Admin sees all.

7. **After each phase, run `npx tsc --noEmit`** — zero new errors.
8. **Commit AND push after each phase.**
9. **Test all four roles after each phase.**
10. **No console.log without `__DEV__` gating.**

---

## PHASE 1: LEADERBOARD DATA HOOK

### Step 1A: Read the web implementation

Read `C:\Users\fuent\Downloads\volleybrain-admin\src\pages\leaderboards\SeasonLeaderboardsPage.jsx` entirely. Note:
- The `LEADERBOARD_CATEGORIES` array (8 categories with statKey, perGameKey, color, icon)
- The `loadLeaderboards()` function and its Supabase query
- How it processes data: filters by `games_played > 0`, handles percentages (`games_played >= 3`), sorts descending
- The `getFilteredLeaders()` function for team filtering

### Step 1B: Read SCHEMA_REFERENCE.csv

Verify these exist:
- `player_season_stats` table with columns: `season_id`, `player_id`, `team_id`, `games_played`, `total_points`, `total_aces`, `total_kills`, `total_blocks`, `total_digs`, `total_assists`, `hitting_percentage`, `serve_percentage`
- `players` table with: `id`, `first_name`, `last_name`, `jersey_number`, `photo_url`, `position`
- `teams` table with: `id`, `name`, `season_id`

If any column names differ, use what's in SCHEMA_REFERENCE.csv and note the difference.

### Step 1C: Create `hooks/useLeaderboardData.ts`

Create a new hook that:

```typescript
// hooks/useLeaderboardData.ts

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Match the web admin's categories exactly
export const LEADERBOARD_CATEGORIES = [
  { id: 'points', label: 'Points', statKey: 'total_points', icon: '⭐', color: '#F59E0B', description: 'Total points scored' },
  { id: 'aces', label: 'Aces', statKey: 'total_aces', icon: '🏐', color: '#10B981', description: 'Service aces' },
  { id: 'kills', label: 'Kills', statKey: 'total_kills', icon: '💥', color: '#EF4444', description: 'Attack kills' },
  { id: 'blocks', label: 'Blocks', statKey: 'total_blocks', icon: '🛡️', color: '#6366F1', description: 'Total blocks' },
  { id: 'digs', label: 'Digs', statKey: 'total_digs', icon: '🏃', color: '#4BB9EC', description: 'Defensive digs' },
  { id: 'assists', label: 'Assists', statKey: 'total_assists', icon: '🙌', color: '#8B5CF6', description: 'Setting assists' },
  { id: 'hitting', label: 'Hit %', statKey: 'hitting_percentage', isPercentage: true, icon: '🎯', color: '#EC4899', description: 'Attack efficiency' },
  { id: 'serving', label: 'Serve %', statKey: 'serve_percentage', isPercentage: true, icon: '✅', color: '#14B8A6', description: 'Serve success rate' },
];

export function useLeaderboardData(seasonId: string | null) {
  // Returns: { leaderboardData, loading, error, teams, refreshLeaderboards }
  // leaderboardData is an object keyed by category ID, each value is a sorted array of player entries
  // Copy the EXACT query pattern from the web admin's loadLeaderboards() function
}
```

The query should be:
```typescript
const { data: stats } = await supabase
  .from('player_season_stats')
  .select(`
    *,
    player:players(id, first_name, last_name, jersey_number, photo_url, position),
    team:teams(id, name)
  `)
  .eq('season_id', seasonId)
  .gt('games_played', 0);
```

Process exactly like the web: for each category, filter/sort the stats, handle percentages with minimum 3 games.

Also fetch teams for the team filter:
```typescript
const { data: teamData } = await supabase
  .from('teams')
  .select('id, name')
  .eq('season_id', seasonId)
  .order('name');
```

Export a `getFilteredLeaders(categoryId, teamFilter)` helper function.

**Verification:** Hook compiles with `npx tsc --noEmit`.

**Commit:** `git add -A && git commit -m "Leaderboards Phase 1: Create useLeaderboardData hook" && git push`

---

## PHASE 2: LEADERBOARD SCREEN COMPONENT

### Step 2A: Read existing standings screen

Read `app/standings.tsx` entirely. Understand:
- How team standings are rendered (this stays untouched)
- Where the "Coming Soon" leaderboard stub is
- The overall layout/tabs/navigation pattern
- What context providers are available (season, theme, auth)

### Step 2B: Read the app's design patterns

Skim these for the visual language:
- `components/coach-scroll/SeasonLeaderboardCard.tsx` — how the coach home previews leaderboard data
- `components/ui/PillTabs.tsx` — if a tab component exists, use it for category switching
- `components/ui/Card.tsx` — if a card wrapper exists, use it
- `lib/design-tokens.ts` — spacing, radii, shadows

### Step 2C: Build the leaderboard UI

The mobile leaderboard should have TWO views, toggled by a segmented control or pill tabs at the top:

**View 1: Grid Overview (default)**
- Horizontal scrollable category pills at the top (Points, Aces, Kills, Blocks, Digs, Assists, Hit %, Serve %)
- Below that: a card grid showing the top 3 for EACH category (like mini leaderboard cards)
- Each mini card shows: category icon + label, then rank 1/2/3 with player name, jersey #, photo, and stat value
- Tapping "View All" on a mini card switches to Full List view for that category
- Below the grid: a "Season MVPs" gradient banner showing the #1 player for Points, Aces, and Kills

**View 2: Full List**
- Category pills at top (horizontally scrollable) — tapping one filters the list
- Full ranked list of all players for the selected category
- Each row: rank badge (🥇🥈🥉 for 1-3, number for 4+), player photo (or jersey # fallback), name, team name, stat value, games played
- Highlight the current user's row (player sees themselves, coach sees their team's players, parent sees their children)
- Team filter dropdown/pill at the top

**Layout for both views:**
- Use `ScrollView` (not FlatList — the data is bounded, rarely more than 50 players per category)
- Respect the current theme (light/dark from `useTheme()`)
- Use brand colors from `design-tokens.ts`
- Rank badges: gold gradient for #1, silver for #2, bronze for #3, muted circle for 4+
- Player photos: rounded, with jersey number fallback
- Stat values: large, bold, colored by category

### Step 2D: Create `components/LeaderboardScreen.tsx`

This is a standalone component (not a tab screen — it will be rendered inside `standings.tsx`).

Props:
```typescript
interface LeaderboardScreenProps {
  seasonId: string;
  highlightPlayerId?: string;    // Player role: highlight self
  highlightTeamId?: string;      // Coach role: highlight team
  highlightPlayerIds?: string[]; // Parent role: highlight children
  onPlayerTap?: (playerId: string, teamId: string) => void;
}
```

Use the `useLeaderboardData` hook from Phase 1.

### Step 2E: Integrate into standings.tsx

Read `app/standings.tsx` again. The screen likely has a tab or section structure (Standings + Leaderboards). Replace the "Coming Soon" stub with the `LeaderboardScreen` component.

Wire the highlight props based on the current user's role:
- **Player:** `highlightPlayerId = currentUser.player_id`
- **Coach:** `highlightTeamId = selectedTeamId` (from team context or selector)
- **Parent:** `highlightPlayerIds = [child1.id, child2.id, ...]`
- **Admin:** no highlight (sees all)

Wire `onPlayerTap` to navigate to the player's profile/card:
- For coach/admin: `router.push('/child-detail?playerId=${playerId}')` or similar
- For player: `router.push('/my-stats')`
- For parent: `router.push('/child-detail?playerId=${playerId}')`

**Verification:**
- All roles: standings.tsx renders, leaderboards section shows real data (or "No data yet" if no stats exist)
- Category pills scroll horizontally
- Grid view shows mini cards with top 3
- Full list view shows ranked players
- Current user/team is highlighted
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Leaderboards Phase 2: Build LeaderboardScreen component + integrate into standings" && git push`

---

## PHASE 3: WIRE LEADERBOARD ENTRY POINTS

### Step 3A: Fix coach home leaderboard navigation

Read `components/coach-scroll/SeasonLeaderboardCard.tsx`. The "View Leaderboard" button currently navigates to `/(tabs)/coach-roster` (which was the broken route, now fixed to be the roster screen). It should go to leaderboards instead.

Change the "View Leaderboard" navigation to: `router.push('/standings')` — since standings.tsx now contains the full leaderboard.

If the `SeasonLeaderboardCard` shows a preview of leaderboard data (top players per stat), verify it's using real data. If it's hardcoded or stubbed, wire it to use `useLeaderboardData` or pass the data down from `useCoachHomeData`.

### Step 3B: Add leaderboard access from player home

Read `components/player-scroll/LastGameStats.tsx`. If it has a "View All Stats" or similar link, wire it to `/standings`.

Read `components/PlayerHomeScroll.tsx`. If there's no natural entry point to leaderboards, add a small "🏆 Leaderboards" link below the LastGameStats section:
```tsx
<TouchableOpacity onPress={() => router.push('/standings')}>
  <Text>🏆 See where you rank</Text>
</TouchableOpacity>
```

Keep it subtle — one line, themed, not a full card. The player home is already dense.

### Step 3C: Verify parent access

Parents reach standings through the MetricGrid "Record" card on `ParentHomeScroll`. Read `components/parent-scroll/MetricGrid.tsx` and verify the Record card navigates to somewhere that includes standings/leaderboards. If it goes to `parent-schedule`, consider whether it should also or instead go to `/standings`. If it already goes to `/standings`, no change needed.

### Step 3D: Verify admin access

The admin home's "View Leaderboard" was either part of the quick actions (wired in Three Fires to various screens) or accessible through the drawer. Verify the admin can reach `/standings` from somewhere. If not, it should be accessible from the drawer menu — check `GestureDrawer.tsx` for a standings/leaderboard item.

**Verification:**
- Coach home: "View Leaderboard" on SeasonLeaderboardCard → opens standings with leaderboards
- Player home: leaderboard link visible, navigates to standings
- Parent home: can reach standings/leaderboards
- Admin: can reach standings/leaderboards
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Leaderboards Phase 3: Wire all entry points across roles" && git push`

---

## PHASE 4: POLISH + EMPTY STATES

### Step 4A: Empty state handling

When a season has no game stats yet (new season, no games played), the leaderboard should show a friendly empty state, not a blank screen.

In `LeaderboardScreen.tsx`, when ALL categories have zero entries:
```tsx
// Empty state
<View style={styles.emptyContainer}>
  <Text style={styles.emptyIcon}>🏆</Text>
  <Text style={styles.emptyTitle}>No Rankings Yet</Text>
  <Text style={styles.emptySubtitle}>
    Leaderboards will appear once game stats are recorded.
    {'\n'}Play some games and check back!
  </Text>
</View>
```

When a SPECIFIC category has zero entries (but others have data):
```tsx
<Text>No {category.label.toLowerCase()} recorded yet</Text>
```

### Step 4B: Per-game averages

The web admin has `perGameKey` on some categories. If the data supports it, add a toggle or secondary line on each leaderboard row showing per-game averages:
- "245 pts (12.3/game)"
- Display format: total stat value large + per-game in smaller muted text below

Only do this if `games_played` is available on the stat entries (it should be from the query).

### Step 4C: Pull-to-refresh

Add pull-to-refresh to the standings screen's ScrollView:
```tsx
<ScrollView
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
  }
>
```

The refresh should re-fetch both standings AND leaderboard data.

### Step 4D: Loading skeleton

While data loads, show a skeleton placeholder (not a spinner). Use the app's existing `Skeleton` pattern if one exists, or use simple animated placeholder bars.

**Verification:**
- Fresh season (no stats): shows friendly empty state
- Season with stats: shows full leaderboards with per-game averages
- Pull down: refreshes data
- Loading: shows skeleton, not spinner
- All four roles still work
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Leaderboards Phase 4: Empty states, per-game averages, pull-to-refresh, loading skeleton" && git push`

---

## EXECUTION ORDER

```
Phase 1: Create useLeaderboardData hook (data layer)
Phase 2: Build LeaderboardScreen component + integrate into standings.tsx
Phase 3: Wire entry points across all roles
Phase 4: Polish (empty states, per-game averages, refresh, skeleton)
```

Execute all phases autonomously. Do not stop between phases. Commit after each phase.

---

## DESIGN REFERENCE

**Category Colors (from web admin):**
- Points: #F59E0B (amber)
- Aces: #10B981 (emerald)
- Kills: #EF4444 (red)
- Blocks: #6366F1 (indigo)
- Digs: #4BB9EC (sky)
- Assists: #8B5CF6 (violet)
- Hit %: #EC4899 (pink)
- Serve %: #14B8A6 (teal)

**Rank Badge Style:**
- #1: Gold gradient circle with 🥇
- #2: Silver gradient circle with 🥈
- #3: Bronze gradient circle with 🥉
- 4+: Muted gray circle with number

**Row Layout (per entry):**
```
[RankBadge] [Photo/Jersey#] [Name + Team] .............. [StatValue]
                                                          [games played]
```

**Highlighted row:** Add a subtle ring/border in the accent color when the row is the current user/team.

---

*Reference: Web admin SeasonLeaderboardsPage.jsx for exact query pattern and category definitions. SCHEMA_REFERENCE.csv for table verification.*
