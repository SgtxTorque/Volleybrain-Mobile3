/**
 * season-finalization.ts — Season Finalization Flow
 *
 * When an admin finalizes a season:
 * 1. Archive each player's season rank into season_rank_history
 * 2. Award permanent season badge to each ranked player
 * 3. Increment prestige_count on profiles for players who achieved any rank above Unranked
 * 4. Mark the season as finalized
 * 5. Clear current_season_rank and current_season_multiplier on profiles
 */

import { supabase } from './supabase';
import { SEASON_RANK_TIERS } from './engagement-constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FinalizationPreview = {
  totalPlayers: number;
  rankedPlayers: number;
  unrankedPlayers: number;
  rankDistribution: Record<string, number>; // e.g., { bronze: 5, silver: 3, gold: 1 }
  seasonName: string;
};

export type FinalizationResult = {
  success: boolean;
  playersFinalized: number;
  prestigeIncremented: number;
  seasonBadgesAwarded: number;
  error?: string;
};

// ─── Preview (show admin what will happen) ───────────────────────────────────

export async function getFinalizationPreview(seasonId: string): Promise<FinalizationPreview> {
  // Get season info
  const { data: season } = await supabase
    .from('seasons')
    .select('name, status')
    .eq('id', seasonId)
    .single();

  // Get all season ranks for this season
  const { data: ranks } = await supabase
    .from('season_ranks')
    .select('player_id, rank_tier, season_score')
    .eq('season_id', seasonId);

  const allRanks = ranks || [];
  const rankedPlayers = allRanks.filter(r => r.rank_tier !== 'unranked');
  const unrankedPlayers = allRanks.filter(r => r.rank_tier === 'unranked');

  // Count per rank
  const rankDistribution: Record<string, number> = {};
  for (const r of rankedPlayers) {
    rankDistribution[r.rank_tier] = (rankDistribution[r.rank_tier] || 0) + 1;
  }

  return {
    totalPlayers: allRanks.length,
    rankedPlayers: rankedPlayers.length,
    unrankedPlayers: unrankedPlayers.length,
    rankDistribution,
    seasonName: season?.name || 'Unknown Season',
  };
}

// ─── Finalize Season ─────────────────────────────────────────────────────────

export async function finalizeSeason(
  seasonId: string,
  organizationId: string,
): Promise<FinalizationResult> {
  try {
    // 1. Check season isn't already finalized
    const { data: season } = await supabase
      .from('seasons')
      .select('id, name, status')
      .eq('id', seasonId)
      .single();

    if (!season) {
      return { success: false, playersFinalized: 0, prestigeIncremented: 0, seasonBadgesAwarded: 0, error: 'Season not found' };
    }

    if (season.status === 'completed' || season.status === 'closed') {
      // Check if already finalized (has history rows)
      const { count } = await supabase
        .from('season_rank_history')
        .select('id', { count: 'exact', head: true })
        .eq('season_id', seasonId);

      if (count && count > 0) {
        return { success: false, playersFinalized: 0, prestigeIncremented: 0, seasonBadgesAwarded: 0, error: 'Season already finalized' };
      }
    }

    // 2. Get all season ranks
    const { data: ranks } = await supabase
      .from('season_ranks')
      .select('*')
      .eq('season_id', seasonId);

    if (!ranks || ranks.length === 0) {
      return { success: false, playersFinalized: 0, prestigeIncremented: 0, seasonBadgesAwarded: 0, error: 'No players have season rank data' };
    }

    // 3. Archive to season_rank_history
    const historyRows = ranks.map(r => ({
      player_id: r.player_id,
      season_id: seasonId,
      organization_id: organizationId,
      final_rank_tier: r.rank_tier,
      final_season_score: r.season_score,
      final_season_xp: r.season_xp,
      final_badges_earned: r.badges_earned,
      final_activity_score: r.activity_score,
      finalized_at: new Date().toISOString(),
    }));

    const { error: historyError } = await supabase
      .from('season_rank_history')
      .insert(historyRows);

    if (historyError) {
      return { success: false, playersFinalized: 0, prestigeIncremented: 0, seasonBadgesAwarded: 0, error: `History insert failed: ${historyError.message}` };
    }

    // 4. Increment prestige for players who achieved any rank above Unranked
    const rankedPlayerIds = ranks
      .filter(r => r.rank_tier !== 'unranked')
      .map(r => r.player_id);

    let prestigeIncremented = 0;
    if (rankedPlayerIds.length > 0) {
      // Batch update prestige — increment by 1 for each ranked player
      for (const playerId of rankedPlayerIds) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('prestige_count')
          .eq('id', playerId)
          .maybeSingle();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ prestige_count: (profile.prestige_count || 0) + 1 })
            .eq('id', playerId);
          prestigeIncremented++;
        }
      }
    }

    // 5. Clear current season rank fields on ALL profiles in this season
    const allPlayerIds = ranks.map(r => r.player_id);
    if (allPlayerIds.length > 0) {
      for (const playerId of allPlayerIds) {
        await supabase
          .from('profiles')
          .update({
            current_season_rank: 'unranked',
            current_season_multiplier: 1.0,
          })
          .eq('id', playerId);
      }
    }

    // 6. Update season status to completed
    await supabase
      .from('seasons')
      .update({ status: 'completed' })
      .eq('id', seasonId);

    return {
      success: true,
      playersFinalized: ranks.length,
      prestigeIncremented,
      seasonBadgesAwarded: 0, // Season badges TBD — requires season badge achievement records
    };
  } catch (e: any) {
    return { success: false, playersFinalized: 0, prestigeIncremented: 0, seasonBadgesAwarded: 0, error: e.message };
  }
}
