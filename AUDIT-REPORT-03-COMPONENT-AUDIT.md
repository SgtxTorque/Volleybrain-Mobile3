# AUDIT-REPORT-03: Component Audit

**Date:** 2026-03-17
**Auditor:** Claude Opus 4.6
**Branch:** `navigation-cleanup-complete`
**Scope:** All files in `components/` and subdirectories

---

## Severity Definitions

| Severity | Definition |
|----------|------------|
| P0 - BLOCKER | Will crash, expose data |
| P1 - CRITICAL | Core flow broken |
| P2 - MAJOR | Feature doesn't work correctly |
| P3 - MINOR | Rough edges |
| P4 - NICE-TO-HAVE | Polish |

---

## Summary Table

| Component | Path | P0 | P1 | P2 | P3 | P4 | Dead Code? |
|-----------|------|----|----|----|----|-----|-----------|
| DashboardRouter | `components/DashboardRouter.tsx` | 0 | 0 | 1 | 1 | 0 | No |
| GestureDrawer | `components/GestureDrawer.tsx` | 0 | 0 | 1 | 2 | 1 | No |
| AdminHomeScroll | `components/AdminHomeScroll.tsx` | 0 | 0 | 0 | 2 | 1 | No |
| CoachHomeScroll | `components/CoachHomeScroll.tsx` | 0 | 0 | 0 | 2 | 1 | No |
| ParentHomeScroll | `components/ParentHomeScroll.tsx` | 0 | 0 | 1 | 2 | 1 | No |
| PlayerHomeScroll | `components/PlayerHomeScroll.tsx` | 0 | 0 | 1 | 2 | 1 | No |
| FirstLaunchTour | `components/FirstLaunchTour.tsx` | 0 | 1 | 0 | 1 | 0 | **YES** |
| FirstTimeTour | `components/FirstTimeTour.tsx` | 0 | 0 | 1 | 0 | 0 | No |
| GestureDrawer (edge) | (same file) | 0 | 0 | 0 | 1 | 0 | No |
| EmergencyContactModal | `components/EmergencyContactModal.tsx` | 0 | 0 | 0 | 1 | 0 | No |
| ChallengeDetailModal | `components/ChallengeDetailModal.tsx` | 0 | 0 | 0 | 1 | 0 | No |
| CoppaConsentModal | `components/CoppaConsentModal.tsx` | 0 | 0 | 0 | 0 | 1 | No |
| CreateChallengeModal | `components/CreateChallengeModal.tsx` | 0 | 0 | 0 | 0 | 1 | No |
| FullScreenSignatureModal | `components/FullScreenSignatureModal.tsx` | 0 | 0 | 0 | 1 | 0 | No |
| FullScreenWaiverViewer | `components/FullScreenWaiverViewer.tsx` | 0 | 0 | 0 | 0 | 0 | No |
| GameCompletionWizard | `components/GameCompletionWizard.tsx` | 0 | 0 | 0 | 1 | 0 | No |
| StreakMilestoneCelebrationModal | `components/StreakMilestoneCelebrationModal.tsx` | 0 | 0 | 1 | 0 | 0 | No |
| ChildPickerScreen | `components/ChildPickerScreen.tsx` | 0 | 0 | 0 | 1 | 0 | No |
| ImagePreviewModal | `components/ui/ImagePreviewModal.tsx` | 0 | 0 | 0 | 1 | 0 | No |
| TapDebugger | `components/TapDebugger.tsx` | 0 | 0 | 0 | 1 | 0 | **YES** |
| NotificationBell | `components/NotificationBell.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| HexBadge | `components/HexBadge.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| LevelBadge | `components/LevelBadge.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| AnimatedStatBar | `components/AnimatedStatBar.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| AnimatedNumber | `components/AnimatedNumber.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| CircularProgress | `components/CircularProgress.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| PressableCard | `components/PressableCard.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| VolleyballCourt | `components/VolleyballCourt.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| SportSelector | `components/ui/SportSelector.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| RoleSelector (ui/) | `components/ui/RoleSelector.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| collapsible | `components/ui/collapsible.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| icon-symbol | `components/ui/icon-symbol.tsx` | 0 | 0 | 0 | 0 | 0 | Imported by collapsible only |
| themed-text | `components/themed-text.tsx` | 0 | 0 | 0 | 0 | 0 | Imported by collapsible only |
| themed-view | `components/themed-view.tsx` | 0 | 0 | 0 | 0 | 0 | Imported by collapsible only |
| admin-scroll/ClosingMotivation | `components/admin-scroll/ClosingMotivation.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| admin-scroll/QuickActionsGrid | `components/admin-scroll/QuickActionsGrid.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| admin-scroll/SmartQueueCard | `components/admin-scroll/SmartQueueCard.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| admin-scroll/UpcomingEvents | `components/admin-scroll/UpcomingEvents.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| admin-scroll/WelcomeBriefing | `components/admin-scroll/WelcomeBriefing.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| coach-scroll/ActivityFeed | `components/coach-scroll/ActivityFeed.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| coach-scroll/ChallengeQuickCard | `components/coach-scroll/ChallengeQuickCard.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| coach-scroll/EngagementSection | `components/coach-scroll/EngagementSection.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| coach-scroll/PrepChecklist | `components/coach-scroll/PrepChecklist.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| coach-scroll/ScoutingContext | `components/coach-scroll/ScoutingContext.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| coach-scroll/SeasonLeaderboardCard | `components/coach-scroll/SeasonLeaderboardCard.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| coach-scroll/SeasonSetupCard | `components/coach-scroll/SeasonSetupCard.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| coach-scroll/TeamHealthCard | `components/coach-scroll/TeamHealthCard.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| parent-scroll/AthleteCard | `components/parent-scroll/AthleteCard.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| parent-scroll/AthleteCardV2 | `components/parent-scroll/AthleteCardV2.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| parent-scroll/SecondaryEvents | `components/parent-scroll/SecondaryEvents.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| parent-scroll/EventHeroCard | `components/parent-scroll/EventHeroCard.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| empty-states/EmptySeasonState | `components/empty-states/EmptySeasonState.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |
| empty-states/PendingApprovalState | `components/empty-states/PendingApprovalState.tsx` | 0 | 0 | 0 | 0 | 0 | **YES** |

**Totals:** P0: 0 | P1: 1 | P2: 5 | P3: 18 | P4: 7 | Dead code files: 30+

---

## CRITICAL DEEP DIVES

### 1. DashboardRouter.tsx

**File:** `C:\Users\fuent\Desktop\Volleybrain-Mobile3\components\DashboardRouter.tsx`
**Used by:** `app/(tabs)/index.tsx`

#### Role Routing Verification

| Dashboard Type | Role Conditions | Rendered Component | Correct? |
|---|---|---|---|
| `admin` | `isAdmin` or `devModeRole === 'league_admin'` | `<AdminHomeScroll />` | YES |
| `coach` | Coach has teams, no kids | `<CoachHomeScroll />` | YES |
| `team_manager` | TM has active team | `<CoachHomeScroll />` | YES (intentional sharing) |
| `team_manager_setup` | TM with no active team | `<TeamManagerSetupPrompt />` | YES |
| `parent` | Has linked players OR isParent | `<ParentHomeScroll />` | YES |
| `coach_parent` | Coach has teams AND kids | `<CoachHomeScroll />` | YES |
| `player` | isPlayer | `<PlayerHomeScroll />` | YES |
| default | Fallback | `<ParentHomeScroll />` | YES |

#### Findings

- **P2-DR-1: `coach_parent` always shows coach view, never parent view.** Line 221-222: Both `coach` and `coach_parent` render `<CoachHomeScroll />`. A coach who is also a parent has no way to see their parent dashboard from the automatic routing. They must use the role switcher in the drawer to see the parent view. This is a design decision, but it means coach-parents never see their child's status on the home screen without manual role switching.

- **P3-DR-2: `determineDashboard` is an async function called in useEffect but lacks a mounted guard.** Lines 84-86: The `useEffect` calls `determineDashboard()` which is async and sets state. If the component unmounts before the async DB queries complete, React will log a "can't perform a state update on an unmounted component" warning. Not a crash, but generates console noise.

---

### 2. GestureDrawer.tsx

**File:** `C:\Users\fuent\Desktop\Volleybrain-Mobile3\components\GestureDrawer.tsx`
**Used by:** `app/_layout.tsx`

#### Menu Item Route Verification

All routes in `MENU_SECTIONS` were checked. Notable findings:

- **P2-GD-1: `resolveRoute` for Schedule ignores `devViewAs` role.** Line 454-460: The schedule route resolver checks `isParent`, `isCoach`, `isAdmin`, `isTeamManager` from the permissions context. However, these represent the user's *actual* roles, not the `viewAs` role. If an admin who is also a parent uses "View As Parent," clicking "Schedule" still routes to `/(tabs)/coach-schedule` because `isAdmin` is still true. The resolver should check `currentRoleKey` instead of the raw boolean flags.

- **P3-GD-2: Three drawer menu items with `webOnly: true` navigate to `/web-features`.** Lines 114-116: Form Builder, Waiver Editor, Payment Gateway all route to `/web-features`. If this route doesn't exist in the Expo Router file system, tapping them will crash or show a 404. These should be filtered out on mobile or show a "Coming soon" toast instead.

- **P3-GD-3: Badge key `unreadChats` on line 84 -- if badge hook returns 0 for this key, no badge shows, but if the key is misspelled or missing from the hook, `badges[item.badgeKey]` evaluates to `undefined`, and the `> 0` check is falsy. Safe but fragile.** No null check on `badges` object itself at line 930.

- **P4-GD-4: Hardcoded version string `Lynx v1.0.0` on line 965.** Should use `Constants.expoConfig.version` from `expo-constants` for accuracy.

#### Gesture Handler Assessment

The edge swipe and drawer pan gestures are well-structured:
- `edgePan` restricted to `EDGE_SWIPE_ZONE` (25px) from left edge.
- `drawerPan` on the drawer panel itself for closing.
- `pointerEvents` guard prevents touch interception when drawer is closed (lines 597, 606).
- `runOnJS` correctly used for state updates from worklet callbacks.
- Spring config is reasonable (`damping: 22, stiffness: 200, mass: 0.8`).

**No crash risk from Reanimated/Gesture Handler in this component.**

---

### 3. AdminHomeScroll.tsx

**File:** `C:\Users\fuent\Desktop\Volleybrain-Mobile3\components\AdminHomeScroll.tsx`
**Used by:** `DashboardRouter.tsx`

#### Data Fetching
- Uses `useAdminHomeData()` hook -- loading, refreshing, empty states all handled.
- Empty state detection at line 140-144: `loading`, `no-org`, `no-teams` -- all render inside ScrollView (good, avoids gesture handler deregistration).

#### Findings

- **P3-AHS-1: `useGlobalSearch` hook is called unconditionally** (line 72-79). Even when the admin dashboard is unmounted (e.g., user switches to coach view), the cleanup depends on the hook's internal implementation. If the hook has active subscriptions, they may leak.

- **P3-AHS-2: `data.refresh` in `useCallback` dependency array** (line 119). If `data.refresh` is not a stable reference (e.g., recreated each render), `onRefresh` will be recreated every render, defeating the purpose of `useCallback`.

- **P4-AHS-3: Search bar `onBlur` uses `setTimeout(..., 200)` (line 241).** This is a common pattern but creates a race condition: if a preview result is tapped within 200ms of blur, the search dropdown may disappear before the tap registers. This can cause missed taps.

---

### 4. CoachHomeScroll.tsx

**File:** `C:\Users\fuent\Desktop\Volleybrain-Mobile3\components\CoachHomeScroll.tsx`
**Used by:** `DashboardRouter.tsx` (coach, team_manager, coach_parent)

#### Data Fetching
- Uses `useCoachHomeData()` and conditionally `useTeamManagerData()`.
- Team selector allows cycling through multiple teams.
- Empty states: `loading`, `no-org`, `no-teams`.

#### Findings

- **P3-CHS-1: `mascotScale` animation never cleaned up on unmount properly.** Line 297-306: The `cancelAnimation(mascotScale)` is in the cleanup, but `withRepeat(-1, false)` runs indefinitely. The cleanup is correct in principle, but `cancelAnimation` may not fully stop a `withRepeat` in all Reanimated versions. Monitor for "Attempted to use a shared value that has already been freed" errors.

- **P3-CHS-2: Uses `Image` from react-native (line 8) instead of `expo-image` for mascot images.** Lines 369, 463: `require('../assets/images/mascot/HiLynx.png')` is a local asset so the risk is low, but `expo-image` provides better caching and transition behavior. Inconsistent with `GestureDrawer.tsx` which uses `expo-image`.

- **P4-CHS-3: `GiveShoutoutModal` receives `teamId={data.selectedTeamId ?? ''}`.** Line 619: If `selectedTeamId` is null (no team selected yet), the modal receives an empty string. The modal should guard against `teamId === ''` to avoid empty queries.

---

### 5. ParentHomeScroll.tsx

**File:** `C:\Users\fuent\Desktop\Volleybrain-Mobile3\components\ParentHomeScroll.tsx`
**Used by:** `DashboardRouter.tsx` (parent)

#### Findings

- **P2-PHS-1: Potential crash when accessing `data.allChildren[0]` without length check in several places.** Line 468: `data.allChildren.find(c => c.playerId === data.allUpcomingEvents[0]?.childId) || data.allChildren[0] || null` -- while the `|| null` fallback prevents a crash here, other locations like line 203 (`data.children[0].id`) are inside a check for `data.children.length === 0`, but the `!data.childXp` guard on line 203 does not guarantee `data.children.length > 0`. If `data.childXp` is truthy but `data.children` is empty, accessing `data.children[0].id` throws.

- **P3-PHS-2: Message cycling interval on line 308-317 uses `setTimeout` inside `setInterval`.** This works but if the component remounts quickly (e.g., fast role switching), intervals accumulate. The cleanup function returns `clearInterval(interval)` but the inner `setTimeout` may still fire after cleanup.

- **P3-PHS-3: `FamilyPanel` component is always mounted (line 556-565) with `visible={familyPanelOpen}`.** This means the FamilyPanel renders its full tree even when hidden. If it contains expensive data fetching, it should be conditionally rendered (`{familyPanelOpen && <FamilyPanel ... />}`).

- **P4-PHS-4: Many unused styles defined.** Lines 599 (`compactMascot`), 639-715 (welcome section styles, single child card styles, multi-child styles) -- these appear to be leftover from a previous design iteration. They add ~120 lines of dead style code.

---

### 6. PlayerHomeScroll.tsx

**File:** `C:\Users\fuent\Desktop\Volleybrain-Mobile3\components\PlayerHomeScroll.tsx`
**Used by:** `DashboardRouter.tsx` (player)

#### Props Analysis
```typescript
type Props = {
  playerId: string | null;  // Can be null -- guarded
  playerName?: string | null;
  onSwitchChild?: () => void;
};
```

#### Findings

- **P2-PLHS-1: Challenge arrival modal checks `user.id` against `participants.player_id` (line 188).** This is the auth user's ID, not the `playerId` prop. When a parent views a child's player dashboard, `user.id` is the parent's ID, not the child player's ID. This means the challenge arrival modal will never find the player in participants, and the modal will always appear for new challenges even if the child has already joined.

- **P3-PLHS-2: `LEVEL_KEY` uses `playerId` which can be null.** Line 145: `const LEVEL_KEY = \`lynx_player_level_${playerId}\`;` -- if `playerId` is null, the key becomes `lynx_player_level_null`, which is valid but shared across all null-playerId states. The guard on line 148 (`if (data.loading || !playerId || data.level <= 0) return;`) prevents the actual logic from running, so no crash, but the key construction is misleading.

