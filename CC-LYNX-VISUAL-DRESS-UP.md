# CC-LYNX-VISUAL-DRESS-UP.md
# LYNX Mobile — Visual Asset Integration (5 Phases)

---

## CONTEXT

We have 41 mascot illustrations committed to the repo across 4 directories:
- `assets/images/ACHIEVEMENTS.STATS/` — 9 images (podium, badges, stats celebrations)
- `assets/images/LYNXFAMILY/` — 12 images (family members, multi-sport variants)
- `assets/images/SHOUTOUTS/` — 10 images (coach shoutout category illustrations)
- `assets/images/VOLLEYBALLACTION/` — 10 images (volleyball skill action poses)

All images have #00FF00 chroma green backgrounds that must be removed before use.

This spec wires these images into the app across celebrations, shoutouts, skill library, onboarding, and empty states. The mascot becomes the visual personality of the entire app.

---

## CRITICAL RULES — READ BEFORE EVERY PHASE

### DO NOT:
- Invent Supabase table names. Read SCHEMA_REFERENCE.csv before any database work.
- Replace ScrollViews with loading states. ScrollViews must ALWAYS be mounted.
- Use hardcoded colors. Use brand tokens only (lynx-navy, lynx-sky, lynx-gold, etc.)
- Remove or replace any existing functionality. This is ADDITIVE visual work.
- Unmount screens or use early returns before ScrollViews.
- Guess at navigation routes. Read the existing navigation structure first.

### DO:
- Read CC-LYNX-RULES.md, AGENTS.md, and LYNX-REFERENCE-GUIDE.md before any code changes.
- Read the existing component you're modifying COMPLETELY before editing.
- Commit after each phase with a descriptive message.
- Test that the app builds and runs after each phase.
- Use `resizeMode="contain"` for all mascot images. Never stretch or distort.
- Add `accessibilityLabel` to every image.

### IMAGE SIZING PHILOSOPHY:
- **Celebration modals (full-screen takeover):** Images should be LARGE. 250-300px width. These are hero moments. The image IS the screen. Don't be shy.
- **Shoutout received modal:** Image fills the top 40% of the modal. Big, proud, unmissable.
- **Feed cards and list items:** Thumbnails at 70-90px. Visible and recognizable but not dominating text content.
- **Skill module headers:** Full-width hero image, 180-220px height. The image sets the mood for the entire module.
- **Onboarding screens:** Images at 60% of screen width, centered. Big enough to be the focal point but leaving room for text below.
- **Empty states:** Images at 150-180px width, centered. Large enough to be charming, not so large they feel like an error.
- **Player card trophy case (horizontal scroll):** Badge images at 60-70px. Collectible grid energy.
- **Coach shoutout selection grid:** Cards at 100-120px image with label below. Tappable visual menu.

**WHEN IN DOUBT: Go bigger.** A too-large mascot image that gets scaled down later is better than a tiny image that gets lost on screen. These illustrations are the personality of the app. Let them breathe.

---

## PHASE 1: Chroma Key Batch Processing

**Goal:** Convert all 41 images from green-screen to transparent PNG. This is the prerequisite for everything else.

### Step 1.1: Create a processing utility

Create a new file: `scripts/process-chroma-images.js` (or Python if easier)

This script:
1. Reads every .png file from all 4 image directories
2. For each image:
   - Load the image
   - Replace all pixels matching #00FF00 (with a tolerance of ±30 on each channel to catch anti-aliased edges) with full transparency
   - For edge pixels (partial green mixed with the artwork), calculate appropriate alpha based on how green the pixel is
   - Save as a new PNG with transparency to a parallel directory structure: `assets/images/processed/ACHIEVEMENTS.STATS/`, `assets/images/processed/LYNXFAMILY/`, etc.
3. Keep the original filenames exactly as they are
4. Log each file processed

### Step 1.2: Run the processing

Execute the script. Verify a few images visually by checking that:
- The green background is fully transparent
- The character edges are clean (no green fringe)
- The character artwork is fully intact (no missing pixels)
- Anti-aliased edges have appropriate semi-transparent pixels, not hard jagged edges

### Step 1.3: Create an image index module

Create `src/constants/mascot-images.ts` (or wherever constants live in the project):

