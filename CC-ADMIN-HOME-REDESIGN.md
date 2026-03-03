# LYNX — Admin Home: Smart Queue Redesign
## For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)  
**GitHub:** SgtxTorque/volleybrain-mobile3  
**Web Admin (SOURCE OF TRUTH):** `C:\Users\fuent\Downloads\volleybrain-admin\`  
**Brand Book:** `reference/design-references/brandbook/LynxBrandBook.html`

---

## CONTEXT

The Admin is Marisa. She runs the entire organization — multiple teams, multiple seasons, potentially hundreds of players. She's also a coach and a parent. She does everything from her phone — at the food court, on the couch, between practices. The admin home is not a dashboard. It's her **Chief of Staff** — a proactive assistant that tells her what needs attention, helps her act on it immediately, and motivates her when she's knocking things out.

**Design philosophy:** The admin home is a QUEUE, not a report. She opens the app, sees what's on fire, taps to fix it, sees the counter go down, closes the app. Everything else she needs is one tap away through Quick Actions or search.

**The admin uses the LIGHT theme** (same visual language as parent/coach, NOT the player dark theme). The admin is the operational heart of the app — it should feel professional, clean, and fast.

---

## RULES

1. **Read SCHEMA_REFERENCE.csv** before any queries.
2. **Read existing mobile admin code** before changing:
   - Find the current Admin dashboard in DashboardRouter
   - Read all of it before modifying
3. **Read the web admin dashboard widgets** for query patterns:
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\components\widgets\dashboard\DashboardWidgets.jsx` (1181 lines)
   - Key widgets: NeedsAttentionWidget (line 717), PaymentSummaryWidget (line 326), TeamHealthWidget (line 628), RegistrationStatsWidget (line 211), SeasonOverviewWidget (line 918)
4. **ADMIN-ROLE ONLY.** Do NOT touch Parent, Coach, or Player dashboards.
5. **Reuse existing theme tokens** from `theme/colors.ts`, `theme/fonts.ts`.
6. **All animations use `react-native-reanimated`** (UI thread, 60fps).
7. **Check package.json** before installing anything.
8. **No console.log without `__DEV__` gating.**
9. **Run `npx tsc --noEmit` after every phase.**
10. **Commit AND push after every phase.**
11. **AUTONOMOUS EXECUTION MODE.** Run ALL phases (0-7) without stopping.

---

## PHASE 0: PRE-FLIGHT AUDIT

0A. Find and read the current mobile admin dashboard:
```bash
grep -rn "admin.*dashboard\|AdminDashboard\|role.*admin\|head_coach" components/ --include="*.tsx" --include="*.ts" -l
```
Read the DashboardRouter to see how it routes to the admin view. Read the current admin home component.

0B. Read the web admin widgets file:
```
C:\Users\fuent\Downloads\volleybrain-admin\src\components\widgets\dashboard\DashboardWidgets.jsx
```
Focus on:
- `NeedsAttentionWidget()` (line 717) — pending regs, overdue payments, unsigned waivers
- `PaymentSummaryWidget()` (line 326) — collected, expected, overdue, online vs manual
- `TeamHealthWidget()` (line 628) — teams with roster count, record, next event
- `RegistrationStatsWidget()` (line 211) — total, pending, approved, rostered, waitlisted
- `UpcomingEventsWidget()` (line 436) — next events across all teams
- `SeasonOverviewWidget()` (line 918) — season-level overview

0C. Read SCHEMA_REFERENCE.csv and verify these tables exist:
- `seasons` — id, name, organization_id, start_date, end_date, status
- `teams` — id, name, color, season_id, max_players
- `team_players` — team_id, player_id
- `players` — id, first_name, last_name, status, season_id
- `payments` — id, player_id, season_id, amount, paid, payment_method, due_date
- `schedule_events` — id, team_id, event_type, event_date, start_time, location, opponent_name
- `event_rsvps` — event_id, player_id, status
- `waivers` — id, organization_id, is_required, is_active
- `waiver_signatures` — id, waiver_id, player_id
- `team_coaches` — team_id, user_id, role

