# LYNX — Parent Home Scroll: Phase 8 Tuning & Wiring
## For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)  
**GitHub:** SgtxTorque/volleybrain-mobile3  

---

## RULES (SAME AS ALWAYS — READ FIRST)

1. **Read SCHEMA_REFERENCE.csv FIRST** before writing or modifying ANY Supabase query. Verify every table name and column name against it. If a table or column doesn't exist, STOP, flag it in a comment, and skip that query.

2. **Read the existing code before changing it.** Read entire files first. Understand imports and dependencies. Do NOT break existing functionality.

3. **Cross-reference the web admin portal** at `C:\Users\fuent\Downloads\volleybrain-admin\src\pages/` for query patterns. The web app is the source of truth for database schema and query patterns.

4. **This is PARENT-ROLE ONLY.** Do NOT modify Admin, Coach, or Player experiences. All changes must be role-gated.

5. **Use the existing auth/permissions pattern.** Read how the app currently determines user roles. Match exactly what exists. Do NOT invent a new pattern.

6. **Check package.json BEFORE installing anything.**

7. **Surgical changes only.** Do not refactor, reorganize imports, rename variables, or "improve" working code. Fix and wire ONLY what's specified below.

8. **No console.log without `__DEV__` gating.**

9. **After every task group, run `npx tsc --noEmit`** and fix any errors before continuing.

10. **AUTONOMOUS EXECUTION MODE.** Run ALL task groups (A through D) in a single session without stopping. Do NOT ask for permission between task groups. Commit and push after each group. Make judgment calls and document them in code comments. Stop only if a build-breaking error cannot be resolved.

---

## TASK GROUP A: RESTORE ROLE SELECTOR (Critical — Do This First)

**Problem:** The role selector that existed on the old parent home screen was removed when the new ParentHomeScroll component replaced the dashboard content. Users with multiple roles (Admin + Coach + Parent) are now locked into the parent view with no way to switch.

**How to fix:**

A1. **Find how the role selector works on other dashboards.** Read the following files to understand the existing pattern:
- `components/CoachDashboard.tsx` (or wherever the coach home screen lives)
- `components/AdminDashboard.tsx` (or wherever the admin home screen lives)
- `components/PlayerDashboard.tsx` (or wherever the player home screen lives)
- `components/DashboardRouter.tsx` (this is the component that routes to the correct dashboard based on role)
- Search for any role switching logic: `grep -rn "role" components/Dashboard --include="*.tsx" -l` and `grep -rn "switchRole\|setRole\|roleSelect\|RoleSelect" --include="*.tsx" --include="*.ts" -rl`

A2. **Understand the role selector component.** It's likely a shared component or inline UI that:
- Shows available roles for the current user (e.g., pills/badges for Admin, Coach, Parent)
- Calls a function to switch the active role (probably updates a context or state in DashboardRouter)
- Lives in the header/toolbar area of each dashboard

A3. **Add the role selector to the ParentHomeScroll compact header.** The compact header currently shows:
```
🐱 LYNX                    🔔(4)  [CT avatar]
```
It should become:
```
🐱 LYNX      [role selector]  🔔(4)  [CT avatar]
```
Or if the role selector replaces the avatar (check how other dashboards do it):
```
🐱 LYNX      [role selector]  🔔(4)
```
Match EXACTLY how it appears on the other dashboards. Use the same component, same props, same styling. Just place it in the compact header row.

A4. **Also add the role selector to the welcome section (full state, before scroll).** Before the user scrolls, the welcome section is visible. The role selector should be accessible there too — likely in the top-right area near the notification bell. Again, match the existing pattern from other dashboards.

A5. **Verify:** Switch roles. Confirm Admin dashboard loads when Admin is selected, Coach dashboard loads when Coach is selected, Player dashboard loads when Player is selected. Confirm switching back to Parent shows the new scroll home.

**Commit:** `git add -A && git commit -m "Phase 8A: Restore role selector to parent home header" && git push`

**Immediately proceed to Task Group B.**

---

## TASK GROUP B: WIRE UP ALL TAP TARGETS

**Problem:** The home screen cards and buttons were built visually but their tap actions are not connected to the existing screens. The bottom nav bar and app drawer still work — only the home screen content taps are broken.

**How to fix:**

B1. **Read the existing navigation structure first.** Understand how the app routes to screens:
```bash
grep -rn "router.push\|router.navigate\|navigation.navigate\|href=" components/ParentHomeScroll.tsx components/parent-scroll/ --include="*.tsx" --include="*.ts"
```
Also check how the OLD parent dashboard navigated to these screens:
```bash
git log --oneline -20
```
Find the commit BEFORE Phase 1 of the scroll redesign. Read the old parent dashboard file to see what navigation calls it used. You may need:
```bash
git show [commit-hash-before-phase-1]:components/ParentDashboard.tsx
```
or whatever the old file was named.

B2. **Wire each tap target to the correct existing screen.** For each item below, find the correct route/screen by reading the existing app navigation (check `app/` directory structure for available routes):

