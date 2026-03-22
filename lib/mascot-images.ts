// ─── Mascot Image Registry ───────────────────────────────────────────────────
// Central registry for all mascot illustrations.
// Components import from here, never directly from assets.

// Skill / Training
export const MASCOT = {
  // Passing
  BEGINNER_PASS: require('@/assets/images/activitiesmascot/BEGINNERPASS.png'),
  WALL_PASS: require('@/assets/images/activitiesmascot/WALLPASS.png'),
  MORE_PASSING: require('@/assets/images/activitiesmascot/MOREPASSING.png'),
  BUDDY_PASS: require('@/assets/images/activitiesmascot/BUDDYPASS.png'),
  SELF_PASS: require('@/assets/images/activitiesmascot/SELFPASS.png'),
  PARENT_PASS: require('@/assets/images/activitiesmascot/PARENTPASS.png'),
  DIVE_PASS: require('@/assets/images/activitiesmascot/DIVEPASS.png'),
  PANCAKE: require('@/assets/images/activitiesmascot/PANCAKE.png'),
  CALL_BALL: require('@/assets/images/activitiesmascot/CALLBALL.png'),
  THREE_PERSON_PEPPER: require('@/assets/images/activitiesmascot/3PERSONPEPPER.png'),

  // Serving
  UNDERHAND_SERVE: require('@/assets/images/activitiesmascot/UNDERHANDSERVE.png'),
  OVERHAND_SERVE: require('@/assets/images/activitiesmascot/OVERHANDSERVE.png'),
  BEGINNER_JUMP_SERVE: require('@/assets/images/activitiesmascot/BEGINNERJUMPSERVE.png'),
  ADVANCE_JUMP_SERVE: require('@/assets/images/activitiesmascot/ADVANCEJUMPSERVE.png'),

  // Setting / Hitting
  SETTER_HANDS: require('@/assets/images/activitiesmascot/SETTERHANDS.png'),
  HIT_APPROACH: require('@/assets/images/activitiesmascot/HITAPPROACH.png'),
  BACK_ROW_ATTACK: require('@/assets/images/activitiesmascot/BACKROWATTACK.png'),
  WALL_SETS: require('@/assets/images/activitiesmascot/WALLSETS.png'),

  // Defense
  DEFENSE_READY: require('@/assets/images/activitiesmascot/defenseready.png'),

  // Movement / Conditioning
  MOVEMENT_DRILL: require('@/assets/images/activitiesmascot/MOVEMENTDRILL.png'),
  GET_ACTIVE: require('@/assets/images/activitiesmascot/GETACTIVE.png'),
  RUSSIAN_TWIST: require('@/assets/images/activitiesmascot/RUSSIANTWIST.png'),
  PUSHUP: require('@/assets/images/activitiesmascot/PUSHUP.png'),

  // Streak States
  NO_STREAK: require('@/assets/images/activitiesmascot/NOSTREAK.png'),
  TWO_DAY_STREAK: require('@/assets/images/activitiesmascot/2DAYSTREAKNEXTLEVEL.png'),
  THREE_DAY_STREAK: require('@/assets/images/activitiesmascot/3DAYSTREAK.png'),
  SEVEN_DAY_STREAK: require('@/assets/images/activitiesmascot/7DAYSTREAK.png'),
  EXERCISE_STREAK: require('@/assets/images/activitiesmascot/EXERCISESTREAK.png'),
  ON_FIRE: require('@/assets/images/activitiesmascot/onfire.png'),
  LEGENDARY_STREAK: require('@/assets/images/activitiesmascot/100DAYSTREAKLEGENDARY.png'),

  // Social / Team
  ENCOURAGING_TEAMMATE: require('@/assets/images/activitiesmascot/ENCOURAGINGTEAMMATE.png'),
  HELPING_TEAMMATE: require('@/assets/images/activitiesmascot/HELPINGTEAMMATE.png'),
  HELPING_NERVOUS: require('@/assets/images/activitiesmascot/HELPINGNERVOUSETEAMMATE.png'),
  SPORTSMANSHIP: require('@/assets/images/activitiesmascot/SPORTSMANSHIP.png'),
  TEAM_HUDDLE: require('@/assets/images/activitiesmascot/TEAMHUDDLE.png'),
  TEAM_ACHIEVEMENT: require('@/assets/images/activitiesmascot/TEAMACHIEVEMENT.png'),

  // General / UI
  LYNX_READY: require('@/assets/images/activitiesmascot/LYNXREADY.png'),
  ARE_YOU_READY: require('@/assets/images/activitiesmascot/AREYOUREADY.png'),
  VISUALIZE: require('@/assets/images/activitiesmascot/VISUALIZE.png'),
  CONFUSED: require('@/assets/images/activitiesmascot/confused.png'),
  SURPRISED: require('@/assets/images/activitiesmascot/SURPRISED.png'),
  EXCITED_ACHIEVEMENT: require('@/assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png'),
  WATCHING_FILM: require('@/assets/images/activitiesmascot/watchingfilm.png'),
  LIVE_EAT_SLEEP: require('@/assets/images/activitiesmascot/LIVEEATSLEEPVOLLEYBALL.png'),
  BACKYARD_PRACTICE: require('@/assets/images/activitiesmascot/BACKYARDPRACTICE.png'),
  FOOLING_AROUND: require('@/assets/images/activitiesmascot/FOOLINGAROUNDWITHDAD.png'),
  ADVANCE_COACH: require('@/assets/images/activitiesmascot/ADVANCECOACH.png'),
};

