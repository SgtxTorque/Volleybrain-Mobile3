# CC-ENGAGEMENT-PHASE1C-STREAK-ENGINE
# Lynx Player Engagement System — Phase 1C: Streak Engine
# Status: READY FOR CC EXECUTION
# Depends on: Phase 1 schema, Phase 1A RLS fix, Phase 1B quest engine

---

## STANDING RULES

1. **Read these files first, in order:**
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
   - `SCHEMA_REFERENCE.csv` in repo root
2. **Do NOT modify any existing hooks, components, or screens.**
3. **Do NOT modify any database tables or RLS policies.**
4. **The ONLY existing file you may modify is `lib/quest-engine.ts` — to add a streak update call inside the `completeQuest` function.** That is the single integration point. Everything else is new files.
5. **Commit after each phase.** Commit message format: `[engagement-streaks] Phase X: description`
6. **If something is unclear, STOP and report back.**
7. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Builds the streak tracking engine. A player's streak counts consecutive days with at least one qualifying action. The engine:

1. Checks streak state on app open (is the streak still alive?)
2. Records qualifying actions (quest completion, attendance, game played)
3. Handles streak freeze logic (consume a freeze to survive one missed day)
4. Detects streak milestones (7, 14, 30, 60, 100 days) and awards freezes
5. Exposes streak data through a React hook

**Qualifying actions (any one of these keeps the streak alive for the day):**
- Complete 1 daily quest
- Complete 1 skill node (future, when Journey Path is wired)
- Attend practice (coach-verified)
- Play in a game