| Element | Tap Action | How to Find the Route |
|---------|-----------|----------------------|
| **RSVP button** (event hero card) | Open RSVP flow for this event | Check how Schedule tab handles RSVP — likely a modal or bottom sheet. Search: `grep -rn "rsvp\|RSVP" --include="*.tsx" -rl` |
| **Directions button** (event hero card) | Open device maps with venue address | Use `Linking.openURL()` with a maps URL. Pattern: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue_address)}` |
| **Event hero card** (tap anywhere on card, not buttons) | Navigate to event detail screen | Check: `grep -rn "event-detail\|EventDetail\|event/" app/ --include="*.tsx" -l` |
| **Attention banner** ("4 things need attention") | Navigate to attention/notifications list | Check existing notification or attention screen. If none exists, navigate to a notifications screen or show an alert with the items. |
| **Athlete card** (each player card) | Navigate to player detail/profile screen | Check: `grep -rn "player-detail\|PlayerDetail\|player/" app/ --include="*.tsx" -l`. Pass the player ID. |
| **Record card** (metric grid — 6-1) | Navigate to season record or schedule screen | Check what the old dashboard linked to. Likely the Schedule tab or a game history screen. |
| **Balance card** (metric grid — $210) | Navigate to payment screen | Check: `grep -rn "payment\|Payment\|balance\|Balance" app/ --include="*.tsx" -l` |
| **Progress card** (metric grid — XP) | Navigate to player achievements/progress | Check: `grep -rn "achievement\|Achievement\|trophy\|progress" app/ --include="*.tsx" -l` |
| **Chat card** (metric grid — Team Chat) | Navigate to team chat (or switch to Chat tab) | Check: `grep -rn "chat\|Chat" app/\(tabs\)/ --include="*.tsx" -l`. May just need to switch to the Chat tab. |
| **Team Hub "View All"** | Navigate to Team Hub (or switch to Team tab) | Same pattern — may switch to the Team tab. |
| **Team Hub post card** | Navigate to full Team Hub feed | Same as View All. |
| **Recent Badges** (each badge pill) | Navigate to trophy case / achievements screen | Check: `grep -rn "trophy\|Trophy\|badge\|Badge\|achievement" app/ --include="*.tsx" -l` |
| **Notification bell** | Navigate to notifications screen | Check: `grep -rn "notification\|Notification" app/ --include="*.tsx" -l` |

B3. **Use the same navigation pattern the app already uses.** The app likely uses either `expo-router` (`router.push('/path')`) or `react-navigation` (`navigation.navigate('Screen')`). Do NOT mix patterns. Use whichever is already established.

B4. **Handle missing screens gracefully.** If a target screen doesn't exist yet (e.g., no dedicated "attention items" screen), either:
- Navigate to the closest existing screen (e.g., notifications)
- Show a brief toast/alert: "Coming soon"
- Document what's missing in a code comment: `// TODO: No dedicated attention screen yet — navigating to notifications`

B5. **Verify each tap target works.** Go through every tappable element on the home screen and confirm it navigates somewhere reasonable. No dead taps.

**Commit:** `git add -A && git commit -m "Phase 8B: Wire all home screen tap targets to existing screens" && git push`

**Immediately proceed to Task Group C.**

---

## TASK GROUP C: DATA ACCURACY & DISPLAY FIXES

**Problem:** Some data may be displaying incorrectly, missing, or using placeholder values.

