# Admin UX — Phase 5: Polish & Fixes

## RULES STILL APPLY
Read CC-ADMIN-UX-REDESIGN.md in the project root for the full spec and rules. Read SCHEMA_REFERENCE.csv before writing ANY query. Read existing code before changing it. Do NOT break parent or coach experiences. `npx tsc --noEmit` after all changes.

---

## CRITICAL BUG FIXES (do these first)

### BUG 1: Coach Chat Crash — "Cannot read property 'split' of null"
**Error:** Render Error in `coach-chat.tsx` at `searchResults.map$argument_0`. The call stack shows `CoachChatScreen` in `app/(tabs)/coach-chat.tsx` crashing with "Cannot read property 'split' of null".
**Fix:** Open `app/(tabs)/coach-chat.tsx`. Find where `split` is called on a search result property. Add a null check — the value being split is null when there are no search results or when a property is missing. Use optional chaining: `value?.split(...)` or guard with `if (value)` before splitting.

### BUG 2: Invite Code Error — "Could not find the 'description' column of 'team_invite_codes'"
**Error:** When tapping the Invite quick action and trying to generate a code, an error says "Could not find the 'description' column of 'team_invite_codes' in the schema cache."
**Fix:** Check SCHEMA_REFERENCE.csv for the `team_invite_codes` table. Verify if a `description` column exists. If it doesn't, either:
- Remove `description` from the insert query (make it optional in the UI)
- OR add the column to the database (provide the ALTER TABLE SQL for me to run — do NOT run migrations yourself)
The invite code generation form currently shows "Description (Optional)" — if the column doesn't exist, remove it from both the UI and the query.

### BUG 3: Role Switcher Doesn't Refresh Current Tab
**Problem:** When switching roles using the role dropdown (e.g., Coach → Admin) while on My Stuff, the view stays as the previous role's My Stuff. The tab content doesn't refresh to show the new role's version.
**Fix:** When the role switcher changes roles, navigate the user back to the Home tab AND force a re-render of the tab navigator. Check how the role switcher currently works — it likely updates a context value but doesn't trigger navigation. Add `router.replace('/(tabs)/')` or equivalent after the role change to reset to Home.

---

## HOME SCREEN FIXES

### FIX 4: Org Health Banner — Add Hero Background
**Problem:** The org banner is functional but plain white. The parent and coach dashboards have visual hero elements. The admin deserves the same treatment.
**Fix:** Add a subtle background to the org health banner card. Options in order of preference:
- If the organization has an uploaded logo/photo in their profile, use it as a background with a dark gradient overlay (same pattern as the parent event hero cards)
- If no org photo, use a subtle volleyball/sports-themed gradient or texture
- Keep all text highly readable — white or light text on the dark overlay
- The banner should feel premium and engaging, not like a spreadsheet

### FIX 5: Season Selector — Bigger, Better UX
**Problem:** The season selector dropdown next to "Active" is tiny and easy to accidentally tap, which brings up the create season menu.
**Fix:** Replace the tiny dropdown with a full-width tappable bar below the org banner:
- Shows: "[Season Name] · Active ▾" (or "Upcoming" / "Completed" status)
- Tap opens a bottom sheet with the full season list
- In the bottom sheet: seasons listed with Active highlighted at top, then Upcoming, then a collapsible "Archived" section for completed seasons
- A "+ Create Season" button inside the bottom sheet (not inline with the selector)
- Much bigger tap targets, no accidental creates
- The current mini dropdown should be completely replaced

### FIX 6: Needs Attention — Single Animated Button (Match Parent Pattern)
**Problem:** The Needs Attention section is a long permanent list taking up too much home screen space. At season start this could be 8+ items dominating the dashboard.
**Fix:** Replace the entire Needs Attention list with a SINGLE animated button — the same pattern used on the Parent dashboard. Read the ParentDashboard code and find the "Needs Attention" button component. Reuse it or replicate the pattern exactly.
- One tappable button/card on the home screen with a count badge: "⚠️ 5 things need attention"
- Subtle pulse or glow animation to draw the eye
- Tap opens a bottom sheet with the full list of action items (pending regs, outstanding payments, missing waivers, unassigned players, games needing stats, low RSVP events)
- Each item in the bottom sheet is tappable and navigates to the relevant screen
- When an item is completed (e.g., all registrations approved), it disappears from the list with a celebration animation (confetti, checkmark, or similar)
- When ALL items are cleared, show a "✓ All clear!" celebration state in the bottom sheet
- The button on the home screen updates its count in real-time as items are resolved
- When count reaches zero, the button changes to a subtle "✓ All clear" state (stays visible but not urgent)
- This saves massive vertical space on the home screen compared to the current list

