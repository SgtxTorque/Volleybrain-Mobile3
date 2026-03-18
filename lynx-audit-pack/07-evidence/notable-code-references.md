# Notable Code References

## Auth and entry routing

- `app/_layout.tsx`
  - auth gating
  - pending approval routing
  - orphan record routing
  - notification tap routing
- `lib/auth.tsx`
  - profile bootstrap
  - push token registration
  - orphan detection
  - logout storage cleanup
- `lib/onboarding-router.ts`
  - onboarding path resolution

## Navigation shell

- `app/(tabs)/_layout.tsx`
  - role-shaped tab availability
  - unread badge counting
- `components/GestureDrawer.tsx`
  - drawer IA
  - role gates
  - placeholder tools

## Confirmed risk references

- `components/player-scroll/PlayerTeamHubCard.tsx`
  - pushes `/team-hub?teamId=...`
- `app/notification.tsx`
  - one notification inbox model
- `app/notification-inbox.tsx`
  - separate player notification inbox model
- `app/team-management.tsx`
  - admin team operations surface
- `app/(tabs)/teams.tsx`
  - overlapping team operations surface
- `app/admin-search-results.tsx`
  - search-driven navigation into multiple entities

## Data model references

- `hooks/useGlobalSearch.ts`
- `hooks/useParentHomeData.ts`
- `hooks/useCoachHomeData.ts`
- `lib/challenge-service.ts`
- `lib/achievement-engine.ts`
- `hooks/useJourneyPath.ts`
