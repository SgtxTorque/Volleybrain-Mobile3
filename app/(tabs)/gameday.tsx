import AdminGameDay from '@/components/AdminGameDay';
import EventDetailModal from '@/components/EventDetailModal';
import { ScheduleEvent } from '@/components/EventCard';
import AppHeaderBar from '@/components/ui/AppHeaderBar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import { useAuth } from '@/lib/auth';
import { getDefaultHeroImage } from '@/lib/default-images';
import { displayTextStyle, radii, shadows } from '@/lib/design-tokens';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { useSport } from '@/lib/sport';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Image,
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
  game: { icon: 'trophy', color: '#D94F4F', label: 'Game' },
  practice: { icon: 'fitness', color: '#14B8A6', label: 'Practice' },
  event: { icon: 'calendar', color: '#2C5F7C', label: 'Event' },
  tournament: { icon: 'medal', color: '#E8913A', label: 'Tournament' },
  other: { icon: 'calendar', color: '#2C5F7C', label: 'Other' },
};

const locationTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
  home: { label: 'HOME', color: '#14B8A6', icon: 'home' },
  away: { label: 'AWAY', color: '#E8913A', icon: 'airplane' },
  neutral: { label: 'NEUTRAL', color: '#0EA5E9', icon: 'location' },
};

