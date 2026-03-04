# CC-WIRING-AUDIT.md
# Lynx Mobile — Wiring Audit: Fix Every Route, Delete Legacy, Verify Everything Works

**Priority:** CRITICAL — run BEFORE any visual work  
**Estimated time:** 4–6 hours (6 phases, commit after each)  
**Risk level:** HIGH — deleting files and changing navigation. But necessary. The app is broken without this.

---

## WHY THIS EXISTS

Real-device testing revealed that the app has deep wiring problems:

- Tapping "Roster" from the coach game day hero card goes to an **OLD player roster layout** (gold cards, 2-month-old design)
- Tapping "Lineup" from the same screen goes to the **same old roster screen** instead of the lineup builder
- Tapping "Stats" goes to the **calendar**
- Tapping "Attendance" goes to the **calendar**
- Tapping "Team Health" goes to the **old player roster** again
- Tapping "10 players due for evaluations" shows "No players found"
- Tapping "2 games need stats" goes to the **calendar**
- Tapping "Team Hub preview" goes to the **chat channel selection** instead of team hub
- The standings screen truncates team names
- Tapping players in leaderboards shows the **OLD player card** (not the new FIFA-style one)
- Team selector on certain screens is too dark to read team names
- Team Hub still uses the old layout
- Parent can see admin-only settings (season settings) — role permission leak
- "Blast All" and "Send Reminders" in admin quick actions go to the same screen
- "Add Player" in admin goes to registration instead of an add-player flow
- Game Results from admin gesture menu says "No teams found"
- Many buttons fall back to the **calendar** as a catch-all default route

The root cause: **the `_legacy/` folder still exists** and components are still importing from it, or routes are pointing to old screen implementations instead of the new ones built in Waves 1-8.

---

## RULES

1. **READ the new component/screen FIRST** before deleting anything. Confirm the replacement exists.
2. **If a new replacement does NOT exist**, do NOT delete the old one — flag it in the report.
3. **Fix routes to point to the CORRECT screen**, not a calendar fallback.
4. **Fix role permission checks** — parents should NOT see admin/coach-only content.
5. **Test every fix** — after changing a route, verify the target screen file exists and exports a valid component.
6. **Do NOT change visual styling in this spec.** This is routing/wiring only. Visual fixes come after.

---

## PHASE 1: LEGACY INVENTORY + SAFETY CHECK

Before deleting anything, catalog every file in `_legacy/` and verify its replacement exists.

### 1A. List every legacy file

```bash
echo "=== FILES IN _legacy/ ==="
find components/_legacy -name "*.tsx" -o -name "*.ts" | sort
echo ""
echo "=== TOTAL COUNT ==="
find components/_legacy -name "*.tsx" -o -name "*.ts" | wc -l
```

### 1B. For EACH legacy file, find the replacement

For every file found, check if a non-legacy replacement exists:

```bash
# For each file in _legacy, check if there's a corresponding file outside _legacy
for f in $(find components/_legacy -name "*.tsx" -o -name "*.ts" | sort); do
  basename=$(basename "$f")
  echo "--- LEGACY: $f ---"
  # Search for the same filename outside _legacy
  find app/ components/ -name "$basename" -not -path "*_legacy*" -not -path "*node_modules*" -not -path "*reference/*" 2>/dev/null
  echo ""
done
```

### 1C. Check if anything IMPORTS from _legacy

```bash
echo "=== IMPORTS FROM _legacy ==="
grep -rn "from.*_legacy\|require.*_legacy" --include="*.tsx" --include="*.ts" app/ components/ lib/ | grep -v "node_modules" | grep -v "reference/"
echo ""
echo "=== TOTAL IMPORTS ==="
grep -rn "from.*_legacy\|require.*_legacy" --include="*.tsx" --include="*.ts" app/ components/ lib/ | grep -v "node_modules" | grep -v "reference/" | wc -l
```

### 1D. Build the replacement map

Create a file `LEGACY-REPLACEMENT-MAP.md` in the repo root:

```markdown
# Legacy Replacement Map

| Legacy File | Replacement File | Status |
|-------------|-----------------|--------|
| _legacy/PlayerDashboard.tsx | components/PlayerHomeScroll.tsx | SAFE TO DELETE |
| _legacy/AdminDashboard.tsx | components/AdminHomeScroll.tsx | SAFE TO DELETE |
| _legacy/ParentDashboard.tsx | components/ParentHomeScroll.tsx | SAFE TO DELETE |
| _legacy/CoachDashboard.tsx | components/CoachHomeScroll.tsx | SAFE TO DELETE |
| _legacy/CoachParentDashboard.tsx | (merged into role-specific scrolls) | SAFE TO DELETE |
| _legacy/SomeComponent.tsx | ??? | NOT FOUND — DO NOT DELETE |
```

Fill this out for every file. Be honest — if there's no replacement, mark it.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: legacy inventory and replacement safety map"
git push
```

---

## PHASE 2: REROUTE IMPORTS, THEN DELETE _legacy/

### 2A. Fix every import that references _legacy

For each import found in Phase 1C, update it to point to the replacement file from the map:

```bash
# Example: if a file imports from _legacy/PlayerDashboard
# Change: import PlayerDashboard from '../_legacy/PlayerDashboard'
# To:     import PlayerHomeScroll from '../PlayerHomeScroll'
```

Work through every import. If the replacement component has a different name (e.g., PlayerDashboard → PlayerHomeScroll), update the usage too — not just the import.

### 2B. Delete the _legacy folder

Once ALL imports are rerouted:

```bash
# Final check — should be 0
grep -rn "from.*_legacy\|require.*_legacy" --include="*.tsx" --include="*.ts" app/ components/ lib/ | grep -v "node_modules" | grep -v "reference/" | wc -l

# If 0, delete
rm -rf components/_legacy

# Verify it's gone
ls components/_legacy 2>&1
# Expected: "No such file or directory"
```

### 2C. Verify the app still compiles

```bash
npx tsc --noEmit 2>&1 | grep -v "reference\|design-reference" | head -20
```

If there are NEW errors (not pre-existing reference/ errors), a component that was deleted didn't have a replacement. Check the replacement map and fix.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: reroute all _legacy imports, delete _legacy folder entirely"
git push
```

---

## PHASE 3: FIX THE CALENDAR CATCH-ALL PROBLEM

Multiple tappable elements navigate to the schedule/calendar screen as a fallback. This means the route target is either wrong, missing, or defaulting. Find and fix every one.

### 3A. Find all navigation calls

```bash
# Dump every router.push and router.replace in the app
grep -rn "router\.push\|router\.replace\|router\.navigate\|navigation\.navigate\|href=" \
  --include="*.tsx" --include="*.ts" app/ components/ | \
  grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" | \
  sort > /tmp/all-routes.txt

wc -l /tmp/all-routes.txt
cat /tmp/all-routes.txt
```

### 3B. Find all routes that point to schedule/calendar

```bash
grep -i "schedule\|calendar" /tmp/all-routes.txt
```

Review each one. If a button labeled "Stats" or "Attendance" or "Team Health" navigates to schedule, that's wrong. Fix it to the correct route.

### 3C. Fix the specific broken routes from testing

These were identified during real-device testing. Find and fix each one:

**From Coach Game Day hero card / Coach Home Scroll:**

| Button/Link | Currently Goes To | Should Go To |
|-------------|-------------------|--------------|
| "Roster" | Old player roster layout | `app/(tabs)/players.tsx` or team roster within team hub |
| "Lineup" | Old player roster layout | `app/lineup-builder.tsx` |
| "Stats" | Calendar/Schedule | `app/my-stats.tsx` or a team stats view |
| "Attendance" | Calendar/Schedule | `app/attendance.tsx` |
| "Team Health" | Old player roster layout | Team hub roster tab or a team health summary |
| "10 players due for evaluations" | "No players found" | `app/player-evaluations.tsx` (verify it fetches players correctly) |
| "2 games need stats" | Calendar | `app/game-results.tsx` (with the relevant games pre-selected) |
| "Team Hub preview" / "View All" | Chat channel selection | `app/(tabs)/coach-team-hub.tsx` or `app/(tabs)/parent-team-hub.tsx` |

