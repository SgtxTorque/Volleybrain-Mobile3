# CODEX TRUE-STATE DATA FLOW MATRIX

## Auth Bootstrap

- Trigger: app launch / auth state change
- Path: `app/_layout.tsx` -> `lib/auth.tsx`
- Tables: `profiles`, `user_roles`, `organizations`, `players`
- Writes: profile insert, push token save
- Drift points:
  - org is loaded from first active role only
  - orphan-player check uses `parent_email` + null `parent_account_id`
- Classification: `CONFIRMED`

## Profile Loading

- Path: `lib/auth.tsx`, `app/profile.tsx`, `app/notification-preferences.tsx`
- Tables: `profiles`, storage `media`
- Writes: profile text fields, avatar URL, profile-based notification prefs
- Classification: `PARTIALLY CONFIRMED`

## Organization Loading

- Path: `lib/auth.tsx`, `app/(tabs)/settings.tsx`
- Tables: `organizations`
- Drift point: auth org source and permissions org source can diverge
- Classification: `CONFIRMED`

## Role Switching

- Path: `lib/permissions-context.tsx`, `components/GestureDrawer.tsx`, `components/RoleSelector.tsx`, `app/(tabs)/settings.tsx`
- Persistence: React state only
- Effect: changes dashboard, tabs, drawer sections, challenge role behavior
- Drift point: no coordinated season/team reset
- Classification: `CONFIRMED`

## Season Selection

- Path: `lib/season.tsx`, `components/GestureDrawer.tsx`
- Tables: `seasons`
- Persistence: AsyncStorage `vb_admin_last_season_id`
- Drift point: many screens also use local season state or route params
- Classification: `CONFIRMED`

## Sport Selection

- Path: `lib/sport.tsx`
- Tables: `sports`
- Persistence: AsyncStorage `activeSportId`
- Classification: `CONFIRMED`

## Team Resolution

- Paths:
  - `hooks/useCoachHomeData.ts`
  - `hooks/useCoachTeam.ts`
  - `app/(tabs)/connect.tsx`
  - `app/roster.tsx`
  - `components/GestureDrawer.tsx`
- Tables: `team_staff`, `coaches`, `team_coaches`, `team_players`, `teams`
- Drift point: coach team resolution differs by screen
- Classification: `CONFIRMED`

## Parent-Child Linkage

- Paths:
  - `hooks/useParentHomeData.ts`
  - `app/(tabs)/parent-schedule.tsx`
  - `app/(tabs)/parent-team-hub.tsx`
  - `app/parent-registration-hub.tsx`
  - `app/register/[seasonId].tsx`
- Tables/columns:
  - `player_guardians.guardian_id`
  - `player_parents.parent_id`
  - `players.parent_account_id`
  - `players.parent_email`
- Classification: `CONFIRMED`

## Coach-Team Linkage

- Paths:
  - `hooks/useCoachHomeData.ts`
  - `hooks/useCoachTeam.ts`
  - `app/(tabs)/coach-team-hub.tsx`
  - `app/(tabs)/connect.tsx`
- Tables:
  - `team_staff`
  - `coaches`
  - `team_coaches`
- Drift point: some code treats `team_coaches.coach_id` as `coaches.id`, some as auth user id
- Classification: `CONFIRMED`

## Registration

- Path: `app/parent-registration-hub.tsx` -> `app/register/[seasonId].tsx`
- Tables:
  - `player_parents`
  - `families`
  - `players`
  - `registrations`
  - `waiver_signatures`
- Writes:
  - family create/update
  - player create
  - registration create
  - waiver signatures create
  - `player_parents` upsert
- Drift point: parent screens mainly read different linkage tables/columns
- Classification: `CONFIRMED`

## Team Creation / Editing

- Paths:
  - `app/team-management.tsx`
  - `app/(tabs)/teams.tsx`
- Tables: `teams`, `team_players`, `team_coaches`, `chat_channels`, `channel_members`
- Drift point: duplicate implementations
- Classification: `CONFIRMED`

## Evaluations

- Paths:
  - `lib/evaluations.ts`
  - `app/player-evaluation.tsx`
  - `app/player-evaluations.tsx`
  - `app/evaluation-session.tsx`
- Tables: `player_skill_ratings`, `player_evaluations`, `player_skills`
- Classification: `CONFIRMED`

## Team Hub Feed

- Paths:
  - `components/TeamWall.tsx`
  - `components/team-hub/TeamHubScreen.tsx`
  - `components/TeamPulse.tsx`
- Tables: `team_posts`, `team_post_comments`, `team_post_reactions`, `teams`, `schedule_events`
- Classification: `CONFIRMED`

## Schedule / Game Day

- Paths:
  - `app/(tabs)/schedule.tsx`
  - `app/(tabs)/coach-schedule.tsx`
  - `app/(tabs)/parent-schedule.tsx`
  - `app/game-prep.tsx`
  - `app/game-prep-wizard.tsx`
  - `app/game-day-command.tsx`
- Tables: `schedule_events`, `event_rsvps`, `event_volunteers`, `team_players`, `venues`
- Drift point: several overlapping schedule surfaces with different assumptions
- Classification: `CONFIRMED`

## Stats / Recap

- Paths:
  - `app/game-results.tsx`
  - `app/game-recap.tsx`
  - `app/my-stats.tsx`
  - `lib/gameday/use-match.ts`
- Tables: `game_player_stats`, `player_season_stats`, `schedule_events`
- Classification: `PARTIALLY CONFIRMED`

## Payments

- Paths:
  - `app/(tabs)/payments.tsx`
  - `components/payments-parent.tsx`
  - `app/registration-hub.tsx`
  - `app/payment-reminders.tsx`
- Tables: `payments`, `payment_installments`, `season_fees`
- Drift point: `payments.status` and boolean `payments.paid` both used
- Classification: `CONFIRMED`

## Notifications

- Paths:
  - `lib/notifications.ts`
  - `app/notification.tsx`
  - `app/_layout.tsx`
- Tables: `notifications`, `volunteer_blasts`, `event_rsvps`, `event_volunteers`, `player_guardians`, `team_players`
- Drift point: producer and inbox UI type handling do not match
- Classification: `CONFIRMED`

## Media Upload

- Paths:
  - `app/profile.tsx`
  - `components/TeamWall.tsx`
  - `components/team-hub/HeroBanner.tsx`
- Storage buckets: `media`, `photos`
- Drift point: bucket naming and media path conventions are not unified
- Classification: `CONFIRMED`
