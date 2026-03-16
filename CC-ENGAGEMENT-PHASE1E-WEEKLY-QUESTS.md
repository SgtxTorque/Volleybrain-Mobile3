# CC-ENGAGEMENT-PHASE1E-WEEKLY-QUESTS
# Lynx Player Engagement System — Phase 1E: Weekly Quest Generation
# Status: READY FOR CC EXECUTION
# Depends on: Phase 1 schema, Phase 1A-1D complete

---

## STANDING RULES

1. **Read these files first, in order:**
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
   - `SCHEMA_REFERENCE.csv` in repo root
2. **Only modify the files explicitly listed in this spec.**
3. **Do NOT modify any database tables, RLS policies, or migration files.**
4. **Commit after each phase.** Commit message format: `[engagement-weekly] Phase X: description`
5. **If something is unclear, STOP and report back.**
6. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Extends the quest engine to generate 3-5 weekly quests per player each Monday (or on first app open that week). Weekly quests have higher XP rewards and track progress across the full week. Completing all weekly quests awards a 50 XP bonus.

The `weekly_quests` table already exists from Phase 1. This spec adds:
1. Weekly quest generation logic to `lib/quest-engine.ts`
2. A `useWeeklyQuestEngine` hook
3. Wires weekly quests into the Player Home scroll

---

## PHASE 1: Add weekly quest generation to quest-engine.ts

**File to modify:** `lib/quest-engine.ts`

### Step 1A: Add weekly quest types and interfaces

Add these below the existing `DailyQuest` interface:

```typescript
export type WeeklyQuestType =
  | 'attendance'
  | 'skill_module'
  | 'game_performance'
  | 'community'
  | 'consistency';

export interface WeeklyQuest {
  id: string;
  player_id: string;
  team_id: string | null;
  week_start: string;
  quest_type: WeeklyQuestType;
  title: string;
  description: string | null;
  xp_reward: number;
  verification_type: VerificationType;
  target_value: number;
  current_value: number;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
}
```

### Step 1B: Add weekly quest context gathering

Add a function that gathers context specific to weekly quests. This checks what happened (or is scheduled) this week:

```typescript
async function gatherWeeklyContext(profileId: string, playerId: string | null, teamIds: string[]): Promise<{
  practicesThisWeek: number;
  gamesThisWeek: number;
  hasActiveChallenge: boolean;
  shoutoutsGivenThisWeek: number;
  dailyQuestsCompletedThisWeek: number;
}> {
  const mondayStr = localMondayOfWeek();
  const today = localToday();
  
  // Count practices scheduled this week
  let practicesThisWeek = 0;
  let gamesThisWeek = 0;
  if (teamIds.length > 0) {
    const { data: events } = await supabase
      .from('schedule_events')
      .select('event_type')
      .in('team_id', teamIds)
      .gte('event_date', mondayStr)
      .lte('event_date', sundayOfWeek());

    if (events) {
      practicesThisWeek = events.filter((e: { event_type: string }) => e.event_type === 'practice').length;
      gamesThisWeek = events.filter((e: { event_type: string }) => e.event_type === 'game').length;
    }
  }

  // Check active challenges
  let hasActiveChallenge = false;
  if (teamIds.length > 0) {
    const { count } = await supabase
      .from('coach_challenges')
      .select('id', { count: 'exact', head: true })
      .in('team_id', teamIds)
      .eq('status', 'active');
    hasActiveChallenge = (count ?? 0) > 0;
  }

  // Shoutouts given this week
  const { count: shoutoutCount } = await supabase
    .from('shoutouts')
    .select('id', { count: 'exact', head: true })
    .eq('giver_id', profileId)
    .gte('created_at', new Date(mondayStr + 'T00:00:00').toISOString());

  // Daily quests completed this week
  const { count: questCount } = await supabase
    .from('daily_quests')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', profileId)
    .gte('quest_date', mondayStr)
    .eq('is_completed', true);

  return {
    practicesThisWeek,
    gamesThisWeek,
    hasActiveChallenge,
    shoutoutsGivenThisWeek: shoutoutCount ?? 0,
    dailyQuestsCompletedThisWeek: questCount ?? 0,
  };
}
```

### Step 1C: Add Sunday date helper

Add this alongside the existing date helpers:

```typescript
function sundayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Sunday
  const sunday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
}
```

### Step 1D: Add weekly quest generation logic

