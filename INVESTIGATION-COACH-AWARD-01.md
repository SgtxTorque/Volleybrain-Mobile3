# INVESTIGATION-COACH-AWARD-01
# Coach Direct Award System Audit
# Reference: LYNX-ENGAGEMENT-SYSTEM-V2.md (Section 2.3 — Coach Badges)

---

## Summary

A **partial coach award system already exists** via the `player_badges` table and `PlayerCardExpanded` modal — coaches can award 10 hardcoded badge types (MVP, Best Server, etc.) directly from the roster card. However, this system is **completely disconnected** from the V2 achievement/engagement engine:

- Awards go to `player_badges` (legacy), NOT `player_achievements` (V2 engine)
- No XP is awarded when a coach gives a badge
- No celebration modal fires
- No season rank progress is affected
- The `requires_verification` flag exists on the `achievements` table and the engine skips those badges, but there is no UI to manually award them

The V2 spec envisions two paths for coach badges: (1) challenge completion (built), and (2) direct awards (not built for the V2 engine). The gap is bridging the existing `player_badges` award UX with the V2 `player_achievements` + XP engine.

---

## Task 1: Audit Existing Coach-to-Player Recognition

### 1.1 Does a `coach_awards` table exist?

**NO.** No `coach_awards` table exists in the schema or migrations. Coach awards currently use the `player_badges` table.

### 1.2 Does the shoutout system serve as a partial coach-award mechanism?

**Partially.** The `GiveShoutoutModal` allows coaches to send shoutouts to players, which awards XP to both giver (+10 XP) and receiver (+15 XP). However, shoutouts are lightweight recognition (emoji + optional message) — they don't award specific badges and have no rarity/tier system. They are a separate engagement path, not a badge-award mechanism.

### 1.3 Is there a "Coach's Choice" or "MVP" badge in the achievements table?

**In `player_badges` (legacy system):** YES — `PlayerCardExpanded.tsx` (lines 85-96) defines 10 hardcoded badge types:

| Badge Type | Name | Icon |
|---|---|---|
| `mvp` | MVP | trophy |
| `best_server` | Best Server | flash |
| `best_passer` | Best Passer | shield-checkmark |
| `most_improved` | Most Improved | trending-up |
| `team_spirit` | Team Spirit | heart |
| `most_energy` | Most Energy | flame |
| `hustle` | Hustle Award | footsteps |
| `leadership` | Leadership | star |
| `clutch_player` | Clutch Player | diamond |
| `defensive_wall` | Defensive Wall | hand-left |

**In `achievements` table (V2 engine):** The badge seed file (`LYNX-BADGE-SEED-250.sql`) contains coach-related badges with `target_role = 'coach'` (badges FOR coaches, not badges coaches award TO players). No badges with `engagement_category = 'coach'` AND `target_role = 'player'` have been confirmed in the seed data.

**In migrations:** Two achievements — "MVP" and "Season Champion" — are referenced with `type = 'coach_awarded'` in the engagement system migration, but these may be placeholder entries.

### 1.4 Does the `coach_verified` metric type serve as a manual award mechanism?

**For challenges, yes.** The `coach_verified` metric type on `coach_challenges` requires manual coach confirmation before a player is marked as having completed a challenge. However, this is a challenge verification flow (player reports progress → coach confirms) — not a direct award flow (coach picks badge → player receives it). Different intent and UX.

### 1.5 Are there `requires_verification = true` badges designed for coach manual award?

**The flag exists but is only used as a skip-guard.** The achievement engine checks `requires_verification` at three locations:

- `achievement-engine.ts:99` — `checkAndUnlockAchievements()`
- `achievement-engine.ts:248` — `checkAllAchievements()`
- `achievement-engine.ts:677` — `checkRoleAchievements()`

All three simply `continue` (skip) badges with `requires_verification = true`. There is **no code path** that handles manually verifying/awarding these badges. The flag was designed as a future hook for coach awards but was never wired up.

---

## Task 2: Audit the Achievements Table for Coach-Awardable Badges

### 2.1 How many badges have `engagement_category = 'coach'`?

The `engagement_category` field is defined in the type system (`achievement-types.ts:12`) with valid values: `'stat' | 'milestone' | 'coach' | 'journey' | 'community'`. The `'coach'` category is defined in `engagement-constants.ts` (lines 158-163):

