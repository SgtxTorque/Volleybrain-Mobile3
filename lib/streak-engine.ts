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

// =============================================================================
// ENGAGEMENT STREAK ENGINE (Phase 1C)
// Database-backed streak tracking via streak_data / streak_milestones tables.
// =============================================================================

// ─── Engagement Streak Types ─────────────────────────────────────────────────

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  freezesAvailable: number;
  freezeUsedDate: string | null;
  isAlive: boolean;        // true if streak is currently active (not broken)
  needsAction: boolean;    // true if player hasn't done a qualifying action today
  justBroke: boolean;      // true if streak broke since last check (for messaging)
  milestoneReached: number | null; // if a milestone was just hit, which one
}

const ENGAGEMENT_STREAK_MILESTONES = [7, 14, 30, 60, 100];
const ENGAGEMENT_MAX_FREEZES = 3;

// ─── Engagement Date Helpers ─────────────────────────────────────────────────

function engLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function engDaysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + 'T00:00:00');
  const d2 = new Date(dateStr2 + 'T00:00:00');
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function engYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Core: Get or Initialize Streak ──────────────────────────────────────────

async function getOrInitStreak(profileId: string): Promise<{
  id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  streak_freezes_available: number;
  streak_freeze_used_date: string | null;
} | null> {
  const { data: existing, error: fetchError } = await supabase
    .from('streak_data')
    .select('*')
    .eq('player_id', profileId)
    .maybeSingle();

  if (fetchError) {
    console.error('[streak-engine] Error fetching streak:', fetchError);
    return null;
  }

  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from('streak_data')
    .insert({
      player_id: profileId,
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
      streak_freezes_available: 0,
      streak_freeze_used_date: null,
    })
    .select('*')
    .single();

  if (createError) {
    console.error('[streak-engine] Error creating streak:', createError);
    return null;
  }

  return created;
}

// ─── Core: Check Streak State ────────────────────────────────────────────────
// Called on app open. Evaluates whether the streak is alive, broken, or frozen.

export async function checkStreakState(profileId: string): Promise<StreakState> {
  const streak = await getOrInitStreak(profileId);

  if (!streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      freezesAvailable: 0,
      freezeUsedDate: null,
      isAlive: false,
      needsAction: true,
      justBroke: false,
      milestoneReached: null,
    };
  }

  const today = engLocalToday();
  const lastActive = streak.last_active_date;

  // Case 1: Never been active (new player)
  if (!lastActive) {
    return {
      currentStreak: 0,
      longestStreak: streak.longest_streak,
      lastActiveDate: null,
      freezesAvailable: streak.streak_freezes_available,
      freezeUsedDate: streak.streak_freeze_used_date,
      isAlive: false,
      needsAction: true,
      justBroke: false,
      milestoneReached: null,
    };
  }

  // Case 2: Already active today
  if (lastActive === today) {
    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      lastActiveDate: lastActive,
      freezesAvailable: streak.streak_freezes_available,
      freezeUsedDate: streak.streak_freeze_used_date,
      isAlive: true,
      needsAction: false,
      justBroke: false,
      milestoneReached: null,
    };
  }

  // Case 3: Last active was yesterday — streak alive, needs action today
  if (lastActive === engYesterday()) {
    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      lastActiveDate: lastActive,
      freezesAvailable: streak.streak_freezes_available,
      freezeUsedDate: streak.streak_freeze_used_date,
      isAlive: true,
      needsAction: true,
      justBroke: false,
      milestoneReached: null,
    };
  }

  // Case 4: Gap > 1 day — check for freeze
  const gap = engDaysBetween(lastActive, today);

  if (gap === 2 && streak.streak_freezes_available > 0 && streak.streak_freeze_used_date !== engYesterday()) {
    const newFreezes = streak.streak_freezes_available - 1;

    await supabase
      .from('streak_data')
      .update({
        streak_freezes_available: newFreezes,
        streak_freeze_used_date: engYesterday(),
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', profileId);

    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      lastActiveDate: lastActive,
      freezesAvailable: newFreezes,
      freezeUsedDate: engYesterday(),
      isAlive: true,
      needsAction: true,
      justBroke: false,
      milestoneReached: null,
    };
  }

  // Case 5: Streak is broken
  const oldStreak = streak.current_streak;

  await supabase
    .from('streak_data')
    .update({
      current_streak: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('player_id', profileId);

  return {
    currentStreak: 0,
    longestStreak: streak.longest_streak,
    lastActiveDate: lastActive,
    freezesAvailable: streak.streak_freezes_available,
    freezeUsedDate: streak.streak_freeze_used_date,
    isAlive: false,
    needsAction: true,
    justBroke: oldStreak > 0,
    milestoneReached: null,
  };
}

// ─── Core: Record Qualifying Action ──────────────────────────────────────────
// Called when a player completes a qualifying action (quest, attendance, etc).

export async function recordQualifyingAction(profileId: string): Promise<{
  newStreak: number;
  milestoneReached: number | null;
  freezeAwarded: boolean;
}> {
  const streak = await getOrInitStreak(profileId);
  if (!streak) {
    return { newStreak: 0, milestoneReached: null, freezeAwarded: false };
  }

  const today = engLocalToday();

  // If already active today, no change needed
  if (streak.last_active_date === today) {
    return {
      newStreak: streak.current_streak,
      milestoneReached: null,
      freezeAwarded: false,
    };
  }

  // Calculate new streak
  let newStreak: number;
  const lastActive = streak.last_active_date;

  if (!lastActive) {
    newStreak = 1;
  } else if (lastActive === engYesterday()) {
    newStreak = streak.current_streak + 1;
  } else if (
    engDaysBetween(lastActive, today) === 2 &&
    streak.streak_freeze_used_date === engYesterday()
  ) {
    newStreak = streak.current_streak + 1;
  } else {
    newStreak = 1;
  }

  const newLongest = Math.max(streak.longest_streak, newStreak);

  await supabase
    .from('streak_data')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('player_id', profileId);

  // Check for milestone
  let milestoneReached: number | null = null;
  let freezeAwarded = false;

  if (ENGAGEMENT_STREAK_MILESTONES.includes(newStreak)) {
    const { data: existingMilestone } = await supabase
      .from('streak_milestones')
      .select('id')
      .eq('player_id', profileId)
      .eq('milestone_days', newStreak)
      .maybeSingle();

    if (!existingMilestone) {
      milestoneReached = newStreak;

      const shouldAwardFreeze = streak.streak_freezes_available < ENGAGEMENT_MAX_FREEZES;

      await supabase.from('streak_milestones').insert({
        player_id: profileId,
        milestone_days: newStreak,
        freeze_awarded: shouldAwardFreeze,
        badge_id: null,
      });

      if (shouldAwardFreeze) {
        freezeAwarded = true;
        await supabase
          .from('streak_data')
          .update({
            streak_freezes_available: streak.streak_freezes_available + 1,
          })
          .eq('player_id', profileId);
      }
    }
  }

  return { newStreak, milestoneReached, freezeAwarded };
}
