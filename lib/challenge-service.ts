// =============================================================================
// Challenge Service — CRUD, Opt-In, Progress, Completion
// =============================================================================

import { supabase } from './supabase';
import { getLevelFromXP, XP_BY_SOURCE } from './engagement-constants';
import type { CoachChallenge, ChallengeParticipant } from './engagement-types';

// =============================================================================
// Types
// =============================================================================

export type CreateChallengeParams = {
  coachId: string;
  coachName: string;
  teamId: string;
  organizationId: string;
  title: string;
  description?: string;
  challengeType: 'individual' | 'team';
  metricType: 'stat_based' | 'coach_verified' | 'self_report';
  statKey?: string;
  targetValue: number;
  xpReward: number;
  badgeId?: string;
  customRewardText?: string;
  startsAt: string;
  endsAt: string;
};

export type ChallengeWithParticipants = CoachChallenge & {
  participants: Array<ChallengeParticipant & { profile?: { full_name: string; avatar_url: string | null } }>;
  totalProgress?: number;
};

// =============================================================================
// Create Challenge
// =============================================================================

export async function createChallenge(params: CreateChallengeParams): Promise<{
  success: boolean;
  challengeId?: string;
  postId?: string;
  error?: string;
}> {
  try {
    // 1. Create team_post of type 'challenge'
    const metadata = JSON.stringify({
      title: params.title,
      description: params.description || null,
      challengeType: params.challengeType,
      targetValue: params.targetValue,
      xpReward: params.xpReward,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
    });

    const displayText = `Coach Challenge: ${params.title}`;

    const { data: post, error: postError } = await supabase
      .from('team_posts')
      .insert({
        team_id: params.teamId,
        author_id: params.coachId,
        post_type: 'challenge',
        title: metadata,
        content: displayText,
        is_pinned: false,
        is_published: true,
      })
      .select('id')
      .single();

    if (postError) {
      if (__DEV__) console.error('[ChallengeService] post insert error:', postError);
      return { success: false, error: postError.message };
    }

    // 2. Create challenge record
    const { data: challenge, error: challengeError } = await supabase
      .from('coach_challenges')
      .insert({
        coach_id: params.coachId,
        team_id: params.teamId,
        organization_id: params.organizationId,
        title: params.title,
        description: params.description || null,
        challenge_type: params.challengeType,
        metric_type: params.metricType,
        stat_key: params.statKey || null,
        target_value: params.targetValue,
        xp_reward: params.xpReward,
        badge_id: params.badgeId || null,
        custom_reward_text: params.customRewardText || null,
        starts_at: params.startsAt,
        ends_at: params.endsAt,
        status: 'active',
        post_id: post.id,
      })
      .select('id')
      .single();

    if (challengeError) {
      if (__DEV__) console.error('[ChallengeService] challenge insert error:', challengeError);
      return { success: false, error: challengeError.message };
    }

    return {
      success: true,
      challengeId: challenge?.id,
      postId: post.id,
    };
  } catch (err: any) {
    if (__DEV__) console.error('[ChallengeService] createChallenge error:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

// =============================================================================
// Opt In Player
// =============================================================================

export async function optInToChallenge(
  challengeId: string,
  playerId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('challenge_participants')
      .insert({
        challenge_id: challengeId,
        player_id: playerId,
        current_value: 0,
        completed: false,
        contribution: 0,
        opted_in_at: new Date().toISOString(),
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Already opted in' };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =============================================================================
// Update Player Progress
// =============================================================================

export async function updateChallengeProgress(
  challengeId: string,
  playerId: string,
  newValue: number,
): Promise<{ success: boolean; completed?: boolean; error?: string }> {
  try {
    // Get challenge target
    const { data: challenge } = await supabase
      .from('coach_challenges')
      .select('target_value, challenge_type')
      .eq('id', challengeId)
      .single();

    if (!challenge) return { success: false, error: 'Challenge not found' };

    const completed = newValue >= (challenge.target_value || 0);

    const { error } = await supabase
      .from('challenge_participants')
      .update({
        current_value: newValue,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('challenge_id', challengeId)
      .eq('player_id', playerId);

    if (error) return { success: false, error: error.message };
    return { success: true, completed };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =============================================================================
// Fetch Active Challenges for a Team
// =============================================================================

export async function fetchActiveChallenges(teamId: string): Promise<ChallengeWithParticipants[]> {
  try {
    const { data: challenges } = await supabase
      .from('coach_challenges')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!challenges || challenges.length === 0) return [];

    // Batch fetch participants for all challenges
    const challengeIds = challenges.map((c) => c.id);
    const { data: participants } = await supabase
      .from('challenge_participants')
      .select('*')
      .in('challenge_id', challengeIds);

    // Get profile names for participants
    const playerIds = [...new Set((participants || []).map((p) => p.player_id))];
    const profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};

    if (playerIds.length > 0) {
      // Try profiles table first (for coaches/parents)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', playerIds);
      for (const p of profiles || []) {
        profileMap[p.id] = { full_name: p.full_name || 'Unknown', avatar_url: p.avatar_url };
      }

      // Try players table for remaining
      const missingIds = playerIds.filter((id) => !profileMap[id]);
      if (missingIds.length > 0) {
        const { data: players } = await supabase
          .from('players')
          .select('id, first_name, last_name, photo_url')
          .in('id', missingIds);
        for (const p of players || []) {
          profileMap[p.id] = {
            full_name: `${p.first_name} ${p.last_name}`,
            avatar_url: p.photo_url,
          };
        }
      }
    }

    // Group participants by challenge
    const partMap = new Map<string, Array<ChallengeParticipant & { profile?: typeof profileMap[string] }>>();
    for (const p of participants || []) {
      const arr = partMap.get(p.challenge_id) || [];
      arr.push({ ...p, profile: profileMap[p.player_id] });
      partMap.set(p.challenge_id, arr);
    }

    return challenges.map((c) => {
      const parts = partMap.get(c.id) || [];
      const totalProgress = parts.reduce((sum, p) => sum + (p.current_value || 0), 0);
      return {
        ...c,
        participants: parts.sort((a, b) => (b.current_value || 0) - (a.current_value || 0)),
        totalProgress,
      } as ChallengeWithParticipants;
    });
  } catch (err) {
    if (__DEV__) console.error('[ChallengeService] fetchActiveChallenges error:', err);
    return [];
  }
}

// =============================================================================
// Fetch Single Challenge with Leaderboard
// =============================================================================

export async function fetchChallengeDetail(challengeId: string): Promise<ChallengeWithParticipants | null> {
  try {
    const { data: challenge } = await supabase
      .from('coach_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (!challenge) return null;

    const { data: participants } = await supabase
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('current_value', { ascending: false });

    // Get profile names
    const playerIds = (participants || []).map((p) => p.player_id);
    const profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};

    if (playerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', playerIds);
      for (const p of profiles || []) {
        profileMap[p.id] = { full_name: p.full_name || 'Unknown', avatar_url: p.avatar_url };
      }

      const missingIds = playerIds.filter((id) => !profileMap[id]);
      if (missingIds.length > 0) {
        const { data: players } = await supabase
          .from('players')
          .select('id, first_name, last_name, photo_url')
          .in('id', missingIds);
        for (const p of players || []) {
          profileMap[p.id] = {
            full_name: `${p.first_name} ${p.last_name}`,
            avatar_url: p.photo_url,
          };
        }
      }
    }

    const enrichedParticipants = (participants || []).map((p) => ({
      ...p,
      profile: profileMap[p.player_id],
    }));

    const totalProgress = enrichedParticipants.reduce((sum, p) => sum + (p.current_value || 0), 0);

    return {
      ...challenge,
      participants: enrichedParticipants,
      totalProgress,
    } as ChallengeWithParticipants;
  } catch (err) {
    if (__DEV__) console.error('[ChallengeService] fetchChallengeDetail error:', err);
    return null;
  }
}

// =============================================================================
// Complete Challenge — award XP to all who met the target
// =============================================================================

export async function completeChallenge(challengeId: string): Promise<{
  success: boolean;
  winnerId?: string;
  completedCount: number;
}> {
  try {
    const { data: challenge } = await supabase
      .from('coach_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (!challenge) return { success: false, completedCount: 0 };

    // Mark challenge as completed
    await supabase
      .from('coach_challenges')
      .update({ status: 'completed' })
      .eq('id', challengeId);

    // Get all participants
    const { data: participants } = await supabase
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('current_value', { ascending: false });

    if (!participants || participants.length === 0) {
      return { success: true, completedCount: 0 };
    }

    const completedParticipants = participants.filter((p) => p.completed);
    const winnerId = participants[0]?.player_id;

    // Award XP to completed participants
    const xpEntries: Array<{
      player_id: string;
      organization_id: string;
      xp_amount: number;
      source_type: string;
      source_id: string;
      description: string;
    }> = completedParticipants.map((p) => ({
      player_id: p.player_id,
      organization_id: challenge.organization_id,
      xp_amount: challenge.xp_reward || XP_BY_SOURCE.challenge_completed,
      source_type: 'challenge',
      source_id: challengeId,
      description: `Completed challenge "${challenge.title}" (+${challenge.xp_reward} XP)`,
    }));

    // Bonus XP for individual challenge winner
    if (challenge.challenge_type === 'individual' && winnerId) {
      xpEntries.push({
        player_id: winnerId,
        organization_id: challenge.organization_id,
        xp_amount: XP_BY_SOURCE.challenge_won,
        source_type: 'challenge_won' as const,
        source_id: challengeId,
        description: `Won challenge "${challenge.title}" (+${XP_BY_SOURCE.challenge_won} XP bonus)`,
      });
    }

    if (xpEntries.length > 0) {
      await supabase.from('xp_ledger').insert(xpEntries);

      // Update total_xp and level for each participant
      const playerIds = [...new Set(xpEntries.map((e) => e.player_id))];
      for (const pid of playerIds) {
        const totalXpForPlayer = xpEntries
          .filter((e) => e.player_id === pid)
          .reduce((sum, e) => sum + e.xp_amount, 0);

        const { data: profile } = await supabase
          .from('profiles')
          .select('total_xp')
          .eq('id', pid)
          .single();

        const currentXP = profile?.total_xp || 0;
        const newXP = currentXP + totalXpForPlayer;
        const { level } = getLevelFromXP(newXP);

        await supabase
          .from('profiles')
          .update({ total_xp: newXP, player_level: level })
          .eq('id', pid);
      }
    }

    return {
      success: true,
      winnerId: challenge.challenge_type === 'individual' ? winnerId : undefined,
      completedCount: completedParticipants.length,
    };
  } catch (err) {
    if (__DEV__) console.error('[ChallengeService] completeChallenge error:', err);
    return { success: false, completedCount: 0 };
  }
}