Flag any tables that DON'T exist. Wrap queries for missing tables in try/catch.

0D. Check what `roleContext` provides for the admin role.

0E. Read the existing parent and coach scroll components (`ParentHomeScroll.tsx`, `CoachHomeScroll.tsx`) to understand the three-tier pattern, scroll hooks, compact header, and bottom nav behavior. The admin scroll should follow the same structural patterns.

**Commit:** `git add -A && git commit -m "Admin Phase 0: Pre-flight audit complete" && git push`

---

## PHASE 1: DATA HOOK + SCROLL SCAFFOLD

### 1A. Create `hooks/useAdminHomeData.ts`

This hook loads ALL data the admin home needs. Mirror the web admin widget query patterns.

```typescript
interface AdminHomeData {
  // Organization basics
  orgName: string;
  adminName: string;

  // Season data
  activeSeason: Season | null;
  upcomingSeason: Season | null;
  teams: TeamHealth[];

  // Smart Queue items
  queueItems: QueueItem[];
  
  // Payment summary
  payments: {
    collected: number;
    expected: number;
    overdue: number;
    overdueCount: number;  // number of families
    oldestOverdueDays: number;
  };

  // Registration summary
  registrations: {
    total: number;
    pending: number;
    approved: number;
    rostered: number;
    waitlisted: number;
  };

  // Upcoming events (next 3 across all teams)
  upcomingEvents: ScheduleEvent[];

  // Coach activity
  coachActivity: CoachTask[];

  // Completed items today (for motivation counter)
  completedToday: number;

  // Loading state
  loading: boolean;
}

interface QueueItem {
  id: string;
  urgency: 'overdue' | 'blocking' | 'thisWeek' | 'upcoming';
  category: string;        // 'payment' | 'registration' | 'schedule' | 'jersey' | 'waiver' | 'roster'
  title: string;           // "4 families haven't paid"
  subtitle: string;        // "Johnson, Martinez, Chen, Williams"
  impact?: string;         // "This blocks jersey delivery by Mar 15"
  icon: string;            // emoji
  color: string;           // urgency color
  primaryAction: {
    label: string;         // "Send Reminder"
    type: 'inline' | 'modal' | 'navigate';
    handler: string;       // function name or route
  };
  secondaryAction?: {
    label: string;         // "View All"
    route: string;
  };
}

interface TeamHealth {
  id: string;
  name: string;
  color: string;
  rosterCount: number;
  maxPlayers: number;
  paymentStatus: 'good' | 'warning' | 'overdue';
  unpaidCount: number;
  nextEvent?: ScheduleEvent;
  wins: number;
  losses: number;
}
```

**Queries (reference web admin DashboardWidgets.jsx):**

