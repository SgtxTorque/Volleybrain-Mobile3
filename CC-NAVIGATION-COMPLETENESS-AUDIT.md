# CC-NAVIGATION-COMPLETENESS-AUDIT.md
# Lynx Mobile — Navigation Completeness + Platform Parity Audit

**Priority:** HIGH — features exist but users can't find them  
**Estimated time:** 3–4 hours (5 phases, commit after each)  
**Risk level:** LOW — adding navigation links and menu items, not changing features

---

## WHY THIS EXISTS

Features have been built across many CC sessions, but navigation was wired inconsistently. Some features are only reachable from one specific screen. Some were built but never added to the gesture menu. Some exist on web but not mobile, or vice versa. The result: users can't find features, get lost, panic-close the app, and forget what they were looking for.

**The rule going forward:** Every feature for every role must be reachable from at least TWO places:
1. The natural screen where it belongs (e.g., evaluations from the coach home scroll)
2. The gesture drawer / More menu as a universal safety net

---

## PHASE 1: COMPLETE SCREEN INVENTORY

First, build a complete map of what exists.

### 1A. List every screen file

```bash
echo "=== APP SCREENS ==="
find app -name "*.tsx" -not -path "*_layout*" -not -path "*_legacy*" | sort

echo ""
echo "=== TAB SCREENS ==="
find app/\(tabs\) -name "*.tsx" | sort

echo ""
echo "=== AUTH SCREENS ==="
find app/\(auth\) -name "*.tsx" | sort

echo ""
echo "=== TOTAL COUNT ==="
find app -name "*.tsx" -not -path "*_layout*" -not -path "*_legacy*" | wc -l
```

### 1B. Map every screen to its role(s)

Create `NAVIGATION-MAP.md` in the repo root:

```markdown
# Lynx Navigation Map

## Screens by Role Access

### All Roles
| Screen | File | Reachable From |
|--------|------|---------------|
| ... | ... | ... |

### Admin Only
| Screen | File | Reachable From |
|--------|------|---------------|
| ... | ... | ... |

### Coach Only (or Coach + Admin)
| Screen | File | Reachable From |
|--------|------|---------------|
| ... | ... | ... |

### Parent Only
| Screen | File | Reachable From |
|--------|------|---------------|
| ... | ... | ... |

### Player Only
| Screen | File | Reachable From |
|--------|------|---------------|
| ... | ... | ... |
```

For the "Reachable From" column, trace EVERY `router.push` or `router.navigate` that points to this screen:

```bash
# For each screen, find what links TO it
# Example for player-evaluations:
grep -rn "player-evaluation\|playerEvaluation\|evaluation-session" --include="*.tsx" app/ components/ | grep -v "node_modules" | grep -v "reference/"
```

