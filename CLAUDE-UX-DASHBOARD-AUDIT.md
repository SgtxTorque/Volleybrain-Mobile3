# CLAUDE-UX-DASHBOARD-AUDIT.md
## Lynx Mobile — Dashboard Philosophy & Cognitive Load Analysis
### Audit Date: 2026-03-11

---

## Dashboard Routing Architecture

**File:** `components/DashboardRouter.tsx`

The app routes users to role-specific dashboards via `determineDashboard()` (line 124). The decision tree:

```
isAdmin?           → AdminHomeScroll
isCoach + hasTeams → CoachHomeScroll
isCoach + isParent → CoachParentHomeScroll [MISSING — falls back to CoachHomeScroll]
isParent + hasKids → ParentHomeScroll
isPlayer           → PlayerChildPicker → PlayerHomeScroll
```

**Critical Finding:** `CoachParentHomeScroll` is referenced (line 257) but **does not exist** in the codebase. Parents who are also coaches lose family-oriented actions (RSVP, payments, family gallery) because they see the coach dashboard instead.

---

## Dashboard-by-Dashboard Analysis

### 1. Admin Dashboard

**File:** `components/AdminHomeScroll.tsx` (lines 55–546)

**Philosophy:** "Smart Queue" — see urgent items, act on them, watch the counter drop.

**Section Inventory (13 sections):**

| # | Section | Lines | Purpose | Interactivity |
|---|---------|-------|---------|---------------|
| 1 | Compact Header | 114–139 | Sticky, fades in on scroll | Scroll trigger |
| 2 | Welcome Briefing | 183–191 | Admin name, team count, player count, queue alerts | Read-only |
| 3 | Search Bar | 194–201 | Players/families/teams | Text input |
| 4 | Day Strip Calendar | 203–204 | Visual event dates | Horizontal scroll |
| 5 | Smart Queue | 207–229 | Pending items, max 4 visible | Tap to action, "View more" → `/registration-hub` |
| 6 | Team Health Tiles | 231–243 | Seasonal status pills per team | Tap → team detail |
| 7 | Upcoming Season Card | 246–268 | If next season exists | Tap → season settings |
| 8 | Payment Snapshot | 270–281 | Collected / expected / overdue | Tap → payments |
| 9 | Quick Actions Grid | 283–284 | Action shortcut buttons | Grid of tappable buttons |
| 10 | Coach Section | 286–289 | List of coaches | Tap → coach profile |
| 11 | Trophy Case | 291–296 | Admin's personal achievements | Tap → achievements |
| 12 | Upcoming Events | 298–299 | Team events feed | Tap → event detail |
| 13 | Closing Motivation | 301–307 | Contextual farewell | Read-only |

**Signal-to-Noise Assessment:**
- **Tier 1 (Urgent):** Smart Queue front-loaded with urgency badge on header (line 127–129)
- **Tier 2 (Important):** Payment Snapshot, Team Health
- **Tier 3 (Nice-to-have):** Coaches, Events, Trophies

**5-Second Test:** "What's urgent?"
> Admin opens → Smart Queue visible (2–4 items) → urgency badge on header → team health tiles
> **PASSES** — critical info above the fold

**Cognitive Load Score: 7/10**
- 15+ interactive elements per screen
- ~6 screens of scroll depth to reach bottom
- Search + queue actions + action grid = 3 major interactive zones

---

### 2. Coach Dashboard

**File:** `components/CoachHomeScroll.tsx` (lines 161–650+)

**Philosophy:** Game prep + player engagement + team health.

**Section Inventory (14 sections):**

