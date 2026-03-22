# PRE-BUILD QA REPORT
## VolleyBrain Mobile — Pre-Build QA Investigation
### Date: 2026-03-19 | Branch: navigation-cleanup-complete

---

## PART 1: BUG INVESTIGATION (5 Reported Bugs)

---

### BUG 1: Player shows "No Team Yet" when player IS on a team (REGRESSION)

**Root cause:** When an admin/coach uses the role switcher to view as "player", `DashboardRouter.loadPlayerChildren()` calls `resolveLinkedPlayerIds(user.id)` using the **admin's auth UID** — not a player's ID. Admins/coaches typically have no entries in `player_guardians`, `players.parent_account_id`, or `player_parents`, so `resolveLinkedPlayerIds` returns an empty array. The player children list comes back empty, `selectedChildId` stays `null`, and `PlayerHomeScroll` receives `playerId={null}`. The hook `usePlayerHomeData(null)` then returns no team data, triggering `!data.primaryTeam` → `'no-team'` → `NoTeamState`.

Additionally, even if player linkages exist, the season filter at `DashboardRouter.tsx:63` (`.eq('season_id', workingSeason.id)`) could eliminate players in a different season.

**File(s):**
- `components/DashboardRouter.tsx:48-83` — `loadPlayerChildren()` resolution chain
- `components/DashboardRouter.tsx:126-128` — devModeRole 'player' case
- `lib/resolve-linked-players.ts:25-73` — resolves via 4 linkage models (all use parent→player links, not self)
- `components/PlayerHomeScroll.tsx:251-255` — emptyState detection `!data.primaryTeam`

**Code snippet (DashboardRouter.tsx:48-63):**
```tsx
const loadPlayerChildren = useCallback(async () => {
  if (!user?.id || !workingSeason?.id) return;
  // ← user.id is the ADMIN's ID, not a player ID
  const allIds = await resolveLinkedPlayerIds(user.id);
  if (allIds.length === 0) {
    setPlayerChildren([]);  // ← empty → selectedChildId stays null
    setPlayerChildrenLoaded(true);
    return;
  }
  const { data: players } = await supabase
    .from('players')
    .select('id, first_name, last_name')
    .in('id', allIds)
    .eq('season_id', workingSeason.id); // ← season filter can eliminate further
```

**Recommended fix:** When `devModeRole === 'player'` and the user has no real player linkages, pick the first player on the user's first team (from `team_staff` or `coaches` table) as a preview player. This matches the web admin's "preview as player" behavior. Alternative: query `players` for any player on a team the admin coaches.

**Complexity:** M
**Connected to other bugs:** Yes — Bug 2 (crash on role switch could stem from null data), Bug 5 (NoTeamState theme)

---

### BUG 2: Role switcher crashes the app

**Root cause:** Most likely a cascading failure from Bug 1 + Bug 4 layering. When switching FROM player view (which shows NoTeamState with null data) BACK to coach/admin, the following race occurs:

1. `setDevViewAs('head_coach')` fires in `RoleSelector.tsx:53`
2. `permissions-context.tsx:155` recalculates `effectiveRoles` → `['head_coach']`
3. `DashboardRouter.tsx:86` `determineDashboard` effect fires — starts async DB queries
4. During the async window, `dashboardType` is still `'player'` but permissions now report `isCoach=true`
5. Components like `PlayerHomeScroll` may try to access stale/null data during this transition
6. If the `FirstTimeTour` modal is also active, two Modals fighting for focus can cause crashes

The comment in `RoleSelector.tsx:55-59` confirms a previous crash was caused by `router.replace` racing with the auth guard. The current fix removed the navigation call, but the underlying async race between `determineDashboard` and state updates remains.

**File(s):**
- `components/RoleSelector.tsx:52-60` — `handleSelectRole` triggers state change
- `components/DashboardRouter.tsx:85-87` — `determineDashboard` effect with async dependencies
- `lib/permissions-context.tsx:155` — effectiveRoles recalculation

**Code snippet (RoleSelector.tsx:52-60):**
```tsx
const handleSelectRole = (roleKey: string) => {
  setDevViewAs(roleKey as any);
  setShowPicker(false);
  // No router.replace needed — DashboardRouter and TabLayout
  // react to viewAs changes automatically via permissions context.
  // Calling router.replace('/(tabs)/') here was triggering a
  // navigation event that could race with the auth guard and
  // redirect to the login screen.
};
```

