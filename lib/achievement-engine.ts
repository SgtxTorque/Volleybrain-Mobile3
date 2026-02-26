// =============================================================================
// Achievement Engine — Auto-Unlock, Progress, Unseen Detection, XP Awards
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getLevelFromXP } from './engagement-constants';
import type { AchievementFull, AchievementProgress, UnseenAchievement } from './achievement-types';

const LAST_SEEN_KEY = 'vb_achievement_last_seen_';

/** Map simplified role names to user_roles.role values */
const ROLE_DB_MAP: Record<string, string[]> = {
  coach: ['head_coach', 'assistant_coach'],
  parent: ['parent'],
  admin: ['league_admin'],
  player: ['player'],
};

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

  // Resolve to profiles.id for XP update (playerId may be players.id)
  const profileId = await resolveProfileIdFromPlayer(playerId);
  if (!profileId) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', profileId)
    .single();

  const currentXP = profile?.total_xp || 0;
  const newXP = currentXP + xp;
  const { level } = getLevelFromXP(newXP);

  await supabase
    .from('profiles')
    .update({ total_xp: newXP, player_level: level })
    .eq('id', profileId);
}

/** Resolve a players.id to its linked profiles.id (via parent_account_id). */
async function resolveProfileIdFromPlayer(playerId: string): Promise<string | null> {
  // Check if it's already a profiles.id
  const { data: direct } = await supabase.from('profiles').select('id').eq('id', playerId).maybeSingle();
  if (direct) return direct.id;
  // Look up linked profile via players.parent_account_id
  const { data: player } = await supabase.from('players').select('parent_account_id').eq('id', playerId).maybeSingle();
  return player?.parent_account_id || null;
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
    // playerId may be a players.id — resolve to profiles.id for XP lookup
    const profileId = await resolveProfileIdFromPlayer(playerId);
    if (!profileId) return { totalXp: 0, level: 1, progress: 0, nextLevelXp: 100 };

    const { data } = await supabase
      .from('profiles')
      .select('total_xp, player_level')
      .eq('id', profileId)
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

// =============================================================================
// 6. fetchUserXP — get current XP and level for any user (profiles.id directly)
// =============================================================================

export async function fetchUserXP(
  userId: string,
): Promise<{ totalXp: number; level: number; progress: number; nextLevelXp: number }> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('total_xp, player_level')
      .eq('id', userId)
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

// =============================================================================
// 7. checkRoleAchievements — multi-role achievement check (coach/parent/admin)
// =============================================================================

type RoleCheckResult = {
  newUnlocks: string[];
  allStats: Record<string, number>;
};

export async function checkRoleAchievements(
  userId: string,
  userRole: 'coach' | 'parent' | 'admin',
  seasonId?: string,
): Promise<RoleCheckResult> {
  try {
    // Fetch achievements for this role + shared 'all' achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .in('target_role', [userRole, 'all']);
    if (!achievements || achievements.length === 0) return { newUnlocks: [], allStats: {} };

    // Fetch already-earned from user_achievements
    const { data: alreadyEarned } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);
    const earnedSet = new Set((alreadyEarned || []).map((e) => e.achievement_id));

    // Gather role-specific stats
    let allStats: Record<string, number> = {};
    if (userRole === 'coach') {
      allStats = await gatherCoachStats(userId, seasonId);
    } else if (userRole === 'parent') {
      allStats = await gatherParentStats(userId, seasonId);
    } else if (userRole === 'admin') {
      allStats = await gatherAdminStats(userId, seasonId);
    }

    // Also gather shoutout counts (shared 'all' achievements)
    const [givenRes, receivedRes] = await Promise.all([
      supabase.from('shoutouts').select('id', { count: 'exact', head: true }).eq('giver_id', userId),
      supabase.from('shoutouts').select('id', { count: 'exact', head: true }).eq('receiver_id', userId),
    ]);
    allStats['shoutouts_given'] = givenRes.count || 0;
    allStats['shoutouts_received'] = receivedRes.count || 0;

    const now = new Date().toISOString();
    const newUnlocks: Array<{
      user_id: string;
      achievement_id: string;
      earned_at: string;
      stat_value_at_unlock: number;
      season_id?: string;
    }> = [];

    for (const ach of achievements as AchievementFull[]) {
      if (ach.threshold == null) continue;
      if (ach.requires_verification) continue;
      if (!ach.stat_key) continue;

      const currentVal = allStats[ach.stat_key] ?? 0;

      // Check for new unlock
      if (earnedSet.has(ach.id)) continue;
      if (currentVal >= ach.threshold) {
        newUnlocks.push({
          user_id: userId,
          achievement_id: ach.id,
          earned_at: now,
          stat_value_at_unlock: currentVal,
          season_id: seasonId,
        });
      }
    }

    // Batch insert new unlocks into user_achievements
    if (newUnlocks.length > 0) {
      const { error } = await supabase
        .from('user_achievements')
        .upsert(newUnlocks, { onConflict: 'user_id,achievement_id', ignoreDuplicates: true });
      if (__DEV__ && error) console.error('Role achievement unlock error:', error);

      // Award XP for new unlocks
      for (const unlock of newUnlocks) {
        const ach = (achievements as AchievementFull[]).find((a) => a.id === unlock.achievement_id);
        if (ach?.xp_reward) {
          await awardRoleXP(userId, ach);
        }
      }
    }

    return {
      newUnlocks: newUnlocks.map((u) => u.achievement_id),
      allStats,
    };
  } catch (err) {
    if (__DEV__) console.error('checkRoleAchievements error:', err);
    return { newUnlocks: [], allStats: {} };
  }
}