```typescript
function generateWeeklyQuestDefinitions(
  profileId: string,
  primaryTeamId: string | null,
  weeklyCtx: Awaited<ReturnType<typeof gatherWeeklyContext>>
): Omit<WeeklyQuest, 'id' | 'created_at'>[] {
  const weekStart = localMondayOfWeek();
  const quests: Omit<WeeklyQuest, 'id' | 'created_at'>[] = [];
  let sortOrder = 0;

  // ── Quest 1: Attendance (always present if practices/games exist) ──
  if (weeklyCtx.practicesThisWeek > 0 || weeklyCtx.gamesThisWeek > 0) {
    const totalEvents = weeklyCtx.practicesThisWeek + weeklyCtx.gamesThisWeek;
    const target = Math.min(totalEvents, 3); // Attend up to 3 events
    quests.push({
      player_id: profileId,
      team_id: primaryTeamId,
      week_start: weekStart,
      quest_type: 'attendance',
      title: target === 1 ? 'Attend practice or game this week' : `Attend ${target} events this week`,
      description: 'Show up and put in the work.',
      xp_reward: target === 1 ? 30 : 50,
      verification_type: 'coach_verified',
      target_value: target,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      sort_order: sortOrder++,
    });
  }

  // ── Quest 2: Community (shoutouts) ──
  quests.push({
    player_id: profileId,
    team_id: primaryTeamId,
    week_start: weekStart,
    quest_type: 'community',
    title: 'Give 3 shoutouts this week',
    description: 'Lift your teammates up.',
    xp_reward: 25,
    verification_type: 'automatic',
    target_value: 3,
    current_value: weeklyCtx.shoutoutsGivenThisWeek,
    is_completed: weeklyCtx.shoutoutsGivenThisWeek >= 3,
    completed_at: weeklyCtx.shoutoutsGivenThisWeek >= 3 ? new Date().toISOString() : null,
    sort_order: sortOrder++,
  });

  // ── Quest 3: Consistency (complete daily quests) ──
  quests.push({
    player_id: profileId,
    team_id: primaryTeamId,
    week_start: weekStart,
    quest_type: 'consistency',
    title: 'Complete daily quests 5 of 7 days',
    description: 'Consistency beats everything.',
    xp_reward: 60,
    verification_type: 'automatic',
    target_value: 5,
    current_value: 0, // This gets updated incrementally as days pass
    is_completed: false,
    completed_at: null,
    sort_order: sortOrder++,
  });

  // ── Quest 4 (conditional): Game performance ──
  if (weeklyCtx.gamesThisWeek > 0) {
    quests.push({
      player_id: profileId,
      team_id: primaryTeamId,
      week_start: weekStart,
      quest_type: 'game_performance',
      title: 'Play in a game this week',
      description: 'Step on the court and compete.',
      xp_reward: 30,
      verification_type: 'automatic',
      target_value: 1,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      sort_order: sortOrder++,
    });
  }

  // ── Quest 5 (conditional): Skill module ──
  // Only if no game this week (otherwise 4 quests is enough)
  if (weeklyCtx.gamesThisWeek === 0) {
    quests.push({
      player_id: profileId,
      team_id: primaryTeamId,
      week_start: weekStart,
      quest_type: 'skill_module',
      title: 'Complete a skill module',
      description: 'Learn something new this week.',
      xp_reward: 40,
      verification_type: 'automatic',
      target_value: 1,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      sort_order: sortOrder++,
    });
  }

  return quests;
}
```

### Step 1E: Add getOrCreateWeeklyQuests

```typescript
export async function getOrCreateWeeklyQuests(profileId: string): Promise<WeeklyQuest[]> {
  const weekStart = localMondayOfWeek();

  // Check if this week's quests already exist
  const { data: existing, error: fetchError } = await supabase
    .from('weekly_quests')
    .select('*')
    .eq('player_id', profileId)
    .eq('week_start', weekStart)
    .order('sort_order', { ascending: true });

  if (fetchError) {
    console.error('[quest-engine] Error fetching weekly quests:', fetchError);
    return [];
  }

  if (existing && existing.length > 0) {
    return existing as WeeklyQuest[];
  }

  // Generate new weekly quests
  // Reuse the context gathering from daily quests for player/team info
  const ctx = await gatherQuestContext(profileId);
  const weeklyCtx = await gatherWeeklyContext(profileId, ctx.playerId, ctx.teamIds);
  const questDefs = generateWeeklyQuestDefinitions(profileId, ctx.primaryTeamId, weeklyCtx);

  const { data: inserted, error: insertError } = await supabase
    .from('weekly_quests')
    .insert(questDefs)
    .select('*');

  if (insertError) {
    console.error('[quest-engine] Error inserting weekly quests:', insertError);
    return questDefs.map((q, i) => ({
      ...q,
      id: `temp-weekly-${i}`,
      created_at: new Date().toISOString(),
    })) as unknown as WeeklyQuest[];
  }

  return (inserted || []) as WeeklyQuest[];
}
```