```typescript
// Mascot Image Index
// All paths point to processed (transparent) versions

export const ACHIEVEMENT_IMAGES = {
  FIRST_PLACE: require('../../assets/images/processed/ACHIEVEMENTS.STATS/1STPLACE.png'),
  SECOND_PLACE: require('../../assets/images/processed/ACHIEVEMENTS.STATS/2NDPLACE.png'),
  THIRD_PLACE: require('../../assets/images/processed/ACHIEVEMENTS.STATS/3RDPLACE.png'),
  ACHIEVEMENT_EARNED: require('../../assets/images/processed/ACHIEVEMENTS.STATS/ACHIEVEMENTEARNED.png'),
  IMPROVE_STATS: require('../../assets/images/processed/ACHIEVEMENTS.STATS/IMPROVESTATS.png'),
  KING_QUEEN_STATS: require('../../assets/images/processed/ACHIEVEMENTS.STATS/KINGQUEENOFSTATS.png'),
  POWER_UP: require('../../assets/images/processed/ACHIEVEMENTS.STATS/POWERUP.png'),
  REACHED_GOAL: require('../../assets/images/processed/ACHIEVEMENTS.STATS/REACHEDGOAL.png'),
  UNLOCK_PRIZE: require('../../assets/images/processed/ACHIEVEMENTS.STATS/UNLOCKPRIZE.png'),
} as const;

export const FAMILY_IMAGES = {
  FAMILY: require('../../assets/images/processed/LYNXFAMILY/AALYNXFAMILY.png'),
  FAMILY_BASEBALL_TENNIS: require('../../assets/images/processed/LYNXFAMILY/AALYNXFAMILYBASEBALLTENNIS.png'),
  FAMILY_SOCCER_BASKETBALL: require('../../assets/images/processed/LYNXFAMILY/AALYNXFAMILYSOCCERBASKETBALL.png'),
  BABY_SISTER: require('../../assets/images/processed/LYNXFAMILY/BABYSISTER.png'),
  BIG_BROTHER: require('../../assets/images/processed/LYNXFAMILY/BIGBROTHER.png'),
  BIG_SISTER: require('../../assets/images/processed/LYNXFAMILY/BIGSISTER.png'),
  LITTLE_BROTHER: require('../../assets/images/processed/LYNXFAMILY/LITTLEBROTHER.png'),
  DAD: require('../../assets/images/processed/LYNXFAMILY/LYNXDAD.png'),
  MOM: require('../../assets/images/processed/LYNXFAMILY/LYNXMOM.png'),
  FAMILY_SOCCER_BB_ALT: require('../../assets/images/processed/LYNXFAMILY/LYNXFAMILYSOCCERBASKETBALL.png'),
  MEET_LYNX: require('../../assets/images/processed/LYNXFAMILY/Meet-Lynx.png'),
  FAMILY_MIX: require('../../assets/images/processed/LYNXFAMILY/MIXLYNXFAMILYSOCCERBASKETBALL.png'),
} as const;

export const SHOUTOUT_IMAGES = {
  GREAT_EFFORT: require('../../assets/images/processed/SHOUTOUTS/SHOUTOUGREATERFORT.png'),
  CLUTCH_PLAYER: require('../../assets/images/processed/SHOUTOUTS/SHOUTOUTCLUTCHPLAYER.png'),
  COACHABLE: require('../../assets/images/processed/SHOUTOUTS/SHOUTOUTCOACHABLE.png'),
  GREAT_COMMUNICATION: require('../../assets/images/processed/SHOUTOUTS/SHOUTOUTGREATCOMMUNICATION.png'),
  HARDEST_WORKER: require('../../assets/images/processed/SHOUTOUTS/SHOUTOUTHARDESTWORKER.png'),
  LEADERSHIP: require('../../assets/images/processed/SHOUTOUTS/SHOUTOUTLEADERSHIP.png'),
  MOST_IMPROVED: require('../../assets/images/processed/SHOUTOUTS/SHOUTOUTMOSTIMPROVED.png'),
  POSITIVE_ATTITUDE: require('../../assets/images/processed/SHOUTOUTS/SHOUTOUTPOSITIVEATTITUDE.png'),
  SPORTSMANSHIP: require('../../assets/images/processed/SHOUTOUTS/SHOUTOUTSPORTSMANSHIP.png'),
  TEAM_PLAYER: require('../../assets/images/processed/SHOUTOUTS/SHOUTOUTTEAMPLAYER.png'),
} as const;

export const VOLLEYBALL_IMAGES = {
  BACK_SAVE: require('../../assets/images/processed/VOLLEYBALLACTION/BACKSAVE.png'),
  BLOCKING: require('../../assets/images/processed/VOLLEYBALLACTION/BLOCKING.png'),
  DIVING_DIG: require('../../assets/images/processed/VOLLEYBALLACTION/DIVING DIG.png'),
  FOREARM_PASS: require('../../assets/images/processed/VOLLEYBALLACTION/FOREARMPASS.png'),
  JUMP_SERVE: require('../../assets/images/processed/VOLLEYBALLACTION/JUMPSERVE.png'),
  JUMP_SERVE_GIRL: require('../../assets/images/processed/VOLLEYBALLACTION/JUMPSERVEGIRL.png'),
  OVERHAND_SERVE: require('../../assets/images/processed/VOLLEYBALLACTION/OVERHANDSERVE.png'),
  PANCAKE_DIG: require('../../assets/images/processed/VOLLEYBALLACTION/PANCAKEDIG.png'),
  READY_POSITION: require('../../assets/images/processed/VOLLEYBALLACTION/READYPOSITION.png'),
  SETTING: require('../../assets/images/processed/VOLLEYBALLACTION/SETTING.png'),
} as const;

// Helper: get celebration image based on achievement context
export function getCelebrationImage(achievement: {
  category?: string;
  rarity?: string;
  stat_key?: string;
}) {
  if (achievement.stat_key?.includes('first_place') || achievement.stat_key?.includes('1st'))
    return ACHIEVEMENT_IMAGES.FIRST_PLACE;
  if (achievement.stat_key?.includes('second_place') || achievement.stat_key?.includes('2nd'))
    return ACHIEVEMENT_IMAGES.SECOND_PLACE;
  if (achievement.stat_key?.includes('third_place') || achievement.stat_key?.includes('3rd'))
    return ACHIEVEMENT_IMAGES.THIRD_PLACE;
  if (achievement.rarity === 'legendary' || achievement.rarity === 'epic')
    return ACHIEVEMENT_IMAGES.UNLOCK_PRIZE;
  if (achievement.stat_key?.includes('level') || achievement.stat_key?.includes('xp'))
    return ACHIEVEMENT_IMAGES.POWER_UP;
  if (achievement.stat_key?.includes('leader') || achievement.stat_key?.includes('top'))
    return ACHIEVEMENT_IMAGES.KING_QUEEN_STATS;
  if (achievement.stat_key?.includes('goal') || achievement.stat_key?.includes('milestone') || achievement.stat_key?.includes('season'))
    return ACHIEVEMENT_IMAGES.REACHED_GOAL;
  if (achievement.category === 'offensive' || achievement.category === 'defensive')
    return ACHIEVEMENT_IMAGES.IMPROVE_STATS;
  return ACHIEVEMENT_IMAGES.ACHIEVEMENT_EARNED;
}

// Helper: get shoutout image by shoutout type
export function getShoutoutImage(shoutoutType: string) {
  const map: Record<string, any> = {
    'great_effort': SHOUTOUT_IMAGES.GREAT_EFFORT,
    'clutch_player': SHOUTOUT_IMAGES.CLUTCH_PLAYER,
    'coachable': SHOUTOUT_IMAGES.COACHABLE,
    'great_communication': SHOUTOUT_IMAGES.GREAT_COMMUNICATION,
    'hardest_worker': SHOUTOUT_IMAGES.HARDEST_WORKER,
    'leadership': SHOUTOUT_IMAGES.LEADERSHIP,
    'most_improved': SHOUTOUT_IMAGES.MOST_IMPROVED,
    'positive_attitude': SHOUTOUT_IMAGES.POSITIVE_ATTITUDE,
    'sportsmanship': SHOUTOUT_IMAGES.SPORTSMANSHIP,
    'team_player': SHOUTOUT_IMAGES.TEAM_PLAYER,
  };
  return map[shoutoutType] || SHOUTOUT_IMAGES.GREAT_EFFORT;
}

// Helper: get volleyball skill image by category
export function getSkillImage(category: string, index: number = 0) {
  const serving = [VOLLEYBALL_IMAGES.JUMP_SERVE, VOLLEYBALL_IMAGES.JUMP_SERVE_GIRL, VOLLEYBALL_IMAGES.OVERHAND_SERVE];
  const passing = [VOLLEYBALL_IMAGES.FOREARM_PASS, VOLLEYBALL_IMAGES.BACK_SAVE];
  const setting = [VOLLEYBALL_IMAGES.SETTING];
  const defense = [VOLLEYBALL_IMAGES.READY_POSITION, VOLLEYBALL_IMAGES.DIVING_DIG, VOLLEYBALL_IMAGES.PANCAKE_DIG, VOLLEYBALL_IMAGES.BACK_SAVE];
  const blocking = [VOLLEYBALL_IMAGES.BLOCKING];

  const categoryMap: Record<string, any[]> = {
    serving, passing, setting, defense, blocking,
    hitting: serving, // reuse for now
    court_iq: [VOLLEYBALL_IMAGES.READY_POSITION],
  };

  const images = categoryMap[category] || [VOLLEYBALL_IMAGES.FOREARM_PASS];
  return images[index % images.length];
}
```

