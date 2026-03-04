# CC-WAVE-4-PLAYER-IDENTITY.md
# Lynx Mobile — Wave 4: Player Identity & Gamification Screens

**Priority:** Run after CC-WAVE-3-DAILY-USE-SCREENS completes  
**Estimated time:** 3–4 hours (5 phases, commit after each)  
**Risk level:** MEDIUM — these are emotional, high-design screens but no structural changes  

---

## WAVE CHECKLIST (update as completed)

- [ ] **Wave 0** — Archive dead code + wire admin stubs
- [ ] **Wave 1** — Kill ParentOnboardingModal + shared components brand pass
- [ ] **Wave 2** — Auth redesign + smart empty states
- [ ] **Wave 3** — Daily-use screens (Schedule, Chat, Team Hub)
- [ ] **Wave 4** — Player identity screens ← THIS SPEC
- [ ] Wave 5 — Coach tool screens (Attendance, Game Results, Lineup Builder)
- [ ] Wave 6 — Admin management screens
- [ ] Wave 7 — Settings, legal, remaining screens
- [ ] Wave 8 — New/planned screens

---

## REFERENCE FILES — READ BEFORE WRITING ANY CODE

Read `LYNX-REFERENCE-GUIDE.md` in the repo root for the full reference map.

### Critical for this wave — read these first:

1. **`reference/design-references/player-mockups/m2-player-card.tsx`** — READ THIS FIRST. This is the v0-designed player card. Study the layout, colors, stat presentation, badge treatment. Translate the visual design to React Native.

2. **`reference/design-references/player-mockups/m1-roster-carousel.tsx`** — Roster carousel pattern. Relevant for how player cards appear in list contexts.

3. **`reference/design-references/player-mockups/s1-player-home.tsx`** — Player home screen design reference. Shows the overall player visual language.

4. **`reference/design-references/player-mockups/s2-badges-challenges.tsx`** — Badges and challenges layout. This is the design direction for the Achievements Catalog.

5. **`reference/design-references/player-mockups/s4-game-recap.tsx`** — Game recap design. Relevant for stat presentation patterns.

6. **`reference/design-references/player-mockups/globals.css`** — CSS variables used across all player mockups. Extract color values, spacing, and shadow patterns.

### Standard references:

7. `reference/design-references/brandbook/LynxBrandBook.html` — Brand system
8. `reference/design-references/brandbook/lynx-screen-playbook-v2.html` — Open and read "Player Identity & Gamification" section in the `screens` array
9. `reference/supabase_schema.md` — Database schema for players, player_stats, achievements, challenges tables
10. `theme/colors.ts` and `lib/design-tokens.ts` — Design tokens (updated in Wave 1)

### Mascot images:
11. `assets/images/mascot/celebrate.png` — For achievement unlock moments
12. `assets/images/mascot/SleepLynx.png` — For empty stat states

---

## DESIGN PHILOSOPHY FOR THIS WAVE

These screens are where **pride lives**. Parents screenshot Child Detail for grandparents. Players share My Stats with friends. The Achievements Catalog is the trophy room.

Every screen in this wave should feel like it belongs in a sports video game — not a spreadsheet app. Bold typography, confident number presentation, color-coded stats, glow effects on earned achievements. This is the emotional core of what makes Lynx different from TeamSnap.

The PLAYER_THEME (dark mode) was established in PlayerHomeScroll. My Stats should continue that dark theme. Child Detail can be either light (parent context) or dark (player context) depending on who's viewing.

---

## PHASE 1: CHILD DETAIL / PLAYER DETAIL — THE TRADING CARD

`app/child-detail.tsx` — Parents navigate here from their home scroll or "My Kids" screen.

This is the **trading card screen**. Parents screenshot this for grandparents. It should feel premium, proud, and share-worthy.

### 1A. Hero Section (top 40% of screen)

- Player photo: **edge-to-edge**, no border radius at top. Photo fills full width.
- If no photo: team color gradient background with large initials
- Gradient overlay from bottom: transparent → team color (60% opacity) → dark
- Over the gradient at bottom:
  - Player name: display font, large, white, bold
  - Jersey number: huge, semi-transparent in background (like a watermark) — think FIFA card
  - Team name: small pill badge with team color
  - Position: colored pill (use position colors from brand system if defined)

### 1B. Content Below Hero — Tab Navigation

PillTabs below the hero: **Overview** | **Stats** | **Badges** | **Activity**

**Overview tab (default):**
- Season snapshot card: games played, attendance %, team record contribution
- Recent form: last 5 games as colored dots (W=teal, L=coral, DNP=gray)
- Key stats: 2x2 grid of the player's top stats with large numbers and labels
- Coach notes (if any exist): quoted text in a subtle card

