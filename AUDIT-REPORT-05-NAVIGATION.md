# AUDIT REPORT 05 -- NAVIGATION

**Auditor:** Claude Opus 4.6
**Date:** 2026-03-17
**Branch:** `navigation-cleanup-complete`
**Scope:** Complete navigation map, dead ends, role guards, navigation params

---

## SEVERITY DEFINITIONS

| Level | Label | Meaning |
|-------|-------|---------|
| P0 | BLOCKER | Will crash or is unusable |
| P1 | CRITICAL | Core flow broken |
| P2 | MAJOR | Feature does not work correctly |
| P3 | MINOR | Rough edges |
| P4 | NICE-TO-HAVE | Polish |

---

## 5A. COMPLETE NAVIGATION MAP

### Tab Bar Configuration

**File:** `app/(tabs)/_layout.tsx`

| Tab # | Name | Visible For | Route |
|-------|------|-------------|-------|
| 1 | Home | ALL roles | `index` |
| 2a | Manage | Admin only | `manage` |
| 2b | Game Day | Coach / Player (not admin, not parent-only, not TM-only) | `gameday` |
| 2c | Schedule | Parent only (not admin, not coach, not TM) | `parent-schedule` |
| 2d | Journey | Player mode only | `journey` |
| 2e | Schedule | TM only (not admin, not coach) | `coach-schedule` |
| 3 | Chat | ALL roles | `chats` |
| 4 | More | ALL roles (opens GestureDrawer) | `menu-placeholder` |

**Hidden tabs** (accessible via drawer or deep links, `href: null`):
`connect`, `me`, `parent-chat`, `parent-team-hub`, `parent-my-stuff`, `coach-chat`, `coach-team-hub`, `coach-my-stuff`, `admin-schedule`, `admin-chat`, `admin-teams`, `admin-my-stuff`, `schedule`, `messages`, `coach-roster`, `players`, `teams`, `coaches`, `payments`, `reports-tab`, `settings`, `my-teams`, `jersey-management`

### Drawer Menu Items

**File:** `components/GestureDrawer.tsx`

| Section | Role Gate | Items (route) |
|---------|-----------|---------------|
| Quick Access | ALL | `/(tabs)`, `/(tabs)/schedule`, `/(tabs)/chats`, `/(tabs)/connect` |
| Admin Tools | admin | `/registration-hub`, `/users`, `/(tabs)/payments`, `/payment-reminders`, `/team-management`, `/(tabs)/jersey-management`, `/coach-directory`, `/season-settings`, `/season-setup-wizard`, `/(tabs)/reports-tab`, `/admin-search`, `/org-directory`, `/season-archives`, `/blast-composer`, `/blast-history`, `/venue-manager`, `/coach-background-checks`, `/volunteer-assignment`, `/web-features` (x3), `/bulk-event-create`, `/org-settings` |
| Game Day | admin + coach | `/(tabs)/coach-schedule`, `/game-day-command`, `/game-prep`, `/lineup-builder`, `/attendance`, `/game-results`, `/game-results?view=recap` |
| Coaching Tools | admin + coach | `/evaluation-session`, `/coach-challenge-dashboard`, `/challenge-library`, `/player-goals`, `/blast-composer`, `/blast-history`, `/coach-availability`, `/coach-profile`, `/(tabs)/my-teams`, `/(tabs)/players` |
| Team Operations | team_manager | `/(tabs)/players`, `/(tabs)/coach-schedule`, `/(tabs)/payments`, `/attendance`, `/volunteer-assignment`, `/coach-engagement`, `/blast-composer`, `/blast-history` |
| My Family | parent | `/my-kids`, `/parent-registration-hub`, `/family-payments`, `/my-waivers`, `/my-stats`, `/achievements`, `/invite-friends` |
| My Stuff | player | `/(tabs)/my-teams`, `/my-stats`, `/my-stats?scrollToEvals=true`, `/player-card`, `/challenges`, `/achievements`, `/season-progress`, `/invite-friends` |
| Settings & Privacy | ALL | `/profile`, `/(tabs)/settings`, `/notification`, `/notification-preferences`, `/season-archives`, `/org-directory`, `/privacy-policy`, `/terms-of-service`, `/help`, `/data-rights` |

