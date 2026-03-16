import { useState, useEffect, useCallback } from 'react';
import {
  getOrCreateWeeklyStandings,
  processWeeklyLeaderboardReset,
  LeaderboardEntry,
  LeagueTier,
} from '@/lib/leaderboard-engine';
import { supabase } from '@/lib/supabase';

export function useLeaderboard(teamId: string | null) {
  const [standings, setStandings] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [myTier, setMyTier] = useState<LeagueTier>('Bronze');
  const [teamSize, setTeamSize] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Process weekly reset if needed (handles promotion/demotion from last week)
      await processWeeklyLeaderboardReset(teamId);

      const result = await getOrCreateWeeklyStandings(user.id, teamId);
      setStandings(result.standings);
      setMyRank(result.myRank);
      setMyTier(result.myTier);
      setTeamSize(result.teamSize);
    } catch (err) {
      if (__DEV__) console.error('[useLeaderboard] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return { standings, myRank, myTier, teamSize, loading, refreshLeaderboard: loadLeaderboard };
}
