# CC-TEAM-MANAGER-SPEC2-OPERATIONAL-UI
# Lynx Team Manager — Spec 2: Operational Cards + Admin Assignment
# Status: READY FOR CC EXECUTION (after Spec 1 is verified)
# Depends on: CC-TEAM-MANAGER-EXECUTE (Spec 1) fully complete

---

## STANDING RULES

1. **Read these files first:** `CC-LYNX-RULES.md`, `AGENTS.md`, `SCHEMA_REFERENCE.csv`
2. **Read CoachHomeScroll.tsx completely** before adding any components.
3. **Match existing card design patterns exactly.** Read SmartNudgeCard, CoachEngagementCard, and the 2x2 ActionGrid for styling reference.
4. **Commit after each phase.** Commit message format: `[team-manager-ui] Phase X: description`
5. **After EACH phase, run `npx tsc --noEmit` and report.**
6. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Adds 4 operational cards to the Coach Home scroll that appear ONLY when the user has the team_manager role. Also adds admin UI for assigning team_manager to users. After this spec, the Team Manager home experience is complete.

---

## PHASE 1: Investigation

Read and report:

1. **CoachHomeScroll.tsx** — Show the complete scroll order (all components rendered, in order). Show how components receive data (props from a hook? individual hooks per component?). What hook provides the main coach data?

2. **How does CoachHomeScroll know the user's role?** Does it import `usePermissions`? Does it receive role as a prop? We need to conditionally show/hide cards based on `isTeamManager`.

3. **useCoachHomeData** — What data does this hook return? Does it include payment data? RSVP data? Registration data? Roster counts?

4. **How does the admin currently manage users?** Find `app/users.tsx`. How does the admin add/edit user roles? Is there a role assignment dropdown? Can the admin assign a user to a team via team_staff?

5. **How does the admin manage team staff?** Is there a screen for viewing/editing who is on a team's staff? Or is it only done via direct DB manipulation?

6. **What payment data is accessible?** Find how CoachHomeScroll or AdminHomeScroll queries payment data. What table? What columns? Can we reuse an existing query pattern for the TM payment card?

7. **What RSVP data is accessible?** Find how event RSVPs are queried. What table stores RSVPs? (`event_rsvps`? `event_attendance`?) How does the existing Next Event card show RSVP counts?

8. **What registration data is accessible?** Find how the admin views registration status. What table? Is registration team-scoped or org-scoped?

**Report findings, then proceed to Phase 2.**

---

## PHASE 2: Create useTeamManagerData hook

Create a new file:
```
hooks/useTeamManagerData.ts
```

This hook fetches operational data specific to the Team Manager role: payment health, upcoming event RSVPs, registration status, and roster health. It's lightweight and only called when `isTeamManager` is true.

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface TeamManagerData {
  // Payment health
  overduePayments: number;
  overdueAmount: number;
  pendingPayments: number;
  totalCollected: number;

  // Next event RSVP
  nextEventTitle: string | null;
  nextEventDate: string | null;
  nextEventType: string | null;
  rsvpConfirmed: number;
  rsvpMaybe: number;
  rsvpNoResponse: number;
  rsvpTotal: number;
  nextEventId: string | null;

  // Registration (if active)
  registrationOpen: boolean;
  registrationFilled: number;
  registrationCapacity: number;
  registrationPending: number;

  // Roster health
  rosterCount: number;
  rosterPendingApproval: number;

  // Loading
  loading: boolean;
}