### Push Notification Routing

**File:** `app/_layout.tsx` (lines 85-158)

| Notification Type | Route (Admin) | Route (Coach) | Route (Parent) | Route (Player/Default) |
|-------------------|---------------|---------------|----------------|------------------------|
| `chat` | `/chat/{channelId}` or `/(tabs)/chats` | same | same | same |
| `schedule` | `/(tabs)/coach-schedule` | `/(tabs)/coach-schedule` | `/(tabs)/parent-schedule` | `/(tabs)/schedule` |
| `payment` | `/(tabs)/payments` | `/(tabs)` | `/family-payments` | `/(tabs)` |
| `blast` | `/(tabs)/chats` | same | same | same |
| `registration` | `/registration-hub` | `/(tabs)` | `/parent-registration-hub` | `/(tabs)` |
| `game` / `game_reminder` | `/game-prep?eventId=X` | same | `/(tabs)/gameday` | `/(tabs)/gameday` |
| `challenge_*` | `/coach-challenge-dashboard` | same | `/challenge-cta?challengeId=X` or `/challenges` | same as parent |
| default | `/(tabs)` | same | same | same |

### Deep Links / URL Scheme

**File:** `app.json` (line 8)

```json
"scheme": "lynx"
```

The app uses Expo Router file-based routing. All routes in `app/` are automatically exposed as deep link targets under the `lynx://` scheme. There is no explicit deep link configuration beyond the scheme declaration.

### Onboarding Routes

**File:** `lib/onboarding-router.ts`

| Path | Route |
|------|-------|
| `already_set_up` | `/(tabs)` |
| `claim_account` | `/claim-account` |
| `registration_link` | `/register/{seasonId}` |
| `invite_code` | `/parent-registration-hub` |
| `cold` | `/parent-registration-hub` |

### Redirect Screens (Route Compatibility)

| File | Redirects To |
|------|--------------|
| `app/game-prep.tsx` | `/game-prep-wizard` (or `/game-day-command` if `startLive`) |
| `app/game-recap.tsx` | `/game-results?view=recap` |
| `app/roster.tsx` | `/(tabs)/players?teamId=X` |
| `app/team-roster.tsx` | `/(tabs)/players?teamId=X` |

---

## 5B. DEAD ENDS -- MISSING ROUTES

### NAV-01: `/team-hub` route does not exist

| Field | Value |
|-------|-------|
| **Severity** | **P0 -- BLOCKER** |
| **File** | `components/player-scroll/PlayerTeamHubCard.tsx:64` |
| **Code** | `router.push(\`/team-hub?teamId=${teamId}\` as any)` |
| **Problem** | No file `app/team-hub.tsx` exists. The glob `app/**/team-hub*` returns zero results. When a player taps "Team Hub" from their home scroll, the app will navigate to a non-existent route, which in Expo Router shows a blank "Unmatched route" error screen. |
| **Fix** | Create `app/team-hub.tsx` as a redirect to `/(tabs)/connect?teamId=X`, or change the push to `/(tabs)/connect`. The coach equivalent uses `/(tabs)/coach-team-hub` and the parent equivalent uses `/(tabs)/parent-team-hub`. |

### NAV-02: Dynamic routes from admin-search and admin-search-results are unchecked

| Field | Value |
|-------|-------|
| **Severity** | **P3 -- MINOR** |
| **File** | `app/admin-search.tsx:197`, `app/admin-search-results.tsx:99` |
| **Code** | `router.push(result.route as any)` / `router.push(\`${result.navigateTo}${qs}\` as any)` |
| **Problem** | These push to dynamically computed routes from search results. If the `navigateTo` or `route` field on a search result object contains an invalid route, navigation will fail silently or show a blank screen. |
| **Fix** | Add a validation check before pushing: verify the route starts with a known prefix (`/`, `/(tabs)/`). Low risk since routes are computed server-side and are unlikely to be invalid, but defensive coding is warranted. |

