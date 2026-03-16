# CC-PLAYER-HOME-DPLUS-FIXES.md
# Lynx Mobile — Player Home D+ Targeted Fixes
# Based on Carlos's feedback after reviewing the D+ execution
# Branch: navigation-cleanup-complete

**Priority:** HIGH — Player experience polish
**Estimated time:** 3-4 hours (10 targeted fixes, commit after each)
**Risk level:** LOW — Surgical changes to existing D+ components

---

## PREREQUISITE READING

1. Read CC-LYNX-RULES.md
2. Read AGENTS.md
3. Read PLAYER-HOME-DPLUS-CHANGELOG.md
4. Read theme/player-theme.ts and theme/d-system.ts
5. Read hooks/usePlayerHomeData.ts — understand what data is available (especially: attendanceStreak, challengesAvailable, bestRank, personalBest, recentShoutouts, badges, teams)

---

## FILE SCOPE — HARD BOUNDARIES

### FILES YOU MAY MODIFY:
- `components/player-scroll/PlayerIdentityHero.tsx` — Mascot position, competitive nudge
- `components/player-scroll/PlayerDailyQuests.tsx` — Minor adjustments
- `components/player-scroll/PlayerLeaderboardPreview.tsx` — Competitive nudge integration
- `components/player-scroll/PlayerMomentumRow.tsx` — Add streak card
- `components/player-scroll/PlayerTrophyCase.tsx` — Animations
- `components/player-scroll/PlayerTeamActivity.tsx` — Animations
- `components/player-scroll/PlayerAmbientCloser.tsx` — Animations
- `components/player-scroll/PlayerContinueTraining.tsx` — Animations
- `components/player-scroll/NextUpCard.tsx` — Animations
- `components/player-scroll/LastGameStats.tsx` — Animations
- `components/PlayerHomeScroll.tsx` — Add new sections to scroll order, scroll-triggered animation system

### FILES YOU MAY CREATE:
- `components/player-scroll/PlayerChallengeCard.tsx` — Active challenge progress
- `components/player-scroll/PlayerTeamHubCard.tsx` — Team Hub entry point
- `components/player-scroll/PlayerQuickLinks.tsx` — My Card, Teammates, Stats entry points
- `components/player-scroll/CompetitiveNudge.tsx` — "3 more aces to take #7" bar

### FILES YOU MUST NOT MODIFY:
- ALL other role files, ALL shared components, ALL hooks, ALL app/ files
- `components/PlayerTradingCard.tsx`
- `theme/colors.ts`
- Everything else on previous MUST NOT MODIFY lists

### CRITICAL RULES:
1. ALL hooks above early returns
2. NO hardcoded hex colors — use PLAYER_THEME or D_COLORS
3. PLAYER_THEME re-export must stay in PlayerHomeScroll.tsx
4. Preserve level-up and streak celebration modals
5. Preserve all navigation targets

---

## FIX 1: MASCOT POSITION IN HERO

**File:** `components/player-scroll/PlayerIdentityHero.tsx`

The mascot image is positioned too low and gets cut off by the XP bar area.

- Move the mascot UP within the hero card — it should sit in the right portion of the card, vertically centered with the greeting text and player info, NOT overlapping or below the XP bar
- If using absolute positioning, adjust the `top` value so the mascot is fully visible
- If using flexbox, ensure the mascot is in the same row as the greeting/info content
- Mascot size stays at 70-80px

```bash
npx tsc --noEmit
git add -A && git commit -m "fix: mascot positioned higher in player hero — no longer cut off by XP bar" && git push
```

---

## FIX 2: COMPETITIVE NUDGE REPLACES STATIC PERSONAL BEST

**File:** Create `components/player-scroll/CompetitiveNudge.tsx` AND modify `PlayerHomeScroll.tsx`

Replace the disconnected "#1 in assists this season" text with a dynamic competitive nudge that drives action.