**Recommended fix:**
1. Add a brief loading state in DashboardRouter when `viewAs` changes (debounce the transition)
2. Wrap `determineDashboard` async logic with cancellation to prevent stale updates
3. Ensure `FirstTimeTour` doesn't show when role switching (it checks AsyncStorage, but on first load both modals can fire simultaneously)

**Complexity:** M
**Connected to other bugs:** Yes — Bug 1 (null data), Bug 3 (hooks), Bug 4 (modal stacking)

---

### BUG 3: "Rendered fewer hooks than expected" React error

**Root cause:** Investigation found **no early-return-before-hooks violations** in the 5 home scroll components. All use the correct pattern: hooks declared at top, conditional rendering via JSX ternaries.

However, the error is most likely triggered by one of these secondary causes:

1. **`FirstTimeTour.tsx:91`** — `if (!visible) return null;` after 7 hooks. This is AFTER all hooks, so it's safe when `visible` transitions from `true→false`. BUT: on initial render, if `checkTourStatus` sets `visible=true` asynchronously, React may see an inconsistent hook count during the transition if another component in the same render tree unmounts.

2. **`app/(tabs)/_layout.tsx:162`** — `if (loading) return <ActivityIndicator>` guard is after all hooks. But `useFirstTimeWelcome(primaryRole)` at line 29 is a custom hook whose internal hook count could vary if `primaryRole` changes.

3. **Modal stacking during role transition** — When `AchievementCelebrationModal` and `FirstTimeTour` are both visible (see Bug 4), and then a role switch occurs, React may encounter a hook-count mismatch in child components being unmounted/remounted within the same render cycle.

**File(s):**
- `components/FirstTimeTour.tsx:91` — `if (!visible) return null` (safe but a contributor)
- `app/(tabs)/_layout.tsx:28-29` — `useFirstTimeWelcome(primaryRole)` — NEEDS AUDIT
- All home scroll components: **CLEAN** (no violations found)

**Recommended fix:**
1. Audit `lib/first-time-welcome.ts` for conditional hook calls based on the role parameter
2. Ensure `AchievementCelebrationModal` only renders after `FirstTimeTour` has been dismissed
3. Consider wrapping each dashboard case in `DashboardRouter` with a unique `key` prop to force clean unmount/remount: `<PlayerHomeScroll key="player" />` etc.

**Complexity:** M
**Connected to other bugs:** Yes — Bug 2 (crash), Bug 4 (modal overlap)

---

### BUG 4: Achievement celebration badges have stacked/overlapping images

**Root cause:** Two modals render simultaneously on first load:

1. **`FirstTimeTour`** (`components/FirstTimeTour.tsx`) — checks `AsyncStorage('lynx_has_seen_tour')`. If unset, renders a `<Modal visible animationType="fade">` with "Welcome to Lynx!" and mascot images.

2. **`AchievementCelebrationModal`** (`components/AchievementCelebrationModal.tsx`) — rendered inside `CoachHomeScroll` when `showCelebration && unseenBadges.length > 0`. Uses `<Modal visible animationType="fade" transparent>`.

Both modals fire independently — `FirstTimeTour` from `(tabs)/index.tsx:14` and `AchievementCelebrationModal` from `CoachHomeScroll.tsx:632`. There is no coordination between them.

Because `AchievementCelebrationModal` uses `transparent` mode with a semi-transparent overlay (`rgba(16,40,76,0.88)`), the `FirstTimeTour` content (white background, "Welcome to Lynx!" text, mascot image) **bleeds through** behind the achievement content.

Additionally, `FirstLaunchTour` (`components/FirstLaunchTour.tsx`) uses `zIndex: 999` on a plain View (not a Modal), which could layer on top of both Modals in certain scenarios.

**File(s):**
- `app/(tabs)/index.tsx:13-14` — DashboardRouter + FirstTimeTour side by side
- `components/FirstTimeTour.tsx:94` — `<Modal visible animationType="fade">`
- `components/AchievementCelebrationModal.tsx:260` — `<Modal visible animationType="fade" transparent>`
- `components/CoachHomeScroll.tsx:632-657` — AchievementCelebration rendered
- `components/FirstLaunchTour.tsx:169` — `zIndex: 999` on View overlay

