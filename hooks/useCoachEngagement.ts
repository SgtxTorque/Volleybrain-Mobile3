import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlayerEngagementData {
  profileId: string;
  playerId: string;
  playerName: string;
  // XP
  totalXp: number;
  weeklyXp: number;
  level: number;
  tier: string;
  // Streak
  currentStreak: number;
  longestStreak: number;
  // Quests
  dailyQuestsCompletedToday: number;
  dailyQuestsTotalToday: number;
  weeklyQuestsCompletedThisWeek: number;
  weeklyQuestsTotalThisWeek: number;
  // Journey
  journeyNodesCompleted: number;
  journeyNodesTotal: number;
  currentChapter: string | null;
  // Activity
  lastActiveDate: string | null;
  daysSinceActive: number;
  isInactive: boolean; // 3+ days without activity
}

export interface TeamEngagementSummary {
  totalPlayers: number;
  activePlayers: number;        // active in last 3 days
  activePercent: number;
  avgWeeklyXp: number;
  avgStreak: number;
  longestTeamStreak: number;
  longestStreakPlayerName: string;
  questCompletionRate: number;  // % of daily quests completed today across team
  inactivePlayers: PlayerEngagementData[];  // 3+ days without activity
  topEngaged: PlayerEngagementData[];       // top 3 by weekly XP
}