Do this for EVERY screen. Mark screens that have:
- ✅ 2+ entry points (good)
- ⚠️ 1 entry point only (needs gesture menu link)
- ❌ 0 entry points (orphaned — no way to get there)

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: complete screen inventory and navigation map"
git push
```

---

## PHASE 2: GESTURE DRAWER — THE UNIVERSAL SAFETY NET

The gesture drawer (More menu) must contain a link to EVERY feature available to the current role. It's the "I can't find it" fallback.

### 2A. Find the gesture drawer component

```bash
grep -rn "GestureDrawer\|DrawerContent\|MoreMenu\|gesture.*drawer\|drawer.*content" --include="*.tsx" app/ components/ | grep -v "node_modules" | grep -v "reference/"
```

### 2B. Define the complete menu for each role

**ADMIN drawer should contain:**

Section: Dashboard
- Home (→ home tab)

Section: Team Management  
- Teams (→ team-management)
- Players / Roster (→ players tab)
- Coach Directory (→ coach-directory)
- Users / Org Directory (→ users)

Section: Season
- Season Settings (→ season-settings)
- Season Archives (→ season-archives)
- Registration Hub (→ registration-hub)
- Standings (→ standings)
- Leaderboards (→ leaderboards)

Section: Game Day
- Game Day Command (→ game-day-command) *(if active match or upcoming game)*
- Game Results (→ game-results)
- Lineup Builder (→ lineup-builder)
- Attendance (→ attendance)

Section: Communication
- Blast Composer (→ blast-composer)
- Blast History (→ blast-history)
- Payment Reminders (→ payment-reminders)

Section: Finance
- Payments Dashboard (→ payments tab)
- Reports (→ season-reports)

Section: Engagement
- Challenges (→ coach-challenge-dashboard)
- Achievements (→ achievements)

Section: Tools
- Player Evaluations (→ evaluation-session)
- Jersey Management (→ jersey-management)
- Venue Manager (→ venue-manager) *(if exists)*
- Admin Search (→ admin-search)
- Coach Background Checks (→ coach-background-checks)
- Volunteer Assignment (→ volunteer-assignment)

Section: Settings
- Org Settings (→ org-settings)
- Notification Preferences (→ notification-preferences)
- Help (→ help)
- Invite Friends (→ invite-friends)

Section: Legal
- Privacy Policy
- Terms of Service
- Data Rights

Section: Account
- Edit Profile
- Sign Out

---

**COACH drawer should contain:**

Section: Dashboard
- Home

Section: My Team
- Roster (→ roster)
- Team Hub (→ team hub tab)
- Standings (→ standings)
- Leaderboards (→ leaderboards)

Section: Game Day
- Game Day Command (→ game-day-command)
- Lineup Builder (→ lineup-builder)
- Attendance (→ attendance)
- Game Results (→ game-results)
- Game Prep (→ game-prep)

Section: Engagement
- Challenges (→ coach-challenge-dashboard)
- Give a Shoutout (→ shoutout modal)
- Achievements (→ achievements)

Section: Coaching Tools
- Player Evaluations (→ evaluation-session)
- Blast Composer (→ blast-composer)
- Blast History (→ blast-history)
- Coach Availability (→ coach-availability)
- My Teams (→ my-teams)

Section: Communication
- Chat (→ chat tab)

Section: Settings
- Coach Profile (→ coach-profile)
- Notification Preferences
- Help
- Invite Friends

Section: Legal + Account
- (same as admin)

---

**PARENT drawer should contain:**

Section: Dashboard
- Home

Section: My Family
- My Kids (→ my-kids)
- Payments (→ family-payments)
- My Waivers (→ my-waivers)
- Registration (→ parent-registration-hub)

Section: Team
- Team Hub (→ team hub tab)
- Roster (→ roster)
- Standings (→ standings)
- Leaderboards (→ leaderboards)

Section: Engagement
- Challenges (→ achievements, challenges tab)
- Achievements (→ achievements)

Section: Settings
- Edit Profile
- Notification Preferences
- Help
- Invite Friends

Section: Legal + Account
- (same as admin)

---

**PLAYER drawer should contain:**

Section: Dashboard
- Home

Section: My Team
- Team Hub (→ team hub tab)
- Roster (→ roster)
- Standings (→ standings)
- Leaderboards (→ leaderboards)

Section: My Progress
- My Player Card (→ player-card with own ID)
- My Stats (→ my-stats)
- Challenges (→ achievements, challenges tab)
- Achievements (→ achievements)
- Season Progress (→ season-progress)

Section: Communication
- Chat (→ chat tab)

Section: Settings
- Edit Profile
- Notification Preferences
- Help
- Invite Friends

Section: Legal + Account
- (same as others)

### 2C. Implement the complete menus

For each role, add any MISSING items to the gesture drawer. Each menu item needs:
- Icon (from Ionicons or a consistent icon set)
- Label
- `onPress` → `router.push('/target-screen')`
- Role guard (only show to the right role)
- If the target screen doesn't exist yet: show the item but navigate to a "Coming Soon" stub or the `web-features` screen with `laptoplynx.png`

### 2D. Badge counts on menu items

Where applicable, show badge counts:
- Challenges: number of active challenges
- Registration Hub: number of pending registrations
- Payment Reminders: number of overdue payments
- Blast History: number of unread
- Player Evaluations: number of players due for evaluation

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: complete gesture drawer menus for all 4 roles - every feature reachable"
git push
```

