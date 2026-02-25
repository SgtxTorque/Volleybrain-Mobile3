// =============================================================================
// Achievement Engine — Auto-Unlock, Progress, Unseen Detection, XP Awards
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getLevelFromXP } from './engagement-constants';
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
        // Skip non-stat types (community, attendance handled elsewhere)
        if (ach.type === 'attendance' || ach.type === 'shoutout_given' || ach.type === 'shoutout_received') continue;

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

      // Award XP for new unlocks
      const unlockedAchs = achievements.filter((a) =>
        newUnlocks.some((u) => u.achievement_id === a.id),
      ) as AchievementFull[];
      for (const unlock of newUnlocks) {
        const ach = unlockedAchs.find((a) => a.id === unlock.achievement_id);
        if (ach?.xp_reward) {
          awardAchievementXP(unlock.player_id, ach).catch(() => {});
        }
      }
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
// 1b. checkAllAchievements — comprehensive check for all types (on-demand)
// =============================================================================

type CheckAllResult = {
  newUnlocks: string[];
  allStats: Record<string, number>;
};

export async function checkAllAchievements(
  playerId: string,
  seasonId?: string,
  organizationId?: string,
): Promise<CheckAllResult> {
  try {
    // Fetch all active achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true);
    if (!achievements || achievements.length === 0) return { newUnlocks: [], allStats: {} };

    // Fetch already-earned
    const { data: alreadyEarned } = await supabase
      .from('player_achievements')
      .select('achievement_id')
      .eq('player_id', playerId);
    const earnedSet = new Set((alreadyEarned || []).map((e) => e.achievement_id));

    // Gather all stats
    const allStats = await gatherAllStats(playerId, seasonId);

    const now = new Date().toISOString();
    const newUnlocks: Array<{
      player_id: string;
      achievement_id: string;
      earned_at: string;
      stat_value_at_unlock: number;
      season_id?: string;
    }> = [];

    const progressRows: Array<{
      player_id: string;
      achievement_id: string;
      current_value: number;
      target_value: number;
      last_updated_at: string;
    }> = [];

    for (const ach of achievements as AchievementFull[]) {
      if (ach.threshold == null) continue;
      if (ach.requires_verification) continue;

      let currentVal = 0;

      if (ach.type === 'attendance') {
        // Attendance achievements use special counting
        currentVal = await getAttendanceValue(playerId, ach.threshold_type, seasonId);
      } else if (ach.stat_key) {
        // Stat-based, community, etc.
        currentVal = allStats[ach.stat_key] ?? 0;
      } else {
        continue;
      }

      // Update progress
      progressRows.push({
        player_id: playerId,
        achievement_id: ach.id,
        current_value: currentVal,
        target_value: ach.threshold,
        last_updated_at: now,
      });

      // Check for new unlock
      if (earnedSet.has(ach.id)) continue;
      if (currentVal >= ach.threshold) {
        newUnlocks.push({
          player_id: playerId,
          achievement_id: ach.id,
          earned_at: now,
          stat_value_at_unlock: currentVal,
          season_id: seasonId,
        });
      }
    }

    // Batch upsert new unlocks
    if (newUnlocks.length > 0) {
      const { error } = await supabase
        .from('player_achievements')
        .upsert(newUnlocks, { onConflict: 'player_id,achievement_id', ignoreDuplicates: true });
      if (__DEV__ && error) console.error('Achievement unlock error:', error);

      // Award XP for new unlocks
      for (const unlock of newUnlocks) {
        const ach = (achievements as AchievementFull[]).find((a) => a.id === unlock.achievement_id);
        if (ach?.xp_reward) {
          awardAchievementXP(playerId, ach).catch(() => {});
        }
      }
    }

    // Batch upsert progress
    if (progressRows.length > 0) {
      const { error } = await supabase
        .from('player_achievement_progress')
        .upsert(progressRows, { onConflict: 'player_id,achievement_id' });
      if (__DEV__ && error) console.error('Achievement progress error:', error);
    }

    return {
      newUnlocks: newUnlocks.map((u) => u.achievement_id),
      allStats,
    };
  } catch (err) {
    if (__DEV__) console.error('checkAllAchievements error:', err);
    return { newUnlocks: [], allStats: {} };
  }
}

