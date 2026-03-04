# CC-WAVE-5-COACH-TOOLS.md
# Lynx Mobile — Wave 5: Coach Tool Screens

**Priority:** Run after CC-WAVE-4-PLAYER-IDENTITY completes  
**Estimated time:** 3–4 hours (6 phases, commit after each)  
**Risk level:** LOW-MEDIUM — these screens are functional, mostly need brand pass + UX polish. One new screen (Game Recap).

---

## WAVE CHECKLIST (update as completed)

- [ ] **Wave 0** — Archive dead code + wire admin stubs
- [ ] **Wave 1** — Kill ParentOnboardingModal + shared components brand pass
- [ ] **Wave 2** — Auth redesign + smart empty states
- [ ] **Wave 3** — Daily-use screens (Schedule, Chat, Team Hub)
- [ ] **Wave 4** — Player identity screens
- [ ] **Wave 5** — Coach tool screens ← THIS SPEC
- [ ] Wave 6 — Admin management screens
- [ ] Wave 7 — Settings, legal, remaining screens
- [ ] Wave 8 — New/planned screens

---

## REFERENCE FILES — READ BEFORE WRITING ANY CODE

Read `LYNX-REFERENCE-GUIDE.md` in the repo root for the full reference map.

### For this wave:

1. `reference/design-references/brandbook/LynxBrandBook.html` — Brand system
2. `reference/design-references/brandbook/lynx-screen-playbook-v2.html` — Open and read the **"Coach Tools"** section in the `screens` array. Every screen in this wave has detailed vision and layout specs there.
3. `reference/design-references/player-mockups/s4-game-recap.tsx` — Game recap design reference from v0. Study the layout for the new Game Recap screen.
4. `reference/design-references/v0-mockups/components/` — Check for any coach-related components
5. `reference/supabase_schema.md` — Tables for events, attendance, game_results, player_stats, lineups
6. `theme/colors.ts` and `lib/design-tokens.ts` — Updated design tokens

### Mascot images:
7. `assets/images/mascot/celebrate.png` — Post-game win celebration
8. `assets/images/mascot/SleepLynx.png` — Empty states

---

## DESIGN PHILOSOPHY FOR THIS WAVE

Coach tools are **courtside efficiency**. A coach is standing next to a volleyball court, phone in one hand, whistle in the other. Fingers might be sweaty. Gym is loud.

Every screen must prioritize:
- **Large tap targets** (minimum 48px, prefer 56-64px for primary actions)
- **High contrast** (dark backgrounds with bright action elements for gym lighting)
- **Minimal text** — icons + numbers, not paragraphs
- **Speed** — every extra tap costs attention away from the game
- **Auto-save** — never make a coach tap "Save" while managing kids

---

## PHASE 1: GAME DAY TAB + GAME PREP WIZARD

### 1A. Game Day Tab

`app/(tabs)/gameday.tsx` — The coach's visible tab. This is the launchpad.

**Layout:**
- If there's a game TODAY or TOMORROW: show a prominent **Next Game** hero card
  - Opponent name, time, venue
  - Countdown: "In 3 hours" or "Tomorrow at 9 AM"
  - Two big action buttons:
    - "Prep Game" → navigates to game-prep-wizard with this event pre-selected
    - "Game Day Mode" → navigates to game-day-command (if built by CC-NEXT-FIVE), otherwise shows "Coming in next update" card with `laptoplynx.png`