```typescript
// 1. Active season + teams (reference TeamHealthWidget line 639-664)
const { data: teamsData } = await supabase.from('teams')
  .select('id, name, color, max_players')
  .eq('season_id', activeSeason.id);

const teamIds = teamsData?.map(t => t.id) || [];

const { data: teamPlayers } = await supabase.from('team_players')
  .select('team_id, player_id')
  .in('team_id', teamIds);

const { data: standings } = await supabase.from('team_standings')
  .select('team_id, wins, losses')
  .in('team_id', teamIds);

// 2. Payments (reference PaymentSummaryWidget line 340-354)
const { data: allPayments } = await supabase.from('payments')
  .select('amount, paid, payment_method, due_date, player_id')
  .eq('season_id', activeSeason.id);

// 3. Registrations (reference RegistrationStatsWidget line 225-252)
const { data: allPlayers } = await supabase.from('players')
  .select('id, status, first_name, last_name')
  .eq('season_id', activeSeason.id);

// 4. Smart Queue items — build from needs attention data
// Reference NeedsAttentionWidget line 732-761
// Pending registrations
const pendingRegs = allPlayers?.filter(p => 
  ['pending', 'submitted', 'new'].includes(p.status)) || [];

// Overdue payments
const unpaidPayments = allPayments?.filter(p => !p.paid) || [];
const overdueTotal = unpaidPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

// Unsigned waivers
try {
  const { data: waivers } = await supabase.from('waivers')
    .select('id')
    .eq('organization_id', activeSeason.organization_id)
    .eq('is_required', true)
    .eq('is_active', true);
  // ... count unsigned
} catch { /* table may not exist */ }

// 5. Upcoming events (next 3 across all teams)
const today = new Date().toISOString().split('T')[0];
const { data: events } = await supabase.from('schedule_events')
  .select('*, teams(name, color)')
  .in('team_id', teamIds)
  .gte('event_date', today)
  .order('event_date', { ascending: true })
  .order('start_time', { ascending: true })
  .limit(5);

// 6. Upcoming season (if exists)
const { data: nextSeason } = await supabase.from('seasons')
  .select('*')
  .eq('organization_id', activeSeason.organization_id)
  .gt('start_date', activeSeason.end_date || today)
  .order('start_date', { ascending: true })
  .limit(1)
  .maybeSingle();

// 7. Teams missing schedule this week
const startOfWeek = getStartOfWeek(); // Monday
const endOfWeek = getEndOfWeek(); // Sunday
const { data: weekEvents } = await supabase.from('schedule_events')
  .select('team_id')
  .in('team_id', teamIds)
  .gte('event_date', startOfWeek)
  .lte('event_date', endOfWeek);
const teamsWithEvents = new Set(weekEvents?.map(e => e.team_id) || []);
const teamsMissingSchedule = teamsData?.filter(t => !teamsWithEvents.has(t.id)) || [];
```

**Build the Smart Queue** from the collected data:
```typescript
function buildSmartQueue(data): QueueItem[] {
  const items: QueueItem[] = [];
  
  // OVERDUE: Pending registrations
  if (pendingRegs.length > 0) {
    items.push({
      id: 'pending-regs',
      urgency: 'overdue',
      category: 'registration',
      title: `${pendingRegs.length} registration${pendingRegs.length > 1 ? 's' : ''} need review`,
      subtitle: pendingRegs.slice(0, 3).map(p => p.first_name).join(', ') + 
        (pendingRegs.length > 3 ? ` +${pendingRegs.length - 3} more` : ''),
      icon: '📋',
      color: '#F59E0B',
      primaryAction: { label: 'Review Now', type: 'navigate', handler: 'registrations' },
    });
  }

  // OVERDUE: Unpaid families
  if (unpaidPayments.length > 0) {
    const familyCount = new Set(unpaidPayments.map(p => p.player_id)).size;
    items.push({
      id: 'overdue-payments',
      urgency: 'overdue',
      category: 'payment',
      title: `${familyCount} families haven't paid`,
      subtitle: `$${overdueTotal.toLocaleString()} outstanding`,
      icon: '💰',
      color: '#EF4444',
      primaryAction: { label: 'Send Reminders', type: 'inline', handler: 'sendPaymentReminders' },
      secondaryAction: { label: 'View All', route: 'payments' },
    });
  }

  // OVERDUE: Unsigned waivers
  if (unsignedWaiverCount > 0) {
    items.push({
      id: 'unsigned-waivers',
      urgency: 'overdue',
      category: 'waiver',
      title: `${unsignedWaiverCount} unsigned waivers`,
      subtitle: 'Required waivers are missing signatures',
      icon: '⚠️',
      color: '#8B5CF6',
      primaryAction: { label: 'Send Reminder', type: 'inline', handler: 'sendWaiverReminders' },
      secondaryAction: { label: 'View Waivers', route: 'waivers' },
    });
  }

  // THIS WEEK: Teams missing schedule
  if (teamsMissingSchedule.length > 0) {
    items.push({
      id: 'missing-schedule',
      urgency: 'thisWeek',
      category: 'schedule',
      title: `No events this week for ${teamsMissingSchedule.length} team${teamsMissingSchedule.length > 1 ? 's' : ''}`,
      subtitle: teamsMissingSchedule.map(t => t.name).join(', '),
      icon: '📅',
      color: '#F59E0B',
      primaryAction: { label: 'Create Event', type: 'navigate', handler: 'createEvent' },
    });
  }

  // Sort: overdue first, then blocking, then thisWeek, then upcoming
  const urgencyOrder = { overdue: 0, blocking: 1, thisWeek: 2, upcoming: 3 };
  items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return items;
}
```

### 1B. Create `components/AdminHomeScroll.tsx` — scaffold

Same three-tier scroll architecture as parent and coach. Light theme (matches existing app).

```tsx
<View style={{ flex: 1, backgroundColor: COLORS.background }}>
  <StatusBar barStyle="dark-content" />
  {/* Compact header with role selector */}
  <Animated.View style={[compactHeaderStyle]}>
    {/* LYNX logo, notification bell, role selector, avatar */}
  </Animated.View>

  <Animated.ScrollView
    onScroll={scrollHandler}
    scrollEventThrottle={16}
    showsVerticalScrollIndicator={false}
  >
    {/* Sections render here */}
    <View style={{ height: 140 }} />
  </Animated.ScrollView>