### NAV-03: `notification-inbox` accessed from player home only via push notification bell

| Field | Value |
|-------|-------|
| **Severity** | **P4 -- NICE-TO-HAVE** |
| **File** | `components/PlayerHomeScroll.tsx:285` |
| **Code** | `router.push('/notification-inbox' as any)` |
| **Problem** | `/notification-inbox` and `/notification` are two completely different screens. The drawer routes to `/notification` for all roles. The `PlayerHomeScroll` uniquely routes to `/notification-inbox`. This is not a bug (both files exist) but creates a confusing inconsistency -- the player sees a different notification screen than other roles. |
| **Fix** | Consolidate to a single notification screen, or make the routing intentionally different with clear UX distinction. |

---

## 5C. ROLE GUARDS

### Summary of Guard Status

**Screens WITH role guards (return early / show fallback for unauthorized users):**

| Screen | Guard | File |
|--------|-------|------|
| `app/users.tsx` | `isAdmin` check at line 53 | Admin only |
| `app/registration-hub.tsx` | `isAdmin` check at line 176 | Admin only |
| `app/team-management.tsx` | `isAdmin` check at line 63 | Admin only |
| `app/season-settings.tsx` | `isAdmin` check at line 86 | Admin only |
| `app/payment-reminders.tsx` | `isAdmin` check at line 51 | Admin only |
| `app/org-settings.tsx` | `isAdmin` check at line 136 | Admin only |
| `app/coach-background-checks.tsx` | `isAdmin` check at line 287 | Admin only |
| `app/bulk-event-create.tsx` | `isAdmin` check at line 299 | Admin only |
| `app/season-setup-wizard.tsx` | `isAdmin` check at line 260 | Admin only |
| `app/admin-search.tsx` | `isAdmin` check at line 221 | Admin only |
| `app/season-reports.tsx` | `isAdmin` check at line 182 | Admin only |
| `app/(tabs)/manage.tsx` | `isAdmin` check at line 310 | Admin only |
| `app/(tabs)/jersey-management.tsx` | `isAdmin` check at line 326 | Admin only |
| `app/(tabs)/admin-teams.tsx` | `isAdmin` check at line 346 | Admin only |
| `app/(tabs)/payments.tsx` | uses `isAdmin`, `isParent`, `isTeamManager` | Role-aware rendering |
| `app/(tabs)/connect.tsx` | uses role to determine team context | Role-aware rendering |

### NAV-04: Coach/admin screens with NO role guard

| Field | Value |
|-------|-------|
| **Severity** | **P2 -- MAJOR** |
| **Problem** | The following screens are intended for coaches/admins but have NO `usePermissions()` call and NO role guard. A parent or player who navigates to these URLs (via deep link `lynx://game-day-command`, or via browser URL on web) will see the full screen. |

**Affected screens (no guard):**

