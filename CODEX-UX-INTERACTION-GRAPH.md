# CODEX UX INTERACTION GRAPH

## Home And Dashboard Interactions

- `AdminHomeScroll` -> players tile -> `/(tabs)/players`
- `AdminHomeScroll` -> registration tile -> `/registration-hub`
- `AdminHomeScroll` -> season setup tile -> `/season-setup-wizard`
- `CoachHomeScroll` -> notification bell -> `/notification`
- `CoachHomeScroll` -> roster CTA -> `/roster?teamId={selectedTeamId}`
- `ParentHomeScroll` -> notification bell -> `/notification`
- `ParentHomeScroll` -> message CTA -> current message route
- `ParentHomeScroll` -> schedule -> `/(tabs)/parent-schedule`
- `ParentHomeScroll` -> family gallery -> `/family-gallery`
- `PlayerHomeScroll` -> roster -> `/roster?teamId={primaryTeam.id}`
- `PlayerHomeScroll` -> standings -> `/standings`
- `PlayerHomeScroll` -> achievements -> `/achievements`

## Parent / Family Interactions

- `components/parent-scroll/AthleteCard.tsx` -> `/child-detail?playerId={child.id}`
- `components/parent-scroll/AthleteCardV2.tsx` -> `/child-detail?playerId={child.playerId}`
- `components/parent-scroll/RegistrationCard.tsx`
  - one season -> `/register/{seasonId}`
  - many seasons -> `/registration-start`
- `components/parent-scroll/IncompleteProfileCard.tsx` -> `/complete-profile?playerId={playerId}&seasonId={workingSeason.id}`
- `components/parent-scroll/TeamHubPreview.tsx` -> `/(tabs)/parent-team-hub`
- `components/parent-scroll/MetricGrid.tsx`
  - standings -> `/standings`
  - payments -> `/family-payments`
  - achievements -> `/achievements?playerId=...`
  - chat -> `/(tabs)/parent-chat`

## Coach Interactions

- `components/coach-scroll/ActionItems.tsx`
  - evaluations -> `/evaluation-session?teamId={teamId}`
  - pending stats -> `/game-results?eventId={firstPendingEventId}` or `/game-results`
- `components/coach-scroll/ChallengeQuickCard.tsx`
  - dashboard -> `/coach-challenge-dashboard`
  - library -> `/challenge-library`
- `components/coach-scroll/GamePlanCard.tsx`
  - generic action routes
  - game day command -> `/game-day-command?eventId={id}&teamId={team_id}&opponent={...}`
- `components/coach-scroll/TeamHubPreviewCard.tsx` -> `/(tabs)/connect`

## Admin Interactions

- `components/admin-scroll/PaymentSnapshot.tsx`
  - reminders -> `/payment-reminders`
  - payment admin -> `/(tabs)/payments`
- `components/admin-scroll/CoachSection.tsx` -> `/coach-directory`
- `components/admin-scroll/TeamHealthTiles.tsx` -> `/team-roster?teamId={team.id}`
- `components/admin-scroll/UpcomingEvents.tsx` -> `/(tabs)/admin-schedule`

## Schedule / Event Interactions

- `EventDetailModal`
  - attendance -> `/attendance?eventId={event.id}`
  - RSVP and volunteer actions happen in-place

- `app/(tabs)/coach-schedule.tsx`
  - game prep -> `/game-prep-wizard?eventId={event.id}&teamId={event.team_id}`

- `app/(tabs)/gameday.tsx`
  - in-progress -> `/game-day-command?matchId={id}`
  - next event -> `/game-day-command?eventId={id}&teamId={team_id}&opponent={...}`
  - lineup builder -> `/lineup-builder`
  - game results -> `/game-results?eventId={id}`

- `app/game-prep.tsx`
  - results -> `/game-results?eventId={activeGame.id}&teamId={activeGame.team_id}`
  - lineup builder -> `/lineup-builder?eventId={game.id}&teamId={game.team_id}`

## Challenge Interactions

- `app/challenge-library.tsx`
  - template/detail -> `/challenge-detail?challengeId=...`
  - create -> `/create-challenge`

- `app/challenge-cta.tsx`
  - continue -> `/challenge-detail?challengeId={challengeId}`

- `app/coach-challenge-dashboard.tsx`
  - challenge detail -> `/challenge-detail?challengeId={challenge.id}`
  - create -> `/create-challenge`
  - library -> `/challenge-library`

## Interaction Mismatches

- `Coach ActionItems` can push `/game-results` without `eventId`
  - destination is parameter-sensitive

- `gameday` can push generic `/lineup-builder`
  - destination is more useful with `eventId` and `teamId`

- `game-day-command` has split caller contract
  - some callers pass `matchId`
  - others pass `eventId`

- `player card / athlete card` flows use different child id shapes
  - `child.id`
  - `child.playerId`

- Drawer exposes `/web-features` as if multiple real tools exist

## UX Interpretation

The interaction graph shows a pattern: many destination screens are valid only when upstream context is already correct. The app relies on caller discipline more than on route contracts.