**IMPORTANT:** Read the actual filenames in the repo before building this module. The filenames above are based on what was shown in the directory screenshots. If any names differ slightly (spaces, capitalization, typos), use the ACTUAL filenames from the filesystem. `ls` each directory and match exactly.

### Step 1.4: Preload critical images

Find where the app initializes (likely the root layout or app entry point). Add preloading for the ACHIEVEMENTS.STATS images since they need to appear instantly on unlock:

```typescript
import { Asset } from 'expo-asset';

// Preload celebration images at app startup
const celebrationAssets = Object.values(ACHIEVEMENT_IMAGES).map(img => Asset.fromModule(img).downloadAsync());
await Promise.all(celebrationAssets);
```

If Asset preloading is already set up somewhere, add to the existing preload list. If not, create it.

**Commit: "Phase 1: Process chroma images to transparent, create image index module, preload celebration assets"**

---

## PHASE 2: Achievement Celebration Modal Redesign

**Goal:** Replace the existing achievement unlock celebration with a full-screen, mobile-game-quality reveal sequence using the mascot illustrations.

### Step 2.1: Read the existing celebration modal

Find the current achievement celebration/unlock modal. It might be called:
- `AchievementCelebration`
- `AchievementUnlockModal`
- `CelebrationModal`
- Something inside `achievements.tsx`