| # | Section | Import Line | Purpose |
|---|---------|-------------|---------|
| 1 | Welcome + Team Selector | 427–432 | Greeting, team pill switcher |
| 2 | PrepChecklist | 487 | Game readiness checklist |
| 3 | GamePlanCard | 496 | Next event details |
| 4 | ScoutingContext | 510 | Previous matchup intel |
| 5 | QuickActions | 515 | Roster/lineup/scouting shortcuts |
| 6 | EngagementSection | 525 | Player engagement stats |
| 7 | ChallengeQuickCard | 532 | Active challenges (position 7) |
| 8 | TeamHealthCard | — | Team pulse indicators |
| 9 | SeasonLeaderboardCard | 554 | Season records |
| 10 | ActionItems | 566 | To-do items |
| 11 | TeamHubPreviewCard | 574 | Team post preview |
| 12 | ActivityFeed | 583 | Recent team activity |
| 13 | TrophyCaseWidget | — | Coach's badges |
| 14 | SeasonSetupCard | 600 | If season incomplete |

**Signal-to-Noise Assessment:**
- **Tier 1:** PrepChecklist + GamePlanCard + QuickActions (but spread across 3 cards)
- **Tier 2:** Engagement, Leaderboard, Action Items
- **Tier 3:** Activity feed, Trophy case

**Critical Finding: Card Fragmentation**
The answer to "Is my game prep done?" is split across 3 separate cards (PrepChecklist, GamePlanCard, QuickActions). A coach must read all three to understand their readiness state.

**5-Second Test:** "What should I do now?"
> Coach opens → PrepChecklist (setup status) + GamePlanCard (next event) + QuickActions
> **BORDERLINE** — requires reading 3 cards to understand context (~5 sec)

**Cognitive Load Score: 8/10**
- 14 major card components
- 4–5 action zones (team selector, prep checklist, quick actions, engagement)
- HIGH animation complexity (parallax, card breathing, stagger — imports lines 18–28)

---

### 3. Parent Dashboard

**File:** `components/ParentHomeScroll.tsx` (lines 169–700)

**Philosophy:** Family event coordination + child engagement.

**Key Innovation: Context-Aware Dynamic Mascot Messages** (lines 84–165)
- Builds 3–4 rotating messages based on live state:
  1. Unconfirmed RSVP → "Coach is building the roster, is [child] in?"
  2. Unpaid balance → "$X is due. Tap to handle it."
  3. Unread chat → "X unread messages from team"
  4. All clear → "Everyone's set for the week"
- Messages cycle every 5 seconds (line 279)
- Eliminates generic "Welcome back" — always shows a single actionable insight

**Section Inventory (18 sections):**

| # | Section | Lines | Purpose |
|---|---------|-------|---------|
| 1 | Welcome + Mascot | 407–479 | Greeting + rotating dynamic message + dots |
| 2 | Registration Status | 481–486 | Registration + open reg + incomplete profile |
| 3 | Context Bar | 488–495 | Multi-child / multi-sport switcher |
| 4 | Billboard Hero | 497–505 | Auto-cycling events with RSVP buttons |
| 5 | Also Today/This Week | 507–508 | Secondary events strip |
| 6 | Attention Banner | 510–517 | RSVP/payment nudges |
| 7 | Family Entry | 519–575 | Single child card OR multi-child avatar row |
| 8 | Ambient Celebration | 577–583 | Recent achievements animation |
| 9 | Challenge Verify Card | 585–594 | Active challenges for children |
| 10 | Evaluation Card | 596–604 | Pending evaluations |
| 11 | Metric Grid | 606–615 | Season record + payment + child XP + chat |
| 12 | Team Hub Preview | 617–618 | Latest team post |
| 13 | Chat Preview | 620–621 | Recent team chat |
| 14 | Season Snapshot | 623–624 | Wins/losses record |
| 15 | Recent Badges | 626–627 | Child's achievements |
| 16 | Trophy Case | 629–634 | Parent's own badges |
| 17 | Bottom Registration | 636–640 | Upcoming season registration |
| 18 | End Section | 642–674 | Contextual farewell message |

**Signal-to-Noise Assessment: EXCELLENT**
- **Tier 1 (Critical):** Billboard Hero (next event) + Attention Banner (RSVPs/payments) = what matters TODAY
- **Tier 2 (Important):** Metric grid + Challenge + Evaluation = current season context
- **Tier 3 (Nice-to-have):** Team hub, chat, season snapshot, badges

**Empty States:** NoOrgState (line 320–323), NoTeamState (line 401–404) — properly handled.