For Phase 1C, the primary trigger is quest completion (since that's the system we just built). Attendance and game triggers will be wired in later phases when those systems integrate.

---

## PHASE 1: Create the streak engine service file

Create a new file:
```
lib/streak-engine.ts
```

```typescript
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  freezesAvailable: number;
  freezeUsedDate: string | null;
  isAlive: boolean;        // true if streak is currently active (not broken)
  needsAction: boolean;    // true if player hasn't done a qualifying action today
  justBroke: boolean;      // true if streak broke since last check (for messaging)
  milestoneReached: number | null; // if a milestone was just hit, which one
}

const STREAK_MILESTONES = [7, 14, 30, 60, 100];
const MAX_FREEZES = 3;

// ─── Date Helpers ────────────────────────────────────────────────────────────

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + 'T00:00:00');
  const d2 = new Date(dateStr2 + 'T00:00:00');
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Core: Get or Initialize Streak ──────────────────────────────────────────
// Returns the player's streak row from streak_data.
// Creates one if it doesn't exist (first-time player).

async function getOrInitStreak(profileId: string): Promise<{
  id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  streak_freezes_available: number;
  streak_freeze_used_date: string | null;
} | null> {
  // Try to fetch existing
  const { data: existing, error: fetchError } = await supabase
    .from('streak_data')
    .select('*')
    .eq('player_id', profileId)
    .maybeSingle();

  if (fetchError) {
    console.error('[streak-engine] Error fetching streak:', fetchError);
    return null;
  }

  if (existing) return existing;

  // Create new streak row for first-time player
  const { data: created, error: createError } = await supabase
    .from('streak_data')
    .insert({
      player_id: profileId,
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
      streak_freezes_available: 0,
      streak_freeze_used_date: null,
    })
    .select('*')
    .single();

  if (createError) {
    console.error('[streak-engine] Error creating streak:', createError);
    return null;
  }

  return created;
}

// ─── Core: Check Streak State ────────────────────────────────────────────────
// Called on app open. Evaluates whether the streak is alive, broken, or frozen.
// Does NOT modify the streak — that happens on qualifying actions.
// Exception: if the streak broke (gap > 1 day, no freeze), it resets to 0 here.

export async function checkStreakState(profileId: string): Promise<StreakState> {
  const streak = await getOrInitStreak(profileId);

  if (!streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      freezesAvailable: 0,
      freezeUsedDate: null,
      isAlive: false,
      needsAction: true,
      justBroke: false,
      milestoneReached: null,
    };
  }

  const today = localToday();
  const lastActive = streak.last_active_date;

  // Case 1: Never been active (new player)
  if (!lastActive) {
    return {
      currentStreak: 0,
      longestStreak: streak.longest_streak,
      lastActiveDate: null,
      freezesAvailable: streak.streak_freezes_available,
      freezeUsedDate: streak.streak_freeze_used_date,
      isAlive: false,
      needsAction: true,
      justBroke: false,
      milestoneReached: null,
    };
  }

  // Case 2: Already active today
  if (lastActive === today) {
    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      lastActiveDate: lastActive,
      freezesAvailable: streak.streak_freezes_available,
      freezeUsedDate: streak.streak_freeze_used_date,
      isAlive: true,
      needsAction: false,
      justBroke: false,
      milestoneReached: null,
    };
  }

  // Case 3: Last active was yesterday — streak alive, needs action today
  if (lastActive === yesterday()) {
    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      lastActiveDate: lastActive,
      freezesAvailable: streak.streak_freezes_available,
      freezeUsedDate: streak.streak_freeze_used_date,
      isAlive: true,
      needsAction: true,
      justBroke: false,
      milestoneReached: null,
    };
  }

  // Case 4: Gap > 1 day — check for freeze
  const gap = daysBetween(lastActive, today);

  if (gap === 2 && streak.streak_freezes_available > 0 && streak.streak_freeze_used_date !== yesterday()) {
    // Can use a freeze for the one missed day (yesterday)
    const newFreezes = streak.streak_freezes_available - 1;

    await supabase
      .from('streak_data')
      .update({
        streak_freezes_available: newFreezes,
        streak_freeze_used_date: yesterday(),
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', profileId);

    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      lastActiveDate: lastActive,
      freezesAvailable: newFreezes,
      freezeUsedDate: yesterday(),
      isAlive: true,
      needsAction: true,
      justBroke: false,
      milestoneReached: null,
    };
  }

  // Case 5: Streak is broken (gap > 1 day, no freeze or gap too large)
  const oldStreak = streak.current_streak;

  await supabase
    .from('streak_data')
    .update({
      current_streak: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('player_id', profileId);

  return {
    currentStreak: 0,
    longestStreak: streak.longest_streak,
    lastActiveDate: lastActive,
    freezesAvailable: streak.streak_freezes_available,
    freezeUsedDate: streak.streak_freeze_used_date,
    isAlive: false,
    needsAction: true,
    justBroke: oldStreak > 0, // only "just broke" if there was a streak to break
    milestoneReached: null,
  };
}

// ─── Core: Record Qualifying Action ──────────────────────────────────────────
// Called when a player completes a qualifying action (quest, attendance, etc).
// Increments streak if this is the first qualifying action today.
// Checks for milestone and awards freeze if applicable.

export async function recordQualifyingAction(profileId: string): Promise<{
  newStreak: number;
  milestoneReached: number | null;
  freezeAwarded: boolean;
}> {
  const streak = await getOrInitStreak(profileId);
  if (!streak) {
    return { newStreak: 0, milestoneReached: null, freezeAwarded: false };
  }

  const today = localToday();

  // If already active today, no change needed
  if (streak.last_active_date === today) {
    return {
      newStreak: streak.current_streak,
      milestoneReached: null,
      freezeAwarded: false,
    };
  }

  // Calculate new streak
  let newStreak: number;
  const lastActive = streak.last_active_date;

  if (!lastActive) {
    // First ever action
    newStreak = 1;
  } else if (lastActive === yesterday()) {
    // Consecutive day
    newStreak = streak.current_streak + 1;
  } else if (
    daysBetween(lastActive, today) === 2 &&
    streak.streak_freeze_used_date === yesterday()
  ) {
    // Freeze was used for yesterday — continue streak
    newStreak = streak.current_streak + 1;
  } else {
    // Gap too large or no freeze — start new streak
    newStreak = 1;
  }

  const newLongest = Math.max(streak.longest_streak, newStreak);

  // Update streak_data
  await supabase
    .from('streak_data')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('player_id', profileId);

  // Check for milestone
  let milestoneReached: number | null = null;
  let freezeAwarded = false;

  if (STREAK_MILESTONES.includes(newStreak)) {
    // Check if this milestone was already recorded
    const { data: existingMilestone } = await supabase
      .from('streak_milestones')
      .select('id')
      .eq('player_id', profileId)
      .eq('milestone_days', newStreak)
      .maybeSingle();

    if (!existingMilestone) {
      milestoneReached = newStreak;

      // Award a freeze (up to max)
      const shouldAwardFreeze = streak.streak_freezes_available < MAX_FREEZES;

      await supabase.from('streak_milestones').insert({
        player_id: profileId,
        milestone_days: newStreak,
        freeze_awarded: shouldAwardFreeze,
        badge_id: null, // Badge linking happens when badge system is wired
      });

      if (shouldAwardFreeze) {
        freezeAwarded = true;
        await supabase
          .from('streak_data')
          .update({
            streak_freezes_available: streak.streak_freezes_available + 1,
          })
          .eq('player_id', profileId);
      }
    }
  }

  return { newStreak, milestoneReached, freezeAwarded };
}
```

**Commit:** `[engagement-streaks] Phase 1: streak engine service`

---

## PHASE 2: Create the useStreakEngine hook

Create a new file:
```
hooks/useStreakEngine.ts
```

```typescript
import { useState, useEffect, useCallback } from 'react';
import { checkStreakState, StreakState } from '@/lib/streak-engine';
import { supabase } from '@/lib/supabase';

export function useStreakEngine() {
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStreak = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const state = await checkStreakState(user.id);
      setStreak(state);
    } catch (err) {
      console.error('[useStreakEngine] Error loading streak:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStreak();
  }, [loadStreak]);

  return {
    streak,
    loading,
    refreshStreak: loadStreak,
  };
}
```

**Commit:** `[engagement-streaks] Phase 2: streak hook`

---

## PHASE 3: Integrate streak into quest completion

**This is the ONLY modification to an existing file in this spec.**

Open `lib/quest-engine.ts`. Find the `completeQuest` function.

Add an import at the top of the file:

```typescript
import { recordQualifyingAction } from '@/lib/streak-engine';
```

Inside the `completeQuest` function, AFTER the XP award step (Step 2) and BEFORE the all-complete check (Step 3), add a streak recording call:

```typescript
  // Step 2.5: Record qualifying action for streak
  const streakResult = await recordQualifyingAction(profileId);
```

Also update the return type of `completeQuest` to include streak data. Add these fields to the return object:

```typescript
  return {
    success: true,
    xpAwarded: quest.xp_reward,
    allComplete,
    bonusAwarded,
    newTotalXp: xpResult.newTotalXp,
    newLevel: xpResult.newLevel,
    newTier: xpResult.newTier,
    // ADD THESE:
    newStreak: streakResult.newStreak,
    streakMilestone: streakResult.milestoneReached,
    streakFreezeAwarded: streakResult.freezeAwarded,
  };
```

Update the return type definition at the top of `completeQuest` to include:

```typescript
export async function completeQuest(questId: string, profileId: string): Promise<{
  success: boolean;
  xpAwarded: number;
  allComplete: boolean;
  bonusAwarded: boolean;
  newTotalXp: number;
  newLevel: number;
  newTier: string;
  newStreak: number;
  streakMilestone: number | null;
  streakFreezeAwarded: boolean;
}>
```

Also update the error return at the top of `completeQuest` to include the new fields:

```typescript
    return { success: false, xpAwarded: 0, allComplete: false, bonusAwarded: false, newTotalXp: 0, newLevel: 1, newTier: 'Rookie', newStreak: 0, streakMilestone: null, streakFreezeAwarded: false };
```

**IMPORTANT:** Do not change anything else in `quest-engine.ts`. Only add the import, the streak call, the return fields, and the type update. The rest of the file stays exactly as it is.

**Commit:** `[engagement-streaks] Phase 3: integrate streak into quest completion`

---

## PHASE 4: Update useQuestEngine to expose streak data

Open `hooks/useQuestEngine.ts`. This was created in Phase 1B and is part of the engagement system, so it's safe to modify.

Add streak data to the `handleCompleteQuest` return. The hook already returns `result` from `completeQuest`, so the streak data will flow through automatically. No changes needed to the hook UNLESS the `result` type needs to be explicitly updated.

Verify that `handleCompleteQuest` passes through `result.newStreak`, `result.streakMilestone`, and `result.streakFreezeAwarded` in its return value. If it does (because it returns the full `result` object), no changes needed. If it doesn't, add them.

**Commit (if changes made):** `[engagement-streaks] Phase 4: expose streak data in quest hook`

---

## PHASE 5: Verification

### Verify:

1. `lib/streak-engine.ts` exists and exports: `checkStreakState`, `recordQualifyingAction`, `StreakState`
2. `hooks/useStreakEngine.ts` exists and exports: `useStreakEngine`
3. `lib/quest-engine.ts` now imports from `streak-engine` and calls `recordQualifyingAction` inside `completeQuest`
4. `completeQuest` return type includes `newStreak`, `streakMilestone`, `streakFreezeAwarded`
5. No TypeScript compilation errors (`npx tsc --noEmit`)
6. No existing files modified EXCEPT `lib/quest-engine.ts` (the one integration point)
7. `hooks/useQuestEngine.ts` — verify if changes were needed or not

### Report back with:

```
## VERIFICATION REPORT: Phase 1C

### Files Created:
- lib/streak-engine.ts: [line count] lines
- hooks/useStreakEngine.ts: [line count] lines

### Files Modified:
- lib/quest-engine.ts: [describe exact changes — import added, streak call added, return type updated]
- hooks/useQuestEngine.ts: [UNCHANGED or describe changes]

### Exports Verified:
- streak-engine.ts: [list exports]
- useStreakEngine.ts: [list exports]

### Type Check: PASS / FAIL

### Integration Point:
- completeQuest() now calls recordQualifyingAction(): YES / NO
- completeQuest() return includes streak fields: YES / NO

### Errors: NONE / [list]
```

---

## WHAT COMES NEXT (NOT IN THIS SPEC)

- **Phase 1D:** Wire PlayerDailyQuests to use useQuestEngine instead of buildQuests()
- **Phase 1E:** Wire usePlayerHomeData to read profiles.total_xp instead of client-side XP formula
- **Phase 1F:** Wire PlayerIdentityHero and PlayerMomentumRow to show real streak data from useStreakEngine
