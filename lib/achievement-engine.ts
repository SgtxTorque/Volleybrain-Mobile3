// =============================================================================
// Achievement Engine — Auto-Unlock, Progress, Unseen Detection
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { AchievementFull, AchievementProgress, UnseenAchievement } from './achievement-types';

const LAST_SEEN_KEY = 'vb_achievement_last_seen_';

// =============================================================================
// 1. checkAndUnlockAchievements — called after game stats are saved
// =============================================================================

type CheckParams = {
  playerIds: string[];
  teamId: string;
  gameId: string;
  seasonId: string;
};

export async function checkAndUnlockAchievements(params: CheckParams): Promise<string[]> {
  const { playerIds, teamId, gameId, seasonId } = params;
  if (playerIds.length === 0) return [];

  try {
    // Batch fetch: all active achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true);
    if (!achievements || achievements.length === 0) return [];

    // Batch fetch: already-earned for these players
    const { data: alreadyEarned } = await supabase
      .from('player_achievements')
      .select('player_id, achievement_id')
      .in('player_id', playerIds);

    const earnedSet = new Set(
      (alreadyEarned || []).map((e) => `${e.player_id}:${e.achievement_id}`),
    );

    // Batch fetch: season stats for all players
    const { data: allStats } = await supabase
      .from('player_season_stats')
      .select('*')
      .in('player_id', playerIds)
      .eq('season_id', seasonId);

    const statsMap: Record<string, Record<string, number>> = {};
    for (const row of allStats || []) {
      const obj: Record<string, number> = {};
      for (const [key, val] of Object.entries(row)) {
        if (typeof val === 'number') obj[key] = val;
      }
      statsMap[row.player_id] = obj;
    }

    // Check each player × each achievement
    const newUnlocks: Array<{
      player_id: string;
      achievement_id: string;
      earned_at: string;
      game_id: string;
      team_id: string;
      season_id: string;
      stat_value_at_unlock: number;
    }> = [];

    const progressRows: Array<{
      player_id: string;
      achievement_id: string;
      current_value: number;
      target_value: number;
      last_updated_game_id: string;
      last_updated_at: string;
    }> = [];

    const now = new Date().toISOString();

    for (const playerId of playerIds) {
      const playerStats = statsMap[playerId] || {};

      for (const ach of achievements as AchievementFull[]) {
        if (!ach.stat_key || ach.threshold == null) continue;
        if (ach.requires_verification) continue;

        const currentVal = playerStats[ach.stat_key] ?? 0;

        // Always update progress
        progressRows.push({
          player_id: playerId,
          achievement_id: ach.id,
          current_value: currentVal,
          target_value: ach.threshold,
          last_updated_game_id: gameId,
          last_updated_at: now,
        });

        // Check for new unlock
        if (earnedSet.has(`${playerId}:${ach.id}`)) continue;
        if (currentVal >= ach.threshold) {
          newUnlocks.push({
            player_id: playerId,
            achievement_id: ach.id,
            earned_at: now,
            game_id: gameId,
            team_id: teamId,
            season_id: seasonId,
            stat_value_at_unlock: currentVal,
          });
        }
      }
    }

    // Batch upsert new unlocks
    if (newUnlocks.length > 0) {
      const { error } = await supabase
        .from('player_achievements')
        .upsert(newUnlocks, { onConflict: 'player_id,achievement_id', ignoreDuplicates: true });
      if (__DEV__ && error) console.error('Achievement unlock error:', error);
    }

    // Batch upsert progress
    if (progressRows.length > 0) {
      const { error } = await supabase
        .from('player_achievement_progress')
        .upsert(progressRows, { onConflict: 'player_id,achievement_id' });
      if (__DEV__ && error) console.error('Achievement progress error:', error);
    }

    return newUnlocks.map((u) => u.achievement_id);
  } catch (err) {
    if (__DEV__) console.error('checkAndUnlockAchievements error:', err);
    return [];
  }
}

// =============================================================================
// 2. getUnseenAchievements — detect achievements player hasn't seen celebrate
// =============================================================================

export async function getUnseenAchievements(playerId: string): Promise<UnseenAchievement[]> {
  try {
    const lastSeenStr = await AsyncStorage.getItem(LAST_SEEN_KEY + playerId);
    const lastSeen = lastSeenStr || '1970-01-01T00:00:00Z';

    const { data } = await supabase
      .from('player_achievements')
      .select('*, achievements(*)')
      .eq('player_id', playerId)
      .gt('earned_at', lastSeen)
      .order('earned_at', { ascending: true });

    if (!data || data.length === 0) return [];

    // Enrich with game context for "Earned vs Banks on Feb 24"
    const gameIds = [...new Set(data.filter((d) => d.game_id).map((d) => d.game_id as string))];
    const gameMap: Record<string, { opponent_name: string | null; event_date: string }> = {};

    if (gameIds.length > 0) {
      const { data: games } = await supabase
        .from('schedule_events')
        .select('id, opponent_name, event_date')
        .in('id', gameIds);
      if (games) {
        for (const g of games) {
          gameMap[g.id] = { opponent_name: g.opponent_name, event_date: g.event_date };
        }
      }
    }

    return data.map((d) => ({
      ...d,
      achievements: d.achievements as AchievementFull,
      gameName:
        d.game_id && gameMap[d.game_id]
          ? `vs ${gameMap[d.game_id].opponent_name || 'Opponent'}`
          : undefined,
      gameDate:
        d.game_id && gameMap[d.game_id]
          ? new Date(gameMap[d.game_id].event_date + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : undefined,
    })) as UnseenAchievement[];
  } catch (err) {
    if (__DEV__) console.error('getUnseenAchievements error:', err);
    return [];
  }
}

// =============================================================================
// 3. markAchievementsSeen — update the last-seen timestamp
// =============================================================================

export async function markAchievementsSeen(playerId: string): Promise<void> {
  await AsyncStorage.setItem(LAST_SEEN_KEY + playerId, new Date().toISOString());
}

// =============================================================================
// 4. getTrackedProgress — progress for tracked achievements
// =============================================================================

export async function getTrackedProgress(
  playerId: string,
  seasonStats: Record<string, number>,
): Promise<AchievementProgress[]> {
  try {
    const { data: tracked } = await supabase
      .from('player_tracked_achievements')
      .select('achievement_id, achievements(*)')
      .eq('player_id', playerId)
      .order('display_order');

    if (!tracked) return [];

    return tracked.map((t) => {
      const ach = t.achievements as unknown as AchievementFull;
      const target = ach.threshold ?? 1;
      const current = ach.stat_key ? (seasonStats[ach.stat_key] ?? 0) : 0;
      const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
      return {
        achievement_id: ach.id,
        current_value: current,
        target_value: target,
        pct,
        achievement: ach,
      };
    });
  } catch (err) {
    if (__DEV__) console.error('getTrackedProgress error:', err);
    return [];
  }
}
