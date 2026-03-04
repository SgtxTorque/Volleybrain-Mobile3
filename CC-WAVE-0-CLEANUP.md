# CC-WAVE-0-CLEANUP.md
# Lynx Mobile — Wave 0: Archive Dead Code + Wire Remaining Stubs

**Priority:** Run this FIRST before any brand pass work.  
**Estimated time:** 30–45 minutes  
**Risk level:** LOW — moving files and updating imports, no feature changes  

---

## CONTEXT

CC-CLEANUP-AND-WIRE already created a `_legacy/` folder and archived 17 files there. This spec continues that work by archiving the remaining 16 orphaned/replaced files and wiring the last "Coming Soon" stubs on the admin home scroll.

**Why this matters:** Every dead file is a landmine for future CC sessions. CC reads imports, follows references, and gets confused by 5,000+ lines of code that serve no purpose. Cleaning this out first makes every future spec faster and safer.

---

## PART 1: ARCHIVE DEAD FILES TO `_legacy/`

### Rules
- Do NOT delete any file. Move everything to `components/_legacy/` (create subdirectories as needed)
- After moving, update or remove all import statements that reference moved files
- If removing an import breaks a component, leave a `// TODO: was importing from _legacy/[file]` comment
- Run `npx tsc --noEmit` after each group to catch breakage early

### 1A. Legacy Dashboards → `components/_legacy/dashboards/`

These were replaced by the HomeScroll components. DashboardRouter still imports them but the HomeScrolls are the active renderers.

| File | ~Lines | Replaced By |
|------|--------|-------------|
| `components/AdminDashboard.tsx` | ~1,400 | `AdminHomeScroll.tsx` |
| `components/CoachDashboard.tsx` | ~1,667 | `CoachHomeScroll.tsx` |
| `components/ParentDashboard.tsx` | ~700 | `ParentHomeScroll.tsx` |
| `components/PlayerDashboard.tsx` | ~large | `PlayerHomeScroll.tsx` |
| `components/CoachParentDashboard.tsx` | ~large | `CoachHomeScroll.tsx` |

**After moving:** Open `components/DashboardRouter.tsx` and:
1. Remove ALL imports of the 5 legacy dashboards
2. Remove any `case` or `if` branches that rendered them
3. The router should ONLY render the HomeScroll components (AdminHomeScroll, CoachHomeScroll, ParentHomeScroll, PlayerHomeScroll)
4. If DashboardRouter had a fallback that used a legacy dashboard, replace it with the appropriate HomeScroll

```
npx tsc --noEmit
```

### 1B. Orphaned Components → `components/_legacy/orphaned/`

These files have zero active consumers or were never imported.

| File | Reason |
|------|--------|
| `components/AppDrawer.tsx` | Superseded by GestureDrawer.tsx |
| `components/payments-admin.tsx` | Never imported — payments tab has its own implementation |
| `components/SquadComms.tsx` | Only consumer was PlayerDashboard (now archived) |
| `components/AnnouncementBanner.tsx` | Only consumer was ParentDashboard (now archived) |

**After moving:** Search the entire codebase for imports of these 4 files and remove them:
```bash
grep -rn "AppDrawer\|payments-admin\|SquadComms\|AnnouncementBanner" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules"
```