</View>
```

### 1C. Wire into DashboardRouter
Replace the old admin dashboard with AdminHomeScroll. Pass `roleContext`.

**Commit:** `git add -A && git commit -m "Admin Phase 1: Data hook + scroll scaffold + router wiring" && git push`

---

## PHASE 2: THE BRIEFING + SMART QUEUE

### 2A. Welcome Briefing (Tier 3 — Ambient)

```
  🐱

  Good evening, Marisa.
  You're managing 3 teams and 32 players.

  🔴 2   🟡 3   ✅ 4 cleared today
```

- Mascot emoji centered, 48px
- Greeting: "Good [time], [Name]." — `FONTS.bodyBold`, 22px, `COLORS.textPrimary`
- Context line: "You're managing X teams and Y players." — `FONTS.bodyMedium`, 14px, `COLORS.textMuted`
- Urgency counters on one row:
  - 🔴 number: overdue/blocking items count. Tap → scrolls to those queue cards
  - 🟡 number: this-week items count
  - ✅ number + "cleared today": completed items. Color: `COLORS.success`
- The counts are computed from the Smart Queue data
- If ALL items are cleared: "✅ All caught up! Enjoy the moment." with a celebratory mascot

### 2B. Smart Queue Cards (Tier 1 — Full Cards)

Each QueueItem renders as an action card. Show max 4 cards. "View X more →" if more exist.

**Card layout:**
```
┌──────────────────────────────────────────────┐
│  🔴 OVERDUE · Registration                   │
│                                              │
│  4 registrations need review                 │
│  Sarah, Michael, Lin, Jayden                 │
│                                              │
│  [ Review Now ]         [ View All → ]       │
└──────────────────────────────────────────────┘
```

**Card implementation:**
- Card container: `backgroundColor: COLORS.white`, `borderRadius: 16`, `borderWidth: 1`, `borderColor: COLORS.borderLight`, `marginHorizontal: 20`, `padding: 16`
- Left edge accent: 4px wide vertical strip on the left edge, color matches urgency:
  - `overdue`: `#EF4444` (red)
  - `blocking`: `#F97316` (orange)
  - `thisWeek`: `#F59E0B` (amber)
  - `upcoming`: `#6B7280` (gray)
