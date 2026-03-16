# CC-ADMIN-HOME-DPLUS-FIXES.md
# Lynx Mobile — Admin Home D+ Targeted Fixes
# Based on Carlos's feedback after reviewing the D+ execution
# Branch: navigation-cleanup-complete

**Priority:** HIGH — Fix issues before moving to Player
**Estimated time:** 2-3 hours (6 targeted fixes, commit after each)
**Risk level:** LOW — Surgical changes to existing D+ components

---

## PREREQUISITE READING

1. Read CC-LYNX-RULES.md
2. Read AGENTS.md — "Keep edits minimal and localized"
3. Read ADMIN-HOME-DPLUS-CHANGELOG.md — understand what was built
4. Read theme/d-system.ts — existing D System tokens

---

## FILE SCOPE — HARD BOUNDARIES

### FILES YOU MAY MODIFY:
- `components/admin-scroll/AdminTeamHealthCards.tsx` — Rework to adaptive sizing
- `components/admin-scroll/MissionControlHero.tsx` — Minor adjustments if needed
- `components/admin-scroll/OrgPulseFeed.tsx` — Add spacing adjustments if needed
- `components/admin-scroll/AdminAmbientCloser.tsx` — Adjustments if needed
- `components/AdminHomeScroll.tsx` — Add new sections to scroll order
- `theme/d-system.ts` — ONLY to ADD new tokens

### FILES YOU MAY CREATE:
- `components/admin-scroll/OrgHealthChart.tsx` — New org-level stats bar chart
- `components/admin-scroll/CompactTeamCard.tsx` — New compact team card for horizontal scroll

### FILES YOU MUST NOT MODIFY:
- Everything on the original MUST NOT MODIFY list still applies
- `hooks/useAdminHomeData.ts` — Data hook, do not touch
- ALL coach, parent, player files
- ALL shared components (TrophyCaseWidget, TeamPulse, DayStripCalendar)
- ALL files in app/ — no route or layout changes

### CRITICAL RULES:
1. **NO DOMINOES** — Don't delete files.
2. **ALL HOOKS ABOVE EARLY RETURNS** — No exceptions.
3. **NO SIDE-BORDER ACCENT CARDS** — Full tinted backgrounds only.
4. **HORIZONTAL SCROLL PADDING** — paddingVertical: 8 in contentContainerStyle.
5. **PRESERVE ALL NAVIGATION** — Same router.push() targets.
6. **PRESERVE ALL DATA** — useAdminHomeData unchanged.

---

## FIX 1: ADAPTIVE TEAM HEALTH CARDS

**Files:** Modify `AdminTeamHealthCards.tsx` OR create `CompactTeamCard.tsx` + modify `AdminTeamHealthCards.tsx`

The current vertical stack of full-width editorial team cards is too tall for orgs with many teams. Implement adaptive rendering based on team count:

### 1A. Small org (1-3 teams): Full editorial cards

Keep the current alternating dark/light cards. They fit without overwhelming the scroll. No change needed for this case.

### 1B. Medium org (4-6 teams): Compact horizontal scroll

Create `components/admin-scroll/CompactTeamCard.tsx`:

**Layout:** Each card is ~200px wide, borderRadius 16, padding 14:
- Background: alternating — first card dark navy gradient, second white with border, etc.
- Team name: Outfit/ExtraBold 14px (white on dark, navy on light)
- Stats row: Roster fill as compact bar (e.g., "8/12" with a small progress bar), Record ("4-1"), Unpaid count
- Status dot: top-right corner (green/amber/red based on paymentStatus)
- Each stat: 12px weight 700 for number, 8px uppercase for label
- Tappable → same navigation as full cards

In `AdminTeamHealthCards.tsx`: add logic:
```typescript
const teamCount = teams.length;

if (teamCount <= 3) {
  // Render full editorial cards (existing vertical stack)
} else {
  // Render horizontal scroll of CompactTeamCards
}
```

Horizontal scroll settings:
- `horizontal={true}`
- `showsHorizontalScrollIndicator={false}`
- `snapToInterval={212}` (card width 200 + gap 12)
- `decelerationRate="fast"`
- `contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8 }}`

### 1C. Large org (7+ teams): Same horizontal scroll + "See All" link

Same compact horizontal scroll as medium, but add a "See All Teams →" text link below the scroll row. Tapping navigates to a full team list screen (use the same route as the current team management destination).

```bash
npx tsc --noEmit
git add -A && git commit -m "fix: adaptive team health cards — full for 1-3, compact horizontal for 4+, See All for 7+" && git push
```

---

## FIX 2: ORG HEALTH BAR CHART

**File:** Create `components/admin-scroll/OrgHealthChart.tsx` AND modify `components/AdminHomeScroll.tsx`

Add an org-level stats bar chart between the team cards section and the Org Pulse feed.

### 2A. Build OrgHealthChart component

**Layout:** White card with borderRadius 18, padding 18:
- Section header: "ORG HEALTH" in Outfit 13px weight 800 uppercase + "View All" link on right
- 4-5 horizontal bar rows showing org-wide metrics:

Each bar row:
- Label on left (12px, weight 600, textPrimary)
- Horizontal bar in middle (10px height, borderRadius 5, gray track with colored fill)
- Value on right (14px, weight 800, textPrimary)

Bars should be proportional (highest value = full width, others scaled relative).

