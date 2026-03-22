# AUDIT REPORT 10 -- FINAL VERDICT & LAUNCH CHECKLIST

**Auditor:** Claude Opus 4.6
**Date:** 2026-03-17
**Branch:** `navigation-cleanup-complete`
**Scope:** Synthesis of Phases 1-9 into actionable launch plan

---

## OVERALL VERDICT: CONDITIONALLY READY FOR CLOSED BETA

The Lynx mobile app is architecturally sound, feature-complete across 45 feature areas (37 SHIP, 6 SHIP-LIMIT, 0 DO-NOT-SHIP, 2 HIDE), and provides a differentiated experience for all four roles. However, **10 hard blockers** must be resolved before any Play Store submission, and **14 critical items** must be addressed before external users touch the app.

**Estimated time from current state to first internal test build:** 2-3 days of focused work.
**Estimated time from current state to closed beta submission:** 1-2 weeks.

---

## SECTION A: HARD BLOCKERS (Cannot submit to Play Store until fixed)

These items will cause Google Play rejection, app crashes, legal violations, or data exposure. **All must be resolved before any build is submitted.**

| # | Issue | Source | File(s) | Complexity | What To Do |
|---|-------|--------|---------|------------|------------|
| A1 | **Android package is `com.anonymous.Lynx`** | Phase 1 (1A-01) | `app.json:33` | S | Change to `com.thelynxapp.lynx` or similar reverse-domain. Once published, this is permanent. |
| A2 | **No `eas.json` exists** | Phase 1 (1A-02) | MISSING | S | Run `eas init` and create `eas.json` with development, preview, and production build profiles. Without this, no build can be generated. |
| A3 | **No EAS project ID or owner** | Phase 1 (1A-03) | `app.json` | S | Run `eas init` to link the Expo project. Without `extra.eas.projectId`, push notifications (`getExpoPushTokenAsync`) will fail silently in production. |
| A4 | **No web-hosted Privacy Policy URL** | Phase 1 (1B-01) | N/A (web) | S | Host the privacy policy at `https://thelynxapp.com/privacy-policy`. Google Play Console requires a public URL during listing setup. The in-app policy exists but that is not sufficient. |
| A5 | **Account deletion only flags -- does not actually delete** | Phase 1 (1B-03) | `app/profile.tsx:213-248` | L | `handleDeleteAccount` sets `deletion_requested: true` but nothing processes it. Implement a Supabase Edge Function or `pg_cron` job to cascade-delete within 60 days (Google Play policy since April 2024). Must handle: profiles, players, game_stats, chat_messages, photos, medical info. |
| A6 | **`.env` committed to git with Supabase credentials** | Phase 9 (INFRA-19) | `.env`, `.gitignore` | M | Add `.env` to `.gitignore`. Remove from git tracking with `git rm --cached .env`. The Supabase anon key is in git history across at least 2 commits. Consider rotating the anon key after launch. For EAS builds, use EAS Secrets instead of `.env`. |
| A7 | **No crash reporting or analytics** | Phase 9 (INFRA-18) | N/A (not installed) | M | Install `@sentry/react-native`, configure in `app/_layout.tsx`, add source map uploads to EAS build config. Without this, you have zero visibility into production crashes. This is the single highest-priority infrastructure item. |
| A8 | **`.single()` crashes on PlayerCardExpanded** | Phase 7 (7A-02) | `components/PlayerCardExpanded.tsx:132,143,158` | S | Three `.single()` calls for `player_stats`, `player_skills`, `player_skill_ratings`. A new player with no data triggers `PGRST116` crash. Change all three to `.maybeSingle()`. |
| A9 | **`.single()` crashes -- multiple unguarded callsites** | Phase 7 (7A-01) | `lib/challenge-service.ts:458`, `app/(tabs)/connect.tsx:93`, `app/chat/[id].tsx:413,619,730`, `app/(tabs)/admin-teams.tsx:297` | M | 94 total `.single()` calls across non-archive files; at least 6 have no error guard and will crash on zero rows. Audit all 94, replace SELECT queries with `.maybeSingle()`, and add error checks on INSERT+`.single()`. |
| A10 | **`/team-hub` route does not exist -- player tap crashes** | Phase 5 (NAV-01) | `components/player-scroll/PlayerTeamHubCard.tsx:64` | S | `router.push('/team-hub?teamId=...')` navigates to a non-existent route. Create `app/team-hub.tsx` as a redirect to `/(tabs)/connect?teamId=X`, or change the push target. |

