# CC-GESTURE-MENU-AND-HOME-FIXES.md
# Lynx Mobile — Gesture Menu Overhaul + Coach/Player/Parent Home Fixes

**Priority:** CRITICAL — multiple roles broken, gesture menu has UX problems  
**Estimated time:** 4-6 hours (6 phases, commit after each)  
**Risk level:** MEDIUM — touching gesture menu, all home scrolls, season detection

---

## PHASE 1: GESTURE MENU HEADER REDESIGN

The gesture menu header takes too much vertical space, leaving a tiny scrollable area for navigation items. Redesign it.

### 1A. New header layout

Replace the current header with a compact layout:

```
┌──────────────────────────────────────────┐
│  ┌──────┐  Carlos test                   │
│  │      │  Black Hornets Athletics       │
│  │ PHOTO│  [ADMIN] [PARENT] [HEAD COACH] [PLAYER] │
│  │      │  View Profile >  🌙/☀️         │
│  └──────┘                                │
└──────────────────────────────────────────┘
```

- **Profile photo:** Rounded rectangle (not circle), fills the left side of the header from top to bottom (~80px tall x 64px wide, borderRadius: 12px)
- **To the right of the photo:**
  - Person's name (bold, 16px, white)
  - Organization name (muted, 12px)
  - Role pills: the EXISTING colored pills (ADMIN, PARENT, HEAD COACH, PLAYER) — these ARE the role switcher now. The currently active role has a CLEAR highlight (teal fill + white text). Inactive roles are outlined/dimmed. Tapping an inactive pill switches roles.
  - "View Profile >" link + dark/light mode toggle icon on the same line

### 1B. Remove the separate ROLE selector section

The new role pills in the header replace the "ROLE" section with Admin/Coach/Parent/Player pills that was added in the previous spec. Delete that section entirely — the header pills do the same job more compactly.

### 1C. Season selector — collapsible

The season list takes too much space when expanded. Change it to:

- **Collapsed (default):** Single row showing the active season: "● Spring 2026 (Active)" with a dropdown chevron ▼
- **Tap to expand:** Shows all seasons in a dropdown/expandable list
- **Tap a season:** Switches season, collapses the list
- This saves vertical space — only ~40px when collapsed instead of ~150px for the full list

### 1D. Sport selector — remove if redundant

Since each season already has a sport associated with it, the sport selector is redundant when a season is selected. Remove the horizontal sport emoji circles (Volleyball, Basketball, Soccer, Baseball).

**EXCEPTION:** If the admin role is active AND the org has teams across multiple sports in the SAME season, keep a sport filter. Otherwise, remove it.

For the contextual selector (children for parents, teams for coaches):
- Keep it, but move it BELOW the season selector
- It should be a compact horizontal scroll (~60px tall)

### 1E. Final gesture menu layout

```
┌──────────────────────────────────────────┐
│  [PHOTO]  Name                           │
│           Org Name                       │
│           [ADMIN][PARENT][COACH][PLAYER]  │
│           View Profile >  🌙             │
├──────────────────────────────────────────┤
│  ● Spring 2026 (Active)            ▼    │
├──────────────────────────────────────────┤
│  [Child1] [Child2] [Ava]  (or teams)    │
├──────────────────────────────────────────┤
│  ┌─ SCROLLABLE NAVIGATION ─────────────┐│
│  │  Registration Hub            13 >   ││
│  │  My Children                    >   ││
│  │  Payments                       >   ││
│  │  Schedule                       >   ││
│  │  Team Hub                       >   ││
│  │  Achievements                   >   ││
│  │  ...                               ││
│  │  Sign Out                          ││
│  └─────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

The header + season + contextual selector are FIXED at top. Only the navigation section scrolls.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: gesture menu header redesign - compact layout, role pills, collapsible season"
git push
```

---

## PHASE 2: GESTURE MENU BEHAVIOR FIXES

### 2A. Auto-close on navigation

When any navigation item is tapped, the gesture menu should CLOSE AUTOMATICALLY and navigate to the selected page. Do NOT require the user to swipe the drawer closed after making a selection.

```typescript
const navigateTo = (route: string) => {
  closeDrawer(); // Close first
  setTimeout(() => {
    router.push(route);
  }, 150); // Small delay for smooth animation
};
```

Apply this to EVERY tappable item in the drawer: navigation items, role pills, season selector, child/team selector.

### 2B. Fix horizontal scroll gesture conflict

The horizontal child/team selector scroll conflicts with the drawer's swipe-to-close gesture. When the user tries to scroll the horizontal selector left-to-right, the drawer interprets it as a close gesture.

**Fix:** Add `activeOffsetX` to the drawer's pan gesture so it only triggers close when the swipe starts from the content area, NOT from within the horizontal scroll:

```typescript
// On the horizontal ScrollView, stop gesture propagation
<ScrollView
  horizontal
  onTouchStart={(e) => e.stopPropagation()}
  nestedScrollEnabled={true}
  // OR use a PanGestureHandler with simultaneousHandlers
/>
```

OR simpler: wrap the horizontal scroll in a view with `onStartShouldSetResponder={() => true}` to prevent the parent gesture from capturing.

### 2C. Navigation section is the only scrollable part

The header (photo + name + role pills), season selector, and contextual selector should be FIXED at the top. Only the navigation items below should scroll. Use a structure like:

```typescript
<View style={{ flex: 1 }}>
  {/* Fixed header */}
  <HeaderSection />
  <SeasonSelector />
  <ContextualSelector />
  
  {/* Scrollable nav */}
  <ScrollView style={{ flex: 1 }}>
    <NavItems />
  </ScrollView>
</View>
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: gesture menu auto-close, fix horizontal scroll conflict, fixed header"
git push
```

---

## PHASE 3: FIX COACH HOME — "NOTHING HAPPENING YET"

Same bug as admin home. Coach home shows "Nothing Happening Yet" despite active seasons with events.

### 3A. Debug coach home season detection

```bash
# Find the empty state trigger in coach home
grep -n "Nothing Happening\|NoSeason\|emptySeason\|Set Up Season\|nothingHappening" components/CoachHomeScroll.tsx | head -10

# Find the data hook
grep -n "season\|workingSeason\|activeSeason\|loading" hooks/useCoachHomeData.ts 2>/dev/null | head -15
```

### 3B. Apply the same fix as admin

The admin home was fixed by changing how it detects the active season. Apply the SAME season resolution logic to the coach home. Both should use the same `workingSeason` hook or query.

### 3C. Ensure the scroll stays mounted

Like the admin and parent fixes: do NOT use early returns before the ScrollView. Empty state content goes INSIDE the scroll.

### 3D. Verify season switching works

After fixing: switch seasons in the gesture menu → coach home should update to show that season's data. If a season has events, the home should show them. If genuinely empty, show the empty state WITH the header visible.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: fix coach home season detection - same pattern as admin fix"
git push
```

---

## PHASE 4: PLAYER HOME — MISSING FEATURES + BILLBOARD HERO

The player home screen is missing access to key features and shows "no events" when events exist.

### 4A. Fix player home event detection

Same season detection bug as admin and coach. Apply the same fix.

```bash
grep -n "Nothing Happening\|NoSeason\|no.*event\|upcoming.*empty" components/PlayerHomeScroll.tsx | head -10
```

### 4B. Add billboard hero to player home

Players should get the same auto-cycling billboard hero as parents (adapted for player context):

- Show upcoming events for the player's team(s)
- Sport-themed gradient backgrounds
- RSVP button (if player can RSVP) or "Game Day" countdown
- Auto-cycles if multiple events
- "Also this week" strip below

Reuse the `BillboardHero` component from the parent redesign (or create a shared version).

### 4C. Add missing feature access to player home

The player home should have easy access to ALL player features. Add these sections/cards:

**My Progress section:**
- Trading card preview (compact, tappable → full trading card)
- XP/Level progress bar
- "View Full Card →"

**Coach's Challenges section:**
- Active challenges the player is in (or available to join)
- Progress on each challenge
- "View All Challenges →" → `/achievements` challenges tab
- If no challenges: don't show the section

**Trophy Case / Achievements:**
- Recent badges earned (last 3)
- "View Trophy Case →" → `/achievements`

**My Development:**
- Latest evaluation summary (if available): "Last eval: 4.2 OVR on Feb 28"
- Skill bars preview (top 3 skills)
- "View Full Evaluation →" → `/child-detail` or player development page

**My Stats:**
- Season stat highlights: kills, aces, digs (power bars)
- "View All Stats →"

**Team section:**
- Team Hub preview (latest post or shoutout)
- "View Team Hub →"
- Roster preview

### 4D. Wire all player cards to correct routes

Every card on the player home must have a working onPress:

| Card | Route |
|------|-------|
| Trading card preview | `/player-card?playerId=${ownId}` |
| Challenge card | `/challenge-cta?challengeId=X` or `/achievements` |
| Trophy case | `/achievements` |
| Development/Evaluation | `/achievements` or player dev page |
| Stats | `/my-stats` or player stats page |
| Team Hub | `/parent-team-hub` or team hub tab |
| Event hero card | Event detail |

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: player home - fix events, add billboard hero, add missing feature cards"
git push
```

---

## PHASE 5: PARENT HOME — HERO ALIGNMENT + PLAYER LIST FIX

### 5A. Fix hero card alignment