**From Admin screens:**

| Button/Link | Currently Goes To | Should Go To |
|-------------|-------------------|--------------|
| "Blast All" | "Announcements" screen | `app/blast-composer.tsx` (or keep as-is if Announcements IS the blast screen) |
| "Send Reminders" | Same "Announcements" screen | `app/payment-reminders.tsx` (this is a DIFFERENT action) |
| "Add Player" | Registration | Should either go to a player-add form OR be relabeled "Register Player" to match |
| Game Results (from gesture menu) | "No teams found" | Fix the data query — teams should load. Check if it's filtering by wrong season/role. |

**From Parent screens:**

| Button/Link | Currently Goes To | Should Go To |
|-------------|-------------------|--------------|
| "Team Record" (quick glance) | Calendar | `app/standings.tsx` or a team record detail |
| "Level" card | Achievements (with cycling errors) | `app/achievements.tsx` — but fix the errors first (check data query) |

For each fix:
1. Find the `onPress` or `href` handler in the source file
2. Change the route to the correct target
3. Verify the target file exists: `ls app/[target-file].tsx`

### 3D. Fix fallback/default routes

Search for any generic fallback navigation pattern that sends users to schedule:

```bash
# Find catch-all or fallback navigation patterns
grep -rn "fallback.*schedule\|default.*schedule\|else.*schedule\|catch.*schedule" \
  --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules"
```

If there's a pattern like `router.push(route || '/(tabs)/schedule')`, the fallback should be removed or changed to show an error/alert instead of silently redirecting.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: fix all broken routes - no more calendar catch-all, correct targets for every button"
git push
```

---

## PHASE 4: FIX ROLE PERMISSION LEAKS

A parent should not see admin-only or coach-only screens/options.

### 4A. Find role-gated content

```bash
# Find all role checks in the app
grep -rn "role.*admin\|role.*coach\|role.*parent\|role.*player\|isAdmin\|isCoach\|isParent\|isPlayer" \
  --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" | head -40
```

### 4B. Check gesture drawer / More menu

The gesture drawer (More menu) likely has a list of navigation items. Check that each item has a role guard:

```bash
grep -rn "GestureDrawer\|DrawerContent\|MoreMenu\|gesture.*drawer" \
  --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules"
```

Open the drawer content file. Verify:
- "Season Settings" only shows for admin role
- "Team Management" only shows for admin role
- "Coach Availability" only shows for coach role
- "Game Prep" only shows for coach/admin roles
- "Attendance" only shows for coach/admin roles
- "Player Evaluations" only shows for coach/admin roles
- "Registration Hub" only shows for admin role
- "Users" only shows for admin role

Any item without a role guard needs one added.

### 4C. Check My Stuff screens

Each role's My Stuff screen should only show role-appropriate items:

```bash
# Check parent my stuff for admin/coach items that shouldn't be there
grep -rn "season.*settings\|team.*management\|coach.*availability\|game.*prep\|registration.*hub\|users" \
  --include="*.tsx" app/\(tabs\)/parent-my-stuff.tsx
```

Expected: 0 results. A parent's My Stuff should not link to admin screens.

### 4D. Check home scroll dashboards

```bash
# Verify CoachHomeScroll doesn't show admin-only sections to coaches
# Verify ParentHomeScroll doesn't show coach/admin sections to parents
grep -rn "role\|isAdmin\|isCoach" --include="*.tsx" components/ParentHomeScroll.tsx | head -10
grep -rn "role\|isAdmin\|isCoach" --include="*.tsx" components/CoachHomeScroll.tsx | head -10
```

Ensure sections are properly gated.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: fix role permission leaks - parents can't see admin/coach screens"
git push
```

