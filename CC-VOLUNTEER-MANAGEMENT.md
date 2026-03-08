# CC-VOLUNTEER-MANAGEMENT.md
# Lynx Mobile — Volunteer Management: Config-Driven Game Day Roles

**Priority:** H2-07 — Quick win, small effort, high value  
**Estimated time:** 3–4 hours (5 phases, commit after each)  
**Risk level:** LOW — extending existing database tables, config-driven UI

---

## WHAT THIS IS

Parents volunteer for game day roles. Instead of hardcoding "Line Judge" and "Scorekeeper," the system is **config-driven** — admins define which volunteer roles their org uses on the web, and the mobile app renders whatever they've configured. A volleyball club might use Line Judge + Scorekeeper + Snack Parent. A basketball league might use Shot Clock Operator + Scorer. The app handles all of them.

---

## CONFIG-DRIVEN APPROACH

### Volunteer Role Config

Stored on the organization or season level (similar to `registration_config`):

```typescript
interface VolunteerRoleConfig {
  roles: {
    key: string;           // 'line_judge', 'scorekeeper', 'snack_parent', 'stat_tracker', etc.
    label: string;         // 'Line Judge', 'Snack Parent', 'Photographer'
    icon: string;          // '🚩', '📋', '🍎', '📊', '📸' or icon name
    slots: number;         // total people needed (1 = just primary, 4 = primary + 3 backups)
    has_backups: boolean;  // true = primary + backup structure, false = all equal slots
    applies_to: string[];  // ['game'] or ['game', 'practice'] or ['all']
    required: boolean;     // true = show "NEEDED" warning if unfilled
    description?: string;  // "Bring enough snacks for 12 players and water"
    auto_rotate: boolean;  // true = suggest rotating parents each week so the same person isn't always asked
  }[];
}
```

### Default Config (ships with app)

If no config is set, default to volleyball basics:

```typescript
const DEFAULT_VOLUNTEER_CONFIG: VolunteerRoleConfig = {
  roles: [
    {
      key: 'line_judge',
      label: 'Line Judge',
      icon: '🚩',
      slots: 4,
      has_backups: true,  // 1 primary + 3 backups
      applies_to: ['game'],
      required: true,
      description: 'Call lines during the match',
      auto_rotate: true,
    },
    {
      key: 'scorekeeper',
      label: 'Scorekeeper',
      icon: '📋',
      slots: 4,
      has_backups: true,
      applies_to: ['game'],
      required: true,
      description: 'Track score at the scorer table',
      auto_rotate: true,
    },
  ]
};
```

### Example: Expanded Config (what a bigger org might set up)

```typescript
{
  roles: [
    { key: 'line_judge', label: 'Line Judge', icon: '🚩', slots: 4, has_backups: true, applies_to: ['game'], required: true, auto_rotate: true },
    { key: 'scorekeeper', label: 'Scorekeeper', icon: '📋', slots: 4, has_backups: true, applies_to: ['game'], required: true, auto_rotate: true },
    { key: 'snack_parent', label: 'Snack Parent', icon: '🍎', slots: 1, has_backups: false, applies_to: ['game', 'practice'], required: false, description: 'Bring snacks and water for 12 players', auto_rotate: true },
    { key: 'stat_tracker', label: 'Stat Tracker', icon: '📊', slots: 1, has_backups: false, applies_to: ['game'], required: false, description: 'Track player stats during the game using the Lynx app', auto_rotate: false },
    { key: 'photographer', label: 'Photographer', icon: '📸', slots: 1, has_backups: false, applies_to: ['game'], required: false, description: 'Take photos for the team gallery', auto_rotate: true },
    { key: 'team_parent', label: 'Team Parent', icon: '🏠', slots: 1, has_backups: false, applies_to: ['all'], required: false, description: 'Point of contact for parent communication', auto_rotate: false },
  ]
}
```

---

## DATABASE CHANGES

### Modify `event_volunteers` table

The existing table has `role` constrained to `('line_judge', 'scorekeeper')`. This needs to be flexible:

```sql
-- Remove the old constraint
ALTER TABLE event_volunteers DROP CONSTRAINT IF EXISTS event_volunteers_role_check;

-- Add a flexible constraint (or just remove the check entirely since roles are config-driven)
-- The role value comes from the config key, validated at the app level
ALTER TABLE event_volunteers ADD CONSTRAINT event_volunteers_role_check 
  CHECK (role IS NOT NULL AND role != '');

-- Also update position to be flexible for roles without backups
ALTER TABLE event_volunteers DROP CONSTRAINT IF EXISTS event_volunteers_position_check;
ALTER TABLE event_volunteers ADD CONSTRAINT event_volunteers_position_check
  CHECK (position IN ('primary', 'backup_1', 'backup_2', 'backup_3', 'slot_1', 'slot_2', 'slot_3', 'slot_4'));
```

### Add volunteer config to organizations table

```sql
-- Add config column if it doesn't exist
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS volunteer_role_config JSONB;
```

Or store it on the season level if different seasons need different roles:
```sql
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS volunteer_role_config JSONB;
```

Pick whichever makes more sense for the data model. Org-level is simpler (one config for all seasons). Season-level is more flexible.