**Total Hard Blocker effort estimate:** ~40-60 hours of focused development.

---

## SECTION B: MUST FIX BEFORE BETA USERS (Won't get rejected, but will lose users day 1)

These items represent broken core flows, wrong data, or UX failures that will cause immediate user churn.

| # | Issue | Source | File(s) | Complexity | What To Do |
|---|-------|--------|---------|------------|------------|
| B1 | **COPPA consent not collected at signup** | Phase 1 (1B-04) | `app/(auth)/signup.tsx`, `components/CoppaConsentModal.tsx` | M | The signup flow has no COPPA consent step. The `CoppaConsentModal` only fires for existing parents. A new parent adding a child collects child data before parental consent -- a COPPA violation. Add consent step to signup when role is "parent", or at the point a parent first adds a child. |
| B2 | **Push token writes to non-existent column** | Phase 4 (4A-01) | `lib/notifications.ts:117` | S | `savePushToken` writes to `profiles.push_token` but that column doesn't exist. Push tokens are never stored. Replace with upsert to `push_tokens` table (columns: `user_id`, `token`, `device_type`). |
| B3 | **Permissions `.single()` crash on new users** | Phase 4 (4A-07) | `lib/permissions.ts:20` | S | `getPermissionContext()` uses `.single()` on profile. New OAuth users in the window between auth and profile creation will crash all role detection. Change to `.maybeSingle()`. |
| B4 | **No `android.versionCode` set** | Phase 1 (1A-05) | `app.json` | S | Add `"versionCode": 1` to the Android config. Without explicit version codes + auto-increment in `eas.json`, subsequent Play Store uploads will be rejected for duplicate version codes. |
| B5 | **N+1 query in tab bar unread badge** | Phase 2/6 (6C-1) | `app/(tabs)/_layout.tsx:93-104` | M | Loops per-channel to count unread messages. A user in 10 channels fires 10 sequential queries every time the tab layout mounts. Replace with a single batch query using `.in('channel_id', channelIds)`. |
| B6 | **Dark mode toggle is broken** | Phase 6 | `app/(tabs)/settings.tsx`, theme system | M | The "System" / "Light" / "Dark" toggle in settings does not reliably apply. With 511+ hardcoded hex colors across the codebase, dark mode is visually broken even when toggled. For Beta, either fix the toggle and audit critical screens, or remove the toggle and ship light-mode only. |
| B7 | **23 screens have no role guard** | Phase 5 (NAV-04) | See Phase 5 list | M | Coach/admin screens like `/game-day-command`, `/lineup-builder`, `/evaluation-session`, `/blast-composer` have no `usePermissions()` check. A parent navigating via deep link (`lynx://game-day-command`) sees the full screen. Add role guards to all 23 screens. |
| B8 | **`registration-config.ts` `.single()` crash** | Phase 7 | `lib/registration-config.ts` | S | Uses `.single()` which crashes if the config row doesn't exist. Change to `.maybeSingle()`. |
| B9 | **Profile-completeness `.single()` crash** | Phase 7 | Profile completeness check | S | Same pattern -- `.single()` on a row that may not exist. Change to `.maybeSingle()`. |
| B10 | **Engagement tables don't exist in production** | Phase 4 (4A-03/04/05) | `hooks/useSkillModule.ts`, `hooks/useJourneyPath.ts`, `hooks/useCoachEngagement.ts` | M | Queries reference `skill_content`, `skill_quizzes`, `journey_chapters`, `journey_nodes`, `journey_progress`, `streak_data`, `league_standings`, `daily_quests`, `weekly_quests` -- none in schema. These features silently return empty data. Verify tables exist in production or gate these features behind availability checks. |
| B11 | **`expo-updates` not installed** | Phase 1 (1A-04) | `package.json` | S | Without OTA updates, every bug fix requires a full native build + Play Store review (1-7 days). Run `npx expo install expo-updates` and configure in `app.json`. Critical for post-launch agility. |
| B12 | **60 ungated console statements in production** | Phase 9 (INFRA-11) | `lib/notifications.ts`, `lib/media-utils.ts`, `lib/auth.tsx`, etc. | S | `lib/media-utils.ts` logs URIs and blob sizes. `lib/auth.tsx` logs email addresses. Wrap all in `if (__DEV__)` or create a logger utility that no-ops in production. |
| B13 | **Empty catch blocks silently swallowing errors** | Phase 7 | Multiple files | M | Several `try/catch` blocks catch errors and do nothing (no logging, no user feedback). In production without crash reporting, these are invisible failures. At minimum, log to Sentry once installed. |
| B14 | **FirstLaunchTour is dead code but still imported** | Phase 3 | `components/FirstLaunchTour.tsx` | S | This component is never rendered. Remove the file and any imports. Clean dead code before shipping. |

