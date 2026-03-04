# CC-WAVE-1-SHARED-COMPONENTS.md
# Lynx Mobile — Wave 1: Kill the Onboarding Modal + Shared Components Brand Pass

**Priority:** Run after CC-WAVE-0-CLEANUP completes  
**Estimated time:** 2–3 hours  
**Risk level:** MEDIUM — touching shared components that affect many screens  

---

## REFERENCE FILES — READ THESE FIRST

Before writing ANY code, read these files in order:

1. `reference/design-references/brandbook/LynxBrandBook.html` — Open this HTML file and read the JavaScript data inside. It contains the complete Lynx brand system: colors, fonts, gradients, spacing, card styles, component patterns. **Extract the color constants, font names, border radius values, and shadow definitions from this file.**

2. `reference/design-references/brandbook/lynx-screen-playbook-v2.html` — Open this HTML file and read the JavaScript `screens` array inside. It contains design direction for every screen. For this spec, you need the general design philosophy (animation patterns, empty states, card treatments) but not individual screen specs.

3. `reference/supabase_schema.md` — Database schema reference. You may need this when verifying data queries in components.

4. `theme/colors.ts` — Current color constants in the app. Compare with brand book values.

5. `theme/fonts.ts` — Current font constants. Compare with brand book values.

6. `lib/design-tokens.ts` — Design token system if it exists.

**After reading all reference files, create a mental model of:**
- Primary: lynx-navy `#10284C`
- Secondary: lynx-sky `#4BB9EC`  
- Accent: lynx-teal `#2A9D8F`
- Warning/Gold: `#E9C46A`
- Danger/Coral: `#E76F51`
- Font: Tele-Grotesk (if available in RN) or system font fallback
- Card radius: 16px
- Card shadow: subtle, not heavy
- Section headers: condensed, bold, uppercase, letter-spacing

---

## PHASE 0: KILL ParentOnboardingModal (CRITICAL — DO THIS FIRST)

The `ParentOnboardingModal` has been a recurring catastrophic bug. It renders a dark overlay on the parent home screen that blocks all interaction. It has been "fixed" multiple times and keeps coming back. **We are done trying to fix it. Remove it completely.**

### Steps:

1. **Find every file that imports or renders ParentOnboardingModal:**
```bash
grep -rn "ParentOnboardingModal" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules"
```

2. **For each file found:**
   - Remove the import statement for ParentOnboardingModal
   - Remove the JSX that renders `<ParentOnboardingModal ... />`
   - Remove any state variables that only existed to control this modal (e.g., `showOnboarding`, `onboardingComplete`, `onboardingDismissed`)
   - Remove any useEffect hooks that only existed to check onboarding status
   - Remove any AsyncStorage reads/writes for onboarding flags (e.g., `parent_onboarding_complete`)
   - Do NOT remove other modals like CoppaConsentModal — leave those alone

