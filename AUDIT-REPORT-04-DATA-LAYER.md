# AUDIT REPORT 04 -- DATA LAYER

**Auditor:** Claude Opus 4.6
**Date:** 2026-03-17
**Scope:** Supabase queries, realtime subscriptions, auth flow, offline behavior, context providers
**Files Audited:** All files in `lib/`, `hooks/`, and key files in `app/`

---

## SEVERITY DEFINITIONS

| Severity | Meaning |
|----------|---------|
| P0 | BLOCKER -- Will crash, expose data, or violate law |
| P1 | CRITICAL -- Core flow broken or unusable |
| P2 | MAJOR -- Feature does not work correctly but has workaround |
| P3 | MINOR -- Cosmetic / rough edges |
| P4 | NICE-TO-HAVE -- Polish |

---

## 4A. SUPABASE QUERY AUDIT

### 4A-01. `savePushToken` writes to non-existent column `profiles.push_token`
- **File:** `lib/notifications.ts`, line 117
- **Severity:** P1 -- CRITICAL
- **Detail:** The function does `supabase.from('profiles').update({ push_token: token }).eq('id', userId)`. The `profiles` table in `SCHEMA_REFERENCE.csv` has no `push_token` column. There is a separate `push_tokens` table (lines 1150-1155 of schema) with columns `user_id`, `token`, `device_type`. This update will silently fail (RLS may reject or Supabase ignores unknown columns), meaning push notifications are never registered for any user.
- **Fix:** Replace the `profiles` update with an upsert into `push_tokens`:
  ```ts
  await supabase.from('push_tokens').upsert({
    user_id: userId,
    token,
    device_type: Platform.OS,
  }, { onConflict: 'user_id' });
  ```

### 4A-02. `usePlayerHomeData` reads non-existent columns `tier`, `xp_to_next_level` from `profiles`
- **File:** `hooks/usePlayerHomeData.ts`, lines 498-499
- **Severity:** P2 -- MAJOR
- **Detail:** The query selects `total_xp, player_level, tier, xp_to_next_level` from `profiles`, but `SCHEMA_REFERENCE.csv` only shows `total_xp` and `player_level` on the `profiles` table. Columns `tier` and `xp_to_next_level` do not exist. Supabase will return `null` for these; the code has fallbacks (`engData.tier ?? 'Rookie'` and `engData.xp_to_next_level ?? 100`) so it won't crash, but the engagement tier display will always show "Rookie" regardless of actual level.
- **Fix:** Compute `tier` and `xpToNext` client-side from `player_level` using the same formula as `calculateLevel()` in `lib/quest-engine.ts`.

### 4A-03. `useSkillModule` references tables not in schema: `skill_content`, `skill_quizzes`, `skill_progress`, `journey_progress`
- **File:** `hooks/useSkillModule.ts`, lines 48-49, 59, 86, 107, 135, 159, 170
- **Severity:** P2 -- MAJOR
- **Detail:** The skill module system queries `skill_content`, `skill_quizzes`, `skill_progress`, and `journey_progress` tables. None of these appear in `SCHEMA_REFERENCE.csv`. These are likely tables that exist only in a staging/development environment or were planned but not yet migrated to production.
- **Fix:** Verify these tables exist in production Supabase. If not, either run the migration or gate the Journey/Skill feature behind a feature flag that checks table existence.

### 4A-04. `useJourneyPath` references tables not in schema: `journey_chapters`, `journey_nodes`, `journey_progress`
- **File:** `hooks/useJourneyPath.ts`, lines 77, 91, 102
- **Severity:** P2 -- MAJOR (same root cause as 4A-03)
- **Detail:** Same issue. Journey feature depends on tables not in `SCHEMA_REFERENCE.csv`.

### 4A-05. `useCoachEngagement` references tables not in schema: `streak_data`, `league_standings`, `daily_quests`, `weekly_quests`
- **File:** `hooks/useCoachEngagement.ts`, lines 101, 111, 123, 138
- **Severity:** P2 -- MAJOR
- **Detail:** Coach engagement dashboard queries `streak_data`, `league_standings`, `daily_quests`, `weekly_quests` -- none in schema. Wrapped in try/catch so it won't crash, but the entire Coach Engagement Dashboard will show zeros for all players.

