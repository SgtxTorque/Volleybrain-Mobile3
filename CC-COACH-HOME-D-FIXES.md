# CC-COACH-HOME-D-FIXES.md
# Lynx Mobile — Coach Home D System: Targeted Fixes
# This is NOT a redesign. These are specific bug fixes and adjustments.

**Priority:** HIGH — Fix issues from Phase 1 execution
**Estimated time:** 2-3 hours (8 targeted fixes, commit after each)
**Risk level:** LOW — Surgical changes only

---

## PREREQUISITE

1. Read CC-LYNX-RULES.md
2. Read AGENTS.md — "Keep edits minimal and localized"
3. Read the COACH-HOME-D-CHANGELOG.md to understand what was built in the last session

---

## FILE SCOPE

### FILES YOU MAY MODIFY:
- `components/CoachHomeScroll.tsx` — Only to adjust section order or remove a section
- `components/coach-scroll/GameDayHeroCard.tsx` — Fix the hero card issues
- `components/coach-scroll/MomentumCardsRow.tsx` — Make cards tappable
- `components/coach-scroll/SquadFacesRow.tsx` — Show player photos when available
- `components/coach-scroll/ActionGrid2x2.tsx` — Verify this is rendering as 2x2 grid, NOT vertical list
- `components/coach-scroll/DynamicMessageBar.tsx` — May need to be removed from render if redundant
- `components/coach-scroll/AmbientCloser.tsx` — Fix the mascot emoji
- `components/coach-scroll/CoachTrophyCase.tsx` — No changes needed, just confirming

### FILES YOU MAY CREATE:
- `components/coach-scroll/TeamStatsChart.tsx` — New component for stat bar graphs

### FILES YOU MUST NOT MODIFY:
- Everything on the original MUST NOT MODIFY list still applies
- Do NOT touch theme files unless a color is genuinely missing
- Do NOT touch any hooks or data files
- Do NOT touch any other role's files

---

## FIX 1: REMOVE REDUNDANT CARD ABOVE HERO

The DynamicMessageBar currently shows the same game day information that the hero card shows. It's redundant — both say "Game day — Black Hornets Elite vs To to at 10:00 AM."

**Fix:** In CoachHomeScroll.tsx, remove the DynamicMessageBar from the render when a game day hero card is present. The DynamicMessageBar should ONLY render when there is NO game today — for example, showing a practice reminder, a scouting note, or an action nudge on non-game days.

Add a condition: if today has a game event AND the GameDayHeroCard is rendering, skip the DynamicMessageBar. Otherwise, show it.

```
npx tsc --noEmit
git add -A
git commit -m "fix: hide DynamicMessageBar when game day hero card is present — removes redundancy"
git push
```

---

## FIX 2: GAME DAY HERO CARD CLEANUP

The hero card has several issues. Fix ALL of these in GameDayHeroCard.tsx:

**2A. Add location back.** The card is missing the location line (e.g., "📍 Fieldhouse"). Find where the location/venue data is available in the event object and add it below the "vs [Opponent]" line. Style: font-size 11, color rgba(255,255,255,0.3), weight 500.

**2B. Fix volleyball opacity.** The volleyball icon/emoji in the top-right corner is too faded. Change its opacity from whatever it currently is to 0.15 (not lower). It should be subtle but visible.

**2C. Fix START GAME DAY button positioning.** The button is sitting on the edge of the card. It needs proper padding/margin inside the card. The bottom section (confirmation count + START GAME DAY button) should have horizontal padding matching the card's internal padding (likely 22px). If the bottom section has a different background (darker overlay), make sure it has borderRadius on the bottom corners matching the card's borderRadius (22).

**2D. Add back the attendance button.** The original card had 4 action buttons: Roster, Lineup, Stats, Attend. The new card only has 3 (Roster, Lineup, Stats). Add "Attend." back as the 4th button with the same styling as the other three. Navigation target should be the attendance screen.

Do NOT change anything else about the hero card. The readiness pips, team name, opponent, badge, and time are all correct.

```
npx tsc --noEmit
git add -A
git commit -m "fix: hero card — add location, fix volleyball opacity, fix button padding, add attend button"
git push
```

---

## FIX 3: MAKE MOMENTUM CARDS TAPPABLE

The three momentum cards (Win Streak, Record, Top Kills) currently display data but are not tappable. They need to navigate somewhere useful on tap.

**Fix in MomentumCardsRow.tsx:**
- Win Streak card → navigate to standings or season record screen
- Record card → navigate to standings or season record screen
- Attendance card (if present) → navigate to attendance screen
- Top Kills card → navigate to stats screen or team leaderboard

Wrap each card in a TouchableOpacity. Add the router.push() calls. Use the same navigation targets that the old SeasonLeaderboardCard or TeamHealthCard used — check those files in coach-scroll/ for the correct route paths.