| Screen | Intended For | File |
|--------|-------------|------|
| `/game-day-command` | Coach/Admin | `app/game-day-command.tsx` |
| `/game-prep-wizard` | Coach/Admin | `app/game-prep-wizard.tsx` |
| `/lineup-builder` | Coach/Admin | `app/lineup-builder.tsx` |
| `/attendance` | Coach/Admin | `app/attendance.tsx` |
| `/game-results` | Coach/Admin (also parent view) | `app/game-results.tsx` |
| `/evaluation-session` | Coach/Admin | `app/evaluation-session.tsx` |
| `/player-evaluation` | Coach/Admin | `app/player-evaluation.tsx` |
| `/player-evaluations` | Coach/Admin | `app/player-evaluations.tsx` |
| `/coach-challenge-dashboard` | Coach/Admin | `app/coach-challenge-dashboard.tsx` |
| `/create-challenge` | Coach/Admin | `app/create-challenge.tsx` |
| `/challenge-library` | Coach/Admin | `app/challenge-library.tsx` |
| `/coach-engagement` | Coach/Admin/TM | `app/coach-engagement.tsx` |
| `/coach-availability` | Coach | `app/coach-availability.tsx` |
| `/coach-profile` | Coach | `app/coach-profile.tsx` |
| `/blast-composer` | Coach/Admin/TM | `app/blast-composer.tsx` |
| `/blast-history` | Coach/Admin/TM | `app/blast-history.tsx` |
| `/volunteer-assignment` | Coach/Admin/TM | `app/volunteer-assignment.tsx` |
| `/venue-manager` | Admin | `app/venue-manager.tsx` |
| `/coach-directory` | Admin | `app/coach-directory.tsx` |
| `/(tabs)/reports-tab` | Admin | `app/(tabs)/reports-tab.tsx` (delegates to `ReportsScreen` which also has no guard) |
| `/(tabs)/admin-schedule` | Admin | `app/(tabs)/admin-schedule.tsx` (re-exports `coach-schedule`) |
| `/(tabs)/coaches` | Admin | `app/(tabs)/coaches.tsx` |
| `/(tabs)/coach-roster` | Coach/Admin | `app/(tabs)/coach-roster.tsx` |

**Fix:** Add a role guard to each screen. Pattern to follow (from `app/users.tsx`):
```tsx
const { isAdmin } = usePermissions();
// ... loading state ...
if (!isAdmin) {
  return (
    <SafeAreaView>
      <Text>Admin access required</Text>
      <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
        <Text>Go Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
```

### NAV-05: Deep link bypass -- parent can reach admin screens

| Field | Value |
|-------|-------|
| **Severity** | **P2 -- MAJOR** |
| **Problem** | Because the app scheme is `lynx`, and Expo Router auto-registers all files in `app/` as deep link routes, a user can open `lynx://venue-manager`, `lynx://game-day-command`, `lynx://bulk-event-create`, etc. directly. Since most of these screens have no role guard (see NAV-04), any role can access admin/coach functionality. Even screens WITH guards only show a soft "access required" message and a home button -- they do not redirect automatically. |
| **Fix** | (1) Add role guards to all screens per NAV-04. (2) Consider adding a middleware/guard at the root `_layout.tsx` level that checks route + role before rendering. (3) For guarded screens, use `router.replace('/(tabs)')` instead of rendering a static fallback, so the user is immediately sent home. |

### NAV-06: Role change mid-session does not force re-navigation

| Field | Value |
|-------|-------|
| **Severity** | **P3 -- MINOR** |
| **File** | `components/GestureDrawer.tsx:269-277` |
| **Problem** | When a user switches roles via the drawer pills (`handleRoleSwitch`), the code calls `router.push('/(tabs)')` to navigate home. However, if the user is already on an admin screen (e.g., `/users`) and switches to "Parent" role, the currently mounted screen is NOT unmounted or re-checked. The user remains on the admin screen until they manually navigate away. The tab bar updates correctly (hiding/showing tabs), but the current screen content remains visible. |
| **Fix** | In `handleRoleSwitch`, use `router.replace('/(tabs)')` instead of `router.push('/(tabs)')` to clear the stack. Additionally, screens with role guards should re-evaluate on `viewAs` change (most do since `usePermissions()` is reactive). |

---

## 5D. NAVIGATION PARAMS

### Screens Using `useLocalSearchParams()`