- **P3-PLHS-3: Three quest hooks are always called (`useQuestEngine`, `useWeeklyQuestEngine`, `useTeamQuests`).** Lines 119-121. Even when `data.engagementProfileId` or `data.primaryTeam?.id` is null/undefined, these hooks fire. If they make network requests with null IDs, they should no-op internally. This should be verified in the hook implementations.

- **P4-PLHS-4: Inline styles on child switcher button (lines 371-398).** ~30 lines of inline style objects that could be extracted to the StyleSheet for performance (avoids object recreation on each render).

---

### 7. FirstLaunchTour.tsx vs FirstTimeTour.tsx

#### FirstLaunchTour.tsx
**File:** `C:\Users\fuent\Desktop\Volleybrain-Mobile3\components\FirstLaunchTour.tsx`
**Imported by:** NO FILE -- **DEAD CODE**

- **P1-FLT-1: Not imported anywhere in the codebase.** Grep for `from.*FirstLaunchTour` returns zero results. This component is fully dead code. It uses AsyncStorage key `lynx_tour_completed` which differs from FirstTimeTour's `lynx_has_seen_tour` -- so it cannot conflict. However, having two tour components creates confusion about which one is the "real" one.

- **P3-FLT-2: Uses `Animated` from react-native (line 7), not reanimated.** The `Animated` import is unused in the component body (no `Animated.Value` or `Animated.View` usage). This is a dead import.

