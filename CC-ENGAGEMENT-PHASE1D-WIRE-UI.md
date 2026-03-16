# CC-ENGAGEMENT-PHASE1D-WIRE-UI
# Lynx Player Engagement System — Phase 1D: Wire the UI
# Status: READY FOR CC EXECUTION
# Depends on: Phase 1 schema, Phase 1A RLS fix, Phase 1B quest engine, Phase 1C streak engine

---

## STANDING RULES

1. **Read these files first, in order:**
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
   - `SCHEMA_REFERENCE.csv` in repo root
2. **Only modify the files explicitly listed in this spec.** No other files.
3. **Do NOT modify any database tables, RLS policies, or migration files.**
4. **Do NOT change the visual design or layout of any component.** Same cards, same colors, same spacing, same animations. We are only changing WHERE the data comes from.
5. **Commit after each phase.** Commit message format: `[engagement-wire] Phase X: description`
6. **If something is unclear, STOP and report back.**
7. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Wires the existing Player Home scroll UI to the real engagement system backend. After this spec:

- **PlayerDailyQuests** reads from `daily_quests` table instead of the hardcoded `buildQuests()` function
- **Quest completion is real** — tapping a quest marks it done in the DB and awards XP
- **usePlayerHomeData** reads XP from `profiles.total_xp` instead of the client-side formula
- **Streak data** comes from `streak_data` table via `useStreakEngine`

The UI looks identical. The data behind it is real.

---

## PHASE 1: Investigation — Read before writing

Before making any changes, read these files completely and note their current structure:

1. `components/player-scroll/PlayerDailyQuests.tsx` — the quest card component
2. `hooks/usePlayerHomeData.ts` — the main data hook for the Player Home scroll
3. `components/player-scroll/PlayerHomeScroll.tsx` (or whatever the parent scroll component is) — to understand how data flows from hook to components
4. `hooks/useQuestEngine.ts` — the new quest hook (Phase 1B)
5. `hooks/useStreakEngine.ts` — the new streak hook (Phase 1C)
6. `lib/quest-engine.ts` — the quest engine service
7. `lib/streak-engine.ts` — the streak engine service

**After reading all 7 files, report what you found about:**
- How PlayerDailyQuests currently receives its data (props from parent? direct hook call?)
- How the parent scroll component passes data to PlayerDailyQuests
- Where the `buildQuests()` function is called (inside PlayerDailyQuests or in the parent?)
- How XP is currently displayed (which component reads `xp` from usePlayerHomeData?)
- How streak is currently displayed (which component reads streak data? from where?)
- Any other components that read XP, level, or streak data from usePlayerHomeData

**Then proceed to Phase 2.** Do not wait for confirmation. This investigation step is for YOUR context, not for reporting back.

---

## PHASE 2: Wire PlayerDailyQuests to useQuestEngine

**File to modify:** `components/player-scroll/PlayerDailyQuests.tsx`

### What to change:

**A. Replace the data source.** Remove the `buildQuests()` function entirely. Replace it with a call to `useQuestEngine()`.

Add import:
```typescript
import { useQuestEngine } from '@/hooks/useQuestEngine';
```

**B. Inside the component**, replace the `buildQuests()` call and its related state with:

```typescript
const { quests, loading, completing, allComplete, bonusEarned, completeQuest, refreshQuests } = useQuestEngine();
```

**C. Update the quest card rendering** to use the new data shape. The key mapping:

| Old (buildQuests) | New (useQuestEngine) |
|---|---|
| `quest.id` (string like 'open-lynx') | `quest.id` (UUID from DB) |
| `quest.text` | `quest.title` |
| `quest.xp` | `quest.xp_reward` |
| `quest.completed` | `quest.is_completed` |

**D. Add a completion handler.** When a player taps an incomplete quest, call `completeQuest(quest.id)`. The old component had no tap handler for completion because quests were display-only.

Find the quest card's touchable/pressable element (or add one if it doesn't exist). Wire it like this:

```typescript
onPress={() => {
  if (!quest.is_completed && completing !== quest.id) {
    completeQuest(quest.id);
  }
}}
```

**E. Show loading state.** If `loading` is true, show the existing quest card layout but with a subtle loading indicator (or just render empty cards with the same dimensions to prevent layout shift). Do NOT replace the entire section with a spinner. Keep it feeling fast.

