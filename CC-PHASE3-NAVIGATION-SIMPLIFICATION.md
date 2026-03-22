# CC-PHASE3-NAVIGATION-SIMPLIFICATION.md
# Lynx Mobile — Phase 3: Navigation Simplification
# EXECUTION SPEC — Run this with Claude Code

---

## PURPOSE

Simplify the drawer navigation, pass context to param-dependent screens, remove duplicate entries, and resolve the multi-child context bug. These are structural navigation improvements that prepare the app for Phase 4 (screen consolidation).

This is Phase 3 of 4. Phases 1 and 2 must be completed first.

---

## BEFORE YOU START — READ THESE FILES

1. `CC-LYNX-RULES.md`
2. `CC-PROJECT-CONTEXT.md`
3. `CC-SHARED-SCREEN-ARCHITECTURE.md` (reference only — do NOT execute consolidation)

---

## EXECUTION MODEL

**Execute all fixes sequentially without stopping between each one.** After ALL fixes are complete, produce a single final report covering every change made.

---

## ABSOLUTE RULES

1. **Do NOT consolidate or merge screen files.** No deleting screens, no merging chat/roster/schedule files. That is Phase 4.
2. **Do NOT change any screen's visual layout or data fetching logic** unless the fix explicitly requires it.
3. **Do NOT modify home scroll components** (ParentHomeScroll, CoachHomeScroll, AdminHomeScroll, PlayerHomeScroll) or any files in `components/coach-scroll/`, `components/admin-scroll/`, `components/parent-scroll/`.
4. **Do NOT modify `app/_layout.tsx`** (Phase 1 complete).
5. **Do NOT create new screen files.** Work with existing files only.
6. **Do NOT change any routes that were fixed in Phase 1 or Phase 2.** Those are locked.

---

## DO NOT TOUCH LIST

- `app/_layout.tsx`
- `components/ParentHomeScroll.tsx`
- `components/CoachHomeScroll.tsx` (and all `components/coach-scroll/*`)
- `components/AdminHomeScroll.tsx` (and all `components/admin-scroll/*`)
- `components/PlayerHomeScroll.tsx` (and all `components/player-scroll/*`)
- `components/DashboardRouter.tsx`
- Any file in `lib/` except where explicitly instructed
- Any file in `hooks/`
- Any `.sql` or migration file
- `package.json`, `app.json`, `tsconfig.json`
- `app/child-detail.tsx` (Phase 2 complete)
- `app/my-kids.tsx` (Phase 2 complete)
- `components/PlayerCardExpanded.tsx` (Phase 2 complete)

---

## FIX 1: Remove Duplicate Drawer Entries

**File:** `components/GestureDrawer.tsx`
**Target:** The `MENU_SECTIONS` array

The following items appear in multiple sections. Remove the DUPLICATES, keeping only the most logical home for each:

### Items to REMOVE (delete these lines from MENU_SECTIONS):

**From "League & Community" section:**
- Remove `Team Wall` (already in Quick Access)
- Remove `Standings` (already in My Family for parents, My Stuff for players)
- Remove `Achievements` (already in My Family for parents, My Stuff for players)
- Remove `Coach Directory` (already in Admin Tools for admins, and in Coaching Tools area)

**After removal, the League & Community section should only contain:**
```
{ icon: 'business', label: 'Find Organizations', route: '/org-directory' }
```

If that leaves only 1 item, remove the entire League & Community section and move "Find Organizations" into the Settings & Privacy section.

**From "My Stuff" (player) section:**
- Remove `Standings` (duplicate — accessible via Quick Access or other paths)
- Remove `Schedule` (duplicate — already in Quick Access, and Quick Access Schedule is now role-routed from Phase 1)

**From "My Family" (parent) section:**
- Remove `Standings` (accessible via home dashboard and other paths)

**From "Help & Support" section:**
- Move `Help Center` into Settings & Privacy section
- Move `Data Rights` into Settings & Privacy section
- Remove `Web Features` item entirely (placeholder that just shows a redirect — not useful in drawer)
- Delete the entire Help & Support section after moving items

**Result:** The drawer should go from 8 sections to approximately 5-6 sections with roughly 30% fewer items.

