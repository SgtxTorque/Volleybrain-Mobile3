# CC-PLAYER-EXPERIENCE-BUILD.md
# Lynx Mobile — Full Player Experience Build

**Priority:** HIGH — core identity feature, currently missing  
**Estimated time:** 6–8 hours (7 phases, commit after each)  
**Risk level:** MEDIUM-HIGH — building new screens + replacing existing ones

---

## WHY THIS EXISTS

The player identity screens were never actually built from the v0 mockups. The waves restyled existing screens but didn't create the signature player experience that was designed. Right now:

- There is no roster carousel — players have no easy way to browse teammates
- The player card is the old child-detail layout, not the FIFA-style trading card
- The game recap screen is bare tiles with unlabeled stats
- There is no team pulse / activity feed from the player perspective
- The badges & challenges screen exists but doesn't match the designed trophy room
- **Coaches have no "Roster" button on their home scroll or in coach tools**
- **Players have to tap through 4 screens (standings → leaderboards → player) just to see a teammate**

---

## REFERENCE FILES — READ ALL OF THESE BEFORE WRITING ANY CODE

### Primary Design References (READ FIRST — these are the blueprints):
1. **`reference/design-references/player-mockups/m1-roster-carousel.tsx`** — The roster carousel design. Swipeable cards, power bars, team header. **This is the target.**
2. **`reference/design-references/player-mockups/m2-player-card.tsx`** — The FIFA-style player trading card. OVR badge, stat power bars, share/view buttons. **This is the target.**
3. **`reference/design-references/player-mockups/s1-player-home.tsx`** — Player home screen reference. Shows how player identity integrates into the home scroll.
4. **`reference/design-references/player-mockups/s2-badges-challenges.tsx`** — Badges & challenges layout. Trophy room energy.
5. **`reference/design-references/player-mockups/s4-game-recap.tsx`** — Game recap story screen. Post-game narrative.
6. **`reference/design-references/player-mockups/s5-team-pulse.tsx`** — Team activity pulse. Social feed from team perspective.
7. **`reference/design-references/player-mockups/globals.css`** — Shared styles, color variables, typography for all mockups.

### Brand System:
8. **`reference/design-references/brandbook/LynxBrandBook.html`** — Brand authority
9. **`reference/design-references/brandbook/lynx-screen-playbook-v2.html`** — Read the **"Player Identity & Gamification"** section for design direction on each screen

### Current App (study before replacing):
10. **`components/ParentHomeScroll.tsx`** — The gold standard for scroll-driven architecture. Study how cards, sections, and navigation work here. New screens should feel like they belong in this same app.
11. **`components/CoachHomeScroll.tsx`** — Same. Study the coach tools integration.
12. **`theme/colors.ts`** — Brand tokens
13. **`theme/fonts.ts`** — FONTS tokens
14. **`lib/design-tokens.ts`** — Spacing, shadows, radii

### CRITICAL TRANSLATION RULES:
The mockup files are **React/Next.js with Tailwind CSS**. They are NOT directly usable in React Native. You must:
- Read the mockup to understand the **visual design, layout, spacing, colors, typography hierarchy**
- Translate Tailwind classes to React Native `StyleSheet.create()` using brand tokens
- Use `<View>`, `<Text>`, `<Image>`, `<ScrollView>`, `<FlatList>`, `<Pressable>` — NOT HTML elements
- Use `Animated` from react-native for animations, NOT CSS transitions
- Keep the FEEL of the mockup but build it properly for React Native
- **Brand book wins over mockups if they conflict** — mockups are inspiration, brand book is authority

---

## DESIGN PHILOSOPHY FOR PLAYER SCREENS

These screens need to feel like a **sports video game** — FIFA Ultimate Team, NBA 2K MyCareer, CoD barracks. This is what differentiates Lynx from boring management apps. Players (kids) and parents should WANT to open these screens. They should feel proud seeing their stats, excited about their badges, and connected seeing their teammates.

**Visual language for player screens:**
- **Dark theme preferred** — the PLAYER_THEME from the web admin. Deep navy backgrounds, glowing accents.
- **Bold numbers** — Stats should be LARGE, confident, colorful. Not tiny gray text.
- **Power bars** — Horizontal gradient bars for every stat. Never plain numbers. Never radar charts.
- **Color tier system** — Excellent: sky-blue-to-gold gradient. Good: teal. Average: gold. Below average: gray.
- **OVR badge** — FIFA-style overall rating. Big, glowing, prominent.
- **Card metaphor** — Players are trading cards. Collectible, shareable, screenshot-worthy.
- **XP / Level system** — Progress bars, level badges, "750/800 XP to next level."
- **Celebration moments** — When something good happens (badge earned, new PR, level up), the UI should celebrate with the `celebrate.png` mascot and/or confetti.