### 4A-06. `useQuestEngine` and `useWeeklyQuestEngine` reference `quest_bonus_tracking` table not in schema
- **File:** `hooks/useQuestEngine.ts`, line 32; `hooks/useWeeklyQuestEngine.ts`, line 29
- **Severity:** P3 -- MINOR
- **Detail:** Queries to `quest_bonus_tracking` for checking if daily/weekly bonus was earned. Not in schema. Falls back gracefully (bonus never shows as earned).

### 4A-07. `permissions.ts` uses `.single()` on profile query -- crash if profile missing
- **File:** `lib/permissions.ts`, line 20
- **Severity:** P1 -- CRITICAL
- **Detail:** `getPermissionContext()` calls `.from('profiles').select(...).eq('id', userId).single()`. If the profile row doesn't exist yet (e.g., new OAuth user in the window between auth and profile creation), `.single()` throws `PGRST116` ("JSON object requested, multiple (or no) rows returned"). This crashes the permissions loading, which cascades to break all role detection. The `auth.tsx` init uses `.maybeSingle()` correctly, but `permissions.ts` does not.
- **Fix:** Change `.single()` to `.maybeSingle()` on line 20 and add a null check.

### 4A-08. `chat-utils.ts` -- `getProfileByEmail` uses `.single()` for email lookup
- **File:** `lib/chat-utils.ts`, line 45
- **Severity:** P2 -- MAJOR
- **Detail:** `getProfileByEmail` queries `profiles` by email with `.single()`. If two profiles share the same email (possible with OAuth edge cases), this throws. If no profile exists, it also throws instead of returning null.
- **Fix:** Change to `.maybeSingle()`.

### 4A-09. `chat-utils.ts` -- `createLeagueAnnouncementChannel` uses `.single()` for existence check
- **File:** `lib/chat-utils.ts`, line 389
- **Severity:** P3 -- MINOR
- **Detail:** Queries for existing announcement channel with `.single()`. If somehow two announcement channels exist for the same season, this throws. Should use `.maybeSingle()`.

### 4A-10. `challenge-service.ts` -- Multiple `.single()` calls on ID lookups
- **File:** `lib/challenge-service.ts`, lines 82, 111, 180, 230, 242, 362, 432, 458, 515, 656
- **Severity:** P2 -- MAJOR
- **Detail:** All challenge CRUD uses `.single()` for ID-based lookups. While UUID primary key lookups are generally safe, `.single()` will throw an unhandled exception if the row was deleted between the time the ID was obtained and the query executes (e.g., race condition with admin deleting a challenge while a player is updating progress). Lines 458 and 515 are particularly concerning: they query `profiles.full_name` by player_id, but `challenge_participants.player_id` may reference a `players.id` (not a `profiles.id`), meaning the profile lookup may return 0 rows and crash.
- **Fix:** Use `.maybeSingle()` for all lookups and add null guards.

### 4A-11. `notifications.ts` -- `runAutoBlastCheck` uses `.single()` on schedule_events
- **File:** `lib/notifications.ts`, line 380
- **Severity:** P3 -- MINOR
- **Detail:** The auto-blast fetches game details by ID with `.single()`. Safe since it's iterating over known IDs, but a deleted event would throw.

### 4A-12. N+1 in `useDrawerBadges` -- per-channel unread message counting
- **File:** `hooks/useDrawerBadges.ts`, lines 119-128
- **Severity:** P3 -- MINOR
- **Detail:** Loops through each channel membership and makes an individual `chat_messages` count query per channel. For a user in 10 channels, this fires 10 sequential queries every time the drawer opens. Not a crash risk, but causes visible lag.
- **Fix:** Use a single RPC or batch query with `.in('channel_id', channelIds)` and group-count client-side.

