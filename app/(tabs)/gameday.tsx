import EventDetailModal from '@/components/EventDetailModal';
import { ScheduleEvent } from '@/components/EventCard';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme, createGlassStyle } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Team = { id: string; name: string; color?: string };

// ─── Countdown Logic ───────────────────────────────────────
const getCountdown = (dateStr: string): { text: string; urgent: boolean } => {
  const eventDate = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return { text: 'TODAY', urgent: true };
  if (diffDays === 1) return { text: 'TOMORROW', urgent: true };
  if (diffDays <= 3) return { text: `IN ${diffDays} DAYS`, urgent: true };
  if (diffDays <= 7) return { text: `IN ${diffDays} DAYS`, urgent: false };
  return { text: `${diffDays} DAYS AWAY`, urgent: false };
};

// ─── Format Helpers ────────────────────────────────────────
const formatTime = (time: string | null | undefined): string => {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const h = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const formatEventDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatFullDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateHeader = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateStr === today.toISOString().split('T')[0]) return 'Today';
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

// ─── Event Type Config ─────────────────────────────────────
const eventTypeConfig: Record<string, { icon: string; color: string; label: string }> = {
  game: { icon: 'trophy', color: '#FF6B6B', label: 'Game' },
  practice: { icon: 'fitness', color: '#4ECDC4', label: 'Practice' },
  event: { icon: 'calendar', color: '#96CEB4', label: 'Event' },
  tournament: { icon: 'medal', color: '#FFB347', label: 'Tournament' },
  other: { icon: 'calendar', color: '#5AC8FA', label: 'Other' },
};

const locationTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
  home: { label: 'HOME', color: '#10B981', icon: 'home' },
  away: { label: 'AWAY', color: '#EF4444', icon: 'airplane' },
  neutral: { label: 'NEUTRAL', color: '#0EA5E9', icon: 'location' },
};