---

## PHASE 1: BUILD THE PLAYER CARD COMPONENT

This is the foundation. Every other screen uses this component.

### 1A. Read the mockup first

Open `reference/design-references/player-mockups/m2-player-card.tsx` and study:
- Layout structure (hero photo area, info band, stats grid)
- The OVR badge placement and styling
- The power bar design for each stat
- The "Share Card" and "View Stats" buttons
- Typography sizes and weights
- Color usage

### 1B. Build `components/PlayerTradingCard.tsx`

This is a NEW component. Do NOT modify the existing PlayerCard.tsx — that serves list/compact views. This is the full trading card.

**Props:**
```typescript
interface PlayerTradingCardProps {
  player: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
    jerseyNumber?: number;
    position?: string;
    teamName: string;
    teamColor?: string;
    seasonName?: string;
    level?: number;
    xp?: number;
    xpToNextLevel?: number;
    overallRating?: number; // 0-99 OVR
    stats?: {
      label: string;    // "HIT", "SRV", "SET", "DIG", "BLK", "ACE"
      value: number;    // 0-100
      color?: string;   // brand color for the power bar
    }[];
    badges?: { id: string; name: string; icon: string; rarity: string }[];
  };
  onShare?: () => void;
  onViewStats?: () => void;
  onClose?: () => void;
  variant?: 'full' | 'compact'; // full = full screen card, compact = in-list card
}
```

**Full variant layout (top to bottom):**

1. **Hero photo area** (~60% of screen height)
   - Edge-to-edge player photo (or teal circle with initials if no photo)
   - Dark gradient overlay at bottom (transparent → dark navy)
   - Position badge: top-left, colored pill (e.g., "L" for Libero in a teal circle)
   - Season badge: top area, colored pill ("2026 SPRING")
   - Jersey number: MASSIVE watermark behind the player, semi-transparent

2. **Info band** (overlapping the bottom of the photo)
   - "ROOKIE CARD" / "VETERAN" / "ALL-STAR" tag based on games played or level
   - OVR badge: right side, large glowing square/circle with the rating number (e.g., "56 OVR"). Color based on tier:
     - 80+ = gold glow
     - 60-79 = teal glow
     - 40-59 = sky-blue glow
     - <40 = gray
   - Player full name: LARGE bold text
   - Position + team: "SETTER · Black Hornets Elite"

3. **Stats grid** (below info band, dark card)
   - 2-column grid of stat rows
   - Each row: stat label (left) + power bar (middle) + number (right)
   - Power bar: colored horizontal bar, width proportional to value (0-100)
   - Power bar colors: per-stat (HIT=coral, SRV=gold, SET=teal, DIG=sky, BLK=purple, ACE=pink) or use brand colors
   - Numbers in bold, colored to match the bar

4. **Action buttons** (bottom)
   - "Share Card" — teal button with share icon. Captures the card as an image for sharing.
   - "View Stats" — outlined button with chart icon. Goes to the full stats screen.

**Compact variant:** (for use in lists, roster, leaderboards)
- Horizontal card, ~80px tall
- Player photo (circle, 56px), name, jersey number, position pill, mini OVR badge
- Tap → navigates to the full PlayerTradingCard view
- This replaces wherever the old PlayerCard is used in list contexts

### 1C. Build `app/player-card.tsx` — Full-screen trading card view

A dedicated screen that renders the full PlayerTradingCard:

```typescript
// Route: /player-card?playerId=xxx
// Or: /player-card?childId=xxx (parent viewing their child)
```

