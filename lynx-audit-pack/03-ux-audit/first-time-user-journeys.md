# First-Time User Journeys

## 1. Cold download parent-like user

Path implied by code:

1. App launches
2. No session -> `/(auth)/welcome`
3. User signs up or logs in
4. `app/_layout.tsx` evaluates auth state
5. `lib/onboarding-router.ts` may return:
   - `claim_account`
   - `registration_link`
   - `invite_code`
   - `cold`
6. Both `cold` and `invite_code` currently resolve to `/parent-registration-hub`

UX note:

- This is a broad catch-all destination and may not feel specific to the user's actual entry source.

## 2. Pre-added parent with orphan child records

Path implied by code:

1. User signs in
2. `lib/auth.tsx` checks `players` where `parent_email == user.email` and `parent_account_id is null`
3. If found, root layout routes to `/claim-account`

UX note:

- This is one of the clearest system-driven recovery paths in the app.

## 3. Team manager setup

Path implied by code:

1. Signup may `router.replace('/team-manager-setup')`
2. Setup flow inserts role/team invite support data
3. Completion returns to `/(tabs)`

UX note:

- Dedicated setup exists, which is stronger than many other role transitions.

## 4. New player

Path implied by code:

1. Player reaches `/(tabs)`
2. Player tab shell can expose `gameday`
3. Drawer and player-scroll components expose:
   - `journey`
   - `quests`
   - `skill-module`
   - `my-stats`
   - `player-card`

UX note:

- Player experience appears more modern and gamified than older admin/parent utility surfaces.
