# CC-GAME-DAY-COMMAND-CENTER.md
# Lynx Mobile — Game Day Command Center: Live Match Management

**Priority:** H1 #1 — Season is active, this is the biggest gap  
**Estimated time:** 12–16 hours (10 phases, commit after each)  
**Risk level:** HIGH — complex new feature with offline requirements, rotation logic, real-time state management

---

## WHAT THIS IS

The Game Day Command Center is a coach's sideline tool for managing a live volleyball match. It handles:
- Pre-match lineup setup with rotation visualization
- Live scoring with automatic rotation tracking
- Substitution management with pre-planned sub pairs
- Libero tracking (in/out)
- Optional per-rally stat tracking (Tier 2, toggle on)
- Serve tracking with court tap-map
- End-of-set/match flow with auto-calculated results
- Post-game summary

The entire experience must work **OFFLINE** — gyms have no wifi or cell service. All data stores locally and syncs when connection returns.

It must work on both **phone and tablet** with adapted layouts.

---

## VOLLEYBALL ROTATION RULES — CC MUST ENCODE ALL OF THESE

This section is the "smart" brain of the system. Every rule here must be implemented in code. If you don't understand a rule, DO NOT guess — read this section again.

### Core Rotation Rules (All Formation Types)

1. **Service order is fixed.** Once a lineup is submitted, the 6 starting players rotate in a fixed clockwise order: P1 → P2 → P3 → P4 → P5 → P6. This order NEVER changes during the match (only substitutions change who is in each position).

2. **Positions on court.** At the moment of serve, players must be in their correct rotational positions:
   - **Front row:** P4 (left front), P3 (middle front), P2 (right front)
   - **Back row:** P5 (left back), P6 (middle back), P1 (right back / server)
   - The NET is between P4/P3/P2 (front) and P5/P6/P1 (back)

3. **Rotation happens on SIDE-OUT only.** When the receiving team wins the rally and gains serve, ALL players rotate one position clockwise: P1→P6, P6→P5, P5→P4, P4→P3, P3→P2, P2→P1. The new P1 serves.

4. **No rotation on consecutive points.** If the serving team wins the rally, no rotation occurs. The same player serves again.

5. **Overlap rule (at moment of serve):**
   - Each back-row player must be further from the net than the corresponding front-row player (P1 behind P2, P6 behind P3, P5 behind P4)
   - Each left-side player must be further left than the middle player, who must be further left than the right-side player (P4 left of P3, P3 left of P2; P5 left of P6, P6 left of P1)
   - After the serve is contacted, players can move anywhere

### Formation Types

#### 5-1 Formation
- **1 setter, 5 hitters**
- The SETTER is in one of the 6 rotational positions
- When the setter is in the BACK ROW (P1, P6, P5): they run to the right-front area to set after serve contact
- When the setter is in the FRONT ROW (P2, P3, P4): they are already at the net
- The OPPOSITE HITTER is always across from the setter (3 rotations apart)
- Typical positions: Setter (S), Opposite/Right-Side (OPP/RS), 2 Outside Hitters (OH), 2 Middle Blockers (MB)

**5-1 Rotation positions (if setter starts in P1):**

| Rotation | P1 | P2 | P3 | P4 | P5 | P6 |
|----------|----|----|----|----|----|----|
| R1 | S | OPP | MB1 | OH1 | MB2 | OH2 |
| R2 | OH2 | S | OPP | MB1 | OH1 | MB2 |
| R3 | MB2 | OH2 | S | OPP | MB1 | OH1 |
| R4 | OH1 | MB2 | OH2 | S | OPP | MB1 |
| R5 | MB1 | OH1 | MB2 | OH2 | S | OPP |
| R6 | OPP | MB1 | OH1 | MB2 | OH2 | S |

#### 6-2 Formation
- **2 setters, 4 hitters** (but effectively 6 hitters because the setter only sets from back row)
- The setter in the BACK ROW sets. The setter in the FRONT ROW hits.
- This means: whichever setter is in P1/P6/P5 (back row) is the active setter
- When the other setter rotates to back row, they become the active setter
- More offensive than 5-1 (always 3 front-row hitters)
- Typical positions: Setter 1 (S1), Setter 2 (S2), 2 Outside Hitters (OH), 2 Middle Blockers (MB)
- The two setters are ALWAYS opposite each other (3 rotations apart)

