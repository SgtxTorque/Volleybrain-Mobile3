# CC-PARENT-CHILD-CONTEXT-FIX
# Fix: Parent viewing child's player page shows parent's data instead of child's
# Status: READY FOR CC EXECUTION

---

## STANDING RULES

1. **Read these files first:** `CC-LYNX-RULES.md`, `AGENTS.md`, `SCHEMA_REFERENCE.csv`
2. **This is a targeted fix, not a redesign.** Change the minimum code necessary.
3. **Commit after each phase.** Commit message format: `[context-fix] Phase X: description`
4. **Branch:** `navigation-cleanup-complete`

---

## THE PROBLEM

When a parent (Carlos Test) views their child's (Ava Test) player page, engagement data shows the PARENT's data:
- Leaderboard shows Carlos Test, not Ava Test
- XP and level may show Carlos's profile data, not Ava's
- The system uses `auth.uid()` (the parent's profile ID) for all engagement queries instead of the child's profile ID

This happens because the engagement hooks use `supabase.auth.getUser()` to determine who to fetch data for. When a parent views their child's player context, the authenticated user is still the parent.

---

## THE FIX

The app needs a concept of "active player context." When a parent views their child's data, the active player context should be the child's profile ID, not the parent's.

---

## PHASE 1: Investigation

Read and report:

1. **How does the parent view a child's player page?** Find the navigation flow. Does the parent tap a child card on Parent Home? Does it pass a `playerId` or `childProfileId` as a route param?

2. **Is there an existing "active child" or "child context" concept?** Search for anything that tracks which child the parent is currently viewing. Look for: `selectedChild`, `activeChild`, `childContext`, `viewingPlayer`, `currentPlayer` in hooks and context providers.

3. **How does PlayerHomeScroll know it's rendering for a specific child vs the logged-in player?** Does it receive a player ID as a prop? Does it read from a context?

4. **List every engagement hook that calls `supabase.auth.getUser()`** to determine the player:
   - useQuestEngine
   - useWeeklyQuestEngine
   - useStreakEngine (inside usePlayerHomeData)
   - useLeaderboard
   - useTeamQuests
   - useNotifications
   - useJourneyPath
   - useCoachEngagement
   
   For each, note exactly where `auth.getUser()` is called and how the user ID is used.

5. **Is there a React Context for user state?** Find any AuthContext, UserContext, or PlayerContext that provides the current user's information to components.

**Report findings, then proceed to Phase 2.**

---

## PHASE 2: Implement active player context

The simplest fix: every engagement hook should accept an optional `playerProfileId` parameter. If provided, use that instead of `auth.uid()`. If not provided, fall back to `auth.uid()` (the logged-in user).

### 2A: Update engagement hooks

For each of these hooks, add an optional `overrideProfileId` parameter:

**hooks/useQuestEngine.ts:**
```typescript
// Before:
export function useQuestEngine() {
  // ...
  const { data: { user } } = await supabase.auth.getUser();
  const dailyQuests = await getOrCreateDailyQuests(user.id);

// After:
export function useQuestEngine(overrideProfileId?: string) {
  // ...
  const { data: { user } } = await supabase.auth.getUser();
  const profileId = overrideProfileId || user?.id;
  if (!profileId) return;
  const dailyQuests = await getOrCreateDailyQuests(profileId);
```

Apply the same pattern to:
- `useWeeklyQuestEngine(overrideProfileId?: string)`
- `useLeaderboard(teamId, overrideProfileId?: string)` — the "myRank" highlight should use this ID
- `useJourneyPath(overrideProfileId?: string)`
- `useNotifications(overrideProfileId?: string)`

**Do NOT add overrideProfileId to useCoachEngagement.** That hook is coach-specific and always uses the coach's auth.

### 2B: Update PlayerHomeScroll (or parent-child navigation)

Find where the parent navigates to the child's player view. The child's profile ID should be passed as a prop or route param and threaded through to all engagement hooks.

If PlayerHomeScroll already receives a `childProfileId` or `viewingPlayerId` prop:
```typescript
// Pass it through to hooks:
const { quests } = useQuestEngine(childProfileId);
const { standings, myRank } = useLeaderboard(teamId, childProfileId);
const { chapters } = useJourneyPath(childProfileId);
```

If no such prop exists, find how the parent selects a child and add the prop.

### 2C: Update usePlayerHomeData

This is the main data hook. It likely already has some concept of which player's data to show (since it loads stats, badges, etc.).

Find how it determines the player context and ensure the engagement-specific calls (streak check, XP boost check) use the same player context, not `auth.uid()`.

**Commit:** `[context-fix] Phase 2: add overrideProfileId to engagement hooks`

---

## PHASE 3: Verification

### Verify:

1. When logged in as a parent, viewing a child's player page shows the CHILD's:
   - Daily quests (or quest entry card)
   - Weekly quests
   - Leaderboard position (child highlighted, not parent)
   - Journey Path progress
   - XP and level
   - Streak count

2. When logged in as a player directly (not through parent), everything still works (overrideProfileId is undefined, falls back to auth.uid())

3. No TypeScript errors

### Report back with:

```
## VERIFICATION REPORT: Parent-Child Context Fix

### Files Modified: [count]
[list each with description]

### Hooks Updated with overrideProfileId:
- useQuestEngine: YES / NO
- useWeeklyQuestEngine: YES / NO
- useLeaderboard: YES / NO
- useJourneyPath: YES / NO
- useNotifications: YES / NO
- usePlayerHomeData: YES / NO / N/A

### Parent Context Wiring:
- Child profile ID passed through navigation: YES / NO
- Engagement hooks receive child ID when parent views: YES / NO

### Type Check: PASS / FAIL

### Errors: NONE / [list]
```
