# CC-QUEST-UX-OVERHAUL
# Lynx Quest UX Overhaul — Consolidation, Verification, Real-Time Refresh
# Status: READY FOR CC EXECUTION

---

## STANDING RULES

1. **Read these files first, in order:**
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
   - `SCHEMA_REFERENCE.csv` in repo root
2. **Read every file you are asked to modify COMPLETELY before making changes.**
3. **Commit after each phase.** Commit message format: `[quest-ux] Phase X: description`
4. **If something is unclear, STOP and report back.**
5. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Three connected improvements:

1. **Quest consolidation:** Remove PlayerDailyQuests, PlayerWeeklyQuests, and PlayerTeamQuests from the home scroll. Replace with a single compact "Quests" entry card. Create a dedicated QuestsScreen with tabs/sections for Daily, Weekly, and Team quests.

2. **Quest verification:** Quests no longer complete on tap. Tapping a quest navigates to the relevant action (stats page, shoutout flow, journey path, etc.). The system auto-detects when the action is actually performed and completes the quest.

3. **Real-time refresh:** After any XP-awarding action (quest complete, shoutout sent, skill module finished), all relevant hooks refresh without requiring logout/login.

---

## PHASE 1: Investigation — Read before writing

Read and report:

1. **PlayerHomeScroll.tsx** — Find and note the exact JSX for PlayerDailyQuests, PlayerWeeklyQuests, and PlayerTeamQuests. What props do they receive? What position are they in the scroll order?

2. **PlayerContinueTraining.tsx** — This is the visual reference for the new quest card. Note its exact styling: gradient colors, border radius, padding, font sizes, icon treatment.

3. **How does navigation work from the home scroll?** When a user taps Continue Training, what's the navigation call? `router.push`? `navigation.navigate`? Note the exact pattern.

4. **What screens/routes exist for these actions?**
   - View stats: is there a "My Stats" screen? What's the route?
   - Give shoutout: is there a shoutout creation flow? What's the route?
   - View badges/trophy case: route?
   - Check leaderboard: route?
   - View active challenges: route?
   - Journey path: route?

5. **How does the shoutout creation flow work?** Find the file. Does it have a callback or event when a shoutout is successfully sent? Where does it write to the database?

6. **How does usePlayerHomeData refresh?** Is there a `refresh()` function returned? How is it triggered (pull-to-refresh)?

7. **Find any existing event/callback system.** Does the app use React Context, event emitters, or any pub/sub pattern for cross-component communication? Or is it purely prop-based?

**Report findings, then proceed to Phase 2.** Do not wait for confirmation.

---

## PHASE 2: Create the QuestsScreen

Create a new file using the app's routing pattern (likely `app/quests.tsx`).

### Design:

**Background:** Match the app's standard screen background.

**Header:**
- Back arrow
- "Quests" title
- Right side: total XP earned today as a pill (e.g., "+45 XP today")

**Three sections, vertically stacked (NOT tabs):**

Each section has a header with the category name, reset timing, and completion count.

### Section 1: Today's Quests

**Header:** "Today's quests" + "X/3 done" on the right

**Quest cards:** Each card shows:
- Left: quest type mascot image (28px, from `getQuestMascot`)
- Middle: quest title + short description
- Right: XP reward pill (+5 XP, +10 XP, etc.)
- Completion state: green checkmark overlay when done, card dims slightly
- **Tappable:** navigates to the relevant action (see Quest Navigation Map below)
- If quest is already completed: card shows as done, tap does nothing (or shows a "Completed" toast)

**Bonus bar:** "All done! +25 XP bonus earned" or "Complete all 3 for +25 XP bonus"

### Section 2: Weekly Quests

**Header:** "Weekly quests" + "Resets Monday" + "X/Y done"

**Quest cards:** Same visual pattern as daily, but with progress bars for multi-step quests:
- Progress indicator below the title: "1/3 shoutouts" with a thin progress bar
- Tappable: navigates to the relevant action

**Bonus bar:** "Complete all for +50 XP weekly bonus"

### Section 3: Team Quests

**Header:** "Team quests" + "X/Y done"

