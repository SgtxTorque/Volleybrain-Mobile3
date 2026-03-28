/**
 * coach-award-service.ts — Coach Direct Badge Award Service
 * Allows coaches to award badges to players based on judgment (MVP, Most Improved, etc.)
 * Uses the V2 engagement engine: player_achievements + awardXP + season rank update
 */

import { supabase } from './supabase';
import { awardXP } from './xp-award-service';
import { XP_BY_RARITY } from './engagement-constants';
import { incrementSeasonBadges } from './season-rank-engine';

export type CoachAwardParams = {
  coachProfileId: string;
  playerProfileId: string;
  playerId: string;         // players table ID (for player_achievements)
  achievementId: string;
  teamId: string;
  seasonId: string;
  organizationId: string;
  note?: string;            // optional coach note
};

export type CoachAwardResult = {
  success: boolean;
  xpAwarded: number;
  error?: string;
};

/**
 * Award a badge directly from a coach to a player.
 * Writes to player_achievements, awards XP, updates season rank.
 */
export async function awardBadgeToPlayer(params: CoachAwardParams): Promise<CoachAwardResult> {
  const {
    coachProfileId,
    playerProfileId,
    playerId,
    achievementId,
    teamId,
    seasonId,
    organizationId,
    note,
  } = params;

  try {
    // 1. Fetch the achievement to get rarity and XP value
    const { data: achievement, error: achError } = await supabase
      .from('achievements')
      .select('id, name, rarity, xp_reward, engagement_category')
      .eq('id', achievementId)
      .single();

    if (achError || !achievement) {
      return { success: false, xpAwarded: 0, error: 'Achievement not found' };
    }

    // 2. Check if player already has this badge this season
    const { data: existing } = await supabase
      .from('player_achievements')
      .select('id')
      .eq('player_id', playerId)
      .eq('achievement_id', achievementId)
      .eq('season_id', seasonId)
      .maybeSingle();

    if (existing) {
      return { success: false, xpAwarded: 0, error: 'Player already has this badge this season' };
    }

    // 3. Insert into player_achievements
    const { error: insertError } = await supabase
      .from('player_achievements')
      .insert({
        player_id: playerId,
        achievement_id: achievementId,
        earned_at: new Date().toISOString(),
        team_id: teamId,
        season_id: seasonId,
        verified_by: coachProfileId,
        verified_at: new Date().toISOString(),
        stat_value_at_unlock: 0,
      });

    if (insertError) {
      return { success: false, xpAwarded: 0, error: `Insert failed: ${insertError.message}` };
    }

    // 4. Award XP via centralized service
    const xpAmount = achievement.xp_reward || XP_BY_RARITY[achievement.rarity.toLowerCase()] || 25;
    await awardXP({
      profileId: playerProfileId,
      baseAmount: xpAmount,
      sourceType: 'coach_award',
      sourceId: achievementId,
      seasonId,
      organizationId,
      teamId,
      description: `Coach awarded: ${achievement.name} (+${xpAmount} XP)`,
    });

    // 5. Increment season rank badge count
    try {
      await incrementSeasonBadges(playerProfileId, seasonId, organizationId);
    } catch (e) {
      // Non-critical
    }

    return { success: true, xpAwarded: xpAmount };
  } catch (e: any) {
    return { success: false, xpAwarded: 0, error: e.message };
  }
}

/**
 * Fetch badges that a coach can award (engagement_category = 'coach' with requires_verification = true,
 * OR any badge marked as coach-awardable).
 * Falls back to all coach-category badges if none are specifically marked.
 */
export async function fetchCoachAwardableBadges(organizationId: string): Promise<any[]> {
  // First try: badges specifically designed for coach awards
  const { data: verifiable } = await supabase
    .from('achievements')
    .select('*')
    .eq('is_active', true)
    .eq('requires_verification', true)
    .in('target_role', ['player', 'all'])
    .order('display_order');

  if (verifiable && verifiable.length > 0) {
    return verifiable;
  }

  // Fallback: all coach-engagement-category badges available to players
  const { data: coachBadges } = await supabase
    .from('achievements')
    .select('*')
    .eq('is_active', true)
    .eq('engagement_category', 'coach')
    .in('target_role', ['player', 'all'])
    .order('rarity', { ascending: true })
    .order('display_order');

  return coachBadges || [];
}