**Code snippet (app/(tabs)/index.tsx):**
```tsx
return (
  <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
    <DashboardRouter />        {/* ← contains AchievementCelebrationModal */}
    <FirstTimeTour onDismiss={handleTourDismiss} />  {/* ← "Welcome to Lynx!" Modal */}
  </SafeAreaView>
);
```

**Recommended fix:**
1. Add a gate: don't show `AchievementCelebrationModal` until `FirstTimeTour` has been dismissed (check `AsyncStorage('lynx_has_seen_tour')` in the achievement check)
2. Make `AchievementCelebrationModal` use a non-transparent Modal with solid background (`#0A0F1A` instead of 88% opacity)
3. Remove `FirstLaunchTour` or convert it to use `<Modal>` instead of `zIndex: 999` View

**Complexity:** S
**Connected to other bugs:** Yes — Bug 3 (hooks during simultaneous modals)

---

### BUG 5: Player empty state has wrong theme colors

**Root cause:** `NoTeamState` hardcodes BRAND (light theme) colors and does NOT use `useTheme()` or accept theme props.

- `NoTeamState.tsx:128` — `backgroundColor: BRAND.offWhite` (white/cream)
- `NoTeamState.tsx:135` — `color: BRAND.navy` (dark navy title)
- `NoTeamState.tsx:139` — `color: BRAND.textMuted` (gray subtitle)
- `NoTeamState.tsx:151` — `backgroundColor: BRAND.skyBlue` (blue button)

But `PlayerHomeScroll` uses a dark theme (`PLAYER_THEME.bg = '#0D1B3E'`). When `NoTeamState` renders inside the player scroll's dark background (via `<View style={{ paddingTop: 80 }}><NoTeamState role="player" /></View>` at line 343), the white-backgrounded NoTeamState card sits on a dark navy background, looking broken.

**File(s):**
- `components/empty-states/NoTeamState.tsx:125-163` — hardcoded BRAND colors
- `components/PlayerHomeScroll.tsx:343` — renders NoTeamState inside dark-themed scroll
- `theme/player-theme.ts` — PLAYER_THEME (dark colors)

**Code snippet (NoTeamState.tsx:125-128):**
```tsx
const s = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: BRAND.offWhite,  // ← hardcoded light color
  },
```

**Recommended fix:** Accept an optional `dark` prop or use `useTheme()` in NoTeamState. When `role='player'`, use PLAYER_THEME colors (dark background, light text). Apply to the container background, title, subtitle, and button colors.

**Complexity:** S
**Connected to other bugs:** Yes — Bug 1 (this empty state IS what Bug 1 shows)

---

## PART 2: PRE-BUILD SWEEP

---

### TASK 1: TypeScript Compilation Check

**Result:** FAIL — 2 unique errors (4 total including duplicates)

**Errors:**
```
app/(auth)/signup.tsx(481,50): error TS2339: Property 'body' does not exist on type FONTS
app/(auth)/signup.tsx(493,52): error TS2339: Property 'body' does not exist on type FONTS
```

**Details:** `FONTS` object has `bodyLight`, `bodyMedium`, `bodySemiBold`, `bodyBold`, `bodyExtraBold`, and `display` — but NOT `body`. Lines 481 and 493 in `signup.tsx` reference `FONTS.body` which doesn't exist.

**Fix:** Replace `FONTS.body` with `FONTS.bodyMedium` or `FONTS.bodyLight`.

---

### TASK 2: Check All Role Guard Files for Hooks Violations

**Result:** PASS — No violations found

All 5 home scroll components use the correct pattern:
- All hooks declared unconditionally at component top
- Loading/empty guards rendered as JSX ternaries (not early returns)

| File | Guard Pattern | Hooks Before Guard | Issue? |
|------|---------------|-------------------|--------|
| PlayerHomeScroll.tsx | JSX ternary (line 335) | All hooks (lines 107-233) | NO |
| CoachHomeScroll.tsx | JSX ternary (line 446) | All hooks (lines 147-328) | NO |
| TeamManagerHomeScroll.tsx | JSX ternary (line 323) | All hooks (lines 124-263) | NO |
| AdminHomeScroll.tsx | JSX ternary (line 197) | All hooks (lines 70-127) | NO |
| ParentHomeScroll.tsx | JSX ternary (line 421) | All hooks (lines 186-324) | NO |

---

### TASK 3: Check New Components for Issues

**Result:** FAIL — 12 issues found

