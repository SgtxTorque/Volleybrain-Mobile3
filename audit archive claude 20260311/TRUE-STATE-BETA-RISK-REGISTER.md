# TRUE-STATE-BETA-RISK-REGISTER.md
## Lynx Mobile — Beta Risk Register
### Audit Date: 2026-03-11

---

## Severity Scale
- **P0** — Release blocker. Must fix before TestFlight.
- **P1** — High risk. Could cause user-visible failures or data issues.
- **P2** — Medium. Degrades experience but app is usable.
- **P3** — Low. Cosmetic or minor UX inconsistency.

---

## P0 — Release Blockers

### P0-1: Missing `/challenges` Route Target
- **Symptom:** After challenge completion celebration, "Back to Challenges" button navigates to nonexistent route
- **Root cause:** `challenge-celebration.tsx:167` calls `router.push('/challenges')` — file exists as `app/challenges.tsx` but the navigation may fail depending on how router resolves (needs manual QA)
- **Evidence:** `app/challenge-celebration.tsx:167`
- **Impacted roles:** Player
- **Impacted screens:** Challenge Celebration
- **Recommended action:** Verify route resolves correctly; if not, fix path

### P0-2: Missing `/(tabs)/teams` Route in Season Settings
- **Symptom:** "Manage Teams" and "View All Teams" buttons in Season Settings navigate to `/(tabs)/teams` which may not resolve correctly as a tab route
- **Root cause:** `season-settings.tsx:591,627` navigates to `/(tabs)/teams` — this tab exists as a file but has `href: null` in layout, meaning it's hidden. Direct push should still work but needs verification
- **Evidence:** `app/season-settings.tsx:591,627`
- **Impacted roles:** Admin
- **Impacted screens:** Season Settings
- **Recommended action:** Verify navigation works; consider changing to `/team-management` if it fails

### P0-3: AdminGameDay Missing eventId/teamId Params
- **Symptom:** Tapping game cards in Admin Game Day navigates to `/game-prep` without required params
- **Root cause:** `components/AdminGameDay.tsx:351,444` — `router.push('/game-prep')` with NO params. Game Prep screen expects `eventId` and `teamId` from `useLocalSearchParams()`
- **Evidence:** `components/AdminGameDay.tsx:351,444`; destination `app/game-prep.tsx` uses `useLocalSearchParams()`
- **Impacted roles:** Admin
- **Impacted screens:** Admin Game Day → Game Prep
- **Recommended action:** Pass `?eventId=${game.id}&teamId=${game.team_id}` in navigation call

### P0-4: Lineup Builder Missing Params from GameDay
- **Symptom:** "Prep Lineup" button on GameDay navigates to `/lineup-builder` without required eventId/teamId
- **Root cause:** `app/(tabs)/gameday.tsx:486` — `router.push('/lineup-builder')` with NO params
- **Evidence:** `app/(tabs)/gameday.tsx:486`; destination `app/lineup-builder.tsx` expects `eventId`, `teamId`
- **Impacted roles:** Coach
- **Impacted screens:** Game Day → Lineup Builder
- **Recommended action:** Pass eventId and teamId from the game context

---

## P1 — High Risk

### P1-1: No Route-Level Access Guards on Admin Screens
- **Symptom:** Any authenticated user can navigate directly to admin-only screens
- **Root cause:** Screens like `team-management.tsx`, `season-settings.tsx`, `registration-hub.tsx`, `org-settings.tsx`, `users.tsx` have no role check on mount. Access is only restricted by menu visibility in GestureDrawer
- **Evidence:** None of these files import or call `usePermissions()` for access gating
- **Impacted roles:** All (anyone can reach admin screens via direct navigation)
- **Impacted screens:** 10+ admin screens
- **Risk type:** Permission leak
- **Recommended action:** Add screen-level role guard or redirect for admin-only screens

### P1-2: `account_type` vs `user_roles.role` Divergence
- **Symptom:** Chat member roles may not match actual user permissions
- **Root cause:** Chat system reads `profiles.account_type` to assign `channel_members.member_role` and `can_moderate`. Permissions system reads `user_roles` + auto-detection from tables. These are independent sources.
- **Evidence:** `chats.tsx:350` — `member_role: user.account_type || 'parent'`; `coach-chat.tsx:438` — `can_moderate: user.account_type === 'admin'`
- **Impacted roles:** All chat users
- **Impacted screens:** All chat screens
- **Risk type:** Permission leak (moderation rights)
- **Recommended action:** Verify `profiles.account_type` is consistently maintained; consider using role from permissions context

### P1-3: N+1 Query in Tab Layout (Unread Counts)
- **Symptom:** App may slow down or timeout with many chat channels
- **Root cause:** `_layout.tsx:91-98` loops over all channel memberships, making one Supabase query per channel to count unread messages
- **Evidence:** `app/(tabs)/_layout.tsx:91-98`
- **Impacted roles:** All
- **Impacted screens:** Tab bar (affects all screens)
- **Risk type:** Performance
- **Recommended action:** Batch count query or use a Supabase function

### P1-4: AsyncStorage Not Cleared on Logout
- **Symptom:** Next user on same device sees previous user's season/team/child selections
- **Root cause:** Keys `vb_admin_last_season_id`, `vb_selected_team_id`, `vb_player_last_child_id` are never cleared
- **Evidence:** `lib/auth.tsx` — `signOut()` doesn't call `AsyncStorage.multiRemove()`; `lib/season.tsx`, `lib/team-context.tsx`, `components/DashboardRouter.tsx`
- **Impacted roles:** All (especially multi-user devices)
- **Impacted screens:** Home, Season Selector, Team Selector
- **Risk type:** Stale context / wrong-user data
- **Recommended action:** Clear all `vb_*` and `lynx_*` AsyncStorage keys on logout

