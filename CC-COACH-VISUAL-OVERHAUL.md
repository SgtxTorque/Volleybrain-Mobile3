# LYNX — Coach Home: Visual Overhaul (Cards, Charts, Scroll Effects)
## Phase 10 — For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)  
**GitHub:** SgtxTorque/volleybrain-mobile3  
**Web Admin (SOURCE OF TRUTH):** `C:\Users\fuent\Downloads\volleybrain-admin\`  
**Brand Book:** `reference/design-references/brandbook/LynxBrandBook.html`

---

## CONTEXT

The Coach Home has the right data and the right sections, but it reads like a text log. Everything is flat text at the same weight. This overhaul transforms the text-heavy sections into **visual cards with charts, indicators, and scannable layouts** while keeping the three-tier system intact.

**The philosophy shift:** Stop REPORTING data with words. Start SHOWING data with visuals. A coach should glance and FEEL the state of their team — not read about it.

**What already works and should NOT change:**
- Welcome briefing (Tier 3 ambient) — keep exactly as-is
- Team pills — keep as-is
- Prep checklist — keep as-is (compact flat line)
- Event hero card — keep as-is (dark navy card, great)
- Closing mascot — keep as-is
- All data hooks and queries — keep as-is, just change how data is rendered
- All navigation/tap targets — keep working, just move them into cards

**What we're replacing:**
- Team Pulse text rows → Team Health visual card
- Season scoreboard + Top Performers text → Season & Leaderboard visual card
- Roster alerts (text/cards) → Folded into Team Health card
- Quick actions → Subtle panel with larger icons
- Engagement nudges → Tightened to 1 line
- Action Items → Keep compact but move position
- Recent activity → Keep compact, add Team Hub preview card above it

---

## RULES

1. **Read SCHEMA_REFERENCE.csv FIRST** before any query changes.
2. **Read existing code before changing.** The coach scroll components are in `components/CoachHomeScroll.tsx` and `components/coach-scroll/`. Read them ALL before editing.
3. **Cross-reference web admin** at `C:\Users\fuent\Downloads\volleybrain-admin\src\pages/` for query patterns.
4. **COACH-ROLE ONLY.** Do NOT touch Parent, Admin, or Player.
5. **Reuse existing theme tokens** from `theme/colors.ts`, `theme/fonts.ts`.
6. **Reuse existing data hook** `hooks/useCoachHomeData.ts` — do NOT rewrite queries. Only change the rendering components.
7. **Check package.json** before installing anything.
8. **All animations must use reanimated worklets** (UI thread, 60fps). Import from `react-native-reanimated`.
9. **No console.log without `__DEV__` gating.**
10. **Run `npx tsc --noEmit` after every phase.**
11. **Commit AND push after every phase.**
12. **AUTONOMOUS EXECUTION MODE.** Run ALL phases (1-6) without stopping.

---

## DESIGN TOKENS (Extended)

```typescript
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/fonts';

