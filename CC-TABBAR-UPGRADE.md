# CC-TABBAR-UPGRADE.md
## Lynx Mobile — Role-Aware Tab Bar + Admin Command Center
### For Claude Code Execution

**Prerequisite:** Read `CC-LYNX-RULES.md` in the project root. All 15 rules apply.

---

## CONTEXT

The gesture navigation drawer is complete (7 phases, all committed). The bottom tab bar currently shows the same 4 tabs for all roles. We're now upgrading it to be role-aware, and rebuilding the Manage tab into a live admin operations dashboard.

---

## PHASE 1: ROLE-AWARE TAB BAR

**Goal:** The 2nd tab slot changes based on the user's role.

### Before (all roles):
```
Home  |  Game Day  |  Chat  |  More (☰)
```

### After (per role):
```
Admin:    Home  |  Manage    |  Chat  |  More (☰)
Coach:    Home  |  Game Day  |  Chat  |  More (☰)
Parent:   Home  |  Schedule  |  Chat  |  More (☰)
Player:   Home  |  Game Day  |  Chat  |  More (☰)
```

### File to modify: `app/(tabs)/_layout.tsx`

### Implementation:
1. Import `usePermissions` (if not already imported)
2. Get `isAdmin, isCoach, isParent, isPlayer` from the hook
3. Determine the 2nd tab slot based on priority: **Admin > Coach > Parent > Player**
   - If `isAdmin` → show Manage tab (icon: `construct` / `construct-outline`, title: "Manage", route: `manage`)
   - Else if `isCoach` → show Game Day tab (icon: `flash` / `flash-outline`, title: "Game Day", route: `gameday`)
   - Else if `isParent` → show Schedule tab (icon: `calendar` / `calendar-outline`, title: "Schedule", route: `gameday`) — same underlying screen, different label
   - Else (Player) → show Game Day tab (icon: `flash` / `flash-outline`, title: "Game Day", route: `gameday`)
4. The tabs that are NOT in the 2nd slot must be available as hidden routes (`href: null`) so drawer navigation still works
5. Tab 1 is always Home. Tab 3 is always Chat (with unread badge). Tab 4 is always More (opens drawer).
6. Make sure `manage`, `gameday`, `connect`, and `me` all exist as hidden tab screens when not in the visible bar

### Multi-role handling:
A user who is Admin+Coach+Parent sees the **Admin** tab bar (Manage). They can access Game Day and Schedule through the drawer. The priority chain is strict: Admin > Coach > Parent > Player.

### Commit:
```bash
git add .
git commit -m "feat: Role-aware tab bar - Admin(Manage), Coach(Game Day), Parent(Schedule), Player(Game Day)"
git push origin main
```

---

## PHASE 2: ADMIN COMMAND CENTER — Rebuild `manage.tsx`

**Goal:** Transform `app/(tabs)/manage.tsx` from a menu list into a live operations dashboard. This is NOT a navigation menu — it's a situation room showing what needs the admin's attention RIGHT NOW.

### File to modify: `app/(tabs)/manage.tsx` (full rewrite)

### Layout:

```
┌─────────────────────────────────────────────────┐
│  COMMAND CENTER                       Spring '26 │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────┐  ┌──────────────────┐     │
│  │  🔴  5           │  │  🟡  3           │     │
│  │  Pending         │  │  Unpaid          │     │
│  │  Registrations   │  │  Balances        │     │
│  │           [→]    │  │           [→]    │     │
│  └──────────────────┘  └──────────────────┘     │
│  ┌──────────────────┐  ┌──────────────────┐     │
│  │  🔵  2           │  │  ✅  0           │     │
│  │  Unrostered      │  │  Pending         │     │
│  │  Players         │  │  Approvals       │     │
│  │           [→]    │  │           ✓      │     │
│  └──────────────────┘  └──────────────────┘     │
│                                                  │
├─────────────────────────────────────────────────┤
│  ⚡ QUICK ACTIONS                                │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │Approve │ │ Send   │ │ View   │ │Manage  │   │
│  │  Regs  │ │ Blast  │ │Payments│ │ Roster │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
├─────────────────────────────────────────────────┤
│  📊 ORG SNAPSHOT                                 │
│  42 Players · 6 Teams · 4 Coaches               │
│  Revenue: $12,400 collected                      │
│  Season: 85% registration complete               │
├─────────────────────────────────────────────────┤
│  📋 RECENT ACTIVITY                              │
│  • Jane Smith registered Sofia (2 hrs ago)       │
│  • Payment received: $150 from Rodriguez (today) │
│  • Coach Mike updated 13U roster (yesterday)     │
│  [View All Activity →]                           │
└─────────────────────────────────────────────────┘
```

