# Coach UX — URGENT FIX: Event Carousel Not Loading Events

## RULES STILL APPLY
Read CC-COACH-UX-REDESIGN.md in the project root for the full spec and rules. Read SCHEMA_REFERENCE.csv before writing ANY query. Read existing code before changing it. Do NOT break parent, admin, or player experiences. `npx tsc --noEmit` after all changes.

---

## THE PROBLEM
The coach home screen hero event carousel shows "NO UPCOMING EVENTS" for every team, even though events exist. Proof: The PARENT home screen for the SAME user shows a game on February 24, 2026 — "GAME DAY vs Banks" at Frisco Fieldhouse for the Black Hornets Elite team. The parent carousel loads this event correctly. The coach carousel does not.

This is a DATA QUERY issue, not a UI issue. The carousel component works — it just receives no events.

---

## HOW TO FIX THIS

### Step 1: Read how the PARENT carousel fetches events
Open the ParentDashboard code. Find the query that fetches upcoming events for the hero carousel. Copy or note the exact query — table names, column names, joins, filters, sort order. This query WORKS.

### Step 2: Read how the COACH carousel fetches events
Open the CoachDashboard code. Find the query that fetches upcoming events for the coach hero carousel. Compare it line-by-line with the parent query.

### Step 3: Identify the difference
The likely issues are one or more of:
- **Wrong table name** — Coach might be querying a different table than the parent
- **Wrong team filter** — Coach query might be filtering by a team ID that doesn't match, or using the wrong column to link events to teams
- **Wrong join** — Coach might be joining through a different relationship table (e.g., `team_staff` vs `team_coaches` vs `coaches`)
- **Wrong date filter** — Coach might be filtering dates differently
- **Selected team ID not being passed** — The team selector might not be passing the selected team's ID into the events query
- **Season filter** — Coach query might have an extra season filter that's excluding events

### Step 4: Debug by logging
Add temporary console.log statements to the coach carousel:
```
console.log('Selected team ID:', selectedTeamId);
console.log('Events query result:', events);
console.log('Events error:', error);
```
Check what's actually being returned. Is it an empty array? Is there an error? Is the team ID null?

### Step 5: Fix the query
Make the coach events query match the parent events query pattern, but filtered to the selected team. The parent query works — the coach query should be nearly identical, just with a team filter added.

### Step 6: Verify with SCHEMA_REFERENCE.csv
Before finalizing, verify every table name and column name used in the query against SCHEMA_REFERENCE.csv. Pay special attention to:
- The events/schedule_events table name
- The column that links events to teams (team_id? home_team_id?)
- The date/time column used for filtering upcoming events
- How the parent query determines which events belong to which children's teams — the coach version should use a similar pattern but through the coach-to-team relationship

### Step 7: Remove debug logs
After confirming events load, remove the console.log statements.

---

## ALSO VERIFY
- When switching teams in the selector, the carousel updates with that team's events
- The "View Full Schedule" card still appears as the last card
- Pagination dots reflect the correct number of events
- Events show the correct date, time, location, and opponent

---

## DO NOT
- Do NOT rebuild the carousel component — it works fine
- Do NOT change the parent query — it works fine
- Do NOT modify any other section of the coach home — focus ONLY on the events query

Show me the parent query vs the coach query side-by-side, then fix it.
