# CC-PARENT-HOME-DPLUS-FIXES.md
# Lynx Mobile — Parent Home D+ Targeted Fixes
# Based on Carlos's feedback after reviewing the D+ execution
# Branch: navigation-cleanup-complete (at commit ebeceb2)

**Priority:** HIGH — Fix issues and apply feedback before moving to Admin
**Estimated time:** 3-4 hours (10 targeted fixes, commit after each)
**Risk level:** LOW — Surgical changes to existing D+ components

---

## PREREQUISITE READING

1. Read CC-LYNX-RULES.md
2. Read AGENTS.md — "Keep edits minimal and localized"
3. Read PARENT-HOME-DPLUS-CHANGELOG.md — understand what was built
4. Read theme/d-system.ts — existing D System tokens
5. Read theme/colors.ts — existing brand tokens

---

## FILE SCOPE — HARD BOUNDARIES

### FILES YOU MAY MODIFY:
- `components/parent-scroll/FamilyHeroCard.tsx` — Hero card greeting and mascot changes
- `components/parent-scroll/ParentPaymentNudge.tsx` — Restyle card (kill side-border)
- `components/parent-scroll/ParentAttentionStrip.tsx` — Restyle card (kill side-border)
- `components/parent-scroll/FamilyKidCard.tsx` — Replace with compact circles for multi-child
- `components/parent-scroll/ParentXPBar.tsx` — Move position to inside hero
- `components/parent-scroll/FamilyPulseFeed.tsx` — Add animations
- `components/parent-scroll/ParentMomentumRow.tsx` — Fix horizontal scroll clipping
- `components/parent-scroll/ParentTrophyBar.tsx` — Add animations
- `components/parent-scroll/ParentAmbientCloser.tsx` — Add animations
- `components/parent-scroll/ParentEventHero.tsx` — Add animations
- `components/ParentHomeScroll.tsx` — Adjust section order, add Team Hub section, pass new props
- `theme/d-system.ts` — ONLY to ADD new tokens. Do NOT change existing ones.

### FILES YOU MAY CREATE:
- `components/parent-scroll/ParentTeamHubCard.tsx` — New Team Hub preview cards
- `components/parent-scroll/LynxGreetings.ts` — Dynamic greeting message system

### FILES YOU MUST NOT MODIFY:
- Everything on the original MUST NOT MODIFY list from the D+ spec
- `components/TrophyCaseWidget.tsx` — Shared
- `components/TeamPulse.tsx` — Shared
- `components/parent-scroll/DayStripCalendar.tsx` — Shared with Admin
- `hooks/useParentHomeData.ts` — Data hook, do not touch
- ALL coach-scroll files, player-scroll files, other role files
- ALL files in app/ — No route or layout changes

### CRITICAL RULES:
1. **NO DOMINOES** — Don't delete files. Don't modify shared components.
2. **ALL HOOKS ABOVE EARLY RETURNS** — No exceptions.
3. **NO CIRCULAR DEPENDENCIES** — Don't import from ParentHomeScroll in child components.
4. **PRESERVE ALL NAVIGATION** — Copy router.push() targets exactly.
5. **PRESERVE ALL DATA FLOW** — useParentHomeData stays untouched.

---

## FIX 1: DYNAMIC LYNX-TONE GREETINGS

**File:** Create `components/parent-scroll/LynxGreetings.ts` AND modify `FamilyHeroCard.tsx`

The greeting should NOT be "Good afternoon, Carlos" or "The [LastName] Family." It should feel like the Lynx mascot talking directly to the parent with energy and personality.

### 1A. Create LynxGreetings.ts

A module that exports a function: `getParentGreeting(context)` that returns a string.

The function takes context:
```typescript
interface GreetingContext {
  firstName: string;
  isGameDay: boolean;
  isPracticeDay: boolean;
  winStreak: number;
  hasPaymentDue: boolean;
  justWon: boolean;       // team won last game
  justLost: boolean;      // team lost last game
  hour: number;           // 0-23
  childCount: number;
}
```

Priority waterfall (check in this order, use the FIRST match):

**Game Day (isGameDay = true):**
- "It's game day, {firstName}! Let's GOOO! 🔥"
- "Big game today. You ready, {firstName}? 🏐"
- "Game day energy! Let's get it, {firstName}! ⚡"

**Post-Game Win (justWon = true):**
- "W! What a game! 🎉"
- "Another one in the bag, {firstName}! 🏆"
- "That's how it's done! 💪"