| Screen | Expected Params | Missing Param Behavior |
|--------|----------------|----------------------|
| `app/(auth)/redeem-code.tsx` | `code?: string` | OK -- optional, falls through to manual entry |
| `app/attendance.tsx` | `eventId?: string` | OK -- optional, screen handles missing param |
| `app/admin-search-results.tsx` | `q: string` | **NAV-07** |
| `app/challenge-detail.tsx` | `challengeId: string` | **NAV-08** |
| `app/achievements.tsx` | `playerId?: string` | OK -- optional, uses current user fallback |
| `app/challenge-celebration.tsx` | `challengeName?, xpEarned?, badgeTitle?, badgeIcon?, challengeId?` | OK -- all optional with fallbacks |
| `app/challenge-cta.tsx` | `challengeId: string` | **NAV-08** |
| `app/chat/[id].tsx` | `id?: string` | Handled -- redirects to chats list if missing |
| `app/evaluation-session.tsx` | `teamId?: string` | OK -- optional, uses coach team hook fallback |
| `app/game-results.tsx` | `eventId?, view?, playerId?` | OK -- all optional |
| `app/child-detail.tsx` | `playerId?: string` | **NAV-09** |
| `app/game-day-command.tsx` | `matchId?, eventId?, teamId?, opponent?` | OK -- all optional |
| `app/game-recap.tsx` | `eventId?, playerId?` | OK -- redirect screen |
| `app/engagement-leaderboard.tsx` | `teamId: string` | **NAV-10** |
| `app/complete-profile.tsx` | `playerId: string, seasonId: string` | **NAV-11** |
| `app/coach-engagement.tsx` | `teamId: string` | **NAV-10** |
| `app/create-challenge.tsx` | `templateId?: string` | OK -- optional |
| `app/lineup-builder.tsx` | `eventId?, teamId?` | OK -- optional with team hook fallback |
| `app/game-prep.tsx` | `eventId?, teamId?, startLive?` | OK -- redirect screen |
| `app/game-prep-wizard.tsx` | `eventId?, teamId?` | OK -- optional with fallbacks |
| `app/player-card.tsx` | `playerId?, childId?` | OK -- optional, uses current user |
| `app/my-stats.tsx` | `highlightStat?, playerId?, scrollToEvals?` | OK -- all optional |
| `app/player-evaluations.tsx` | `playerId?, teamId?, mode?, sessionId?, sessionPlayersJson?` | OK -- optional with defaults |
| `app/player-goals.tsx` | `playerId: string` | **NAV-08** |
| `app/player-evaluation.tsx` | `playerId?, teamId?` | OK -- optional |
| `app/privacy-policy.tsx` | `fromSignup?: string` | OK -- optional |
| `app/roster.tsx` | `teamId?: string` | OK -- redirect screen |
| `app/register/[seasonId].tsx` | `seasonId: string` | OK -- file-based param, always present |
| `app/season-progress.tsx` | `playerId?: string` | OK -- optional |
| `app/skill-module.tsx` | `nodeId?, skillContentId?, nodeTitle?` | **NAV-12** |
| `app/team-gallery.tsx` | `teamId?, teamName?` | OK -- optional |
| `app/(tabs)/players.tsx` | `teamId?: string` | OK -- optional |
| `app/team-roster.tsx` | `teamId?: string` | OK -- redirect screen |
| `app/team-wall.tsx` | `teamId?: string` | OK -- optional |
| `app/terms-of-service.tsx` | `fromSignup?: string` | OK -- optional |
| `app/web-features.tsx` | `featureName?, description?, webUrl?` | OK -- placeholder screen |
| `components/ReportViewerScreen.tsx` | `reportId: string, reportName: string` | **NAV-08** |

### NAV-07: `admin-search-results` crashes on missing `q` param

| Field | Value |
|-------|-------|
| **Severity** | **P3 -- MINOR** |
| **File** | `app/admin-search-results.tsx:74` |
| **Code** | `const { q } = useLocalSearchParams<{ q: string }>();` |
| **Problem** | If navigated to without `q` param (e.g., via deep link `lynx://admin-search-results`), `q` will be `undefined`. The screen likely attempts to search with an undefined query, which may produce empty results or a runtime error. |
| **Fix** | Add a guard: if `!q`, show an error state or redirect to `/admin-search`. |

### NAV-08: Required params with no fallback

| Field | Value |
|-------|-------|
| **Severity** | **P3 -- MINOR** |
| **Files** | `app/challenge-detail.tsx:160`, `app/challenge-cta.tsx:92`, `app/player-goals.tsx:74`, `components/ReportViewerScreen.tsx:46` |
| **Problem** | These screens declare required params (`challengeId: string`, `playerId: string`, `reportId: string`) but do not guard against undefined values. If deep-linked without params, the Supabase query will use `undefined` as a filter value, returning no data or erroring. |
| **Fix** | Add early return with error message when required param is missing:
```tsx
if (!challengeId) return <ErrorState message="Missing challenge ID" />;
```