---

## PHASE 5: FIX OLD COMPONENT RENDERING

Even with `_legacy/` deleted, some screens may still render old-style components because they have their OWN inline implementation (not importing from `_legacy/`). Find and fix these.

### 5A. Find the old gold player cards

The old player roster shows gold-colored cards with a completely different layout. Find where this renders:

```bash
# Search for the old gold player card styling
grep -rn "gold\|#[Ff][Ff][Dd]\|#[Ee][Ee][Cc]\|#[Cc][Dd][Bb].*card\|playerCard.*gold\|roster.*card" \
  --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" | grep -v "achievements"
```

```bash
# Search for old-style roster grid layout
grep -rn "roster.*grid\|player.*grid\|3.*column.*player\|numColumns.*3" \
  --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/"
```

If found: these need to be replaced with the current PlayerCard component. The old gold grid cards should not exist anywhere.

### 5B. Find old-style event cards (pink trophy icons)

```bash
grep -rn "trophy\|Trophy\|pink.*icon\|#[Ff][Ff][Bb]\|game.*icon.*pink\|event.*trophy" \
  --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/"
```

These should be replaced with the branded EventCard component. Events should show type badges (GAME=coral pill, PRACTICE=teal pill, TOURNAMENT=gold pill), not pink trophy icons.

### 5C. Find old-style quick action tiles (pastel circles)

```bash
grep -rn "pastel\|light.*green.*circle\|light.*blue.*circle\|light.*pink.*circle\|action.*tile.*bg" \
  --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/"
```

Quick action tiles should use the brand pattern: consistent icon treatment, brand colors, no random pastel backgrounds.

### 5D. Verify current PlayerCard component exists and is correct

```bash
echo "=== PlayerCard files ==="
find app/ components/ -name "*PlayerCard*" -not -path "*_legacy*" -not -path "*node_modules*" -not -path "*reference/*"
echo ""
echo "=== PlayerCard imports (who uses it) ==="
grep -rn "PlayerCard\|playerCard" --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" | grep "import"
```

Every screen that shows a player should import and use this component. No inline player card implementations.

### 5E. Verify current EventCard component exists and is used

```bash
echo "=== EventCard files ==="
find app/ components/ -name "*EventCard*" -not -path "*_legacy*" -not -path "*node_modules*" -not -path "*reference/*"
echo ""
echo "=== EventCard imports (who uses it) ==="
grep -rn "EventCard\|eventCard" --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" | grep "import"
```

Every screen that shows events should import and use this component.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: replace all old component renderings with current branded components"
git push
```

---

## PHASE 6: DATA QUERY FIXES + FINAL VERIFICATION

### 6A. Fix "No players found" on evaluations

```bash
grep -rn "no.*player\|No.*player\|players.*length.*0\|empty.*player" \
  --include="*.tsx" app/player-evaluations.tsx app/player-goals.tsx 2>/dev/null
```

Check the data query:
- Is it filtering by the wrong team?
- Is it filtering by the wrong season?
- Is it missing the team_id parameter?
- Is the Supabase query returning the wrong data?

Fix the query so it returns the actual players for the coach's teams.

### 6B. Fix "No teams found" on game results

```bash
grep -rn "no.*team\|No.*team\|teams.*length.*0\|empty.*team" \
  --include="*.tsx" app/game-results.tsx 2>/dev/null
```

Same investigation — check the Supabase query, season filter, role filter.

### 6C. Fix achievements error cycling

```bash
grep -rn "achievements\|useAchievements\|badge.*error\|achievement.*error" \
  --include="*.tsx" app/achievements.tsx components/Achievements*.tsx 2>/dev/null | head -10
```

Check for:
- Missing null checks on data
- Array operations on undefined
- Missing loading states
- Parent vs player achievement scope (whose achievements are shown?)

### 6D. Fix team name readability

On the team selector in lineup builder and other screens:

```bash
grep -rn "team.*selector\|TeamSelector\|team.*picker\|team.*pill\|team.*tab" \
  --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/"