- Fetches player data from Supabase
- Renders PlayerTradingCard with `variant="full"`
- Back button top-left
- Camera icon top-right (change photo, if it's your own card or you're a coach/admin)
- Dark background (PLAYER_THEME navy)

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: PlayerTradingCard component + player-card screen (FIFA-style trading card)"
git push
```

---

## PHASE 2: BUILD THE ROSTER CAROUSEL

### 2A. Read the mockup

Open `reference/design-references/player-mockups/m1-roster-carousel.tsx` and study:
- The swipeable card carousel
- The team header with team name and season
- The mini stat preview on each card (top 3 stats as power bars)
- The "Swipe to browse roster" hint text
- How the carousel handles multiple players

### 2B. Build `components/RosterCarousel.tsx`

**Props:**
```typescript
interface RosterCarouselProps {
  teamId: string;
  teamName: string;
  teamColor?: string;
  seasonName?: string;
  players: PlayerTradingCardProps['player'][];
  onPlayerTap?: (playerId: string) => void; // opens full trading card
}
```

**Layout:**
1. **Team header**
   - "MY TEAM" section label (small, uppercase, letter-spaced)
   - Team name: LARGE bold
   - Season + player count: "Spring 2026 Season · 12 players"

2. **Level/XP bar** (if viewing your own team as a player)
   - "LVL 4 Bronze · 750/800 XP" with a progress bar

3. **Swipeable card area** (the centerpiece)
   - Horizontal FlatList or ScrollView with snap-to-center behavior
   - Each card: player photo (large, ~60% of card), position badge, jersey number watermark, player name, grade/age
   - Below the photo on each card: top 3 stats as mini power bars (HIT, SRV, SET)
   - Phone call icon if the viewer is a coach (quick-call parent)
   - Current card indicator dots at the bottom

4. **"Swipe to browse roster" hint**
   - Subtle text below the carousel, fades after first swipe

5. **Tap a card → navigates to full player-card screen**
   - `router.push(/player-card?playerId=${player.id})`

**Snap behavior:**
- Use `snapToInterval` or `pagingEnabled` on the FlatList
- Cards should snap to center
- Partial preview of next/previous cards visible on edges

### 2C. Build `app/roster.tsx` — Roster screen

A dedicated screen wrapping the RosterCarousel:

```typescript
// Route: /roster?teamId=xxx
// If no teamId, use the user's current team
```

- Dark background (PLAYER_THEME)
- Fetches team + players from Supabase
- Renders RosterCarousel
- Back button

### 2D. Wire navigation entry points

**Coach Home Scroll — add a "Team Roster" card:**
In `components/CoachHomeScroll.tsx`, add a section (Tier 2) for roster access:
- Card: "ROSTER" section header + team name + player count + "View Roster →"
- Tap → `router.push('/roster?teamId=${teamId}')`

**Coach tools (in gesture drawer or bottom of home scroll):**
- Add "Roster" to the coach tools grid (alongside Attendance, Lineup, Game Prep)
- Icon: people/group icon
- Tap → `/roster`

**Player Home Scroll — add a "My Team" card:**
In the player's home scroll (if `components/PlayerHomeScroll.tsx` exists, or wherever the player home renders):
- Card: "MY TEAM" + team name + "See your teammates" + mini avatar stack of first 3-4 teammates
- Tap → `router.push('/roster?teamId=${teamId}')`
- This should be near the top — maybe right after the player's own card/welcome

**Leaderboards — player tap:**
When tapping a player in leaderboards, it should now go to:
- `router.push('/player-card?playerId=${playerId}')` (the new trading card)
- NOT the old child-detail screen

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: RosterCarousel component + roster screen + navigation wiring (coach home, player home, leaderboards)"
git push
```

---

## PHASE 3: REBUILD GAME RECAP

### 3A. Read the mockup

Open `reference/design-references/player-mockups/s4-game-recap.tsx` and study the layout.

### 3B. Rebuild `app/game-recap.tsx`

The current game recap shows unlabeled stat tiles with random icon colors. Rebuild it as a **post-game story screen**.

**Layout (single vertical scroll, dark theme):**

1. **Result hero**
   - W/L badge: large, centered. WIN = green pill, LOSS = coral pill
   - Score: MASSIVE numbers. "50 — 12" with home team score emphasized
   - Team names: both teams, fully visible (not truncated)
   - Set scores below: "25-9 · 25-3" in a clean row

2. **"[PLAYER NAME]'S PERFORMANCE" section** (if viewing as player/parent)
   - Section header: uppercase, branded
   - Stat cards in a 2x3 or 3x2 grid:
     - Each card: **stat label** (e.g., "KILLS") + icon + **number** (large, bold, colored)
     - NOT unlabeled icons. Every stat MUST have a text label.
     - Colors: use per-stat colors matching the power bar system from the trading card
   - Personal highlights: "New personal best! 8 kills" if applicable

3. **Top performers section** (if viewing as coach)
   - 3 cards: MVP, Offensive Player, Defensive Player (or top 3 by different stats)
   - Each: player photo + name + key stat

4. **Set-by-set breakdown** (expandable)
   - Each set: score + key moments if tracked

5. **Team stats summary** (compact table)
   - Kills, Aces, Digs, Blocks, Assists — team totals

6. **Share button**
   - "Share Recap" → captures the result hero + performance section as an image

