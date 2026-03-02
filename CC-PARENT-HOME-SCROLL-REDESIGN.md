# LYNX — Parent Home Dashboard: Scroll-Driven Redesign
## For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)  
**Backend:** Supabase (project: uqpjvbiuokwpldjvxiby)  
**GitHub:** SgtxTorque/volleybrain-mobile3  
**Brand Book:** `reference/design-references/brandbook/LynxBrandBook.html`  
**Design Handoff:** `reference/design-references/handoff/LYNX-MOBILE-REDESIGN-HANDOFF.md`  
**V0 Mockup Reference:** `reference/design-references/v0-mockups/` (Next.js/TSX — READ for layout/styling ideas, do NOT import or run)  
**Scroll Prototypes:** `reference/design-references/prototypes/lynx-scroll-v2.jsx` (primary), `lynx-scroll-prototype.jsx` (v1) — READ for interaction patterns, do NOT import  

---

## RULES (READ FIRST — APPLY TO ALL PHASES)

**These rules are NON-NEGOTIABLE. Violating any of them will break the app.**

1. **Read SCHEMA_REFERENCE.csv FIRST** before writing or modifying ANY Supabase query. Verify every table name and column name against it. If a table or column doesn't exist in SCHEMA_REFERENCE.csv, STOP and ask — do NOT guess or invent columns.

2. **Read the existing code before changing it.** Before modifying any file, read the ENTIRE file first. Understand what's already built and working. Map out all imports and dependencies. Do NOT break existing functionality.