3. **Also check these specific files (most likely locations):**
   - `components/ParentHomeScroll.tsx`
   - `components/ParentDashboard.tsx` (if it still exists and isn't in _legacy)
   - `app/(tabs)/index.tsx`
   - `components/DashboardRouter.tsx`
   - Any parent-scroll components

4. **Do NOT delete the ParentOnboardingModal.tsx file itself** — it was already wired by CC-CLEANUP-AND-WIRE and may be in _legacy. If it's still in active `components/`, move it to `components/_legacy/orphaned/`. If it's already in _legacy, leave it.

5. **Verify the parent home loads cleanly:**
   - Switch to Parent role
   - ParentHomeScroll should render immediately with no overlay, no dark screen, no blocking modal
   - All 11 sections should be visible and scrollable

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 0: permanently remove ParentOnboardingModal - recurring crash bug"
git push
```

---

## PHASE 1: Update Design Tokens

Before touching individual components, make sure the source-of-truth design tokens match the Lynx brand.

### 1A. Update `theme/colors.ts`

Compare current values with the brand book. Ensure these constants exist and are correct:

```typescript
// Primary brand colors
LYNX_NAVY: '#10284C',
LYNX_SKY: '#4BB9EC',
LYNX_TEAL: '#2A9D8F',
LYNX_GOLD: '#E9C46A',
LYNX_CORAL: '#E76F51',

// Surface colors  
SURFACE_DARK: '#0A1628',
SURFACE_CARD: '#1A2744',
CARD_BORDER: 'rgba(75, 185, 236, 0.12)',

// Text colors
TEXT_PRIMARY: '#E8EDF4',
TEXT_SECONDARY: '#8A9AB5',
TEXT_TERTIARY: '#556B8A',
```

If these already exist with different names, DO NOT rename them — just verify values match. If they don't exist, add them.

### 1B. Update `theme/fonts.ts`

Verify the font stack. The brand uses Tele-Grotesk, but in React Native this may fall back to system fonts. Make sure:
- Display/heading font weight is 700-800
- Body font weight is 400-500
- Mono font exists for badges, stats, timestamps

### 1C. Update `lib/design-tokens.ts` (if it exists)

Verify card radius (16), shadow definitions, and spacing scale match the brand book.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: verify and update design tokens to match Lynx brand book"
git push
```

---

## PHASE 2: GestureDrawer Brand Pass

`components/GestureDrawer.tsx` — the navigation drawer used by ALL roles. Highest impact component.

### What to change:
- Background: lynx-navy gradient (not flat gray or white)
- User profile section at top: avatar circle, name, role badge with role-specific color
- Menu items: clean rows with icons, proper font size, role-colored active indicator
- Role selector section: if RoleSelector is embedded here, ensure it uses brand pill styling
- Bottom section: app version, settings link, sign out
- Drawer handle or edge: subtle brand accent

### What NOT to change:
- The gesture/swipe behavior (it works, don't break it)
- The routing/navigation targets
- The drawer open/close animation physics

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: GestureDrawer brand pass - navy gradient, role colors, brand typography"
git push
```

---

## PHASE 3: EventCard Brand Pass

`components/EventCard.tsx` — appears on every schedule screen and home scroll.

### What to change:
- Card background: brand surface color with brand border
- Card radius: 16px
- Type badges: PRACTICE = teal, GAME = coral, TOURNAMENT = gold, MEETING = sky — use brand colors
- Time: bold, larger
- Location: secondary text color, with subtle pin icon
- Team name: small badge or pill
- Shadow: subtle, not heavy

### What NOT to change:
- The data it receives via props
- RSVP functionality if it has inline RSVP
- The onPress navigation behavior

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: EventCard brand pass - type badges, brand colors, card styling"
git push
```

---

## PHASE 4: PlayerCard + PlayerCardExpanded Brand Pass

`components/PlayerCard.tsx` and `components/PlayerCardExpanded.tsx` — appears in rosters, home scrolls, team detail.

### What to change:
- Avatar: clean circle with border, fallback initials in brand colors
- Name: display font weight
- Jersey number: badge treatment (small rounded pill)
- Position: color-coded pill (use position colors from brand book if defined)
- PlayerCardExpanded: stat bars should use brand gradient (teal to sky), not generic colors
- Badge indicators: use brand badge component styling

### What NOT to change:
- The props interface
- Any stat calculation logic
- Navigation on press

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: PlayerCard brand pass - avatar, badges, stat bars in brand colors"
git push
```

---

## PHASE 5: PressableCard + UI Components Brand Pass

These small components cascade across dozens of screens.

### 5A. `components/PressableCard.tsx`
- Border radius: 16px
- Shadow: subtle brand shadow (not heavy drop shadow)
- Background: brand surface color
- Border: brand border color (subtle sky at 12% opacity)
- Press state: slight scale (0.98) + opacity change

### 5B. `components/ui/SectionHeader.tsx`
- Font: condensed/bold, uppercase, letter-spacing 0.5-1px
- Color: brand text secondary
- Size: ~12-13px (small, utility feel)
- Optional "See All" link: brand teal

### 5C. `components/ui/Badge.tsx`
- Role badges: admin=coral, coach=teal, parent=sky, player=gold
- Status badges: use brand colors consistently
- Radius: 6px for small badges, 12px for pills

### 5D. `components/ui/Avatar.tsx`  
- Circle with 2px border in brand color
- Fallback: initials on brand gradient background
- Sizes: consistent sm/md/lg scale

### 5E. `components/ui/PillTabs.tsx`
- Active: brand teal background with white text
- Inactive: transparent with secondary text
- Smooth transition between states
- Pill radius: 20px

### 5F. `components/ui/RoleSelector.tsx`
- Style as brand pills with role-specific colors
- Active role: filled pill with white text
- Inactive: outlined pill with role color text
- **CRITICAL BUG:** RoleSelector was broken on Admin and Player home screens after the scroll redesign. Verify it exists and works on ALL home screens. If it's missing from any home screen, DO NOT add it back in this phase — just note which screens are missing it.

### 5G. `components/NotificationBell.tsx`
- Bell icon: brand text color
- Badge count: coral background, white text, small circle
- Press animation: subtle scale

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: PressableCard, SectionHeader, Badge, Avatar, PillTabs, RoleSelector, NotificationBell brand pass"
git push
```

---

## PHASE 6: VERIFY EVERYTHING

Run the full verification:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Check no _legacy imports leaked back in
grep -rn "from.*_legacy" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "node_modules"

# 3. Check ParentOnboardingModal is truly gone from active code
grep -rn "ParentOnboardingModal" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules"
# Expected: 0 results

# 4. List all files changed
git diff --stat HEAD~6

# 5. Final commit if any cleanup needed
git add -A
git commit -m "Phase 6: Wave 1 verification and cleanup"
git push
```

---

## EXPECTED RESULTS

After Wave 1 completes:

1. **ParentOnboardingModal is permanently gone** — parent home loads instantly with no overlay
2. **Design tokens match the Lynx brand book** — colors, fonts, spacing are correct at the source
3. **GestureDrawer** looks premium — navy gradient, role colors, brand typography
4. **EventCard** has proper type badges and brand card styling — cascades to every schedule view and home scroll
5. **PlayerCard** has brand avatar, badges, and stat bars — cascades to every roster and player list
6. **PressableCard** has correct radius, shadow, border — cascades to every card in the app
7. **UI components** (SectionHeader, Badge, Avatar, PillTabs, NotificationBell) all use brand tokens
8. **6 separate commits** — one per phase, each pushed, easy to revert if needed
9. **RoleSelector status documented** — we know which screens have it and which don't

**Estimated cascade impact:** These ~10 component changes visually update approximately 30-40% of all screens in the app without touching individual screen files.
