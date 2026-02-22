# VolleyBrain Mobile App — Design Refactor Handoff
## For Claude Code: Systematic UI redesign of volleybrain-mobile (Expo/React Native)

---

## 🎯 MISSION

Refactor the existing VolleyBrain mobile app (Expo/React Native) to match the v0 design system. This is a **visual redesign**, NOT a feature rewrite. The app's functionality, data flow, Supabase integration, navigation structure, and business logic must remain intact. We are changing HOW things look, not WHAT they do.

---

## ⚠️ CRITICAL SAFETY RULES

### DO NOT TOUCH:
- **Supabase queries, auth flow, or database schema** — zero changes
- **Navigation structure** (React Navigation / Expo Router) — keep all routes and screen names
- **Business logic** — registration flows, payment processing, RSVP logic, chat messaging, etc.
- **API calls, hooks, or data fetching patterns** — leave all useEffect/useQuery/subscriptions alone
- **State management** — context providers, stores, reducers stay as-is
- **File/folder structure** — don't reorganize the project. Add new files for shared components, but don't move existing ones

### SAFE TO CHANGE:
- **Styles** — colors, fonts, spacing, shadows, border radius, layout within screens
- **Component JSX structure** — rearranging elements within a screen for new layout
- **Shared UI components** — creating new shared components (Card, Badge, SectionHeader, PillTabs, BottomNav, Avatar, StatBox, MatchCard)
- **Theme/design tokens** — creating a centralized theme file
- **Assets** — adding icons, updating splash screen colors, etc.

### REFACTOR STRATEGY:
1. **Create the design system FIRST** (theme file + shared components) before touching any screens
2. **One screen at a time** — never refactor two screens simultaneously
3. **Test after every screen** — make sure the app runs and the screen renders correctly before moving to the next one
4. **Preserve all props and data contracts** — if a component receives `event.title`, it still receives `event.title`. Only change how it's rendered.

---

## 🎨 DESIGN SYSTEM — Exact Tokens

### Color Palette

```javascript
// theme/colors.ts
export const colors = {
  // Core palette
  steelBlue: '#2C5F7C',      // Primary brand — headers, active icons, time displays
  teal: '#14B8A6',            // Accent — CTAs, RSVP badges, active indicators, send buttons
  navy: '#1B2838',            // Dark text, header bar background, deep accents
  
  // Semantic
  orange: '#E8913A',          // Warnings, tournament badges, pending states
  coral: '#D94F4F',           // Errors, declined, notification badges
  green: '#22C55E',           // Success, confirmed, active, wins
  
  // Surfaces
  background: '#C8D3DC',      // Main app background (dusty blue-gray)
  card: '#FFFFFF',             // Card surfaces
  secondary: '#E8F0F5',       // Pill tab background, light fills, team icon circles
  
  // Text
  textPrimary: '#1B2838',     // Headlines, names, primary content (same as navy)
  textSecondary: '#6B7C8A',   // Timestamps, labels, secondary info
  
  // Borders & Dividers
  border: '#D9E2E9',          // Card borders, dividers, input borders
  
  // Utility
  white: '#FFFFFF',
  black: '#000000',
};
```

### Typography

```javascript
// theme/typography.ts
export const typography = {
  // Display/Headlines — Bold, condensed, uppercase, tracked
  // Use a condensed bold font. In React Native, this could be:
  // - Oswald-Bold (closest to v0's Bebas Neue)
  // - Or system font with condensed weight
  display: {
    fontFamily: 'Oswald-Bold', // or your chosen condensed font
    textTransform: 'uppercase',
    letterSpacing: 0.8,        // ~0.04em equivalent
  },
  
  // Body — Clean, readable sans-serif
  body: {
    fontFamily: 'Inter',       // or System default
  },
  
  // Size scale
  sizes: {
    heroTitle: 22,            // "WELCOME BACK, COACH"
    sectionHeader: 15,        // "UPCOMING", "SEASON STATS"
    cardTitle: 18,            // "PRACTICE SESSION", team names
    cardSubtitle: 13,         // Player names, team details
    matchTime: 18,            // "2:00 PM" in match cards
    statNumber: 26,           // Big stat values ("8", ".727")
    statLabel: 9,             // "WINS", "LOSSES" under stats
    body: 12,                 // Regular body text
    bodySmall: 11,            // Secondary body text
    caption: 10,              // Timestamps, venue text
    micro: 9,                 // Tiny labels, date under time
    badge: 10,                // Badge text
  },
  
  // Weight mapping
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
};
```