**Total Must-Fix effort estimate:** ~30-50 hours.

---

## SECTION C: SHOULD FIX FOR QUALITY (Can ship Beta without, but impacts perception)

| # | Issue | Source | Complexity |
|---|-------|--------|------------|
| C1 | **511+ hardcoded hex colors** bypass the design system | Phase 6 | L |
| C2 | **925 `any` types** across 263 files -- runtime crash surface | Phase 9 (INFRA-10) | XL |
| C3 | **30+ dead component files** bloating the codebase | Phase 3 | M |
| C4 | **~140 development artifact files** (CC-*.md, AUDIT-*.md, CODEX-*.md) in repo root | Phase 9 (INFRA-16) | S |
| C5 | **Duplicate Android permissions** (RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, READ_CALENDAR, WRITE_CALENDAR each listed twice) | Phase 1 (1A-06) | S |
| C6 | **Leftover React/Expo boilerplate assets** (react-logo.png x3, partial-react-logo.png) | Phase 1 (1A-07) | S |
| C7 | **No web-hosted Terms of Service URL** | Phase 1 (1B-02) | S |
| C8 | **Admin role not available at signup** -- admin must sign up as "Coach" then becomes admin via org creation | Phase 6 (6A-1a) | M |
| C9 | **Splash icon `imageWidth: 200` is very small** for high-DPI screens | Phase 1 (1A-08) | S |
| C10 | **`chat-utils.ts` getProfileByEmail uses `.single()`** -- crashes on duplicate or missing email | Phase 4 (4A-08) | S |
| C11 | **N+1 in `useDrawerBadges`** -- per-channel unread counting | Phase 4 (4A-12) | M |
| C12 | **Player tier display always shows "Rookie"** -- reads non-existent columns from profiles | Phase 4 (4A-02) | S |
| C13 | **`react-native-web` and `react-dom`** unnecessary for mobile-only app | Phase 9 (INFRA-01) | S |
| C14 | **Zero test coverage** -- no test files, no test framework | Phase 9 (INFRA-17) | XL |
| C15 | **Duplicate RoleSelector components** (`components/RoleSelector.tsx` and `components/ui/RoleSelector.tsx`) | Phase 9 (INFRA-14) | S |
| C16 | **Privacy Policy claims "email verification" as parental consent** -- legally weak for COPPA | Phase 1 (1B-05) | M |
| C17 | **Global realtime subscriptions** without channel filtering -- receives all events for all teams | Phase 4 | M |
| C18 | **Parent NoTeamState doesn't link to registration** -- dead-end for new parents | Phase 6 (6A-3a) | S |
| C19 | **Notification preferences stored in AsyncStorage only** -- not synced to server | Phase 8 | M |
| C20 | **Accessibility gaps** -- missing `accessibilityLabel` on most `<Image>` components | Phase 6 | L |

---

## SECTION D: HIDE FOR BETA (Features to remove from UI -- they're not ready)

