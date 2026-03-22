# CC-ADMIN-HOME-DPLUS-REDESIGN.md
# Lynx Mobile — Admin Home Scroll: D+ System Redesign
# References: LYNX-EXPERIENCE-MANIFESTO.docx (Section 7)
# Branch: navigation-cleanup-complete

**Priority:** HIGH — Third of four home scroll redesigns
**Estimated time:** 4-6 hours (7 phases, commit after each)
**Risk level:** MEDIUM — Restructuring existing components, not adding new data

---

## WHY THIS EXISTS

The current admin home scroll is functional but lacks the emotional arc and visual hierarchy of the D System. The welcome briefing is text-heavy. The Smart Queue cards are useful but visually flat. Team Health Tiles are basic. The Payment Snapshot exists but doesn't feel like a command center. Quick Actions are a static grid. There's no financial chart, no search bar with real presence, no org-wide stats baked into the hero, and no sense of "I'm running this entire operation."

The D+ redesign transforms this into a Mission Control experience. The admin sees the entire org at a glance — every team, every dollar, every coach, every player — and can drill down frictionlessly into any sport, season, or team. The season is a FILTER, not a gate.

**This spec restructures LAYOUT and VISUAL HIERARCHY only.** Data hooks, navigation wiring, and Supabase queries stay exactly as they are.

---

## PREREQUISITE READING (DO ALL OF THESE FIRST)