**Quest cards:** Same visual pattern, but with group progress bar:
- Team progress: "8/12 players attended" with a thicker progress bar
- Contributor info (age-based visibility, same as existing PlayerTeamQuests)
- NOT tappable for completion (team quests complete automatically)

### Quest Navigation Map

When a quest card is tapped, navigate to the action. Map `quest_type` to navigation:

```typescript
function getQuestNavigation(quest: DailyQuest | WeeklyQuest): { route: string; params?: any } | null {
  switch (quest.quest_type) {
    case 'app_checkin':
      return null; // Auto-completed on app open, no navigation needed
    case 'stats_check':
      return { route: '/my-stats' }; // or whatever the stats route is
    case 'social_action':
      return { route: '/give-shoutout' }; // or shoutout creation route
    case 'attendance':
      return { route: '/schedule' }; // or events/RSVP route
    case 'drill_completion':
      return { route: '/(tabs)/journey' }; // Journey path for drills
    case 'skill_tip':
      return { route: '/(tabs)/journey' }; // Journey path for tips
    case 'skill_module':
      return { route: '/(tabs)/journey' }; // Journey path for modules
    case 'quiz':
      return { route: '/(tabs)/journey' }; // Journey path for quizzes
    case 'game_performance':
      return null; // Auto-detected from game stats
    case 'community':
      return { route: '/give-shoutout' }; // Give shoutout
    case 'consistency':
      return null; // Auto-tracked from daily quest completions
    default:
      return null;
  }
}
```

**IMPORTANT:** The investigation step must confirm actual route names. Adjust the map based on what exists. If a route doesn't exist (e.g., no dedicated shoutout creation screen), use the closest available screen or skip navigation for that quest type.

**When navigating from a quest:** Pass the quest ID as a param so the system knows which quest triggered the navigation. This is used for auto-completion tracking:

```typescript
router.push(`${route}?fromQuest=${quest.id}`);
```

**Commit:** `[quest-ux] Phase 2: QuestsScreen with navigation`

---

## PHASE 3: Create the compact QuestEntryCard for home scroll

Create a new file:
```
components/player-scroll/PlayerQuestEntryCard.tsx
```

### Design:

This card replaces the three quest components on the home scroll. It should be visually similar to PlayerContinueTraining — a flashy gradient card that invites the tap.

**Visual treatment:**
- Background: gradient (use a complementary gradient to Continue Training. If Continue Training is purple, use sky-blue or teal. Read the actual Continue Training gradient and pick a different one.)
- Border radius: match Continue Training (likely rounded-[14px])
- Padding: generous, same as Continue Training

**Content:**
- Top left: "Quests" label (Outfit or Bebas Neue, bold, white)
- Top right: mascot image (32px, LYNXREADY or AREYOUREADY)
- Middle: compact progress summary showing all three quest types in one line:
  - Three small progress rings or pill badges: "Daily 2/3" + "Weekly 1/4" + "Team 0/2"
  - Each ring/pill is color-coded: green if complete, accent if in-progress, muted if not started
- Bottom: XP earned today as text: "+45 XP today" or "No XP earned yet today"
- Bottom right: small arrow indicating tappable

**onPress:** Navigate to QuestsScreen:
```typescript
router.push('/quests');
```

### Data source:

This component needs data from all three quest hooks. However, calling three hooks in one card is heavy. Instead, create a lightweight combined hook or pass the data as props from PlayerHomeScroll (which already calls these hooks for the existing quest components).

**Option A (preferred):** PlayerHomeScroll already has useQuestEngine and useWeeklyQuestEngine data. Pass summary counts as props:

```typescript
<PlayerQuestEntryCard
  dailyComplete={dailyQuests.filter(q => q.is_completed).length}
  dailyTotal={dailyQuests.length}
  weeklyComplete={weeklyQuests.filter(q => q.is_completed).length}
  weeklyTotal={weeklyQuests.length}
  teamComplete={teamQuests.filter(q => q.is_completed).length}
  teamTotal={teamQuests.length}
  xpEarnedToday={/* calculate from quest XP */}
/>
```