#### FirstTimeTour.tsx
**File:** `C:\Users\fuent\Desktop\Volleybrain-Mobile3\components\FirstTimeTour.tsx`
**Imported by:** `app/(tabs)/index.tsx`

- **P2-FTT-1: Image paths reference root `@/assets/images/` directory.** Lines 32-34: `require('@/assets/images/Meet-Lynx.png')`, `require('@/assets/images/HiLynx.png')`, `require('@/assets/images/celebrate.png')`. These files DO exist at those paths (verified). However, the mascot images also exist at `assets/images/mascot/` (duplicates). The CoachHomeScroll and ParentHomeScroll reference the `/mascot/` subdirectory versions. If either set is removed during cleanup, one set of components will break.

---

### 8. Modal Analysis (Open/Close/Block UI)

| Modal | Opens? | Closes? | Blocks UI? | onRequestClose? |
|-------|--------|---------|-----------|-----------------|
| EmergencyContactModal | `visible` prop | Overlay press + X button | No | `onClose` prop |
| ChallengeDetailModal | `visible` prop | X button + `onRequestClose` | No | Yes |
| CoppaConsentModal | Self-managed (line 27) | Submit or Logout | **Intentionally** | No `onRequestClose` |
| CreateChallengeModal | `visible` prop | X button + `onRequestClose` | No | Yes |
| FullScreenSignatureModal | `visible` prop | Cancel button + `onRequestClose` | No | Yes |
| FullScreenWaiverViewer | `visible` prop | Close button + `onRequestClose` | No | Yes |
| GameCompletionWizard | `visible` prop | Overlay press + X + Back | No | Yes |
| StreakMilestoneCelebrationModal | `visible` prop | Dismiss button + `onRequestClose` | No | Yes |
| LevelUpCelebrationModal | `visible` prop | Via onDismiss | Expected | Expected |
| AchievementCelebrationModal | Conditional render | Via onDismiss | Expected | Expected |
| ChallengeArrivalModal | Conditional render | Accept/Dismiss | Expected | Expected |
| GiveShoutoutModal | `visible` prop | Via onClose | Expected | Expected |
| ImagePreviewModal | `visible` prop | Close + Cancel | No | No `onRequestClose` |
| FamilyPanel | `visible` prop | Via onClose | No | Expected |

