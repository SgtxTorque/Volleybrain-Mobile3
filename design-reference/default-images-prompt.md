# Wire Up Default Sport Images for Hero Cards & Player Placeholder

## OVERVIEW
We're adding 7 default images to the app that serve as fallback backgrounds when user-uploaded photos aren't available yet. These make the hero cards and player cards feel alive from day one.

## THE 7 IMAGES

Place all images in: `assets/images/defaults/`

```
assets/images/defaults/
├── volleyball-game.jpg        ← volleyball game action shot
├── volleyball-practice.jpg    ← volleyball practice/training shot
├── basketball-game.jpg        ← basketball game action shot
├── basketball-practice.jpg    ← basketball practice/training shot
├── soccer-game.jpg            ← soccer game action shot
├── soccer-practice.jpg        ← soccer practice/training shot
└── player-silhouette.png      ← generic player placeholder (no photo)
```

The user will manually place these 7 files in the folder. Claude Code needs to create the folder structure and the wiring code.

## WIRING: Create a Default Images Utility

### File: `lib/default-images.ts`

```typescript
// Default sport images for hero cards and player placeholders
// These are used when user/team hasn't uploaded their own photos yet

const defaultImages = {
  volleyball: {
    game: require('../assets/images/defaults/volleyball-game.jpg'),
    practice: require('../assets/images/defaults/volleyball-practice.jpg'),
  },
  basketball: {
    game: require('../assets/images/defaults/basketball-game.jpg'),
    practice: require('../assets/images/defaults/basketball-practice.jpg'),
  },
  soccer: {
    game: require('../assets/images/defaults/soccer-game.jpg'),
    practice: require('../assets/images/defaults/soccer-practice.jpg'),
  },
  // Player placeholder when no profile photo exists
  playerSilhouette: require('../assets/images/defaults/player-silhouette.png'),
} as const;

type SportType = 'volleyball' | 'basketball' | 'soccer';
type EventType = 'game' | 'match' | 'practice' | 'tournament' | 'scrimmage';

/**
 * Get the appropriate default hero image based on sport and event type.
 * 
 * @param sport - The sport type (volleyball, basketball, soccer)
 * @param eventType - The event type (game, match, practice, tournament, etc.)
 * @returns The require() image source for use in ImageBackground/Image
 * 
 * Logic:
 * - "game", "match", "tournament", "scrimmage" → use the GAME image
 * - "practice", "training", "clinic", "tryout" → use the PRACTICE image
 * - Default fallback: volleyball game image
 */
export function getDefaultHeroImage(
  sport?: string | null, 
  eventType?: string | null
): any {
  // Normalize sport name
  const normalizedSport = (sport || 'volleyball').toLowerCase() as SportType;
  const sportImages = defaultImages[normalizedSport] || defaultImages.volleyball;
  
  // Normalize event type
  const normalizedEvent = (eventType || 'game').toLowerCase();
  
  // Map event types to game vs practice
  const practiceTypes = ['practice', 'training', 'clinic', 'tryout', 'warmup', 'camp'];
  const isPractice = practiceTypes.some(t => normalizedEvent.includes(t));
  
  return isPractice ? sportImages.practice : sportImages.game;
}

/**
 * Get the player silhouette placeholder image.
 * Use this anywhere a player photo would appear but none exists.
 */
export function getPlayerPlaceholder(): any {
  return defaultImages.playerSilhouette;
}

/**
 * Get the appropriate image source for a player.
 * Returns the player's photo if available, otherwise the silhouette.
 * 
 * @param photoUrl - The player's photo URL (from Supabase storage or profile)
 * @returns Either { uri: photoUrl } or the require() silhouette
 */
export function getPlayerImage(photoUrl?: string | null): any {
  if (photoUrl && photoUrl.trim() !== '') {
    return { uri: photoUrl };
  }
  return defaultImages.playerSilhouette;
}

export { defaultImages };
```

## WHERE TO USE THESE IMAGES

### 1. Parent Dashboard — Game Day Hero Card
Find where the hero card renders with `ImageBackground`. Replace the image source logic:

```typescript
import { getDefaultHeroImage } from '@/lib/default-images';

// In the hero card:
const heroImage = event?.image_url 
  ? { uri: event.image_url }
  : getDefaultHeroImage(currentSport, event?.event_type);

<ImageBackground source={heroImage} ...>
```

### 2. Coach Dashboard — Hero Card
Same pattern:
```typescript
const heroImage = teamPhoto 
  ? { uri: teamPhoto }
  : getDefaultHeroImage(currentSport, nextEvent?.event_type);
```

### 3. Game Day Screen — Hero Card
Same pattern:
```typescript
const heroImage = event?.image_url
  ? { uri: event.image_url }
  : getDefaultHeroImage(currentSport, event?.event_type);
```

### 4. Player Mini Cards (Parent Dashboard "MY PLAYERS" section)
```typescript
import { getPlayerImage } from '@/lib/default-images';

// In each player card:
const playerImage = getPlayerImage(player.photo_url);

<ImageBackground source={playerImage} ...>
```

### 5. Player Profile / Trading Card (anywhere player photo appears)
```typescript
const playerImage = getPlayerImage(player.photo_url);
```

### 6. Roster / Player Lists (avatar fallback)
When the Avatar component needs a photo instead of just initials:
```typescript
import { getPlayerPlaceholder } from '@/lib/default-images';

// If you have a photo → use photo
// If no photo → use silhouette for cards, or initials for small avatars
```

## HOW TO DETERMINE THE CURRENT SPORT

The app already tracks which sport is selected (volleyball, basketball, soccer). Look for:
- A `sport` or `currentSport` variable in context/state
- The season or organization's sport field in Supabase
- The `SportSelector` component's current value

If the sport isn't readily available in context, default to `'volleyball'` — that's the primary sport for Black Hornets.

## FUTURE-PROOFING

This setup is designed to be easily replaced later:

1. **Today:** `getDefaultHeroImage()` returns bundled stock photos
2. **Future:** When you add a team gallery feature, the priority chain becomes:
   - Event-specific photo (from event record) → first choice
   - Team gallery photo (random or most recent) → second choice  
   - Default stock image (from this utility) → last resort

The function signatures won't change — just the internal logic.

## IMPORTANT NOTES

- All 6 sport photos should be HIGH QUALITY but COMPRESSED for mobile (aim for 200-400KB each, not multi-MB)
- Recommended resolution: 800x600 or 1200x800 (landscape orientation works best for hero cards)
- The player silhouette PNG is already sized at 400x520 (portrait, matches player card ratio)
- Use `.jpg` for sport photos (better compression for photos)
- Use `.png` for the silhouette (needs transparency-like gradient quality)
- React Native `require()` works with local assets — no need for a bundler config change

## STEP-BY-STEP FOR CLAUDE CODE

1. Create the folder: `assets/images/defaults/`
2. Create placeholder files (or skip if user will drop them in manually)
3. Create `lib/default-images.ts` with the utility functions
4. Update Parent Dashboard hero card to use `getDefaultHeroImage()`
5. Update Coach Dashboard hero card to use `getDefaultHeroImage()`
6. Update Game Day screen hero card to use `getDefaultHeroImage()`
7. Update Player Mini Cards to use `getPlayerImage()`
8. Update any other player photo locations to use `getPlayerImage()`
9. Run `npx tsc --noEmit` to verify no errors
10. Commit: `feat: add default sport images utility + wire up hero cards and player placeholders`