### Step 1F: Add completeWeeklyQuest

```typescript
export async function completeWeeklyQuest(questId: string, profileId: string): Promise<{
  success: boolean;
  xpAwarded: number;
  allComplete: boolean;
  bonusAwarded: boolean;
  newTotalXp: number;
  newLevel: number;
  newTier: string;
}> {
  // Mark quest as completed
  const { data: quest, error: updateError } = await supabase
    .from('weekly_quests')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', questId)
    .eq('player_id', profileId)
    .select('*')
    .single();

  if (updateError || !quest) {
    console.error('[quest-engine] Error completing weekly quest:', updateError);
    return { success: false, xpAwarded: 0, allComplete: false, bonusAwarded: false, newTotalXp: 0, newLevel: 1, newTier: 'Rookie' };
  }

  // Award XP
  const xpResult = await awardXp(profileId, quest.xp_reward, 'quest_weekly', questId, quest.team_id);

  // Check if all weekly quests are now complete
  const weekStart = localMondayOfWeek();
  const { data: allQuests } = await supabase
    .from('weekly_quests')
    .select('is_completed')
    .eq('player_id', profileId)
    .eq('week_start', weekStart);

  const allComplete = (allQuests || []).every((q: { is_completed: boolean }) => q.is_completed);
  let bonusAwarded = false;

  if (allComplete) {
    const { data: existingBonus } = await supabase
      .from('quest_bonus_tracking')
      .select('id')
      .eq('player_id', profileId)
      .eq('bonus_type', 'weekly_all_complete')
      .eq('period_date', weekStart)
      .maybeSingle();

    if (!existingBonus) {
      await awardXp(profileId, 50, 'quest_bonus', null, quest.team_id);
      await supabase.from('quest_bonus_tracking').insert({
        player_id: profileId,
        bonus_type: 'weekly_all_complete',
        period_date: weekStart,
        xp_awarded: 50,
      });
      bonusAwarded = true;
    }
  }

  return {
    success: true,
    xpAwarded: quest.xp_reward,
    allComplete,
    bonusAwarded,
    newTotalXp: xpResult.newTotalXp,
    newLevel: xpResult.newLevel,
    newTier: xpResult.newTier,
  };
}
```

### Step 1G: Add weekly quest progress updater

This function is called to incrementally update weekly quest progress. For example, when a shoutout is given, update the community quest's `current_value`.

```typescript
export async function updateWeeklyQuestProgress(
  profileId: string,
  questType: WeeklyQuestType,
  incrementBy: number = 1
): Promise<{ questCompleted: boolean; questId: string | null }> {
  const weekStart = localMondayOfWeek();

  // Find the matching weekly quest
  const { data: quest } = await supabase
    .from('weekly_quests')
    .select('*')
    .eq('player_id', profileId)
    .eq('week_start', weekStart)
    .eq('quest_type', questType)
    .eq('is_completed', false)
    .maybeSingle();

  if (!quest) return { questCompleted: false, questId: null };

  const newValue = Math.min(quest.current_value + incrementBy, quest.target_value);
  const nowComplete = newValue >= quest.target_value;

  await supabase
    .from('weekly_quests')
    .update({
      current_value: newValue,
      ...(nowComplete ? { is_completed: true, completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', quest.id);

  // If just completed, award XP
  if (nowComplete) {
    await completeWeeklyQuest(quest.id, profileId);
  }

  return { questCompleted: nowComplete, questId: quest.id };
}
```

### Step 1H: Make sure awardXp is accessible

The `awardXp` function was defined as a private function in Phase 1B. It needs to be accessible from `completeWeeklyQuest`. Check if it's already accessible within the same file (it should be since both functions are in `quest-engine.ts`). If for some reason it was defined inside a closure or block scope, move it to module scope. Do NOT change its signature or logic.

**Commit:** `[engagement-weekly] Phase 1: weekly quest generation logic`

---

## PHASE 2: Create useWeeklyQuestEngine hook

Create a new file:
```
hooks/useWeeklyQuestEngine.ts
```