#### Findings

- **P2-SM-1: StreakMilestoneCelebrationModal uses RN `Animated` (not Reanimated).** Lines 7-9: Uses `import { Animated } from 'react-native'` with `Animated.Value`, `Animated.sequence`, `Animated.spring`, etc. The sparkle system creates 12 animated values (line 44-52), each with position, opacity, and scale. This is ~48 animated values, all using the JS bridge (not native driver... wait, it does set `useNativeDriver: true` at lines 65, 68, 72, etc.). This is correct usage. However, mixing RN Animated with Reanimated elsewhere in the app increases bundle size and can cause conflicts in some Reanimated versions.

- **P3-IM-1: ImagePreviewModal does not have `onRequestClose` on the Modal.** Line 272: `<Modal visible={visible} animationType="slide" presentationStyle="fullScreen">` -- no `onRequestClose`. On Android, the hardware back button will not close this modal, trapping the user.

---

### 9. Dead Code Summary

**30+ files in `components/` are dead code (imported by nothing):**

#### Confirmed Dead (zero imports outside their own file):

| File | Notes |
|------|-------|
| `components/FirstLaunchTour.tsx` | Replaced by FirstTimeTour |
| `components/TapDebugger.tsx` | Debug tool, should be removed |
| `components/NotificationBell.tsx` | Replaced by inline bell in each HomeScroll |
| `components/HexBadge.tsx` | Never imported |
| `components/LevelBadge.tsx` | Never imported |
| `components/AnimatedStatBar.tsx` | Never imported |
| `components/AnimatedNumber.tsx` | Never imported |
| `components/CircularProgress.tsx` | Never imported |
| `components/PressableCard.tsx` | Only imported by TeamWall indirectly (TeamWall imports it, and TeamWall is used) |
| `components/VolleyballCourt.tsx` | Never imported |
| `components/ui/SportSelector.tsx` | Never imported |
| `components/ui/RoleSelector.tsx` | Shadowed by `components/RoleSelector.tsx` -- this is the OLD version |
| `components/ui/collapsible.tsx` | Not imported by app code (only by itself via themed-text/themed-view chain) |
| `components/ui/icon-symbol.tsx` | Only imported by collapsible |
| `components/ui/icon-symbol.ios.tsx` | Only imported by collapsible |
| `components/themed-text.tsx` | Only imported by collapsible |
| `components/themed-view.tsx` | Only imported by collapsible |
| `components/admin-scroll/ClosingMotivation.tsx` | Replaced by AdminAmbientCloser |
| `components/admin-scroll/QuickActionsGrid.tsx` | Replaced by AdminActionPills |
| `components/admin-scroll/SmartQueueCard.tsx` | Replaced by AdminAttentionStrip |
| `components/admin-scroll/UpcomingEvents.tsx` | Replaced by OrgPulseFeed |
| `components/admin-scroll/WelcomeBriefing.tsx` | Replaced by MissionControlHero |
| `components/coach-scroll/ActivityFeed.tsx` | Replaced by CoachPulseFeed |
| `components/coach-scroll/ChallengeQuickCard.tsx` | Never imported |
| `components/coach-scroll/EngagementSection.tsx` | Replaced by CoachEngagementCard |
| `components/coach-scroll/PrepChecklist.tsx` | Replaced by GameDayHeroCard |
| `components/coach-scroll/ScoutingContext.tsx` | Never imported |
| `components/coach-scroll/SeasonLeaderboardCard.tsx` | Never imported |
| `components/coach-scroll/SeasonSetupCard.tsx` | Never imported |
| `components/coach-scroll/TeamHealthCard.tsx` | Never imported |
| `components/parent-scroll/AthleteCard.tsx` | Replaced by FamilyKidCard |
| `components/parent-scroll/AthleteCardV2.tsx` | Replaced by FamilyKidCard |
| `components/parent-scroll/SecondaryEvents.tsx` | Never imported |
| `components/parent-scroll/EventHeroCard.tsx` | Replaced by ParentEventHero |
| `components/empty-states/EmptySeasonState.tsx` | Never imported |
| `components/empty-states/PendingApprovalState.tsx` | Never imported |