- Urgency label: "OVERDUE · Registration" — 10px, bold, uppercase, letterSpacing 1, color matches urgency
- Title: 15px, `FONTS.bodySemiBold`, `COLORS.textPrimary`
- Subtitle: 13px, `FONTS.bodyMedium`, `COLORS.textMuted`
- Impact line (if present): 12px, italic, urgency color. "This blocks jersey delivery by Mar 15"
- **Primary action button:**
  - If `type: 'inline'`: Filled button, `COLORS.skyBlue` bg, white text. Tapping executes the action immediately (e.g., sends reminders via Supabase function or bulk notification). Show a brief success toast "✓ Reminders sent to 4 families"
  - If `type: 'navigate'`: Outlined button, navigates to the relevant screen
  - If `type: 'modal'`: Opens a quick-action modal (for things like creating an event)
- **Secondary action:** Text link, `COLORS.skyBlue`, right-aligned. Navigates to full screen.
- **Dismiss/complete:** When an inline action succeeds, the card should animate away (fade out + slide left, 300ms). The briefing counter updates.

**"View X more" link** below the last card:
- `FONTS.bodyMedium`, 13px, `COLORS.skyBlue`
- Tapping expands to show all remaining queue items

**If the queue is empty:**
```
  ✅ All clear!
  Nothing needs your attention right now.
  Go enjoy a moment — you've earned it.
```
Centered, `COLORS.textMuted`, with a green checkmark icon.

**Commit:** `git add -A && git commit -m "Admin Phase 2: Welcome briefing + Smart Queue action cards" && git push`

---

## PHASE 3: SEASON COMMAND CENTER

### 3A. Season Header

```
  SPRING 2026                          ●● Active
```

- Season name: `FONTS.bodyBold`, 10px, uppercase, `COLORS.textFaint`, letterSpacing 1.2
- Status pill: "Active" with green dot, or "Setup" with amber dot, or "Upcoming" with gray dot
- If an upcoming season exists, show it below the active season

### 3B. Team Health Tiles

Horizontal scroll of compact team tiles:

```
  ┌─────────┐  ┌─────────┐  ┌─────────┐
  │ ● Elite │  │ ⚠ 13U   │  │ ● Sting │
  │ 12/12   │  │ 10/14   │  │ 8/8     │
  │ $paid ✓ │  │ 4 unpaid│  │ $paid ✓ │
  └─────────┘  └─────────┘  └─────────┘
```

**Tile implementation:**
- Width: 110, height: 90, borderRadius: 14
- Border: 1px, color depends on health:
  - All good (full roster, all paid): `COLORS.success` at 30% + light green tint bg
  - Warning (missing players or some unpaid): `#F59E0B` at 30% + light amber tint bg
  - Critical (overdue payments or very low roster): `#EF4444` at 30% + light red tint bg
- Team color dot (6px circle) next to team name
- Team name: 12px, `FONTS.bodySemiBold`, truncated
- Roster: "12/12" or "10/14" — smaller font, muted
- Payment: "$paid ✓" in green or "4 unpaid" in amber/red
- **Tapping a tile** → navigates to team management screen

**Reference:** Web admin `TeamHealthWidget` (line 628-710) for query pattern.

### 3C. Upcoming Season Prompt (Conditional)

If an upcoming season exists and is in setup/planning status:

```
┌──────────────────────────────────────────────┐
│  SUMMER 2026                     ○ Planning  │
│  Registration opens in 18 days               │
│  [ Start Setup → ]                           │
└──────────────────────────────────────────────┘
```

- Warm-tinted card (same style as coach Season Setup card)
- Countdown to registration open date (or season start date)
- "Start Setup" button navigates to season setup wizard
- If NO upcoming season: show "[ + Plan Next Season ]" button instead

**Commit:** `git add -A && git commit -m "Admin Phase 3: Season command center with team tiles + upcoming prompt" && git push`

---

## PHASE 4: PAYMENT SNAPSHOT + QUICK ACTIONS