| # | Feature | Current State | How To Hide |
|---|---------|--------------|-------------|
| D1 | **QR Code Features** | Not implemented. No screen, no library. | Already absent from UI. No action needed. If referenced in any marketing materials, remove those references. |
| D2 | **Venue Manager** | Stub screen at `app/venue-manager.tsx` showing "Coming Soon" with mascot. | Currently shows a clean placeholder directing users to web. **Recommendation: Keep as-is.** The messaging is professional and sets expectations. Optionally remove from admin drawer to reduce clutter. |
| D3 | **Journey/Skill Module** | Screens exist but depend on tables not in production schema (`skill_content`, `skill_quizzes`, `journey_chapters`, `journey_nodes`, `journey_progress`). | If tables are not migrated to production, hide the Journey tab for players by removing the `journey` tab from `_layout.tsx` when `isPlayer` is true. The tab currently shows but all data will be empty. |
| D4 | **Coach Engagement Dashboard** | Screen exists but depends on tables not in schema (`streak_data`, `league_standings`, `daily_quests`, `weekly_quests`). | Wrapped in try/catch so it won't crash, but shows zeros everywhere. Consider removing `/coach-engagement` from the drawer for Beta, or add a "Coming Soon" overlay. |

---

## SECTION E: POST-BETA ROADMAP (Known gaps acceptable for Beta)

These are features or improvements users may ask about. Acceptable to say "coming soon."

| # | Gap | User Impact | Timeline |
|---|-----|-------------|----------|
| E1 | **No payment processing on mobile** | Parents can't pay in-app. Admins mark payments manually. Stripe is web-only. | Post-beta. By design -- Stripe integration exists on web. |
| E2 | **No offline support** | App is unusable without internet. No data caching, no optimistic updates. | Post-beta. Standard for v1 mobile apps. |
| E3 | **No deep link configuration beyond scheme** | All routes exposed as `lynx://` deep links. No Universal Links (Android App Links) configured. | Post-beta. Scheme-based deep links work for push notifications. |
| E4 | **Reports sparse with low data** | Reports framework works but new orgs have little data to show. | Self-resolving as users create data. |
| E5 | **No web portal link from app** | Web features screen exists (`app/web-features.tsx`) but `webUrl` param must be correct per-feature. | Verify URLs are correct for production web portal. |
| E6 | **Tablet layout optimization** | `useResponsive()` provides scaling but not all screens are tablet-optimized. | Post-beta based on usage data. |
| E7 | **Chat voice messages require native build** | `expo-audio` recording won't work in Expo Go. | Beta users must be on dev/preview builds. |
| E8 | **Notification preferences not server-synced** | Stored in AsyncStorage only. Cleared on reinstall. | Post-beta. Add server persistence. |
| E9 | **Player card screenshot sharing** | TODO comment at `app/player-card.tsx:222`. | Post-beta feature. |
| E10 | **Game Day offline replay** | TODO at `components/gameday/SummaryPage.tsx:153` -- pending actions not synced. | Post-beta. Coach should keep app in foreground during matches. |

---

## SECTION F: THE LAUNCH CHECKLIST

A sequential, numbered checklist. Each item depends on the ones before it.

### Phase 1: Code Fixes (Priority Order)

```
[ ] 1.  Fix .env exposure: add `.env` to .gitignore, `git rm --cached .env`,
        set up EAS Secrets for SUPABASE_URL and SUPABASE_ANON_KEY
[ ] 2.  Change package name: `com.anonymous.Lynx` -> `com.thelynxapp.lynx` in app.json
[ ] 3.  Add android.versionCode: 1 to app.json
[ ] 4.  Remove duplicate Android permissions (lines 28-31 of app.json)
[ ] 5.  Install crash reporting: `npx expo install @sentry/react-native`
        - Configure Sentry in app/_layout.tsx
        - Add Sentry Expo plugin to app.json
[ ] 6.  Install OTA updates: `npx expo install expo-updates`
        - Configure updates section in app.json
[ ] 7.  Fix ALL .single() -> .maybeSingle() on SELECT queries:
        - components/PlayerCardExpanded.tsx:132,143,158
        - lib/permissions.ts:20
        - lib/registration-config.ts
        - lib/challenge-service.ts:458,515
        - lib/chat-utils.ts:45
        - app/(tabs)/connect.tsx:93
        - All INSERT+.single() callsites: add error checks
[ ] 8.  Fix push token storage: lib/notifications.ts:117
        - Change profiles.push_token -> push_tokens table upsert
[ ] 9.  Fix /team-hub route: create app/team-hub.tsx redirect
        or change PlayerTeamHubCard.tsx:64 to /(tabs)/connect
[ ] 10. Add COPPA consent to signup flow for parent role
[ ] 11. Implement account deletion backend (Edge Function or pg_cron)
[ ] 12. Fix N+1 in tab layout unread badge: app/(tabs)/_layout.tsx:93-104
        - Replace per-channel loop with batch .in() query
[ ] 13. Add role guards to 23 unguarded screens (see Phase 5 NAV-04 list)
[ ] 14. Gate all 60 ungated console statements behind __DEV__
[ ] 15. Fix or remove dark mode toggle (ship light-only if not fixable for Beta)
[ ] 16. Remove dead code: FirstLaunchTour.tsx, 30+ unused component files
[ ] 17. Delete leftover boilerplate assets: react-logo*.png, partial-react-logo.png
[ ] 18. Hide Journey tab if tables not migrated to production
[ ] 19. Verify engagement tables exist in production Supabase
```

