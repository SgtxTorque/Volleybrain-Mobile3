import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
};

type MainTab = 'standings' | 'leaderboards';
type StatCategory = 'kills' | 'aces' | 'digs' | 'blocks' | 'assists';

// ============================================
// CONSTANTS
// ============================================

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'standings', label: 'Team Standings' },
  { key: 'leaderboards', label: 'Player Leaderboards' },
];

const STAT_CATEGORIES: { key: StatCategory; label: string; color: string }[] = [
  { key: 'kills', label: 'Kills', color: '#FF3B3B' },
  { key: 'aces', label: 'Aces', color: '#A855F7' },
  { key: 'digs', label: 'Digs', color: '#3B82F6' },
  { key: 'blocks', label: 'Blocks', color: '#F59E0B' },
  { key: 'assists', label: 'Assists', color: '#10B981' },
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
  const [activeStat, setActiveStat] = useState<StatCategory>('kills');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [leaderboard, setLeaderboard] = useState<PlayerLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const s = useMemo(() => createStyles(colors), [colors]);

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

      if (teamsError || !teams || teams.length === 0) {
        setStandings([]);
        setLoading(false);
        return;
      }

      // Fetch game results for each team
      const standingsData: TeamStanding[] = await Promise.all(
        teams.map(async (team) => {
          const { data: games } = await supabase
            .from('schedule_events')
            .select('game_result, our_score, opponent_score')
            .eq('team_id', team.id)
            .eq('event_type', 'game')
            .eq('game_status', 'completed');

          let wins = 0;
          let losses = 0;
          let pointsFor = 0;
          let pointsAgainst = 0;

          if (games) {
            for (const game of games) {
              const ourScore = game.our_score || 0;
              const oppScore = game.opponent_score || 0;
              pointsFor += ourScore;
              pointsAgainst += oppScore;

              if (game.game_result === 'win' || (game.game_result === null && ourScore > oppScore)) {
                wins++;
              } else if (game.game_result === 'loss' || (game.game_result === null && oppScore > ourScore)) {
                losses++;
              } else if (game.game_result === null && ourScore === oppScore && ourScore > 0) {
                // Tie counts neither way
              } else if (game.game_result === 'loss') {
                losses++;
              }
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
        })
      );

      // Sort by wins desc, then winPct desc, then point diff desc
      standingsData.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        return b.pointDiff - a.pointDiff;
      });

      setStandings(standingsData);
    } catch (err) {
      console.error('Error loading standings:', err);
      setStandings([]);
    } finally {
      setLoading(false);
    }
  }, [workingSeason?.id]);

  // -----------------------------------------------
  // Load player leaderboard
  // -----------------------------------------------
  const loadLeaderboard = useCallback(async (stat: StatCategory) => {
    if (!workingSeason?.id) {
      setLeaderboard([]);
      return;
    }

    setLeaderboardLoading(true);

    try {
      // Try player_season_stats first
      const { data: seasonStats, error: seasonError } = await supabase
        .from('player_season_stats')
        .select('*, players(first_name, last_name, jersey_number, photo_url)')
        .eq('season_id', workingSeason.id)
        .order(stat, { ascending: false })
        .limit(20);

      if (!seasonError && seasonStats && seasonStats.length > 0) {
        const entries: PlayerLeaderboardEntry[] = seasonStats
          .filter((row: any) => row.players && (row[stat] || 0) > 0)
          .map((row: any) => ({
            playerId: row.player_id || row.id,
            firstName: row.players?.first_name || '',
            lastName: row.players?.last_name || '',
            jerseyNumber: row.players?.jersey_number?.toString() || null,
            photoUrl: row.players?.photo_url || null,
            statValue: row[stat] || 0,
          }));

        setLeaderboard(entries);
        setLeaderboardLoading(false);
        return;
      }

      // Fallback: aggregate from game_player_stats
      const { data: gameStats, error: gameError } = await supabase
        .from('game_player_stats')
        .select(`
          player_id,
          ${stat},
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
      }>();

      for (const row of gameStats as any[]) {
        const pid = row.player_id;
        if (!pid) continue;
        const existing = playerMap.get(pid);
        const val = row[stat] || 0;
        if (existing) {
          existing.total += val;
        } else {
          playerMap.set(pid, {
            firstName: row.players?.first_name || '',
            lastName: row.players?.last_name || '',
            jerseyNumber: row.players?.jersey_number?.toString() || null,
            photoUrl: row.players?.photo_url || null,
            total: val,
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
        }))
        .filter((e) => e.statValue > 0)
        .sort((a, b) => b.statValue - a.statValue)
        .slice(0, 20);

      setLeaderboard(entries);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
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

  useEffect(() => {
    if (activeTab === 'leaderboards') {
      loadLeaderboard(activeStat);
    }
  }, [activeTab, activeStat, loadLeaderboard]);

  // -----------------------------------------------
  // Refresh
  // -----------------------------------------------
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'standings') {
      await loadStandings();
    } else {
      await loadLeaderboard(activeStat);
    }
    setRefreshing(false);
  }, [activeTab, activeStat, loadStandings, loadLeaderboard]);

  // -----------------------------------------------
  // Helpers
  // -----------------------------------------------
  const maxStatValue = useMemo(() => {
    if (leaderboard.length === 0) return 1;
    return Math.max(...leaderboard.map((e) => e.statValue), 1);
  }, [leaderboard]);

  const currentStatCategory = useMemo(
    () => STAT_CATEGORIES.find((c) => c.key === activeStat)!,
    [activeStat]
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
          <Text style={s.emptyTitle}>No Teams Yet</Text>
          <Text style={s.emptySubtitle}>Teams will appear here once they are added to the season.</Text>
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
        ) : leaderboard.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="stats-chart-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No Stats Recorded</Text>
            <Text style={s.emptySubtitle}>
              Player stats for {currentStatCategory.label.toLowerCase()} will appear here once games are recorded.
            </Text>
          </View>
        ) : (
          <View style={s.leaderboardList}>
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              const medal = getRankDisplay(rank);
              const barWidth = (entry.statValue / maxStatValue) * 100;

              return (
                <View
                  key={entry.playerId}
                  style={[
                    s.leaderboardRow,
                    index % 2 === 0 ? {} : { backgroundColor: colors.glassBorder },
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
                    <View style={s.playerAvatarPlaceholder}>
                      <Text style={s.playerAvatarText}>
                        {entry.jerseyNumber || (entry.firstName?.[0] || '?')}
                      </Text>
                    </View>
                    <View style={s.playerInfoText}>
                      <Text style={s.playerName} numberOfLines={1}>
                        {entry.firstName} {entry.lastName}
                      </Text>
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
                      {entry.statValue}
                    </Text>
                  </View>
                </View>
              );
            })}
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
      backgroundColor: colors.background,
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
      fontSize: 20,
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
      letterSpacing: 0.5,
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
      borderRadius: 24,
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
  });
