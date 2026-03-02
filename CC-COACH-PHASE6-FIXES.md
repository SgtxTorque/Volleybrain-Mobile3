# Coach UX — Phase 6: Home Screen Fixes + Team Hub Fix

## RULES STILL APPLY
Read CC-COACH-UX-REDESIGN.md in the project root for the full spec and rules. Read SCHEMA_REFERENCE.csv before writing ANY query. Read existing code before changing it. Cross-reference `C:\Users\fuent\Downloads\volleybrain-admin\src\pages/` for query patterns. Do NOT break parent, admin, or player experiences. `npx tsc --noEmit` after all changes.

## IMPORTANT CONTEXT
The Parent Home screen has already been redesigned and is working well. Use it as the visual and structural reference for how the Coach Home should look and feel. Read the ParentDashboard code to see the component patterns, card styles, preview layouts, and spacing that are already established. The coach home should match that quality and style — not invent new patterns.

---

## FIX 1: Team Selector — Too Wide for Long Team Lists
**Problem:** The pill tabs stretch awkwardly when a coach has many teams with long names (e.g., "BH STINGERS", "BLACK HORNETS ELITE"). The row gets wonky.
**Fix:** Make the team selector a horizontal scrollable row with compact pills. If names are long, truncate with ellipsis. The pills should NOT stretch to fill the screen — they should be auto-width based on text length, scrollable horizontally if they overflow. Look at how the parent Schedule tab handles child filter pills for reference.

---

## FIX 2: Season Overview — Wrong Layout
**Problem:** Currently rendered as 4 separate button-style cards (Wins, Losses, Players, Win %) in a grid. This is the old "Season Overview" style.
**Fix:** Replace with a SINGLE card that looks like the Season Record card design:
- One card, full width
- Trophy icon + "SEASON RECORD" header
- Inside the card, 3 large numbers in a row: Games (total, white/dark text) | Wins (green) | Losses (red)
- Below the numbers: a progress bar showing win percentage (green fill for wins, gray for remaining)
- Additionally show: roster count, average attendance trend (last 4 events), next game countdown, games needing stats count
- The "Details" link in the top-right navigates to a full season stats screen
- This should be ONE cohesive card, not 4 separate cards

---

## FIX 3: Hero Event Carousel — Missing
**Problem:** The hero carousel of upcoming events is not showing on the coach home. There's an "ALL CLEAR / No upcoming events" card instead of proper hero event cards.
**Fix:** Build the same hero-style event carousel that exists on the parent dashboard. Read the parent ParentDashboard code and find the event carousel component — reuse it or build the coach version to match.
- 3 swipeable hero cards with bold visual style (dark gradient background, large text)
- Each card: event type, date/time, location, opponent (if game), RSVP count for coaches
- 4th card: "View Full Schedule →" link
- When no events exist, show a single "No upcoming events" card — but still in the hero card visual style, not a plain text block
- Pagination dots below the carousel
- Cards should be tappable

---

## FIX 4: Quick Actions — Wrong Size and Layout
**Problem:** Currently showing as 2 rows of 2 large square buttons (Take Attendance, Enter Stats, Send Blast, Game Prep). These are way too big and take up too much screen space.
**Fix:** Change to 1 row of 4 small compact buttons. Use the same size and style as the Season Overview stat boxes (the Wins/Losses/Players/Win% cards in the screenshot — that SIZE is what the quick action buttons should be). Each button:
- Small square or rounded rectangle
- Icon on top, label below
- All 4 in a single horizontal row
- The 4 buttons: Game Day | Game Prep | Roster | Enter Stats
- Keep the current icons but make them smaller to fit the compact layout

---

## FIX 5: Remove Team Health Section from Home
**Problem:** Team Health (Attendance 100%, Available --, Players 1) is still on the home screen. We decided to remove it from the home layout.
**Fix:** Remove the Team Health section from the coach home screen. Do NOT delete the component — just remove it from the home screen render. It may be used elsewhere later.

---