**F. Update the bonus bar.** The existing bonus bar shows "Complete all 3 for +25 XP bonus" or "All done! +25 XP bonus earned". Wire it to use `allComplete` and `bonusEarned` from the hook:

```typescript
// Bonus bar text
{bonusEarned
  ? 'All done! +25 XP bonus earned'
  : allComplete
    ? 'All done! +25 XP bonus earned'  // allComplete triggers bonus automatically
    : `Complete all 3 for +25 XP bonus`
}
```

**G. Remove old props that are no longer needed.** If `PlayerDailyQuests` currently receives `nextEvent`, `rsvpStatus`, `challengesAvailable`, `recentShoutouts`, `badges` as props (used by buildQuests), those props are no longer needed. The quest engine fetches its own context internally.

**HOWEVER:** Do NOT remove the props from the component's type definition yet if other components pass them. Instead:
1. Make the old props optional (add `?` to each)
2. Stop using them inside the component
3. The parent can keep passing them without breaking — they'll just be ignored

This avoids breaking the parent component in this phase.

**Commit:** `[engagement-wire] Phase 2: wire PlayerDailyQuests to useQuestEngine`

---

## PHASE 3: Wire usePlayerHomeData to read DB XP

**File to modify:** `hooks/usePlayerHomeData.ts`

### What to change:

**A. Find the XP calculation.** The investigation report said XP is currently computed client-side:

```typescript
// Something like:
const xp = (gp * 100) + (kills * 10) + (aces * 25) + (digs * 5) + (blocks * 15) + (assists * 10) + (badges * 50);
const level = Math.floor(xp / 1000) + 1;
```

**B. Replace with DB read.** Add a query to fetch `profiles.total_xp`, `profiles.player_level`, `profiles.tier`, `profiles.xp_to_next_level`:

```typescript
// Fetch engagement data from profiles
const { data: engagementData } = await supabase
  .from('profiles')
  .select('total_xp, player_level, tier, xp_to_next_level')
  .eq('id', profileId)
  .single();

const xp = engagementData?.total_xp ?? 0;
const level = engagementData?.player_level ?? 1;
const tier = engagementData?.tier ?? 'Rookie';
const xpToNext = engagementData?.xp_to_next_level ?? 100;
```

**C. Replace the level calculation.** Remove `Math.floor(xp / 1000) + 1` and use `level` from the DB. If you need `xpProgress` (for the XP bar), calculate it using `calculateLevel` from the quest engine:

```typescript
import { calculateLevel } from '@/lib/quest-engine';

// For XP bar progress
const levelInfo = calculateLevel(xp);
const xpProgress = xpToNext > 0
  ? 1 - (xpToNext / (levelInfo.xpToNext + (xp - (LEVEL_THRESHOLDS.find(t => t.level === level)?.cumulative ?? 0))))
  : 1;
```

Actually, simpler approach — just compute progress from what we have:

```typescript
// XP progress within current level (0 to 1 for the bar)
// We know total_xp and xp_to_next_level
// The XP bar should show how far through the current level the player is
const levelThreshold = calculateLevel(xp);
// xpToNext tells us how much more XP is needed
// Find XP required for this level (difference between this level's cumulative and next level's cumulative)
// Simplest: xpProgress = 1 - (xpToNext / xpRequiredForLevel)
// But we need xpRequiredForLevel. Use calculateLevel to get it.
```

**SIMPLER:** Don't overthink the progress bar math. The existing code already computes `xpProgress` somehow. Find that calculation, and replace ONLY the source values (use DB `xp` instead of formula `xp`). Keep the same progress bar math. If the existing code does `xpProgress = (xp % 1000) / 1000`, just let it use the new `xp` value and it'll work fine for now.

**D. Add `tier` to the returned data.** The hook should now return `tier` alongside `xp`, `level`, etc. Add it to whatever object the hook returns.