Read the ENTIRE file. Understand what props it takes, how it's triggered, and what data it receives (achievement name, rarity, XP, etc.). Read every file that imports or triggers it.

### Step 2.2: Create a MascotImage component

Create a reusable component: `src/components/MascotImage.tsx` (or wherever components live)

```typescript
// MascotImage — reusable component for displaying processed mascot illustrations
// Handles consistent sizing, accessibility, and entrance animations

interface MascotImageProps {
  source: any; // require() image source
  size?: 'hero' | 'large' | 'medium' | 'small' | 'thumbnail';
  accessibilityLabel: string;
  animate?: boolean; // spring entrance animation
  style?: any;
}

// Size mappings:
// hero: 280px width (celebration modals, full-screen moments)
// large: 200px width (shoutout received, skill module headers)
// medium: 150px width (empty states, onboarding)
// small: 90px width (feed cards, list items)
// thumbnail: 65px width (trophy case scroll, compact lists)
```

The component should:
- Use `Image` with `resizeMode="contain"`
- Apply the size based on the `size` prop
- If `animate` is true, use `Animated` API or Reanimated for a spring scale entrance (0 → 1.05 → 1.0, 400ms duration)
- Include the `accessibilityLabel` prop on the Image
- Maintain aspect ratio always

### Step 2.3: Redesign the celebration modal

Modify the existing celebration modal (DO NOT create a new one, modify the existing one to preserve all trigger points):

**Layout (top to bottom, full-screen modal):**

1. **Backdrop:** Semi-transparent overlay (rgba lynx-navy, 0.85 opacity). Covers entire screen. Tap outside does NOT dismiss (force the player to engage with the moment).

2. **Background mascot illustration:** The `getCelebrationImage(achievement)` result, positioned BEHIND the badge. 280px width, centered, at about 30% from top. Opacity 0.25. This is atmospheric, not the focus. It adds energy and life to the background without competing with the badge.