```typescript
coach: {
  label: 'Coach Badges',
  icon: 'clipboard',
  color: '#F59E0B',
  description: 'Coach-awarded and challenge completion'
}
```

Exact counts require a DB query. The seed data has coach-related badges but they are primarily `target_role = 'coach'` (badges earned BY coaches for coaching activities) rather than `target_role = 'player'` with `engagement_category = 'coach'` (badges awarded TO players by coaches).

### 2.2 Which could be coach-awarded (judgment-based) vs system-triggered (stat-based)?

**Judgment-based (ideal for direct award):**
- MVP, Most Improved, Hardest Worker, Best Teammate
- Leadership, Team Spirit, Hustle, Clutch Player
- Game Ball, Tournament MVP

**System-triggered (via challenge completion):**
- Completed X challenges, Won Y challenges
- Stat-based chains (kills, digs, aces)

### 2.3 Is there a way to distinguish coach-awardable from challenge-earned?

**Not today.** Both would have `engagement_category = 'coach'`. Distinguishing them would require either:
- A new flag: `coach_awardable: boolean` on the `achievements` table
- OR: Using `requires_verification = true` to mean "coach must manually award"
- OR: A separate `award_method` enum: `'auto' | 'challenge' | 'coach_direct'`

### 2.4 Seed data audit

The `LYNX-BADGE-SEED-250.sql` file contains badges organized by target_role. Coach-targeted badges (FOR coaches) include: First Whistle, Clipboard Warrior, Floor General, Commander, Coaching Legend, Full Roster, Stacked, Data Driven, Moneyball, Motivator I/II/III, Challenge Architect, Blast Master, First W, Hot Streak, Unstoppable Force, Dynasty.

These are badges coaches EARN — not badges coaches GIVE to players.

---

## Task 3: Audit the Roster Screen (Coach View)

### 3.1 What file renders the coach's roster view?

**`app/(tabs)/players.tsx`** — the consolidated roster/player management screen. Multiple files redirect to it:
- `app/roster.tsx` → redirects
- `app/team-roster.tsx` → redirects
- `app/(tabs)/coach-roster.tsx` → re-exports `players.tsx`

### 3.2 What actions can a coach take on a player from the roster?

When a coach taps a player card, it opens **`PlayerCardExpanded`** modal with:

1. **Photo upload** (camera overlay) — coaches/admins only
2. **Emergency contact** — opens emergency info modal
3. **Award badge** — opens badge selection modal (10 types)
4. **View full profile** — navigates to `/child-detail?playerId=...`
5. **Three tabs:** Stats, Skills, Info (coach/admin)

### 3.3 Is there a player action sheet or context menu?

**No action sheet/context menu.** Actions are embedded in the `PlayerCardExpanded` modal as buttons and tab navigation. The badge award is triggered by a dedicated button within the modal.

### 3.4 Where would "Award Badge" naturally fit?

**It already has a spot.** `PlayerCardExpanded` has an "Award Badge" button that opens a badge selection modal. The flow is:

1. Coach taps player card on roster → `PlayerCardExpanded` opens
2. Coach taps "Award Badge" → badge selection modal appears
3. Coach taps a badge type → `awardBadge()` inserts to `player_badges`
4. Success alert shown

**The gap:** This flow writes to `player_badges` (legacy), not `player_achievements` (V2 engine). It awards no XP and triggers no celebration.

### 3.5 Existing "give shoutout" entry points on roster?

**No shoutout button directly on the roster.** Shoutout entry points exist on:
- `CoachHomeScroll` — via SmartNudgeCard and ActionGrid2x2
- `PlayerHomeScroll` — via QuickPropsRow
- `TeamWall` — via floating action button
- `EngagementSection` — via direct button

The `GiveShoutoutModal` is not wired into the roster/player-card flow. This is a pattern to follow — add a "Give Shoutout" button alongside the "Award Badge" button in PlayerCardExpanded.

---

## Task 4: Audit the Post-Game Flow

### 4.1 What screens appear after a game completes?

**`GameCompletionWizard`** (`components/GameCompletionWizard.tsx` — 1,038 lines) is a 4-step modal:

1. **Format selection** — volleyball sets vs period-based sports
2. **Score entry** — set-by-set or period scores with live result banner
3. **Attendance tracking** — toggle present/absent for all roster players
4. **Confirmation** — review scores, result, and attendance before saving

After completion, the game results are viewable on **`app/game-results.tsx`** (~900 lines) with two tabs: "Stats" and "Recap".

### 4.2 Is there a post-game shoutout prompt?

**NO.** The `GameCompletionWizard` has no shoutout or award step. After the 4 steps (format → scores → attendance → confirm), the wizard closes. There is no "Give game ball" or "Award MVP" prompt.

### 4.3 Where would "Award MVP" or "Award Game Ball" fit?

Two natural insertion points:

1. **Step 5 in GameCompletionWizard** — after confirmation, add an optional "Awards & Shoutouts" step. The wizard already has a step system; adding a 5th step would be clean.

2. **On game-results.tsx recap tab** — the recap already shows an auto-calculated "MATCH MVP" card (lines 718-732) based on stats. Adding a coach "Award Game Ball" button next to or below this section would be natural.

### 4.4 Does the game completion flow know which players participated?

**YES.** Step 3 (attendance tracking) collects which players were present. The `GameCompletionWizard` has the full roster with attendance toggles. After completion, `game-results.tsx` queries `game_player_stats` to get all players with stats for that game.

The MVP calculation in `game-results.tsx` (lines 358-372) already identifies the top performer:
```typescript
const mvp = useMemo(() => {
  const scored = allPlayerStats.map(ps => ({
    ...ps,
    total: (ps.kills ?? 0) + (ps.aces ?? 0) + (ps.digs ?? 0) + ...
  }));
  const best = scored.sort((a, b) => b.total - a.total)[0];
  return { player: p, topStat, total: best.total };
}, [allPlayerStats, playerMap]);
```

This auto-MVP is display-only — it doesn't award a badge or XP.

---

## Task 5: Audit the GiveShoutoutModal Pattern

### 5.1 Flow overview

**File:** `components/GiveShoutoutModal.tsx` — **671 lines**

4-step flow:

| Step | Name | What Happens |
|---|---|---|
| 1 | Recipient | Search + select player from team roster |
| 2 | Category | Select shoutout category from emoji grid |
| 3 | Message | Optional free-text message (max 200 chars) |
| 4 | Preview | Review card + "Send Shoutout" button |

### 5.2 How does it list players?

Two queries combined into a single recipient list:
- `team_players` joined with `players` (name, avatar)
- `team_staff` joined with `profiles` (name, avatar)

Excludes current user. Deduplicates via Map. Sorted alphabetically. Each recipient has: `{ id, full_name, avatar_url, role: 'player' | 'coach' }`.

### 5.3 How does it show category options?

Emoji grid layout — 2 columns (47% width each), gap 10. Categories fetched via `fetchShoutoutCategories(orgId)`. Each category has: `{ id, name, emoji, color }`. Selected state shows: border color = category color, background = `color + '10'`, scale 1.03.

### 5.4 Confirmation and success flow

1. User taps "Send Shoutout"
2. `setSending(true)` → loading state
3. Calls `giveShoutout()` service with: giver info, receiver info, team/org IDs, category, message
4. On success: `onSuccess()` callback → closes modal
5. On error: `Alert.alert()`

### 5.5 Patterns for multi-step flow

- State machine: `step` state (`'recipient' | 'category' | 'message' | 'preview'`)
- `goBack()` helper navigates between steps
- Each step rendered conditionally based on `step` value
- `preselectedRecipient` prop allows skipping step 1
- Glass morphism styling (`colors.glassCard`, `colors.glassBorder`)
- `createStyles(colors)` pattern
- Modal with `presentationStyle="pageSheet"` and slide animation

**This is the ideal pattern to clone for a CoachAwardModal.**

---

## Task 6: Audit engagement-types.ts for coach_award

### 6.1 Does `XpSourceType` include `'coach_award'`?

**YES.** `lib/engagement-types.ts` lines 93-101:

```typescript
export type XpSourceType =
  | 'achievement'
  | 'shoutout_received'
  | 'shoutout_given'
  | 'challenge'
  | 'challenge_won'
  | 'game_played'
  | 'attendance'
  | 'coach_award';
```

