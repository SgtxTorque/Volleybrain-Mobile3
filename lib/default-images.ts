// Default sport images for hero cards and player placeholders
// These are used when user/team hasn't uploaded their own photos yet

const defaultImages = {
  volleyball: {
    game: require('../assets/images/volleyball-game.jpg'),
    practice: require('../assets/images/volleyball-practice.jpg'),
  },
  basketball: {
    game: require('../assets/images/basketball-game.jpg'),
    practice: require('../assets/images/basketball-practice.jpg'),
  },
  soccer: {
    game: require('../assets/images/soccer-game.jpg'),
    practice: require('../assets/images/soccer-practice.jpg'),
  },
  // Player placeholder when no profile photo exists
  playerSilhouette: require('../assets/images/default-player-silhouette.png'),
} as const;

type SportType = 'volleyball' | 'basketball' | 'soccer';

/**
 * Get the appropriate default hero image based on sport and event type.
 *
 * Logic:
 * - "game", "match", "tournament", "scrimmage" → use the GAME image
 * - "practice", "training", "clinic", "tryout" → use the PRACTICE image
 * - Default fallback: volleyball game image
 */
export function getDefaultHeroImage(
  sport?: string | null,
  eventType?: string | null,
): any {
  const normalizedSport = (sport || 'volleyball').toLowerCase() as SportType;
  const sportImages = defaultImages[normalizedSport] || defaultImages.volleyball;

  const normalizedEvent = (eventType || 'game').toLowerCase();

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
 */
export function getPlayerImage(photoUrl?: string | null): any {
  if (photoUrl && photoUrl.trim() !== '') {
    return { uri: photoUrl };
  }
  return defaultImages.playerSilhouette;
}

export { defaultImages };