#### 6-6 Formation (Beginner/Youth)
- **All 6 players rotate through all positions**
- No specialized setter — whoever is in P2 or P3 sets (or coaches designate)
- Simplest system — good for young/beginner teams
- No special positioning rules beyond the standard overlap rule

### Libero Rules

1. The libero is a DEFENSIVE SPECIALIST who wears a different colored jersey
2. The libero can ONLY play in the BACK ROW
3. The libero REPLACES a back-row player (typically a middle blocker) and does NOT count as a substitution
4. The libero must come OUT when that replaced player rotates to the FRONT ROW
5. Libero replacements happen between rallies, at the sideline
6. The libero CANNOT serve (in most youth leagues — some allow it, make this a setting)
7. The libero CANNOT attack the ball above net height from anywhere
8. The libero CANNOT set (overhand) from in front of the 3-meter line if the next contact is an attack above net height
9. **Tracking:** The app should alert "LIBERO IN for #[jersey]" when a middle blocker goes to back row, and "LIBERO OUT, #[jersey] back in" when that player returns to front row

### Substitution Rules

1. Each team gets a LIMITED number of substitutions per set (typically 12 in youth, but make this configurable)
2. A substitution is a player exchange: Player A comes OUT, Player B comes IN
3. **Re-entry rule:** A player who has been substituted out can ONLY re-enter for the player who replaced them (1-for-1 pairing). Example: if #7 subs out for #14, later #14 can ONLY be replaced by #7.
4. Libero replacements do NOT count as substitutions
5. Substitutions can only happen during dead balls (between rallies)
6. The app should track sub pairs and enforce/suggest the correct pairings

---

## OFFLINE-FIRST ARCHITECTURE

### Storage Strategy
- Use **AsyncStorage** (or **expo-sqlite** for complex queries) for all match data
- Every state change (score, sub, rotation, stat) is written to local storage IMMEDIATELY
- A `syncStatus` flag per match: `'local'` | `'syncing'` | `'synced'`
- A `pendingActions` queue stores every action with a timestamp
- When network returns: replay the action queue against Supabase in order
- Display a sync indicator: green dot = synced, orange dot = pending, red dot = sync failed

### Data Model (Local)

```typescript
interface MatchState {
  id: string;
  eventId: string;  // links to the Supabase event
  teamId: string;
  opponentName: string;
  formation: '5-1' | '6-2' | '6-6';
  
  // Lineup
  starters: PlayerSlot[];  // 6 players in rotational order P1-P6
  subs: PlayerSlot[];       // bench players
  libero?: PlayerSlot;
  subPairs: { starterId: string; subId: string }[];  // pre-planned 1-for-1 pairs
  
  // Match state
  currentSet: number;       // 1, 2, 3, 4, 5
  sets: SetState[];
  matchComplete: boolean;
  
  // Sync
  syncStatus: 'local' | 'syncing' | 'synced';
  pendingActions: MatchAction[];
  lastSyncedAt?: string;
}

interface SetState {
  setNumber: number;
  homeScore: number;
  awayScore: number;
  currentRotation: number;  // 1-6 (which rotation we're in)
  isServing: boolean;       // true = our serve, false = their serve
  subsUsed: number;
  subLog: SubEvent[];
  rallyLog: RallyEvent[];   // Tier 2 only
  serveLog: ServeEvent[];
  setComplete: boolean;
  winner?: 'home' | 'away';
}

interface PlayerSlot {
  playerId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  position: string;  // OH, MB, S, OPP, L, DS
  photoUrl?: string;
}

interface MatchAction {
  id: string;
  timestamp: string;
  type: 'score' | 'sub' | 'rotation' | 'serve' | 'rally_stat' | 'set_end' | 'match_end';
  data: any;
}
```

---

## SCREEN FLOW (SWIPE WORKFLOW)

The Game Day Command Center is a **swipe-based workflow** with 4 main screens. The user can swipe between them, with the current screen indicated by dots or a step bar.

### Screen 1: GAME PREP / LINEUP
Pre-match setup. Set lineup, formation, subs, libero.

### Screen 2: LIVE MATCH
The main game screen. Court view, score, subs, rotation tracking. This is where 90% of the time is spent.