### 4A. Payment Snapshot Card

**Reference:** Web admin `PaymentSummaryWidget` (line 326-431)

```
┌──────────────────────────────────────────────┐
│  PAYMENTS                       Spring 2026  │
│                                              │
│  $4,200 collected     $1,800 outstanding     │
│  ████████████████████░░░░░░░░░░  70%         │
│                                              │
│  4 families overdue · oldest: 22 days        │
│                                              │
│  [ Send All Reminders ]        View Details →│
└──────────────────────────────────────────────┘
```

- Card: standard light card with subtle shadow
- "PAYMENTS" header left, season name right, both in section header style
- Big numbers: `collected` in `COLORS.success` bold 20px, `outstanding` in `COLORS.textMuted` bold 20px
- Progress bar: height 8px, `COLORS.success` fill, `COLORS.warmGray` track
- Percentage: "70%" right of bar
- Overdue line: "X families overdue · oldest: Y days" — amber/red text if overdue > 0
- **"Send All Reminders" button:** `COLORS.skyBlue` bg, white text. Tapping sends payment reminders to ALL overdue families. Toast: "✓ Reminders sent to 4 families"
- "View Details →" text link → payments management screen
- **If no payments exist:** "No fee structure set up yet. [ Set Up Fees → ]"
- **If all paid:** "✅ 100% collected! $4,200 total." with no reminder button

### 4B. Quick Actions Toolbar

6 actions in a 3×2 grid:

```
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ 📋       │  │ 📅       │  │ 💰       │
  │Create    │  │ Quick    │  │  Send    │
  │ Event    │  │Schedule  │  │Reminder  │
  └──────────┘  └──────────┘  └──────────┘
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ 📣       │  │ 👤       │  │ 📊       │
  │ Blast    │  │  Add     │  │ Season   │
  │  All     │  │ Player   │  │ Report   │
  └──────────┘  └──────────┘  └──────────┘
```

- Each action: 100×80, `backgroundColor: COLORS.offWhite`, borderRadius: 14, centered
- Emoji: 22px, centered
- Label: 11px, `FONTS.bodySemiBold`, `COLORS.textPrimary`, centered, 2 lines max
- Tapping navigates to the relevant screen or opens a quick-action modal
- **"Create Event"** is the most important — Marisa needs to create an event from her phone in 30 seconds. If a create-event screen exists, navigate there. If not, show a "Coming soon" toast.
- **"Blast All"** sends a message to all parents across all teams. If blast functionality exists, navigate there.
- **"Send Reminder"** same as the payment reminder button — sends to all overdue families.

### 4C. Quick Search Bar

Positioned between the briefing and the Smart Queue:

```
  🔍  Search players, families, teams...
```

- Full-width pill: `backgroundColor: COLORS.offWhite`, borderRadius: 12, height: 44
- Magnifying glass icon left, placeholder text in `COLORS.textFaint`
- Tapping opens a search screen/modal with real-time results across:
  - Players (by name)
  - Families/parents (by name)
  - Teams (by name)
- If a full search screen doesn't exist on mobile yet, tapping shows "Coming soon" toast
- This is Marisa's "parent calls at the food court" lifeline

**Commit:** `git add -A && git commit -m "Admin Phase 4: Payment snapshot, quick actions grid, search bar" && git push`

---

## PHASE 5: COACH DELEGATION + EVENTS PREVIEW

### 5A. Coach Activity Section (Tier 2 — Flat)

```
  COACH ACTIVITY                     This Week

  ✓ Carlos T. entered stats · 2d ago
  ✓ Carlos T. sent practice reminder · 3d ago
  ⏳ Sarah M. — Review registrations (assigned)

  Assign a task →
```

**Data:** This requires a task/activity tracking system. Check if any of these tables exist:
- `coach_tasks` or `assigned_tasks`
- `activity_log` or `audit_log`
- Any table tracking coach actions

