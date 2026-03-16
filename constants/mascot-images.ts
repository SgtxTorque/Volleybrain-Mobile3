/**
 * Mascot Image Index
 * All paths point to processed (transparent background) versions.
 * Images are local assets bundled at build time — no runtime preloading needed.
 */

// ─── Achievement / Stats Illustrations ──────────────────────────────────────
export const ACHIEVEMENT_IMAGES = {
  FIRST_PLACE: require('../assets/images/processed/ACHIEVEMENTS.STATS/1STPLACE.png'),
  SECOND_PLACE: require('../assets/images/processed/ACHIEVEMENTS.STATS/2NDPLACE.png'),
  THIRD_PLACE: require('../assets/images/processed/ACHIEVEMENTS.STATS/3RDPLACE.png'),
  ACHIEVEMENT_EARNED: require('../assets/images/processed/ACHIEVEMENTS.STATS/ACHIEVEMENTEARNED.png'),
  IMPROVE_STATS: require('../assets/images/processed/ACHIEVEMENTS.STATS/IMPROVESTATS.png'),
  KING_QUEEN_STATS: require('../assets/images/processed/ACHIEVEMENTS.STATS/KINGQUEENOFSTATS.png'),
  POWER_UP: require('../assets/images/processed/ACHIEVEMENTS.STATS/POWERUP.png'),
  REACHED_GOAL: require('../assets/images/processed/ACHIEVEMENTS.STATS/REACHEDGOAL.png'),
  UNLOCK_PRIZE: require('../assets/images/processed/ACHIEVEMENTS.STATS/UNLOCKPRIZE.png'),
} as const;

// ─── Lynx Family Illustrations ──────────────────────────────────────────────
export const FAMILY_IMAGES = {
  FAMILY: require('../assets/images/processed/LYNXFAMILY/AALYNXFAMILY.png'),
  FAMILY_BASEBALL_TENNIS: require('../assets/images/processed/LYNXFAMILY/AALYNXFAMILYBASEBALLTENNIS.png'),
  FAMILY_SOCCER_BASKETBALL: require('../assets/images/processed/LYNXFAMILY/AALYNXFAMILYSOCCERBASKETBALL.png'),
  BABY_SISTER: require('../assets/images/processed/LYNXFAMILY/BABYSISTER.png'),
  BIG_BROTHER: require('../assets/images/processed/LYNXFAMILY/BIGBROTHER.png'),
  BIG_SISTER: require('../assets/images/processed/LYNXFAMILY/BIGSISTER.png'),
  LITTLE_BROTHER: require('../assets/images/processed/LYNXFAMILY/LITTLE BROTHER.png'),
  DAD: require('../assets/images/processed/LYNXFAMILY/LYNXDAD.png'),
  MOM: require('../assets/images/processed/LYNXFAMILY/LYNXMOM.png'),
  FAMILY_SOCCER_BB_ALT: require('../assets/images/processed/LYNXFAMILY/LYNXFAMILYSOCCERBASKETBALL.png'),
  MEET_LYNX: require('../assets/images/processed/LYNXFAMILY/Meet-Lynx.png'),
  FAMILY_MIX: require('../assets/images/processed/LYNXFAMILY/MIXLYNXFAMILYSOCCERBASKETBALL.png'),
} as const;

// ─── Shoutout Illustrations ─────────────────────────────────────────────────
export const SHOUTOUT_IMAGES = {
  GREAT_EFFORT: require('../assets/images/processed/SHOUTOUTS/SHOUTOUGREATEFFORT.png'),
  CLUTCH_PLAYER: require('../assets/images/processed/SHOUTOUTS/SHOUTOUTCLUTCHPLAYER.png'),
  COACHABLE: require('../assets/images/processed/SHOUTOUTS/SHOUTOUTCOACHABLE.png'),
  GREAT_COMMUNICATION: require('../assets/images/processed/SHOUTOUTS/SHOUTOUTGREATCOMMUNICATION.png'),
  HARDEST_WORKER: require('../assets/images/processed/SHOUTOUTS/SHOUTOUTHARDESTWORKER.png'),
  LEADERSHIP: require('../assets/images/processed/SHOUTOUTS/SHOUTOUTLEADERSHIP.png'),
  MOST_IMPROVED: require('../assets/images/processed/SHOUTOUTS/SHOUTOUTMOSTIMPROVED.png'),
  POSITIVE_ATTITUDE: require('../assets/images/processed/SHOUTOUTS/SHOUTOUTPOSITIVEATTITUDE.png'),
  SPORTSMANSHIP: require('../assets/images/processed/SHOUTOUTS/SHOUTOUTSPORTSMANSHIP.png'),
  TEAM_PLAYER: require('../assets/images/processed/SHOUTOUTS/SHOUTOUTTEAMPLAYER.png'),
} as const;

// ─── Volleyball Action Illustrations ────────────────────────────────────────
export const VOLLEYBALL_IMAGES = {
  BACK_SAVE: require('../assets/images/processed/VOLLEYBALLACTION/BACKSAVE.png'),
  BLOCKING: require('../assets/images/processed/VOLLEYBALLACTION/BLOCKING.png'),
  DIVING_DIG: require('../assets/images/processed/VOLLEYBALLACTION/DIVING DIG.png'),
  FOREARM_PASS: require('../assets/images/processed/VOLLEYBALLACTION/FOREARMPASS.png'),
  JUMP_SERVE: require('../assets/images/processed/VOLLEYBALLACTION/JUMPSERVE.png'),
  JUMP_SERVE_GIRL: require('../assets/images/processed/VOLLEYBALLACTION/JUMPSERVEGIRL.png'),
  OVERHAND_SERVE: require('../assets/images/processed/VOLLEYBALLACTION/OVERHANDSERVE.png'),
  PANCAKE_DIG: require('../assets/images/processed/VOLLEYBALLACTION/PANCAKEDIG.png'),
  READY_POSITION: require('../assets/images/processed/VOLLEYBALLACTION/READYPOSITION.png'),
  SETTING: require('../assets/images/processed/VOLLEYBALLACTION/SETTING.png'),
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get celebration image based on achievement context */
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

/** Get shoutout image by shoutout type slug */
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

/** Get volleyball skill image by category */
export function getSkillImage(category: string, index: number = 0) {
  const serving = [VOLLEYBALL_IMAGES.JUMP_SERVE, VOLLEYBALL_IMAGES.JUMP_SERVE_GIRL, VOLLEYBALL_IMAGES.OVERHAND_SERVE];
  const passing = [VOLLEYBALL_IMAGES.FOREARM_PASS, VOLLEYBALL_IMAGES.BACK_SAVE];
  const setting = [VOLLEYBALL_IMAGES.SETTING];
  const defense = [VOLLEYBALL_IMAGES.READY_POSITION, VOLLEYBALL_IMAGES.DIVING_DIG, VOLLEYBALL_IMAGES.PANCAKE_DIG, VOLLEYBALL_IMAGES.BACK_SAVE];
  const blocking = [VOLLEYBALL_IMAGES.BLOCKING];

  const categoryMap: Record<string, any[]> = {
    serving, passing, setting, defense, blocking,
    hitting: serving,
    court_iq: [VOLLEYBALL_IMAGES.READY_POSITION],
  };

  const images = categoryMap[category] || [VOLLEYBALL_IMAGES.FOREARM_PASS];
  return images[index % images.length];
}
