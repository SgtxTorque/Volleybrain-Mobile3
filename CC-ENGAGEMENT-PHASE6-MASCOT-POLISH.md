# CC-ENGAGEMENT-PHASE6-MASCOT-POLISH
# Lynx Player Engagement System — Phase 6: Mascot Polish Pass
# Status: READY FOR CC EXECUTION
# Depends on: All Phases 1-5 complete, asset processing (transparent PNGs) complete

---

## STANDING RULES

1. **Read these files first, in order:**
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
   - `MASCOT-ASSET-MAP.md` in repo root
2. **Read every component you are asked to modify COMPLETELY before making changes.**
3. **Do NOT modify any engine files (lib/*.ts), hooks, database migrations, or RLS policies.**
4. **Do NOT change component layout, spacing, or design tokens.** Only change image sources, text content, and add image rendering where specified.
5. **Commit after each phase.** Commit message format: `[mascot-polish] Phase X: description`
6. **If something is unclear, STOP and report back.**
7. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Wires the 48 mascot illustrations from `assets/images/activitiesmascot/` into components throughout the player experience. After this spec, the Lynx cub mascot has a visible personality across every major touchpoint in the app.

This is a visual polish pass. No new features, no new logic, no new screens. Just images and contextual text.

---

## PHASE 1: Create mascot image utility

Create a new file:
```
lib/mascot-images.ts
```

This file centralizes all mascot image imports and provides helper functions for context-aware image selection.

```typescript
// ─── Mascot Image Registry ───────────────────────────────────────────────────
// Central registry for all mascot illustrations.
// Components import from here, never directly from assets.

// Skill / Training
export const MASCOT = {
  // Passing
  BEGINNER_PASS: require('@/assets/images/activitiesmascot/BEGINNERPASS.png'),
  WALL_PASS: require('@/assets/images/activitiesmascot/WALLPASS.png'),
  MORE_PASSING: require('@/assets/images/activitiesmascot/MOREPASSING.png'),
  BUDDY_PASS: require('@/assets/images/activitiesmascot/BUDDYPASS.png'),
  SELF_PASS: require('@/assets/images/activitiesmascot/SELFPASS.png'),
  PARENT_PASS: require('@/assets/images/activitiesmascot/PARENTPASS.png'),
  DIVE_PASS: require('@/assets/images/activitiesmascot/DIVEPASS.png'),
  PANCAKE: require('@/assets/images/activitiesmascot/PANCAKE.png'),
  CALL_BALL: require('@/assets/images/activitiesmascot/CALLBALL.png'),
  THREE_PERSON_PEPPER: require('@/assets/images/activitiesmascot/3PERSONPEPPER.png'),

  // Serving
  UNDERHAND_SERVE: require('@/assets/images/activitiesmascot/UNDERHANDSERVE.png'),
  OVERHAND_SERVE: require('@/assets/images/activitiesmascot/OVERHANDSERVE.png'),
  BEGINNER_JUMP_SERVE: require('@/assets/images/activitiesmascot/BEGINNERJUMPSERVE.png'),
  ADVANCE_JUMP_SERVE: require('@/assets/images/activitiesmascot/ADVANCEJUMPSERVE.png'),

  // Setting / Hitting
  SETTER_HANDS: require('@/assets/images/activitiesmascot/SETTERHANDS.png'),
  HIT_APPROACH: require('@/assets/images/activitiesmascot/HITAPPROACH.png'),
  BACK_ROW_ATTACK: require('@/assets/images/activitiesmascot/BACKROWATTACK.png'),
  WALL_SETS: require('@/assets/images/activitiesmascot/WALLSETS.png'),

  // Defense
  DEFENSE_READY: require('@/assets/images/activitiesmascot/defenseready.png'),

  // Movement / Conditioning
  MOVEMENT_DRILL: require('@/assets/images/activitiesmascot/MOVEMENTDRILL.png'),
  GET_ACTIVE: require('@/assets/images/activitiesmascot/GETACTIVE.png'),
  RUSSIAN_TWIST: require('@/assets/images/activitiesmascot/RUSSIANTWIST.png'),
  PUSHUP: require('@/assets/images/activitiesmascot/PUSHUP.png'),

  // Streak States
  NO_STREAK: require('@/assets/images/activitiesmascot/NOSTREAK.png'),
  TWO_DAY_STREAK: require('@/assets/images/activitiesmascot/2DAYSTREAKNEXTLEVEL.png'),
  THREE_DAY_STREAK: require('@/assets/images/activitiesmascot/3DAYSTREAK.png'),
  SEVEN_DAY_STREAK: require('@/assets/images/activitiesmascot/7DAYSTREAK.png'),
  EXERCISE_STREAK: require('@/assets/images/activitiesmascot/EXERCISESTREAK.png'),
  ON_FIRE: require('@/assets/images/activitiesmascot/onfire.png'),
  LEGENDARY_STREAK: require('@/assets/images/activitiesmascot/100DAYSTREAKLEGENDARY.png'),

  // Social / Team
  ENCOURAGING_TEAMMATE: require('@/assets/images/activitiesmascot/ENCOURAGINGTEAMMATE.png'),
  HELPING_TEAMMATE: require('@/assets/images/activitiesmascot/HELPINGTEAMMATE.png'),
  HELPING_NERVOUS: require('@/assets/images/activitiesmascot/HELPINGNERVOUSETEAMMATE.png'),
  SPORTSMANSHIP: require('@/assets/images/activitiesmascot/SPORTSMANSHIP.png'),
  TEAM_HUDDLE: require('@/assets/images/activitiesmascot/TEAMHUDDLE.png'),
  TEAM_ACHIEVEMENT: require('@/assets/images/activitiesmascot/TEAMACHIEVEMENT.png'),

  // General / UI
  LYNX_READY: require('@/assets/images/activitiesmascot/LYNXREADY.png'),
  ARE_YOU_READY: require('@/assets/images/activitiesmascot/AREYOUREADY.png'),
  VISUALIZE: require('@/assets/images/activitiesmascot/VISUALIZE.png'),
  CONFUSED: require('@/assets/images/activitiesmascot/confused.png'),
  SURPRISED: require('@/assets/images/activitiesmascot/SURPRISED.png'),
  EXCITED_ACHIEVEMENT: require('@/assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png'),
  WATCHING_FILM: require('@/assets/images/activitiesmascot/watchingfilm.png'),
  LIVE_EAT_SLEEP: require('@/assets/images/activitiesmascot/LIVEEATSLEEPVOLLEYBALL.png'),
  BACKYARD_PRACTICE: require('@/assets/images/activitiesmascot/BACKYARDPRACTICE.png'),
  FOOLING_AROUND: require('@/assets/images/activitiesmascot/FOOLINGAROUNDWITHDAD.png'),
  ADVANCE_COACH: require('@/assets/images/activitiesmascot/ADVANCECOACH.png'),
};

// ─── Context-Aware Selectors ─────────────────────────────────────────────────

/** Returns a greeting mascot image based on time of day */
export function getGreetingMascot(): any {
  const hour = new Date().getHours();
  if (hour < 6) return MASCOT.LIVE_EAT_SLEEP;       // Late night / very early
  if (hour < 12) return MASCOT.LYNX_READY;           // Morning
  if (hour < 17) return MASCOT.ARE_YOU_READY;         // Afternoon
  if (hour < 21) return MASCOT.GET_ACTIVE;            // Evening (practice time)
  return MASCOT.LIVE_EAT_SLEEP;                       // Late night
}

/** Returns a streak mascot image based on current streak count */
export function getStreakMascot(streakCount: number): any {
  if (streakCount <= 0) return MASCOT.NO_STREAK;
  if (streakCount <= 2) return MASCOT.TWO_DAY_STREAK;
  if (streakCount <= 6) return MASCOT.THREE_DAY_STREAK;
  if (streakCount <= 13) return MASCOT.SEVEN_DAY_STREAK;
  if (streakCount <= 29) return MASCOT.ON_FIRE;
  if (streakCount <= 59) return MASCOT.EXERCISE_STREAK;
  if (streakCount <= 99) return MASCOT.ON_FIRE;
  return MASCOT.LEGENDARY_STREAK;
}

/** Returns a mascot image for quest type */
export function getQuestMascot(questType: string): any {
  switch (questType) {
    case 'app_checkin': return MASCOT.LYNX_READY;
    case 'skill_tip': return MASCOT.VISUALIZE;
    case 'drill_completion': return MASCOT.GET_ACTIVE;
    case 'social_action': return MASCOT.ENCOURAGING_TEAMMATE;
    case 'quiz': return MASCOT.CONFUSED;
    case 'attendance': return MASCOT.ARE_YOU_READY;
    case 'stats_check': return MASCOT.WATCHING_FILM;
    case 'skill_module': return MASCOT.BEGINNER_PASS;
    case 'game_performance': return MASCOT.HIT_APPROACH;
    case 'community': return MASCOT.SPORTSMANSHIP;
    case 'consistency': return MASCOT.EXERCISE_STREAK;
    default: return MASCOT.LYNX_READY;
  }
}

/** Returns a mascot for the ambient closer based on context */
export function getCloserMascot(context: {
  streakCount: number;
  hasEventTomorrow: boolean;
  justLeveledUp: boolean;
  timeOfDay: number;
}): { image: any; message: string } {
  const { streakCount, hasEventTomorrow, justLeveledUp, timeOfDay } = context;

  if (justLeveledUp) {
    return { image: MASCOT.EXCITED_ACHIEVEMENT, message: 'New level unlocked. Go see what is waiting for you.' };
  }
  if (hasEventTomorrow && timeOfDay >= 18) {
    return { image: MASCOT.ARE_YOU_READY, message: 'Game tomorrow. Rest up and come ready.' };
  }
  if (streakCount >= 100) {
    return { image: MASCOT.LEGENDARY_STREAK, message: 'Legendary. You are built different.' };
  }
  if (streakCount >= 30) {
    return { image: MASCOT.ON_FIRE, message: `${streakCount} days strong. The whole team sees you.` };
  }
  if (streakCount >= 7) {
    return { image: MASCOT.SEVEN_DAY_STREAK, message: `${streakCount}-day streak. Keep the fire alive.` };
  }
  if (streakCount > 0) {
    return { image: MASCOT.TWO_DAY_STREAK, message: `${streakCount}-day streak. Come back tomorrow.` };
  }
  if (timeOfDay >= 21) {
    return { image: MASCOT.LIVE_EAT_SLEEP, message: 'Good night. See you tomorrow.' };
  }
  if (timeOfDay < 7) {
    return { image: MASCOT.LIVE_EAT_SLEEP, message: 'Early bird. Respect.' };
  }
  return { image: MASCOT.LYNX_READY, message: 'Open Lynx tomorrow. Your streak starts with one day.' };
}

/** Returns a mascot for empty states */
export function getEmptyStateMascot(context: string): { image: any; message: string } {
  switch (context) {
    case 'no_quests':
      return { image: MASCOT.CONFUSED, message: 'No quests right now. Check back tomorrow.' };
    case 'no_badges':
      return { image: MASCOT.ARE_YOU_READY, message: 'No badges yet. Complete quests and challenges to earn them.' };
    case 'no_stats':
      return { image: MASCOT.CONFUSED, message: 'No stats recorded yet. Play a game to see your numbers.' };
    case 'no_notifications':
      return { image: MASCOT.LYNX_READY, message: 'No notifications yet. Keep playing and the Lynx cub will check in.' };
    case 'no_leaderboard':
      return { image: MASCOT.LYNX_READY, message: 'Leaderboard starts this Monday. Earn XP to claim your spot.' };
    case 'no_team_quests':
      return { image: MASCOT.TEAM_HUDDLE, message: 'No team quests this week. Check back Monday.' };
    case 'journey_complete':
      return { image: MASCOT.LEGENDARY_STREAK, message: 'All 8 chapters complete. You are a champion.' };
    case 'error':
      return { image: MASCOT.CONFUSED, message: 'Something went wrong. Pull down to refresh.' };
    default:
      return { image: MASCOT.LYNX_READY, message: '' };
  }
}
```

**Commit:** `[mascot-polish] Phase 1: mascot image registry and context selectors`

---

## PHASE 2: Wire mascot into PlayerIdentityHero

**File to modify:** `components/player-scroll/PlayerIdentityHero.tsx`

### What to change:

Find the existing mascot/avatar area in the hero card. The component likely already has a mascot image or placeholder. Replace the static image source with the time-of-day greeting mascot.

Add import:
```typescript
import { getGreetingMascot } from '@/lib/mascot-images';
```

Find the mascot `Image` component and update its source:
```typescript
source={getGreetingMascot()}
```

**Size:** The mascot image in the hero card should be approximately 56-64px. Match whatever size the existing mascot/avatar uses. Do not change the size.

**Do NOT change anything else in this component.** Same layout, same greeting text logic, same XP bar, same streak counter.

**Commit:** `[mascot-polish] Phase 2: time-of-day mascot in PlayerIdentityHero`

---

## PHASE 3: Wire mascot into streak display

**File to modify:** Find the component that displays the streak on the home scroll. This could be inside `PlayerIdentityHero` (streak counter in the corner) or `PlayerMomentumRow` (streak momentum card).

### What to change:

**If streak is displayed as a momentum card** (horizontal scrollable card with fire emoji + day count):
- Replace the static fire emoji or icon with the streak-appropriate mascot image
- Add import: `import { getStreakMascot } from '@/lib/mascot-images';`
- Use: `source={getStreakMascot(streakCount)}`
- Image size: 32-40px, fits within the momentum card without changing the card size

**If streak is displayed as a counter in the hero card:**
- Add a small mascot image (24-32px) next to the streak number
- Use `getStreakMascot(streakCount)` for the source

**Rule:** The mascot image is supplementary. Do not remove the streak number or fire icon. Add the mascot image alongside them if space allows, or replace only the icon portion.

**Commit:** `[mascot-polish] Phase 3: streak mascot in momentum/hero`

---

## PHASE 4: Wire mascot into daily quest cards

**File to modify:** `components/player-scroll/PlayerDailyQuests.tsx`

### What to change:

Each quest card currently shows a checkbox + title + XP badge. Add a small mascot image to each quest card based on the quest type.

Add import:
```typescript
import { getQuestMascot } from '@/lib/mascot-images';
```

In the quest card rendering, add an `Image` component:
```typescript
<Image
  source={getQuestMascot(quest.quest_type)}
  style={{ width: 28, height: 28, borderRadius: 14 }}
/>
```

**Placement:** Between the checkbox and the quest title text. The layout should be: checkbox > mascot image (28px) > title + description > XP badge.

**If the card layout is too tight for an extra 28px image**, reduce the mascot to 24px or place it ABOVE the title inside the card (like a small badge in the top-left corner).

**Do NOT change card dimensions, spacing, or the overall card structure.** The mascot is an accent, not a redesign.

**Commit:** `[mascot-polish] Phase 4: quest type mascots in daily quests`

---

## PHASE 5: Wire mascot into weekly quest cards

**File to modify:** `components/player-scroll/PlayerWeeklyQuests.tsx`

Same treatment as Phase 4. Add `getQuestMascot` to weekly quest cards.

```typescript
import { getQuestMascot } from '@/lib/mascot-images';

// In the quest card:
<Image
  source={getQuestMascot(quest.quest_type)}
  style={{ width: 28, height: 28, borderRadius: 14 }}
/>
```

**Commit:** `[mascot-polish] Phase 5: quest type mascots in weekly quests`

---

## PHASE 6: Wire mascot into team quest cards

**File to modify:** `components/player-scroll/PlayerTeamQuests.tsx`

Add mascot images to team quest cards. Team quests get social/team mascots:

```typescript
import { MASCOT } from '@/lib/mascot-images';

// Map team quest types to mascots
function getTeamQuestMascot(questType: string) {
  switch (questType) {
    case 'team_attendance': return MASCOT.TEAM_HUDDLE;
    case 'team_shoutouts': return MASCOT.ENCOURAGING_TEAMMATE;
    case 'team_practice_streak': return MASCOT.SPORTSMANSHIP;
    case 'team_quests_completed': return MASCOT.TEAM_ACHIEVEMENT;
    default: return MASCOT.TEAM_HUDDLE;
  }
}
```

Place the mascot image (32px) in the quest card, similar to daily/weekly quests.

**Commit:** `[mascot-polish] Phase 6: team mascots in team quest cards`

---

## PHASE 7: Wire mascot into PlayerAmbientCloser

**File to modify:** `components/player-scroll/PlayerAmbientCloser.tsx`

### What to change:

The ambient closer is the mascot + contextual message at the bottom of the scroll. It likely already has a mascot image and a text message. Replace the static image and hardcoded text with context-aware versions.

Add import:
```typescript
import { getCloserMascot } from '@/lib/mascot-images';
```

Gather context from the data available in the component (via props or hook):
```typescript
const closerData = getCloserMascot({
  streakCount: engagementStreak?.currentStreak ?? 0,
  hasEventTomorrow: /* check if next event is tomorrow */,
  justLeveledUp: false, // Can be wired later if level-up detection is added
  timeOfDay: new Date().getHours(),
});
```

Update the mascot image source:
```typescript
source={closerData.image}
```

Update the message text:
```typescript
{closerData.message}
```

**Keep the italic styling, the muted opacity, and the layout of the closer.** Only change the image and text content.

**If the closer doesn't currently have access to streak data,** add it via props from PlayerHomeScroll. The scroll already has `engagementStreak` from `usePlayerHomeData`. Pass `streakCount={engagementStreak?.currentStreak ?? 0}` as a prop.

**For hasEventTomorrow:** Check if `nextEvent` data is available. If the next event's `event_date` is tomorrow, set to true. If this data isn't easily available in the closer, just default to `false` and skip the event-based closer message. The streak-based and time-based messages are sufficient.

**Commit:** `[mascot-polish] Phase 7: context-aware mascot in ambient closer`

---

## PHASE 8: Wire mascot into empty states

Find components that have empty states (no data / loading failed / no items) and add mascot illustrations.

### Components to check and update:

**PlayerDailyQuests** — If quests fail to load or return empty:
```typescript
import { getEmptyStateMascot } from '@/lib/mascot-images';
const empty = getEmptyStateMascot('no_quests');
// Show: <Image source={empty.image} /> + <Text>{empty.message}</Text>
```

**PlayerWeeklyQuests** — Same pattern with 'no_quests'

**PlayerTeamQuests** — Same pattern with 'no_team_quests'

**PlayerLeaderboardPreview** — If no standings:
```typescript
const empty = getEmptyStateMascot('no_leaderboard');
```

**LeaderboardScreen** — Full empty state with mascot

**NotificationInboxScreen** — If no notifications:
```typescript
const empty = getEmptyStateMascot('no_notifications');
```

**PlayerTrophyCase** (if it exists) — If no badges:
```typescript
const empty = getEmptyStateMascot('no_badges');
```

### Empty state layout:
- Mascot image: 80px, centered
- Message text: 13px, muted color, centered, below the mascot
- Replace any existing empty state text/icon with this mascot treatment
- Do NOT add empty states where none currently exist. Only update existing empty states.

**Commit:** `[mascot-polish] Phase 8: mascot empty states across components`

---

## PHASE 9: Wire mascot into PlayerChallengeCard

**File to modify:** `components/player-scroll/PlayerChallengeCard.tsx` (or wherever the coach challenge card is)

### What to change:

The challenge card shows active coach challenges. Add the ADVANCE_COACH mascot:

```typescript
import { MASCOT } from '@/lib/mascot-images';

// In the card, add a small mascot image
<Image source={MASCOT.ADVANCE_COACH} style={{ width: 36, height: 36, borderRadius: 18 }} />
```

Place it as a visual accent on the card. If the card already has an icon or image area, replace that. If not, add it to the left side of the card header.

**Commit:** `[mascot-polish] Phase 9: coach mascot in challenge card`

---

## PHASE 10: Wire mascot into CompetitiveNudge

**File to modify:** `components/player-scroll/CompetitiveNudge.tsx` (or whatever shows the "3 more aces to take #7 spot" style messages)

### What to change:

Add a small mascot accent to the competitive nudge. The nudge is motivational, so use contextual mascots:

```typescript
import { MASCOT } from '@/lib/mascot-images';

// If nudge is about stats/ranking:
<Image source={MASCOT.ON_FIRE} style={{ width: 28, height: 28 }} />

// If nudge is about a challenge:
<Image source={MASCOT.HIT_APPROACH} style={{ width: 28, height: 28 }} />
```

If the component doesn't easily support an image, skip this phase and note it in the report.

**Commit:** `[mascot-polish] Phase 10: mascot accent in competitive nudge`

---

## PHASE 11: Verification

### Verify:

1. `lib/mascot-images.ts` exists with all 48 image imports and 5 selector functions
2. No broken image imports (all 48 files exist in `assets/images/activitiesmascot/`)
3. **PlayerIdentityHero** shows time-of-day mascot
4. **Streak display** shows streak-appropriate mascot
5. **Daily quest cards** show quest-type mascot icons
6. **Weekly quest cards** show quest-type mascot icons
7. **Team quest cards** show team mascot icons
8. **Ambient closer** shows context-aware mascot + message
9. **Empty states** show mascot illustrations across components
10. **Challenge card** shows coach mascot
11. **No TypeScript errors** (`npx tsc --noEmit`)
12. **No engine files modified** (lib/quest-engine.ts, lib/streak-engine.ts, etc. untouched)
13. **No layout breaks** — mascot images fit within existing card dimensions

### Report back with:

```
## VERIFICATION REPORT: Phase 6 — Mascot Polish

### Files Created:
- lib/mascot-images.ts: [lines] lines

### Files Modified: [count]
[list each with description]

### Mascot Placements:
- PlayerIdentityHero (greeting): WIRED / SKIPPED [reason]
- Streak display: WIRED / SKIPPED [reason]
- Daily quest cards: WIRED / SKIPPED [reason]
- Weekly quest cards: WIRED / SKIPPED [reason]
- Team quest cards: WIRED / SKIPPED [reason]
- Ambient closer: WIRED / SKIPPED [reason]
- Empty states: [count] components updated
- Challenge card: WIRED / SKIPPED [reason]
- Competitive nudge: WIRED / SKIPPED [reason]

### Image Imports: [count]/48 verified
### Broken Imports: NONE / [list]

### Type Check: PASS / FAIL

### Errors: NONE / [list]
```

---

## WHAT COMES NEXT

After Phase 6, the engagement system is visually complete. Remaining work:
- **Phase 7:** Coach engagement dashboard (coach sees player engagement metrics)
- **Phase 8:** Integration testing (end-to-end flow verification)
- **Push notification delivery:** Wire Expo Push to notification engine (infrastructure spec)
- **Cross-team leaderboards:** Club-level competition (Phase 5 expansion)