// ─── Legacy filename-based lookup (used by Journey path rendering) ───────────

const MASCOT_MAP: Record<string, any> = {
  'BEGINNERPASS.png': MASCOT.BEGINNER_PASS,
  'WALLPASS.png': MASCOT.WALL_PASS,
  'MOVEMENTDRILL.png': MASCOT.MOVEMENT_DRILL,
  'BUDDYPASS.png': MASCOT.BUDDY_PASS,
  'CALLBALL.png': MASCOT.CALL_BALL,
  'EXCITEDACHIEVEMENT.png': MASCOT.EXCITED_ACHIEVEMENT,
  'UNDERHANDSERVE.png': MASCOT.UNDERHAND_SERVE,
  'SELFPASS.png': MASCOT.SELF_PASS,
  'VISUALIZE.png': MASCOT.VISUALIZE,
  'OVERHANDSERVE.png': MASCOT.OVERHAND_SERVE,
  'watchingfilm.png': MASCOT.WATCHING_FILM,
  'AREYOUREADY.png': MASCOT.ARE_YOU_READY,
  'MOREPASSING.png': MASCOT.MORE_PASSING,
  'GETACTIVE.png': MASCOT.GET_ACTIVE,
  'PARENTPASS.png': MASCOT.PARENT_PASS,
  '3PERSONPEPPER.png': MASCOT.THREE_PERSON_PEPPER,
  'SURPRISED.png': MASCOT.SURPRISED,
  'confused.png': MASCOT.CONFUSED,
  'onfire.png': MASCOT.ON_FIRE,
  'TEAMACHIEVEMENT.png': MASCOT.TEAM_ACHIEVEMENT,
  'LYNXREADY.png': MASCOT.LYNX_READY,
  'defenseready.png': MASCOT.DEFENSE_READY,
  'SETTERHANDS.png': MASCOT.SETTER_HANDS,
  'HITAPPROACH.png': MASCOT.HIT_APPROACH,
  'WALLSETS.png': MASCOT.WALL_SETS,
  'DIVEPASS.png': MASCOT.DIVE_PASS,
  'PANCAKE.png': MASCOT.PANCAKE,
  'TEAMHUDDLE.png': MASCOT.TEAM_HUDDLE,
  'BACKROWATTACK.png': MASCOT.BACK_ROW_ATTACK,
  'SPORTSMANSHIP.png': MASCOT.SPORTSMANSHIP,
  'ENCOURAGINGTEAMMATE.png': MASCOT.ENCOURAGING_TEAMMATE,
  'ADVANCEJUMPSERVE.png': MASCOT.ADVANCE_JUMP_SERVE,
  'BEGINNERJUMPSERVE.png': MASCOT.BEGINNER_JUMP_SERVE,
  'HELPINGTEAMMATE.png': MASCOT.HELPING_TEAMMATE,
  'HELPINGNERVOUSETEAMMATE.png': MASCOT.HELPING_NERVOUS,
  'NOSTREAK.png': MASCOT.NO_STREAK,
  '2DAYSTREAKNEXTLEVEL.png': MASCOT.TWO_DAY_STREAK,
  '3DAYSTREAK.png': MASCOT.THREE_DAY_STREAK,
  '7DAYSTREAK.png': MASCOT.SEVEN_DAY_STREAK,
  'EXERCISESTREAK.png': MASCOT.EXERCISE_STREAK,
  '100DAYSTREAKLEGENDARY.png': MASCOT.LEGENDARY_STREAK,
  'LIVEEATSLEEPVOLLEYBALL.png': MASCOT.LIVE_EAT_SLEEP,
  'BACKYARDPRACTICE.png': MASCOT.BACKYARD_PRACTICE,
  'FOOLINGAROUNDWITHDAD.png': MASCOT.FOOLING_AROUND,
  'ADVANCECOACH.png': MASCOT.ADVANCE_COACH,
  'RUSSIANTWIST.png': MASCOT.RUSSIAN_TWIST,
  'PUSHUP.png': MASCOT.PUSHUP,
};

/**
 * Resolve a mascot filename (e.g. "BEGINNERPASS.png") to a require() source.
 * Falls back to LYNXREADY if the key isn't mapped.
 */
export function getMascotImage(filename: string | null | undefined): any {
  if (!filename) return MASCOT.LYNX_READY;
  return MASCOT_MAP[filename] ?? MASCOT.LYNX_READY;
}

// ─── Context-Aware Selectors ─────────────────────────────────────────────────