**Important:** Do NOT remove any item that is the ONLY path to a screen. Before removing each duplicate, confirm the item exists in at least one other section or is reachable from a home dashboard card.

---

## FIX 2: Pass Active Player Context to My Stats and My Evaluations

**File:** `components/GestureDrawer.tsx`
**Target:** The `handleMenuItemPress` function (or `resolveRoute` if it exists from Phase 1)

**Current problem:** When a player with multiple children (or a parent viewing as player) taps "My Stats" or "My Evaluations" in the drawer, the route goes to `/my-stats` without a `playerId`. The `my-stats.tsx` screen then does a `limit 1` query and picks the wrong child.

**The drawer already has `activeContextId`** (line 305) which stores the currently selected player/team ID from the context selector. For player role, this is the selected player's ID.

**Implementation:**

In the route resolution logic (inside `handleMenuItemPress` or `resolveRoute`), add context passing for my-stats routes:

```typescript
// When navigating to my-stats, append the active player context if available
if (route.startsWith('/my-stats') && activeContextId && isPlayer) {
  const separator = route.includes('?') ? '&' : '?';
  route = `${route}${separator}playerId=${activeContextId}`;
}
```

This ensures:
- "My Stats" → `/my-stats?playerId={activeContextId}`
- "My Evaluations" → `/my-stats?scrollToEvals=true&playerId={activeContextId}`

**Also apply the same pattern for parent "Evaluations"** in the My Family section (route: `/my-stats`). For parents, `activeContextId` is the selected child's player ID:

```typescript
// Also pass context for parent evaluations
if (route === '/my-stats' && activeContextId && isParent) {
  route = `/my-stats?playerId=${activeContextId}`;
}
```

**Important:** Only append `playerId` if `activeContextId` is not null. If no context is selected (e.g., drawer opened before context loads), let the route pass through as-is — `my-stats.tsx` will fall back to its own resolution.

**Important:** `my-stats.tsx` already reads `playerId` from params (line 114: `playerId: paramPlayerId`). No changes needed to `my-stats.tsx`.

---

## FIX 3: Pass Context to Game Day Drawer Items

**File:** `components/GestureDrawer.tsx`
**Target:** The Game Day section items and the route resolution logic

**Current problem:** All 6 Game Day drawer items (Game Day Command, Game Prep, Lineup Builder, Attendance, Game Results, Game Recap) navigate without `eventId` or `teamId` params. The destination screens need these params to function properly.

**The drawer already has `activeContextId`** which for coaches stores the selected team ID.

**Implementation:**

In the route resolution logic, add team context to Game Day routes:

```typescript
// Game Day items that benefit from team context
const gameDayRoutes = ['/game-day-command', '/game-prep', '/lineup-builder', '/attendance', '/game-results', '/game-recap'];

if (gameDayRoutes.some(r => route.startsWith(r)) && activeContextId && (isCoach || isAdmin)) {
  const separator = route.includes('?') ? '&' : '?';
  route = `${route}${separator}teamId=${activeContextId}`;
}
```

This doesn't fully solve the missing `eventId` problem (that would require knowing the upcoming event), but passing `teamId` is a significant improvement — the destination screens can use it to filter to the correct team's events and auto-select the most relevant game.

**Do NOT attempt to resolve `eventId` here.** That would require a Supabase query inside the navigation handler, which is not appropriate. Passing `teamId` is sufficient for now — the destination screens should handle event selection from there.

---

## FIX 4: Add "Invite Friends" to Player Drawer Section

**File:** `components/GestureDrawer.tsx`
**Target:** The "My Stuff" (player) section in `MENU_SECTIONS`

**Current problem:** `invite-friends.tsx` exists and works but is only in the parent "My Family" section. Players have no path to it.

**Implementation:** Add to the player "My Stuff" section:

```typescript
{ icon: 'share-social', label: 'Invite Friends', route: '/invite-friends' }
```

Place it at the end of the My Stuff items list (after the last current item).

---

## FIX 5: Add "Create Event" to Game Day Drawer Section

**File:** `components/GestureDrawer.tsx`
**Target:** The "Game Day" section in `MENU_SECTIONS`

**Current problem:** The Game Day drawer section has 6 items but none for creating events. Coaches must find event creation through the schedule screen, which the audit found was often the wrong schedule screen.

