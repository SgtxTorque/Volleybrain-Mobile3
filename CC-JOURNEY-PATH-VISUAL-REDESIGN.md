# CC-JOURNEY-PATH-VISUAL-REDESIGN
# Lynx Journey Path — Visual Redesign: Super Mario World Style
# Status: READY FOR CC EXECUTION
# Depends on: All engagement phases complete, quest UX overhaul complete

---

## STANDING RULES

1. **Read these files first, in order:**
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
   - `MASCOT-ASSET-MAP.md` in repo root
2. **Read the current JourneyPathScreen completely** before modifying it. Understand the data flow, navigation, and how nodes render.
3. **Read `hooks/useJourneyPath.ts`** — this hook stays exactly as-is. The data layer does NOT change. Only the visual presentation changes.
4. **Do NOT modify any engine files (lib/*.ts), hooks, database tables, or migrations.**
5. **The ONLY hook you may modify is `useJourneyPath.ts`** — and ONLY to add a `theme` field to the chapter data based on chapter_number. No other changes.
6. **Commit after each phase.** Commit message format: `[journey-redesign] Phase X: description`
7. **If something is unclear, STOP and report back.**
8. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Completely rebuilds the visual presentation of the Journey Path screen from a straight-line list of circles into an immersive, themed world map inspired by Super Mario World.

**Key changes:**
- Each chapter has a unique themed environment (backyard, gym, beach, arena, street court, stadium)
- Nodes wind through the environment on curved paths (left, right, center, branching)
- Bonus nodes branch off the main path like secret levels
- Animated elements bring each environment to life (clouds, light flickers, crowd movement, etc.)
- Parallax-style zone transitions between chapters
- The mascot cub appears at the player's current position
- Completion celebrations are environment-specific

**What does NOT change:**
- The data layer (useJourneyPath hook queries, data types)
- The node tap behavior (opens detail card)
- The skill module flow (SkillModuleScreen)
- The celebration flow (NodeCompletionCelebration)
- Navigation (Continue Training card, Journey tab)

---

## CHAPTER THEME MAP

| Chapter | Title | Theme | Environment | Color Palette | Ambient Elements |
|---------|-------|-------|-------------|---------------|------------------|
| 1 | First Touch | backyard | Grass, trees, net between posts, sunny sky | Greens, warm yellows, sky blue | Butterflies, swaying grass, drifting clouds |
| 2 | Serve It Up | gym | Indoor gym, wooden floor, bleachers, banners | Warm browns, cream, school colors | Flickering gym lights, bouncing shadows |
| 3 | Net Game | beach | Sand court, ocean backdrop, palm trees, sunset | Turquoise, sand gold, coral | Waves rolling, palm sway, seagulls |
| 4 | Defense Wins | arena | Polished court, packed bleachers, team banners | Deep navy, arena white, spotlight gold | Camera flashes, crowd wave, scoreboard glow |
| 5 | Court Commander | gym_pro | Upgraded gym, scoreboards, ref stand, big crowd | Rich browns, electric blue, white | Scoreboard ticking, crowd noise dots |
| 6 | Advanced Arsenal | street | Outdoor concrete, chain fence, cars, crowd, sunset | Concrete gray, sunset orange, neon | Street lights flickering, crowd bobbing |
| 7 | Team Synergy | tournament | Big indoor venue, multiple courts, banners | Royal purple, tournament gold, white | Banner sway, multiple court activity |
| 8 | Championship Road | stadium | Championship stadium, spotlights, trophy, confetti | Gold, black, spotlight white | Spotlight sweep, confetti particles, crowd roar pulse |

---

## PHASE 1: Investigation — Read before writing

Before writing any code, read and report:

1. **Current JourneyPathScreen** — What file is it? (`screens/JourneyPathScreen.tsx`, `app/(tabs)/journey.tsx`, or `app/journey-path.tsx`?) Show the full component structure. How does it currently render chapters and nodes?

2. **How are images loaded in the app?** Does the app use `require()` for local assets? `Image` from react-native? `expo-image`? Check how the mascot images are loaded in other components (e.g., PlayerIdentityHero).

3. **Does the app use `react-native-reanimated` or `Animated` from react-native?** Check imports across components. Which animation library is standard?

4. **Does the app use `react-native-svg`?** Check if it's installed. We'll need SVG paths for the winding connectors.

5. **Screen dimensions:** How does the app get screen width/height? `Dimensions.get('window')`? `useWindowDimensions`? Note the pattern.

6. **ScrollView or FlatList?** What does the current journey screen use for scrolling? We need a ScrollView (not FlatList) for the world map since it's a free-form layout with overlapping positioned elements.

7. **What's `react-native-linear-gradient` or `expo-linear-gradient` status?** Check if a gradient library is available. We need it for sky backgrounds.

**Report findings, then proceed to Phase 2.** Do not wait for confirmation.

---

## PHASE 2: Create the theme configuration system

Create a new file:
```
lib/journey-themes.ts
```

This file defines the visual theme for each chapter, including colors, environment elements, and ambient animation configs.

```typescript
import { MASCOT } from '@/lib/mascot-images';

export interface JourneyTheme {
  id: string;
  chapterNumber: number;
  name: string;
  // Sky / Background
  skyGradient: string[];  // Array of color stops top to bottom
  // Ground
  groundColor: string;
  groundTexture: 'grass' | 'wood' | 'sand' | 'concrete' | 'polish' | 'turf';
  // Court
  courtColor: string;
  courtLineColor: string;
  hasNet: boolean;
  // Environment objects (positioned absolutely)
  envObjects: EnvObject[];
  // Path connector
  pathColor: string;
  pathDoneColor: string;
  pathLockedColor: string;
  // Ambient animations
  ambientElements: AmbientElement[];
  // Node glow color for current node
  currentNodeGlow: string;
  // Transition to next chapter text
  nextZoneLabel: string;
  // Mascot for chapter gate completion
  gateMascot: any;
}

export interface EnvObject {
  type: 'tree' | 'palm' | 'car' | 'bleacher' | 'fence' | 'building' | 'light_pole' | 'banner' | 'trophy' | 'scoreboard' | 'crowd_person' | 'spotlight';
  x: number;  // Percentage from left (0-100)
  y: number;  // Percentage from top of the chapter zone (0-100)
  width: number;
  height: number;
  color: string;
  secondaryColor?: string;
  flipX?: boolean;
  zIndex?: number;
}

export interface AmbientElement {
  type: 'cloud' | 'butterfly' | 'wave' | 'seagull' | 'flash' | 'confetti' | 'light_flicker' | 'crowd_bob' | 'banner_sway' | 'spotlight_sweep' | 'grass_sway' | 'palm_sway';
  count: number;
  speed: 'slow' | 'medium' | 'fast';
  color?: string;
  opacity?: number;
}

// ─── Theme Definitions ───────────────────────────────────────────────────────

const THEMES: Record<number, JourneyTheme> = {
  1: {
    id: 'backyard',
    chapterNumber: 1,
    name: 'Backyard court',
    skyGradient: ['#87CEEB', '#B0E0FF', '#E8F4FF'],
    groundColor: '#4a7c3f',
    groundTexture: 'grass',
    courtColor: '#5a8a4f',
    courtLineColor: 'rgba(255,255,255,0.3)',
    hasNet: true,
    envObjects: [
      { type: 'tree', x: 5, y: 10, width: 40, height: 80, color: '#2d5a27', secondaryColor: '#5a3a1a' },
      { type: 'tree', x: 88, y: 15, width: 35, height: 70, color: '#3a6b30', secondaryColor: '#4a2a10' },
      { type: 'tree', x: 92, y: 50, width: 30, height: 60, color: '#2d5a27', secondaryColor: '#5a3a1a', flipX: true },
      { type: 'fence', x: 0, y: 5, width: 100, height: 15, color: '#8B7355' },
    ],
    pathColor: 'rgba(139,115,85,0.6)',
    pathDoneColor: '#22C55E',
    pathLockedColor: 'rgba(139,115,85,0.2)',
    ambientElements: [
      { type: 'cloud', count: 3, speed: 'slow', opacity: 0.4 },
      { type: 'butterfly', count: 2, speed: 'medium', color: '#FFD700' },
      { type: 'grass_sway', count: 8, speed: 'slow', color: '#5a9a4f' },
    ],
    currentNodeGlow: '#22C55E',
    nextZoneLabel: 'Chapter 2: School gym',
    gateMascot: MASCOT.BACKYARD_PRACTICE,
  },

  2: {
    id: 'gym',
    chapterNumber: 2,
    name: 'School gym',
    skyGradient: ['#1a1510', '#2a2015', '#3a2a1a'],
    groundColor: '#8B6914',
    groundTexture: 'wood',
    courtColor: '#9a7520',
    courtLineColor: 'rgba(255,255,255,0.25)',
    hasNet: true,
    envObjects: [
      { type: 'bleacher', x: 0, y: 0, width: 15, height: 100, color: '#5a4530' },
      { type: 'bleacher', x: 85, y: 0, width: 15, height: 100, color: '#5a4530' },
      { type: 'banner', x: 20, y: 5, width: 25, height: 12, color: '#1a3a6a' },
      { type: 'banner', x: 55, y: 5, width: 25, height: 12, color: '#8B0000' },
      { type: 'scoreboard', x: 40, y: 2, width: 20, height: 8, color: '#222' },
    ],
    pathColor: 'rgba(255,255,255,0.15)',
    pathDoneColor: '#4BB9EC',
    pathLockedColor: 'rgba(255,255,255,0.05)',
    ambientElements: [
      { type: 'light_flicker', count: 4, speed: 'slow', opacity: 0.1 },
    ],
    currentNodeGlow: '#4BB9EC',
    nextZoneLabel: 'Chapter 3: Beach court',
    gateMascot: MASCOT.LYNX_READY,
  },

  3: {
    id: 'beach',
    chapterNumber: 3,
    name: 'Beach court',
    skyGradient: ['#FF6B35', '#FF8C5A', '#FFB88C', '#87CEEB'],
    groundColor: '#D4A76A',
    groundTexture: 'sand',
    courtColor: '#C49A5A',
    courtLineColor: 'rgba(255,255,255,0.2)',
    hasNet: true,
    envObjects: [
      { type: 'palm', x: 3, y: 5, width: 30, height: 90, color: '#2d6a1a', secondaryColor: '#6a4a2a' },
      { type: 'palm', x: 90, y: 10, width: 25, height: 80, color: '#3a7a25', secondaryColor: '#7a5a3a', flipX: true },
    ],
    pathColor: 'rgba(255,255,255,0.2)',
    pathDoneColor: '#FF6B35',
    pathLockedColor: 'rgba(255,255,255,0.06)',
    ambientElements: [
      { type: 'wave', count: 3, speed: 'medium', color: '#4BB9EC', opacity: 0.3 },
      { type: 'seagull', count: 2, speed: 'slow' },
      { type: 'palm_sway', count: 2, speed: 'slow' },
    ],
    currentNodeGlow: '#FF6B35',
    nextZoneLabel: 'Chapter 4: Indoor arena',
    gateMascot: MASCOT.ARE_YOU_READY,
  },

  4: {
    id: 'arena',
    chapterNumber: 4,
    name: 'Indoor arena',
    skyGradient: ['#0a0a1a', '#0f1025', '#1a1535'],
    groundColor: '#1a3050',
    groundTexture: 'polish',
    courtColor: '#1a4070',
    courtLineColor: 'rgba(255,255,255,0.2)',
    hasNet: true,
    envObjects: [
      { type: 'bleacher', x: 0, y: 0, width: 12, height: 100, color: '#1a1a30' },
      { type: 'bleacher', x: 88, y: 0, width: 12, height: 100, color: '#1a1a30' },
      { type: 'spotlight', x: 20, y: 0, width: 10, height: 40, color: '#FFD700' },
      { type: 'spotlight', x: 70, y: 0, width: 10, height: 40, color: '#FFD700' },
      { type: 'banner', x: 15, y: 3, width: 20, height: 10, color: '#4BB9EC' },
      { type: 'banner', x: 65, y: 3, width: 20, height: 10, color: '#FFD700' },
    ],
    pathColor: 'rgba(75,185,236,0.2)',
    pathDoneColor: '#4BB9EC',
    pathLockedColor: 'rgba(75,185,236,0.05)',
    ambientElements: [
      { type: 'flash', count: 3, speed: 'fast', opacity: 0.15 },
      { type: 'crowd_bob', count: 6, speed: 'medium' },
      { type: 'spotlight_sweep', count: 2, speed: 'slow', color: '#FFD700', opacity: 0.08 },
    ],
    currentNodeGlow: '#FFD700',
    nextZoneLabel: 'Chapter 5: Pro gym',
    gateMascot: MASCOT.DEFENSE_READY,
  },

  5: {
    id: 'gym_pro',
    chapterNumber: 5,
    name: 'Pro gym',
    skyGradient: ['#12100a', '#1a1510', '#25201a'],
    groundColor: '#7a5a10',
    groundTexture: 'wood',
    courtColor: '#8a6a1a',
    courtLineColor: 'rgba(255,255,255,0.3)',
    hasNet: true,
    envObjects: [
      { type: 'bleacher', x: 0, y: 0, width: 10, height: 100, color: '#3a2a15' },
      { type: 'bleacher', x: 90, y: 0, width: 10, height: 100, color: '#3a2a15' },
      { type: 'scoreboard', x: 30, y: 2, width: 40, height: 10, color: '#111', secondaryColor: '#22C55E' },
      { type: 'banner', x: 12, y: 4, width: 16, height: 8, color: '#4BB9EC' },
      { type: 'banner', x: 72, y: 4, width: 16, height: 8, color: '#FF6B6B' },
    ],
    pathColor: 'rgba(255,255,255,0.12)',
    pathDoneColor: '#4BB9EC',
    pathLockedColor: 'rgba(255,255,255,0.04)',
    ambientElements: [
      { type: 'light_flicker', count: 6, speed: 'slow', opacity: 0.08 },
      { type: 'crowd_bob', count: 4, speed: 'slow' },
    ],
    currentNodeGlow: '#4BB9EC',
    nextZoneLabel: 'Chapter 6: Street court',
    gateMascot: MASCOT.VISUALIZE,
  },

  6: {
    id: 'street',
    chapterNumber: 6,
    name: 'Street court',
    skyGradient: ['#1a1520', '#2d1f3a', '#4a2d5c', '#e8875c', '#f4a66a'],
    groundColor: '#2a2a2a',
    groundTexture: 'concrete',
    courtColor: '#333',
    courtLineColor: 'rgba(255,255,255,0.15)',
    hasNet: true,
    envObjects: [
      { type: 'fence', x: 0, y: 0, width: 100, height: 8, color: '#555' },
      { type: 'building', x: 2, y: -20, width: 8, height: 25, color: '#1a1225' },
      { type: 'building', x: 12, y: -25, width: 6, height: 30, color: '#151020' },
      { type: 'building', x: 20, y: -18, width: 10, height: 22, color: '#1a1225' },
      { type: 'building', x: 70, y: -22, width: 7, height: 27, color: '#151020' },
      { type: 'building', x: 80, y: -20, width: 12, height: 24, color: '#1a1225' },
      { type: 'building', x: 93, y: -28, width: 7, height: 33, color: '#151020' },
      { type: 'car', x: 2, y: 30, width: 14, height: 7, color: '#8B0000' },
      { type: 'car', x: 85, y: 25, width: 13, height: 6, color: '#1a3a5c' },
      { type: 'car', x: 1, y: 65, width: 15, height: 7, color: '#2d2d2d' },
      { type: 'car', x: 86, y: 70, width: 12, height: 6, color: '#c4a030' },
      { type: 'light_pole', x: 8, y: 5, width: 2, height: 20, color: '#555' },
      { type: 'light_pole', x: 90, y: 5, width: 2, height: 20, color: '#555' },
      { type: 'crowd_person', x: 18, y: 28, width: 2, height: 4, color: '#d4537e' },
      { type: 'crowd_person', x: 21, y: 29, width: 2, height: 4, color: '#378ADD' },
      { type: 'crowd_person', x: 24, y: 27, width: 2, height: 4, color: '#22c55e' },
      { type: 'crowd_person', x: 75, y: 26, width: 2, height: 4, color: '#EF9F27' },
      { type: 'crowd_person', x: 78, y: 28, width: 2, height: 4, color: '#7F77DD' },
      { type: 'crowd_person', x: 81, y: 27, width: 2, height: 4, color: '#E24B4A' },
    ],
    pathColor: 'rgba(255,200,150,0.15)',
    pathDoneColor: '#f4a66a',
    pathLockedColor: 'rgba(255,200,150,0.04)',
    ambientElements: [
      { type: 'light_flicker', count: 2, speed: 'medium', color: '#FFD88C', opacity: 0.12 },
      { type: 'crowd_bob', count: 6, speed: 'medium' },
    ],
    currentNodeGlow: '#f4a66a',
    nextZoneLabel: 'Chapter 7: Tournament arena',
    gateMascot: MASCOT.ADVANCE_JUMP_SERVE,
  },

  7: {
    id: 'tournament',
    chapterNumber: 7,
    name: 'Tournament arena',
    skyGradient: ['#0a0520', '#15103a', '#201550'],
    groundColor: '#1a2050',
    groundTexture: 'turf',
    courtColor: '#1a3060',
    courtLineColor: 'rgba(255,255,255,0.25)',
    hasNet: true,
    envObjects: [
      { type: 'bleacher', x: 0, y: 0, width: 10, height: 100, color: '#15102a' },
      { type: 'bleacher', x: 90, y: 0, width: 10, height: 100, color: '#15102a' },
      { type: 'banner', x: 15, y: 2, width: 18, height: 10, color: '#7F77DD' },
      { type: 'banner', x: 37, y: 2, width: 26, height: 12, color: '#FFD700' },
      { type: 'banner', x: 67, y: 2, width: 18, height: 10, color: '#4BB9EC' },
      { type: 'spotlight', x: 10, y: 0, width: 8, height: 35, color: '#7F77DD' },
      { type: 'spotlight', x: 82, y: 0, width: 8, height: 35, color: '#7F77DD' },
    ],
    pathColor: 'rgba(127,119,221,0.2)',
    pathDoneColor: '#7F77DD',
    pathLockedColor: 'rgba(127,119,221,0.05)',
    ambientElements: [
      { type: 'spotlight_sweep', count: 2, speed: 'medium', color: '#7F77DD', opacity: 0.06 },
      { type: 'banner_sway', count: 3, speed: 'slow' },
      { type: 'crowd_bob', count: 8, speed: 'slow' },
    ],
    currentNodeGlow: '#7F77DD',
    nextZoneLabel: 'Chapter 8: Championship stadium',
    gateMascot: MASCOT.TEAM_HUDDLE,
  },

  8: {
    id: 'stadium',
    chapterNumber: 8,
    name: 'Championship stadium',
    skyGradient: ['#000', '#0a0a15', '#111125'],
    groundColor: '#0a1530',
    groundTexture: 'polish',
    courtColor: '#0f2040',
    courtLineColor: 'rgba(255,215,0,0.2)',
    hasNet: true,
    envObjects: [
      { type: 'bleacher', x: 0, y: 0, width: 8, height: 100, color: '#0a0a1a' },
      { type: 'bleacher', x: 92, y: 0, width: 8, height: 100, color: '#0a0a1a' },
      { type: 'trophy', x: 42, y: 2, width: 16, height: 15, color: '#FFD700' },
      { type: 'spotlight', x: 5, y: 0, width: 12, height: 50, color: '#FFD700' },
      { type: 'spotlight', x: 30, y: 0, width: 12, height: 50, color: '#fff' },
      { type: 'spotlight', x: 58, y: 0, width: 12, height: 50, color: '#fff' },
      { type: 'spotlight', x: 83, y: 0, width: 12, height: 50, color: '#FFD700' },
      { type: 'banner', x: 10, y: 3, width: 14, height: 8, color: '#FFD700' },
      { type: 'banner', x: 76, y: 3, width: 14, height: 8, color: '#FFD700' },
    ],
    pathColor: 'rgba(255,215,0,0.15)',
    pathDoneColor: '#FFD700',
    pathLockedColor: 'rgba(255,215,0,0.04)',
    ambientElements: [
      { type: 'spotlight_sweep', count: 4, speed: 'medium', color: '#FFD700', opacity: 0.1 },
      { type: 'confetti', count: 20, speed: 'slow', opacity: 0.3 },
      { type: 'flash', count: 5, speed: 'fast', opacity: 0.08 },
      { type: 'crowd_bob', count: 10, speed: 'medium' },
    ],
    currentNodeGlow: '#FFD700',
    nextZoneLabel: 'Journey complete',
    gateMascot: MASCOT.LEGENDARY_STREAK,
  },
};

export function getChapterTheme(chapterNumber: number): JourneyTheme {
  return THEMES[chapterNumber] || THEMES[1];
}

export function getAllThemes(): JourneyTheme[] {
  return Object.values(THEMES);
}
```

**Commit:** `[journey-redesign] Phase 2: theme configuration system`

---

## PHASE 3: Create environment renderer components

Create a directory and files:
```
components/journey/
```

### 3A: ChapterEnvironment.tsx

This component renders the full background environment for a chapter zone: sky, ground, court, environment objects, and ambient animations.

**Design principles:**
- Each chapter zone takes approximately 600-900px of vertical scroll space depending on node count
- The sky gradient is the top portion (first 200px)
- Environment objects are positioned absolutely within the zone
- Ambient animations run continuously using `Animated` (or `react-native-reanimated` if available)
- The court is visible as a subtle background element, not the focus (nodes are the focus)

**Implementation:**
- Accept `theme: JourneyTheme` and `height: number` as props
- Render the sky gradient using `LinearGradient` (expo-linear-gradient or equivalent)
- Render ground as a flat colored View
- Render each envObject based on its type using simple shapes (Views with border-radius, not images)
  - `tree`: tall rectangle trunk + circle/ellipse canopy
  - `palm`: angled trunk + drooping leaf shapes
  - `car`: rounded rectangle body + circles for wheels
  - `bleacher`: angled rectangle rows
  - `fence`: repeating vertical bars
  - `building`: rectangles with tiny window dots
  - `light_pole`: thin rectangle + head
  - `banner`: rectangle with slight transform rotate
  - `trophy`: cup shape (two trapezoids)
  - `scoreboard`: dark rectangle with tiny dots
  - `crowd_person`: small pill shapes with circle heads
  - `spotlight`: cone shape (triangle or gradient)
- All shapes are built from React Native Views, not images. This keeps the file size tiny and allows color theming.

### 3B: AmbientAnimations.tsx

This component renders the ambient animated elements that make each environment feel alive.

**Animation types:**
- `cloud`: white semi-transparent ellipse that drifts slowly left to right, loops. Use `Animated.timing` with `loop`.
- `butterfly`: tiny colored dot that follows a sine-wave path. Two per screen, different speeds.
- `wave`: horizontal blue line at the bottom of the beach zone that oscillates up/down slightly.
- `seagull`: tiny V-shape that drifts across the sky.
- `flash`: random white opacity pulse at random positions (camera flash effect in arena).
- `confetti`: tiny colored rectangles falling slowly from the top. Different colors, speeds, rotations.
- `light_flicker`: subtle opacity pulse on a fixed position (gym light buzz effect).
- `crowd_bob`: small pill shapes that shift up/down slightly in rhythm (crowd bouncing).
- `banner_sway`: slight rotation oscillation on banner elements.
- `spotlight_sweep`: a wide translucent cone that slowly rotates (stadium spotlight).
- `grass_sway`: tiny green lines that tilt left/right.
- `palm_sway`: slight rotation on palm tree canopy.

**Performance rules:**
- Use `useNativeDriver: true` on every animation (only transform and opacity)
- Limit total simultaneous animations to 15 per visible zone
- Animations that are off-screen should pause (use visibility detection or just accept the cost)
- Each animation is a separate `Animated.View` with absolute positioning

### 3C: WindingPath.tsx

This component renders the SVG path that connects nodes within a chapter.

**If react-native-svg is available:**
- Render an `<Svg>` overlay with a `<Path>` element
- The path curves between node positions using cubic bezier curves
- Different stroke styles for done (solid, colored), current (dashed, animated), locked (faint dotted)
- The path should feel organic, not geometric

**If react-native-svg is NOT available:**
- Fall back to a series of small `View` elements forming a dotted/dashed line
- Position them absolutely between node centers
- Use rotation transforms to angle segments between nodes

**Node positions:** Calculate from the node's `position_offset` (left/center/right) and its index:
- Left: x = 25% of screen width
- Center: x = 50%
- Right: x = 75%
- Y: each node is spaced ~100px apart vertically

The path connects node centers with gentle S-curves:
- Left to Right: curve goes center-right
- Right to Left: curve goes center-left
- Same side to same side: slight curve opposite direction
- Branch to bonus: shorter curve going sideways

**Commit:** `[journey-redesign] Phase 3: environment renderer components`

---

## PHASE 4: Create the node components

### 4A: JourneyNode.tsx

Redesigned node component for the world map. Replaces the simple circle from the old design.

**Node states (same data, new visuals):**

**Completed node:**
- Bright circle with the chapter's `pathDoneColor`
- Mascot image inside (from skill_content.tip_image_url)
- Checkmark badge (bottom-right)
- Subtle glow matching theme
- Spring entrance animation when scrolled into view

**Current/Available node:**
- Pulsing circle with the chapter's `currentNodeGlow`
- Mascot image inside (full opacity)
- Animated ring pulse (concentric expanding circles that fade)
- "START" micro-label below
- The Lynx cub mascot (LYNX_READY) appears next to this node as a small companion

**Locked node:**
- Dark, muted circle with very low opacity
- Mascot image inside (grayscale, 20% opacity)
- Small lock icon overlay
- No glow

**Boss node:**
- Larger (70px vs 56px)
- Rounded square shape (border-radius 20px)
- Gold accent border when available
- Crown or star decoration above
- "BOSS" micro-label

**Bonus node (branching):**
- Smaller (40px)
- Dashed border (purple tint)
- Star or sparkle decoration
- "BONUS" micro-label
- Connected to the main path via a short dashed branch line

**All nodes:**
- Label below: node title (10px, themed color based on state)
- XP reward below label (8px, gold tint)
- Tap opens the detail bottom sheet (same behavior as before)

### 4B: PlayerPositionIndicator.tsx

A small Lynx cub mascot that sits next to the current/available node, indicating where the player is on the map.

- Uses LYNX_READY mascot image (32px)
- Positioned to the side of the current node (opposite side of the node's offset)
- Gentle bouncing animation (translate Y oscillation)
- Speech bubble with contextual text: "Let's go!", "You're here!", "Next up!"

**Commit:** `[journey-redesign] Phase 4: redesigned node components`

---

## PHASE 5: Create the chapter zone transition

### ChapterZoneGate.tsx

When one chapter ends and the next begins, there's a visual transition zone.

**For completed chapters transitioning to the next:**
- A decorative divider showing the completed chapter's badge
- "Chapter X complete!" text with the mascot in a celebration pose
- The environment gradually transitions (sky colors blend, ground type changes)
- A gate/archway visual that the path passes through

**For locked chapters:**
- A locked gate visual
- "Reach Level X to unlock" text
- The environment beyond the gate is visible but dimmed/desaturated
- A padlock icon on the gate

**Transition effect:**
- The sky gradient of the current chapter blends into the next chapter's gradient over ~80px of scroll
- The ground color transitions similarly
- Environment objects from both chapters may overlap slightly in the transition zone

**Commit:** `[journey-redesign] Phase 5: chapter zone transitions`

---

## PHASE 6: Rebuild JourneyPathScreen with themed zones

**File to modify:** The current JourneyPathScreen (found in Phase 1 investigation)

### Complete rebuild of the render logic:

The screen becomes a `ScrollView` containing a series of chapter zones stacked vertically. Each zone is a `ChapterEnvironment` with nodes positioned inside it.

**Structure:**
```
ScrollView
  ├── Header (sticky: back arrow, "Journey Path", streak)
  ├── Progress bar (Chapter X of 8, N of 53 complete)
  │
  ├── ChapterZone (Chapter 1: Backyard)
  │   ├── ChapterEnvironment (theme: backyard)
  │   ├── AmbientAnimations
  │   ├── WindingPath (connecting nodes)
  │   ├── JourneyNode x 6 (positioned on the path)
  │   ├── BonusNode x 1-2 (branching off)
  │   └── PlayerPositionIndicator (if current chapter)
  │
  ├── ChapterZoneGate (Chapter 1 > 2 transition)
  │
  ├── ChapterZone (Chapter 2: Gym)
  │   ├── ...same structure...
  │
  ├── ChapterZoneGate (Chapter 2 > 3 transition)
  │   ... and so on for all 8 chapters ...
  │
  └── Journey Complete zone (if all done)
```

**Completed chapters:** Render fully but with a "collapsed" feel. Nodes are smaller (40px instead of 56px), all marked complete, the environment is slightly desaturated. The chapter header shows a completion badge. Tapping a completed chapter expands it back to full size (accordion-style expand/collapse).

**Current chapter:** Renders at full size with full animations. Auto-scrolled to on mount.

**Locked chapters:** Render the gate only. The environment is barely visible (10% opacity peek of what's coming). The locked gate is prominent.

**Auto-scroll:** On mount, automatically scroll to the player's current position (first available node). Use `scrollTo` with the y-offset of the current node. Add a brief delay (500ms) so the user sees the scroll happen.

### Data flow:

The hook `useJourneyPath` returns chapters with nodes and progress. The screen maps each chapter to a themed zone:

```typescript
import { getChapterTheme } from '@/lib/journey-themes';

chapters.map(chapter => {
  const theme = getChapterTheme(chapter.chapter_number);
  return (
    <ChapterZone theme={theme} chapter={chapter} ... />
  );
});
```

**Keep the existing detail bottom sheet behavior.** When a node is tapped, the same detail card slides up with mascot image, title, description, XP, steps, and action button. Do not change the detail card design.

**Commit:** `[journey-redesign] Phase 6: rebuild JourneyPathScreen with themed zones`

---

## PHASE 7: Add bonus nodes to journey data

**File to modify:** `hooks/useJourneyPath.ts`

### Small addition:

Add a `theme` field to each chapter based on chapter_number:

```typescript
import { getChapterTheme } from '@/lib/journey-themes';

// Inside the chapter assembly:
const theme = getChapterTheme(chapter.chapter_number);

return {
  ...chapter,
  theme: theme.id,
  nodes: chapterNodes,
  ...
};
```

Also add `theme` to the `JourneyChapter` interface:
```typescript
export interface JourneyChapter {
  ...existing fields...
  theme: string;  // ADD THIS
}
```

**This is the ONLY change to the hook.** Do not change queries, data fetching, or progress logic.

**Commit:** `[journey-redesign] Phase 7: add theme to journey chapters`

---

## PHASE 8: Verification

### Verify:

1. **Each chapter renders with its unique themed environment** (different sky, ground, objects)
2. **Nodes wind through the environment** on curved/offset paths (not a straight vertical line)
3. **Bonus nodes branch off** the main path with dashed connector lines
4. **Ambient animations run** (clouds drift, lights flicker, crowd bobs, etc.)
5. **Chapter transitions** show gate visuals between zones
6. **Locked chapters** show a gate with "Reach Level X to unlock"
7. **Completed chapters** render in collapsed state with completion badge
8. **Current chapter** is at full size with active animations
9. **Auto-scroll** brings the player to their current position on mount
10. **Player position indicator** (Lynx cub) appears next to the current node
11. **Node tap** still opens the detail bottom sheet
12. **Detail bottom sheet** still has Start/Replay buttons that navigate correctly
13. **No data layer changes** — useJourneyPath queries are identical (except theme field addition)
14. **No TypeScript errors**
15. **Performance:** scroll is smooth, animations don't cause jank

### Report back with:

```
## VERIFICATION REPORT: Journey Path Visual Redesign

### Files Created: [count]
[list each with line count]

### Files Modified: [count]
[list each with description]

### Chapter Environments:
- Ch 1 Backyard: RENDERS / BROKEN
- Ch 2 Gym: RENDERS / BROKEN
- Ch 3 Beach: RENDERS / BROKEN
- Ch 4 Arena: RENDERS / BROKEN
- Ch 5 Pro Gym: RENDERS / BROKEN
- Ch 6 Street: RENDERS / BROKEN
- Ch 7 Tournament: RENDERS / BROKEN
- Ch 8 Stadium: RENDERS / BROKEN

### Animations Active:
[list which ambient animation types are running]

### Node Rendering:
- Completed nodes (green/themed with check): YES / NO
- Current node (pulsing glow): YES / NO
- Locked nodes (dim, grayscale): YES / NO
- Boss nodes (larger, gold accent): YES / NO
- Bonus nodes (branching, dashed): YES / NO
- Player position indicator: YES / NO

### Path Style:
- Winding/curved (not straight line): YES / NO
- Different colors per state: YES / NO

### Interactions:
- Node tap > detail card: WORKS / BROKEN
- Auto-scroll to current: WORKS / BROKEN
- Completed chapter collapse/expand: WORKS / BROKEN
- Locked chapter gate: WORKS / BROKEN

### Performance:
- Scroll smoothness: SMOOTH / JANKY
- Animation frame rate: GOOD / DROPPING

### Type Check: PASS / FAIL

### Errors: NONE / [list]
```