**Post-Game Loss (justLost = true):**
- "Tough one. Next game's gonna be different 💪"
- "Head up, {firstName}. Champions bounce back 🔥"

**Win Streak (winStreak >= 3):**
- "{winStreak} wins in a row! Don't stop now, {firstName} 🔥"
- "Your family's on FIRE right now 🏆"

**Payment Overdue (hasPaymentDue = true):**
- "Hey {firstName}! Let's knock out that balance 💰"

**Practice Day (isPracticeDay = true):**
- "Practice day! Let's put in the work 💪"
- "Practice makes progress, {firstName} 🐱"

**Morning (hour < 12):**
- "Rise and grind, {firstName}! ☀️"
- "Morning, {firstName}! Here's what's up 🐱"

**Afternoon (hour 12-17):**
- "Hey {firstName}! Here's where things stand 👀"
- "What's good, {firstName}! 🤙"

**Evening (hour >= 17):**
- "Wrapping up the day, {firstName} 🌙"
- "Evening, {firstName}! Check in on the fam 🐱"

**Default fallback:**
- "Hey {firstName}! Let's see what's happening 🐱"

Each category has 2-3 options. Pick one randomly (use a simple hash of the date so it's consistent within a session but changes daily).

### 1B. Modify FamilyHeroCard.tsx

- Remove "The [LastName] Family" text
- Remove the generic "Good morning/afternoon/evening" greeting
- Import `getParentGreeting` from `./LynxGreetings`
- Build the context object from the props (add new props as needed: isGameDay, winStreak, etc.)
- Display the dynamic greeting as the hero text. The greeting is the MAIN text — big, bold, Outfit/ExtraBold, 20-22px, white.
- Below the greeting: keep the subtitle line ("2 athletes · 3 teams · Spring 2026") — this provides context without being the headline

```bash
npx tsc --noEmit
git add -A && git commit -m "fix: dynamic Lynx-tone greetings — context-aware mascot personality messages" && git push
```

---

## FIX 2: MASCOT REPOSITIONED + LARGER

**File:** `components/parent-scroll/FamilyHeroCard.tsx`

The mascot is currently small and positioned in the bottom-right corner. Move it:

- Position: RIGHT side of the hero card, vertically CENTERED (not bottom-right)
- Size: 80-90px (up from ~44px)
- The mascot should feel like a companion sitting next to the greeting, not an afterthought
- Keep the breathing animation (scale 1.0 ↔ 1.03)
- Adjust the hero card layout: greeting text takes ~65% left, mascot takes ~35% right

```bash
npx tsc --noEmit
git add -A && git commit -m "fix: mascot repositioned higher and larger (80-90px) in hero card" && git push
```

---

## FIX 3: PARENT LEVEL + XP BAR INSIDE HERO

**File:** `components/parent-scroll/FamilyHeroCard.tsx` AND `components/parent-scroll/ParentXPBar.tsx` AND `components/ParentHomeScroll.tsx`

Move the Parent Level + XP bar from below the hero into INSIDE the hero card. It should sit below the greeting text, above the subtitle.

- "Level 10 · Silver" text in 13px, gold color (#FFD700)
- XP bar: 6px height, white at 10% background, gold fill
- "4,500 / 5,200 XP" in 10px, white at 30%
- This means the hero card gets slightly taller to accommodate

In ParentHomeScroll.tsx: remove the standalone `<ParentXPBar>` component from the scroll. Its data now passes into FamilyHeroCard as props.

ParentXPBar.tsx file stays — don't delete it. Just remove it from the render.

```bash
npx tsc --noEmit
git add -A && git commit -m "fix: parent level + XP bar moved inside hero card" && git push
```

---

## FIX 4: KILL SIDE-BORDER ACCENT ON CARDS

**Files:** `ParentPaymentNudge.tsx` AND `ParentAttentionStrip.tsx`

Remove the colored left border on both cards. Instead, make the ENTIRE card the color.

### Payment Nudge:
- Remove: `borderLeftWidth: 3` / `borderLeftColor: amber`
- Replace with: full card background `rgba(245,158,11,0.08)` with a subtle border `1px solid rgba(245,158,11,0.15)`
- The card should feel warm and amber-tinted, not white with a stripe
- BorderRadius 14. No side accent.

### Attention Strip:
- Remove: `borderLeftWidth: 4` / `borderLeftColor: coral`  
- Replace with: full card background `rgba(255,107,107,0.06)` with a subtle border `1px solid rgba(255,107,107,0.12)`
- The count number stays coral/bold. The card background is the tint.
- BorderRadius 14. No side accent.

```bash
npx tsc --noEmit
git add -A && git commit -m "fix: kill side-border accent on payment nudge and attention strip — full card color instead" && git push
```

---

## FIX 5: MULTI-CHILD = COMPACT CIRCLE AVATARS

**File:** `components/parent-scroll/FamilyKidCard.tsx` AND `components/ParentHomeScroll.tsx`

This is the big one. When there are 2+ children, do NOT render individual full cards per child. Render compact circle avatars in a horizontal row — the same treatment as the coach's SquadFacesRow.

### 5A. Modify FamilyKidCard.tsx (or create a new FamilyKidSection.tsx)

The component should handle BOTH cases internally:

**Single child (children.length === 1):**
- Render ONE full-width card (same as current FamilyKidCard layout)
- Photo avatar (60px circle), name, team, jersey, next event preview with GAME/PRACTICE pill, level number on the right
- Tappable → navigate to family-gallery or child detail

**Multiple children (children.length > 1):**
- Render a horizontal row of circle avatars — 56px each, with negative margin overlap (-8px)
- Each circle: child's photo if available, colored gradient with initial if not
- Child's first name below each circle (10px, weight 600)
- DEDUPLICATE BY CHILD ID — one circle per unique child, not per team membership
- Below the row: "Tap to see your family →" text link (12px, textMuted)
- Tapping ANY circle → opens FamilyPanel (the existing Family Quick View)
- Staggered pop-in animation: each circle scales from 0.8 → 1.0 with spring, 50ms stagger between siblings

### 5B. Update ParentHomeScroll.tsx

- If using a new component name, update the import
- Pass all children data and the FamilyPanel open function as props
- The section should NEVER take more than ~120px of vertical space in multi-child mode

```bash
npx tsc --noEmit
git add -A && git commit -m "fix: multi-child compact circle avatars (squad treatment), single-child full card" && git push
```

---

## FIX 6: TEAM HUB PREVIEW CARDS

**File:** Create `components/parent-scroll/ParentTeamHubCard.tsx` AND modify `components/ParentHomeScroll.tsx`

Add a Team Hub preview section between Family Pulse and the trophy case.

### 6A. Build ParentTeamHubCard.tsx

**Single team (all kids on the same team):**
- ONE card that stands out visually
- Team logo circle (or colored fallback with sport emoji) on the left (48px)
- Bold "Team Hub" text (Outfit/ExtraBold 16px) + team name below (12px, textMuted)
- Arrow → on the right
- Notification pill if unread posts: small red circle with count, positioned on the team logo
- Card styling: NOT just another white card. Give it a team-color-tinted border or subtle gradient edge. Elevated shadow. It should feel premium and inviting.

**Multiple teams (kids on different teams):**
- Horizontal scrolling row of Team Hub cards — one per UNIQUE team
- Same card layout as single team but narrower (~280px width)
- Snap-to-interval scrolling
- Section header: "TEAM HUBS" in Outfit 13px weight 800 uppercase

**Animations (GO BOLD):**
- Notification pill: PULSE animation — scale oscillates 1.0 → 1.2 → 1.0 on a 2-second loop with a subtle glow shadow
- Card entrance: slide up 20px + fade in with spring overshoot bounce on first mount
- If there are unread posts: a shimmer sweep across the card border every 4 seconds
- All loop animations must have cancelAnimation cleanup in useEffect return

**Data:**
- Deduplicate teams by team ID from data.allChildren
- Check for unread posts: compare timestamps if available in the data hook. If not available, show the pill with a static "New" label when any team has recent posts.

### 6B. Fix horizontal scroll clipping

The horizontal scroll container MUST have proper padding so cards aren't visually cut off:
```typescript
// The scroll container needs:
contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8 }}
// NOT just paddingHorizontal — the vertical padding prevents top/bottom shadow clipping
// The card itself should have marginRight: 12 between cards
```

This applies to BOTH the Team Hub cards AND the ParentMomentumRow (fix that too).

### 6C. Update ParentHomeScroll.tsx

- Import ParentTeamHubCard
- Add it between FamilyPulseFeed and ParentTrophyBar in the scroll order
- Pass team data from useParentHomeData

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Team Hub preview cards with pulse notification, shimmer, and entrance animations" && git push
```

---

## FIX 7: FIX MOMENTUM ROW HORIZONTAL CLIPPING

**File:** `components/parent-scroll/ParentMomentumRow.tsx`

Same clipping fix as Team Hub:
- Add `paddingVertical: 8` to the ScrollView's `contentContainerStyle`
- Ensure cards have proper `marginRight` spacing (not just gap)
- Card shadows should be fully visible — no cropping on top/bottom edges

```bash
npx tsc --noEmit
git add -A && git commit -m "fix: momentum row horizontal scroll clipping — proper padding for card shadows" && git push
```

---

## FIX 8: MICRO-ANIMATIONS (BOLD)

**Files:** Multiple parent-scroll components

### 8A. FamilyHeroCard.tsx
- Mascot breathing: already exists, keep it
- XP bar fill: animate from 0% to actual value over 800ms with easeOut on mount
- Greeting text: subtle fade-in (opacity 0 → 1, 300ms) on mount

### 8B. ParentPaymentNudge.tsx
- Slide-in from left: translateX -20 → 0, opacity 0 → 1, 300ms, on mount

### 8C. ParentAttentionStrip.tsx
- Expand/collapse: animated height change (not instant show/hide). Items inside stagger-fade as container opens. Use LayoutAnimation or Reanimated layout transitions.

### 8D. ParentEventHero.tsx
- RSVP button: subtle pulse on the "+20 XP" chip — scale 1.0 → 1.1 → 1.0 on a 3-second loop
- Card entrance: fade in + slide up 15px on mount

### 8E. FamilyPulseFeed.tsx
- Each item: staggered fade-in, 60ms apart, on mount. Only first 5 items animated.

### 8F. ParentTrophyBar.tsx
- Badge icons: pop-in spring animation, staggered 50ms apart
- XP bar fill: 0% → actual over 800ms

### 8G. ParentAmbientCloser.tsx
- Mascot: gentle sway rotation -2deg ↔ 2deg, 4-second loop (different from hero breathing)

**ALL animation rules from coach spec apply:**
- All use react-native-reanimated
- All loop animations have cancelAnimation cleanup
- All hooks above early returns
- Entrance animations fire once on mount only (use hasAnimated ref if needed)

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: bold micro-animations — XP fill, pulse, stagger pop-ins, slide-ins, sway" && git push
```

---

## FIX 9: PASS CONTEXT DATA TO HERO FOR DYNAMIC GREETINGS

**File:** `components/ParentHomeScroll.tsx`

The FamilyHeroCard now needs additional props for the greeting system. Add these to the props being passed:

```typescript
<FamilyHeroCard
  lastName={lastName}
  firstName={firstName}
  children={data.allChildren}
  seasonName={seasonName}
  isGameDay={/* check if any child has a game today */}
  isPracticeDay={/* check if any child has practice today */}
  winStreak={/* from data if available, else 0 */}
  hasPaymentDue={data.paymentStatus.balance > 0}
  justWon={/* check last game result if available */}
  justLost={/* check last game result if available */}
  parentXp={data.childXp}  // for the XP bar inside the hero
/>
```

Derive isGameDay, isPracticeDay from `data.allUpcomingEvents` — check if any event today matches type "game" or "practice". Derive justWon/justLost from recent game results if that data exists in useParentHomeData. If not available, pass false and the greeting falls through to time-of-day messages.

```bash
npx tsc --noEmit
git add -A && git commit -m "fix: pass context data to hero for dynamic greeting system" && git push
```

---

## FIX 10: CHANGELOG

Generate `PARENT-HOME-DPLUS-FIXES-CHANGELOG.md` in the repo root:

1. FILES CREATED — new files with purpose
2. FILES MODIFIED — each file with what changed
3. ISSUES FIXED — map each fix to what was wrong and how it was resolved
4. NAVIGATION PRESERVED — confirm all tap targets work
5. ANIMATIONS ADDED — list every animation with the file it lives in
6. LOOP ANIMATIONS — confirm cancelAnimation cleanup on all loops
7. HOOKS PLACEMENT — confirm all hooks above all early returns
8. SHARED COMPONENTS — confirm TrophyCaseWidget, TeamPulse, DayStripCalendar NOT modified
9. KNOWN ISSUES — anything that needs attention
10. SCREENSHOTS NEEDED — states to test (single child, multi child, game day, no events, payment due, no payment, multi-team, single team)

```bash
git add -A && git commit -m "docs: Parent Home D+ fixes changelog" && git push
```