**Navigation:**
- Parents see this on their home scroll the day after a game (inline card that taps to full view)
- Coaches access from game results or game day history
- Players see it in their home scroll

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: rebuild game recap as post-game story screen with labeled stats"
git push
```

---

## PHASE 4: BUILD TEAM PULSE

### 4A. Read the mockup

Open `reference/design-references/player-mockups/s5-team-pulse.tsx` and study.

### 4B. Build `components/TeamPulse.tsx` or rebuild team hub content

Team Pulse is the team's social activity feed — what's happening with your team right now. This could be a section in the home scroll OR the content that lives inside the Team Hub tab.

**Layout (scrollable feed):**

1. **Team header** (compact)
   - Team name + team color accent + record (W-L)

2. **Activity feed** (reverse chronological)
   - Each activity is a card with:
     - Activity type icon + description + timestamp
     - Types:
       - **Game result:** "Won vs Banks 50-12" with W/L badge
       - **Shoutout:** "Coach Carlos gave Ava a Leadership shoutout" with emoji
       - **Badge earned:** "Sarah earned the 'Ace Machine' badge"
       - **New post:** Team wall post preview (author + text snippet + photo thumbnail)
       - **Practice:** "Practice completed — 10/12 attended"
       - **Challenge update:** "5 players completed the '100 serves' challenge"
   - Cards should feel like a social media feed — visual, engaging, quick to scan

3. **Empty state:** `Meet-Lynx.png` + "Your team's pulse will show up here as the season unfolds!"

**Where this lives:**
- For now, build it as a component that can be embedded in home scrolls
- Add a "TEAM PULSE" section to PlayerHomeScroll and CoachHomeScroll (below the main action area, Tier 2/3 content)
- Later it can become the main content of the Team Hub tab when we redesign that

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: TeamPulse activity feed component + integration into home scrolls"
git push
```

---

## PHASE 5: REBUILD BADGES & CHALLENGES

### 5A. Read the mockup

Open `reference/design-references/player-mockups/s2-badges-challenges.tsx` and study.

### 5B. Rebuild `app/achievements.tsx` — The Trophy Room

**Fix the cycling errors first:**
The current achievements screen has errors when accessed from the parent home Level card. Investigate and fix the data query before restyling.

```bash
grep -rn "useEffect\|useState\|fetch\|supabase" --include="*.tsx" app/achievements.tsx | head -20
```

Check for missing null guards, undefined array access, or scope issues (parent vs player achievements).

**Then rebuild the layout:**

**Layout (dark theme, CoD barracks energy):**

1. **Tab bar at top:** PillTabs — "BADGES" | "CHALLENGES" | "PROGRESS"

2. **BADGES tab:**
   - Category pills: "All", "Offensive", "Defensive", "Team", "Milestones" (horizontal scroll)
   - 3-column grid of badge icons
   - Rarity system with visual treatment:
     - **Common** = gray border, no glow
     - **Rare** = teal border, subtle glow
     - **Epic** = gold border, medium glow
     - **Legendary** = coral border, strong glow, particle effect if possible
   - Earned badges: full color + glow
   - Locked badges: grayscale + lock icon overlay
   - In-progress badges: faded + progress bar along bottom edge
   - Tap a badge → bottom sheet with: badge art (large), name, description, how to earn, progress if in-progress, date earned if earned
   - Recent unlocks section at top with `celebrate.png` mascot

3. **CHALLENGES tab:**
   - Active challenges: Tier 1 cards with progress bar, deadline, XP reward, participant count
   - Completed challenges: Tier 2 flat cards, grayed slightly, checkmark
   - Expired challenges: collapsed or hidden
   - Each challenge card: title, description preview, circular progress ring, "X days remaining", XP amount
   - Tap → challenge detail (bottom sheet with full description, leaderboard of participants by progress)

4. **PROGRESS tab:**
   - Season XP progress bar (current level → next level)
   - Stat improvement charts (this month vs last month)
   - "Personal bests" highlight cards
   - Overall stats with power bars

**Whose achievements:**
- If the PLAYER is viewing: their own badges and challenges
- If a PARENT is viewing (via "Level" card on home): their CHILD'S badges and challenges — the query must filter by the child's player ID, not the parent's user ID
- If a COACH is viewing a player: that player's badges

### 5C. Fix the parent → achievements navigation

