# CC-PLAYER-HOME-DPLUS-REDESIGN.md
# Lynx Mobile — Player Home Scroll: D+ System Redesign
# References: LYNX-EXPERIENCE-MANIFESTO.docx (Section 8)
# Branch: navigation-cleanup-complete

**Priority:** HIGH — Final home scroll redesign. The most important screen for long-term retention.
**Estimated time:** 5-6 hours (7 phases, commit after each)
**Risk level:** MEDIUM — Restructuring existing components, leveraging existing data

---

## WHY THIS EXISTS

The current player home is a dashboard built for an adult who happens to be a kid. It displays information but doesn't invite ACTION. There's nothing to DO right now. No daily quests. No visible competition. No urgency. No "you're 3 aces away from something cool." The dark theme is fine but the content is passive — it shows stats and events without creating the emotional hooks that make kids open the app every day.

The D+ redesign transforms this from an information display into an action center. The emotional arc shifts from "here's your data" to "here's what you should do RIGHT NOW, here's how you compare to your teammates, and here's how far you've come." The layout must make a 10-year-old, a 13-year-old, AND a 17-year-old feel like the hero of their own sports journey.

**This spec uses REAL existing data** from usePlayerHomeData. XP, levels, streaks, badges, stats, shoutouts, challenges, leaderboard rank — all already computed. The future engagement system (Skill Library, Journey Path, quest generation) will plug into this layout later. For now, we build smart "quests" from existing data and create the visual hooks that make kids want more.

---

## PREREQUISITE READING

