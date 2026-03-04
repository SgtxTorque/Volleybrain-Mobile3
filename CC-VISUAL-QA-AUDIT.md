# CC-VISUAL-QA-AUDIT.md
# Lynx Mobile — Visual QA Audit: Every Screen vs Brand Book

**Priority:** CRITICAL — run immediately  
**Estimated time:** 6–8 hours (8 phases, commit after each)  
**Risk level:** MEDIUM-HIGH — touching many screens, but only visual/layout changes (no data logic changes)

---

## WHY THIS EXISTS

8 waves of brand work were completed, but real-device screenshots reveal inconsistent execution. Some screens (the home scroll dashboards) look and feel like Lynx. Others look like the old app with a coat of paint. This spec has CC walk every screen, compare it against the brand book, and fix what doesn't match — not just colors and fonts, but LAYOUT, DENSITY, HIERARCHY, and FEEL.

---

## THE STANDARD: WHAT "GOOD" LOOKS LIKE

The home scroll dashboards (ParentHomeScroll, CoachHomeScroll, AdminHomeScroll) ARE the standard. They were carefully designed and iterated on. Every other screen in the app should feel like it belongs in the same app as those dashboards.

### What makes the dashboards work — internalize these principles:

**1. Scroll-Driven Architecture**
Everything lives on a single vertical scroll. No tabs-within-tabs. No multi-step wizards for things that should be one view. The user scrolls naturally and information reveals in priority order. When something is done or irrelevant, it doesn't render — the stack compresses. No empty placeholders.

**2. Three-Tier Visual System**
- **Tier 1 — Actionable/Hero:** Prominent cards with color, images, CTAs. The event hero carousel, the "Needs Attention" button, the game day hero card. These demand interaction.
- **Tier 2 — Flat Content:** Informational rows and cards. Event list items, chat previews, result cards. Clean, readable, no decoration that doesn't serve a purpose.
- **Tier 3 — Ambient/Personality:** Mascot moments, season progress, badges earned. These reward scrolling without demanding action. They make the app feel alive, not just functional.

**3. Information Hierarchy**
The most time-sensitive, actionable information is at the top. The "nice to know" stuff is below the fold. No screen should force you to scroll past decoration to reach what you need.

**4. Contextual, Not Generic**
Cards show information relevant to RIGHT NOW. If there's a game tomorrow, that game is prominent. If there's nothing for 5 days, the schedule section is compact. Content adapts to context — it's not a static layout.

**5. Large Tap Targets for Actions, Compact for Information**
Buttons you tap to DO something (RSVP, Pay, Directions) are big and tappable. Information you READ (scores, stats, names) is compact and dense. Don't waste space making read-only text huge.

**6. Brand Language**
- Cards: glass morphism with brand surface colors, consistent radius (16px), subtle shadows
- Section headers: uppercase, letter-spaced, secondary text color, SectionHeader component
- Active tab/pill: teal fill, white text. Inactive: outlined or ghost.
- Status: teal=good, coral=danger/action needed, gold=warning/attention, sky=info
- Typography: Plus Jakarta Sans (or brand font from theme). Section headers in brand display style. Body in regular weight. Numbers in bold.
- NO random fonts. NO condensed bold system fonts in headers. NO inconsistent sizing.

**7. When Multi-Step is Appropriate**
Multi-step wizards (2-4 steps with a step indicator) are appropriate for:
- Registration flows (filling out forms with lots of fields)
- Game results entry (scores → stats → confirm)
- Season setup (complex config)

Multi-step is NOT appropriate for:
- Viewing information (use a single scrollable view)
- Simple actions (RSVP, attendance toggle — do it inline)
- Things that could be a bottom sheet (event detail, badge detail, player quick view)

**8. Bottom Sheets vs Full Screens**
Use bottom sheets (60-90% height, drag handle, dimmed background) for:
- Quick detail views (event detail, badge detail, player quick view)
- Simple forms (add a note, edit one field)
- Confirmations

Use full screens for:
- Complex tools (lineup builder, game day command)
- Dedicated experiences (chat thread, child detail trading card)
- Multi-step flows (registration, game results)