### Phase 2: EAS Project Setup

```
[ ] 20. Create Expo account (if not already): https://expo.dev/signup
[ ] 21. Run `eas init` in project root
        - This populates app.json with owner and extra.eas.projectId
[ ] 22. Create eas.json with build profiles:
        - development (developmentClient: true, distribution: internal)
        - preview (distribution: internal)
        - production (autoIncrement: true)
[ ] 23. Configure EAS Secrets:
        - EXPO_PUBLIC_SUPABASE_URL
        - EXPO_PUBLIC_SUPABASE_ANON_KEY
        - SENTRY_DSN
        - SENTRY_AUTH_TOKEN (for source maps)
```

### Phase 3: Build Configuration

```
[ ] 24. Generate Android keystore: `eas credentials`
        - Store keystore backup securely (losing it = new app listing)
[ ] 25. Run first preview build: `eas build --profile preview --platform android`
        - Verify build completes successfully
[ ] 26. Install preview build on test device
        - Test: login, signup, role selection, dashboard loading
        - Test: chat send/receive, push notification, calendar
        - Test: game day flow end-to-end
        - Test: account deletion request
        - Verify: Sentry receives test crash/error
[ ] 27. Run production build: `eas build --profile production --platform android`
```

### Phase 4: Play Store Developer Account

```
[ ] 28. Create Google Play Developer account ($25 one-time fee)
        - https://play.google.com/console/signup
[ ] 29. Complete developer identity verification (may take 1-3 business days)
[ ] 30. Set up app signing (Google manages or upload your own keystore)
```

### Phase 5: Store Listing Content

```
[ ] 31. Prepare store listing assets:
        - App icon: 512x512 PNG
        - Feature graphic: 1024x500 PNG
        - Screenshots: minimum 2, recommended 4-8 (phone + tablet)
        - Short description (80 chars max)
        - Full description (4000 chars max)
[ ] 32. Complete content rating questionnaire:
        - App has user-generated content (chat, photos, shoutouts) -> flag appropriately
        - App handles children's data -> COPPA flags
        - No violence, gambling, or mature content -> "Everyone" rating
[ ] 33. Host privacy policy at public URL (see A4)
[ ] 34. Host terms of service at public URL (see C7)
[ ] 35. Add privacy policy URL to Play Console listing
[ ] 36. Complete Data Safety section:
        - Data collected: name, email, phone, photos, children's info
        - Data shared: none (first-party use only)
        - Data encrypted in transit: yes (HTTPS/WSS to Supabase)
        - Account deletion available: yes (after A5 is implemented)
```

### Phase 6: Beta Track Setup

```
[ ] 37. Create internal testing track in Play Console
[ ] 38. Upload first AAB (from step 27)
[ ] 39. Add internal testers (up to 100 email addresses)
[ ] 40. Distribute internal test link
[ ] 41. Run 1-2 weeks of internal testing
[ ] 42. Fix any issues found during internal testing
[ ] 43. Promote to closed beta track (up to 2000 testers)
[ ] 44. Monitor Sentry for crashes during closed beta
[ ] 45. Iterate based on feedback
```

### Phase 7: Production Launch

```
[ ] 46. When closed beta is stable (crash-free rate > 99%):
        - Promote to open beta OR production
[ ] 47. Configure EAS Update for OTA hotfixes:
        - `eas update --branch production`
[ ] 48. Set up monitoring dashboard:
        - Sentry for crashes
        - Play Console vitals for ANRs and crash rate
        - Supabase dashboard for query performance
```

