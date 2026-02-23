import { useAuth } from '@/lib/auth';
import { getDefaultHeroImage } from '@/lib/default-images';
import { displayTextStyle, radii, shadows } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { useSport } from '@/lib/sport';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AppHeaderBar from './ui/AppHeaderBar';
import Card from './ui/Card';
import PillTabs from './ui/PillTabs';
import SectionHeader from './ui/SectionHeader';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 32;

// ============================================
// TYPES
// ============================================

type CoachTeam = {
  id: string;
  name: string;
  role: 'head_coach' | 'assistant_coach';
  season_name: string;
  player_count: number;
  age_group_name: string | null;
  wins: number;
  losses: number;
};

type UpcomingEvent = {
  id: string;
  title: string;
  type: 'game' | 'practice';
  date: string;
  time: string;
  location: string | null;
  opponent: string | null;
  team_name: string;
  team_id: string;
};

type ChatPreview = {
  channelId: string;
  channelName: string;
  senderName: string;
  senderInitials: string;
  content: string;
  createdAt: string;
};

type TeamPost = {
  authorName: string;
  content: string;
  createdAt: string;
};

// ============================================
// HELPERS
// ============================================

const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${minutes} ${ampm}`;
};

const formatFullDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const getCountdownText = (dateStr: string) => {
  const eventDate = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'TOMORROW';
  return `IN ${diffDays} DAYS`;
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

const getAttendanceColor = (rate: number, colors: any) => {
  if (rate > 80) return colors.success;
  if (rate > 60) return colors.warning;
  return colors.danger;
};

// ============================================
// COMPONENT
// ============================================

export default function CoachDashboard() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const { activeSport } = useSport();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [teams, setTeams] = useState<CoachTeam[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [availableCount, setAvailableCount] = useState<{ available: number; total: number } | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [pendingStatsCount, setPendingStatsCount] = useState(0);
  const [nextEventId, setNextEventId] = useState<string | null>(null);
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [teamWallPreviews, setTeamWallPreviews] = useState<TeamPost[]>([]);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchCoachData();
  }, [user?.id, workingSeason?.id]);

  useEffect(() => {
    if (teams.length > 0) {
      const activeTeam = teams[activeTeamIndex];
      if (activeTeam) {
        fetchTeamSpecificData(activeTeam.id);
      }
    }
  }, [activeTeamIndex, teams, workingSeason?.id]);

  // Reset carousel when team changes
  useEffect(() => {
    setActiveCarouselIndex(0);
    carouselRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeTeamIndex]);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchCoachData = async () => {
    if (!user?.id || !workingSeason?.id) return;

    try {
      // Get ALL teams where user is on staff
      const { data: allStaffTeams } = await supabase
        .from('team_staff')
        .select(`
          team_id,
          staff_role,
          teams (
            id,
            name,
            season_id,
            seasons (name),
            age_groups (name)
          )
        `)
        .eq('user_id', user.id);

      // Also check team_coaches table as fallback
      const { data: coachTeams } = await supabase
        .from('team_coaches')
        .select(`
          team_id,
          role,
          teams (
            id,
            name,
            season_id,
            seasons (name),
            age_groups (name)
          )
        `)
        .eq('coach_id', user.id);

      // Merge both result sets, deduplicating by team_id
      const mergedTeams: any[] = [...(allStaffTeams || [])];
      const existingTeamIds = new Set(mergedTeams.map(t => (t.teams as any)?.id).filter(Boolean));
      for (const ct of (coachTeams || [])) {
        const teamId = (ct.teams as any)?.id;
        if (teamId && !existingTeamIds.has(teamId)) {
          mergedTeams.push({ ...ct, staff_role: ct.role });
          existingTeamIds.add(teamId);
        }
      }

      // Fallback: if no team_staff or team_coaches records found, query teams directly
      if (mergedTeams.length === 0) {
        const { data: coachRecord } = await supabase
          .from('coaches')
          .select('id')
          .eq('profile_id', user.id)
          .limit(1);
        if (coachRecord && coachRecord.length > 0) {
          const { data: allTeams } = await supabase
            .from('teams')
            .select('id, name, season_id, seasons(name), age_groups(name)')
            .eq('season_id', workingSeason.id)
            .order('name');
          for (const team of (allTeams || [])) {
            mergedTeams.push({ teams: team, staff_role: 'head_coach' });
          }
        }
      }

      // Filter to current season
      const seasonTeams = mergedTeams.filter(t => {
        const team = t.teams as any;
        return team?.season_id === workingSeason.id;
      });

      // Batch player counts and game results for all teams at once
      const staffTeamIds = seasonTeams.map(t => (t.teams as any)?.id).filter(Boolean);

      let playerCountMap = new Map<string, number>();
      let winsMap = new Map<string, number>();
      let lossesMap = new Map<string, number>();

      if (staffTeamIds.length > 0) {
        const { data: allTeamPlayers } = await supabase
          .from('team_players')
          .select('team_id')
          .in('team_id', staffTeamIds);

        for (const tp of (allTeamPlayers || [])) {
          playerCountMap.set(tp.team_id, (playerCountMap.get(tp.team_id) || 0) + 1);
        }

        const { data: allGameResults } = await supabase
          .from('schedule_events')
          .select('team_id, game_result')
          .in('team_id', staffTeamIds)
          .eq('event_type', 'game')
          .not('game_result', 'is', null);

        for (const g of (allGameResults || [])) {
          if (g.game_result === 'win') winsMap.set(g.team_id, (winsMap.get(g.team_id) || 0) + 1);
          else if (g.game_result === 'loss') lossesMap.set(g.team_id, (lossesMap.get(g.team_id) || 0) + 1);
        }
      }

      let total = 0;
      const teamsWithCounts: CoachTeam[] = seasonTeams.map(t => {
        const team = t.teams as any;
        const playerCount = playerCountMap.get(team.id) || 0;
        total += playerCount;
        return {
          id: team.id,
          name: team.name,
          role: (t.staff_role || 'assistant_coach') as 'head_coach' | 'assistant_coach',
          season_name: team.seasons?.name || '',
          player_count: playerCount,
          age_group_name: team.age_groups?.name || null,
          wins: winsMap.get(team.id) || 0,
          losses: lossesMap.get(team.id) || 0,
        };
      });

      teamsWithCounts.sort((a, b) => {
        if (a.role === 'head_coach' && b.role !== 'head_coach') return -1;
        if (a.role !== 'head_coach' && b.role === 'head_coach') return 1;
        return a.name.localeCompare(b.name);
      });

      setTeams(teamsWithCounts);

      if (activeTeamIndex >= teamsWithCounts.length) {
        setActiveTeamIndex(0);
      }

      // Fetch upcoming events
      const teamIds = teamsWithCounts.map(t => t.id);
      if (teamIds.length > 0) {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const { data: events } = await supabase
          .from('schedule_events')
          .select(`
            id, title, event_type, event_date, start_time,
            location, opponent, team_id, teams (name)
          `)
          .in('team_id', teamIds)
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(20);

        setUpcomingEvents((events || []).map(e => ({
          id: e.id,
          title: e.title,
          type: e.event_type as 'game' | 'practice',
          date: e.event_date,
          time: e.start_time || '',
          location: e.location,
          opponent: e.opponent,
          team_name: (e.teams as any)?.name || '',
          team_id: e.team_id,
        })));
      }

      // Fetch chat previews
      await fetchChatPreviews();

    } catch (error) {
      if (__DEV__) console.error('Error fetching coach data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatPreviews = async () => {
    if (!user?.id) return;
    try {
      const { data: memberships } = await supabase
        .from('channel_members')
        .select('channel_id, channels(id, name)')
        .eq('user_id', user.id)
        .is('left_at', null)
        .limit(5);

      if (!memberships || memberships.length === 0) {
        setChatPreviews([]);
        return;
      }

      const channelIds = memberships.map(m => m.channel_id);
      const previews: ChatPreview[] = [];

      // Fetch latest message per channel (batch would be ideal, but limit 3 channels)
      for (const m of memberships.slice(0, 3)) {
        const channel = m.channels as any;
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('content, created_at, sender_id, profiles:sender_id(full_name)')
          .eq('channel_id', m.channel_id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (msgs && msgs.length > 0) {
          const msg = msgs[0];
          const senderName = (msg.profiles as any)?.full_name || 'Unknown';
          const nameParts = senderName.split(' ').filter(Boolean);
          const initials = nameParts.length >= 2
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : nameParts.length === 1 ? nameParts[0][0].toUpperCase() : '?';

          previews.push({
            channelId: m.channel_id,
            channelName: channel?.name || 'Chat',
            senderName,
            senderInitials: initials,
            content: msg.content || '',
            createdAt: msg.created_at,
          });
        }
      }

      // Sort by most recent
      previews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setChatPreviews(previews);
    } catch (error) {
      if (__DEV__) console.error('Error fetching chat previews:', error);
    }
  };

  const fetchTeamSpecificData = async (teamId: string) => {
    if (!workingSeason?.id) return;
    try {
      // Attendance rate for recent events
      const { data: recentEvents } = await supabase
        .from('schedule_events')
        .select('id')
        .eq('team_id', teamId)
        .lte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: false })
        .limit(5);

      if (recentEvents && recentEvents.length > 0) {
        const eventIds = recentEvents.map(e => e.id);
        const { data: rsvps } = await supabase
          .from('event_rsvps')
          .select('status')
          .in('event_id', eventIds);

        if (rsvps && rsvps.length > 0) {
          const attending = rsvps.filter(r => r.status === 'yes' || r.status === 'attending' || r.status === 'present').length;
          setAttendanceRate(Math.round((attending / rsvps.length) * 100));
        } else {
          setAttendanceRate(null);
        }
      } else {
        setAttendanceRate(null);
      }

      // Availability for next event
      const nowLocal = new Date();
      const today = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;
      const { data: nextEvents } = await supabase
        .from('schedule_events')
        .select('id')
        .eq('team_id', teamId)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(1);

      if (nextEvents && nextEvents.length > 0) {
        setNextEventId(nextEvents[0].id);
        const { data: rsvps } = await supabase
          .from('event_rsvps')
          .select('status')
          .eq('event_id', nextEvents[0].id);

        const { count: rosterCount } = await supabase
          .from('team_players')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId);

        const available = (rsvps || []).filter(r => r.status === 'yes' || r.status === 'attending').length;
        setAvailableCount({ available, total: rosterCount || 0 });
      } else {
        setNextEventId(null);
        setAvailableCount(null);
      }

      // Season progress
      const { count: totalGameCount } = await supabase
        .from('schedule_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('event_type', 'game');

      const { count: playedGameCount } = await supabase
        .from('schedule_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('event_type', 'game')
        .not('game_result', 'is', null);

      setTotalGames(totalGameCount || 0);
      setGamesPlayed(playedGameCount || 0);

      // Pending stats count
      const { count: pendingCount } = await supabase
        .from('schedule_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('event_type', 'game')
        .eq('game_status', 'completed')
        .or('stats_entered.is.null,stats_entered.eq.false');
      setPendingStatsCount(pendingCount || 0);

      // Team wall previews
      const { data: posts } = await supabase
        .from('team_posts')
        .select('content, created_at, profiles:author_id(full_name)')
        .eq('team_id', teamId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3);

      setTeamWallPreviews((posts || []).map(p => ({
        authorName: (p.profiles as any)?.full_name || 'Unknown',
        content: p.content || '',
        createdAt: p.created_at,
      })));

    } catch (error) {
      if (__DEV__) console.error('Error fetching team-specific data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCoachData();
    setRefreshing(false);
  };

  // ============================================
  // DERIVED STATE
  // ============================================

  const activeTeam = teams[activeTeamIndex] || null;

  const activeTeamEvents = activeTeam
    ? upcomingEvents.filter(e => e.team_id === activeTeam.id)
    : upcomingEvents;

  const totalWins = activeTeam ? activeTeam.wins : teams.reduce((sum, t) => sum + t.wins, 0);
  const totalLosses = activeTeam ? activeTeam.losses : teams.reduce((sum, t) => sum + t.losses, 0);

  const userInitials = (() => {
    const name = profile?.full_name || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return '?';
  })();

  // Carousel data: up to 5 events + CTA card
  const carouselData: { type: 'event' | 'cta'; event?: UpcomingEvent }[] = [
    ...activeTeamEvents.slice(0, 5).map(e => ({ type: 'event' as const, event: e })),
    { type: 'cta' as const },
  ];

  const s = createStyles(colors);

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <ScrollView style={s.container} contentContainerStyle={{ paddingTop: 0 }}>
        <View style={[s.headerBar, { justifyContent: 'space-between' }]}>
          <View style={{ width: 120, height: 14, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          </View>
        </View>
        <View style={{ marginHorizontal: 16, marginTop: 16, height: 260, borderRadius: radii.card, backgroundColor: colors.bgSecondary }} />
        <View style={{ marginHorizontal: 16, marginTop: 16, gap: 12 }}>
          {[1, 2].map(i => (
            <View key={i} style={{ height: 80, borderRadius: radii.card, backgroundColor: colors.glassCard, borderWidth: 1, borderColor: colors.glassBorder }} />
          ))}
        </View>
      </ScrollView>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
    >

      {/* ================================================================ */}
      {/* 1. HEADER BAR                                                     */}
      {/* ================================================================ */}
      <AppHeaderBar initials={userInitials} />

      {/* ================================================================ */}
      {/* 2. TEAM SELECTOR                                                  */}
      {/* ================================================================ */}
      {teams.length > 1 && (
        <View style={{ marginBottom: 4, paddingHorizontal: 16 }}>
          <PillTabs
            tabs={teams.map(t => ({ key: t.id, label: t.name }))}
            activeKey={activeTeam?.id || teams[0]?.id}
            onChange={(key) => setActiveTeamIndex(teams.findIndex(t => t.id === key))}
          />
        </View>
      )}

      {/* ================================================================ */}
      {/* 3. HERO EVENT CAROUSEL                                            */}
      {/* ================================================================ */}
      {activeTeam && activeTeamEvents.length > 0 ? (
        <>
          <View style={s.carouselWrap}>
            <FlatList
              ref={carouselRef}
              data={carouselData}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + 12}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              keyExtractor={(item, index) => item.event?.id || `cta-${index}`}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
                setActiveCarouselIndex(idx);
              }}
              renderItem={({ item }) => {
                if (item.type === 'cta') {
                  return (
                    <TouchableOpacity
                      style={s.heroCtaCard}
                      onPress={() => router.push('/(tabs)/coach-schedule' as any)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={40} color={colors.teal} />
                      <Text style={s.ctaText}>View Full Schedule</Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  );
                }

                const evt = item.event!;
                const eventColor = evt.type === 'game' ? '#D94F4F' : '#14B8A6';
                const countdown = getCountdownText(evt.date);

                return (
                  <View style={s.heroCard}>
                    {/* Background image */}
                    <Image
                      source={getDefaultHeroImage(activeSport?.name, evt.type)}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(27,40,56,0.6)', 'rgba(27,40,56,0.9)']}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    />

                    {/* Event type badge */}
                    <View style={[s.heroBadge, { backgroundColor: eventColor }]}>
                      <Text style={s.heroBadgeText}>
                        {evt.type === 'game' ? 'GAME DAY' : 'PRACTICE'}
                      </Text>
                    </View>

                    {/* Bottom content */}
                    <View style={s.heroContent}>
                      <View style={s.heroContentRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.heroCountdown}>{countdown}</Text>
                          <Text style={s.heroTitle}>
                            {evt.type === 'game' ? 'GAME DAY' : 'PRACTICE'}
                          </Text>
                          <Text style={s.heroTeamName}>{activeTeam.name}</Text>

                          {/* Date */}
                          <View style={s.heroMetaRow}>
                            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
                            <Text style={s.heroMetaText}>{formatFullDate(evt.date)}</Text>
                          </View>

                          {/* Time */}
                          {evt.time ? (
                            <View style={s.heroMetaRow}>
                              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
                              <Text style={s.heroMetaText}>{formatTime(evt.time)}</Text>
                            </View>
                          ) : null}

                          {/* Location */}
                          {evt.location ? (
                            <View style={s.heroMetaRow}>
                              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                              <Text style={s.heroMetaText} numberOfLines={1}>{evt.location}</Text>
                            </View>
                          ) : null}

                          {/* Opponent */}
                          {evt.type === 'game' && evt.opponent && (
                            <Text style={s.heroOpponent}>vs {evt.opponent}</Text>
                          )}
                        </View>

                        {/* RSVP count pill */}
                        {availableCount && (
                          <LinearGradient
                            colors={['#2C5F7C', '#14B8A6']}
                            style={s.heroRsvpPill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={s.heroRsvpLabel}>RSVP</Text>
                            <Text style={s.heroRsvpCount}>
                              {availableCount.available}/{availableCount.total}
                            </Text>
                            <Text style={s.heroRsvpSub}>Confirmed</Text>
                          </LinearGradient>
                        )}
                      </View>

                      {/* Prep Lineup button for games */}
                      {evt.type === 'game' && (
                        <TouchableOpacity
                          style={s.heroPrepBtn}
                          onPress={() => router.push(`/game-prep?eventId=${evt.id}` as any)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="people" size={14} color="#FFF" />
                          <Text style={s.heroPrepBtnText}>Prep Lineup</Text>
                        </TouchableOpacity>
                      )}

                      {/* Attendance dots */}
                      {availableCount && availableCount.total > 0 && (
                        <View style={s.heroDotsRow}>
                          {Array.from({ length: Math.min(availableCount.total, 20) }).map((_, i) => (
                            <View
                              key={i}
                              style={[
                                s.heroDot,
                                i < availableCount.available
                                  ? { backgroundColor: '#22C55E' }
                                  : { backgroundColor: '#D9E2E9' },
                              ]}
                            >
                              <Text style={s.heroDotIcon}>
                                {i < availableCount.available ? '\u2713' : '\u2022'}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          </View>

          {/* Pagination dots */}
          {carouselData.length > 1 && (
            <View style={s.dotsRow}>
              {carouselData.map((_, i) => (
                <View
                  key={i}
                  style={[
                    s.dot,
                    i === activeCarouselIndex ? s.dotActive : s.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}
        </>
      ) : activeTeam ? (
        <View style={s.heroCardEmpty}>
          <LinearGradient
            colors={['#2C5F7C', '#1B2838']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.3, y: 1 }}
          />
          <View style={s.heroContent}>
            <Ionicons name="calendar-outline" size={32} color="rgba(255,255,255,0.6)" />
            <Text style={[s.heroTitle, { marginTop: 8 }]}>ALL CLEAR</Text>
            <Text style={s.heroTeamName}>{activeTeam.name}</Text>
            <Text style={[s.heroMetaText, { marginTop: 4 }]}>No upcoming events scheduled</Text>
          </View>
        </View>
      ) : (
        <Card style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 16, padding: 28, alignItems: 'center' }}>
          <Ionicons name="shirt-outline" size={36} color={colors.textMuted} />
          <Text style={s.emptyTitle}>No Teams Assigned</Text>
          <Text style={s.emptySubtext}>No teams found for this season</Text>
        </Card>
      )}

      {/* ================================================================ */}
      {/* 4. QUICK ACTIONS — 2x2 Grid                                       */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Quick Actions" />
        </View>
        <View style={[s.actionsGrid, { paddingHorizontal: 16 }]}>
          <TouchableOpacity style={s.actionCard} onPress={() => router.push('/attendance' as any)}>
            <View style={[s.actionIconCircle, { backgroundColor: colors.success + '26' }]}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            </View>
            <Text style={s.actionLabel}>Take Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} onPress={() => router.push('/game-prep' as any)}>
            <View style={[s.actionIconCircle, { backgroundColor: colors.info + '26' }]}>
              <Ionicons name="stats-chart" size={32} color={colors.info} />
              {pendingStatsCount > 0 && (
                <View style={s.pendingBadge}>
                  <Text style={s.pendingBadgeText}>{pendingStatsCount}</Text>
                </View>
              )}
            </View>
            <Text style={s.actionLabel}>Enter Stats</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} onPress={() => router.push('/blast-composer' as any)}>
            <View style={[s.actionIconCircle, { backgroundColor: colors.warning + '26' }]}>
              <Ionicons name="megaphone" size={32} color={colors.warning} />
            </View>
            <Text style={s.actionLabel}>Send Blast</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} onPress={() => router.push('/lineup-builder' as any)}>
            <View style={[s.actionIconCircle, { backgroundColor: colors.primary + '26' }]}>
              <Ionicons name="people" size={32} color={colors.primary} />
            </View>
            <Text style={s.actionLabel}>Build Lineup</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================================================================ */}
      {/* 5. TEAM HEALTH — 3 stat cards                                     */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Team Health" />
        </View>
        <View style={[s.healthRow, { paddingHorizontal: 16 }]}>
          <TouchableOpacity style={s.healthCard} activeOpacity={0.7} onPress={() => router.push('/attendance' as any)}>
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={attendanceRate !== null ? getAttendanceColor(attendanceRate, colors) : colors.textMuted}
            />
            <Text style={[
              s.healthNum,
              attendanceRate !== null && { color: getAttendanceColor(attendanceRate, colors) },
            ]}>
              {attendanceRate !== null ? `${attendanceRate}%` : '--'}
            </Text>
            <Text style={s.healthLabel}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.healthCard} activeOpacity={0.7} onPress={() => router.push(nextEventId ? `/attendance?eventId=${nextEventId}` as any : '/attendance' as any)}>
            <Ionicons name="hand-left" size={24} color={colors.info} />
            <Text style={s.healthNum}>
              {availableCount ? `${availableCount.available}/${availableCount.total}` : '--'}
            </Text>
            <Text style={s.healthLabel}>Available</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.healthCard} activeOpacity={0.7} onPress={() => router.push('/achievements' as any)}>
            <Ionicons name="ribbon" size={24} color={colors.warning} />
            <Text style={[s.healthNum, { color: colors.warning }]}>
              {activeTeam?.player_count || 0}
            </Text>
            <Text style={s.healthLabel}>Players</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================================================================ */}
      {/* 6. SEASON OVERVIEW — 4 stat boxes                                 */}
      {/* ================================================================ */}
      {activeTeam && (
        <View style={s.sectionBlock}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="Season Overview" action="Details" onAction={() => router.push('/game-prep' as any)} />
          </View>
          <View style={[s.seasonStatsRow, { paddingHorizontal: 16 }]}>
            <View style={[s.seasonStatBox, { borderTopColor: colors.success }]}>
              <Text style={[s.seasonStatNum, { color: colors.success }]}>{totalWins}</Text>
              <Text style={s.seasonStatLabel}>WINS</Text>
            </View>
            <View style={[s.seasonStatBox, { borderTopColor: colors.danger }]}>
              <Text style={[s.seasonStatNum, { color: colors.danger }]}>{totalLosses}</Text>
              <Text style={s.seasonStatLabel}>LOSSES</Text>
            </View>
            <View style={[s.seasonStatBox, { borderTopColor: '#2C5F7C' }]}>
              <Text style={[s.seasonStatNum, { color: '#2C5F7C' }]}>{activeTeam.player_count}</Text>
              <Text style={s.seasonStatLabel}>PLAYERS</Text>
            </View>
            <View style={[s.seasonStatBox, { borderTopColor: '#14B8A6' }]}>
              <Text style={[s.seasonStatNum, { color: '#14B8A6' }]}>
                {gamesPlayed > 0 ? `.${String(Math.round((totalWins / gamesPlayed) * 1000)).padStart(3, '0')}` : '--'}
              </Text>
              <Text style={s.seasonStatLabel}>WIN %</Text>
            </View>
          </View>
        </View>
      )}

      {/* ================================================================ */}
      {/* 7. CHAT PREVIEW                                                   */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Messages" action="View All" onAction={() => router.push('/(tabs)/coach-chat' as any)} />
        </View>
        {chatPreviews.length > 0 ? (
          <View style={[s.previewCard, { marginHorizontal: 16 }]}>
            {chatPreviews.map((chat, i) => (
              <TouchableOpacity
                key={chat.channelId}
                style={[s.previewRow, i < chatPreviews.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.glassBorder }]}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: chat.channelId } } as any)}
                activeOpacity={0.7}
              >
                <View style={s.previewAvatar}>
                  <Text style={s.previewAvatarText}>{chat.senderInitials}</Text>
                </View>
                <View style={s.previewContent}>
                  <View style={s.previewTopRow}>
                    <Text style={s.previewName} numberOfLines={1}>{chat.channelName}</Text>
                    <Text style={s.previewTime}>{timeAgo(chat.createdAt)}</Text>
                  </View>
                  <Text style={s.previewMessage} numberOfLines={1}>
                    <Text style={{ fontWeight: '600' }}>{chat.senderName}: </Text>
                    {chat.content}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Card style={{ marginHorizontal: 16, padding: 28, alignItems: 'center' }}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textMuted} />
            <Text style={s.emptySubtext}>No messages yet</Text>
          </Card>
        )}
      </View>

      {/* ================================================================ */}
      {/* 8. TEAM HUB PREVIEW                                               */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Team Feed" action="View All" onAction={() => router.push('/(tabs)/coach-team-hub' as any)} />
        </View>
        {teamWallPreviews.length > 0 ? (
          <View style={[s.previewCard, { marginHorizontal: 16 }]}>
            {teamWallPreviews.map((post, i) => (
              <TouchableOpacity
                key={`post-${i}`}
                style={[s.previewRow, i < teamWallPreviews.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.glassBorder }]}
                onPress={() => router.push('/(tabs)/coach-team-hub' as any)}
                activeOpacity={0.7}
              >
                <View style={s.previewContent}>
                  <View style={s.previewTopRow}>
                    <Text style={s.previewName} numberOfLines={1}>{post.authorName}</Text>
                    <Text style={s.previewTime}>{timeAgo(post.createdAt)}</Text>
                  </View>
                  <Text style={s.previewMessage} numberOfLines={2}>{post.content}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Card style={{ marginHorizontal: 16, padding: 28, alignItems: 'center' }}>
            <Ionicons name="newspaper-outline" size={32} color={colors.textMuted} />
            <Text style={s.emptySubtext}>No posts yet — share an update with your team!</Text>
          </Card>
        )}
      </View>

    </ScrollView>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || colors.card,
  },
  sectionBlock: {
    marginBottom: 24,
  },

  // ========== HEADER BAR ==========
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C5F7C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 48,
  },

  // ========== HERO CAROUSEL ==========
  carouselWrap: {
    marginTop: 12,
    marginBottom: 4,
  },
  heroCard: {
    width: CARD_WIDTH,
    height: 300,
    borderRadius: radii.card,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    ...shadows.cardHover,
  },
  heroCtaCard: {
    width: CARD_WIDTH,
    height: 300,
    borderRadius: radii.card,
    backgroundColor: colors.glassCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    ...shadows.card,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  heroCardEmpty: {
    height: 180,
    borderRadius: radii.card,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    justifyContent: 'flex-end',
  },
  heroBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    zIndex: 5,
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  heroContent: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  heroContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroCountdown: {
    fontSize: 12,
    fontWeight: '800',
    color: '#14B8A6',
    letterSpacing: 2,
    marginBottom: 2,
  },
  heroTitle: {
    ...displayTextStyle,
    fontSize: 28,
    color: '#FFF',
  },
  heroTeamName: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  heroMetaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
  },
  heroOpponent: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  heroRsvpPill: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 64,
  },
  heroRsvpLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  heroRsvpCount: {
    ...displayTextStyle,
    fontSize: 22,
    color: '#FFF',
    marginVertical: 1,
  },
  heroRsvpSub: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
  },
  heroPrepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroPrepBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  heroDotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 8,
  },
  heroDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroDotIcon: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFF',
  },

  // Pagination dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotInactive: {
    backgroundColor: colors.glassBorder,
  },

  // ========== TEAM HEALTH ==========
  healthRow: {
    flexDirection: 'row',
    gap: 10,
  },
  healthCard: {
    flex: 1,
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderTopWidth: 3,
    borderTopColor: colors.primary,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.card,
  },
  healthNum: {
    ...displayTextStyle,
    fontSize: 18,
    color: colors.text,
    marginTop: 6,
    textAlign: 'center',
  },
  healthLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ========== SEASON OVERVIEW ==========
  seasonStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  seasonStatBox: {
    flex: 1,
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderTopWidth: 3,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.card,
  },
  seasonStatNum: {
    ...displayTextStyle,
    fontSize: 22,
  },
  seasonStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // ========== QUICK ACTIONS ==========
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '47%' as any,
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.card,
  },
  actionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  pendingBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 4,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#fff',
  },

  // ========== PREVIEW CARDS (Chat + Team Feed) ==========
  previewCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
    ...shadows.card,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  previewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  previewAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  previewContent: {
    flex: 1,
  },
  previewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  previewName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  previewTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  previewMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  // ========== EMPTY STATES ==========
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
