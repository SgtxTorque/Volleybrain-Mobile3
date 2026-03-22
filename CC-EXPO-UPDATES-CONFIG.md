# CC-EXPO-UPDATES-CONFIG.md
# LYNX — Configure expo-updates (EXECUTION SPEC)
# Classification: EXECUTE — Follow exactly.

---

## RULES

1. **Change ONLY `app.json`.** No other files.
2. **Do NOT run any install commands.** The package is already installed.
3. **Do NOT modify any existing fields** — only add new ones.

---

## TASK 1: Add updates config and plugin to app.json
**Commit message:** `feat: configure expo-updates for OTA updates`

### File: `app.json`

**Change 1a:** Add the `updates` and `runtimeVersion` sections inside the `"expo"` object. Place them BEFORE the `"experiments"` section:

```json
"updates": {
  "url": "https://u.expo.dev/6dd38119-0c2b-4886-a2f8-26769b1eb675",
  "enabled": true,
  "checkAutomatically": "ON_LOAD",
  "fallbackToCacheTimeout": 3000
},
"runtimeVersion": {
  "policy": "appVersion"
},
```

**Change 1b:** Add `"expo-updates"` to the `"plugins"` array. Add it BEFORE the Sentry plugin entry (which should be the last item). Example final plugins array:

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
  "expo-updates",
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
- Change any existing field values
- Remove or reorder existing plugins
- Modify experiments, android, ios, or any other section
- Touch any file other than app.json

**Change 1c:** Also stage and commit `package.json` and `package-lock.json` since Carlos just ran `npx expo install expo-updates` and those files have changes that need to be committed.

### Commit all changed files with message: `feat: configure expo-updates for OTA updates`

---

## VERIFICATION

1. `grep "expo-updates" app.json` — should show the plugin entry
2. `grep "u.expo.dev" app.json` — should show the updates URL
3. `grep "runtimeVersion" app.json` — should show the policy
4. `grep "expo-updates" package.json` — should show the dependency

Report results and commit verification with message: `verify: expo-updates configuration verified`
