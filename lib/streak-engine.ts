/**
 * streak-engine.ts - Streak reward tiers, milestones, XP calculation,
 * and streak freeze/recovery logic.
 */
import { supabase } from '@/lib/supabase';

// =============================================================================
// STREAK TIERS
// =============================================================================

export const STREAK_TIERS = [
  { min: 3, name: 'Getting Started', emoji: '\u{1F525}', color: '#F59E0B', xp: 5 },
  { min: 5, name: 'On Fire', emoji: '\u{1F525}\u{1F525}', color: '#EF4444', xp: 15 },
  { min: 10, name: 'Unstoppable', emoji: '\u{2B50}', color: '#8B5CF6', xp: 30 },
  { min: 20, name: 'Legendary', emoji: '\u{1F451}', color: '#FFD700', xp: 50 },
  { min: 50, name: 'GOAT', emoji: '\u{1F410}', color: '#22D3EE', xp: 100 },
] as const;

export type StreakTier = typeof STREAK_TIERS[number];

/**
 * Get the current tier for a given streak count.
 * Returns null if streak is below the minimum tier threshold.
 */
export function getStreakTier(streak: number): StreakTier | null {
  let currentTier: StreakTier | null = null;
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.min) {
      currentTier = tier;
    } else {
      break;
    }
  }
  return currentTier;
}

/**
 * Get the next milestone tier the player is working toward.
 * Returns null if the player has reached the highest tier.
 */
export function getNextMilestone(streak: number): { tier: StreakTier; remaining: number } | null {
  for (const tier of STREAK_TIERS) {
    if (streak < tier.min) {
      return { tier, remaining: tier.min - streak };
    }
  }
  return null; // Already at GOAT level
}

/**
 * Calculate total XP earned from streak milestones up to the current streak.
 */
export function calculateStreakXP(streak: number): number {
  let total = 0;
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.min) {
      total += tier.xp;
    } else {
      break;
    }
  }
  return total;
}

/**
 * Check if the player just crossed a tier milestone.
 * Returns the newly-crossed tier, or null if no new milestone.
 */
export function checkMilestoneReached(previousStreak: number, currentStreak: number): StreakTier | null {
  for (const tier of STREAK_TIERS) {
    if (previousStreak < tier.min && currentStreak >= tier.min) {
      return tier;
    }
  }
  return null;
}

// =============================================================================
// STREAK FREEZE / RECOVERY
// =============================================================================

/**
 * Enhanced streak calculation with one-gap freeze support.
 *
 * Rules:
 * - If streak >= 5 and the player misses ONE event, the streak is preserved
 *   (marked with a "freeze" flag).
 * - Only one freeze per streak. If they miss a second event, streak resets.
 * - Returns the effective streak count, whether a freeze was used, and the
 *   raw consecutive count.
 */
export function calculateStreakWithFreeze(
  rsvpStatuses: Array<{ status: string }>,
): { streak: number; freezeUsed: boolean } {
  let streak = 0;
  let freezeUsed = false;
  let gapSeen = false;

  for (const entry of rsvpStatuses) {
    const attended = entry.status === 'yes' || entry.status === 'confirmed' || entry.status === 'present';

    if (attended) {
      streak++;
    } else if (!gapSeen && streak >= 5) {
      // Allow one gap (freeze)
      gapSeen = true;
      freezeUsed = true;
      // Don't increment streak, but don't break either
    } else {
      // Second miss or streak < 5 at first miss -- break
      break;
    }
  }

  return { streak, freezeUsed };
}

/**
 * Award XP for reaching a streak milestone.
 * Logs to xp_ledger with source_type = 'streak_milestone'.
 */
export async function awardStreakMilestoneXP(
  playerId: string,
  tier: StreakTier,
): Promise<void> {
  if (tier.xp <= 0) return;

  try {
    await supabase.from('xp_ledger').insert({
      player_id: playerId,
      organization_id: null,
      xp_amount: tier.xp,
      source_type: 'streak_milestone',
      source_id: null,
      description: `${tier.name} streak milestone (${tier.min}+ events)`,
    });
  } catch {
    // XP logging is best-effort
  }
}

/**
 * Get gradient colors for a streak tier's background.
 */
export function getStreakGradient(tier: StreakTier | null): [string, string] {
  if (!tier) return ['rgba(255,215,0,0.08)', 'rgba(255,215,0,0.02)'];

  switch (tier.name) {
    case 'Getting Started':
      return ['rgba(245,158,11,0.12)', 'rgba(245,158,11,0.04)'];
    case 'On Fire':
      return ['rgba(239,68,68,0.12)', 'rgba(239,68,68,0.04)'];
    case 'Unstoppable':
      return ['rgba(139,92,246,0.12)', 'rgba(139,92,246,0.04)'];
    case 'Legendary':
      return ['rgba(255,215,0,0.15)', 'rgba(255,215,0,0.05)'];
    case 'GOAT':
      return ['rgba(34,211,238,0.15)', 'rgba(34,211,238,0.05)'];
    default:
      return ['rgba(255,215,0,0.08)', 'rgba(255,215,0,0.02)'];
  }
}