### FIX 7: Quick Actions — Rename "Approve" to "Registrations"
**Problem:** "Approve" is unclear to anyone who didn't build the app. It handles registrations, not just approvals.
**Fix:** Rename the button label from "Approve" to "Registrations". Keep the same icon. Keep the badge indicator for when new registrations need review. The tap destination stays the same — the registration management screen.

### FIX 8: Season Overview — Navigate to Reports, Not Settings
**Problem:** Tapping the Season Overview card opens the season settings menu. It should open a quick reports dashboard instead.
**Fix:** Change the tap destination of the Season Overview card. It should navigate to a season reports/summary screen showing: games breakdown, financial overview, attendance trends, registration funnel. If a reports screen doesn't exist yet, create a simple one with the key metrics from the Season Overview card expanded into a full-screen view with more detail. Season settings should ONLY be accessible from My Stuff.

### FIX 9: Team Snapshot — Navigate to Team Hub, Not Roster
**Problem:** Tapping a team in the Team Snapshot navigates directly to the roster screen. It should navigate to the full team hub (Feed/Roster/Schedule tabs).
**Fix:** Change the tap destination to navigate to the team hub (the same team wall/hub view that coaches see when they drill into a team). The team hub has tabs for Feed, Roster, Schedule, Achievements — much more useful than just the roster.
Also add a subtle label or subtitle on each team card like "View Team →" so the user knows what tapping will do.

---

## SCHEDULE FIXES

### FIX 10: Team Filter — Replace Pills with Dropdown
**Problem:** The team filter pills at the top of the schedule are broken/unreadable and won't scale to organizations with many teams.
**Fix:** Replace the pill tabs with a dropdown/bottom sheet pattern:
- Show a button at the top: "All Teams ▾" (default)
- Tap opens a bottom sheet with a searchable list of all teams
- Select a team to filter, or "All Teams" to show everything
- Selected team name shows in the button: "Black Hornets Elite ▾"
- This scales to hundreds of teams

### FIX 11: Schedule Event Cards — Make Compact with Expandable Detail
**Problem:** The schedule event cards are too tall for admin. They show RSVP info twice (inline on the card AND in an expanded section below). Too much vertical space consumed.
**Fix:** Redesign the admin schedule event card to be compact by default:
- **Collapsed (default):** One compact row showing: date (left), event type badge + time + opponent + team name (center), status icon (right). One line, minimal height.
- **Expanded (tap to expand):** Slides down to reveal: RSVP breakdown (going/maybe/out/pending), Directions button, Add to Cal button, Game Prep button. Only ONE RSVP display — no duplicates.
- Remove the separate RSVP section that currently sits below the card — fold it into the expandable area
- Team name label: use a darker, more readable color. The current yellow/orange text on white background has terrible contrast. Use the team's accent color but ensure WCAG AA contrast ratio, or just use dark text with a small colored dot/bar indicator.

---

## CHAT FIXES

### FIX 12: New Message Bottom Sheet — Position and Layout
**Problem:** The "New Message" bottom sheet opens too low on the screen and looks cut off. The search input within it is positioned awkwardly.
**Fix:** The New Message bottom sheet should:
- Open at 60-70% screen height (not the small default)
- Search input at the very top of the sheet, full width
- Results list below with proper padding
- The sheet should be draggable to full screen if the user pulls up
- Check if @gorhom/bottom-sheet snap points are configured correctly

---

## TEAMS TAB FIXES

### FIX 13: Team Hub Drill-Down — Add Achievements and Stats Tabs
**Problem:** When drilling into a team from the Teams tab, the team hub only shows Feed, Roster, and Schedule tabs. Missing Achievements and Stats.
**Fix:** Add "Achievements" and "Stats" (or "Player Stats") tabs to the team hub view. These should be the same tabs available in the coach team hub. If the tab bar gets too wide, make it horizontally scrollable.

---

## MY STUFF FIXES

