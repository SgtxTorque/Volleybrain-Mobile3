# LYNX — Full Mobile App Screen & Navigation Audit
## For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)
**GitHub:** SgtxTorque/volleybrain-mobile3
**Web Admin:** `C:\Users\fuent\Downloads\volleybrain-admin\`

---

## CONTEXT

We need a complete inventory of what exists in the mobile app RIGHT NOW — every screen, every component, every route, every tap target, every navigation action. We also need to know what exists on the web admin but NOT on mobile. This audit will drive all future build decisions.

**DO NOT CHANGE ANY CODE. This is READ-ONLY.**

---

## RULES

1. **READ ONLY.** Do not modify, create, or delete ANY files.
2. Read EVERY file referenced. Do not guess or assume.
3. Output a single comprehensive report.
4. Be brutally honest — if something is a stub, placeholder, or broken, say so.
5. Commit the report file at the end, nothing else.

---

## PHASE 1: FILE TREE & ARCHITECTURE

1A. Print the full directory tree (excluding node_modules, .expo, .git):
```bash
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  ! -path "*/node_modules/*" ! -path "*/.expo/*" ! -path "*/.git/*" \
  | sort
```

1B. Read the main app entry point and navigation setup:
- Find and read: `app/_layout.tsx` or `App.tsx` or whatever the root is
- Find and read: the tab navigator / bottom nav configuration
- Find and read: the DashboardRouter or equivalent that routes by role
- Find and read: any Stack navigators or screen registrations

1C. Read `package.json` — list all installed dependencies (just the names, not versions).

1D. Read SCHEMA_REFERENCE.csv — list all tables.

---

## PHASE 2: ROUTE MAP

For every registered screen/route in the app, document:

```
ROUTE: [route name or path]
FILE: [file path]
TYPE: [tab | stack | modal | component]
ACCESSIBLE BY: [which roles can reach this screen]
HOW TO REACH: [what tap/navigation action gets here]
STATUS: [functional | stub | placeholder | broken | coming-soon]
```

Check:
- All tab screens (Home, Game Day, Schedule, Chat, More — per role)
- All stack screens pushed from tabs
- All modals
- All screens registered in navigators but potentially unreachable

---

## PHASE 3: SCREEN-BY-SCREEN INVENTORY

For EACH screen file found in Phase 1, read the file and document:

### A. Home Screens (per role)
For each role's home/dashboard:
- What sections/cards are rendered?
- What data does each section fetch from Supabase?
- What are ALL tap targets and where do they navigate?
- Are there any "Coming Soon" toasts or placeholders?
- What is the scroll architecture (flat scroll, FlatList, Animated.ScrollView)?

### B. Tab Screens
For each tab in each role's bottom nav:
- What does the tab render?
- Is it a real screen or a re-export/stub?
- What data does it fetch?
- What actions can the user take?

### C. Full-Screen Experiences
For each screen that is navigated TO (not a tab):
- What triggers navigation to this screen?
- What data does it receive (params)?
- What can the user DO on this screen?
- Does it have working Supabase queries?
- Any broken or placeholder functionality?

### D. Modals & Bottom Sheets
- List every modal or bottom sheet component
- What triggers it?
- What can the user do in it?

---

## PHASE 4: FEATURE MATRIX

Create a matrix showing what features exist on WEB vs MOBILE vs NEITHER:

```
| Feature | Web Admin | Mobile | Notes |
|---------|-----------|--------|-------|
| Example | ✅ Full   | ⚠️ Stub | Mobile has placeholder |
```

Features to check (read the web admin to verify):

**Season Management:**
- Create/edit season
- Season setup wizard
- Season archive
- Multi-season view

**Registration:**
- Registration form / player signup
- Registration review (approve/deny/waitlist)
- Registration settings (open/close dates, auto-approve)

**Team Management:**
- Create/edit teams
- Roster management (assign/remove players)
- Team detail view
- Coach assignment to teams

**Player Management:**
- Player profile (view/edit)
- Player stats (view)
- Skill ratings / spider chart
- Player evaluation form
- Player search

**Schedule & Events:**
- Calendar view (month/week/day)
- Create event
- Edit event
- Event detail
- RSVP (send/receive/view)
- Attendance tracking
- Recurring events

**Payments:**
- Fee structure setup
- Payment tracking (who paid, who hasn't)
- Payment reminders
- Mark as paid (manual)
- Stripe checkout
- Payment history

**Stats & Performance:**
- Game stats entry (per-player)
- Season stats aggregation
- Leaderboards
- Game recap / box score
- Personal bests

**Communication:**
- Team chat
- Player chat
- Coach chat
- Direct messages
- Blast messaging
- Push notifications

**Engagement & Gamification:**
- Achievement/badge system (create)
- Achievement/badge display (trophy case)
- Shoutouts (give/receive)
- Challenges (create/participate)
- XP/Level system
- OVR rating

**Team Hub / Social:**
- Team wall posts (create/view)
- Photo uploads
- Comments/reactions
- Highlights / media gallery

**Waivers:**
- Create waiver templates
- Send waivers
- Sign waivers
- Track waiver completion

**Jersey/Equipment:**
- Size collection
- Order tracking

**Coach Tools:**
- Lineup builder
- Game prep / game mode
- Practice planner
- Player evaluations

**Admin Tools:**
- Organization settings
- Coach management (add/remove)
- Reporting / analytics
- Bulk operations

**Account & Settings:**
- Profile editing
- Notification preferences
- Role switching
- Theme/dark mode selection
- Password/security

---

## PHASE 5: NAVIGATION AUDIT — TAP TARGET MAP

For each home screen (Parent, Coach, Player, Admin), list EVERY tappable element and where it goes:

```
ROLE: Parent
SCREEN: ParentHomeScroll