---

## REFERENCE FILES — KEEP OPEN THE ENTIRE SESSION

1. **`reference/design-references/brandbook/LynxBrandBook.html`** — THE authority on colors, fonts, gradients, spacing, component patterns
2. **`reference/design-references/brandbook/lynx-screen-playbook-v2.html`** — THE authority on screen layouts, wireframes, animations
3. **`theme/colors.ts`** — Current brand tokens
4. **`lib/design-tokens.ts`** — Spacing, radius, shadows
5. **`theme/fonts.ts`** — Font tokens (FONTS.*)

### The dashboards to study as reference:
6. **`components/ParentHomeScroll.tsx`** — Study the card structure, section ordering, conditional rendering, how the three-tier system is implemented
7. **`components/CoachHomeScroll.tsx`** — Study how coach-specific tools surface contextually
8. **`components/AdminHomeScroll.tsx`** — Study the admin command center card patterns

Before fixing ANY screen, read at least one of these dashboard files to re-anchor on what "good" looks like in this codebase.

---

## HOW TO WORK

For each screen in each phase:
1. Open the file
2. Read the brand book section for that screen
3. Compare what the code renders against what the brand book says AND what the dashboards demonstrate as the visual standard
4. Fix: fonts, colors, card styles, layout spacing, redundant elements, hierarchy issues
5. Move to next screen

After each phase: `npx tsc --noEmit`, commit, push.

---

## PHASE 1: THE WORST OFFENDERS (Screenshots Provided)

These screens were specifically flagged as visually broken. Fix these first.

### 1A. Lineup Builder (`app/lineup-builder.tsx`)

**Problems identified:**
- Header font is NOT the brand font — it's some condensed bold system font. Replace with brand display font from FONTS tokens.
- "LINEUP BUILDER" header is oversized and wastes valuable screen space. The header should be compact: back arrow + "Lineup Builder" in normal header size + one save button. NOT a giant hero header.
- TWO save buttons (top-right orange and bottom-right orange). Remove the top save button. Keep only the bottom action bar.
- Layout requires scrolling when it shouldn't — the court + bench should fit on one screen. Reduce header height to reclaim space.
- The orange buttons don't look like brand teal. Primary actions should be teal, not orange. Check if the brand book specifies button colors and match them.
- The formation pills (5-1 Offense, 6-2 Offense) and set pills (S1-S5) should use PillTabs brand styling.
- Position cards on the court should use brand card styling, not the current dark cards with random border colors.

**Fix approach:**
- Compact header (48-56px, not the current ~120px)
- Remove duplicate save button
- Court fills the freed space — no scrolling needed
- Restyle buttons to brand teal
- Restyle formation/set pills to PillTabs pattern
- Court position cards: brand-consistent styling

### 1B. Coach Game Day Tab (`app/(tabs)/gameday.tsx`)

**Problems identified from 3 screenshots:**
- The overall layout looks like the OLD app design, not Lynx. This screen needs a significant visual overhaul.
- The hero card (practice with photo) looks okay but the "Prep Lineup" and "Get Directions" buttons have heavy shadows that feel inconsistent.
- Below the hero: the "THIS WEEK" event cards with pink trophy icons and "0 going" in red text look nothing like the branded EventCards used elsewhere. These should use the SAME EventCard component styled in Wave 1/3 with type badges (GAME=coral, PRACTICE=teal), not pink trophy icons.
- Scrolling down: "SEASON PROGRESS" card looks okay but plain. The W-L-Win% stat row is clean.
- "SEASON" section with Standings/Season History tiles uses a completely different card style from the rest of the app.
- "UPCOMING" event rows look like Tier 2 flat content — this is acceptable but should use the same EventCard pattern.
- "RECENT RESULTS" cards look clean but the green score text varies in weight. The teal left-border is nice.
- "COACH TOOLS" bottom tiles (Add Event, Attendance, Lineup, Game Prep) have pastel colored icon circles that feel inconsistent with the brand. They should use the same tiled action pattern from the admin dashboard or from the Manage hub.
- Overall: this page scrolls FOREVER. Consider which sections are truly needed on the main tab vs. accessible from a drill-down.

