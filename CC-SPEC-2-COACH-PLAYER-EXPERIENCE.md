# CC-SPEC-2-COACH-PLAYER-EXPERIENCE.md
# Spec 2 of 3: Coach & Player Experience Fixes

> **Run AFTER CC-SPEC-1-FOUNDATION is complete and verified.**  
> **Depends on:** Spec 1 fixes (auth, team resolution hook, navigation)  
> **Rule:** Read every file mentioned BEFORE writing code. Do NOT invent table names. Do NOT break the fixes from Spec 1.

---

## CONTEXT

Spec 1 fixed the foundation: auth, team resolution, navigation routing, and the PGRST204 error. This spec fixes what coaches and players see once that foundation works. 

### Standing Rules:
- ScrollViews ALWAYS mounted — never replaced by loading states
- Brand tokens everywhere — no hardcoded colors
- Gold/yellow text only on dark backgrounds
- Read existing working pages before writing queries — never invent table names
- The shared `useCoachTeam()` hook from Spec 1 should now exist. USE IT instead of writing new team resolution logic.

---

## FIX 7: Coach Home — Team Health Card Should Be Removed

### File: `components/CoachHomeScroll.tsx`

### Problem:
The Team Health card (red dots, Attendance 100%, RSVP --) is still rendering on the coach home. Per previous design decisions, this section was supposed to be removed from the home screen layout.

### Fix:
Remove the `<TeamHealthCard>` render from the coach home scroll. Do NOT delete the component file — just remove it from the render tree. The roster size, attendance, and RSVP data can be accessed through the team hub or roster screens.

---

## FIX 8: Challenge Data Mismatch — Home Shows 1 Active, Dashboard Shows 0

### Files: `components/coach-scroll/ChallengeQuickCard.tsx`, `app/coach-challenge-dashboard.tsx`

### Root cause (from Spec 1):
The ChallengeQuickCard uses `data.selectedTeamId` from the coach home hook (which has the 3-path fallback and FINDS the team). The Challenge Dashboard uses its own `resolveTeam()` which only checks `team_staff` with `is_active = true` and DOESN'T find the team → `teamId` stays null → `useTeamChallenges(null)` returns empty.

### Fix:
**If Spec 1's shared `useCoachTeam()` hook is implemented:**
Replace the `resolveTeam()` function in `app/coach-challenge-dashboard.tsx` (lines ~61-82) with:
```typescript
const { teamId, loading: teamLoading } = useCoachTeam();
```
Remove the local `resolveTeam` function entirely.

**Verify:** After the fix, the dashboard should show the same 1 Active challenge that the home card shows. Both now use the same team resolution path.

---

## FIX 9: Challenge Detail Views Empty Across All Roles

### Problem:
Player, Parent, and Coach screens show challenge data on dashboards (e.g., "1 Active") but when navigating to challenge detail/trophy room/challenge list, nothing appears.

### Investigation:
1. Check `app/challenges.tsx` — this is the player/parent challenge list. How does it resolve teamId/orgId? If it uses its own independent query that fails, it shows empty.
2. Check if the challenge queries filter by `team_id` — if the player's team isn't found, no challenges show.
3. The trophy room (`app/achievements.tsx`) may query `challenge_participants` by `player_id` — verify this query returns data for the test player.

### Fix approach:
- For coach: already fixed by Fix 8 (shared team hook)
- For player: `app/challenges.tsx` needs to resolve the player's team. Check if it uses `team_players` → `team_id`. If the player IS in `team_players`, the query should work. Debug the specific query.
- For parent: similar — resolve via child's team. Ensure the query path works.

---

## FIX 10: Roster Shows Old Gold/Navy Player Cards

### File: `app/(tabs)/players.tsx`

### Problem:
The roster screen renders old-style player trading cards (gold gradient backgrounds, jersey numbers, position badges). These are outdated and should be replaced with the redesigned player cards that include developmental tabs, engagement progress, and coach challenge integration.

