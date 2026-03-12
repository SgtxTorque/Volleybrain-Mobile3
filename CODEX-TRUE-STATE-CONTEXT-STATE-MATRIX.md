# CODEX TRUE-STATE CONTEXT STATE MATRIX

## Current Role

- Source of truth: `lib/permissions-context.tsx`
- Writers: drawer role pills, `components/RoleSelector.tsx`, settings dev switcher
- Readers: tabs layout, dashboard router, challenges, drawer sections
- Persistence: React state only
- Leakage risk: medium UI-coherence risk, low persistence risk
- Classification: `CONFIRMED`

## Current Organization

- Source of truth: auth context organization and permissions context organization id
- Writers: auth init
- Readers: season provider, settings, admin flows
- Leakage risk: medium if first-role org differs from intended active org
- Classification: `CONFIRMED`

## Current Season

- Source of truth: `lib/season.tsx` `workingSeason`
- Writers: provider refresh, drawer season selector
- Readers: many admin/coach/parent screens
- Persistence: AsyncStorage `vb_admin_last_season_id`
- Leakage risk: medium because many screens ignore it
- Classification: `CONFIRMED`

## Current Sport

- Source of truth: `lib/sport.tsx`
- Writers: `setActiveSport`
- Persistence: AsyncStorage `activeSportId`
- Leakage risk: medium due uneven adoption
- Classification: `CONFIRMED`

## Current Team

- Source of truth: multiple
  - `lib/team-context.tsx`
  - local `selectedTeamId` state in many screens
  - route params
  - derived first team from queries
- Persistence: AsyncStorage `vb_selected_team_id` plus local state
- Reset behavior: no explicit reset on role/season switch
- Leakage risk: high
- Classification: `CONFIRMED`

## Current Player

- Source of truth: multiple
  - dashboard child picker state
  - route params
  - derived first linked player
- Persistence: AsyncStorage `vb_player_last_child_id`
- Leakage risk: medium to high
- Classification: `CONFIRMED`

## Parent-Child Context

- Source of truth: not singular
  - `player_guardians`
  - `player_parents`
  - `players.parent_account_id`
  - `players.parent_email`
- Persistence: derived query only
- Leakage risk: high
- Classification: `CONFIRMED`

## Explicit Season Coordination Drift

- Global season: `lib/season.tsx`
- Local season state: `components/ReportViewerScreen.tsx`, report/admin filters
- Team-derived season: `app/(tabs)/connect.tsx`, `app/roster.tsx`, `components/TeamWall.tsx`
- All-open-season behavior: `app/registration-hub.tsx`, `app/parent-registration-hub.tsx`
- Coordination status: not coordinated
- Classification: `CONFIRMED`