// ═══════════════════════════════════════════════════════════
// GAME DAY SCREEN
// ═══════════════════════════════════════════════════════════
export default function GameDayScreen() {
  const { colors } = useTheme();
  const { workingSeason } = useSeason();
  const { user, profile } = useAuth();
  const { isAdmin, isCoach } = usePermissions();
  const router = useRouter();

  const isCoachOrAdmin = isAdmin || isCoach;

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const s = useMemo(() => createStyles(colors), [colors]);
  const glassCard = useMemo(() => createGlassStyle(colors), [colors]);

  // ─── Data Fetching ─────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!workingSeason?.id) return;
    setLoading(true);

    try {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, color')
        .eq('season_id', workingSeason.id);

      if (teamsData) setTeams(teamsData);

      const { data: eventsData, error } = await supabase
        .from('schedule_events')
        .select('*')
        .eq('season_id', workingSeason.id)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });

      if (error) throw error;

      let eventsWithExtras: ScheduleEvent[] = [];

      try {
        const eventIds = (eventsData || []).map((e: any) => e.id);
        const eventTeamIds = [...new Set((eventsData || []).map((e: any) => e.team_id).filter(Boolean))];

        // Batch: fetch all RSVPs for all events at once
        const { data: allRsvps } = eventIds.length > 0
          ? await supabase.from('event_rsvps').select('event_id, status').in('event_id', eventIds)
          : { data: [] };

        // Batch: fetch all team player counts at once
        const { data: allTeamPlayers } = eventTeamIds.length > 0
          ? await supabase.from('team_players').select('team_id').in('team_id', eventTeamIds)
          : { data: [] };

        // Build lookup maps
        const rsvpMap = new Map<string, any[]>();
        for (const r of (allRsvps || [])) {
          if (!rsvpMap.has(r.event_id)) rsvpMap.set(r.event_id, []);
          rsvpMap.get(r.event_id)!.push(r);
        }

        const teamPlayerCountMap = new Map<string, number>();
        for (const tp of (allTeamPlayers || [])) {
          teamPlayerCountMap.set(tp.team_id, (teamPlayerCountMap.get(tp.team_id) || 0) + 1);
        }

        eventsWithExtras = (eventsData || []).map((event: any) => {
          const rsvps = rsvpMap.get(event.id) || [];
          const yesCount = rsvps.filter((r: any) => r.status === 'yes').length;
          const noCount = rsvps.filter((r: any) => r.status === 'no').length;
          const maybeCount = rsvps.filter((r: any) => r.status === 'maybe').length;
          const totalPlayers = teamPlayerCountMap.get(event.team_id) || 0;
          const pendingCount = Math.max(0, totalPlayers - yesCount - noCount - maybeCount);

          const team = teamsData?.find((t: Team) => t.id === event.team_id);

          return {
            ...event,
            start_time: event.event_time,
            duration_minutes: (event.duration_hours || 1.5) * 60,
            team_name: team?.name,
            team_color: team?.color,
            rsvp_count: { yes: yesCount, no: noCount, maybe: maybeCount, pending: pendingCount },
          } as ScheduleEvent;
        });
      } catch {
        eventsWithExtras = (eventsData || []).map((event: any) => {
          const team = teamsData?.find((t: Team) => t.id === event.team_id);
          return {
            ...event,
            start_time: event.event_time,
            duration_minutes: (event.duration_hours || 1.5) * 60,
            team_name: team?.name,
            team_color: team?.color,
          } as ScheduleEvent;
        });
      }

      setEvents(eventsWithExtras);
    } catch (error) {
      if (__DEV__) console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to load game day data');
    }

    setLoading(false);
  }, [workingSeason?.id]);

  useEffect(() => {
    if (workingSeason?.id) fetchData();
  }, [workingSeason?.id, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ─── Derived Data ──────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingEvents = useMemo(
    () => events.filter((e) => e.event_date >= todayStr),
    [events, todayStr]
  );

  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  // This week: next 7 days
  const thisWeekEvents = useMemo(() => {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    // Skip the first event (hero card) for thisWeek section
    return upcomingEvents.filter(
      (e) => e.event_date >= todayStr && e.event_date <= weekEndStr && e.id !== nextEvent?.id
    );
  }, [upcomingEvents, todayStr, nextEvent]);

  // Upcoming 30 days (all future events, capped at 10)
  const allUpcomingEvents = useMemo(() => {
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    const endStr = thirtyDaysOut.toISOString().split('T')[0];
    const thisWeekIds = new Set(thisWeekEvents.map(e => e.id));
    return upcomingEvents.filter((e) => e.event_date <= endStr && e.id !== nextEvent?.id && !thisWeekIds.has(e.id));
  }, [upcomingEvents, nextEvent, thisWeekEvents]);

  // Group upcoming by date
  const groupedUpcoming = useMemo(() => {
    const groups: Record<string, ScheduleEvent[]> = {};
    const displayEvents = allUpcomingEvents.slice(0, 10);
    displayEvents.forEach((e) => {
      if (!groups[e.event_date]) groups[e.event_date] = [];
      groups[e.event_date].push(e);
    });
    return groups;
  }, [allUpcomingEvents]);

  // Season progress: games only
  const seasonStats = useMemo(() => {
    const games = events.filter((e) => e.event_type === 'game');
    const completed = games.filter(
      (g) =>
        g.our_score !== null &&
        g.our_score !== undefined &&
        g.opponent_score !== null &&
        g.opponent_score !== undefined
    );
    const wins = completed.filter((g) => g.our_score! > g.opponent_score!).length;
    const losses = completed.filter((g) => g.our_score! < g.opponent_score!).length;
    const winPct = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0;
    return {
      totalGames: games.length,
      completedGames: completed.length,
      wins,
      losses,
      winPct,
    };
  }, [events]);

  // ─── Handlers ──────────────────────────────────────────
  const handleEventPress = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const openDirections = (event: ScheduleEvent) => {
    const address = encodeURIComponent(
      event.venue_address || event.venue_name || event.location || ''
    );
    const url =
      Platform.OS === 'ios' ? `maps:?q=${address}` : `geo:0,0?q=${address}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
    });
  };

  // ─── No Season State ──────────────────────────────────
  if (!workingSeason) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.emptyCenter}>
          <Ionicons name="flash-outline" size={64} color={colors.textMuted} />
          <Text style={[s.emptyTitle, { color: colors.textMuted }]}>No season selected</Text>
          <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
            Select a season to see your Game Day dashboard
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Loading State ─────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.emptyCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <SafeAreaView style={s.container}>
      {/* ─── HEADER ─────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={[s.heroTitle, { color: colors.text }]}>Game Day</Text>
          <Text style={[s.seasonSubtitle, { color: colors.primary }]}>
            {workingSeason.name}
          </Text>
        </View>
        <TouchableOpacity
          style={s.scheduleBtn}
          onPress={() => router.push('/(tabs)/schedule' as any)}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={[s.scheduleBtnText, { color: colors.primary }]}>Full Schedule</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={s.scrollContent}
      >
        {/* ─── NEXT EVENT -- HERO CARD ───────────────── */}
        {nextEvent ? (
          <View style={s.section}>
            {nextEvent.event_type === 'game' ? (
              // ───── GAME HERO ─────
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleEventPress(nextEvent)}
                style={[glassCard, s.heroCard]}
              >
                {/* Team accent bar */}
                <View
                  style={[
                    s.accentBar,
                    { backgroundColor: nextEvent.team_color || colors.primary },
                  ]}
                />

                <View style={s.heroContent}>
                  {/* Top row: badge + location type */}
                  <View style={s.heroTopRow}>
                    <Text style={[s.gameDayLabel, { color: colors.primary }]}>GAME DAY</Text>
                    {nextEvent.location_type && locationTypeConfig[nextEvent.location_type] && (
                      <View
                        style={[
                          s.locationBadge,
                          {
                            backgroundColor:
                              locationTypeConfig[nextEvent.location_type].color + '20',
                          },
                        ]}
                      >
                        <Ionicons
                          name={locationTypeConfig[nextEvent.location_type].icon as any}
                          size={12}
                          color={locationTypeConfig[nextEvent.location_type].color}
                        />
                        <Text
                          style={[
                            s.locationBadgeText,
                            { color: locationTypeConfig[nextEvent.location_type].color },
                          ]}
                        >
                          {locationTypeConfig[nextEvent.location_type].label}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Countdown */}
                  {(() => {
                    const countdown = getCountdown(nextEvent.event_date);
                    return (
                      <Text
                        style={[
                          s.countdownText,
                          {
                            color: countdown.urgent ? colors.primary : colors.text,
                          },
                        ]}
                      >
                        {countdown.text}
                      </Text>
                    );
                  })()}

                  {/* Opponent */}
                  {(nextEvent.opponent_name || nextEvent.opponent) && (
                    <Text style={[s.opponentText, { color: colors.text }]}>
                      vs {nextEvent.opponent_name || nextEvent.opponent}
                    </Text>
                  )}

                  {/* Date + Time + Venue */}
                  <View style={s.heroDetails}>
                    <View style={s.heroDetailRow}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                      <Text style={[s.heroDetailText, { color: colors.textMuted }]}>
                        {formatFullDate(nextEvent.event_date)}
                      </Text>
                    </View>
                    <View style={s.heroDetailRow}>
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      <Text style={[s.heroDetailText, { color: colors.textMuted }]}>
                        {formatTime(nextEvent.start_time)}
                        {nextEvent.end_time ? ` - ${formatTime(nextEvent.end_time)}` : ''}
                      </Text>
                    </View>
                    {(nextEvent.venue_name || nextEvent.location) && (
                      <View style={s.heroDetailRow}>
                        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                        <Text
                          style={[s.heroDetailText, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {nextEvent.venue_name || nextEvent.location}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={s.heroActions}>
                    {isCoachOrAdmin && (
                      <TouchableOpacity
                        style={[s.heroActionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => {
                          router.push('/lineup-builder' as any);
                        }}
                      >
                        <Ionicons name="grid-outline" size={16} color="#fff" />
                        <Text style={s.heroActionBtnTextLight}>Prep Lineup</Text>
                      </TouchableOpacity>
                    )}
                    {(nextEvent.venue_address || nextEvent.venue_name || nextEvent.location) && (
                      <TouchableOpacity
                        style={[
                          s.heroActionBtn,
                          {
                            backgroundColor: colors.primary + '15',
                            borderWidth: 1,
                            borderColor: colors.primary + '30',
                          },
                        ]}
                        onPress={() => openDirections(nextEvent)}
                      >
                        <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                        <Text style={[s.heroActionBtnTextDark, { color: colors.primary }]}>
                          Get Directions
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              // ───── PRACTICE / EVENT HERO ─────
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleEventPress(nextEvent)}
                style={[glassCard, s.heroCard]}
              >
                <View
                  style={[
                    s.accentBar,
                    {
                      backgroundColor:
                        eventTypeConfig[nextEvent.event_type]?.color || '#4ECDC4',
                    },
                  ]}
                />
                <View style={s.heroContent}>
                  <Text
                    style={[
                      s.practiceLabel,
                      {
                        color:
                          eventTypeConfig[nextEvent.event_type]?.color || '#4ECDC4',
                      },
                    ]}
                  >
                    {(eventTypeConfig[nextEvent.event_type]?.label || 'Event').toUpperCase()}
                  </Text>

                  {(() => {
                    const countdown = getCountdown(nextEvent.event_date);
                    return (
                      <Text
                        style={[
                          s.practiceCountdown,
                          { color: countdown.urgent ? colors.text : colors.textMuted },
                        ]}
                      >
                        {countdown.text}
                      </Text>
                    );
                  })()}

                  <Text style={[s.practiceTitle, { color: colors.text }]} numberOfLines={1}>
                    {nextEvent.title}
                  </Text>

                  <View style={s.heroDetails}>
                    <View style={s.heroDetailRow}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                      <Text style={[s.heroDetailText, { color: colors.textMuted }]}>
                        {formatEventDate(nextEvent.event_date)}
                      </Text>
                    </View>
                    <View style={s.heroDetailRow}>
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      <Text style={[s.heroDetailText, { color: colors.textMuted }]}>
                        {formatTime(nextEvent.start_time)}
                      </Text>
                    </View>
                    {(nextEvent.venue_name || nextEvent.location) && (
                      <View style={s.heroDetailRow}>
                        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                        <Text
                          style={[s.heroDetailText, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {nextEvent.venue_name || nextEvent.location}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          // ───── NO UPCOMING EVENTS ─────
          <View style={s.section}>
            <View style={[glassCard, s.emptyHero]}>
              <Ionicons name="sunny-outline" size={48} color={colors.textMuted} />
              <Text style={[s.emptyHeroTitle, { color: colors.text }]}>No upcoming events</Text>
              <Text style={[s.emptyHeroSubtitle, { color: colors.textMuted }]}>
                Enjoy the break! Check back when new events are scheduled.
              </Text>
            </View>
          </View>
        )}

        {/* ─── THIS WEEK ────────────────────────────── */}
        {thisWeekEvents.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>THIS WEEK</Text>
            {thisWeekEvents.map((event) => {
              const typeConf = eventTypeConfig[event.event_type] || eventTypeConfig.other;
              const rsvp = event.rsvp_count;
              return (
                <TouchableOpacity
                  key={event.id}
                  activeOpacity={0.8}
                  onPress={() => handleEventPress(event)}
                  style={[glassCard, s.weekCard]}
                >
                  {/* Left color bar */}
                  <View style={[s.weekColorBar, { backgroundColor: typeConf.color }]} />

                  <View style={s.weekCardContent}>
                    <View style={s.weekCardTop}>
                      <View style={s.weekCardIcon}>
                        <Ionicons name={typeConf.icon as any} size={18} color={typeConf.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.weekCardTitle, { color: colors.text }]} numberOfLines={1}>
                          {event.title}
                        </Text>
                        {(event.opponent_name || event.opponent) && (
                          <Text style={[s.weekCardOpponent, { color: colors.textMuted }]}>
                            vs {event.opponent_name || event.opponent}
                          </Text>
                        )}
                      </View>
                      {event.event_type === 'game' &&
                        event.location_type &&
                        locationTypeConfig[event.location_type] && (
                          <View
                            style={[
                              s.weekLocBadge,
                              {
                                backgroundColor:
                                  locationTypeConfig[event.location_type].color + '20',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                s.weekLocBadgeText,
                                {
                                  color: locationTypeConfig[event.location_type].color,
                                },
                              ]}
                            >
                              {locationTypeConfig[event.location_type].label}
                            </Text>
                          </View>
                        )}
                    </View>

                    <View style={s.weekCardBottom}>
                      <View style={s.weekCardMeta}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                        <Text style={[s.weekCardMetaText, { color: colors.textMuted }]}>
                          {formatEventDate(event.event_date)}
                        </Text>
                      </View>
                      <View style={s.weekCardMeta}>
                        <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                        <Text style={[s.weekCardMetaText, { color: colors.textMuted }]}>
                          {formatTime(event.start_time)}
                        </Text>
                      </View>
                    </View>

                    {/* RSVP counts */}
                    {rsvp && (
                      <View style={[s.rsvpRow, { borderTopColor: colors.glassBorder }]}>
                        <Text style={{ color: '#4ECDC4', fontSize: 12, fontWeight: '600' }}>
                          {rsvp.yes} going
                        </Text>
                        {rsvp.maybe > 0 && (
                          <Text style={{ color: '#FFB347', fontSize: 12 }}>
                            {rsvp.maybe} maybe
                          </Text>
                        )}
                        {rsvp.pending > 0 && (
                          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                            {rsvp.pending} pending
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ─── SEASON OVERVIEW ──────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>SEASON</Text>
          <View style={s.overviewRow}>
            <TouchableOpacity
              style={[glassCard, s.overviewCard]}
              activeOpacity={0.8}
              onPress={() => router.push('/standings' as any)}
            >
              <Ionicons name="trophy-outline" size={28} color={colors.primary} />
              <Text style={[s.overviewCardLabel, { color: colors.text }]}>Standings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[glassCard, s.overviewCard]}
              activeOpacity={0.8}
              onPress={() => router.push('/season-archives' as any)}
            >
              <Ionicons name="archive-outline" size={28} color={colors.primary} />
              <Text style={[s.overviewCardLabel, { color: colors.text }]}>Season History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SEASON PROGRESS ──────────────────────── */}
        {seasonStats.totalGames > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>PROGRESS</Text>
            <View style={[glassCard, s.progressCard]}>
              {/* Progress bar */}
              <View style={s.progressBarContainer}>
                <View style={[s.progressBarBg, { backgroundColor: colors.glassBorder }]}>
                  <View
                    style={[
                      s.progressBarFill,
                      {
                        backgroundColor: colors.primary,
                        width:
                          seasonStats.totalGames > 0
                            ? `${(seasonStats.completedGames / seasonStats.totalGames) * 100}%`
                            : '0%',
                      },
                    ]}
                  />
                </View>
                <Text style={[s.progressLabel, { color: colors.textMuted }]}>
                  Game {seasonStats.completedGames} of {seasonStats.totalGames}
                </Text>
              </View>

              {/* Stats row */}
              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: '#10B981' }]}>
                    {seasonStats.wins}
                  </Text>
                  <Text style={[s.statLabel, { color: colors.textMuted }]}>Won</Text>
                </View>
                <View style={[s.statDivider, { backgroundColor: colors.glassBorder }]} />
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: '#EF4444' }]}>
                    {seasonStats.losses}
                  </Text>
                  <Text style={[s.statLabel, { color: colors.textMuted }]}>Lost</Text>
                </View>
                <View style={[s.statDivider, { backgroundColor: colors.glassBorder }]} />
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: colors.primary }]}>
                    {seasonStats.winPct}%
                  </Text>
                  <Text style={[s.statLabel, { color: colors.textMuted }]}>Win %</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ─── ALL UPCOMING ─────────────────────────── */}
        {Object.keys(groupedUpcoming).length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>UPCOMING</Text>
            {Object.keys(groupedUpcoming)
              .sort()
              .map((dateKey) => (
                <View key={dateKey} style={s.upcomingDateGroup}>
                  <Text style={[s.dateGroupHeader, { color: colors.text }]}>
                    {formatDateHeader(dateKey)}
                  </Text>
                  {groupedUpcoming[dateKey].map((event) => {
                    const typeConf =
                      eventTypeConfig[event.event_type] || eventTypeConfig.other;
                    return (
                      <TouchableOpacity
                        key={event.id}
                        activeOpacity={0.8}
                        onPress={() => handleEventPress(event)}
                        style={[
                          s.compactCard,
                          {
                            backgroundColor: colors.glassCard,
                            borderColor: colors.glassBorder,
                          },
                        ]}
                      >
                        <View
                          style={[s.compactIcon, { backgroundColor: typeConf.color + '20' }]}
                        >
                          <Ionicons
                            name={typeConf.icon as any}
                            size={16}
                            color={typeConf.color}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[s.compactTitle, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {event.title}
                          </Text>
                          <Text style={[s.compactMeta, { color: colors.textMuted }]}>
                            {formatTime(event.start_time)}
                            {event.venue_name || event.location
                              ? ` \u00B7 ${event.venue_name || event.location}`
                              : ''}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={colors.textMuted}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            {allUpcomingEvents.length > 10 && (
              <TouchableOpacity
                style={s.viewAllBtn}
                onPress={() => router.push('/(tabs)/schedule' as any)}
              >
                <Text style={[s.viewAllBtnText, { color: colors.primary }]}>
                  View Full Schedule
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ─── RECENT RESULTS ─────────────────────────── */}
        {(() => {
          const completedGames = events.filter(
            (e) =>
              e.event_type === 'game' &&
              e.event_date < todayStr &&
              e.our_score != null &&
              e.opponent_score != null
          ).slice(-5).reverse();

          if (completedGames.length === 0) return null;

          return (
            <View style={s.section}>
              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>RECENT RESULTS</Text>
              {completedGames.map((game) => {
                const won = (game.our_score ?? 0) > (game.opponent_score ?? 0);
                const team = teams.find((t) => t.id === game.team_id);
                return (
                  <TouchableOpacity
                    key={game.id}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/game-results?eventId=${game.id}` as any)}
                    style={[
                      s.compactCard,
                      {
                        backgroundColor: colors.glassCard,
                        borderColor: colors.glassBorder,
                      },
                    ]}
                  >
                    <View style={[s.compactIcon, { backgroundColor: (won ? '#10B981' : '#EF4444') + '20' }]}>
                      <Ionicons
                        name={won ? 'trophy' : 'close-circle'}
                        size={16}
                        color={won ? '#10B981' : '#EF4444'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.compactTitle, { color: colors.text }]} numberOfLines={1}>
                        vs {game.opponent_name || game.opponent || 'TBD'}
                      </Text>
                      <Text style={[s.compactMeta, { color: colors.textMuted }]}>
                        {formatEventDate(game.event_date)}
                        {team ? ` · ${team.name}` : ''}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: won ? '#10B981' : '#EF4444', marginRight: 8 }}>
                      {game.our_score} - {game.opponent_score}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })()}

        {/* ─── COACH TOOLS ──────────────────────────── */}
        {isCoachOrAdmin && (
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>COACH TOOLS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.coachToolsScroll}
            >
              <TouchableOpacity
                style={[glassCard, s.coachToolCard]}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/schedule' as any)}
              >
                <View style={[s.coachToolIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="add" size={24} color={colors.primary} />
                </View>
                <Text style={[s.coachToolLabel, { color: colors.text }]}>Add Event</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[glassCard, s.coachToolCard]}
                activeOpacity={0.8}
                onPress={() => router.push('/attendance' as any)}
              >
                <View style={[s.coachToolIcon, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
                </View>
                <Text style={[s.coachToolLabel, { color: colors.text }]}>Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[glassCard, s.coachToolCard]}
                activeOpacity={0.8}
                onPress={() => router.push('/lineup-builder' as any)}
              >
                <View style={[s.coachToolIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Ionicons name="grid-outline" size={24} color="#8B5CF6" />
                </View>
                <Text style={[s.coachToolLabel, { color: colors.text }]}>Lineup</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[glassCard, s.coachToolCard]}
                activeOpacity={0.8}
                onPress={() => router.push('/game-prep' as any)}
              >
                <View style={[s.coachToolIcon, { backgroundColor: '#FF6B6B20' }]}>
                  <Ionicons name="analytics-outline" size={24} color="#FF6B6B" />
                </View>
                <Text style={[s.coachToolLabel, { color: colors.text }]}>Game Prep</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Bottom padding for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ─── EVENT DETAIL MODAL ─────────────────────── */}
      <EventDetailModal
        visible={showEventModal}
        event={selectedEvent}
        onClose={() => setShowEventModal(false)}
        onGamePrep={(event: any) => router.push('/game-prep' as any)}
        onRefresh={fetchData}
        isCoachOrAdmin={isCoachOrAdmin}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },

    // ─── Header ──────────────────────────────────
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    seasonSubtitle: {
      fontSize: 14,
      fontWeight: '600',
      marginTop: 2,
    },
    scheduleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.primary + '15',
    },
    scheduleBtnText: {
      fontSize: 13,
      fontWeight: '600',
    },

    scrollContent: {
      paddingHorizontal: 20,
    },

    // ─── Sections ────────────────────────────────
    section: {
      marginBottom: 28,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 14,
    },

    // ─── Hero Card ───────────────────────────────
    heroCard: {
      overflow: 'hidden',
      flexDirection: 'row',
    },
    accentBar: {
      width: 5,
    },
    heroContent: {
      flex: 1,
      padding: 20,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    gameDayLabel: {
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: 1,
    },
    locationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      gap: 4,
    },
    locationBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    countdownText: {
      fontSize: 36,
      fontWeight: '900',
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    opponentText: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 12,
    },
    heroDetails: {
      gap: 6,
      marginBottom: 16,
    },
    heroDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    heroDetailText: {
      fontSize: 14,
      lineHeight: 20,
    },
    heroActions: {
      flexDirection: 'row',
      gap: 10,
    },
    heroActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      gap: 6,
    },
    heroActionBtnTextLight: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    heroActionBtnTextDark: {
      fontSize: 14,
      fontWeight: '700',
    },

    // ─── Practice Hero ───────────────────────────
    practiceLabel: {
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: 1,
      marginBottom: 4,
    },
    practiceCountdown: {
      fontSize: 28,
      fontWeight: '800',
      marginBottom: 4,
    },
    practiceTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },

    // ─── Empty Hero ──────────────────────────────
    emptyHero: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyHeroTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginTop: 14,
    },
    emptyHeroSubtitle: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 20,
    },

    // ─── This Week Cards ─────────────────────────
    weekCard: {
      overflow: 'hidden',
      flexDirection: 'row',
      marginBottom: 10,
    },
    weekColorBar: {
      width: 4,
    },
    weekCardContent: {
      flex: 1,
      padding: 14,
    },
    weekCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    weekCardIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.card,
    },
    weekCardTitle: {
      fontSize: 15,
      fontWeight: '700',
    },
    weekCardOpponent: {
      fontSize: 13,
      marginTop: 1,
    },
    weekLocBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 5,
    },
    weekLocBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    weekCardBottom: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 8,
    },
    weekCardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    weekCardMetaText: {
      fontSize: 12,
    },
    rsvpRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
    },
    quietWeek: {
      padding: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    quietWeekText: {
      fontSize: 15,
    },

    // ─── Season Overview ─────────────────────────
    overviewRow: {
      flexDirection: 'row',
      gap: 12,
    },
    overviewCard: {
      flex: 1,
      paddingVertical: 22,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    overviewCardLabel: {
      fontSize: 14,
      fontWeight: '700',
    },

    // ─── Season Progress ─────────────────────────
    progressCard: {
      padding: 20,
    },
    progressBarContainer: {
      marginBottom: 20,
    },
    progressBarBg: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 28,
      fontWeight: '800',
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statDivider: {
      width: 1,
      height: 36,
    },

    // ─── Upcoming All ────────────────────────────
    upcomingDateGroup: {
      marginBottom: 16,
    },
    dateGroupHeader: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 8,
    },
    compactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 6,
      gap: 10,
    },
    compactIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    compactTitle: {
      fontSize: 14,
      fontWeight: '600',
    },
    compactMeta: {
      fontSize: 12,
      marginTop: 2,
    },
    viewAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
    },
    viewAllBtnText: {
      fontSize: 14,
      fontWeight: '700',
    },

    // ─── Coach Tools ─────────────────────────────
    coachToolsScroll: {
      gap: 12,
    },
    coachToolCard: {
      width: 90,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    coachToolIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    coachToolLabel: {
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
    },

    // ─── Empty states ────────────────────────────
    emptyCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
  });