#### TeamManagerHomeScroll.tsx
1. **Silent Supabase failure (line 144-156):** `team_invite_codes` query has no `.catch()` — invite code silently remains empty on error
2. **Multiple `as any` casts (lines 285, 411, 433):** Bypass TypeScript route validation

#### InviteCodeModal.tsx
3. **No validation on empty inviteCode (line 51):** If `inviteCode=""`, user can copy "---" to clipboard
4. **No error handling on Clipboard.setStringAsync (line 21-24):** Permission failure shows "Copied!" falsely
5. **Overly broad Share catch (line 32-34):** Both cancellation and real errors silently swallowed

#### invite-parents.tsx
6. **Silent failure on team_staff query (line 42-48):** Network error → blank screen, no feedback
7. **Silent failure on invite code query (line 54-61):** Same pattern
8. **Unsafe `as any` type assertion (line 51):** `(staffRow as any).teams?.name` — no validation
9. **No error handling on Clipboard/Share (lines 67-82):** Same as InviteCodeModal
10. **Missing loading state UI (line 25-27):** Blank screen while queries load
11-12. **Clipboard operations duplicate code from InviteCodeModal:** Same issues repeated

---

### TASK 4: DashboardRouter Role Path Verification

**Result:** PASS (with notes)

All role paths verified:
- `admin` → AdminHomeScroll ✓
- `coach` → CoachHomeScroll ✓
- `team_manager` → TeamManagerHomeScroll ✓
- `team_manager_setup` → TeamManagerSetupPrompt ✓
- `parent` → ParentHomeScroll ✓
- `coach_parent` → CoachHomeScroll ✓ (dual-role coaches)
- `player` → PlayerHomeScroll ✓ (with child picker flow)
- `default` → ParentHomeScroll ✓

**Note:** `checkIfCoachHasTeams()` at line 177 queries `team_staff` without filtering by `staff_role`, meaning team managers in `team_staff` are also detected as having "coaching" teams. This could cause a TM-only user to see the coach dashboard instead of the TM dashboard if `isCoach` is false but `checkIfCoachHasTeams` returns true. However, this path is only reached when `isTeamManager && !isCoach` is false, so the guard at line 139 prevents this for TM-only users.

---

### TASK 5: Sentry Conditional Import

**Result:** PASS

- `app/_layout.tsx:32-38` — `require('@sentry/react-native')` properly wrapped in `if (!__DEV__)`
- `app/_layout.tsx:252` — `Sentry.wrap()` conditionally applied: `__DEV__ ? RootLayout : require('@sentry/react-native').wrap(RootLayout)`
- No other files import `@sentry/react-native`
- Safe for Expo Go development

---

### TASK 6: Duplicate Import Check

**Result:** FAIL — 15+ files with duplicate module imports

Most are non-breaking (separate import blocks from same module for types vs values), but they add bundle noise and should be consolidated.

**Priority files (functional duplicates):**

| File | Duplicate Module | Lines |
|------|-----------------|-------|
| app/coach-directory.tsx | react-native (TextInput separate) | 24-25 |
| components/PlayerHomeScroll.tsx | @/lib/streak-engine (type + value) | 92-93 |
| components/AchievementCelebrationModal.tsx | @/lib/achievement-types | 6-7 |
| components/GestureDrawer.tsx | @/hooks/useDrawerBadges | 21-22 |
| components/FamilyGallery.tsx | @/hooks/useParentHomeData | 21-22 |

**Lower-priority (type+value split imports — valid but messy):**
- Multiple player-scroll components: `react-native-reanimated` split imports
- `app/achievements.tsx`, `app/challenge-library.tsx`: type imports on separate lines
- `app/(auth)/welcome.tsx`: `ViewToken` type on separate line

---

### TASK 7: Navigation Route Cross-Reference

**Result:** PASS — All routes valid

All 96+ unique routes referenced in `router.push()`, `router.replace()`, and `href` have corresponding `.tsx` files in the `app/` directory. Dynamic routes (`chat/[id]`, `register/[seasonId]`) are properly configured. Tab group navigation uses standard Expo Router patterns.

No orphaned or missing routes found.

---

### TASK 8: Data Hook Null/Undefined Crash Audit

**Result:** FAIL — 10+ HIGH severity null-access risks

**Critical crash points across 6 hooks:**

