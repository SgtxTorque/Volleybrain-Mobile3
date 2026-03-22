# Integration Dependency Map

## External and platform dependencies

- Supabase Auth and database
- Expo Notifications
- Expo Linking / WebBrowser for OAuth
- AsyncStorage for persisted app context
- Realtime subscriptions for unread counts

## Internal dependency hotspots

### Auth bootstrap

- `app/_layout.tsx`
- `lib/auth.tsx`
- `lib/onboarding-router.ts`

### Navigation shell

- `app/(tabs)/_layout.tsx`
- `components/GestureDrawer.tsx`

### Data-heavy feature modules

- schedule: coach/parent schedule screens plus home data hooks
- challenges: `lib/challenge-service.ts`, `hooks/useChallenges.ts`
- achievements: `lib/achievement-engine.ts`
- journey: `hooks/useJourneyPath.ts`
- search: `hooks/useGlobalSearch.ts`

## Dependency conclusion

The app is not thin-client simple. UX is strongly shaped by:

- remote data quality
- local storage continuity
- role interpretation
- route parameters