---

## PHASE 3: FIX ORPHANED SCREENS

From the navigation map in Phase 1, fix every screen with 0 or 1 entry points.

### 3A. Screens with 0 entry points (orphaned)

These screens exist as files but NOTHING links to them. For each:
1. Add to the gesture drawer for the appropriate role(s)
2. Add to the natural parent screen (e.g., evaluation-session should be linked from coach home scroll AND coach tools)

### 3B. Screens with 1 entry point only

These are reachable but fragile — if that one link breaks, the screen is lost. For each:
1. Verify the gesture drawer has a link
2. If not, add one

### 3C. Verify every screen has ≥ 2 entry points

Re-run the trace from Phase 1:
```bash
# For each screen file, count how many other files link to it
for screen in $(find app -name "*.tsx" -not -path "*_layout*" | sort); do
  name=$(basename $screen .tsx)
  count=$(grep -rn "$name" --include="*.tsx" app/ components/ | grep -v "node_modules" | grep -v "reference/" | grep -v "$screen" | wc -l)
  if [ $count -lt 2 ]; then
    echo "⚠️ $name: only $count references"
  fi
done
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: fix all orphaned screens - every screen reachable from ≥ 2 places"
git push
```

---

## PHASE 4: BUTTON → DESTINATION VERIFICATION

Walk through every tappable element on the 10 most important screens and verify it goes to the right place. This catches the "I tapped a card and it took me somewhere unexpected" problem.

### For each screen, test every tappable element:

**Coach Home Scroll:**
- [ ] Team name pill → ?
- [ ] "Lineup set ✗" → lineup-builder
- [ ] "RSVPs ✗" → schedule or event detail
- [ ] "Last game stats ✗" → game-results
- [ ] Scouting card → ?
- [ ] "Send a Blast" → blast-composer
- [ ] "Give a Shoutout" → shoutout modal
- [ ] "Review Stats" → game-results or stats view
- [ ] "Create a Challenge" → challenge-library
- [ ] Team Health card → roster or team health detail
- [ ] "12 need attention" → players needing attention list
- [ ] Roster card → roster
- [ ] "View Roster" → roster
- [ ] Season record card → standings
- [ ] "View Leaderboard" → leaderboards
- [ ] Kills/Aces power bars → leaderboards or stats

**Parent Home Scroll:**
- [ ] Registration cards → registration hub or registration form
- [ ] Event hero card → event detail
- [ ] Quick glance: team record → standings
- [ ] Quick glance: balance due → family-payments
- [ ] Quick glance: level → achievements
- [ ] Quick glance: team chat → chat
- [ ] Team Hub preview → team hub
- [ ] "View All" on team hub → team hub
- [ ] Team Chat section → chat
- [ ] Player card(s) → player-card (trading card)

**Game Day Tab:**
- [ ] "Match in progress" banner → game-day-command (live match)
- [ ] Hero card "Live Command" → game-day-command
- [ ] Hero card "Get Directions" → maps app
- [ ] "Prep Lineup" → game-day-command (game prep) or lineup-builder
- [ ] THIS WEEK event cards → event detail
- [ ] Season Progress → ? (should go to standings or season detail)
- [ ] Standings tile → standings
- [ ] Season History tile → season-archives
- [ ] Upcoming event rows → event detail
- [ ] "Full Schedule" → schedule tab
- [ ] Recent Results → game-recap
- [ ] Coach Tools: Add Event → event creation
- [ ] Coach Tools: Attendance → attendance
- [ ] Coach Tools: Lineup → lineup-builder
- [ ] Coach Tools: Game Prep → game-prep or game-day-command

For each item: verify the `onPress` handler exists and points to the correct route. Fix any that are wrong, missing, or going to a catch-all/calendar fallback.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: button-to-destination verification on 10 key screens"
git push
```

---

## PHASE 5: PLATFORM PARITY CHECKLIST + REPORT

### 5A. Build the parity checklist

Create `PLATFORM-PARITY.md` in the repo root. This is a living document that tracks what exists on each platform.

```markdown
# Lynx Platform Parity Checklist
Last updated: [date]

