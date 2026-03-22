# CC-COACH-HOME-D-REDESIGN.md
# Lynx Mobile — Coach Home Scroll: D System Redesign
# References: LYNX-EXPERIENCE-MANIFESTO.docx (Section 5)

**Priority:** HIGH — First of four home scroll redesigns
**Estimated time:** 4-6 hours (6 phases, commit after each)
**Risk level:** MEDIUM — Restructuring existing components, not adding new data

---

## WHY THIS EXISTS

The current coach home scroll has the right data but the wrong emotional arc. Every section has the same visual weight — white cards with borders, repeated top to bottom. The mascot greeting takes too much vertical space (centered, stacked). The readiness checklist (Lineup Set / RSVPs / Last Game Stats) is disconnected from the game day hero card. Quick actions are a vertical list. The trophy case is flat. The feed doesn't feel alive.

The D System redesign transforms the scroll into a scroll with rhythm: warm opening → urgent attention → bold hero peak → colorful momentum → contextual information → interactive engagement → living activity → rewarding recognition → quiet closer.

**This spec restructures the LAYOUT and VISUAL HIERARCHY only.** Data hooks, navigation wiring, and Supabase queries stay exactly as they are. We're reskinning and rearranging, not rebuilding.

---

## PREREQUISITE READING (DO ALL OF THESE FIRST)

