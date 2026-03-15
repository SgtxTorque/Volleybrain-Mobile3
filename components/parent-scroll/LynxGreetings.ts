/**
 * LynxGreetings — Dynamic context-aware greeting system.
 * The Lynx mascot talks directly to the parent with energy and personality.
 * Uses a date-based hash for daily consistency within a session.
 */

export interface GreetingContext {
  firstName: string;
  isGameDay: boolean;
  isPracticeDay: boolean;
  winStreak: number;
  hasPaymentDue: boolean;
  justWon: boolean;
  justLost: boolean;
  hour: number;
  childCount: number;
}

/** Pick a consistent-within-day option from an array */
function dailyPick<T>(options: T[]): T {
  const dayHash = Math.floor(Date.now() / 86400000);
  return options[dayHash % options.length];
}

export function getParentGreeting(ctx: GreetingContext): string {
  const { firstName } = ctx;

  // Priority waterfall — first match wins

  if (ctx.isGameDay) {
    return dailyPick([
      `It's game day, ${firstName}! Let's GOOO! 🔥`,
      `Big game today. You ready, ${firstName}? 🏐`,
      `Game day energy! Let's get it, ${firstName}! ⚡`,
    ]);
  }

  if (ctx.justWon) {
    return dailyPick([
      'W! What a game! 🎉',
      `Another one in the bag, ${firstName}! 🏆`,
      "That's how it's done! 💪",
    ]);
  }

  if (ctx.justLost) {
    return dailyPick([
      "Tough one. Next game's gonna be different 💪",
      `Head up, ${firstName}. Champions bounce back 🔥`,
    ]);
  }

  if (ctx.winStreak >= 3) {
    return dailyPick([
      `${ctx.winStreak} wins in a row! Don't stop now, ${firstName} 🔥`,
      'Your family\'s on FIRE right now 🏆',
    ]);
  }

  if (ctx.hasPaymentDue) {
    return `Hey ${firstName}! Let's knock out that balance 💰`;
  }

  if (ctx.isPracticeDay) {
    return dailyPick([
      "Practice day! Let's put in the work 💪",
      `Practice makes progress, ${firstName} 🐱`,
    ]);
  }

  if (ctx.hour < 12) {
    return dailyPick([
      `Rise and grind, ${firstName}! ☀️`,
      `Morning, ${firstName}! Here's what's up 🐱`,
    ]);
  }

  if (ctx.hour < 17) {
    return dailyPick([
      `Hey ${firstName}! Here's where things stand 👀`,
      `What's good, ${firstName}! 🤙`,
    ]);
  }

  if (ctx.hour >= 17) {
    return dailyPick([
      `Wrapping up the day, ${firstName} 🌙`,
      `Evening, ${firstName}! Check in on the fam 🐱`,
    ]);
  }

  return `Hey ${firstName}! Let's see what's happening 🐱`;
}
