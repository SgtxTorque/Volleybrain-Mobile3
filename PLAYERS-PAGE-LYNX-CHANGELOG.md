# Players/Roster Page — Lynx D System Treatment Changelog

**Branch:** navigation-cleanup-complete
**Date:** 2026-03-15
**Phases:** 6 commits

---

## 1. FILES MODIFIED

| File | What Changed |
|------|-------------|
| `app/(tabs)/players.tsx` | Removed Lineup view, removed glassmorphism, replaced all `colors.*` with `D_COLORS`/`BRAND` tokens, restyled filter chips (team-color active), two-icon view toggle with pill container, LayoutAnimation view transition, fixed bottom padding (100px to 24px), removed `ScrollView`/`Dimensions` imports, added `staggerIndex` to card/row render items |
| `components/PlayerCard.tsx` | Full rewrite: edge-to-edge photo as card background, dark gradient overlay bottom 40%, single position pill (top-left, team color bg + white text), jersey number in display font top-right, team-color subtle border (1.5px at 20%), press spring animation (0.97), stagger entrance (50ms per card). Removed: position pip on photo, accent line, phone icon, medical icon, registration badge, `EmergencyContactModal`, `LinearGradient` background, `useTheme`/`usePermissions` hooks, OVR badge overlay |
| `components/PlayerCardExpanded.tsx` | Replaced ALL hardcoded hex colors (~30+ instances) with `D_COLORS`/`BRAND` tokens. Converted 3 static `StyleSheet.create()` blocks into single unified `StyleSheet`. Skills default changed from 50 (grade "D") to null (0% fill, "\u2014" grade). OVR badge only shown when evaluation data exists. Info tab: "Not provided" for blank fields, phone/email tappable via `Linking`. Skill bar fill animation (500ms, staggered 80ms). Badge modal uses `BRAND.white` bg |
| `components/PlayerStatBar.tsx` | Full rewrite: white card bg + subtle border + shadow. Removed: dark gradient, side accent bar, empty stat columns (SRV/ACE/KIL), stat divider, `StatBox` sub-component, `statStyles` static sheet, `LinearGradient`, `useTheme`, `positionColors` duplicate map. New: circular photo (44px) with team-color border, initial letter fallback, info pills (position/jersey/grade), press spring (0.97), stagger entrance (40ms, slide from right) |

---

## 2. VIEWS REMOVED

- **Lineup view** (grouped-by-team ScrollView with team-color headers) — removed entirely
- `ViewMode` type changed from `'grid' | 'lineup' | 'list'` to `'grid' | 'list'`
- Toggle reduced from 3 icons (grid/people/list) to 2 (grid/list)
- All lineup rendering code, `playersByTeam`, `unassignedPlayers` logic removed

---

## 3. ELEMENTS REMOVED FROM CARD

| Element | Was | Now |
|---------|-----|-----|
| Position pip on photo (`photoPosOverlay`) | Colored circle on photo bottom-left | Removed |
| Accent line at bottom | 3px position-colored bar | Removed |
| Phone/emergency icon | Green circle with phone icon on every card | Removed (lives in expanded modal Info tab) |
| Medical alert icon | Coral circle with alert icon | Removed (lives in expanded modal Info tab) |
| Registration badge | Overlapping jersey number area | Removed (can live in expanded modal) |
| Photo border glow | Position-colored border ring around photo | Removed |
| OVR badge on card | Small badge bottom-right of photo | Removed (lives in expanded modal only) |
| EmergencyContactModal | Rendered inside each card | Removed from card component |

---

## 4. GLASSMORPHISM REMOVED

| File | Reference Removed |
|------|------------------|
| `app/(tabs)/players.tsx` | `colors.glassCard` (search box background) |
| `app/(tabs)/players.tsx` | `colors.glassBorder` (search box border) |

Replaced with: `D_COLORS.pageBg` background + `rgba(0,0,0,0.06)` border

---

## 5. HARDCODED COLORS REMOVED

| File | Count | Examples |
|------|-------|---------|
| `PlayerCardExpanded.tsx` | ~30+ | `#1a1a2e`, `#0f0f1a`, `#2a2a4a`, `#888`, `#666`, `#aaa`, `#444`, `#000`, `BRAND.white` as text color |
| `PlayerStatBar.tsx` | ~15+ | `#1C1C1E`, `#0D0D0D`, `#2C2C2E`, `#1A1A1A`, `#555`, `#EBEBF5`, `#FFFFFF`, `#4A4A4A`, `#8E8E93`, `#F3C623` |
| `PlayerCard.tsx` | ~10+ | `#64748B`, `#FFD700`, `#000`, `#fff`, `rgba(16,185,129,0.8)`, `#E5A100` |
| `players.tsx` | ~5 | `colors.primary + '20'` string concat, `colors.card`, `colors.border`, `colors.text`, `colors.warning` |

