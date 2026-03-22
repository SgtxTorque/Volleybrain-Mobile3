# CC-PARENT-HOME-DPLUS-REDESIGN.md
# Lynx Mobile — Parent Home Scroll: D+ System Redesign
# References: LYNX-EXPERIENCE-MANIFESTO.docx (Section 6)
# Branch: navigation-cleanup-complete

**Priority:** HIGH — Second of four home scroll redesigns
**Estimated time:** 4-6 hours (7 phases, commit after each)
**Risk level:** MEDIUM — Restructuring existing components, not adding new data

---

## WHY THIS EXISTS

The current parent home scroll has the right data but the wrong emotional arc. The welcome section is centered and vertical (large mascot, centered name, cycling messages) consuming too much vertical space. The Quick Glance metric grid (6-1 record, $210 balance, Level 10, Team Chat) treats completely unrelated data with equal visual weight. Team Hub Preview and Chat Preview feel like early Twitter. The trophy case is the old flat version. There is no family identity moment — no "The Fuentez Family" hero. Children are shown as avatar rows or compact cards, not as rich cards with badges and levels. The payment nudge is buried. There's no XP integration on action buttons.

The D+ redesign transforms this into a family-first scroll with emotional arc: family hero identity → payment nudge → expandable attention → rich kid cards → parent XP → dark event hero with +XP on RSVP → momentum cards → Family Pulse feed → compact trophy → ambient closer.

**This spec restructures LAYOUT and VISUAL HIERARCHY only.** Data hooks, navigation wiring, and Supabase queries stay exactly as they are.

---

## PREREQUISITE READING (DO ALL OF THESE FIRST)

