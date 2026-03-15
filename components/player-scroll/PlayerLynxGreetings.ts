/**
 * PlayerLynxGreetings — Context-aware greetings for the PLAYER.
 * These speak like a hype coach, not a parent.
 * Uses a date-based hash for daily consistency within a session.
 */

import type { LastGameStats, RecentShoutout, PlayerBadge } from '@/hooks/usePlayerHomeData';

export interface PlayerGreetingContext {
  firstName: string;
  attendanceStreak: number;
  lastGame: LastGameStats | null;
  nextEvent: { event_type: string; event_date: string } | null;
  badges: PlayerBadge[];
  challengesAvailable: boolean;
  recentShoutouts: RecentShoutout[];
  hour: number;
}

/** Pick a consistent-within-day option from an array */
function dailyPick<T>(options: T[]): T {
  const dayHash = Math.floor(Date.now() / 86400000);
  return options[dayHash % options.length];
}

/** Check if event_date is today */
function isToday(dateStr: string): boolean {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return dateStr === today;
}

/** Check if last game was a win */
function wasWin(game: LastGameStats | null): boolean {
  if (!game || game.our_score == null || game.opponent_score == null) return false;
  return game.our_score > game.opponent_score;
}

export function getPlayerGreeting(ctx: PlayerGreetingContext): string {
  const { firstName } = ctx;

  // Priority waterfall — first match wins

  // Game day
  if (ctx.nextEvent && ctx.nextEvent.event_type === 'game' && isToday(ctx.nextEvent.event_date)) {
    return dailyPick([
      `GAME DAY, ${firstName}! Time to show out`,
      `Let's get this W, ${firstName}!`,
    ]);
  }

  // After a win
  if (ctx.lastGame && wasWin(ctx.lastGame)) {
    const kills = ctx.lastGame.kills;
    if (kills > 0) {
      return dailyPick([
        `You showed UP last game! Keep that energy`,
        `${kills} kills?! That's what I'm talking about`,
      ]);
    }
    return `You showed UP last game! Keep that energy`;
  }

  // On a streak (attendanceStreak >= 3)
  if (ctx.attendanceStreak >= 3) {
    return dailyPick([
      `${ctx.attendanceStreak} days strong, ${firstName}! Don't stop`,
      `That's a ${ctx.attendanceStreak}-day streak! Legend behavior`,
    ]);
  }

  // After earning a badge recently
  if (ctx.badges.length > 0) {
    const recentBadge = ctx.badges[0];
    const badgeName = recentBadge.achievement?.name;
    if (badgeName) {
      const earnedDate = new Date(recentBadge.earned_at);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      if (earnedDate > threeDaysAgo) {
        return `New badge unlocked! ${badgeName}`;
      }
    }
  }

  // Has active challenge
  if (ctx.challengesAvailable) {
    return dailyPick([
      `Ace Hunter is waiting, ${firstName}. Let's go`,
      `Challenge time, ${firstName}. Show what you got`,
    ]);
  }

  // Default morning/afternoon/evening
  if (ctx.hour < 12) {
    return dailyPick([
      `Rise and grind, ${firstName}!`,
      `Morning, ${firstName}! Let's put in work`,
    ]);
  }

  if (ctx.hour < 17) {
    return dailyPick([
      `What's good, ${firstName}! Let's put in work`,
      `Hey ${firstName}! Check your progress`,
    ]);
  }

  return dailyPick([
    `Evening, ${firstName}! Check your progress`,
    `Good night, ${firstName}! See how you did`,
  ]);
}