**Fix approach:**
This screen should feel like CoachHomeScroll but for the Game Day tab. Apply the same three-tier philosophy:
- Tier 1: Next event hero card (keep, but verify button styling)
- Tier 1: "THIS WEEK" event cards → use the actual branded EventCard component, not custom pink-trophy cards
- Tier 2: Season Progress, Upcoming Events, Recent Results → these are informational and should be clean Tier 2 flat content
- Coach Tools quick action tiles → restyle to match brand action tile pattern (consistent icons, brand colors, no random pastels)
- Consider: does "Standings" and "Season History" need to be tiles on this screen? Or can they live in the More/Manage menu? Reducing content reduces scroll depth.

### 1C. Parent Home (`components/ParentHomeScroll.tsx`)

**Problems identified:**
- Cat emoji 🐱 as mascot instead of HiLynx.png. Replace with real mascot image.
- "8 Open Registrations" card looks like a generic system alert — gray background, blue clipboard icon, doesn't look like a Lynx card. This should be a branded Tier 1 card if it's actionable (and it is — "Tap to view and register").
- "Summer 2026 Registration Open!" card below it is slightly better (green tint, teal icon) but still has the generic feel.
- The overall welcome area (mascot + "Welcome back" + payment warning) feels sparse and disconnected from the cards below.
- The bottom nav icons/labels look a bit crammed.

**Fix approach:**
- Replace cat emoji with `HiLynx.png` from `assets/images/mascot/`
- "Open Registrations" → restyle as a Tier 1 actionable card with brand card treatment (glass morphism, brand border, teal accent)
- "Registration Open!" → same treatment, Tier 1 card with CTA
- Review the welcome header area for proper spacing and hierarchy
- Note: the core scroll architecture and the game day hero card below these items actually look good — the problems are at the TOP of the scroll

### 1D. Child Detail / Player Profile (`app/child-detail.tsx`)

**Problems identified:**
- The hero photo section (edge-to-edge photo, name, team, jersey, position pills) actually looks GREAT. Keep this.
- The tab bar below (Overview | Stats | Schedule | Badges) uses a different styling than PillTabs. It should match the brand PillTabs pattern: teal underline on active, not a generic tab bar.
- The "WHAT'S NEW" section header and the "GAME" event card below it look like old-style cards, not the branded EventCard used elsewhere.
- The content area below the hero (white card with drag handle) looks like a bottom sheet approach, which is good, but the content inside it needs the brand card treatments.

**Fix approach:**
- Keep the hero photo — it's great
- Restyle tab bar to PillTabs brand pattern
- "WHAT'S NEW" event card → use branded EventCard component
- Ensure section headers match brand pattern (uppercase, letter-spaced)
- Verify all content cards inside the bottom sheet area use brand glass/card styling

### 1E. Team Hub (`app/(tabs)/parent-team-hub.tsx` or `coach-team-hub.tsx`)

**Problems identified:**
- The hero photo with team name overlay looks decent but has some issues: "0 Coaches" showing when there are coaches, the swipe dots are tiny.
- "Gallery | Stats | Achievements" buttons below the hero are yellow-styled — should be brand teal or match the tab/pill brand pattern.
- The "Feed | Roster | Schedule" tab bar styling is inconsistent with PillTabs elsewhere. Uses an underline style that's okay but the colors/weight should match brand.
- "What's on your mind?" composer looks generic — should be brand styled (brand input, brand surface).
- "Give a Shoutout" and "Create Challenge" rows look like default list items, not branded action rows.
- The post card at the bottom has a yellow/gold border that feels jarring and unbranded.
- Overall: this should be the emotional center of the app (community, social, team pride) but it currently feels like an afterthought. Every element needs the brand treatment.

