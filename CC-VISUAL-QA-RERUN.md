# CC-VISUAL-QA-RERUN.md
# Lynx Mobile — Visual QA Re-Run: Post-H1 Comprehensive Audit

**Priority:** HIGH — must run before beta. Every H1 feature has been built, now make it all look cohesive.  
**Estimated time:** 4–6 hours (6 phases, commit after each)  
**Risk level:** LOW-MEDIUM — visual/styling changes only, no logic or data changes

---

## WHY A RE-RUN

The original Visual QA ran before 6 major builds landed:
- Player Experience Build (trading card, roster carousel, game recap, team pulse, badges)
- Game Day Command Center (10-phase build with rotation engine)
- Tablet Responsive (responsive foundation, orientation support)
- Team Hub Redesign (hero banner, social feed, gallery, roster section)
- Challenge System (library, CTA page, dashboard, cards, celebrations)
- Player Evaluations (swipe-through form, session management, trading card integration)

Each of these was built from specs that referenced the brand book, but they were built by different CC sessions over multiple days. Visual drift is inevitable. This audit makes everything look like one designer built it.

---

## CRITICAL RULE: DO NOT CHANGE LOGIC OR DATA

This spec is VISUAL ONLY:
- Fix fonts, colors, spacing, card styles, shadows, section headers
- Fix component consistency (same EventCard everywhere, same PillTabs everywhere)
- Fix the cat emoji → real mascot on coach home
- DO NOT change navigation, data queries, business logic, or feature behavior
- If something is functionally broken, note it in the report but don't fix it here

---

## THE STANDARD

These screens represent what "good" looks like. Every other screen should match their quality:

1. **`components/ParentHomeScroll.tsx`** — Scroll architecture, card hierarchy, section headers
2. **`components/CoachHomeScroll.tsx`** — Coach tools, action items, team health
3. **`components/PlayerTradingCard.tsx`** — Power bars, OVR badge, dark theme
4. **`components/RosterCarousel.tsx`** — Card sizing, snap behavior
5. **`components/team-hub/TeamHubScreen.tsx`** — Hero banner, social feed, gallery

**Brand book is the FINAL authority:** `reference/design-references/brandbook/LynxBrandBook.html`

---

## PHASE 1: KNOWN ISSUES — FIX THESE FIRST

These were specifically flagged during testing. Fix each one.

### 1A. Coach Home — Cat Emoji → Real Mascot

The coach home scroll STILL shows a cat emoji 🐱 instead of the real Lynx mascot. Find and replace:

```bash
grep -rn "🐱\|cat.*emoji\|emoji.*cat" --include="*.tsx" components/CoachHomeScroll.tsx
```

Replace with `HiLynx.png` from `assets/images/mascot/`:
```typescript
<Image source={require('../assets/images/mascot/HiLynx.png')} style={{ width: 48, height: 48 }} resizeMode="contain" />
```

Also check ALL other home scrolls for the same issue:
```bash
grep -rn "🐱" --include="*.tsx" components/ app/ | grep -v "node_modules" | grep -v "reference/" | grep -v "chat" | grep -v "TeamWall"
```

### 1B. Shadows / Opacity Inconsistency

Previous testing showed heavy drop shadows on some cards (especially chat channel cards and registration cards on parent home). Normalize:

```bash
grep -rn "shadowOpacity.*0\.[3-9]\|shadowOpacity.*1\b" --include="*.tsx" app/ components/ | grep -v "node_modules" | grep -v "reference/" | grep -v "_legacy"
```

Brand standard: `shadowOpacity: 0.08` to `0.12`. Nothing above `0.15` unless it's a deliberate elevated element (like a FAB).

### 1C. Registration Cards on Parent Home

The "8 Open Registrations" and "Summer 2026 Registration Open!" cards were flagged as looking like "generic system alerts." Verify they now use brand card styling (glass morphism, brand border, teal accent). If they still look generic, restyle them.

### 1D. Section Headers Consistency

Every section header across the app should use the same pattern:
- Uppercase
- Letter-spacing: 1-1.5px
- Font: FONTS.bold or semiBold, small size (10-11px)
- Color: brand text muted/secondary

Check the 5 most-visited screens for consistent section headers:
```bash
grep -rn "SECTION\|sectionHeader\|SectionHeader\|letterSpacing" --include="*.tsx" \
  components/ParentHomeScroll.tsx components/CoachHomeScroll.tsx \
  components/team-hub/TeamHubScreen.tsx app/achievements.tsx app/\(tabs\)/gameday.tsx | head -20
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: fix known issues - cat emoji, shadows, registration cards, section headers"
git push
```

---

## PHASE 2: HOME SCROLLS — ALL 4 ROLES

Walk through each home scroll and verify brand consistency.

