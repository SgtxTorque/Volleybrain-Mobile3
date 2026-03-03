/**
 * useLeaderboardData — fetches and processes player leaderboard data
 * for all stat categories at once.
 *
 * Mirrors the web admin's SeasonLeaderboardsPage.jsx query pattern:
 *   player_season_stats → players → teams
 *
 * Sport-aware: volleyball gets the full 8-category set (including
 * Points, Hit%, Serve%); other sports use their primaryStats from
 * sport-display.ts.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getSportDisplay } from '@/constants/sport-display';

// ─── Types ──────────────────────────────────────────────────────

export type LeaderboardCategory = {
  id: string;
  label: string;
  statKey: string;           // column in player_season_stats
  perGameKey?: string;       // pre-computed per-game column (if exists)
  isPercentage?: boolean;
  icon: string;
  color: string;
  description: string;
};

export type LeaderboardEntry = {
  playerId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string | null;
  photoUrl: string | null;
  position: string | null;
  teamId: string | null;
  teamName: string | null;
  statValue: number;
  gamesPlayed: number;
};

export type LeaderboardData = Record<string, LeaderboardEntry[]>;

// ─── Volleyball Categories (matches web admin exactly) ──────────

export const VOLLEYBALL_CATEGORIES: LeaderboardCategory[] = [
  { id: 'points',  label: 'Points',  statKey: 'total_points',        perGameKey: 'points_per_game',  icon: '⭐', color: '#F59E0B', description: 'Total points scored' },
  { id: 'aces',    label: 'Aces',    statKey: 'total_aces',          perGameKey: 'aces_per_game',    icon: '🏐', color: '#10B981', description: 'Service aces' },
  { id: 'kills',   label: 'Kills',   statKey: 'total_kills',         perGameKey: 'kills_per_game',   icon: '💥', color: '#EF4444', description: 'Attack kills' },
  { id: 'blocks',  label: 'Blocks',  statKey: 'total_blocks',        perGameKey: 'blocks_per_game',  icon: '🛡️', color: '#6366F1', description: 'Total blocks' },
  { id: 'digs',    label: 'Digs',    statKey: 'total_digs',           perGameKey: 'digs_per_game',    icon: '🏃', color: '#4BB9EC', description: 'Defensive digs' },
  { id: 'assists', label: 'Assists', statKey: 'total_assists',       perGameKey: 'assists_per_game', icon: '🙌', color: '#8B5CF6', description: 'Setting assists' },
  { id: 'hitting', label: 'Hit %',   statKey: 'hitting_percentage',  isPercentage: true,             icon: '🎯', color: '#EC4899', description: 'Attack efficiency' },
  { id: 'serving', label: 'Serve %', statKey: 'serve_percentage',    isPercentage: true,             icon: '✅', color: '#14B8A6', description: 'Serve success rate' },
];

/**
 * Returns leaderboard categories appropriate for the detected sport.
 * Volleyball gets all 8 (including percentages). Other sports get their
 * primaryStats mapped to the category format.
 */
export function getCategoriesForSport(sport: string | null): LeaderboardCategory[] {
  if (!sport || sport === 'volleyball') return VOLLEYBALL_CATEGORIES;

  const display = getSportDisplay(sport);
  return display.primaryStats.map((s) => ({
    id: s.key,
    label: s.label,
    statKey: s.seasonColumn,
    icon: s.icon,
    color: s.color,
    description: s.label,
  }));
}

// ─── Per-game key map (pre-computed columns in DB) ──────────────

const PER_GAME_KEYS: Record<string, string> = {
  total_points:  'points_per_game',
  total_aces:    'aces_per_game',
  total_kills:   'kills_per_game',
  total_blocks:  'blocks_per_game',
  total_digs:    'digs_per_game',
  total_assists: 'assists_per_game',
};

// ─── Hook ───────────────────────────────────────────────────────