**Fix approach:**
- Hero photo section: verify data accuracy (coach count), clean up dot indicators
- Gallery/Stats/Achievements buttons → teal-styled brand buttons or PillTabs
- Feed/Roster/Schedule tabs → PillTabs brand pattern with teal active indicator
- Post composer → brand input styling
- Shoutout/Challenge rows → brand Tier 2 content rows with proper icons and spacing
- Post cards → brand card styling, remove the gold border (use subtle brand border or no border)
- This screen should feel like opening Instagram for your team — warm, social, inviting

### 1F. Game Recap (`app/game-recap.tsx`)

**Problems identified:**
- The dark card with "WIN" badge and score (50-12) is okay in concept but lacks context — no labels on what the numbers mean (total points? sets?), no team logos or proper team name treatment.
- "AVA'S PERFORMANCE" stat cards below have random icon colors (yellow lightning, teal shield, pink star, purple square, green people) with no labels. What stat is the yellow lightning? What's the pink star? These need stat labels (Kills, Digs, Aces, Blocks, Assists or whatever the stats are).
- The stat icon colors feel random and unbranded. Use brand colors for stat categories or use a consistent neutral + accent pattern.
- The layout is very sparse — lots of empty dark space. The stat cards could be more compact.

**Fix approach:**
- Score hero: add context. "Set scores: 25-9, 25-3". Show both team names fully (not truncated). Show the W/L badge prominently.
- Stat cards: ADD LABELS to every stat. "8 Kills" not just "8" with a lightning bolt.
- Stat icon colors: use brand-consistent colors (teal for offensive stats, sky for defensive, gold for service, etc.) or just use a single accent color.
- Tighten the layout — reduce spacing between cards, make it feel like a complete recap, not scattered tiles.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: fix 6 worst-offender screens - lineup builder, gameday, parent home, child detail, team hub, game recap"
git push
```

---

## PHASE 2: REMAINING TAB SCREENS

These are screens that live in the bottom tab bar. They're high-traffic by definition.

For each screen below: open the file, compare to brand book, fix visual discrepancies. Apply the same three-tier visual system and brand language as the dashboards.

### Screens to audit:

1. **`app/(tabs)/parent-schedule.tsx`** / **`app/(tabs)/coach-schedule.tsx`** / **`app/(tabs)/schedule.tsx`**
   - Day strip: matches brand?
   - Event cards: using branded EventCard?
   - Inline RSVP chips: brand teal/coral/gold?
   - Empty state: SleepLynx.png?

2. **`app/(tabs)/chats.tsx`** / **`app/(tabs)/parent-chat.tsx`** / **`app/(tabs)/coach-chat.tsx`** / **`app/(tabs)/admin-chat.tsx`**
   - Channel rows: brand card styling?
   - Unread badges: coral circles?
   - Search bar: brand input?
   - FAB (coach/admin): teal?
   - SCREENSHOT NOTE: the chat list (Image 2) looks decent but the channel cards have an overly heavy glass/shadow effect. Tone it down to match brand card subtlety.

3. **`app/(tabs)/parent-my-stuff.tsx`** / **`app/(tabs)/coach-my-stuff.tsx`** / **`app/(tabs)/admin-my-stuff.tsx`**
   - iOS Settings grouped rows?
   - Profile card at top?
   - Sign out button?
   - Brand section headers?

4. **`app/(tabs)/manage.tsx`** (Admin)
   - Tile grid: brand cards with icons?
   - Section grouping: People/Teams/Money/Comms/Data?
   - Icons: brand colors, consistent size?

5. **`app/(tabs)/me.tsx`** / **`app/(tabs)/connect.tsx`** / **`app/(tabs)/messages.tsx`** / **`app/(tabs)/my-teams.tsx`**
   - Check if these are redundant re-exports or unique screens
   - If unique: brand pass
   - If redundant: ensure the redirect works correctly

6. **`app/(tabs)/players.tsx`** / **`app/(tabs)/coaches.tsx`** / **`app/(tabs)/teams.tsx`** / **`app/(tabs)/admin-teams.tsx`**
   - List screens: using brand PlayerCard/PressableCard?
   - Search bar: brand input?
   - Sort/filter: PillTabs?

7. **`app/(tabs)/payments.tsx`** / **`app/(tabs)/reports-tab.tsx`** / **`app/(tabs)/jersey-management.tsx`** / **`app/(tabs)/settings.tsx`**
   - Each: verify brand styling applied

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: audit and fix all tab screens for brand consistency"
git push
```

