# CC-SENTRY-INSTALL.md
# LYNX — Sentry Crash Reporting Installation (EXECUTION SPEC)
# Classification: EXECUTE — Follow exactly. No improvisation.

---

## EXECUTIVE DIRECTIVE

This spec installs and configures Sentry crash reporting for the Lynx mobile app. After this spec is complete, every crash in production will be captured with full stack traces, device info, and breadcrumbs.

**You will change ONLY the files listed below. Nothing else.**

---

## MANDATORY PRE-READ

Before touching any code, read:
- `CC-LYNX-RULES.md`
- `AGENTS.md`
- `app.json` (current state after launch blocker fixes)
- `app/_layout.tsx` (current state)
- `package.json` (current state)
- `eas.json` (current state)

---

## RULES

1. **Change ONLY the files explicitly listed in each task.** If a file is not listed, do not open it for editing.
2. **Do NOT refactor, rename, reorganize, or "improve" anything** beyond the exact changes specified.
3. **Do NOT modify any existing component logic, navigation, styles, or Supabase queries.**
4. **Do NOT touch any file in `_archive/`, `reference/`, or `node_modules/`.**
5. **Commit after EACH task** with the exact commit message specified.
6. **If anything is unclear or ambiguous, STOP and ask.** Do not guess.

---

## SENTRY CONFIGURATION VALUES

These are confirmed and approved by Carlos:

```
DSN: https://4763807d47d1b126ad6816b08bc0b248@o4511061021884416.ingest.us.sentry.io/4511061069070337
Organization: lynx-mn
Project: react-native
```

---

## TASK 1: Install @sentry/react-native
**Commit message:** `feat: install @sentry/react-native`

Run:
```bash
npx expo install @sentry/react-native
```

**Why `npx expo install` instead of `npm install`:** Expo's installer ensures the version is compatible with the current Expo SDK (54). Do NOT use `npm install` directly.

