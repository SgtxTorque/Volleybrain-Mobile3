# TRUE-STATE-CONTEXT-STATE-MATRIX.md
## Lynx Mobile — Context & State Ownership Audit
### Audit Date: 2026-03-11

---

## State Concepts Map

### 1. Current Role

| Property | Value |
|----------|-------|
| **Where it lives** | React Context (`PermissionsProvider`) |
| **Provider file** | `lib/permissions-context.tsx` |
| **Who writes** | `loadPermissions()` on mount and when user/org changes |
| **Who reads** | Every screen via `usePermissions()` — `isAdmin`, `isCoach`, `isParent`, `isPlayer`, `viewAs` |
| **Persistence** | None — recomputed on each app launch from DB |
| **Reset behavior** | Cleared on logout (AuthProvider resets → PermissionsProvider recomputes) |
| **Cross-role leakage** | `viewAs` override persists in memory until explicitly changed. No AsyncStorage persistence — safe across restarts |

**Additional source:** `lib/auth.tsx` also sets `isAdmin` (line 233) from `user_roles`. This is separate from `usePermissions()` which auto-detects from tables.

### 2. Organization

| Property | Value |
|----------|-------|
| **Where it lives** | React Context (`AuthProvider`) |
| **Provider file** | `lib/auth.tsx` |
| **Who writes** | `init()` during auth bootstrap (line 238-243) |
| **Who reads** | Screens via `useAuth()` → `organization` |
| **Persistence** | None — loaded from DB on each session |
| **Reset behavior** | Set to `null` on logout |
| **Cross-role leakage** | N/A — organization is role-independent |

**FINDING:** Organization is derived from `first role's organization_id` (line 236). If a user has roles in multiple organizations, only the first is loaded.

### 3. Season (workingSeason)

| Property | Value |
|----------|-------|
| **Where it lives** | React Context (`SeasonProvider`) + AsyncStorage |
| **Provider file** | `lib/season.tsx` |
| **Who writes** | `refreshSeasons()` on sport/org change; `setWorkingSeason()` on user selection |
| **Who reads** | Every data-fetching screen via `useSeason()` → `workingSeason` |
| **AsyncStorage key** | `vb_admin_last_season_id` |
| **Reset behavior** | AsyncStorage NOT cleared on logout — **LEAKAGE RISK** |
| **Cross-role leakage** | If admin selects Season A, then switches to coach view, Season A persists. Coach may see admin-selected season |

**Consumers reading workingSeason:**
- `hooks/useCoachTeam.ts` — team resolution filtered by season
- `hooks/useCoachHomeData.ts` — events, standings
- `hooks/useAdminHomeData.ts` — teams, registrations
- `hooks/useParentHomeData.ts` — events
- `hooks/usePlayerHomeData.ts` — stats
- `app/(tabs)/gameday.tsx` — events
- `app/(tabs)/schedule.tsx` — events
- All admin screens — teams, registrations, payments

### 4. Sport (activeSport)

| Property | Value |
|----------|-------|
| **Where it lives** | React Context (`SportProvider`) |
| **Provider file** | `lib/sport.tsx` |
| **Who writes** | Provider on mount — loads from `organization_sports` |
| **Who reads** | `useSport()` → `activeSport`; `SeasonProvider` uses it to filter seasons |
| **Persistence** | UNVERIFIED — may use AsyncStorage |
| **Reset behavior** | UNVERIFIED |
| **Cross-role leakage** | Low risk — sport is org-level, not role-specific |

### 5. Team (selectedTeamId)

| Property | Value |
|----------|-------|
| **Where it lives** | Multiple locations (DRIFT) |
| **Sources** | |

| Source | File | Storage | Scope |
|--------|------|---------|-------|
| `useCoachTeam()` | `hooks/useCoachTeam.ts` | React state (derived) | Coach screens |
| `useTeamContext()` | `lib/team-context.tsx` | AsyncStorage (`vb_selected_team_id`) | Parent filtering |
| `useCoachHomeData()` | `hooks/useCoachHomeData.ts` | React state (derived) | Coach dashboard |
| `useAdminHomeData()` | `hooks/useAdminHomeData.ts` | React state (derived) | Admin dashboard |
| Route params | `teamId` query param | Navigation params | Per-screen |

