# CODEX UX CONTEXT DEPENDENCIES

## Team Context Sources

- Route params:
  - `/roster?teamId=`
  - `/team-roster?teamId=`
  - `/team-gallery?teamId=`
  - `/team-wall?teamId=`
  - `/game-prep-wizard?teamId=`
  - `/lineup-builder?teamId=`
  - `/game-day-command?teamId=`

- Local state:
  - `app/(tabs)/connect.tsx`
  - `app/(tabs)/coach-team-hub.tsx`
  - `app/(tabs)/schedule.tsx`
  - `app/(tabs)/coach-schedule.tsx`
  - `app/team-management.tsx`
  - `app/(tabs)/teams.tsx`

- Context:
  - `lib/team-context.tsx` used in connect/team wall flows

- AsyncStorage:
  - `vb_selected_team_id` via `lib/team-context.tsx`

- UX inconsistency:
  - high

## Season Context Sources

- Context:
  - `lib/season.tsx`

- AsyncStorage:
  - `vb_admin_last_season_id`

- Local state:
  - report filters
  - registration hub season filters

- Route params:
  - `/register/[seasonId]`
  - `/complete-profile?seasonId=`

- Team-derived season:
  - connect, team wall, roster, reports

- UX inconsistency:
  - high

## Sport Context Sources

- Context:
  - `lib/sport.tsx`

- AsyncStorage:
  - `activeSportId`

- Derived query:
  - seasons filtered by active sport
  - other screens query sport directly or from season/team joins

- UX inconsistency:
  - medium

## Player Context Sources

- Route params:
  - `/child-detail?playerId=`
  - `/player-card?playerId=`
  - `/my-stats?playerId=`
  - `/player-goals?playerId=`
  - `/season-progress?playerId=`

- Local state:
  - child selection in `DashboardRouter`
  - active child in registration wizard

- AsyncStorage:
  - `vb_player_last_child_id`

- Derived query:
  - from `player_guardians`
  - from `players.parent_account_id`
  - from `players.parent_email`
  - from `player_parents`

- UX inconsistency:
  - very high

## Role Context Sources

- Context:
  - `lib/permissions-context.tsx`

- Local state:
  - `viewAs`

- Derived query:
  - auto-add parent/coach/player roles from tables

- UX inconsistency:
  - medium to high because role can change while other context stays stale

## Screens With Mixed Context Acquisition

- `app/(tabs)/connect.tsx`
  - team from role-specific query paths plus stored team context

- `app/roster.tsx`
  - team from route param, coach linkage, parent linkage, or derived team list

- `components/TeamWall.tsx`
  - team from context and local fetches

- `components/DashboardRouter.tsx`
  - role from permissions context, player from DB heuristics, selected child from AsyncStorage

- `hooks/useParentHomeData.ts`
  - child/team from three parent-link methods, season from context, XP from achievement engine

## UX Conclusion

The product does not have a single context system. It has several overlapping context systems. That is the main reason the code implies a fragile UX even when individual screens are implemented.