3. **Rarity glow ring:** A circular glow behind where the badge will appear. Color matches rarity:
   - Common: #6B7280 (gray)
   - Uncommon: #10B981 (green)
   - Rare: #3B82F6 (blue)
   - Epic: #8B5CF6 (purple)
   - Legendary: #FFD700 (gold)
   Animated: pulses once on appear (scale 0 → 1.2 → 1.0)

4. **Badge image:** The actual badge artwork (from the badges system). 160px. Scales in with spring animation AFTER the glow (0 → 1.1 → 1.0). This is the STAR of the show.

5. **"ACHIEVEMENT UNLOCKED" text:** Fades in 200ms after badge appears. Bold, large (24px+), lynx-navy color. Centered.

6. **Badge name:** Below the header. Colored by rarity. Bold, 20px.

7. **Description:** Gray text, 14px, below the name.

8. **XP earned:** "+50 XP" with a small sparkle icon. Lynx-gold color. 16px bold.

9. **Buttons (bottom):**
   - "Share to Team Wall" — primary button, lynx-sky background, white text, full width
   - "View Trophies" — secondary, outline style, below
   - "Close" — text-only link at the very bottom, subtle

**Animation sequence timing:**
- 0ms: Backdrop fades in
- 200ms: Glow ring scales in
- 500ms: Badge scales in with spring + haptic medium impact
- 800ms: Text fades in
- 1000ms: XP sparkle appears + haptic light
- Confetti particles start at 500ms and continue for 3 seconds (use small colored dots/rectangles falling, rarity color + white + gold)

**If multiple achievements unlocked:**
- Show a "1 of 3" indicator at the top
- "Next" button replaces "Close" until the last one
- Each achievement gets the full animation sequence

### Step 2.4: Test the celebration

Trigger an achievement unlock and verify:
- The mascot background image appears and is visible but subtle
- The badge is the clear focal point
- The rarity glow color matches
- Animations play in sequence, not all at once
- Haptic feedback fires
- Buttons work
- Multiple achievement queue works

**Commit: "Phase 2: Achievement celebration modal redesign with mascot illustrations and loot-box reveal sequence"**

---

## PHASE 3: Shoutout System Visual Upgrade

**Goal:** Replace text/emoji shoutouts with rich visual cards featuring the mascot illustrations, both in the received modal and the team feed.

### Step 3.1: Read the existing shoutout system

Find ALL shoutout-related files:
- The shoutout creation flow (coach gives a shoutout)
- The shoutout received notification/modal
- The shoutout display in team hub/team wall feed
- The shoutout types/categories definition

Read each file completely. Understand the data model: what fields does a shoutout have? How is the type stored? How does it appear in the feed?

### Step 3.2: Shoutout Received Modal

Find where shoutout received notifications are handled. If there's a modal, redesign it. If there's only a toast/notification, CREATE a modal that triggers when the player opens the app and has unseen shoutouts (similar pattern to achievement celebrations).

**Layout (bottom sheet modal, slides up from bottom with spring animation):**

1. **Shoutout illustration:** The matching SHOUTOUT_IMAGES image for this shoutout type. LARGE — 220px width, centered. This is the hero. The image takes up the top 35-40% of the modal. It should feel like receiving an award.

2. **"SHOUTOUT!" header:** Bold, 28px, lynx-navy. Centered below the image. This text should feel celebratory.

3. **Shoutout type name:** Lynx-sky blue, 20px bold. "Great Effort" / "Clutch Player" / etc.

4. **From line:** "From: Coach Carlos" with the sender's avatar (small, 32px circle) inline. 16px.

5. **Personal message (if included):** In a quote-style container with a left border in lynx-sky. Italic, 14px. Only show this section if a message exists.

6. **XP earned:** "+15 XP" in lynx-gold, with sparkle. 16px.

7. **Dismiss button:** "Awesome!" full-width button at bottom. Lynx-sky background.

**Animation:** Modal slides up from the bottom with spring physics. The illustration scales in from 0.8 → 1.0 with a slight delay after the modal appears. Subtle sparkle particles around the illustration (gold/white, small, brief).

**Haptic:** Success pattern on modal appear.

### Step 3.3: Coach Shoutout Selection Grid

