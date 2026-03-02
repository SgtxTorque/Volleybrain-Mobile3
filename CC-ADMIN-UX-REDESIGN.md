# VolleyBrain — Admin UX Redesign Spec
## For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)
**Backend:** Supabase (project: uqpjvbiuokwpldjvxiby)
**GitHub:** SgtxTorque/volleybrain-mobile3

---

## RULES (READ FIRST — APPLY TO ALL PHASES)

1. **Read SCHEMA_REFERENCE.csv FIRST** before writing or modifying ANY query. Verify every table name and column name against it. If a table or column doesn't exist in SCHEMA_REFERENCE.csv, flag it and ask — do NOT guess.

2. **Read the existing code before changing it.** Before modifying any file, read the entire file first. Understand what's already built and working. Do NOT break existing functionality.

3. **This mobile app shares a Supabase backend with the web admin portal located at `C:\Users\fuent\Downloads\volleybrain-admin`.** When you need to verify correct table names, column names, or query patterns, read the web app's source files as the source of truth — specifically:
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\contexts\AuthContext.jsx` (auth patterns)
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\MainApp.jsx` (feature list and routing)
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\lib\supabase.js` (client config)
   - Any page in `C:\Users\fuent\Downloads\volleybrain-admin\src\pages/` for query patterns
   - The web app is the source of truth for database schema and query patterns. Make the mobile app's queries match.

4. **Full file replacements only** when creating new screens. Do NOT remove or break existing functionality in shared files. When modifying navigation or shared components, add conditional logic — don't delete what other roles depend on.

5. **Verify all queries against SCHEMA_REFERENCE.csv.** Flag anything that doesn't match, fix it. No query should reference a table or column that doesn't exist.

6. **Match the existing visual style.** Review the Parent and Coach dashboard screens to understand the current design patterns — tappable cards (not hyperlinks), smooth animations, hero card carousel style, accent colors, theming. The admin experience should feel like the same app, not a different product. Keep everything consistent.

7. **Show me your plan first for each phase**, then deliver. Don't start coding without showing the approach.

8. **Complete each phase fully, commit, then pause for me to test** before moving to the next phase.

9. **No console.log without `__DEV__` gating.**

10. **Review these reference files in the project root:**
    - ADMIN_PARITY_AUDIT.md (admin feature audit)
    - SCHEMA_REFERENCE.csv (database schema)
    - CC-COACH-UX-REDESIGN.md (coach spec for reference on patterns used)
    - CC-PARENT-UX-REDESIGN.md (parent spec for reference on patterns used)

11. **Use the existing auth/permissions pattern.** Check how the app currently determines user roles — use `usePermissions()` or whatever the established pattern is. Do NOT use `profile?.role` directly unless that's the existing pattern. The Parent and Coach redesigns already implemented role-gating in the tab navigator — follow the SAME pattern for admin.

12. **Check what packages are already installed** in package.json before adding new dependencies.

13. **After all work in each phase, run `npx tsc --noEmit`** to confirm zero new TypeScript errors.

14. **The Parent and Coach UX Redesigns are already complete.** Parents use: Home | Schedule | Chat | Team | My Stuff. Coaches use: Home | Schedule | Chat | Team | My Stuff (with coach-flavored content). Read the existing tab navigator code to understand the role-gating pattern already in place. Follow the SAME pattern for admin — do NOT rewrite the role-gating logic, extend it.

15. **Reuse components aggressively.** The hero event carousel, season record card, chat preview, team hub preview, quick action buttons, bottom sheets — these components already exist from the parent and coach builds. Find them, read them, reuse them. Do NOT rebuild from scratch.

---

## OVERVIEW

We are redesigning the Admin experience in the VolleyBrain mobile app. Admins are the organization managers — they need to see what's happening across the ENTIRE organization and act on it quickly from their phone.

The web admin portal handles complex configuration (season setup, registration forms, detailed reports, waiver templates). The mobile admin experience is the **command center for on-the-go management** — approve registrations, check payments, send org-wide blasts, glance at all team health.

This involves:

1. **Admin-specific bottom navigation** (5 tabs, admin-flavored)
2. **Command Center Home** with org health, action items, quick actions, team snapshot
3. **Org-wide Schedule tab** (all teams, all events, unfiltered)
4. **Org-wide Chat tab** with org blast capability
5. **Teams tab (plural)** showing all teams as a list with drill-down
6. **Admin My Stuff** with user management, invite management, org settings

### CRITICAL: This redesign is ADMIN-ROLE ONLY.
Do not modify Parent or Coach experiences — those redesigns are already complete. Do not modify Player experience. Use the same role-gating pattern already established in the tab navigator. Before changing ANY shared component or navigation file, verify it won't break other roles.

---

## PHASE 1: Admin Navigation + Home Screen

### Task 1A: Extend tab navigation for Admin role

Read the current tab navigator file. The parent and coach role-gating is already implemented. Extend it for admins.

**Admin tabs:**

| Tab | Label | Icon | Screen Component |
|-----|-------|------|-----------------|
| 1 | Home | house icon | AdminDashboard (redesigned) |
| 2 | Schedule | calendar icon | AdminScheduleScreen (extends schedule with org-wide view) |
| 3 | Chat | message-circle icon | AdminChatScreen (extends chat with org blast) |
| 4 | Teams | users icon | AdminTeamsScreen (new — plural, org roster view) |
| 5 | My Stuff | user icon | AdminMyStuffScreen (new) |

**Note:** Tab 4 is "Teams" (plural) for admin, not "Team" (singular) like parent/coach. This is a fundamentally different screen — it shows ALL teams as a list, not one team's wall.

**Implementation:**
- Follow the exact same role-gating pattern used for parents and coaches
- Admins currently use the old tab layout — switch them to the new 5-tab layout
- Do NOT modify the parent or coach tab configs
- The old Game Day, Manage, and Me screens must still exist for Player role

### Task 1B: Build Admin Home Screen (AdminDashboard) — The Command Center

Read the current admin dashboard code first. Understand what data it fetches and what components it uses. The admin home answers one question: "What's happening across my organization right now, and what needs my attention?"

**Layout — top to bottom:**

**1. Org Health Banner (top — NOT a team selector)**
- Admins see everything — no team selector needed
- Compact banner card showing: total active players, total teams, total coaches, registration status (open/closed indicator), current season name
- One glance = state of the org
- Tap navigates to a full org detail screen (or season detail)
- Query: Check SCHEMA_REFERENCE.csv for organizations, profiles, teams, seasons tables. Count active players, teams, coaches across the org.

**2. Needs Attention / Action Items (hero section — ALWAYS VISIBLE)**
- This is the most important section for admins
- Unlike parents (where the button disappears when empty), admin Needs Attention is ALWAYS visible
- When all items are at zero, show a subtle "✓ All clear" state but keep the section on screen — admins should always see this for confidence
- Each item shows a count and is tappable:
  - Pending registrations waiting for approval (count → tap to review/approve/deny screen)
  - Outstanding payments across all families (count + total $ amount → tap to payment management)
  - Players missing required waivers (count → tap to waiver status list)
  - Unassigned players — registered but not on a team (count → tap to player assignment)
  - Games needing stats entry org-wide (count → tap to games needing stats)
  - Upcoming events with low RSVP rates (count → tap to low-RSVP events)
- Verify ALL table/column names against SCHEMA_REFERENCE.csv for each query
- For payment totals, check the web admin portal's payment dashboard queries for patterns

**3. Quick Actions**
- One row, 4 compact buttons (same small size as coach quick actions — reuse that component)
- **Approve Regs** → navigates to pending registration list with approve/deny actions
- **Payments** → navigates to payment overview with outstanding balances
- **Invite** → opens invite modal (invite parents, coaches, players via link/email/code). Check if an invite modal already exists in the codebase — the admin dashboard previously had one.
- **Blast** → opens org-wide blast composer. Admin can target: all members, specific teams, specific roles. Check if blast composer exists — coaches already have one, extend it with org-wide targeting.

**4. Season Overview Card**
- Reuse the Season Record card component from the coach dashboard, but with org-wide stats
- Total games played across all teams, overall org combined record, total registrations this season
- Revenue collected vs outstanding (show a progress bar: green fill for collected, gray for remaining)
- Tap for full season stats detail
- Check SCHEMA_REFERENCE.csv for payment/revenue tables

**5. Team Snapshot**
- Horizontal scrollable row of compact team cards showing ALL teams in the org
- Each card: team name, age group, player count, W-L record, next event date
- Tap a card → drills into that team's team hub (same view coaches see)
- This gives admin a "how's everyone doing" glance without leaving home
- Query: Fetch all active teams with player counts, records, and next event dates

**6. Recent Activity Feed**
- The org pulse — compact feed of last 5-8 notable events
- Examples: "New registration: Ava Smith (13U)", "Payment received: $150 from Johnson family", "Coach posted in 14U Storm", "Game completed: BH Elite vs Banks (W 2-1)", "Waiver signed: Marcus Johnson"
- Each item tappable to navigate to relevant detail
- Chronological, most recent first, with timestamps
- Query: This may require a composite query across registrations, payments, team_posts, game_results, waiver_signatures — check SCHEMA_REFERENCE.csv. If an activity log table exists, use that. If not, build from individual recent records across tables.

---

## PHASE 2: Admin Schedule + Chat Tabs

### Task 2A: Admin Schedule Tab (Org-Wide View)

Read the parent and coach Schedule screens. The admin version extends them with org-wide visibility.

**Same calendar component, but UNFILTERED by default:**
- Shows ALL events across ALL teams simultaneously
- Color-coded dots/badges by team so admin sees which teams have events on which days
- Team filter pills at top: "All" (default/active) plus one pill per team to filter down
- Event cards show same info as coach schedule: event type, time, location, RSVP count
- **Create Event FAB** — when tapped, includes a TEAM PICKER so admin can create events for ANY team (not just their own)
- Event detail bottom sheet — same as coach version with full RSVP breakdown

### Task 2B: Admin Chat Tab (Org-Wide View)

Read the parent and coach Chat screens. The admin version extends them with org-wide visibility.

**Admin sees ALL conversations:**
- Every team channel across every team
- Every coach DM, parent channel, admin channel
- No filtering by team — admin sees everything

**FAB with THREE options:**
- "New Message" — standard DM or group chat
- "📢 Team Blast" — send blast to one specific team (admin picks which team from a team picker, then composes message). Same as coach blast but with team selection added.
- "📣 Org Blast" — send blast to ALL teams / ALL parents / ALL coaches at once
- Org Blast delivery: push notification to all org members, highlighted message in every team channel, auto-post to every team wall as announcement card
- Check SCHEMA_REFERENCE.csv for blast/announcement tables
- Reuse the coach blast composer component and extend it with team selection and org-wide options
- FAB labels must be visible (text next to icons) — same fix applied to coach chat FAB

---

## PHASE 3: Teams Tab (Plural — Org Roster View)

### Task: Build AdminTeamsScreen — ALL teams as a list

**This is fundamentally different from the parent/coach "Team" tab.** Do NOT reuse the team hub screen as the top level. This is a list of ALL teams with drill-down.

**Layout:**

**Top: Search bar + filter pills**
- Search by team name, coach name, player name
- Filter pills: "All" | filter by age group | filter by active/inactive
- Check SCHEMA_REFERENCE.csv for age_group or division columns on teams table

**Team List**
- Each team rendered as a card showing:
  - Team name and age group
  - Player count / roster limit (e.g., "12 / 15 players")
  - Head coach name
  - Season record (W-L)
  - Next upcoming event date
  - Quick health indicators: colored dots or badges for issues (missing waivers, outstanding payments, low RSVP on next event)
- Tap a team card → navigates to that team's full team hub (same view coaches see: Feed/Roster/Schedule/Achievements tabs)
- Query: Fetch all teams with player counts, coach assignments, records, next events, and health indicator counts. Verify all joins against SCHEMA_REFERENCE.csv.

**Create Team FAB**
- Floating action button to create a new team
- Opens team creation form: team name, age group, assign head coach (picker from available coaches), set roster limit
- Check SCHEMA_REFERENCE.csv for required fields on the teams table

**Player Management**
- Accessible from within a team's roster view (when admin drills into a team)
- Admin can: move players between teams, view any player's full profile, edit registration info, view payment status per player
- Also consider an "All Players" option at the top of the Teams tab — a way to see every player in the org regardless of team, with search and filter

---

## PHASE 4: Admin My Stuff Tab

### Task: Build AdminMyStuffScreen

Read the parent and coach My Stuff screens. Admin version has organization management tools.

**Layout:**

**Profile Banner** — Name, avatar, role badge ("Admin"), tap to edit profile. Same component as parent/coach.

**Organization Settings**
- Toggle registration open/close for current season (check SCHEMA_REFERENCE.csv for the season registration status column)
- View current season info (name, dates, status)
- **"Full Admin Portal →"** — prominent button/link that opens the web admin URL in the device browser (use Linking.openURL). This is critical — complex tasks stay on web.

**User Management**
- List of all users in the org with their name, email, role, and status (active/inactive)
- Tap a user to view detail
- Actions: change role (parent → coach, etc.), deactivate/reactivate account
- Search/filter by role, name, status
- This is MOBILE ESSENTIAL — admin needs to manage roles on the go
- Query: Check SCHEMA_REFERENCE.csv for profiles, organization_members, or user roles tables

**Invite Management**
- List of pending invites (sent but not accepted)
- Each invite shows: email/name, role invited for, date sent, status
- Actions: resend invite, revoke invite, generate new invite link/code
- Check if invite-related tables exist in SCHEMA_REFERENCE.csv

**Season Management**
- List of seasons, highlight active season
- Quick toggle to change active season
- NOT the full season builder (that's web-only) — just view and switch
- Check SCHEMA_REFERENCE.csv for seasons table

**Waiver Status**
- Overview of waiver completion across all players org-wide
- Shows: total players, completed count, incomplete count, percentage
- Drill down to see which players are missing which waivers
- Tap to send reminder to incomplete players
- Check SCHEMA_REFERENCE.csv for waiver-related tables

**Financial Summary**
- Quick card showing: total revenue collected, total outstanding, payment method breakdown
- Tap for detail view with per-family breakdown
- Full financial reports stay on web — this is the quick glance version
- Check SCHEMA_REFERENCE.csv for payment tables

**Settings** — Notification preferences, dark mode, accent color, data & privacy, help & support, sign out. Same component as parent/coach.

---

## WHAT STAYS WEB-ONLY (DO NOT BUILD THESE ON MOBILE)

These are explicitly OUT OF SCOPE. Do NOT attempt to build mobile versions of:
- Registration form builder / configuration
- Detailed financial reports with CSV exports
- Waiver template creation and editing
- Organization branding and logo configuration
- Achievement/badge catalog management
- Venue management setup
- Detailed analytics dashboards with charts
- Season creation wizard (full setup with age groups, fee structures)
- Bulk operations (mass player moves, bulk payment recording)

The "Full Admin Portal →" link in My Stuff gives admins access to the web version for these tasks.

---

## COMMIT & TEST CHECKPOINTS

After each phase:
1. Commit with descriptive message: "Admin UX Phase [X]: [description]"
2. Verify the app boots without errors: `npx tsc --noEmit`
3. Test as Admin role — verify the new UI works
4. Test as Parent role — verify NOTHING changed (their redesign is complete)
5. Test as Coach role — verify NOTHING changed (their redesign is complete)
6. Test as Player role — verify NOTHING changed
7. Report what was done and any issues found

Do NOT move to the next phase until the current one is committed and stable.

---

## EXECUTION ORDER

**Phase 1:** Navigation + Admin Home (biggest structural change, command center dashboard)
**Phase 2:** Schedule + Chat tabs (extend existing with org-wide views and org blast)
**Phase 3:** Teams tab (new screen — org roster view with drill-down)
**Phase 4:** My Stuff (admin tools — user management, invites, org settings, financial summary)

Phase 1 is the most complex because the Admin Home has the most sections and queries. Show your plan before coding. For Phases 2-4, read existing code from the parent and coach builds, reuse components, and extend rather than rebuild.