All replaced with `D_COLORS.*`, `BRAND.*`, or semantic `rgba()` patterns.

---

## 6. ANIMATIONS ADDED

| Animation | Component | Detail |
|-----------|-----------|--------|
| Press spring | `PlayerCard` | Scale 0.97 on press, spring back to 1.0 (damping 15, stiffness 300) |
| Stagger entrance | `PlayerCard` | 50ms delay per card, fade in + scale from 0.95 |
| Press spring | `PlayerStatBar` | Scale 0.97 on press, spring back to 1.0 |
| Stagger entrance | `PlayerStatBar` | 40ms delay per row, slide from right (translateX 20 to 0) + fade in |
| View toggle transition | `players.tsx` | `LayoutAnimation.easeInEaseOut` on grid/list switch |
| Skill bar fill | `PlayerCardExpanded` | 500ms fill from 0% to actual value when skills tab renders, staggered 80ms per bar |

---

## 7. NAVIGATION PRESERVED

All `router.push()` destinations unchanged:

| Target | Context |
|--------|---------|
| `/child-detail?playerId=${id}` | Expanded modal "View Player Detail" (admin/coach) |
| `/player-card?playerId=${id}` | Expanded modal "View Player Card" (player/parent) |

---

## 8. DATA QUERIES PRESERVED

All inline Supabase queries in `players.tsx` unchanged:
- `supabase.from('teams').select(...)` — teams for current season
- `supabase.from('players').select('*')` — all players for current season
- `supabase.from('team_players').select(...)` — player-team mappings

All queries in `PlayerCardExpanded.tsx` unchanged:
- `supabase.from('player_stats')` — player stats
- `supabase.from('player_skills')` — player skills (0-100)
- `supabase.from('player_skill_ratings')` — evaluation ratings
- `supabase.from('player_badges')` — player badges
- `supabase.storage.from('player-photos')` — photo upload
- `supabase.from('player_badges').insert(...)` — badge award

---

## 9. SKILLS TAB CHANGE

**Before:** Default skills = `{ passing: 50, serving: 50, hitting: 50, blocking: 50, setting: 50, defense: 50 }`.
Every unevaluated player showed six "D" grades at 50% fill. Looked broken.

**After:** Default skills = `null`. Unevaluated players show empty bars (0% fill) with "\u2014" grade and "\u2014" value. Makes it obvious the player hasn't been evaluated yet.

OVR badge only appears when evaluation data (`player_skill_ratings` or `player_skills`) actually exists.

---

## 10. EMPTY STATS

**Before:** List view (`PlayerStatBar`) showed 6 stat boxes: JRS, POS, GRD (populated) + SRV, ACE, KIL (always "--" with dimmed styling). The three stat columns were never wired to real data.

**After:** Empty stat columns removed entirely. Replaced with compact info pills showing only populated data (position, jersey #, grade). No "--" placeholders.

---

## 11. KNOWN ISSUES

- **Search bar TODO:** The search bar on AdminHomeScroll that navigates to this page is labeled "Search players, families, teams..." but only opens the players list with no search pre-populated. Needs global search design spec.
- **team_players query not season-filtered:** The `team_players` query in `players.tsx` fetches ALL team_players globally (no `.eq('season_id', ...)`). Works because players are already season-filtered, but could be optimized.
- **No custom data hook:** Queries remain inline in `players.tsx` (not extracted to a `usePlayersData` hook). Deliberate per spec — future refactor.

---

## 12. SCREENSHOTS NEEDED

- [ ] Grid view with player photos
- [ ] Grid view without photos (initial letter fallback)
- [ ] List view
- [ ] Expanded modal — Stats tab
- [ ] Expanded modal — Skills tab (with evaluation data)
- [ ] Expanded modal — Skills tab (without evaluation data — empty bars)
- [ ] Expanded modal — Info tab (with phone/email tappable)
- [ ] Filter chips — "All" active state
- [ ] Filter chips — team active state (team-color background)
- [ ] View toggle — grid active vs list active
- [ ] Empty state ("No players found")