**Impact:** These 30+ dead files add ~3,000+ lines of unused code. They increase bundle size, slow IDE indexing, and create confusion about which components are canonical.

---

### 10. Performance Observations

#### Inline Functions in `map()`
Several components pass inline arrow functions inside `.map()` iterations:

- **GestureDrawer.tsx line 675-697:** `rolePills.map((rp) => { ... onPress={() => handleRoleSwitch(rp.key)} })` -- inline closure inside map. Low item count (max 6 pills), so not a real performance concern.

- **CoachHomeScroll.tsx lines 411-425:** Team pills map with `onPress={() => data.selectTeam(team.id)}`. Again, low item count (typically 1-5 teams).

- **GameCompletionWizard.tsx lines 288-327:** Set scores map with multiple `onPress={() => updateSetScore(idx, 'our', 1)}`. Max 5 sets, low risk.

**Verdict:** None of these are performance-significant. The item counts are small enough that memoization overhead would exceed the savings.

#### Missing `useCallback`/`useMemo`
- **ParentHomeScroll.tsx line 321-323:** `onRefresh` uses `useCallback` correctly but depends on `data.refresh`. If `data.refresh` is unstable, this recreates every render.
- **PlayerHomeScroll.tsx lines 119-121:** Three quest hooks called unconditionally. If they run expensive queries when IDs are null, this wastes cycles.