Find the screen where a coach GIVES a shoutout (selects which type to give). Currently this is probably a list of text options or emoji buttons.

**Redesign as a visual grid:**

2-column grid of tappable cards:
- Each card: 
  - The SHOUTOUT_IMAGES illustration for that type (100px, centered in the card)
  - Shoutout type name below the image (14px, bold, centered)
  - Card background: white
  - Card border: 1px #E5E7EB
  - Card border-radius: 14px (Lynx standard)
  - Card padding: 12px
- On tap: card gets a lynx-sky border highlight and slight scale-up (1.0 → 1.03)
- Selected state: lynx-sky border, light blue background tint

This transforms the shoutout selection from "pick from a text list" to "pick from a visual menu of mascot illustrations." Each shoutout type has its own personality through the artwork.

### Step 3.4: Shoutout Card in Team Hub Feed

Find where shoutout posts render in the team hub/team wall feed.

**Redesign the shoutout feed card:**

```
┌─────────────────────────────────────┐
│  ┌──────┐  Coach Carlos gave Ava    │
│  │ 🎨   │  a shoutout!              │
│  │IMAGE │  ┌─────────────────────┐  │
│  │ 80px │  │ ⭐ Great Effort     │  │
│  └──────┘  └─────────────────────┘  │
│            "Incredible hustle today" │
│                          2 hours ago│
│  🔥 3   👏 5   ❤️ 2                │
└─────────────────────────────────────┘
```

- Left: Shoutout illustration thumbnail (80px, rounded 10px corners)
- Right top: Bold sender + "gave" + bold receiver + "a shoutout!"
- Right middle: Shoutout type in a colored pill/badge (lynx-sky background, white text, rounded)
- Right bottom: Optional personal message, timestamp
- Bottom: Reaction bar (existing reactions system, keep as-is)
- Card background: white with a VERY subtle left border accent in lynx-sky (3px)
- Card border-radius: 14px

The illustration thumbnail makes shoutout posts VISUALLY DISTINCT from other posts in the feed. You can instantly spot a shoutout card because it has a mascot illustration, not just text.

**Commit: "Phase 3: Shoutout visual upgrade — received modal, coach selection grid, feed cards with mascot illustrations"**

---

## PHASE 4: Skill Library Headers + Onboarding

**Goal:** Add volleyball action illustrations to skill modules and create a mascot-powered onboarding experience.

### Step 4.1: Read the existing skill library / journey module screens

Find the screens that display:
- Skill module lists (the library of available training content)
- Skill module detail screens (the actual tip/drill/quiz content)
- Journey path nodes (if they exist yet)

If the skill library / journey system hasn't been built yet, skip to Step 4.3 (onboarding) and create placeholder components for the skill library that can be wired in later.

### Step 4.2: Skill Module Hero Headers

For each skill module detail screen, add a hero image header:

**Layout:**
```
┌─────────────────────────────────────┐
│                                     │
│        ┌───────────────────┐        │
│        │                   │        │
│        │   VOLLEYBALL      │        │
│        │   ACTION IMAGE    │        │
│        │   (full width)    │        │
│        │   200px height    │        │
│        │                   │        │
│        └───────────────────┘        │
│  ▓▓▓▓▓▓▓▓▓▓▓ gradient ▓▓▓▓▓▓▓▓▓▓  │
│  Skill Name                    Lv2  │
├─────────────────────────────────────┤
│  Tip text...                        │
│  Drill instructions...              │
│  etc.                               │
└─────────────────────────────────────┘
```

- Image: Full width of the screen, 200px height, `resizeMode="cover"` (exception to the contain rule — hero headers use cover for full-bleed)
- Navy gradient overlay on the bottom 40% of the image (transparent at top → lynx-navy at bottom) so the skill name text is readable on top of the illustration
- Skill name: white, bold, 22px, positioned at the bottom-left of the hero image on top of the gradient
- Level/difficulty badge: positioned at bottom-right of the hero image

Use `getSkillImage(category, index)` to select the right image. The index should be based on the module's position in its category so images rotate and don't repeat.

### Step 4.3: Skill Module List Cards

In the skill library list view, each module card gets a thumbnail:

- Card height: 100px
- LEFT: Volleyball action image, 85px square, rounded 12px
- CENTER: Skill name (bold, 16px), difficulty pill badge, brief description (gray, 13px)
- RIGHT: Completion state (checkmark / progress ring / lock icon)
- Card padding: 12px
- Card radius: 14px
- Card background: white
- Subtle shadow for depth

### Step 4.4: Onboarding Carousel

Find the onboarding / first-time user experience. If it exists, enhance it. If it doesn't exist, create a simple one.

**4-screen horizontal swipeable carousel:**

**Screen 1 — "Meet Lynx"**
- Background: lynx-navy
- Image: FAMILY_IMAGES.MEET_LYNX, centered, 55% of screen width (~200px on most devices)
- Text below: "Hey! I'm Lynx!" in white, bold, 28px
- Subtext: "Your sports companion" in white, 16px, 60% opacity
- Bottom: Page indicator dots + "Next" button

**Screen 2 — "For the Whole Family"**
- Background: lynx-navy
- Image: FAMILY_IMAGES.FAMILY, centered, 60% of screen width
- Text: "Built for Players, Parents & Coaches" in white, bold, 24px
- Subtext: "Everyone gets their own experience" in white, 16px, 60% opacity

**Screen 3 — "Track Your Journey"**
- Background: lynx-navy
- Image: ACHIEVEMENT_IMAGES.REACHED_GOAL, centered, 55% of screen width
- Text: "Earn Badges. Level Up. Get Better." in white, bold, 24px
- Subtext: "Every practice, game, and achievement counts" in white, 16px, 60% opacity

**Screen 4 — "Let's Go"**
- Background: lynx-navy
- Image: ACHIEVEMENT_IMAGES.ACHIEVEMENT_EARNED, centered, 55% of screen width
- Text: "Ready to earn your first badge?" in white, bold, 24px
- CTA button: "Get Started" — lynx-sky background, white text, full width, 50px height, 14px border radius
- Secondary: "I already have an account" — text link in white, 60% opacity

The carousel should be smooth-swipeable with horizontal paging. Page indicator dots at the bottom. Skip button in the top-right corner for returning users.

**Commit: "Phase 4: Skill library hero headers and list cards, onboarding carousel with mascot illustrations"**

---

## PHASE 5: Empty States, Level-Up, and Polish

**Goal:** Replace every empty state in the app with a mascot character, build the level-up celebration, and add mascot presence to profiles/defaults.

### Step 5.1: Identify all empty states

Search the entire codebase for empty state patterns:
```bash
grep -r "empty\|no data\|nothing here\|no results\|getstarted\|get.started" --include="*.tsx" --include="*.ts" -l
```

Also look for patterns like:
- Conditional renders when data arrays are empty
- "No items" text
- Placeholder content when lists have 0 items

For EACH empty state found, replace the generic text/icon with a MascotImage + contextual message:

### Step 5.2: Empty state image mapping

| Screen / Context | Image | Message |
|-----------------|-------|---------|
| No achievements earned yet | FAMILY_IMAGES.BABY_SISTER | "Your trophy case is waiting! Complete quests to earn your first badge." |
| No team joined yet | FAMILY_IMAGES.MEET_LYNX | "Join a team to get started!" |
| No events on schedule | FAMILY_IMAGES.LITTLE_BROTHER | "No upcoming events. Check back with your coach!" |
| No shoutouts received | SHOUTOUT_IMAGES.TEAM_PLAYER | "Shoutouts show up here when your coach or teammates recognize you!" |
| No stats recorded | ACHIEVEMENT_IMAGES.IMPROVE_STATS | "Play your first game to start tracking your stats!" |
| Chat empty (no messages) | FAMILY_IMAGES.MEET_LYNX | "Say hello to your team!" |
| No players on roster | FAMILY_IMAGES.FAMILY | "Your roster is empty. Add players to get started!" |
| No games scheduled | VOLLEYBALL_IMAGES.READY_POSITION | "No games yet this season. They're coming!" |
| No drill/skill content | VOLLEYBALL_IMAGES.FOREARM_PASS | "Skill content is on the way!" |
| Search with no results | FAMILY_IMAGES.LITTLE_BROTHER | "No results found. Try a different search." |

