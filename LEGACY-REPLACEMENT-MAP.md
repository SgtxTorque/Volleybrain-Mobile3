# Legacy Replacement Map

Generated during Wiring Audit Phase 1. Zero imports from `_legacy/` found — all files are orphaned dead code.

## Dashboard Replacements

| Legacy File | Replacement File | Status |
|-------------|-----------------|--------|
| `_legacy/PlayerDashboard.tsx` | `components/PlayerHomeScroll.tsx` | SAFE TO DELETE |
| `_legacy/CoachDashboard.tsx` | `components/CoachHomeScroll.tsx` | SAFE TO DELETE |
| `_legacy/ParentDashboard.tsx` | `components/ParentHomeScroll.tsx` | SAFE TO DELETE |
| `_legacy/AdminDashboard.tsx` | `components/AdminHomeScroll.tsx` | SAFE TO DELETE |
| `_legacy/CoachParentDashboard.tsx` | `components/CoachHomeScroll.tsx` (handles both modes) | SAFE TO DELETE |

## Coach-Scroll Replacements

| Legacy File | Replacement File | Status |
|-------------|-----------------|--------|
| `_legacy/coach-scroll/DevelopmentHint.tsx` | `components/coach-scroll/ActionItems.tsx` | SAFE TO DELETE |
| `_legacy/coach-scroll/PendingStatsNudge.tsx` | `components/coach-scroll/ActionItems.tsx` | SAFE TO DELETE |
| `_legacy/coach-scroll/SeasonScoreboard.tsx` | `components/coach-scroll/SeasonLeaderboardCard.tsx` | SAFE TO DELETE |
| `_legacy/coach-scroll/TopPerformers.tsx` | `components/coach-scroll/SeasonLeaderboardCard.tsx` | SAFE TO DELETE |
| `_legacy/coach-scroll/TeamPulse.tsx` | `components/coach-scroll/TeamHealthCard.tsx` | SAFE TO DELETE |
| `_legacy/coach-scroll/RosterAlerts.tsx` | `components/coach-scroll/TeamHealthCard.tsx` | SAFE TO DELETE |

## Other Component Replacements

| Legacy File | Replacement File | Status |
|-------------|-----------------|--------|
| `_legacy/AppDrawer.tsx` | `components/GestureDrawer.tsx` | SAFE TO DELETE |
| `_legacy/payments-admin.tsx` | `app/(tabs)/payments.tsx` + `components/admin-scroll/PaymentSnapshot.tsx` | SAFE TO DELETE |
| `_legacy/game-day-parent.tsx` | `app/game-day-command.tsx` | SAFE TO DELETE |
| `_legacy/auth/league-setup.tsx` | `app/(auth)/signup.tsx` (league_admin path) | SAFE TO DELETE |
| `_legacy/auth/coach-register.tsx` | `app/(auth)/signup.tsx` (coach role path) | SAFE TO DELETE |
| `_legacy/auth/parent-register.tsx` | `app/parent-registration-hub.tsx` + `app/(auth)/signup.tsx` | SAFE TO DELETE |

## Orphaned Components (no replacement, but never imported)

| Legacy File | Notes | Status |
|-------------|-------|--------|
| `_legacy/AnnouncementBanner.tsx` | Only consumer was ParentDashboard (also legacy) | SAFE TO DELETE (orphaned) |
| `_legacy/ParentOnboardingModal.tsx` | Never imported anywhere | SAFE TO DELETE (orphaned) |
| `_legacy/SquadComms.tsx` | Only consumer was PlayerDashboard (also legacy) | SAFE TO DELETE (orphaned) |
| `_legacy/ShoutoutProfileSection.tsx` | Never imported anywhere | SAFE TO DELETE (orphaned) |

## Summary

- **Total legacy files:** 21 (.tsx) + 1 (README.md)
- **Files with clear replacements:** 17
- **Orphaned files (no replacement, never imported):** 4
- **Imports from `_legacy/` found in production code:** 0
- **Verdict:** ALL 21 files + README are safe to delete. The entire `_legacy/` folder can be removed.