// Card styles for this overhaul
const COACH_CARDS = {
  // Health card — slight navy tint
  healthCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    padding: 18,
    marginHorizontal: 20,
    shadowColor: '#10284C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  // Season card — white with subtle depth
  seasonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    padding: 18,
    marginHorizontal: 20,
    shadowColor: '#10284C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  // Hub preview card — lightest
  hubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F2F5',
    padding: 16,
    marginHorizontal: 20,
    shadowColor: '#10284C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  // Setup card — warm tint for action
  setupCard: {
    backgroundColor: '#FFFBF0',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F5E6C8',
    padding: 18,
    marginHorizontal: 20,
    shadowColor: '#D9994A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
};

// Bar chart colors
const BAR_COLORS = {
  kills: '#EF4444',    // Red — aggressive stat
  aces: '#10B981',     // Green — precision stat
  digs: '#F59E0B',     // Amber — hustle stat
  assists: '#8B5CF6',  // Purple — playmaking stat
  blocks: '#6366F1',   // Indigo — defensive stat
};

// Player dot colors for roster visualization
const PLAYER_DOT = {
  good: '#22C55E',     // No issues
  warning: '#F59E0B',  // Minor issue (no RSVP)
  critical: '#EF4444', // Major issue (attendance gaps)
};
```

---

## PHASE 1: TEAM HEALTH CARD

**Replaces:** Team Pulse text rows + Roster alerts section

**Goal:** One visual card that shows the entire team's health at a glance using dots, bars, and minimal text.

### Layout:

```
┌──────────────────────────────────────────────┐
│  TEAM HEALTH                                 │
│                                              │
│  ●●●●●●●●●🟡🟡🔴    12 Players             │
│                                              │
│  ATTENDANCE        RSVP (Monday)             │
│  ██████████████░░  ░░░░░░░░░░░░░░░░░░       │
│  100%              0/12                      │
│                                              │
│  🔴 3 need attention                       → │
│  Chloe, Ava, Player New                      │
└──────────────────────────────────────────────┘
```

### Implementation:

1A. **Player dots row:** Query the team roster. For each player, render a small dot (8px circle) in a horizontal flex row:
- `PLAYER_DOT.good` — player has RSVP'd, no attendance issues
- `PLAYER_DOT.warning` — player hasn't RSVP'd for next event
- `PLAYER_DOT.critical` — player has missed 2+ of last 5 events OR hasn't RSVP'd AND has attendance issues
- Dots are sorted: criticals first, then warnings, then good. This creates a visual "gradient" from red to green left-to-right.
- "12 Players" label right-aligned, `FONTS.bodyMedium`, 12px, `COLORS.textMuted`

1B. **Attendance mini-bar:** 
- Full-width bar, height 8px, borderRadius 4px
- Track: `COLORS.warmGray`
- Fill: gradient based on value:
  - 90-100%: `COLORS.success`
  - 70-89%: `COLORS.amberWarm`
  - Below 70%: `COLORS.error`
- Label "ATTENDANCE" above: `FONTS.bodyBold`, 10px, `COLORS.textFaint`, uppercase, letterSpacing 1
- Value below: `FONTS.bodyBold`, 20px, color matches bar fill

1C. **RSVP mini-bar:** Same layout, side by side with attendance (2-column):
- Fill based on RSVP completion: `confirmed / total`
- Color: `COLORS.skyBlue` for fill
- Value "0/12" in `FONTS.bodyBold`, 20px
- When 0 confirmed: `COLORS.error` for both bar and text

1D. **Attention row (conditional):**
- If players need attention: "🔴 3 need attention →" with names below
- Tapping → roster management screen
- If NO players need attention: replace with "✓ All clear" in `COLORS.success`, 13px
- Max 3 names shown, then "and X others"

1E. **Scroll animation:** The Team Health card should **scale up subtly** as it enters the viewport center. Use reanimated `useAnimatedStyle` with scroll position:
```typescript
// When card center aligns with viewport center (±100px):
// scale: interpolate from 0.97 to 1.0
// opacity: interpolate from 0.85 to 1.0
// This creates a "breathing" effect as you scroll past it
```

1F. **Card tappable:** Tapping anywhere on the card (except the attention row) navigates to the team management/roster overview.

**Commit:** `git add -A && git commit -m "Coach Phase 10.1: Team Health visual card with dots, bars, scroll animation" && git push`

---

## PHASE 2: SEASON & LEADERBOARD CARD

**Replaces:** Season scoreboard + Top Performers text sections

**Goal:** One card that combines the win-loss record with horizontal bar chart leaderboard. This is the "power level" card.

### Layout:

```
┌──────────────────────────────────────────────┐
│  4 — 1          BLACK HORNETS ELITE          │
│  ████████████████████████░░░░░░  80%         │
│  Last: Won vs Banks 50-12                    │
│                                              │
│  ─── KILLS ───────────────────────────────── │
│  Test Ava     ████████████████████████   20  │
│  Chloe Test   ████████████████           15  │
│  Sarah J      ██████████                  9  │
│                                              │
│  ─── ACES ────────────────────────────────── │
│  Test Ava     █████████████████████████  13  │
│  Chloe Test   ███████████                 7  │
│  Sarah J      █████████                   6  │
│                                              │
│                            View Leaderboard →│
└──────────────────────────────────────────────┘
```

### Implementation:

2A. **Record header:**
- "4 — 1" in Bebas Neue, 36px. Wins in `COLORS.success`, dash in `COLORS.textFaint`, losses in `COLORS.error`
- Team name right-aligned, `FONTS.bodySemiBold`, 12px, `COLORS.textMuted`, uppercase
- Win rate bar: 6px height, `COLORS.success` fill, `COLORS.warmGray` track
- "80%" label right of bar, `FONTS.bodyBold`, 13px, `COLORS.textMuted`
- "Last: Won vs Banks 50-12" below, `FONTS.bodyMedium`, 12px, `COLORS.textMuted`. Tapping → game detail.

2B. **Leaderboard bar charts:**
- Show TOP stat category first (kills, then aces). Only show 2 categories to keep the card compact.
- Category header: "KILLS" with thin line extending to the right, `FONTS.bodyBold`, 10px, `COLORS.textFaint`, uppercase
- Each player row:
  - Name: `FONTS.bodySemiBold`, 13px, `COLORS.textPrimary`, left-aligned, width 30%
  - Bar: flex fill remaining space, height 14px, borderRadius 7px
    - Bar color from `BAR_COLORS` based on stat category
    - Bar width proportional to value (highest player = 100% width, others scaled relative)
    - Bar has a very subtle gradient: slightly lighter on top, darker on bottom (creates 3D depth)
  - Value: `FONTS.bodyBold`, 13px, `COLORS.textPrimary`, right-aligned, width 30px
- Show top 3 players per category. If fewer than 3 have stats, show fewer.

2C. **Bar chart animation on scroll:** When the card enters the viewport, the bars should **animate from 0 width to their target width** over 600ms with an easeOut timing. This creates a "filling up" effect as you scroll to the card:
```typescript
// Use useAnimatedStyle + withTiming for each bar
// Trigger when card's Y position enters the viewport center zone
// Bars stagger: first bar starts immediately, second at +100ms, third at +200ms
// This creates a cascading fill effect
```

2D. **"View Leaderboard →"** at the bottom, `FONTS.bodySemiBold`, 12px, `COLORS.skyBlue`. Tapping → leaderboard screen.

2E. **If no season stats exist:** Replace the leaderboard section with:
```
  No game stats yet this season.
  Play your first game to see leaderboards.
```
Ambient text, centered, `COLORS.textAmbient`.

**Commit:** `git add -A && git commit -m "Coach Phase 10.2: Season & Leaderboard card with animated bar charts" && git push`

---

## PHASE 3: TEAM HUB PREVIEW CARD + QUICK ACTIONS PANEL

**New addition:** Team Hub preview card  
**Polish:** Quick Actions panel

### Team Hub Preview Card:

```
┌──────────────────────────────────────────────┐
│  TEAM HUB                          View All →│
│                                              │
│  [avatar] Carlos test gave Ava a 🎯 Clutch  │
│           Player shoutout! · 1d ago          │
│                                              │
│  [avatar] New photos posted · 2d ago         │
└──────────────────────────────────────────────┘
```

3A. **Query:** Fetch last 2 team wall posts for the selected team. Reference the web admin's TeamWallPage for query pattern. Include:
- Post author (avatar circle with initial, 32px, `COLORS.skyBlue` background)
- Post text (truncated to 2 lines max)
- Relative timestamp
- If the post is a shoutout, show the shoutout emoji

3B. **Layout:**
- Card style: `COACH_CARDS.hubCard`
- "TEAM HUB" section header left, "View All →" right in `COLORS.skyBlue`
- Each post: flex row with avatar, text area, separated by thin line
- If no posts: show "Your team wall is quiet. Post something to get things going. →"
- Tapping a post → Team Hub tab. Tapping "View All" → Team Hub tab.

3C. **Scroll animation:** Card fades in with a subtle slide-up (translateY from 10 to 0, opacity 0 to 1) as it enters the viewport. Duration 400ms.

### Quick Actions Panel:

3D. **Upgrade the quick actions** from flat text rows to a subtle visual panel:
- Wrap in a container: `backgroundColor: COLORS.offWhite`, `borderRadius: 16`, `marginHorizontal: 20`, `paddingVertical: 6`, `paddingHorizontal: 4`
- Each action row:
  - Emoji icon at 24px (bigger than current)
  - Action text: `FONTS.bodySemiBold`, 15px
  - Arrow: `COLORS.textFaint`
  - Row padding: vertical 14px, horizontal 16px
  - Separator: 1px `COLORS.borderLight` between rows (not after last row)
- This subtle container groups the actions visually as a "toolbox" panel
- On event days: show 4 actions (Send Blast, Give Shoutout, Review Stats, Create Challenge)
- On non-event days: show all 6 (add Build Lineup, Manage Roster)
- **Badge counts on actions that need attention:**
  - "Review Stats" gets a small red dot/badge if `pendingStats > 0`
  - "Manage Roster" gets a small amber dot if roster issues exist

**Commit:** `git add -A && git commit -m "Coach Phase 10.3: Team Hub preview card, upgraded quick actions panel" && git push`

---

## PHASE 4: SEASON SETUP CARD (Conditional)

**New addition:** Only appears when the season is in setup/early phase.

### When to show:
- Check if the current season has been running for less than 14 days (or however the season start date is stored)
- OR if key setup items are incomplete (roster empty, no schedule, no registration)
- If the season is well-established (games played, stats exist), do NOT show this card

### Layout:

```
┌──────────────────────────────────────────────┐
│  🏗️  SEASON SETUP              3 of 7 done  │
│  █████████████░░░░░░░░░░░░░░░░░░░░░░░  43%  │
│                                              │
│  ✓ Roster created                            │
│  ✓ Schedule set                              │
│  ✓ Jerseys assigned                          │
│  ✗ Registration open                         │
│  ✗ Waivers configured                        │
│  ✗ Payment setup                             │
│  ✗ First practice scheduled                  │
│                                              │
│  [ Continue Setup → ]                        │
└──────────────────────────────────────────────┘
```

### Implementation:

4A. **Card style:** `COACH_CARDS.setupCard` (warm tint to feel action-oriented)

4B. **Checklist items:** Determine completion by checking data existence:
- Roster created: `team_players` count > 0 for this team
- Schedule set: `schedule_events` count > 0 for this team this season
- Jerseys assigned: check if `players.jersey_number` is set for 80%+ of roster
- Registration open: check if registration template exists (reference web admin RegistrationsPage)
- Waivers configured: check if waivers exist (reference web admin WaiversPage)
- Payment setup: check if payment configuration exists (reference web admin PaymentSetupPage)
- First practice scheduled: check if at least one practice event exists

**IMPORTANT:** If any of these tables don't exist in SCHEMA_REFERENCE.csv, skip that checklist item and reduce the total count. Don't crash — gracefully handle missing tables.

4C. **Progress bar:** 
- Height 10px, borderRadius 5px
- Track: `#F0E6D2` (warm gray matching the card tint)
- Fill: animated from left on scroll entry, `COLORS.gold` color
- "X of Y done" right-aligned in `FONTS.bodyBold`, 13px, `COLORS.goldWarm`

4D. **Checklist styling:**
- Complete items: `COLORS.success` checkmark, text in `COLORS.textMuted` with strikethrough
- Incomplete items: `COLORS.error` cross, text in `COLORS.textPrimary` (bold, demanding attention)
- Items animate in sequentially: each item fades in 100ms after the previous when the card enters viewport

4E. **"Continue Setup →" button:**
- Full-width, `COLORS.gold` background, `COLORS.navyDeep` text, Bebas Neue 14px
- borderRadius 12, height 44px
- Tapping → navigates to setup wizard or settings page (find existing route)

4F. **When to hide:** If all items are complete OR if the season has been running 30+ days with games played, this card disappears permanently for the season.

**Commit:** `git add -A && git commit -m "Coach Phase 10.4: Conditional season setup progress card" && git push`

---

## PHASE 5: SCROLL EFFECTS + ANIMATION POLISH

**Goal:** Add scroll-driven animations that make the coach home feel alive and premium.

### Animations:

5A. **Welcome section parallax:** As the user scrolls down, the mascot emoji should translate upward at 0.3x the scroll speed (parallax), creating depth. The greeting text fades slightly (opacity 1.0 → 0.6) as the compact header takes over.

5B. **Event hero card entrance:** The navy event card should have a subtle **scale + shadow** animation:
- At rest: scale 1.0, normal shadow
- When card center is within 50px of viewport center: scale 1.02, shadow increases slightly (shadowOpacity + 0.02, shadowRadius + 4)
- This creates a "this is the important thing" emphasis as you scroll to it
- Use `useAnimatedStyle` with `interpolate` on scrollY

5C. **Team Health card breathing:** Already described in Phase 1 — subtle scale 0.97→1.0 and opacity 0.85→1.0 as it enters center viewport.

5D. **Leaderboard bars cascade:** Already described in Phase 2 — bars animate from 0 to target width with stagger when card enters viewport.

5E. **Team Hub card slide-up:** Already described in Phase 3 — translateY 10→0, opacity 0→1.

5F. **Season Setup checklist stagger:** Already described in Phase 4 — items fade in sequentially.

5G. **Quick actions panel:** When the panel enters the viewport, each action row slides in from the left with a 50ms stagger:
- Row 1: immediate
- Row 2: +50ms
- Row 3: +100ms
- Row 4: +150ms
- Each row: translateX from -20 to 0, opacity 0 to 1, duration 300ms, easeOut

5H. **Compact header transition:** When scrolling past the welcome section:
- The mascot shrinks from 48px to 20px and moves to the header left (next to LYNX text)
- The team pills smoothly transition from below the welcome to sticky below the compact header
- Use `interpolate` on scrollY with appropriate thresholds
- If this is too complex or causes performance issues, keep the existing simple crossfade. Performance > fanciness.

5I. **Bottom nav auto-hide:** If it was disabled in previous phases, re-enable it now:
- Nav slides down (translateY 80) when scrolling actively
- Nav slides back up after 850ms of scroll idle
- Use `useAnimatedScrollHandler` with `onMomentumEnd` or a timeout
- ONLY on the coach home screen
- If this causes any issues, disable and leave a TODO comment

5J. **Performance safeguard:** After implementing all animations, run the app and scroll the coach home. If ANY animation causes visible frame drops or jank:
- Simplify that specific animation (reduce number of simultaneous interpolations)
- Or remove it and leave a TODO comment: `// TODO: Animation removed for performance — revisit`
- Smooth 60fps scrolling is more important than fancy effects

**Commit:** `git add -A && git commit -m "Coach Phase 10.5: Scroll animations — parallax, card breathing, bar cascade, stagger effects" && git push`

---

## PHASE 6: FINAL LAYOUT + SPACING + ROLE SELECTOR FIX

### 6A. Final scroll order:

```
1.  Welcome briefing + mascot (Tier 3 ambient)
     ↕ 4px
2.  Team pills (sticky on scroll)
     ↕ 12px
3.  Prep checklist (Tier 2 flat — event days only)
     ↕ 8px
4.  Event hero card (Tier 1 — event days only)
     ↕ 20px
5.  Quick Actions panel (subtle container)
     ↕ 12px
6.  Engagement nudge — 1 line max (Tier 3 ambient)
     ↕ 24px
7.  TEAM HEALTH card (Tier 1.5 — dots + bars)
     ↕ 20px
8.  SEASON & LEADERBOARD card (Tier 1.5 — bars + charts)
     ↕ 20px
9.  ACTION ITEMS (Tier 2 — 1-2 compact lines)
     ↕ 16px
10. TEAM HUB preview card (Tier 1.5 — social feed)
     ↕ 16px
11. RECENT (Tier 2 — 2 items max + "View all")
     ↕ 20px
12. SEASON SETUP card (conditional — early season only)
     ↕ 24px
13. Closing mascot + contextual message (Tier 3)
     ↕ 140px bottom padding
```

**On a quiet off-day with a healthy, established team, the scroll is:**
1. Welcome → 5. Quick Actions → 6. Nudge → 7. Team Health (all green) → 8. Season card → 10. Team Hub → 13. Closing

That's 7 sections, mostly visual cards. Tight, scannable, fast.

**On a busy game day with a new season:**
1. Welcome → 2. Pills → 3. Checklist → 4. Event card → 5. Quick Actions → 6. Nudge → 7. Team Health (some red) → 8. Season card → 9. Action Items → 10. Team Hub → 11. Recent → 12. Season Setup → 13. Closing

Fuller scroll but each section earns its space.

### 6B. Remove old sections that are now inside cards:
- Delete the standalone "TEAM PULSE" section (now inside Team Health card)
- Delete the standalone "ROSTER" alerts section (now inside Team Health card)
- Delete the standalone "SEASON" section (now inside Season & Leaderboard card)
- Delete the standalone "TOP PERFORMERS" section (now inside Season & Leaderboard card)
- Keep "ACTION ITEMS" and "RECENT" as compact flat sections

### 6C. Section header consistency:
Every remaining section header uses:
```
fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 1.2
textTransform: 'uppercase', color: COLORS.textFaint, paddingHorizontal: 24
```

Card INTERNAL headers (inside cards like "TEAM HEALTH", "KILLS", "ACES") use:
```
fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 1
textTransform: 'uppercase', color: COLORS.textMuted
```

### 6D. Role Selector Fix:
The role selector is still non-responsive. Fix it:
1. Find the role selector component
2. Read how the old coach dashboard handled role switching (check git history)
3. Ensure the `onPress` handler:
   - Opens a dropdown/modal showing available roles
   - Selecting a role switches the dashboard view
   - Works in BOTH welcome section and compact header states
4. Verify: Coach → Parent → Coach switching works multiple times

### 6E. Scrollbar hidden: `showsVerticalScrollIndicator={false}`

### 6F. Other roles smoke test:
- [ ] Parent home unchanged
- [ ] Admin dashboard unchanged
- [ ] Player dashboard unchanged

### 6G. TypeScript check:
```bash
npx tsc --noEmit
```

**Commit:** `git add -A && git commit -m "Coach Phase 10.6: Final layout, removed old sections, role selector fix, smoke test" && git push`

---

## VERIFICATION CHECKLIST

**Visual Cards:**
- [ ] Team Health card renders with player dots, attendance bar, RSVP bar
- [ ] Player dots are color-coded (green/amber/red) based on real data
- [ ] Attendance and RSVP bars fill based on real data
- [ ] Season & Leaderboard card shows record + bar charts
- [ ] Bar charts display top 3 players per stat category with real data
- [ ] Team Hub preview shows last 2 posts (or fallback message)
- [ ] Season Setup card appears for new seasons with real checklist
- [ ] Season Setup card does NOT appear for established seasons

**Scroll Animations:**
- [ ] Welcome parallax works smoothly
- [ ] Event hero card has subtle scale emphasis
- [ ] Team Health card breathes on scroll
- [ ] Leaderboard bars cascade fill on enter
- [ ] Team Hub slides up on enter
- [ ] Quick actions stagger from left
- [ ] All animations are 60fps — no jank
- [ ] Compact header transition works

**Data & Navigation:**
- [ ] All tap targets still work (every card, button, row navigates somewhere)
- [ ] Team pill switching reloads all cards with correct data
- [ ] Role selector works on both dashboards
- [ ] Action Items show real counts (evaluations + pending stats)

**Scroll Length:**
- [ ] On off-day: scroll is SHORT (welcome, actions, 2-3 cards, closing)
- [ ] On event day: scroll is MEDIUM (adds event card, checklist, more detail)
- [ ] New season: scroll is LONGEST (adds setup card)
- [ ] No section shows empty state cards — conditional sections just don't render

---

*This transforms the Coach Home from a text log into a visual cockpit. Cards for team state visualization, bars for performance comparison, dots for roster health, and scroll animations for premium feel. The coach opens the app, sees 3-4 visual objects, and instantly knows the state of their team.*