### 6.2 Is there a `CoachAward` type defined anywhere?

**NO.** No `CoachAward` type exists in the codebase. The only coach-award-related type is the `'coach_award'` string literal in `XpSourceType`.

### 6.3 Are there any `source_type = 'coach_award'` entries in the xp_ledger code?

**NO.** The `'coach_award'` source type is defined in the union type but is **never used** in any `awardXP()` call or `xp_ledger` insert anywhere in the codebase. It is a placeholder awaiting implementation.

### 6.4 XP_BY_SOURCE gap

`lib/engagement-constants.ts` (lines 55-81) defines XP amounts per source type. There is **no entry for `coach_award`**. Current entries include:
- `challenge_completed: 50`
- `challenge_won: 100`
- `game_played: 10`
- `shoutout_received: 15`

A `coach_award` entry needs to be added. Recommended: `coach_award: 25` (between shoutout and challenge).

---

## Task 7: Audit the Challenge System's coach_verified Flow

### 7.1 How does a coach verify/confirm a challenge completion?

Flow:
1. Player reports progress on a `coach_verified` challenge → `challenge_participants.current_value` updated
2. Coach sees pending verifications in verification queue
3. Coach taps **Verify (✓)** → sets `challenge_participants.completed = true`
4. OR taps **Reject (✗)** → resets `challenge_participants.current_value = 0`
5. OR taps **Adjust** → modifies `current_value` before verifying

### 7.2 What UI does the coach use?

Two entry points:

1. **Coach Challenge Dashboard** (`app/coach-challenge-dashboard.tsx`):
   - "NEEDS VERIFICATION" section (lines 182-229)
   - Yellow badge with pending count (line 135)
   - Verification cards with player avatar, challenge title, progress, action buttons

2. **Challenge Detail** (`app/challenge-detail.tsx`):
   - Verification queue section (lines 537-639) — coaches/admins only
   - Same verify/reject/adjust actions

### 7.3 Could this verification UI be adapted for direct badge awards?

**Partially, but the flow is inverted.** Challenge verification is reactive (player reports → coach confirms). Coach direct award is proactive (coach initiates → badge awarded). The UI pattern (card with action buttons) could be reused, but the flow needs to be different: pick player → pick badge → confirm.

The `GiveShoutoutModal` flow is a better pattern to follow for direct awards.

### 7.4 What happens when the coach verifies?

**Verification alone does NOT trigger XP or badges.** The flow:

1. Coach marks `completed = true` → no immediate XP
2. Challenge deadline passes → `checkExpiredChallenges()` runs (on app open)
3. `completeChallenge()` is called → awards XP to all completed participants
4. XP awarded as `sourceType: 'challenge'` (NOT `'coach_award'`)
5. Challenge result posted to team wall + notifications sent

**Key insight:** XP is deferred until challenge completion, not awarded at verification time. Direct coach awards should award XP immediately (like shoutouts).

---

## Task 8: Architecture Recommendation

### 8.1 New table vs reuse existing?

**Recommended: Reuse `player_achievements` with `verified_by` field.**

The `player_achievements` table already has:
- `verified_by: uuid` — who awarded/verified the badge
- `verified_at: timestamp` — when it was verified
- `season_id` — which season

No new table needed. When a coach directly awards a badge:
- Insert into `player_achievements` with `verified_by = coach_user_id` and `verified_at = now()`
- The `requires_verification` flag on the achievement marks which badges need manual award
- This integrates the award into the V2 engine (XP, celebrations, season rank)

**Phase out `player_badges` over time** — migrate the 10 legacy badge types to achievements with `requires_verification = true` and `engagement_category = 'coach'`.

### 8.2 Badge selection: All coach badges or curated subset?

**Curated subset via `requires_verification = true`.**

Coaches should only see badges that are designed for human judgment:
- MVP, Most Improved, Hardest Worker, Best Teammate, Game Ball
- Leadership, Hustle, Clutch Player, Defensive Wall, Team Spirit

Stat-based badges with `engagement_category = 'coach'` (if any) should NOT appear in the award picker — those are auto-triggered via the engine.

Filter: `engagement_category = 'coach' AND requires_verification = true AND target_role = 'player'`

### 8.3 Entry points for "Award Badge"