1. **Read CC-LYNX-RULES.md** — All 15 rules apply.
2. **Read AGENTS.md** — Codex guardrails apply (minimal edits, explain every file touch, no broad refactors).
3. **Read LYNX-REFERENCE-GUIDE.md** — Mascot asset locations, brand book reference.
4. **Read theme/colors.ts, theme/spacing.ts, theme/fonts.ts, theme/d-system.ts** — Existing brand and D System tokens. USE THESE. Do not duplicate.
5. **Read the ENTIRE components/ParentHomeScroll.tsx** — Understand every section, every import, every data flow, every conditional render.
6. **Read every file in components/parent-scroll/** — Understand what each sub-component does and what data it consumes.
7. **Read hooks/useParentHomeData.ts** — Understand the data available. Do NOT modify this file.
8. **Read SCHEMA_REFERENCE.csv** — Even though this spec should NOT require query changes.
9. **Read COACH-HOME-D-CHANGELOG.md** — Learn from the coach redesign. Understand what was created and what pitfalls were hit.

---

## FILE SCOPE — HARD BOUNDARIES

### FILES YOU MAY MODIFY:
- `components/ParentHomeScroll.tsx` — The main scroll file. Primary target.
- Files inside `components/parent-scroll/` — Sub-components specific to the parent scroll.
- `theme/d-system.ts` — ONLY to ADD new D System tokens needed for parent. Do NOT rename, remove, or change existing tokens.

### FILES YOU MAY CREATE:
- New files inside `components/parent-scroll/` (e.g., FamilyHeroCard.tsx, FamilyKidCard.tsx, ParentXPBar.tsx, ParentMomentumRow.tsx, ParentEventHero.tsx, FamilyPulseFeed.tsx, ParentTrophyBar.tsx, ParentAmbientCloser.tsx, ParentPaymentNudge.tsx)

### FILES YOU MUST NOT MODIFY:
- `components/DashboardRouter.tsx` — Only imports ParentHomeScroll. No changes needed.
- `components/CoachHomeScroll.tsx` — Different role. Do not touch.
- `components/AdminHomeScroll.tsx` — Different role. Do not touch.
- `components/PlayerHomeScroll.tsx` — Different role. Do not touch.
- `components/TrophyCaseWidget.tsx` — SHARED by all four home scrolls. Do NOT modify. Create a new ParentTrophyBar.tsx for parent instead.
- `components/TeamPulse.tsx` — SHARED by Coach and Player. Do NOT modify.
- `components/parent-scroll/DayStripCalendar.tsx` — SHARED with AdminHomeScroll. Do NOT modify. If you remove it from the parent render, leave the file untouched.
- `components/FamilyPanel.tsx` — Keep as-is. It's a separate panel, not part of the scroll redesign.
- `hooks/useParentHomeData.ts` — Data hook. Do NOT modify.
- `lib/parent-scroll-context.tsx` — Do not touch.
- `lib/auth.tsx` — Do not touch.
- `lib/permissions-context.tsx` — Do not touch.
- `lib/theme.tsx` — Do not touch.
- ANY file in `app/` — No route changes. No layout changes. No tab bar changes.
- ANY file in `components/coach-scroll/` — Different role.
- ANY file in `components/player-scroll/` — Different role.
- ANY file in `reference/` or `design-reference/` — Read-only reference.
- `theme/colors.ts` — Do not modify. Add new tokens to d-system.ts instead.
- `theme/player-theme.ts` — Do not touch.

### CRITICAL RULES (LESSONS FROM COACH REDESIGN):
1. **NO DOMINOES** — If you remove a component from ParentHomeScroll's render, do NOT delete the component FILE. Leave it in parent-scroll/ untouched.
2. **NO CIRCULAR DEPENDENCIES** — Do NOT import from ParentHomeScroll in any new component you create. If you need a constant from ParentHomeScroll, extract it to a theme file first.
3. **ALL HOOKS ABOVE EARLY RETURNS** — Every useSharedValue, useAnimatedStyle, useEffect, useState MUST be called BEFORE any conditional return (if loading/return null). No exceptions.
4. **SHARED COMPONENTS** — TrophyCaseWidget and DayStripCalendar are used by other roles. Create NEW parent-specific versions, don't modify the shared ones.
5. **PRESERVE NAVIGATION** — Copy every router.push() destination from old components into new ones. Do not change any navigation targets.
6. **PRESERVE DATA FLOW** — All data comes from the existing useParentHomeData hook. Do not change props, do not add new queries.

---

## D SYSTEM TOKENS TO ADD

In `theme/d-system.ts`, ADD these parent-specific tokens (do NOT remove or change existing tokens):

```typescript
// Parent D+ specific tokens
familyHeroBgStart: '#0B1628',
familyHeroBgEnd: '#162d50',
paymentNudgeBg: 'rgba(245,158,11,0.06)',
paymentNudgeBorder: '#F59E0B',
attentionBg: '#FFF5F5',
attentionBorder: '#FF6B6B',
kidCardBorder: 'rgba(75,185,236,0.25)',
kidCardActiveBg: 'rgba(75,185,236,0.05)',
xpBarBg: 'rgba(245,158,11,0.12)',
xpBarFill: '#F59E0B',
eventHeroBgStart: '#0B1628',
eventHeroBgEnd: '#162d50',
rsvpButtonBg: '#4BB9EC',
balanceStart: '#FF6B6B',
balanceEnd: '#e55039',
levelStart: '#8B5CF6',
levelEnd: '#6c2bd9',
```

---

## PHASE 1: FAMILY HERO HEADER + PAYMENT NUDGE

### What changes:
- The current centered vertical welcome section (mascot → "Welcome back, Carlos" → cycling messages → dots) is replaced by a dark navy family hero card with the mascot inside it.
- A tappable amber payment nudge bar appears below the hero.

### 1A. Build FamilyHeroCard component

Create `components/parent-scroll/FamilyHeroCard.tsx`

**Layout:** Dark navy rounded card (borderRadius 22, gradient #0B1628 → #162d50). Contains:
- "Good morning" / "Good afternoon" / "Good evening" in 12px, white at 40%
- "The [LastName] Family" in Outfit/PlusJakartaSans ExtraBold, 22px, white
- "2 athletes · 3 teams · Spring 2026" in 12px, white at 35%
- Mascot image positioned absolute in the bottom-right corner, ~44px, opacity 0.6. Use the same asset the current greeting uses: `require('@/assets/images/mascot/HiLynx.png')`
- Add a subtle idle breathing animation on the mascot (scale 1.0 ↔ 1.03, 4 second loop). Put the useSharedValue and useAnimatedStyle hooks at the TOP of the component, before any conditionals.

**Data:** Last name from `useAuth()` profile. Child count and team count from `useParentHomeData`. Season name from season context.

### 1B. Build ParentPaymentNudge component

Create `components/parent-scroll/ParentPaymentNudge.tsx`

**Layout:** A horizontal bar below the hero:
- Background: rgba(245,158,11,0.06)
- 3px left border in amber (#F59E0B)
- BorderRadius 12
- Content: 💰 emoji icon (16px) + "$210 is due. Tap to handle it." text (12.5px, weight 500) + "Tap to pay →" on right (11px, textMuted)
- Tappable — on tap navigate to payment screen (use same destination as current payment-related navigation)

**Data:** Payment amount from `useParentHomeData` → `data.paymentStatus`. Only render if there's a balance due. If no balance, render nothing.

### 1C. Update ParentHomeScroll render

- Remove the old centered welcome section (mascot image, welcome greeting, cycling messages, dot indicators)
- Add FamilyHeroCard at the top of the scroll content (after empty state checks)
- Add ParentPaymentNudge below the hero (only when balance exists)
- Keep the RoleSelector and notification bell in the compact header (the scroll-aware sticky header that appears on scroll up) — do NOT remove those

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: Parent Home D+ Phase 1 — family hero header + payment nudge bar"
git push
```

---

## PHASE 2: EXPANDABLE ATTENTION STRIP

### What changes:
- The current AttentionBanner is replaced with an expandable attention strip matching the coach D design.

### 2A. Build ParentAttentionStrip component

Create `components/parent-scroll/ParentAttentionStrip.tsx`

**Layout:** Matches the coach ExpandableAttentionStrip:
- Red left border (4px, #FF6B6B)
- Background: #FFF5F5
- BorderRadius 14
- Collapsed: shows count number (Outfit 24px, weight 800, coral) + "things need attention" + summary text (muted) + chevron ▼
- Tappable: toggles expanded state
- Expanded: reveals list of items, each with urgency dot (red/amber/blue), text, and → arrow
- Each item tappable — navigates to the relevant screen

**Data:** Use `data.attentionCount` and `data.attentionItems` (or `data.familyAttentionItems`) from useParentHomeData. Map each item to urgency level:
- RSVP needed → red dot
- Payment due → red dot  
- Incomplete registration → amber dot
- Open seasons → blue dot
- Coach message → blue dot

### 2B. Update ParentHomeScroll render

- Remove old AttentionBanner from render
- Add ParentAttentionStrip in its place (below payment nudge, above kid cards)
- Do NOT delete AttentionBanner.tsx file

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: Parent Home D+ Phase 2 — expandable attention strip"
git push
```

---

## PHASE 3: FAMILY FIRST KID CARDS

### What changes:
- The current child display (single child compact card OR multi-child avatar row) is replaced with rich Family First kid cards showing each child's avatar, sport, team, next event, badges, and level.

### 3A. Build FamilyKidCard component

Create `components/parent-scroll/FamilyKidCard.tsx`

**Layout:** For EACH child, render a card:
- White background, 1px border rgba(0,0,0,0.04), borderRadius 18, padding 14-16px
- Left: Avatar circle (50px, gradient background with initial OR actual photo if available, sport emoji absolute-positioned bottom-right on a white circle)
- Middle: Child name (Outfit 15px, weight 800), team name (11px, textMuted), next event row (GAME/PRACTICE tag pill + event description in 11px), badge row (3-4 badge emojis + "+N more" text)
- Right: Level number (Outfit 24px, weight 900) + "Level" label below (9px, uppercase)
- Tappable — navigate to `/family-gallery` or child detail (use same navigation as current child card)

**Data per child from useParentHomeData → data.allChildren:**
- firstName, lastName, photoUrl
- teams[0].teamName, teams[0].sportColor, teams[0].jerseyNumber
- Next event: find from data.allUpcomingEvents filtered by this child
- Badge count: from data.childXp or related achievement data
- Level: from data.childXp

If a data point isn't available (no badges, no level, no next event), gracefully hide that element — don't show empty placeholders or "0".

### 3B. Update ParentHomeScroll render

- Remove the old single-child card and multi-child avatar row sections
- Add a loop rendering FamilyKidCard for each child in data.allChildren
- Place below the attention strip
- Do NOT delete AthleteCard.tsx or AthleteCardV2.tsx files

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: Parent Home D+ Phase 3 — Family First kid cards with badges and level"
git push
```

---

## PHASE 4: PARENT XP BAR + EVENT HERO WITH +XP

### What changes:
- Add a compact parent XP progress bar
- Replace the current BillboardHero with a dark navy event hero card that has +XP on the RSVP button

### 4A. Build ParentXPBar component

Create `components/parent-scroll/ParentXPBar.tsx`

**Layout:** Compact single-line bar:
- Star emoji (20px) on left
- Bar wrapper takes remaining space
- Top row: "Your Parent XP" label (11px, weight 700) + XP value on right (11px, weight 700, amber)
- Progress bar: 6px height, background rgba(245,158,11,0.12), filled portion in amber gradient
- Data from profile XP or parent achievement data

### 4B. Build ParentEventHero component

Create `components/parent-scroll/ParentEventHero.tsx`

**Layout:** Dark navy card (borderRadius 22, gradient) containing:
- Top row: Child avatar (22px circle) + "Ava · Black Hornets Elite" text + GAME/PRACTICE tag pill
- Date line: "WED, MAR 18 · 10:00 AM" in 11px uppercase white at 40%
- Event type: "GAME" in Outfit 22px weight 800 white
- Detail: "vs Moo Moo · Beach" in 13px white at 50%
- Buttons row: 
  - RSVP button (sky blue background, white text) WITH "+20 XP" chip inside the button (small rounded badge, rgba(255,255,255,0.2) background)
  - Directions button (white at 8% background, white at 70% text)
- Subtle radial gradient glow in bottom-right corner

**Data:** Use the same hero event data that BillboardHero currently uses from useParentHomeData.
**Navigation:** RSVP tap calls the same `data.rsvpEvent()` function. Directions tap navigates to map/directions (same as current).

### 4C. Update ParentHomeScroll render

- Add ParentXPBar below kid cards
- Replace BillboardHero with ParentEventHero
- Remove AlsoStrip from render (secondary events can live in Schedule tab)
- Do NOT delete BillboardHero.tsx, AlsoStrip.tsx, or EventHeroCard.tsx files

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: Parent Home D+ Phase 4 — parent XP bar + event hero with +XP on RSVP"
git push
```

---

## PHASE 5: MOMENTUM CARDS + FAMILY PULSE FEED

### What changes:
- Add horizontal gradient momentum cards (matching coach pattern)
- Replace TeamHubPreview, FlatChatPreview, and SeasonSnapshot with a Family Pulse activity feed

### 5A. Build ParentMomentumRow component

Create `components/parent-scroll/ParentMomentumRow.tsx`

**Layout:** Horizontal scroll row of gradient cards (same pattern as coach MomentumCardsRow):
- Record card (green gradient): team record from data.seasonRecord
- Balance card (coral gradient): payment balance from data.paymentStatus (only if balance > 0)
- Level card (purple gradient): child's level from data.childXp
- Streak card (amber gradient): win streak if available

Each card: borderRadius 16, padding 14-18, emoji + big number + label. Tappable — navigate to relevant screen.

### 5B. Build FamilyPulseFeed component

Create `components/parent-scroll/FamilyPulseFeed.tsx`

**Layout:** Activity feed with section header ("FAMILY PULSE" + "See All"):
- Each item: icon circle (34px, borderRadius 10, tinted background) + text body (12.5px) + timestamp (10px) + optional XP badge on right (11px, amber, weight 800)
- Items separated by 1px bottom border
- No card wrapper — flat on page background

**Data:** Combine data from:
- Recent badges earned (from achievement data)
- Game results (from event data)
- Shoutouts received
- Photos uploaded
- Any other activity the current TeamHubPreview or AmbientCelebration surfaces

Show XP amounts on badge and game items where applicable ("+50 XP", "+100 XP").

### 5C. Update ParentHomeScroll render

- Add ParentMomentumRow below the event hero
- Add FamilyPulseFeed below momentum cards
- Remove TeamHubPreview, FlatChatPreview, SeasonSnapshot from render
- Remove AmbientCelebration from render (its data moves into the pulse feed)
- Do NOT delete any of these component files

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: Parent Home D+ Phase 5 — momentum cards + Family Pulse feed"
git push
```

---

## PHASE 6: COMPACT TROPHY BAR + AMBIENT CLOSER

### What changes:
- Replace the old TrophyCaseWidget usage with a compact parent-specific trophy bar
- Replace the current end-of-scroll section with a proper ambient closer
- Remove remaining old sections from render

### 6A. Build ParentTrophyBar component

Create `components/parent-scroll/ParentTrophyBar.tsx`

**Layout:** Compact dark navy bar (borderRadius 18, gradient, padding 16):
- Left: Row of 3-4 badge circles (42px, borderRadius 14). Earned = gold-tinted background. Locked = dim.
- Right: Trophy info — "Level 10 · Silver · 6/25 badges" (11px, gold), XP progress bar (5px), XP text (10px, white at 30%)

Do NOT use TrophyCaseWidget. This is a new compact component.
Data: from profile achievements/XP.

### 6B. Build ParentAmbientCloser component

Create `components/parent-scroll/ParentAmbientCloser.tsx`

**Layout:** Centered, padding 24px top, 120px bottom (clear the tab bar):
- Mascot image (40px, centered) — use SleepLynx.png or HiLynx.png
- Italic text (13px, textAmbient, weight 500, centered)
- Message references BOTH children and real data

Content logic:
- If child is on a win streak: "Ava's on a 4-game streak. Josie has practice Thursday."
- If next event is tomorrow: "Game tomorrow. The [LastName] family is ready."
- Default: "That's everything for now. Go be great."

### 6C. Final scroll order

Remove from render (but do NOT delete files):
- Old welcome section (replaced by FamilyHeroCard)
- RegistrationCard at top position (keep the bottom "variant" if it exists)
- RegistrationStatusCard (move to attention strip items)
- IncompleteProfileCard (move to attention strip items)
- ContextBar (child switching is handled by kid cards now)
- DayStripCalendar (removed from parent home — lives in Schedule tab)
- MetricGrid (replaced by momentum cards)
- RecentBadges (data moved to pulse feed)
- Old TrophyCaseWidget usage (replaced by ParentTrophyBar)
- ChallengeVerifyCard (can live in More/drawer)
- ParentEvaluationCard (can live in More/drawer)

**FINAL SCROLL ORDER:**
1. FamilyHeroCard
2. ParentPaymentNudge (conditional — only if balance due)
3. ParentAttentionStrip (conditional — only if items need attention)
4. FamilyKidCard × N (one per child)
5. ParentXPBar
6. ParentEventHero
7. ParentMomentumRow
8. FamilyPulseFeed
9. ParentTrophyBar
10. RegistrationCard (bottom variant, if open seasons exist)
11. ParentAmbientCloser

### 6D. Page background

Set root background to D_COLORS.pageBg (#FAFBFE).

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: Parent Home D+ Phase 6 — trophy bar, ambient closer, final scroll order"
git push
```

---

## PHASE 7: CHANGELOG

Generate `PARENT-HOME-DPLUS-CHANGELOG.md` in the repo root:

1. FILES CREATED — list every new file with its purpose
2. FILES MODIFIED — list every existing file changed, with what changed and why
3. FILES REMOVED FROM RENDER — list every component removed from ParentHomeScroll's JSX but whose file was NOT deleted
4. IMPORTS CHANGED — list every import added/removed/changed in ParentHomeScroll.tsx
5. NAVIGATION PRESERVED — confirm every router.push/navigate destination is identical
6. DATA HOOKS PRESERVED — confirm useParentHomeData and all Supabase queries are unchanged
7. TOKENS ADDED — list new tokens added to d-system.ts
8. HOOKS PLACEMENT — confirm ALL hooks are above ALL early returns (lesson from coach)
9. SHARED COMPONENTS — confirm TrophyCaseWidget.tsx and DayStripCalendar.tsx were NOT modified
10. KNOWN ISSUES — anything that didn't work as expected
11. SCREENSHOTS NEEDED — states to manually test (multi-child, single-child, no children, no org, payment due, no payment, game day, no events)

```bash
git add -A
git commit -m "docs: Parent Home D+ changelog — all phases complete"
git push
```

---

## EXPECTED RESULTS

1. **Dark navy family hero** with "The [Name] Family" and mascot breathing animation
2. **Amber payment nudge** bar — tappable, only shows when balance exists
3. **Expandable attention strip** — count + expandable items with urgency dots
4. **Rich kid cards** — each child with avatar/photo, sport, team, next event, badges, level
5. **Parent XP bar** — compact progress indicator
6. **Dark navy event hero** with RSVP button showing "+20 XP"
7. **Gradient momentum cards** — record, balance, level, streak
8. **Family Pulse feed** — activity from all children with XP badges
9. **Compact trophy bar** — dark, inline badges + XP
10. **Ambient closer** — mascot + contextual message referencing both children
11. **No calendar strip on home** — moved to Schedule tab
12. **Zero new data dependencies** — all data from existing hooks
13. **Zero navigation changes** — all tap targets same destinations
14. **7 commits** — one per phase, each pushed
15. **No shared component modifications** — TrophyCaseWidget and DayStripCalendar untouched
16. **All hooks above early returns** — no Rules of Hooks violations