C1. **Athlete cards — missing photos.** Players without profile photos show a yellow square with their initial. This is acceptable as a fallback BUT:
- The fallback square color should use the **team's primary color** if available, not yellow/gold for everyone
- Check if team color is available in the player/team data. If so, use it. If not, keep the gold fallback.
- Verify the photo URL is being queried correctly for players that DO have photos (Ava Test shows a photo, so the logic exists — just confirm it's working for all players)

C2. **Athlete cards — missing stats.** Sister 2 shows KILLS/ACES/DIGS/ASSISTS as dashes. This is correct behavior if no stats exist. But verify:
- The stat query is correct (check SCHEMA_REFERENCE.csv for the stats table)
- The dash display looks intentional, not broken (use "—" em-dash, not "-" hyphen)

C3. **Athlete cards — missing team/position info.** Sister 1's card shows just the name with no team or position. Ava Test shows "Black Hornets Elite · S · #1". Check if Sister 1 and Sister 2 have team assignments in the database. If they do, the query is missing data. If they don't, the display should gracefully show just the name (which it does — this may be fine).

C4. **Contextual messages — verify dynamic content.** The welcome message shows "Final buzzer for registration fees! Secure Sister's spot." Verify:
- The child's name is correct (should it say "Sister 2" or the actual first name?)
- The message is being generated from real data (actual unpaid balance) not hardcoded
- Multiple messages cycle correctly with fade transitions

C5. **Day-strip calendar — verify event dots.** Monday (2) has a small dot, Wednesday (4) has a larger dot. Verify these correspond to actual events in the database for this parent's teams.

C6. **Quick Glance / Metric Grid — verify data accuracy.**
- Record "6-1" and "7 games played" — verify against actual team season record in database
- Balance "$210" — verify against actual outstanding balance for this parent
- If there are Progress (XP) and Chat cards below the visible area, verify those too

**Commit:** `git add -A && git commit -m "Phase 8C: Data accuracy fixes and fallback improvements" && git push`

**Immediately proceed to Task Group D.**

---

## TASK GROUP D: VISUAL POLISH & ANIMATION TUNING

D1. **Welcome section spacing.** The welcome section should feel spacious but not require excessive scrolling to get past. If the welcome area is taller than ~40% of the screen height, reduce padding so the event hero card teaser is more visible without scrolling.

D2. **Compact header — ensure it feels solid.** The 🐱 LYNX header with the calendar below should feel anchored and stable. If there's any flicker during the welcome-to-header transition, smooth it out. The crossfade should be seamless.

D3. **Event hero card polish:**
- The volleyball icon in the top-right of the card should be more subtle (lower opacity if it's too prominent)
- The green pulse dot next to "TODAY" should animate (opacity pulsing loop)
- Card shadow should give a sense of elevation/depth

D4. **Athlete card polish:**
- Cards should have consistent height in compact state
- The LVL badge should always be right-aligned
- Photo cards (like Ava Test) and initial-fallback cards should look cohesive side by side

D5. **Metric grid polish:**
- Both cards in each row should be equal height
- The emoji icons (🏆, 💳) should be consistent size
- Numbers should use Bebas Neue font for the big values ("6-1", "$210")

D6. **Season section polish:**
- The big "6 | 1" numbers should be in Bebas Neue
- Win rate bar should feel proportional and clean
- "86% win rate" label should be centered below the bar

D7. **Recent Badges — ensure horizontal scroll works.** The "First Blo..." text is cut off in the last visible badge. Ensure badges have proper padding and the scroll area extends far enough to show all badges fully.

D8. **End of scroll — generous padding.** Make sure the "That's everything for now!" section has enough bottom padding (120px+) so it clears the bottom nav bar completely when scrolled to the end.

D9. **Bottom nav — verify auto-hide.** If auto-hiding was implemented in Phase 6:
- Confirm nav hides when actively scrolling
- Confirm nav returns after ~850ms of idle
- Confirm this ONLY happens on the parent home screen, not other tabs
- If auto-hide is causing issues or feels janky, DISABLE it for now (just make the nav always visible) and leave a TODO comment. Stability over polish.

D10. **Scroll feel overall.** The scroll should feel buttery smooth. If any animations cause frame drops:
- Simplify the animation (reduce number of interpolations running simultaneously)
- Ensure all animated styles use reanimated worklets (UI thread), not JS thread
- The velocity-sensitive card expansion is the most likely performance concern — if it's janky, simplify to just compact cards without expansion and leave a TODO

**Commit:** `git add -A && git commit -m "Phase 8D: Visual polish and animation tuning" && git push`

---

## VERIFICATION CHECKLIST (After All Task Groups)

Run through this entire checklist and report results:

**Role Switching:**
- [ ] Role selector visible in compact header
- [ ] Can switch to Admin → Admin dashboard loads
- [ ] Can switch to Coach → Coach dashboard loads  
- [ ] Can switch to Player → Player dashboard loads
- [ ] Can switch back to Parent → Scroll home loads

**Tap Targets (Parent Home):**
- [ ] RSVP button → RSVP flow opens
- [ ] Directions button → Maps app opens with venue
- [ ] Event hero card tap → Event detail screen
- [ ] Attention banner → Notifications or attention list
- [ ] Each athlete card → Player detail/profile
- [ ] Record metric card → Season/schedule detail
- [ ] Balance metric card → Payment screen
- [ ] Progress metric card → Achievements
- [ ] Chat metric card → Chat tab or team chat
- [ ] Team Hub "View All" → Team Hub feed
- [ ] Team Hub post tap → Team Hub feed
- [ ] Each badge pill → Trophy case
- [ ] Notification bell → Notifications screen

**Data:**
- [ ] Parent name correct in welcome
- [ ] Child names correct on athlete cards
- [ ] Player photos loading where available
- [ ] Event data matches database
- [ ] Record matches database
- [ ] Balance matches database

**Other Roles (Smoke Test):**
- [ ] Admin dashboard unchanged and functional
- [ ] Coach dashboard unchanged and functional
- [ ] Player dashboard unchanged and functional

**Final:**
```bash
npx tsc --noEmit
```
Report result.

**Final commit (if any cleanup):** `git add -A && git commit -m "Phase 8: Final verification cleanup" && git push`

---

*This completes Phase 8. After this, the Parent Home Scroll Redesign should be fully functional, wired up, and polished. Remaining work (Coach/Player/Admin dashboard redesigns) will be separate specs.*
