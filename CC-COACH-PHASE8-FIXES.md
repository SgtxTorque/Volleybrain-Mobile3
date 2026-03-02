# Coach UX — Phase 8: Polish Fixes

## RULES STILL APPLY
Read CC-COACH-UX-REDESIGN.md in the project root for the full spec and rules. Read SCHEMA_REFERENCE.csv before writing ANY query. Read existing code before changing it. Do NOT break parent, admin, or player experiences. `npx tsc --noEmit` after all changes.

---

## FIX 1: Season Record — Remove Redundant Header and Details Link
**Problem:** The Season Record section has "SEASON RECORD" as a section header above the card, AND "SEASON RECORD" again inside the card with a trophy icon. There's also a "Details" hyperlink next to the section header. This is redundant.
**Fix:**
- Remove the "SEASON RECORD" section header text above the card
- Remove the "Details" hyperlink
- Make the entire Season Record card tappable — tapping it navigates to the full season stats/details screen
- The card itself already has the trophy icon + "SEASON RECORD" label inside — that's sufficient
- With the section header removed, the card should move up to fill the gap, giving more vertical space

---

## FIX 2: Hero Event Carousel — Not Loading Events for Selected Team
**Problem:** When "BLACK HORNETS ELITE" is selected in the team selector, the hero carousel shows "NO UPCOMING EVENTS" even though this team has events scheduled. The parent dashboard loads events correctly. The coach carousel is not properly filtering events by the selected team.
**Fix:**
- Read how the ParentDashboard hero carousel queries events — it works correctly
- The coach carousel must filter events by the currently selected team ID from the team selector
- When the team selector changes, the carousel must re-query events for that specific team
- Check SCHEMA_REFERENCE.csv for how events link to teams (likely through `schedule_events` table with a `team_id` column — verify)
- Make sure the query matches the pattern used in the parent carousel, but filtered to the selected team instead of all teams for a parent's children
- Debug: log the selected team ID and the events query to verify it's passing the correct team filter

---

## FIX 3: Team Hub — Remove "TEAM" Header and Chat Button
**Problem:** The Team Hub tab has a large "TEAM" text header at the top with a chat bubble button next to it. This is no longer needed because chat now has its own dedicated tab in the bottom navigation.
**Fix:**
- Remove the "TEAM" header text
- Remove the chat bubble icon/button next to it
- Everything below (the team card with "13U / 1 Players / 0 Coaches", the Feed/Roster/Schedule/Achievements tabs, and the wall content) should move up to fill the space
- The team selector pills at the top of the screen remain

---

## FIX 4: Team Hub — Profile Photo Not Showing in Posts
**Problem:** In the team wall posts, the user's initials ("CT") show instead of their actual profile photo. The profile photo exists (it shows correctly in the Team Hub Preview on the Home screen where "Carlos test" has the real photo).
**Fix:**
- Check how the team wall post component fetches the author's avatar
- It should be pulling the profile photo URL from the user's profile (check SCHEMA_REFERENCE.csv for the profile photo/avatar column — likely `avatar_url` or `photo_url` in the `profiles` table)
- The Home screen Team Hub Preview card correctly shows the photo, so compare how that component fetches the avatar vs how the team wall post component does it
- If the wall post component is only showing initials, it's likely not querying the avatar field or the field name is wrong
- Fix the query to include the avatar URL and render the image when available, falling back to initials only when no photo exists

---

## FIX 5: Chat Preview — Not Changing with Team Selector
**Problem:** The Chat Preview section on the Coach Home always shows "13U - Team Chat" regardless of which team is selected in the team selector. Switching to "BH STINGERS" or "BLACK HORNETS ELITE" does not update the chat preview.
**Fix:**
- The Chat Preview must filter by the currently selected team
- When the team selector changes, re-query the most recent chat conversation for that specific team's channels
- Check SCHEMA_REFERENCE.csv for how chat channels/rooms link to teams (likely a `team_id` on the chat channel/room table)
- The query should find the most recent message in any chat channel belonging to the selected team
- When the team changes, the chat preview card should update to show the latest message from that team's channels

---

## FIX 6: Team Hub Preview (on Home) — Also Not Changing with Team Selector
**Problem:** Related to Fix 5 — verify that the Team Hub Preview on the Home screen also updates when the team selector changes. If it's showing the latest post from 13U regardless of selected team, apply the same fix: filter team wall posts by the selected team ID.
**Fix:**
- Query team wall posts filtered by the selected team ID
- When team selector changes, re-query and update the preview
- Check the parent dashboard to see if this pattern exists there for multi-child parents

---

## VERIFICATION CHECKLIST
After all fixes:
- [ ] Season Record has no redundant header or Details link — card is tappable
- [ ] Hero carousel loads correct events for whichever team is selected
- [ ] Switching teams in selector updates the carousel events
- [ ] Team Hub has no "TEAM" header or chat button — content moves up
- [ ] Profile photos show in team wall posts (not just initials)
- [ ] Chat Preview updates when team selector changes
- [ ] Team Hub Preview updates when team selector changes
- [ ] Parent experience unchanged
- [ ] Admin experience unchanged
- [ ] Player experience unchanged
- [ ] `npx tsc --noEmit` — zero new errors

Show me your plan, then fix all 6 items.