```typescript
import { useState, useEffect, useCallback } from 'react';
import {
  getOrCreateWeeklyQuests,
  WeeklyQuest,
} from '@/lib/quest-engine';
import { supabase } from '@/lib/supabase';

export function useWeeklyQuestEngine() {
  const [quests, setQuests] = useState<WeeklyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [allComplete, setAllComplete] = useState(false);
  const [bonusEarned, setBonusEarned] = useState(false);

  const loadQuests = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weeklyQuests = await getOrCreateWeeklyQuests(user.id);
      setQuests(weeklyQuests);
      setAllComplete(weeklyQuests.length > 0 && weeklyQuests.every(q => q.is_completed));

      // Check if weekly bonus was already earned
      const monday = getMondayStr();
      const { data: bonus } = await supabase
        .from('quest_bonus_tracking')
        .select('id')
        .eq('player_id', user.id)
        .eq('bonus_type', 'weekly_all_complete')
        .eq('period_date', monday)
        .maybeSingle();

      setBonusEarned(!!bonus);
    } catch (err) {
      console.error('[useWeeklyQuestEngine] Error loading weekly quests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  return {
    quests,
    loading,
    allComplete,
    bonusEarned,
    refreshQuests: loadQuests,
  };
}

function getMondayStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}
```

**Commit:** `[engagement-weekly] Phase 2: weekly quest hook`

---

## PHASE 3: Create PlayerWeeklyQuests component

Create a new file:
```
components/player-scroll/PlayerWeeklyQuests.tsx
```

This component displays weekly quests on the Player Home scroll. It should sit BELOW the daily quests section.

### Design guidance:

- **Match the visual style of PlayerDailyQuests exactly.** Same card treatment, same spacing, same font sizes, same color patterns. The only visual differences:
  - Section header says "Weekly quests" instead of "Daily quests"
  - A small "Resets Monday" label in the header (use `rgba(255,255,255,0.3)` or equivalent muted text)
  - Quest cards show a progress bar when `target_value > 1` (e.g., "Give 3 shoutouts" shows 1/3 progress)
  - Bonus bar says "Complete all for +50 XP bonus" instead of +25

### Implementation:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useWeeklyQuestEngine } from '@/hooks/useWeeklyQuestEngine';
```

**Structure the component to:**

1. Call `useWeeklyQuestEngine()` for data
2. If `loading`, show placeholder cards (same dimensions as real cards to prevent layout shift)
3. Map over `quests` and render each as a card with:
   - Completion checkbox (filled green when `is_completed`, accent border when not)
   - Quest title (`quest.title`)
   - Progress indicator: if `target_value > 1`, show `current_value / target_value` and a thin progress bar
   - XP reward badge (`+{xp_reward} XP`)
4. Weekly quests are NOT manually completable by tapping (unlike daily quests). They complete automatically when progress reaches the target. So no `onPress` completion handler needed.
5. Below the quest cards, show the bonus bar:
   - If `bonusEarned`: "All done! +50 XP weekly bonus earned"
   - Else: "Complete all for +50 XP weekly bonus"

**Read `PlayerDailyQuests.tsx` to copy its exact styling patterns.** Use the same color values, border radii, font weights, and spacing. The weekly section should feel like a natural continuation of the daily section, not a separate design.

**Commit:** `[engagement-weekly] Phase 3: PlayerWeeklyQuests component`

---

## PHASE 4: Wire PlayerWeeklyQuests into the Player Home scroll

**File to modify:** `components/PlayerHomeScroll.tsx` (or whatever the parent scroll component is — verify the actual filename)

### What to change:

1. Import the new component:
```typescript
import PlayerWeeklyQuests from '@/components/player-scroll/PlayerWeeklyQuests';
```

2. Add it to the scroll, DIRECTLY AFTER PlayerDailyQuests. Find where `<PlayerDailyQuests ... />` is rendered and place `<PlayerWeeklyQuests />` immediately below it.

3. Do NOT change the position or props of any other component in the scroll.

**Commit:** `[engagement-weekly] Phase 4: wire weekly quests into Player Home scroll`

---

## PHASE 5: Integrate weekly progress updates into existing actions

**File to modify:** `lib/quest-engine.ts`

Inside the `completeQuest` function (daily quest completion), add a call to update the weekly consistency quest. After the streak recording step (Step 2.5), add:

```typescript
  // Step 2.7: Update weekly consistency quest progress
  // Count how many unique days this week the player completed at least 1 daily quest
  const weekStart = localMondayOfWeek();
  const { data: completedDays } = await supabase
    .from('daily_quests')
    .select('quest_date')
    .eq('player_id', profileId)
    .gte('quest_date', weekStart)
    .eq('is_completed', true);

  if (completedDays) {
    const uniqueDays = new Set(completedDays.map((d: { quest_date: string }) => d.quest_date)).size;
    // Directly update the consistency quest's current_value
    await supabase
      .from('weekly_quests')
      .update({ current_value: uniqueDays })
      .eq('player_id', profileId)
      .eq('week_start', weekStart)
      .eq('quest_type', 'consistency')
      .eq('is_completed', false);

    // Check if consistency quest is now complete
    if (uniqueDays >= 5) {
      const { data: consistencyQuest } = await supabase
        .from('weekly_quests')
        .select('id')
        .eq('player_id', profileId)
        .eq('week_start', weekStart)
        .eq('quest_type', 'consistency')
        .eq('is_completed', false)
        .maybeSingle();

      if (consistencyQuest) {
        await completeWeeklyQuest(consistencyQuest.id, profileId);
      }
    }
  }
