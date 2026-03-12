# CC-ADMIN-HOME-FIX-AND-DRAWER-REDESIGN.md
# Lynx Mobile — Admin Home Fix + Gesture Drawer Redesign

**Priority:** CRITICAL — admin home is broken, role switching unreliable  
**Estimated time:** 2-3 hours (4 phases, commit after each)  
**Risk level:** LOW — fixing data queries and adding UI to existing components

---

## PHASE 1: FIX ADMIN HOME "NOTHING HAPPENING YET"

The Admin home shows "Nothing Happening Yet" with a sleeping mascot and "Set Up Season" button. But the Schedule tab shows active events (March 9, 10, 17). The season detection is broken.

### 1A. Debug the empty state trigger

```bash
# Find what triggers the empty state
grep -n "Nothing Happening\|nothingHappening\|NoSeason\|noSeason\|emptySeason\|Set Up Season" components/AdminHomeScroll.tsx | head -10

# Find the season detection query
grep -n "season\|workingSeason\|activeSeason" hooks/useAdminHomeData.ts hooks/useHomeData.ts hooks/useSeason.ts 2>/dev/null | head -20

# Compare with the schedule tab's query — IT finds the season
grep -n "season\|workingSeason" app/\(tabs\)/admin-schedule.tsx app/\(tabs\)/schedule.tsx 2>/dev/null | head -10
```

### 1B. Fix the season detection

The Schedule tab can find the season and its events. The admin home cannot. They should use the same season resolution. Common causes:
- Admin home checks `seasons.status = 'active'` but the status value is something else (like 'current' or 'in_progress')
- Admin home filters by date range that excludes the current season
- The `workingSeason` hook returns null on first render but the admin home doesn't wait for it
- The admin home has an early return that fires before the data loads

Fix it so the admin home finds the same season the schedule does.

### 1C. Fix the empty state to never hide the header

If the empty state replaces the ENTIRE screen (including header with role selector), restructure:

```bash
# Check for early returns that replace everything
grep -n "return.*NoSeason\|return.*EmptySeason\|return.*Nothing" components/AdminHomeScroll.tsx | head -5
```

The empty state should only replace the CONTENT area. The header (LYNX logo, notification bell, role selector) must ALWAYS render above it. Move any early returns to be INSIDE the scroll content, not replacing the entire component.