```

Fix: ensure team name text has sufficient contrast against its background. If the background is dark navy, the text must be white/light. If the background is light, the text must be dark.

### 6E. Verify "Blast All" vs "Send Reminders" are distinct

```bash
grep -rn "blast.*all\|send.*remind\|Blast All\|Send Remind" \
  --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules"
```

"Blast All" → should navigate to blast-composer.tsx (send announcement to all teams)
"Send Reminders" → should navigate to payment-reminders.tsx (send payment reminders to families with balances)

These are different features. If they both go to the same screen, fix the routing.

### 6F. Fix "Add Player" in admin

Check what "Add Player" does:
- If it goes to registration, relabel it "Register Player" since that's what it does
- OR create a proper add-player flow (quick form: name, email, team assignment)
- For beta, relabeling is the faster fix

### 6G. Final Verification

```bash
# 1. _legacy is gone
ls components/_legacy 2>&1
# Expected: No such file or directory

# 2. Zero imports from _legacy
grep -rn "_legacy" --include="*.tsx" --include="*.ts" app/ components/ lib/ | grep -v "node_modules" | grep -v "reference/" | wc -l
# Expected: 0

# 3. TypeScript compiles
npx tsc --noEmit 2>&1 | grep -v "reference\|design-reference" | tail -5

# 4. No calendar catch-all routes for non-schedule buttons
# Manual: review /tmp/all-routes.txt for any remaining misroutes

# 5. Count total changes
git diff --stat HEAD~5

git add -A
git commit -m "Phase 6: fix data queries, team readability, distinct admin actions, final verification"
git push
```

---

## WIRING AUDIT REPORT

After Phase 6, create `WIRING-AUDIT-REPORT.md` in the repo root:

```markdown
# Wiring Audit Report

## Legacy Deletion
- Files deleted: [N]
- Files that had NO replacement (flagged): [list or "none"]
- Imports rerouted: [N]

## Routes Fixed
- Calendar catch-all routes eliminated: [N]
- Broken routes fixed: [list each button → old target → new target]

## Role Permission Fixes
- Items hidden from wrong roles: [list]

## Old Components Replaced
- Old gold player cards found and replaced: [Y/N, where]
- Old pink trophy event cards found and replaced: [Y/N, where]
- Old pastel quick action tiles found and replaced: [Y/N, where]

## Data Query Fixes
- "No players found" on evaluations: [fixed/not fixed/not applicable]
- "No teams found" on game results: [fixed/not fixed/not applicable]
- Achievement errors: [fixed/not fixed/not applicable]

## Remaining Issues
- [list anything that couldn't be fixed in this pass]
```

```bash
git add WIRING-AUDIT-REPORT.md
git commit -m "Wiring audit report"
git push
```

---

## EXPECTED RESULTS

1. **`_legacy/` folder DELETED** — gone from the repo entirely
2. **Zero imports from `_legacy/`** — everything rerouted to current components
3. **Every button goes to the right screen** — no more calendar catch-all
4. **Roster button → players/roster**, Lineup → lineup builder, Stats → stats, Attendance → attendance
5. **Role permissions enforced** — parents don't see admin settings, coaches don't see admin tools
6. **Old gold player cards GONE** — replaced with current PlayerCard everywhere
7. **Old pink trophy event cards GONE** — replaced with branded EventCard everywhere
8. **Data queries fixed** — evaluations find players, game results find teams, achievements don't error
9. **"Blast All" and "Send Reminders" go to DIFFERENT screens**
10. **Team names readable** on all team selectors
11. **6 commits** — one per phase, each pushed
12. **Wiring Audit Report** documenting everything changed

---

## AFTER THIS SPEC

Once the wiring audit is complete and everything navigates correctly, THEN run `CC-VISUAL-QA-AUDIT.md` to fix the visual styling. Wiring first, visuals second. No point making a screen look beautiful if tapping it takes you to the wrong place.