**5-Second Test:** "What needs my attention right now?"
> Parent opens → Dynamic mascot message (rotating: "Is child in for Saturday?" OR "$200 due" OR "Unread chat") → Billboard hero with RSVP button → Attention banner
> **PASSES** — clear in under 3 seconds

**Cognitive Load Score: 6/10** (BEST among complex dashboards)
- 18 sections BUT strategically grouped by importance
- Primary action = RSVP button on hero card
- Progressive disclosure: scroll to reach secondary info

---

### 4. Player Dashboard

**File:** `components/PlayerHomeScroll.tsx` (lines 99–410+)

**Philosophy:** Personal achievement + team event engagement + gamification.

**Dark Theme:** `PLAYER_THEME` (lines 72–90)
- Background: `#0D1B3E` (dark navy)
- Card: `#10284C` (slightly lighter navy)
- Accent: `#4BB9EC` (sky blue)
- Gold: `#FFD700` (achievement accents)
- Rationale: "Game menu feel, not admin tool" — appeals to younger players

**Section Inventory (11 sections):**

| # | Section | Line | Purpose |
|---|---------|------|---------|
| 1 | HeroIdentityCard | 299 | Player name, photo, level, XP |
| 2 | StreakBanner | 332 | Attendance streak with freeze indicator |
| 3 | TheDrop | 335 | 1–3 contextual items (evaluations, next game, leaderboard snippet) |
| 4 | PhotoStrip | 344 | Recent team photos |
| 5 | NextUpCard | 347 | Next event + RSVP button |
| 6 | ChatPeek | 355 | Recent team chats (flat row) |
| 7 | QuickPropsRow | 358 | Give shoutouts quick action |
| 8 | ActiveChallengeCard | 361 | Joined challenges with progress |
| 9 | EvaluationCard | 364 | Pending evaluations from coaches |
| 10 | LastGameStats | 372 | Previous game stats |
| 11 | ClosingMascot | 406 | XP callback + contextual message |

**5-Second Test:** "What did I accomplish?"
> Player opens → Hero card ("You're Level 7 with 1,200 XP") → Streak banner ("15-game streak") → Next up ("Saturday game at 3 PM — RSVP")
> **PASSES** — personal achievement + team context in 2 seconds

**Cognitive Load Score: 5/10** (BEST overall)
- 11 sections focused on progression (personal stats → team engagement)
- Primary action = RSVP button, secondary = challenge cards, shoutout button
- Dark mode + gold accents guide eye to achievements

---

## Key Secondary Screens

### Manage Screen (Admin Command Center)

**File:** `app/(tabs)/manage.tsx` (lines 81–350)

| Element | Content |
|---------|---------|
| Attention Cards (4) | Pending Registrations, Unpaid Balances, Unrostered Players, Pending Approvals |
| Org Snapshot | Players, teams, coaches, revenue, registration % |
| Activity Feed | Recent registrations + payments (max 10) |
| Action Grid | Grouped action shortcuts |

**Cognitive Load Score: 9/10** (HIGHEST in app)
- 4 attention cards + snapshot (6 numbers) + activity (10 items) + action grid = 20+ distinct UI elements
- Color fatigue: red=urgent, green=all-clear across 4 cards simultaneously

### Game Day Screen

**File:** `app/(tabs)/gameday.tsx` (lines 117–400+)

**Hierarchy:** In-progress match → hero event → this week → all upcoming 30 days

**Cognitive Load Score: 6/10**
- Single primary action: tap event to detail
- Event card density HIGH (6 data points per card)
- Organized chronologically (intuitive)

### Registration Hub

**File:** `app/registration-hub.tsx` (lines 168–350+)

**Cognitive Load Score: 8/10**
- 7 status filters x 3 sort modes = 21 possible views
- Bulk selection mode adds mental model complexity
- Mitigated by Smart Queue shortcut in AdminHomeScroll (shows first 4 items)

---

## Cognitive Load Rankings