**Stats tab:**
- Stat categories from the database (kills, digs, aces, blocks, serve %, etc.)
- Each stat: large number + label + trend arrow (up=teal, down=coral, same=gray)
- If historical data exists: small sparkline showing season progression
- Overall Rating (OVR): FIFA-style badge, prominently displayed. Big number in a hexagonal or circular badge with brand gradient.

**Badges tab:**
- Grid of earned achievement badges (3 columns)
- Earned: full color with subtle glow
- In-progress: color but slightly faded, progress bar below
- Count: "7 of 47 earned"
- Tap a badge to see detail (name, description, date earned)

**Activity tab:**
- Recent timeline: shoutouts received, challenges completed, badges earned, game appearances
- Chronological list with date headers
- Each item: icon + description + timestamp

### 1C. Share Button

Top-right of the hero: share icon. Tapping captures the trading card (hero + key stats) as an image and opens the native share sheet. If this is complex, just share a text summary: "[Player Name] — #[Jersey] [Position] — [Team Name]". The image capture can be a future enhancement.

### 1D. Parent-Specific Actions

If the viewer is a parent (not a player viewing their own profile):
- "Edit Info" button somewhere accessible (not prominent — subtle in header or kebab menu)
- "View Waivers" link
- "Payment Status" indicator

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: child detail trading card - hero, tabs, stats, badges, activity"
git push
```

---

## PHASE 2: MY STATS — THE VIDEO GAME STATS SCREEN

`app/my-stats.tsx` — Players see this for themselves. Dark PLAYER_THEME.

This should feel like checking your stats in a video game. FIFA, Madden, 2K — that energy.

### 2A. Overall Rating (OVR) Hero

- Dark background (PLAYER_THEME)
- Large circular or hexagonal badge, center-top
- OVR number: massive (48-60pt), glowing with brand gradient (teal → sky)
- Subtitle: "Overall Rating" in secondary text
- If the player's OVR has changed recently: show delta arrow + number ("↑ 3 since last eval")

### 2B. Stat Category Cards

- 2-column grid of stat cards
- Each card:
  - Stat name: small label (uppercase, letter-spaced)
  - Stat value: large bold number
  - Trend arrow: teal up-arrow if improved, coral down-arrow if declined, gray dash if same
  - Mini sparkline: 6-8 data points showing season trend (thin line, teal)
  - Card background: dark surface with subtle border

**Stat categories** (volleyball-specific, from the database — adapt to whatever stats exist):
- Kills, Digs, Aces, Blocks, Serve %, Pass Rating, Sets, Hit %
- Show whatever stat fields exist in the player_stats table

### 2C. Game Log

Below the stat cards:
- Section header: "GAME LOG"
- Reverse chronological list of games
- Each row: date, opponent, result (W/L), key stat highlights for this player in that game
- Tap a row: could navigate to game detail (if it exists) or just show expanded stats inline

### 2D. My Stats Empty State

If the player has no stats yet:
- `SleepLynx.png` mascot
- "No stats yet! Your stats will appear here after your first game."
- Encouraging, not disappointing

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: my stats screen - OVR badge, stat cards with sparklines, game log"
git push
```

---

## PHASE 3: ACHIEVEMENTS CATALOG — THE TROPHY ROOM

`app/achievements.tsx` — All roles can view. CoD barracks energy.

### 3A. Header Stats

- Progress summary: "14 of 47 Unlocked" with a thin progress bar (teal fill)
- XP or points total if the gamification system tracks total XP

### 3B. Category Tabs

PillTabs for achievement categories:
- "All" | category names from the achievement types in the database
- Categories might include: Performance, Attendance, Social, Milestones, Special
- Active tab: teal fill. Inactive: outlined.

### 3C. Badge Grid

3-column grid of achievement badges:

**Earned badges:**
- Full color icon/image
- Subtle glow effect (shadow with achievement rarity color)
- Rarity indicator: thin colored border (Common=gray, Rare=teal, Epic=gold, Legendary=coral)
- Name below: small text
- Date earned: tiny text below name

**Locked badges (not yet earned):**
- Grayscale version of the icon
- Small lock icon overlay (bottom-right corner)
- Name below in secondary text
- Tap → shows requirement: "Score 10 aces in a season (7/10)" with progress bar

**In-progress badges:**
- Slightly desaturated color (not full grayscale, not full color)
- Progress bar below: "7/10" with teal fill
- No lock icon — it's clearly in progress

### 3D. Badge Detail (Bottom Sheet)