| Hook | Line | Issue | Severity |
|------|------|-------|----------|
| useCoachHomeData.ts | 297 | Unguarded `.game_result` on lastGame | HIGH |
| useCoachHomeData.ts | 388 | Unguarded `.our_score`/`.opponent_score` on prev matchup | HIGH |
| usePlayerHomeData.ts | 287-300 | eventData properties accessed without existence check | HIGH |
| usePlayerHomeData.ts | 356-368 | `.team_id`/`.team_name` not null-guarded | HIGH |
| useParentHomeData.ts | 246-248 | 3-level deep chain `team.seasons.sports.name` without guards | HIGH |
| useParentHomeData.ts | 403-404 | `teamAff?.child.firstName` when teamAff could be undefined | HIGH |
| useParentHomeData.ts | 845 | `children[0]` when array could be empty | HIGH |
| useLeaderboardData.ts | 165-174 | `row.player` and `row.team` not validated after join | HIGH |
| useLeaderboardData.ts | 227-230 | `categories.find()` returns undefined, used without check | HIGH |
| useAdminHomeData.ts | 359 | `teamsData.find()` returns undefined, `.name` accessed | HIGH |

**N+1 Query in Tab Layout:**
`app/(tabs)/_layout.tsx:95-103` — Loops through channel memberships and fires one Supabase query per channel. Should batch with `.in('channel_id', channelIds)`.

---

## ADDITIONAL FINDING: N+1 in Tab Layout

**File:** `app/(tabs)/_layout.tsx:80-103`

```tsx
for (const m of memberships) {
  const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', m.channel_id)    // ← one query per channel
    .eq('is_deleted', false)
    .gt('created_at', m.last_read_at || '1970-01-01');
  totalUnread += (count || 0);
}
```

This runs on every tab mount and on every real-time event. With 10 channels, that's 10 sequential queries. Should be replaced with a single batch query or RPC.

---

## SUMMARY TABLE

| # | Issue | Severity | File(s) | Fix Complexity | Blocks Build? |
|---|-------|----------|---------|----------------|---------------|
| B1 | Player "No Team Yet" in role preview | P0 | DashboardRouter, resolve-linked-players | M | YES — broken feature |
| B2 | Role switcher crash | P0 | RoleSelector, DashboardRouter, permissions-context | M | YES — app crash |
| B3 | "Fewer hooks" React error | P0 | FirstTimeTour, _layout, DashboardRouter | M | YES — red screen crash |
| B4 | Achievement + Welcome modal overlap | P1 | index.tsx, AchievementCelebrationModal, FirstTimeTour | S | NO — cosmetic but jarring |
| B5 | NoTeamState wrong theme on player dark BG | P1 | NoTeamState.tsx | S | NO — cosmetic |
| T1 | TypeScript `FONTS.body` doesn't exist | P1 | signup.tsx:481,493 | S | NO — runtime fallback |
| T3a | Silent Supabase failures in new components | P2 | TeamManagerHomeScroll, InviteCodeModal, invite-parents | S | NO |
| T3b | Clipboard/Share no error handling | P2 | InviteCodeModal, invite-parents | S | NO |
| T6 | 15+ files with duplicate imports | P3 | Various | S | NO — cosmetic |
| T8 | 10+ null-access crash risks in data hooks | P1 | useCoachHomeData, usePlayerHomeData, useParentHomeData, etc. | M | YES — potential crashes |
| N+1 | Tab layout N+1 unread count query | P2 | _layout.tsx:95-103 | S | NO — performance |

---

## PRIORITY ORDER FOR FIXES

### P0 — Must fix before build (3 items)
1. **Bug 1+5 (linked):** Fix player preview data resolution + NoTeamState dark theme
2. **Bug 2+3 (linked):** Fix role switching race condition + modal coordination
3. **Bug 4:** Gate achievement modal behind tour completion

### P1 — Must fix before beta users (3 items)
4. **T8:** Add null guards to 10 crash-prone data hook locations
5. **T1:** Fix `FONTS.body` → `FONTS.bodyMedium` in signup.tsx
6. **Bug 4 polish:** Make achievement modal use solid background

### P2 — Fix soon (3 items)
7. **T3a/T3b:** Add error handling to new components
8. **N+1:** Batch unread count query in tab layout
9. **T6:** Consolidate duplicate imports

### P3 — Backlog (1 item)
10. **T6 remainder:** Clean up type/value split imports