**Empty state layout (consistent across all):**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│        ┌───────────────┐            │
│        │   MASCOT      │            │
│        │   IMAGE       │            │
│        │   160px       │            │
│        └───────────────┘            │
│                                     │
│     Message text centered           │
│     14px, gray, max 2 lines         │
│                                     │
│     [ Optional CTA Button ]         │
│                                     │
└─────────────────────────────────────┘
```

- Image: 160px width, centered horizontally, `MascotImage` component with `size="medium"` and `animate={true}`
- Text: Below image, centered, 14px, gray (#6B7280), max 2 lines
- Optional CTA button below text if there's an action the user can take
- The whole empty state block should be vertically centered in the available space

### Step 5.3: Level-Up Celebration Modal

Create a new modal component (or find and enhance existing): `LevelUpCelebration`

This is a SEPARATE modal from the achievement celebration. It triggers when a player's XP crosses a level threshold.

**Layout (full-screen takeover, navy background — NOT a dimmed overlay, a solid navy screen):**

1. **Background:** Solid lynx-navy (#10284C). Full screen. This is not an overlay, it's a takeover.

2. **Mascot hero:** ACHIEVEMENT_IMAGES.POWER_UP at 280px width, centered at ~35% from top. This is the STAR. The cape/power cub IS the level-up moment. Apply a subtle golden glow effect behind the image (a blurred gold circle, 40% opacity, behind the mascot).

3. **"LEVEL UP!" text:** Above the mascot or overlapping the top edge. 36px, bold, lynx-gold (#FFD700). Scales in with a burst animation (0 → 1.3 → 1.0).

4. **Level transition:** Below the mascot:
   - Old level in gray, slightly transparent: "Level 4"
   - Arrow or transition indicator
   - New level in lynx-gold, large and glowing: "Level 5"
   - If crossing a tier (Bronze→Silver, Silver→Gold, etc.), show the tier name change too

5. **XP bar:** Animated bar that fills from the previous level's progress to full, then resets to show progress into the new level. Lynx-sky fill color with a golden shimmer effect as it fills.

6. **Particles:** Golden light particles rising upward throughout the animation. Small circles and diamonds, floating up and fading out. 20-30 particles, continuous for 3 seconds.

7. **Haptic:** Notification pattern (three taps: light, light, heavy) on the "LEVEL UP!" text appear.

8. **Dismiss:** Tap anywhere to dismiss after 2.5 seconds. Before 2.5 seconds, taps are ignored (let the player soak in the moment).

### Step 5.4: Parent Home Mascot Presence

Find the parent home screen / parent dashboard.

Add a welcoming mascot presence in the header area:
- If the parent profile indicates a gender, use FAMILY_IMAGES.DAD or FAMILY_IMAGES.MOM as a small avatar (50px) in the greeting section
- If no gender data or unknown, use FAMILY_IMAGES.FAMILY as the header accent
- This should be SUBTLE — a small avatar alongside the greeting text, not a giant image dominating the header

### Step 5.5: Coach Shoutout Quick Access

On the coach home screen or dashboard, if there's a section for giving shoutouts or quick actions:
- Show the top 4 most-used shoutout types as visual cards with their SHOUTOUT_IMAGES illustrations at 70px
- Tapping a card goes directly to giving that shoutout type to a player (skip the selection screen)
- This gives the coach visual shortcuts to their most common shoutout types

### Step 5.6: Final Polish Pass

1. Verify every image renders correctly (no green fringe, no stretching, no cutoffs)
2. Verify all animations are smooth (no jank, no flicker)
3. Verify haptic feedback fires on the right moments
4. Verify accessibility labels are on every image
5. Verify the app builds and runs cleanly with no new warnings about images
6. Verify images don't cause memory issues (check that preloading in Phase 1 is working, no duplicate loads)

**Commit: "Phase 5: Empty states with mascot characters, level-up celebration, parent home presence, coach shoutout shortcuts, polish pass"**

---

## DONE

After all 5 phases, the app should feel fundamentally different. Every celebration is a moment. Every shoutout is an award ceremony. Every skill module has a visual coach. Every empty screen has a friendly face. The Lynx cub mascot is woven into the fabric of the entire experience.

Total images wired: 41
Total screens touched: 15-25 (depending on how many empty states exist)
Total new components: 2-3 (MascotImage, LevelUpCelebration, onboarding carousel)
Total modified components: 8-12 (celebration modal, shoutout modal, shoutout feed card, shoutout selection, skill module header, skill list card, empty states, parent home)