| Rank | Screen | Score | Primary Issue | Key Strength |
|------|--------|-------|---------------|-------------|
| 1 | Player Dashboard | 5/10 | Dark theme learning curve | Gamification + personal achievement |
| 2 | Challenges | 5/10 | None significant | Uniform card design, filter clarity |
| 3 | Parent Dashboard | 6/10 | Message cycling can confuse | Context-aware actions, progressive disclosure |
| 4 | Game Day | 6/10 | Event card density | Chronological organization |
| 5 | Game Day Command | 6/10 | Page gating unclear | Visual progress indicator |
| 6 | Admin Dashboard | 7/10 | 13 sections, heavy scroll | Smart Queue prioritization |
| 7 | Season Settings | 7/10 | 10+ editable fields, modal workflow | Fields grouped by section |
| 8 | Coach Dashboard | 8/10 | 14 sections, card fragmentation | Prep checklist front-loaded |
| 9 | Registration Hub | 8/10 | Filter matrix (7x3) | Smart queue shortcut |
| 10 | Team Management | 8/10 | 5+ modals, 3-level drill-down | Waiver compliance tracking |
| 11 | Manage Screen | 9/10 | 20+ UI elements, color fatigue | Real-time status snapshots |

---

## Design Patterns Observed

### 1. Scroll-Driven Architecture
All dashboards use `Animated.ScrollView` with `useScrollAnimations()` hook:
- Parallax effects on hero images
- Sticky headers that fade in on scroll
- Card entrance animations (stagger, fade)
- **Evidence:** AdminHomeScroll compactHeader (lines 94–99), CoachHomeScroll heroCardAnimStyle (line 495), ParentHomeScroll welcomeAnimStyle (lines 291–296)

### 2. Three-Tier Visual System
- **Tier 1:** Bright colors (`BRAND.skyBlue`, `BRAND.coral`) for urgent/primary actions
- **Tier 2:** Neutral colors (`BRAND.navy`, `BRAND.gray`) for secondary info
- **Tier 3:** Muted colors (`BRAND.textFaint`, `BRAND.textMuted`) for tertiary content

### 3. Glass Morphism Cards
- Coach team selector pills (CoachHomeScroll line 432)
- Parent context bar (ParentHomeScroll line 489)
- Uses `BRAND.glassCard` / `BRAND.glassBorder` from theme

### 4. Empty State Handling (Inconsistent)
- Parent/Admin dashboards: proper `NoOrgState`, `NoTeamState` components
- Many secondary screens: **no empty state** (see CLAUDE-UX-DEAD-END-SCREENS.md)

---

## Critical Issues

### Issue #1: Missing CoachParentHomeScroll
- **Location:** `DashboardRouter.tsx:257`
- **Impact:** Parents who are coaches lose RSVP, payment, family gallery actions
- **Severity:** HIGH

### Issue #2: Manage Screen Cognitive Overload
- **Location:** `app/(tabs)/manage.tsx`
- **Impact:** 20+ UI elements overwhelm admins scanning for org state
- **Severity:** MEDIUM

### Issue #3: Coach Dashboard Card Fragmentation
- **Location:** `CoachHomeScroll.tsx`
- **Impact:** Game prep answer split across 3 cards (PrepChecklist, GamePlanCard, QuickActions)
- **Severity:** MEDIUM

### Issue #4: Registration Hub Filter Matrix
- **Location:** `app/registration-hub.tsx:181–183`
- **Impact:** 21 possible views from filter/sort combinations; users lose context when switching
- **Severity:** MEDIUM

### Issue #5: Game Day Command Page Gating
- **Location:** `app/game-day-command.tsx:85–91`
- **Impact:** Disabled page dots don't explain why (e.g., "Lineup must be ready")
- **Severity:** LOW

---

## Signal-to-Noise Summary (5-Second Test)

| Role | Question | Answered? | Time |
|------|----------|-----------|------|
| Admin | "What's urgent?" | Yes (Smart Queue) | ~3 sec |
| Coach | "Is game prep done?" | Yes (PrepChecklist) | ~5 sec |
| Parent | "What needs my attention?" | Yes (Dynamic message) | ~2 sec |
| Player | "Did I level up?" | Yes (Hero card) | ~2 sec |