### Shadows

```javascript
// theme/shadows.ts
export const shadows = {
  card: {
    // Primary card shadow — used on ALL elevated cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,             // Android equivalent
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  nav: {
    // Bottom nav subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
};
```

### Spacing & Radii

```javascript
// theme/spacing.ts
export const spacing = {
  screenPadding: 16,          // Horizontal padding for screen content
  cardMarginH: 16,            // Horizontal margin for cards (mx-4)
  cardMarginB: 10,            // Bottom margin between cards (mb-2.5)
  cardPaddingH: 14,           // Horizontal padding inside cards
  cardPaddingV: 12,           // Vertical padding inside cards
  sectionHeaderPaddingT: 14,  // Top padding before section headers
  sectionHeaderPaddingB: 6,   // Bottom padding after section headers
  statGap: 8,                 // Gap between stat boxes
};

export const radii = {
  card: 12,                   // Standard card border-radius
  badge: 20,                  // Full-round badges/pills
  pillTab: 24,                // Pill tab container
  avatar: 999,                // Circular avatars
  statBox: 10,                // Stat box corners
};
```

---

## 🧱 SHARED COMPONENTS TO BUILD

Build these as reusable components in a `components/ui/` or `components/shared/` directory before refactoring any screens.

### 1. Card

```
Props:
- children: ReactNode
- accent?: string (color for left border, e.g., colors.teal)
- style?: ViewStyle (override)

Pattern:
- White background (#FFFFFF)
- border-radius: 12
- shadow: card shadow from theme
- 4px left border in accent color (if provided)
- Horizontal margin: 16px
- Bottom margin: 10px
- Inner padding: 12px vertical, 14px horizontal
```

### 2. SectionHeader

```
Props:
- title: string
- action?: string (e.g., "See All", "Details")
- onAction?: () => void

Pattern:
- Flex row, space-between
- Title: condensed bold font, 15px, uppercase, tracking-wide, navy color
- Action: 12px, regular, gray (#6B7C8A), tappable
- Padding: 14px top, 6px bottom, 16px horizontal
```

### 3. Badge

```
Props:
- text: string
- color: string (background)
- textColor?: string (defaults to white)

Pattern:
- Inline-block/self-sizing
- padding: 2px vertical, 10px horizontal
- border-radius: 20 (full round)
- Font: 10px, bold, uppercase, tracking 0.06em
```

### 4. PillTabs

```
Props:
- tabs: string[]
- activeIndex: number
- onTabChange: (index: number) => void

Pattern:
- Container: flex row, background #E8F0F5, rounded-full (24), padding 3-4px
- Each tab: flex-1, padding 8px vertical, rounded-full (20)
- Active tab: background #2C5F7C (steel blue), white text, subtle shadow
- Inactive tab: transparent background, #6B7C8A text
- Font: 11px, bold, uppercase, tracking 0.02em
```

### 5. BottomNav

```
Props:
- activeTab: string
- tabs: Array<{ id: string, icon: IconComponent, label?: string }>

Pattern:
- Sticky bottom, white background with 95% opacity + backdrop-blur
- Border-top: 1px #D9E2E9
- Flex row, space-around, padding 12px vertical
- Active icon: steel blue (#2C5F7C), strokeWidth 2.5, filled
- Inactive icon: muted gray (#6B7C8A), strokeWidth 1.5
- Active indicator: 4px teal dot below icon
```

### 6. Avatar

```
Props:
- initials: string
- size?: number (default 36)
- color?: string (background, default steel blue)

Pattern:
- Circular (borderRadius = size)
- Background: provided color
- White text, centered, fontSize = size * 0.38
- Bold weight
```

### 7. StatBox

```
Props:
- value: string | number
- label: string
- accentColor?: string (top border color, default teal)

Pattern:
- White background, rounded 10
- Card shadow
- Flex-1 (used in rows of 3-4)
- 3px solid top border in accent color
- Value: condensed display font, 26px, bold, accent color
- Label: 9px, uppercase, tracking 0.05em, gray
- Padding: 10px vertical, 8px horizontal
- Text-align: center
```

