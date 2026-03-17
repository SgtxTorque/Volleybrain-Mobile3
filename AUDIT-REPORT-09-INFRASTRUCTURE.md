# AUDIT REPORT 09 -- INFRASTRUCTURE & CODE HEALTH

**Date:** 2026-03-17
**Auditor:** Claude Opus 4.6
**Scope:** Dependencies, TypeScript health, code hygiene, crash reporting, environment/secrets
**App:** Lynx (VolleyBrain Mobile) -- Expo SDK 54, React Native 0.81.5

---

## Executive Summary

The codebase runs on current Expo SDK 54 with React Native 0.81, which is excellent. However, several **ship-blocking** issues exist: the `.env` file containing the Supabase anon key is committed to git history, there is zero crash reporting or analytics instrumentation, there are 925 uses of the `any` type creating a large surface for runtime crashes, and approximately 100 root-level development artifact files (CC-*.md, AUDIT-*.md, CODEX-*.md, etc.) are checked in. Android permissions are duplicated in app.json. The `react-native-web` and `react-dom` packages are unnecessary dead weight for a mobile-only app.

| Severity | Count |
|----------|-------|
| P0 BLOCKER | 2 |
| P1 CRITICAL | 3 |
| P2 MAJOR | 4 |
| P3 MINOR | 6 |
| P4 NICE-TO-HAVE | 4 |
| **Total** | **19** |

---

## 9A. Dependency Audit

### Package Overview

| Package | Version | Status |
|---------|---------|--------|
| expo | ~54.0.33 | Current (SDK 54) |
| react | 19.1.0 | Current |
| react-native | 0.81.5 | Current (New Architecture enabled) |
| typescript | ~5.9.2 | Current |
| @supabase/supabase-js | ^2.89.0 | Current |
| react-native-reanimated | ~4.1.1 | Current |
| react-native-gesture-handler | ~2.28.0 | Current |

### Findings

#### INFRA-01: `react-native-web` and `react-dom` are unnecessary
- **Severity:** P3 MINOR
- **Files:** `package.json` (lines 49, 59)
- **Details:** `react-native-web` (~0.21.0) and `react-dom` (19.1.0) are listed as dependencies but the app is mobile-only. No `.tsx`/`.ts` file imports from `react-native-web` or `react-dom`. The `app.json` has a `"web"` section with output config and favicon, but this is not the shipping target. These add ~2MB to `node_modules` and create unnecessary bundle concerns.
- **Recommendation:** Remove both packages and the `"web"` section from `app.json`. If web support is planned for the future, re-add when needed.

#### INFRA-02: `react-native-keyboard-aware-scroll-view` is unmaintained
- **Severity:** P3 MINOR
- **Package:** `react-native-keyboard-aware-scroll-view` ^0.9.5
- **Details:** This package has not received a meaningful update since 2021. It is used in only 2 files (`app/register/[seasonId].tsx`, `app/complete-profile.tsx`). The React Native community has largely moved to alternatives like `react-native-keyboard-controller` or the built-in `KeyboardAvoidingView`.
- **Recommendation:** Replace with `react-native-keyboard-controller` (actively maintained, Reanimated-based) or use Expo's built-in keyboard handling. Only 2 files need updating.

#### INFRA-03: `react-native-signature-canvas` relies on WebView
- **Severity:** P4 NICE-TO-HAVE
- **Package:** `react-native-signature-canvas` ^5.0.2
- **Details:** This package wraps a WebView to render a signature pad. It depends on `react-native-webview` which is also in the dependency list. Used in `components/SignaturePad.tsx` and `components/FullScreenSignatureModal.tsx`. Functional, but the WebView approach has performance overhead and occasional rendering quirks. There are native alternatives.
- **Recommendation:** Acceptable for launch. Consider replacing with a native canvas approach post-launch if signature UX becomes a user complaint.

#### INFRA-04: `@expo/ngrok` is a dev-only tool in production dependencies
- **Severity:** P4 NICE-TO-HAVE
- **Package:** `@expo/ngrok` ^4.1.3
- **Details:** ngrok is a tunneling tool used only during development for testing against external devices. It should be in `devDependencies`, not `dependencies`. No source code imports it.
- **Recommendation:** Move to `devDependencies`.

#### INFRA-05: Both `expo-audio` and `expo-av` are installed
- **Severity:** P3 MINOR
- **Details:** `expo-audio` (~1.1.1) is the newer replacement for `expo-av` (~16.0.8). Both are installed. `expo-audio` is used in `app/chat/[id].tsx`, and `expo-av` is used in `components/PhotoViewer.tsx`. Having both increases bundle size.
- **Recommendation:** Consolidate to `expo-av` (which handles both audio and video) or migrate fully to `expo-audio` for audio and keep `expo-av` only if video playback is needed.

