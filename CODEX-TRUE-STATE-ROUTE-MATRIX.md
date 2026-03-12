# CODEX TRUE-STATE ROUTE MATRIX

Legend:

- Classification: `CONFIRMED`, `PARTIALLY CONFIRMED`, `NOT CONFIRMED`, `NEW FINDING`
- `UNVERIFIED` means behavior depends on unseen backend state or runtime data

## Root And Layout Routes

- `/_layout` — `app/_layout.tsx`
  - Purpose: provider shell, auth redirect orchestration, notification tap router
  - Actual behavior: redirects unauthenticated users to `/(auth)/welcome`, pending users to `/(auth)/pending-approval`, orphan-account users to `/claim-account`, else onboarding route or `/(tabs)`
  - Classification: `CONFIRMED`

- `/(tabs)/_layout` — `app/(tabs)/_layout.tsx`
  - Purpose: role-driven tab shell
  - Actual behavior: exposes `index`, then one of `manage`/`gameday`/`parent-schedule`, always `chats`, many hidden tabs via `href: null`
  - Notes: unread count is computed client-side per channel membership
  - Classification: `CONFIRMED`

## Auth Routes

- `/(auth)/welcome` — `app/(auth)/welcome.tsx` — unauthenticated landing — `CONFIRMED`
- `/(auth)/login` — `app/(auth)/login.tsx` — password login — `CONFIRMED`
- `/(auth)/signup` — `app/(auth)/signup.tsx`
  - Reads/Writes: `invitations`, `team_invite_codes`, `organizations`, `user_roles`, `profiles`, `organization_sports`
  - Classification: `CONFIRMED`
- `/(auth)/redeem-code` — `app/(auth)/redeem-code.tsx`
  - Param: `code` optional
  - Reads: `invitations`, `team_invite_codes`
  - Classification: `CONFIRMED`
- `/(auth)/pending-approval` — `app/(auth)/pending-approval.tsx` — pending hold screen — `CONFIRMED`

## Primary Tab Routes

- `/(tabs)/index` — `app/(tabs)/index.tsx`
  - Actual behavior: renders `components/DashboardRouter.tsx`
  - Classification: `CONFIRMED`

- `/(tabs)/manage` — `app/(tabs)/manage.tsx`
  - Purpose: admin launcher
  - Classification: `PARTIALLY CONFIRMED`

- `/(tabs)/gameday` — `app/(tabs)/gameday.tsx`
  - Purpose: game-day hub
  - Notes: some CTAs push generic routes without required params
  - Classification: `PARTIALLY CONFIRMED`

- `/(tabs)/parent-schedule` — `app/(tabs)/parent-schedule.tsx`
  - Reads: `player_guardians`, `players.parent_account_id`, `players.parent_email`, `team_players`, `schedule_events`, `event_rsvps`
  - Writes: RSVP updates/inserts
  - Classification: `CONFIRMED`

- `/(tabs)/chats` — `app/(tabs)/chats.tsx`
  - Purpose: chat list
  - Destination: `/chat/[id]`
  - Classification: `CONFIRMED`

## Hidden Tab / Team / Chat / Profile Routes

- `/(tabs)/connect` — `app/(tabs)/connect.tsx`
  - Purpose: shared team hub resolver
  - Notes: role-to-team resolution differs from other screens
  - Classification: `CONFIRMED`

- `/(tabs)/coach-team-hub` — `app/(tabs)/coach-team-hub.tsx` — coach team selector — `CONFIRMED`
- `/(tabs)/parent-team-hub` — `app/(tabs)/parent-team-hub.tsx` — parent team selector — `CONFIRMED`
- `/(tabs)/coach-schedule` — `app/(tabs)/coach-schedule.tsx` — coach schedule with event creation — `CONFIRMED`
- `/(tabs)/schedule` — `app/(tabs)/schedule.tsx`
  - Purpose: broader schedule screen
  - Notes: `isCoachOrAdmin` includes parents
  - Classification: `NEW FINDING`
- `/(tabs)/coach-chat` — `app/(tabs)/coach-chat.tsx` — coach chat list — `CONFIRMED`
- `/(tabs)/parent-chat` — `app/(tabs)/parent-chat.tsx` — parent chat list — `CONFIRMED`
- `/(tabs)/messages` — `app/(tabs)/messages.tsx` — announcements/blasts — `CONFIRMED`
- `/(tabs)/payments` — `app/(tabs)/payments.tsx` — admin payment management — `CONFIRMED`
- `/(tabs)/players` — `app/(tabs)/players.tsx` — player admin list — `CONFIRMED`
- `/(tabs)/teams` — `app/(tabs)/teams.tsx`
  - Purpose: team management implementation #2
  - Classification: `CONFIRMED`