### Section 1: Attention Cards (2x2 grid)

Four tappable metric cards in a 2-column grid. Each card shows:
- Status color indicator (red = needs action, yellow = warning, green = good, blue = info)
- Large count number (bold, 28-32px)
- Label text (what it counts)
- Tappable → navigates to the relevant screen

| Card | Query | Route on Tap | Color Logic |
|------|-------|-------------|-------------|
| Pending Registrations | `registrations` where `status = 'new'` for active season | `/registration-hub` | Red if > 0, green if 0 |
| Unpaid Balances | `payment_items` where `status != 'paid'` for active season | `/(tabs)/payments` | Yellow if > 0, green if 0 |
| Unrostered Players | `registrations` where `status = 'active'` and not assigned to team | `/team-management` | Blue if > 0, green if 0 |
| Pending Approvals | Profiles/user_roles with pending status | `/users` | Red if > 0, green (✓) if 0 |

**CRITICAL:** Verify ALL table names and column names against `SCHEMA_REFERENCE.csv` before writing queries. If a column doesn't exist, flag it — do NOT guess.

### Section 2: Quick Actions (horizontal row)

4 action buttons in a scrollable horizontal row. Each button: icon + label, tappable.

| Action | Icon | Route |
|--------|------|-------|
| Approve Regs | person-add | /registration-hub |
| Send Blast | megaphone | /blast-composer |
| View Payments | card | /(tabs)/payments |
| Manage Roster | people | /team-management |

Style: Rounded rectangle buttons with accent-tinted background. Match the existing Quick Actions pattern from the Coach dashboard (read `CoachDashboard` or the coach home screen to match the style).

### Section 3: Org Snapshot

A single card showing organizational health at a glance:
- Total players (count from `players` table for active season)
- Total teams (count from `teams` table for active season)
- Total coaches (count from `coaches` table for active season)
- Revenue collected (sum of paid `payment_items` for active season, formatted as currency)
- Registration completion % (approved registrations / total registrations for active season)

Use the active season from `useSeason()` hook. Display as a clean stat row or mini card grid.

### Section 4: Recent Activity Feed

Show the 5-10 most recent actions across the organization:
- New registrations (with player name, time ago)
- Payments received (with amount, family name, time ago)
- Roster changes (player added/moved, time ago)
- New user approvals (name, role, time ago)

Query from relevant tables ordered by `created_at DESC` with LIMIT 10. Each row shows: icon, description text, relative timestamp.

Tap "View All Activity →" navigates to `/(tabs)/reports-tab`.

### Section 5: Pull-to-Refresh

Wrap everything in a `ScrollView` with `RefreshControl`. On pull-down, refetch all counts and activity.

### Visual Style:
- Match the app's existing card style (use design tokens from `lib/design-tokens.ts`)
- Attention cards: subtle left border with the status color (4px, rounded)
- Zero-state cards show a green checkmark icon instead of a count
- Respect dark/light mode using `useTheme()`
- Header shows "Command Center" title with active season name from `useSeason()`

### Commit:
```bash
git add .
git commit -m "feat: Admin Command Center - live attention cards, quick actions, org snapshot, activity feed"
git push origin main
```

---

## PHASE 3: TESTING & VERIFICATION

### Tasks:
1. Run `npx tsc --noEmit` — fix any new errors
2. Test as **Admin** — verify Manage tab shows in tab bar, tapping it opens the Command Center, all 4 attention cards show real counts, quick actions navigate correctly, org snapshot shows real data
3. Test as **Coach** — verify Game Day tab shows (not Manage), Manage is NOT visible in tab bar, drawer still has all coaching tools
4. Test as **Parent** — verify Schedule tab shows (not Game Day or Manage), Schedule label appears but taps to the same gameday screen
5. Test as **Player** — verify Game Day tab shows, no Manage tab visible
6. Test as **Multi-role (Admin+Coach+Parent)** — verify Manage tab shows (admin priority wins), all drawer sections still work, Game Day accessible from drawer
7. Verify all drawer navigation still works — items routing to `/(tabs)/manage`, `/(tabs)/gameday`, `/(tabs)/connect` should still function even when those tabs are hidden

### Commit:
```bash
git add .
git commit -m "feat: Tab bar + Command Center Phase 3 - stability testing, role verification"
git push origin main
```