// =============================================================================
// 8. Role-Specific Stat Resolvers
// =============================================================================

/** Get team IDs for a coach */
async function getCoachTeamIds(userId: string, seasonId?: string): Promise<string[]> {
  let query = supabase
    .from('team_staff')
    .select('team_id')
    .eq('user_id', userId)
    .eq('is_active', true);
  // If seasonId, filter teams by season
  const { data } = await query;
  if (!data || data.length === 0) return [];
  const teamIds = data.map((d) => d.team_id as string);

  if (seasonId) {
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .in('id', teamIds)
      .eq('season_id', seasonId);
    return teams ? teams.map((t) => t.id) : [];
  }
  return teamIds;
}

/** Get all team IDs for a coach across all seasons (career) */
async function getCoachAllTeamIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('team_staff')
    .select('team_id')
    .eq('user_id', userId)
    .eq('is_active', true);
  return data ? data.map((d) => d.team_id as string) : [];
}

/** Get parent's children player IDs */
async function getParentChildIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('players')
    .select('id')
    .eq('parent_account_id', userId);
  return data ? data.map((d) => d.id) : [];
}

/** Get admin's organization IDs */
async function getAdminOrgIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_roles')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('role', 'league_admin')
    .eq('is_active', true);
  return data ? data.map((d) => d.organization_id as string) : [];
}

// ---- COACH STATS ----

