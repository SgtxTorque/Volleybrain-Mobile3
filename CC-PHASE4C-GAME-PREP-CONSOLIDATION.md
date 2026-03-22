# CC-PHASE4C-GAME-PREP-CONSOLIDATION.md
# Lynx Mobile — Phase 4C: Game Prep Consolidation
# EXECUTION SPEC

---

## PURPOSE

Consolidate 2 game prep screens into 1 by keeping the newer wizard and redirecting the legacy route.

**Current state:** 2 files, 3,520 total lines
- `app/game-prep.tsx` — 1,924 lines, legacy. Multi-mode screen (list/live/stats-entry). Has volleyball court lineup, live scoring, game completion wizard, post-game shoutouts, achievement unlocks, challenge tracking. Reached via drawer, notifications, schedule.tsx, AdminGameDay.
- `app/game-prep-wizard.tsx` — 1,596 lines, newer. 3-step wizard (RSVPs → Attendance → Lineup). Cleaner UX with progress indicators. Reached via coach-schedule, gameday tab.

**Key insight:** These two screens serve DIFFERENT purposes despite similar names:
- `game-prep-wizard.tsx` = PRE-GAME preparation (check RSVPs, take attendance, set lineup)
- `game-prep.tsx` = DURING/AFTER game operations (live scoring, stat entry, game completion, shoutouts)

**Decision:** The wizard is the better pre-game experience. The legacy screen's unique features (live scoring, court lineup, game completion, shoutouts) overlap with `game-day-command.tsx` which is the intended live game screen. The legacy `game-prep.tsx` should be retired in favor of the wizard for pre-game, and `game-day-command.tsx` for during-game.

**Target state:**
- `app/game-prep.tsx` → redirect to `game-prep-wizard.tsx` (preserving params)
- `app/game-prep-wizard.tsx` → stays as-is (the surviving screen)
- All references to `/game-prep` hit the redirect and land on the wizard
- References to `/game-prep-wizard` continue working

---

## BEFORE YOU START

1. Read `CC-LYNX-RULES.md` and `CC-PROJECT-CONTEXT.md`
2. Read `CC-SHARED-SCREEN-ARCHITECTURE.md` — specifically Section 7 (GAME PREP)
3. Read BOTH game prep files to confirm the wizard doesn't lose critical functionality

**IMPORTANT CHECK:** Before replacing game-prep.tsx, verify that these legacy features exist elsewhere:
- Live scoring → should be in `game-day-command.tsx`
- Game completion wizard → should be in `game-day-command.tsx` or `game-results.tsx`
- Achievement unlocks after game → should be in `game-day-command.tsx`
- Challenge tracking after game → should be in `game-day-command.tsx`

If any of these features ONLY exist in `game-prep.tsx` and nowhere else, DO NOT proceed with the replacement. Report what's missing and stop.

---

## RULES

1. **Do NOT modify `game-prep-wizard.tsx`.** It stays exactly as-is.
2. **Do NOT modify `game-day-command.tsx`.** That screen is separate.
3. **Do NOT delete `game-prep.tsx`.** Replace its contents with a redirect.
4. **Modify only the files listed in this spec.**
5. **Execute sequentially. Produce one report at the end.**

---

## STEP 1: Verify Feature Coverage

Before making any changes, check `game-day-command.tsx` for:

1. Live scoring capability (score tracking, set management)
2. Game completion flow (final score, result recording)
3. Achievement unlock triggers after game ends
4. Challenge update triggers after game ends

**Report what you find.** If all 4 exist in game-day-command, proceed. If any are ONLY in game-prep.tsx, stop and report.

---

## STEP 2: Replace game-prep.tsx with Redirect

**File:** `app/game-prep.tsx`

Replace the entire 1,924-line file with a smart redirect that preserves params:

```typescript
/**
 * game-prep.tsx — Legacy game prep screen.
 * Consolidated: pre-game prep now lives in game-prep-wizard.tsx.
 * Live game operations live in game-day-command.tsx.
 * This file redirects to the wizard for route compatibility.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function GamePrepRedirect() {
  const { eventId, teamId, startLive } = useLocalSearchParams<{
    eventId?: string;
    teamId?: string;
    startLive?: string;
  }>();

  // If startLive was requested, redirect to game-day-command instead of wizard
  if (startLive) {
    return (
      <Redirect
        href={`/game-day-command?eventId=${startLive}&teamId=${teamId || ''}` as any}
      />
    );
  }

  // Otherwise redirect to the prep wizard
  const params = new URLSearchParams();
  if (eventId) params.set('eventId', eventId);
  if (teamId) params.set('teamId', teamId);
  const qs = params.toString();

  return <Redirect href={`/game-prep-wizard${qs ? `?${qs}` : ''}` as any} />;
}
```

**Why the `startLive` check:** The legacy game-prep had a `startLive` param that auto-entered live scoring mode. Since the wizard doesn't do live scoring, redirect `startLive` requests to `game-day-command` instead — that's where live scoring belongs.

---

## STEP 3: Update References that Should Go Directly to Wizard

These references currently go to `/game-prep` but should go directly to `/game-prep-wizard` (bypassing the redirect for cleaner navigation):

**File:** `app/(tabs)/schedule.tsx` — line ~520
```typescript
// BEFORE:
const handleGamePrep = (event: ScheduleEvent) => { setShowEventModal(false); router.push('/game-prep'); };
// AFTER:
const handleGamePrep = (event: ScheduleEvent) => { setShowEventModal(false); router.push(`/game-prep-wizard?eventId=${event.id}&teamId=${event.team_id}` as any); };
```

**File:** `components/AdminGameDay.tsx` — lines ~351 and ~444
```typescript
// BEFORE:
onPress={() => router.push('/game-prep' as any))
// AFTER:
onPress={() => router.push('/game-prep-wizard' as any))
```

(Both occurrences in AdminGameDay.tsx)

**Leave these references UNCHANGED** (they'll hit the redirect which is fine):
- `app/_layout.tsx` line 108 — notification handler routes to `/game-prep?eventId=`. The redirect preserves eventId.
- `components/GestureDrawer.tsx` line 129 — drawer routes to `/game-prep`. The redirect works.

**Leave these references UNCHANGED** (they already go to wizard):
- `app/(tabs)/coach-schedule.tsx` lines 768, 916 — already routes to `/game-prep-wizard`
- `app/(tabs)/gameday.tsx` lines 792, 818 — already routes to `/game-prep-wizard`

---

## VERIFICATION

After all steps:

1. **Run `npx tsc --noEmit`** — report result
2. **Report the Step 1 feature coverage check** — did game-day-command have all 4 features?
3. **List every file modified**
4. **Confirm game-prep.tsx is now a redirect** with line count
5. **Confirm game-prep-wizard.tsx was NOT modified**
6. **List the `startLive` redirect logic** — does it correctly route to game-day-command?
7. **Net lines saved**

---

## MANUAL QA

| # | Test | Expected |
|---|------|----------|
| 1 | Drawer → Game Day → Game Prep | Redirects to game-prep-wizard |
| 2 | Game notification tap (with eventId) | Redirects to wizard with eventId preserved |
| 3 | Coach schedule → Game Prep button | Goes directly to wizard (no redirect) |
| 4 | Game Day tab → Game Prep tool | Goes directly to wizard (no redirect) |
| 5 | AdminGameDay → Game Prep | Goes to wizard |
| 6 | Navigate to `/game-prep?startLive=eventId` | Redirects to game-day-command |
