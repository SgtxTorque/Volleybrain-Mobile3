# CC-PLAYER-EVALUATIONS-MOBILE.md
# Lynx Mobile — Player Evaluations: Coach Skill Rating System

**Priority:** H1-04 — Coaches need to evaluate players during active season  
**Estimated time:** 4–6 hours (6 phases, commit after each)  
**Risk level:** MEDIUM — new screens with database integration, but straightforward form flow

---

## WHAT THIS IS

Coaches evaluate players by rating skills on a 1-5 scale. The web already has an evaluation form — this spec brings that experience to mobile so coaches can evaluate at practice, after a game, or from the bench. The key difference from web: mobile evaluations are optimized for SPEED. A coach should be able to rate an entire roster in 10-15 minutes, swiping through players one at a time.

When a coach submits evaluations, the player's skill bars (power bars on their trading card) update automatically. Players can see their evaluation history and track improvement over time. Parents see their child's latest ratings.

---

## REFERENCE FILES

### V0 Mockups (VISUAL TARGETS — read before coding):
1. **`reference/design-references/v0-mockups/components/screens/m4-tryouts.tsx`** — Mobile evaluation mockup. Player carousel at top, skill rating bars (1-5 tappable blocks), progress tracker, notes.
2. **`reference/design-references/v0-mockups/components/desktop/d3-tryout-eval.tsx`** — Desktop version. Split-panel: player queue left, evaluation form right. Power bars with 1-5 rating circles.

### Brand & Existing:
3. `reference/design-references/brandbook/LynxBrandBook.html` — Brand system
4. `reference/supabase_schema.md` — Check for existing evaluation tables (`player_skills`, `evaluations`, `sport_skill_templates`)
5. `components/PlayerTradingCard.tsx` — Trading card that shows skill power bars (these should update from evaluations)
6. `components/CoachHomeScroll.tsx` — Wire evaluation entry points here
7. `app/player-goals.tsx` — Player goals/notes screen (evaluations complement this)

---

## DATABASE — CHECK WHAT EXISTS FIRST

The schema may already have evaluation tables from previous work. Check:

```bash
grep -i "eval\|skill\|rating\|player_skills\|sport_skill" reference/supabase_schema.md | head -20
```

**If `player_skills` table exists:** Use it. It likely has player_id, skill_key, rating, and timestamps.

**If `sport_skill_templates` table exists:** Use it for the skill definitions per sport.

**If neither exists, create:**

### `evaluation_skills` table (sport-specific skill definitions)
```sql
CREATE TABLE IF NOT EXISTS evaluation_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL DEFAULT 'volleyball',
  skill_key TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  skill_description TEXT,
  category TEXT, -- 'technical', 'physical', 'mental'
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(sport, skill_key)
);

-- Seed volleyball skills
INSERT INTO evaluation_skills (sport, skill_key, skill_name, category, display_order) VALUES
  ('volleyball', 'serving', 'Serving', 'technical', 1),
  ('volleyball', 'passing', 'Passing', 'technical', 2),
  ('volleyball', 'hitting', 'Hitting', 'technical', 3),
  ('volleyball', 'setting', 'Setting', 'technical', 4),
  ('volleyball', 'blocking', 'Blocking', 'technical', 5),
  ('volleyball', 'defense', 'Defense / Digging', 'technical', 6),
  ('volleyball', 'court_awareness', 'Court Awareness', 'mental', 7),
  ('volleyball', 'game_iq', 'Game IQ', 'mental', 8),
  ('volleyball', 'hustle', 'Hustle / Effort', 'physical', 9),
  ('volleyball', 'communication', 'Communication', 'mental', 10),
  ('volleyball', 'coachability', 'Coachability', 'mental', 11),
  ('volleyball', 'athleticism', 'Athleticism', 'physical', 12);
```