## FIX 6: Messages Preview — Wrong Format
**Problem:** The "MESSAGES" section shows "No messages yet" in a generic empty state card. This doesn't match what we designed.
**Fix:** This should be a "Chat Preview" card that matches the parent dashboard pattern. Read the ParentDashboard code to find the chat preview component and replicate or reuse it for coaches.
- Show the most recent chat conversation for the selected team
- Card shows: channel name, last message snippet, timestamp
- Tap navigates to that conversation in the Chat tab
- If no messages exist, show a subtle empty state (not a large card with an icon) — just a small "No recent messages" text or hide the section entirely
- Section header: "CHAT PREVIEW" with "View All" link that goes to Chat tab

---

## FIX 7: Team Feed Preview — Wrong Format
**Problem:** The "TEAM FEED" section shows a list of posts with names and dates. This doesn't match the parent dashboard design.
**Fix:** This should be a "Team Hub Preview" card that matches the parent dashboard pattern. Read the ParentDashboard code to find the team hub preview component and replicate or reuse it for coaches.
- Show only the MOST RECENT post (not a list of posts)
- Card shows: author avatar, author name, timestamp, post preview (first 2 lines)
- Tap navigates to the Team tab
- Section header: "TEAM HUB" with "View All" link that goes to Team tab
- Match the visual style from the parent dashboard exactly

---

## FIX 8: Team Hub Tab — "No Teams Assigned" Error
**Problem:** The Team tab shows "No Teams Assigned" even though the coach IS assigned to teams (13U, BH Stingers, Black Hornets Elite — visible in the home screen team selector).
**Fix:** The Team Hub is not querying the correct table to find the coach's team assignments. 
- Check SCHEMA_REFERENCE.csv for the coach-to-team relationship table (likely `team_staff`, NOT `team_coaches` — we've had this issue before)
- Cross-reference how the Coach Home screen successfully fetches teams for the team selector pills — use that SAME query pattern
- The Team Hub should load the same teams the home screen loads
- Once teams are found, render the Team Hub with: hero header (team name + record), team wall, quick access row (Schedule, Roster, Achievements)
- If coach has multiple teams, show team selector pills at the top (same as home)

---

## FIX 9: Chat FAB — Missing Labels
**Problem:** The floating action button menu shows 3 icons (megaphone, people, chat bubble) but no text labels. Users can't tell what each button does.
**Fix:** Add text labels next to each FAB option:
- 📢 "Blast" (or "Blast Message")
- 👥 "New Channel"  
- 💬 "New Message"
- ✕ Close button
Labels should be to the left of each icon, white text on a dark pill background, like a standard expandable FAB pattern.

---

## FIX 10: Game Recap / Results Card Style (for future reference)
**Note:** When game recaps or results are shown anywhere in the app (home screen, schedule, team hub), the card format should be:
- Team name on the left, opponent name on the right
- Points per set in the middle (e.g., "25-20, 25-18, 23-25, 25-21")
- Date and venue in small text at the bottom of the card
- W/L indicator (green for win, red for loss)
- This is the standard game result card format — apply it everywhere game results appear

---

## FIX 11: Needs Attention Section — Overlapping Content
**Problem:** From the screenshot, the "NEEDS ATTENTION" section (16 players missing waivers, 4 games need stats) appears to overlap with the Team Hub preview card above it. The cards are stacking on top of each other.
**Fix:** Check the spacing and z-index of the Needs Attention section. It should have proper margin-top separating it from the section above. Each section on the home screen should have consistent vertical spacing between them — check the parent dashboard for the spacing pattern used there.

---

## VERIFICATION CHECKLIST
After all fixes:
- [ ] Team selector scrolls horizontally, handles long team names
- [ ] Season Overview is ONE card with Games/Wins/Losses + progress bar
- [ ] Hero event carousel shows with bold hero cards (matches parent style)
- [ ] Quick actions are 1 row of 4 small buttons
- [ ] Team Health section removed from home
- [ ] Chat Preview matches parent dashboard component
- [ ] Team Hub Preview matches parent dashboard component (single latest post)
- [ ] Team Hub tab loads teams correctly (same query as home team selector)
- [ ] Chat FAB has text labels on all options
- [ ] No overlapping sections, consistent spacing
- [ ] Parent experience unchanged
- [ ] Admin experience unchanged
- [ ] Player experience unchanged
- [ ] `npx tsc --noEmit` — zero new errors

Show me your plan, then fix all 11 items.