### NAV-09: `child-detail` with missing `playerId`

| Field | Value |
|-------|-------|
| **Severity** | **P3 -- MINOR** |
| **File** | `app/child-detail.tsx:95` |
| **Code** | `const { playerId } = useLocalSearchParams<{ playerId?: string }>();` |
| **Problem** | While typed as optional, the entire screen depends on `playerId` to fetch player data. If accessed without it (deep link), the screen shows a loading spinner indefinitely or an empty state. |
| **Fix** | Add an explicit guard: if `!playerId`, show an error or redirect to `/my-kids`. |

### NAV-10: `engagement-leaderboard` and `coach-engagement` with missing `teamId`

| Field | Value |
|-------|-------|
| **Severity** | **P3 -- MINOR** |
| **Files** | `app/engagement-leaderboard.tsx:151`, `app/coach-engagement.tsx:45` |
| **Problem** | Both screens declare `teamId: string` as required but have no fallback if it is undefined. Queries will fail silently. |
| **Fix** | Add guard for missing `teamId`. |

### NAV-11: `complete-profile` with missing required params

| Field | Value |
|-------|-------|
| **Severity** | **P3 -- MINOR** |
| **File** | `app/complete-profile.tsx:83` |
| **Code** | `const { playerId, seasonId } = useLocalSearchParams<{ playerId: string; seasonId: string }>();` |
| **Problem** | Both params are required for the screen to function. No guard exists for missing params. |
| **Fix** | Add early return if either param is missing. |

### NAV-12: `skill-module` with missing params

| Field | Value |
|-------|-------|
| **Severity** | **P3 -- MINOR** |
| **File** | `app/skill-module.tsx:53` |
| **Code** | `const { nodeId, skillContentId, nodeTitle } = useLocalSearchParams<{...}>();` |
| **Problem** | The screen needs at least `skillContentId` to load content. No guard for missing params. |
| **Fix** | Add guard; redirect to `/(tabs)/journey` if params are missing. |

---

## 5E. ADDITIONAL FINDINGS

### NAV-13: `router.back()` on tab screens has no parent to go back to

| Field | Value |
|-------|-------|
| **Severity** | **P3 -- MINOR** |
| **File** | `app/(tabs)/my-teams.tsx:335` |
| **Code** | `<TouchableOpacity onPress={() => router.back()}>` |
| **Problem** | `my-teams` is a hidden tab accessible via drawer. If the user navigates to it directly (e.g., from drawer as first navigation), `router.back()` has no prior screen in the stack. On iOS this results in a no-op; on Android the app may close or behave unexpectedly. |
| **Fix** | Use `router.canGoBack() ? router.back() : router.replace('/(tabs)')` pattern, or ensure a back button always falls back to home. |

### NAV-14: `(tabs)/coaches.tsx` has no role guard

| Field | Value |
|-------|-------|
| **Severity** | **P2 -- MAJOR** |
| **File** | `app/(tabs)/coaches.tsx` |
| **Problem** | This screen displays all coaches with their contact info (email, phone). It has NO `usePermissions()` call. Any role can access it via deep link `lynx://coaches` or by typing the URL. This is a data privacy concern. |
| **Fix** | Add `isAdmin` guard. |

### NAV-15: N+1 query in tab bar badge computation

| Field | Value |
|-------|-------|
| **Severity** | **P3 -- MINOR** |
| **File** | `app/(tabs)/_layout.tsx:93-103` |
| **Problem** | The unread chat count is computed by iterating over all channel memberships and issuing one query per channel (`for (const m of memberships)`). This is an N+1 query pattern that fires every time the tab bar mounts or receives a real-time event. For users in many channels, this can be slow and generate excessive Supabase requests. |
| **Fix** | Use a single aggregated query or a Supabase RPC function that returns the total unread count. |