3. **This mobile app shares a Supabase backend with the web admin portal.** When you need to verify correct table names, column names, or query patterns, read the web app's source files as the source of truth:
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\contexts\AuthContext.jsx` (auth patterns)
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\MainApp.jsx` (feature list and routing)
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\lib\supabase.js` (client config)
   - Any page in `C:\Users\fuent\Downloads\volleybrain-admin\src\pages/` for query patterns
   - The web app is the **source of truth** for database schema and query patterns.

4. **This redesign is PARENT-ROLE ONLY.** Do NOT modify Admin, Coach, or Player experiences. All changes must be role-gated. If a shared component is modified, use conditional logic to preserve other roles' behavior. After every phase, verify the other three roles still work.

5. **Use the existing auth/permissions pattern.** Read how the app currently determines user roles (likely `usePermissions()` or role from auth context). Do NOT invent a new auth check pattern. Match exactly what exists.

6. **Check package.json BEFORE installing anything.** Many libraries may already be installed. Run `cat package.json | grep [package-name]` before `npx expo install`. If a package exists, use it. Do not install duplicates or conflicting versions.

7. **Full file replacements for NEW screens only.** When modifying existing screens or shared components (like navigation, layout files, contexts), make SURGICAL changes — add conditional logic, don't delete what other roles depend on. For brand new files (new components, new hooks), write the complete file.

8. **Show your plan briefly, then execute immediately.** For each phase, briefly list files you'll touch, then DO IT. Do NOT wait for confirmation. Do NOT ask "should I proceed?" or "ready for the next phase?" — just keep going. The only reason to stop is if SCHEMA_REFERENCE.csv is missing a table/column you need — flag it in a comment, skip that query, and continue.

9. **No console.log without `__DEV__` gating.** All debug logging must be wrapped: `if (__DEV__) console.log(...)`.

10. **After every phase, run `npx tsc --noEmit`** and report the result. Zero new TypeScript errors.

11. **Commit AND push after every completed phase.** Use format: `git add -A && git commit -m "Parent Home Scroll Phase [X]: [description]" && git push`. Do NOT bundle multiple phases into one commit.

12. **Read the design reference files.** Before starting Phase 1, read:
    - `reference/design-references/handoff/LYNX-MOBILE-REDESIGN-HANDOFF.md` (full design spec)
    - `reference/design-references/brandbook/LynxBrandBook.html` (brand tokens)
    - `reference/design-references/prototypes/lynx-scroll-v2.jsx` (interaction patterns)
    This is where the visual direction, color tokens, typography, spacing, and interaction model are defined. Use them.

13. **Animations must be 60fps.** Use `react-native-reanimated` worklets and `useNativeDriver: true` wherever possible. Animations should enhance the experience, not cause jank. Test-proof: if it would drop frames on a mid-range Android, simplify it.

14. **The existing Parent Home works.** It was redesigned in a previous sprint and is stable. You are REPLACING the parent home dashboard content and interaction model, but keeping the same navigation structure (Home | Schedule | Chat | Team | My Stuff tabs). Do NOT touch the tab bar structure or other tabs.

15. **AUTONOMOUS EXECUTION MODE.** Run ALL phases (0 through 7) in a single session without stopping. Do NOT ask for permission between phases. Do NOT ask "should I continue?" or "ready for next phase?" — just commit, push, and immediately start the next phase. The user is AFK. If you hit an ambiguity, make the best judgment call, document what you decided in a code comment, and keep moving. The ONLY acceptable reason to stop is a build-breaking error that you cannot resolve — in which case, commit what you have, push, and explain what broke.

---

## BRAND SYSTEM (Quick Reference)

Read the full brand book for details. Here are the critical tokens:

### Colors
```
Navy Deep:     #0D1B3E  (dark backgrounds, event cards)
Navy:          #10284C  (headers, text primary)
Sky Blue:      #4BB9EC  (primary accent, CTAs, active states)
Sky Light:     #6AC4EE  (hover/secondary accent)
Gold:          #FFD700  (achievements, badges, premium)
Gold Warm:     #D9994A  (mascot-related, amber warmth)
White:         #FFFFFF  (card backgrounds)
Off-White:     #F6F8FB  (page background)
Warm Gray:     #F0F2F5  (secondary backgrounds)
Border:        #E8ECF2  (card borders, dividers)
Text Primary:  #10284C
Text Muted:    rgba(16,40,76,0.4)
Text Faint:    rgba(16,40,76,0.25)
Success:       #22C55E
Error:         #EF4444
Teal:          #14B8A6
```

### Typography
```
Display/Headlines: Bebas Neue (large, uppercase — scores, event names, section heroes)
Body/UI:           Plus Jakarta Sans (weights 400-800) — fallback: Outfit per brand book
Section Headers:   11px, weight 700, letter-spacing 0.1em, uppercase, Text Faint
Card Titles:       15-22px, weight 700-800, Text Primary
Body Text:         12-14px, weight 500-600, line-height 1.4-1.5
Big Numbers:       28-36px, weight 800, Bebas Neue
```

### Spacing
```
Page padding:       20-24px horizontal
Card padding:       16-20px internal
Card border-radius: 16-22px
Card gap:           10-16px
Section gap:        16-20px
Light card shadow:  0 2px 12px rgba(16,40,76,0.04)
Hero card shadow:   0 4px 24px rgba(16,40,76,0.15)
```

---

## ARCHITECTURE OVERVIEW

### The Big Idea
The parent home is NOT a static dashboard. It is a **single continuous scroll experience** — one living feed where the UI responds to scroll position and velocity. The interface transforms as you scroll:

```
Welcome (full) → Compact Header + Calendar → Event Hero → Athletes → Stats → Social → End
```

### Key Interaction Patterns
| Behavior | Implementation |
|----------|---------------|
| Welcome collapses into compact header | Sticky header morphing via reanimated interpolation |
| Day-strip calendar slides in | Scroll-linked transition, appears as welcome disappears |
| Event card background reveals on approach | Parallax reveal with opacity interpolation |
| Cards expand on slow scroll, stay compact on fast | Velocity-sensitive progressive disclosure |
| Bottom nav hides while scrolling, returns when idle | Auto-hiding nav with idle timer |
| Mascot messages cycle with animations | Ambient companion UI with fade transitions |

### Required Libraries (verify before installing)
- `react-native-reanimated` — scroll-linked animations, shared values, interpolation
- `react-native-gesture-handler` — velocity detection, gesture composition  
- `react-native-safe-area-context` — dynamic island / notch handling (likely already installed)
- `@react-navigation/bottom-tabs` — existing nav (modify for auto-hide behavior)

---

## PHASE 0: PRE-FLIGHT AUDIT (Do NOT write code yet)

**Goal:** Understand the current state before touching anything.

**Tasks:**

0A. Read the current parent dashboard file(s). Identify:
- The main parent home screen file path
- All components it imports
- All hooks it uses (data fetching, auth, navigation)
- All Supabase queries it makes (verify against SCHEMA_REFERENCE.csv)
- The current layout structure (what sections exist, in what order)

0B. Read the tab navigation file (`_layout.tsx` or equivalent). Identify:
- How parent tabs are defined
- How role-gating works
- What the bottom tab bar component looks like
- Whether auto-hide behavior can be added without breaking other roles

0C. Check installed packages:
```bash
cat package.json | grep -E "reanimated|gesture-handler|safe-area"
```

0D. Check if fonts are already loaded:
```bash
grep -r "Bebas" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -l
grep -r "Jakarta" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -l
grep -r "Outfit" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -l
```

0E. Read the design reference files:
- `reference/design-references/handoff/LYNX-MOBILE-REDESIGN-HANDOFF.md`
- `reference/design-references/prototypes/lynx-scroll-v2.jsx`
- `reference/design-references/brandbook/LynxBrandBook.html`

**Output:** A status report listing:
1. Current parent home file path and structure
2. Current tab navigation structure
3. Which required packages are/aren't installed
4. Which fonts are/aren't loaded
5. Any potential conflicts or risks you see
6. Your plan for Phase 1

**Commit:** `git add -A && git commit -m "Parent Home Scroll Phase 0: Pre-flight audit notes" && git push`

**Then immediately proceed to Phase 1. Do NOT wait.**

---

## PHASE 1: FOUNDATION — Animation Infrastructure + Font Loading

**Goal:** Install required libraries, load fonts, create the scroll animation skeleton with placeholder content. Verify nothing breaks.

**Tasks:**

1A. **Install required packages** (only what's missing from Phase 0 audit):
```bash
npx expo install react-native-reanimated react-native-gesture-handler
```
- Update `babel.config.js` to add `react-native-reanimated/plugin` (MUST be last in plugins array)
- Update `app.json` or `app.config.js` if needed for gesture handler
- Verify `react-native-safe-area-context` is already installed (it likely is with Expo)

1B. **Load brand fonts** (if not already loaded):
- Install `@expo-google-fonts/bebas-neue` and `@expo-google-fonts/plus-jakarta-sans`
- Add font loading to the app entry point (use `useFonts` hook pattern)
- Create a `theme/fonts.ts` constants file mapping font names:
```typescript
export const FONTS = {
  display: 'BebasNeue_400Regular',
  bodyLight: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemiBold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
  bodyExtraBold: 'PlusJakartaSans_800ExtraBold',
};
```

1C. **Create the scroll animation hook** — `hooks/useScrollAnimations.ts`:
- Uses `useAnimatedScrollHandler` from reanimated
- Tracks `scrollY` as a shared value
- Tracks `scrollVelocity` as a shared value (averaged over last 6 events for smoothing)
- Exports the scroll handler and both shared values
- Exports a `isSlowScroll` derived value (velocity < 350 pixels/second)
- Key thresholds as named constants (not magic numbers):
```typescript
export const SCROLL_THRESHOLDS = {
  WELCOME_COLLAPSE_START: 0,
  WELCOME_COLLAPSE_END: 140,
  CALENDAR_APPEAR_START: 30,
  CALENDAR_APPEAR_END: 110,
  EVENT_IMAGE_REVEAL_START: 150,
  EVENT_IMAGE_REVEAL_END: 270,
  SLOW_SCROLL_VELOCITY: 350, // pixels/second
  NAV_IDLE_TIMEOUT: 850, // ms
};
```

1D. **Create the brand theme constants** — `theme/colors.ts` and `theme/spacing.ts`:
- All colors from the Brand System section above
- All spacing values
- Shadow presets for light cards and hero cards

1E. **Create a skeleton ParentHomeScroll screen:**
- Replace the current parent home content with a new `Animated.ScrollView` that uses the scroll handler from 1C
- Inside: placeholder colored blocks for each future section (Welcome, Calendar, Event, Athlete, Grid, Team Hub, Season, Badges, End) with section labels
- Each block should be a simple `Animated.View` with a background color and a text label
- The scroll handler should be wired up and logging scroll position + velocity to console (behind `__DEV__` gate)
- The existing parent home data fetching hooks should remain connected but their UI temporarily replaced with these placeholders
- **CRITICAL:** Wrap this in a role check so ONLY parents see the new scroll home. Other roles see their existing dashboards unchanged.

**Verification:**
- App boots without errors
- Parent role: sees colored placeholder blocks in a scrollable view, scroll position logs in console
- Admin role: sees their existing dashboard, unchanged
- Coach role: sees their existing dashboard, unchanged  
- Player role: sees their existing dashboard, unchanged
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Parent Home Scroll Phase 1: Reanimated setup, fonts, scroll hook, skeleton layout" && git push`

