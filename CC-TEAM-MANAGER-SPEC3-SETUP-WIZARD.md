# CC-TEAM-MANAGER-SPEC3-SETUP-WIZARD
# Lynx Team Manager — Spec 3: Setup Wizard for New Team Managers
# Status: READY FOR CC EXECUTION (after Specs 1 + 2 complete)
# Depends on: CC-TEAM-MANAGER-EXECUTE + CC-TEAM-MANAGER-SPEC2

---

## STANDING RULES

1. **Read these files first:** `CC-LYNX-RULES.md`, `AGENTS.md`, `SCHEMA_REFERENCE.csv`
2. **Commit after each phase.** Commit message format: `[team-manager-wizard] Phase X: description`
3. **After EACH phase, run `npx tsc --noEmit` and report.**
4. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Builds a 4-step setup wizard for new Team Managers who select "I'm starting fresh" (no invite code). The wizard creates their team, season, and invite code so they can start managing immediately.

**Behind the scenes:** When a TM creates a standalone team, the system auto-creates a lightweight organization scoped to them. The TM never sees "organization" in the UI. They see their team. The micro-org keeps the data model consistent.

**Flow:**
```
Signup > "Team Manager" selected > Step 3 "Connect" > 
  Path A: Enter invite code (existing flow, joins org) → home
  Path B: "Start my own team" link → Setup Wizard:
    Step 1: Name your team (name, sport, age group)
    Step 2: Set your season (name, dates or year-round)
    Step 3: Invite players (generate code + share link)
    Step 4: You're ready! (land on TM home with smart nudges)
```

---

## PHASE 1: Investigation

Read and report:

### Team Creation
1. **How are teams created today?** Find the existing team creation flow (admin creates team). What file? What database writes happen? (teams table insert, season assignment, etc.) Show the exact insert pattern.

2. **What columns does the `teams` table require?** Show all columns with types and which are required (NOT NULL). What is the FK to seasons? To organizations?

3. **How are seasons created?** Find the season creation flow. What table? What columns? What links a season to an org?

4. **Can a team exist without a season?** Check if `teams.season_id` is NOT NULL. If yes, we must create a season before creating a team.

### Organization Creation
5. **How does the "Create Organization" flow work in signup?** Show `handleCreateOrg()` from signup.tsx. What tables does it write to? What's the minimum data needed?

6. **What columns does `organizations` table require?** Show all columns.

7. **After org creation, what else gets created?** Does it auto-create a season? A default team? Or just the org row + user_roles row?

### Invite Codes
8. **How are team invite codes created?** Find the existing flow (coach or admin creates invite code). What table? What columns? How is the code string generated?

9. **How are invite codes shared?** Is there a share sheet integration? A "copy to clipboard" button? A deep link format?

10. **What happens when a parent redeems a team invite code during signup?** Walk the flow: parent enters code > validates > what DB writes happen? Does it create a user_roles entry? team_players entry?

### Onboarding State
11. **How does the app know the user still needs to set up?** After signup with "skip", `onboarding_completed` is true but they have no team. The empty state (`NoTeamState`) shows. Is there a better way to detect "TM needs setup"?

12. **Is there an existing onboarding wizard pattern in the app?** Any multi-step flow we can reference for the visual design? (e.g., the signup 3-step slider, a registration wizard, etc.)

### Pricing / Limits
13. **Is there any existing subscription or tier system in the app?** Check for: `subscriptions` table, `tiers` table, `plans` table, Stripe subscription logic, any `is_premium` or `tier` column on profiles or organizations.

14. **Is there any existing team count limit?** Check if the app enforces how many teams an org or user can have.

**Report findings, then proceed to Phase 2.**

---

## PHASE 2: Create the setup wizard screen

Create a new file:
```
app/team-manager-setup.tsx
```

### Design:

**4-step wizard with horizontal slide animation** (same pattern as signup.tsx's 3-step slider).

**Background:** Light background (match signup screen style, not dark navy).

**Progress indicator:** 4 dots or a segmented bar at the top showing current step.

**Step 1: "Name your team"**

- Team name input (TextInput, auto-focus)
- Sport selector: horizontal pill row. Volleyball selected by default. Other options: Basketball, Soccer, Baseball, Football, Swimming. (These match the skill_categories extensibility plan.)
- Age group selector: horizontal pill row. Options: 10U, 11U, 12U, 13U, 14U, 15U, 16U, 17U, 18U, Open
- "Next" button (disabled until team name is entered)

**Step 2: "Set your season"**

- Season name input (pre-filled: "Spring 2026" based on current month)
  - Auto-suggest: Jan-May = "Spring [year]", Jun-Aug = "Summer [year]", Sep-Dec = "Fall [year]"
- Date range: Start date + End date pickers
- OR "Year-round" toggle (sets end date to 1 year from start)
- "Next" button

**Step 3: "Invite your players"**

- Show the generated team invite code (large, monospace, easy to read: e.g., "LYNX-BH14")
- "Copy code" button (copies to clipboard with haptic feedback)
- "Share via text" button (opens native share sheet with a message like: "Join [team name] on Lynx! Download the app and use code: LYNX-BH14")
- "Share link" button (if deep links are supported)
- "I'll do this later" skip link at bottom
- "Next" button

**Step 4: "You're ready!"**

- Mascot celebration: EXCITEDACHIEVEMENT.png (large, centered, 120px)
- "[Team name] is set up!" heading
- "Here's what to do next:" subheading
- Three smart nudge cards:
  1. "Add your first practice" — calendar icon, taps to schedule screen
  2. "Review your roster" — people icon, taps to roster screen (will be empty, but shows the path)
  3. "Set up payment collection" — dollar icon, taps to payments setup (or shows "coming with Pro" if free tier)
- "Go to my team" button (navigates to /(tabs) home)

### Behind-the-scenes writes on wizard completion:

When the wizard completes (after Step 2, before showing Step 3):

```typescript
async function createTeamManagerSetup(data: {
  teamName: string;
  sport: string;
  ageGroup: string;
  seasonName: string;
  seasonStart: string;
  seasonEnd: string;
  userId: string;
}) {
  // 1. Create micro-organization (invisible to TM)
  const { data: org } = await supabase
    .from('organizations')
    .insert({
      name: `${data.teamName}`,  // Org name = team name for micro-orgs
      slug: generateSlug(data.teamName),
      created_by: data.userId,
      is_active: true,
    })
    .select('id')
    .single();

  if (!org) throw new Error('Failed to create organization');

  // 2. Create user_roles entry (league_admin for their micro-org, so they have full control)
  await supabase.from('user_roles').insert({
    user_id: data.userId,
    organization_id: org.id,
    role: 'team_manager',
    is_active: true,
  });

  // 3. Update profile with org
  await supabase
    .from('profiles')
    .update({ current_organization_id: org.id })
    .eq('id', data.userId);

  // 4. Create season
  const { data: season } = await supabase
    .from('seasons')
    .insert({
      organization_id: org.id,
      name: data.seasonName,
      start_date: data.seasonStart,
      end_date: data.seasonEnd,
      is_active: true,
      sport: data.sport,
    })
    .select('id')
    .single();

  // 5. Create team
  const { data: team } = await supabase
    .from('teams')
    .insert({
      name: data.teamName,
      season_id: season?.id,
      organization_id: org.id,
      age_group: data.ageGroup,
      sport: data.sport,
      is_active: true,
    })
    .select('id')
    .single();

  // 6. Add TM to team_staff
  await supabase.from('team_staff').insert({
    team_id: team?.id,
    user_id: data.userId,
    staff_role: 'team_manager',
    is_active: true,
  });

  // 7. Generate team invite code
  const code = generateInviteCode(data.teamName);
  await supabase.from('team_invite_codes').insert({
    code: code,
    team_id: team?.id,
    is_active: true,
    max_uses: 30,  // Generous limit for a youth team
    current_uses: 0,
    created_by: data.userId,
  });

  // 8. Create org sport entry (if table exists)
  try {
    await supabase.from('organization_sports').insert({
      organization_id: org.id,
      sport_name: data.sport,
    });
  } catch { /* best effort */ }

  return { orgId: org.id, seasonId: season?.id, teamId: team?.id, inviteCode: code };
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 30) + '-' + Date.now().toString(36);
}

function generateInviteCode(teamName: string): string {
  // Format: LYNX-[first 2 letters of team]-[4 random alphanumeric]
  const prefix = teamName.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase() || 'TM';
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LYNX-${prefix}${random}`;
}
```

**IMPORTANT:** The investigation step must confirm the exact column names and required fields for `organizations`, `seasons`, `teams`, and `team_invite_codes`. The above is based on patterns observed in earlier investigations. Adjust column names, add any missing required columns, and handle any FK constraints discovered.

**Commit:** `[team-manager-wizard] Phase 2: setup wizard screen`

---

## PHASE 3: Wire wizard into signup flow

**File to modify:** `app/(auth)/signup.tsx`

### What to change:

In Step 3 "Connect", add a "Start my own team" option for Team Managers. Currently, Coach has "Create a new organization" link. Team Manager gets "Start my own team" link.

**Find line 562-572** (the "Create org" link for coaches). Add a parallel link for TM:

```typescript
{selectedRole === 'team_manager' && (
  <TouchableOpacity onPress={() => router.push('/team-manager-setup')} style={s.textBtn}>
    <Text style={s.textBtnLabel}>Or, start my own team</Text>
  </TouchableOpacity>
)}
```

**Alternatively**, if the wizard needs auth to be complete first: the "Start my own team" link could:
1. Complete signup with "skip" (no invite code) — `onboarding_completed: true`
2. Then immediately navigate to `/team-manager-setup` instead of home

This depends on whether the wizard needs an authenticated user to create DB records (it does). So the flow is:

```
Signup completes (skip) → Auth session exists → Navigate to /team-manager-setup → Wizard creates team → Navigate to home
```

**The cleanest implementation:**
1. When TM taps "Start my own team", run the account creation (same as "skip")
2. After account is created, navigate to `/team-manager-setup` instead of `/(tabs)`
3. The wizard runs with the authenticated user
4. After wizard completes, navigate to `/(tabs)` home

Find how the "skip" flow works and add a redirect for TM:

```typescript
// After account creation with skip:
if (selectedRole === 'team_manager') {
  router.replace('/team-manager-setup');
} else {
  router.replace('/(tabs)');
}
```

**Commit:** `[team-manager-wizard] Phase 3: wire wizard into signup`

---

## PHASE 4: Handle the "returning TM with no team" state

If a TM signed up, skipped the wizard (or it failed), and opens the app later with no team, they should be prompted to complete setup.

**File to modify:** `components/DashboardRouter.tsx` or the TM empty state

### What to add:

When DashboardRouter determines the user is a TM but they have no team_staff entries:
- Instead of showing CoachHomeScroll with NoTeamState, show a prominent "Set up your team" card that navigates to `/team-manager-setup`

This can be as simple as:
```typescript
// In the CoachHomeScroll or DashboardRouter:
if (isTeamManager && noTeamsFound) {
  return <TeamManagerSetupPrompt />;
}
```

Create a small component:
```
components/empty-states/TeamManagerSetupPrompt.tsx
```

**Design:**
- Mascot: LYNXREADY.png (80px)
- "Let's set up your team!" heading
- "Create your team, invite your players, and start managing." subtext
- "Set up my team" button (navigates to /team-manager-setup)
- "I have an invite code" secondary link (navigates to code entry flow)

**Commit:** `[team-manager-wizard] Phase 4: returning TM setup prompt`

---

## PHASE 5: Team limit enforcement (free tier)

### 5A: Add a team count check

When the TM tries to create a second team (future: from a "Create another team" button), check their current team count:

Create a utility function in the wizard or a shared location:

```typescript
async function canCreateTeam(userId: string): Promise<{ allowed: boolean; currentCount: number; limit: number }> {
  // Count teams where this user is team_manager in team_staff
  const { count } = await supabase
    .from('team_staff')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('staff_role', 'team_manager')
    .eq('is_active', true);

  const currentCount = count || 0;
  const limit = 1; // Free tier: 1 team. Pro tier: 3-5 teams. This will be configurable later.

  return { allowed: currentCount < limit, currentCount, limit };
}
```

### 5B: In the setup wizard

Before creating the team, check:
```typescript
const { allowed, currentCount, limit } = await canCreateTeam(userId);
if (!allowed) {
  // Show upgrade prompt
  Alert.alert(
    'Team limit reached',
    `Your current plan allows ${limit} team. Upgrade to Pro to manage more teams.`,
    [{ text: 'OK' }]
  );
  return;
}
```

This is a soft gate for now. When the subscription system is built, it will check the actual tier. For now, hardcode limit = 1.

**Commit:** `[team-manager-wizard] Phase 5: team limit enforcement`

---

## PHASE 6: Register wizard screen in navigation

Ensure `/team-manager-setup` is a valid route:

If using Expo Router file-based routing, the file `app/team-manager-setup.tsx` automatically creates the route. Verify it's accessible.

**Commit:** `[team-manager-wizard] Phase 6: register wizard route`

---

## PHASE 7: Verification

```
## VERIFICATION REPORT: Team Manager — Spec 3 Setup Wizard