### NAV-16: Drawer `resolveRoute` only handles `Schedule` label

| Field | Value |
|-------|-------|
| **Severity** | **P4 -- NICE-TO-HAVE** |
| **File** | `components/GestureDrawer.tsx:454-461` |
| **Problem** | The `resolveRoute` function only maps the "Schedule" label to role-specific schedule tabs. If new role-specific routes are added in the future, this pattern will need manual updating. |
| **Fix** | Consider a more generalized route resolution approach, or document the pattern clearly. |

### NAV-17: `(tabs)/messages.tsx` exists but is never navigated to

| Field | Value |
|-------|-------|
| **Severity** | **P4 -- NICE-TO-HAVE** |
| **File** | `app/(tabs)/messages.tsx` |
| **Problem** | This tab is registered in the layout (`<Tabs.Screen name="messages" options={{ href: null }} />`) but no `router.push` or drawer item points to `/(tabs)/messages`. It appears to be a legacy screen (notification center for parents). |
| **Fix** | Remove or mark as deprecated if unused. |

---

## FINDINGS SUMMARY

| ID | Severity | Category | Description |
|----|----------|----------|-------------|
| NAV-01 | **P0** | Dead End | `/team-hub` route does not exist -- player tap crashes |
| NAV-04 | **P2** | Role Guard | 23 coach/admin screens have NO role guard |
| NAV-05 | **P2** | Role Guard | Deep link bypass allows parent/player to reach admin screens |
| NAV-14 | **P2** | Role Guard | `(tabs)/coaches.tsx` exposes contact info without guard |
| NAV-02 | **P3** | Dead End | Dynamic routes from admin search are unchecked |
| NAV-06 | **P3** | Role Guard | Role switch mid-session does not force re-navigation |
| NAV-07 | **P3** | Params | `admin-search-results` no fallback for missing `q` |
| NAV-08 | **P3** | Params | 4 screens with required params have no fallback |
| NAV-09 | **P3** | Params | `child-detail` depends on `playerId` with no guard |
| NAV-10 | **P3** | Params | `engagement-leaderboard` and `coach-engagement` missing `teamId` guard |
| NAV-11 | **P3** | Params | `complete-profile` missing both required param guards |
| NAV-12 | **P3** | Params | `skill-module` missing content param guard |
| NAV-13 | **P3** | Dead End | `router.back()` on tab screens may have no parent |
| NAV-15 | **P3** | Performance | N+1 query for unread chat badge in tab bar |
| NAV-03 | **P4** | Inconsistency | Two separate notification screens used inconsistently |
| NAV-16 | **P4** | Maintainability | Drawer `resolveRoute` only handles one label |
| NAV-17 | **P4** | Cleanup | `(tabs)/messages.tsx` is orphaned / never navigated to |

---

## TOTALS

| Severity | Count |
|----------|-------|
| P0 -- BLOCKER | 1 |
| P1 -- CRITICAL | 0 |
| P2 -- MAJOR | 3 |
| P3 -- MINOR | 9 |
| P4 -- NICE-TO-HAVE | 3 |
| **TOTAL** | **16** |

---

## RECOMMENDED FIX ORDER

1. **NAV-01 (P0):** Create `app/team-hub.tsx` redirect or fix push target -- immediate fix, one file.
2. **NAV-04 + NAV-05 + NAV-14 (P2):** Add role guards to all 23+ unguarded screens. This is a bulk operation but follows an established pattern. Prioritize screens that expose sensitive data: `coaches` (contact info), `payments`, `evaluation-session`, `blast-composer`.
3. **NAV-06 (P3):** Change `router.push` to `router.replace` in `handleRoleSwitch`.
4. **NAV-07 through NAV-12 (P3):** Add param guards to 9 screens -- straightforward defensive coding.
5. **NAV-13 (P3):** Add `canGoBack()` fallback to screens accessible from drawer.
6. **NAV-15 (P3):** Refactor unread count to a single batch query.
7. **NAV-03, NAV-16, NAV-17 (P4):** Clean up at leisure.