### 8. MatchCard

```
Props:
- homeTeam: string
- awayTeam: string
- time: string
- date?: string
- venue: string
- borderColor?: string (left accent, default steel blue)
- score?: { home: number, away: number }

Pattern:
- Card base (white, rounded 12, shadow, left accent border)
- Flex row: [TeamIcon + Name] — [Time/Score center] — [Name + TeamIcon]
- Team icons: 28px circle, #E8F0F5 background, volleyball SVG inside
- Team names: 12px, bold, uppercase, tracking-wide
- Time: 18px, extrabold, steel blue color (condensed font)
- Date: 10px, muted gray, below time
- Venue: 10px, muted gray, centered, below the row
- If score provided: show "25 @ 21" format instead of time
```

### 9. TopBar / Header

```
Props:
- showLogo?: boolean
- title?: string
- leftIcon?: ReactNode (e.g., back arrow)
- rightIcon?: ReactNode (e.g., bell + avatar)

Pattern:
- Height: 52
- Background: navy (#1B2838)
- Flex row, space-between, padding 0 16px
- Logo mode: volleyball icon (teal circle) + "VOLLEYBRAIN" text (condensed, 16px, white, tracking 0.08em)
- Title mode: centered, condensed font, 18px, white, uppercase, tracking 0.1em
```

---

## 📋 SCREEN-BY-SCREEN REFACTOR ORDER

### Recommended order (safest → most complex):

#### Phase 1: Foundation
1. **Create theme files** (colors, typography, shadows, spacing)
2. **Build shared components** (Card, Badge, SectionHeader, etc.)
3. **Update global styles** — set the #C8D3DC background color as the app default

#### Phase 2: Low-Risk Screens
4. **Schedule screen** — mostly list-based, straightforward card replacement
5. **Team Wall / Social Feed** — card-based feed, add post cards with the v0 styling

#### Phase 3: Core Dashboards
6. **Parent Dashboard (Home)** — the v0 winner design. This includes:
   - Header with logo + bell + avatar
   - "UPCOMING" pill badge
   - Game Day hero card with background image, gradient overlay, "GAME DAY" text, opponent, time, location, "Get Directions" button, "AWAY" badge
   - Upcoming match cards (MatchCard component)
   - "MY PLAYERS" horizontal scroll of player mini-cards with photo, gradient, name, team, number
   - "TEAM ACTIVITY" feed section at bottom (coach posts, game results, parent posts)
   - Bottom nav

7. **Coach Dashboard** — similar structure, add:
   - Today's practice card with RSVP counter (attendance dots)
   - Season stats row (StatBox x4)
   - Upcoming matches
   - Recent results
   - Practice plan card with drill progress bar

#### Phase 4: Detail Screens
8. **Player Profile / Stats**
9. **Game Recap / Match Details**
10. **Chat** — add pill tab channels, message bubbles with avatar + badge + reactions
11. **Roster** — player list with position badges, court visualization if applicable

#### Phase 5: Admin Screens
12. **Admin Dashboard** — different layout: pulse strip, action queue, financial snapshot, team overview cards

---

## 🔄 REFACTORING PATTERN (for each screen)

Follow this exact sequence for EVERY screen:

```
Step 1: READ the existing screen file completely
Step 2: IDENTIFY all data dependencies (props, hooks, context, navigation params)
Step 3: LIST every functional element (buttons, inputs, navigation calls, data fetches)
Step 4: MAP existing elements to new v0 layout
        - What stays? What moves? What gets restyled?
        - Do NOT remove any functional elements
Step 5: REFACTOR the JSX
        - Replace inline styles / old component styles with new shared components
        - Keep all onPress handlers, data bindings, conditional rendering
        - Rearrange layout order if needed to match v0 design
Step 6: TEST — does the screen render? Do all interactions still work?
Step 7: COMMIT — clean commit message: "refactor: apply v0 design to [ScreenName]"
```

---

## 🔗 KEY V0 DESIGN PATTERNS TO REPLICATE