#### INFRA-06: Duplicate Android permissions in app.json
- **Severity:** P3 MINOR
- **File:** `app.json` (lines 23-31)
- **Details:** The Android permissions array contains exact duplicates:
  ```
  "android.permission.RECORD_AUDIO"    (appears twice)
  "android.permission.MODIFY_AUDIO_SETTINGS"  (appears twice)
  "android.permission.READ_CALENDAR"   (appears twice)
  "android.permission.WRITE_CALENDAR"  (appears twice)
  ```
  This does not cause a build error, but it is sloppy and could confuse reviewers during app store submission.
- **Recommendation:** Remove the duplicate permission entries.

#### INFRA-07: `com.anonymous.Lynx` Android package name
- **Severity:** P2 MAJOR
- **File:** `app.json` (line 33)
- **Details:** The Android package name is `com.anonymous.Lynx`. This is the Expo default placeholder. For a real app store submission, this must be a proper reverse-domain identifier (e.g., `com.volleybrain.lynx`). Once published with this package name, it cannot be changed without creating a new listing.
- **Recommendation:** Change to a proper package name before first production build.

#### INFRA-08: No `eas.json` configuration
- **Severity:** P2 MAJOR
- **Details:** No `eas.json` file exists. This file configures EAS Build profiles (development, preview, production) and EAS Submit settings. Without it, there is no defined build pipeline, no environment variable strategy for production vs development, and no over-the-air update configuration.
- **Recommendation:** Create `eas.json` with at minimum `development`, `preview`, and `production` build profiles. Configure environment variables per profile.

---

## 9B. TypeScript Health

### Configuration

The `tsconfig.json` is well configured:
- **Extends:** `expo/tsconfig.base` (correct for Expo SDK 54)
- **Strict mode:** Enabled (`"strict": true`)
- **Path aliases:** `@/*` mapped to `./*`
- **Excludes:** `reference/`, `design-reference/`, `_archive/` (good)
- **Typed routes:** Enabled in `app.json` experiments
- **React Compiler:** Enabled in `app.json` experiments

### Findings

#### INFRA-09: Zero `@ts-ignore` or `@ts-nocheck` directives
- **Severity:** (informational -- GOOD)
- **Details:** No files contain `@ts-ignore` or `@ts-nocheck`. This is excellent and unusual for a codebase this size.

#### INFRA-10: 925 occurrences of `any` type across 263 files
- **Severity:** P1 CRITICAL
- **Details:** Despite `"strict": true` in tsconfig, the codebase contains 925 uses of the `any` type across 263 files. Each `any` is a potential runtime crash because TypeScript cannot verify correct property access or function calls. The worst offenders:

  | File | `any` count |
  |------|-------------|
  | `components/TeamWall.tsx` | 30 |
  | `app/my-stats.tsx` | 30 |
  | `hooks/useParentHomeData.ts` | 25 |
  | `lib/reports.ts` | 22 |
  | `app/(tabs)/coach-schedule.tsx` | 22 |
  | `app/(tabs)/manage.tsx` | 21 |
  | `app/(tabs)/gameday.tsx` | 20 |
  | `components/ReportViewerScreen.tsx` | 19 |
  | `app/game-results.tsx` | 13 |
  | `hooks/useCoachEngagement.ts` | 11 |
  | `app/child-detail.tsx` | 11 |
  | `app/register/[seasonId].tsx` | 11 |
  | `hooks/useJourneyPath.ts` | 10 |
  | `hooks/useGlobalSearch.ts` | 10 |
  | `lib/leaderboard-engine.ts` | 10 |
  | `components/journey/ChapterEnvironment.tsx` | 10 |

- **Recommendation:** Prioritize typing the top 10 worst files. Focus on hooks (useParentHomeData, useCoachEngagement, useGlobalSearch) and data-heavy screens (my-stats, gameday, game-results) where runtime property access on `any` is most likely to cause crashes. A realistic pre-launch target: reduce to under 200 by typing the top offenders.

---

## 9C. Code Hygiene

### Console Statements