- `/(tabs)/coaches` — `app/(tabs)/coaches.tsx` — coach assignment UI — `CONFIRMED`
- `/(tabs)/reports-tab` — `app/(tabs)/reports-tab.tsx` — reports launcher — `CONFIRMED`
- `/(tabs)/settings` — `app/(tabs)/settings.tsx`
  - Purpose: settings, theme, dev role switcher, lightweight role admin
  - Classification: `CONFIRMED`
- `/(tabs)/my-teams` — `app/(tabs)/my-teams.tsx` — team list — `CONFIRMED`
- `/(tabs)/me` — `app/(tabs)/me.tsx` — player customization — `CONFIRMED`
- `/(tabs)/jersey-management` — `app/(tabs)/jersey-management.tsx` — jersey numbers — `CONFIRMED`
- `/(tabs)/admin-teams` — `app/(tabs)/admin-teams.tsx` — admin team dashboard — `CONFIRMED`
- `/(tabs)/admin-schedule` — `app/(tabs)/admin-schedule.tsx` — admin schedule variant — `UNVERIFIED`
- `/(tabs)/admin-chat` — `app/(tabs)/admin-chat.tsx` — admin chat variant — `UNVERIFIED`
- `/(tabs)/admin-my-stuff` — `app/(tabs)/admin-my-stuff.tsx` — admin utility launcher — `CONFIRMED`
- `/(tabs)/coach-my-stuff` — `app/(tabs)/coach-my-stuff.tsx` — coach utility launcher — `CONFIRMED`
- `/(tabs)/parent-my-stuff` — `app/(tabs)/parent-my-stuff.tsx` — parent utility launcher — `CONFIRMED`
- `/(tabs)/menu-placeholder` — `app/(tabs)/menu-placeholder.tsx` — drawer tab placeholder — `CONFIRMED`

## Registration / Onboarding / Account Linking Routes

- `/claim-account` — `app/claim-account.tsx` — orphan player claim flow — `CONFIRMED`
- `/parent-registration-hub` — `app/parent-registration-hub.tsx`
  - Writes: `user_roles`, `invitations`, `team_invite_codes`
  - Note: uses `invitations.invite_code`
  - Classification: `CONFIRMED`
- `/registration-start` — `app/registration-start.tsx` — season chooser — `CONFIRMED`
- `/register/[seasonId]` — `app/register/[seasonId].tsx`
  - Param: `seasonId`
  - Writes: `families`, `players`, `registrations`, `waiver_signatures`, `player_parents`
  - Classification: `CONFIRMED`
- `/complete-profile` — `app/complete-profile.tsx`
  - Params: `playerId`, `seasonId`
  - Writes: `players`
  - Note: `birth_date -> date_of_birth` mapping
  - Classification: `CONFIRMED`

## Registration Admin Routes

- `/registration-hub` — `app/registration-hub.tsx`
  - Purpose: admin registration processing
  - Note: mixes real registrations with synthetic `player-*` entries
  - Classification: `NEW FINDING`

- `/users` — `app/users.tsx`
  - Purpose: admin user management
  - Note: all-profile fetch, then org-role merge
  - Classification: `CONFIRMED`

## Team / Roster / Player Routes

- `/team-management` — `app/team-management.tsx` — team management implementation #1 — `CONFIRMED`
- `/roster` — `app/roster.tsx` — shared roster viewer — `CONFIRMED`
- `/team-roster` — `app/team-roster.tsx` — team roster by explicit team — `CONFIRMED`
- `/player-card` — `app/player-card.tsx` — player card/profile — `CONFIRMED`
- `/child-detail` — `app/child-detail.tsx` — child detail — `CONFIRMED`
- `/my-kids` — `app/my-kids.tsx` — family child summary — `CONFIRMED`
- `/my-stats` — `app/my-stats.tsx` — player stats — `CONFIRMED`
- `/season-progress` — `app/season-progress.tsx` — season progress — `CONFIRMED`
- `/player-goals` — `app/player-goals.tsx` — player goals and notes — `CONFIRMED`
- `/coach-profile` — `app/coach-profile.tsx` — coach profile — `CONFIRMED`
- `/coach-directory` — `app/coach-directory.tsx` — coach directory/assignment — `CONFIRMED`

## Schedule / Game Day / Evaluations Routes

- `/attendance` — `app/attendance.tsx` — attendance entry — `PARTIALLY CONFIRMED`
- `/game-prep` — `app/game-prep.tsx` — game prep list/workflow — `CONFIRMED`
- `/game-prep-wizard` — `app/game-prep-wizard.tsx` — event-specific prep wizard — `CONFIRMED`
- `/game-day-command` — `app/game-day-command.tsx`
  - Params used by callers: `eventId` and `matchId`
  - Classification: `NEW FINDING`