Remove any found imports. If a file imported one of these and used it in JSX, remove the JSX usage too (it's dead code).

```
npx tsc --noEmit
```

### 1C. Replaced Coach-Scroll Components → `components/_legacy/coach-scroll/`

These were replaced by newer, better components in `components/coach-scroll/`.

| File | Replaced By |
|------|-------------|
| `components/coach-scroll/DevelopmentHint.tsx` | `ActionItems.tsx` |
| `components/coach-scroll/PendingStatsNudge.tsx` | `ActionItems.tsx` |
| `components/coach-scroll/SeasonScoreboard.tsx` | `SeasonLeaderboardCard.tsx` |
| `components/coach-scroll/TopPerformers.tsx` | `SeasonLeaderboardCard.tsx` |
| `components/coach-scroll/TeamPulse.tsx` | `TeamHealthCard.tsx` |
| `components/coach-scroll/RosterAlerts.tsx` | `TeamHealthCard.tsx` |

**After moving:** Same drill — search and remove all imports:
```bash
grep -rn "DevelopmentHint\|PendingStatsNudge\|SeasonScoreboard\|TopPerformers\|TeamPulse\|RosterAlerts" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules"
```

```
npx tsc --noEmit
```

### 1D. Orphaned Route File → `components/_legacy/routes/`

| File | Reason |
|------|--------|
| `app/game-day-parent.tsx` | Fully orphaned — zero references anywhere in the codebase |

**After moving:** Verify no references exist:
```bash
grep -rn "game-day-parent" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy"
```

```
npx tsc --noEmit
```

---

## PART 2: WIRE REMAINING ADMIN HOME STUBS

The admin home scroll (AdminHomeScroll.tsx) has ~10 "Coming Soon" Alert.alert stubs. Wire them to real navigation targets.

### 2A. SmartQueueCard action buttons

These are the priority action cards on the admin home. Each card's action button currently shows Alert.alert("Coming Soon").

Wire each action to navigate to the correct screen:

| Action | Current | Wire To |
|--------|---------|---------|
| "Approve" (pending registration) | Alert | `router.push('/registration-hub')` |
| "Send Reminder" (overdue payment) | Alert | `router.push('/(tabs)/payments')` |
| "Review" (missing waivers) | Alert | `router.push('/registration-hub')` |
| Other queue actions | Alert | Route to the most logical existing screen |

### 2B. QuickActionsGrid (6 tiles)

| Tile | Current | Wire To |
|------|---------|---------|
| "Teams" or team management | Alert | `router.push('/team-management')` |
| "Players" or roster | Alert | `router.push('/(tabs)/players')` |
| "Schedule" or calendar | Alert | `router.push('/(tabs)/admin-schedule')` |
| "Payments" | Alert | `router.push('/(tabs)/payments')` |
| "Messages" or blasts | Alert | `router.push('/blast-composer')` |
| "Reports" | Alert | `router.push('/(tabs)/reports-tab')` |

**NOTE:** Read the actual tile labels in QuickActionsGrid.tsx — the above are educated guesses. Match each tile to the correct existing route. If a tile's purpose doesn't have a matching route, keep the Alert but change the message to something more helpful than "Coming Soon" (e.g., "This feature is available on the web dashboard").

### 2C. Other Admin Stubs

| Stub | Component | Wire To |
|------|-----------|---------|
| Search bar tap | AdminHomeScroll | For now, `router.push('/(tabs)/players')` (closest thing to a search) |
| "Send All Reminders" | PaymentSnapshot | `router.push('/(tabs)/payments')` |
| "View Details" (payments) | PaymentSnapshot | `router.push('/(tabs)/payments')` |
| "Assign Task" | CoachSection | `router.push('/(tabs)/coaches')` |
| "View Calendar" | UpcomingEvents | `router.push('/(tabs)/admin-schedule')` |
| "Create Event" | UpcomingEvents | `router.push('/bulk-event-create')` if it exists after CC-NEXT-FIVE, otherwise `router.push('/(tabs)/admin-schedule')` |
| "Start Setup" (season) | AdminHomeScroll | `router.push('/season-setup-wizard')` if it exists after CC-NEXT-FIVE, otherwise `router.push('/season-settings')` |
| "View more" (queue) | AdminHomeScroll | `router.push('/registration-hub')` |
| TeamHealthTiles tap | TeamHealthTiles | `router.push('/(tabs)/players')` |

### Approach for Part 2

1. Open each component file listed above
2. Find every `Alert.alert` that says "Coming Soon" or similar
3. Replace with `router.push('/route')` using the mappings above
4. Make sure `useRouter` is imported from `expo-router` at the top of each file
5. If the component doesn't already have `const router = useRouter()`, add it

```
npx tsc --noEmit
```

---

## PART 3: VERIFY

After all changes:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Verify no remaining imports of archived files
grep -rn "AdminDashboard\|CoachDashboard\|ParentDashboard\|PlayerDashboard\|CoachParentDashboard\|AppDrawer\|payments-admin\|SquadComms\|AnnouncementBanner\|DevelopmentHint\|PendingStatsNudge\|SeasonScoreboard\|TopPerformers\|TeamPulse\|RosterAlerts" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules"

# 3. Verify _legacy folder has all 16 files
find components/_legacy -name "*.tsx" | wc -l
# Expected: 16 (plus whatever was already there from CC-CLEANUP-AND-WIRE)

# 4. Count remaining "Coming Soon" alerts
grep -rn "Coming Soon" --include="*.tsx" --include="*.ts" components/ app/ | grep -v "_legacy" | grep -v "node_modules" | wc -l
# Target: 0 on admin home screens. Some may remain on coach/player stubs — that's OK for now.

# 5. Commit
git add -A
git commit -m "Wave 0: archive 16 dead files to _legacy, wire admin home stubs, clean DashboardRouter"
git push
```

---

## EXPECTED RESULT

- `components/_legacy/` contains ~33 archived files (17 from CC-CLEANUP-AND-WIRE + 16 from this spec)
- `DashboardRouter.tsx` is clean — only imports and renders the 4 HomeScroll components
- Admin home scroll has zero "Coming Soon" alerts — every tap goes somewhere useful
- `npx tsc --noEmit` passes clean
- Repo is ~5,000+ lines lighter in active code