#### INFRA-11: 328 console statements across 120 files; ~60 are NOT gated by `__DEV__`
- **Severity:** P2 MAJOR
- **Details:** The codebase has 328 `console.log/warn/error` calls across 120 `.ts/.tsx` files (excluding `reference/` and `_archive/`). The majority (~268) are properly gated with `if (__DEV__)`. However, approximately **60 statements are ungated** and will execute in production. The worst offenders in `lib/`:

  | File | Ungated console calls |
  |------|----------------------|
  | `lib/notifications.ts` | 10 (error logging for push registration, volunteer blast, auto-blast, RSVP, unread count) |
  | `lib/media-utils.ts` | 9 (log/error for upload pipeline -- exposes URIs and blob sizes in prod) |
  | `lib/quest-engine.ts` | 6 (error logging for quest fetch/insert/complete) |
  | `lib/auth.tsx` | 7 (warn/error for profile queries, push token, auth init) |
  | `lib/chat-utils.ts` | 3 (error for chat creation) |
  | `lib/team-context.tsx` | 2 (error for team selection) |
  | `lib/streak-engine.ts` | 2 (error for streak operations) |
  | `lib/sport.tsx` | 1 |

- **Impact in production:** `lib/media-utils.ts` is especially concerning -- it logs URIs and blob sizes during upload. `lib/auth.tsx` logs email addresses during dev auth bypass (though the bypass itself is `__DEV__`-gated, the console.warn at line 169 for profile query failure is not).
- **Recommendation:** Wrap all production console calls in `if (__DEV__)` guards, or better yet, create a `logger` utility that no-ops in production. The `lib/media-utils.ts` upload logs should be the first to be gated.

### TODO/FIXME/HACK Comments

#### INFRA-12: 3 TODO comments in source code (non-reference)
- **Severity:** P4 NICE-TO-HAVE
- **Details:**
  1. `app/player-card.tsx:222` -- `TODO: screenshot share` (share functionality stub)
  2. `components/gameday/SummaryPage.tsx:153` -- `TODO: Phase 7B -- replay pendingActions to Supabase` (offline sync)
  3. `components/coach-scroll/GamePlanCard.tsx:118` -- `TODO: Navigate to chat/DM with missing player's parent when built`
- **Recommendation:** These are all deferred features, not bugs. Acceptable for launch.

### Dead Code

#### INFRA-13: `TapDebugger` component is never imported
- **Severity:** P4 NICE-TO-HAVE
- **File:** `components/TapDebugger.tsx`
- **Details:** This debugging component is defined but never imported by any file. It should be removed or moved to a dev-only location.

#### INFRA-14: Duplicate `RoleSelector` components
- **Severity:** P3 MINOR
- **Files:** `components/RoleSelector.tsx` and `components/ui/RoleSelector.tsx`
- **Details:** Two `RoleSelector` components exist. All imports (`CoachHomeScroll`, `AdminHomeScroll`, `PlayerHomeScroll`, `ParentHomeScroll`, `AppHeaderBar`) reference `components/RoleSelector.tsx` (the root-level one). The `components/ui/RoleSelector.tsx` appears to be unused or an earlier version.
- **Recommendation:** Verify `components/ui/RoleSelector.tsx` is truly unused, then delete it.

#### INFRA-15: `_archive/` directory with old code
- **Severity:** P4 (informational)
- **Files:** `_archive/parity-sprint-b/` (3 files: `StreakBanner.tsx`, `payments-parent.tsx`, `payments.tsx`)
- **Details:** Properly excluded from tsconfig. No issue, but should be cleaned up before launch to reduce repo size.

### Development Artifacts in Root

#### INFRA-16: ~100+ development artifact files committed to repository root
- **Severity:** P2 MAJOR
- **Details:** The repository root is severely cluttered with development artifacts that should not ship:

  | Category | Count | Examples |
  |----------|-------|---------|
  | CC-*.md (Claude Code specs) | ~90+ | CC-WAVE-0-CLEANUP.md through CC-TEAM-MANAGER-SPEC3-SETUP-WIZARD.md |
  | AUDIT-*.md | 6 | AUDIT-GLOSSARY.md, AUDIT-PARENT-JOURNEYS.md, etc. |
  | CLAUDE-*.md | 10 | CLAUDE-UX-NAVIGATION-MAP.md, CLAUDE-UX-AUDIT-FINAL.md, etc. |
  | CODEX-*.md | 17 | CODEX-TRUE-STATE-*.md, CODEX-UX-*.md |
  | *_PARITY_AUDIT.md | 4 | PARENT_PARITY_AUDIT.md, COACH_PARITY_AUDIT.md, etc. |
  | Other audits/specs | 5 | MOBILE-APP-AUDIT.md, WIRING-AUDIT-REPORT.md, PLATFORM-PARITY.md, etc. |
  | ChatGPT/GPT files | 2 | "ChatGPT convo about Lynx UXUI.md", "GPT TRUE-STATE AUDIT SPEC.md" |
  | CLAUDE-CODE-*.md | 1 | CLAUDE-CODE-STABILIZATION-EXECUTION-PLAN.md |
  | SQL files | 1 | LYNX-BADGE-SEED-250.sql |
  | Text files | 2 | structure.txt, tsc_check_output.txt |
  | SCHEMA_REFERENCE.csv | 1 | |
  | CC-*.md in app/ dir | 1 | app/CC-COACH-HOME-D-REDESIGN.md |
  | Audit archive dir | 1 dir (8 files) | audit archive claude 20260311/ |

  **Total: ~140+ non-source files** in the repository root and first-level directories.

