# COACH-HOME-D-FIXES-CHANGELOG.md
# Coach Home D System — Targeted Fixes Changelog

---

## 1. FILES CREATED

| File | Purpose |
|------|---------|
| `components/coach-scroll/TeamStatsChart.tsx` | Horizontal bar chart showing aggregated team stats (Kills, Assists, Aces, Digs, Points) with proportional bars and brand colors |

---

## 2. FILES MODIFIED

| File | Lines Changed | What Changed |
|------|--------------|-------------|
| `components/CoachHomeScroll.tsx` | Lines 55, 309-312, 445, 516-520 | Added `isGameDayHeroVisible` guard to hide DynamicMessageBar on game days; imported TeamStatsChart; added TeamStatsChart between CoachTrophyCase and AmbientCloser |
| `components/coach-scroll/GameDayHeroCard.tsx` | Lines 65-70, 169, 270-284 | Added 'Attend.' button to game-day actions array; changed volleyball emoji opacity from 0.2 to 0.15; added paddingBottom 16, paddingHorizontal 22, and borderBottomLeftRadius/borderBottomRightRadius to bottom strip |
| `components/coach-scroll/MomentumCardsRow.tsx` | Lines 6-11, 19-25, 27-75, 85-100 | Added `useRouter`, `Haptics`, `TouchableOpacity` imports; added `route` field to MomentumCard interface; assigned routes (Win Streak→/standings, Record→/standings, Attendance→/attendance, Top Kills→/game-results); wrapped each card in TouchableOpacity with haptic feedback |
| `components/coach-scroll/SquadFacesRow.tsx` | Lines 1-90, 60-75, 114-122 | Added `Image`, `useState`, `useEffect`, `supabase` imports; added Supabase query to fetch roster player photos from `team_players` joined with `players`; renders `<Image>` when photo_url exists; replaced "?" fallback with first initial of last name or user icon emoji |
| `components/coach-scroll/ActionGrid2x2.tsx` | Line 84-86 | Changed cell style from `flex: 1, minWidth: '45%'` to `width: '47%', flexGrow: 1` to force proper 2x2 grid layout |
| `components/coach-scroll/AmbientCloser.tsx` | Lines 6, 42, 57-60 | Added `Image` import; replaced paw print emoji with `SleepLynx.png` image at 44x44 with 0.5 opacity |

---

## 3. ISSUES FIXED

| Fix # | Issue | Resolution |
|-------|-------|-----------|
| Fix 1 | DynamicMessageBar redundantly showed same game-day info as hero card | Added `isGameDayHeroVisible` boolean check; bar now only renders when there's no game today |
| Fix 2A | Hero card missing location line | Already implemented — `venue_name || location` was present with correct styling |
| Fix 2B | Volleyball emoji too faded | Changed opacity from 0.2 to 0.15 |
| Fix 2C | START GAME DAY button sitting on card edge | Added paddingBottom: 16, paddingHorizontal: 22, and bottom border radius matching hero card (22) |
| Fix 2D | Only 3 action buttons for games (missing Attend) | Added 'Attend.' as 4th button navigating to `/attendance?eventId=X` |
| Fix 3 | Momentum cards not tappable | Wrapped each card in TouchableOpacity with route navigation and light haptic feedback |
| Fix 4 | Squad faces show "?" for unknown players, no photos | Added Supabase query for roster photos; renders `<Image>` for players with photo_url; falls back to first/last initial or user icon |
| Fix 5 | Action grid rendering as vertical list | Replaced `flex: 1, minWidth: '45%'` with `width: '47%', flexGrow: 1` — forces 2 cells per row |
| Fix 6 | Ambient closer using generic paw emoji | Replaced with `SleepLynx.png` mascot image at 44x44, opacity 0.5 |
| Fix 7 | No team stats visualization | Created TeamStatsChart with horizontal bars for 5 stat categories, placed after trophy case |

---

## 4. NAVIGATION TARGETS

| Tappable Element | Destination | Component |
|-----------------|-------------|-----------|
| Win Streak momentum card | `/standings` | MomentumCardsRow |
| Record momentum card | `/standings` | MomentumCardsRow |
| Attendance momentum card | `/attendance` | MomentumCardsRow |
| Top Kills momentum card | `/game-results` | MomentumCardsRow |
| Attend. action button (hero) | `/attendance?eventId=X` | GameDayHeroCard |
| Team Stats card | `/game-results` | TeamStatsChart |
| Team Stats "View All" | `/game-results` | TeamStatsChart |

All previously existing navigation targets remain unchanged.

---

## 5. DATA SOURCES

| Component | Data Source |
|-----------|-----------|
| DynamicMessageBar | `data.upcomingEvents`, `data.pendingStatsCount` (from `useCoachHomeData`) |
| GameDayHeroCard | `data.heroEvent`, `data.rsvpSummary`, `data.prepChecklist` (from `useCoachHomeData`) |
| MomentumCardsRow | `data.seasonRecord`, `data.attendanceRate`, `data.topPerformers` (from `useCoachHomeData`) |
| SquadFacesRow | `data.topPerformers` (from `useCoachHomeData`) + new Supabase query on `team_players` → `players` for photo_url |
| TeamStatsChart | `data.topPerformers` (from `useCoachHomeData`) — aggregates kills, assists, aces, digs, points |
| AmbientCloser | `data.seasonRecord`, `data.heroEvent` (from `useCoachHomeData`) |

No hooks or data files were modified.

---

## 6. REMAINING ISSUES

1. **Win Streak is still total wins, not consecutive**: MomentumCardsRow uses `seasonRecord.wins` as "streak" value. The hook doesn't provide actual consecutive win count. Fixing requires modifying `useCoachHomeData` (MUST NOT MODIFY).

2. **SquadFacesRow makes a separate query**: The new photo fetch adds one Supabase call per team switch. This is lightweight (max 8 rows) but could be batched into `useCoachHomeData` in a future iteration.

3. **No blocks stat available**: The `TopPerformer` type lacks `total_blocks`. TeamStatsChart shows Points instead of Blocks. Adding blocks requires modifying the hook.

4. **Outfit font still unavailable**: All components continue using `PlusJakartaSans_800ExtraBold` as substitute for Outfit. Visually similar.