1. **Read CC-LYNX-RULES.md** — All 15 rules apply.
2. **Read AGENTS.md** — Codex guardrails apply.
3. **Read LYNX-REFERENCE-GUIDE.md** — Mascot assets, brand references.
4. **Read theme/colors.ts, theme/spacing.ts, theme/fonts.ts, theme/d-system.ts** — Existing tokens. USE THESE.
5. **Read the ENTIRE components/AdminHomeScroll.tsx** — Every section, import, data flow, conditional render.
6. **Read every file in components/admin-scroll/** — What each component does, what data it consumes.
7. **Read hooks/useAdminHomeData.ts** — Available data. Do NOT modify.
8. **Read COACH-HOME-D-CHANGELOG.md and PARENT-HOME-DPLUS-FIXES-CHANGELOG.md** — Learn from previous redesigns.

---

## FILE SCOPE — HARD BOUNDARIES

### FILES YOU MAY MODIFY:
- `components/AdminHomeScroll.tsx` — The main scroll file. Primary target.
- Files inside `components/admin-scroll/` — Sub-components specific to the admin scroll.
- `theme/d-system.ts` — ONLY to ADD new admin-specific tokens.

### FILES YOU MAY CREATE:
- New files inside `components/admin-scroll/` (e.g., MissionControlHero.tsx, AdminAttentionStrip.tsx, AdminFinancialChart.tsx, AdminTeamHealthCards.tsx, AdminActionPills.tsx, OrgPulseFeed.tsx, AdminTrophyBar.tsx, AdminAmbientCloser.tsx, AdminLynxGreetings.ts)

### FILES YOU MUST NOT MODIFY:
- `components/DashboardRouter.tsx` — Only imports AdminHomeScroll.
- `components/CoachHomeScroll.tsx` — Different role.
- `components/ParentHomeScroll.tsx` — Different role.
- `components/PlayerHomeScroll.tsx` — Different role.
- `components/TrophyCaseWidget.tsx` — SHARED. Create new AdminTrophyBar instead.
- `components/TeamPulse.tsx` — SHARED.
- `components/parent-scroll/DayStripCalendar.tsx` — SHARED. If removed from admin render, leave file untouched.
- `hooks/useAdminHomeData.ts` — Data hook. Do NOT modify.
- `lib/auth.tsx`, `lib/permissions-context.tsx`, `lib/theme.tsx` — Do not touch.
- ANY file in `app/` — No route or layout changes.
- ANY file in `components/coach-scroll/`, `components/parent-scroll/`, `components/player-scroll/`.
- `theme/colors.ts`, `theme/player-theme.ts` — Do not modify.

### CRITICAL RULES (LESSONS FROM COACH + PARENT):
1. **NO DOMINOES** — Don't delete files. Don't modify shared components.
2. **ALL HOOKS ABOVE EARLY RETURNS** — No exceptions. This caused crashes in coach.
3. **NO CIRCULAR DEPENDENCIES** — Don't import from AdminHomeScroll in child components.
4. **NO SIDE-BORDER ACCENT CARDS** — No colored left-border stripes. Cards should BE the color.
5. **HORIZONTAL SCROLL PADDING** — All horizontal scrolls need paddingVertical: 8 in contentContainerStyle to prevent card shadow clipping.
6. **PRESERVE ALL NAVIGATION** — Copy router.push() targets from old components.
7. **PRESERVE ALL DATA FLOW** — useAdminHomeData stays untouched.
8. **DYNAMIC GREETINGS** — Use the same Lynx-tone personality greeting approach as parent, adapted for admin context.

---

## D SYSTEM TOKENS TO ADD

In `theme/d-system.ts`, ADD these admin-specific tokens:

```typescript
// Admin D+ specific tokens
missionHeroBgStart: '#0B1628',
missionHeroBgEnd: '#162d50',
statsGridBg: 'rgba(255,255,255,0.06)',
statsGridBorder: 'rgba(255,255,255,0.08)',
financialChartLine: '#22C55E',
financialChartFill: 'rgba(34,197,94,0.15)',
financialChartDot: '#22C55E',
teamHealthDark: '#0B1628',
teamHealthLight: '#FFFFFF',
overdueRed: '#FF6B6B',
collectedGreen: '#22C55E',
pendingBlue: '#4BB9EC',
actionPillActive: '#0B1628',
actionPillInactive: 'rgba(11,22,40,0.06)',
```

---

## PHASE 1: MISSION CONTROL HERO + DYNAMIC GREETING

### What changes:
- The current WelcomeBriefing (text-heavy greeting + counts) is replaced by a dark navy Mission Control hero card with org stats baked in and a Lynx personality greeting.

### 1A. Create AdminLynxGreetings.ts

Same waterfall pattern as parent but tailored for admin context:

**Overdue items exist (overdueCount > 0):**
- "You've got {count} items to knock out, {name}. Let's go 💪"
- "{count} things waiting on you, {name}. Let's clear the deck 🔥"

**All clear (queueItems.length === 0):**
- "All clear, {name}! Your org is humming ✅"
- "Nothing pending, {name}. Sit back and watch it run 😎"

**Game day for any team:**
- "Game day across the org, {name}! Let's get it ⚡"

**Payment collection strong (paymentPct > 80):**
- "{paymentPct}% collected, {name}. Money's flowing 💰"

**Morning/Afternoon/Evening fallbacks with personality:**
- "Morning, {name}! Here's your org at a glance 🐱"
- "Hey {name}! Let's check on the operation 👀"
- "Evening report, {name}. Here's where things stand 🌙"

### 1B. Build MissionControlHero component

Create `components/admin-scroll/MissionControlHero.tsx`

**Layout:** Dark navy rounded card (borderRadius 22, gradient #0B1628 → #162d50):
- Top row: Dynamic greeting (Outfit/ExtraBold 20px, white) on left, mascot (80px, breathing animation) on right
- Org name below greeting: "Black Hornets Athletics" in 13px, white at 40%
- **3x2 Stats Grid** baked into the hero card:
  - Row 1: Teams (count, white), Players (count, white), Coaches (count, white)
  - Row 2: Overdue (count, coral #FF6B6B), Collected (amount, green #22C55E), Pending (count, sky #4BB9EC)
  - Each cell: number in Outfit 18px weight 800, label in 8px uppercase white at 30%
  - Grid cells have subtle borders (rgba white 6%) between them
  - This gives the admin their entire org in ONE glance

**Data:** orgName from useAuth, teamCount/playerCount/coachCount from useAdminHomeData, overdueCount, collected, pendingRegs.

**Animation:** Mascot breathing (same pattern as parent). All hooks above early returns.

### 1C. Update AdminHomeScroll render

- Remove old WelcomeBriefing from render
- Remove the in-scroll Season + Role selector row (keep them in the compact header)
- Add MissionControlHero at the top of the scroll content
- Do NOT delete WelcomeBriefing.tsx

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Admin D+ Phase 1 — Mission Control hero with org stats grid + dynamic greeting" && git push
```

---

## PHASE 2: EXPANDABLE ATTENTION STRIP + SEARCH BAR

### What changes:
- The current Smart Queue cards (flat list) become an expandable attention strip (matching coach/parent pattern).
- The search bar gets proper visual presence.

### 2A. Build AdminAttentionStrip component

Create `components/admin-scroll/AdminAttentionStrip.tsx`

**Layout:** Full tinted card (NOT side-border):
- Background: rgba(255,107,107,0.06) with 1px border rgba(255,107,107,0.12)
- BorderRadius 14
- Collapsed: count number (Outfit 24px, weight 800, coral) + "items need action" + first item summary + chevron ▼
- Tappable: toggles expanded
- Expanded: list of queue items with urgency dots (overdue = red, blocking = amber, thisWeek = blue, upcoming = gray)
- Each item tappable → navigates to item.actionRoute

**Data:** Use data.queueItems from useAdminHomeData. Map urgency to dot colors.

When queue is empty: show "All clear!" state — green checkmark + "Nothing needs your attention" (keep existing all-clear styling).

### 2B. Restyle search bar

The search bar stays functionally the same but gets more visual presence:
- Height: 48px (up from 44)
- Background: white with 1px border rgba(0,0,0,0.06)
- Subtle shadow (elevation 1)
- Search icon + placeholder text stays
- Tappable → still navigates to players screen

### 2C. Update render

- Remove SmartQueueCard loop and viewMore from render
- Remove allClearWrap from render
- Add AdminAttentionStrip in place of the queue section
- Restyle the search bar inline (no new component needed — just update styles)
- Do NOT delete SmartQueueCard.tsx

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Admin D+ Phase 2 — expandable attention strip + search bar upgrade" && git push
```

---

## PHASE 3: FINANCIAL CHART

### What changes:
- The current PaymentSnapshot (text-based progress bar) is replaced by a visual financial chart with SVG-style area graph.

### 3A. Build AdminFinancialChart component

Create `components/admin-scroll/AdminFinancialChart.tsx`

**Layout:** White card with borderRadius 18, padding 20:
- Header: "FINANCES" section title + season name on right
- **Progress bar** showing collection percentage: full width, 8px height, green fill
- **Percentage text**: "{paymentPct}% collected" in bold
- **Category breakdown** below the bar:
  - Three rows, each with a colored dot + category name + amount
  - Collected: green dot, "${collected}" amount
  - Outstanding: coral dot, "${expected - collected}" amount  
  - Overdue: red dot, "${overdueAmount}" amount, with "({overdueCount} families)" label
- **Action button**: "Send Reminders" button (sky blue, borderRadius 12) if overdueCount > 0

This replaces the SVG area chart from the manifesto mockup with a simpler but equally informative progress-based visualization that works reliably in React Native without SVG dependencies.

**Data:** collected, expected, overdueAmount, overdueCount, paymentPct from useAdminHomeData.

Only render if expected > 0 (same condition as current showPaymentCard).

### 3B. Update render

- Remove PaymentSnapshot from render
- Add AdminFinancialChart in its place
- Do NOT delete PaymentSnapshot.tsx

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Admin D+ Phase 3 — financial chart with collection progress and category breakdown" && git push
```

---

## PHASE 4: EDITORIAL TEAM HEALTH CARDS

### What changes:
- The current TeamHealthTiles (horizontal scroll of small tiles) is replaced by editorial-style team health cards that alternate dark/light.

### 4A. Build AdminTeamHealthCards component

Create `components/admin-scroll/AdminTeamHealthCards.tsx`

**Layout:** Vertical stack of team cards, alternating dark navy and white:

**Dark card (first team, then every other):**
- Background: gradient #0B1628 → #162d50, borderRadius 18, padding 18
- Team name in Outfit 16px weight 800, white
- Stats row: Roster fill ("8/12"), Record, Attendance %, Unpaid count
- Each stat: number in 14px weight 700 white, label in 9px uppercase white at 30%
- Status dot in top-right corner (green = healthy, amber = needs attention, red = issues)

**Light card (alternating):**
- Background: white, 1px border rgba(0,0,0,0.04), borderRadius 18, padding 18
- Same content structure but with dark text colors

**Each card tappable** → navigate to team detail (same destination as current TeamHealthTiles tap)

**Data:** data.teams from useAdminHomeData. Map each team's paymentStatus to status dot color.

### 4B. Remove DayStripCalendar from admin render

The calendar strip on the admin home adds clutter. Events are accessible via Schedule tab. Remove it from the render but do NOT delete or modify the DayStripCalendar.tsx file (it's shared with parent, though parent also removed it).

### 4C. Update render

- Remove TeamHealthTiles section and its wrapping View + section header
- Remove DayStripCalendar from render
- Remove the upcoming season prompt card (data.upcomingSeason) — this info belongs in the attention strip items
- Add AdminTeamHealthCards after the financial chart
- Section header: "YOUR TEAMS" in Outfit 13px weight 800 uppercase + team count on right
- Do NOT delete TeamHealthTiles.tsx

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Admin D+ Phase 4 — editorial team health cards (alternating dark/light) + remove calendar strip" && git push
```

---

## PHASE 5: ACTION PILLS + ORG PULSE FEED

### What changes:
- The current QuickActionsGrid (2x3 or similar grid) is replaced by horizontal scroll action pills.
- Add an Org Pulse activity feed.

### 5A. Build AdminActionPills component

Create `components/admin-scroll/AdminActionPills.tsx`

**Layout:** Horizontal scroll row of pill buttons:
- First pill (primary): dark navy filled background, white text — "Create Event"
- Remaining pills (secondary): light tinted background rgba(11,22,40,0.06), dark text — "Send Blast", "Add Player", "Manage Payments", "Reports"
- Each pill: borderRadius 20, paddingHorizontal 18, paddingVertical 10, font 12px weight 700
- Horizontal scroll with snapToInterval for clean feel
- contentContainerStyle paddingVertical: 8 (prevent clipping)

**Each pill tappable** → navigate to relevant screen. Use same destinations as current QuickActionsGrid buttons.

### 5B. Build OrgPulseFeed component

Create `components/admin-scroll/OrgPulseFeed.tsx`

**Layout:** Activity feed matching coach/parent Pulse pattern:
- Section header: "ORG PULSE" + "See All"
- Each item: icon circle (34px, borderRadius 10, tinted bg) + text (12.5px) + timestamp + optional amount
- Items separated by 1px bottom borders
- No card wrapper — flat on page background

**Item types from available data:**
- Payments received: "💰 Payment received · $75" with green amount
- Registrations: "📋 New registration submitted"
- Game results: "🏆 [Team] won vs [Opponent]"
- Coach activity: "📣 [Coach] posted in [Team]"

**Data:** Build items from data.upcomingEvents (recent completions), data.collected (payment activity), data.pendingRegs. Show 3-5 most recent items.

### 5C. Update render

- Remove QuickActionsGrid from render
- Remove CoachSection from render (coach info is accessible via team health cards drill-down)
- Add AdminActionPills after team health cards
- Add OrgPulseFeed after action pills
- Do NOT delete QuickActionsGrid.tsx or CoachSection.tsx

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Admin D+ Phase 5 — horizontal action pills + Org Pulse feed" && git push
```

---

## PHASE 6: TROPHY BAR + AMBIENT CLOSER + FINAL ORDER

### What changes:
- Replace TrophyCaseWidget with compact AdminTrophyBar
- Replace ClosingMotivation with AdminAmbientCloser
- Remove UpcomingEvents (lives in Schedule tab)
- Set final scroll order

### 6A. Build AdminTrophyBar

Create `components/admin-scroll/AdminTrophyBar.tsx`

Compact dark navy bar (same pattern as ParentTrophyBar):
- Badge icons in horizontal row (earned = gold tint, locked = dim)
- Level + XP bar on right
- Tappable → navigate to achievements

### 6B. Build AdminAmbientCloser

Create `components/admin-scroll/AdminAmbientCloser.tsx`

- Mascot image (40px, 0.8 opacity) centered
- Contextual italic message (13px, rgba(11,22,40,0.35), weight 500, centered)
- Padding: 12px top, 16px bottom
- Gentle sway animation (rotate -2deg ↔ 2deg, 4-second loop)

Content logic:
- If teams are all healthy: "{teamCount} teams. {playerCount} players. You've got this, {name}."
- If items in queue: "{queueCount} items in your queue. Let's clear them out."
- Default: "Your org is in good hands, {name}."

### 6C. Final scroll order

**Remove from render (do NOT delete files):**
- WelcomeBriefing (replaced by MissionControlHero)
- In-scroll Season/Role selector row (keep in compact header only)
- DayStripCalendar (lives in Schedule tab)
- SmartQueueCard loop (replaced by AdminAttentionStrip)
- TeamHealthTiles (replaced by AdminTeamHealthCards)
- Upcoming season prompt (data moved to attention strip)
- PaymentSnapshot (replaced by AdminFinancialChart)
- QuickActionsGrid (replaced by AdminActionPills)
- CoachSection (accessible via team drill-down)
- UpcomingEvents (lives in Schedule tab)
- Old TrophyCaseWidget usage (replaced by AdminTrophyBar)
- ClosingMotivation (replaced by AdminAmbientCloser)

**FINAL SCROLL ORDER:**
1. MissionControlHero (dark navy, org stats grid, greeting, mascot)
2. Search bar (elevated, tappable)
3. AdminAttentionStrip (conditional — only if queue items exist)
4. AdminFinancialChart (conditional — only if expected > 0)
5. AdminTeamHealthCards (alternating dark/light)
6. AdminActionPills (horizontal scroll)
7. OrgPulseFeed
8. AdminTrophyBar
9. AdminAmbientCloser

### 6D. Page background
Set root background to D_COLORS.pageBg (#FAFBFE).

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Admin D+ Phase 6 — trophy bar, ambient closer, final scroll order" && git push
```

---

## PHASE 7: CHANGELOG

Generate `ADMIN-HOME-DPLUS-CHANGELOG.md` in the repo root:

1. FILES CREATED — list every new file with purpose
2. FILES MODIFIED — list every file changed with what changed
3. FILES REMOVED FROM RENDER — components removed from JSX but files NOT deleted
4. IMPORTS CHANGED — every import added/removed/changed in AdminHomeScroll.tsx
5. NAVIGATION PRESERVED — confirm all router.push destinations identical
6. DATA HOOKS PRESERVED — confirm useAdminHomeData unchanged
7. TOKENS ADDED — new tokens in d-system.ts
8. HOOKS PLACEMENT — confirm ALL hooks above ALL early returns
9. SHARED COMPONENTS — confirm TrophyCaseWidget, TeamPulse, DayStripCalendar NOT modified
10. CARD STYLING — confirm NO side-border accent cards (full tinted backgrounds only)
11. HORIZONTAL SCROLLS — confirm paddingVertical on all contentContainerStyles
12. KNOWN ISSUES — anything that needs attention
13. SCREENSHOTS NEEDED — states to test

```bash
git add -A && git commit -m "docs: Admin Home D+ changelog — all phases complete" && git push
```

---

## EXPECTED RESULTS

1. **Mission Control hero** — dark navy with org name, stats grid (teams/players/coaches + overdue/collected/pending), dynamic Lynx greeting, breathing mascot
2. **Elevated search bar** — prominent, tappable, navigates to player search
3. **Expandable attention strip** — full tinted card (no side-border), urgency dots, tappable items
4. **Financial chart** — collection progress bar, category breakdown, Send Reminders button
5. **Editorial team health cards** — alternating dark/light, status dots, roster/record/attendance/unpaid
6. **Horizontal action pills** — "Create Event" primary, rest secondary, all tappable
7. **Org Pulse feed** — recent org activity with icons, text, timestamps
8. **Compact trophy bar** — dark, inline badges + XP
9. **Ambient closer** — mascot + contextual message about the org
10. **Org-wide by default** — everything shows the whole org, season is a filter not a gate
11. **Zero new data dependencies** — all from useAdminHomeData
12. **Zero navigation changes** — all tap targets same destinations
13. **7 commits** — one per phase
14. **No shared components modified**
15. **No side-border accent cards**
16. **All hooks above early returns**
