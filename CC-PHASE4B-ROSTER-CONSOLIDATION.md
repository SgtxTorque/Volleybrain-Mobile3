# CC-PHASE4B-ROSTER-CONSOLIDATION.md
# Lynx Mobile — Phase 4B: Roster Screen Consolidation
# EXECUTION SPEC

---

## PURPOSE

Merge 4 roster screens into 1 role-aware roster screen with player tap navigation.

**Current state:** 4 files, 1,186 total lines
- `app/(tabs)/players.tsx` — 493 lines, grid/list view, team filter, expanded card modal, NO outbound nav to player detail
- `app/roster.tsx` — 423 lines, carousel via RosterCarousel, team-specific, nav handled by RosterCarousel internally
- `app/(tabs)/coach-roster.tsx` — 6 lines, re-export of players.tsx
- `app/team-roster.tsx` — 264 lines, FlatList with player tap → `/child-detail?playerId={id}`, team-specific via `teamId` param

**Target state:** 1 enhanced file + 2 redirect files
- `app/(tabs)/players.tsx` — enhanced with player tap navigation, team-roster features merged in
- `app/roster.tsx` → redirect to players.tsx
- `app/(tabs)/coach-roster.tsx` → redirect to players.tsx (already is)
- `app/team-roster.tsx` → redirect to players.tsx

---

## BEFORE YOU START

1. Read `CC-LYNX-RULES.md` and `CC-PROJECT-CONTEXT.md`
2. Read `CC-SHARED-SCREEN-ARCHITECTURE.md` — specifically Section 3 (ROSTER)
3. Read ALL FOUR roster files completely before making any changes.

---

## RULES

1. **Modify only the files listed in this spec.**
2. **Do NOT touch home scroll components** except for the specific reference updates listed in Step 4.
3. **Do NOT change RosterCarousel.tsx** — it works fine and is used by roster.tsx. We're redirecting roster.tsx, not rewriting the carousel.
4. **Do NOT change the team-hub RosterSection.tsx** rendering logic — only its route reference if needed.
5. **Execute sequentially. Produce one report at the end.**

---

## STEP 1: Study the Differences

Key features to understand per file:

**`players.tsx` (493 lines) — the base to enhance:**
- Grid and list view modes with toggle
- Team filter (horizontal team pills)
- Search with query filtering
- `PlayerCard` component for grid items
- `PlayerCardExpanded` modal on tap (Phase 2 added "View Full Profile" nav here)
- Add Player modal
- Season-aware data fetching

**`team-roster.tsx` (264 lines) — features to merge:**
- Takes `teamId` param — shows single team's players
- Player tap → `/child-detail?playerId={id}` (the only roster with this navigation)
- FlatList with player rows (avatar, name, jersey, position)
- Team name in header

**`roster.tsx` (423 lines) — features to note:**
- Carousel view via `RosterCarousel` component
- Takes `teamId` param
- Complex team resolution (admin, coach, parent, player paths)
- RosterCarousel handles player tap → `/player-card?playerId={id}` internally

**`coach-roster.tsx` (6 lines) — just a re-export of players.tsx**

---

## STEP 2: Enhance players.tsx

**File:** `app/(tabs)/players.tsx`

### 2A: Add teamId param support

Currently `players.tsx` fetches all players in the season. Add support for an optional `teamId` param that pre-filters to a specific team:

```typescript
import { useLocalSearchParams } from 'expo-router';

// Inside component:
const { teamId: paramTeamId } = useLocalSearchParams<{ teamId?: string }>();
```

If `paramTeamId` is provided, auto-select that team in the team filter and skip the "all players" view.

```typescript
// In the useEffect or after teams load:
useEffect(() => {
  if (paramTeamId && teams.length > 0) {
    setSelectedTeam(paramTeamId);
  }
}, [paramTeamId, teams]);
```

### 2B: Add role-aware player tap navigation

The current tap handler opens `PlayerCardExpanded` modal (line ~184). Phase 2 added a "View Full Profile" button inside that modal. But we should ALSO add direct navigation from the grid/list items for a faster path.

Add a role-aware navigation helper:

```typescript
const { isAdmin, isCoach, isParent } = usePermissions();

const handlePlayerTap = (player: PlayerCardPlayer) => {
  if (isAdmin || isCoach) {
    router.push(`/child-detail?playerId=${player.id}` as any);
  } else {
    router.push(`/player-card?playerId=${player.id}` as any);
  }
};
```

**For the grid view** (`renderGridItem`), change the `onPress`:
- **Long press** → open expanded card modal (keep existing behavior)
- **Short tap** → navigate via `handlePlayerTap`

```typescript
const renderGridItem = ({ item }: { item: PlayerCardPlayer }) => (
  <PlayerCard
    player={{...}}
    onPress={() => handlePlayerTap(item)}
    onLongPress={() => setSelectedPlayer(item)}
  />
);
```

**Important:** Check if `PlayerCard` component supports `onLongPress`. If not, just use the short tap for navigation and keep the expanded modal accessible via some other gesture or button. Do NOT break the existing expanded card modal — it's useful for quick previews.

**If PlayerCard does NOT support onLongPress:** Keep the existing `onPress` → expanded modal behavior. The "View Full Profile" button inside the modal (from Phase 2) handles navigation. No change needed to the grid tap behavior in that case.