---

## PHASE 3: STACK SCREENS (app/*.tsx — not in tabs)

These are detail, form, and tool screens navigated to from tabs.

Open each file, compare to brand book, fix visual issues. For EACH screen, ask:
- Does this look like it belongs in the same app as the home scroll dashboards?
- Are the fonts from FONTS tokens?
- Are the colors from theme/colors?
- Do the cards use brand card patterns?
- Are the section headers brand-consistent?
- Would a multi-step wizard be better as a single scrollable view?
- Would a full-screen be better as a bottom sheet?

### List of stack screens to audit (in priority order):

**High-traffic:**
1. `app/chat/[id].tsx` — Chat thread. Bubble styling, input bar, header.
2. `app/attendance.tsx` — Oversized toggles, zero chrome, auto-save.
3. `app/game-results.tsx` — 3-step flow, scoreboard layout, brand step indicator.
4. `app/game-prep-wizard.tsx` — Multi-step, brand step indicator, card styling.
5. `app/game-prep.tsx` — Check if redundant with wizard. Brand pass.
6. `app/lineup-builder.tsx` — Already fixed in Phase 1, verify.
7. `app/blast-composer.tsx` — Compose area, recipient selector, send button.
8. `app/blast-history.tsx` — Card list, brand styling.

**Medium-traffic:**
9. `app/my-kids.tsx` — Fix broken nav links (already done?), brand cards.
10. `app/my-waivers.tsx` — Status badges, signing flow.
11. `app/family-payments.tsx` — Balance card, transaction history.
12. `app/coach-profile.tsx` — Hero, bio, teams.
13. `app/profile.tsx` — Avatar upload, form fields.
14. `app/notification-preferences.tsx` — Toggle groups.
15. `app/standings.tsx` — Rank rows, PillTabs.
16. `app/achievements.tsx` — Badge grid, rarity glows, category tabs.
17. `app/my-stats.tsx` — Dark theme, OVR badge, stat cards.
18. `app/team-wall.tsx` — Post cards, composer, reactions, gallery.
19. `app/team-gallery.tsx` — Grid, lightbox.
20. `app/team-roster.tsx` — PlayerCard compact.

**Lower-traffic:**
21. `app/registration-hub.tsx` — Admin inbox, approve/deny. FIX TSC ERROR (duplicate custom_answers property).
22. `app/team-management.tsx` — CRUD cards, create FAB.
23. `app/season-settings.tsx` — Form fields, iOS Settings style.
24. `app/season-archives.tsx` — Card list.
25. `app/season-reports.tsx` — Metric cards, charts.
26. `app/report-viewer.tsx` — Table/detail.
27. `app/users.tsx` — Search-first, role badges.
28. `app/coach-directory.tsx` — Coach list.
29. `app/coach-availability.tsx` — Calendar grid, tap to toggle.
30. `app/admin-search.tsx` — Auto-focused search, grouped results.
31. `app/payment-reminders.tsx` — 2-step flow.
32. `app/player-goals.tsx` — Goals + notes timeline.
33. `app/season-progress.tsx` — Vertical timeline.
34. `app/org-settings.tsx` — Form + web redirect.
35. `app/coach-background-checks.tsx` — Status list.
36. `app/volunteer-assignment.tsx` — 3-step flow.

**Utility/Legal:**
37. `app/help.tsx` — Mascot, accordion FAQ.
38. `app/invite-friends.tsx` — Mascot, share.
39. `app/web-features.tsx` — laptoplynx, NOT an error page.
40. `app/privacy-policy.tsx` — Brand typography.
41. `app/terms-of-service.tsx` — Brand typography.
42. `app/data-rights.tsx` — Download/delete actions.
43. `app/claim-account.tsx` — Form styling.