### 4A-13. N+1 in `useParentHomeData` -- per-channel last-message fetching
- **File:** `hooks/useParentHomeData.ts`, lines 768-795
- **Severity:** P3 -- MINOR
- **Detail:** Loops through channel memberships (up to 3) making individual queries for last message and unread count per channel. Sequential queries slow down parent home load.

### 4A-14. N+1 in `challenge-service.ts` -- `updateStatBasedChallenges` per-participant profile lookup
- **File:** `lib/challenge-service.ts`, lines 643-665
- **Severity:** P3 -- MINOR
- **Detail:** Inside the participant loop (line 643), for each participant whose value changed, a `.single()` query is made to `profiles` (line 654) to get full_name. Should batch-fetch all needed profile names before the loop.

### 4A-15. N+1 in `challenge-service.ts` -- `completeChallenge` per-player XP update
- **File:** `lib/challenge-service.ts`, lines 506-524
- **Severity:** P3 -- MINOR
- **Detail:** Loops through each player to read their current XP, calculate new level, and update. Each iteration makes 2 queries (read + update). For a team of 15 players all completing a challenge, that's 30 sequential queries.

### 4A-16. Global search queries lack org scoping for players, teams, and events
- **File:** `hooks/useGlobalSearch.ts`, lines 141-145, 179-183, 303-308
- **Severity:** P2 -- MAJOR
- **Detail:** The `searchPreview` and `searchAll` functions query `players`, `teams`, and `schedule_events` without filtering by `organization_id` or `season_id`. An admin searching "Smith" will see players from all organizations in the database. The `profiles` queries correctly filter by `current_organization_id`, but `players` and `teams` do not.
- **Fix:** Add organization/season scoping to player, team, and event queries. Join through `seasons.organization_id` or filter by relevant season IDs.

### 4A-17. `useCoachHomeData` fallback loads ALL season teams for any coach
- **File:** `hooks/useCoachHomeData.ts`, lines 134-142
- **Severity:** P3 -- MINOR
- **Detail:** If a coach has a `coaches` record but no `team_coaches` entries, the fallback loads ALL teams in the current season and assigns them to this coach. This is a broad fallback that could give a coach visibility into teams they shouldn't see.

### 4A-18. `onboarding-router.ts` -- email filter uses `eq` instead of `ilike`
- **File:** `lib/onboarding-router.ts`, lines 54-58
- **Severity:** P3 -- MINOR
- **Detail:** The unclaimed player check uses `.or(`parent_email.eq.${userEmail},parent1_email.eq.${userEmail}`)` which is case-sensitive. If the parent registered with "Jane@email.com" but signed up with "jane@email.com", the match fails. The `resolve-linked-players.ts` correctly uses `.ilike()` for this.
- **Fix:** Change `eq` to `ilike` for email comparisons.

---

## 4B. REALTIME SUBSCRIPTIONS

### 4B-01. `chats.tsx` -- Global subscription on ALL `chat_messages` INSERTs
- **File:** `app/(tabs)/chats.tsx`, lines 537-544
- **Severity:** P2 -- MAJOR
- **Detail:** The chat list screen subscribes to ALL inserts on `chat_messages` across the entire database with no filter:
  ```ts
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
    fetchChannels();
  })
  ```
  Every message sent by any user in any channel triggers a full refetch of this user's channel list. In a deployment with 100 active chat channels, this fires `fetchChannels()` hundreds of times per minute unnecessarily. The subscription IS cleaned up on unmount (line 543), so no leak, but the performance impact is severe.
- **Fix:** Filter by channel IDs the user belongs to, or use a debounced/throttled approach.

### 4B-02. `_layout.tsx` (tabs) -- Global subscriptions on multiple tables without filters
- **File:** `app/(tabs)/_layout.tsx`, lines 123-153
- **Severity:** P2 -- MAJOR
- **Detail:** The tab layout subscribes to ALL inserts on `chat_messages`, ALL inserts/updates on `message_recipients`, and ALL updates on `channel_members` globally. Same issue as 4B-01 -- fires on every message across the entire platform.
- **Fix:** Filter subscriptions by user's channel memberships.