- If NO upcoming game: show next practice or event instead with a calmer treatment
- Below the hero: quick action cards (smaller)
  - "Take Attendance" → navigates to attendance (show today's event if one exists)
  - "Enter Results" → navigates to game-results
  - "View Lineup" → navigates to lineup-builder
  - "Availability" → navigates to coach-availability

**Restyle:**
- Hero card: dark background with team color accent, bold countdown
- Action cards: brand PressableCard styling from Wave 1
- No clutter — max 5-6 tappable items visible without scrolling

### 1B. Game Prep Wizard

`app/game-prep-wizard.tsx` — Pre-game checklist. The calm before the storm.

**Multi-step flow with step indicator at top (dots connected by line):**

**Step 1: Review Lineup**
- Show current lineup for this event (from lineup-builder data)
- If no lineup set: prominent "Build Lineup" button → navigates to lineup-builder
- If lineup exists: compact court visual with player positions
- "Lineup looks good" confirmation button → next step

**Step 2: Check RSVPs / Attendance**
- List of rostered players with their RSVP status
- Color-coded: Going (teal) | Not Going (coral) | No Response (gold/amber)
- Count summary at top: "10 Going · 1 Can't · 3 No Response"
- "Send Reminder" button for no-response players (if blast functionality exists)
- "Looks good" → next step

**Step 3: Game Plan Notes (optional)**
- Text input area: "Any notes for this game?"
- Previous matchup notes (if historical data exists)
- "Skip" or "Save Notes" → next step

**Step 4: Ready Confirmation**
- Summary card: Opponent, Time, Venue, Lineup Set ✓, RSVPs Reviewed ✓, Notes ✓
- Big teal button: "Ready for Game Day"
- Tapping navigates to game-day-command (if it exists) or back to gameday tab
- Confirmation animation: subtle checkmark or `celebrate.png` mascot flash

**Restyle each step:**
- Clean card-based layout
- Large text for names and numbers
- Brand step indicator
- Transitions: horizontal slide between steps

### 1C. Game Prep Detail

`app/game-prep.tsx` — If this is a separate screen from the wizard, check what it does. If it duplicates the wizard, consider redirecting it to game-prep-wizard instead. If it serves a different purpose (viewing prep details rather than doing the prep), brand pass it:
- Same card styling as wizard
- Read-only version of the prep info
- Link to edit/redo the wizard

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: gameday tab hero + action cards, game prep wizard 4-step flow"
git push
```

---

## PHASE 2: ATTENDANCE — FASTEST POSSIBLE CHECK-IN

`app/attendance.tsx` — Used courtside while kids arrive. Every millisecond of friction is a problem.

### Design Principles:
- **ZERO chrome.** No unnecessary headers, descriptions, or instructions.
- **OVERSIZED toggles.** Not checkboxes — big tappable rows that change the entire row color.
- **Auto-save.** Every toggle saves immediately. No "Submit" button.
- **Running count always visible** at top.

### Layout:

**Sticky header:**
- Event info: one line — "Practice · Today 4:00 PM" (minimal)
- Running count: **"8 / 12 Present"** in large bold text
- "Mark All Present" button (teal, right-aligned) — one tap marks everyone

**Player list:**
- Each row: player avatar (small) + name + jersey number + toggle area
- Toggle area is the entire right half of the row — large tap target
- **Present:** row background turns subtle teal tint, green checkmark icon
- **Absent:** row background turns subtle coral tint, red X icon
- **Unmarked (default):** neutral background, gray dash icon
- Tap anywhere on the row to cycle: unmarked → present → absent → unmarked
- Haptic feedback on each toggle

**Bottom bar (optional):**
- "Notes" expandable text area for coach to add attendance notes
- This should be collapsed by default — most coaches won't use it

### Empty State:
If no event is selected or no players exist:
- "Select an event to take attendance" with a link to the schedule

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: attendance screen - oversized toggles, auto-save, running count, zero chrome"
git push
```

---

## PHASE 3: GAME RESULTS ENTRY — 3-STEP POST-GAME

`app/game-results.tsx` — Score entry after a game.

### 3-Step Workflow with step indicator:

**Step 1: Set Scores**
- Scoreboard layout — think gym scoreboard
- Dark background for scoreboard feel
- Team names left and right: "Black Hornets" vs "Opponent"
- For each set (volleyball is best-of-3 or best-of-5):
  - Two large number inputs side by side
  - Big enough to tap easily
  - +/- stepper buttons flanking each number, or tap to type
  - Set label: "SET 1", "SET 2", etc.
- "Add Set" button below if more sets needed
- Auto-detect winner per set (bold the higher score)
- Auto-calculate match result: "Win 2-1" or "Loss 0-2"
- "Next: Player Stats →" button

**Step 2: Player Stats Grid (optional — coach can skip)**
- Table layout: rows = players, columns = stat categories
- Stat columns: kills, digs, aces, blocks, serve errors (adapt to whatever stat columns exist in the database)
- Each cell: tap to increment (counter that goes up by 1 per tap)
- Long-press to decrement
- Keep cells large enough for courtside use (min 44px)
- Player names sticky on left as you scroll horizontally through stat columns
- "Skip Stats" link if the coach doesn't want to enter individual stats
- "Next: Summary →" button

**Step 3: Notes + Summary**
- Auto-calculated top performers (most kills, most digs, most aces) shown as highlight cards
- If no player stats entered (skipped step 2): just show the set scores
- "Game Notes" text area (optional)
- "Confirm & Save" button (teal, full width)
- On save: celebration if win (`celebrate.png` mascot), respectful confirmation if loss
- Navigates back to gameday tab or schedule

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: game results 3-step flow - scoreboard, player stats grid, summary"
git push
```

---

## PHASE 4: LINEUP BUILDER — THE DIGITAL CLIPBOARD

`app/lineup-builder.tsx` — Signature coach screen. Drag-and-drop court layout.

This is an interactive tool, not a form. It already works functionally — this phase is about making it LOOK like a premium coach tool.

### Layout:

**Top: Event selector**
- Dropdown or pill selector showing which event this lineup is for
- If navigated from game-prep-wizard, the event is pre-selected

**Center: Volleyball Court**
- Full-width court visualization (the VolleyballCourt.tsx component)
- 6 positions clearly marked on the court
- Each position: circular player chip showing jersey number + first name
- Empty positions: dashed circle with "+" icon
- Brand colors for the court: lynx-navy court background, white/sky lines, teal position markers

**Below Court: Bench**
- Horizontal scrollable list of unassigned players (player chips)
- Drag a chip from bench to a court position (if drag-and-drop works)
- If drag is too complex or currently broken: tap a bench player → tap a court position to assign

**Rotation Controls:**
- "Rotate →" button: shifts all 6 positions clockwise by one (standard volleyball rotation)
- "Rotate ←" button: reverse
- These should be prominent — coaches rotate lineups constantly

**Libero Slot:**
- Separate from the 6 positions
- Smaller designated area labeled "L" or "Libero"
- Different color treatment (gold or accent) to distinguish from regular positions

**Save + Share:**
- "Save Lineup" button — saves to database for this event
- "Share" button (optional) — generates a visual lineup card image. If complex, skip for now.

### Restyle:
- Court: dark navy background, crisp white lines, branded position markers
- Player chips: circular, team color border, jersey number prominent
- Bench: horizontal scroll, brand card style for each chip
- Position labels: small text below each court position (Setter, OH, MB, Opp, L1, L2)

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: lineup builder brand pass - court colors, player chips, rotation controls"
git push
```

---

## PHASE 5: COACH AVAILABILITY + GAME RECAP + CC-NEXT-FIVE BRAND PASS

### 5A. Coach Availability

`app/coach-availability.tsx` — Monthly calendar where coaches mark available/unavailable dates.

**Layout:**
- Monthly grid (standard calendar layout)
- Tap a date to toggle: Available (teal) → Unavailable (coral) → Clear (default gray)
- Month navigation: left/right arrows, month/year header
- Summary below calendar: "Available: 18 days · Unavailable: 4 days · Unset: 8 days"
- Auto-saves on every tap

**Restyle:**
- Calendar grid: brand card background, clean lines
- Date cells: large enough to tap (44px minimum)
- Color fills: teal for available, coral for unavailable, brand surface for unset
- Today: bold border ring
- Past dates: slightly dimmed

### 5B. Game Recap (NEW SCREEN)

Create `app/game-recap.tsx` — Post-game summary screen. Parents see this on their home scroll the day after a game.

**This screen is navigated to from:**
- Parent home scroll "Last Game" card
- Coach home scroll game result card
- Game results entry confirmation (after saving results)
- Schedule screen (tapping a completed game event)

**Layout:**

**Hero:**
- Dark background with team color gradient
- Big score display: "BLACK HORNETS 2 — 1 OPPONENT"
- W or L badge: Win = teal + celebrate energy, Loss = respectful, muted
- Date below: "Saturday, Mar 8 at Main Gym"

**Set-by-Set Scores:**
- Horizontal row of set score cards: "25-21 · 23-25 · 25-19"
- Won sets: teal text. Lost sets: coral text.

**Top Performers (if player stats exist):**
- 3 highlight cards side by side:
  - "Most Kills" — player avatar + name + number
  - "Most Digs" — player avatar + name + number
  - "Top Server" — player avatar + name + number (most aces or highest serve %)
- If no player stats: skip this section

**Attendance Summary:**
- "11 of 14 attended" with a compact avatar row

**Coach Notes (if any):**
- Quoted text in a subtle card

**Share Button:**
- Bottom of screen: "Share Recap" → captures or formats a shareable summary

### 5C. CC-NEXT-FIVE Brand Pass (Game Day Command + Player Evaluation)

If `app/game-day-command.tsx` exists (built by CC-NEXT-FIVE Feature 1):
- Verify it uses brand colors and dark theme tokens
- Verify tap targets are ≥ 56px
- Verify score header is sticky
- Minor brand alignment if needed — don't redesign, just verify consistency

If `app/player-evaluation.tsx` exists (built by CC-NEXT-FIVE Feature 3):
- Verify swipe-card UI uses brand colors
- Verify rating circles use brand palette
- Verify summary/spider chart uses brand chart colors
- Minor alignment if needed

If either screen does NOT exist yet: skip. Do not build them.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: coach availability, game recap (new), CC-NEXT-FIVE brand verification"
git push
```

---

## PHASE 6: VERIFY EVERYTHING

```bash
# 1. Type check
npx tsc --noEmit

# 2. Verify game-recap.tsx was created
ls app/game-recap.tsx
# Expected: file exists

# 3. Verify attendance has oversized tap targets
grep -rn "height.*56\|height.*64\|minHeight.*48\|paddingVertical.*16" --include="*.tsx" app/attendance.tsx
# Expected: references to large touch targets

# 4. Verify auto-save pattern in attendance (no submit button)
grep -rn "onPress.*save\|onToggle.*update\|supabase.*update\|supabase.*upsert" --include="*.tsx" app/attendance.tsx
# Expected: save calls inside toggle handlers, not in a separate submit

# 5. Verify game results has 3-step pattern
grep -rn "step\|Step\|currentStep\|setStep" --include="*.tsx" app/game-results.tsx
# Expected: step state management

# 6. Verify mascot images in appropriate places
grep -rn "celebrate\|SleepLynx\|laptoplynx" --include="*.tsx" app/game-results.tsx app/game-recap.tsx app/\(tabs\)/gameday.tsx
# Expected: celebrate for wins, laptoplynx for "coming soon" states

# 7. Files changed
git diff --stat HEAD~5

# 8. Final commit
git add -A
git commit -m "Phase 6: Wave 5 verification and cleanup"
git push
```

---

## EXPECTED RESULTS

1. **Game Day tab** — Next game hero card with countdown, 4 quick action cards below. Clean, focused launchpad.

2. **Game Prep Wizard** — 4-step flow (Lineup → RSVPs → Notes → Ready). Each step is a clean card. Horizontal slide transitions. Confirmation with mascot.

3. **Attendance** — Zero chrome. Running count sticky at top. Oversized row toggles (entire row is tap target). Auto-save on every toggle. Mark All Present. Fastest possible check-in.

4. **Game Results** — 3-step scoreboard workflow. Step 1: set scores with large +/- buttons. Step 2: player stats grid (optional, skippable). Step 3: auto-calculated top performers + notes + confirm.

5. **Lineup Builder** — Branded court visualization. Navy court, white lines, teal position markers. Player chips with jersey numbers. Rotation controls. Libero slot distinct.

6. **Coach Availability** — Monthly calendar grid. Tap to toggle available/unavailable. Teal/coral color coding. Auto-save.

7. **Game Recap (NEW)** — Post-game summary with big score, W/L treatment, set-by-set, top performers, attendance. Shareable. Parents see this the day after a game.

8. **CC-NEXT-FIVE screens verified** — Game Day Command and Player Evaluation confirmed consistent with brand if they exist.

9. **6 commits** — one per phase, each pushed.