The parent's "Level" card currently navigates to achievements but causes errors. Fix:
- Pass the child's player ID as a route parameter: `router.push('/achievements?playerId=${childId}')`
- The achievements screen reads `playerId` from params and fetches that player's data
- If no `playerId` param, default to the current user's player data (for when a player views their own)

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: rebuild achievements as trophy room - badges grid with rarity, challenges with progress, fix parent navigation"
git push
```

---

## PHASE 6: UPDATE COMPACT PLAYER CARD FOR LIST VIEWS

### 6A. Update `components/PlayerCard.tsx` — Compact variant

The existing PlayerCard is used in list views (roster management, attendance, search results). Update it to match the trading card design language without being a full card.

**Compact PlayerCard layout:**
- Horizontal card, 72-80px tall
- Left: player photo (circle, 48-56px) with position badge overlay (small colored circle with 2-letter position code)
- Center: name (bold) + team (secondary) + jersey number
- Right: mini OVR badge (small circle with rating number, color-coded by tier)
- If stats available: tiny inline power bar (1 stat, the player's best) below the name
- Tap → navigates to `/player-card?playerId=${id}` (the full trading card)

This should feel like it belongs in the same design system as the full trading card — same color treatment on the OVR badge, same position badge style, same typography hierarchy, just compressed.

### 6B. Verify all list views use updated PlayerCard

```bash
grep -rn "PlayerCard\|playerCard" --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" | grep "import"
```

Every screen importing PlayerCard should now render the updated compact card that navigates to the new trading card view.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 6: update compact PlayerCard to match trading card design language + wire to new player-card screen"
git push
```

---

## PHASE 7: VERIFY EVERYTHING

```bash
# 1. TypeScript clean
npx tsc --noEmit 2>&1 | grep -v "reference\|design-reference" | tail -10

# 2. New files exist
ls -la components/PlayerTradingCard.tsx
ls -la components/RosterCarousel.tsx
ls -la components/TeamPulse.tsx
ls -la app/player-card.tsx
ls -la app/roster.tsx

# 3. Navigation entry points wired
# Coach home scroll has roster access
grep -n "roster\|Roster" components/CoachHomeScroll.tsx
# Player home scroll has "My Team" card
grep -n "roster\|Roster\|My Team\|my.*team" components/PlayerHomeScroll.tsx 2>/dev/null
# Leaderboards navigate to new player-card
grep -n "player-card" components/LeaderboardScreen.tsx

# 4. Achievements doesn't error
grep -n "playerId\|childId" app/achievements.tsx | head -5
# Expected: reads playerId from route params

# 5. Game recap has labeled stats
grep -n "KILLS\|ACES\|DIGS\|BLOCKS\|ASSISTS\|label" app/game-recap.tsx | head -10
# Expected: stat labels visible

# 6. Old child-detail still works (not broken)
# The old child-detail may still be used by parents for non-card info (schedule, badges tab)
# Verify it still compiles and renders
grep -n "child-detail\|childDetail" app/ components/ --include="*.tsx" -r | grep -v "_legacy" | grep -v "reference/" | head -5

# 7. Count total changes
git diff --stat HEAD~6

git add -A
git commit -m "Phase 7: player experience build verification"
git push
```

---

## EXPECTED RESULTS

1. **PlayerTradingCard** — FIFA-style full trading card with hero photo, OVR badge, stat power bars, share/view buttons. Dark theme. Screenshot-worthy.

2. **Roster Carousel** — Swipeable horizontal card carousel. Player photo + mini stats on each card. Tap to open full trading card. "Swipe to browse roster" hint.

3. **Roster Screen** — Dedicated screen wrapping the carousel. Accessible from coach home, player home, coach tools.

4. **Coach Home: Roster access** — New "ROSTER" section card + roster added to coach tools grid.

5. **Player Home: "My Team" card** — One tap to browse teammates. Near top of scroll.

6. **Leaderboards → Player Card** — Tapping a player in leaderboards opens the new trading card, not the old child-detail.

7. **Game Recap rebuilt** — Post-game story with labeled stats, team names, set scores, personal performance section, share button. Not unlabeled mystery tiles.

8. **Team Pulse** — Social activity feed component embedded in home scrolls. Game results, shoutouts, badges, posts in a chronological feed.

9. **Badges & Challenges rebuilt** — Trophy room with rarity glows, 3-column badge grid, challenge cards with progress rings, XP progress. Fixes the cycling error from parent navigation.

10. **Compact PlayerCard updated** — List view card matches trading card design language. Mini OVR badge, position badge, taps to full trading card.

11. **7 commits** — one per phase, each pushed.

---

## AFTER THIS SPEC

The player identity experience is built. Next priorities:
1. **CC-VISUAL-QA-AUDIT.md** — Visual consistency pass across ALL screens (now that the player screens are built, they'll be included in the audit)
2. **Team Hub redesign** — The Team Hub tab can now embed TeamPulse and RosterCarousel
3. **Friends & Family Beta** — With player identity in place, the app has its emotional hook
