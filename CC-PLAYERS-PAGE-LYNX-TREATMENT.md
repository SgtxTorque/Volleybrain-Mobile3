# CC-PLAYERS-PAGE-LYNX-TREATMENT.md
# Lynx Mobile — Players/Roster Page: Full Lynx D System Treatment
# Branch: navigation-cleanup-complete

**Priority:** HIGH — This page is accessed from multiple entry points and looks outdated
**Estimated time:** 4-5 hours (6 phases, commit after each)
**Risk level:** MEDIUM — Reskinning 4 files, but all components are self-contained (only imported by players.tsx)

---

## WHY THIS EXISTS

The Players/Roster page at `app/(tabs)/players.tsx` predates the D System redesign. It uses glassmorphism, hardcoded dark hex colors, no animations, redundant UI elements (position shown 3 times, phone icon on every card), and three view modes where two look nearly identical. The expanded player modal is always dark regardless of theme, with hardcoded colors throughout. The list view has empty stat columns that never populate. None of this matches the Lynx brand established across the home scrolls.

This spec brings the page in line with the D System: clean, white/light cards with team-color accents, edge-to-edge player photos (trading card style), single position indicator, two clean view modes, and proper Lynx animations.

---

## PREREQUISITE READING

1. **Read CC-LYNX-RULES.md** — All 15 rules apply.
2. **Read AGENTS.md** — Minimal edits, explain every file touch.
3. **Read the ENTIRE app/(tabs)/players.tsx** — Understand every query, every view toggle, every filter.
4. **Read the ENTIRE components/PlayerCard.tsx** — Understand every element on the card.
5. **Read the ENTIRE components/PlayerCardExpanded.tsx** — Understand every tab, every data source.
6. **Read the ENTIRE components/PlayerStatBar.tsx** — Understand the list view row.
7. **Read theme/d-system.ts** — D System tokens to use.
8. **Read theme/colors.ts** — BRAND tokens still in use.

---

## FILE SCOPE — HARD BOUNDARIES

### FILES YOU MAY MODIFY:
- `app/(tabs)/players.tsx` — Page shell, view toggle, filters, layout
- `components/PlayerCard.tsx` — Grid card component
- `components/PlayerCardExpanded.tsx` — Expanded modal
- `components/PlayerStatBar.tsx` — List view row
- `theme/d-system.ts` — ONLY to ADD new tokens

### FILES YOU MUST NOT MODIFY:
- ALL home scroll files (CoachHomeScroll, ParentHomeScroll, AdminHomeScroll, PlayerHomeScroll)
- ALL scroll sub-component directories (coach-scroll/, parent-scroll/, admin-scroll/, player-scroll/)
- `hooks/useAdminHomeData.ts`, `hooks/useParentHomeData.ts`, `hooks/useCoachHomeData.ts`
- `components/TrophyCaseWidget.tsx`, `components/TeamPulse.tsx`
- ALL files in `app/` EXCEPT `app/(tabs)/players.tsx`
- `lib/auth.tsx`, `lib/theme.tsx`, `lib/permissions-context.tsx`
- `components/RosterCarousel.tsx`, `components/team-hub/RosterSection.tsx` — Not used on this page