The billboard hero card is not center-aligned — it appears shifted. Check:

```bash
grep -n "margin\|padding\|align\|justify\|width" components/parent-scroll/BillboardHero.tsx | head -15
```

The hero card should be:
- `marginHorizontal: 16` (equal on both sides)
- Full width minus 32px total margin
- Content centered within the card
- No asymmetric padding

### 5B. Fix duplicate player cards

The parent home is showing a long list of repeating player cards (Sister 1, Sister 2, Sister 1, Sister 2...). The data hook is returning duplicate entries.

```bash
# Check if the hook returns duplicates
grep -n "children\|players\|athlete\|allChildren" hooks/useParentHomeData.ts | head -15
```

The query is likely joining across multiple tables and creating duplicates (e.g., a child on 2 teams shows up 2x, or the same child appears once per season). Fix by:
- Deduplicating by `player_id` after the query
- Or using `DISTINCT` in the Supabase query
- Or grouping: one card per unique child, with multiple sport pills on each card

### 5C. Family Quick View panel (right-to-left gesture)

This was discussed but may not have been built yet. Check:

```bash
ls -la components/FamilyPanel.tsx 2>/dev/null
grep -rn "FamilyPanel\|familyPanel\|rightSwipe\|swipeRight" components/ app/ --include="*.tsx" | head -5
```

If it doesn't exist yet: for now, skip the gesture-based panel. The context switching from sport pills on the player cards + the gesture drawer's child selector handle the same need. The Family Panel can be added in a future pass when the parent home redesign spec runs.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: parent home - fix hero alignment, fix duplicate player cards"
git push
```

---

## PHASE 6: CHALLENGE SUBMISSION FIX + VERIFY EVERYTHING

### 6A. Fix challenge submission

Carlos reported he could not submit a challenge to the team last night from the coach view. Debug:

```bash
# Find the challenge creation flow
grep -rn "createChallenge\|submitChallenge\|issueChallenge" --include="*.tsx" --include="*.ts" app/ lib/ | grep -v "node_modules" | grep -v "reference/" | head -10

# Check if it's a season/team context issue (coach has no active season)
grep -n "teamId\|team_id\|seasonId\|season_id" app/create-challenge.tsx 2>/dev/null | head -10
```

If the challenge creation depends on having an active season/team context, and the coach home shows "Nothing Happening Yet" (no season detected), that would explain why challenges can't be submitted — there's no team context to attach the challenge to.

Fixing the coach home season detection (Phase 3) may fix this too. After Phase 3, re-test challenge creation.

If the issue persists, check:
- Does the create challenge screen receive the teamId?
- Does the Supabase insert have the right permissions (RLS)?
- Is there a FK constraint failing (like the achievement engine bug)?

### 6B. Verify all roles

After all fixes, test each role:

**Admin:**
- [ ] Home shows data (not empty state) when active season exists
- [ ] Gesture menu: role pills switch roles
- [ ] Gesture menu: season selector works (collapsed by default)
- [ ] Gesture menu: sport selector present only if multi-sport in same season
- [ ] Gesture menu: auto-closes on navigation item tap

**Coach:**
- [ ] Home shows data (not empty state)
- [ ] Can create and submit a challenge
- [ ] Gesture menu: team selector shows assigned teams
- [ ] Season switching works

**Parent:**
- [ ] Hero card centered properly
- [ ] Player cards not duplicated (each child once with sport pills)
- [ ] All buttons tappable (no touch regression)
- [ ] Gesture menu: child selector shows children's photos

**Player:**
- [ ] Billboard hero shows upcoming events
- [ ] Challenge cards visible and tappable
- [ ] Trophy case / achievements accessible
- [ ] Development / evaluation card accessible
- [ ] All cards have working onPress handlers

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 6: challenge fix, verify all roles, no touch regression"
git push
```

---

## EXPECTED RESULTS

1. **Gesture menu header compact** — rounded rect photo, name, org, role pills (these ARE the switcher), view profile + dark mode toggle. No separate ROLE section needed.
2. **Season selector collapsible** — single row when collapsed, expands on tap. Saves vertical space.
3. **Sport selector removed** (unless multi-sport same season for admins)
4. **Auto-close on tap** — drawer closes when any item is selected
5. **No horizontal scroll conflict** — child/team selector scrolls without triggering drawer close
6. **Fixed header, scrollable nav** — header/season/contextual selector pinned, only nav items scroll
7. **Coach home FIXED** — shows data when active season exists
8. **Player home ENHANCED** — billboard hero, challenges, trophy case, development, stats, team hub access
9. **Parent hero aligned** — centered, no offset
10. **Parent player cards deduplicated** — each child once with all sport pills
11. **Challenge submission working** — coaches can create challenges
12. **6 commits** — one per phase, each pushed
