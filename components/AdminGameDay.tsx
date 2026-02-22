import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Linking, Platform,
  RefreshControl, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { displayTextStyle, radii, shadows } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import AdminContextBar from './AdminContextBar';
import AppHeaderBar from './ui/AppHeaderBar';
import Badge from './ui/Badge';
import Card from './ui/Card';
import SectionHeader from './ui/SectionHeader';
import StatBox from './ui/StatBox';

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

  // ---- Derived stats for overview ----
  const uniqueVenues = useMemo(() => {
    const venues = new Set<string>();
    todaysGames.forEach((g) => {
      const v = g.venue_name || g.location;
      if (v) venues.add(v);
    });
    return venues.size;
  }, [todaysGames]);

  const uniqueTeams = useMemo(() => {
    const teamIds = new Set<string>();
    todaysGames.forEach((g) => teamIds.add(g.team_id));
    return teamIds.size;
  }, [todaysGames]);

  // ---- Render ----
  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <AdminContextBar />
        <AppHeaderBar title="GAME DAY" showLogo={false} showNotificationBell={false} showAvatar={false} />
        <View style={{ marginHorizontal: 16, marginTop: 16, gap: 12 }}>
          <View style={{ height: 60, borderRadius: radii.card, backgroundColor: colors.bgSecondary }} />
          {[1, 2].map(i => (
            <View key={i} style={{ height: 90, borderRadius: radii.card, backgroundColor: colors.bgSecondary, opacity: 0.6 }} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  const weekDates = Object.keys(thisWeekGames).sort();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <AdminContextBar />
      <AppHeaderBar title="GAME DAY" showLogo={false} showNotificationBell={false} showAvatar={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ================================================================ */}
        {/* OVERVIEW STAT BOXES                                               */}
        {/* ================================================================ */}
        <View style={s.statRow}>
          <StatBox value={todaysGames.length} label="Games Today" accentColor="#14B8A6" />
          <StatBox value={uniqueTeams} label="Teams" accentColor="#2C5F7C" />
          <StatBox value={uniqueVenues} label="Venues" accentColor="#E8913A" />
        </View>

        {/* ================================================================ */}
        {/* TODAY'S GAMES                                                      */}
        {/* ================================================================ */}
        {todaysGames.length > 0 ? (
          <View style={s.sectionBlock}>
            <SectionHeader title={`Today's Games (${todaysGames.length})`} />
            {todaysGames.map((game) => (
              <Card
                key={game.id}
                accentColor={game.team_color || colors.primary}
                onPress={() => router.push('/game-prep' as any)}
                style={{ marginHorizontal: 16, marginBottom: 10 }}
              >
                <View style={s.gameCardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.teamName, { color: colors.text }]}>{game.team_name}</Text>
                    <Text style={[s.matchup, { color: colors.textSecondary }]}>
                      vs <Text style={{ fontWeight: '600', color: colors.text }}>{game.opponent_name || 'TBD'}</Text>
                    </Text>
                  </View>
                  {renderStatusBadge(game)}
                </View>
                <View style={s.gameCardMeta}>
                  {game.event_time ? (
                    <View style={s.metaRow}>
                      <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                      <Text style={[s.metaText, { color: colors.textMuted }]}>{formatTime(game.event_time)}</Text>
                    </View>
                  ) : null}
                  {(game.venue_name || game.venue_address || game.location) ? (
                    <TouchableOpacity
                      style={s.metaRow}
                      onPress={() => openDirections(game)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="map-outline" size={12} color={colors.primary} />
                      <Text style={[s.metaText, { color: colors.primary }]} numberOfLines={1}>
                        {game.venue_name || game.venue_address || game.location}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <View style={s.sectionBlock}>
            <SectionHeader title="Today's Games" />
            <Card style={{ marginHorizontal: 16 }}>
              <View style={s.emptyInner}>
                <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
                <Text style={[s.emptyTitle, { color: colors.text }]}>No games today</Text>
                {nextGame && (
                  <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
                    Next: {nextGame.team_name} vs {nextGame.opponent_name || 'TBD'} on {formatDate(nextGame.event_date)}
                    {nextGame.event_time ? ` at ${formatTime(nextGame.event_time)}` : ''}
                  </Text>
                )}
              </View>
            </Card>
          </View>
        )}

        {/* ================================================================ */}
        {/* THIS WEEK                                                         */}
        {/* ================================================================ */}
        {weekDates.length > 0 && (
          <View style={s.sectionBlock}>
            <SectionHeader title="This Week" />
            {weekDates.map((dateStr) => (
              <View key={dateStr} style={{ marginBottom: 10, paddingHorizontal: 16 }}>
                <Text style={[s.dayHeader, { color: colors.textSecondary }]}>{formatDayHeader(dateStr)}</Text>
                {thisWeekGames[dateStr].map((game) => (
                  <Card
                    key={game.id}
                    accentColor={game.team_color || colors.primary}
                    style={{ marginBottom: 6 }}
                  >
                    <View style={s.compactRow}>
                      <Text style={[s.compactTeam, { color: colors.text }]} numberOfLines={1}>{game.team_name}</Text>
                      <Text style={[s.compactVs, { color: colors.textMuted }]}>vs</Text>
                      <Text style={[s.compactOpponent, { color: colors.textSecondary }]} numberOfLines={1}>{game.opponent_name || 'TBD'}</Text>
                      {game.event_time ? (
                        <Text style={[s.compactTime, { color: colors.textMuted }]}>{formatTime(game.event_time)}</Text>
                      ) : null}
                    </View>
                  </Card>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ================================================================ */}
        {/* MISSING STATS                                                     */}
        {/* ================================================================ */}
        {missingStats.length > 0 && (
          <View style={s.sectionBlock}>
            <SectionHeader title={`Missing Stats (${missingStats.length})`} />
            {missingStats.map((game) => (
              <Card
                key={game.id}
                accentColor={colors.warning}
                onPress={() => router.push('/game-prep' as any)}
                style={{ marginHorizontal: 16, marginBottom: 8 }}
              >
                <View style={s.gameCardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.teamName, { color: colors.text }]}>
                      {game.team_name}
                    </Text>
                    <Text style={[s.matchup, { color: colors.textSecondary }]}>
                      vs {game.opponent_name || 'TBD'} {'\u00B7'} {formatDate(game.event_date)}
                    </Text>
                  </View>
                  <Badge label="NEEDS STATS" color={colors.warning} />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* ================================================================ */}
        {/* SEASON SCOREBOARD                                                 */}
        {/* ================================================================ */}
        {teamRecords.length > 0 && (
          <View style={s.sectionBlock}>
            <SectionHeader title="Season Scoreboard" />
            {teamRecords.map((rec) => {
              const total = rec.wins + rec.losses + rec.ties;
              const winPct = total > 0 ? (rec.wins / total) * 100 : 0;
              const barColor =
                winPct >= 66 ? '#22C55E' : winPct >= 33 ? '#E8913A' : colors.textMuted;

              return (
                <Card
                  key={rec.team_id}
                  accentColor={rec.team_color || colors.primary}
                  style={{ marginHorizontal: 16, marginBottom: 8 }}
                >
                  <View style={s.scoreboardTop}>
                    <Text style={[s.scoreboardTeam, { color: colors.text }]}>{rec.team_name}</Text>
                    <Text style={[s.scoreboardPct, { color: barColor }]}>
                      {winPct.toFixed(0)}%
                    </Text>
                  </View>
                  <Text style={[s.scoreboardRecord, { color: colors.textSecondary }]}>
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
                </Card>
              );
            })}
          </View>
        )}
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

    // Sections
    sectionBlock: {
      marginBottom: 8,
    },

    // Stat row
    statRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
    },

    // Game card content
    gameCardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    teamName: {
      ...displayTextStyle,
      fontSize: 15,
    },
    matchup: {
      fontSize: 13,
      marginTop: 2,
    },
    gameCardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      gap: 14,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      fontWeight: '500',
    },

    // Status badges
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.badge,
      gap: 5,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    statusScore: {
      fontSize: 12,
      fontWeight: '700',
    },

    // Empty state
    emptyInner: {
      alignItems: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    emptyTitle: {
      ...displayTextStyle,
      fontSize: 16,
    },
    emptySubtitle: {
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 19,
    },

    // Day header
    dayHeader: {
      ...displayTextStyle,
      fontSize: 13,
      marginBottom: 8,
    },

    // Compact row (this week)
    compactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    compactTeam: {
      fontSize: 14,
      fontWeight: '700',
      maxWidth: '30%',
    },
    compactVs: {
      fontSize: 12,
    },
    compactOpponent: {
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
    },
    compactTime: {
      fontSize: 12,
      fontWeight: '600',
    },

    // Scoreboard
    scoreboardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    scoreboardTeam: {
      ...displayTextStyle,
      fontSize: 15,
    },
    scoreboardPct: {
      ...displayTextStyle,
      fontSize: 16,
    },
    scoreboardRecord: {
      fontSize: 13,
      fontWeight: '500',
      marginTop: 4,
    },
    progressTrack: {
      height: 6,
      backgroundColor: colors.glassBorder,
      borderRadius: 3,
      marginTop: 10,
      overflow: 'hidden' as const,
    },
    progressFill: {
      height: 6,
      borderRadius: 3,
    },
  });
