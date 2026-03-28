/**
 * season-rank-engine.ts — Season Rank Calculation Engine
 *
 * Calculates a player's season rank based on:
 *   Season Score = (Season XP × 0.5) + (Badges Earned × 20) + (Activity Score × 0.3)
 *
 * Activity Score is composed of:
 *   - Attendance percentage (0-100, weighted 40%)
 *   - Quest completion rate (0-100, weighted 25%)
 *   - Challenge participation (0-100, weighted 20%)
 *   - Login consistency / streak health (0-100, weighted 15%)
 */

import { supabase } from './supabase';
import {
  SEASON_SCORE_WEIGHTS,
  getSeasonRankFromScore,
} from './engagement-constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SeasonRankData = {
  seasonXp: number;
  badgesEarned: number;
  activityScore: number;
  seasonScore: number;
  rankTier: string;
  xpMultiplier: number;
  // Activity breakdown
  attendancePct: number;
  questCompletionPct: number;
  challengeParticipationPct: number;
  loginConsistencyPct: number;
};

// ─── Activity Score Weights ──────────────────────────────────────────────────

const ACTIVITY_WEIGHTS = {
  attendance: 0.40,
  quests: 0.25,
  challenges: 0.20,
  loginConsistency: 0.15,
};

// ─── Main Calculation ────────────────────────────────────────────────────────

/**
 * Calculate a player's full season rank data.
 * This queries multiple tables and computes the composite score.
 */
export async function calculateSeasonRank(
  profileId: string,
  seasonId: string,
  _organizationId: string,
): Promise<SeasonRankData> {
  // Run all queries in parallel for speed
  const [seasonXp, badgesEarned, attendancePct, questPct, challengePct, loginPct] =
    await Promise.all([
      getSeasonXP(profileId, seasonId),
      getSeasonBadgeCount(profileId, seasonId),
      getAttendancePercentage(profileId, seasonId),
      getQuestCompletionRate(profileId, seasonId),
      getChallengeParticipation(profileId, seasonId),
      getLoginConsistency(profileId),
    ]);

  // Calculate activity score (0-100 scale)
  const activityScore = Math.round(
    attendancePct * ACTIVITY_WEIGHTS.attendance +
    questPct * ACTIVITY_WEIGHTS.quests +
    challengePct * ACTIVITY_WEIGHTS.challenges +
    loginPct * ACTIVITY_WEIGHTS.loginConsistency
  );

  // Calculate season score using V2 formula
  const seasonScore = Math.round(
    seasonXp * SEASON_SCORE_WEIGHTS.xpWeight +
    badgesEarned * SEASON_SCORE_WEIGHTS.badgeMultiplier +
    activityScore * SEASON_SCORE_WEIGHTS.activityWeight
  );

  // Determine rank tier
  const rankTier = getSeasonRankFromScore(seasonScore);

  return {
    seasonXp,
    badgesEarned,
    activityScore,
    seasonScore,
    rankTier: rankTier.rank,
    xpMultiplier: rankTier.multiplier,
    attendancePct,
    questCompletionPct: questPct,
    challengeParticipationPct: challengePct,
    loginConsistencyPct: loginPct,
  };
}

// ─── Update Season Rank in DB ────────────────────────────────────────────────

/**
 * Recalculate and persist a player's season rank.
 * Also updates the denormalized fields on profiles for fast reads.
 * Call this after XP awards, badge unlocks, or activity changes.
 */
export async function updateSeasonRank(
  profileId: string,
  seasonId: string,
  organizationId: string,
): Promise<SeasonRankData> {
  const rankData = await calculateSeasonRank(profileId, seasonId, organizationId);

  // Upsert season_ranks
  const { data: existing } = await supabase
    .from('season_ranks')
    .select('id')
    .eq('player_id', profileId)
    .eq('season_id', seasonId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('season_ranks')
      .update({
        season_xp: rankData.seasonXp,
        badges_earned: rankData.badgesEarned,
        activity_score: rankData.activityScore,
        season_score: rankData.seasonScore,
        rank_tier: rankData.rankTier,
        xp_multiplier: rankData.xpMultiplier,
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
        season_xp: rankData.seasonXp,
        badges_earned: rankData.badgesEarned,
        activity_score: rankData.activityScore,
        season_score: rankData.seasonScore,
        rank_tier: rankData.rankTier,
        xp_multiplier: rankData.xpMultiplier,
      });
  }

  // Update denormalized fields on profiles for fast reads
  await supabase
    .from('profiles')
    .update({
      current_season_rank: rankData.rankTier,
      current_season_multiplier: rankData.xpMultiplier,
    })
    .eq('id', profileId);

  return rankData;
}