**Auth screens:**
44. `app/(auth)/welcome.tsx` — Logo, mascot (HiLynx not cat emoji), CTAs, entrance animation.
45. `app/(auth)/login.tsx` — Brand input styling, logo.
46. `app/(auth)/signup.tsx` — 3-step, role picker.
47. `app/register/[seasonId].tsx` — Public registration, must look GREAT.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: audit and fix all stack screens for brand consistency"
git push
```

---

## PHASE 4: SHARED COMPONENTS CHECK

These components are used across many screens. If they're off, everything is off.

Open each component, verify brand styling:

1. **`components/EventCard.tsx`** — Type badges (GAME=coral, PRACTICE=teal), time, location, team pill. This must be the ONLY event card pattern used in the app. Any screen showing events should use this component, not custom inline cards.

2. **`components/PlayerCard.tsx`** / **`components/PlayerCardExpanded.tsx`** — Avatar, name, jersey, stats. Verify brand styling.

3. **`components/PressableCard.tsx`** — The base card wrapper. Radius=16, brand shadow, brand surface.

4. **`components/SectionHeader.tsx`** — Uppercase, letter-spaced, secondary text color.

5. **`components/ui/PillTabs.tsx`** — Active=teal fill, inactive=outlined. This must be the ONLY tab/pill pattern used. Any screen with tabs should use this component.

6. **`components/ui/RoleSelector.tsx`** — Role switcher. Brand pills.

7. **`components/NotificationBell.tsx`** — Bell icon, badge count.

8. **`components/ui/Badge.tsx`** / **`components/ui/Avatar.tsx`** — Brand styling.

9. **`components/GestureDrawer.tsx`** — Drawer navigation. Brand fonts, brand surface.

10. **`components/TeamWall.tsx`** — The complex one. Post cards, composer, reactions. 46 fontWeight strings were already fixed. Now verify the visual output matches brand.

**Key check:** Search the entire codebase for screens that render event-like cards WITHOUT using EventCard.tsx:

```bash
grep -rn "PRACTICE\|GAME\|TOURNAMENT\|trophy.*icon\|event.*card" --include="*.tsx" app/ | grep -v "EventCard" | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/"
```

Any screen rendering its own event cards instead of using the shared component should be refactored to use EventCard.tsx.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: verify shared components, enforce EventCard/PillTabs usage everywhere"
git push
```

---

## PHASE 5: SHADOW AND DEPTH AUDIT

The screenshots showed inconsistent shadows — some cards have heavy drop shadows (over-shadowing), others are flat. The brand book specifies subtle shadows. Fix the inconsistency.

```bash
# Find all shadow definitions
grep -rn "shadowColor\|shadowOffset\|shadowOpacity\|shadowRadius\|elevation" \
  --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" > /tmp/shadow-audit.txt
wc -l /tmp/shadow-audit.txt
```

Review the output. Shadows should be:
- **Consistent:** Same shadow values on the same types of cards across all screens
- **Subtle:** Low opacity (0.05-0.15), small offset (0-4px), moderate radius (8-16px)
- **Not heavy:** No harsh dark drop shadows. No double shadows. No shadows that make cards look like they're floating 20px above the surface.
- **Match design tokens:** Use `shadows.card` from `lib/design-tokens.ts` if it exists, not hardcoded values

Fix any shadows that are too heavy, inconsistent, or missing.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: shadow consistency audit - normalize all card shadows to brand spec"
git push
```

---

## PHASE 6: EMOJI AND PLACEHOLDER AUDIT

Find and replace all emoji used as functional UI elements (not in user-generated content like chat messages).

```bash
# Find emoji in source code (not in strings or comments about emoji)
grep -rn "🐱\|🐾\|⚡\|🔥\|🏆\|💪\|🎯\|🎉\|⭐\|🔔\|📊\|📋\|🏐\|🎮\|👋" \
  --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" | grep -v "chat" | grep -v "TeamWall"