1. **Read CC-LYNX-RULES.md** — All 15 rules apply.
2. **Read AGENTS.md** — Codex guardrails apply (minimal edits, explain every file touch, no broad refactors).
3. **Read LYNX-REFERENCE-GUIDE.md** — Mascot asset locations, brand book reference, v0 mockup translation rules.
4. **Read theme/colors.ts, theme/spacing.ts, theme/fonts.ts** — Existing brand tokens. USE THESE. Do not duplicate or contradict.
5. **Read lib/design-tokens.ts** — Additional existing tokens.
6. **Read the ENTIRE CoachHomeScroll.tsx** — Understand every section, every import, every data flow.
7. **Read every file in components/coach-scroll/** — Understand what each sub-component does and what data it consumes.
8. **Read SCHEMA_REFERENCE.csv** — Even though this spec should NOT require query changes, verify before touching anything data-related.

---

## FILE SCOPE — HARD BOUNDARIES

### FILES YOU MAY MODIFY:
- `components/CoachHomeScroll.tsx` — The main scroll file. Primary target.
- Files inside `components/coach-scroll/` — Sub-components specific to the coach scroll.
- `theme/colors.ts` — ONLY to ADD new D System tokens. Do NOT rename, remove, or change existing tokens.
- `theme/spacing.ts` — ONLY to ADD new tokens. Do NOT change existing ones.
- `lib/design-tokens.ts` — ONLY to ADD new tokens. Do NOT change existing ones.

### FILES YOU MAY CREATE:
- New files inside `components/coach-scroll/` (e.g., DynamicMessageBar.tsx, MomentumCardsRow.tsx, etc.)
- A new `theme/d-system.ts` file for D System-specific tokens IF you judge it cleaner than adding to existing files.

### FILES YOU MUST NOT MODIFY:
- `components/DashboardRouter.tsx` — Only imports CoachHomeScroll. No changes needed.
- `components/AdminHomeScroll.tsx` — Different role. Do not touch.
- `components/ParentHomeScroll.tsx` — Different role. Do not touch.
- `components/PlayerHomeScroll.tsx` — Different role. Do not touch.
- `components/TrophyCaseWidget.tsx` — SHARED by all four home scrolls. Do NOT modify this file. Create a NEW FortntieTrophyCase.tsx component for coach instead. The old widget stays intact for other roles until their specs run.
- `components/TeamPulse.tsx` — SHARED by Coach and Player. Do NOT modify. If you need different styling, create a wrapper or a new coach-specific version in coach-scroll/.
- `hooks/useCoachHomeData.ts` — Data hook. Do NOT modify.
- `lib/auth.tsx` — Do not touch.
- `lib/permissions-context.tsx` — Do not touch.
- `lib/theme.tsx` — Do not touch.
- ANY file in `app/` — No route changes. No layout changes. No tab bar changes.
- ANY file in `components/parent-scroll/` — Different role.
- ANY file in `components/player-scroll/` — Different role.
- ANY file in `components/admin-scroll/` — Different role (if exists).
- ANY file in `reference/` or `design-reference/` — Read-only reference.

### CRITICAL: NO DOMINOES RULE
- If you remove a component from CoachHomeScroll's render, do NOT delete the component FILE. Other screens or future specs may reference it.
- If you stop importing a coach-scroll component in CoachHomeScroll.tsx, leave the file in coach-scroll/ untouched.
- Every change must be reversible by simply reverting CoachHomeScroll.tsx and any NEW files created.

---

## EXECUTION RULES

1. **Preserve all data fetching logic.** The `useCoachHomeData` hook stays unchanged. All data flows remain identical.
2. **Preserve all navigation wiring.** Every `router.push()` call stays pointed at the same destination. Copy navigation targets from old components into new ones.
3. **Coach role ONLY.** Do NOT modify Admin, Parent, or Player scrolls.
4. **No new npm packages** unless absolutely necessary (check package.json first).
5. **Commit after each phase.** Run `npx tsc --noEmit` before each commit.
6. **AUTONOMOUS EXECUTION MODE.** Run ALL phases without stopping. Commit and push after each. Make judgment calls and document in code comments.
7. **If a phase reveals a structural problem** that would require modifying a MUST NOT MODIFY file, STOP and explain. Do not proceed.

---

## DESIGN TOKENS

The existing `theme/colors.ts` already has many of the brand tokens we need (BRAND.navyDeep, BRAND.skyBlue, BRAND.gold, etc.). Before creating anything new, CHECK if the token already exists.

Create a new file `theme/d-system.ts` for D System-specific tokens that DON'T already exist in the theme files. Import and re-export BRAND tokens where they overlap — do NOT duplicate values.

```typescript
// theme/d-system.ts
// D System design tokens — extends existing BRAND tokens
import { BRAND } from './colors';

export const D_COLORS = {
  // Re-export existing brand colors for convenience
  ...BRAND,
  
  // D System surfaces (new)
  pageBg: '#FAFBFE',
  
  // D System text variants (check if these differ from BRAND.textMuted etc.)
  textAmbient: 'rgba(11,22,40,0.2)',   // For closers and ambient moments
  
  // Accent backgrounds for action grid (new)
  blastBg: '#FFF0F0',
  blastIcon: '#FFD4D4',
  shoutBg: '#FFF8E1',
  shoutIcon: '#FFE8A0',
  statsBg: '#E8F8F5',
  statsIcon: '#B2F5EA',
  challengeBg: '#F0EDFF',
  challengeIcon: '#DDD6FE',
  
  // Nudge card (new)
  nudgeBgStart: '#FFF8E1',
  nudgeBgEnd: '#FFF0DB',
  
  // Momentum card gradients (new)
  streakStart: '#FF6B6B',
  streakEnd: '#e55039',
  recordStart: '#22C55E',
  recordEnd: '#0ea371',
  attendStart: '#8B5CF6',
  attendEnd: '#6c2bd9',
  killsStart: '#4BB9EC',
  killsEnd: '#2980b9',
} as const;

// Radii — extend existing SPACING.cardRadius etc.
export const D_RADII = {
  hero: 22,       // matches existing SPACING.heroCardRadius
  card: 18,
  cardSmall: 14,
  actionCell: 16,
  pill: 20,
  badge: 14,
  momentum: 16,
} as const;
```

---

## PHASE 1: COMPACT MASCOT GREETING + DYNAMIC MESSAGE BAR

### What changes:
- The current centered vertical mascot greeting (mascot image → "Good morning, Coach" → briefing message → team pill) becomes a compact horizontal layout.
- Add a new DynamicMessageBar component below the greeting.

### 1A. Restructure the greeting area

**Current:** Centered mascot image (large), centered greeting text, centered briefing message, centered team selector pill. ~200px of vertical space.

**Target:** Horizontal row — mascot (40x40 rounded square) on the left, greeting text ("Hey Coach! 🔥" + brief message) in the middle, role pill on the right. ~70px of vertical space.

The mascot image should use the existing mascot asset but rendered at 40x40 in a rounded square (borderRadius 14) with the gold gradient background (FFF3D6 → FFE8A0).

The greeting text:
- Line 1: "Hey Coach! 🔥" in Outfit 17px weight 800 color textPrimary
- Line 2: Brief dynamic message in PlusJakartaSans 12px weight 500 color textMuted

The team selector pill stays but moves to the right side of the greeting row, styled as a compact navy pill (D_COLORS.navyDeep background, white text, 10px font, borderRadius 16).

### 1B. Build DynamicMessageBar component

Create `components/coach-scroll/DynamicMessageBar.tsx`

This is a horizontal bar below the greeting with:
- A 3px left border (sky blue for info, coral for urgent, amber for payments)
- Background tint matching the border color at ~6% opacity
- An emoji icon on the left (16px)
- Message text in the center (12.5px, weight 500)
- The message content comes from the existing `buildBriefingMessage()` function — move the logic there.

The bar should be tappable — on tap, navigate to the relevant screen (game detail for game day messages, schedule for event messages).

### 1C. Remove the old centered greeting layout

Remove the old vertical greeting JSX. Remove the speech bubble card wrapper if one exists. Keep the cycling dot indicators logic if desired but simplify to a single message (no cycling — the DynamicMessageBar handles context).

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: Coach Home D Phase 1 — compact mascot greeting + dynamic message bar"
git push
```

---

## PHASE 2: GAME DAY HERO CARD WITH INTEGRATED READINESS

### What changes:
- The current game day card and the separate readiness checklist (Lineup set / RSVPs / Last game stats) merge into ONE dark navy hero card.
- PrepChecklist component content moves INSIDE the hero card as readiness pips.

### 2A. Merge readiness into the hero card

**Current:** PrepChecklist renders above or separate from the GamePlanCard. Shows X marks for incomplete items.

**Target:** Inside the dark navy game day card, add a readiness section:
- A row of 3 small horizontal bars (4px height, 40px width each, rounded)
- Green bars for completed items, coral/red bars for incomplete
- A label: "0 of 3 ready" in 10px white text at 35% opacity
- This sits between the location text and the action buttons

### 2B. Restructure the hero card layout

The hero card should follow this structure (top to bottom, all inside one dark navy rounded card, borderRadius 22):
1. Badge row: "GAME DAY" pill (green-tinted background, green text) + time text (white at 40%)
2. Team name: Outfit 20px weight 800 white
3. "vs [Opponent]" — 13px white at 50%
4. Location: "📍 Fieldhouse" — 11px white at 30%
5. Readiness pips (from 2A above)
6. Action buttons row: Roster | Lineup | Stats — each is a small rounded button (borderRadius 10, background white at 8%, color white at 70%)
7. Bottom strip (darker background, ~15% black overlay): RSVP count on the left ("0/12 confirmed"), START GAME DAY button on the right (sky blue background, white text, borderRadius 10)

The volleyball emoji should be positioned absolutely in the top-right of the card at ~20% opacity.

### 2C. Remove the standalone PrepChecklist from the scroll

PrepChecklist as a standalone section is removed from the scroll order. Its DATA still feeds into the hero card readiness pips, but it no longer renders as its own section.

### 2D. Handle non-game-day state

When there is no upcoming game:
- The hero card still renders but shows the NEXT upcoming event (practice, tournament, etc.)
- If there are no events at all, show an empty state inside the card: "No upcoming events. Create one?" with a button.
- The readiness pips section is hidden when there's no game.

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: Coach Home D Phase 2 — game day hero with integrated readiness pips"
git push
```

---

## PHASE 3: HORIZONTAL MOMENTUM CARDS + SQUAD FACES

### What changes:
- Replace the current season stats card (4-1 record, 80% bar, kills leaderboard) with horizontal scroll gradient momentum cards.
- Replace the current roster card ("ROSTER / Black Hornets Elite / 12 players / View Roster →") with squad face circles.

### 3A. Build MomentumCardsRow component

Create `components/coach-scroll/MomentumCardsRow.tsx`

A horizontally scrollable row of gradient cards. Each card:
- Width: ~110px, borderRadius 16, padding 14px 18px
- Background: linear gradient (specific to each stat)
- Content: emoji (18px, margin-bottom 4), number (Outfit 26px weight 900 white), label (9px weight 700 uppercase white at 75%)

Cards to show (in order):
1. Win Streak (coral gradient #FF6B6B → #e55039): 🔥 + streak count
2. Season Record (green gradient #22C55E → #0ea371): 📊 + "W-L"
3. Attendance (purple gradient #8B5CF6 → #6c2bd9): 👥 + percentage
4. Top Kills (sky gradient #4BB9EC → #2980b9): ⚡ + top player's kill count

Data sources: wins/losses come from `useCoachHomeData`, attendance comes from existing calculations, top kills from season stats. If a stat isn't available, skip that card (don't show a card with "0" or "N/A").

### 3B. Build SquadFacesRow component

Create `components/coach-scroll/SquadFacesRow.tsx`

A row of overlapping circular avatars showing team players:
- Each avatar: 40px, borderRadius 50%, 2.5px white border, negative margin-left (-6px) for overlap
- Background: assigned gradient colors cycling through coral, sky, green, purple, amber, teal
- Shows first initial of player name
- Max 8 visible + a "+N" circle for remaining
- Section header: "YOUR SQUAD" in Outfit 13px weight 800 uppercase + "View All →" link on the right
- Below the faces: a single line of text — "12 players" in 13px textMuted

Tap the row → navigate to roster screen.

Data source: the player list from `useCoachHomeData` or from the team's roster query.

### 3C. Remove old season stats card and roster card

Remove the existing SeasonLeaderboardCard and any standalone roster card from the scroll. The data they showed is now in momentum cards and squad faces.

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: Coach Home D Phase 3 — horizontal momentum cards + squad face circles"
git push
```

---

## PHASE 4: SMART NUDGE + 2x2 ACTION GRID

### What changes:
- Replace the vertical quick actions list (Send Blast, Give Shoutout, Review Stats, Create Challenge) with a 2x2 pastel grid.
- Add a smart nudge card above the grid that surfaces contextual suggestions.
- Move the scouting context and the "Ava had 20 kills" nudge into the smart nudge component.

### 4A. Build SmartNudgeCard component

Create `components/coach-scroll/SmartNudgeCard.tsx`

A warm-toned card that shows intelligent suggestions:
- Background: gradient from #FFF8E1 to #FFF0DB
- BorderRadius: 14
- Layout: emoji (24px) on left, message text in center, arrow (→) on right
- Text: 12.5px weight 600 color textPrimary, with highlighted portions in sky blue weight 700

Content logic (priority order — show the first one that applies):
1. If a player had a standout stat in the last game: "Ava had 20 kills — give her a shoutout?"
2. If there's a game today: "First meeting with [opponent] this season."
3. If a challenge is close to completion: "[Player] is 2 aces away from Ace Hunter!"
4. If attendance is trending up: "Attendance is up 5% this week. Your team is showing up."

The existing `ScoutingContext` component's data can feed some of this logic. The nudge replaces ScoutingContext as a standalone section.

### 4B. Build ActionGrid2x2 component

Create `components/coach-scroll/ActionGrid2x2.tsx`

A 2x2 grid of action cells:
- Grid: 2 columns, gap 10px
- Each cell: borderRadius 16, padding 16px, flexDirection row, alignItems center, gap 10px
- Each cell has an icon container (36x36, borderRadius 12, centered emoji 18px) and a label (12px weight 700)

The four cells:
1. Send Blast: background #FFF0F0, icon bg #FFD4D4, emoji 📣
2. Give Shoutout: background #FFF8E1, icon bg #FFE8A0, emoji ⭐
3. Review Stats: background #E8F8F5, icon bg #B2F5EA, emoji 📊
4. Create Challenge: background #F0EDFF, icon bg #DDD6FE, emoji 🎯

Each cell navigates to the appropriate screen on tap (same destinations as the current QuickActions).

### 4C. Remove old QuickActions and ScoutingContext

Remove `QuickActions` from the scroll rendering. Remove `ScoutingContext` from the scroll rendering. The data and navigation targets from both are preserved in the new components.

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: Coach Home D Phase 4 — smart nudge card + 2x2 action grid"
git push
```

---

## PHASE 5: TEAM PULSE FEED + FORTNITE TROPHY CASE

### What changes:
- The current ActivityFeed and TeamHubPreviewCard are replaced/upgraded to a Team Pulse section.
- The current TrophyCaseWidget is upgraded to the Fortnite-style layout with badge grid + rarity dots.

### 5A. Upgrade the Team Pulse feed

The existing `TeamPulse.tsx` is shared with PlayerHomeScroll — do NOT modify it. Instead, create a new `components/coach-scroll/CoachPulseFeed.tsx` that renders the same data but with D System styling. The data source should be the same (pass the same props or use the same hook).
- Section header: "TEAM PULSE" in Outfit 13px weight 800 uppercase + "See All" link
- Each feed item: horizontal row with icon circle (34x34, borderRadius 10, tinted background), text body (12.5px weight 500, bold names/numbers), timestamp (10px, color rgba(0,0,0,.25))
- Feed items should show: badge earns, game results, challenge activity, shoutouts, photo uploads
- No card wrapper — items sit flat on the page background with subtle bottom borders (1px rgba(0,0,0,.04))

### 5B. Upgrade TrophyCaseWidget to Fortnite style

Create a NEW `components/coach-scroll/CoachTrophyCase.tsx` component. Do NOT modify the shared `TrophyCaseWidget.tsx` (it is used by Admin, Parent, and Player scrolls).

**Structure:**
- Dark navy card (gradient #0B1628 → #1a2d4a), borderRadius 20, padding 20
- Header row: "🏆 TROPHY CASE" in Outfit 13px weight 800 gold color + "2 / 25 Unlocked" text on right
- Badge grid: 4 columns, 2 rows (showing 8 badges)
  - Earned badges: background rgba(255,215,0,.12), border 1px rgba(255,215,0,.2), full-color emoji 26px, name text 7.5px white at 50%
  - Locked badges: background rgba(255,255,255,.03), border 1px rgba(255,255,255,.06), grayscale emoji at 25% opacity, name text white at 15%
  - Rarity dot: absolute positioned top-right, 6px circle. Epic = purple, Rare = sky, Common = green
- Level row below grid: 
  - Level badge circle (42px, gold gradient, bold level number in navy, box-shadow with gold glow)
  - Level text: "Level 10 · Silver" (11px, white at 50%, gold for "Silver")
  - XP bar: 6px height, rgba(255,255,255,.08) background, gold gradient fill
  - XP label: "4,500 / 5,200 XP" (9px, white at 30%)

The badge data comes from the existing achievement system (`getUnseenRoleAchievements`, `player_achievements` table, etc.). Show the most recently earned badges first, then locked ones sorted by proximity to unlock.

### 5C. Remove old TeamHubPreviewCard and Recent badges sections

These are replaced by Team Pulse and the Fortnite trophy case. Remove from the scroll rendering.

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: Coach Home D Phase 5 — team pulse feed + Fortnite trophy case"
git push
```

---

## PHASE 6: SCROLL ORDER + AMBIENT CLOSER + FINAL POLISH

### What changes:
- Reorder ALL sections in CoachHomeScroll.tsx to match the D System emotional arc.
- Add the ambient closer at the bottom.
- Remove any sections that no longer belong.
- Final visual polish pass.

### 6A. Set the final scroll order

The CoachHomeScroll render should output sections in EXACTLY this order:

1. **CompactMascotGreeting** (Phase 1)
2. **DynamicMessageBar** (Phase 1)
3. **GameDayHeroCard** with integrated readiness (Phase 2) — OR NextEventCard if no game
4. **MomentumCardsRow** (Phase 3)
5. **SquadFacesRow** (Phase 3)
6. **SmartNudgeCard** (Phase 4)
7. **ActionGrid2x2** (Phase 4)
8. **TeamPulseFeed** (Phase 5)
9. **FortntieTrophyCase** (Phase 5)
10. **AmbientCloser** (new — Phase 6)

**Sections that should NOT appear in the coach scroll render (remove the JSX, but DO NOT delete the component files — they stay in coach-scroll/ untouched):**
- Old centered mascot greeting
- PrepChecklist (standalone)
- ScoutingContext (standalone)
- QuickActions (vertical list)
- SeasonLeaderboardCard
- Old roster card
- TeamHubPreviewCard
- Old TrophyCaseWidget (replaced by Fortnite version)
- ChallengeQuickCard (challenge data is in momentum cards and action grid)
- ActionItems (moved into expandable attention strip in future spec — for now, keep as DynamicMessageBar content)
- SeasonSetupCard (keep if it handles pre-season state, otherwise remove)

### 6B. Build AmbientCloser component

Create `components/coach-scroll/AmbientCloser.tsx`

- Centered layout, padding 30px horizontal 40px, padding bottom 120px (above tab bar)
- Mascot emoji (32px, centered)
- Below: italic text, 13px, color textAmbient (rgba(11,22,40,.2)), weight 500, centered, line-height 1.5

Content logic (pick one based on context):
- If on a win streak: "[N]-game win streak. Your team is ready. Trust it."
- If next event is tomorrow: "Practice tomorrow. [Team name] is showing up."
- If season record is strong: "[W]-[L] season. The work is paying off."
- Default: "Trust the preparation. Your team is ready."

### 6C. Final polish

- Ensure page background is D_COLORS.pageBg (#FAFBFE)
- Ensure spacing between sections follows: 16-18px between major sections, 12-14px between tightly related sections
- Ensure the scroll has proper safe area padding at the top
- Ensure RefreshControl still works (pull to refresh)
- Ensure the scroll performance is smooth (no unnecessary re-renders — use React.memo on new components)
- Ensure the empty state (no org, no team) still works via NoOrgState and NoTeamState

### 6D. Verify nothing broke

```bash
# TypeScript check
npx tsc --noEmit

# Verify no imports reference deleted components that other files might use
grep -rn "SeasonLeaderboardCard\|TeamHubPreviewCard" --include="*.tsx" app/ components/ | grep -v "coach-scroll\|CoachHomeScroll" | grep -v "_legacy\|reference"

# If any other files import deleted components, those imports need to be preserved
# The component files themselves should NOT be deleted — only removed from CoachHomeScroll's render
# Other screens may still use them

git add -A
git commit -m "feat: Coach Home D Phase 6 — final scroll order, ambient closer, visual polish"
git push
```

---

## EXPECTED RESULTS

After all 6 phases:

1. **Compact greeting** — mascot left, text center, pill right. ~70px not ~200px.
2. **Dynamic message bar** — sky/coral/amber accent bar with contextual message.
3. **Game day hero** — dark navy card with team, opponent, readiness pips, action buttons, START GAME DAY. One unified unit.
4. **Momentum cards** — horizontal scroll gradient cards (streak coral, record green, attendance purple, kills sky).
5. **Squad faces** — overlapping circle avatars with YOUR SQUAD header.
6. **Smart nudge** — warm card with contextual suggestion (shoutout prompt, scouting info, etc.).
7. **2x2 action grid** — pastel-tinted cells with icons (Blast, Shoutout, Stats, Challenge).
8. **Team Pulse feed** — clean activity feed with icons, text, timestamps. No card wrapper.
9. **Fortnite trophy case** — dark navy card with 4x2 badge grid, rarity dots, level badge, XP bar.
10. **Ambient closer** — mascot + contextual italic message.
11. **Emotional arc** — warm opening → attention → hero peak → colorful momentum → context → engagement → activity → recognition → quiet closer.
12. **Zero new data dependencies** — all data comes from existing hooks.
13. **Zero navigation changes** — all tap targets go to the same destinations.
14. **6 commits** — one per phase, each pushed.

---

## AFTER THIS SPEC

Next specs in order:
1. `CC-PARENT-HOME-DPLUS-REDESIGN.md` — Parent home scroll D+ system
2. `CC-ADMIN-HOME-DPLUS-REDESIGN.md` — Admin home scroll D+ system  
3. `CC-PLAYER-HOME-DPLUS-REDESIGN.md` — Player home scroll D+ system with Journey entry point