/** Returns a greeting mascot image based on time of day */
export function getGreetingMascot(): any {
  const hour = new Date().getHours();
  if (hour < 6) return MASCOT.LIVE_EAT_SLEEP;       // Late night / very early
  if (hour < 12) return MASCOT.LYNX_READY;           // Morning
  if (hour < 17) return MASCOT.ARE_YOU_READY;         // Afternoon
  if (hour < 21) return MASCOT.GET_ACTIVE;            // Evening (practice time)
  return MASCOT.LIVE_EAT_SLEEP;                       // Late night
}

/** Returns a streak mascot image based on current streak count */
export function getStreakMascot(streakCount: number): any {
  if (streakCount <= 0) return MASCOT.NO_STREAK;
  if (streakCount <= 2) return MASCOT.TWO_DAY_STREAK;
  if (streakCount <= 6) return MASCOT.THREE_DAY_STREAK;
  if (streakCount <= 13) return MASCOT.SEVEN_DAY_STREAK;
  if (streakCount <= 29) return MASCOT.ON_FIRE;
  if (streakCount <= 59) return MASCOT.EXERCISE_STREAK;
  if (streakCount <= 99) return MASCOT.ON_FIRE;
  return MASCOT.LEGENDARY_STREAK;
}

/** Returns a mascot image for quest type */
export function getQuestMascot(questType: string): any {
  switch (questType) {
    case 'app_checkin': return MASCOT.LYNX_READY;
    case 'skill_tip': return MASCOT.VISUALIZE;
    case 'drill_completion': return MASCOT.GET_ACTIVE;
    case 'social_action': return MASCOT.ENCOURAGING_TEAMMATE;
    case 'quiz': return MASCOT.CONFUSED;
    case 'attendance': return MASCOT.ARE_YOU_READY;
    case 'stats_check': return MASCOT.WATCHING_FILM;
    case 'skill_module': return MASCOT.BEGINNER_PASS;
    case 'game_performance': return MASCOT.HIT_APPROACH;
    case 'community': return MASCOT.SPORTSMANSHIP;
    case 'consistency': return MASCOT.EXERCISE_STREAK;
    default: return MASCOT.LYNX_READY;
  }
}

/** Returns a mascot for the ambient closer based on context */
export function getCloserMascot(context: {
  streakCount: number;
  hasEventTomorrow: boolean;
  justLeveledUp: boolean;
  timeOfDay: number;
}): { image: any; message: string } {
  const { streakCount, hasEventTomorrow, justLeveledUp, timeOfDay } = context;

  if (justLeveledUp) {
    return { image: MASCOT.EXCITED_ACHIEVEMENT, message: 'New level unlocked. Go see what is waiting for you.' };
  }
  if (hasEventTomorrow && timeOfDay >= 18) {
    return { image: MASCOT.ARE_YOU_READY, message: 'Game tomorrow. Rest up and come ready.' };
  }
  if (streakCount >= 100) {
    return { image: MASCOT.LEGENDARY_STREAK, message: 'Legendary. You are built different.' };
  }
  if (streakCount >= 30) {
    return { image: MASCOT.ON_FIRE, message: `${streakCount} days strong. The whole team sees you.` };
  }
  if (streakCount >= 7) {
    return { image: MASCOT.SEVEN_DAY_STREAK, message: `${streakCount}-day streak. Keep the fire alive.` };
  }
  if (streakCount > 0) {
    return { image: MASCOT.TWO_DAY_STREAK, message: `${streakCount}-day streak. Come back tomorrow.` };
  }
  if (timeOfDay >= 21) {
    return { image: MASCOT.LIVE_EAT_SLEEP, message: 'Good night. See you tomorrow.' };
  }
  if (timeOfDay < 7) {
    return { image: MASCOT.LIVE_EAT_SLEEP, message: 'Early bird. Respect.' };
  }
  return { image: MASCOT.LYNX_READY, message: 'Open Lynx tomorrow. Your streak starts with one day.' };
}

/** Returns a mascot for empty states */
export function getEmptyStateMascot(context: string): { image: any; message: string } {
  switch (context) {
    case 'no_quests':
      return { image: MASCOT.CONFUSED, message: 'No quests right now. Check back tomorrow.' };
    case 'no_badges':
      return { image: MASCOT.ARE_YOU_READY, message: 'No badges yet. Complete quests and challenges to earn them.' };
    case 'no_stats':
      return { image: MASCOT.CONFUSED, message: 'No stats recorded yet. Play a game to see your numbers.' };
    case 'no_notifications':
      return { image: MASCOT.LYNX_READY, message: 'No notifications yet. Keep playing and the Lynx cub will check in.' };
    case 'no_leaderboard':
      return { image: MASCOT.LYNX_READY, message: 'Leaderboard starts this Monday. Earn XP to claim your spot.' };
    case 'no_team_quests':
      return { image: MASCOT.TEAM_HUDDLE, message: 'No team quests this week. Check back Monday.' };
    case 'journey_complete':
      return { image: MASCOT.LEGENDARY_STREAK, message: 'All 8 chapters complete. You are a champion.' };
    case 'error':
      return { image: MASCOT.CONFUSED, message: 'Something went wrong. Pull down to refresh.' };
    default:
      return { image: MASCOT.LYNX_READY, message: '' };
  }
}