1. **Read CC-LYNX-RULES.md** — All 15 rules apply.
2. **Read AGENTS.md** — Minimal edits, explain every file touch.
3. **Read theme/player-theme.ts** — The PLAYER_THEME tokens. This is the dark theme for player screens.
4. **Read theme/d-system.ts** — D System tokens.
5. **Read the ENTIRE components/PlayerHomeScroll.tsx** — Every section, import, data flow, celebration modal.
6. **Read every file in components/player-scroll/** — What each component does and what data it uses.
7. **Read hooks/usePlayerHomeData.ts** — ALL available data. This is rich — XP, level, streak, badges, stats, shoutouts, challenges, bestRank, personalBest, next event, photos.
8. **Read COACH-HOME-D-CHANGELOG.md and PARENT-HOME-DPLUS-FIXES-CHANGELOG.md** — Lessons learned.

---

## FILE SCOPE — HARD BOUNDARIES

### FILES YOU MAY MODIFY:
- `components/PlayerHomeScroll.tsx` — Main scroll file. Primary target.
- Files inside `components/player-scroll/` — Sub-components specific to the player scroll.
- `theme/d-system.ts` — ONLY to ADD new player-specific tokens.
- `theme/player-theme.ts` — ONLY to ADD new tokens. Do NOT change existing values (other files depend on them).

### FILES YOU MAY CREATE:
- New files inside `components/player-scroll/` (e.g., PlayerIdentityHero.tsx, PlayerDailyQuests.tsx, PlayerLeaderboardPreview.tsx, PlayerMomentumRow.tsx, PlayerTeamActivity.tsx, PlayerAmbientCloser.tsx, PlayerLynxGreetings.ts, PlayerContinueTraining.tsx)

### FILES YOU MUST NOT MODIFY:
- `components/DashboardRouter.tsx`
- `components/CoachHomeScroll.tsx`, `components/ParentHomeScroll.tsx`, `components/AdminHomeScroll.tsx`
- ALL other role scroll directories (coach-scroll/, parent-scroll/, admin-scroll/)
- `components/TrophyCaseWidget.tsx` — SHARED. Create new PlayerTrophyCase instead.
- `components/TeamPulse.tsx` — SHARED.
- `components/PlayerTradingCard.tsx` — Separate component, do NOT touch.
- `components/PlayerCard.tsx`, `components/PlayerCardExpanded.tsx` — Being reskinned separately.
- `hooks/usePlayerHomeData.ts` — Data hook. Do NOT modify.
- `lib/auth.tsx`, `lib/permissions-context.tsx`, `lib/theme.tsx`
- ANY file in `app/` — No route or layout changes.
- `theme/colors.ts` — Do not modify.

### CRITICAL RULES (ALL LESSONS FROM PREVIOUS REDESIGNS):
1. **NO DOMINOES** — Don't delete files. Don't modify shared components.
2. **ALL HOOKS ABOVE EARLY RETURNS** — No exceptions. This has caused crashes twice.
3. **NO CIRCULAR DEPENDENCIES** — PLAYER_THEME is in theme/player-theme.ts. Import from there, NOT from PlayerHomeScroll.
4. **NO SIDE-BORDER ACCENT CARDS** — Full styled backgrounds only.
5. **HORIZONTAL SCROLL PADDING** — paddingVertical: 8 in contentContainerStyle.
6. **AMBIENT CLOSER VISIBLE** — 0.8 opacity mascot, readable text color.
7. **PRESERVE ALL NAVIGATION** — Same router.push() targets.
8. **PRESERVE ALL DATA FLOW** — usePlayerHomeData unchanged.
9. **PRESERVE LEVEL-UP AND STREAK CELEBRATION MODALS** — These already work. Don't break them.
10. **PLAYER_THEME RE-EXPORT** — PlayerHomeScroll.tsx must continue to `export { PLAYER_THEME }` for backward compat.

---

## DESIGN PHILOSOPHY: ACTION CENTER, NOT DASHBOARD

Every section must answer ONE of these questions:
- **What should I DO right now?** (quests, challenges, training)
- **How do I compare?** (leaderboard, team activity, shoutouts)
- **How far have I come?** (progress, badges, stats, level)
- **What's coming up?** (next event, but framed as anticipation)

If a section doesn't answer one of these, it doesn't belong on the home scroll.

---

## D SYSTEM TOKENS TO ADD

In `theme/d-system.ts`, ADD:
```typescript
// Player D+ specific
questBgActive: 'rgba(75,185,236,0.08)',
questBgDone: 'rgba(34,197,94,0.08)',
questBorderActive: 'rgba(75,185,236,0.15)',
questBorderDone: 'rgba(34,197,94,0.15)',
leaderboardGold: '#FFD700',
leaderboardSilver: '#C0C0C0',
leaderboardBronze: '#CD7F32',
trainingCardStart: '#8B5CF6',
trainingCardEnd: '#6c2bd9',
```

In `theme/player-theme.ts`, ADD (do NOT change existing values):
```typescript
// Player D+ additions
questCard: 'rgba(75,185,236,0.06)',
questDone: 'rgba(34,197,94,0.06)',
streakFire: '#FF6B6B',
xpGold: '#FFD700',
```

---

## PHASE 1: PLAYER IDENTITY HERO + DYNAMIC GREETING

### What changes:
- The current HeroIdentityCard (large centered photo, name, team, OVR score, level bar, View My Card button) is replaced by a compact identity hero with a dynamic Lynx greeting and streak counter.

### 1A. Create PlayerLynxGreetings.ts

Context-aware greetings for the PLAYER — these speak like a hype coach, not a parent:

**Game day:**
- "GAME DAY, {name}! Time to show out 🔥"
- "Let's get this W, {name}! ⚡"

**After a win:**
- "You showed UP last game! Keep that energy 💪"
- "{kills} kills?! That's what I'm talking about 🔥"

**On a streak (attendanceStreak >= 3):**
- "{streak} days strong, {name}! Don't stop 🔥"
- "That's a {streak}-day streak! Legend behavior 💪"

**After earning a badge:**
- "New badge unlocked! {badgeName} 🏅"

**Has active challenge:**
- "Ace Hunter is waiting, {name}. {remaining} to go 🎯"

**Default morning/afternoon/evening:**
- "Rise and grind, {name}! ☀️"
- "What's good, {name}! Let's put in work 💪"
- "Evening, {name}! Check your progress 🐱"

### 1B. Build PlayerIdentityHero component

Create `components/player-scroll/PlayerIdentityHero.tsx`

**Layout:** Dark navy card (PLAYER_THEME.bg gradient), borderRadius 22:
- Top-left: Dynamic greeting text (18-20px, weight 800, white). This is the MAIN text — not the player's name.
- Top-right: Streak counter flame badge ("🔥 4" in a compact pill, coral background)
- Middle row: Player photo (56px circle, team-color border) + Name + Team · Position · #Number (12px, white at 40%)
- Level row: Level badge (gold circle, 28px) + "Level 10 · Silver" text + XP bar (gold fill) + "875 / 1,000 XP"
- Mascot: positioned in the right side, 70px, breathing animation. NOT blocking content.

**Data:** All from usePlayerHomeData — firstName, photoUrl, primaryTeam, position, jerseyNumber, xp, level, xpProgress, xpToNext, attendanceStreak, lastGame, badges, challengesAvailable.

**Key difference from other roles:** The greeting is the HERO, not the player's name. The name is secondary context. The greeting creates emotion. "GAME DAY, Ava!" hits harder than "Welcome back, Ava."

### 1C. Update PlayerHomeScroll render

- Remove old HeroIdentityCard from render
- Remove the "Ava Test ▼" child switcher pill (move to compact header if needed)
- Add PlayerIdentityHero at the top
- Keep the PLAYER_THEME re-export
- Do NOT delete HeroIdentityCard.tsx

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Player D+ Phase 1 — identity hero with dynamic greeting and streak counter" && git push
```

---

## PHASE 2: DAILY QUESTS (FROM EXISTING DATA)

### What changes:
- Add a Daily Quests section — the single biggest engagement driver. Built from EXISTING data, not a new quest engine.

### 2A. Build PlayerDailyQuests component

Create `components/player-scroll/PlayerDailyQuests.tsx`

**Layout:** Section header "TODAY'S QUESTS" + completion count ("1/3 done")
Three quest cards, each:
- Tinted background card (completed = green tint, active = sky tint), borderRadius 14
- Left: checkbox circle (completed = green ✓, active = empty ring)
- Center: quest text (12px, weight 600) + optional progress bar
- Right: XP reward text ("+10 XP", amber, weight 800)

**Quests generated from existing data (no new backend needed):**

Quest 1: "Open Lynx today" — auto-completed on render. +5 XP. Always present.

Quest 2 (pick first that applies):
- If nextEvent exists today: "Show up to {eventType} today" → completed when RSVP is 'yes' or 'confirmed'. +20 XP.
- If challengesAvailable: "Work on your active challenge" → links to challenge detail. +15 XP.
- Fallback: "Check your stats" → links to stats screen. +10 XP.

Quest 3 (pick first that applies):
- If recentShoutouts is empty: "Give a teammate props" → opens shoutout modal. +10 XP.
- If badges earned recently: "View your new badge" → links to trophy case. +5 XP.
- Fallback: "Check the leaderboard" → links to leaderboard. +10 XP.

These are DISPLAY ONLY for now — they don't actually award XP (the XP engine doesn't support quest completion yet). But they look real and create the "do something" impulse. The future engagement system will wire real quest completion + XP awards.

Mark "Open Lynx today" as completed immediately. Others show as active with their XP reward visible.

**Daily bonus bar:** Below the quests: "Complete all 3 for +25 XP bonus" in a compact bar.

### 2B. Update render

- Add PlayerDailyQuests below the hero
- Place it ABOVE everything else — this is the "what to do right now" section

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Player D+ Phase 2 — daily quests from existing data" && git push
```

---

## PHASE 3: LEADERBOARD PREVIEW + SHOUTOUTS

### What changes:
- Add a leaderboard preview showing the player's rank and nearby competitors.
- Add a shoutouts received section for social proof.

### 3A. Build PlayerLeaderboardPreview component

Create `components/player-scroll/PlayerLeaderboardPreview.tsx`

**Layout:** Dark card (PLAYER_THEME.cardBg), borderRadius 18:
- Header: "🏆 TEAM RANKINGS" + "See Full →"
- 3 rows showing top 3 (or player's position and neighbors):
  - Rank number (gold/silver/bronze for 1/2/3)
  - Player avatar circle (32px, team color with initial or photo)
  - Player name (13px, weight 700, white). Current player highlighted in sky blue with "You" label.
  - XP amount on right (12px, gold, weight 800)
- If data.bestRank exists, use it. If not, show a placeholder: "Play games to get ranked!" with a link to the leaderboard.

Tappable → navigates to full leaderboard screen.

### 3B. Upgrade shoutout section

Restyle the existing shoutout display (from recentShoutouts data):
- Section header: "PROPS FROM THE TEAM" (not "shoutouts" — kids say "props")
- Each shoutout: avatar circle + "{Name} gave you {ShoutoutType}" + timestamp
- If no shoutouts: "No props yet. Be the first to give some! →" with link to shoutout modal
- Max 3 visible, "See All →" for more

### 3C. Update render

- Add PlayerLeaderboardPreview after daily quests
- Add shoutouts section after leaderboard
- Remove old QuickPropsRow from render (replaced by this section)
- Do NOT delete QuickPropsRow.tsx

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Player D+ Phase 3 — leaderboard preview + props from the team" && git push
```

---

## PHASE 4: CONTINUE TRAINING + NEXT EVENT

### What changes:
- Add a "Continue Training" card that teases the future Journey Path.
- Upgrade the next event card with +XP on RSVP.

### 4A. Build PlayerContinueTraining component

Create `components/player-scroll/PlayerContinueTraining.tsx`

**Layout:** Purple gradient card (trainingCardStart → trainingCardEnd), borderRadius 18, padding 16:
- Icon: 🗺️ or training-related emoji (24px) in a white-tinted circle
- Title: "Continue Training" (Outfit/ExtraBold 15px, white)
- Subtitle: "Skill drills, tips & challenges — coming soon" (12px, white at 50%)
- Arrow → on right
- Tappable → for now, show a toast/alert: "Training modules coming soon! 🐱"

This card is the HOOK for the future Journey Path. It exists in the scroll so when the engagement system is built, we just wire it to the real destination. For now it's a teaser.

**Micro-animation:** Subtle shimmer sweep across the card every 5 seconds to draw the eye. This is the card we WANT kids to notice.

### 4B. Restyle NextUpCard

The current NextUpCard works but needs the +XP treatment:
- Keep the dark card style
- Add "+20 XP" chip on the RSVP / "I'M READY" button (same treatment as parent event hero)
- If no event: show "No events coming up. Enjoy the break! 🐱" (not just empty space)

### 4C. Update render

- Add PlayerContinueTraining after shoutouts
- Keep NextUpCard but restyled (modify in place)
- Remove old TheDrop section (contextual items now live in quests and hero greeting)
- Do NOT delete TheDrop.tsx

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Player D+ Phase 4 — continue training card + event with +XP" && git push
```

---

## PHASE 5: MOMENTUM + STATS + TROPHY CASE

### What changes:
- Add horizontal momentum cards (matching other roles).
- Keep Last Game Stats but upgrade styling.
- Replace TrophyCaseWidget with a player-specific Fortnite-style trophy case.

### 5A. Build PlayerMomentumRow

Create `components/player-scroll/PlayerMomentumRow.tsx`

Horizontal scroll gradient cards (same pattern as coach/parent):
- Kills card (coral): total_kills from seasonStats
- Streak card (amber): attendanceStreak
- Level card (purple): level
- Games card (green): games_played

Only show cards that have data > 0. Each tappable → navigate to relevant detail.

### 5B. Restyle LastGameStats

The existing component has good data (22 assists, 8 kills, 7 aces, 0 digs). Restyle to D System:
- Dark card background matching PLAYER_THEME
- Stats in a horizontal row, each with big number (Outfit 24px, weight 800), label below (9px uppercase)
- Stat colors: kills = coral, assists = sky, aces = green, digs = amber
- If no last game: don't render (already handled)

### 5C. Build PlayerTrophyCase

Create `components/player-scroll/PlayerTrophyCase.tsx`

Fortnite-style (same as CoachTrophyCase pattern):
- Dark card, 4x2 badge grid, rarity dots (epic/rare/common)
- Earned badges glow, locked badges dim
- Level badge circle + XP bar below
- If no badges: "No badges earned yet. Keep going! 🏅" with visible locked badge placeholders showing what's POSSIBLE to earn — this creates aspiration.

### 5D. Update render

- Add PlayerMomentumRow after the event card
- Keep LastGameStats but restyled
- Replace old TrophyCaseWidget usage with PlayerTrophyCase
- Remove old StreakBanner (streak is now in the hero)
- Remove ChatPeek (chat is accessible from tab bar)
- Remove PhotoStrip (photos can live in team hub or gallery)
- Remove EvaluationCard (accessible from more/drawer)
- Do NOT delete any component files

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Player D+ Phase 5 — momentum cards, restyled stats, Fortnite trophy case" && git push
```

---

## PHASE 6: TEAM ACTIVITY + AMBIENT CLOSER + FINAL ORDER

### What changes:
- Add team activity feed.
- Build ambient closer.
- Set final scroll order.
- Add micro-animations throughout.

### 6A. Build PlayerTeamActivity

Create `components/player-scroll/PlayerTeamActivity.tsx`

**Layout:** Section header "TEAM ACTIVITY" + "See All"
- Feed items from recentShoutouts, recent badge earns, game results
- Each item: avatar + text + timestamp
- "Chloe earned Ace Hunter 🏅" / "Team won vs Moo Moo 🏆" / "Coach posted in Team Chat 💬"
- Max 3 items, link to full team feed

### 6B. Build PlayerAmbientCloser

Create `components/player-scroll/PlayerAmbientCloser.tsx`

- Mascot (SleepLynx or HiLynx): 40px, 0.8 opacity
- Dynamic message referencing real data:
  - If close to leveling: "{xpToNext} XP to Level {level+1}. Keep grinding."
  - If on a streak: "{streak}-day streak. Don't let it end."
  - If earned badges recently: "{badgeCount} badges and counting. What's next?"
  - Default: "Every rep counts. See you tomorrow. 🐱"
- Gentle sway animation on mascot

### 6C. Final scroll order

**FINAL SCROLL ORDER:**
1. PlayerIdentityHero (greeting, identity, streak, level/XP)
2. PlayerDailyQuests (3 quests with XP rewards)
3. PlayerLeaderboardPreview (team ranking, competition)
4. Shoutouts / Props from the Team (social proof)
5. PlayerContinueTraining (Journey Path teaser)
6. NextUpCard (next event with +XP on RSVP)
7. PlayerMomentumRow (horizontal gradient cards)
8. LastGameStats (restyled)
9. PlayerTrophyCase (Fortnite-style)
10. PlayerTeamActivity (team feed)
11. PlayerAmbientCloser

**Remove from render (do NOT delete files):**
- HeroIdentityCard (replaced by PlayerIdentityHero)
- StreakBanner (streak in hero)
- TheDrop (content in quests and greeting)
- PhotoStrip (lives in team hub/gallery)
- ChatPeek (tab bar)
- QuickPropsRow (replaced by shoutouts section)
- EvaluationCard (drawer/more)
- Old TrophyCaseWidget usage
- ClosingMascot (replaced by PlayerAmbientCloser)

### 6D. Micro-animations (bold)

- Hero mascot: breathing (scale 1.0 ↔ 1.03, 4s loop)
- Streak fire pill: gentle pulse (scale 1.0 ↔ 1.1, 2s loop)
- Quest checkboxes: spring pop when marked done
- Leaderboard rows: stagger slide in (50ms apart)
- Continue Training card: shimmer sweep every 5s
- Momentum cards: stagger entrance + count-up numbers
- Trophy badges: pop-in spring (50ms stagger)
- XP bar: fill animation (0 to actual, 800ms)
- Ambient closer mascot: sway rotation (-2deg ↔ 2deg, 4s loop)
- ALL use react-native-reanimated, ALL loop animations have cancelAnimation cleanup

### 6E. Page background and theme

- Keep the dark PLAYER_THEME as default (kids love dark mode)
- Ensure ALL colors come from PLAYER_THEME or D_COLORS tokens — no hardcoded hex
- Root background: PLAYER_THEME.bg

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Player D+ Phase 6 — team activity, ambient closer, final scroll order, animations" && git push
```

---

## PHASE 7: CHANGELOG

Generate `PLAYER-HOME-DPLUS-CHANGELOG.md`:

1. FILES CREATED
2. FILES MODIFIED
3. FILES REMOVED FROM RENDER (not deleted)
4. IMPORTS CHANGED
5. NAVIGATION PRESERVED
6. DATA HOOKS PRESERVED
7. TOKENS ADDED
8. HOOKS PLACEMENT — all above early returns
9. SHARED COMPONENTS — TrophyCaseWidget, TeamPulse NOT modified
10. PLAYER_THEME RE-EXPORT — confirmed still works
11. CELEBRATION MODALS — level-up and streak milestones still work
12. DAILY QUESTS — documented as display-only, future engagement system will wire real XP
13. CONTINUE TRAINING — documented as teaser, future Journey Path will replace
14. ANIMATIONS ADDED
15. KNOWN ISSUES
16. SCREENSHOTS NEEDED

```bash
git add -A && git commit -m "docs: Player Home D+ changelog — all phases complete" && git push
```

---

## EXPECTED RESULTS

1. **Dynamic greeting hero** — "GAME DAY, Ava!" not "Welcome back" — hype coach energy
2. **Streak counter** — fire pill visible in hero, creates loss aversion
3. **Daily quests** — 3 quests with XP rewards, built from existing data. "Open Lynx" auto-completed.
4. **Leaderboard preview** — team rankings with player highlighted, competition visible
5. **Props from the team** — shoutouts as social proof
6. **Continue Training teaser** — purple card for future Journey Path
7. **Next event with +XP** — RSVP earns visible XP
8. **Momentum cards** — kills, streak, level, games in gradient cards
9. **Last game stats** — restyled, D System dark
10. **Fortnite trophy case** — badge grid with rarity, locked badges show what's possible
11. **Team activity feed** — teammates' recent activity
12. **Ambient closer** — mascot + real data message
13. **FEELS LIKE A GAME** — not a report card
14. **Works on dark theme** — all PLAYER_THEME tokens
15. **7 commits** — one per phase
16. **All celebrations preserved** — level-up and streak modals still fire