### `player_evaluations` table (evaluation sessions)
```sql
CREATE TABLE IF NOT EXISTS player_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES profiles(id) NOT NULL,
  team_id UUID REFERENCES teams(id) NOT NULL,
  evaluator_id UUID REFERENCES profiles(id) NOT NULL,
  season_id UUID REFERENCES seasons(id),
  evaluation_type TEXT DEFAULT 'regular' CHECK (evaluation_type IN ('tryout', 'regular', 'mid_season', 'end_season')),
  overall_rating DECIMAL(3,1), -- auto-calculated average
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `player_evaluation_ratings` table (individual skill ratings per evaluation)
```sql
CREATE TABLE IF NOT EXISTS player_evaluation_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID REFERENCES player_evaluations(id) NOT NULL,
  skill_key TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  previous_rating INTEGER, -- last rating for this skill (for showing delta)
  UNIQUE(evaluation_id, skill_key)
);
```

### RLS Policies
- Coaches: full CRUD on evaluations for their teams
- Admins: full CRUD on all evaluations in their org
- Players: read their own evaluations only
- Parents: read their children's evaluations only

---

## PHASE 1: DATABASE + DATA LAYER

### 1A. Create/verify tables and seed skill definitions
### 1B. Create `lib/evaluations.ts`

```typescript
// Skills
getEvaluationSkills(sport?: string): EvaluationSkill[]

// Evaluations CRUD
createEvaluation(playerId, teamId, evaluatorId, ratings, notes): Evaluation
getPlayerEvaluations(playerId): Evaluation[]  // history, newest first
getLatestEvaluation(playerId): Evaluation | null
getTeamEvaluationStatus(teamId): { playerId, playerName, lastEvaluatedAt, overallRating }[]

// Bulk
startEvaluationSession(teamId): EvaluationSession  // returns roster with last ratings pre-loaded
saveSessionRatings(sessionId, playerId, ratings, notes): void
completeSession(sessionId): void

// Queries
getPlayersNeedingEvaluation(teamId, daysSinceLast?: number): Player[]
getEvaluationHistory(playerId, limit?: number): Evaluation[]
```

### 1C. Create `hooks/useEvaluations.ts`

```typescript
function useEvaluationSession(teamId: string)
function usePlayerEvaluationHistory(playerId: string)
function useTeamEvaluationStatus(teamId: string)
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: player evaluations - database schema, skill definitions, data layer"
git push
```

---

## PHASE 2: THE SWIPE-THROUGH EVALUATION FORM

This is the core screen. A coach swipes through players one at a time, rating each on all skills.

### 2A. Create `app/player-evaluations.tsx`

**Route:** `/player-evaluations?teamId=X`

**Read the mockup first:** `reference/design-references/v0-mockups/components/screens/m4-tryouts.tsx`

**Layout: Full-screen evaluation form, swipe-per-player**

**Top: Player Carousel (horizontal)**
- Scrollable row of player circles (48px)
- Each circle: player photo (or initials), jersey number below
- Status indicator:
  - Done (teal checkmark overlay): rated in this session
  - Active (gold border, slightly larger): currently being rated
  - Todo (gray, no border): not yet rated
- Progress text: "4 of 12 evaluated"
- Tapping a player circle jumps to that player

**Center: Current Player Card**
- Player photo (80px), name (large bold), jersey number, position badge
- Team name below

**Below: Skill Rating Grid**
- Each skill gets its own row:
  - Skill name (left): "Serving", "Passing", etc.
  - Rating value (right): "4/5" or "--" if not rated
  - 5 tappable rating blocks (full width, horizontal):
    - Each block: numbered 1-5
    - Unrated: gray/outlined
    - Rated: filled with gradient (1=coral, 2=gold, 3=teal, 4=sky, 5=gold-glow)
    - Tap to rate, tap same to deselect
  - Below the blocks: horizontal power bar fills to match the rating (like the trading card power bars)
  - If previous rating exists: small delta indicator "+1 ↑" or "-1 ↓" or "= same"

**Skill categories grouped:**
- **Technical:** Serving, Passing, Hitting, Setting, Blocking, Defense
- **Mental:** Court Awareness, Game IQ, Communication, Coachability
- **Physical:** Hustle, Athleticism

Small section headers between groups.

**Bottom: Notes + Navigation**
- Notes text input (optional): "Add evaluation notes..."
- "Save & Next →" button (teal, large): saves this player's ratings, auto-advances to next player
- "← Previous" text button (subtle): go back to previous player
- "Skip" text button: skip this player without rating

**Auto-calculated overall:** As skills are rated, an overall rating appears at the top of the card area — the average of all rated skills, displayed as a number (e.g., "3.8") and as a tier color (same tiers as OVR on trading cards).

### 2B. Swipe Behavior

- Swiping left = next player (same as tapping "Save & Next")
- Swiping right = previous player
- Ratings auto-save on swipe/navigation (no explicit save needed — just like attendance toggles)
- Current player's data loads from the evaluation session, pre-populated with any ratings already entered

### 2C. Phone vs Tablet Layout

Use `useResponsive()`:

**Phone:** Single column. Player card compact (40px photo). Skills stack vertically. Rating blocks are full-width rows.

**Tablet portrait:** Same single column but skills can be 2-column grid (6 skills per column).

**Tablet landscape:** Split panel — player carousel + card on left (~35%), skill rating grid on right (~65%). Like the D3 desktop mockup.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: swipe-through evaluation form with skill ratings, power bars, deltas"
git push
```