TAP TARGET: Event Hero Card
  → NAVIGATES TO: [screen name or "nowhere" or "Coming Soon toast"]
  → WORKING: [yes/no]

TAP TARGET: RSVP Button on Event Card
  → ACTION: [what happens]
  → WORKING: [yes/no]

TAP TARGET: Athlete Card
  → NAVIGATES TO: [screen name]
  → WORKING: [yes/no]

...
```

Do this for ALL roles. Be exhaustive — every button, every card, every link, every icon.

---

## PHASE 6: BROKEN / MISSING / ORPHANED CONNECTIONS

### 6A. Orphan Detection — CRITICAL

Many screens were built during earlier sprints but may have been DISCONNECTED when the home screens were rebuilt. These screens still exist as files but are no longer reachable.

**Method:**
1. From Phase 1, you have a list of ALL screen/component files.
2. From Phase 2, you have a list of ALL registered routes.
3. From Phase 5, you have a list of ALL navigation targets from tap actions.
4. CROSS-REFERENCE these three lists.

For every screen FILE that exists:
- Is it registered in a navigator? (yes/no)
- Is it imported by any other component? (check with grep)
- Is it reachable from any tap target? (yes/no)
- If NO to all three → it's ORPHANED. List it.

```bash
# For each screen file, check if it's imported anywhere
for f in $(find . -path "*/screens/*" -o -path "*/pages/*" -o -path "*/components/*" | grep -E "\.tsx$" | grep -v node_modules); do
  basename=$(basename "$f" .tsx)
  imports=$(grep -rn "$basename" --include="*.tsx" --include="*.ts" -l | grep -v "$f" | wc -l)
  echo "$f → imported by $imports files"