**If the tables DON'T exist (likely):** Show a simplified version:
```
  COACHES                           3 Active

  Carlos T. · Black Hornets Elite, 13U
  Sarah M. · BH Stingers
  James R. · 13U

  [ Assign Task → Coming Soon ]
```

- List coaches from `team_coaches` table
- Show which teams each coach is assigned to
- "Assign Task" button shows "Coming soon" toast
- This is the placeholder for the full delegation feature

**If tables DO exist:** Show the full activity feed with completed/pending items.

### 5B. Upcoming Events Preview (Tier 2 — Flat)

```
  UPCOMING                          View Calendar →

  Mon 3/3 · Practice · Elite · 6:00 PM
  Wed 3/5 · Practice · 13U · 5:30 PM  
  Sat 3/8 · Game vs Rangers · Elite · 10:00 AM
```

- Next 3 events across ALL teams
- Each row: date · event type · team name · time
- Team name in the team's color
- Tapping an event → event detail screen (or toast if screen doesn't exist)
- "View Calendar →" navigates to schedule/calendar tab
- **If no events:** "No upcoming events. [ Create Event → ]"

**Commit:** `git add -A && git commit -m "Admin Phase 5: Coach delegation section + upcoming events preview" && git push`

---

## PHASE 6: SCROLL ANIMATIONS + CLOSING

### 6A. Closing Motivation (Tier 3 — Ambient)

```
  🐱

  You're managing 3 teams, 32 players,
  and 22 families this season.
  14 of 16 items cleared this week.

  You've got this, Marisa.
```

- Mascot emoji centered
- First line: scope summary — teams, players, families count. `FONTS.bodyMedium`, 13px, `COLORS.textMuted`, centered
- Second line: weekly progress — "X of Y items cleared this week." `COLORS.textMuted`
- Third line: "You've got this, [Name]." — `FONTS.bodySemiBold`, 14px, `COLORS.skyBlue`, centered
- This line is the human touch. The app recognizes her effort.

### 6B. Scroll Animations

- **Welcome mascot:** Parallax at 0.3x scroll speed
- **Smart Queue cards:** Each card slides in from the right with a 100ms stagger when entering viewport
- **Team tiles:** Horizontal scroll has subtle scale emphasis (active tile 1.02x scale)
- **Payment card:** Subtle breathing (scale 0.97→1.0) as it enters viewport center
- **Quick actions grid:** Items fade in simultaneously, 300ms
- **Compact header:** Fades in when welcome is scrolled offscreen. Shows: LYNX logo, notification bell, role selector, avatar

### 6C. Scroll Order

```
1.  Welcome briefing + motivation (Tier 3)
     ↕ 8px
2.  Quick Search bar
     ↕ 16px
3.  Smart Queue cards (Tier 1 — max 4 visible)
     ↕ 20px
4.  Season Command Center + team tiles
     ↕ 16px
5.  Payment Snapshot card
     ↕ 16px
6.  Quick Actions grid (3×2)
     ↕ 16px
7.  Coach Activity (Tier 2)
     ↕ 12px
8.  Upcoming Events (Tier 2)
     ↕ 24px
9.  Closing motivation (Tier 3)
     ↕ 140px bottom padding
```

**On a quiet day (no overdue items, season running smoothly):**
1. Welcome ("✅ All clear!") → 2. Search → 4. Season tiles (all green) → 6. Quick Actions → 8. Upcoming → 9. Closing

Short, clean scroll. Marisa opens, sees green, closes happy.

**On a busy day (registrations pending, payments overdue, schedule gaps):**
1. Welcome ("🔴 3 🟡 2") → 2. Search → 3. Queue (3-4 cards) → 4. Season tiles (some amber) → 5. Payment card → 6. Quick Actions → 7. Coaches → 8. Upcoming → 9. Closing

Fuller scroll but each section is actionable. She can clear items and watch the red count drop.

**Commit:** `git add -A && git commit -m "Admin Phase 6: Closing motivation, scroll animations, section ordering" && git push`

---

## PHASE 7: INLINE ACTIONS + ROLE SELECTOR + FINAL POLISH

### 7A. Inline Action Handlers

For Smart Queue cards with `type: 'inline'`:

**"Send Reminders" (payments):**
```typescript
async function sendPaymentReminders(unpaidPlayerIds: string[]) {
  // Check if a notifications/messages system exists
  // If push notifications exist: trigger payment reminder notification to each parent
  // If blast/message system exists: create a payment reminder blast
  // If neither exists: show toast "Reminder system coming soon — view details to contact manually"
  
  // For MVP: Show a toast confirming the action
  showToast('✓ Payment reminders queued for ' + unpaidPlayerIds.length + ' families');
}
```

**"Send Reminder" (waivers):**
```typescript
async function sendWaiverReminders() {
  showToast('✓ Waiver reminders queued');
}
```

For actions that navigate: use the existing navigation system. Find the route names by checking:
```bash
grep -rn "Screen.*name\|route.*name\|navigation.*navigate" --include="*.tsx" --include="*.ts" | grep -i "regist\|payment\|waiver\|schedule\|team\|event" | head -20
```

If routes don't exist for certain screens, the action button shows a "Coming soon" toast.

### 7B. Role Selector Fix

Verify the role selector works on the admin home. The admin needs to switch to Coach or Parent mode. Check that:
- The role selector renders in both the welcome section and compact header
- Tapping opens the dropdown/modal
- Selecting a role switches the dashboard
- This has been fixed in previous specs but verify it works here too

### 7C. Section Header Consistency

All section headers match the parent/coach pattern:
```
fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 1.2
textTransform: 'uppercase', color: COLORS.textFaint, paddingHorizontal: 24
```

### 7D. Other Roles Smoke Test
- [ ] Parent home: unchanged
- [ ] Coach home: unchanged
- [ ] Player home: unchanged (dark theme)

### 7E. TypeScript
```bash
npx tsc --noEmit
```

**Commit:** `git add -A && git commit -m "Admin Phase 7: Inline actions, role selector, final polish" && git push`

---

## VERIFICATION CHECKLIST

**Briefing:**
- [ ] Motivational welcome with admin name
- [ ] Urgency counters (red/yellow/green) reflect real data
- [ ] "All clear" state when no items need attention

**Smart Queue:**
- [ ] Cards render with real data (pending regs, overdue payments, unsigned waivers, missing schedules)
- [ ] Cards sorted by urgency (overdue first)
- [ ] Inline action buttons work (or show "coming soon")
- [ ] Max 4 cards visible with "View more" link
- [ ] Cards animate away on action completion (or re-fetch data)

**Season Command Center:**
- [ ] Active season shows with team health tiles
- [ ] Tiles color-coded by health status
- [ ] Upcoming season prompt shows when applicable
- [ ] Tapping tiles navigates to team management

**Payment Snapshot:**
- [ ] Shows real collected/outstanding/overdue numbers
- [ ] Progress bar fills correctly
- [ ] "Send All Reminders" button works (or shows toast)
- [ ] Hides gracefully if no payment data exists

**Quick Actions:**
- [ ] 6 actions render in 3×2 grid
- [ ] Each action navigates to correct screen (or toast)

**Other:**
- [ ] Quick search bar present and tappable
- [ ] Coach activity shows real coach data
- [ ] Upcoming events show real next events
- [ ] Closing shows real scope + progress numbers
- [ ] Role selector works
- [ ] All animations smooth 60fps

---

*This transforms the Admin Home from a generic dashboard into Marisa's Chief of Staff. She opens the app, sees what's urgent, acts on it from the card, watches the red count drop, and closes knowing nothing fell through the cracks. The Smart Queue is the heart — it thinks ahead for her so she doesn't have to hold it all in her head.*
