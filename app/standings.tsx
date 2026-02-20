import { getSportDisplay, StatConfig } from '@/constants/sport-display';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

type TeamStanding = {
  id: string;
  name: string;
  color: string | null;
  wins: number;
  losses: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
};

type PlayerLeaderboardEntry = {
  playerId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string | null;
  photoUrl: string | null;
  statValue: number;
  gamesPlayed: number;
  teamId: string | null;
  teamName: string | null;
};

type MainTab = 'standings' | 'leaderboards';

// ============================================
// CONSTANTS
// ============================================

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'standings', label: 'Team Standings' },
  { key: 'leaderboards', label: 'Player Leaderboards' },
];

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // gold, silver, bronze

// ============================================
// COMPONENT
// ============================================

export default function StandingsScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<MainTab>('standings');
  const [activeStat, setActiveStat] = useState<string>(''); // will be set once sport is detected
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detectedSport, setDetectedSport] = useState<string | null>(null);

  // Data
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [leaderboard, setLeaderboard] = useState<PlayerLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Enhancements
  const [showPerGame, setShowPerGame] = useState(false);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const leaderboardRef = useRef<FlatList<PlayerLeaderboardEntry>>(null);

  const s = useMemo(() => createStyles(colors), [colors]);

  // Sport-aware stat categories
  const sportDisplay = useMemo(() => getSportDisplay(detectedSport), [detectedSport]);
  const STAT_CATEGORIES = useMemo(() =>
    sportDisplay.primaryStats.map(stat => ({
      key: stat.seasonColumn,
      label: stat.label,
      color: stat.color,
      dbColumn: stat.dbColumn,
      seasonColumn: stat.seasonColumn,
    })),
    [sportDisplay]
  );

  // -----------------------------------------------
  // Load team standings
  // -----------------------------------------------
  const loadStandings = useCallback(async () => {
    if (!workingSeason?.id) {
      setStandings([]);
      setLoading(false);
      return;
    }

    try {
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, color')
        .eq('season_id', workingSeason.id)
        .order('name');

      // Detect sport from season
      if (!detectedSport && workingSeason?.id) {
        const { data: seasonData } = await supabase
          .from('seasons')
          .select('sport')
          .eq('id', workingSeason.id)
          .single();
        if ((seasonData as any)?.sport) {
          setDetectedSport((seasonData as any).sport);
        }
      }

      if (teamsError || !teams || teams.length === 0) {
        setStandings([]);
        setLoading(false);
        return;
      }

      // Store teams for team filter
      setTeams(teams.map(t => ({ id: t.id, name: t.name })));

      // Batch: fetch all completed game results for all teams at once
      const teamIds = teams.map(t => t.id);
      const { data: allGames } = teamIds.length > 0
        ? await supabase
            .from('schedule_events')
            .select('team_id, game_result, our_score, opponent_score')
            .in('team_id', teamIds)
            .eq('event_type', 'game')
            .eq('game_status', 'completed')
        : { data: [] };

      // Group games by team
      const gamesByTeam = new Map<string, any[]>();
      for (const game of (allGames || [])) {
        if (!gamesByTeam.has(game.team_id)) gamesByTeam.set(game.team_id, []);
        gamesByTeam.get(game.team_id)!.push(game);
      }

      const standingsData: TeamStanding[] = teams.map((team) => {
        const games = gamesByTeam.get(team.id) || [];
        let wins = 0;
        let losses = 0;
        let pointsFor = 0;
        let pointsAgainst = 0;

        for (const game of games) {
          const ourScore = game.our_score || 0;
          const oppScore = game.opponent_score || 0;
          pointsFor += ourScore;
          pointsAgainst += oppScore;

          if (game.game_result === 'win' || (game.game_result === null && ourScore > oppScore)) {
            wins++;
          } else if (game.game_result === 'loss' || (game.game_result === null && oppScore > ourScore)) {
            losses++;
          }
        }

        const totalGames = wins + losses;
        const winPct = totalGames > 0 ? wins / totalGames : 0;

        return {
          id: team.id,
          name: team.name,
          color: team.color,
          wins,
          losses,
          winPct,
          pointsFor,
          pointsAgainst,
          pointDiff: pointsFor - pointsAgainst,
        };
      });

      // Sort by wins desc, then winPct desc, then point diff desc
      standingsData.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        return b.pointDiff - a.pointDiff;
      });

      setStandings(standingsData);
    } catch (err) {
      if (__DEV__) console.error('Error loading standings:', err);
      setStandings([]);
    } finally {
      setLoading(false);
    }
  }, [workingSeason?.id]);

  // -----------------------------------------------
  // Load player leaderboard
  // -----------------------------------------------
  const loadLeaderboard = useCallback(async (stat: string, teamFilter?: string | null) => {
    if (!workingSeason?.id) {
      setLeaderboard([]);
      return;
    }

    setLeaderboardLoading(true);

    try {
      // Try player_season_stats first
      let query = supabase
        .from('player_season_stats')
        .select('*, players(first_name, last_name, jersey_number, photo_url, team_players(team_id, teams(name)))')
        .eq('season_id', workingSeason.id)
        .order(stat, { ascending: false })
        .limit(50);

      const { data: seasonStats, error: seasonError } = await query;

      if (!seasonError && seasonStats && seasonStats.length > 0) {
        let entries: PlayerLeaderboardEntry[] = seasonStats
          .filter((row: any) => row.players && (row[stat] || 0) > 0)
          .map((row: any) => {
            const tp = (row.players as any)?.team_players?.[0];
            return {
              playerId: row.player_id || row.id,
              firstName: row.players?.first_name || '',
              lastName: row.players?.last_name || '',
              jerseyNumber: row.players?.jersey_number?.toString() || null,
              photoUrl: row.players?.photo_url || null,
              statValue: row[stat] || 0,
              gamesPlayed: row.games_played || 0,
              teamId: tp?.team_id || null,
              teamName: tp?.teams?.name || null,
            };
          });

        // Apply team filter
        if (teamFilter) {
          entries = entries.filter(e => e.teamId === teamFilter);
        }

        setLeaderboard(entries.slice(0, 20));
        setLeaderboardLoading(false);
        return;
      }

      // Fallback: aggregate from game_player_stats using dbColumn
      const matchingCat = STAT_CATEGORIES.find(c => c.seasonColumn === stat);
      const dbCol = matchingCat?.dbColumn || stat;
      const { data: gameStats, error: gameError } = await supabase
        .from('game_player_stats')
        .select(`
          player_id,
          ${dbCol},
          players(first_name, last_name, jersey_number, photo_url),
          schedule_events!inner(season_id)
        `)
        .eq('schedule_events.season_id', workingSeason.id);

      if (gameError || !gameStats) {
        setLeaderboard([]);
        setLeaderboardLoading(false);
        return;
      }

      // Aggregate by player
      const playerMap = new Map<string, {
        firstName: string;
        lastName: string;
        jerseyNumber: string | null;
        photoUrl: string | null;
        total: number;
        count: number;
      }>();

      for (const row of gameStats as any[]) {
        const pid = row.player_id;
        if (!pid) continue;
        const existing = playerMap.get(pid);
        const val = row[dbCol] || 0;
        if (existing) {
          existing.total += val;
          existing.count += 1;
        } else {
          playerMap.set(pid, {
            firstName: row.players?.first_name || '',
            lastName: row.players?.last_name || '',
            jerseyNumber: row.players?.jersey_number?.toString() || null,
            photoUrl: row.players?.photo_url || null,
            total: val,
            count: 1,
          });
        }
      }

      const entries: PlayerLeaderboardEntry[] = Array.from(playerMap.entries())
        .map(([pid, data]) => ({
          playerId: pid,
          firstName: data.firstName,
          lastName: data.lastName,
          jerseyNumber: data.jerseyNumber,
          photoUrl: data.photoUrl,
          statValue: data.total,
          gamesPlayed: data.count,
          teamId: null,
          teamName: null,
        }))
        .filter((e) => e.statValue > 0)
        .sort((a, b) => b.statValue - a.statValue)
        .slice(0, 20);

      setLeaderboard(entries);
    } catch (err) {
      if (__DEV__) console.error('Error loading leaderboard:', err);
      setLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [workingSeason?.id]);

  // -----------------------------------------------
  // Effects
  // -----------------------------------------------
  useEffect(() => {
    loadStandings();
  }, [loadStandings]);

  // Set default stat category once sport is detected
  useEffect(() => {
    if (STAT_CATEGORIES.length > 0 && !activeStat) {
      setActiveStat(STAT_CATEGORIES[0].key);
    }
  }, [STAT_CATEGORIES]);

  useEffect(() => {
    if (activeTab === 'leaderboards' && activeStat) {
      loadLeaderboard(activeStat, selectedTeamId);
    }
  }, [activeTab, activeStat, selectedTeamId, loadLeaderboard]);

  // Resolve current player ID for "YOU" indicator
  useEffect(() => {
    if (!user?.id || !workingSeason?.id) return;
    (async () => {
      // Try parent_account_id
      const { data: directPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id)
        .eq('season_id', workingSeason.id)
        .limit(1)
        .maybeSingle();
      if (directPlayer) { setCurrentPlayerId(directPlayer.id); return; }
      // Fallback: player_guardians
      const { data: guardianRows } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);
      if (guardianRows && guardianRows.length > 0) {
        const pids = guardianRows.map(g => g.player_id);
        const { data: seasonPlayers } = await supabase
          .from('players')
          .select('id')
          .in('id', pids)
          .eq('season_id', workingSeason.id)
          .limit(1);
        if (seasonPlayers?.[0]) setCurrentPlayerId(seasonPlayers[0].id);
      }
    })();
  }, [user?.id, workingSeason?.id]);

  // -----------------------------------------------
  // Refresh
  // -----------------------------------------------
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'standings') {
      await loadStandings();
    } else if (activeStat) {
      await loadLeaderboard(activeStat, selectedTeamId);
    }
    setRefreshing(false);
  }, [activeTab, activeStat, selectedTeamId, loadStandings, loadLeaderboard]);

  // -----------------------------------------------
  // Helpers
  // -----------------------------------------------
  const displayLeaderboard = useMemo(() => {
    if (!showPerGame) return leaderboard;
    return [...leaderboard]
      .map(e => ({
        ...e,
        statValue: e.gamesPlayed > 0 ? parseFloat((e.statValue / e.gamesPlayed).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.statValue - a.statValue);
  }, [leaderboard, showPerGame]);

  const maxStatValue = useMemo(() => {
    if (displayLeaderboard.length === 0) return 1;
    return Math.max(...displayLeaderboard.map((e) => e.statValue), 1);
  }, [displayLeaderboard]);

  // Auto-scroll to current player
  useEffect(() => {
    if (!currentPlayerId || displayLeaderboard.length === 0) return;
    const idx = displayLeaderboard.findIndex(e => e.playerId === currentPlayerId);
    if (idx > 0) {
      const timer = setTimeout(() => {
        leaderboardRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [displayLeaderboard, currentPlayerId]);

  const currentStatCategory = useMemo(
    () => STAT_CATEGORIES.find((c) => c.key === activeStat) || STAT_CATEGORIES[0] || { key: '', label: '', color: '#888' },
    [activeStat, STAT_CATEGORIES]
  );

  const formatWinPct = (pct: number): string => {
    if (pct === 0) return '.000';
    if (pct === 1) return '1.000';
    return pct.toFixed(3).replace(/^0/, '');
  };

  const getRankDisplay = (rank: number): { icon: string; color: string } | null => {
    if (rank === 1) return { icon: 'trophy', color: MEDAL_COLORS[0] };
    if (rank === 2) return { icon: 'medal', color: MEDAL_COLORS[1] };
    if (rank === 3) return { icon: 'medal-outline', color: MEDAL_COLORS[2] };
    return null;
  };

  // -----------------------------------------------
  // Render: Team Standings
  // -----------------------------------------------
  const renderStandings = () => {
    if (loading) {
      return (
        <View style={s.centeredLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading standings...</Text>
        </View>
      );
    }

    if (!workingSeason) {
      return (
        <View style={s.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
          <Text style={s.emptyTitle}>No Active Season</Text>
          <Text style={s.emptySubtitle}>Select a season to view standings.</Text>
        </View>
      );
    }

    if (standings.length === 0) {
      return (
        <View style={s.emptyState}>
          <Ionicons name="podium-outline" size={48} color={colors.textMuted} />
          <Text style={s.emptyTitle}>Leaderboards Coming Soon</Text>
          <Text style={s.emptySubtitle}>Once teams are added, rankings and stats light up here.</Text>
        </View>
      );
    }

    return (
      <View style={s.standingsContainer}>
        {/* Table Header */}
        <View style={s.tableHeader}>
          <View style={s.rankCol}>
            <Text style={s.tableHeaderText}>#</Text>
          </View>
          <View style={s.teamCol}>
            <Text style={s.tableHeaderText}>Team</Text>
          </View>
          <View style={s.statCol}>
            <Text style={s.tableHeaderText}>W</Text>
          </View>
          <View style={s.statCol}>
            <Text style={s.tableHeaderText}>L</Text>
          </View>
          <View style={s.pctCol}>
            <Text style={s.tableHeaderText}>Win%</Text>
          </View>
          <View style={s.statCol}>
            <Text style={s.tableHeaderText}>PF</Text>
          </View>
          <View style={s.statCol}>
            <Text style={s.tableHeaderText}>PA</Text>
          </View>
          <View style={s.diffCol}>
            <Text style={s.tableHeaderText}>Diff</Text>
          </View>
        </View>

        {/* Team Rows */}
        {standings.map((team, index) => {
          const rank = index + 1;
          const medal = getRankDisplay(rank);
          const isTopThree = rank <= 3;
          const rowBg = index % 2 === 0 ? 'transparent' : colors.glassBorder;

          return (
            <View
              key={team.id}
              style={[
                s.tableRow,
                { backgroundColor: rowBg },
                isTopThree && {
                  borderLeftWidth: 3,
                  borderLeftColor: MEDAL_COLORS[rank - 1],
                },
              ]}
            >
              {/* Rank */}
              <View style={s.rankCol}>
                {medal ? (
                  <Ionicons name={medal.icon as any} size={18} color={medal.color} />
                ) : (
                  <Text style={s.rankText}>{rank}</Text>
                )}
              </View>

              {/* Team Name with color dot */}
              <View style={s.teamCol}>
                <View style={s.teamNameRow}>
                  <View
                    style={[
                      s.teamColorDot,
                      { backgroundColor: team.color || colors.textMuted },
                    ]}
                  />
                  <Text style={s.teamName} numberOfLines={1}>
                    {team.name}
                  </Text>
                </View>
              </View>

              {/* Stats */}
              <View style={s.statCol}>
                <Text style={[s.statValue, isTopThree && s.statValueHighlight]}>{team.wins}</Text>
              </View>
              <View style={s.statCol}>
                <Text style={s.statValue}>{team.losses}</Text>
              </View>
              <View style={s.pctCol}>
                <Text style={s.statValue}>{formatWinPct(team.winPct)}</Text>
              </View>
              <View style={s.statCol}>
                <Text style={s.statValue}>{team.pointsFor}</Text>
              </View>
              <View style={s.statCol}>
                <Text style={s.statValue}>{team.pointsAgainst}</Text>
              </View>
              <View style={s.diffCol}>
                <Text
                  style={[
                    s.statValue,
                    team.pointDiff > 0 && { color: colors.success },
                    team.pointDiff < 0 && { color: colors.danger },
                  ]}
                >
                  {team.pointDiff > 0 ? '+' : ''}
                  {team.pointDiff}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // -----------------------------------------------
  // Render: Player Leaderboards
  // -----------------------------------------------
  const renderLeaderboardRow = ({ item: entry, index }: { item: PlayerLeaderboardEntry; index: number }) => {
    const rank = index + 1;
    const medal = getRankDisplay(rank);
    const barWidth = (entry.statValue / maxStatValue) * 100;
    const isYou = currentPlayerId && entry.playerId === currentPlayerId;
    const initials = `${entry.firstName?.[0] || ''}${entry.lastName?.[0] || ''}`;

    return (
      <View
        style={[
          s.leaderboardRow,
          index % 2 === 0 ? {} : { backgroundColor: colors.glassBorder },
          isYou && { borderLeftWidth: 3, borderLeftColor: colors.primary },
        ]}
      >
        {/* Stat bar behind the row */}
        <View
          style={[
            s.statBar,
            {
              width: `${barWidth}%`,
              backgroundColor: currentStatCategory.color + '15',
            },
          ]}
        />

        {/* Rank */}
        <View style={s.leaderRankCol}>
          {medal ? (
            <Ionicons name={medal.icon as any} size={20} color={medal.color} />
          ) : (
            <Text style={s.leaderRankText}>{rank}</Text>
          )}
        </View>

        {/* Player Info */}
        <View style={s.leaderPlayerCol}>
          {entry.photoUrl ? (
            <Image source={{ uri: entry.photoUrl }} style={s.playerAvatar} />
          ) : (
            <View style={s.playerAvatarPlaceholder}>
              <Text style={s.playerAvatarText}>{initials || '?'}</Text>
            </View>
          )}
          <View style={s.playerInfoText}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.playerName} numberOfLines={1}>
                {entry.firstName} {entry.lastName}
              </Text>
              {isYou && (
                <View style={[s.youBadge, { backgroundColor: colors.primary }]}>
                  <Text style={s.youBadgeText}>YOU</Text>
                </View>
              )}
            </View>
            {entry.jerseyNumber && (
              <Text style={s.playerJersey}>#{entry.jerseyNumber}</Text>
            )}
          </View>
        </View>

        {/* Stat Value */}
        <View style={s.leaderStatCol}>
          <Text
            style={[
              s.leaderStatValue,
              { color: currentStatCategory.color },
              rank <= 3 && { fontWeight: '800', fontSize: 20 },
            ]}
          >
            {showPerGame ? entry.statValue.toFixed(1) : entry.statValue}
          </Text>
          {showPerGame && (
            <Text style={{ fontSize: 9, color: colors.textMuted }}>/game</Text>
          )}
        </View>
      </View>
    );
  };

  const renderLeaderboards = () => {
    return (
      <View style={s.leaderboardContainer}>
        {/* Stat Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.statTabsContainer}
        >
          {STAT_CATEGORIES.map((cat) => {
            const isActive = activeStat === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  s.statTab,
                  isActive && { backgroundColor: cat.color + '25', borderColor: cat.color },
                ]}
                onPress={() => setActiveStat(cat.key)}
              >
                <Text
                  style={[
                    s.statTabText,
                    isActive && { color: cat.color, fontWeight: '700' },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Team Filter */}
        {teams.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[s.statTabsContainer, { paddingBottom: 8 }]}
          >
            <TouchableOpacity
              style={[
                s.teamFilterPill,
                !selectedTeamId && { backgroundColor: colors.primary + '25', borderColor: colors.primary },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedTeamId(null);
              }}
            >
              <Text style={[s.teamFilterText, !selectedTeamId && { color: colors.primary, fontWeight: '700' }]}>
                All Teams
              </Text>
            </TouchableOpacity>
            {teams.map(t => {
              const isActive = selectedTeamId === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    s.teamFilterPill,
                    isActive && { backgroundColor: colors.primary + '25', borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedTeamId(t.id);
                  }}
                >
                  <Text style={[s.teamFilterText, isActive && { color: colors.primary, fontWeight: '700' }]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Per-Game Average Toggle */}
        <View style={s.perGameRow}>
          <Text style={s.perGameLabel}>Per-Game Average</Text>
          <Switch
            value={showPerGame}
            onValueChange={(val) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowPerGame(val);
            }}
            trackColor={{ false: colors.border, true: colors.primary + '50' }}
            thumbColor={showPerGame ? colors.primary : colors.textMuted}
          />
        </View>

        {/* Leaderboard Content */}
        {leaderboardLoading ? (
          <View style={s.centeredLoader}>
            <ActivityIndicator size="large" color={currentStatCategory.color} />
            <Text style={s.loadingText}>Loading leaderboard...</Text>
          </View>
        ) : !workingSeason ? (
          <View style={s.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No Active Season</Text>
            <Text style={s.emptySubtitle}>Select a season to view leaderboards.</Text>
          </View>
        ) : displayLeaderboard.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="stats-chart-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyTitle}>Stats Are on the Way</Text>
            <Text style={s.emptySubtitle}>
              Once games are played, the leaderboard will come alive.
            </Text>
          </View>
        ) : (
          <View style={s.leaderboardList}>
            <FlatList
              ref={leaderboardRef}
              data={displayLeaderboard}
              keyExtractor={(item) => item.playerId}
              renderItem={renderLeaderboardRow}
              scrollEnabled={false}
              onScrollToIndexFailed={() => {}}
            />
          </View>
        )}
      </View>
    );
  };

  // -----------------------------------------------
  // Main Render
  // -----------------------------------------------
  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>STANDINGS</Text>
          {workingSeason && (
            <Text style={s.headerSeason}>{workingSeason.name}</Text>
          )}
        </View>
        <View style={s.backBtn} />
      </View>

      {/* Main Tab Selector */}
      <View style={s.mainTabBar}>
        {MAIN_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.mainTab, isActive && s.mainTabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[s.mainTabText, isActive && s.mainTabTextActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={[s.mainTabIndicator, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'standings' ? renderStandings() : renderLeaderboards()}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCenter: {
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 2,
    },
    headerSeason: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },

    // Main Tab Bar
    mainTabBar: {
      flexDirection: 'row',
      backgroundColor: colors.glassCard,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
    },
    mainTab: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      position: 'relative',
    },
    mainTabActive: {},
    mainTabText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
    mainTabTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    mainTabIndicator: {
      position: 'absolute',
      bottom: 0,
      left: '20%',
      right: '20%',
      height: 3,
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
    },

    // Scroll
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 16,
    },

    // Loading / Empty
    centeredLoader: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 12,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },

    // ==========================================
    // STANDINGS TABLE
    // ==========================================
    standingsContainer: {
      marginHorizontal: 12,
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: colors.bgSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableHeaderText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      textAlign: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.glassBorder,
    },

    // Column sizing
    rankCol: {
      width: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teamCol: {
      flex: 1,
      paddingLeft: 8,
    },
    statCol: {
      width: 32,
      alignItems: 'center',
    },
    pctCol: {
      width: 46,
      alignItems: 'center',
    },
    diffCol: {
      width: 40,
      alignItems: 'flex-end',
    },

    // Row content
    rankText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    teamNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    teamColorDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    teamName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    statValue: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    statValueHighlight: {
      color: colors.text,
      fontWeight: '700',
    },

    // ==========================================
    // LEADERBOARD
    // ==========================================
    leaderboardContainer: {
      flex: 1,
    },
    statTabsContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 8,
    },
    statTab: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassCard,
    },
    statTabText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },

    leaderboardList: {
      marginHorizontal: 12,
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    leaderboardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.glassBorder,
      position: 'relative',
      overflow: 'hidden',
    },
    statBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      borderRadius: 0,
    },

    leaderRankCol: {
      width: 36,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    leaderRankText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textMuted,
    },

    leaderPlayerCol: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 8,
      zIndex: 1,
    },
    playerAvatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    playerAvatarText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    playerInfoText: {
      flex: 1,
    },
    playerName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    playerJersey: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },

    leaderStatCol: {
      width: 56,
      alignItems: 'flex-end',
      justifyContent: 'center',
      zIndex: 1,
    },
    leaderStatValue: {
      fontSize: 18,
      fontWeight: '700',
    },

    // Player photo avatar
    playerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },

    // "YOU" badge
    youBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    youBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 1,
    },

    // Per-game toggle row
    perGameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    perGameLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },

    // Team filter pills
    teamFilterPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassCard,
    },
    teamFilterText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
    },
  });
