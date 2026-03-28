/**
 * useSeasonRank — Hook for UI consumption of season rank data
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { onRefresh } from '@/lib/refresh-bus';
import { getSeasonRankFromScore, SEASON_RANK_TIERS } from '@/lib/engagement-constants';

export type SeasonRankInfo = {
  rankTier: string;
  rankLabel: string;
  rankColor: string;
  rankBgColor: string;
  xpMultiplier: number;
  seasonXp: number;
  badgesEarned: number;
  activityScore: number;
  seasonScore: number;
  // Progress to next rank
  nextRankLabel: string | null;
  nextRankScore: number | null;
  progressToNextRank: number; // 0-100
};

export function useSeasonRank(profileId: string | null, seasonId: string | null) {
  const [rankInfo, setRankInfo] = useState<SeasonRankInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRank = useCallback(async () => {
    if (!profileId || !seasonId) {
      setRankInfo(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('season_ranks')
        .select('*')
        .eq('player_id', profileId)
        .eq('season_id', seasonId)
        .maybeSingle();

      if (!data) {
        // No rank data yet — unranked
        const unranked = SEASON_RANK_TIERS[0];
        const nextTier = SEASON_RANK_TIERS[1];
        setRankInfo({
          rankTier: 'unranked',
          rankLabel: 'Unranked',
          rankColor: unranked.color,
          rankBgColor: unranked.bgColor,
          xpMultiplier: 1.0,
          seasonXp: 0,
          badgesEarned: 0,
          activityScore: 0,
          seasonScore: 0,
          nextRankLabel: nextTier.label,
          nextRankScore: nextTier.scoreMin,
          progressToNextRank: 0,
        });
      } else {
        const currentTier = getSeasonRankFromScore(data.season_score || 0);
        const currentTierIndex = SEASON_RANK_TIERS.findIndex(t => t.rank === currentTier.rank);
        const nextTier = currentTierIndex < SEASON_RANK_TIERS.length - 1
          ? SEASON_RANK_TIERS[currentTierIndex + 1]
          : null;

        // Calculate progress to next rank
        let progressToNext = 100;
        if (nextTier) {
          const scoreIntoTier = (data.season_score || 0) - currentTier.scoreMin;
          const scoreNeeded = nextTier.scoreMin - currentTier.scoreMin;
          progressToNext = scoreNeeded > 0
            ? Math.min(Math.round((scoreIntoTier / scoreNeeded) * 100), 100)
            : 100;
        }

        setRankInfo({
          rankTier: currentTier.rank,
          rankLabel: currentTier.label,
          rankColor: currentTier.color,
          rankBgColor: currentTier.bgColor,
          xpMultiplier: currentTier.multiplier,
          seasonXp: data.season_xp || 0,
          badgesEarned: data.badges_earned || 0,
          activityScore: data.activity_score || 0,
          seasonScore: data.season_score || 0,
          nextRankLabel: nextTier?.label || null,
          nextRankScore: nextTier?.scoreMin || null,
          progressToNextRank: progressToNext,
        });
      }
    } catch (e) {
      if (__DEV__) console.warn('[useSeasonRank] Fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [profileId, seasonId]);

  useEffect(() => {
    fetchRank();
  }, [fetchRank]);

  // Listen for refresh events (XP award, badge earned, etc.)
  // NOTE: spec used 'xp_awarded' but RefreshEvent type only has 'xp'
  useEffect(() => {
    const unsub = onRefresh('xp', fetchRank);
    return unsub;
  }, [fetchRank]);

  return { rankInfo, loading, refreshRank: fetchRank };
}
