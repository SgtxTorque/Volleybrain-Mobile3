/**
 * division-utils.ts — Resolve a player's division from team/age_group context
 */

import { supabase } from './supabase';
import { parseDivisionFromAgeGroup, DIVISION_CONFIGS, RARITY_ORDER, type Division } from './engagement-constants';

/**
 * Resolve the division for a player based on their team's age group.
 * Tries teams.age_group (text field) first, then falls back to age_groups table.
 * Returns '14u_plus' if no age group can be determined (full thresholds = safest default).
 */
export async function resolvePlayerDivision(playerId: string, teamId?: string | null): Promise<Division> {
  let targetTeamId = teamId;

  // If no teamId provided, look up from team_players
  if (!targetTeamId) {
    const { data } = await supabase
      .from('team_players')
      .select('team_id')
      .eq('player_id', playerId)
      .limit(1)
      .maybeSingle();
    targetTeamId = data?.team_id;
  }

  if (!targetTeamId) return '14u_plus';

  // Get team's age group info
  const { data: team } = await supabase
    .from('teams')
    .select('age_group, age_group_id')
    .eq('id', targetTeamId)
    .maybeSingle();

  // Try text field first (most reliable, "12U" format)
  if (team?.age_group) {
    return parseDivisionFromAgeGroup(team.age_group);
  }

  // Fall back to age_groups table
  if (team?.age_group_id) {
    const { data: ag } = await supabase
      .from('age_groups')
      .select('name')
      .eq('id', team.age_group_id)
      .maybeSingle();
    if (ag?.name) return parseDivisionFromAgeGroup(ag.name);
  }

  return '14u_plus';
}

/**
 * Get the effective threshold for a badge given a division.
 * First checks division_thresholds table for an override.
 * Falls back to scaling the base threshold by the division's scaleFactor.
 */
export async function getEffectiveThreshold(
  achievementId: string,
  baseThreshold: number,
  division: Division,
): Promise<number> {
  if (division === '14u_plus') return baseThreshold; // No scaling needed

  // Check for explicit override in division_thresholds table
  try {
    const { data } = await supabase
      .from('division_thresholds')
      .select('threshold_override')
      .eq('achievement_id', achievementId)
      .eq('division', division)
      .maybeSingle();

    if (data?.threshold_override != null) {
      return data.threshold_override;
    }
  } catch (e) {
    // Table might not have data yet — fall through to calculated scaling
  }

  // Calculate scaled threshold
  const config = DIVISION_CONFIGS[division];
  return Math.max(1, Math.round(baseThreshold * config.scaleFactor));
}

/**
 * Check if a badge's rarity exceeds the division's max rarity cap.
 * Returns true if the badge SHOULD BE SKIPPED (rarity too high for division).
 */
export function exceedsRarityCap(badgeRarity: string, division: Division): boolean {
  if (division === '14u_plus') return false; // No cap
  const config = DIVISION_CONFIGS[division];
  const badgeOrder = RARITY_ORDER[badgeRarity.toLowerCase()] || 0;
  return badgeOrder > config.maxRarityOrder;
}