### CRITICAL RULES:
1. **ALL HOOKS ABOVE EARLY RETURNS** — No exceptions.
2. **NO GLASSMORPHISM** — Remove every instance of glassCard, glassBorder, glass-anything.
3. **NO HARDCODED HEX COLORS** — Replace every raw hex (#1a1a2e, #2a2a4a, #0f0f1a, #888, #666, #aaa, etc.) with D_COLORS, BRAND, or theme colors tokens.
4. **PRESERVE ALL DATA QUERIES** — The inline Supabase queries in players.tsx stay exactly as they are. Do NOT extract to a hook (that's a future refactor).
5. **PRESERVE ALL NAVIGATION** — Every router.push() destination stays the same.
6. **NO SIDE-BORDER ACCENT CARDS** — Full styled backgrounds only.
7. **HORIZONTAL SCROLL PADDING** — paddingVertical: 8 on filter chip scroll.

---

## DESIGN DECISIONS (LOCKED)

These were decided by Carlos. Do not deviate:

1. **Two view modes only:** Card Grid + List. Remove the Lineup (people icon) view entirely.
2. **One position indicator:** Keep the position pill badge (top-left, e.g., "DS", "OH"). Remove the photo pip overlay AND the accent line at bottom.
3. **Phone icon removed from card face.** Move emergency contact info to the expanded modal's Info tab only.
4. **Card style:** D System — white/light card background with team-color accent on position pill and subtle team-color border. NOT the old dark gradient.
5. **Edge-to-edge photos:** Player photo fills the card background (like a sports trading card). Name bar overlays the bottom of the photo with a subtle dark gradient fade.
6. **Skills tab with no evaluation data:** Show empty/unfilled bars (0% fill, no letter grade). NOT the current "D" default at 50%.
7. **Empty stat columns in list view:** Either populate from real data OR remove the empty columns entirely. Do NOT show "--" placeholders.

---

## PHASE 1: PAGE SHELL — TWO VIEWS + FILTER CLEANUP

### What changes in players.tsx:

**1A. Remove Lineup view**
- Remove the "people" icon toggle option
- Remove all Lineup rendering code (the ScrollView grouped by team with team-color headers)
- Keep only Grid and List as the two view options
- Update the toggle to show two icons: grid icon (4 squares) and list icon (horizontal lines)

**1B. Restyle filter chips**
- Remove glassmorphism from search box (replace glassCard/glassBorder with D_COLORS.pageBg background, 1px border rgba(0,0,0,0.06))
- Filter chips: active chip gets team-color background with white text. Inactive chip gets rgba(0,0,0,0.04) background with textPrimary text.
- Chips should have borderRadius 20, paddingHorizontal 14, paddingVertical 6
- Horizontal scroll with paddingVertical: 8 in contentContainerStyle

**1C. Page background**
- Set page background to D_COLORS.pageBg (#FAFBFE)
- Remove transparent background
- Header "PLAYERS" title should use Outfit/ExtraBold styling

**1D. Fix bottom padding**
- Replace hardcoded paddingBottom: 100 with paddingBottom: 24 (matching home scrolls)
- Remove the hardcoded { height: 100 } spacer

**1E. View toggle styling**
- Two icon buttons: grid and list
- Active icon: sky blue (#4BB9EC) fill
- Inactive icon: textMuted color
- Icons inside a subtle container with borderRadius 10, background rgba(0,0,0,0.04)

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Players page Phase 1 — two views, filter cleanup, D System page shell" && git push
```

---

## PHASE 2: PLAYER CARD — TRADING CARD STYLE

### What changes in PlayerCard.tsx:

**2A. Card layout — edge-to-edge photo**
- Card: white background, borderRadius 16 (D_RADII.card), subtle shadow, overflow hidden
- Player photo fills the entire card as background (resizeMode "cover")
- If no photo: show team-color gradient background with large centered initial letter (white, Outfit 32px)
- Bottom of card: dark gradient overlay (transparent → rgba(0,0,0,0.7)) covering bottom 40% of the card
- Name text sits on the gradient: "First L." in white, 13px weight 700
- Grade text below name: "Gr 8" in white at 60%, 10px

**2B. Position pill — ONE indicator only**
- Top-left corner: position pill badge (e.g., "DS", "OH", "S")
- Background: team color (from props)
- Text: white, 8px, weight 800, uppercase
- BorderRadius 6, padding 3px 7px
- Remove the photoPosOverlay (pip on photo)
- Remove the accent line at bottom

**2C. Jersey number**
- Top-right corner: jersey number in white, Outfit 20px weight 800, with subtle text shadow
- Remove the registration badge overlap (registration status can live in expanded modal)

**2D. Remove phone icon**
- Remove the green phone circle entirely from the card face
- Remove the medical alert icon from the card face (move to expanded modal)

**2E. Team-color subtle border**
- Card has a 1.5px border using team color at 20% opacity: `borderColor: teamColor + '33'` or `rgba(teamColor, 0.2)`

**2F. Press animation**
- On press: scale to 0.97 with spring. On release: spring back to 1.0
- Use Pressable with onPressIn/onPressOut and useSharedValue

**2G. Stagger entrance**
- Cards stagger in: each card fades in + scales from 0.95, 50ms stagger between cards
- Fire once on mount, not on every scroll

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Players page Phase 2 — trading card style with edge-to-edge photos, D System styling" && git push
```

---

## PHASE 3: EXPANDED MODAL — D SYSTEM TREATMENT

### What changes in PlayerCardExpanded.tsx:

**3A. Replace ALL hardcoded colors**
- Remove every instance of '#1a1a2e', '#0f0f1a', '#2a2a4a', '#888', '#666', '#aaa', '#444', 'rgba(0,0,0,0.9)'
- Replace with D_COLORS and BRAND tokens
- The modal should follow the page theme (light mode = light modal, dark mode = dark modal)
- Background: D_COLORS.pageBg for the content area
- Header gradient: team color → D_COLORS.navyDeep (keep this dark for visual impact)

**3B. Convert static StyleSheets to theme-aware**
- The three separate StyleSheet.create() blocks (statStyles, skillStyles, infoStyles) must use theme-aware colors
- StatBox background: white card with subtle border (not hardcoded #1a1a2e)
- SkillBar track: rgba(0,0,0,0.06) (not hardcoded #2a2a4a)
- InfoRow border: rgba(0,0,0,0.06) (not hardcoded #2a2a4a)
- Tab border: rgba(0,0,0,0.06)
- Text colors: D_COLORS.textPrimary, textMuted, textFaint (not BRAND.white)

**3C. Skills tab — empty bars for unevaluated**
- When player_skills data doesn't exist (or all values are the default 50): show bars at 0% fill with no letter grade
- Label still shows ("Passing", "Serving", etc.) but the bar is empty and the grade circle shows "—" instead of "D"
- This makes it obvious the player hasn't been evaluated yet, without looking broken

**3D. Info tab — phone/emergency contact here**
- Keep the existing Info tab fields (Parent, Phone, Email, School, Medical, Allergies)
- These fields should show actual data when available, "Not provided" in textMuted when blank (not just empty)
- The phone number should be tappable (opens dialer) — this replaces the phone icon that was on the card face

**3E. OVR badge styling**
- Keep the OVR badge but update styling: D_COLORS.gold background, navy text, borderRadius 10
- Only show when evaluation data exists (not a default 50)

**3F. Badges section**
- "No badges earned yet" should use textMuted color, not hardcoded #888
- Badge icons should match the trophy case badge styling from the home scrolls

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Players page Phase 3 — expanded modal D System treatment, theme-aware styles" && git push
```

---

## PHASE 4: LIST VIEW ROW — CLEAN STAT BAR

### What changes in PlayerStatBar.tsx:

**4A. Replace hardcoded dark styles**
- Remove every hardcoded hex (#1C1C1E, #0D0D0D, #2C2C2E, #1A1A1A, etc.)
- Card background: white with subtle border (D System light card)
- Text colors: D_COLORS.textPrimary for name, textMuted for labels

**4B. Remove side accent bar**
- Remove the 4px team-color left border accent
- Instead: team-color position pill on the left (matching the grid card treatment)

**4C. Fix empty stat columns**
- The three stat columns (SRV, ACE, KIL) that always show "--" — check if the data is available in the query
- If data IS available: wire it properly
- If data is NOT available from the current query: remove these empty columns entirely. Show only the populated columns (Jersey, Position, Grade)
- Do NOT show "--" placeholder columns. They make the page look broken.

**4D. Photo styling**
- Player photo: circular, 44px, with team-color border (2px)
- If no photo: team-color circle with white initial

**4E. Row styling**
- White background, borderRadius 14, subtle shadow
- Margin between rows: 8px
- Content padding: 12px
- Tappable → same expanded modal as grid cards

**4F. Press animation**
- Same scale spring as grid cards (0.97 on press, spring back)

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Players page Phase 4 — list view D System treatment, remove empty stat columns" && git push
```

---

## PHASE 5: ANIMATIONS + POLISH

### 5A. Page-level animations
- Filter chips: stagger entrance, 30ms apart, fade in + slide right
- View toggle: smooth transition between grid and list (use LayoutAnimation for the content swap)

### 5B. Grid cards
- Stagger entrance: 50ms apart, fade in + scale 0.95 → 1.0 (already in Phase 2)
- Press spring: scale 0.97 (already in Phase 2)

### 5C. List rows
- Stagger entrance: 40ms apart, slide in from right (translateX 20 → 0) + fade in
- Press spring (already in Phase 4)

### 5D. Expanded modal
- Entrance: slide up from bottom + fade in (300ms)
- Tab switch: cross-fade between tab contents (200ms)
- Skill bars: fill animation from 0 to actual value over 500ms when Skills tab becomes active
- Badge icons: pop-in spring when badges section first renders

### 5E. General polish
- Verify D_COLORS.pageBg is the page background
- Verify all border radii use D_RADII values
- Verify no glassmorphism remains anywhere
- Verify no hardcoded hex colors remain (search the 4 files for '#' followed by 3 or 6 hex chars that aren't in a comment)
- Add count in header: "PLAYERS · 17" showing total player count

**ALL animation rules from previous specs apply:**
- react-native-reanimated only
- All hooks above early returns
- Loop animations have cancelAnimation cleanup
- Entrance animations fire once

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: Players page Phase 5 — animations, transitions, final polish" && git push
```

---

## PHASE 6: CHANGELOG

Generate `PLAYERS-PAGE-LYNX-CHANGELOG.md` in the repo root:

1. FILES MODIFIED — each file with what changed
2. VIEWS REMOVED — Lineup view removed, Grid + List remain
3. ELEMENTS REMOVED FROM CARD — position pip, accent line, phone icon, medical icon, registration badge overlap
4. GLASSMORPHISM REMOVED — list every glass* reference that was replaced
5. HARDCODED COLORS REMOVED — count of raw hex values replaced with tokens
6. ANIMATIONS ADDED — list every animation
7. NAVIGATION PRESERVED — confirm all router.push targets unchanged
8. DATA QUERIES PRESERVED — confirm inline Supabase queries unchanged
9. SKILLS TAB CHANGE — empty bars for unevaluated (not "D" at 50%)
10. EMPTY STATS — document what happened to the "--" columns
11. KNOWN ISSUES — search bar TODO, any remaining items
12. SCREENSHOTS NEEDED — grid view, list view, expanded modal (stats tab, skills tab, info tab), player with photo vs without, filter chip states

```bash
git add -A && git commit -m "docs: Players page Lynx treatment changelog" && git push
```

---

## EXPECTED RESULTS

1. **Two clean view modes** — Card Grid + List, no Lineup
2. **Trading card style** — edge-to-edge player photos, dark gradient name overlay at bottom
3. **D System cards** — white/light with team-color position pill and subtle border
4. **One position indicator** — pill badge top-left only
5. **No phone icon on cards** — moved to expanded modal Info tab
6. **Expanded modal respects theme** — no hardcoded dark colors
7. **Skills tab** — empty bars for unevaluated, not "D" defaults
8. **No empty stat columns** — list view only shows populated data
9. **No glassmorphism** — zero glass* references
10. **No hardcoded hex** — all colors from tokens
11. **Full micro-animations** — stagger entrance, press springs, modal transitions, skill bar fills
12. **Clean filter chips** — team-color active state, no glass styling
13. **Proper bottom padding** — 24px, no 100px spacers
14. **6 commits** — one per phase