- `/game-results` — `app/game-results.tsx` — game results — `PARTIALLY CONFIRMED`
- `/game-recap` — `app/game-recap.tsx` — recap screen — `PARTIALLY CONFIRMED`
- `/lineup-builder` — `app/lineup-builder.tsx` — lineup builder — `CONFIRMED`
- `/evaluation-session` — `app/evaluation-session.tsx` — evaluation flow entry — `CONFIRMED`
- `/player-evaluation` — `app/player-evaluation.tsx` — single-player evaluation — `CONFIRMED`
- `/player-evaluations` — `app/player-evaluations.tsx` — team evaluation entry — `CONFIRMED`

## Team Hub / Community / Media Routes

- `/team-wall` — `app/team-wall.tsx` — wrapper around team wall/feed — `CONFIRMED`
- `/team-gallery` — `app/team-gallery.tsx` — team gallery — `CONFIRMED`
- `/family-gallery` — `app/family-gallery.tsx` — family gallery — `CONFIRMED`
- `/challenges` — `app/challenges.tsx` — role-sensitive challenge list — `CONFIRMED`
- `/challenge-detail` — `app/challenge-detail.tsx` — challenge detail — `CONFIRMED`
- `/challenge-cta` — `app/challenge-cta.tsx` — challenge CTA/landing — `CONFIRMED`
- `/create-challenge` — `app/create-challenge.tsx` — create challenge — `CONFIRMED`
- `/challenge-library` — `app/challenge-library.tsx` — challenge library — `CONFIRMED`
- `/challenge-celebration` — `app/challenge-celebration.tsx` — completion celebration — `CONFIRMED`
- `/coach-challenge-dashboard` — `app/coach-challenge-dashboard.tsx` — coach challenge dashboard — `CONFIRMED`
- `/achievements` — `app/achievements.tsx` — achievements — `CONFIRMED`
- `/standings` — `app/standings.tsx` — standings/leaderboard — `CONFIRMED`

## Payments / Notifications / Admin Utility Routes

- `/family-payments` — `app/family-payments.tsx`
  - Wrapper around `components/payments-parent.tsx`
  - Classification: `NEW FINDING`
- `/payment-reminders` — `app/payment-reminders.tsx` — reminders — `CONFIRMED`
- `/notification` — `app/notification.tsx` — notifications inbox — `CONFIRMED`
- `/notification-preferences` — `app/notification-preferences.tsx` — notification settings — `CONFIRMED`
- `/admin-search` — `app/admin-search.tsx` — admin search — `CONFIRMED`
- `/season-settings` — `app/season-settings.tsx` — season configuration — `CONFIRMED`
- `/season-setup-wizard` — `app/season-setup-wizard.tsx` — season setup wizard — `CONFIRMED`
- `/season-reports` — `app/season-reports.tsx` — season KPI dashboard — `CONFIRMED`
- `/season-archives` — `app/season-archives.tsx` — season archive summary — `CONFIRMED`
- `/org-settings` — `app/org-settings.tsx` — org settings — `CONFIRMED`
- `/org-directory` — `app/org-directory.tsx` — org directory — `CONFIRMED`
- `/report-viewer` — `app/report-viewer.tsx` — report wrapper — `CONFIRMED`
- `/web-features` — `app/web-features.tsx` — generic placeholder/dead-end — `CONFIRMED`

## Chat Dynamic Routes

- `/chat/[id]` — `app/chat/[id].tsx`
  - Param: `id`
  - Purpose: DM/channel conversation
  - Classification: `CONFIRMED`

## Static / Low-Logic Routes

- `/help` — `app/help.tsx` — `CONFIRMED`
- `/privacy-policy` — `app/privacy-policy.tsx` — `CONFIRMED`
- `/terms-of-service` — `app/terms-of-service.tsx` — `CONFIRMED`
- `/data-rights` — `app/data-rights.tsx` — `CONFIRMED`
- `/invite-friends` — `app/invite-friends.tsx` — `CONFIRMED`
- `/my-waivers` — `app/my-waivers.tsx` — `CONFIRMED`
- `/blast-composer` — `app/blast-composer.tsx` — `CONFIRMED`
- `/blast-history` — `app/blast-history.tsx` — `CONFIRMED`
- `/bulk-event-create` — `app/bulk-event-create.tsx` — `CONFIRMED`
- `/coach-availability` — `app/coach-availability.tsx` — `CONFIRMED`
- `/coach-background-checks` — `app/coach-background-checks.tsx` — `CONFIRMED`
- `/venue-manager` — `app/venue-manager.tsx` — `CONFIRMED`
- `/volunteer-assignment` — `app/volunteer-assignment.tsx` — `CONFIRMED`