### 4B-03. `chat/[id].tsx` -- `message_reactions` subscription lacks channel filter
- **File:** `app/chat/[id].tsx`, line 284
- **Severity:** P2 -- MAJOR
- **Detail:** The reaction subscription listens for ALL reaction events across ALL messages:
  ```ts
  .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => debouncedFetch())
  ```
  A reaction on any message in any channel triggers a full message refetch for this chat screen. The other subscriptions on this screen correctly filter by `channel_id`, but `message_reactions` does not.
- **Fix:** Add a filter like `filter: \`message_id=in.(${messageIds.join(',')})\`` or debounce more aggressively. Alternatively, filter client-side.

### 4B-04. All realtime subscriptions are properly cleaned up
- **Status:** PASS
- **Detail:** Every `useEffect` that creates a `.subscribe()` returns a cleanup function calling `.unsubscribe()`. No subscription leaks found.

---

## 4C. AUTHENTICATION FLOW

### 4C-01. Sign Up -> Profile Creation -> Onboarding -> Home
- **Status:** PASS (with caveat)
- **Detail:** `auth.tsx` line 314: `signUp()` calls `supabase.auth.signUp()`, then `init()`. Inside `init()` (line 184-217), if no profile exists, it creates one via `.insert()` with `onboarding_completed: false`. Sets `needsOnboarding = true`. The `_layout.tsx` (lines 61-69) correctly routes to onboarding via `determineOnboardingPath()`.
- **Caveat:** The profile insert at line 196 uses `.single()` which is correct for an insert (always returns 1 row), but the race-condition handler at lines 198-218 is well-implemented -- if the insert fails due to unique constraint, it re-fetches.

### 4C-02. Sign In -> Session Restore -> Home
- **Status:** PASS
- **Detail:** `signIn()` calls `signInWithPassword()` then `init()`. `init()` loads profile, roles, org. Navigation guard in `_layout.tsx` lines 51-77 routes appropriately.

### 4C-03. Sign Out -> Clear AsyncStorage -> Welcome
- **Status:** PASS
- **Detail:** `signOut()` (line 363) clears `LOGOUT_CLEAR_KEYS` from AsyncStorage before calling `supabase.auth.signOut()`, then resets all state. Navigation guard routes to `/(auth)/welcome` when session is null.

### 4C-04. Session Expiry -> Token Refresh
- **Status:** PASS
- **Detail:** `supabase.js` line 9 sets `autoRefreshToken: true`. The Supabase JS client handles token refresh automatically. The `onAuthStateChange` listener in `auth.tsx` line 99 will handle `TOKEN_REFRESHED` events.

### 4C-05. OAuth (Google, Apple) -> Callback -> Profile
- **Status:** PASS (with minor concern)
- **Detail:** `performOAuthSignIn()` (line 329) correctly uses `WebBrowser.openAuthSessionAsync()`, extracts tokens from the URL hash fragment, and calls `supabase.auth.setSession()`. The `onAuthStateChange` SIGNED_IN event triggers `init()` which creates the profile if needed.
- **Concern:** Line 341-351: If the user closes the browser before the OAuth redirect completes, `result.type` may be `'cancel'` or `'dismiss'`. The function returns `{ error: null }` in this case (line 354), but `init()` is NOT called because no `SIGNED_IN` event fires. The user may see a blank screen momentarily, but the loading state will show, and on next app open, `getSession()` will find no session and route to welcome. Not a crash, just potentially confusing UX.

### 4C-06. Password Reset Flow
- **Status:** NOT IMPLEMENTED
- **Severity:** P2 -- MAJOR
- **Detail:** There is no password reset function in `auth.tsx`. No `resetPassword()` or `updatePassword()` method is exposed. Users who forget their password have no recovery path in the mobile app. They would need to use the web admin or contact support.
- **Fix:** Add `resetPassword(email)` that calls `supabase.auth.resetPasswordForEmail()` and a screen to handle the reset link.