**Then immediately proceed to Phase 2. Do NOT wait.**

---

## PHASE 2: WELCOME SECTION + COMPACT HEADER MORPHING

**Goal:** Build the welcome section that collapses into a compact sticky header as the user scrolls.

**Tasks:**

2A. **Welcome Section (full state, no scroll):**
- Full-width section at the top of the scroll view
- Lynx cub placeholder (use 🐱 emoji at 60px as temporary mascot — real illustrations come later)
- Mascot should have a subtle floating animation (translateY oscillation via reanimated, ±4px, 3-second loop)
- "Welcome back, [Parent First Name]" in Plus Jakarta Sans 700, 22px, Navy
- Below the name: a speech bubble card (white bg, 16px radius, light shadow) with cycling contextual messages
- Messages cycle every 5 seconds with a fade transition (opacity 1→0→1) + dot indicators below
- Placeholder messages for now (will be dynamic later):
  - "Coach needs a headcount. Is Ava playing Saturday?" (mascot: gentle wiggle)
  - "Registration fees are due April 12th. Secure Ava's spot!" (mascot: subtle bounce)
  - "Ava earned a new badge yesterday! She's on a roll 🔥" (mascot: gentle float)
- Notification bell icon in top-right corner with badge count (use existing notification data if available, or hardcode "3" as placeholder)
- The top of the event hero card should be JUST VISIBLE as a teaser peeking above the bottom nav