export function useCoachEngagement(teamId: string | null) {
  const [players, setPlayers] = useState<PlayerEngagementData[]>([]);
  const [summary, setSummary] = useState<TeamEngagementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'weeklyXp' | 'currentStreak' | 'journeyNodesCompleted' | 'daysSinceActive'>('weeklyXp');
  const [sortAsc, setSortAsc] = useState(false);

  const loadEngagement = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);

      // Step 1: Get all players on this team
      const { data: teamPlayers } = await supabase
        .from('team_players')
        .select('player_id, players!inner(id, first_name, last_name, parent_account_id)')
        .eq('team_id', teamId);

      if (!teamPlayers || teamPlayers.length === 0) {
        setPlayers([]);
        setSummary(null);
        return;
      }

      const today = localToday();
      const mondayStr = localMondayOfWeek();

      // Build profile ID list
      const playerEntries = teamPlayers.map((tp: any) => ({
        playerId: tp.players.id,
        profileId: tp.players.parent_account_id,
        playerName: `${tp.players.first_name || ''} ${tp.players.last_name || ''}`.trim() || 'Player',
      })).filter((p: any) => p.profileId);

      const profileIds = playerEntries.map((p: any) => p.profileId);

      if (profileIds.length === 0) {
        setPlayers([]);
        setSummary(null);
        return;
      }

      // Step 2: Batch fetch all engagement data

      // Profiles (XP, level)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, total_xp, player_level')
        .in('id', profileIds);

      const profileMap = Object.fromEntries(
        (profiles || []).map((p: any) => [p.id, p])
      );

      // Streak data
      const { data: streaks } = await supabase
        .from('streak_data')
        .select('player_id, current_streak, longest_streak, last_active_date')
        .in('player_id', profileIds);

      const streakMap = Object.fromEntries(
        (streaks || []).map((s: any) => [s.player_id, s])
      );

      // Weekly XP + tier from league_standings
      const { data: standings } = await supabase
        .from('league_standings')
        .select('player_id, weekly_xp, league_tier')
        .eq('team_id', teamId)
        .eq('week_start', mondayStr);

      const weeklyXpMap = Object.fromEntries(
        (standings || []).map((s: any) => [s.player_id, { xp: s.weekly_xp || 0, tier: s.league_tier || 'Bronze' }])
      );

      // Daily quests today
      const { data: dailyQuests } = await supabase
        .from('daily_quests')
        .select('player_id, is_completed')
        .in('player_id', profileIds)
        .eq('quest_date', today);

      const dailyQuestMap: Record<string, { completed: number; total: number }> = {};
      (dailyQuests || []).forEach((q: any) => {
        if (!dailyQuestMap[q.player_id]) {
          dailyQuestMap[q.player_id] = { completed: 0, total: 0 };
        }
        dailyQuestMap[q.player_id].total++;
        if (q.is_completed) dailyQuestMap[q.player_id].completed++;
      });

      // Weekly quests
      const { data: weeklyQuests } = await supabase
        .from('weekly_quests')
        .select('player_id, is_completed')
        .in('player_id', profileIds)
        .eq('week_start', mondayStr);

      const weeklyQuestMap: Record<string, { completed: number; total: number }> = {};
      (weeklyQuests || []).forEach((q: any) => {
        if (!weeklyQuestMap[q.player_id]) {
          weeklyQuestMap[q.player_id] = { completed: 0, total: 0 };
        }
        weeklyQuestMap[q.player_id].total++;
        if (q.is_completed) weeklyQuestMap[q.player_id].completed++;
      });

      // Journey progress
      const { data: journeyProgress } = await supabase
        .from('journey_progress')
        .select('player_id, status')
        .in('player_id', profileIds);

      const journeyMap: Record<string, { completed: number; total: number }> = {};
      (journeyProgress || []).forEach((jp: any) => {
        if (!journeyMap[jp.player_id]) {
          journeyMap[jp.player_id] = { completed: 0, total: 0 };
        }
        journeyMap[jp.player_id].total++;
        if (jp.status === 'completed') journeyMap[jp.player_id].completed++;
      });

      // Total journey nodes (same for everyone)
      const { count: totalNodes } = await supabase
        .from('journey_nodes')
        .select('id', { count: 'exact', head: true });

      // Chapter list for determining current chapter
      const { data: chapters } = await supabase
        .from('journey_chapters')
        .select('id, title, chapter_number')
        .eq('sport', 'volleyball')
        .order('chapter_number', { ascending: true });

      // Step 3: Assemble per-player data
      const assembledPlayers: PlayerEngagementData[] = playerEntries.map((entry: any) => {
        const pid = entry.profileId;
        const profile = profileMap[pid] || {};
        const streak = streakMap[pid] || {};
        const daily = dailyQuestMap[pid] || { completed: 0, total: 0 };
        const weekly = weeklyQuestMap[pid] || { completed: 0, total: 0 };
        const journey = journeyMap[pid] || { completed: 0, total: 0 };
        const standingData = weeklyXpMap[pid] || { xp: 0, tier: 'Bronze' };

        const lastActive = streak.last_active_date || null;
        const daysSince = lastActive ? daysBetween(lastActive, today) : 999;

        // Determine current chapter
        let currentChapter: string | null = null;
        if (chapters && chapters.length > 0) {
          const completedNodeCount = journey.completed;
          let nodesAccumulated = 0;
          for (const ch of chapters) {
            const chapterNodeCount = 6; // approximate nodes per chapter
            if (completedNodeCount < nodesAccumulated + chapterNodeCount) {
              currentChapter = (ch as any).title;
              break;
            }
            nodesAccumulated += chapterNodeCount;
          }
          if (!currentChapter && chapters.length > 0) {
            currentChapter = 'Complete';
          }
        }

        return {
          profileId: pid,
          playerId: entry.playerId,
          playerName: entry.playerName,
          totalXp: profile.total_xp || 0,
          weeklyXp: standingData.xp,
          level: profile.player_level || 1,
          tier: standingData.tier,
          currentStreak: streak.current_streak || 0,
          longestStreak: streak.longest_streak || 0,
          dailyQuestsCompletedToday: daily.completed,
          dailyQuestsTotalToday: daily.total,
          weeklyQuestsCompletedThisWeek: weekly.completed,
          weeklyQuestsTotalThisWeek: weekly.total,
          journeyNodesCompleted: journey.completed,
          journeyNodesTotal: totalNodes || 53,
          currentChapter,
          lastActiveDate: lastActive,
          daysSinceActive: daysSince,
          isInactive: daysSince >= 3,
        };
      });

      // Step 4: Compute team summary
      const activePlayers = assembledPlayers.filter(p => p.daysSinceActive < 3);
      const totalDailyQuests = assembledPlayers.reduce((sum, p) => sum + p.dailyQuestsTotalToday, 0);
      const completedDailyQuests = assembledPlayers.reduce((sum, p) => sum + p.dailyQuestsCompletedToday, 0);

      const longestStreakPlayer = assembledPlayers.reduce(
        (best, p) => p.currentStreak > best.currentStreak ? p : best,
        assembledPlayers[0] || { currentStreak: 0, playerName: 'None' }
      );

      const teamSummary: TeamEngagementSummary = {
        totalPlayers: assembledPlayers.length,
        activePlayers: activePlayers.length,
        activePercent: assembledPlayers.length > 0
          ? Math.round((activePlayers.length / assembledPlayers.length) * 100)
          : 0,
        avgWeeklyXp: assembledPlayers.length > 0
          ? Math.round(assembledPlayers.reduce((sum, p) => sum + p.weeklyXp, 0) / assembledPlayers.length)
          : 0,
        avgStreak: assembledPlayers.length > 0
          ? Math.round(assembledPlayers.reduce((sum, p) => sum + p.currentStreak, 0) / assembledPlayers.length * 10) / 10
          : 0,
        longestTeamStreak: longestStreakPlayer?.currentStreak || 0,
        longestStreakPlayerName: longestStreakPlayer?.playerName || 'None',
        questCompletionRate: totalDailyQuests > 0
          ? Math.round((completedDailyQuests / totalDailyQuests) * 100)
          : 0,
        inactivePlayers: assembledPlayers.filter(p => p.isInactive).sort((a, b) => b.daysSinceActive - a.daysSinceActive),
        topEngaged: [...assembledPlayers].sort((a, b) => b.weeklyXp - a.weeklyXp).slice(0, 3),
      };

      setPlayers(assembledPlayers);
      setSummary(teamSummary);
    } catch (err) {
      if (__DEV__) console.error('[useCoachEngagement] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadEngagement();
  }, [loadEngagement]);

  // Sorting
  const sortedPlayers = [...players].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return {
    players: sortedPlayers,
    summary,
    loading,
    sortField,
    sortAsc,
    toggleSort,
    refreshEngagement: loadEngagement,
  };
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localMondayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + 'T00:00:00');
  const d2 = new Date(dateStr2 + 'T00:00:00');
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}