### Screen 3: END SET / END MATCH
Confirm set results, review stats, start next set or end match.

### Screen 4: POST-GAME SUMMARY
Auto-generated recap. Save, share, done.

The coach can swipe BACK to Screen 1 from Screen 2 anytime (to show the team the rotation diagram on a whiteboard moment).

---

## PHASE 1: DATA MODEL + OFFLINE STORAGE

Build the data layer first. No UI yet.

### 1A. Create `lib/gameday/match-state.ts`

Define all TypeScript interfaces from the Data Model section above.

### 1B. Create `lib/gameday/match-store.ts`

AsyncStorage-based match state manager:

```typescript
// Core operations
createMatch(eventId, teamId, opponentName, formation): MatchState
loadMatch(matchId): MatchState | null
saveMatch(match: MatchState): void
addAction(matchId, action: MatchAction): void

// Sync
getPendingMatches(): MatchState[]  // all matches with syncStatus !== 'synced'
markSynced(matchId): void
```

### 1C. Create `lib/gameday/rotation-engine.ts`

The volleyball brain. This must encode ALL rotation rules from above.

```typescript
// Core rotation logic
getRotationPositions(formation, rotation, starters, libero): CourtPosition[]
// Returns 6 positions with player info, front/back row flag, position label

rotateClockwise(currentRotation): number
// R1→R2→R3→R4→R5→R6→R1

getServeReceivePositions(formation, rotation, starters): CourtPosition[]
// Where players stand when receiving serve (different from base)

getServingPositions(formation, rotation, starters): CourtPosition[]
// Where players stand when serving (different from serve receive)

getBasePositions(formation, rotation, starters): CourtPosition[]
// Base/home positions after serve contact (where players actually play)

getLiberoTarget(formation, rotation, starters, libero): { replacing: PlayerSlot } | null
// Which player the libero should replace in this rotation (typically the MB in back row)

isLiberoInPlay(rotation, formation): boolean
// Should the libero be on court in this rotation?

getNextServer(rotation, starters): PlayerSlot
// Who serves in this rotation

validateSubstitution(sub: SubEvent, matchState): { valid: boolean; reason?: string }
// Enforce 1-for-1 re-entry rules
```

### 1D. Create `lib/gameday/formation-positions.ts`

Court position coordinates for each formation type, each rotation, each phase (base, serve, serve-receive).