// =============================================================================
// Helpers: Gather stats from all sources
// =============================================================================

async function gatherAllStats(playerId: string, seasonId?: string): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};

  // 1. Season stats from player_season_stats
  if (seasonId) {
    const { data } = await supabase
      .from('player_season_stats')
      .select('*')
      .eq('player_id', playerId)
      .eq('season_id', seasonId)
      .maybeSingle();
    if (data) {
      for (const [key, val] of Object.entries(data)) {
        if (typeof val === 'number') stats[key] = val;
      }
    }
  }

  // 2. Shoutout counts (lifetime)
  const [givenRes, receivedRes] = await Promise.all([
    supabase
      .from('shoutouts')
      .select('id', { count: 'exact', head: true })
      .eq('giver_id', playerId),
    supabase
      .from('shoutouts')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', playerId),
  ]);
  stats['shoutouts_given'] = givenRes.count || 0;
  stats['shoutouts_received'] = receivedRes.count || 0;

  return stats;
}

async function getAttendanceValue(
  playerId: string,
  thresholdType: string | null,
  seasonId?: string,
): Promise<number> {
  if (thresholdType === 'streak') {
    // Count current consecutive 'present' streak (most recent first)
    const { data } = await supabase
      .from('event_attendance')
      .select('status')
      .eq('player_id', playerId)
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (!data) return 0;
    let streak = 0;
    for (const row of data) {
      if (row.status === 'present') streak++;
      else break;
    }
    return streak;
  }

  if (thresholdType === 'season' && seasonId) {
    // Perfect attendance = 1 if no absences exist for events in this season
    const { data: seasonEvents } = await supabase
      .from('schedule_events')
      .select('id')
      .eq('season_id', seasonId);

    if (!seasonEvents || seasonEvents.length === 0) return 0;

    const eventIds = seasonEvents.map((e) => e.id);
    const { data: attendance } = await supabase
      .from('event_attendance')
      .select('event_id, status')
      .eq('player_id', playerId)
      .in('event_id', eventIds);

    if (!attendance) return 0;
    const attendedCount = attendance.filter((a) => a.status === 'present').length;
    // Return 1 if all events attended, 0 otherwise
    return attendedCount >= seasonEvents.length ? 1 : 0;
  }

  // Fallback: total attended
  const { count } = await supabase
    .from('event_attendance')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .eq('status', 'present');
  return count || 0;
}

// =============================================================================
// Award XP when achievement is unlocked
// =============================================================================

async function awardAchievementXP(playerId: string, achievement: AchievementFull): Promise<void> {
  const xp = achievement.xp_reward;
  if (!xp || xp <= 0) return;

  // Insert XP ledger entry
  await supabase.from('xp_ledger').insert({
    player_id: playerId,
    organization_id: null,
    xp_amount: xp,
    source_type: 'achievement',
    source_id: achievement.id,
    description: `Unlocked "${achievement.name}" (+${xp} XP)`,
  });

  // Update profile total_xp and level
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', playerId)
    .single();

  const currentXP = profile?.total_xp || 0;
  const newXP = currentXP + xp;
  const { level } = getLevelFromXP(newXP);

  await supabase
    .from('profiles')
    .update({ total_xp: newXP, player_level: level })
    .eq('id', playerId);
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
  allStats: Record<string, number>,
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
      const current = ach.stat_key ? (allStats[ach.stat_key] ?? 0) : 0;
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

// =============================================================================
// 5. fetchPlayerXP — get current XP and level for a player
// =============================================================================

export async function fetchPlayerXP(
  playerId: string,
): Promise<{ totalXp: number; level: number; progress: number; nextLevelXp: number }> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('total_xp, player_level')
      .eq('id', playerId)
      .single();

    const totalXp = data?.total_xp || 0;
    const levelInfo = getLevelFromXP(totalXp);
    return {
      totalXp,
      level: levelInfo.level,
      progress: levelInfo.progress,
      nextLevelXp: levelInfo.nextLevelXp,
    };
  } catch {
    return { totalXp: 0, level: 1, progress: 0, nextLevelXp: 100 };
  }
}