#### Reanimated Shared Values
- All dashboards correctly use `useSharedValue` for scroll position tracking.
- `useDerivedValue` with `runOnJS` for header visibility is used consistently across Admin/Coach/Parent/Player HomeScroll. This is the correct pattern.
- No instances of shared values being accessed outside of worklets without `runOnJS`.

---

### 11. Image Loading Audit

| Component | Image Library | Fallback? | Notes |
|-----------|--------------|-----------|-------|
| GestureDrawer | expo-image | YES (initials gradient) | Lines 647-661: Avatar uses `expo-image` with fallback to initials |
| CoachHomeScroll | RN Image | N/A | Local `require()` for mascot -- no network loading |
| ParentHomeScroll | RN Image | N/A | Local `require()` for mascot |
| ChildPickerScreen | RN Image | YES (initials) | Line 172-179: Photo with initials fallback |
| ImagePreviewModal | RN Image | N/A | Previewing user-selected media, always has URI |
| FirstTimeTour | RN Image | N/A | Local `require()` assets |

**No instances of broken URL handling for network images.** The `expo-image` component used in GestureDrawer handles broken URLs gracefully with its `transition` prop. ChildPickerScreen and other components using `<Image source={{ uri: ... }}>` rely on the RN default behavior (shows blank space on failure, no crash).