This is a large data file. For each of the 3 formations × 6 rotations × 3 phases = 54 position sets, define the (x, y) coordinates of each of the 6 players on a normalized court (0-100 range for both axes, where 0,0 is bottom-left from the team's perspective and the net is at y=50).

**5-1 Formation, Rotation 1, Base positions example:**
```typescript
{
  formation: '5-1',
  rotation: 1,
  phase: 'base',
  positions: [
    { slot: 'P1', x: 80, y: 15, label: 'S', role: 'Setter' },      // back-right (setter runs up to set)
    { slot: 'P2', x: 80, y: 65, label: 'OPP', role: 'Opposite' },   // right-front
    { slot: 'P3', x: 50, y: 70, label: 'MB', role: 'Middle' },      // middle-front
    { slot: 'P4', x: 20, y: 65, label: 'OH', role: 'Outside' },     // left-front
    { slot: 'P5', x: 20, y: 25, label: 'MB', role: 'Middle' },      // left-back
    { slot: 'P6', x: 50, y: 20, label: 'OH', role: 'Outside' },     // middle-back
  ]
}
```

CC must research and define ALL 54 position sets. Use volleyball coaching resources to get the positions accurate. The serve-receive positions are particularly important — they are DIFFERENT from base positions (passers spread out, setter moves to target position).

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: game day data model, offline storage, rotation engine, formation positions"
git push
```

---

## PHASE 2: SCREEN 1 — GAME PREP / LINEUP

`app/game-day-command.tsx` — The main Game Day Command Center screen with swipe navigation.

### 2A. Screen shell with swipe

Create the main screen as a horizontal pager (use `react-native-pager-view` or a `FlatList` with `pagingEnabled`):
- 4 pages: Prep → Live → End → Summary
- Dot indicator at top showing current page
- Can swipe between pages, but certain transitions are gated (can't go to Live until lineup is confirmed)

### 2B. Game Prep page — TABLET LAYOUT

Full-screen, dark navy background (PLAYER_THEME). This is the lineup/rotation viewer.

**Top bar:**
- "vs [Opponent Name]" left
- "Start Match" button (teal, large) center-right — disabled until lineup is confirmed
- "Return to Match" button — only visible if a match is in progress (coming back to review rotations)

**Formation selector:** Left side, vertical pills
- "6-2" / "5-1" / "6-6" — tap to switch
- When switching formations, player photos ANIMATE to their new positions on the court

**Court view:** Center, large
- White/light rounded rectangle representing the court
- NET line (dashed, teal) across the middle
- 6 player photo cards in their rotational positions
- Each card shows: player photo (or avatar), jersey number (LARGE), position label (OH, MB, S, etc.)
- Yellow border on the currently selected/active player
- Volleyball icon on the player in the serve position (P1)
- Libero indicator: if assigned, show a different badge/border

**Subs column:** Right side
- Stack of bench player photo cards (smaller than court cards)
- Each shows: photo, jersey number
- Tap a sub → then tap a starter → they swap (with animation)
- Rotation arrows between subs column and court

**Rotation selector:** Left side, below formation
- "R1" / "R2" / "R3" / "R4" / "R5" / "R6" buttons
- Tap to cycle through rotations — court positions update with animation
- The app shows WHO is in each position for that rotation

**Phase toggle:** Below court or left side
- "Base" / "Serve" / "Serve Receive" buttons (or icons: house, volleyball, shield)
- Toggling these changes the POSITIONS on the court to show where players should stand in each phase
- This is the coaching/learning tool — shows the actual movements

**Libero assignment:**
- Long-press a player on the bench → "Set as Libero" option
- Libero gets a special border color (gold)
- In the rotation view, the app automatically shows where the libero subs in (replaces back-row MB)

**Sub pair planning:**
- Drag a sub next to a starter → creates a sub pair
- Or: tap sub → tap starter → "Set as sub pair" → linked
- Sub pairs shown with a subtle connecting line or matching badge

**Bottom bar:**
- "Auto-Fill" button (lightning icon) — auto-assigns players to positions based on their registered position
- "Clear" button (trash icon) — removes all assignments
- Team name and score area (pre-match, shows 0-0)
- "ROTATION PREVIEW" expandable — shows all 6 rotations in a mini grid

### 2C. Game Prep page — PHONE LAYOUT

Same data, adapted for smaller screen:
- Court fills most of the screen
- Player photos are smaller circles with jersey numbers (not full photo cards)
- Formation/rotation selectors are a compact pill bar at top
- Subs are in a collapsible bottom drawer (drag up to see bench)
- Phase toggle is a small segmented control below the court
- "Start Match" is a prominent floating button at the bottom

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: Game Prep screen with court view, formation selector, rotation preview, sub pairs"
git push
```

---

## PHASE 3: SCREEN 2 — LIVE MATCH (Core: Score + Rotation)

This is the most important screen. The coach spends 90% of game time here.

### 3A. Layout — TABLET

**Top section (~40% of screen): Mini court view**
- Compact court with 6 player photos in current rotation positions
- NET label
- Players show jersey number prominently
- Yellow border on highlighted/selected player
- Court positions update based on current phase (serve/serve-receive/base)
- Rotation indicators (R1-R6) on the left, current highlighted

**Left side: Serve/Receive indicator**
- "SERVE" button (teal) — we are serving
- "SERVE RECEIVE" button (sky blue) — they are serving
- These update the mini court positions

**Right side: Subs panel**
- Bench players in a compact grid (2 rows of 3, or scrollable column)
- "ALERT" section showing pre-planned sub reminders:
  - "Sub: 10 Kim for 7 Ashley"
  - "Sub: 11 Toni for 3 Rachael"
- Tap a sub player → highlights who they should swap with on court → "Confirm Sub" button
- Sub count tracker: "Subs: 3/12 used"

**Bottom section: Scoreboard**
- Large score display: "SET 1" header
- Home score (MASSIVE number) | Away score (MASSIVE number)
- +/- buttons flanking each score (big tap targets, ≥56px)
- Team names below scores
- When home team scores on opponent's serve → auto side-out → auto rotation

**Action buttons (bottom-right):**
- "Show Rotation" (teal) — full-screen rotation diagram overlay (goes back to Screen 1 view temporarily)
- "End Set/Match" (coral) — triggers end-of-set flow

### 3B. Layout — PHONE

- Court is top 30% of screen, very compact (circles with jersey numbers only)
- Score is middle section, large and prominent
- Subs are in a slide-up panel from bottom
- Serve/Receive toggle is a segmented control above the score
- Action buttons are in a bottom action bar

### 3C. Auto-Rotation Logic

When a score is recorded:
1. If WE scored on THEIR serve (side-out):
   - Our score +1
   - `isServing` flips to `true`
   - ALL players rotate clockwise
   - Court positions animate to new rotation
   - New server identified and highlighted
   - Check if libero needs to come in/out for this rotation
   - Show "LIBERO IN for #[jersey]" or "LIBERO OUT" alert if applicable

2. If WE scored on OUR serve:
   - Our score +1
   - No rotation
   - Same server

3. If THEY scored on OUR serve (side-out):
   - Their score +1
   - `isServing` flips to `false`
   - No rotation (we only rotate when WE gain serve)

4. If THEY scored on THEIR serve:
   - Their score +1
   - No rotation

**The +/- buttons must encode this logic.** The coach taps "our point" or "their point" and the app handles rotation automatically. If the coach taps the wrong button, they tap the — button to undo.

### 3D. Substitution Flow

1. Coach taps a bench player → that player's pre-planned match (if any) highlights on court
2. Coach taps the court player → confirmation: "#14 Ava subs in for #19 Mckayla?"
3. Coach confirms → animation: bench player slides onto court, court player slides to bench
4. Sub counter increments
5. Sub logged in `subLog` with timestamp and set number
6. If this violates re-entry rules, show a warning: "Warning: #19 can only re-enter for #14"

### 3E. Libero Auto-Tracking

Based on the current rotation and formation:
- The engine knows which player (typically a MB) is in the back row
- When rotation changes put a MB in the back row → alert: "LIBERO IN for #[MB jersey]"
- When that MB rotates to front row → alert: "LIBERO OUT, #[MB jersey] back in"
- The coach confirms or dismisses — the app just reminds, doesn't force

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: Live Match screen with score tracking, auto-rotation, substitution flow, libero tracking"
git push
```

---

## PHASE 4: LIVE MATCH — Serve Tracking

### 4A. Serve Overlay

When it's our serve and the app identifies the server:
- A slide-up panel appears showing:
  - Server's photo + name + jersey number (left side)
  - A court diagram (top-down view) showing the opponent's court (right side)
  - The court is divided into zones

### 4B. Court Tap-Map

The opponent's court diagram is tappable:
- **Inside the court lines (valid area):** tap = good serve recorded
  - The tap location is recorded as (x, y) coordinates
  - A green crosshair/target icon appears where tapped
  - A "good serve" count increments
  - The panel can auto-dismiss after recording (or stay open for the next action)

- **Long press inside court:** ACE!
  - Cool animation (star burst, flash)
  - Different icon (gold star instead of green crosshair)
  - Ace count increments
  - Auto-records as "our point" + updates score

- **Outside court lines / in the net area:** serve error
  - Red X appears
  - Auto-records as "their point" (serve error = point for opponent)
  - Serve error count increments

- **Serve stats tracked per server:**
  - Total serves
  - Good serves (in play, not ace, not error)
  - Aces
  - Serve errors
  - Serve locations (heat map data for post-game)

### 4C. Serve Receive (When They Serve)

When they are serving:
- No serve overlay (we don't track their serves by location)
- The mini court shows serve-receive positions
- Rally tracking (Tier 2) begins if enabled

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: serve tracking with court tap-map, ace detection, serve error auto-scoring"
git push
```

---

## PHASE 5: LIVE MATCH — Tier 2 Rally Stat Tracking (Toggle)

This is OPT-IN. A toggle in the settings or on the Live Match screen: "Track Rally Stats" ON/OFF.

### 5A. Toggle and UI

When Tier 2 is ON, the bottom section of the Live Match screen expands to show a stat tracking panel below the court (tablet) or in a drawer (phone).

### 5B. Quick-Tap Stat Flow

**How it works:**

1. A rally happens. Ball is dead.
2. Coach taps a player on the mini court (or from a player strip below the court)
3. That player's photo highlights and a quick-action bar appears:
   - **Passing:** 👍 (good pass) | 👎 (bad pass) | [empty box for neutral]
   - **Hitting:** 👍 (good hit / kill) | 👎 (hit error) | [empty box]
   - **Setting:** 👍 (good set) | 👎 (bad set / set error)
   - **Point:** ✓ (this player scored the point)
   - **Error:** ✗ (this player's error gave them the point)

4. Coach can tap multiple players in sequence:
   - Tap Kim → good pass
   - Tap Ava → good set
   - Tap Rachael → good hit → point ✓
   - This records 3 actions in rapid succession

5. Between rallies (or during a timeout), the coach can review/undo recent actions

6. Running totals show below each player: "2 passes, 1 hit error, on point"

### 5C. Point Attribution

- If coach taps ✓ (point) on a player → our score +1, that player gets the "kill" or "ace" or "block" credit
- If coach taps ✗ (error) on a player → their score +1, that player gets the error
- If opponent scores and no player is attributed → "opponent point" generic

### 5D. Stat Summary Per Player (visible during timeouts/between sets)

A quick pull-up showing each player's current stats:
- Name | K | E | A | D | B | S% (kills, errors, assists, digs, blocks, serve %)
- Color-coded: green for good ratios, red for high error rates

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: Tier 2 rally stat tracking - quick-tap player actions, point attribution"
git push
```

---

## PHASE 6: SCREEN 3 — END SET / END MATCH

### 6A. End Set Trigger

When score reaches 25 (sets 1-4) or 15 (set 5) with a 2-point lead, or when the coach manually taps "End Set":
- Confirmation: "End Set 1? Black Hornets 25 — 18 Frisco Flyers"
- If the set score doesn't meet the 25/15 + 2-point rule, show warning: "Score doesn't meet standard set end rules. End anyway?" (because youth leagues sometimes have different rules like cap at 27)

### 6B. Between Sets

After confirming set end:
- Show set summary: set score, sub count, top stats (if Tier 2)
- "Start Set [N+1]" button
- Same lineup carries forward (or coach can adjust on Game Prep screen)
- Sub count resets to 0 for the new set
- Rotation can reset or continue (configurable — some leagues reset, some don't)

### 6C. End Match

When enough sets are won (best of 3 or best of 5 — configurable):
- Auto-detect: "Black Hornets win 2-0!" or "Match complete: 2-1"
- Or manual: coach taps "End Match"
- Confirmation with full match summary

### 6D. Match Summary Screen

- Match result: W/L + overall score (sets won)
- Set-by-set scores
- If Tier 2: top performers, team stat totals
- "Save & Finish" → saves to local storage, queues for Supabase sync
- "Share" → generates a shareable image/card of the match result

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 6: end set/match flow, between-set management, match summary"
git push
```

---

## PHASE 7: SCREEN 4 — POST-GAME SUMMARY + SYNC

### 7A. Post-Game Summary Screen

Auto-generated from match data:
- Match hero: W/L badge + score + opponent + date
- Set-by-set breakdown
- If Tier 2: MVP (most kills), top server (most aces), top defender (most digs)
- Serve chart: if serve locations were tracked, show a heat map of where serves landed
- Sub usage summary
- "Save to Lynx" button → triggers Supabase sync

### 7B. Supabase Sync

When network is available:
- Replay `pendingActions` queue against Supabase
- Update the `events` table with match results (scores, sets)
- Update `player_stats` table with individual stats (if Tier 2)
- Update `game_results` with set-by-set data
- Mark match as `synced`
- Show sync status: "Match saved to Lynx" with green checkmark

### 7C. Sync Status Indicator

Throughout the Command Center:
- Small dot in the header: green = connected + synced, orange = offline/pending, red = sync failed
- If offline: "Playing offline — data will sync when connected"
- On app restart: check for unsynced matches and prompt to sync

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 7: post-game summary screen, Supabase sync engine, offline queue replay"
git push
```

---

## PHASE 8: NAVIGATION + ENTRY POINTS

### 8A. Entry from Game Day tab

The Game Day tab (`app/(tabs)/gameday.tsx`) hero card should have a prominent "START MATCH" or "GAME DAY COMMAND" button that navigates to the Command Center:

```typescript
router.push('/game-day-command?eventId=${event.id}&teamId=${team.id}&opponent=${opponentName}')
```

### 8B. Entry from Coach Home Scroll

Add a "GAME DAY" Tier 1 card that appears when a game is today or within 2 hours:
- Game vs [Opponent] at [Time]
- "Enter Command Center" teal button

### 8C. Return to In-Progress Match

If a match is in progress (stored locally) and the coach navigates away:
- A persistent banner at the top of any screen: "Match in progress vs [Opponent] — Tap to return"
- Tapping returns to the Command Center at Screen 2 (Live Match)

### 8D. From Game Prep shortcut

The existing "Prep Lineup" button on the Game Day hero card should navigate to Screen 1 of the Command Center (Game Prep view).

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 8: navigation entry points - game day tab, coach home, in-progress banner"
git push
```

---

## PHASE 9: PHONE LAYOUT ADAPTATIONS

Go through every screen in the Command Center and verify/build the phone-adapted layout.

### Key differences for phone:
- Court view: 30% of screen height (vs 40% on tablet)
- Player photos: 40px circles with jersey number overlay (vs full photo cards on tablet)
- Subs panel: bottom drawer that slides up (vs always-visible column on tablet)
- Score display: centered and large (same on both)
- Stat tracking (Tier 2): horizontal scrollable player strip instead of grid
- Serve court map: fills full width, slightly shorter
- Formation/rotation selectors: compact pill bar instead of full buttons

Use `useWindowDimensions()` to detect screen size and apply the appropriate layout:
```typescript
const { width, height } = useWindowDimensions();
const isTablet = width >= 768;
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 9: phone layout adaptations for all Command Center screens"
git push
```

---

## PHASE 10: VERIFY EVERYTHING

```bash
# 1. TypeScript clean
npx tsc --noEmit 2>&1 | grep -v "reference\|design-reference" | tail -10

# 2. New files exist
ls -la lib/gameday/match-state.ts
ls -la lib/gameday/match-store.ts
ls -la lib/gameday/rotation-engine.ts
ls -la lib/gameday/formation-positions.ts
ls -la app/game-day-command.tsx

# 3. Rotation engine has all formations
grep -c "formation.*5-1\|formation.*6-2\|formation.*6-6" lib/gameday/formation-positions.ts
# Expected: many (54 position sets total)

# 4. Offline storage works
grep -n "AsyncStorage\|expo-sqlite" lib/gameday/match-store.ts
# Expected: storage implementation present

# 5. Navigation wired
grep -n "game-day-command" app/\(tabs\)/gameday.tsx components/CoachHomeScroll.tsx
# Expected: entry points exist

# 6. Both layouts present
grep -n "isTablet\|useWindowDimensions" app/game-day-command.tsx
# Expected: responsive layout detection

git add -A
git commit -m "Phase 10: Game Day Command Center verification"
git push
```

---

## EXPECTED RESULTS

1. **Rotation Engine** — Complete volleyball rules for 5-1, 6-2, 6-6 formations. All 6 rotations × 3 phases × 3 formations = 54 position sets. Libero tracking. Sub validation with re-entry rules.

2. **Game Prep (Screen 1)** — Interactive lineup builder with court view, formation selector, rotation preview, sub pair planning, libero assignment. Player photos animate between positions when changing formation/rotation/phase. Works on both phone and tablet.

3. **Live Match (Screen 2)** — Real-time score tracking with auto-rotation on side-out. Mini court view showing current positions. Sub management with pre-planned pair reminders. Libero in/out alerts. Large tap targets for gym lighting.

4. **Serve Tracking** — Court tap-map for recording serve locations. Ace detection (long press). Serve error auto-scoring (tap outside court). Per-server stats.

5. **Tier 2 Rally Stats** — Toggle-on quick-tap stat tracking. Tap player → tap action (pass/hit/set good/bad). Point attribution. Running totals.

6. **End Set/Match** — Auto-detect set/match end. Between-set management. Match summary with set-by-set scores.

7. **Post-Game Summary** — Auto-generated recap. Top performers. Serve heat map. Share button.

8. **Offline-First** — Every action stored locally immediately. Sync queue replays when network returns. Visual sync indicator.

9. **Both Layouts** — Tablet-first with full photo cards, phone-adapted with compact circles.

10. **10 commits** — one per phase, each pushed.
