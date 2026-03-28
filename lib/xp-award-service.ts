/**
 * xp-award-service.ts — Centralized XP Award Service
 *
 * ALL XP awards in the app flow through this single function.
 * Handles: boost lookup → season rank multiplier → xp_ledger insert → profiles update → season_ranks update
 */

import { supabase } from './supabase';
import { getLevelFromXP } from './engagement-constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export type XpAwardParams = {
  /** The profile ID of the person receiving XP */
  profileId: string;
  /** The base XP amount before any multipliers */
  baseAmount: number;
  /** The source type for the xp_ledger record */
  sourceType: string;
  /** Optional source ID (achievement ID, challenge ID, etc.) */
  sourceId?: string | null;
  /** Season ID — if known. Will attempt to resolve if not provided. */
  seasonId?: string | null;
  /** Organization ID — for xp_ledger record */
  organizationId?: string | null;
  /** Team ID — for boost lookup */
  teamId?: string | null;
  /** Human-readable description for the ledger entry */
  description: string;
  /** If true, skip boost multiplier lookup (for sources that handle their own boost) */
  skipBoostLookup?: boolean;
};

export type XpAwardResult = {
  /** The final XP amount after all multipliers */
  finalAmount: number;
  /** The player's new total lifetime XP */
  newTotalXp: number;
  /** The player's new level */
  newLevel: number;
  /** The player's new tier name */
  newTier: string;
  /** The XP needed to reach the next level */
  xpToNext: number;
  /** Whether a level-up occurred */
  leveledUp: boolean;
  /** The boost multiplier that was applied (1.0 if none) */
  boostMultiplier: number;
  /** The season rank multiplier that was applied (1.0 if none) */
  seasonMultiplier: number;
};

// ─── Main Award Function ─────────────────────────────────────────────────────

export async function awardXP(params: XpAwardParams): Promise<XpAwardResult> {
  const {
    profileId,
    baseAmount,
    sourceType,
    sourceId = null,
    seasonId = null,
    organizationId = null,
    teamId = null,
    description,
    skipBoostLookup = false,
  } = params;

  if (baseAmount <= 0) {
    // No XP to award — return current state without writing
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_xp')
      .eq('id', profileId)
      .maybeSingle();
    const currentXp = profile?.total_xp || 0;
    const levelInfo = getLevelFromXP(currentXp);
    return {
      finalAmount: 0,
      newTotalXp: currentXp,
      newLevel: levelInfo.level,
      newTier: levelInfo.tier,
      xpToNext: levelInfo.xpToNext,
      leveledUp: false,
      boostMultiplier: 1.0,
      seasonMultiplier: 1.0,
    };
  }

  // ─── Step 1: Look up boost multiplier ───────────────────────────────────
  let boostMultiplier = 1.0;

  if (!skipBoostLookup && teamId) {
    try {
      const now = new Date().toISOString();
      const { data: boosts } = await supabase
        .from('xp_boost_events')
        .select('multiplier, applicable_sources')
        .or(`team_id.eq.${teamId},team_id.is.null`)
        .lte('starts_at', now)
        .gte('ends_at', now);

      if (boosts && boosts.length > 0) {
        // Find the best matching boost
        for (const boost of boosts) {
          const applies = !boost.applicable_sources || boost.applicable_sources.includes(sourceType);
          if (applies && boost.multiplier > boostMultiplier) {
            boostMultiplier = boost.multiplier;
          }
        }
      }
    } catch (e) {
      // Boost lookup failed — continue with 1.0x (non-critical)
      if (__DEV__) console.warn('[XP Award] Boost lookup failed:', e);
    }
  }

  // ─── Step 2: Look up season rank multiplier ─────────────────────────────
  // PLACEHOLDER — will be implemented in SEASON-01B spec
  // For now, always 1.0 (no DB column lookup yet)
  const seasonMultiplier = 1.0;

  // ─── Step 3: Calculate final XP ─────────────────────────────────────────
  const finalAmount = Math.round(baseAmount * boostMultiplier * seasonMultiplier);

  // ─── Step 4: Build description with multiplier info ─────────────────────
  let finalDescription = description;
  if (boostMultiplier > 1.0 && seasonMultiplier > 1.0) {
    finalDescription += ` (${boostMultiplier}x boost + ${seasonMultiplier}x season)`;
  } else if (boostMultiplier > 1.0) {
    finalDescription += ` (${boostMultiplier}x boost)`;
  } else if (seasonMultiplier > 1.0) {
    finalDescription += ` (${seasonMultiplier}x season rank)`;
  }

  // ─── Step 5: Insert xp_ledger entry ─────────────────────────────────────
  await supabase.from('xp_ledger').insert({
    player_id: profileId,
    organization_id: organizationId,
    xp_amount: finalAmount,
    source_type: sourceType,
    source_id: sourceId,
    season_id: seasonId,
    description: finalDescription,
  });

  // ─── Step 6: Update profiles ────────────────────────────────────────────
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', profileId)
    .maybeSingle();

  const oldTotalXp = currentProfile?.total_xp || 0;
  const newTotalXp = oldTotalXp + finalAmount;
  const oldLevelInfo = getLevelFromXP(oldTotalXp);
  const newLevelInfo = getLevelFromXP(newTotalXp);

  await supabase
    .from('profiles')
    .update({
      total_xp: newTotalXp,
      player_level: newLevelInfo.level,
      tier: newLevelInfo.tier,
      xp_to_next_level: newLevelInfo.xpToNext,
    })
    .eq('id', profileId);

  // ─── Step 7: Update season_ranks.season_xp (if season known) ────────────
  if (seasonId) {
    try {
      // Upsert — create row if first XP in this season, otherwise increment
      const { data: existing } = await supabase
        .from('season_ranks')
        .select('id, season_xp')
        .eq('player_id', profileId)
        .eq('season_id', seasonId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('season_ranks')
          .update({
            season_xp: (existing.season_xp || 0) + finalAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('season_ranks')
          .insert({
            player_id: profileId,
            season_id: seasonId,
            organization_id: organizationId,
            season_xp: finalAmount,
          });
      }
    } catch (e) {
      if (__DEV__) console.warn('[XP Award] Season ranks update failed:', e);
    }
  }

  return {
    finalAmount,
    newTotalXp,
    newLevel: newLevelInfo.level,
    newTier: newLevelInfo.tier,
    xpToNext: newLevelInfo.xpToNext,
    leveledUp: newLevelInfo.level > oldLevelInfo.level,
    boostMultiplier,
    seasonMultiplier,
  };
}

// ─── Helper: Resolve Profile ID from Player ID ───────────────────────────────
// Some callers have a players.id (child record) instead of a profiles.id.
// This helper resolves to profiles.id.

export async function resolveProfileIdFromPlayerId(playerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('players')
    .select('parent_account_id')
    .eq('id', playerId)
    .maybeSingle();
  return data?.parent_account_id || null;
}
