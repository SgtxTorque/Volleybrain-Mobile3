import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
import LeaderboardScreen from '@/components/LeaderboardScreen';

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

type MainTab = 'standings' | 'leaderboards';

// ============================================
// CONSTANTS
// ============================================

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'standings', label: 'Team Standings' },
  { key: 'leaderboards', label: 'Player Leaderboards' },
];

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

// ============================================
// COMPONENT
// ============================================

export default function StandingsScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<MainTab>('standings');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detectedSport, setDetectedSport] = useState<string | null>(null);

  // Standings data
  const [standings, setStandings] = useState<TeamStanding[]>([]);

  // Player identity for highlights
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [childPlayerIds, setChildPlayerIds] = useState<string[]>([]);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);

  // Leaderboard refresh trigger (increment to force re-fetch)
  const [lbRefreshTrigger, setLbRefreshTrigger] = useState(0);

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
  // Effects
  // -----------------------------------------------
  useEffect(() => {
    loadStandings();
  }, [loadStandings]);

  // Resolve current player / child player IDs for leaderboard highlights
  useEffect(() => {
    if (!user?.id || !workingSeason?.id) return;
    (async () => {
      // Direct player (player role via parent_account_id)
      const { data: directPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id)
        .eq('season_id', workingSeason.id)
        .limit(1)
        .maybeSingle();
      if (directPlayer) {
        setCurrentPlayerId(directPlayer.id);
        return;
      }

      // Parent: find children via player_guardians
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
          .eq('season_id', workingSeason.id);
        if (seasonPlayers && seasonPlayers.length > 0) {
          setChildPlayerIds(seasonPlayers.map(p => p.id));
        }
      }
    })();
  }, [user?.id, workingSeason?.id]);

  // Resolve coach team for highlights
  useEffect(() => {
    if (!user?.id || !workingSeason?.id) return;
    (async () => {
      const { data: staffRow } = await supabase
        .from('team_staff')
        .select('teams!inner(id, season_id)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      const team = (staffRow as any)?.teams;
      if (team && team.season_id === workingSeason.id) {
        setCurrentTeamId(team.id);
      }
    })();
  }, [user?.id, workingSeason?.id]);

  // -----------------------------------------------
  // Refresh
  // -----------------------------------------------
  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    if (activeTab === 'standings') {
      await loadStandings();
      setRefreshing(false);
    } else {
      // Trigger leaderboard refresh; onRefreshDone will clear refreshing
      setLbRefreshTrigger(c => c + 1);
    }
  }, [activeTab, loadStandings]);

  // -----------------------------------------------
  // Helpers
  // -----------------------------------------------
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

  // Navigate to player detail on tap
  const handlePlayerTap = useCallback((playerId: string) => {
    router.push(`/child-detail?playerId=${playerId}` as any);
  }, [router]);

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
          <Text style={s.emptySubtitle}>Once teams are added, standings will appear here.</Text>
        </View>
      );
    }

    return (
      <View style={s.standingsContainer}>
        {/* Table Header */}
        <View style={s.tableHeader}>
          <View style={s.rankCol}><Text style={s.tableHeaderText}>#</Text></View>
          <View style={s.teamCol}><Text style={s.tableHeaderText}>Team</Text></View>
          <View style={s.statCol}><Text style={s.tableHeaderText}>W</Text></View>
          <View style={s.statCol}><Text style={s.tableHeaderText}>L</Text></View>
          <View style={s.pctCol}><Text style={s.tableHeaderText}>Win%</Text></View>
          <View style={s.statCol}><Text style={s.tableHeaderText}>PF</Text></View>
          <View style={s.statCol}><Text style={s.tableHeaderText}>PA</Text></View>
          <View style={s.diffCol}><Text style={s.tableHeaderText}>Diff</Text></View>
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
                isTopThree && { borderLeftWidth: 3, borderLeftColor: MEDAL_COLORS[rank - 1] },
              ]}
            >
              <View style={s.rankCol}>
                {medal ? (
                  <Ionicons name={medal.icon as any} size={18} color={medal.color} />
                ) : (
                  <Text style={s.rankText}>{rank}</Text>
                )}
              </View>
              <View style={s.teamCol}>
                <View style={s.teamNameRow}>
                  <View style={[s.teamColorDot, { backgroundColor: team.color || colors.textMuted }]} />
                  <Text style={s.teamName} numberOfLines={1}>{team.name}</Text>
                </View>
              </View>
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
                  {team.pointDiff > 0 ? '+' : ''}{team.pointDiff}
                </Text>
              </View>
            </View>
          );
        })}
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
        {activeTab === 'standings' ? (
          renderStandings()
        ) : workingSeason ? (
          <LeaderboardScreen
            seasonId={workingSeason.id}
            sport={detectedSport}
            highlightPlayerId={currentPlayerId || undefined}
            highlightTeamId={currentTeamId || undefined}
            highlightPlayerIds={childPlayerIds.length > 0 ? childPlayerIds : undefined}
            onPlayerTap={handlePlayerTap}
            refreshTrigger={lbRefreshTrigger}
            onRefreshDone={() => setRefreshing(false)}
          />
        ) : (
          <View style={s.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No Active Season</Text>
            <Text style={s.emptySubtitle}>Select a season to view leaderboards.</Text>
          </View>
        )}
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
    rankCol: { width: 30, alignItems: 'center', justifyContent: 'center' },
    teamCol: { flex: 1, paddingLeft: 8 },
    statCol: { width: 32, alignItems: 'center' },
    pctCol: { width: 46, alignItems: 'center' },
    diffCol: { width: 40, alignItems: 'flex-end' },

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
  });