**Layout:** Compact bar below the hero, full width:
- Background: PLAYER_THEME.cardBg with subtle sky-blue left accent glow (NOT a side border — a soft gradient glow)
- Content: emoji + competitive message + arrow →
- Tappable → navigates to leaderboard

**Message logic (priority order):**
1. If player is close to passing someone on leaderboard: "3 more aces to take the #7 spot 🎯"
2. If player is #1 in any stat: "You're #1 in assists this season! 👑 Keep it up"
3. If player has a personal best from last game: "New personal best: 22 assists! 🔥"
4. If player is close to leveling up: "125 XP to Level 2. One good game could do it ⚡"
5. If active challenge exists: "{remaining} more to complete {challengeName} 🎯"
6. Default: "Check where you rank on the team 🏆"

**Data:** Use bestRank, personalBest, xpToNext, challengesAvailable from usePlayerHomeData. If bestRank has proximity data (how close to next rank), use it. If not, fall back to the simpler messages.

Place this immediately below the hero card in the scroll.

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: competitive nudge bar — dynamic action-driving messages below hero" && git push
```

---

## FIX 3: STREAK CARD IN MOMENTUM ROW

**File:** `components/player-scroll/PlayerMomentumRow.tsx`

The momentum cards show Kills, Level, Games — but no streak card. Add it.

- Add a streak card (amber/coral gradient) showing data.attendanceStreak
- Emoji: 🔥
- Label: "STREAK"
- Only show if attendanceStreak > 0
- Position it as the FIRST card in the row (streak is the most motivating)

Card order: Streak (if > 0), Kills, Level, Games

```bash
npx tsc --noEmit
git add -A && git commit -m "fix: add streak card to momentum row — fire emoji with attendance streak" && git push
```

---

## FIX 4: ACTIVE CHALLENGE CARD

**File:** Create `components/player-scroll/PlayerChallengeCard.tsx` AND modify `PlayerHomeScroll.tsx`

The old ActiveChallengeCard was removed but nothing replaced it. Coaches create challenges and players need to see their progress.

**Layout:** Dark card (PLAYER_THEME.cardBg), borderRadius 18:
- Header row: "⚡ ACTIVE CHALLENGE" label (gold) + time remaining on right ("1d left" or "3d left")
- Challenge name: Outfit/ExtraBold 16px, white ("ACE HUNTER")
- Progress bar: 8px height, sky-blue fill, gray track
- Progress text: "0/10" on left, "+75 XP" on right (gold)
- Tappable → navigate to challenge detail screen

**Data:** Use data.challengesAvailable to check if challenges exist. If the data hook doesn't provide challenge details, check if the old ActiveChallengeCard component (components/player-scroll/ActiveChallengeCard.tsx) has its own data fetching — if so, reuse that pattern.

If no active challenge: don't render (return null). Don't show empty state for challenges on the home scroll.

Place this between the daily quests and the leaderboard preview.

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: active challenge card with progress bar and XP reward" && git push
```

---

## FIX 5: QUICK LINKS (MY CARD, TEAMMATES, STATS)

**File:** Create `components/player-scroll/PlayerQuickLinks.tsx` AND modify `PlayerHomeScroll.tsx`

Players need a way to access their own player card, view teammates, and check stats/evaluations.

**Layout:** Horizontal row of 3 compact pill buttons:
- "My Card 🃏" → navigates to player-card screen
- "Teammates 👥" → navigates to roster screen with team filter
- "My Stats 📊" → navigates to stats/evaluation screen

Each pill: PLAYER_THEME.cardBg background, borderRadius 20, paddingHorizontal 16, paddingVertical 10, white text 12px weight 700. Emoji on left.

Press animation: scale 0.95 with spring back.