**Implementation:** Add to the Game Day section, as the FIRST item:

```typescript
{ icon: 'add-circle-outline', label: 'Create Event', route: '/(tabs)/coach-schedule' }
```

This routes to the coach-schedule screen which has the event creation form. The Phase 1 `resolveRoute` already handles role-based schedule routing, but this is a direct link specifically for event creation, so it should always go to `coach-schedule` (which is also what `admin-schedule` re-exports).

Place it before "Game Day Command" so it appears at the top of the section.

---

## FIX 6: Clean Up Player "My Stuff" Schedule Duplicate

**File:** `components/GestureDrawer.tsx`

**Note:** Fix 1 should have already removed the duplicate Schedule from My Stuff. This fix is a verification step.

**Verify:** After Fix 1, the player "My Stuff" section should NOT contain a Schedule item. The player's Schedule is accessible from Quick Access (which Phase 1 made role-conditional). If Schedule still exists in My Stuff after Fix 1, remove it here.

---

## FIX 7: Remove "Announcements" from Quick Access

**File:** `components/GestureDrawer.tsx`
**Target:** Quick Access section

**Current problem:** "Announcements" routes to `/(tabs)/messages` which is the coach/admin message composer. Players and parents land on a screen for sending announcements, not reading them. No read-only inbox exists yet.

**Implementation:** Remove the Announcements item from Quick Access:

```typescript
// REMOVE THIS LINE:
{ icon: 'megaphone-outline', label: 'Announcements', route: '/(tabs)/messages' }
```

The blast composer is still accessible from the Coaching Tools section ("Blast Composer") and from the Admin Tools section. Removing it from Quick Access prevents non-coach/admin users from landing on a screen they can't use.

**Do NOT remove Blast Composer from Coaching Tools or Admin Tools.** Only remove the Quick Access "Announcements" entry.

---

## VERIFICATION

After ALL fixes are complete:

1. **Run `npx tsc --noEmit`** and report the result.
2. **Count the total items in MENU_SECTIONS before and after** (there were 85 items before Phase 3).
3. **List the final section structure** (section names, item counts, which sections were removed/modified).
4. **List every file that was modified.**
5. **Confirm no files outside the scope were modified.**
6. **For each fix, describe the before/after in one sentence.**

---

## FINAL REPORT FORMAT

Produce a single report with this structure:

```
Phase 3 Final Report
====================

TypeScript: [PASS/FAIL]
Files modified: [count] — [list]

Drawer Before: [X] sections, [Y] items
Drawer After: [X] sections, [Y] items

Fix-by-Fix Summary:
| Fix | Change | Lines Modified |
|-----|--------|---------------|
| 1   | ...    | ...           |
| 2   | ...    | ...           |
| ... | ...    | ...           |

Final Section Structure:
| Section | Items | Role Gate |
|---------|-------|-----------|
| ...     | ...   | ...       |

Items Removed: [list]
Items Added: [list]
Items Moved: [list]
Sections Removed: [list]

Remaining Risks or Notes:
- ...
```

---

## MANUAL QA CHECKLIST (for Carlos to test)

| # | Test | Expected Result |
|---|------|----------------|
| 1 | Open drawer as parent | No duplicate Standings or Achievements entries visible |
| 2 | Open drawer as player | No duplicate Standings, Achievements, or Schedule entries |
| 3 | Open drawer as player | "Invite Friends" visible in My Stuff section |
| 4 | Open drawer as coach | "Create Event" is first item in Game Day section |
| 5 | Open drawer as coach, select a team in context, tap "Game Results" | URL includes teamId parameter |
| 6 | Open drawer as player (Ava selected), tap "My Stats" | Lands on my-stats showing Ava's stats, not a sibling's |
| 7 | Open drawer as player (Ava selected), tap "My Evaluations" | Lands on my-stats, scrolls to evaluations, shows Ava's data |
| 8 | Open drawer — no "Announcements" in Quick Access | Removed — blast composer still in Coaching Tools |
| 9 | Open drawer — "Help Center" and "Data Rights" in Settings section | Moved from Help & Support (which should be gone) |
| 10 | Open drawer — "League & Community" section gone or minimal | Only "Find Organizations" if section still exists |
| 11 | Count total drawer items | Should be ~30% fewer than before |