### 4C-07. Race condition: `hasNavigated` ref reset on segment change
- **File:** `app/_layout.tsx`, lines 80-82
- **Severity:** P3 -- MINOR
- **Detail:** `hasNavigated.current = false` is set every time `segments` changes (line 81). This means if the user navigates within the app (changing segments), the auth navigation guard re-evaluates. The guard checks `if (hasNavigated.current) return` (line 47) to prevent double-navigation, but resetting it on every segment change means the guard runs on every navigation. In practice this works because the conditions check `session && inAuthGroup` which is false once the user is in `(tabs)`, so no double-navigation occurs. However, there is a theoretical race: if the `init()` async call completes and sets state during a rapid segment transition, the navigation could fire twice.

### 4C-08. App killed mid-onboarding
- **Severity:** P3 -- MINOR
- **Detail:** If the user kills the app during onboarding, on next launch `init()` runs, finds the profile with `onboarding_completed: false`, sets `needsOnboarding = true`, and re-routes to onboarding. The `determineOnboardingPath()` in `onboarding-router.ts` will check for existing player links and roles, so if the user partially completed onboarding (e.g., claimed players), they'll be routed to `already_set_up` and skip onboarding. This is correct behavior.

### 4C-09. DEV auto-login credentials in production builds
- **File:** `lib/auth.tsx`, lines 125-142
- **Severity:** P3 -- MINOR (guarded by `__DEV__`)
- **Detail:** The dev bypass is gated behind `__DEV__` and `EXPO_PUBLIC_DEV_SKIP_AUTH === 'true'`. In production builds, `__DEV__` is `false`, so this code never executes. However, the env vars `EXPO_PUBLIC_DEV_USER_EMAIL` and `EXPO_PUBLIC_DEV_USER_PASSWORD` will be bundled into the JS if set in `.env`. These are prefixed with `EXPO_PUBLIC_` which means they are embedded in the client bundle.
- **Fix:** Rename to non-public env vars (remove `EXPO_PUBLIC_` prefix) or remove from production .env entirely.

---

## 4D. OFFLINE BEHAVIOR

### 4D-01. No offline caching layer
- **Severity:** P2 -- MAJOR
- **Detail:** The app has zero offline caching. Every screen makes fresh Supabase queries on mount. When the device has no internet:
  - All data hooks return empty/loading state forever
  - The auth flow's `init()` will fail at `supabase.auth.getSession()` (line 122) -- but this reads from AsyncStorage so it may succeed. The profile fetch (line 161) will fail and trigger the retry (line 171), which also fails, logging an error and returning early with `setLoading(false)`. The user gets a blank app.
  - RSVP and other write operations fail silently (try/catch swallows errors)
  - Chat messages won't load; realtime subscriptions won't connect

### 4D-02. Writes fail silently with no user feedback
- **Severity:** P2 -- MAJOR
- **Detail:** Multiple write operations catch and swallow errors:
  - `useParentHomeData.rsvpEvent()` (line 834): catches error, reverts optimistic update, but never shows the user a toast/alert
  - `usePlayerHomeData.sendRsvp()` (line 562): catches error with only `console.error`
  - `useSkillModule.completeTip/Drill/Quiz` (lines 86-166): all upserts have no error handling -- if the write fails, XP is lost
  - Challenge service writes (opt-in, progress update): return `{ success: false, error }` but callers don't always surface the error to the user

### 4D-03. Session token persists across offline periods
- **Status:** PASS
- **Detail:** `supabase.js` uses AsyncStorage for session persistence. On app restart offline, the session is restored from AsyncStorage. The auto-refresh will fail, but the cached JWT continues to work until it expires (typically 1 hour for Supabase). After expiry, API calls will fail with 401.

---

## 4E. CONTEXT PROVIDERS

### 4E-01. Provider Nesting Order in `app/_layout.tsx`
- **File:** `app/_layout.tsx`, lines 223-241
- **Detail:** Provider tree (outer to inner):
  ```
  GestureHandlerRootView
    AuthProvider
      ThemeProvider
        SportProvider
          SeasonProvider
            PermissionsProvider
              ParentScrollProvider
                DrawerProvider
                  RootLayoutNav
  ```
