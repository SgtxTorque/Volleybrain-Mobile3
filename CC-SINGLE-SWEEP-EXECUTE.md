# CC-SINGLE-SWEEP-EXECUTE.md
# LYNX — .single() MEDIUM Priority Sweep (EXECUTION SPEC)
# Classification: EXECUTE — Follow exactly. No improvisation.

---

## EXECUTIVE DIRECTIVE

This spec changes exactly 27 `.single()` calls to `.maybeSingle()` across 21 files. Every callsite has been investigated and confirmed to have null-safe downstream code. The change is purely mechanical — find the `.single()`, replace with `.maybeSingle()`, touch nothing else.

---

## RULES

1. **For each file, change ONLY `.single()` to `.maybeSingle()` at the specified lines.**
2. **Do NOT modify any surrounding code** — no logic changes, no null checks added, no refactoring.
3. **Do NOT touch any `.single()` that is NOT listed below.** Many `.single()` calls are intentionally safe (INSERT patterns, try/catch with user feedback). Leave them alone.
4. **Do NOT touch any file not listed below.**
5. **Do NOT touch `_archive/`, `reference/`, or `node_modules/`.**
6. **Commit in batches by category** (lib files, app files, component files) with the specified commit messages.
7. **Line numbers are approximate** — they may have shifted by a few lines from prior commits. Find the exact `.single()` by matching the table name and filter in the surrounding query. If you cannot find the callsite, skip it and note it in the commit message.

---

## BATCH 1: Library files (10 changes across 6 files)
**Commit message:** `fix: .single() → .maybeSingle() sweep — lib files (10 callsites)`

### lib/challenge-service.ts (3 changes)
- **Line ~242:** `.single()` on `challenge_participants` filtered by `challenge_id + player_id` → `.maybeSingle()`
- **Line ~515:** `.single()` on `profiles` filtered by `id` (pid in XP loop) → `.maybeSingle()`
- **Line ~656:** `.single()` on `profiles` filtered by `id` (participant.player_id in stat update loop) → `.maybeSingle()`

### lib/achievement-engine.ts (2 changes)
- **Line ~415:** `.single()` on `profiles` filtered by `id` (profileId for XP update) → `.maybeSingle()`
- **Line ~1169:** `.single()` on `profiles` filtered by `id` (userId for XP update) → `.maybeSingle()`

### lib/evaluations.ts (1 change)
- **Line ~297:** `.single()` on `player_skill_ratings` filtered by `player_id + team_id` with ORDER/LIMIT → `.maybeSingle()`

### lib/notifications.ts (2 changes)
- **Line ~390:** `.single()` on `schedule_events` filtered by `id` (game.eventId) → `.maybeSingle()`
- **Line ~485:** `.single()` on `schedule_events` filtered by `id` (eventId for backup promote) → `.maybeSingle()`

### lib/registration-config.ts (1 change)
- **Line ~148:** `.single()` on `registration_templates` filtered by `id` (season.registration_template_id) → `.maybeSingle()`

### lib/shoutout-service.ts (1 change)
- **Line ~177:** `.single()` on `profiles` filtered by `id` (profId for XP update) → `.maybeSingle()`

### DO NOT TOUCH in these files:
- Any INSERT + `.select().single()` patterns
- Any `.single()` inside try/catch blocks with explicit user feedback
- Any `.maybeSingle()` calls (already fixed)
- Any code surrounding the queries

### Commit before moving to Batch 2.

---

## BATCH 2: App screen files (14 changes across 13 files)
**Commit message:** `fix: .single() → .maybeSingle() sweep — app screens (14 callsites)`

### app/(tabs)/connect.tsx (1 change)
- **Line ~93:** `.single()` on `profiles` filtered by `id` (user.id, inline destructure) → `.maybeSingle()`

### app/(tabs)/settings.tsx (1 change)
- **Line ~57:** `.single()` on `organizations` filtered by `id` (context.organizationId) → `.maybeSingle()`

### app/game-results.tsx (2 changes)
- **Line ~206:** `.single()` on `schedule_events` filtered by `id` (eventId) → `.maybeSingle()`
- **Line ~224:** `.single()` on `seasons` filtered by `id` (seasonId) → `.maybeSingle()`

### app/my-stats.tsx (1 change)
- **Line ~226:** `.single()` on `seasons` filtered by `id` (effectiveSeasonId) → `.maybeSingle()`

### app/profile.tsx (1 change)
- **Line ~68:** `.single()` on `profiles` filtered by `id` (user.id) → `.maybeSingle()`