async function gatherCoachStats(userId: string, seasonId?: string): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};

  const [seasonTeamIds, allTeamIds] = await Promise.all([
    seasonId ? getCoachTeamIds(userId, seasonId) : getCoachTeamIds(userId),
    getCoachAllTeamIds(userId),
  ]);

  // teams_coached
  stats['teams_coached'] = allTeamIds.length;

  if (allTeamIds.length === 0) return stats;

  // roster_assignments — total players across all current teams
  const { count: rosterCount } = await supabase
    .from('team_players')
    .select('id', { count: 'exact', head: true })
    .in('team_id', allTeamIds);
  stats['roster_assignments'] = rosterCount || 0;

  // roster_size — max players on any single team
  const { data: rosterData } = await supabase
    .from('team_players')
    .select('team_id')
    .in('team_id', allTeamIds);
  if (rosterData) {
    const teamCounts: Record<string, number> = {};
    for (const r of rosterData) {
      teamCounts[r.team_id] = (teamCounts[r.team_id] || 0) + 1;
    }
    stats['roster_size'] = Math.max(0, ...Object.values(teamCounts));
  }

  const activeTeamIds = seasonTeamIds.length > 0 ? seasonTeamIds : allTeamIds;

  // games_completed (season)
  if (activeTeamIds.length > 0) {
    const { count: gamesCount } = await supabase
      .from('schedule_events')
      .select('id', { count: 'exact', head: true })
      .in('team_id', activeTeamIds)
      .eq('event_type', 'game')
      .not('game_status', 'is', null)
      .in('game_status', ['completed', 'final']);
    stats['games_completed'] = gamesCount || 0;
  }

  // career_games (all teams, all seasons)
  if (allTeamIds.length > 0) {
    const { count: careerCount } = await supabase
      .from('schedule_events')
      .select('id', { count: 'exact', head: true })
      .in('team_id', allTeamIds)
      .eq('event_type', 'game')
      .not('game_status', 'is', null)
      .in('game_status', ['completed', 'final']);
    stats['career_games'] = careerCount || 0;
  }

  // win_streak + season_win_pct
  if (activeTeamIds.length > 0) {
    const { data: gameResults } = await supabase
      .from('schedule_events')
      .select('game_result, event_date')
      .in('team_id', activeTeamIds)
      .eq('event_type', 'game')
      .not('game_result', 'is', null)
      .order('event_date', { ascending: false });

    if (gameResults && gameResults.length > 0) {
      // Win streak (consecutive from most recent)
      let streak = 0;
      for (const g of gameResults) {
        if (g.game_result === 'win') streak++;
        else break;
      }
      stats['win_streak'] = streak;

      // Win percentage
      const wins = gameResults.filter((g) => g.game_result === 'win').length;
      stats['season_win_pct'] = gameResults.length > 0 ? Math.round((wins / gameResults.length) * 100) : 0;
    }
  }

  // games_with_stats
  if (activeTeamIds.length > 0) {
    const { count: statsCount } = await supabase
      .from('schedule_events')
      .select('id', { count: 'exact', head: true })
      .in('team_id', activeTeamIds)
      .eq('stats_entered', true);
    stats['games_with_stats'] = statsCount || 0;
  }

  // badges_awarded — player achievements for players on coach's teams
  if (allTeamIds.length > 0) {
    const { data: teamPlayers } = await supabase
      .from('team_players')
      .select('player_id')
      .in('team_id', allTeamIds);
    if (teamPlayers && teamPlayers.length > 0) {
      const playerIds = [...new Set(teamPlayers.map((tp) => tp.player_id as string))];
      const { count: badgeCount } = await supabase
        .from('player_achievements')
        .select('id', { count: 'exact', head: true })
        .in('player_id', playerIds);
      stats['badges_awarded'] = badgeCount || 0;

      // players_leveled_up — players with level > 1
      const { count: leveledCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .in('id', playerIds)
        .gt('player_level', 1);
      stats['players_leveled_up'] = leveledCount || 0;
    }
  }

  // challenges_created
  const { count: challengeCount } = await supabase
    .from('coach_challenges')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', userId);
  stats['challenges_created'] = challengeCount || 0;

  // full_participation_challenges — challenges where all team players opted in
  const { data: challenges } = await supabase
    .from('coach_challenges')
    .select('id, team_id')
    .eq('coach_id', userId);
  if (challenges && challenges.length > 0) {
    let fullPart = 0;
    for (const ch of challenges) {
      const [{ count: partCount }, { count: teamSize }] = await Promise.all([
        supabase.from('challenge_participants').select('id', { count: 'exact', head: true }).eq('challenge_id', ch.id),
        supabase.from('team_players').select('id', { count: 'exact', head: true }).eq('team_id', ch.team_id),
      ]);
      if (teamSize && teamSize > 0 && partCount && partCount >= teamSize) {
        fullPart++;
      }
    }
    stats['full_participation_challenges'] = fullPart;
  }

  return stats;
}

// ---- PARENT STATS ----