---

## REFERENCE FILES

1. `reference/supabase_schema.md` — Current `event_volunteers` table structure
2. `app/attendance.tsx` — Attendance screen where volunteer section gets added
3. `components/EventCard.tsx` — Event cards showing volunteer status
4. The web admin volunteer assignment UI — understand parity

---

## PHASE 1: DATABASE + CONFIG + DATA LAYER

### 1A. Run schema modifications (flexible role/position constraints, add config column)

### 1B. Seed default volunteer config on the org

### 1C. Create `lib/volunteers.ts`

```typescript
// Config
getVolunteerConfig(orgId: string, seasonId?: string): VolunteerRoleConfig
getRolesForEventType(config: VolunteerRoleConfig, eventType: string): VolunteerRole[]

// Queries
getEventVolunteers(eventId: string): Volunteer[]
getVolunteerSummary(eventId: string, config: VolunteerRoleConfig): VolunteerSummary
// Returns: for each configured role, who's assigned, which slots are open, is it required + unfilled
getMyVolunteerSignups(profileId: string): Volunteer[]
getVolunteerHistory(profileId: string): { role: string, count: number }[]  // for rotation suggestions

// Mutations
signUpAsVolunteer(eventId, profileId, roleKey, position): void
removeVolunteer(volunteerId): void
assignVolunteer(eventId, profileId, roleKey, position): void

// Rotation suggestions
suggestVolunteer(eventId, roleKey, teamParents: Profile[]): Profile | null
// Suggests the parent who has volunteered the LEAST for this role, to distribute fairly
```

### 1D. Create `hooks/useVolunteers.ts`

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: volunteer config-driven data layer, flexible schema, rotation suggestions"
git push
```

---

## PHASE 2: VOLUNTEER SECTION ON ATTENDANCE SCREEN (Coach/Admin)

### 2A. Dynamic volunteer section

Read the volunteer config, then render a section for EACH configured role that applies to this event type:

```typescript
const config = await getVolunteerConfig(orgId);
const roles = getRolesForEventType(config, event.event_type);
// For a game: might return [line_judge, scorekeeper, snack_parent, stat_tracker]
// For a practice: might return [snack_parent] only
```

**For each role, render a role block:**

```
🚩 LINE JUDGE (required)
┌──────────────────────────────────────┐
│ ⭐ Primary:  Sarah M.    [Remove]   │
│    Backup 1: John D.     [Remove]   │
│    Backup 2: (open)      [+ Assign] │
│    Backup 3: (open)      [+ Assign] │
└──────────────────────────────────────┘

📋 SCOREKEEPER (required)
┌──────────────────────────────────────┐
│ ⭐ Primary:  (open)      [+ Assign] │
│    Backup 1: (open)      [+ Assign] │
└──────────────────────────────────────┘

🍎 SNACK PARENT
┌──────────────────────────────────────┐
│ Lisa R.                  [Remove]   │
│ Bring snacks and water for 12       │
└──────────────────────────────────────┘

📸 PHOTOGRAPHER
┌──────────────────────────────────────┐
│ (open)                   [+ Assign] │
└──────────────────────────────────────┘
```

**Roles with `has_backups: true`:** Show Primary + Backup 1-3 structure.
**Roles with `has_backups: false`:** Show simple slot(s) without primary/backup labels.
**Roles with `required: true`:** Show "required" badge. If unfilled, show coral warning.
**Role description:** Show below the role name in small text if `description` exists.

### 2B. "+ Assign" bottom sheet with rotation suggestions

When coach taps "+ Assign":
- Bottom sheet opens with team parents list
- **TOP of the list: "Suggested" section** — parents who have volunteered the LEAST for this role this season (based on `getVolunteerHistory`)
  - "Sarah M. — volunteered 0 times this season" 
  - "John D. — volunteered 1 time"
- Below: all other parents
- Already-assigned parents dimmed with "Already volunteering as [role]" badge
- Tap parent → assign

### 2C. Event card volunteer indicator

On EventCard for applicable events:
- All required roles filled: small teal checkmark + "Volunteers set"
- Any required role unfilled: coral dot + "Need [Role Name]" (e.g., "Need Line Judge")
- No volunteer roles for this event type: nothing shown

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: config-driven volunteer section on attendance, rotation suggestions, event card status"
git push
```

---

## PHASE 3: PARENT SELF-SIGNUP

### 3A. Volunteer section in Event Detail (Parent view)

Render the same roles from config but with parent-friendly UI:

```
HELP NEEDED FOR SATURDAY'S GAME

🚩 Line Judge
   ⭐ Sarah M. (Primary)
   Backup: John D.
   Backup: [Volunteer →]     ← tappable
   Backup: [Volunteer →]

📋 Scorekeeper
   ⭐ [Volunteer →]          ← tappable, coral "needed" if required
   
🍎 Snack Parent
   [Volunteer →]
   "Bring snacks and water for 12 players"
```

**"Volunteer →" tap flow:**
1. Confirmation bottom sheet: "Volunteer as Backup Line Judge for Saturday's game?"
2. If role has a description: show it ("Call lines during the match")
3. "Sign Up" button (teal)
4. On confirm: insert, update UI to show their name, coach gets notification
5. Button changes to "You're signed up ✓" with "Cancel" option