### Game Day Hero Card (Parent Dashboard)
```
- Full-width card, rounded 16, overflow hidden
- Background: real image (from events/matches) with gradient overlay
- Gradient: linear from transparent top → #1B2838 bottom
- "UPCOMING" green pill badge at top of screen
- "AWAY" or "HOME" badge in top-right of card (orange for away, teal for home)
- "TODAY" label in teal/accent
- "GAME DAY" in large condensed bold white
- "vs [Opponent]" below
- Date, time, location in smaller white text
- "Get Directions" button with MapPin icon — rounded, dark, tappable
```

### Player Mini Cards (Horizontal Scroll)
```
- Width: 150, Height: 210
- Rounded 12, overflow hidden
- Background: player photo (fill/cover)
- Top-right: volleyball icon in semi-transparent circle
- Bottom: gradient overlay (transparent → navy)
- Name: white, bold, 14px
- Team: white/70% opacity, 10px
- Number + Position: tiny pills, white/20% background
```

### Social Feed Posts (Team Wall)
```
- Each post is a Card with left accent border
- Avatar (32px) + Name (bold) + Role Badge ("Coach", "Parent") + Timestamp
- Content text below
- If photo: full-width image inside card
- Reactions: emoji chips with counts (e.g., "👏 12", "❤️ 8")
- "Like" / "Comment" action text at bottom right
- Match result posts: embedded mini-scoreboard within the post card
```

### Attendance Dots Pattern
```
- Row of small circles (22px each)
- Green: confirmed (✓ inside)
- Orange: pending (? inside)  
- Gray light: declined (✗ inside)
- Font: 8px, bold, white (on green/orange) or gray (on light)
```

---

## 📱 WHAT TO TELL CLAUDE CODE

When you start the session, give Claude Code this context:

```
I need to refactor the VolleyBrain mobile app's UI to match a new design system. 
The app is in the volleybrain-mobile repo (Expo/React Native with Supabase backend).

RULES:
1. Do NOT touch any Supabase queries, auth, navigation routes, or business logic
2. Create a design system (theme + shared components) FIRST
3. Refactor ONE screen at a time
4. Test after each screen before moving to the next
5. Keep all functional elements — just restyle them

Start by:
1. Reading the current project structure
2. Creating the theme files (colors, typography, shadows, spacing)
3. Building the shared UI components (Card, Badge, SectionHeader, PillTabs, etc.)
4. Then we'll go screen by screen

I'm attaching the design system document with exact color codes, 
component specs, and the refactoring strategy.
```

Then paste or reference this document.

---

## 📁 FILES TO PROVIDE CLAUDE CODE

1. **This document** (the design system + refactoring plan)
2. **The v0 globals.css** — contains all CSS custom properties and exact color values
3. **The v0 component files** (for reference patterns):
   - `pill-tabs.tsx` — PillTabs pattern
   - `bottom-nav.tsx` — BottomNav pattern
   - `match-card.tsx` — MatchCard pattern
   - `section-header.tsx` — SectionHeader pattern
   - `parent-dashboard.tsx` — the full parent dashboard layout
   - `team-wall.tsx` — the social feed layout
   - `full-schedule.tsx` — the schedule layout

These are web (React/Next.js) components — Claude Code will need to translate the patterns to React Native equivalents (View, Text, StyleSheet, ScrollView, etc.), but the design tokens, spacing, and visual patterns are the source of truth.

---

## ✅ SUCCESS CRITERIA

After the refactor is complete:
- [ ] App background is #C8D3DC (dusty blue-gray)
- [ ] All cards are white with rounded corners (12px) and visible shadows
- [ ] Cards with accent colors have a 4px left border
- [ ] Section headers are condensed bold uppercase with tracking
- [ ] Match cards show Team vs Team with time/score in the center
- [ ] PillTabs use #E8F0F5 container with steel blue active fill
- [ ] Bottom nav has active teal indicator dots
- [ ] Header bar is navy (#1B2838) with logo or title
- [ ] Stat boxes have colored top borders with large numbers
- [ ] Badges are pill-shaped with appropriate colors
- [ ] ALL existing functionality still works — navigation, data loading, RSVP, chat, payments, registration
- [ ] No Supabase queries were modified
- [ ] No navigation routes were changed
