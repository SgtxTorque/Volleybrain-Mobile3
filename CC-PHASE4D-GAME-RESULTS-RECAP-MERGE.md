# CC-PHASE4D-GAME-RESULTS-RECAP-MERGE.md
# Lynx Mobile — Phase 4D: Game Results + Recap Merge
# EXECUTION SPEC

---

## PURPOSE

Merge game-recap into game-results as a tab/view mode, creating one unified post-game screen.

**Current state:** 2 files, 1,646 total lines
- `app/game-results.tsx` — 672 lines. Shows score, set scores, and per-player stat table. Read-only view. Takes `eventId` param. Has game picker when no eventId. White background. No outbound navigation. No share.
- `app/game-recap.tsx` — 974 lines. Shareable recap with hero card (LinearGradient), MVP/top performers, player stat bars, share button. Dark/gradient aesthetic. Takes `eventId` and `playerId` params. Includes Share API.

**Key difference:** Results = data table. Recap = shareable highlight presentation with MVP, top performers, player photos, gradient hero card.

**Target state:**
- `app/game-results.tsx` — enhanced with a tab toggle: "Stats" (existing results view) and "Recap" (recap presentation merged in)
- `app/game-recap.tsx` → redirect to game-results with recap tab active

---

## BEFORE YOU START

1. Read `CC-LYNX-RULES.md` and `CC-PROJECT-CONTEXT.md`
2. Read `CC-SHARED-SCREEN-ARCHITECTURE.md` — specifically Section 6 (GAME RESULTS & RECAP)
3. Read BOTH files completely before making any changes.

---

## RULES

1. **Modify only the files listed in this spec.**
2. **Preserve ALL features from both screens.** The stats view and recap view must both work.
3. **The default view should be "Stats"** when coming from coach/admin paths (they want to see/enter data). 
4. **The default view should be "Recap"** when coming from a recap-specific route or when a `view=recap` param is passed.
5. **Execute sequentially. Produce one report at the end.**

---

## STEP 1: Add Tab Toggle to game-results.tsx

**File:** `app/game-results.tsx`

### 1A: Add view mode state and param

Add to the params reading:
```typescript
const { eventId, view } = useLocalSearchParams<{ eventId?: string; view?: string }>();
const [activeView, setActiveView] = useState<'stats' | 'recap'>(view === 'recap' ? 'recap' : 'stats');
```

### 1B: Add tab toggle UI

Below the header (after the game info / score section), add a simple tab toggle:

```typescript
<View style={s.tabRow}>
  <TouchableOpacity
    style={[s.tab, activeView === 'stats' && s.tabActive]}
    onPress={() => setActiveView('stats')}
  >
    <Text style={[s.tabText, activeView === 'stats' && s.tabTextActive]}>Stats</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[s.tab, activeView === 'recap' && s.tabActive]}
    onPress={() => setActiveView('recap')}
  >
    <Text style={[s.tabText, activeView === 'recap' && s.tabTextActive]}>Recap</Text>
  </TouchableOpacity>
</View>
```

Style the tabs to match the existing screen aesthetic (white background, BRAND colors):
```typescript
tabRow: {
  flexDirection: 'row',
  marginHorizontal: 16,
  marginBottom: 12,
  backgroundColor: BRAND.border + '40',
  borderRadius: 10,
  padding: 3,
},
tab: {
  flex: 1,
  paddingVertical: 8,
  borderRadius: 8,
  alignItems: 'center',
},
tabActive: {
  backgroundColor: BRAND.white,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
},
tabText: {
  fontSize: 13,
  fontWeight: '600',
  color: BRAND.textMuted,
},
tabTextActive: {
  color: BRAND.textPrimary,
},
```

### 1C: Conditional rendering based on active view

Wrap the existing stats content in a view-mode check:

```typescript
{activeView === 'stats' ? (
  // ... existing game-results stat table content ...
) : (
  // ... recap content (from Step 2) ...
)}
```

---

## STEP 2: Merge Recap Content into game-results.tsx

Copy the recap rendering logic from `game-recap.tsx` into `game-results.tsx` as the "recap" view.

### What to bring over from game-recap.tsx:

1. **Imports:** `LinearGradient`, `Share`, `Image` (add only what's not already imported)

2. **Types:** `PlayerStat` (recap version), `PlayerInfo` (with photo_url, jersey_number) — merge with existing types or add alongside

3. **Data fetching:** The recap loads player stats AND player info (names, photos, jersey numbers). The stats view may already load some of this. Check for overlap:
   - If game-results.tsx already fetches `game_player_stats` and player info, reuse that data for the recap view
   - If it doesn't fetch player photos/jersey numbers, add those to the existing query

4. **Computed data from game-recap.tsx:**
   - MVP / top performers logic (lines ~207-225) — `topKills`, `topDigs`, `topAces`
   - Player stat bars with highlight flags (lines ~233-238)
   - These should be computed in a `useMemo` from the shared player stats data

5. **Recap UI rendering:** The hero card with gradient, score display, MVP section, per-player stat bars, and share button. Bring the JSX and styles over.

6. **Share function:** The `handleShare` function (line ~273-280 in game-recap.tsx) that uses React Native's `Share.share()` API.

### Important: Adapt the recap visual style

The recap in game-recap.tsx uses a dark gradient hero card with `LinearGradient`. When rendered inside game-results.tsx (which has a white background), the recap section should still use the gradient hero card — it should feel like a visually distinct "card" within the white container. Keep the dark gradient aesthetic for the recap content — it's the shareable/social-media-ready presentation.

### Share button placement

Add a share icon button in the header area (top right) that only appears when `activeView === 'recap'`:

```typescript
{activeView === 'recap' && (
  <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
    <Ionicons name="share-outline" size={22} color={BRAND.textSecondary} />
  </TouchableOpacity>
)}
```

---

## STEP 3: Handle Empty States Per View

**Stats view empty state:** If no stats entered, show "No stats recorded yet" with an explanation.

**Recap view empty state:** If no stats entered, show "No recap available — waiting for stats to be entered" (similar to current game-recap.tsx empty state at line ~321).

Both should be friendly and informative, not confusing.

---

## STEP 4: Replace game-recap.tsx with Redirect

**File:** `app/game-recap.tsx`

Replace the entire 974-line file with a redirect that preserves params and activates the recap tab:

```typescript
/**
 * game-recap.tsx — Consolidated into game-results.tsx as the "Recap" tab.
 * This file redirects for route compatibility.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function GameRecapRedirect() {
  const { eventId, playerId } = useLocalSearchParams<{ eventId?: string; playerId?: string }>();

  const params = new URLSearchParams();
  if (eventId) params.set('eventId', eventId);
  if (playerId) params.set('playerId', playerId);
  params.set('view', 'recap');  // activate recap tab
  const qs = params.toString();

  return <Redirect href={`/game-results${qs ? `?${qs}` : ''}` as any} />;
}
```

---

## STEP 5: Update External References

**File:** `app/(tabs)/gameday.tsx` — line ~793
```typescript
// BEFORE:
{ icon: 'newspaper-outline', color: BRAND.goldBrand, label: 'Recap', route: '/game-recap' }
// AFTER:
{ icon: 'newspaper-outline', color: BRAND.goldBrand, label: 'Recap', route: '/game-results?view=recap' }
```

**File:** `components/GestureDrawer.tsx` — line ~133
```typescript
// BEFORE:
{ icon: 'newspaper-outline', label: 'Game Recap', route: '/game-recap' }
// AFTER:
{ icon: 'newspaper-outline', label: 'Game Recap', route: '/game-results?view=recap' }
```

**Leave unchanged:**
- `components/GestureDrawer.tsx` line ~132 — "Game Results" already routes to `/game-results` (stats view by default)
- `components/coach-scroll/ActionItems.tsx` — already routes to `/game-results?eventId=`
- `components/coach-scroll/QuickActions.tsx` — already routes to `/game-results`

---

## VERIFICATION

After all steps:

1. **Run `npx tsc --noEmit`** — report result
2. **List every file modified**
3. **Confirm game-results.tsx has both views working** — stats tab and recap tab
4. **Confirm game-recap.tsx is now a redirect** with `view=recap` param
5. **Confirm the tab toggle** — describe the UI
6. **Confirm share button** — only visible on recap view
7. **Confirm empty states** — both views handle no-data gracefully
8. **game-results.tsx final line count**
9. **Net lines saved**

---

## MANUAL QA

| # | Test | Expected |
|---|------|----------|
| 1 | Drawer → Game Results | Lands on game-results, Stats tab active |
| 2 | Drawer → Game Recap | Redirects to game-results, Recap tab active |
| 3 | Game Day tab → Recap tool | Redirects to game-results with Recap tab |
| 4 | Coach home → "Review Stats" | Lands on game-results, Stats tab |
| 5 | Tap Stats/Recap toggle | Switches between stat table and recap presentation |
| 6 | Recap view → share button visible | Shows share icon in header |
| 7 | Stats view → no share button | Share icon hidden |
| 8 | Open game-results with no eventId | Shows game picker (existing behavior preserved) |
| 9 | Open game-results with eventId → switch to Recap | Shows recap for that specific game |