async function gatherParentStats(userId: string, seasonId?: string): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};

  const childIds = await getParentChildIds(userId);

  // rsvps_going (parent responded_by)
  const { count: rsvpCount } = await supabase
    .from('event_rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('responded_by', userId)
    .eq('status', 'going');
  stats['rsvps_going'] = rsvpCount || 0;

  // season_rsvp_pct — percentage of season game events RSVPed going
  if (seasonId && childIds.length > 0) {
    const { data: seasonGames } = await supabase
      .from('schedule_events')
      .select('id')
      .eq('season_id', seasonId)
      .eq('event_type', 'game');

    if (seasonGames && seasonGames.length > 0) {
      const eventIds = seasonGames.map((e) => e.id);
      const { count: goingCount } = await supabase
        .from('event_rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('responded_by', userId)
        .eq('status', 'going')
        .in('event_id', eventIds);
      stats['season_rsvp_pct'] = Math.round(((goingCount || 0) / seasonGames.length) * 100);
    }
  }

  // early_rsvps — RSVPs within 1 hour of event creation (simplified: check responded_at vs event created_at)
  if (childIds.length > 0) {
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('event_id, responded_at')
      .eq('responded_by', userId)
      .eq('status', 'going');

    if (rsvps && rsvps.length > 0) {
      const eventIds = rsvps.map((r) => r.event_id as string);
      const { data: events } = await supabase
        .from('schedule_events')
        .select('id, created_at')
        .in('id', eventIds);

      if (events) {
        const eventCreatedMap: Record<string, string> = {};
        for (const e of events) eventCreatedMap[e.id] = e.created_at;

        let earlyCount = 0;
        for (const r of rsvps) {
          const created = eventCreatedMap[r.event_id];
          if (created && r.responded_at) {
            const diff = new Date(r.responded_at).getTime() - new Date(created).getTime();
            if (diff <= 3600000) earlyCount++; // 1 hour in ms
          }
        }
        stats['early_rsvps'] = earlyCount;
      }
    }
  }

  // volunteer_signups
  const { count: volCount } = await supabase
    .from('event_volunteers')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', userId);
  stats['volunteer_signups'] = volCount || 0;

  // on_time_payments — payments made before due_date for parent's children
  if (childIds.length > 0) {
    const { data: paidPayments } = await supabase
      .from('payments')
      .select('paid_date, due_date')
      .in('player_id', childIds)
      .eq('paid', true)
      .not('due_date', 'is', null);

    if (paidPayments) {
      stats['on_time_payments'] = paidPayments.filter(
        (p) => p.paid_date && p.due_date && new Date(p.paid_date) <= new Date(p.due_date),
      ).length;
    }

    // full_payments — look for lump-sum payments (fee_type or fee_category heuristic)
    const { count: fullPay } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .in('player_id', childIds)
      .eq('paid', true)
      .eq('fee_type', 'registration');
    stats['full_payments'] = fullPay || 0;

    // seasons_current — seasons where no overdue balance exists
    if (seasonId) {
      const { data: overdue } = await supabase
        .from('payments')
        .select('id')
        .in('player_id', childIds)
        .eq('season_id', seasonId)
        .eq('paid', false)
        .not('due_date', 'is', null)
        .lt('due_date', new Date().toISOString().split('T')[0])
        .limit(1);
      stats['seasons_current'] = (!overdue || overdue.length === 0) ? 1 : 0;
    }
  }

  // post_reactions
  const { count: reactCount } = await supabase
    .from('team_post_reactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  stats['post_reactions'] = reactCount || 0;

  // posts_created
  const { count: postCount } = await supabase
    .from('team_posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId);
  stats['posts_created'] = postCount || 0;

  // photos_uploaded — count posts with media_urls (no dedicated gallery table)
  const { data: mediaPosts } = await supabase
    .from('team_posts')
    .select('media_urls')
    .eq('author_id', userId)
    .not('media_urls', 'is', null);
  if (mediaPosts) {
    let photoCount = 0;
    for (const p of mediaPosts) {
      if (Array.isArray(p.media_urls)) photoCount += p.media_urls.length;
    }
    stats['photos_uploaded'] = photoCount;
  }

  // children_teams — distinct teams across all children
  if (childIds.length > 0) {
    const { data: teamData } = await supabase
      .from('team_players')
      .select('team_id')
      .in('player_id', childIds);
    if (teamData) {
      const uniqueTeams = new Set(teamData.map((t) => t.team_id));
      stats['children_teams'] = uniqueTeams.size;
    }
  }

  return stats;
}

// ---- ADMIN STATS ----

async function gatherAdminStats(userId: string, seasonId?: string): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};

  const orgIds = await getAdminOrgIds(userId);
  if (orgIds.length === 0) return stats;

  // seasons_created
  const { count: seasonsCount } = await supabase
    .from('seasons')
    .select('id', { count: 'exact', head: true })
    .in('organization_id', orgIds);
  stats['seasons_created'] = seasonsCount || 0;

  // seasons_completed
  const { count: completedSeasons } = await supabase
    .from('seasons')
    .select('id', { count: 'exact', head: true })
    .in('organization_id', orgIds)
    .eq('status', 'completed');
  stats['seasons_completed'] = completedSeasons || 0;

  // total_players — count registrations with status 'approved' or 'rostered'
  const { count: playerCount } = await supabase
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .in('season_id', await getOrgSeasonIds(orgIds))
    .in('status', ['approved', 'rostered', 'paid']);
  stats['total_players'] = playerCount || 0;

  // teams_created
  const seasonIds = await getOrgSeasonIds(orgIds);
  if (seasonIds.length > 0) {
    const { count: teamCount } = await supabase
      .from('teams')
      .select('id', { count: 'exact', head: true })
      .in('season_id', seasonIds);
    stats['teams_created'] = teamCount || 0;
  }

  // season_revenue (current season)
  if (seasonId) {
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('season_id', seasonId)
      .eq('paid', true);
    if (payments) {
      stats['season_revenue'] = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    }
  }

  // blasts_sent
  const { count: blastCount } = await supabase
    .from('announcements')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId);
  stats['blasts_sent'] = blastCount || 0;

  // registrations_processed
  const { count: regCount } = await supabase
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('reviewed_by', userId)
    .in('status', ['approved', 'rostered', 'paid']);
  stats['registrations_processed'] = regCount || 0;

  return stats;
}