**Commit:** `[quest-ux] Phase 3: PlayerQuestEntryCard`

---

## PHASE 4: Replace quest components on home scroll

**File to modify:** `components/PlayerHomeScroll.tsx`

### What to change:

1. **Remove** `<PlayerDailyQuests>`, `<PlayerWeeklyQuests>`, and `<PlayerTeamQuests>` from the scroll JSX.

2. **Add** `<PlayerQuestEntryCard>` in their place. Put it in a single position (where PlayerDailyQuests used to be, slot 4 in the scroll order).

3. **Keep the hooks** (useQuestEngine, useWeeklyQuestEngine, useTeamQuests) in PlayerHomeScroll. They still need to run to generate quests on app open. Just stop rendering the full quest components and instead pass summary data to PlayerQuestEntryCard.

4. **Do NOT delete** the PlayerDailyQuests, PlayerWeeklyQuests, or PlayerTeamQuests component files. They may be reused inside QuestsScreen or for future reference. Just remove them from the home scroll.

**New scroll order should be approximately:**
1. PlayerIdentityHero
2. CompetitiveNudge
3. PlayerQuickLinks
4. **PlayerQuestEntryCard** (NEW — replaces Daily + Weekly + Team quests)
5. PlayerChallengeCard (conditional)
6. PlayerLeaderboardPreview
7. PlayerPropsSection
8. PlayerTeamHubCard
9. PlayerContinueTraining
10. NextUpCard
11. PlayerMomentumRow
12. LastGameStats
13. PlayerTrophyCase
14. PlayerTeamActivity
15. PlayerAmbientCloser

**Commit:** `[quest-ux] Phase 4: consolidate quests on home scroll`

---

## PHASE 5: Quest auto-completion system

**File to modify:** `lib/quest-engine.ts`

### What to change:

Add a new function that checks if a quest's action was actually performed and auto-completes it. This replaces the manual tap-to-complete model.

```typescript
// ─── Auto-Completion Checker ─────────────────────────────────────────────────
// Called after a player performs an action. Checks if any active quest
// matches that action and completes it if so.

export async function checkAndCompleteQuests(
  profileId: string,
  actionType: string,
  actionData?: { teamId?: string; eventId?: string }
): Promise<{
  questsCompleted: string[];
  totalXpAwarded: number;
}> {
  const today = localToday();
  const questsCompleted: string[] = [];
  let totalXpAwarded = 0;

  // Check daily quests
  const { data: dailyQuests } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('player_id', profileId)
    .eq('quest_date', today)
    .eq('is_completed', false);

  for (const quest of (dailyQuests || [])) {
    if (shouldAutoComplete(quest.quest_type, actionType)) {
      const result = await completeQuest(quest.id, profileId);
      if (result.success) {
        questsCompleted.push(quest.id);
        totalXpAwarded += result.xpAwarded;
      }
    }
  }

  // Check weekly quests for progress
  const weekStart = localMondayOfWeek();
  const { data: weeklyQuests } = await supabase
    .from('weekly_quests')
    .select('*')
    .eq('player_id', profileId)
    .eq('week_start', weekStart)
    .eq('is_completed', false);

  for (const quest of (weeklyQuests || [])) {
    if (shouldUpdateWeeklyProgress(quest.quest_type, actionType)) {
      await updateWeeklyQuestProgress(profileId, quest.quest_type, 1);
    }
  }

  return { questsCompleted, totalXpAwarded };
}

function shouldAutoComplete(questType: string, actionType: string): boolean {
  const map: Record<string, string[]> = {
    'app_checkin': ['app_open'],
    'stats_check': ['view_stats'],
    'social_action': ['shoutout_sent'],
    'attendance': ['attendance_marked'],
    'drill_completion': ['drill_completed', 'skill_module_completed'],
    'skill_tip': ['tip_viewed', 'skill_module_completed'],
    'skill_module': ['skill_module_completed'],
    'quiz': ['quiz_completed', 'skill_module_completed'],
  };
  return (map[questType] || []).includes(actionType);
}

function shouldUpdateWeeklyProgress(questType: string, actionType: string): boolean {
  const map: Record<string, string[]> = {
    'community': ['shoutout_sent'],
    'attendance': ['attendance_marked'],
    'game_performance': ['game_played'],
    'skill_module': ['skill_module_completed'],
  };
  return (map[questType] || []).includes(actionType);
}
```