**CRITICAL:** Do NOT use early returns before the ScrollView. We fixed a touch-blocking bug caused by this pattern. The ScrollView must always stay mounted. Empty states go INSIDE the scroll.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: fix admin home season detection, empty state never hides header"
git push
```

---

## PHASE 2: ADD ROLE SELECTOR AND SEASON SELECTOR TO GESTURE DRAWER

The gesture drawer (More menu) must have Role Selector and Season Selector at the TOP, before navigation items. This gives users a guaranteed way to switch roles and seasons even if the header is broken or hidden.

### 2A. Role Selector

Place at the VERY TOP of the drawer, before any navigation sections.

- Only show if the user has multiple roles
- Display as tappable pills in a row: "Admin" / "Coach" / "Parent" / "Player"
- Active role: filled teal pill
- Inactive roles: outlined, brand border
- Tapping switches the role, closes the drawer, navigates to the new role's home tab
- Section header: "ROLE" (uppercase, letter-spaced, muted — matches drawer section header style)

### 2B. Season Selector

Below the role selector, above navigation sections.

- Show all seasons for the current org: active, upcoming, and recent archived
- Each season as a tappable row:
  - Active season: teal dot + "Spring 2026" + "(Active)" badge
  - Upcoming: gray dot + "Summer 2026" + "(Upcoming)" badge  
  - Archived: dimmed text
- Tapping switches the working season context
- Section header: "SEASON"

### 2C. Layout in drawer

```
┌──────────────────────────┐
│  ROLE                    │
│  [Admin] [Coach] [Parent]│
│                          │
│  SEASON                  │
│  ● Spring 2026 (Active)  │
│  ○ Summer 2026 (Upcoming)│
│  ────────────────────────│
│  [Contextual Selector]   │  ← Phase 3 adds this
│  ────────────────────────│
│  Dashboard               │
│  Team Management         │
│  ...                     │
└──────────────────────────┘
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: role selector and season selector in gesture drawer"
git push
```

---

## PHASE 3: REDESIGN GESTURE DRAWER HORIZONTAL SECTION

The gesture drawer currently has a horizontal scroll of generic icon buttons near the top. Remove that entirely and replace it with a CONTEXTUAL selector based on the user's role.

### 3A. Find and remove the old horizontal buttons

```bash
# Find the current horizontal button section
grep -n "horizontal\|scroll.*button\|quick.*action\|shortcut\|QuickAction" components/GestureDrawer.tsx | head -15
```

Remove the old generic icon buttons.

### 3B. Build the contextual selector

Place below the Role + Season selectors, above the navigation sections.

**For Parents — Child Selector:**
- Horizontal scroll of child avatars
- Each child: their actual photo (60px circle) or initials with gradient background if no photo
- First name below (10px, bold, truncated to 1 line)
- Active child: teal ring around the avatar
- Tapping a child filters the app context to that child
- If only one child: still show them (confirms context, no empty space)
- Query: fetch from `player_parents` → `players` for this parent's children

**For Coaches — Team Selector:**
- Horizontal scroll of team logos/avatars
- Each team: the team logo image (60px circle) if uploaded, otherwise sport emoji in a team-color circle (e.g., 🏐 in a navy circle for Black Hornets Elite)
- Team name below (10px, bold, truncated)
- Active team: teal ring
- Tapping switches to that team's context
- Query: fetch from `team_coaches` or coach's assigned teams

**For Players — Team Selector:**
- Same as coach but showing teams the player is on
- If only one team: still show it
- Query: fetch from `team_players` for this player

**For Admins — Sport Selector:**
- Horizontal scroll of sport circles
- Each sport: sport emoji in a circle with the org's brand color (60px)
  - 🏐 Volleyball
  - 🏀 Basketball
  - ⚽ Soccer
  - etc.
- Sport name below (10px, bold)
- First item: "All" with a grid icon, selected by default
- Active: teal ring
- Tapping filters the admin view to that sport's teams/players
- Query: fetch distinct sports from `teams` table for this org

### 3C. Visual treatment for ALL roles

- Use REAL images where available: actual player photos for children, actual team logos for teams
- Fallback: styled initials (gradient circle with white text) or sport emoji in a colored circle
- NOT generic gray placeholder icons
- Active selection: 3px teal ring around the circle
- Horizontal scroll with snap behavior (`snapToInterval`)
- 60px circles, 8px gap between items
- Section has no header text — the visual context is self-explanatory
- Slight horizontal padding (16px) to match drawer content

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: contextual drawer selector - children/teams/sports per role"
git push
```

---

## PHASE 4: VERIFY ALL ROLES

### 4A. Test each role's drawer

Switch through each role and verify:

**Admin:**
- [ ] Home screen shows data (not "Nothing Happening Yet")
- [ ] Role selector pills visible in drawer (Admin highlighted)
- [ ] Season selector visible in drawer (active season highlighted)
- [ ] Sport selector horizontal scroll shows org's sports with emoji circles
- [ ] Tapping a different role switches correctly
- [ ] Tapping a different season switches correctly

**Coach:**
- [ ] Role selector visible if coach has multiple roles
- [ ] Team selector shows coach's assigned teams with logos/sport icons
- [ ] Tapping a team switches context

**Parent:**
- [ ] Role selector visible if parent has multiple roles
- [ ] Child selector shows children's photos/initials
- [ ] Tapping a child switches context
- [ ] Works for multi-child families (2+ children shown)

**Player:**
- [ ] Team selector shows player's teams
- [ ] Works for multi-sport players

### 4B. Verify empty states

- [ ] Role selector doesn't show if user has only one role
- [ ] Season selector doesn't show if org has only one season
- [ ] Child/team/sport selector still shows even with only one item (confirms context)

### 4C. Verify no touch regression

- [ ] ScrollView in drawer scrolls properly
- [ ] All navigation items in drawer still work
- [ ] Closing drawer works (swipe and X button)
- [ ] Role switch doesn't break touch handling on the home screen

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: verified all roles - drawer selectors, season detection, no touch regression"
git push
```

---

## EXPECTED RESULTS

1. **Admin home FIXED** — finds the active season correctly, shows data instead of empty state
2. **Empty state never hides header** — role selector always visible regardless of page content
3. **Role Selector in drawer** — tappable pills at the top, switch between Admin/Coach/Parent/Player
4. **Season Selector in drawer** — list of seasons with active/upcoming badges, tap to switch
5. **Parent drawer** — child photo avatars in horizontal scroll, tap to switch child context
6. **Coach drawer** — team logo/sport circles, tap to switch team context
7. **Player drawer** — team circles for multi-sport players
8. **Admin drawer** — sport emoji circles with "All" default, tap to filter by sport
9. **Real images** — actual player photos and team logos, not generic gray icons
10. **4 commits** — one per phase, each pushed
