/**
 * Screen orientation management.
 *
 * - Phones default to portrait-locked.
 * - Tablets allow all orientations.
 * - Game Day Command Center explicitly unlocks orientation.
 */
import * as ScreenOrientation from 'expo-screen-orientation';

/** Lock to portrait (phones). */
export async function lockPortrait() {
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
}

/** Unlock all orientations (tablets, game day command center). */
export async function unlockOrientation() {
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL);
}

/** Lock to landscape (optional, for specific views). */
export async function lockLandscape() {
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
}