### 3B. "My Volunteer Schedule" on parent home

If parent has upcoming volunteer assignments:
- Card on ParentHomeScroll: "You're volunteering Saturday!"
- Role + event: "🚩 Line Judge — vs Frisco Flyers, 10:00 AM"
- Tap → event detail

If `auto_rotate` is true for a role and the parent hasn't volunteered in a while:
- Gentle nudge card: "It's been 3 weeks since you last volunteered. Saturday's game needs a Snack Parent — can you help?"
- NOT pushy. NOT guilt-trippy. Just a friendly ask.

### 3C. Volunteer sign-up from EventCard

When an event needs volunteers for required roles:
- EventCard shows subtle link: "Volunteers needed — can you help?"
- Tap → event detail scrolled to volunteer section

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: parent self-signup, my volunteer schedule, rotation nudges"
git push
```

---

## PHASE 4: ADMIN VOLUNTEER ROLE SETUP (Simple Version)

Admins need a way to configure which volunteer roles their org uses. For now, a simple settings screen — not a full config builder.

### 4A. Create `app/volunteer-settings.tsx` (Admin only)

**Route:** `/volunteer-settings`

**Layout:**

Header: "Volunteer Roles" + "Add Role" button

List of current roles (draggable to reorder):
Each role card:
- Icon + Label (editable)
- Slots: stepper (1-4)
- Has backups: toggle
- Applies to: pill selector (Games / Practices / All)
- Required: toggle
- Description: text input (optional)
- Auto-rotate: toggle
- "Delete" button (coral, with confirmation)

"Add Role" → empty card with the same fields

**Pre-populated with defaults** if no config exists yet.

"Save" button → writes to `organizations.volunteer_role_config`

### 4B. Wire into Admin Settings

Add "Volunteer Roles" to the admin gesture drawer under Settings/Org Settings.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: admin volunteer role settings - add/edit/remove custom roles"
git push
```

---

## PHASE 5: NOTIFICATIONS + VERIFY

### 5A. Push Notifications

| Event | Recipient | Message |
|-------|-----------|---------|
| Coach assigns parent | Parent | "You've been assigned as [Role] for [Day]'s [Event Type]" |
| Parent self-volunteers | Coach | "[Parent] volunteered as [Role] for [Day]'s game" |
| Parent cancels | Coach | "[Parent] cancelled their [Role] assignment" |
| Required role unfilled, game tomorrow | All team parents | "We still need a [Role] for tomorrow's game! Can you help?" |
| Day-before reminder | Assigned volunteers | "Reminder: You're volunteering as [Role] tomorrow at [Time]" |
| Rotation nudge (weekly, if enabled) | Suggested parent | "[Team] needs a [Role] this week — you haven't volunteered in a while. Can you help?" |

### 5B. Verify

```bash
# 1. TypeScript
npx tsc --noEmit 2>&1 | grep -v "reference\|design-reference" | tail -10

# 2. Files exist
ls -la lib/volunteers.ts hooks/useVolunteers.ts app/volunteer-settings.tsx

# 3. Config-driven (no hardcoded 'line_judge' or 'scorekeeper' in UI code)
grep -rn "'line_judge'\|'scorekeeper'" --include="*.tsx" app/ components/ | grep -v "lib/\|hooks/\|DEFAULT_VOLUNTEER" | grep -v "node_modules" | grep -v "reference/" | wc -l
# Expected: 0 (roles come from config, not hardcoded in UI)

# 4. Attendance has volunteer section
grep -n "volunteer\|Volunteer" app/attendance.tsx | head -5

# 5. Parent self-signup exists
grep -n "signUp\|Volunteer.*button\|self.*sign" components/ app/ --include="*.tsx" -r | head -5

# 6. Admin settings wired
grep -n "volunteer-settings" components/ app/ --include="*.tsx" -r | head -3

git add -A
git commit -m "Phase 5: volunteer notifications and verification"
git push
```

---

## EXPECTED RESULTS

1. **Config-driven roles** — admins define which volunteer roles their org uses (not hardcoded to Line Judge + Scorekeeper)
2. **Default config** — ships with volleyball defaults (Line Judge + Scorekeeper with primary + 3 backups)
3. **Expandable** — snack parent, stat tracker, photographer, team parent, or any custom role the admin creates
4. **Attendance screen** — dynamic volunteer section renders configured roles with assign/remove
5. **Rotation suggestions** — "+ Assign" suggests parents who have volunteered least this season
6. **Parent self-signup** — one-tap volunteer with confirmation, cancel option
7. **My Volunteer Schedule** — home scroll card reminding parents of upcoming assignments
8. **Rotation nudges** — gentle "it's been a while" prompts (not guilt trips)
9. **Admin role setup** — simple settings screen to add/edit/remove/reorder volunteer roles
10. **Event card status** — green "set" or coral "needed" for required roles
11. **Push notifications** — assignments, cancellations, reminders, unfilled alerts
12. **5 commits** — one per phase, each pushed