### FIX 14: Add Registration Hub to My Stuff
**Problem:** Registration management is only accessible from the Quick Actions button. There's no path to it from My Stuff, which is where admins would expect to find org management tools.
**Fix:** Add a "Registration Hub" section to Admin My Stuff, positioned after Organization Settings. Tap navigates to the same registration management screen that the Quick Actions "Registrations" button goes to.

### FIX 15: Seasons List — Sort by Status with Collapsible Archive
**Problem:** The seasons list shows all 8 seasons in a flat list with no hierarchy. This will get unwieldy as more seasons are created.
**Fix:** Organize the seasons list by status:
1. **Active** (highlighted, green badge — always at top)
2. **Upcoming** (if any exist — shown next)
3. **Archived / Completed** — collapsible section, default collapsed, shows "[X] archived seasons" with expand toggle
This way the admin always sees their active season first without scrolling past old ones.

---

## REGISTRATION SCREEN FIXES

### FIX 16: Registration Stats — Consolidate into Single Card
**Problem:** The registration screen shows 8 separate stat boxes (Total, Approved, Rostered, Expected, New, Paid, Ready, Team) taking up too much vertical space as individual buttons.
**Fix:** Consolidate into a single "Registration Overview" card similar to the Season Record card pattern:
- One card, full width
- Key stats in a compact row: Total | Approved | Rostered (the most important 3)
- Below: a compact row of status indicators: New (count), Paid (count), Ready (count), On Team (count)
- Revenue line: "$1,875 collected / $6,500 expected" with progress bar
- This should take about half the vertical space of the current 8 separate boxes

### FIX 17: Registration Cards — Reduce Height
**Problem:** Each registration card (player card) has too much white space and is too tall, making scrolling through 30+ registrations tedious.
**Fix:** Compact the registration cards:
- Reduce vertical padding inside each card
- Player name, grade, status badge all on one line
- Season/sport info on a second line
- Pending count and dollar amount on the same line as the expand arrow
- Target: each card should be roughly 60-70px tall collapsed (currently looks like 100+)

### FIX 18: Registration — Add Season Filter
**Problem:** The registration list shows registrations across all seasons with no way to filter by a specific season.
**Fix:** Add a season filter at the top of the registration screen. Use the same dropdown/bottom sheet pattern as the schedule team filter: "All Seasons ▾" button that opens a bottom sheet with searchable season list.

---

## CROSS-ROLE FIX

### FIX 19: Hero Card Images Loading Slowly
**Problem:** When switching to parent/coach role, the hero event carousel images load very slowly.
**Fix:** Check how the hero card background images are loaded. Possible improvements:
- Use a placeholder/skeleton while the image loads
- Check if images are being loaded at full resolution — use a smaller/compressed version for card backgrounds
- Add `resizeMode="cover"` and appropriate cache headers
- If images are from Supabase storage, check if the URL includes size parameters
- This may just be a network issue, but add proper loading states so it doesn't look broken while loading

---

## VERIFICATION CHECKLIST
After all fixes:
- [ ] Coach chat no longer crashes (split error fixed)
- [ ] Invite code generation works without schema error
- [ ] Role switcher navigates to Home tab with correct role view
- [ ] Org banner has hero background treatment
- [ ] Season selector is a full-width bar → bottom sheet (no tiny dropdown)
- [ ] Needs Attention collapses after 3 items with expand button
- [ ] Quick action says "Registrations" not "Approve"
- [ ] Season Overview taps to reports, not settings
- [ ] Team Snapshot cards navigate to team hub, not roster
- [ ] Schedule team filter uses dropdown, not pills
- [ ] Schedule event cards are compact with expandable detail
- [ ] No duplicate RSVP info on schedule cards
- [ ] Team name labels are readable (good contrast)
- [ ] New Message bottom sheet positioned correctly
- [ ] Team hub drill-down has Achievements and Stats tabs
- [ ] Registration Hub accessible from My Stuff
- [ ] Seasons list sorted: Active → Upcoming → Archived (collapsed)
- [ ] Registration stats consolidated into single card
- [ ] Registration player cards are compact height
- [ ] Registration has season filter
- [ ] Hero images have loading states
- [ ] Parent experience unchanged
- [ ] Coach experience unchanged
- [ ] Player experience unchanged
- [ ] `npx tsc --noEmit` — zero new errors

Show me your plan, then fix all items. Start with the 3 critical bug fixes, then work through the rest in order.