### app/org-settings.tsx (1 change)
- **Line ~55:** `.single()` on `organizations` filtered by `id` (profile.current_organization_id) → `.maybeSingle()`

### app/player-goals.tsx (1 change)
- **Line ~122:** `.single()` on `team_players` filtered by `player_id` with LIMIT 1 → `.maybeSingle()`

### app/season-progress.tsx (1 change)
- **Line ~107:** `.single()` on `team_players` filtered by `player_id` with LIMIT 1 → `.maybeSingle()`

### app/player-evaluation.tsx (1 change)
- **Line ~164:** `.single()` on `player_skill_ratings` filtered by `player_id + team_id` with ORDER/LIMIT → `.maybeSingle()`

### app/game-prep-wizard.tsx (1 change)
- **Line ~193:** `.single()` on `schedule_events` filtered by `id` (eventId) → `.maybeSingle()`

### app/attendance.tsx (1 change)
- **Line ~131:** `.single()` on `schedule_events` filtered by `id` (eventId) → `.maybeSingle()`

### app/chat/[id].tsx (2 changes)
- **Line ~128:** `.single()` on `chat_channels` filtered by `id` (route param) → `.maybeSingle()`
- **Line ~218:** `.single()` on `chat_messages` filtered by `id` (messageId from realtime) → `.maybeSingle()`

### DO NOT TOUCH in these files:
- Any INSERT + `.select().single()` patterns (lines ~413, ~619, ~730 in chat/[id].tsx)
- Any `.single()` that was already fixed to `.maybeSingle()` (line ~520 in chat/[id].tsx)
- Any code surrounding the queries

### Commit before moving to Batch 3.

---

## BATCH 3: Component files (3 changes across 3 files)
**Commit message:** `fix: .single() → .maybeSingle() sweep — components (3 callsites)`

### components/TeamWall.tsx (1 change)
- **Line ~456:** `.single()` on `profiles` filtered by `id` (newPost.author_id in realtime handler) → `.maybeSingle()`

### components/player-scroll/ChatPeek.tsx (1 change)
- **Line ~60:** `.single()` on `profiles` filtered by `id` (msg.sender_id) → `.maybeSingle()`

### components/team-hub/TeamHubScreen.tsx (1 change)
- **Line ~103:** `.single()` on `teams` filtered by `id` (teamId) → `.maybeSingle()`

### DO NOT TOUCH in these files:
- Any INSERT + `.select().single()` patterns (lines ~912, ~1091 in TeamWall.tsx)
- Any `.single()` inside try/catch with Alert.alert
- Any code surrounding the queries

### Commit before moving to Verification.

---

## FINAL VERIFICATION

After all 3 batches are committed:

1. **Count remaining `.single()` calls in active code:**
```bash
grep -rn "\.single()" lib/ app/ components/ hooks/ --include="*.ts" --include="*.tsx" | grep -v "_archive" | grep -v "reference" | grep -v "node_modules" | wc -l
```
Expected: ~54-56 (the INSERT patterns + try/catch-guarded SELECTs that are intentionally `.single()`)

2. **Verify no `.single()` remains on SELECT queries without error handling:**
```bash
grep -rn "\.single()" lib/ app/ components/ hooks/ --include="*.ts" --include="*.tsx" | grep -v "_archive" | grep -v "reference" | grep -v "node_modules" | grep -v "insert\|upsert\|update"
```
Review this output — every remaining `.single()` should be inside a try/catch with user feedback, or be an INSERT pattern.

3. **Count `.maybeSingle()` calls to confirm growth:**
```bash
grep -rn "\.maybeSingle()" lib/ app/ components/ hooks/ --include="*.ts" --include="*.tsx" | grep -v "_archive" | grep -v "reference" | wc -l
```
Expected: ~37 (10 prior fixes + 27 new)

Write results to `SINGLE-SWEEP-VERIFICATION.md` and commit with message: `verify: .single() sweep complete — 27 callsites fixed across 21 files`

---

## SUMMARY

| Batch | Files | Changes | Scope |
|-------|-------|---------|-------|
| 1 | 6 lib files | 10 | Challenge, achievement, eval, notification, registration, shoutout |
| 2 | 13 app files | 14 | Settings, game results, stats, profile, org, player, chat, attendance |
| 3 | 3 component files | 3 | TeamWall, ChatPeek, TeamHubScreen |
| **Total** | **21 files** | **27 changes** | **All `.single()` → `.maybeSingle()`** |

**New components:** 0
**New screens:** 0
**New dependencies:** 0
**Logic changes:** 0
