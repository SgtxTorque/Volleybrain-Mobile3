/**
 * Static require() map for mascot images.
 * React Native requires static paths for require().
 */
const MASCOT_MAP: Record<string, any> = {
  'BEGINNERPASS.png': require('@/assets/images/activitiesmascot/BEGINNERPASS.png'),
  'WALLPASS.png': require('@/assets/images/activitiesmascot/WALLPASS.png'),
  'MOVEMENTDRILL.png': require('@/assets/images/activitiesmascot/MOVEMENTDRILL.png'),
  'BUDDYPASS.png': require('@/assets/images/activitiesmascot/BUDDYPASS.png'),
  'CALLBALL.png': require('@/assets/images/activitiesmascot/CALLBALL.png'),
  'EXCITEDACHIEVEMENT.png': require('@/assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png'),
  'UNDERHANDSERVE.png': require('@/assets/images/activitiesmascot/UNDERHANDSERVE.png'),
  'SELFPASS.png': require('@/assets/images/activitiesmascot/SELFPASS.png'),
  'VISUALIZE.png': require('@/assets/images/activitiesmascot/VISUALIZE.png'),
  'OVERHANDSERVE.png': require('@/assets/images/activitiesmascot/OVERHANDSERVE.png'),
  'watchingfilm.png': require('@/assets/images/activitiesmascot/watchingfilm.png'),
  'AREYOUREADY.png': require('@/assets/images/activitiesmascot/AREYOUREADY.png'),
  'MOREPASSING.png': require('@/assets/images/activitiesmascot/MOREPASSING.png'),
  'GETACTIVE.png': require('@/assets/images/activitiesmascot/GETACTIVE.png'),
  'PARENTPASS.png': require('@/assets/images/activitiesmascot/PARENTPASS.png'),
  '3PERSONPEPPER.png': require('@/assets/images/activitiesmascot/3PERSONPEPPER.png'),
  'SURPRISED.png': require('@/assets/images/activitiesmascot/SURPRISED.png'),
  'confused.png': require('@/assets/images/activitiesmascot/confused.png'),
  'onfire.png': require('@/assets/images/activitiesmascot/onfire.png'),
  'TEAMACHIEVEMENT.png': require('@/assets/images/activitiesmascot/TEAMACHIEVEMENT.png'),
  'LYNXREADY.png': require('@/assets/images/activitiesmascot/LYNXREADY.png'),
  'defenseready.png': require('@/assets/images/activitiesmascot/defenseready.png'),
  'SETTERHANDS.png': require('@/assets/images/activitiesmascot/SETTERHANDS.png'),
  'HITAPPROACH.png': require('@/assets/images/activitiesmascot/HITAPPROACH.png'),
  'WALLSETS.png': require('@/assets/images/activitiesmascot/WALLSETS.png'),
  'DIVEPASS.png': require('@/assets/images/activitiesmascot/DIVEPASS.png'),
  'PANCAKE.png': require('@/assets/images/activitiesmascot/PANCAKE.png'),
  'TEAMHUDDLE.png': require('@/assets/images/activitiesmascot/TEAMHUDDLE.png'),
  'BACKROWATTACK.png': require('@/assets/images/activitiesmascot/BACKROWATTACK.png'),
};

const FALLBACK = require('@/assets/images/activitiesmascot/LYNXREADY.png');

/**
 * Resolve a mascot filename (e.g. "BEGINNERPASS.png") to a require() source.
 * Falls back to LYNXREADY if the key isn't mapped.
 */
export function getMascotImage(filename: string | null | undefined): any {
  if (!filename) return FALLBACK;
  return MASCOT_MAP[filename] ?? FALLBACK;
}