---

### 12. TypeScript `any` Usage

| File | Line | Usage | Risk |
|------|------|-------|------|
| GestureDrawer.tsx | 343-344 | `(st: any) => st.teams` | Supabase join result typing -- acceptable |
| GestureDrawer.tsx | 259 | `actualRoles.includes(r.key as any)` | Role key cast -- safe |
| EmergencyContactModal.tsx | 189 | `createStyles = (colors: any)` | Theme colors untyped -- widespread pattern |
| CoppaConsentModal.tsx | 166 | `createStyles = (colors: any)` | Same pattern |
| CreateChallengeModal.tsx | 327 | `createStyles = (colors: any)` | Same pattern |
| GameCompletionWizard.tsx | 545 | `createStyles = (colors: any)` | Same pattern |
| ImagePreviewModal.tsx | Various | `(e) => { ... }` in gesture callbacks | Gesture event types inferred |

**The `colors: any` pattern in `createStyles` is used in ~10+ components.** This should be typed with the theme's color type, but it's a P4 concern -- no runtime risk.

---

## RECOMMENDATIONS

### Must Fix Before Launch (P1-P2)

1. **P1-FLT-1:** Delete `FirstLaunchTour.tsx` -- it is dead code and creates confusion about the tour system.

2. **P2-DR-1:** Coach-parents never see parent dashboard automatically. Either add a banner on CoachHomeScroll showing child status, or make `coach_parent` route to a combined view.

3. **P2-GD-1:** Fix `resolveRoute` in GestureDrawer to use `currentRoleKey` instead of raw `isParent`/`isCoach` booleans for schedule routing.

4. **P2-PHS-1:** Add null guard before `data.children[0].id` access in level-up celebration logic (ParentHomeScroll line 203).

5. **P2-PLHS-1:** Fix challenge arrival modal to use `playerId` prop instead of `user.id` for participant matching.

6. **P2-FTT-1:** Consolidate mascot image paths -- either all reference `/mascot/` subdirectory or all reference root `/images/`. Remove duplicates.

7. **P2-SM-1:** Not a runtime issue, but StreakMilestoneCelebrationModal mixing `Animated` from RN with the rest of the app using Reanimated is an architectural concern to track.

### Should Fix (P3)

8. Delete `TapDebugger.tsx` -- debug tool should not ship to production.
9. Add `onRequestClose` to ImagePreviewModal for Android back button support.
10. Fix `webOnly` menu items in GestureDrawer to show a toast instead of navigating to a potentially missing route.
11. Clean up ~30 dead code files to reduce bundle size and developer confusion.

### Nice to Have (P4)

12. Type `colors: any` in `createStyles` functions across all components.
13. Replace hardcoded `Lynx v1.0.0` with `Constants.expoConfig.version`.
14. Extract inline styles in PlayerHomeScroll child switcher to StyleSheet.
15. Clean up unused styles in ParentHomeScroll (~120 lines).