### For each home scroll, verify:
- [ ] Mascot image (not emoji) in welcome area
- [ ] Section headers: uppercase, letter-spaced, muted color
- [ ] Cards: consistent radius (16px), consistent shadow, brand surface colors
- [ ] Action items: teal for positive, coral for attention needed, gold for warning
- [ ] Quick action rows/buttons: consistent icon treatment, brand colors
- [ ] Event cards: using the shared EventCard component (not inline custom cards)
- [ ] Player cards: using the shared PlayerCard component (not old gold cards)
- [ ] Power bars: used for any stat display (not plain numbers)
- [ ] Empty states: mascot image + friendly text (not blank space)
- [ ] Spacing: consistent padding between sections (16-20px)

### Screens to audit:
1. `components/ParentHomeScroll.tsx` — registration cards, event hero, player carousel, quick glance stats
2. `components/CoachHomeScroll.tsx` — team health, roster card, action items, kills/aces power bars, coach tools
3. `components/AdminHomeScroll.tsx` — admin command center cards, stats, quick actions
4. `components/PlayerHomeScroll.tsx` (if exists) — trading card, my team, challenges, achievements

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: home scroll visual consistency - all 4 roles"
git push
```

---

## PHASE 3: NEW FEATURE SCREENS — BRAND ALIGNMENT

These screens were built in the last round of H1 specs. Verify they match the brand book and feel cohesive with the rest of the app.

### 3A. Game Day Command Center
Files: `app/game-day-command.tsx` + `components/gameday/*`

Check:
- Court view: uses brand navy background, teal net line, player cards with brand styling
- Score buttons: ≥56px tap targets, brand teal (home +) and coral (away +)
- Formation/rotation pills: match PillTabs brand pattern
- Bench player list: brand card styling
- All text uses FONTS tokens

### 3B. Team Hub
Files: `components/team-hub/*`

Check:
- Hero banner carousel: smooth transitions, brand overlays
- Identity bar: team logo offset, proper spacing
- Post cards: three distinct styles (regular, announcement with teal border, shoutout with gold)
- Gallery grid: consistent thumbnail sizing
- Roster carousel: matches RosterCarousel component styling
- Quick action pills: match PillTabs pattern

### 3C. Challenge System
Files: `app/challenge-*.tsx` + `components/ChallengeCard.tsx`

Check:
- Challenge library: category pills are brand colored, template cards use difficulty colors
- CTA page: dark PLAYER_THEME, coach mascot images loading correctly, "ACCEPT CHALLENGE" button prominent
- Challenge cards: gold border on active, brand styling on completed
- Leaderboard: rank medals (gold/silver/bronze), progress bars use brand colors
- Coach dashboard: stats bar, verification queue styling

### 3D. Player Evaluations
Files: `app/player-evaluations.tsx` + `app/evaluation-session.tsx`

Check:
- Player carousel: status indicators (done=teal, active=gold, todo=gray)
- Skill rating blocks: gradient fills match brand colors
- Power bars below ratings: same style as trading card power bars
- Delta indicators: green for improvement, coral for decline
- Session setup: brand input styling, team selector

### 3E. Player Experience (Trading Card, Roster, Badges, Game Recap)
Files: `app/player-card.tsx`, `app/roster.tsx`, `app/achievements.tsx`, `app/game-recap.tsx`

Check:
- Trading card: OVR badge colors match tier system, power bars filled correctly
- Roster carousel: snap behavior, card sizing, dark theme
- Achievements: badge rarity glows (Common=gray, Rare=teal, Epic=gold, Legendary=coral+glow)
- Game recap: labeled stats (not mystery icons), set scores visible, team names not truncated

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: new feature screens brand alignment - gameday, team hub, challenges, evaluations, player experience"
git push
```

---

## PHASE 4: SHARED COMPONENTS ENFORCEMENT

### 4A. EventCard Used Everywhere

```bash
# Find screens showing event-like content WITHOUT using EventCard
grep -rn "event_type\|eventType\|GAME\|PRACTICE\|game.*card\|practice.*card" --include="*.tsx" app/ components/ | \
  grep -v "EventCard" | grep -v "node_modules" | grep -v "reference/" | grep -v "gameday" | head -20
```

Any screen rendering events should import and use `EventCard.tsx`. No inline event card implementations.

### 4B. PillTabs Used Everywhere

```bash
# Find tab/pill implementations that aren't using PillTabs
grep -rn "tab.*active\|pill.*active\|segmented.*control" --include="*.tsx" app/ components/ | \
  grep -v "PillTabs" | grep -v "node_modules" | grep -v "reference/" | head -20
```

### 4C. PlayerCard Used in Lists

```bash
# Find player list renderings not using PlayerCard
grep -rn "player.*name\|jersey.*number\|roster.*row" --include="*.tsx" app/ components/ | \
  grep -v "PlayerCard\|PlayerTradingCard\|RosterCarousel" | grep -v "node_modules" | grep -v "reference/" | grep -v "gameday" | head -20
```

### 4D. Brand Buttons

Check that all primary action buttons use teal, all destructive actions use coral, all secondary actions use outlined:

```bash
grep -rn "backgroundColor.*#\|background.*#" --include="*.tsx" app/ components/ | \
  grep -v "node_modules" | grep -v "reference/" | grep -v "theme/" | grep -v "design-tokens" | \
  grep -i "button\|btn\|press\|action" | head -20
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: enforce shared components - EventCard, PillTabs, PlayerCard, brand buttons"
git push
```

---

## PHASE 5: FONT + COLOR + EMOJI FINAL PASS

### 5A. Raw fontWeight in app/ directory

```bash
grep -rn "fontWeight.*['\"]" --include="*.tsx" app/ | grep -v "node_modules" | grep -v "reference/" | wc -l
```
Expected: 0 (all should use FONTS tokens). Fix any remaining.

### 5B. Emoji in functional UI

```bash
grep -rn "🐱\|🐾\|🔥\|⚡\|🏆\|💪\|🎯\|🎉\|⭐\|🔔" --include="*.tsx" app/ components/ | \
  grep -v "node_modules" | grep -v "reference/" | grep -v "chat" | grep -v "TeamWall" | \
  grep -v "challenge_templates\|ChallengeCard\|system.*post" | head -20
```

Emoji in user-generated content (chat, posts) and challenge templates are fine. Emoji as functional UI elements (icons, mascots) should be replaced with real images or Ionicons.

### 5C. Hardcoded colors in new screens

```bash
# Check the new feature files specifically
grep -rn "#[0-9a-fA-F]\{6\}" --include="*.tsx" \
  app/game-day-command.tsx app/challenge-*.tsx app/player-evaluations.tsx app/evaluation-session.tsx \
  components/gameday/*.tsx components/team-hub/*.tsx components/ChallengeCard.tsx 2>/dev/null | wc -l
```

New screens may have hardcoded colors that should use brand tokens. Check and fix the most egregious ones (buttons, backgrounds, text colors).

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: font tokens, emoji cleanup, hardcoded color pass on new screens"
git push
```

---

## PHASE 6: GENERATE VISUAL QA REPORT + VERIFY

### 6A. Create `VISUAL-QA-REPORT.md`

```markdown
# Visual QA Re-Run Report
Generated after H1 completion.

## Known Issues Fixed
- Cat emoji → HiLynx mascot: [FIXED/still present]
- Heavy shadows normalized: [N files fixed]
- Registration cards restyled: [FIXED/N/A]
- Section headers standardized: [N screens fixed]

## Home Scrolls
- Parent: [PASS/issues]
- Coach: [PASS/issues]
- Admin: [PASS/issues]
- Player: [PASS/issues]

## New Feature Screens
- Game Day Command Center: [PASS/issues]
- Team Hub: [PASS/issues]
- Challenge System: [PASS/issues]
- Player Evaluations: [PASS/issues]
- Player Experience (card, roster, badges, recap): [PASS/issues]

## Shared Components
- EventCard enforced: [Y/N, exceptions]
- PillTabs enforced: [Y/N, exceptions]
- PlayerCard enforced: [Y/N, exceptions]

## Remaining Issues
- [list anything that couldn't be fixed]

## Recommendation
- [Ready for beta / Needs one more pass / Specific screens need attention]
```

### 6B. Final Verification

```bash
# 1. TypeScript
npx tsc --noEmit 2>&1 | grep -v "reference\|design-reference" | tail -5

# 2. No cat emoji in UI
grep -rn "🐱" --include="*.tsx" components/ app/ | grep -v "node_modules" | grep -v "reference/" | grep -v "chat" | wc -l

# 3. No heavy shadows
grep -rn "shadowOpacity.*0\.[3-9]" --include="*.tsx" app/ components/ | grep -v "node_modules" | grep -v "reference/" | wc -l

# 4. FONTS tokens in app/
grep -rn "fontWeight.*['\"]" --include="*.tsx" app/ | grep -v "node_modules" | grep -v "reference/" | wc -l

# 5. Files changed total
git diff --stat HEAD~5

git add -A
git commit -m "Phase 6: Visual QA re-run report and final verification"
git push
```

---

## EXPECTED RESULTS

1. **Cat emoji gone** — real HiLynx mascot on all home scrolls
2. **Shadows normalized** — consistent subtle shadows across all cards
3. **Section headers standardized** — same pattern on every screen
4. **Home scrolls polished** — all 4 roles visually consistent
5. **New feature screens aligned** — Game Day, Team Hub, Challenges, Evaluations, Player Experience all match the brand book
6. **Shared components enforced** — EventCard, PillTabs, PlayerCard used consistently
7. **Fonts clean** — no raw fontWeight in app/ directory
8. **Emoji cleaned up** — real images/icons replace functional emoji
9. **Visual QA Report** — documented state of every screen category
10. **6 commits** — one per phase, each pushed
