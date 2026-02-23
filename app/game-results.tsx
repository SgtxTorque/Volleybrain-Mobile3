import { getSportDisplay } from '@/constants/sport-display';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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

type GameEvent = {
  id: string;
  team_id: string;
  event_type: string;
  title: string;
  event_date: string;
  event_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  opponent_name: string | null;
  game_status: string | null;
  game_result: string | null;
  our_score: number | null;
  opponent_score: number | null;
  set_scores: any;
  sport?: string | null;
  teams: {
    name: string;
    color: string | null;
    season_id?: string | null;
  } | null;
};

type PlayerStats = {
  id: string;
  player_id: string;
  sport?: string;
  [key: string]: any;
};

type ChildInfo = {
  id: string;
  first_name: string;
  last_name: string;
};

// ============================================
// COMPONENT
// ============================================

export default function GameResultsScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { eventId } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameEvent | null>(null);
  const [childStats, setChildStats] = useState<(PlayerStats & { child: ChildInfo })[]>([]);
  const [sportName, setSportName] = useState<string | null>(null);

  const s = createStyles(colors);

  useEffect(() => {
    if (eventId && user?.id) {
      fetchGameData();
    } else if (!eventId) {
      setLoading(false);
    }
  }, [eventId, user?.id]);

  const fetchGameData = async () => {
    if (!eventId || !user?.id) return;

    try {
      // Fetch game event with team info
      const { data: gameData, error: gameError } = await supabase
        .from('schedule_events')
        .select('*, teams!schedule_events_team_id_fkey(name, color, season_id)')
        .eq('id', eventId)
        .single();

      if (gameError) {
        if (__DEV__) console.error('Error fetching game:', gameError);
        setLoading(false);
        return;
      }

      setGame(gameData);

      // Detect sport via season
      const seasonId = (gameData?.teams as any)?.season_id || gameData?.season_id;
      if (seasonId) {
        const { data: seasonData } = await supabase
          .from('seasons')
          .select('sport')
          .eq('id', seasonId)
          .single();
        setSportName((seasonData as any)?.sport || null);
      }

      // 3-source parent-child resolution
      const parentEmail = profile?.email || user?.email;
      let playerIds: string[] = [];

      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);
      if (guardianLinks) playerIds.push(...guardianLinks.map(g => g.player_id));

      const { data: directPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);
      if (directPlayers) playerIds.push(...directPlayers.map(p => p.id));

      if (parentEmail) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', parentEmail);
        if (emailPlayers) playerIds.push(...emailPlayers.map(p => p.id));
      }

      playerIds = [...new Set(playerIds)];

      let playerInfos: ChildInfo[] = [];
      if (playerIds.length > 0) {
        const { data: childData } = await supabase
          .from('players')
          .select('id, first_name, last_name')
          .in('id', playerIds);
        playerInfos = childData || [];
      }

      if (playerIds.length > 0) {
        // Fetch stats for this game
        const { data: stats } = await supabase
          .from('game_player_stats')
          .select('*')
          .eq('event_id', eventId as string)
          .in('player_id', playerIds);

        const statsWithChild = (stats || []).map((stat: any) => {
          const child = playerInfos.find(c => c.id === stat.player_id);
          return {
            ...stat,
            child: child || { id: stat.player_id, first_name: 'Unknown', last_name: '' },
          };
        });

        setChildStats(statsWithChild);
      }
    } catch (err) {
      if (__DEV__) console.error('Error fetching game results:', err);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------
  // Helpers
  // -----------------------------------------------

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isWin = game?.game_result === 'win';
  const isLoss = game?.game_result === 'loss';

  const getResultColor = () => {
    if (isWin) return colors.success;
    if (isLoss) return colors.danger;
    return colors.textMuted;
  };

  const getResultLabel = () => {
    if (isWin) return 'WIN';
    if (isLoss) return 'LOSS';
    return 'DRAW';
  };

  const parseSetScores = (setScores: any): string[] => {
    if (!setScores) return [];

    const formatItem = (item: any): string => {
      if (typeof item === 'string') return item;
      if (typeof item === 'number') return String(item);
      if (typeof item === 'object' && item !== null) {
        const us = item.our_score ?? item.us ?? item.home ?? null;
        const them = item.opponent_score ?? item.their_score ?? item.them ?? item.away ?? null;
        if (us != null && them != null) return `${us}-${them}`;
        // Try first two numeric values
        const vals = Object.values(item).filter(v => typeof v === 'number');
        if (vals.length >= 2) return `${vals[0]}-${vals[1]}`;
        return JSON.stringify(item);
      }
      return String(item);
    };

    if (Array.isArray(setScores)) return setScores.map(formatItem);
    if (typeof setScores === 'string') {
      try {
        const parsed = JSON.parse(setScores);
        if (Array.isArray(parsed)) return parsed.map(formatItem);
      } catch {}
      return setScores.split(',').map((s: string) => s.trim());
    }
    return [];
  };

  // -----------------------------------------------
  // Stat Card Component
  // -----------------------------------------------

  const StatCard = ({
    label,
    value,
    icon,
    color,
  }: {
    label: string;
    value: number;
    icon: string;
    color: string;
  }) => (
    <View style={s.statCard}>
      <View style={[s.statIconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  // -----------------------------------------------
  // Render
  // -----------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading game recap...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!game) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Game Recap</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={s.emptyText}>Game not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const resultColor = getResultColor();
  const setScores = parseSetScores(game.set_scores);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Game Recap</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Big Score Hero Card */}
        <View style={s.heroCard}>
          {/* Result Badge */}
          {game.game_result && (
            <View style={[s.resultBadge, { backgroundColor: resultColor + '20' }]}>
              <Text style={[s.resultText, { color: resultColor }]}>{getResultLabel()}</Text>
            </View>
          )}

          {/* Date */}
          <Text style={s.gameDate}>{formatDate(game.event_date)}</Text>

          {/* Teams and Score */}
          <View style={s.scoreSection}>
            {/* Our Team */}
            <View style={s.teamSide}>
              <View
                style={[
                  s.teamCircle,
                  { backgroundColor: (game.teams?.color || colors.primary) + '25' },
                ]}
              >
                <Ionicons
                  name="people"
                  size={24}
                  color={game.teams?.color || colors.primary}
                />
              </View>
              <Text style={s.teamLabel} numberOfLines={2}>
                {game.teams?.name || 'Our Team'}
              </Text>
            </View>

            {/* Score Display */}
            <View style={s.scoreCenterBlock}>
              <View style={s.scoreRow}>
                <Text style={[s.scoreBig, isWin && { color: colors.success }]}>
                  {game.our_score ?? '-'}
                </Text>
                <Text style={s.scoreDash}>:</Text>
                <Text style={[s.scoreBig, isLoss && { color: colors.danger }]}>
                  {game.opponent_score ?? '-'}
                </Text>
              </View>
              <Text style={s.scoreSubtext}>FINAL SCORE</Text>
            </View>

            {/* Opponent */}
            <View style={s.teamSide}>
              <View style={[s.teamCircle, { backgroundColor: colors.textMuted + '20' }]}>
                <Ionicons name="shield" size={24} color={colors.textMuted} />
              </View>
              <Text style={s.teamLabel} numberOfLines={2}>
                {game.opponent_name || 'Opponent'}
              </Text>
            </View>
          </View>

          {/* Set Scores */}
          {setScores.length > 0 && (
            <View style={s.setScoresSection}>
              <Text style={s.setScoresLabel}>SET SCORES</Text>
              <View style={s.setScoresRow}>
                {setScores.map((score, index) => (
                  <View key={index} style={s.setScoreBadge}>
                    <Text style={s.setScoreNumber}>Set {index + 1}</Text>
                    <Text style={s.setScoreValue}>{score}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Player Stats — Sport-Aware */}
        {childStats.length > 0 && (
          <>
            {childStats.map(statEntry => {
              const sportDisplay = getSportDisplay(sportName);
              return (
                <View key={statEntry.id}>
                  <Text style={s.sectionTitle}>
                    {statEntry.child.first_name.toUpperCase()}'S PERFORMANCE
                  </Text>

                  <View style={s.statsGrid}>
                    {sportDisplay.primaryStats.map(stat => (
                      <StatCard
                        key={stat.key}
                        label={stat.label}
                        value={statEntry[stat.dbColumn] || 0}
                        icon={stat.ionicon}
                        color={stat.color}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {childStats.length === 0 && (
          <View style={s.noStats}>
            <Ionicons name="stats-chart-outline" size={36} color={colors.textMuted} />
            <Text style={s.noStatsText}>
              Stats weren't tracked for this game. Ask your coach to record stats!
            </Text>
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
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 12,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textMuted,
      marginTop: 12,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
    },

    // Scroll
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
    },

    // Hero Card
    heroCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 24,
      marginBottom: 20,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: { elevation: 6 },
      }),
    },

    // Result Badge
    resultBadge: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 12,
    },
    resultText: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 2,
    },

    // Game Date
    gameDate: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 20,
    },

    // Score Section
    scoreSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      width: '100%',
    },
    teamSide: {
      alignItems: 'center',
      flex: 1,
    },
    teamCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    teamLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    scoreCenterBlock: {
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    scoreBig: {
      fontSize: 48,
      fontWeight: '900',
      color: colors.text,
    },
    scoreDash: {
      fontSize: 32,
      fontWeight: '300',
      color: colors.textMuted,
    },
    scoreSubtext: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 2,
      marginTop: 4,
    },

    // Set Scores
    setScoresSection: {
      width: '100%',
      marginTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
      paddingTop: 16,
      alignItems: 'center',
    },
    setScoresLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: 10,
    },
    setScoresRow: {
      flexDirection: 'row',
      gap: 10,
    },
    setScoreBadge: {
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    setScoreNumber: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 2,
    },
    setScoreValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },

    // Section Title
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 12,
      marginTop: 4,
      textTransform: 'uppercase' as const,
      letterSpacing: 1.2,
    },

    // Stats Grid
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    statCard: {
      width: '31%',
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 14,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
        },
        android: { elevation: 3 },
      }),
    },
    statIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '800',
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 2,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },

    // No Stats
    noStats: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    noStatsText: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 10,
      textAlign: 'center',
    },
  });