### Investigation:
1. Read `app/(tabs)/players.tsx` to understand the current card rendering
2. Check if newer player card components exist (e.g., `PlayerCardV2`, `PlayerDetailCard`, etc.) that should be used instead
3. Check if there's a player detail screen that opens when tapping a card — this is where developmental tabs, skills, stats should live

### From Carlos's screenshot (Image 5):
The player detail modal (Mia Anderson, #5) actually looks decent — gold-to-navy gradient hero, photo, position badge, grade, games, badges, Stats/Skills/Info tabs. The stat boxes (K, D, A, B, AST, GAMES) are rendering but show 0. This detail view might be OK — the issue is the GRID view cards leading into it are the old design.

### Fix:
This is likely a design-level change that needs its own spec. For THIS pass:
1. Verify the player detail modal (the one showing Mia Anderson) renders correctly with real data
2. Ensure tapping a card in the grid opens this detail modal
3. If the grid cards themselves need a full redesign, note it as "deferred to CC-ROSTER-REDESIGN" but do NOT attempt a full card redesign in this bugfix pass

---

## FIX 11: Evaluation Session Shows 0 Players

### File: `app/evaluation-session.tsx`

### Root cause (from Spec 1):
The evaluation session resolves teamId via `team_staff` with `is_active = true` filter (line ~68-73). If this query returns nothing, `tid` stays empty and no players load.

### Fix:
**If Spec 1's shared `useCoachTeam()` hook is implemented:**
Replace the team resolution in `loadData()` with:
```typescript
const { teamId: resolvedTeamId } = useCoachTeam();
```
Then use `resolvedTeamId` instead of the local `tid` variable.

**Also check:** The `getTeamEvaluationStatus()` function (imported from a service file). Verify it queries `team_players` correctly to get the roster for the resolved team. If it also has a `role` column issue (like the registration-hub did), fix it.

---

## FIX 12: Shoutout Nudge Navigation Goes to Wrong Destination

### File: `components/CoachHomeScroll.tsx`

### Problem:
Carlos reported that clicking the shoutout message about a player ("Test Ava had 20 kills — give them a shoutout?") brought him to the old roster/player card page instead of opening the shoutout modal.

### Investigation:
The `EngagementSection` component (line ~527) passes `onGiveShoutout={() => setShowShoutoutModal(true)}`. This SHOULD open the shoutout modal.

However, the text "Test Ava had 20 kills — give them a shoutout? →" might be rendered as a `TouchableOpacity` with a DIFFERENT onPress handler that navigates somewhere else. Or, the entire area might be wrapped in a parent touchable that intercepts the tap.

### Fix:
1. Read `components/coach-scroll/EngagementSection.tsx` fully
2. Verify the arrow `→` touchable calls `onGiveShoutout`, not a router.push
3. If there's a navigation call, replace it with `onGiveShoutout()`
4. If the tap is being intercepted by a parent component, add `onStartShouldSetResponder` or restructure the touch hierarchy

---

## FIX 13: Team Hub Card Click Navigates to Chat Instead of Team Hub

### File: `components/CoachHomeScroll.tsx` or the TeamHubPreview component

### Problem:
Tapping the team hub preview card on the coach home navigates to the team chat selection menu instead of the team hub/team wall.

### Investigation:
Find the TeamHubPreview or equivalent component rendered on the coach home. Check its `onPress` handler — it likely routes to `/(tabs)/chats` instead of `/(tabs)/connect` (team wall).

### Fix:
Change the navigation target to the correct team wall/hub route: `/(tabs)/connect`

---

## VERIFICATION CHECKLIST
- [ ] Coach home: Team Health card no longer renders
- [ ] Coach home: Challenge Quick Card shows "1 Active" → tap View Dashboard → Challenge HQ ALSO shows "1 Active"
- [ ] Player challenge list: shows the active challenge
- [ ] Parent trophy room: shows earned badges/challenges
- [ ] Roster grid: tapping a player opens detail view with real data
- [ ] Evaluation Session: loads roster players, can start evaluation
- [ ] Shoutout nudge: tapping opens the shoutout modal, NOT roster page
- [ ] Team hub card on coach home: tapping goes to team wall, NOT chat