Also add light haptic feedback on tap: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`

```
npx tsc --noEmit
git add -A
git commit -m "fix: momentum cards now tappable — navigate to stats/standings on tap"
git push
```

---

## FIX 4: SQUAD FACES SHOW PLAYER PHOTOS

Currently the SquadFacesRow shows colored circles with initials (and question marks for players without first names). Players who have profile photos should show their actual photo instead of initials.

**Fix in SquadFacesRow.tsx:**
- Check if each player has a `photo_url` or `avatar_url` field in their profile data
- If they have a photo: render an `<Image>` (or `<ExpoImage>`) with the photo URL, same dimensions as the circle (40x40), borderRadius 50%
- If they don't have a photo: keep the current colored circle with initial
- Fix the "?" fallback — if a player has no first name, show the first letter of their last name, or a generic user icon. Do NOT show "?"

Check how the existing PlayerCard or RosterCarousel components handle player photos — use the same pattern for the image URL and fallback logic.

```
npx tsc --noEmit
git add -A
git commit -m "fix: squad faces show player headshots when available, fix ? fallback"
git push
```

---

## FIX 5: ACTION GRID MUST BE 2x2, NOT VERTICAL LIST

Looking at the screenshot, Send Blast / Give Shoutout / Review Stats / Create Challenge are rendering as a VERTICAL list of full-width cards, not the 2x2 grid that was specified.

**Fix in ActionGrid2x2.tsx:**
- Verify the container uses `flexDirection: 'row'` with `flexWrap: 'wrap'` OR `display: 'flex'` with a 2-column layout
- Each action cell should be approximately 50% width minus gap
- If using a ScrollView or FlatList, remove it — this should be a simple View with flex layout
- The pastel background colors should be visible (check screenshots — they appear to be rendering)
- Each cell should have: icon circle on the left, text label on the right, in a horizontal row
- NOT: full-width stacked cards with icon on the left and text on the right (that's a list, not a grid)

If ActionGrid2x2.tsx is already correctly coded as a grid but CoachHomeScroll.tsx is rendering the OLD QuickActions component instead, then the fix is in CoachHomeScroll.tsx — swap the import.

```
npx tsc --noEmit
git add -A
git commit -m "fix: action grid renders as 2x2 grid, not vertical list"
git push
```

---

## FIX 6: AMBIENT CLOSER — USE ACTUAL MASCOT IMAGE

The closing message at the bottom of the scroll is using a generic paw print emoji instead of the Lynx mascot.

**Fix in AmbientCloser.tsx:**
- Replace the emoji with the actual mascot image asset
- Use: `require('../../assets/images/mascot/SleepLynx.png')` or `require('../../reference/design-references/images/SleepLynx.png')` — check which path the app uses for mascot images
- Look at how the greeting section at the top of CoachHomeScroll loads the mascot image and use the same pattern
- Size: 40x40 or 48x48, resizeMode "contain", centered above the text
- If the asset path doesn't work, check how other components (like the greeting or empty states) import mascot images and match that pattern

```
npx tsc --noEmit
git add -A
git commit -m "fix: ambient closer uses actual mascot image, not generic emoji"
git push
```

---

## FIX 7: ADD TEAM STATS BAR CHART

After the Trophy Case and before the Ambient Closer, add a new section showing team stat bar graphs.

**Create `components/coach-scroll/TeamStatsChart.tsx`:**

This should be a card showing 4-5 key team stats as horizontal bar graphs. Inspired by the heart rate variability chart style — clean, modern, using brand colors.

**Layout:**
- Section header: "TEAM STATS" (Outfit/PlusJakartaSans ExtraBold, 13px, uppercase, letterSpacing 0.5) + "View All" link on right
- White card with light border, borderRadius 18, padding 18
- Each stat row:
  - Label on the left (e.g., "Kills", "Assists", "Aces", "Blocks", "Digs") — 12px, weight 600, color textPrimary
  - Horizontal bar in the middle — height 10px, borderRadius 5px, background rgba(0,0,0,0.04) for track, filled portion uses brand gradient colors
  - Value on the right — 14px, weight 800, color textPrimary
- Bars should be proportional (highest stat = full width, others scaled relative)
- Use these colors for different stats:
  - Kills: coral (#FF6B6B)
  - Assists: sky (#4BB9EC)
  - Aces: green (#22C55E)
  - Blocks: purple (#8B5CF6)
  - Digs: amber (#F59E0B)

**Data source:** Pull from the same season stats data that the old SeasonLeaderboardCard used. Check `useCoachHomeData` hook for available stat aggregates. If individual stat categories aren't available, use whatever team-level stats ARE available (total kills, total aces, win rate, etc.).

**In CoachHomeScroll.tsx:** Add TeamStatsChart between CoachTrophyCase and AmbientCloser in the scroll order.

The card should be tappable — navigate to the full stats/report screen on tap.

```
npx tsc --noEmit
git add -A
git commit -m "feat: add team stats bar chart section after trophy case"
git push
```

---

## FIX 8: GENERATE CHANGELOG

Create `COACH-HOME-D-FIXES-CHANGELOG.md` in the repo root:

1. FILES CREATED — list new files
2. FILES MODIFIED — list each file with what changed (line-level specifics)
3. ISSUES FIXED — map each fix number to what was wrong and how it was resolved
4. NAVIGATION TARGETS — confirm all tappable elements go to correct screens
5. DATA SOURCES — confirm what data hooks/queries feed each component
6. REMAINING ISSUES — anything that still needs attention

```
git add -A
git commit -m "docs: Coach Home D fixes changelog"
git push
```

---

## EXPECTED RESULTS

After all 8 fixes:
1. No redundant card above hero on game days
2. Hero card shows location, proper volleyball opacity, clean button padding, all 4 action buttons
3. Momentum cards are tappable and navigate to relevant screens
4. Squad faces show actual player photos when available
5. Actions render as a 2x2 pastel grid, not a vertical list
6. Closer uses actual Lynx mascot image
7. Team stats bar chart appears after trophy case
8. Changelog documenting every change