Place this below the competitive nudge, above the daily quests.

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: quick links — My Card, Teammates, My Stats pill buttons" && git push
```

---

## FIX 6: TEAM HUB ENTRY POINT

**File:** Create `components/player-scroll/PlayerTeamHubCard.tsx` AND modify `PlayerHomeScroll.tsx`

Players need a way to access the Team Hub — see team posts, photos, announcements.

**Layout:** Dark card matching PLAYER_THEME, borderRadius 18:
- Team color accent on left edge (subtle glow, NOT a stripe)
- Team name: "Black Hornets Elite" (Outfit 14px, weight 800, white)
- "Team Hub" label (12px, white at 50%)
- Notification pill (red, pulsing) if there are unread posts
- Arrow → on right
- Tappable → navigate to team hub

**Data:** data.primaryTeam for team name and color. Check for unread posts if that data is available (if not, show a static "New" pill or no pill).

**Animation:** Notification pill pulses (scale 1.0 → 1.15 → 1.0, 2-second loop) if unread posts exist.

Place this between the props/shoutouts section and the Continue Training card.

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Team Hub entry card with notification pill pulse" && git push
```

---

## FIX 7: SCROLL-TRIGGERED ANIMATIONS

**File:** `components/PlayerHomeScroll.tsx` AND multiple player-scroll components

THIS IS THE BIG ONE. All animations must trigger when the component scrolls into view, NOT on mount. This prevents animations from playing while the user hasn't scrolled to them yet.

### 7A. Scroll position tracking

In PlayerHomeScroll.tsx, the scrollY shared value already exists from useScrollAnimations. Pass it as a prop to every component that needs scroll-triggered animations:

```typescript
<PlayerMomentumRow scrollY={scrollY} ... />
<PlayerTrophyCase scrollY={scrollY} ... />
// etc.
```

### 7B. Scroll-triggered entrance pattern

In each component, use onLayout to capture the component's Y position, then use useAnimatedStyle to trigger the entrance when scrollY passes that position:

```typescript
const [componentY, setComponentY] = useState(0);
const hasAnimated = useSharedValue(0);

const onLayout = (event) => {
  setComponentY(event.nativeEvent.layout.y);
};

// In useAnimatedStyle or useDerivedValue:
// When scrollY + screenHeight > componentY, trigger the entrance
useDerivedValue(() => {
  if (hasAnimated.value === 0 && scrollY.value + SCREEN_HEIGHT > componentY - 50) {
    hasAnimated.value = 1;
    // trigger entrance animations
  }
});
```

If this pattern is too complex to implement reliably across all components, use a SIMPLER alternative: fire entrance animations with a delay based on the component's position in the scroll. Components at the top get 0ms delay. Components lower get progressively more delay (200ms increments). This isn't perfect but it approximates scroll-triggered behavior.

### 7C. Apply scroll-triggered entrances to:
- PlayerMomentumRow: cards stagger in when visible (slide up + fade, 80ms stagger)
- PlayerTrophyCase: badges pop-in spring when visible (50ms stagger)
- LastGameStats: numbers count up when visible (600ms per number)
- PlayerTeamActivity: items slide in from right when visible (60ms stagger)
- CompetitiveNudge: slide in from left when visible
- PlayerChallengeCard: fade in + subtle scale when visible

