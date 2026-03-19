# DUPLICATE-IMPORT-REPORT.md
# Lynx Mobile — Duplicate Import & Syntax Error Sweep

**Date:** 2026-03-19
**Classification:** INVESTIGATION ONLY — no files were modified.

---

## Files With Issues

### `app/web-features.tsx`
**Issue:** Duplicate import — exact same line appears twice
**Lines:** 4, 5
**Duplicate text:** `import { FONTS } from '@/theme/fonts';`
**Fix:** Remove line 5

### `app/season-progress.tsx`
**Issue:** Split import from same module — `TouchableOpacity` imported separately from `react-native` when it should be in the existing multi-line import block
**Lines:** 10-18 (main `react-native` import), 20 (separate `TouchableOpacity` import)
**Duplicate text:**
- Line 10-18: `import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';`
- Line 20: `import { TouchableOpacity } from 'react-native';`
**Fix:** Add `TouchableOpacity` to the import block on lines 10-18, remove line 20
**Severity:** Low — this is valid syntax and won't crash Metro, but is messy

---

## Files Verified Clean

### Recently Modified Files (all verified clean)
- `app/venue-manager.tsx` — Clean (duplicate was already fixed in prior commit)
- `app/coach-availability.tsx` — Clean
- `app/coach-profile.tsx` — Clean
- `app/attendance.tsx` — Clean
- `app/volunteer-assignment.tsx` — Clean
- `app/blast-composer.tsx` — Clean
- `app/blast-history.tsx` — Clean
- `app/game-day-command.tsx` — Clean
- `app/lineup-builder.tsx` — Clean
- `app/evaluation-session.tsx` — Clean
- `app/coach-challenge-dashboard.tsx` — Clean
- `app/game-prep-wizard.tsx` — Clean
- `app/coach-directory.tsx` — Clean
- `app/challenge-library.tsx` — Clean
- `app/player-evaluations.tsx` — Clean
- `app/player-evaluation.tsx` — Clean
- `app/player-goals.tsx` — Clean
- `app/(tabs)/coaches.tsx` — Clean
- `components/ReportViewerScreen.tsx` — Clean
- `components/ReportsScreen.tsx` — Clean
- `components/empty-states/NoOrgState.tsx` — Clean
- `components/empty-states/NoTeamState.tsx` — Clean
- `components/empty-states/EmptySeasonState.tsx` — Clean
- `components/TeamManagerHomeScroll.tsx` — Clean
- `components/InviteCodeModal.tsx` — Clean
- `components/DashboardRouter.tsx` — Clean
- `components/GestureDrawer.tsx` — Clean
- `app/invite-parents.tsx` — Clean
- `app/(auth)/signup.tsx` — Clean
- `app/_layout.tsx` — Clean
- `app/parent-registration-hub.tsx` — Clean

### Sweep Results (all app/ and components/ .tsx/.ts files)
- No duplicate `import { FONTS }` (except web-features.tsx)
- No duplicate `import { BRAND }`
- No duplicate `import { Ionicons }`
- No duplicate `import { useRouter }`
- No duplicate `import { useAuth }`
- No duplicate `import { useTheme }`
- No duplicate `import { usePermissions }`
- No duplicate `import { supabase }`
- No duplicate `import React`
- No duplicate `import { StyleSheet }`
- No duplicate `export default`
- No shadowed useRouter imports (same symbol from different sources)

---

## Summary

- **Total files checked:** All .tsx/.ts files in app/ and components/ (~200+ files)
- **Files with issues:** 2
  - 1 exact duplicate import (`web-features.tsx` — will crash Metro)
  - 1 split import from same module (`season-progress.tsx` — valid but messy)
- **Total duplicate imports found:** 1 (exact duplicate) + 1 (split import)
- **Other syntax issues:** 0
- **Duplicate export defaults:** 0
- **Shadowed imports:** 0