export function useLeaderboardData(seasonId: string | null, sport?: string | null) {
  const [rawStats, setRawStats] = useState<any[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const categories = useMemo(() => getCategoriesForSport(sport ?? null), [sport]);

  // ── Fetch all data at once ──────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!seasonId) {
      setRawStats([]);
      setTeams([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parallel fetch: stats + teams
      const [statsRes, teamsRes] = await Promise.all([
        supabase
          .from('player_season_stats')
          .select(`
            *,
            player:players(id, first_name, last_name, jersey_number, photo_url, position),
            team:teams(id, name)
          `)
          .eq('season_id', seasonId)
          .gt('games_played', 0),

        supabase
          .from('teams')
          .select('id, name')
          .eq('season_id', seasonId)
          .order('name'),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (teamsRes.error) throw teamsRes.error;

      setRawStats(statsRes.data || []);
      setTeams(teamsRes.data || []);
    } catch (err: any) {
      if (__DEV__) console.error('[useLeaderboardData] fetch error:', err);
      setError(err.message || 'Failed to load leaderboard data');
      setRawStats([]);
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Process stats into per-category ranked arrays ───────────
  const leaderboardData: LeaderboardData = useMemo(() => {
    if (rawStats.length === 0) return {};

    const result: LeaderboardData = {};

    for (const cat of categories) {
      let entries: LeaderboardEntry[] = rawStats
        .filter((row) => {
          const val = row[cat.statKey];
          if (val === null || val === undefined) return false;
          // Percentage stats require minimum 3 games
          if (cat.isPercentage && (row.games_played || 0) < 3) return false;
          // Non-percentage stats must be > 0
          if (!cat.isPercentage && val <= 0) return false;
          return true;
        })
        .map((row): LeaderboardEntry => {
          const player = row.player;
          const team = row.team;
          return {
            playerId: row.player_id,
            firstName: player?.first_name || '',
            lastName: player?.last_name || '',
            jerseyNumber: player?.jersey_number?.toString() || null,
            photoUrl: player?.photo_url || null,
            position: player?.position || null,
            teamId: team?.id || row.team_id || null,
            teamName: team?.name || null,
            statValue: row[cat.statKey] ?? 0,
            gamesPlayed: row.games_played || 0,
          };
        })
        .sort((a, b) => b.statValue - a.statValue);

      result[cat.id] = entries;
    }

    return result;
  }, [rawStats, categories]);

  // ── Helper: filter by team ──────────────────────────────────
  const getFilteredLeaders = useCallback(
    (categoryId: string, teamFilter?: string | null): LeaderboardEntry[] => {
      const entries = leaderboardData[categoryId] || [];
      if (!teamFilter) return entries;
      return entries.filter((e) => e.teamId === teamFilter);
    },
    [leaderboardData],
  );

  // ── Helper: top N for a category ────────────────────────────
  const getTopN = useCallback(
    (categoryId: string, n: number, teamFilter?: string | null): LeaderboardEntry[] => {
      return getFilteredLeaders(categoryId, teamFilter).slice(0, n);
    },
    [getFilteredLeaders],
  );

  // ── Helper: per-game value ──────────────────────────────────
  const getPerGameValue = useCallback(
    (entry: LeaderboardEntry): number | null => {
      if (entry.gamesPlayed <= 0) return null;
      return parseFloat((entry.statValue / entry.gamesPlayed).toFixed(1));
    },
    [],
  );

  // ── Refresh ─────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ── Season MVPs (top 1 from each primary category) ──────────
  const mvps = useMemo(() => {
    const mvpCategories = ['points', 'kills', 'aces'];
    return mvpCategories
      .map((catId) => {
        const top = leaderboardData[catId]?.[0];
        if (!top) return null;
        const cat = categories.find((c) => c.id === catId);
        return { category: cat!, player: top };
      })
      .filter(Boolean) as { category: LeaderboardCategory; player: LeaderboardEntry }[];
  }, [leaderboardData, categories]);

  // ── Is empty (no data for any category) ─────────────────────
  const isEmpty = useMemo(() => {
    return Object.values(leaderboardData).every((entries) => entries.length === 0);
  }, [leaderboardData]);

  return {
    categories,
    leaderboardData,
    teams,
    loading,
    refreshing,
    error,
    isEmpty,
    mvps,
    getFilteredLeaders,
    getTopN,
    getPerGameValue,
    refresh,
  };
}