### 7D. Always-visible animations (NOT scroll-triggered — these run immediately):
- Hero mascot breathing (always visible at top)
- Streak fire pill pulse (always visible in hero)
- Hero XP bar fill (first thing user sees)
- Daily quest checkbox spring (when tapped, not on scroll)

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: scroll-triggered animations — momentum, trophies, stats, activity all animate on scroll-into-view" && git push
```

---

## FIX 8: BOLD MICRO-ANIMATIONS

**File:** Multiple player-scroll components

These are the "cool" animations. Go bold.

### 8A. XP Bar Fill (Hero)
- Gold bar fills from 0% to actual over 800ms with easeOut
- When fill completes: a brief gold SHIMMER sweeps across the bar (left to right, 400ms)
- The XP text ("875 / 1,000") counts up from 0 to actual with a BOUNCE at the end

### 8B. Level Badge (Hero)
- The gold level circle does a brief SCALE BOUNCE on mount: 0 → 1.1 → 1.0 with spring

### 8C. Momentum Card Numbers
- Each number counts up from 0 to actual value over 600ms
- When the count finishes, the number does a tiny BOUNCE (scale 1.0 → 1.05 → 1.0)
- Stagger between cards: 100ms

### 8D. Trophy Badge Pop-in
- Each badge scales from 0 → 1.0 with spring overshoot (1.05 → 1.0)
- Earned badges get a brief GOLD FLASH (opacity pulse on a gold overlay, 200ms)
- Stagger: 80ms between badges

### 8E. Last Game Stats Count-up
- Each stat number counts from 0 to actual over 600ms
- Different color per stat (coral for kills, sky for assists, green for aces, amber for digs)
- The stat label fades in AFTER the number finishes counting

### 8F. Leaderboard Rows
- Slide in from right (translateX 30 → 0), staggered 80ms
- The "You" row gets a brief HIGHLIGHT GLOW when it enters (sky blue glow, fades after 1s)

### 8G. Challenge Progress Bar
- Progress bar fills from 0 to actual over 800ms
- The "+75 XP" text does a brief gold pulse when the bar finishes

### 8H. Continue Training Card
- Shimmer sweep across the card every 5 seconds (a light band moves left to right)
- On press: scale 0.97 with spring back
- Arrow → does a subtle right-nudge animation (translateX 0 → 4 → 0, 2-second loop)

### 8I. Team Hub Notification Pill
- Pulse: scale 1.0 → 1.2 → 1.0, 2-second loop
- Soft red glow shadow pulses in sync with scale

### 8J. Quick Link Pills
- On press: scale 0.93 with bouncy spring back (damping 6, stiffness 200)
- Haptic feedback on tap

**ALL animation rules:**
- react-native-reanimated ONLY
- ALL loop animations have cancelAnimation cleanup
- ALL hooks above early returns
- Scroll-triggered entrances use the pattern from Fix 7

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: bold micro-animations — count-ups with bounce, gold shimmer, glow highlights, spring presses" && git push
```

---

## FIX 9: FINAL SCROLL ORDER VERIFICATION

**File:** `components/PlayerHomeScroll.tsx`

Verify and set the FINAL scroll order:

1. PlayerIdentityHero (greeting, identity, streak pill, level/XP, mascot)
2. CompetitiveNudge ("3 more aces to take #7")
3. PlayerQuickLinks (My Card, Teammates, My Stats pills)
4. PlayerDailyQuests (3 quests with XP)
5. PlayerChallengeCard (active challenge with progress — conditional)
6. PlayerLeaderboardPreview (team rankings)
7. Shoutouts / Props from the Team
8. PlayerTeamHubCard (team hub entry with notification pill)
9. PlayerContinueTraining (Journey Path teaser)
10. NextUpCard (next event with +XP)
11. PlayerMomentumRow (streak, kills, level, games)
12. LastGameStats (restyled)
13. PlayerTrophyCase (Fortnite-style)
14. PlayerTeamActivity (team feed)
15. PlayerAmbientCloser

```bash
npx tsc --noEmit
git add -A && git commit -m "fix: verified final scroll order — 15 sections in engagement-optimized sequence" && git push
```

---

## FIX 10: CHANGELOG

Generate `PLAYER-HOME-DPLUS-FIXES-CHANGELOG.md`:

1. FILES CREATED — new components
2. FILES MODIFIED — what changed in each
3. NEW SECTIONS ADDED — challenge card, competitive nudge, quick links, team hub card
4. ANIMATIONS — list ALL animations (scroll-triggered vs always-on)
5. SCROLL ANIMATION SYSTEM — document how scroll-triggered entrances work
6. NAVIGATION ROUTES — all tap targets and their destinations
7. DATA SOURCES — what hook data feeds each new component
8. HOOKS PLACEMENT — all above early returns
9. KNOWN ISSUES — quest XP is display-only, Continue Training is a teaser
10. SCREENSHOTS NEEDED — test states

```bash
git add -A && git commit -m "docs: Player Home D+ fixes changelog" && git push
```