// ═══════════════════════════════════════════════════════════
// GAME DAY SCREEN
// ═══════════════════════════════════════════════════════════
export default function GameDayScreen() {
  const { colors } = useTheme();
  const { workingSeason } = useSeason();
  const { activeSport } = useSport();
  const { user, profile } = useAuth();
  const { isAdmin, isCoach } = usePermissions();
  const router = useRouter();

  const isCoachOrAdmin = isAdmin || isCoach;

  // Admin-only game day view (tournament director mode)
  if (isAdmin && !isCoach) {
    return <AdminGameDay />;
  }

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const s = useMemo(() => createStyles(colors), [colors]);

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
  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

  const upcomingEvents = useMemo(
    () => events.filter((e) => e.event_date >= todayStr),
    [events, todayStr]
  );

  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  // This week: next 7 days
  const thisWeekEvents = useMemo(() => {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
    // Skip the first event (hero card) for thisWeek section
    return upcomingEvents.filter(
      (e) => e.event_date >= todayStr && e.event_date <= weekEndStr && e.id !== nextEvent?.id
    );
  }, [upcomingEvents, todayStr, nextEvent]);

  // Upcoming 30 days (all future events, capped at 10)
  const allUpcomingEvents = useMemo(() => {
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    const endStr = `${thirtyDaysOut.getFullYear()}-${String(thirtyDaysOut.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysOut.getDate()).padStart(2, '0')}`;
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
      <SafeAreaView style={s.container} edges={['top']}>
        <AppHeaderBar title="GAME DAY" showLogo={false} showNotificationBell={false} showAvatar={false} />
        <View style={s.emptyCenter}>
          <Ionicons name="flash-outline" size={64} color={colors.textMuted} />
          <Text style={[s.emptyTitle, { color: colors.textMuted }]}>Pick Your Season</Text>
          <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
            Select a season to see your Game Day dashboard.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Loading State ─────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <AppHeaderBar title="GAME DAY" showLogo={false} showNotificationBell={false} showAvatar={false} />
        <View style={{ marginHorizontal: 16, marginTop: 16, height: 260, borderRadius: radii.card, backgroundColor: colors.bgSecondary }} />
        <View style={{ marginHorizontal: 16, marginTop: 16, gap: 10 }}>
          {[1, 2].map(i => (
            <View key={i} style={{ height: 80, borderRadius: radii.card, backgroundColor: colors.bgSecondary, opacity: 0.6 }} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  const heroTypeConf = nextEvent ? (eventTypeConfig[nextEvent.event_type] || eventTypeConfig.other) : null;
  const heroCountdown = nextEvent ? getCountdown(nextEvent.event_date) : null;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <AppHeaderBar title="GAME DAY" showLogo={false} showNotificationBell={false} showAvatar={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ================================================================ */}
        {/* HERO CARD — Photo gradient treatment                              */}
        {/* ================================================================ */}
        {nextEvent ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleEventPress(nextEvent)}
            style={s.heroCard}
          >
            <Image
              source={getDefaultHeroImage(activeSport?.name, nextEvent?.event_type)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(27,40,56,0.6)', 'rgba(27,40,56,0.9)']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />

            {/* Location badge — top right */}
            {nextEvent.location_type && locationTypeConfig[nextEvent.location_type] && (
              <View style={[s.heroBadge, { backgroundColor: locationTypeConfig[nextEvent.location_type].color }]}>
                <Text style={s.heroBadgeText}>
                  {locationTypeConfig[nextEvent.location_type].label}
                </Text>
              </View>
            )}

            {/* Event type badge — top right (if no location) */}
            {!nextEvent.location_type && heroTypeConf && (
              <View style={[s.heroBadge, { backgroundColor: heroTypeConf.color }]}>
                <Text style={s.heroBadgeText}>{heroTypeConf.label.toUpperCase()}</Text>
              </View>
            )}

            {/* Hero content — bottom */}
            <View style={s.heroContent}>
              <Text style={s.heroCountdown}>{heroCountdown?.text}</Text>

              <Text style={s.heroTitle}>
                {nextEvent.event_type === 'game'
                  ? 'GAME DAY'
                  : (heroTypeConf?.label || 'EVENT').toUpperCase()}
              </Text>

              {(nextEvent.opponent_name || nextEvent.opponent) && (
                <Text style={s.heroOpponent}>
                  vs {nextEvent.opponent_name || nextEvent.opponent}
                </Text>
              )}

              <View style={s.heroMetaRow}>
                <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={s.heroMetaText}>{formatFullDate(nextEvent.event_date)}</Text>
              </View>

              <View style={s.heroMetaRow}>
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={s.heroMetaText}>
                  {formatTime(nextEvent.start_time)}
                  {nextEvent.end_time ? ` - ${formatTime(nextEvent.end_time)}` : ''}
                </Text>
              </View>

              {(nextEvent.venue_name || nextEvent.location) && (
                <View style={s.heroMetaRow}>
                  <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={s.heroMetaText} numberOfLines={1}>
                    {nextEvent.venue_name || nextEvent.location}
                  </Text>
                </View>
              )}

              {/* Action buttons */}
              <View style={s.heroActions}>
                {isCoachOrAdmin && (
                  <TouchableOpacity
                    style={s.heroActionPrimary}
                    onPress={() => router.push('/lineup-builder' as any)}
                  >
                    <Ionicons name="grid-outline" size={14} color="#FFF" />
                    <Text style={s.heroActionPrimaryText}>Prep Lineup</Text>
                  </TouchableOpacity>
                )}
                {(nextEvent.venue_address || nextEvent.venue_name || nextEvent.location) && (
                  <TouchableOpacity style={s.heroActionSecondary} onPress={() => openDirections(nextEvent)}>
                    <Ionicons name="navigate-outline" size={14} color="#FFF" />
                    <Text style={s.heroActionSecondaryText}>Get Directions</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={s.heroCardEmpty}>
            <LinearGradient
              colors={['#2C5F7C', '#1B2838']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons name="sunny-outline" size={48} color="rgba(255,255,255,0.5)" />
            <Text style={s.emptyHeroTitle}>No events on deck</Text>
            <Text style={s.emptyHeroSub}>
              Rest up — when game day hits, this is your command center.
            </Text>
          </View>
        )}

        {/* ================================================================ */}
        {/* THIS WEEK                                                         */}
        {/* ================================================================ */}
        {thisWeekEvents.length > 0 && (
          <View style={s.sectionBlock}>
            <SectionHeader title="This Week" />
            {thisWeekEvents.map((event) => {
              const typeConf = eventTypeConfig[event.event_type] || eventTypeConfig.other;
              const rsvp = event.rsvp_count;
              return (
                <Card
                  key={event.id}
                  accentColor={typeConf.color}
                  onPress={() => handleEventPress(event)}
                  style={{ marginHorizontal: 16, marginBottom: 10 }}
                >
                  <View style={s.eventCardRow}>
                    <View style={[s.eventCardIcon, { backgroundColor: typeConf.color + '20' }]}>
                      <Ionicons name={typeConf.icon as any} size={18} color={typeConf.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.eventCardTitle, { color: colors.text }]} numberOfLines={1}>
                        {event.title}
                      </Text>
                      {(event.opponent_name || event.opponent) && (
                        <Text style={[s.eventCardOpponent, { color: colors.textMuted }]}>
                          vs {event.opponent_name || event.opponent}
                        </Text>
                      )}
                    </View>
                    {event.event_type === 'game' &&
                      event.location_type &&
                      locationTypeConfig[event.location_type] && (
                        <Badge
                          label={locationTypeConfig[event.location_type].label}
                          color={locationTypeConfig[event.location_type].color}
                        />
                      )}
                  </View>

                  <View style={s.eventCardMeta}>
                    <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                    <Text style={[s.eventCardMetaText, { color: colors.textMuted }]}>
                      {formatEventDate(event.event_date)} {'\u00B7'} {formatTime(event.start_time)}
                    </Text>
                  </View>

                  {rsvp && (
                    <View style={s.eventCardRsvp}>
                      <Text style={{ color: '#14B8A6', fontSize: 12, fontWeight: '600' }}>
                        {rsvp.yes} going
                      </Text>
                      {rsvp.maybe > 0 && (
                        <Text style={{ color: '#E8913A', fontSize: 12 }}>
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
                </Card>
              );
            })}
          </View>
        )}

        {/* ================================================================ */}
        {/* SEASON PROGRESS                                                   */}
        {/* ================================================================ */}
        {seasonStats.totalGames > 0 && (
          <View style={s.sectionBlock}>
            <SectionHeader title="Season Progress" />
            <Card style={{ marginHorizontal: 16 }}>
              <View style={s.progressBarContainer}>
                <View style={s.progressBarBg}>
                  <View
                    style={[
                      s.progressBarFill,
                      {
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

              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: '#22C55E' }]}>{seasonStats.wins}</Text>
                  <Text style={[s.statLabel, { color: colors.textMuted }]}>Won</Text>
                </View>
                <View style={[s.statDivider, { backgroundColor: colors.glassBorder }]} />
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: '#D94F4F' }]}>{seasonStats.losses}</Text>
                  <Text style={[s.statLabel, { color: colors.textMuted }]}>Lost</Text>
                </View>
                <View style={[s.statDivider, { backgroundColor: colors.glassBorder }]} />
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: '#14B8A6' }]}>{seasonStats.winPct}%</Text>
                  <Text style={[s.statLabel, { color: colors.textMuted }]}>Win %</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* ================================================================ */}
        {/* SEASON OVERVIEW (Standings + History)                              */}
        {/* ================================================================ */}
        <View style={s.sectionBlock}>
          <SectionHeader title="Season" />
          <View style={s.overviewRow}>
            <Card onPress={() => router.push('/standings' as any)} style={{ flex: 1 }}>
              <View style={s.overviewCardInner}>
                <Ionicons name="trophy-outline" size={28} color={colors.primary} />
                <Text style={[s.overviewCardLabel, { color: colors.text }]}>Standings</Text>
              </View>
            </Card>
            <Card onPress={() => router.push('/season-archives' as any)} style={{ flex: 1 }}>
              <View style={s.overviewCardInner}>
                <Ionicons name="archive-outline" size={28} color={colors.primary} />
                <Text style={[s.overviewCardLabel, { color: colors.text }]}>Season History</Text>
              </View>
            </Card>
          </View>
        </View>

        {/* ================================================================ */}
        {/* UPCOMING EVENTS                                                   */}
        {/* ================================================================ */}
        {Object.keys(groupedUpcoming).length > 0 && (
          <View style={s.sectionBlock}>
            <SectionHeader
              title="Upcoming"
              action="Full Schedule"
              onAction={() => router.push('/(tabs)/schedule' as any)}
            />
            {Object.keys(groupedUpcoming)
              .sort()
              .map((dateKey) => (
                <View key={dateKey} style={{ marginBottom: 12, paddingHorizontal: 16 }}>
                  <Text style={[s.dateGroupHeader, { color: colors.text }]}>
                    {formatDateHeader(dateKey)}
                  </Text>
                  {groupedUpcoming[dateKey].map((event) => {
                    const typeConf = eventTypeConfig[event.event_type] || eventTypeConfig.other;
                    return (
                      <Card
                        key={event.id}
                        accentColor={typeConf.color}
                        onPress={() => handleEventPress(event)}
                        style={{ marginBottom: 6 }}
                      >
                        <View style={s.compactRow}>
                          <View style={[s.compactIcon, { backgroundColor: typeConf.color + '20' }]}>
                            <Ionicons name={typeConf.icon as any} size={16} color={typeConf.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.compactTitle, { color: colors.text }]} numberOfLines={1}>
                              {event.title}
                            </Text>
                            <Text style={[s.compactMeta, { color: colors.textMuted }]}>
                              {formatTime(event.start_time)}
                              {event.venue_name || event.location
                                ? ` \u00B7 ${event.venue_name || event.location}`
                                : ''}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </View>
                      </Card>
                    );
                  })}
                </View>
              ))}
            {allUpcomingEvents.length > 10 && (
              <TouchableOpacity
                style={s.viewAllBtn}
                onPress={() => router.push('/(tabs)/schedule' as any)}
              >
                <Text style={[s.viewAllBtnText, { color: colors.primary }]}>View Full Schedule</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ================================================================ */}
        {/* RECENT RESULTS                                                    */}
        {/* ================================================================ */}
        {(() => {
          const completedGames = events
            .filter(
              (e) =>
                e.event_type === 'game' &&
                e.event_date < todayStr &&
                e.our_score != null &&
                e.opponent_score != null
            )
            .slice(-5)
            .reverse();

          if (completedGames.length === 0) return null;

          return (
            <View style={s.sectionBlock}>
              <SectionHeader title="Recent Results" />
              {completedGames.map((game) => {
                const won = (game.our_score ?? 0) > (game.opponent_score ?? 0);
                const team = teams.find((t) => t.id === game.team_id);
                return (
                  <Card
                    key={game.id}
                    accentColor={won ? '#22C55E' : '#D94F4F'}
                    onPress={() => router.push(`/game-results?eventId=${game.id}` as any)}
                    style={{ marginHorizontal: 16, marginBottom: 8 }}
                  >
                    <View style={s.compactRow}>
                      <View style={[s.compactIcon, { backgroundColor: (won ? '#22C55E' : '#D94F4F') + '20' }]}>
                        <Ionicons
                          name={won ? 'trophy' : 'close-circle'}
                          size={16}
                          color={won ? '#22C55E' : '#D94F4F'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.compactTitle, { color: colors.text }]} numberOfLines={1}>
                          vs {game.opponent_name || game.opponent || 'TBD'}
                        </Text>
                        <Text style={[s.compactMeta, { color: colors.textMuted }]}>
                          {formatEventDate(game.event_date)}
                          {team ? ` \u00B7 ${team.name}` : ''}
                        </Text>
                      </View>
                      <Text
                        style={[
                          s.resultScore,
                          { color: won ? '#22C55E' : '#D94F4F' },
                        ]}
                      >
                        {game.our_score} - {game.opponent_score}
                      </Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          );
        })()}

        {/* ================================================================ */}
        {/* COACH TOOLS                                                       */}
        {/* ================================================================ */}
        {isCoachOrAdmin && (
          <View style={s.sectionBlock}>
            <SectionHeader title="Coach Tools" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
              {[
                { icon: 'add', color: '#2C5F7C', label: 'Add Event', route: '/(tabs)/schedule' },
                { icon: 'checkmark-circle-outline', color: '#22C55E', label: 'Attendance', route: '/attendance' },
                { icon: 'grid-outline', color: '#8B5CF6', label: 'Lineup', route: '/lineup-builder' },
                { icon: 'analytics-outline', color: '#D94F4F', label: 'Game Prep', route: '/game-prep-wizard' },
              ].map((tool) => (
                <Card
                  key={tool.label}
                  onPress={() => router.push(tool.route as any)}
                  style={{ width: 90 }}
                >
                  <View style={s.coachToolInner}>
                    <View style={[s.coachToolIcon, { backgroundColor: tool.color + '20' }]}>
                      <Ionicons name={tool.icon as any} size={24} color={tool.color} />
                    </View>
                    <Text style={[s.coachToolLabel, { color: colors.text }]}>{tool.label}</Text>
                  </View>
                </Card>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* ─── EVENT DETAIL MODAL ─────────────────────── */}
      <EventDetailModal
        visible={showEventModal}
        event={selectedEvent}
        onClose={() => setShowEventModal(false)}
        onGamePrep={(event: any) => router.push(`/game-prep-wizard?eventId=${event.id}&teamId=${event.team_id}` as any)}
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
      backgroundColor: colors.background,
    },

    // ─── Sections ────────────────────────────────
    sectionBlock: {
      marginBottom: 8,
    },

    // ─── Hero Card ───────────────────────────────
    heroCard: {
      height: 300,
      borderRadius: radii.card,
      overflow: 'hidden' as const,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      ...shadows.card,
    },
    heroBadge: {
      position: 'absolute' as const,
      top: 12,
      right: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    heroBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#FFF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroContent: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
    },
    heroCountdown: {
      color: '#14B8A6',
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 2,
    },
    heroTitle: {
      ...displayTextStyle,
      color: '#FFF',
      fontSize: 28,
      marginBottom: 4,
    },
    heroOpponent: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    heroMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 3,
    },
    heroMetaText: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 11,
    },
    heroActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    heroActionPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2C5F7C',
      paddingVertical: 10,
      borderRadius: 24,
      gap: 6,
    },
    heroActionPrimaryText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '700',
    },
    heroActionSecondary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
      paddingVertical: 10,
      borderRadius: 24,
      gap: 6,
    },
    heroActionSecondaryText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '700',
    },

    // ─── Empty Hero ──────────────────────────────
    heroCardEmpty: {
      height: 220,
      borderRadius: radii.card,
      overflow: 'hidden' as const,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.card,
    },
    emptyHeroTitle: {
      ...displayTextStyle,
      color: '#FFF',
      fontSize: 18,
      marginTop: 12,
    },
    emptyHeroSub: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 13,
      textAlign: 'center',
      marginTop: 4,
      paddingHorizontal: 40,
      lineHeight: 18,
    },

    // ─── Event Cards (This Week) ─────────────────
    eventCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    eventCardIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    eventCardTitle: {
      fontSize: 15,
      fontWeight: '700',
    },
    eventCardOpponent: {
      fontSize: 13,
      marginTop: 2,
    },
    eventCardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 8,
    },
    eventCardMetaText: {
      fontSize: 12,
    },
    eventCardRsvp: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
    },

    // ─── Season Progress ─────────────────────────
    progressBarContainer: {
      marginBottom: 16,
    },
    progressBarBg: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden' as const,
      backgroundColor: colors.glassBorder,
      marginBottom: 6,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: '#14B8A6',
    },
    progressLabel: {
      fontSize: 12,
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
      ...displayTextStyle,
      fontSize: 24,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '600',
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statDivider: {
      width: 1,
      height: 32,
    },

    // ─── Season Overview ─────────────────────────
    overviewRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
    },
    overviewCardInner: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 8,
    },
    overviewCardLabel: {
      fontSize: 13,
      fontWeight: '700',
    },

    // ─── Compact rows (upcoming + results) ───────
    compactRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
    resultScore: {
      fontSize: 16,
      fontWeight: '800',
    },

    // ─── Upcoming date group ─────────────────────
    dateGroupHeader: {
      ...displayTextStyle,
      fontSize: 13,
      marginBottom: 8,
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
    coachToolInner: {
      alignItems: 'center',
      gap: 8,
    },
    coachToolIcon: {
      width: 44,
      height: 44,
      borderRadius: radii.card,
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
      ...displayTextStyle,
      fontSize: 18,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
      color: colors.textMuted,
    },
  });
