# CC-PARENT-HOME-V2.md
# Lynx Mobile — Parent Home V2: The Family Dashboard

**Priority:** HIGH — most visited screen in the app for the largest user segment  
**Estimated time:** 6–8 hours (7 phases, commit after each)  
**Risk level:** MEDIUM — rebuilding the primary parent screen; must preserve data connections and not break other roles  
**Branch:** Create `feat/parent-home-v2` from current working branch  

---

## WHY THIS EXISTS

The current parent home was built for a single-child, single-team family. Real families have multiple kids, multiple sports, multiple teams, and multiple things competing for their attention. This redesign makes the parent home feel like a family command center — not a single-player dashboard.

The previous CC-PARENT-HOME-REDESIGN spec (billboard hero, auto-cycling cards) is **superseded by this spec**. This is the new direction.

---

## RULES — READ BEFORE DOING ANYTHING

1. **Do not ask for permission. Just do it.** Wait for confirmation ONLY if something is unclear about the spec — otherwise, execute the plan.
2. **Read these files FIRST, in order:**
   - `CC-LYNX-RULES.md` in the project root (standing rules for all CC specs)
   - `SCHEMA_REFERENCE.csv` — verify every table and column before writing queries
   - `reference/design-references/brandbook/LynxBrandBook.html` — brand tokens, typography, color system
   - `reference/design-references/handoff/LYNX-MOBILE-REDESIGN-HANDOFF.md` — if it exists, read for design context
   - The **current** parent home file — find it: `find . -path "*/parent*home*" -o -path "*/ParentHome*" | grep -v node_modules`
   - The **current** coach home file — find it: `find . -path "*/coach*home*" -o -path "*/CoachHome*" | grep -v node_modules` — this is your layout reference for compact multi-player treatment
3. **SCHEMA_REFERENCE.csv is the source of truth.** If a table or column doesn't exist there, do NOT invent it. Create a Supabase migration SQL block clearly marked `-- MIGRATION REQUIRED` and flag it in the commit message.
4. **Brand tokens only.** No hardcoded colors anywhere. Use the brand tokens from theme files (`theme/colors.ts`, `theme/fonts.ts`, `theme/spacing.ts`) or the design token system. Key tokens: `lynx-navy: #10284C`, `lynx-sky: #4BB9EC`, `lynx-gold: #FFD700`. Check `theme/colors.ts` for the full palette — use what's there.
5. **ScrollView must always be mounted.** NEVER use an early return before the ScrollView. Loading states, empty states, error states — all render INSIDE the ScrollView. This was the root cause of the touch-blocking bug. Do not repeat it.
6. **No console.log without `__DEV__` gating.** All debug logging: `if (__DEV__) console.log(...)`.
7. **After every phase, run `npx tsc --noEmit`** and report the result. Zero new TypeScript errors.
8. **Commit AND push after every completed phase.** Format: `git add -A && git commit -m "Parent Home V2 Phase [X]: [description]" && git push`. Do NOT bundle multiple phases into one commit.
9. **Reuse existing components aggressively.** PressableCard, SectionHeader, Avatar, Badge, StatBox, PillTabs, EventCard, PlayerCard — these exist. Find them, read them, use them.
10. **Do NOT touch other roles.** Admin, Coach, Player home screens must be completely unchanged. Test with role switcher after each phase.
11. **Animations target 60fps.** Use `react-native-reanimated` worklets and `useNativeDriver: true`. If it would drop frames on a mid-range Android, simplify it.
12. **Hooks order must be stable.** No hooks after early returns, no conditional hooks. This was a previous bug — don't repeat it.
13. **The tab bar structure is sacred.** Home | Schedule | Chat | Team | My Stuff — do NOT touch it. You are replacing the HOME tab content only.
14. **Show me your plan first for Phase 1, then build.** For Phases 2–7, just execute.

---

## BRAND SYSTEM (Quick Reference)

Read the full brand book for details. These are the essentials:

| Token | Value | Usage |
|-------|-------|-------|
| lynx-navy | #10284C | Hero backgrounds, dark surfaces, headers |
| lynx-sky | #4BB9EC | Interactive elements, links, accent highlights |
| lynx-gold | #FFD700 | XP, achievements, celebration moments |
| coral/urgency | Check theme/colors.ts | Payment nudges, attention items, overdue |
| success-green | Check theme/colors.ts | Win streaks, positive stats, completed items |
| surface-card | Check theme/colors.ts | Card backgrounds (likely white or near-white) |
| font-display | Bebas Neue | Scores, hero headlines, big numbers |
| font-body | Check theme/fonts.ts | Body text, labels, descriptions |

---

## SCREEN LAYOUT (Top to Bottom)

This is the definitive section order. Do not rearrange.

### 1. HERO HEADER
- **Greeting line:** "Good afternoon, Carlos" (first name only, time-of-day greeting). No last name. No "The [Name] Family."
- **Background:** Dark navy (`lynx-navy`) with subtle gradient or texture
- **Mascot (Lynx Cub):** Positioned in the RIGHT side of the hero card, vertically centered or slightly above center. Sized at roughly 80–90px tall — noticeably larger than the current implementation. The cub should feel like a companion sitting in the corner of the card, not an afterthought tucked in the bottom.
- **Parent Level + XP Bar:** Rendered INSIDE the hero card, below the greeting text. Show: "Level [X] · [Tier Name]" with the XP progress bar below it (e.g., "4,500 / 5,200 XP"). The XP bar should use `lynx-gold` for the fill. This is prominent — not small text.

### 2. PAYMENT NUDGE BAR (conditional)
- Only renders if there is an outstanding balance
- Amber/gold background with money bag emoji and amount: "💰 $210 is due. Tap to handle it. → Tap to pay →"
- Tapping navigates to payment screen
- If no balance due, this section does not render (no empty placeholder)

### 3. ATTENTION STRIP (conditional)
- Only renders if there are actionable items requiring parent response
- Expandable/collapsible card with coral/urgency left border or background tint
- Header: "[X] things need attention" with a preview of the first item (e.g., "Ava's game Sat, Mar 14 and 5 more")
- Chevron to expand/collapse
- When expanded: list of attention items (upcoming RSVPs needed, unsigned waivers, missing forms, schedule conflicts)
- Tapping an item navigates to the relevant screen
- If no items need attention, this section does not render

### 4. KID CARDS

**This is the most important section to get right.**

**Single child:**
- Render ONE full-width card
- Card contains: child's profile photo (circle avatar, large — 60px+), name, team name, jersey number, next upcoming event preview (type + date + opponent), player level
- The card should feel like a player identity card — not a list item
- Tapping the card navigates to that child's detail page