**Stats to show (use whatever data is available from useAdminHomeData):**
- Roster Fill: total players / total max capacity across all teams. Color: sky (#4BB9EC)
- Payments Collected: collected / expected as count or percentage. Color: green (#22C55E)
- Overdue: overdue count. Color: coral (#FF6B6B)
- Registrations: pending registration count. Color: purple (#8B5CF6)
- Teams Active: team count (just a number, bar shows count relative to some max like 20). Color: amber (#F59E0B)

If a stat has no data (0 or unavailable), skip that row. Don't show empty bars.

**Animation:** Bar fill from 0 to actual width over 600ms with easeOut, staggered 100ms apart. All hooks above early returns. Use useSharedValue for each bar width.

**Tappable:** Whole card navigates to reports screen on tap.

### 2B. Update AdminHomeScroll render

Add OrgHealthChart between AdminTeamHealthCards and AdminActionPills in the scroll order.

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: org health bar chart — roster fill, payments, overdue, registrations with animated bars" && git push
```

---

## FIX 3: SEARCH BAR — ADD PLACEHOLDER NOTE

**File:** `components/AdminHomeScroll.tsx`

The search bar currently navigates to the BH Stingers player roster. This is wrong — it should be a global search. BUT we haven't designed global search yet, so for now:

- Keep the search bar visually as-is
- Change the onPress to navigate to a more general destination — if there's a players list that shows ALL players across teams, use that route. If not, keep the current route but this is a KNOWN ISSUE.
- Add a code comment: `// TODO: Wire to global search (players, families, teams, coaches) — needs design spec`

This is NOT a full fix. It's a placeholder acknowledgment. Real search is a future feature.

```bash
npx tsc --noEmit
git add -A && git commit -m "fix: search bar TODO comment — global search needs design spec" && git push
```

---

## FIX 4: SEASON SELECTOR — ADD "ALL ORG" NOTE

**File:** This is a KNOWN ISSUE that requires changes to `components/SeasonSelector.tsx` and possibly `hooks/useAdminHomeData.ts` — both of which may be shared or outside our scope.

DO NOT modify any files for this fix. Instead:

Create a comment block at the top of `components/AdminHomeScroll.tsx` (inside the component, before the return):

```typescript
// KNOWN ISSUE: Season selector defaults to active season and only shows seasons.
// Admin home should default to "All Org" view (no season filter) with seasons as drill-down.
// This requires:
// 1. SeasonSelector to include an "All" option
// 2. useAdminHomeData to support a null/undefined season (meaning "show everything")
// 3. The hero stats grid to aggregate across all seasons when no filter is applied
// Tracked for future sprint — season model flexibility spec needed.
```

```bash
npx tsc --noEmit
git add -A && git commit -m "docs: season selector All Org known issue — needs design + data hook changes" && git push
```

---

## FIX 5: MICRO-ANIMATIONS

**Files:** Multiple admin-scroll components

### 5A. MissionControlHero.tsx
- Mascot breathing: should already exist from Phase 1. Verify it's working.
- Stats grid numbers: count-up animation from 0 to actual value over 600ms on mount. Use useSharedValue per number. Display Math.round() of current value. Stagger 100ms between cells.

### 5B. AdminAttentionStrip.tsx
- Expand/collapse: animated height transition (use LayoutAnimation or Reanimated)
- Items inside stagger-fade when expanding (60ms apart)

### 5C. AdminFinancialChart.tsx
- Progress bar fill: 0% to actual over 800ms with easeOut on mount
- Amount numbers: fade in after bar fill completes

### 5D. AdminTeamHealthCards.tsx (and CompactTeamCard.tsx)
- Full cards: stagger entrance, each card slides up 15px + fades in, 100ms apart
- Compact cards: stagger pop-in with spring, 80ms apart

### 5E. OrgHealthChart.tsx
- Bar fills: stagger 100ms apart, each bar fills from 0 over 600ms (already specified in Fix 2)

### 5F. AdminActionPills.tsx
- Press spring: scale 0.95 on press, spring back to 1.0 on release

### 5G. OrgPulseFeed.tsx
- Staggered fade-in: each item 60ms apart, first 5 only

### 5H. AdminTrophyBar.tsx
- Badge pop-in: spring scale from 0.8 to 1.0, staggered 50ms
- XP bar fill: 0% to actual over 800ms

### 5I. AdminAmbientCloser.tsx
- Mascot sway: rotate -2deg ↔ 2deg, 4-second loop

**ALL animation rules:**
- Use react-native-reanimated only
- All loop animations have cancelAnimation cleanup in useEffect return
- All hooks above early returns
- Entrance animations fire once on mount (use hasAnimated ref if needed)

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: admin micro-animations — count-up stats, bar fills, stagger entrances, press springs, mascot sway" && git push
```

---

## FIX 6: CHANGELOG

Generate `ADMIN-HOME-DPLUS-FIXES-CHANGELOG.md` in the repo root:

1. FILES CREATED — new files with purpose
2. FILES MODIFIED — each file with what changed
3. ISSUES FIXED — map each fix to what was resolved
4. KNOWN ISSUES — search bar (needs global search design), season selector (needs "All Org" default)
5. ANIMATIONS ADDED — list every animation
6. ADAPTIVE LOGIC — document the team card thresholds (1-3 full, 4-6 compact, 7+ compact + See All)
7. HOOKS PLACEMENT — confirm all above early returns
8. SHARED COMPONENTS — confirm none modified

```bash
git add -A && git commit -m "docs: Admin Home D+ fixes changelog" && git push
```

---

## EXPECTED RESULTS

1. **Adaptive team cards** — 1-3 teams get full editorial cards, 4+ get compact horizontal scroll, 7+ get See All link
2. **Org health bar chart** — animated bars for roster fill, payments, overdue, registrations
3. **Search bar** — acknowledged as TODO, comment in code
4. **Season selector** — acknowledged as known issue, comment in code
5. **Full micro-animations** — count-up stats, bar fills, stagger entrances, press springs, mascot sway
6. **Changelog** documenting everything
7. **No shared components modified**
8. **All hooks above early returns**
