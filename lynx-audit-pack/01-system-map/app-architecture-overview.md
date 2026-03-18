# App Architecture Overview

## Stack

- Framework: Expo Router + React Native + TypeScript
- Backend: Supabase Auth + Postgres tables + realtime subscriptions
- State: React Context, local component state, AsyncStorage-backed persistence
- Navigation: Expo Router route groups, redirects, imperative `router.push`/`replace`, notification-tap routing

## Main architecture layers

### App shell

- Root layout: `app/_layout.tsx`
- Responsibilities:
  - compose providers
  - gate auth vs app entry
  - send users into onboarding, claim-account, pending approval, or tabs
  - route notification taps
  - attach global drawer

### Providers and long-lived context

- `lib/auth.tsx`: session, profile, org, onboarding state, orphan-record detection, logout cleanup
- `lib/permissions-context.tsx`: role interpretation and dev view-as behavior
- `lib/season.tsx`: working season and season list
- `lib/sport.tsx`: working sport context
- `lib/theme.tsx`: theme/colors
- `lib/drawer-context.tsx`: drawer open/close state
- `lib/parent-scroll-context.tsx`: parent-home scroll-driven tab hiding

### Navigation model

- `(auth)` group: welcome, login, signup, pending approval, redeem code
- `(tabs)` group: role-driven tab shell
- root screens: deep features, setup flows, legal pages, search, reports, gameplay, family surfaces

### Data access model

The app does not use one strict repository layer. Data access is distributed:

- direct from screens
- direct from hooks
- utility/service helpers in `lib/`

This increases speed of delivery but makes UX consistency dependent on each screen's local query assumptions.

## Routing shape

### Root gated paths

- unauthenticated -> `/(auth)/welcome`
- pending approval -> `/(auth)/pending-approval`
- orphan player records -> `/claim-account`
- onboarding required -> `determineOnboardingPath(...)`
- otherwise -> `/(tabs)`

### Notification-tap routing

Defined in `app/_layout.tsx` and role-sensitive:

- chat -> `/chat/:channelId` or `/(tabs)/chats`
- schedule -> parent schedule / coach schedule / generic schedule
- payment -> admin payments / family payments / home
- registration -> registration hub / parent registration hub / home
- game -> `/game-prep?eventId=...` or `/(tabs)/gameday`
- challenge -> coach challenge dashboard or challenge CTA / challenges

## Architectural reality

The app behaves like a platform with multiple user types sharing one mobile shell, but it is not fully normalized. Real UX depends on:

- current role or dev view-as role
- working season context
- whether a route expects params
- whether the screen falls back to context or storage
- whether the user has children, teams, payments, or org membership records