---

## PHASE 3: EVALUATION SESSION MANAGEMENT

### 3A. Session Start Screen

Before the swipe-through form, show a brief session setup:

**`app/evaluation-session.tsx`** or a modal/bottom sheet before the form:

- Team selector (if coach has multiple teams)
- Evaluation type: "Regular Check-In" / "Mid-Season" / "End of Season" / "Tryout"
- "Players to evaluate" — pre-checked roster. Coach can uncheck players to skip.
- Players who haven't been evaluated in 30+ days: highlighted with a gold "overdue" badge
- "Start Evaluation" button (teal)

### 3B. Session Progress Persistence

If the coach starts evaluating 12 players but only gets through 8:
- Session saves to local storage (AsyncStorage)
- On next open: "You have an unfinished evaluation session (8/12 complete). Resume or start new?"
- "Resume" loads the session at the 9th player

### 3C. Session Complete

After the last player is rated:
- Summary screen: list of all players with their overall ratings, color-coded
- "Submit All Evaluations" button → saves to Supabase
- Coach mascot (clipboard) + "Evaluations complete! Skill bars updated."
- Option to share a summary or go back to edit any player

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: evaluation session management - setup, persistence, completion"
git push
```

---

## PHASE 4: PLAYER-FACING EVALUATION VIEW

Players and parents should see their evaluation results — but presented as growth, not judgment.

### 4A. Evaluation History on Player Card

In the player trading card / child-detail screen, add an "Evaluations" tab or section:

- Latest evaluation: date, evaluator (coach name), overall rating
- Skill breakdown: each skill with power bar + rating + delta from previous
- Power bars use the same color tier system as everywhere else
- Delta arrows: green ↑ for improvement, red ↓ for decline, gray = for same
- Improvement callout: "Serving improved from 3 to 4!" (teal highlight)

### 4B. Evaluation History Timeline

Scrollable history of past evaluations (reverse chronological):
- Each entry: date + type + overall rating + evaluator
- Tap to expand: see the full skill breakdown for that evaluation
- Trend line: if 3+ evaluations exist, show a mini sparkline of the overall rating over time

### 4C. Player Home Integration

On the player's home scroll:
- If a new evaluation was submitted since last app open:
  - "NEW EVALUATION" card (Tier 1, gold border)
  - "Coach evaluated your skills! Your overall rating: 4.2"
  - Tap → full evaluation detail
  - Show improvements prominently: "Serving ↑ Passing ↑ Hitting ="

On the parent's home scroll:
- Similar card: "[Child]'s latest evaluation is in!"
- Overall rating + top improvements

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: player-facing evaluation view - history, power bars, deltas, home scroll cards"
git push
```

---

## PHASE 5: TRADING CARD + POWER BAR AUTO-UPDATE

When evaluations are submitted, the player's trading card power bars should reflect the latest ratings.

### 5A. Connect Evaluations to Trading Card

In `components/PlayerTradingCard.tsx`, the stat power bars currently show game stats (kills, digs, aces, etc.). Evaluations provide a DIFFERENT data set — skill ratings (serving, passing, hitting as 1-5 ratings, not counts).

**Two approaches (pick the better one based on current implementation):**

**Option A: Skill bars replace game stats on the trading card**
- The 6 stat bars on the trading card show evaluation skill ratings (scaled to 0-100 from the 1-5 scale)
- This makes the trading card reflect the coach's assessment, not just game stats
- Game stats live in a separate "Stats" tab on the detail view

**Option B: Both exist, evaluation powers the OVR**
- Game stats stay on the trading card (kills, aces, etc.)
- The OVR (overall rating) badge on the card uses the evaluation average
- Skill ratings visible on the detail/expanded view
- Power bars on the card use game stats, OVR uses evaluation

**Whichever option: the OVR badge must update when evaluations are submitted.** If a player's evaluation average is 4.2 out of 5, that maps to an OVR of ~84. The color tier updates accordingly.