- **Impact:** These files:
  - Make the repository look unprofessional to any reviewer (app store review teams, investors, new developers)
  - Increase clone time and repo size
  - Could confuse automated tooling
  - The ChatGPT conversation file may contain sensitive context
- **Recommendation:** Move all development artifacts to a `docs/` or `.dev-notes/` directory and add to `.gitignore`, or delete them entirely. At minimum, add `CC-*.md`, `AUDIT-*.md`, `CLAUDE-*.md`, `CODEX-*.md`, `*_PARITY_AUDIT.md` to `.gitignore`.

### Test Coverage

#### INFRA-17: Zero test files in the project
- **Severity:** P2 MAJOR (post-launch concern, not a ship blocker for v1)
- **Details:** There are no `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files anywhere in the project source (only in `node_modules/`). No test framework (Jest, Vitest) is configured in `devDependencies`. There is no CI pipeline visible.
- **Recommendation:** Not necessarily blocking for a v1 launch, but critical for ongoing maintenance. Add at minimum: unit tests for data hooks (useParentHomeData, useCoachHomeData), integration tests for auth flow, and snapshot tests for critical screens.

---

## 9D. Crash Reporting & Analytics

#### INFRA-18: ZERO crash reporting or analytics instrumentation
- **Severity:** P0 BLOCKER
- **Details:** There is no crash reporting SDK installed. Specifically:
  - **No Sentry** (`@sentry/react-native`)
  - **No Bugsnag** (`@bugsnag/react-native`)
  - **No Firebase Crashlytics** (`@react-native-firebase/crashlytics`)
  - **No Datadog** or any other error monitoring

  There is also no analytics SDK:
  - **No Amplitude**
  - **No Mixpanel**
  - **No PostHog**
  - **No Firebase Analytics**

  The only monitoring-adjacent item found was a reference to analytics in the web admin code (`reference/` directory) -- not in the mobile app itself.

- **Impact:** When the app ships:
  - You will have **zero visibility** into crashes. Users will silently experience errors and churn.
  - You will have **no data** on which features are used, where users drop off, or what the adoption curve looks like.
  - When bugs are reported, you will have no stack traces, breadcrumbs, or device info to diagnose them.
  - App Store review can reject apps that crash without you knowing in advance.

- **Recommendation:** This is the single highest-priority item in this audit. Before any production build:
  1. Install `@sentry/react-native` (free tier covers 5K errors/month, sufficient for launch)
  2. Configure Sentry in `app/_layout.tsx` with the Expo Sentry plugin
  3. Add source map uploads to your EAS build config
  4. For analytics, consider PostHog (generous free tier, self-hostable) or Amplitude
  5. Estimated effort: 2-4 hours for Sentry, 4-8 hours for basic analytics

---

## 9E. Environment & Secrets

#### INFRA-19: `.env` file is committed to git with Supabase credentials
- **Severity:** P0 BLOCKER
- **Details:**
  - The `.gitignore` only excludes `.env*.local` (line 34). The base `.env` file is **not gitignored**.
  - Git history confirms `.env` was committed in at least 2 commits:
    - `2d3f249` -- "Progress from Copilot session"
    - `4f32439` -- "Phase 0: dev auth bypass + role shortcut on login screen"
  - The `.env` file is currently tracked (`git ls-files` returns `.env`).
  - Contents of `.env`:
    ```
    EXPO_PUBLIC_SUPABASE_URL=https://uqpjvbiuokwpldjvxiby.supabase.co
    EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...  (JWT token)
    EXPO_PUBLIC_DEV_SKIP_AUTH=false
    EXPO_PUBLIC_DEV_USER_EMAIL=
    EXPO_PUBLIC_DEV_USER_PASSWORD=
    ```

  **Mitigating factors:**
  - The Supabase **anon key** is a public key by design -- it is meant to be embedded in client apps. It provides no elevated access; all security comes from Row Level Security (RLS) policies.
  - `EXPO_PUBLIC_*` variables are always bundled into the client app regardless of `.env` being in git.
  - `EXPO_PUBLIC_DEV_SKIP_AUTH` is `false` and the dev email/password fields are empty.

  **Remaining risks:**
  - The `.env` file also serves as a template for dev credentials (`DEV_USER_EMAIL`, `DEV_USER_PASSWORD`). If any developer fills these in and commits, actual passwords enter git history.
  - The file structure signals "secrets go here" to any contributor, increasing the chance of accidentally committing real secrets.
  - There is no `.env.example` to guide developers on what variables are needed.
  - No production vs development environment variable strategy exists (no `eas.json`, no environment-specific `.env` files).

- **Recommendation:**
  1. Add `.env` to `.gitignore` immediately
  2. Run `git rm --cached .env` to stop tracking it
  3. Create `.env.example` with placeholder values (no real keys)
  4. The anon key should be configured via EAS environment variables for production builds
  5. Consider rotating the Supabase anon key if you are concerned about the git history exposure (though as noted, the anon key is public by design)
  6. Create `eas.json` with environment variable configuration per build profile

---

## Summary Table

| ID | Finding | Severity | Category |
|----|---------|----------|----------|
| INFRA-18 | No crash reporting or analytics | P0 BLOCKER | 9D |
| INFRA-19 | .env committed to git | P0 BLOCKER | 9E |
| INFRA-10 | 925 `any` types across 263 files | P1 CRITICAL | 9B |
| INFRA-11 | ~60 ungated console statements in production | P2 MAJOR | 9C |
| INFRA-08 | No eas.json build configuration | P2 MAJOR | 9A |
| INFRA-07 | `com.anonymous.Lynx` package name | P2 MAJOR | 9A |
| INFRA-16 | ~140 development artifact files in repo root | P2 MAJOR | 9C |
| INFRA-17 | Zero test files | P2 MAJOR | 9C |
| INFRA-01 | react-native-web/react-dom unnecessary | P3 MINOR | 9A |
| INFRA-02 | react-native-keyboard-aware-scroll-view unmaintained | P3 MINOR | 9A |
| INFRA-05 | Both expo-audio and expo-av installed | P3 MINOR | 9A |
| INFRA-06 | Duplicate Android permissions | P3 MINOR | 9A |
| INFRA-14 | Duplicate RoleSelector component | P3 MINOR | 9C |
| INFRA-09 | Zero @ts-ignore/@ts-nocheck (GOOD) | P3 (positive) | 9B |
| INFRA-03 | react-native-signature-canvas WebView-based | P4 NICE-TO-HAVE | 9A |
| INFRA-04 | @expo/ngrok in prod dependencies | P4 NICE-TO-HAVE | 9A |
| INFRA-12 | 3 TODO comments | P4 NICE-TO-HAVE | 9C |
| INFRA-13 | TapDebugger component unused | P4 NICE-TO-HAVE | 9C |
| INFRA-15 | _archive/ directory | P4 NICE-TO-HAVE | 9C |

---

## Recommended Fix Order (Pre-Launch)

### Must-do before any production build (1-2 days)
1. **INFRA-18:** Install and configure Sentry crash reporting
2. **INFRA-19:** Remove `.env` from git tracking, add to `.gitignore`, create `.env.example`
3. **INFRA-08:** Create `eas.json` with build profiles
4. **INFRA-07:** Change Android package name from `com.anonymous.Lynx`

### Should-do before launch (2-3 days)
5. **INFRA-11:** Gate all console statements behind `__DEV__` (especially `lib/media-utils.ts`, `lib/notifications.ts`, `lib/auth.tsx`)
6. **INFRA-10:** Type the top 10-15 worst `any` offender files
7. **INFRA-06:** Remove duplicate Android permissions
8. **INFRA-16:** Clean up development artifact files

### Nice-to-have post-launch
9. **INFRA-01:** Remove react-native-web and react-dom
10. **INFRA-02:** Replace react-native-keyboard-aware-scroll-view
11. **INFRA-04:** Move @expo/ngrok to devDependencies
12. **INFRA-05:** Consolidate expo-audio and expo-av
13. **INFRA-14:** Remove duplicate RoleSelector
14. **INFRA-13:** Remove TapDebugger
15. **INFRA-17:** Add test framework and initial test suite

---

*End of Audit Report 09*