2B. **Compact Header (appears on scroll):**
- Fades in as welcome section collapses (scrollY 0→140px)
- Contains: Small Lynx icon (🐱 at 24px) + "LYNX" text in Bebas Neue + notification bell + user avatar circle
- Sticks to top of screen (position sticky/absolute with z-index above scroll content)
- Height: ~56px + safe area top inset
- Background: white with subtle bottom border (#E8ECF2)
- The welcome section's opacity goes from 1→0 over scrollY 0→100px
- The compact header's opacity goes from 0→1 over scrollY 60→140px (overlap creates smooth crossfade)

2C. **Scroll-linked animations for this phase:**
```
scrollY 0→100:     Welcome opacity 1→0, welcome translateY 0→-30
scrollY 60→140:    Compact header opacity 0→1
scrollY 0→140:     Welcome section height collapses (use interpolation on maxHeight or translateY)
```
- All animations via `useAnimatedStyle` reading from the shared `scrollY` value
- Use `interpolate()` with `Extrapolate.CLAMP` to prevent overshoot

**Verification:**
- Welcome section shows with mascot, name, cycling messages
- Scrolling smoothly collapses welcome into compact header
- Compact header sticks at top with Lynx branding
- Messages cycle with fade transition
- No jank — animations at 60fps
- Other roles unaffected
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Parent Home Scroll Phase 2: Welcome section + compact header morphing" && git push`

**Then immediately proceed to Phase 3. Do NOT wait.**

---

## PHASE 3: DAY-STRIP CALENDAR + EVENT HERO CARD

**Goal:** Build the day-strip calendar that slides in under the compact header, and the event hero card with parallax image reveal.

**Tasks:**

3A. **Day-Strip Calendar:**
- Horizontal scrollable row of 7 days (centered on today)
- Each day: abbreviated day name (11px, uppercase, Text Faint) + date number (18px, Bold)
- Today: Sky Blue circle behind the date number, white text
- Days with events: small dot indicator below the date (Sky Blue for today's events, Navy for future)
- Calendar slides DOWN from under the compact header as welcome disappears:
  ```
  scrollY 30→110: Calendar translateY from -50→0, opacity 0→1
  ```
- Calendar should be FULLY VISIBLE by the time the event card reaches the calendar's vertical position
- Tapping a day with an event dot could scroll to that event (stretch goal — skip if complex)
- Sticky below the compact header (doesn't scroll with content)

3B. **Event Hero Card:**
- Dark navy card (#0D1B3E) with atmospheric gradient (navy to slightly lighter navy-blue, simulating sky)
- Card has 22px border-radius, hero shadow (0 4px 24px rgba(16,40,76,0.15))
- **Parallax image reveal:** As the card scrolls toward the top of the viewport, the gradient background opacity fades from 0.3→1:
  ```
  scrollY 150→270: Background gradient opacity 0.3→1
  ```
- Volleyball silhouette or icon fades in alongside the gradient (use a volleyball emoji or icon as placeholder)
- Content on the card:
  - Green pulse dot (animated opacity loop) + "TODAY · 6:00 PM" in 11px uppercase Sky Blue
  - "PRACTICE" in Bebas Neue, 32px, white
  - "📍 Frisco Fieldhouse" in Plus Jakarta Sans 500, 13px, white at 70% opacity
  - "Black Hornets Elite" in Plus Jakarta Sans 600, 13px, white at 50% opacity
  - Two buttons side by side:
    - RSVP: Solid Sky Blue (#4BB9EC), white text, 12px border-radius, 44px height
    - Directions: Glass/outlined style (white border at 30% opacity, white text at 80%), same dimensions
- **Data source:** Query the most imminent upcoming event from Supabase. Use SCHEMA_REFERENCE.csv to verify the events/schedule table and column names. If no events today, show next scheduled event with adjusted copy ("UPCOMING" instead of "TODAY", no green pulse dot)
- Entire card tappable → navigates to event detail screen (use existing navigation pattern)

3C. **Attention Banner (below event card):**
- Warm cream/amber background (#FFF8E1 or similar)
- Rounded orange circle with count number
- "[X] things need attention" + chevron
- Query: count of unconfirmed RSVPs + unpaid balances + unread coach messages for this parent
- If count is 0, hide the banner entirely
- Tappable → navigates to attention items list (or shows a bottom sheet — use existing pattern if one exists)

**Verification:**
- Day-strip calendar slides in smoothly as welcome collapses
- Today is highlighted, event dots show on correct days
- Event hero card renders with gradient, event data, RSVP + Directions buttons
- Parallax reveal effect is smooth
- Attention banner shows correct count or hides when 0
- All data queries verified against SCHEMA_REFERENCE.csv
- Other roles unaffected
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Parent Home Scroll Phase 3: Day-strip calendar + event hero card + attention banner" && git push`

**Then immediately proceed to Phase 4. Do NOT wait.**

---

## PHASE 4: MY ATHLETE CARD (Velocity-Sensitive)

**Goal:** Build the athlete card with velocity-sensitive progressive disclosure — expands with stats on slow scroll, stays compact on fast scroll.

**Tasks:**

4A. **My Athlete Card — Compact State (default):**
- Section header: "MY ATHLETE" in 11px uppercase, weight 700, letter-spacing 0.1em, Text Faint
- Card with white background, 16px border-radius, light shadow
- Left side: Player avatar/photo in a colored square (use team color or crimson as default), jersey number overlaid in Bebas Neue
- Right side: Player name (18px, Bold), team name + position + jersey (13px, Text Muted), "LVL [X]" badge (Gold background, small pill)
- Entire card tappable → navigates to full player profile
- **Data source:** Query the parent's children from Supabase. Verify table/column names against SCHEMA_REFERENCE.csv. If parent has multiple children, show as a vertical stack of cards (not horizontal scroll — this is a single scroll feed)

4B. **My Athlete Card — Expanded State (slow scroll):**
- When the card is in the center 40% of the viewport AND scroll velocity < 350px/s:
  - Stats row smoothly slides out below the compact content (height animates from 0 to ~50px)
  - Stats: OVR [number], HIT% [number], SERVE [number], ASSISTS [number]
  - Each stat in a small pill/chip: label in 9px uppercase Text Faint, value in 16px Bold
  - Card slightly scales up (1.0→1.015) during expansion
- When the card scrolls out of the center zone OR velocity increases above threshold:
  - Stats row collapses back (height animates to 0)
  - Card scales back to 1.0
- **Implementation:**
  - Track each card's position relative to viewport center using `onLayout` + scrollY
  - Use `useAnimatedStyle` with `interpolate` based on card position in viewport
  - Gate the expansion on the `isSlowScroll` derived value from the scroll hook
  - All transitions via reanimated for 60fps

4C. **Velocity detection refinement:**
- The scroll hook from Phase 1 should already track velocity
- Verify the averaging works (last 6 scroll events) — if not, fix it now
- The 350px/s threshold is a starting point — document it as a tunable constant

**Verification:**
- Athlete card renders with correct player data
- Slow scroll: card expands with stats, subtle scale-up
- Fast scroll: card stays compact
- Scroll away: expansion collapses smoothly
- Multiple children render as stacked cards
- Card tap navigates to player profile
- Data queries verified against SCHEMA_REFERENCE.csv
- Other roles unaffected
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Parent Home Scroll Phase 4: Velocity-sensitive athlete card" && git push`

**Then immediately proceed to Phase 5. Do NOT wait.**

---

## PHASE 5: METRIC GRID + EXPANDABLE CARDS

**Goal:** Build the 2x2 metric grid and remaining content sections with velocity-sensitive expansion.

**Tasks:**

5A. **Metric Grid (2x2 layout):**
- Four cards in a 2-column grid, each with:
  - White background, 16px border-radius, light shadow
  - Icon + label + primary value
  - Tappable → navigates to detail screen
- **Grid cells:**

| Position | Card | Compact Content | Expanded Content (slow scroll) |
|----------|------|----------------|-------------------------------|
| Top-left | Record | 🏆 "6-1" + "Won 50-12" | Last game opponent + score detail |
| Top-right | Balance | 💳 "$210" + "Due Apr 12" | Due date context OR "All caught up!" if $0 |
| Bottom-left | Progress | ⭐ "750/800 XP" + gradient progress bar | Level name + next milestone |
| Bottom-right | Chat | 💬 "Team Chat" + "1 unread" | Preview of last message text |

- **Dynamic Balance:** If balance is $0, the Balance card shows "✅ All caught up!" with Success green. If the parent has no outstanding balance at all, hide the card entirely and the grid becomes a 2-column + 1 layout (3 cards)
- **Expansion behavior:** Same velocity-sensitive pattern as the athlete card — expand when in center viewport zone and slow scroll
- **Data sources:** All queries verified against SCHEMA_REFERENCE.csv:
  - Record: team season record (wins, losses, last game score)
  - Balance: outstanding payments for this parent's children
  - Progress: player XP/level data
  - Chat: latest unread count and message preview from team chat

5B. **Team Hub Preview:**
- Section header: "TEAM HUB" (11px uppercase, Text Faint) + "View All" link (Sky Blue, tappable → Team Hub tab)
- Latest post card: avatar circle + post text + timestamp
  - Example: "Coach Carlos gave Ava a 🎯 Clutch Player shoutout!" + "2h ago"
- **Slow-scroll expand:** Second post appears below with a height animation
- Tappable → navigates to full Team Hub feed

5C. **Season Snapshot:**
- Large Bebas Neue numbers side by side:
  - Wins count in Success green (#22C55E)
  - " | " divider
  - Losses count in Error red (#EF4444)
- Below: "Latest Game: WON 50-12" (or actual latest result)
- Horizontal win-rate bar (percentage filled with Success green, remainder in Warm Gray)
- Data from team season record query

5D. **Recent Badges:**
- Horizontal scrollable row of badge chips/pills
- Each badge: emoji + name (e.g., "🎺 Hype Machine", "📣 First Shoutout", "⚔️ First Blood")
- Rounded pill shape, Off-White background, Border stroke, 12px font
- Tappable → navigates to trophy case / achievements screen
- Data: query player achievements/badges from Supabase (verify table against SCHEMA_REFERENCE.csv)

5E. **End of Scroll:**
- Lynx cub emoji (🐱) at 35% opacity, centered
- "That's everything for now!" in Plus Jakarta Sans 500, 14px, Text Muted
- Generous bottom padding (120px) so last content clears the bottom nav bar

**Verification:**
- All 4 metric grid cards render with correct data
- Balance card hides when $0
- Velocity-sensitive expansion works on grid cards and Team Hub
- Season Snapshot shows correct record
- Badges render in horizontal scroll
- End-of-scroll treatment renders
- All data queries verified against SCHEMA_REFERENCE.csv
- Other roles unaffected
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Parent Home Scroll Phase 5: Metric grid, Team Hub, Season Snapshot, badges, end-of-scroll" && git push`

**Then immediately proceed to Phase 6. Do NOT wait.**

---

## PHASE 6: AUTO-HIDING BOTTOM NAV + ANIMATION POLISH

**Goal:** Implement auto-hiding bottom navigation and polish all animations across the scroll experience.

**Tasks:**

6A. **Auto-Hiding Bottom Navigation:**
- The existing bottom tab bar should slide down (hide) when the user is actively scrolling
- When scrolling stops for 800-900ms, the tab bar slides back up
- Implementation:
  - Track scroll activity via the existing scroll handler
  - Use a `useSharedValue` for nav translateY
  - On any scroll movement > 2px: animate nav to `translateY(100)` (hidden below screen)
  - On scroll idle (use `setTimeout` / `runOnJS` callback after ~850ms of no scroll events): animate nav back to `translateY(0)`
  - Transition: 0.45s with `cubic-bezier(0.16, 1, 0.3, 1)` easing (use reanimated's `withTiming` with custom easing)
- **CRITICAL:** This must ONLY affect the parent home screen. Other tabs and other roles should NOT have auto-hiding nav. Options:
  - Pass a prop or context value from the parent home screen to the tab bar component
  - Use a global state/context that the parent home screen sets when mounted and clears when unmounted
  - Choose whichever approach is cleanest given the existing tab bar implementation

6B. **Bottom Nav Styling (parent role only):**
- Height: 78px (includes safe area padding)
- Background: `rgba(255,255,255,0.95)` with `backdrop-filter: blur(20px)` (use `BlurView` from expo-blur if available, or solid white as fallback)
- Border-top: 1px solid #E8ECF2
- Active tab color: Sky Blue (#4BB9EC)
- Inactive tabs: 35% opacity
- Badge on Chat and More tabs: Error red (#EF4444), 9px font, min-width 16px pill

6C. **Animation Polish Pass:**
Review all animations from Phases 2-5 and verify:
- Welcome collapse: smooth, no flicker, content doesn't jump
- Compact header appearance: clean crossfade with welcome
- Calendar slide-in: snappy, fully visible before event card reaches it
- Event card parallax: gradient reveal is smooth, not choppy
- Athlete card expansion: height animation is fluid, no layout jump
- Grid card expansions: consistent timing with athlete card
- Team Hub expansion: matches grid behavior
- Mascot float animation: subtle, not distracting
- Message cycling: clean fade transitions, dot indicators update correctly
- Bottom nav hide/show: bouncy but not overdone

6D. **Performance audit:**
- Verify all animations use the UI thread (reanimated worklets), not the JS thread
- Check for unnecessary re-renders during scroll (React DevTools or manual audit)
- Ensure shared values are not causing excessive component updates
- Test that the scroll feels responsive — no input lag

**Verification:**
- Bottom nav hides on scroll, returns after ~850ms idle
- Nav hide/show ONLY happens on parent home, not other tabs or roles
- All animations feel smooth and intentional
- No jank or frame drops on scroll
- App still boots cleanly for all roles
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Parent Home Scroll Phase 6: Auto-hiding nav + animation polish" && git push`

**Then immediately proceed to Phase 7. Do NOT wait.**

---

## PHASE 7: DYNAMIC CONTENT + DATA WIRING

**Goal:** Replace all placeholder/hardcoded data with live Supabase queries. Wire up contextual mascot messages.

**Tasks:**

7A. **Dynamic Contextual Messages (Welcome section):**
- Query for pending actions for this parent:
  - Unconfirmed RSVPs (events where this parent hasn't responded)
  - Unpaid balances (outstanding payment amounts + due dates)
  - Coach messages needing response (unread direct messages from coaches)
  - Recent achievements (badges earned in last 7 days)
- Generate mascot messages dynamically based on what's found:
  - Unconfirmed RSVP → "Coach needs a headcount. Is [Child Name] playing [Day]?"
  - Unpaid balance → "Final buzzer for registration fees is [Date]. Secure [Child Name]'s spot!"
  - Recent badge → "[Child Name] earned a new badge yesterday! She's on a roll 🔥"
  - No pending items → "Looking good! [Child Name]'s all set for the week. 💪"
- Map message types to mascot animation states:
  - Question/RSVP → wiggle animation
  - Deadline/payment → bounce animation
  - Celebration/badge → float animation
  - All clear → idle float
- **Verify ALL queries against SCHEMA_REFERENCE.csv.** If a table or column doesn't exist for any of these queries, use what IS available and note what's missing.

7B. **Event Hero Card — Live Data:**
- Query the next upcoming event for any team the parent's children belong to
- Populate: event type (practice/game/tournament), time, location, team name
- RSVP button: wire to existing RSVP functionality (check how RSVP currently works in the app)
- Directions button: open device maps with the venue address (use `Linking.openURL` with maps URL)
- If no upcoming events: show an empty state card — "No upcoming events. Enjoy the break! 🏖️"

7C. **Attention Banner — Live Count:**
- Count: unconfirmed RSVPs + unpaid balances + unread important messages
- If 0: hide banner entirely (height 0, no spacing)
- Tap: navigate to existing attention/notifications screen

7D. **Athlete Card — Live Player Data:**
- Player photo, name, team, position, jersey number from player profile
- Stats (OVR, HIT%, SERVE, ASSISTS) from player stats tables
- Level/XP from gamification tables
- Handle missing data gracefully (show "—" for stats not yet available)

7E. **All Remaining Cards — Live Data:**
- Metric grid: real record, real balance, real XP, real chat preview
- Team Hub: real latest posts from team wall
- Season Snapshot: real win/loss record and latest game result
- Recent Badges: real earned badges from achievements table

**Verification:**
- All data renders from Supabase, no hardcoded values remain
- Contextual messages reflect actual parent state
- Empty states work (no events, no balance, no badges)
- RSVP and Directions buttons functional
- All queries verified against SCHEMA_REFERENCE.csv
- Other roles unaffected
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Parent Home Scroll Phase 7: Dynamic data wiring + contextual messages" && git push`

**Phase 7 is the FINAL automated phase. Stop here. Phase 8 is a collaborative tuning session with the user.**

---

## PHASE 8: ON-DEVICE TUNING (Collaborative Phase)

**This phase is different.** After Phases 1-7 are built and committed, the developer (you) will test on a physical device and report issues. This phase is a feedback loop, not a one-shot build.

**Expected tuning areas:**
- Scroll thresholds (the pixel values for when transitions happen) — these WILL need adjustment because mouse scroll ≠ touch scroll
- Velocity threshold for "slow scroll" detection — may need to be higher or lower
- Welcome section height — may need more or less space
- Animation timing — some may feel too fast or too slow
- Card expansion heights — may need tweaking for different content lengths
- Nav hide/show timing — 850ms may feel too long or too short
- Font sizes — may need adjustment for different screen sizes
- Padding/margins — may feel too tight or too loose on real hardware

**Process:**
1. Test on device
2. Report what feels off (screenshots/video if possible)
3. We adjust constants and thresholds
4. Re-test
5. Repeat until it feels right

**Commit:** `git add -A && git commit -m "Parent Home Scroll Phase 8: On-device tuning adjustments" && git push`

---

## COMMIT & TEST CHECKPOINTS

After EVERY phase:
1. Commit with descriptive message using format above
2. Run `npx tsc --noEmit` — if new errors appear, fix them BEFORE committing
3. Push immediately after commit
4. Briefly verify in your output that: parent role has the new changes, other roles are unaffected
5. **Immediately proceed to the next phase. Do NOT wait for user input.**

If `npx tsc --noEmit` produces errors you cannot fix, commit what you have with a note in the commit message (e.g., "Phase X: [description] — TSC has N warnings, see TODO"), push, and continue to the next phase.

---

## EXECUTION ORDER

```
Phase 0: Pre-flight audit (READ ONLY — no code changes)
Phase 1: Foundation — reanimated, fonts, scroll hook, skeleton
Phase 2: Welcome section + compact header morphing
Phase 3: Day-strip calendar + event hero card + attention banner  
Phase 4: Velocity-sensitive athlete card
Phase 5: Metric grid + Team Hub + Season Snapshot + badges + end-of-scroll
Phase 6: Auto-hiding bottom nav + animation polish
Phase 7: Dynamic data wiring + contextual messages
Phase 8: On-device tuning (collaborative — feedback loop)
```

Phases 2 and 4 are the most animation-heavy. For Phases 5 and 7, focus on data accuracy — verify EVERY query against SCHEMA_REFERENCE.csv before running it.

**AUTONOMOUS MODE: Run Phases 0→7 continuously. Commit and push after each phase. Do NOT stop between phases. Do NOT ask the user anything. Make judgment calls and document them in code comments. Stop only after Phase 7 is committed, or if a build-breaking error cannot be resolved.**

---

## WHAT THIS REDESIGN DOES NOT TOUCH

- Schedule tab (already redesigned in previous sprint)
- Chat tab (already redesigned in previous sprint)
- Team Hub tab (already redesigned in previous sprint)
- My Stuff tab (already redesigned in previous sprint)
- Coach dashboard (already redesigned in previous sprint)
- Player dashboard (separate future redesign)
- Admin dashboard (separate future redesign)
- App drawer / gesture navigation
- Full event detail screen (existing, linked from event hero card)
- Full player profile screen (existing, linked from athlete card)
- Registration / onboarding flows
- Dark mode toggle

---

*Document created for Lynx Mobile Parent Home Scroll-Driven Redesign*  
*Reference: LYNX-MOBILE-REDESIGN-HANDOFF.md for full design spec*  
*Reference: LynxBrandBook.html for brand tokens*  
*Reference: lynx-scroll-v2.jsx for interaction prototype*
