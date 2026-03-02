# Admin UX — Phase 6: Polish Round 2

## RULES STILL APPLY
Read CC-ADMIN-UX-REDESIGN.md in the project root for the full spec and rules. Read SCHEMA_REFERENCE.csv before writing ANY query. Read existing code before changing it. Do NOT break parent or coach experiences. `npx tsc --noEmit` after all changes.

---

## FIX 1: Org Health Banner — Allow Custom Photo Upload
**Problem:** The hero banner background is bright yellow. There's no way for the admin to customize it with their own photo.
**Fix:** 
- For now, change the default banner background from bright yellow to a refined dark gradient (deep teal/dark navy — matching the app's existing dark gradient palette used in event hero cards). This looks good without a custom photo.
- Add a camera/edit icon in the corner of the banner. Tap opens the image picker to upload a custom banner photo.
- When a custom photo is uploaded, display it as the banner background with a dark gradient overlay for text readability (same pattern as event hero cards).
- Store the banner image URL in the organization's profile record. Check SCHEMA_REFERENCE.csv for the organizations table — look for a `banner_url`, `cover_image`, or similar column. If none exists, use `logo_url` or flag that an ALTER TABLE is needed.
- Also add this option to My Stuff → Organization Settings: "Upload Org Banner Photo"

---

## FIX 2: Quick Action Button — "Registrations" Text Too Long
**Problem:** The word "Registrations" is too long for the compact quick action button, causing the "s" to wrap to the next line.
**Fix:** Shorten the label to "Regs" to match the compact button size. Keep the same icon and badge indicator. Alternatively, if "Regs" feels too informal, use a slightly smaller font size to fit "Registrations" on one line — but "Regs" is probably the cleaner solution since all other buttons are short words (Payments, Invite, Blast).

---

## FIX 3: Reports Screen — Make Cards Navigable and More Robust
**Problem:** The reports screen that opens from the Season Overview card is basic. The cards should navigate to their respective detail pages, and more metrics would be useful.
**Fix:** 
- Each card on the reports screen should be tappable and navigate to the relevant management screen:
  - Games card → Schedule tab (filtered to games)
  - Financial card → Payments screen
  - Registration card → Registration hub
  - Attendance card → Attendance detail view (if it exists) or a breakdown by team
  - Teams card → Teams tab
- Add more report cards if not already present:
  - **Waiver Compliance** — X/Y players compliant, percentage, tap to view waiver status list
  - **Roster Fill** — Roster utilization per team (e.g., "13U: 12/15, BH Stingers: 10/12"), tap to Teams tab
  - **Payment Collection Rate** — Percentage collected vs expected, breakdown by payment method
  - **Upcoming Events** — Count of events this week/month across all teams
- Each card should show: icon, metric number, label, and a subtle "→" indicator showing it's tappable

---

## FIX 4: All Players Directory — Add to Teams Tab
**Problem:** Admins have no way to see ALL players across the organization in one view. The old roster page was removed and the Teams tab only shows teams, not individual players.
**Fix:** Add an "All Players" entry to the top of the Teams tab, above the team list:
- A prominent card or button at the top: "👥 All Players ([total count])" 
- Tap opens an org-wide player directory screen:
  - Search bar at top (search by name)
  - Filter options: by team, by registration status, by payment status, by waiver status
  - Player list showing: player name, age/grade, team assignment, registration status badge
  - Tap a player → opens their full profile (same detail view coaches see)
  - Admin actions on each player: move to different team, edit info, view payment status
- This is the master list — every registered player in the org regardless of team
- Query: Fetch all players for the current org/season. Check SCHEMA_REFERENCE.csv for the players table and how it links to teams and registrations.

---

## FIX 5: Schedule — Deselect Day to Return to Week View
**Problem:** When viewing the schedule, tapping a specific day filters to only that day's events. But there's no way to deselect and return to the full week view. Once a day is selected, you're stuck selecting individual days.
**Fix:** Make the day selection act as a toggle:
- Tap a day → filters to that day's events (current behavior)
- Tap the SAME already-selected day again → deselects it and returns to showing all events for the visible week
- Visual: the selected day has a highlighted circle/background. When deselected, it returns to normal styling.
- This is a simple toggle — no extra buttons needed, no clutter added.

---

## FIX 6: Chat New Message — Show Member List by Default
**Problem:** The "New Message" bottom sheet opens with only a search bar and no visible member list. Admins have to type a name to find anyone. 
**Fix:** When the New Message sheet opens, show:
- Search bar at the top (keep this)
- Below: a scrollable list of ALL org members immediately visible
- Each member shows: avatar, name, role badge (Parent/Coach/Admin)
- Typing in the search bar filters the list in real-time
- Tap a member to start a conversation
- This way admins can browse and select without needing to know the exact name
- Sort the member list: Coaches first, then Parents, then Players (within each group, alphabetical)
- Check SCHEMA_REFERENCE.csv for the profiles/members table to query all org members

---

## FIX 7: My Stuff Seasons List — Fix Sorting and Navigation
**Problem:** The seasons list is not properly sorted. The active season (Spring 2026) appears in the middle of the list instead of at the top. Other seasons that may be active don't have the "Active" badge. Tapping any season always defaults to showing Spring 2026 data instead of that specific season's detail.
**Fix:**
- **Sort order:** Active seasons at the very top with green "Active" badge. Then Upcoming. Then Completed/Archived in a collapsible section.
- **Badges:** EVERY season with an active status gets the green "Active" badge. Check the status column in SCHEMA_REFERENCE.csv for the seasons table — verify what statuses exist (active, upcoming, completed, archived, etc.) and badge each one appropriately:
  - Active → green "Active" badge
  - Upcoming → blue "Upcoming" badge  
  - Completed → gray "Completed" badge
  - Draft → orange "Draft" badge
- **Navigation:** Tapping a season must navigate to THAT SPECIFIC season's detail screen, passing the tapped season's ID. Do NOT hardcode or default to the global active season. The detail screen should show that season's info: name, dates, teams, registration count, status. Debug by logging the season ID being passed on tap.
- **Collapsible archive:** Completed/archived seasons should be in a collapsible section at the bottom: "Archived (X)" — collapsed by default, tap to expand.

---

## VERIFICATION CHECKLIST
After all fixes:
- [ ] Org banner has dark gradient default (not bright yellow)
- [ ] Camera icon on banner to upload custom photo
- [ ] Quick action says "Regs" (fits on one line)
- [ ] Reports cards are tappable and navigate to relevant screens
- [ ] Reports has additional metrics (waivers, roster fill, payment rate)
- [ ] "All Players" directory accessible from top of Teams tab
- [ ] Player directory has search, filters, tap to profile
- [ ] Schedule day selection toggles — tap again to deselect and show full week
- [ ] New Message shows full member list by default (not just search bar)
- [ ] Seasons sorted: Active (top, badged) → Upcoming → Archived (collapsed)
- [ ] Every active season has the "Active" badge
- [ ] Tapping a season navigates to THAT season's detail (not always Spring 2026)
- [ ] Parent experience unchanged
- [ ] Coach experience unchanged  
- [ ] Player experience unchanged
- [ ] `npx tsc --noEmit` — zero new errors

Show me your plan, then fix all 7 items.