Tap any badge → bottom sheet with:
- Badge icon large (centered, 80x80)
- Badge name in display font
- Rarity pill
- Description
- If earned: date earned, celebration mascot (small)
- If locked: requirement, current progress, progress bar
- If the badge was recently earned (within last 7 days): `celebrate.png` mascot in the sheet

### 3E. Achievements Empty State

No achievements in this category:
- `Meet-Lynx.png` mascot with encouraging face
- "Keep playing! Achievements unlock as you participate."

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: achievements catalog - category tabs, badge grid, rarity glows, detail sheet"
git push
```

---

## PHASE 4: CHALLENGES + STANDINGS BRAND PASS

### 4A. Challenge List

Challenges are being built by CC-NEXT-FIVE (Feature 2). If the screen exists at `app/challenges.tsx`, give it a brand pass. If it doesn't exist yet, SKIP this sub-phase entirely — do not build it from scratch.

**If it exists, restyle:**
- Filter pills: "Active" | "Completed" | "Expired"
- Active challenges: Tier 1 cards (elevated, prominent)
  - Challenge name in display font
  - Progress bar (teal fill)
  - Deadline: "3 days left" in gold if < 7 days, coral if < 24 hours
  - XP reward badge
  - Participant count: avatar row + "+N"
- Completed challenges: Tier 2 flat rows with checkmark
- Expired: Tier 2 flat rows, muted/greyed

**Coach FAB:** If role is coach, show FAB to create new challenge → `CreateChallengeModal`

### 4B. Challenge Detail

If `ChallengeDetailModal.tsx` exists, brand pass:
- Bottom sheet format
- Large circular progress ring (center)
- Challenge description
- Participant leaderboard (ranked by progress)
- Days remaining with countdown urgency
- Players: "Log Progress" button
- Parents: read-only view

### 4C. Standings / Leaderboards

`app/standings.tsx` — Built by CC-LEADERBOARDS-BUILD, status is DONE.

Verify it uses brand colors and tokens from Wave 1. If it already looks correct, skip. If it needs minor adjustments:
- Rank numbers: bold, slightly larger
- W-L-T records: clear formatting
- Team rows: brand card styling with team color indicator
- Leaderboard stat categories: PillTabs for switching categories
- Player rows: avatar + name + stat value, ranked

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: challenges brand pass (if exists), standings verification"
git push
```

---

## PHASE 5: VERIFY EVERYTHING

```bash
# 1. Type check
npx tsc --noEmit

# 2. Verify player mockups were referenced (check that styling patterns match)
# Manual: open child-detail.tsx and my-stats.tsx, visually compare against
# reference/design-references/player-mockups/m2-player-card.tsx

# 3. Verify mascot images are used in empty states
grep -rn "SleepLynx\|celebrate\|Meet-Lynx" --include="*.tsx" app/my-stats.tsx app/achievements.tsx app/child-detail.tsx
# Expected: at least 2-3 results

# 4. Verify PLAYER_THEME dark mode on my-stats
grep -rn "PLAYER_THEME\|playerTheme\|darkBackground\|#0A1628" --include="*.tsx" app/my-stats.tsx
# Expected: dark theme references

# 5. Files changed
git diff --stat HEAD~4

# 6. Final commit
git add -A
git commit -m "Phase 5: Wave 4 verification and cleanup"
git push
```

---

## EXPECTED RESULTS

1. **Child Detail** — Premium trading card screen. Edge-to-edge hero photo with jersey number watermark, team gradient overlay, tabbed content (Overview/Stats/Badges/Activity). Parents will screenshot this.

2. **My Stats** — Dark PLAYER_THEME. Massive OVR badge with glow. 2-col stat cards with trend arrows and sparklines. Game log. Feels like FIFA/2K stats screen.

3. **Achievements Catalog** — Trophy room with CoD barracks energy. Category tabs, 3-col badge grid, earned=glowing, locked=grayscale+lock, in-progress=desaturated with progress bar. Bottom sheet detail on tap.

4. **Challenges** — Branded if screens exist from CC-NEXT-FIVE. Active cards with progress bars and deadlines. Coach FAB for creation.

5. **Standings** — Verified and consistent with Wave 1 brand tokens.

6. **All empty states use real mascot images** — SleepLynx for "no data", celebrate for recent achievements, Meet-Lynx for encouragement.

7. **5 commits** — one per phase, each pushed.

---

## WHY THIS WAVE MATTERS

These are the screens that make parents feel proud and players feel recognized. They're the screens people screenshot and share. They're the reason a parent tells another parent "you have to see this app." If the home scroll is the daily utility, these screens are the emotional payoff. They should feel like the best part of a sports video game — bold, confident, celebratory.