/** Helper: get all season IDs for a set of organizations */
async function getOrgSeasonIds(orgIds: string[]): Promise<string[]> {
  if (orgIds.length === 0) return [];
  const { data } = await supabase
    .from('seasons')
    .select('id')
    .in('organization_id', orgIds);
  return data ? data.map((s) => s.id) : [];
}

// =============================================================================
// 9. Award XP for role achievements (coaches/parents/admins)
// =============================================================================

async function awardRoleXP(userId: string, achievement: AchievementFull): Promise<void> {
  const xp = achievement.xp_reward;
  if (!xp || xp <= 0) return;

  // Insert XP ledger entry
  await supabase.from('xp_ledger').insert({
    player_id: userId,
    organization_id: null,
    xp_amount: xp,
    source_type: 'achievement',
    source_id: achievement.id,
    description: `Unlocked "${achievement.name}" (+${xp} XP)`,
  });

  // Update profile XP directly (userId IS profiles.id for non-player roles)
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', userId)
    .single();

  const currentXP = profile?.total_xp || 0;
  const newXP = currentXP + xp;
  const { level } = getLevelFromXP(newXP);

  await supabase
    .from('profiles')
    .update({ total_xp: newXP, player_level: level })
    .eq('id', userId);
}

// =============================================================================
// 10. getUnseenRoleAchievements — detect unlocked but not-yet-celebrated
// =============================================================================

export async function getUnseenRoleAchievements(userId: string): Promise<UnseenAchievement[]> {
  try {
    const lastSeenStr = await AsyncStorage.getItem(LAST_SEEN_KEY + userId);
    const lastSeen = lastSeenStr || '1970-01-01T00:00:00Z';

    const { data } = await supabase
      .from('user_achievements')
      .select('*, achievements(*)')
      .eq('user_id', userId)
      .gt('earned_at', lastSeen)
      .order('earned_at', { ascending: true });

    if (!data || data.length === 0) return [];

    return data.map((d) => ({
      id: d.id,
      player_id: d.user_id,
      achievement_id: d.achievement_id,
      earned_at: d.earned_at,
      game_id: null,
      team_id: null,
      season_id: d.season_id,
      stat_value_at_unlock: d.stat_value_at_unlock,
      verified_by: null,
      verified_at: null,
      achievements: d.achievements as AchievementFull,
    })) as UnseenAchievement[];
  } catch (err) {
    if (__DEV__) console.error('getUnseenRoleAchievements error:', err);
    return [];
  }
}

// =============================================================================
// 11. getRoleAchievements — fetch all achievements for a role with earned status
// =============================================================================

export type RoleAchievementWithStatus = AchievementFull & {
  earned: boolean;
  earned_at: string | null;
};

export async function getRoleAchievements(
  userId: string,
  userRole: 'coach' | 'parent' | 'admin',
): Promise<RoleAchievementWithStatus[]> {
  try {
    const [{ data: achievements }, { data: earned }] = await Promise.all([
      supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .in('target_role', [userRole, 'all'])
        .order('display_order'),
      supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', userId),
    ]);

    if (!achievements) return [];
    const earnedMap: Record<string, string> = {};
    for (const e of earned || []) {
      earnedMap[e.achievement_id] = e.earned_at;
    }

    return (achievements as AchievementFull[]).map((a) => ({
      ...a,
      earned: !!earnedMap[a.id],
      earned_at: earnedMap[a.id] || null,
    }));
  } catch (err) {
    if (__DEV__) console.error('getRoleAchievements error:', err);
    return [];
  }
}