**Export** `checkAndCompleteQuests` from quest-engine.ts.

**Commit:** `[quest-ux] Phase 5: quest auto-completion system`

---

## PHASE 6: Wire auto-completion triggers into existing actions

### 6A: Shoutout creation

**Find the file that handles shoutout creation** (likely a service function or a component that calls `supabase.from('shoutouts').insert(...)`).

After a shoutout is successfully inserted, add:

```typescript
import { checkAndCompleteQuests } from '@/lib/quest-engine';

// After successful shoutout insert:
await checkAndCompleteQuests(userId, 'shoutout_sent', { teamId });
```

### 6B: Stats page view

**Find the stats screen** (My Stats or equivalent). When the screen mounts or data loads:

```typescript
import { checkAndCompleteQuests } from '@/lib/quest-engine';

// On mount or after data loads:
useEffect(() => {
  const checkQuest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await checkAndCompleteQuests(user.id, 'view_stats');
    }
  };
  checkQuest();
}, []);
```

### 6C: Skill module completion

**Find where skill module completion happens** (in `useSkillModule` or `SkillModuleScreen`). After the module completes:

```typescript
await checkAndCompleteQuests(userId, 'skill_module_completed');
```

This should already be partially wired since the skill module awards XP. Add the quest check call alongside it.

### 6D: Leaderboard view

**Find the leaderboard screen or preview.** On mount:

```typescript
await checkAndCompleteQuests(userId, 'view_leaderboard');
```

Wait. "Check the leaderboard" quest type is `stats_check` in our current system, not a separate type. Check the actual quest_type values being generated. If there's a leaderboard quest, add the trigger. If not, skip this.

### 6E: Badge/trophy view

Same pattern. If there's a "View your new badge" quest, trigger on trophy case mount:

```typescript
await checkAndCompleteQuests(userId, 'view_badges');
```