export function useTeamManagerData(teamId: string | null) {
  const [data, setData] = useState<TeamManagerData>({
    overduePayments: 0,
    overdueAmount: 0,
    pendingPayments: 0,
    totalCollected: 0,
    nextEventTitle: null,
    nextEventDate: null,
    nextEventType: null,
    rsvpConfirmed: 0,
    rsvpMaybe: 0,
    rsvpNoResponse: 0,
    rsvpTotal: 0,
    nextEventId: null,
    registrationOpen: false,
    registrationFilled: 0,
    registrationCapacity: 0,
    registrationPending: 0,
    rosterCount: 0,
    rosterPendingApproval: 0,
    loading: true,
  });

  const loadData = useCallback(async () => {
    if (!teamId) return;
    try {
      setData(prev => ({ ...prev, loading: true }));

      // ── Payment health ──
      // Query the payments table for this team
      // Investigation must confirm table name and columns
      // Expected: payments table with team_id, amount, status, due_date
      let overduePayments = 0;
      let overdueAmount = 0;
      let pendingPayments = 0;
      let totalCollected = 0;

      try {
        const today = new Date().toISOString().split('T')[0];

        const { data: payments } = await supabase
          .from('payments')
          .select('amount, status')
          .eq('team_id', teamId);

        if (payments) {
          payments.forEach((p: any) => {
            if (p.status === 'overdue' || p.status === 'past_due') {
              overduePayments++;
              overdueAmount += Number(p.amount) || 0;
            } else if (p.status === 'pending') {
              pendingPayments++;
            } else if (p.status === 'paid' || p.status === 'completed') {
              totalCollected += Number(p.amount) || 0;
            }
          });
        }
      } catch {
        // Payment query may fail if table structure differs — graceful fallback
      }

      // ── Next event RSVP ──
      const todayStr = localToday();
      let nextEventTitle: string | null = null;
      let nextEventDate: string | null = null;
      let nextEventType: string | null = null;
      let nextEventId: string | null = null;
      let rsvpConfirmed = 0;
      let rsvpMaybe = 0;
      let rsvpNoResponse = 0;
      let rsvpTotal = 0;

      const { data: nextEvent } = await supabase
        .from('schedule_events')
        .select('id, title, event_type, event_date')
        .eq('team_id', teamId)
        .gte('event_date', todayStr)
        .order('event_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextEvent) {
        nextEventTitle = nextEvent.title;
        nextEventDate = nextEvent.event_date;
        nextEventType = nextEvent.event_type;
        nextEventId = nextEvent.id;

        // Get RSVP counts for this event
        // Investigation must confirm RSVP table name (event_rsvps or similar)
        try {
          const { data: rsvps } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', nextEvent.id);

          if (rsvps) {
            rsvps.forEach((r: any) => {
              if (r.status === 'confirmed' || r.status === 'yes' || r.status === 'going') rsvpConfirmed++;
              else if (r.status === 'maybe' || r.status === 'tentative') rsvpMaybe++;
            });
          }
        } catch {
          // RSVP query may fail — graceful fallback
        }

        // Total players for RSVP denominator
        const { count: playerCount } = await supabase
          .from('team_players')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', teamId);

        rsvpTotal = playerCount || 0;
        rsvpNoResponse = rsvpTotal - rsvpConfirmed - rsvpMaybe;
        if (rsvpNoResponse < 0) rsvpNoResponse = 0;
      }

      // ── Registration status ──
      let registrationOpen = false;
      let registrationFilled = 0;
      let registrationCapacity = 0;
      let registrationPending = 0;

      try {
        // Investigation must confirm registration table and columns
        const { data: regData } = await supabase
          .from('registrations')
          .select('status')
          .eq('team_id', teamId);

        if (regData && regData.length > 0) {
          registrationOpen = true;
          regData.forEach((r: any) => {
            if (r.status === 'approved' || r.status === 'confirmed') registrationFilled++;
            else if (r.status === 'pending') registrationPending++;
          });
        }
      } catch {
        // Registration table may not exist or have different structure
      }

      // ── Roster health ──
      const { count: rosterCount } = await supabase
        .from('team_players')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', teamId);

      // Check for pending roster approvals (if such a concept exists)
      let rosterPendingApproval = 0;
      try {
        const { count: pending } = await supabase
          .from('team_players')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', teamId)
          .eq('status', 'pending');

        rosterPendingApproval = pending || 0;
      } catch {
        // status column may not exist
      }

      setData({
        overduePayments,
        overdueAmount,
        pendingPayments,
        totalCollected,
        nextEventTitle,
        nextEventDate,
        nextEventType,
        nextEventId,
        rsvpConfirmed,
        rsvpMaybe,
        rsvpNoResponse,
        rsvpTotal,
        registrationOpen,
        registrationFilled,
        registrationCapacity,
        registrationPending,
        rosterCount: rosterCount || 0,
        rosterPendingApproval,
        loading: false,
      });
    } catch (err) {
      console.error('[useTeamManagerData] Error:', err);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [teamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { ...data, refreshData: loadData };
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
```

**IMPORTANT:** The investigation step must confirm:
- Payment table name and column names (status values: 'overdue'? 'past_due'? 'pending'? 'paid'?)
- RSVP table name (`event_rsvps`?) and status values ('confirmed'? 'yes'? 'going'?)
- Registration table name and structure
- Whether `team_players` has a `status` column for pending approvals

Adjust the queries based on what the investigation finds. The try/catch blocks handle graceful fallback if tables or columns don't match.

**Commit:** `[team-manager-ui] Phase 2: useTeamManagerData hook`

---

## PHASE 3: Create ManagerPaymentCard

Create:
```
components/coach-scroll/ManagerPaymentCard.tsx
```

### Design:

**Only visible when `isTeamManager` is true.**

**Card style:** Match CoachEngagementCard or SmartNudgeCard styling.

**Content:**
- Header: "Payments" with a dollar icon
- If overdue: amber/red tinted bar: "$630 overdue from 3 families"
- If no overdue: green tinted: "All payments current"
- Summary row: "Collected: $X | Pending: X | Overdue: X"
- Tap: navigates to payments screen filtered to their team

**Props:**
```typescript
interface Props {
  overduePayments: number;
  overdueAmount: number;
  pendingPayments: number;
  totalCollected: number;
  teamId: string;
}
```

**Commit:** `[team-manager-ui] Phase 3: ManagerPaymentCard`

---

## PHASE 4: Create ManagerAvailabilityCard

Create:
```
components/coach-scroll/ManagerAvailabilityCard.tsx
```

### Design:

**Only visible when `isTeamManager` is true AND a next event exists.**

**Content:**
- Header: "Next [Game/Practice]" with event date
- Event title and type badge (GAME in blue or PRACTICE in green)
- RSVP visual: three segments or pills showing Confirmed (green) | Maybe (amber) | No response (gray)
- Numbers: "8 confirmed, 2 maybe, 2 no response"
- If no-response > 0: "Send reminder" button that triggers a parent notification blast
- Tap card: navigates to event detail or schedule

**Send Reminder action:**
```typescript
import { createNotification } from '@/lib/notification-engine';

// For each parent of a player who hasn't responded:
// Create a notification: "RSVP needed for [event] on [date]. Tap to respond."
```

The actual implementation of "find parents who haven't RSVP'd" requires:
1. Get all players on the team (team_players)
2. Get their parent profile IDs (players.parent_account_id)
3. Filter out parents who already have an RSVP for this event
4. Send notification to remaining parents

**Props:**
```typescript
interface Props {
  nextEventTitle: string | null;
  nextEventDate: string | null;
  nextEventType: string | null;
  nextEventId: string | null;
  rsvpConfirmed: number;
  rsvpMaybe: number;
  rsvpNoResponse: number;
  rsvpTotal: number;
  teamId: string;
}
```

**Commit:** `[team-manager-ui] Phase 4: ManagerAvailabilityCard`

---

## PHASE 5: Create ManagerRosterCard

Create:
```
components/coach-scroll/ManagerRosterCard.tsx
```

### Design:

**Only visible when `isTeamManager` is true.**

**Content:**
- Header: "Roster" with people icon
- Player count: "12 players"
- If pending approvals: amber badge "2 pending"
- Squad face circles (reuse the existing squad faces pattern from CoachHomeScroll)
- Tap: navigates to roster management (/(tabs)/players?teamId=X)

**Props:**
```typescript
interface Props {
  rosterCount: number;
  pendingApproval: number;
  teamId: string;
}
```

Keep this card compact. It's a quick glance, not a full roster view.

**Commit:** `[team-manager-ui] Phase 5: ManagerRosterCard`

---

## PHASE 6: Wire cards into CoachHomeScroll

**File to modify:** `components/CoachHomeScroll.tsx`

### What to change:

**1. Import the new components and hook:**
```typescript
import { usePermissions } from '@/lib/permissions-context';
import { useTeamManagerData } from '@/hooks/useTeamManagerData';
import ManagerPaymentCard from '@/components/coach-scroll/ManagerPaymentCard';
import ManagerAvailabilityCard from '@/components/coach-scroll/ManagerAvailabilityCard';
import ManagerRosterCard from '@/components/coach-scroll/ManagerRosterCard';
```

**2. Get role and TM data:**
```typescript
const { isTeamManager } = usePermissions();

// Only call the TM hook if user is a team manager
const tmData = isTeamManager ? useTeamManagerData(primaryTeamId) : null;
```

**WAIT:** Hooks can't be called conditionally in React. Instead:
```typescript
const tmData = useTeamManagerData(isTeamManager ? primaryTeamId : null);
// The hook already handles null teamId by returning early
```

**3. Add cards to the scroll, AFTER the game day hero but BEFORE the engagement card:**

```typescript
{isTeamManager && tmData && !tmData.loading && (
  <>
    <ManagerPaymentCard
      overduePayments={tmData.overduePayments}
      overdueAmount={tmData.overdueAmount}
      pendingPayments={tmData.pendingPayments}
      totalCollected={tmData.totalCollected}
      teamId={primaryTeamId}
    />
    <ManagerAvailabilityCard
      nextEventTitle={tmData.nextEventTitle}
      nextEventDate={tmData.nextEventDate}
      nextEventType={tmData.nextEventType}
      nextEventId={tmData.nextEventId}
      rsvpConfirmed={tmData.rsvpConfirmed}
      rsvpMaybe={tmData.rsvpMaybe}
      rsvpNoResponse={tmData.rsvpNoResponse}
      rsvpTotal={tmData.rsvpTotal}
      teamId={primaryTeamId}
    />
    <ManagerRosterCard
      rosterCount={tmData.rosterCount}
      pendingApproval={tmData.rosterPendingApproval}
      teamId={primaryTeamId}
    />
  </>
)}
```

**Placement:** After the Game Day hero card (or Smart Nudge card) and BEFORE the engagement card. The TM cards should be the first operational content the TM sees after the hero.

**For TM-only users (no coach role):** The Game Day hero card might not make sense since TMs don't manage lineups. However, the Game Day hero also shows the next event which IS relevant for TMs. Leave it as-is for now. If it needs to be modified for TM, that's a follow-up.

**Commit:** `[team-manager-ui] Phase 6: wire TM cards into CoachHomeScroll`

---

## PHASE 7: Admin assigns Team Manager

**File to modify:** `app/users.tsx`

### What to change:

The admin needs to be able to:
1. Assign 'team_manager' as a role to a user (user_roles table)
2. Assign the user to a team as team_manager (team_staff table)

**7A: Role assignment**

Find the role assignment UI in users.tsx. There should be a role dropdown or selector when viewing/editing a user. Add 'team_manager' as an option:

```typescript
// In the role dropdown options:
{ value: 'team_manager', label: 'Team Manager' },
```

**7B: Team staff assignment**

After assigning the team_manager role, the admin also needs to assign the user to a specific team. Find the team assignment UI (if it exists) and add 'team_manager' as a staff_role option.

If NO team assignment UI exists:
- Add a simple team picker (dropdown of teams in the org) that appears when the role is 'team_manager'
- On save, insert into `team_staff`: `{ team_id, user_id, staff_role: 'team_manager', is_active: true }`

**IMPORTANT:** This might be a complex change depending on how users.tsx is structured (it's 25,000+ lines for payments). Be surgical. Only add the TM role option and the team assignment. Do not restructure the user management screen.

If the user management screen is too complex to modify safely, create a MINIMAL alternative: a simple "Assign Team Manager" action button that:
1. Shows a user picker (search by name)
2. Shows a team picker (dropdown)
3. Inserts user_roles + team_staff rows
4. Shows success confirmation

**Commit:** `[team-manager-ui] Phase 7: admin assigns team manager`

---

## PHASE 8: Verification

```
## VERIFICATION REPORT: Team Manager — Spec 2

### Files Created: [count]
- hooks/useTeamManagerData.ts: [lines]
- components/coach-scroll/ManagerPaymentCard.tsx: [lines]
- components/coach-scroll/ManagerAvailabilityCard.tsx: [lines]
- components/coach-scroll/ManagerRosterCard.tsx: [lines]

### Files Modified: [count]
- components/CoachHomeScroll.tsx: [describe]
- app/users.tsx: [describe]

### TM Cards on Coach Home:
- ManagerPaymentCard visible for TM: YES / NO
- ManagerAvailabilityCard visible for TM: YES / NO
- ManagerRosterCard visible for TM: YES / NO
- Cards HIDDEN for non-TM coaches: YES / NO

### Data Queries:
- Payment data loads: YES / NO / SKIPPED [reason]
- RSVP data loads: YES / NO
- Roster count loads: YES / NO
- Registration data loads: YES / NO / SKIPPED [reason]

### Admin Assignment:
- Admin can assign team_manager role: YES / NO
- Admin can assign TM to a team (team_staff): YES / NO

### Investigation Adjustments:
[List any table/column name changes made based on investigation findings]

### Type Check: PASS / FAIL

### Errors: NONE / [list]
```