```

For each emoji found in UI (not in user content):
- If it's serving as a mascot → replace with real mascot image from `assets/images/mascot/`
- If it's serving as an icon → replace with an Ionicons or lucide icon
- If it's decorative in a section header → remove or replace with a small icon

Also check for any remaining placeholder text like "TODO", "FIXME", "placeholder", "lorem ipsum":

```bash
grep -rn "TODO\|FIXME\|placeholder.*text\|lorem\|ipsum\|coming soon" \
  --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/"
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 6: replace all emoji UI elements with real assets/icons, remove placeholders"
git push
```

---

## PHASE 7: REGISTRATION HUB TSC FIX + FINAL COLOR PASS

### 7A. Fix registration-hub.tsx TypeScript Error

The Beta Readiness Report flagged 4 TypeScript errors in `registration-hub.tsx` — duplicate `custom_answers` property.

```bash
npx tsc --noEmit 2>&1 | grep "registration-hub"
```

Find the duplicate property and remove it. This is a simple type definition fix.

### 7B. Final Color Pass on game-prep.tsx and lineup-builder.tsx

These two files were flagged with 152 and 107 hardcoded hex colors respectively. Many are intentional (court position colors, dark-mode palette). But review them against the brand book:

- Any color that has a brand equivalent should use the brand token
- Court/position visualization colors can stay hardcoded if they're intentional design choices
- Button colors MUST use brand tokens (teal primary, coral danger, gold warning)
- Background colors MUST use brand surface tokens
- Text colors MUST use brand text tokens

Don't change everything blindly — be surgical. Replace what should be brand tokens, leave what's intentionally custom for visualization purposes.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 7: fix registration-hub TSC error, final color pass on game-prep and lineup-builder"
git push
```

---

## PHASE 8: FINAL VERIFICATION

```bash
# 1. TypeScript clean
npx tsc --noEmit 2>&1 | grep -v "_legacy\|reference\|design-reference" | tail -10
# Target: 0 errors in production code

# 2. No cat emoji in functional UI
grep -rn "🐱" --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" | grep -v "chat"
# Expected: 0 results

# 3. No duplicate event card implementations
grep -rn "trophy.*icon\|pink.*icon.*game\|custom.*event.*card" --include="*.tsx" app/ | grep -v "EventCard" | grep -v "_legacy"
# Expected: 0 results (all screens use EventCard)

# 4. Shadows normalized
grep -rn "shadowOpacity.*0\.[3-9]\|shadowOpacity.*1" --include="*.tsx" app/ components/ | grep -v "_legacy"
# Expected: 0 results (no heavy shadows)

# 5. Brand font usage
grep -rn "fontWeight.*['\"]" --include="*.tsx" app/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/"
# Expected: 0 results in app/ (all using FONTS.*)

# 6. Count total files changed
git diff --stat HEAD~7

git add -A
git commit -m "Phase 8: Visual QA audit verification and final cleanup"
git push
```

---

## EXPECTED RESULTS

After this audit, EVERY screen in the app should feel like it belongs in the same app as the home scroll dashboards. Specifically:

1. **Lineup Builder** — Compact header, single save button, court fits without scrolling, brand-colored buttons and pills
2. **Coach Game Day** — Three-tier layout matching dashboard philosophy, branded EventCards (not custom pink-trophy cards), reduced scroll depth, brand-consistent Coach Tools tiles
3. **Parent Home** — Real HiLynx mascot (not cat emoji), branded registration cards (not generic system alerts), proper hierarchy
4. **Child Detail** — Hero photo (keep), PillTabs brand pattern on tab bar, branded EventCards in content area
5. **Team Hub** — Brand-styled buttons, PillTabs, post composer, post cards with brand borders (not gold), feels like a social hub worth visiting
6. **Game Recap** — Labeled stats (not mystery icons), brand-consistent colors, tighter layout, proper team name display
7. **All tab screens** — Brand-consistent fonts, colors, cards, section headers
8. **All stack screens** — Same standard applied to every detail, form, and tool screen
9. **Shared components enforced** — EventCard used for ALL events, PillTabs used for ALL tabs
10. **Shadows normalized** — Consistent, subtle, brand-spec across every card
11. **No emoji in functional UI** — Real mascot images and icons everywhere
12. **TSC clean** — registration-hub error fixed, 0 production TypeScript errors
13. **8 commits** — one per phase, each pushed
