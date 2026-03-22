# Sentry Installation — Verification Report

**Date:** 2026-03-17
**Branch:** navigation-cleanup-complete

---

## Verification Results

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 1 | `grep "@sentry/react-native" package.json` | dependency listed | PASS — `"@sentry/react-native": "~7.2.0"` |
| 2 | `grep "sentry" app.json` | plugin entry | PASS — `"@sentry/react-native/expo"` |
| 3 | `grep "Sentry.init" app/_layout.tsx` | initialization | PASS — line 33 |
| 4 | `grep "Sentry.wrap" app/_layout.tsx` | error boundary | PASS — line 255 |
| 5 | `grep "4763807d47d1" app/_layout.tsx` | DSN present | PASS — line 34 |
| 6 | `grep "enabled.*__DEV__" app/_layout.tsx` | dev guard | PASS — `enabled: !__DEV__` at line 39 |
| 7 | `grep "SENTRY_AUTH_TOKEN" eas.json` | env reference | PASS — line 20 |
| 8 | `git diff --stat HEAD~4` | only expected files | PASS — package.json, package-lock.json, app.json, app/_layout.tsx, eas.json |

---

## Commits (in order)

1. `feat: install @sentry/react-native`
2. `feat: add Sentry plugin to app.json`
3. `feat: initialize Sentry crash reporting in root layout`
4. `feat: configure Sentry source map uploads in eas.json`

---

## Remaining Manual Steps (Carlos)

1. Generate Sentry auth token at https://sentry.io/settings/auth-tokens/ (scopes: `project:releases`, `org:read`)
2. Add to EAS Secrets: `eas secret:create --name SENTRY_AUTH_TOKEN --value <the-token>`
3. After that, source maps will upload automatically on production builds

---

## Summary

All 4 Sentry installation tasks completed. All 8 verification checks pass.
Sentry is disabled in development and active in production/preview builds.