---

## SECTION G: RISK REGISTER

Top 10 risks that could cause problems post-launch, even if all blockers above are addressed.

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| G1 | **Parent signs up, can't find child's team, leaves 1-star review.** The NoTeamState for parents says "Your coach or admin will add them soon" with no self-service path. If the admin is slow to add the child, the parent's first experience is a blank app. | HIGH | HIGH | Add a link from NoTeamState to `/parent-registration-hub`. Add a push notification to admins when a new parent joins. Add estimated wait time messaging. |
| G2 | **Coach loses match data mid-game due to app kill.** The Game Day command center stores match state in React context. If the OS kills the app (low memory, phone call), in-progress match data may be lost. `MatchProvider` has some persistence but edge cases exist (TODO at `SummaryPage.tsx:153`). | MEDIUM | HIGH | Add AsyncStorage persistence at every rally/point change. Test aggressively: kill app during match, verify resume. |
| G3 | **Push notifications never arrive.** With push tokens stored to the wrong column (B2), no user will receive push notifications until fixed. Even after the fix, tokens are only registered on app launch -- users who installed before the fix will need to relaunch. | HIGH (until B2 fixed) | HIGH | Fix B2 immediately. After fix, add a token refresh check on every app foreground event. |
| G4 | **Chat unread count causes sluggish tab bar.** The N+1 query in `_layout.tsx` fires on every tab render. Users with many channels will experience mounting delay every time they switch tabs, making the app feel slow on the core navigation surface. | HIGH | MEDIUM | Fix B5 before beta. Even a simple `Promise.all` parallel fetch would help in the interim. |
| G5 | **Supabase anon key in git history enables data scraping.** While RLS protects most data, the committed `.env` means anyone with repo access has the Supabase URL and anon key. If RLS has any gaps (see Phase 4 findings on global search cross-org data leak), this becomes a data breach. | MEDIUM | HIGH | Rotate the anon key post-launch. Audit RLS policies for every table. Ensure `.env` is removed from git tracking (A6). |
| G6 | **COPPA complaint or FTC investigation.** The app handles children's data (player names, ages, medical info, photos) without collecting verifiable parental consent at signup. If a complaint is filed, the consequences include fines ($50,120 per violation as of 2024) and forced removal from app stores. | LOW | CRITICAL | Fix B1 (COPPA consent at signup) before any external user touches the app. Consult a lawyer to verify the consent mechanism meets COPPA's "verifiable parental consent" standard. |
| G7 | **Dark mode is visually broken.** With 511+ hardcoded colors, toggling dark mode produces unreadable text, invisible buttons, and inconsistent backgrounds. Users who enable system dark mode will have a broken experience. | HIGH | MEDIUM | Ship light-mode only for Beta (remove toggle). This is a cosmetic issue, not functional, but first impressions matter. |
| G8 | **Player taps Team Hub and sees error screen.** The missing `/team-hub` route (A10) means every player who taps "Team Hub" from their home dashboard hits an Expo Router "Unmatched route" error. This is one of the most prominent CTAs on the player dashboard. | HIGH (until A10 fixed) | HIGH | Fix A10 immediately. This is a 5-minute fix (create redirect file or change push target). |
| G9 | **No visibility into production errors.** Without Sentry (A7), when users report "the app crashed" or "nothing happened when I tapped X", the developer has no stack traces, breadcrumbs, or device info. Debugging becomes guesswork. Every hour of delayed Sentry setup costs 10x in post-launch debugging time. | CERTAIN (until A7 fixed) | HIGH | Install Sentry before the first build goes to any external tester. |
| G10 | **Google Play review rejection for incomplete account deletion.** Google's Data Deletion Requirements (enforced since April 2024) mandate that account deletion must actually remove data, not just flag it. The current implementation (A5) only sets `deletion_requested: true`. If Google's review team tests this flow, the app will be rejected. | HIGH | HIGH | Implement the backend deletion process before submitting to any Play Store track, including internal testing. Google tests internal tracks too. |

---

## AGGREGATE STATISTICS