- **Status:** PASS -- Dependency chain is correct:
  - `SeasonProvider` depends on `useSport()` and `useAuth()` -- both are above it
  - `PermissionsProvider` depends on `useAuth()` -- above it
  - `DrawerProvider` has no data dependencies
  - `ThemeProvider` has no data dependencies

### 4E-02. `SeasonProvider` depends on `useSport()` which loads asynchronously
- **File:** `lib/season.tsx`, line 41; `lib/sport.tsx`, line 46
- **Severity:** P4 -- NICE-TO-HAVE
- **Detail:** `SeasonProvider` calls `useSport()` to get `activeSport`. `SportProvider` makes an async query on mount (line 46). If `SeasonProvider` runs `refreshSeasons()` before `SportProvider` finishes loading, `activeSport` is null, and the season query runs without sport filtering. This is handled correctly -- the `useEffect` on line 106-108 re-runs `refreshSeasons()` when `activeSport.id` changes. But it means two sequential season fetches on app start (once without sport filter, once with).

### 4E-03. `PermissionsProvider` initial state exposes default values before load
- **File:** `lib/permissions-context.tsx`, lines 28-45
- **Severity:** P3 -- MINOR
- **Detail:** The default context value sets `isAdmin: false, isCoach: false, isParent: false, isPlayer: false, loading: true`. Components that don't check `loading` before reading role flags could briefly render incorrect UI (e.g., showing player UI to an admin during the ~200ms load).

### 4E-04. No circular dependencies found
- **Status:** PASS
- **Detail:** The provider dependency graph is strictly hierarchical: Auth -> Theme -> Sport -> Season -> Permissions -> Drawer. No provider depends on a provider below it in the tree. The one potential circular dependency (notifications <-> challenge-service) is correctly broken with a lazy `import()` at `notifications.ts` line 624.

### 4E-05. `usePermissions()` accessed outside provider returns safe defaults
- **File:** `lib/permissions-context.tsx`, lines 28-45
- **Status:** PASS
- **Detail:** Unlike `useAuth()` which throws if used outside its provider (line 407), `usePermissions()` returns the default context object with `loading: true` and all flags false. This prevents crashes if a component accidentally renders outside the provider tree.

### 4E-06. `useSeason()` accessed with default context returns null workingSeason
- **File:** `lib/season.tsx`, lines 32-38
- **Status:** PASS
- **Detail:** Default context has `workingSeason: null`. All hooks that use `useSeason()` check for `workingSeason?.id` before querying.

---

## SUMMARY OF FINDINGS

| Severity | Count | Key Items |
|----------|-------|-----------|
| P0 | 0 | -- |
| P1 | 2 | Push token saves to wrong column; permissions `.single()` crash on missing profile |
| P2 | 10 | Missing password reset; engagement tables not in schema; global search leaks cross-org data; global realtime subscriptions; no offline support; silent write failures; `.single()` crashes in challenge/chat code |
| P3 | 10 | N+1 queries in drawer badges / parent chat / challenge service; various `.single()` in non-critical paths; onboarding email case sensitivity; provider loading flashes |
| P4 | 1 | Double season fetch on startup |

### Top 5 Fixes Before Launch

1. **P1: Fix `savePushToken` to write to `push_tokens` table** -- Push notifications are completely broken without this. (`lib/notifications.ts:117`)

2. **P1: Change `permissions.ts:20` from `.single()` to `.maybeSingle()`** -- New users hitting this path will crash the entire permission system.

3. **P2: Add password reset flow** -- Users with no recovery path is a launch-blocking UX gap.

4. **P2: Add channel filters to realtime subscriptions** -- Global subscriptions on `chat_messages` will cause severe performance issues at scale. (`app/(tabs)/chats.tsx:539`, `app/(tabs)/_layout.tsx:125`, `app/chat/[id].tsx:284`)

5. **P2: Scope global search queries to current organization** -- Cross-org data leakage through search. (`hooks/useGlobalSearch.ts:141-308`)
