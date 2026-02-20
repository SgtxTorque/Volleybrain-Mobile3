import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Linking, Platform,
  RefreshControl, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSeason } from '@/lib/season';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import AdminContextBar from './AdminContextBar';

// ============================================
// TYPES
// ============================================

type GameEvent = {
  id: string;
  team_id: string;
  team_name: string;
  team_color: string | null;
  opponent_name: string | null;
  event_date: string;
  event_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  location: string | null;
  game_status: string | null;
  game_result: string | null;
  our_score: number | null;
  opponent_score: number | null;
  stats_entered: boolean | null;
};

type TeamRecord = {
  team_id: string;
  team_name: string;
  team_color: string | null;
  wins: number;
  losses: number;
  ties: number;
};

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  return `${hours}:${minutes} ${ampm}`;
}

function formatDayHeader(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
  return `${dayName}, ${monthName} ${day}`;
}

function openDirections(game: GameEvent) {
  const address = encodeURIComponent(
    game.venue_address || game.venue_name || game.location || ''
  );
  if (!address) return;
  const url =
    Platform.OS === 'ios'
      ? `maps:?q=${address}`
      : `geo:0,0?q=${address}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`)
  );
}

// ============================================
// COMPONENT
// ============================================

export default function AdminGameDay() {
  const { workingSeason } = useSeason();
  const { colors } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allGames, setAllGames] = useState<GameEvent[]>([]);

  const s = createStyles(colors);

  // ---- Data fetching ----
  const fetchData = useCallback(async () => {
    if (!workingSeason?.id) {
      setAllGames([]);
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('schedule_events')
        .select(
          'id, team_id, opponent, opponent_name, event_date, event_time, venue_name, venue_address, location, game_status, game_result, our_score, opponent_score, stats_entered, teams(name, color)'
        )
        .eq('season_id', workingSeason.id)
        .eq('event_type', 'game')
        .order('event_date')
        .order('event_time');

      const mapped: GameEvent[] = (data || []).map((g: any) => ({
        id: g.id,
        team_id: g.team_id,
        team_name: g.teams?.name || 'Unknown',
        team_color: g.teams?.color || null,
        opponent_name: g.opponent_name || g.opponent || null,
        event_date: g.event_date,
        event_time: g.event_time,
        venue_name: g.venue_name,
        venue_address: g.venue_address,
        location: g.location,
        game_status: g.game_status,
        game_result: g.game_result,
        our_score: g.our_score,
        opponent_score: g.opponent_score,
        stats_entered: g.stats_entered,
      }));

      setAllGames(mapped);
    } catch (e) {
      if (__DEV__) console.log('AdminGameDay fetchData error:', e);
    } finally {
      setLoading(false);
    }
  }, [workingSeason?.id]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ---- Derived data ----
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const todaysGames = useMemo(
    () => allGames.filter((g) => g.event_date === todayStr),
    [allGames, todayStr]
  );

  const thisWeekGames = useMemo(() => {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;

    const upcoming = allGames.filter(
      (g) => g.event_date > todayStr && g.event_date <= weekEndStr
    );

    const grouped: Record<string, GameEvent[]> = {};
    for (const g of upcoming) {
      if (!grouped[g.event_date]) grouped[g.event_date] = [];
      grouped[g.event_date].push(g);
    }
    return grouped;
  }, [allGames, todayStr]);

  const missingStats = useMemo(
    () =>
      allGames.filter(
        (g) => g.game_result != null && (g.stats_entered === null || g.stats_entered === false)
      ),
    [allGames]
  );

  const teamRecords = useMemo(() => {
    const map: Record<string, TeamRecord> = {};
    for (const g of allGames) {
      if (!g.game_result) continue;
      if (!map[g.team_id]) {
        map[g.team_id] = {
          team_id: g.team_id,
          team_name: g.team_name,
          team_color: g.team_color,
          wins: 0,
          losses: 0,
          ties: 0,
        };
      }
      const rec = map[g.team_id];
      if (g.game_result === 'win') rec.wins++;
      else if (g.game_result === 'loss') rec.losses++;
      else if (g.game_result === 'tie') rec.ties++;
    }

    return Object.values(map).sort((a, b) => {
      const totalA = a.wins + a.losses + a.ties;
      const totalB = b.wins + b.losses + b.ties;
      const pctA = totalA > 0 ? a.wins / totalA : 0;
      const pctB = totalB > 0 ? b.wins / totalB : 0;
      return pctB - pctA;
    });
  }, [allGames]);

  const nextGame = useMemo(() => {
    if (todaysGames.length > 0) return null;
    return allGames.find((g) => g.event_date > todayStr) || null;
  }, [allGames, todaysGames, todayStr]);

  // ---- Live pulse animation ----
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const hasLive = todaysGames.some((g) => g.game_status === 'in_progress');
    if (hasLive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [todaysGames]);

  // ---- Status badge renderer ----
  const renderStatusBadge = (game: GameEvent) => {
    if (game.game_status === 'in_progress') {
      return (
        <View style={[s.statusBadge, { backgroundColor: colors.success + '25' }]}>
          <Animated.View
            style={[s.liveDot, { backgroundColor: colors.success, opacity: pulseAnim }]}
          />
          <Text style={[s.statusText, { color: colors.success }]}>LIVE</Text>
          {game.our_score != null && game.opponent_score != null && (
            <Text style={[s.statusScore, { color: colors.success }]}>
              {game.our_score} - {game.opponent_score}
            </Text>
          )}
        </View>
      );
    }
    if (game.game_status === 'completed' || game.game_result) {
      return (
        <View style={[s.statusBadge, { backgroundColor: colors.info + '25' }]}>
          <Text style={[s.statusText, { color: colors.info }]}>Final</Text>
          {game.our_score != null && game.opponent_score != null && (
            <Text style={[s.statusScore, { color: colors.info }]}>
              {game.our_score}-{game.opponent_score}
            </Text>
          )}
        </View>
      );
    }
    return (
      <View style={[s.statusBadge, { backgroundColor: colors.textMuted + '20' }]}>
        <Text style={[s.statusText, { color: colors.textMuted }]}>Scheduled</Text>
      </View>
    );
  };

  // ---- Render ----
  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <AdminContextBar />
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const weekDates = Object.keys(thisWeekGames).sort();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <AdminContextBar />
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Game Day Operations</Text>
            <Text style={s.subtitle}>{formatDate(todayStr)}</Text>
          </View>
        </View>

        {/* Today's Games */}
        {todaysGames.length > 0 ? (
          <>
            <Text style={s.sectionLabel}>
              TODAY'S GAMES{' '}
              <Text style={{ color: colors.primary }}>({todaysGames.length})</Text>
            </Text>
            {todaysGames.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={s.gameCard}
                activeOpacity={0.7}
                onPress={() => router.push('/game-prep' as any)}
              >
                <View
                  style={[
                    s.colorBar,
                    { backgroundColor: game.team_color || colors.primary },
                  ]}
                />
                <View style={s.gameCardBody}>
                  <View style={s.gameCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.teamName}>{game.team_name}</Text>
                      <Text style={s.matchup}>
                        vs{' '}
                        <Text style={s.opponentName}>
                          {game.opponent_name || 'TBD'}
                        </Text>
                      </Text>
                    </View>
                    {renderStatusBadge(game)}
                  </View>
                  <View style={s.gameCardBottom}>
                    {game.event_time ? (
                      <Text style={s.gameTime}>{formatTime(game.event_time)}</Text>
                    ) : null}
                    {(game.venue_name || game.venue_address || game.location) ? (
                      <TouchableOpacity
                        style={s.venueRow}
                        onPress={() => openDirections(game)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="map-outline"
                          size={13}
                          color={colors.primary}
                        />
                        <Text style={s.venueName} numberOfLines={1}>
                          {game.venue_name || game.venue_address || game.location}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <Text style={s.sectionLabel}>TODAY'S GAMES</Text>
            <View style={s.emptyCard}>
              <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
              <Text style={s.emptyTitle}>No games today</Text>
              {nextGame && (
                <Text style={s.emptySubtitle}>
                  Next game: {nextGame.team_name} vs{' '}
                  {nextGame.opponent_name || 'TBD'} on{' '}
                  {formatDate(nextGame.event_date)}
                  {nextGame.event_time
                    ? ` at ${formatTime(nextGame.event_time)}`
                    : ''}
                </Text>
              )}
            </View>
          </>
        )}

        {/* This Week */}
        {weekDates.length > 0 && (
          <>
            <Text style={s.sectionLabel}>THIS WEEK</Text>
            {weekDates.map((dateStr) => (
              <View key={dateStr} style={{ marginBottom: 12 }}>
                <Text style={s.dayHeader}>{formatDayHeader(dateStr)}</Text>
                {thisWeekGames[dateStr].map((game) => (
                  <View key={game.id} style={s.compactCard}>
                    <View
                      style={[
                        s.compactColorBar,
                        { backgroundColor: game.team_color || colors.primary },
                      ]}
                    />
                    <View style={s.compactBody}>
                      <Text style={s.compactTeam} numberOfLines={1}>
                        {game.team_name}
                      </Text>
                      <Text style={s.compactVs}>vs</Text>
                      <Text style={s.compactOpponent} numberOfLines={1}>
                        {game.opponent_name || 'TBD'}
                      </Text>
                      {game.event_time ? (
                        <Text style={s.compactTime}>
                          {formatTime(game.event_time)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Missing Stats */}
        {missingStats.length > 0 && (
          <>
            <Text style={s.sectionLabel}>
              <Ionicons name="warning-outline" size={12} color={colors.warning} />{' '}
              MISSING STATS{' '}
              <Text style={{ color: colors.warning }}>({missingStats.length})</Text>
            </Text>
            {missingStats.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={s.warningCard}
                activeOpacity={0.7}
                onPress={() => router.push('/game-prep' as any)}
              >
                <View
                  style={[s.colorBar, { backgroundColor: colors.warning }]}
                />
                <View style={s.warningCardBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.warningTeamName}>
                      {game.team_name}{' '}
                      <Text style={s.warningVs}>
                        vs {game.opponent_name || 'TBD'}
                      </Text>
                    </Text>
                    <Text style={s.warningDate}>
                      {formatDate(game.event_date)}
                    </Text>
                  </View>
                  <Text style={s.warningLabel}>Stats not entered</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Season Scoreboard */}
        {teamRecords.length > 0 && (
          <>
            <Text style={s.sectionLabel}>SEASON SCOREBOARD</Text>
            {teamRecords.map((rec) => {
              const total = rec.wins + rec.losses + rec.ties;
              const winPct = total > 0 ? (rec.wins / total) * 100 : 0;
              const barColor =
                winPct >= 66 ? colors.success : winPct >= 33 ? colors.warning : colors.textMuted;

              return (
                <View key={rec.team_id} style={s.scoreboardCard}>
                  <View
                    style={[
                      s.colorBar,
                      { backgroundColor: rec.team_color || colors.primary },
                    ]}
                  />
                  <View style={s.scoreboardBody}>
                    <View style={s.scoreboardTop}>
                      <Text style={s.scoreboardTeam}>{rec.team_name}</Text>
                      <Text style={[s.scoreboardPct, { color: barColor }]}>
                        {winPct.toFixed(0)}%
                      </Text>
                    </View>
                    <Text style={s.scoreboardRecord}>
                      {rec.wins}W - {rec.losses}L - {rec.ties}T
                    </Text>
                    <View style={s.progressTrack}>
                      <View
                        style={[
                          s.progressFill,
                          {
                            width: `${Math.max(winPct, 2)}%`,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 120 }} />
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
    scroll: {
      flex: 1,
      paddingHorizontal: 16,
    },

    // Header
    header: {
      paddingHorizontal: 0,
      paddingVertical: 12,
    },
    title: {
      fontSize: 28,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
      marginTop: 2,
    },

    // Section label
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 24,
      marginBottom: 12,
      marginLeft: 4,
    },

    // Game card (today's games)
    gameCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      overflow: 'hidden',
      flexDirection: 'row',
      marginBottom: 12,
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
    colorBar: {
      width: 4,
      borderTopLeftRadius: 16,
      borderBottomLeftRadius: 16,
    },
    gameCardBody: {
      flex: 1,
      padding: 14,
    },
    gameCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    teamName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    matchup: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    opponentName: {
      fontWeight: '600',
      color: colors.text,
    },
    gameCardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      gap: 12,
    },
    gameTime: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    venueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flex: 1,
    },
    venueName: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500',
      flex: 1,
    },

    // Status badges
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      gap: 6,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    statusScore: {
      fontSize: 12,
      fontWeight: '700',
    },

    // Empty state
    emptyCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 28,
      alignItems: 'center',
      gap: 8,
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
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
    },

    // Day header (this week)
    dayHeader: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
      marginLeft: 4,
    },

    // Compact card (this week)
    compactCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 12,
      overflow: 'hidden',
      flexDirection: 'row',
      marginBottom: 8,
    },
    compactColorBar: {
      width: 4,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
    },
    compactBody: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 6,
    },
    compactTeam: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      maxWidth: '30%',
    },
    compactVs: {
      fontSize: 12,
      color: colors.textMuted,
    },
    compactOpponent: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      flex: 1,
    },
    compactTime: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },

    // Warning / missing stats cards
    warningCard: {
      backgroundColor: colors.warning + '15',
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      overflow: 'hidden',
      flexDirection: 'row',
      marginBottom: 10,
    },
    warningCardBody: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
    },
    warningTeamName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    warningVs: {
      fontWeight: '500',
      color: colors.textSecondary,
    },
    warningDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    warningLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.warning,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    // Scoreboard
    scoreboardCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      overflow: 'hidden',
      flexDirection: 'row',
      marginBottom: 10,
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
    scoreboardBody: {
      flex: 1,
      padding: 14,
    },
    scoreboardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    scoreboardTeam: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    scoreboardPct: {
      fontSize: 16,
      fontWeight: '800',
    },
    scoreboardRecord: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 4,
    },
    progressTrack: {
      height: 6,
      backgroundColor: colors.glassBorder,
      borderRadius: 3,
      marginTop: 10,
      overflow: 'hidden',
    },
    progressFill: {
      height: 6,
      borderRadius: 3,
    },
  });
