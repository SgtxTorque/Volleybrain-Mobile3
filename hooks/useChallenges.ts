// =============================================================================
// Challenge Hooks — React hooks wrapping challenge-service
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  fetchActiveChallenges,
  fetchChallengeDetail,
  type ChallengeWithParticipants,
} from '@/lib/challenge-service';
import type { CoachChallenge } from '@/lib/engagement-types';
import { supabase } from '@/lib/supabase';

// =============================================================================
// useTeamChallenges — all challenges for a team
// =============================================================================

export function useTeamChallenges(teamId: string | null) {
  const [active, setActive] = useState<ChallengeWithParticipants[]>([]);
  const [completed, setCompleted] = useState<CoachChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!teamId) { setLoading(false); return; }

    const [activeData, completedResult] = await Promise.all([
      fetchActiveChallenges(teamId),
      supabase
        .from('coach_challenges')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    setActive(activeData);
    setCompleted(completedResult.data || []);
    setLoading(false);
    setRefreshing(false);
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { active, completed, loading, refreshing, refresh, reload: load };
}

// =============================================================================
// useChallengeDetail — single challenge with leaderboard
// =============================================================================

export function useChallengeDetail(challengeId: string | null) {
  const [challenge, setChallenge] = useState<ChallengeWithParticipants | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!challengeId) { setLoading(false); return; }
    setLoading(true);
    const data = await fetchChallengeDetail(challengeId);
    setChallenge(data);
    setLoading(false);
  }, [challengeId]);

  useEffect(() => { load(); }, [load]);

  return { challenge, loading, reload: load };
}

// =============================================================================
// useCoachChallengeStats — stats for coach dashboard
// =============================================================================

export type CoachChallengeStats = {
  activeCount: number;
  totalJoined: number;
  needsVerification: number;
  completedCount: number;
};

export function useCoachChallengeStats(teamId: string | null) {
  const [stats, setStats] = useState<CoachChallengeStats>({
    activeCount: 0,
    totalJoined: 0,
    needsVerification: 0,
    completedCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!teamId) { setLoading(false); return; }

    // Active count
    const { count: activeCount } = await supabase
      .from('coach_challenges')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'active');

    // Completed count
    const { count: completedCount } = await supabase
      .from('coach_challenges')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'completed');

    // Get active challenge IDs for participant queries
    const { data: activeChallenges } = await supabase
      .from('coach_challenges')
      .select('id')
      .eq('team_id', teamId)
      .eq('status', 'active');

    const ids = (activeChallenges || []).map(c => c.id);
    let totalJoined = 0;
    let needsVerification = 0;

    if (ids.length > 0) {
      const { count: joined } = await supabase
        .from('challenge_participants')
        .select('*', { count: 'exact', head: true })
        .in('challenge_id', ids);
      totalJoined = joined || 0;

      // Needs verification: participants with current_value > 0 but not completed
      // and challenge metric_type is coach_verified
      const { data: verifiedChallenges } = await supabase
        .from('coach_challenges')
        .select('id')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .eq('metric_type', 'coach_verified');

      const verifyIds = (verifiedChallenges || []).map(c => c.id);
      if (verifyIds.length > 0) {
        const { count: pending } = await supabase
          .from('challenge_participants')
          .select('*', { count: 'exact', head: true })
          .in('challenge_id', verifyIds)
          .gt('current_value', 0)
          .eq('completed', false);
        needsVerification = pending || 0;
      }
    }

    setStats({
      activeCount: activeCount || 0,
      totalJoined,
      needsVerification,
      completedCount: completedCount || 0,
    });
    setLoading(false);
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  return { stats, loading, reload: load };
}

// =============================================================================
// usePendingVerifications — participants awaiting coach verification
// =============================================================================

export type PendingVerification = {
  participantId: string;
  challengeId: string;
  challengeTitle: string;
  playerId: string;
  playerName: string;
  playerAvatar: string | null;
  currentValue: number;
  targetValue: number;
  optedInAt: string;
};

export function usePendingVerifications(teamId: string | null) {
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!teamId) { setLoading(false); return; }

    // Get coach_verified active challenges
    const { data: challenges } = await supabase
      .from('coach_challenges')
      .select('id, title, target_value')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .eq('metric_type', 'coach_verified');

    if (!challenges || challenges.length === 0) {
      setPending([]);
      setLoading(false);
      return;
    }

    const ids = challenges.map(c => c.id);
    const challengeMap = new Map(challenges.map(c => [c.id, c]));

    // Get participants with progress but not completed
    const { data: participants } = await supabase
      .from('challenge_participants')
      .select('*')
      .in('challenge_id', ids)
      .gt('current_value', 0)
      .eq('completed', false);

    if (!participants || participants.length === 0) {
      setPending([]);
      setLoading(false);
      return;
    }

    // Get player names
    const playerIds = [...new Set(participants.map(p => p.player_id))];
    const profileMap: Record<string, { name: string; avatar: string | null }> = {};

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', playerIds);
    for (const p of profiles || []) {
      profileMap[p.id] = { name: p.full_name || 'Unknown', avatar: p.avatar_url };
    }

    const missingIds = playerIds.filter(id => !profileMap[id]);
    if (missingIds.length > 0) {
      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, photo_url')
        .in('id', missingIds);
      for (const p of players || []) {
        profileMap[p.id] = { name: `${p.first_name} ${p.last_name}`, avatar: p.photo_url };
      }
    }

    const items: PendingVerification[] = participants.map(p => {
      const challenge = challengeMap.get(p.challenge_id);
      const profile = profileMap[p.player_id];
      return {
        participantId: p.id,
        challengeId: p.challenge_id,
        challengeTitle: challenge?.title || 'Challenge',
        playerId: p.player_id,
        playerName: profile?.name || 'Unknown',
        playerAvatar: profile?.avatar || null,
        currentValue: p.current_value,
        targetValue: challenge?.target_value || 0,
        optedInAt: p.opted_in_at,
      };
    });

    setPending(items);
    setLoading(false);
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  return { pending, loading, reload: load };
}