**For the list view** (`renderListItem`), the tap currently also opens the expanded modal. Same approach — if onLongPress is available, use short tap for nav and long press for modal. If not, leave as-is since the modal's "View Full Profile" button handles it.

### 2C: Add view mode — carousel (optional)

`roster.tsx` uses `RosterCarousel` for a swipeable card view. If you can cleanly add this as a third view mode option (grid / list / carousel), do so. If it adds significant complexity, skip it — the grid and list views are sufficient.

**If adding carousel:** Import `RosterCarousel` and add a 'carousel' option to the `ViewMode` type. Render RosterCarousel when carousel mode is selected. RosterCarousel already handles its own player tap navigation (→ player-card).

**If skipping carousel:** That's fine. Note it in the report.

### 2D: Handle the "no teamId" case gracefully

When `players.tsx` is opened without a `teamId` (e.g., from the drawer "Roster" item), it should show all teams with the team filter pills. When opened WITH a `teamId` (e.g., from team-hub or admin team health tiles), it should auto-filter to that team.

This is already mostly how it works — just ensure the `paramTeamId` auto-select from 2A integrates smoothly.

---

## STEP 3: Create Redirect Files

**File:** `app/roster.tsx`
Replace entire contents with:
```typescript
// Consolidated into (tabs)/players.tsx — this file exists for route compatibility
// Redirects /roster?teamId=X to /(tabs)/players?teamId=X
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function RosterRedirect() {
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();
  return <Redirect href={teamId ? `/(tabs)/players?teamId=${teamId}` as any : '/(tabs)/players' as any} />;
}
```

This preserves the `teamId` param when redirecting. Any link to `/roster?teamId=X` will land on `/(tabs)/players?teamId=X`.

**File:** `app/team-roster.tsx`
Replace entire contents with:
```typescript
// Consolidated into (tabs)/players.tsx — this file exists for route compatibility
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TeamRosterRedirect() {
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();
  return <Redirect href={teamId ? `/(tabs)/players?teamId=${teamId}` as any : '/(tabs)/players' as any} />;
}
```

**File:** `app/(tabs)/coach-roster.tsx`
Already a re-export of players.tsx. Leave as-is or update the comment:
```typescript
// Consolidated — roster functionality lives in players.tsx
export { default } from './players';
```

---

## STEP 4: Update External References

These files reference the old roster routes. Update them:

**File:** `components/team-hub/RosterSection.tsx` — line 117
```typescript
// BEFORE:
pathname: '/roster' as any,
// AFTER:
pathname: '/(tabs)/players' as any,
```
Keep the `params: { teamId }` — it should pass through to the `teamId` search param.

**File:** `components/admin-scroll/TeamHealthTiles.tsx` — line 73
```typescript
// BEFORE:
onPress={() => router.push(`/team-roster?teamId=${item.id}` as any))
// AFTER:
onPress={() => router.push(`/(tabs)/players?teamId=${item.id}` as any))
```

**File:** `app/(tabs)/coach-my-stuff.tsx` — line 278
```typescript
// BEFORE:
onPress={() => router.push({ pathname: '/team-roster', params: { teamId: team.teamId } } as any))
// AFTER:
onPress={() => router.push(`/(tabs)/players?teamId=${team.teamId}` as any))
```

**Leave these references UNCHANGED** (they already point to correct destinations):
- `components/coach-scroll/*` references to `/(tabs)/coach-roster` → these work via the re-export
- `components/GestureDrawer.tsx` reference to `/(tabs)/players` → already correct
- `components/AdminHomeScroll.tsx` reference to `/(tabs)/players` → already correct
- `app/(tabs)/manage.tsx` reference to `/(tabs)/players` → already correct
- `PlayerHomeScroll.tsx` reference to `/roster?teamId=` → will hit the redirect

---

## VERIFICATION

After all steps:

1. **Run `npx tsc --noEmit`** — report result
2. **List every file modified**
3. **Confirm players.tsx handles `teamId` param**
4. **Confirm redirect files work** (roster.tsx and team-roster.tsx)
5. **Confirm player tap behavior per role:**
   - Coach/Admin tap → child-detail
   - Player/Parent tap → player-card
6. **Was carousel view mode added?** (yes/no and why)
7. **players.tsx final line count**

---

## MANUAL QA

| # | Test | Expected |
|---|------|----------|
| 1 | Drawer → Coaching Tools → Roster | Opens players.tsx with all teams visible |
| 2 | Coach home → Roster card | Opens players.tsx filtered to that team |
| 3 | Team Hub → Roster Section → "View All" | Opens players.tsx filtered to that team |
| 4 | Admin → Team Health Tiles → tap team | Opens players.tsx filtered to that team |
| 5 | As coach, tap a player in grid | Navigates to child-detail (or opens expanded card with "View Full Profile") |
| 6 | As player, tap a teammate | Navigates to player-card (or opens expanded card with "View Player Card") |
| 7 | Navigate to `/roster?teamId=X` directly | Redirects to players.tsx filtered to team X |
| 8 | Navigate to `/team-roster?teamId=X` directly | Redirects to players.tsx filtered to team X |