done
```

Also check:
```bash
# Find all navigation.navigate() and router.push() calls
grep -rn "navigate\|router\.push\|router\.replace\|navigation\.navigate\|onNavigate" --include="*.tsx" --include="*.ts" | grep -v node_modules
```
Cross-reference the target screen names with actual registered routes. Any target that doesn't match a registered route = broken navigation.

### 6B. Full Broken Connections List

List every instance where:
1. A button/card navigates to a screen that DOESN'T EXIST (route not registered)
2. A button/card navigates to the WRONG screen (registered but wrong content)
3. A button/card shows "Coming Soon" but the feature actually exists as a built screen somewhere in the codebase — it just got disconnected
4. A screen FILE exists but is ORPHANED — not registered, not imported, not reachable
5. A screen is registered in a navigator but has no real content (stub/placeholder/empty)
6. A screen WAS working before the home redesigns but got disconnected when navigation was rewired
7. Data is queried but the table/column doesn't exist in SCHEMA_REFERENCE.csv
8. A feature works on web but has no mobile equivalent at all
9. A screen is imported but commented out or conditionally excluded
10. A component is rendered but its onPress/onTap handler is empty, missing, or navigates to a non-existent route

For items 4 and 6, pay special attention to:
- Old dashboard components that were replaced by the new scroll-based homes
- Screens that used to be reached from quick action buttons on old dashboards
- Screens built during Coach Phase A-D, Parent PR#1-7, Player Phase 1-4 that may have been orphaned during the scroll redesigns
- Any file with "old" or "legacy" or "backup" in the name
- Any file in a folder like `screens/` or `pages/` that isn't imported by the current navigation tree

---

## PHASE 7: WEB ADMIN AUDIT (Same repo access)

The web admin lives at `C:\Users\fuent\Downloads\volleybrain-admin\`. It's gone through the same redesign cycles as mobile and may have its own orphaned pages and broken connections.

### 7A. Read the web route registry
Read `src/lib/routes.js` — this has every page ID and URL path.
Read `src/MainApp.jsx` — this has every `<Route>` definition.

### 7B. Read ALL sidebar navigation menus
The web admin has role-specific sidebars that show different nav items per role:
- `src/components/layout/AdminLeftSidebar.jsx` — admin sidebar nav items
- `src/components/coach/CoachLeftSidebar.jsx` — coach sidebar nav items
- `src/components/parent/ParentLeftSidebar.jsx` — parent sidebar nav items
- `src/components/player/PlayerProfileSidebar.jsx` — player sidebar nav items

For EACH sidebar, list every nav item and what page ID / route it links to.

### 7C. Cross-reference: Routes vs Sidebar vs Actual Files

For every route in `routes.js`:
- Is there a sidebar nav item that links to it? (for which roles?)
- Does the page component file actually exist and have real content?
- Is it accessible from any button/link on any dashboard or page?

For every sidebar nav item:
- Does the route it links to exist in routes.js?
- Does the page it points to have real content or is it a stub?

### 7D. Web Admin Broken Connections

List every instance where:
1. A sidebar nav item links to a page that doesn't render properly
2. A route exists in routes.js but no sidebar item or button links to it (orphaned route)
3. A page file exists in `src/pages/` but isn't registered as a route in MainApp.jsx
4. A button/link on any dashboard or page navigates to a route that doesn't exist
5. A modal exists as a component but nothing triggers it (no import, no onOpen)
6. The 3-column layout for any role has panels that reference components that were renamed or moved during redesigns
7. Any "navigate" or "onNavigate" call references a page ID that isn't in routes.js

Pay special attention to:
- Coach dashboard components that were part of the visual overhaul (CoachCenterDashboard, CoachCommandStrip, etc.)
- Parent dashboard components (ParentCenterDashboard, PriorityCardsEngine, etc.)
- Player dashboard (PlayerCenterFeed, PlayerSocialPanel)
- Team wall pages (there were duplicate file issues between `public/TeamWallPage` and `teams/TeamWallPage`)

### 7E. Web Admin Feature Status

For each page, classify:
- ✅ **Full** — page works, has real data, all interactions functional
- ⚠️ **Partial** — page renders but some features broken or incomplete
- 🔧 **Stub** — page exists but is mostly placeholder
- ❌ **Broken** — page errors, doesn't render, or is orphaned

---

## PHASE 8: FULL-SCREEN EXPERIENCE RECOMMENDATIONS

Based on everything you found, create a prioritized list of full-screen experiences the mobile app needs. For each one:

```
SCREEN: [name]
PURPOSE: [what it does]
WHO USES IT: [roles]
SHARED OR ROLE-SPECIFIC: [shared with role-based rendering | unique per role]
CURRENT STATE: [exists and works | exists but broken | stub | doesn't exist]
PRIORITY: [critical | high | medium | low]
COMPLEXITY: [simple single screen | multi-step workflow | heavy interaction]
DEPENDS ON: [what other screens or features it needs]
```

Categories:
- Single-screen experiences (view + light interaction)
- Multi-step swipe workflows (wizards, forms)
- Heavy interaction screens (data entry, drag-drop, real-time)
- Shared screens with role-specific rendering

---

## OUTPUT

Save the complete audit as `MOBILE-APP-AUDIT.md` in the project root.

Structure:
1. Executive Summary (15 lines: total screens both platforms, what's working, what's broken, biggest gaps)
2. Mobile File Tree
3. Mobile Route Map
4. Mobile Screen Inventory (per role)
5. Mobile Tap Target Map (per role home screen)
6. Mobile Broken / Missing / Orphaned Connections
7. Web Admin Route Registry + Sidebar Nav Audit
8. Web Admin Broken Connections + Feature Status
9. Feature Matrix: Web vs Mobile vs Neither (THE KEY DELIVERABLE)
10. Full-Screen Experience Recommendations (prioritized, with complexity and dependencies)

**Commit:** `git add MOBILE-APP-AUDIT.md && git commit -m "Full mobile app screen and navigation audit" && git push`

---

*This audit is the foundation for every build decision going forward. Be thorough. Be honest. Miss nothing.*