```

**IMPORTANT:** This is the ONLY additional change to `completeQuest`. Do not change anything else.

**Commit:** `[engagement-weekly] Phase 5: wire daily completion into weekly consistency tracking`

---

## PHASE 6: Verification

### Verify:

1. `lib/quest-engine.ts` now exports: `getOrCreateWeeklyQuests`, `completeWeeklyQuest`, `updateWeeklyQuestProgress`, `WeeklyQuest`, `WeeklyQuestType` (in addition to all Phase 1B exports)
2. `hooks/useWeeklyQuestEngine.ts` exists and exports `useWeeklyQuestEngine`
3. `components/player-scroll/PlayerWeeklyQuests.tsx` exists and renders weekly quest cards
4. `PlayerHomeScroll.tsx` renders `PlayerWeeklyQuests` after `PlayerDailyQuests`
5. Daily quest completion updates weekly consistency quest progress
6. No TypeScript errors (`npx tsc --noEmit`)
7. Visual style of weekly quests matches daily quests

### Report back with:

```
## VERIFICATION REPORT: Phase 1E

### Files Created:
- hooks/useWeeklyQuestEngine.ts: [line count] lines
- components/player-scroll/PlayerWeeklyQuests.tsx: [line count] lines

### Files Modified:
- lib/quest-engine.ts: [describe additions — new functions, new types, consistency tracking in completeQuest]
- components/PlayerHomeScroll.tsx: [describe — import added, component placed after daily quests]

### New Exports from quest-engine.ts:
[list all new exports]

### Weekly Quest Generation:
- Generates 3-5 quests based on schedule: YES / NO
- Attendance quest adapts to event count: YES / NO
- Game quest only appears if games scheduled: YES / NO
- Skill module quest appears if no games: YES / NO

### Progress Tracking:
- Consistency quest updates on daily completion: YES / NO
- Community quest tracks shoutouts: YES / NO (note: shoutout tracking requires separate integration)

### Type Check: PASS / FAIL

### Visual Match (weekly matches daily style): YES / NO

### Errors: NONE / [list]
```

---

## NOTE ON SHOUTOUT TRACKING

The community weekly quest ("Give 3 shoutouts this week") initializes with the current shoutout count at generation time. However, real-time updating as shoutouts are given requires hooking into whatever function handles shoutout creation. That integration is outside this spec's scope. For now:

- The quest generates with the correct current_value at creation time
- If the player gives more shoutouts after quest generation, the count won't auto-update until the next time weekly quests are refreshed (on next app open)
- A future spec can add `updateWeeklyQuestProgress(profileId, 'community', 1)` to the shoutout creation flow

---

## WHAT COMES NEXT

Phase 1 of the engagement system is now COMPLETE after this spec:
- 1: Schema (14 tables + 2 extensions)
- 1A: RLS fix
- 1B: Daily quest engine
- 1C: Streak engine
- 1D: UI wiring
- 1E: Weekly quests (this spec)

Next priorities:
- **Phase 2:** Skill content seeding (populate skill_content + skill_quizzes with volleyball Chapter 1-2 content, map mascot images to nodes)
- **Phase 3:** Journey Path screen (visual map UI accessed from Continue Training card)
- **Asset mapping:** Link the 48 mascot illustrations to skill content, journey nodes, and streak states