// ─── Quick Rank Refresh (lightweight) ────────────────────────────────────────

/**
 * Lightweight version that only updates season_xp and badges_earned
 * without recalculating the full activity score.
 * Use this on every XP award for fast incremental updates.
 * Full recalculation (with activity score) should happen periodically.
 */
export async function quickRankRefresh(
  profileId: string,
  seasonId: string,
  organizationId: string,
  addedXp: number,
): Promise<{ newRankTier: string; newMultiplier: number; rankChanged: boolean }> {
  // Get or create season_ranks row
  const { data: existing } = await supabase
    .from('season_ranks')
    .select('id, season_xp, badges_earned, activity_score, rank_tier')
    .eq('player_id', profileId)
    .eq('season_id', seasonId)
    .maybeSingle();

  const currentXp = (existing?.season_xp || 0) + addedXp;
  const badges = existing?.badges_earned || 0;
  const activity = existing?.activity_score || 0;

  // Recalculate score with updated XP
  const seasonScore = Math.round(
    currentXp * SEASON_SCORE_WEIGHTS.xpWeight +
    badges * SEASON_SCORE_WEIGHTS.badgeMultiplier +
    activity * SEASON_SCORE_WEIGHTS.activityWeight
  );

  const newRank = getSeasonRankFromScore(seasonScore);
  const oldRankTier = existing?.rank_tier || 'unranked';
  const rankChanged = newRank.rank !== oldRankTier;

  if (existing) {
    await supabase
      .from('season_ranks')
      .update({
        season_xp: currentXp,
        season_score: seasonScore,
        rank_tier: newRank.rank,
        xp_multiplier: newRank.multiplier,
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
        season_xp: currentXp,
        season_score: seasonScore,
        rank_tier: newRank.rank,
        xp_multiplier: newRank.multiplier,
      });
  }

  // Update denormalized profile fields if rank changed
  if (rankChanged) {
    await supabase
      .from('profiles')
      .update({
        current_season_rank: newRank.rank,
        current_season_multiplier: newRank.multiplier,
      })
      .eq('id', profileId);
  }

  return {
    newRankTier: newRank.rank,
    newMultiplier: newRank.multiplier,
    rankChanged,
  };
}

// ─── Increment Badge Count ───────────────────────────────────────────────────

/**
 * Call when a badge is earned in the current season.
 * Increments badges_earned and recalculates rank.
 */
export async function incrementSeasonBadges(
  profileId: string,
  seasonId: string,
  organizationId: string,
): Promise<{ newRankTier: string; rankChanged: boolean }> {
  const { data: existing } = await supabase
    .from('season_ranks')
    .select('id, season_xp, badges_earned, activity_score, rank_tier')
    .eq('player_id', profileId)
    .eq('season_id', seasonId)
    .maybeSingle();

  const badges = (existing?.badges_earned || 0) + 1;
  const xp = existing?.season_xp || 0;
  const activity = existing?.activity_score || 0;

  const seasonScore = Math.round(
    xp * SEASON_SCORE_WEIGHTS.xpWeight +
    badges * SEASON_SCORE_WEIGHTS.badgeMultiplier +
    activity * SEASON_SCORE_WEIGHTS.activityWeight
  );

  const newRank = getSeasonRankFromScore(seasonScore);
  const oldRankTier = existing?.rank_tier || 'unranked';
  const rankChanged = newRank.rank !== oldRankTier;

  if (existing) {
    await supabase
      .from('season_ranks')
      .update({
        badges_earned: badges,
        season_score: seasonScore,
        rank_tier: newRank.rank,
        xp_multiplier: newRank.multiplier,
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
        badges_earned: badges,
        season_score: seasonScore,
        rank_tier: newRank.rank,
        xp_multiplier: newRank.multiplier,
      });
  }

  if (rankChanged) {
    await supabase
      .from('profiles')
      .update({
        current_season_rank: newRank.rank,
        current_season_multiplier: newRank.multiplier,
      })
      .eq('id', profileId);
  }

  return { newRankTier: newRank.rank, rankChanged };
}

// ─── Component Queries ──────────────────────────────────────��────────────────