---

## P2 — Medium

### P2-1: Team Resolution Drift (3 Paths)
- **Symptom:** Coach may see different team selections across screens
- **Root cause:** `useCoachTeam`, `useCoachHomeData`, and `useAdminHomeData` use different queries to resolve teams. Coach hook has fallback to ALL season teams if no assignment found.
- **Evidence:** `hooks/useCoachTeam.ts`, `hooks/useCoachHomeData.ts`, `hooks/useAdminHomeData.ts`
- **Impacted roles:** Coach
- **Impacted screens:** Coach dashboard, challenges, evaluations
- **Risk type:** Stale context
- **Recommended action:** Consolidate team resolution to single shared hook

### P2-2: Season Provider Returns All Statuses
- **Symptom:** Archived/completed seasons visible in season selector or used as workingSeason
- **Root cause:** `lib/season.tsx:55-71` queries seasons without status filter. SeasonSelector may filter in UI but provider doesn't
- **Evidence:** `lib/season.tsx`
- **Impacted roles:** Admin
- **Impacted screens:** Any screen using workingSeason
- **Risk type:** Stale context
- **Recommended action:** Filter or deprioritize archived seasons in provider

### P2-3: Parent-Child Triple-Resolution
- **Symptom:** Potential duplicate children in parent views
- **Root cause:** Three independent queries (player_guardians, parent_account_id, parent_email) merged with dedup. If dedup fails or a child matches multiple methods with different IDs, duplicates appear
- **Evidence:** `hooks/useParentHomeData.ts`, `lib/permissions-context.tsx`
- **Impacted roles:** Parent
- **Impacted screens:** Parent dashboard, My Kids
- **Risk type:** Wrong-user data (duplicates)
- **Recommended action:** Monitor for duplicates; consider single resolution path

### P2-4: `create-challenge` Accessible to Non-Coaches
- **Symptom:** Parent or player navigating to `/create-challenge` could attempt to create a challenge
- **Root cause:** No screen-level role guard. `useCoachTeam` returns null for non-coaches, so form would show empty team but screen renders
- **Evidence:** `app/create-challenge.tsx` — no role check
- **Impacted roles:** Parent, Player (via direct navigation)
- **Impacted screens:** Create Challenge
- **Risk type:** Permission leak
- **Recommended action:** Add role guard

### P2-5: coach_team_staff No is_active Filter
- **Symptom:** Coach sees teams from inactive staff assignments
- **Root cause:** `useCoachTeam.ts` intentionally omits `is_active` filter (per line 4 comment)
- **Evidence:** `hooks/useCoachTeam.ts:4`
- **Impacted roles:** Coach
- **Impacted screens:** All coach screens
- **Risk type:** Stale context
- **Recommended action:** Evaluate if `is_active` filter should be added

### P2-6: 45+ `as any` Type Casts in Navigation
- **Symptom:** TypeScript type safety bypassed for route navigation
- **Root cause:** Expo Router type system doesn't match actual routes; `as any` used as workaround
- **Evidence:** Throughout codebase — `router.push(... as any)`
- **Impacted roles:** None (development quality issue)
- **Risk type:** UI inconsistency (could mask bugs)
- **Recommended action:** Define proper route types or accept for beta

---

## P3 — Low

### P3-1: game_status Uses Both 'completed' and 'final'
- **Symptom:** Query logic checks for both values as terminal states
- **Root cause:** `.in('game_status', ['completed', 'final'])` in achievement engine
- **Evidence:** `lib/achievement-engine.ts:804,816`
- **Impacted roles:** All
- **Risk type:** Vocabulary drift
- **Recommended action:** Verify which value the app writes; normalize

### P3-2: Duplicate Chat Screens
- **Symptom:** Three separate chat list implementations with similar logic
- **Root cause:** `chats.tsx`, `coach-chat.tsx`, `parent-chat.tsx` each implement channel listing independently
- **Evidence:** Three files with similar Supabase queries
- **Impacted roles:** All
- **Risk type:** UI inconsistency
- **Recommended action:** Consider consolidation post-beta

### P3-3: players.status Conflated with Registration
- **Symptom:** `players.status = 'assigned'` written on team assignment — unclear if this is a registration status or player status
- **Root cause:** `admin-teams.tsx:336` writes to `players.status` during team assignment
- **Evidence:** `app/(tabs)/admin-teams.tsx:336`
- **Impacted roles:** Admin
- **Risk type:** Schema mismatch
- **Recommended action:** Verify against web admin behavior

### P3-4: Parent/Guardian Terminology Mismatch
- **Symptom:** UI says "parent" but DB table is `player_guardians`
- **Root cause:** Historical naming
- **Evidence:** `lib/permissions-context.tsx` — queries `player_guardians`
- **Risk type:** Vocabulary drift (cosmetic)
- **Recommended action:** No action needed for beta

---

## Summary

| Severity | Count | Release Impact |
|----------|-------|----------------|
| P0 | 4 | Must fix before TestFlight |
| P1 | 4 | Should fix before TestFlight |
| P2 | 6 | Can ship but monitor closely |
| P3 | 4 | Can wait until after beta |
| **Total** | **18** | |