### 5B. OVR Calculation

```typescript
function calculateOVR(evaluationRatings: { skill_key: string; rating: number }[]): number {
  if (evaluationRatings.length === 0) return 0;
  const avg = evaluationRatings.reduce((sum, r) => sum + r.rating, 0) / evaluationRatings.length;
  // Scale 1-5 to 0-99
  // 5.0 = 99, 4.0 = 79, 3.0 = 59, 2.0 = 39, 1.0 = 19
  return Math.round((avg - 1) * 20 + 19);
}
```

This means:
- 5.0 average = 99 OVR (legendary)
- 4.5 = 89 (gold tier)
- 4.0 = 79 (teal tier)
- 3.5 = 69 (sky tier)
- 3.0 = 59 (average)
- 2.0 = 39 (below average, gray)

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: connect evaluations to trading card OVR badge and power bars"
git push
```

---

## PHASE 6: NAVIGATION + COACH TOOLS + VERIFY

### 6A. Entry Points

| From | Action | Destination |
|------|--------|-------------|
| Coach Home Scroll | "X players due for evaluation" action item | `/evaluation-session?teamId=X` |
| Coach Home Scroll | Coach Tools section | `/evaluation-session` |
| Coach Tools (drawer/more) | "Player Evaluations" | `/evaluation-session` |
| Player detail (coach view) | "Evaluate" button | `/player-evaluations?teamId=X&playerId=Y` (jumps to that player) |
| Game Day Command Center | Post-game prompt: "Rate player performance?" | `/player-evaluations?teamId=X` |
| Team Hub (coach) | Quick action: "Evaluate Players" | `/evaluation-session` |

### 6B. "Due for Evaluation" Logic

On the coach home scroll, show an action item when players haven't been evaluated recently:
- "10 players due for evaluation" (coral if > 30 days, gold if > 14 days)
- Tap → evaluation session pre-filtered to overdue players

### 6C. Post-Game Evaluation Nudge

After completing a match in the Game Day Command Center:
- On the post-game summary screen: "Evaluate player performance while it's fresh?"
- "Evaluate Now" button → `/player-evaluations?teamId=X`
- This catches the coach when they're most likely to have observations

### 6D. Verify

```bash
# 1. TypeScript clean
npx tsc --noEmit 2>&1 | grep -v "reference\|design-reference" | tail -10

# 2. New files exist
ls -la app/player-evaluations.tsx
ls -la app/evaluation-session.tsx
ls -la lib/evaluations.ts
ls -la hooks/useEvaluations.ts

# 3. Skills seeded
grep -n "serving\|passing\|hitting\|setting\|blocking" lib/evaluations.ts | head -5

# 4. Trading card integration
grep -n "evaluation\|OVR\|calculateOVR\|overallRating" components/PlayerTradingCard.tsx | head -5

# 5. Coach home integration
grep -n "evaluation\|Evaluation\|due for eval" components/CoachHomeScroll.tsx | head -5

# 6. Navigation wired
grep -rn "player-evaluations\|evaluation-session" --include="*.tsx" app/ components/ | grep -v "node_modules" | grep -v "reference/" | wc -l

git add -A
git commit -m "Phase 6: player evaluations - navigation, coach tools, post-game nudge, verification"
git push
```

---

## EXPECTED RESULTS

1. **12 Volleyball Skills** defined: Serving, Passing, Hitting, Setting, Blocking, Defense, Court Awareness, Game IQ, Hustle, Communication, Coachability, Athleticism — grouped by Technical/Mental/Physical

2. **Swipe-Through Evaluation Form** — Player carousel at top, skill rating grid with 1-5 tappable blocks + power bars + delta indicators. Auto-save on swipe. "Save & Next" for speed. Phone and tablet layouts.

3. **Evaluation Session Management** — Setup (team, type, player selection), progress persistence (resume unfinished sessions), completion summary.

4. **Player-Facing View** — Evaluation history with power bars and deltas on the trading card/detail screen. "Serving improved from 3 to 4!" callouts. Trend sparklines for 3+ evaluations. New evaluation cards on player and parent home scrolls.

5. **Trading Card Auto-Update** — OVR badge recalculates from evaluation averages. Power bars reflect latest skill ratings. Color tier updates.

6. **Coach Integration** — "Due for evaluation" action items on coach home. Post-game evaluation nudge after matches. Accessible from coach tools, team hub, player detail.

7. **6 commits** — one per phase, each pushed
