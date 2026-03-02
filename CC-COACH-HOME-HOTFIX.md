# URGENT FIX — Coach Home Dashboard Showing Empty

## Problem
The new CoachHomeScroll component renders but shows almost no content. The welcome section and quick actions appear, but ALL data-dependent sections are missing: no team selector pills, no game plan card, no prep checklist, no season record, no roster alerts, no activity feed, no top performers. Only generic ambient messages and "Unread Parent Messages: 0" appear.

The OLD coach dashboard (which this replaced) showed rich content: event carousel with real photos, RSVP counts (0/12), Quick Actions with badge counts, Team Hub posts, Chat Preview, Season Record (5 Games, 4 Wins, 1 Losses), XP/Badges, and team selector pills (13U, BH STINGERS, BLACK HORNETS ELITE). All of that data exists in the database — the old dashboard was displaying it.

## Rules
1. Read SCHEMA_REFERENCE.csv before modifying any queries
2. Read the existing code before changing it
3. Cross-reference the OLD coach dashboard to understand working query patterns: look at git history for the CoachDashboard that was replaced, or check `C:\Users\fuent\Downloads\volleybrain-admin\src\pages\roles\CoachDashboard.jsx` for working query patterns
4. DO NOT touch Parent, Admin, or Player dashboards
5. Surgical fixes only — do NOT refactor or reorganize
6. Run `npx tsc --noEmit` after all fixes

## Diagnosis Steps (Do ALL of these FIRST, report findings)

### Step 1: Find how the old coach dashboard loaded team data
```bash
git log --oneline -20
```
Find the commit BEFORE Phase 1 of the coach redesign. Then:
```bash
git show [pre-redesign-commit]:components/CoachDashboard.tsx
```
Or if it was at a different path, search:
```bash
git show [pre-redesign-commit] --name-only | grep -i coach
```
Read the OLD team loading logic. How did it get the coach's team assignments? What tables did it query? What was the join pattern?

### Step 2: Read the new data hook
```bash
cat hooks/useCoachHomeData.ts
```
Read the ENTIRE file. Identify:
- How does it get the coach's team assignments?
- What query loads teams? What table? What join?
- Does it depend on a season context that might not be set?
- Are there try/catch blocks silently swallowing errors?
- Add `if (__DEV__) console.log(...)` statements to key data loading points to see what's null

### Step 3: Read the new main component
```bash
cat components/CoachHomeScroll.tsx
```
Find:
- How does it receive team data from the hook?
- What does the conditional rendering look like for each section?
- Is there a `selectedTeam` state that defaults to null?
- If `selectedTeam` is null, do ALL sections hide?

### Step 4: Read the coach-scroll sub-components
```bash
ls components/coach-scroll/
```
Read each one briefly to understand what data they expect as props.

### Step 5: Check the DashboardRouter
```bash
cat components/DashboardRouter.tsx
```
How does it determine the coach role? Is it passing the right props to CoachHomeScroll? The old dashboard received `roleContext` which contained `coachInfo.team_coaches` — is CoachHomeScroll receiving this?

### Step 6: Check what the old dashboard received vs what the new one receives
The web admin's CoachDashboard receives:
```javascript
roleContext.coachInfo.team_coaches  // array of {team_id, role} objects
```
And uses it to load teams:
```javascript
const teamIds = coachTeamAssignments.map(tc => tc.team_id)
const { data: teamData } = await supabase.from('teams').select('*').in('id', teamIds)
```
Does the new CoachHomeScroll have access to `roleContext`? If not, that's the root cause.

## Fix

Based on your diagnosis, fix the root cause. The most likely issues:

### Likely Issue A: CoachHomeScroll doesn't receive roleContext or coachInfo
**Fix:** Pass roleContext from DashboardRouter to CoachHomeScroll the same way the old CoachDashboard received it. Then use `roleContext.coachInfo.team_coaches` to get team IDs and load teams.

### Likely Issue B: Season context not set
**Fix:** The data hook might depend on `selectedSeason` from a season context provider. If the coach doesn't have a selected season, all queries return empty. Check if the old dashboard used a SeasonContext and ensure the same provider wraps CoachHomeScroll.

### Likely Issue C: Queries use wrong table/column names
**Fix:** Compare every query in `useCoachHomeData.ts` against SCHEMA_REFERENCE.csv and the working web admin queries. Fix any table or column name mismatches.

### Likely Issue D: Queries succeed but conditional rendering is too aggressive
**Fix:** If data IS loading but sections still hide, the conditional checks might be wrong. For example, if the event hero card checks `upcomingEvents.length > 0` but the events are in a different state variable, it'll never show. Add `__DEV__` logging to verify what each section receives.

### Likely Issue E: The welcome briefing message
The briefing says "Welcome to your coaching hub" — this is the generic fallback. It should say something like "Practice at 6:00 PM for Black Hornets Elite. 0 of 12 confirmed." This means the event query is also returning empty. Fix the event query and the briefing will become contextual automatically.

## After Fixing

### Verify these sections now appear with real data:
- [ ] Team selector pills show all coach's teams (13U, BH Stingers, Black Hornets Elite)
- [ ] Selecting a team filters all content below
- [ ] Welcome briefing references today's practice ("Practice at 6 PM for Black Hornets Elite")
- [ ] Game plan card appears for today's practice with RSVP count
- [ ] Quick actions still work
- [ ] Team Pulse shows Attendance %, RSVP status (with specific names), Messages count
- [ ] Roster section shows (either alerts or "all clear")
- [ ] Season scoreboard shows win-loss record
- [ ] Activity feed shows recent shoutouts/blasts (or "Quiet week" ambient)
- [ ] Pending stats nudge shows if games need stats ("2 need stats" from old dashboard)
- [ ] Closing message is contextual (practice today → "Set the tone today.")

### Verify nothing else broke:
- [ ] Parent home scroll unchanged
- [ ] Admin dashboard unchanged
- [ ] Player dashboard unchanged
- [ ] Role switching still works
- [ ] `npx tsc --noEmit` — zero new errors

### Commit:
```bash
git add -A && git commit -m "Hotfix: Fix coach home data loading — restore team assignments, event queries, all data sections" && git push
```

## IMPORTANT
Do NOT rebuild or rewrite CoachHomeScroll from scratch. The structure and components are correct — they just aren't receiving data. This is a data plumbing fix, not a redesign. Find where the pipe is broken and reconnect it.