| Entry Point | Priority | Notes |
|---|---|---|
| **PlayerCardExpanded** (roster) | P0 | Already has badge award button — upgrade to V2 engine |
| **Game results recap** | P1 | Add "Award Game Ball" below auto-MVP card |
| **GameCompletionWizard step 5** | P2 | Optional post-game awards step |
| **Coach dashboard** | P3 | Quick-action button for recent awards |

### 8.4 Recommended flow

```
1. Coach taps "Award Badge" (from roster card, post-game, etc.)
   ↓
2. CoachAwardModal opens (clone of GiveShoutoutModal pattern)
   ↓
3. Step 1: Select player (if not preselected from context)
   - Same roster query as GiveShoutoutModal
   - Can skip if opened from a specific player's card
   ↓
4. Step 2: Select badge
   - Grid of coach-awardable badges (requires_verification = true)
   - Show badge icon, name, rarity color, XP value
   ↓
5. Step 3: Add note (optional)
   - Free text, max 200 chars
   - "What did they do to earn this?"
   ↓
6. Step 4: Preview & confirm
   - Show badge card, recipient, note, XP amount
   - "Award Badge" button
   ↓
7. On confirm:
   a. Insert into player_achievements (verified_by, verified_at, season_id)
   b. Award XP via awardXP({ sourceType: 'coach_award', ... })
   c. Update season rank progress
   d. Mark achievement as unseen (triggers celebration modal)
   e. Send push notification to player
```

### 8.5 Limits

**Recommended limits:**

| Limit | Value | Rationale |
|---|---|---|
| Same badge to same player per season | 1 | Prevent spam (unless stacking is enabled) |
| Total awards per coach per week | 10 | Prevent devaluation |
| MVP per game | 1 | Scarcity makes it meaningful |
| Awards per game event | 3-5 | Post-game awards should be selective |

Implementation: Check `player_achievements` for existing `(player_id, achievement_id, season_id)` before inserting. Track weekly count via `xp_ledger` query with `source_type = 'coach_award'` and date filter.

### 8.6 Notifications

**YES — player should receive a push notification.**

Format: `"Coach [Name] awarded you [Badge Name]! 🏆 +[XP] XP"`

Mirrors the shoutout notification pattern. Use existing notification infrastructure (`lib/notifications.ts`).

### 8.7 Minimal build path (MVP)

**Phase 1: Wire up existing award button to V2 engine (smallest useful version)**

1. Add `coach_award` XP value to `XP_BY_SOURCE` (e.g., 25)
2. Create `awardCoachBadge()` service function in a new `lib/coach-award-service.ts`:
   - Insert into `player_achievements` with `verified_by` + `verified_at`
   - Call `awardXP()` with `sourceType: 'coach_award'`
   - Mark as unseen for celebration
3. Update `PlayerCardExpanded.awardBadge()` to call the new service instead of inserting to `player_badges`
4. Create achievement seed entries for the 10 legacy badge types with `requires_verification = true`

**Phase 2: CoachAwardModal (proper UI)**

5. Clone `GiveShoutoutModal` → `CoachAwardModal` with 4-step flow
6. Wire to roster, post-game, coach dashboard entry points
7. Add limits and notification

**Phase 3: Post-game integration**

8. Add optional awards step to `GameCompletionWizard`
9. Add "Award Game Ball" button on `game-results.tsx` recap tab
10. Connect auto-MVP suggestion to award flow

---

## Key Findings Summary

| Aspect | Current State | Gap |
|---|---|---|
| Coach badge award UI | EXISTS in PlayerCardExpanded (10 types) | Writes to `player_badges`, not V2 engine |
| `requires_verification` flag | EXISTS on achievements table | Engine skips these; no manual award path |
| `verified_by` / `verified_at` | EXISTS on player_achievements | Never populated by any code path |
| `coach_award` XP source type | EXISTS in XpSourceType enum | Never used; no XP_BY_SOURCE entry |
| Post-game award prompt | MISSING | GameCompletionWizard has no awards step |
| CoachAwardModal | MISSING | GiveShoutoutModal is ideal pattern to clone |
| Award limits | MISSING | No rate limiting or scarcity rules |
| Push notification on award | MISSING | Notification infrastructure exists |
| Legacy `player_badges` → V2 migration | MISSING | 10 badge types need achievement entries |