### Files Created: [count]
- app/team-manager-setup.tsx: [lines]
- components/empty-states/TeamManagerSetupPrompt.tsx: [lines]

### Files Modified: [count]
- app/(auth)/signup.tsx: [describe]
- components/DashboardRouter.tsx or CoachHomeScroll: [describe]

### Wizard Steps:
- Step 1 (Team name + sport + age): RENDERS / BROKEN
- Step 2 (Season name + dates): RENDERS / BROKEN
- Step 3 (Invite code generated + share): RENDERS / BROKEN
- Step 4 (Success + smart nudges): RENDERS / BROKEN

### Database Writes:
- Organization created: YES / NO
- user_roles entry created: YES / NO
- profiles.current_organization_id updated: YES / NO
- Season created: YES / NO
- Team created: YES / NO
- team_staff entry created: YES / NO
- team_invite_codes entry created: YES / NO

### Navigation:
- Signup > "Start my own team" > Wizard: WORKS / BROKEN
- Wizard > Complete > Home: WORKS / BROKEN
- Returning TM (no team) > Setup prompt: WORKS / BROKEN

### Team Limit:
- canCreateTeam checks team count: YES / NO
- Limit enforced at 1 for free tier: YES / NO

### Investigation Adjustments:
[List any table/column changes based on findings]

### Type Check: PASS / FAIL

### Errors: NONE / [list]
```

---

## IMPORTANT: SQL

This spec may need a migration if:
- The `teams` table requires columns we're not inserting (the investigation will reveal this)
- The `organizations` table has required columns we're missing
- The `seasons` table needs specific columns

If the investigation reveals missing required columns, create a migration to add them or adjust the insert statements. No structural table changes should be needed since we're using existing tables.