**Multiple children (2+ kids across any number of teams/sports):**
- Render compact circle avatars in a horizontal row — same treatment as the coach's squad face circles
- Each circle: child's profile photo (or initials fallback), name below
- This row should NEVER be taller than ~100px total (avatars + name labels)
- Tapping ANY avatar opens the **Family Quick View** panel (the existing right-swipe panel / bottom sheet — find it in the codebase and wire it)
- Do NOT render individual full cards per child. Do NOT render one card per team membership. The duplication bug (showing "Sister 1" three times because she's on three teams) is exactly what we're eliminating.
- The logic is: one avatar per UNIQUE CHILD, regardless of how many teams they're on

**Data resolution:**
- Query all children linked to the parent's profile
- Deduplicate by child ID (not by team membership)
- For the single-child full card: pull their primary team, next event, and level
- For multi-child circles: just need photo/initials and name per unique child

### 5. TEAM HUB PREVIEW CARD(S)

**This section is a gateway to engagement.** It should stand out visually and use animation to invite taps.

**Single team (all kids on the same team):**
- ONE card, visually distinct from other sections
- Card contains: team logo (or color-coded circle fallback), bold "Team Hub" typography, and a notification pill if there are unread posts on the team wall
- The card should feel premium — not just another white card. Consider: slightly elevated shadow, team color accent border or gradient edge, or a subtle background pattern
- Tapping navigates to the Team Hub tab

**Multiple teams (kids on different teams/sports):**
- Horizontal scrolling row of Team Hub cards — one per team
- Each card: team logo, "Team Hub" label, notification pill if unread posts, arrow indicator (→)
- Cards should snap on scroll (snap-to-interval)
- Same premium visual treatment as the single-team card

**Micro-animation (GO BOLD):**
- The notification pill should PULSE — not a subtle fade, a real rhythmic pulse that catches the eye
- On first render / screen entry, the Team Hub card(s) should have an entrance animation: slide up + fade in, or a brief scale-up bounce
- If there are unread posts, consider a shimmer/glow effect on the card border or a gentle breathing glow on the notification pill
- The goal is to make this card feel alive and say "there's something here for you"
- If the card has been tapped recently and there are no new posts, the animations should be calmer (no pulse, just static pill or no pill)

**Data:**
- Query all teams the parent's children are on
- Deduplicate by team ID
- Check for unread team wall posts (compare parent's last_viewed timestamp with latest post timestamp per team)
- Check SCHEMA_REFERENCE.csv for team_posts, team_wall_posts, or similar tables

### 6. FAMILY PULSE

- Section header: "FAMILY PULSE" with "See All" link
- Feed of recent family-relevant activity items, most recent first
- Item types: coach announcements (📢), chat messages (💬), game results with XP earned (🏆), challenge completions, badge awards
- Each item: icon/emoji, descriptive text, timestamp ("5d ago"), and optional XP indicator
- Show 3–5 items max on the home screen; "See All" navigates to full activity feed
- Tapping an item navigates to the relevant screen (chat thread, game results, challenge detail, etc.)

### 7. UPCOMING / REGISTRATION CTA

- Section header: "UPCOMING"
- If there are open registration seasons: show a prominent CTA card — "📅 Register for [X] open seasons →"
- Below or instead (if no open registrations): show the next 2–3 upcoming events across all children/teams
- Each event card: event type pill (GAME/PRACTICE/TOURNAMENT), date/time, opponent or location, which child it's for
- Tapping navigates to event detail or registration flow

### 8. TROPHY CASE / BADGE DISPLAY

- Dark navy background card (matching hero treatment)
- Show the parent's earned badges as emoji/icon circles in a horizontal row
- Level indicator: "Level [X] · [Tier] · [X]/[Y] badges"
- XP progress bar (gold fill)
- This is a repeat/echo of the hero XP info but in a more detailed badge-focused format
- Tapping navigates to full achievement/badge detail screen

---

## MICRO-ANIMATIONS SPEC (Bold Round)

This round is intentionally bold. Carlos will dial back if needed.

| Element | Animation | Details |
|---------|-----------|---------|
| **XP Bar (Hero)** | Fill animation on mount | Bar starts at 0% and fills to current value over 800ms with easeOut. Gold shimmer passes across the bar after fill completes. |
| **Kid Avatars** | Staggered entrance | Each avatar fades in + scales up (0.8 → 1.0) with 80ms stagger delay between siblings. |
| **Team Hub Card** | Entrance bounce | Card slides up 20px + fades in on mount with a slight overshoot bounce (spring animation). |
| **Team Hub Notification Pill** | Rhythmic pulse | Scale oscillates 1.0 → 1.15 → 1.0 on a 2-second loop. Pill glows with a soft shadow pulse synced to scale. Stops after 3 cycles or if user has already tapped through. |
| **Team Hub Card Border** | Shimmer sweep | If unread posts: a subtle light sweep moves across the card border/edge every 4 seconds. CSS-style gradient animation using reanimated. |
| **Attention Strip** | Expand/collapse | Height animates smoothly (not instant show/hide). Items inside stagger-fade as the container opens. |
| **Payment Nudge** | Gentle slide-in | Slides in from the left on mount with a 300ms delay (so it appears after the hero settles). |
| **Family Pulse Items** | Staggered fade | Each item fades in with 60ms stagger. New items (since last visit) get a brief highlight flash. |
| **Trophy Case Badges** | Pop-in | Each badge icon scales from 0 → 1.0 with a spring bounce, staggered 50ms apart. |
| **Screen Pull-to-Refresh** | Cub animation | If feasible: the Lynx Cub peeks down from the top during pull-to-refresh (like Twitter's bird). If too complex, use standard refresh indicator with brand colors. |

**Animation rules:**
- All animations use `react-native-reanimated` (not Animated API)
- All animations respect `prefers-reduced-motion` — if enabled, skip all animations and render static
- No animation should delay content visibility by more than 500ms total
- Entrance animations only play on initial mount, not on every re-render or scroll back into view (use a `hasAnimated` ref)
- Loop animations (pulse, shimmer) must be cancellable and should not run when the screen is not focused

---

## PHASES

### Phase 1: Scaffold + Hero Header
1. Read all reference files (Rule 2)
2. Read the current parent home component — understand every query, every piece of state, every navigation action
3. Read the coach home component — understand the squad face circles pattern for multi-player compact view
4. **Show me your plan** — list what you'll keep, what you'll replace, what queries you'll reuse
5. Create the new parent home scaffold inside a ScrollView (Rule 5: ScrollView always mounted)
6. Build the hero header: greeting (first name, time-of-day), mascot repositioned (right side, larger), Parent Level + XP bar inside the hero
7. Implement the XP bar fill animation
8. Test: role switch to Parent, verify hero renders. Switch to Coach/Admin/Player — verify nothing changed.
9. Commit: `"Parent Home V2 Phase 1: Hero header with greeting, mascot, XP bar"`

### Phase 2: Payment Nudge + Attention Strip
1. Build the payment nudge bar (conditional on outstanding balance)
2. Build the attention strip (conditional on actionable items)
3. Implement expand/collapse animation on the attention strip
4. Implement the payment nudge slide-in animation
5. Wire both to real data — check SCHEMA_REFERENCE.csv for balances, upcoming events needing RSVP, unsigned waivers
6. If no data conditions are met, verify these sections don't render (no empty placeholders)
7. Commit: `"Parent Home V2 Phase 2: Payment nudge bar + expandable attention strip"`

### Phase 3: Kid Cards (Single vs. Multi-Child)
1. Query all children linked to the parent profile — deduplicate by child ID
2. Build the **single child** full card: photo avatar, name, team, jersey, next event, level
3. Build the **multi-child** compact circle avatars: horizontal row, photo or initials, name below
4. Implement the staggered entrance animation for avatars
5. Wire the multi-child tap → Family Quick View panel (find the existing panel component, don't rebuild it)
6. Wire the single-child tap → child detail page
7. Test with accounts that have 1 child, 2 children, 3+ children
8. Commit: `"Parent Home V2 Phase 3: Adaptive kid cards - full single, compact multi"`

### Phase 4: Team Hub Preview Card(s)
1. Query all teams the parent's children belong to — deduplicate by team ID
2. Check for unread team wall posts per team
3. Build the single-team card: team logo, "Team Hub" typography, notification pill
4. Build the multi-team horizontal scroll: one card per team, snap-to-interval
5. Implement ALL Team Hub animations: entrance bounce, notification pill pulse, shimmer sweep on border
6. Wire tap → Team Hub tab (passing team context if multi-team)
7. Make the card visually stand out — it should not look like every other white card on the screen. Use team color accent, elevated shadow, or subtle gradient treatment.
8. Commit: `"Parent Home V2 Phase 4: Team Hub preview cards with engagement animations"`

### Phase 5: Family Pulse Feed
1. Find and reuse existing activity feed / Family Pulse components if they exist
2. Query recent family activity: announcements, chat messages, game results, challenge completions, badge awards
3. Build the feed with section header ("FAMILY PULSE" + "See All")
4. Show 3–5 most recent items with icons, text, timestamps, and optional XP indicators
5. Implement staggered fade-in animation
6. Wire taps to relevant screens
7. Wire "See All" to full activity feed
8. Commit: `"Parent Home V2 Phase 5: Family Pulse activity feed"`

### Phase 6: Upcoming / Registration + Trophy Case
1. Build the Upcoming section: registration CTA if open seasons exist, next 2–3 events otherwise
2. Build the Trophy Case / Badge Display: dark navy card, badge icons, level, XP bar
3. Implement badge pop-in animations
4. Wire registration CTA → registration flow
5. Wire event cards → event detail
6. Wire trophy case tap → full badge/achievement screen
7. Add bottom padding (120px+) for tab bar clearance
8. Commit: `"Parent Home V2 Phase 6: Upcoming events, registration CTA, trophy case"`

### Phase 7: Polish + Pull-to-Refresh + Full Test
1. Implement pull-to-refresh on the entire ScrollView (attempt the Cub peek animation; fall back to brand-colored standard indicator if too complex)
2. Add proper loading skeleton states for each section (render INSIDE ScrollView — Rule 5)
3. Add empty states where appropriate (no games yet, no badges yet)
4. Full test matrix:
   - Parent with 1 child, 1 team
   - Parent with 2+ children, same team
   - Parent with 2+ children, different teams/sports
   - Parent with outstanding balance vs. no balance
   - Parent with attention items vs. no attention items
   - Parent with no activity history (empty Family Pulse)
   - Role switch: Admin, Coach, Player — ALL must be unchanged
5. Run `npx tsc --noEmit` — zero errors
6. Commit: `"Parent Home V2 Phase 7: Polish, loading states, pull-to-refresh, full test pass"`

---

## WHAT NOT TO TOUCH

- Tab bar structure (Home | Schedule | Chat | Team | My Stuff)
- Any other role's home screen (Admin, Coach, Player)
- Navigation structure outside the parent home tab
- GestureDrawer (it's been fixed — don't touch it)
- Achievement engine (hooks order was fixed — don't touch it)
- Chat, Schedule, or Team Hub screens (you're only building a PREVIEW card that links to Team Hub — not rebuilding Team Hub itself)

---

## KNOWN LANDMINES

1. **Touch blocking:** Caused by ScrollView unmounting during loading. Rule 5 exists because of this. If you use an early return before the ScrollView, you will break touch for the entire app. Don't.
2. **Player card duplication:** The old parent home showed one card per team membership instead of one per child. The deduplication logic in Phase 3 (by child ID, not team membership) fixes this. Do not query players_teams and render one card per row — query children and show one entry per unique child.
3. **Hooks order:** `useMemo`/`useEffect` after early returns caused crashes. Rule 12 exists because of this. All hooks must be declared before any conditional returns.
4. **Achievement engine for parents:** Profile ID vs player ID mismatch crashed it. A role guard was added. Don't remove the role guard if you encounter it.
5. **Family Quick View panel:** This may exist but be unwired (it was on the bug list). If it exists, wire it. If it doesn't exist, build a minimal version: bottom sheet showing all children with team info, levels, and quick-nav links. Don't over-engineer it — this is a quick-access panel, not a full screen.

---

## SUCCESS CRITERIA

When this spec is complete:
- [ ] Parent home is a single scrollable screen with all 8 sections rendering in order
- [ ] Hero shows greeting (first name), mascot (right side, larger), and Parent Level + XP bar with fill animation
- [ ] Payment nudge only appears when balance is due
- [ ] Attention strip only appears when items need action, expands/collapses smoothly
- [ ] Single-child families see a full player card; multi-child families see compact circle avatars
- [ ] Tapping multi-child avatars opens Family Quick View
- [ ] Team Hub preview card(s) visually stand out and have bold micro-animations (pulse, shimmer, bounce)
- [ ] Multi-team families see horizontal-scrolling Team Hub cards
- [ ] Family Pulse shows 3–5 recent activity items with staggered entrance
- [ ] Upcoming section shows registration CTA or next events
- [ ] Trophy case renders with badge pop-in animations
- [ ] Pull-to-refresh works on the entire scroll
- [ ] Loading states render inside ScrollView (no early returns)
- [ ] All other roles are completely unchanged
- [ ] Zero new TypeScript errors