## Feature Parity: Web vs Mobile

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| **Auth & Onboarding** |
| Login / Signup | ✅ | ✅ | |
| Role-based dashboards | ✅ | ✅ | |
| **Schedule & Events** |
| Calendar view | ✅ | ✅ | |
| Event creation | ✅ | ✅ | |
| Bulk event creation | ❌ | ❌ | H1-07 planned, web first |
| RSVP | ✅ | ✅ | |
| **Game Day** |
| Game Day Command Center | ❌ | ✅ | Mobile-first feature |
| Live scoring | ❌ | ✅ | |
| Lineup builder | ✅ | ✅ | |
| Attendance | ✅ | ✅ | |
| Game results entry | ✅ | ✅ | |
| **Chat** |
| Team chat | ✅ | ✅ | |
| Direct messages | ❌ | ❌ | H3 planned |
| Blast composer | ✅ | ✅ | |
| **Team Hub / Social** |
| Team Wall posts | ✅ | ✅ | |
| Photo gallery | ✅ | ✅ | |
| Shoutouts | ✅ | ✅ | |
| Hero banner carousel | ❌ | ✅ | Mobile Team Hub redesign |
| **Player Identity** |
| Trading card | ❌ | ✅ | Mobile-first, web has basic profile |
| Roster carousel | ❌ | ✅ | Mobile-first |
| OVR badge / power bars | ✅ (web profile) | ✅ | |
| Achievements / badges | ✅ | ✅ | |
| Leaderboards | ✅ | ✅ | |
| **Engagement** |
| Challenge system | ❌ | ✅ | Mobile-first, needs web |
| Player evaluations | ✅ | ✅ | |
| XP / Level system | ✅ | ✅ | |
| **Admin** |
| Registration management | ✅ | ✅ | |
| Payment management | ✅ | ✅ | |
| Season management | ✅ | Partial | Full config on web |
| Team management | ✅ | ✅ | |
| User management | ✅ | ✅ | |
| Reports | ✅ | ✅ | |
| Org Dashboard (new) | ❌ | ❌ | H1-05 planned |
| Coach Dashboard (new) | ❌ | ❌ | H1-06 planned |
| Season Setup Wizard | ❌ | ❌ | H1-08 planned |
| **Settings** |
| Notification preferences | ❌ | ✅ | |
| Profile editor | ✅ | ✅ | |
| Privacy / Terms / Data | ✅ | ✅ | |

## Missing on Mobile (exists on Web)
- Bulk event creation
- Full season configuration (mobile has simplified version)
- Advanced reporting / data export

## Missing on Web (exists on Mobile)
- Game Day Command Center (mobile-only courtside tool)
- Trading card / roster carousel
- Challenge system
- Hero banner carousel on Team Hub
- Push notifications (mobile-only by nature)
- COPPA parental consent flow
```

### 5B. Generate the Navigation Completeness Report

Append to `NAVIGATION-MAP.md`:

```markdown
## Completeness Summary

### Screens with 2+ entry points: [N]
### Screens with 1 entry point: [N] — [list them]
### Screens with 0 entry points (orphaned): [N] — [list them]

### Gesture Drawer Coverage
- Admin: [N] items, [N] features covered / [N] total features
- Coach: [N] items, [N] features covered / [N] total features
- Parent: [N] items, [N] features covered / [N] total features
- Player: [N] items, [N] features covered / [N] total features

### Button Verification Results
- Correct: [N]
- Fixed: [N] — [list]
- Still broken: [N] — [list]
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: platform parity checklist + navigation completeness report"
git push
```

---

## EXPECTED RESULTS

1. **Complete Navigation Map** — Every screen documented with its role access and entry points
2. **Gesture Drawer Complete** — Every feature for every role accessible from the More menu. No feature is unreachable.
3. **Zero Orphaned Screens** — Every screen reachable from ≥ 2 places
4. **Button Verification** — Every tappable element on the 10 key screens verified to go to the correct destination
5. **Platform Parity Checklist** — Living document showing Web vs Mobile feature coverage, what's missing on each platform
6. **5 commits** — one per phase, each pushed