### Verify:
- `package.json` should now list `@sentry/react-native` in dependencies
- No other dependencies should have changed (expo install may update related peer deps — that's fine)

### DO NOT:
- Install any other packages
- Run `npx expo prebuild`
- Modify any source files in this task

### Commit this task before moving to Task 2.

---

## TASK 2: Add Sentry plugin to app.json
**Commit message:** `feat: add Sentry plugin to app.json`

### File: `app.json`

Find the `"plugins"` array. It currently looks something like:
```json
"plugins": [
  "expo-router",
  [
    "expo-splash-screen",
    {
      ...splash config...
    }
  ],
  "@react-native-community/datetimepicker",
  "expo-audio",
  "expo-calendar"
]
```

Add the Sentry plugin entry at the END of the plugins array (before the closing `]`):

```json
  "expo-calendar",
  [
    "@sentry/react-native/expo",
    {
      "organization": "lynx-mn",
      "project": "react-native"
    }
  ]
```

The full plugins array should now end with:
```json
"plugins": [
  "expo-router",
  [
    "expo-splash-screen",
    { ...existing splash config... }
  ],
  "@react-native-community/datetimepicker",
  "expo-audio",
  "expo-calendar",
  [
    "@sentry/react-native/expo",
    {
      "organization": "lynx-mn",
      "project": "react-native"
    }
  ]
]
```

### DO NOT:
- Change any other field in app.json
- Remove or reorder any existing plugins
- Add the DSN to app.json (it goes in the code, not config)

### Commit this task before moving to Task 3.

---

## TASK 3: Initialize Sentry in app/_layout.tsx
**Commit message:** `feat: initialize Sentry crash reporting in root layout`

### File: `app/_layout.tsx`

**Step 3a: Add the import at the top of the file.**

Find the existing imports at the top of the file. Add this import AFTER the other imports but BEFORE any other code:

```typescript
import * as Sentry from '@sentry/react-native';
```

Place it near the other library imports (after the React Native / Expo imports, before the local `@/` imports). For example, after the `react-native-gesture-handler` import line.

**Step 3b: Add the Sentry.init() call.**

Find this line (should be near the top of the file, after imports):
```typescript
SplashScreen.preventAutoHideAsync();
```

Add the Sentry initialization IMMEDIATELY BEFORE that line:

```typescript
Sentry.init({
  dsn: 'https://4763807d47d1b126ad6816b08bc0b248@o4511061021884416.ingest.us.sentry.io/4511061069070337',
  tracesSampleRate: 0.2,
  _experiments: {
    profilesSampleRate: 0.1,
  },
  enabled: !__DEV__,
  debug: false,
});

SplashScreen.preventAutoHideAsync();
```

**Explanation of config:**
- `dsn`: Carlos's Sentry project connection string (confirmed)
- `tracesSampleRate: 0.2`: Captures performance traces for 20% of transactions (keeps within free tier limits)
- `profilesSampleRate: 0.1`: Lightweight profiling for 10% of transactions
- `enabled: !__DEV__`: Sentry is OFF during development (no noise in the dashboard from dev testing). Crashes only report in production/preview builds.
- `debug: false`: No Sentry debug logging in console

**Step 3c: Wrap the root export with Sentry.**

Find the default export at the bottom of the file. It currently looks like:

```typescript
export default function RootLayout() {
```

Change it to:

```typescript
function RootLayout() {
```

Then find the very end of the file (after the closing `}` of `RootLayout`) and add:

```typescript
export default Sentry.wrap(RootLayout);
```

This wraps the entire app in Sentry's error boundary, which catches unhandled JS errors that would otherwise crash the app silently.

### DO NOT:
- Move or change the `SplashScreen.preventAutoHideAsync()` call
- Modify the `RootLayoutNav` function
- Change any provider nesting order
- Modify any other logic in _layout.tsx
- Add Sentry.captureException() or Sentry.captureMessage() anywhere — those are future enhancements

### Commit this task before moving to Task 4.

---

## TASK 4: Add Sentry auth token to eas.json for source maps
**Commit message:** `feat: configure Sentry source map uploads in eas.json`

### File: `eas.json`

Source maps allow Sentry to show readable stack traces (actual file names and line numbers) instead of minified gibberish. The Sentry Expo plugin handles uploads automatically during EAS builds IF the auth token is available.

Add an `env` section to the `production` build profile. Find:

```json
"production": {
  "autoIncrement": true
}
```

Replace with:

```json
"production": {
  "autoIncrement": true,
  "env": {
    "SENTRY_AUTH_TOKEN": "@sentry-auth-token"
  }
}
```

The `@sentry-auth-token` syntax tells EAS to read from EAS Secrets. Carlos will need to:
1. Generate an auth token at https://sentry.io/settings/auth-tokens/ (select `project:releases` and `org:read` scopes)
2. Add it to EAS Secrets: `eas secret:create --name SENTRY_AUTH_TOKEN --value <the-token>`

This does NOT need to happen right now — builds will work fine without it, source maps just won't be uploaded until the secret is configured. Crashes will still be captured, they'll just show minified file names until the auth token is set.

### DO NOT:
- Change the `development` or `preview` profiles
- Change the `submit` section
- Add the actual auth token value to the file (it must be in EAS Secrets, never in code)

### Commit this task before moving to Verification.

---

## FINAL VERIFICATION

After all tasks are committed, verify:

1. **Package check:** `grep "@sentry/react-native" package.json` — should show the dependency
2. **Plugin check:** `grep "sentry" app.json` — should show the plugin entry
3. **Init check:** `grep "Sentry.init" app/_layout.tsx` — should show the initialization
4. **Wrap check:** `grep "Sentry.wrap" app/_layout.tsx` — should show the error boundary wrapper
5. **DSN check:** `grep "4763807d47d1" app/_layout.tsx` — should show the DSN (partial match)
6. **Dev guard check:** `grep "enabled.*__DEV__" app/_layout.tsx` — should confirm Sentry is disabled in dev
7. **Source map check:** `grep "SENTRY_AUTH_TOKEN" eas.json` — should show the env reference
8. **No other changes:** `git diff --stat HEAD~4` — should show only `package.json`, `package-lock.json`, `app.json`, `app/_layout.tsx`, and `eas.json`

Write verification results to `SENTRY-INSTALL-VERIFICATION.md` and commit with message: `verify: Sentry installation verification complete`

---

## TOTAL CHANGES SUMMARY

| Task | Files Changed | Type |
|------|--------------|------|
| 1 | `package.json`, `package-lock.json` | Dependency install |
| 2 | `app.json` | Plugin config |
| 3 | `app/_layout.tsx` | SDK initialization |
| 4 | `eas.json` | Build config |

**Total files modified:** 4 (+ package-lock.json auto-updated)
**New components:** 0
**New screens:** 0
**Logic changes:** 0 (only additive initialization code)

---

## WHAT THIS ENABLES

After this spec is complete:
- Every unhandled JS error in production/preview builds will be captured in Sentry
- Crash reports will include: stack trace, device info (OS, model), app version, breadcrumbs (navigation events)
- Carlos can view all crashes at https://lynx-mn.sentry.io
- Source maps will upload automatically once Carlos adds the SENTRY_AUTH_TOKEN to EAS Secrets
- Sentry is completely silent during development (no console noise, no dashboard noise)