### Finding Counts Across All 9 Phases

| Phase | P0 | P1 | P2 | P3 | P4 | Total |
|-------|----|----|----|----|----|----|
| 1. Play Store Blockers | 4 | 2 | 2 | 4 | 4 | 16 |
| 2. Screen-by-Screen | 0 | 1 | 7 | 8 | 18 | 34 |
| 3. Component Audit | 0 | 1 | 5 | 18 | 7 | 31 |
| 4. Data Layer | 0 | 2 | 10 | 10 | 1 | 23 |
| 5. Navigation | 1 | 0 | 3 | 9 | 3 | 16 |
| 6. UX/UI Quality | 0 | 3 | 8 | 12 | 6 | 29 |
| 7. Performance & Crash Risk | 2 | 6 | 15 | 12 | 3 | 38 |
| 8. Feature Completeness | -- | -- | -- | -- | -- | 37 SHIP, 6 SHIP-LIMIT, 2 HIDE |
| 9. Infrastructure | 2 | 3 | 4 | 6 | 4 | 19 |
| **TOTAL** | **9** | **18** | **54** | **79** | **46** | **206+** |

### De-duplicated Unique Issues

Several findings overlap across phases (e.g., `.single()` crashes appear in Phases 4, 7, and 2; N+1 queries in Phases 2, 4, and 6; package name in Phases 1 and 9). After de-duplication:

| Severity | Unique Issues |
|----------|---------------|
| P0 BLOCKER | 10 |
| P1 CRITICAL | 14 |
| P2 MAJOR | ~35 |
| P3 MINOR | ~50 |
| P4 NICE-TO-HAVE | ~30 |

---

## WORK PRIORITIZATION MATRIX

### Do First (Hours 1-8): Unblock the build pipeline
- A1: Package name (5 min)
- A2+A3: `eas init` + `eas.json` (30 min)
- A6: Fix `.env` exposure (15 min)
- B4: Add versionCode (5 min)
- C5: Remove duplicate permissions (5 min)
- C6: Delete boilerplate assets (5 min)
- A7: Install Sentry (2-4 hours)
- B11: Install expo-updates (1 hour)

### Do Second (Hours 8-20): Fix crash risks
- A8: PlayerCardExpanded `.maybeSingle()` (15 min)
- A9: All `.single()` audit (2-4 hours)
- A10: `/team-hub` route (5 min)
- B2: Push token storage (30 min)
- B3: Permissions `.maybeSingle()` (15 min)
- B8+B9: Registration + profile `.maybeSingle()` (30 min)
- B12: Gate console statements (1-2 hours)
- B14: Remove dead code (1 hour)

### Do Third (Hours 20-40): Fix user-facing issues
- B1: COPPA consent at signup (4-6 hours)
- A5: Account deletion backend (8-12 hours)
- B5: N+1 tab badge fix (2-3 hours)
- B7: Add role guards to 23 screens (3-4 hours)
- B6: Dark mode fix or disable (2-4 hours)

### Do Fourth (Hours 40-60): Quality polish
- A4: Host privacy policy URL (1 hour)
- C7: Host terms of service URL (1 hour)
- C4: Move dev artifacts out of repo root (1 hour)
- B10: Verify/migrate engagement tables (2-4 hours)
- B13: Fix empty catch blocks (2-3 hours)

---

## FINAL ASSESSMENT

**The app is impressive in scope and execution.** 45 feature areas for 5 user roles (admin, coach, parent, player, team manager) with real-time chat, game day command center, challenge system, achievement engine, and registration pipeline -- all built by what appears to be a small team. The architecture is clean (Expo Router, Supabase, context-based permissions), the engagement system is deep, and the role-based navigation is well-structured.

**The blockers are all solvable.** There are no fundamental architectural problems. The 10 hard blockers are configuration issues (package name, eas.json, project ID), missing infrastructure (Sentry, OTA updates, account deletion backend), legal compliance (COPPA, privacy policy URL), and code patterns (`.single()` crashes, `.env` exposure, missing route). None require rearchitecting. A focused developer can resolve all blockers in 1-2 weeks.

**Ship recommendation:** Fix Sections A and B, then submit to internal testing. Section C can be addressed during the beta period. The app is ready to meet real users.