async function getSeasonXP(profileId: string, seasonId: string): Promise<number> {
  const { data } = await supabase
    .from('xp_ledger')
    .select('xp_amount')
    .eq('player_id', profileId)
    .eq('season_id', seasonId);

  if (!data || data.length === 0) return 0;
  return data.reduce((sum: number, row: any) => sum + (row.xp_amount || 0), 0);
}

async function getSeasonBadgeCount(profileId: string, seasonId: string): Promise<number> {
  // Check player_achievements
  const { count: playerCount } = await supabase
    .from('player_achievements')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', profileId)
    .eq('season_id', seasonId);

  // Also check user_achievements (for coach/parent/admin roles)
  const { count: userCount } = await supabase
    .from('user_achievements')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profileId)
    .eq('season_id', seasonId);

  return (playerCount || 0) + (userCount || 0);
}

async function getAttendancePercentage(profileId: string, seasonId: string): Promise<number> {
  // Get all events in this season
  const { data: events } = await supabase
    .from('schedule_events')
    .select('id')
    .eq('season_id', seasonId);

  if (!events || events.length === 0) return 0;

  const eventIds = events.map((e: any) => e.id);

  // Get attendance records for this player
  const { data: attendance } = await supabase
    .from('event_attendance')
    .select('event_id, status')
    .eq('player_id', profileId)
    .in('event_id', eventIds);

  if (!attendance || attendance.length === 0) return 0;

  const presentCount = attendance.filter((a: any) => a.status === 'present' || a.status === 'late').length;
  return Math.round((presentCount / events.length) * 100);
}

async function getQuestCompletionRate(profileId: string, seasonId: string): Promise<number> {
  // Get season date range for filtering quests
  const { data: season } = await supabase
    .from('seasons')
    .select('start_date, end_date')
    .eq('id', seasonId)
    .maybeSingle();

  if (!season) return 0;

  // Daily quests in season date range
  const { data: dailyQuests } = await supabase
    .from('daily_quests')
    .select('is_completed')
    .eq('player_id', profileId)
    .gte('quest_date', season.start_date)
    .lte('quest_date', season.end_date);

  // Weekly quests in season date range
  const { data: weeklyQuests } = await supabase
    .from('weekly_quests')
    .select('is_completed')
    .eq('player_id', profileId)
    .gte('week_start', season.start_date)
    .lte('week_start', season.end_date);

  const allQuests = [...(dailyQuests || []), ...(weeklyQuests || [])];
  if (allQuests.length === 0) return 0;

  const completedCount = allQuests.filter((q: any) => q.is_completed).length;
  return Math.round((completedCount / allQuests.length) * 100);
}

async function getChallengeParticipation(profileId: string, seasonId: string): Promise<number> {
  // Get season date range
  const { data: season } = await supabase
    .from('seasons')
    .select('start_date, end_date')
    .eq('id', seasonId)
    .maybeSingle();

  if (!season) return 0;

  // Get all challenges in this season's teams
  const { data: teamMemberships } = await supabase
    .from('team_players')
    .select('team_id')
    .eq('player_id', profileId);

  if (!teamMemberships || teamMemberships.length === 0) return 0;

  const teamIds = teamMemberships.map((tm: any) => tm.team_id);

  const { data: challenges } = await supabase
    .from('coach_challenges')
    .select('id')
    .in('team_id', teamIds)
    .eq('status', 'completed')
    .gte('starts_at', season.start_date)
    .lte('ends_at', season.end_date);

  if (!challenges || challenges.length === 0) return 0;

  // How many did this player participate in?
  const challengeIds = challenges.map((c: any) => c.id);
  const { count: participated } = await supabase
    .from('challenge_participants')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', profileId)
    .in('challenge_id', challengeIds);

  return Math.round(((participated || 0) / challenges.length) * 100);
}

async function getLoginConsistency(profileId: string): Promise<number> {
  // Use streak data as a proxy for login consistency
  const { data: streak } = await supabase
    .from('streak_data')
    .select('current_streak, longest_streak')
    .eq('player_id', profileId)
    .maybeSingle();

  if (!streak) return 0;

  // Score based on current streak:
  // 0 days = 0%, 3 days = 30%, 5 days = 50%, 7 days = 70%, 14+ days = 100%
  const streakDays = streak.current_streak || 0;
  if (streakDays >= 14) return 100;
  if (streakDays >= 7) return 70;
  if (streakDays >= 5) return 50;
  if (streakDays >= 3) return 30;
  if (streakDays >= 1) return 15;
  return 0;
}