**E. Keep the old XP formula as a fallback.** If the DB returns 0 for total_xp (because the XP migration hasn't run for existing players), fall back to the old formula:

```typescript
const dbXp = engagementData?.total_xp ?? 0;
// If DB has XP, use it. If not, fall back to computed XP (for existing players pre-migration)
const xp = dbXp > 0 ? dbXp : computedXp; // where computedXp is the old formula
```

This ensures existing players still see their stats-based XP until the system starts recording real XP for them.

**F. Do NOT remove the old XP formula function.** Keep it in the file but use it only as fallback. This makes rollback safe.

**Commit:** `[engagement-wire] Phase 3: wire usePlayerHomeData to DB XP`

---

## PHASE 4: Wire streak display

**This phase depends on what the investigation in Phase 1 reveals.** The streak counter appears in:
- `PlayerIdentityHero` (fire emoji + day count in corner)
- `PlayerMomentumRow` (streak momentum card)
- Possibly `PlayerAmbientCloser` (references streak in the closing message)

### What to change:

**A. Find how streak data currently flows.** The Phase 1B investigation said `usePlayerHomeData` returns `attendanceStreak`. Find where that value is computed and which components consume it.

**B. Add `useStreakEngine` data to the flow.** There are two approaches:

**Option 1 (preferred): Add streak data to usePlayerHomeData's return value.**
Inside `usePlayerHomeData`, import and call `checkStreakState`:

```typescript
import { checkStreakState } from '@/lib/streak-engine';

// Inside the data fetch:
const streakState = await checkStreakState(profileId);
```

Add to the hook's return: `engagementStreak: streakState`

Then components that currently read `attendanceStreak` can also read `engagementStreak.currentStreak`.

**Option 2: Components call useStreakEngine directly.**
Each component that shows streak data imports `useStreakEngine` and calls it. This causes multiple hook instances and multiple DB queries. Less efficient. Use Option 1.

**C. Update the streak display.** Find the component that shows the streak counter (fire emoji + number). Change its data source:

```typescript
// Old:
const streakCount = attendanceStreak; // or however it was computed

// New:
const streakCount = engagementStreak?.currentStreak ?? attendanceStreak ?? 0;
```

Use the engagement streak if available, fall back to attendance streak for existing players.

**D. Do NOT change the visual design of the streak display.** Same fire emoji, same number, same position.

**Commit:** `[engagement-wire] Phase 4: wire streak display to engagement engine`

---

## PHASE 5: Verification

### Verify:

1. **PlayerDailyQuests** no longer calls `buildQuests()`. It uses `useQuestEngine()`.
2. **Quest completion works.** Tapping a quest calls `completeQuest(quest.id)`.
3. **usePlayerHomeData** reads `profiles.total_xp` from the DB (with fallback to old formula).
4. **Streak display** reads from the engagement streak engine (with fallback to attendance streak).
5. **No TypeScript errors.** Run `npx tsc --noEmit`.
6. **No layout changes.** The Player Home scroll should look identical.
7. **Only these files were modified:**
   - `components/player-scroll/PlayerDailyQuests.tsx`
   - `hooks/usePlayerHomeData.ts`
   - One or more streak display components (list which ones)
8. **No other files were modified.**

### Report back with:

```
## VERIFICATION REPORT: Phase 1D

### Files Modified:
- components/player-scroll/PlayerDailyQuests.tsx: [describe changes]
- hooks/usePlayerHomeData.ts: [describe changes]
- [any streak display components]: [describe changes]

### buildQuests() Removed: YES / NO
### useQuestEngine() Wired: YES / NO
### Quest Completion Handler Added: YES / NO

### XP Source Changed:
- Old: [describe old source]
- New: [describe new source]
- Fallback preserved: YES / NO

### Streak Source Changed:
- Old: [describe old source]
- New: [describe new source]
- Fallback preserved: YES / NO

### Type Check: PASS / FAIL

### Visual Changes: NONE / [describe if any]

### Files NOT Modified (confirm these are untouched):
- lib/quest-engine.ts: UNTOUCHED
- lib/streak-engine.ts: UNTOUCHED
- hooks/useQuestEngine.ts: UNTOUCHED
- hooks/useStreakEngine.ts: UNTOUCHED
- All database migrations: UNTOUCHED

### Errors: NONE / [list]
```

---

## WHAT COMES NEXT (NOT IN THIS SPEC)

After Phase 1D, the Player Home scroll shows real quests from the database, real XP from profiles, and real streak data. The engagement system is live.

Next phases:
- **Phase 1E:** Weekly quest generation (extend quest engine to generate weekly quests on first Monday open)
- **Phase 2:** Skill content seeding (populate skill_content table with volleyball Chapter 1-2 content)
- **Phase 3:** Journey Path screen (the visual map UI accessed from Continue Training card)