**DRIFT RISK:** Five different ways to determine "current team". No single source of truth. `vb_selected_team_id` in AsyncStorage persists across sessions and role switches.

### 6. Player (current player)

| Property | Value |
|----------|-------|
| **Where it lives** | Derived from context/params |
| **For player role** | `players.parent_account_id = user.id` — auto-resolved |
| **For parent role** | `useParentHomeData` → resolves children list → selected child |
| **Child selection** | AsyncStorage (`vb_player_last_child_id`) persists selection |
| **Reset behavior** | AsyncStorage NOT cleared on logout |

**File:** `components/DashboardRouter.tsx:17` — `const LAST_CHILD_KEY = 'vb_player_last_child_id'`

### 7. Parent-Child Context

| Property | Value |
|----------|-------|
| **Where it lives** | Derived per-screen from DB queries |
| **No dedicated context** | Each screen independently queries parent-child links |
| **Resolution** | 3-method merge (guardians + account_id + email) |
| **Persistence** | None (re-queried each time) |
| **Risk** | Performance — each parent screen runs 3 queries |

---

## AsyncStorage Keys Inventory

| Key | File | Purpose | Cleared on Logout? |
|-----|------|---------|-------------------|
| `vb_admin_last_season_id` | `lib/season.tsx` | Last selected season | **NO** |
| `vb_selected_team_id` | `lib/team-context.tsx` | Last selected team (parent) | **NO** |
| `vb_player_last_child_id` | `components/DashboardRouter.tsx` | Last selected child | **NO** |
| `lynx_daily_achievement_check` | `app/(tabs)/_layout.tsx` | Daily achievement throttle | **NO** |
| `vb_first_time_welcome_shown` | `lib/first-time-welcome.ts` (UNVERIFIED) | First-time tour flag | **NO** |

**FINDING:** None of the AsyncStorage keys are cleared on logout. This means:
1. A different user logging in on the same device may see stale season/team/child selections
2. Role switching doesn't reset team/child context

---

## Context Provider Hierarchy

```
AuthProvider
  └─ ThemeProvider
    └─ SportProvider
      └─ SeasonProvider
        └─ PermissionsProvider
          └─ ParentScrollProvider
            └─ DrawerProvider
              └─ TabLayout
```

**File:** `app/_layout.tsx` — provider nesting order

**Dependency chain:**
- `SeasonProvider` depends on `SportProvider.activeSport` + `AuthProvider.organization`
- `PermissionsProvider` depends on `AuthProvider.user` + `AuthProvider.profile`
- All screens depend on `AuthProvider` + `SeasonProvider` + `PermissionsProvider`

---

## Screens Using Different Season Sources

| Screen | Season Source | File |
|--------|-------------|------|
| Most screens | `useSeason().workingSeason` (global context) | various |
| Registration | `useLocalSearchParams().seasonId` (route param) | `register/[seasonId].tsx` |
| Admin My Stuff | `useSeason().allSeasons` + local state | `admin-my-stuff.tsx` |
| Season Settings | `useSeason().workingSeason` | `season-settings.tsx` |

**No critical drift found** — most screens consistently use `workingSeason` from context.

---

## Cross-Role Leakage Risks

| Risk | Severity | Evidence |
|------|----------|----------|
| Season persists across role switch | P2 | `vb_admin_last_season_id` not cleared |
| Team persists across role switch | P2 | `vb_selected_team_id` not cleared |
| Child persists across logout | P2 | `vb_player_last_child_id` not cleared |
| Achievement throttle persists | P3 | `lynx_daily_achievement_check` — minor, just delays achievement check |
| `viewAs` role doesn't affect data queries | P2 | Role preview is visual only; queries use real permissions |