**IMPORTANT for all triggers:** Only add the trigger call. Do not change the existing functionality of any screen. The auto-complete call is fire-and-forget (don't await in a way that blocks the UI).

**Commit:** `[quest-ux] Phase 6: wire auto-completion triggers`

---

## PHASE 7: Real-time refresh system

Create a simple event-based refresh system so hooks update after actions.

### 7A: Create a refresh event bus

Create a new file:
```
lib/refresh-bus.ts
```

```typescript
type RefreshCallback = () => void;
type RefreshEvent = 'quests' | 'xp' | 'streak' | 'journey' | 'leaderboard' | 'notifications' | 'all';

const listeners: Map<RefreshEvent, Set<RefreshCallback>> = new Map();

export function onRefresh(event: RefreshEvent, callback: RefreshCallback): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(callback);

  // Return unsubscribe function
  return () => {
    listeners.get(event)?.delete(callback);
  };
}

export function emitRefresh(event: RefreshEvent): void {
  // Fire specific event listeners
  listeners.get(event)?.forEach(cb => cb());

  // 'all' event also fires on specific events
  if (event !== 'all') {
    listeners.get('all')?.forEach(cb => cb());
  }
}
```

### 7B: Subscribe hooks to refresh events

**Modify these hooks** to subscribe to refresh events:

**hooks/useQuestEngine.ts:**
```typescript
import { onRefresh } from '@/lib/refresh-bus';

// Inside the hook:
useEffect(() => {
  const unsub = onRefresh('quests', loadQuests);
  return unsub;
}, [loadQuests]);
```

**hooks/useWeeklyQuestEngine.ts:** Same pattern, subscribe to 'quests'.

**hooks/usePlayerHomeData.ts:** Subscribe to 'xp' and 'streak':
```typescript
useEffect(() => {
  const unsubXp = onRefresh('xp', refresh);
  const unsubStreak = onRefresh('streak', refresh);
  return () => { unsubXp(); unsubStreak(); };
}, [refresh]);
```

**hooks/useJourneyPath.ts:** Subscribe to 'journey':
```typescript
useEffect(() => {
  const unsub = onRefresh('journey', loadJourney);
  return unsub;
}, [loadJourney]);
```

### 7C: Emit refresh events after actions

**In quest-engine.ts** — after `completeQuest` awards XP:
```typescript
import { emitRefresh } from '@/lib/refresh-bus';

// At the end of completeQuest (after all DB writes):
emitRefresh('quests');
emitRefresh('xp');
emitRefresh('streak');
```

**In useSkillModule.ts** — after module completion:
```typescript
import { emitRefresh } from '@/lib/refresh-bus';

// After completeModule:
emitRefresh('journey');
emitRefresh('quests');
emitRefresh('xp');
```

**In the shoutout creation flow** — after shoutout sent:
```typescript
emitRefresh('quests');
```

**In checkAndCompleteQuests** — after any quest auto-completes:
```typescript
if (questsCompleted.length > 0) {
  emitRefresh('quests');
  emitRefresh('xp');
}
```

### 7D: Journey Path refresh after celebration

**Find NodeCompletionCelebration.tsx** (or the celebration overlay). When the "Continue" button is pressed and navigation happens back to JourneyPathScreen:

```typescript
import { emitRefresh } from '@/lib/refresh-bus';

// On Continue press:
emitRefresh('journey');
emitRefresh('xp');
emitRefresh('quests');
// Then navigate back
```

This ensures the Journey Path screen re-fetches and shows the completed node + unlocked next node.

**Commit:** `[quest-ux] Phase 7: real-time refresh system`

---

## PHASE 8: Register QuestsScreen in navigation

Ensure the QuestsScreen is registered and accessible:
```typescript
router.push('/quests');
```

**Commit:** `[quest-ux] Phase 8: register quests screen`

---

## PHASE 9: Verification

### Verify:

1. **Home scroll** shows PlayerQuestEntryCard instead of three separate quest sections
2. **PlayerQuestEntryCard** shows compact summary (daily X/3, weekly X/Y, team X/Y) with gradient background
3. **Tapping the card** navigates to QuestsScreen
4. **QuestsScreen** shows all three quest types with proper progress
5. **Tapping a quest** navigates to the relevant action (stats, shoutout, journey, etc.)
6. **Auto-completion works:** viewing stats completes "Check your stats" quest
7. **Auto-completion works:** sending a shoutout completes "Give a teammate props" and updates weekly shoutout count
8. **Real-time refresh:** after completing a quest, the QuestsScreen updates without leaving
9. **Real-time refresh:** after completing a skill module, Journey Path shows node as completed
10. **Real-time refresh:** XP on PlayerIdentityHero updates after quest/module completion
11. **No TypeScript errors**
12. **PlayerDailyQuests.tsx, PlayerWeeklyQuests.tsx, PlayerTeamQuests.tsx files still exist** (not deleted, just removed from scroll)

### Report back with:

```
## VERIFICATION REPORT: Quest UX Overhaul

### Files Created: [count]
[list each with line count]

### Files Modified: [count]
[list each with description]

### Home Scroll:
- Old quest components removed: YES / NO
- PlayerQuestEntryCard added: YES / NO
- Scroll feels shorter/cleaner: YES / NO

### QuestsScreen:
- Daily section: RENDERS / BROKEN
- Weekly section: RENDERS / BROKEN
- Team section: RENDERS / BROKEN
- Quest tap navigation: WORKS for [list quest types] / BROKEN for [list]

### Auto-Completion:
- Stats view > stats_check quest: WORKS / NOT WIRED [reason]
- Shoutout sent > social_action quest + weekly community: WORKS / NOT WIRED [reason]
- Skill module complete > skill_module quest: WORKS / NOT WIRED [reason]

### Real-Time Refresh:
- Quest completion > quest list updates: WORKS / BROKEN
- Skill module > journey path updates: WORKS / BROKEN
- Quest completion > XP display updates: WORKS / BROKEN
- Celebration > journey refresh: WORKS / BROKEN

### Type Check: PASS / FAIL

### Errors: NONE / [list]
```
