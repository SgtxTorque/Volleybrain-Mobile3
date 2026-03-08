# CC-TABLET-RESPONSIVE.md
# Lynx Mobile — Tablet & Responsive Layout Pass

**Priority:** HIGH — the app must work on any device in any orientation  
**Estimated time:** 6–8 hours (7 phases, commit after each)  
**Risk level:** MEDIUM — layout changes across many screens, no logic changes

---

## WHY THIS EXISTS

The app was built and tested exclusively on phone screens. When run on a tablet (Samsung Tab S8 Ultra, 14.6" screen), every screen looks wrong — tiny cards floating in huge empty space, phone-sized components that don't scale, no landscape support. 

Every screen must have TWO proper layouts: **portrait AND landscape.** Not "one is primary, the other is a fallback." A coach holding a tablet upright at the scorer's table and a coach holding it sideways on the bench are both real use cases. A parent browsing at home holds it portrait. A parent showing the team schedule to another parent turns it sideways. Both layouts must feel intentional and designed.

---

## REFERENCE FILES — READ BEFORE WRITING ANY CODE

### V0 Tablet Mockups (THE VISUAL TARGETS — read all 10 before starting):

**Landscape (tablet held sideways):**
1. `reference/design-references/v0-mockups/components/tablet/t1-game-prep.tsx`
2. `reference/design-references/v0-mockups/components/tablet/t2-live-match.tsx`
3. `reference/design-references/v0-mockups/components/tablet/t3-stat-tracking.tsx`
4. `reference/design-references/v0-mockups/components/tablet/t4-serve-tracking.tsx`
5. `reference/design-references/v0-mockups/components/tablet/t5-post-game.tsx`

**Portrait (tablet held upright):**
6. `reference/design-references/v0-mockups/components/tablet-portrait/tp1-game-prep.tsx`
7. `reference/design-references/v0-mockups/components/tablet-portrait/tp2-live-match.tsx`
8. `reference/design-references/v0-mockups/components/tablet-portrait/tp3-stat-tracking.tsx`
9. `reference/design-references/v0-mockups/components/tablet-portrait/tp4-serve-tracking.tsx`
10. `reference/design-references/v0-mockups/components/tablet-portrait/tp5-post-game.tsx`

These are Next.js/Tailwind mockups — study the VISUAL DESIGN (layout, proportions, spacing, colors, card sizes, button sizes), then translate to React Native. Do NOT copy-paste. Brand book wins if there's a conflict.

### Brand System:
11. `reference/design-references/brandbook/LynxBrandBook.html` — Brand authority
12. `theme/colors.ts` + `lib/design-tokens.ts` — App tokens

### Current App (study before modifying):
13. `components/ParentHomeScroll.tsx` — Gold standard for scroll architecture
14. `components/CoachHomeScroll.tsx` — Coach layout patterns
15. `app/game-day-command.tsx` + `components/gameday/` — Current Command Center code to adapt

Design for these breakpoints:

| Device | Width (portrait) | Width (landscape) | Category |
|--------|-----------------|-------------------|----------|
| Phone (small) | 320-375px | 568-667px | `phone` |
| Phone (large) | 376-430px | 668-932px | `phone` |
| Tablet (small, e.g. iPad Mini) | 744px | 1133px | `tablet` |
| Tablet (standard, e.g. iPad) | 810-834px | 1080-1194px | `tablet` |
| Tablet (large, e.g. Tab S8 Ultra) | 960px+ | 1848px+ | `tablet-xl` |

---

## PHASE 1: BUILD THE RESPONSIVE FOUNDATION

### 1A. Create `lib/responsive.ts`

A single utility file that every screen imports:

```typescript
import { useWindowDimensions, Platform } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  
  const isLandscape = width > height;
  const isPhone = width < 744;
  const isTablet = width >= 744 && width < 960;
  const isTabletXL = width >= 960;
  const isTabletAny = width >= 744;
  
  // Scaling factor: 1.0 on phone, scales up on tablet
  const scale = isPhone ? 1 : isTablet ? 1.3 : 1.5;
  
  // Content max-width: on large tablets, content shouldn't stretch edge-to-edge
  // Center it like a web page
  const contentMaxWidth = isTabletXL ? 1200 : isTablet ? 900 : width;
  const contentPadding = isTabletAny ? 32 : 16;
  
  // Grid columns: how many cards fit side by side
  const gridColumns = isPhone ? 1 : isTablet ? 2 : 3;
  const cardGridColumns = isPhone ? 2 : isTablet ? 3 : 4;
  
  // Font scaling
  const fontScale = isPhone ? 1 : isTablet ? 1.15 : 1.25;
  
  // Touch target minimum
  const minTouchTarget = isPhone ? 44 : 48;
  
  return {
    width, height, isLandscape, isPhone, isTablet, isTabletXL, isTabletAny,
    scale, contentMaxWidth, contentPadding, gridColumns, cardGridColumns,
    fontScale, minTouchTarget,
  };
}

// Helper: wrap content in a centered container on tablets
export function tabletContainer(isTabletAny: boolean, contentMaxWidth: number) {
  if (!isTabletAny) return {};
  return {
    maxWidth: contentMaxWidth,
    alignSelf: 'center' as const,
    width: '100%' as const,
    paddingHorizontal: 32,
  };
}
```

### 1B. Create `lib/orientation.ts`

Screen orientation management:

```typescript
import * as ScreenOrientation from 'expo-screen-orientation';

// Lock to portrait by default
export async function lockPortrait() {
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
}

// Unlock all orientations (for Game Day Command Center)
export async function unlockOrientation() {
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL);
}

// Lock to landscape (optional, for specific views)
export async function lockLandscape() {
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
}
```

### 1C. Set default orientation

In the app's root layout (`app/_layout.tsx`):
- On phone: lock to portrait (most phone users don't want rotation)
- On tablet: allow all orientations (tablets are used in both)

```typescript
useEffect(() => {
  const { width } = Dimensions.get('window');
  if (width >= 744) {
    unlockOrientation();
  } else {
    lockPortrait();
  }
}, []);
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: responsive foundation - useResponsive hook, orientation management, breakpoints"
git push
```

---

## PHASE 2: GAME DAY COMMAND CENTER — TABLET LAYOUT

This is the #1 priority. The Command Center MUST feel native on a tablet held sideways at the sideline.

### 2A. Game Prep (Screen 1) — Both Orientations

**READ THE MOCKUPS FIRST:**
- Landscape: `reference/design-references/v0-mockups/components/tablet/t1-game-prep.tsx`
- Portrait: `reference/design-references/v0-mockups/components/tablet-portrait/tp1-game-prep.tsx`

These mockups are the VISUAL TARGET. Study the layout, spacing, player card sizing, role badge colors, court proportions, and three-column structure. Translate to React Native — do NOT copy-paste the Tailwind/JSX.

**Landscape:** Three-column (formation/rotation sidebar | court with player photo cards | bench + sub pairs). Court fills center ~60%.

**Portrait:** Controls as compact top bar, court fills middle ~55%, bench section scrollable below court.

Both orientations must use the same data and components — only the layout wrapper changes based on `isLandscape` from `useResponsive()`.

### 2B. Live Match (Screen 2) — Both Orientations

**READ THE MOCKUPS FIRST:**
- Landscape: `reference/design-references/v0-mockups/components/tablet/t2-live-match.tsx`
- Portrait: `reference/design-references/v0-mockups/components/tablet-portrait/tp2-live-match.tsx`

**Landscape:** Court + controls left ~60%, subs/alerts right ~40%, scoreboard bottom bar always visible. Large +/- score buttons (≥64px).

**Portrait:** Court top ~35%, subs compact grid middle, scoreboard bottom always visible. Score buttons same ≥64px size.

The scoreboard must NEVER scroll off screen in either orientation. Use a fixed bottom bar.

### 2C. Stat Tracking (Tier 2) — Both Orientations

**READ THE MOCKUPS FIRST:**
- Landscape: `reference/design-references/v0-mockups/components/tablet/t3-stat-tracking.tsx`
- Portrait: `reference/design-references/v0-mockups/components/tablet-portrait/tp3-stat-tracking.tsx`

**Landscape:** Mini court left ~40%, stat tracking grid right ~60% with pass/hit/set/point columns per player.

**Portrait:** Mini court top ~25%, stat tracking panel below as scrollable section.

Buttons must be ≥44px for quick tapping during live play.

### 2D. Serve Tracking — Both Orientations

**READ THE MOCKUPS FIRST:**
- Landscape: `reference/design-references/v0-mockups/components/tablet/t4-serve-tracking.tsx`
- Portrait: `reference/design-references/v0-mockups/components/tablet-portrait/tp4-serve-tracking.tsx`

**Landscape:** Server info left ~30% (photo, jersey, serve stats), opponent court tap-map right ~70%.

**Portrait:** Server info top, court tap-map fills width below.

This is an overlay/modal on top of the Live Match screen.

### 2E. Post-Game Summary — Both Orientations

**READ THE MOCKUPS FIRST:**
- Landscape: `reference/design-references/v0-mockups/components/tablet/t5-post-game.tsx`
- Portrait: `reference/design-references/v0-mockups/components/tablet-portrait/tp5-post-game.tsx`

**Landscape:** Result hero left ~40%, stats/performers right ~60%.

**Portrait:** Result hero top, stats below as scrollable content.

### 2F. Orientation support for Command Center

Both orientations must work and feel intentional. The layout responds to rotation in real-time:

```typescript
const { isLandscape, isTabletAny } = useResponsive();

// In the render:
{isLandscape ? <GamePrepLandscape {...props} /> : <GamePrepPortrait {...props} />}
```

The underlying components (PlayerCard on court, bench list, sub pair cards, scoreboard) are shared — only the layout wrapper changes. Extract shared pieces into small components so landscape and portrait layouts compose them differently without duplicating logic.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: Game Day Command Center tablet layouts - game prep, live match, serve tracking, rally stats"
git push
```

---

## PHASE 3: HOME SCROLL DASHBOARDS — TABLET LAYOUT

The home scroll dashboards (Parent, Coach, Admin, Player) are the most-seen screens. On tablet, they should use the extra space intelligently — not just stretch phone cards to full width.

### 3A. General approach for all home scrolls

Import `useResponsive()` and apply:

**Content centering:**
```typescript
const { isTabletAny, contentMaxWidth, contentPadding } = useResponsive();

<ScrollView>
  <View style={[
    styles.content,
    isTabletAny && { maxWidth: contentMaxWidth, alignSelf: 'center', paddingHorizontal: contentPadding }
  ]}>
    {/* cards */}
  </View>
</ScrollView>
```

On the Tab S8 Ultra (1848px landscape), content should NOT stretch edge-to-edge. Center it at ~1200px max width with padding. This keeps cards at readable widths and prevents the "everything is too wide" problem.

**Card grids:**
- Stat cards (6-1, $210, Level 10, Team Chat) → 2 columns on phone, 4 columns on tablet
- Event cards → single column on phone, 2 columns on tablet (side by side)
- Action rows (Send Blast, Give Shoutout, etc.) → full width on phone, 2 columns on tablet

**Hero / welcome area:**
- Mascot + greeting: centered, scale mascot image up slightly (150px instead of 120px on tablet)
- Day strip calendar: same width as content area, dates slightly larger

### 3B. Coach Home Scroll specific

`components/CoachHomeScroll.tsx`:
- Welcome area with mascot: centered within `contentMaxWidth`
- The "Black Hornets Elite" team pill, action items, scouting section: respect max width
- Team Health card: wider on tablet, the player dots can be larger
- Roster card: on tablet, show more player info (mini avatars instead of just count)
- Season stats (Kills, Aces power bars): these look great already — just ensure they're within max width
- Coach tools (Send Blast, Give Shoutout, etc.): 2-column grid on tablet

### 3C. Parent Home Scroll specific

`components/ParentHomeScroll.tsx`:
- Registration cards ("8 Open Registrations"): on tablet, these can sit side-by-side instead of stacked
- Player carousel: cards slightly larger on tablet
- Quick glance stats (6-1, $210): 4-column grid on tablet
- Event hero card: respects max width, doesn't stretch to 1848px

### 3D. Admin Home Scroll specific

`components/AdminHomeScroll.tsx`:
- Admin cards can use 2-3 column grid on tablet
- The admin experience should feel most like a dashboard on tablet — take advantage of the space

### 3E. Player Home Scroll specific

If `components/PlayerHomeScroll.tsx` exists:
- Trading card: centered and properly sized (not tiny in the middle of a huge screen)
- Team pulse / activity feed: within max width

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: home scroll dashboards tablet adaptation - content centering, card grids, responsive spacing"
git push
```

---

## PHASE 4: PLAYER CARD + ROSTER — TABLET LAYOUT

### 4A. Player Trading Card (`app/player-card.tsx`)

On tablet, the card currently floats as a small phone-sized card in the center of a huge dark screen.

Fix: The card should scale relative to the screen, not be a fixed phone width.

```typescript
const { isTabletAny, width, height } = useResponsive();

const cardWidth = isTabletAny 
  ? Math.min(width * 0.5, 500)  // 50% of screen width, max 500px
  : width - 32;                  // phone: full width minus padding

const cardHeight = isTabletAny
  ? Math.min(height * 0.85, 800) // 85% of screen height, max 800px  
  : undefined;                    // phone: auto height
```

On tablet: the card is a centered, properly sized trading card — not tiny, not stretched. Think of it like holding a physical trading card at arm's length. The dark background surrounds it like a display case.

### 4B. Roster Carousel (`app/roster.tsx`)

On tablet:
- The swipeable cards should be larger (300-350px wide instead of phone-sized)
- The team header text scales up
- In landscape: show 2-3 cards visible at once (partial previews on edges)
- Card photos should be actual photos (not tiny circles)

### 4C. Compact PlayerCard in lists

`components/PlayerCard.tsx` in list views:
- On tablet: the compact card can be slightly taller (88px instead of 72px) with larger photo and text
- In grid layouts (like the old roster grid): use `cardGridColumns` from `useResponsive()` — 3 columns on small tablet, 4 on large tablet

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: player card and roster tablet scaling"
git push
```

---

## PHASE 5: TAB SCREENS — TABLET LAYOUT

### 5A. Schedule

`app/(tabs)/*-schedule.tsx`:
- Day strip: dates can be slightly larger on tablet, more spacing
- Event cards: 2-column grid on tablet landscape, 1 column in portrait
- Content centered within max width

### 5B. Chat

`app/(tabs)/*-chat.tsx`:
- Channel list: on tablet, each channel row can show more info (last message preview, member count)
- On tablet landscape: consider a split view (channel list left, chat thread right) — BUT only do this if it's simple. Otherwise just center the content.

### 5C. Team Hub

`app/(tabs)/*-team-hub.tsx`:
- Hero photo: full width is fine (it's a photo, looks good big)
- Feed content below: centered within max width
- Post cards: max width, not stretched to 1848px
- Gallery grid: 4-5 columns on tablet instead of 3

### 5D. My Stuff / More / Manage

Settings-style screens:
- Grouped rows: centered within max width
- On large tablets, the settings list looks better at ~600-700px max width (like iOS Settings on iPad)

### 5E. Game Day Tab

`app/(tabs)/gameday.tsx`:
- Hero card: centered, respects max width
- Event cards in "THIS WEEK": 2-column on tablet
- Season Progress, Standings tiles, Coach Tools: responsive grid
- "Live Command" button: large and prominent on tablet

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: tab screens tablet adaptation - schedule, chat, team hub, settings, game day"
git push
```

---

## PHASE 6: BOTTOM NAV + NAVIGATION — TABLET

### 6A. Bottom tab bar

On the Tab S8 Ultra, the bottom nav icons are spaced absurdly far apart (1848px wide with 4 icons). Fix:

```typescript
// In the tab bar layout, center the tabs with a max width
const tabBarStyle = isTabletAny ? {
  maxWidth: 600,
  alignSelf: 'center',
  width: '100%',
} : {};
```

Or: on tablet, consider moving to a sidebar navigation (like iPad apps). But this is a bigger change — for now, just center the bottom tabs.

### 6B. Gesture drawer

The gesture drawer / More menu on tablet:
- Should be wider (350-400px instead of phone-width)
- Content should scale: larger profile card, larger menu items
- On tablet landscape, the drawer doesn't need to cover the full screen

### 6C. Modals and Bottom Sheets

Any modal or bottom sheet:
- On tablet: center the modal with a max width (500-600px), don't stretch to full screen width
- The modal should have proper shadows and backdrop
- Bottom sheets: on tablet, they can be wider but still shouldn't be full width

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 6: bottom nav centering, gesture drawer, modals - tablet adaptation"
git push
```

---

## PHASE 7: VERIFY ON MULTIPLE SIZES

```bash
# 1. TypeScript clean
npx tsc --noEmit 2>&1 | grep -v "reference\|design-reference" | tail -10

# 2. useResponsive is imported across key files
grep -rn "useResponsive" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "node_modules" | grep -v "reference/" | wc -l
# Expected: 15+ files using it

# 3. contentMaxWidth is being applied
grep -rn "contentMaxWidth\|maxWidth.*1200\|maxWidth.*900" --include="*.tsx" app/ components/ | grep -v "node_modules" | grep -v "reference/" | wc -l
# Expected: multiple files

# 4. Orientation management exists
grep -rn "ScreenOrientation\|lockPortrait\|unlockOrientation" --include="*.tsx" --include="*.ts" app/ lib/ | grep -v "node_modules" | wc -l
# Expected: at least 3 (root layout + game day command + lib)

# 5. Game Day Command Center has tablet layout
grep -rn "isTablet\|isLandscape\|isPhone" --include="*.tsx" app/game-day-command.tsx components/gameday/ | wc -l
# Expected: many (responsive conditionals throughout)

# 6. No hardcoded phone-only widths in key screens
grep -rn "width.*375\|width.*390\|width.*414\|maxWidth.*430" --include="*.tsx" app/ components/ | grep -v "node_modules" | grep -v "reference/" | wc -l
# Expected: 0 (no phone-specific hardcoded widths)

git add -A
git commit -m "Phase 7: tablet responsive verification"
git push
```

---

## TESTING CHECKLIST (for Carlos on Tab S8 Ultra)

After CC completes this spec, test these on your tablet:

**Portrait:**
- [ ] Coach home scroll: content centered, not stretched edge-to-edge
- [ ] Stat cards in 4-column grid
- [ ] Player card: properly sized, not tiny
- [ ] Bottom nav: icons centered, not spread across 14.6"

**Landscape:**
- [ ] Game Day Command Center: court fills center, bench on right, controls on left
- [ ] Live Match: court large, score prominent, subs visible
- [ ] Serve tracking: court map fills good portion of screen
- [ ] Home scroll: content centered with max width

**Both orientations:**
- [ ] Modals/sheets: centered with max width, not full screen
- [ ] Text readable: not too small, not too large
- [ ] Tap targets: comfortable size for finger input

---

## EXPECTED RESULTS

1. **`lib/responsive.ts`** — Central responsive utility with breakpoints, scaling, max widths
2. **`lib/orientation.ts`** — Screen orientation management
3. **Game Day Command Center** — Full tablet landscape layout with large court, sidebars, big score buttons
4. **Home scrolls** — Content centered within max width on tablet, card grids adapt
5. **Player card** — Scales appropriately, not a tiny card on huge screen
6. **All tab screens** — Content centered, responsive grids
7. **Bottom nav** — Centered on tablet, not stretched
8. **Modals/sheets** — Centered with max width on tablet
9. **Landscape support** — Unlocked on tablets, Command Center optimized for landscape
10. **7 commits** — one per phase, each pushed
