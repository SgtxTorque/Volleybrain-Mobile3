# Coach UX — Phase 7: Critical Layout Fixes

## RULES STILL APPLY
Read CC-COACH-UX-REDESIGN.md in the project root for the full spec and rules. Read SCHEMA_REFERENCE.csv before writing ANY query. Read existing code before changing it. Do NOT break parent, admin, or player experiences. `npx tsc --noEmit` after all changes.

## REFERENCE
Read the ParentDashboard code — specifically the hero event carousel component. The coach home should use the SAME carousel component or an identical pattern. Do NOT invent a new event display. Match what the parents already have.

---

## FIX 1: Remove the "ALL CLEAR" Card Entirely
**Problem:** There is a large dark gradient card that says "ALL CLEAR / No upcoming events scheduled." This was from the old coach dashboard. It should not exist on the new coach home.
**Fix:** Remove this card completely from the CoachDashboard. Replace it with the hero event carousel (Fix 2). If there are no upcoming events, the carousel should show a single hero-style card that says "No upcoming events" in the same bold visual style — NOT a separate "All Clear" component.

---

## FIX 2: Hero Event Carousel — Use the Parent's Carousel
**Problem:** The coach home does not have the hero event carousel. The parent home has a working, beautiful hero carousel with bold visual cards, pagination dots, and swipe behavior. The coach home should have the EXACT SAME thing.
**Fix:** 
- Find the hero event carousel component used on the ParentDashboard
- Reuse it on the CoachDashboard (or create a shared component if it isn't already shared)
- The carousel should show the next 3 upcoming events for the selected team as hero-style cards (dark gradient, large text, event type, date/time, location, opponent)
- For coaches, additionally show RSVP count on each card ("9 of 12 confirmed")
- 4th position: "View Full Schedule →" link card
- Pagination dots below
- Cards are tappable
- This carousel goes AFTER the Season Record card, not before it

---

## FIX 3: Section Order on Coach Home — Wrong
**Problem:** The current order is: Team Selector → "All Clear" card → Season Record → Quick Actions → Team Hub. This is wrong.
**Fix:** The correct order from top to bottom is:
1. **Team Selector** (scrollable pills)
2. **Season Record** (single card with Games/Wins/Losses/progress bar)
3. **Hero Event Carousel** (the parent-style carousel — Fix 2)
4. **Quick Actions** (1 row, 4 small buttons)
5. **Team Hub Preview** (single latest post, "View All" link)
6. **Chat Preview** (single latest message, "View All" link)
7. **Team Badges Preview** (if applicable)

Remove EVERYTHING that is not in this list from the coach home. No "All Clear" card, no Team Health, no old-style messages section, no old-style team feed list.

---

## FIX 4: Team Hub Tab — Remove the Duplicate Top Section
**Problem:** The Team Hub tab currently shows TWO different team hubs stacked on top of each other. There's a top section with the team name, "Head Coach" label, record badge (0-0), and quick access buttons (Schedule, Roster, Achievements, Player Stats). Below that is ANOTHER team hub with "TEAM" header, team card (13U, 1 Players, 0 Coaches), and Feed/Roster/Schedule tabs with the actual team wall content.
**Fix:** Remove the ENTIRE top section (the one with "13U / Head Coach / 0-0" and the Schedule/Roster/Achievements/Player Stats buttons). Keep ONLY the bottom section — the one that has the working team wall with Feed/Roster/Schedule tabs and actual post content.

Then enhance the bottom section:
- Add "Achievements" and "Player Stats" as additional tabs alongside Feed, Roster, and Schedule (so it becomes: Feed | Roster | Schedule | Achievements | Stats — scrollable tab bar if needed)
- The team selector pills at the very top should remain (for switching between teams)
- The team card (13U, 1 Players, 0 Coaches) is fine as the header — this IS the hero header showing team identity

Do NOT keep both sections. Kill the top duplicate entirely.

---

## VERIFICATION CHECKLIST
After all fixes:
- [ ] No "ALL CLEAR" card anywhere on coach home
- [ ] Hero event carousel shows with same visual style as parent dashboard
- [ ] Section order: Team Selector → Season Record → Hero Carousel → Quick Actions → Team Hub Preview → Chat Preview
- [ ] Team Hub tab has ONE team hub (not two stacked)
- [ ] Team Hub has tabs: Feed | Roster | Schedule | Achievements | Stats
- [ ] Parent experience unchanged
- [ ] Admin experience unchanged
- [ ] Player experience unchanged
- [ ] `npx tsc --noEmit` — zero new errors

Show me your plan, then fix all 4 items.
