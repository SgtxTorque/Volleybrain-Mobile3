# CODEX UX NAVIGATION GRAPH

## Global Shell

- App launch -> `app/_layout.tsx`
  - unauthenticated -> `/(auth)/welcome`
  - session + pending approval -> `/(auth)/pending-approval`
  - session + orphan records -> `/claim-account`
  - session + onboarding needed -> onboarding route or `/(tabs)`
  - session + ready -> `/(tabs)`

## Primary Route Hubs

- `/(tabs)/index`
  - renders `DashboardRouter`
  - destination home varies by role:
    - admin -> `AdminHomeScroll`
    - coach -> `CoachHomeScroll`
    - parent -> `ParentHomeScroll`
    - player -> child picker or `PlayerHomeScroll`

- `/(tabs)/manage`
  - admin launchpad
  - pushes:
    - `/registration-hub`
    - `/users`
    - `/(tabs)/payments`
    - `/payment-reminders`
    - `/team-management`
    - `/coach-directory`
    - `/season-settings`
    - `/season-setup-wizard`
    - `/(tabs)/reports-tab`

- `/(tabs)/gameday`
  - pushes:
    - `/game-day-command`
    - `/lineup-builder`
    - `/game-results`
    - `/game-prep-wizard`
    - `/standings`
    - `/season-archives`

- Drawer (`components/GestureDrawer.tsx`)
  - central secondary navigation graph
  - key destinations:
    - home, schedule, chats, announcements, team wall
    - admin tools
    - coach tools
    - family tools
    - player tools
    - settings/privacy/help
    - `/web-features` placeholders

## Parameter-Dependent Screens

- `/chat/[id]`
  - requires `id`
  - safe because major callers provide it

- `/register/[seasonId]`
  - requires `seasonId`
  - entry points:
    - `parent-registration-hub`
    - `registration-start`

- `/challenge-detail`
  - requires `challengeId`
  - entry points:
    - `/challenge-cta`
    - coach challenge dashboard
    - challenge library

- `/challenge-cta`
  - requires `challengeId`
  - entry points:
    - notifications
    - player challenge cards
    - TeamWall challenge CTAs

- `/child-detail`
  - requires `playerId`
  - entry points:
    - parent cards
    - team wall roster taps
    - family gallery

- `/player-goals`
  - requires `playerId`
  - entry points:
    - child detail

- `/team-gallery`
  - expects `teamId`, optional `teamName`
  - entry points:
    - team hub preview
    - TeamWall
    - player photo strip

- `/team-wall`
  - expects `teamId`
  - entry points:
    - admin team cards

- `/attendance`
  - expects `eventId`
  - entry points:
    - event detail modal
  - risk: route exists without hard param requirement

- `/game-prep-wizard`
  - expects `eventId` and `teamId`
  - entry points:
    - coach schedule
    - gameday

- `/lineup-builder`
  - expects `eventId` and `teamId` for meaningful use
  - risk: some generic navigations push `/lineup-builder` without params

- `/game-recap`
  - uses optional `eventId`
  - risk: route can open without event context

- `/game-day-command`
  - callers pass either `matchId` or `eventId`
  - risk: split navigation contract

## Duplicate / Parallel Navigation Hubs

- Team management:
  - `/team-management`
  - `/(tabs)/teams`

- Team hub:
  - `/(tabs)/connect`
  - `/(tabs)/coach-team-hub`
  - `/(tabs)/parent-team-hub`

- Schedule:
  - `/(tabs)/schedule`
  - `/(tabs)/coach-schedule`
  - `/(tabs)/parent-schedule`

## Reachable Without Required Context

- `/attendance` without `eventId`
- `/game-recap` without `eventId`
- `/lineup-builder` without `eventId` or `teamId`
- `/game-day-command` with mixed caller param contracts
- `/team-gallery` without `teamId`
- `/team-wall` without `teamId`

## Likely Unreachable Or Low-Entry Screens

- `/(tabs)/admin-chat` — low evidence of active entry points in this pass
- `/(tabs)/admin-schedule` — mostly reachable from reports/admin cards, not primary tab
- `report-viewer` — reachable through report launcher components, but peripheral

## Navigation Dead Ends

- `/web-features`
  - used as generic fallback for several non-mobile features
  - behaves as an acknowledged placeholder
