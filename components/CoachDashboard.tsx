import {
  checkRoleAchievements,
  fetchUserXP,
  getUnseenRoleAchievements,
  markAchievementsSeen,
  type RoleAchievementWithStatus,
  getRoleAchievements,
} from '@/lib/achievement-engine';
import type { UnseenAchievement } from '@/lib/achievement-types';
import { useAuth } from '@/lib/auth';
import { getDefaultHeroImage } from '@/lib/default-images';
import { displayTextStyle, radii, shadows } from '@/lib/design-tokens';
import { getLevelTier } from '@/lib/engagement-constants';
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
import AchievementCelebrationModal from './AchievementCelebrationModal';
import LevelBadge from './LevelBadge';
import AppHeaderBar from './ui/AppHeaderBar';
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
  location_type: string | null;
};

type ChatPreview = {
  channelId: string;
  channelName: string;
  senderName: string;
  senderInitials: string;
  content: string;
  createdAt: string;
  unreadCount: number;
};

type TeamPost = {
  id: string;
  authorName: string;
  avatarUrl: string | null;
  content: string;
  mediaUrls: string[] | null;
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
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

function getHeroCountdown(dateStr: string): { text: string; urgent: boolean } {
  const eventDate = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return { text: 'TODAY', urgent: true };
  if (diffDays === 1) return { text: 'TOMORROW', urgent: true };
  if (diffDays <= 7) return { text: `IN ${diffDays} DAYS`, urgent: diffDays <= 3 };
  return { text: eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), urgent: false };
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const locationTypeConfig: Record<string, { label: string; color: string }> = {
  home: { label: 'HOME', color: '#14B8A6' },
  away: { label: 'AWAY', color: '#E8913A' },
  neutral: { label: 'NEUTRAL', color: '#0EA5E9' },
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
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [pendingStatsCount, setPendingStatsCount] = useState(0);
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [latestPost, setLatestPost] = useState<TeamPost | null>(null);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const [prepProgress, setPrepProgress] = useState<Record<string, { rsvps: boolean; attendance: boolean; lineup: boolean }>>({});
  const [availableCount, setAvailableCount] = useState<{ available: number; total: number } | null>(null);
  const [coachXp, setCoachXp] = useState({ totalXp: 0, level: 1, progress: 0, nextLevelXp: 100 });
  const [coachBadges, setCoachBadges] = useState<RoleAchievementWithStatus[]>([]);
  const [unseenAchievements, setUnseenAchievements] = useState<UnseenAchievement[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

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
          team_id, staff_role,
          teams ( id, name, season_id, seasons (name), age_groups (name) )
        `)
        .eq('user_id', user.id);

      // Also check team_coaches table as fallback
      const { data: coachTeams } = await supabase
        .from('team_coaches')
        .select(`
          team_id, role,
          teams ( id, name, season_id, seasons (name), age_groups (name) )
        `)
        .eq('coach_id', user.id);

      // Merge both, deduplicating by team_id
      const mergedTeams: any[] = [...(allStaffTeams || [])];
      const existingTeamIds = new Set(mergedTeams.map(t => (t.teams as any)?.id).filter(Boolean));
      for (const ct of (coachTeams || [])) {
        const teamId = (ct.teams as any)?.id;
        if (teamId && !existingTeamIds.has(teamId)) {
          mergedTeams.push({ ...ct, staff_role: ct.role });
          existingTeamIds.add(teamId);
        }
      }

      // Fallback: coaches → teams
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

      // Batch player counts and game results
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

      const teamsWithCounts: CoachTeam[] = seasonTeams.map(t => {
        const team = t.teams as any;
        return {
          id: team.id,
          name: team.name,
          role: (t.staff_role || 'assistant_coach') as 'head_coach' | 'assistant_coach',
          season_name: team.seasons?.name || '',
          player_count: playerCountMap.get(team.id) || 0,
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
      if (activeTeamIndex >= teamsWithCounts.length) setActiveTeamIndex(0);

      // Fetch coach XP, achievements, and check for new unlocks
      (async () => {
        try {
          const [xpData, badges, unseen] = await Promise.all([
            fetchUserXP(user.id),
            getRoleAchievements(user.id, 'coach'),
            getUnseenRoleAchievements(user.id),
          ]);
          setCoachXp(xpData);
          setCoachBadges(badges);
          if (unseen.length > 0) {
            setUnseenAchievements(unseen);
            setShowCelebration(true);
          }

          // Trigger achievement check in background
          checkRoleAchievements(user.id, 'coach', workingSeason?.id).then(({ newUnlocks }) => {
            if (newUnlocks.length > 0) {
              // Refresh badges and check for unseen
              getRoleAchievements(user.id, 'coach').then(setCoachBadges);
              getUnseenRoleAchievements(user.id).then((u) => {
                if (u.length > 0) {
                  setUnseenAchievements(u);
                  setShowCelebration(true);
                }
              });
              fetchUserXP(user.id).then(setCoachXp);
            }
          });
        } catch {}
      })();
    } catch (error) {
      if (__DEV__) console.error('Error fetching coach data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatPreviews = async (teamId?: string) => {
    if (!user?.id) return;
    try {
      let query = supabase
        .from('channel_members')
        .select('channel_id, last_read_at, chat_channels!inner(id, name, channel_type, team_id)')
        .eq('user_id', user.id)
        .is('left_at', null);

      if (teamId) {
        query = query.eq('chat_channels.team_id', teamId);
      }

      const { data: memberships } = await query;

      if (!memberships || memberships.length === 0) {
        setChatPreviews([]);
        return;
      }

      let mostRecent: ChatPreview | null = null;
      let mostRecentTime = 0;

      for (const m of memberships.slice(0, 10)) {
        const channel = m.chat_channels as any;
        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select('content, created_at, profiles:sender_id(full_name)')
          .eq('channel_id', m.channel_id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMsg) {
          const msgTime = new Date(lastMsg.created_at).getTime();
          if (msgTime > mostRecentTime) {
            const { count } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('channel_id', m.channel_id)
              .eq('is_deleted', false)
              .gt('created_at', m.last_read_at || '1970-01-01');

            const senderName = (lastMsg.profiles as any)?.full_name || 'Unknown';
            const nameParts = senderName.split(' ').filter(Boolean);
            const initials = nameParts.length >= 2
              ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
              : nameParts.length === 1 ? nameParts[0][0].toUpperCase() : '?';

            mostRecentTime = msgTime;
            mostRecent = {
              channelId: m.channel_id,
              channelName: channel?.name || 'Chat',
              senderName,
              senderInitials: initials,
              content: lastMsg.content || '(media)',
              createdAt: lastMsg.created_at,
              unreadCount: count || 0,
            };
          }
        }
      }

      setChatPreviews(mostRecent ? [mostRecent] : []);
    } catch (error) {
      if (__DEV__) console.error('Error fetching chat previews:', error);
    }
  };

  const fetchTeamSpecificData = async (teamId: string) => {
    if (!workingSeason?.id) return;
    try {
      // Upcoming events for this team — match parent query pattern (no join, no server sort)
      const today = new Date().toISOString().split('T')[0];
      const { data: events, error: eventsErr } = await supabase
        .from('schedule_events')
        .select('id, title, event_type, event_date, event_time, start_time, location, location_type, opponent, team_id')
        .eq('team_id', teamId)
        .gte('event_date', today);

      if (__DEV__ && eventsErr) console.error('[CoachDashboard] events query error:', eventsErr);

      // Get team name from already-loaded teams state
      const teamObj = teams.find(t => t.id === teamId);
      const teamName = teamObj?.name || '';

      // Sort client-side by date + time (same as parent)
      const sorted = (events || []).slice().sort((a, b) => {
        const dateComp = a.event_date.localeCompare(b.event_date);
        if (dateComp !== 0) return dateComp;
        const aTime = a.start_time || a.event_time || '';
        const bTime = b.start_time || b.event_time || '';
        return aTime.localeCompare(bTime);
      });

      const mappedEvents: UpcomingEvent[] = sorted.slice(0, 10).map(e => ({
        id: e.id,
        title: e.title,
        type: e.event_type as 'game' | 'practice',
        date: e.event_date,
        time: e.start_time || e.event_time || '',
        location: e.location,
        opponent: e.opponent,
        team_name: teamName,
        team_id: e.team_id,
        location_type: e.location_type || null,
      }));
      setUpcomingEvents(mappedEvents);

      // Chat preview for this team
      await fetchChatPreviews(teamId);

      // Attendance rate (last 5 events)
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

      // RSVP count for next event
      const { data: nextEvents } = await supabase
        .from('schedule_events')
        .select('id')
        .eq('team_id', teamId)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(1);

      if (nextEvents && nextEvents.length > 0) {
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
        setAvailableCount(null);
      }

      // Season progress
      const { count: playedGameCount } = await supabase
        .from('schedule_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('event_type', 'game')
        .not('game_result', 'is', null);
      setGamesPlayed(playedGameCount || 0);

      // Pending stats
      const { count: pendingCount } = await supabase
        .from('schedule_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('event_type', 'game')
        .eq('game_status', 'completed')
        .or('stats_entered.is.null,stats_entered.eq.false');
      setPendingStatsCount(pendingCount || 0);

      // Latest team wall post (enhanced with avatar + media)
      const { data: postData } = await supabase
        .from('team_posts')
        .select('id, content, created_at, media_urls, profiles:author_id(full_name, avatar_url)')
        .eq('team_id', teamId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (postData) {
        setLatestPost({
          id: postData.id,
          authorName: (postData.profiles as any)?.full_name || 'Coach',
          avatarUrl: (postData.profiles as any)?.avatar_url || null,
          content: postData.content || '',
          mediaUrls: postData.media_urls || null,
          createdAt: postData.created_at,
        });
      } else {
        setLatestPost(null);
      }

      // Game prep progress
      const gameEvents = mappedEvents.filter(e => e.type === 'game');
      if (gameEvents.length > 0) {
        const gameIds = gameEvents.map(e => e.id);
        const [rsvpRes, attendRes, lineupRes] = await Promise.all([
          supabase.from('event_rsvps').select('event_id').in('event_id', gameIds),
          supabase.from('event_attendance').select('event_id').in('event_id', gameIds),
          supabase.from('game_lineups').select('event_id').in('event_id', gameIds).eq('is_starter', true),
        ]);
        const progress: Record<string, { rsvps: boolean; attendance: boolean; lineup: boolean }> = {};
        for (const id of gameIds) {
          progress[id] = {
            rsvps: (rsvpRes.data || []).some(r => r.event_id === id),
            attendance: (attendRes.data || []).some(a => a.event_id === id),
            lineup: (lineupRes.data || []).some(l => l.event_id === id),
          };
        }
        setPrepProgress(prev => ({ ...prev, ...progress }));
      }
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
  const activeTeamEvents = upcomingEvents;

  const totalWins = activeTeam ? activeTeam.wins : teams.reduce((sum, t) => sum + t.wins, 0);
  const totalLosses = activeTeam ? activeTeam.losses : teams.reduce((sum, t) => sum + t.losses, 0);
  const totalGamesPlayed = totalWins + totalLosses;

  const userInitials = (() => {
    const name = profile?.full_name || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return '?';
  })();

  // Carousel: up to 5 events + CTA card (or empty card when no events)
  const carouselData: { type: 'event' | 'cta' | 'empty'; event?: UpcomingEvent }[] = [
    ...(activeTeamEvents.length === 0
      ? [{ type: 'empty' as const }]
      : activeTeamEvents.slice(0, 5).map(e => ({ type: 'event' as const, event: e }))),
    { type: 'cta' as const },
  ];

  // Next game countdown for season record meta
  const nextGameEvent = activeTeamEvents.find(e => e.type === 'game');
  const nextGameCountdown = nextGameEvent
    ? getHeroCountdown(nextGameEvent.date).text
    : null;

  // Today's game for quick action button
  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();
  const todaysGame = activeTeamEvents.find(e => e.type === 'game' && e.date === todayStr);

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
    <>
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
      {/* 2. TEAM SELECTOR (Fix 1 — no wrapper View, PillTabs handles it)  */}
      {/* ================================================================ */}
      {teams.length > 1 && (
        <PillTabs
          tabs={teams.map(t => ({ key: t.id, label: t.name }))}
          activeKey={activeTeam?.id || teams[0]?.id}
          onChange={(key) => setActiveTeamIndex(teams.findIndex(t => t.id === key))}
        />
      )}

      {/* ================================================================ */}
      {/* 3. SEASON RECORD                                                  */}
      {/* ================================================================ */}
      {activeTeam && (
        <View style={s.sectionBlock}>
          <TouchableOpacity
            style={[s.progressCard, { marginHorizontal: 16 }]}
            onPress={() => router.push('/standings' as any)}
            activeOpacity={0.8}
          >
            <View style={s.progressHeader}>
              <Ionicons name="trophy-outline" size={16} color={colors.teal} />
              <Text style={s.progressTitle}>SEASON RECORD</Text>
            </View>

            {/* Big numbers: Games / Wins / Losses */}
            <View style={s.progressStats}>
              <View style={s.progressStat}>
                <Text style={s.progressNumber}>{totalGamesPlayed}</Text>
                <Text style={s.progressLabel}>Games</Text>
              </View>
              <View style={s.progressStat}>
                <Text style={[s.progressNumber, { color: '#10B981' }]}>{totalWins}</Text>
                <Text style={s.progressLabel}>Wins</Text>
              </View>
              <View style={s.progressStat}>
                <Text style={[s.progressNumber, { color: '#EF4444' }]}>{totalLosses}</Text>
                <Text style={s.progressLabel}>Losses</Text>
              </View>
            </View>

            {/* Win percentage bar */}
            {totalGamesPlayed > 0 && (
              <View style={s.progressBar}>
                <View style={[s.progressBarFill, {
                  width: `${Math.round((totalWins / totalGamesPlayed) * 100)}%` as any,
                }]} />
              </View>
            )}

            {/* Meta stats row */}
            <View style={s.seasonMetaRow}>
              <View style={s.seasonMetaItem}>
                <Ionicons name="people-outline" size={12} color={colors.textMuted} />
                <Text style={s.seasonMetaText}>{activeTeam.player_count} Players</Text>
              </View>
              {attendanceRate !== null && (
                <View style={s.seasonMetaItem}>
                  <Ionicons name="checkmark-circle-outline" size={12} color={colors.textMuted} />
                  <Text style={s.seasonMetaText}>{attendanceRate}% Attend</Text>
                </View>
              )}
              {nextGameCountdown && (
                <View style={s.seasonMetaItem}>
                  <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                  <Text style={s.seasonMetaText}>{nextGameCountdown}</Text>
                </View>
              )}
              {pendingStatsCount > 0 && (
                <View style={s.seasonMetaItem}>
                  <Ionicons name="alert-circle-outline" size={12} color={colors.warning} />
                  <Text style={[s.seasonMetaText, { color: colors.warning }]}>{pendingStatsCount} need stats</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ================================================================ */}
      {/* 3b. COACH LEVEL & BADGE SHOWCASE                                  */}
      {/* ================================================================ */}
      {coachXp.level > 0 && (
        <View style={s.sectionBlock}>
          <View style={[s.levelCard, { marginHorizontal: 16 }]}>
            {/* Level + XP Bar */}
            <View style={s.levelRow}>
              <LevelBadge level={coachXp.level} size="medium" />
              <View style={s.levelInfo}>
                <Text style={s.levelLabel}>Level {coachXp.level}</Text>
                <View style={s.xpBarBg}>
                  <View style={[s.xpBarFill, { width: `${Math.min(coachXp.progress, 100)}%` as any }]} />
                </View>
                <Text style={s.xpText}>{coachXp.totalXp} / {coachXp.nextLevelXp} XP</Text>
              </View>
            </View>

            {/* Badge Showcase — earned badges, rarest first */}
            {coachBadges.filter(b => b.earned).length > 0 && (
              <View style={s.badgeShowcase}>
                <Text style={s.badgeShowcaseLabel}>BADGES EARNED</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {coachBadges
                    .filter(b => b.earned)
                    .sort((a, b) => {
                      const order = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
                      return order.indexOf(a.rarity) - order.indexOf(b.rarity);
                    })
                    .map(badge => (
                      <View key={badge.id} style={[s.badgePill, { borderColor: getLevelTier(coachXp.level).color + '40' }]}>
                        <Text style={s.badgeIcon}>{badge.icon}</Text>
                        <Text style={s.badgeName} numberOfLines={1}>{badge.name}</Text>
                      </View>
                    ))}
                </ScrollView>
              </View>
            )}

            {/* Almost there nudge */}
            {(() => {
              const nudge = coachBadges
                .filter(b => !b.earned && b.stat_key && b.threshold)
                .map(b => {
                  const current = 0; // We'd need stats here; show as a prompt to check achievements
                  return b;
                })
                .find(() => false); // Nudge requires stat context — handled in Phase 6
              return null;
            })()}
          </View>
        </View>
      )}

      {/* ================================================================ */}
      {/* 4. HERO EVENT CAROUSEL                                            */}
      {/* ================================================================ */}
      {activeTeam && (
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
              keyExtractor={(item, index) => item.event?.id || `${item.type}-${index}`}
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

                if (item.type === 'empty') {
                  return (
                    <View style={s.heroCard}>
                      <LinearGradient
                        colors={['#2C5F7C', '#1B2838']}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0.3, y: 1 }}
                      />
                      <View style={[s.heroContent, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="calendar-outline" size={40} color="rgba(255,255,255,0.5)" />
                        <Text style={[s.heroTitle, { marginTop: 12, textAlign: 'center', fontSize: 22 }]}>
                          No Upcoming Events
                        </Text>
                        <Text style={[s.heroMetaText, { marginTop: 6, textAlign: 'center' }]}>
                          Check back later or add events from the schedule tab.
                        </Text>
                      </View>
                    </View>
                  );
                }

                const evt = item.event!;
                const eventColor = evt.type === 'game' ? '#EF4444' : '#10B981';
                const countdown = getHeroCountdown(evt.date);
                const locConf = evt.location_type ? locationTypeConfig[evt.location_type] : null;

                return (
                  <TouchableOpacity
                    style={s.heroCard}
                    onPress={() => router.push(`/game-prep-wizard?eventId=${evt.id}&teamId=${activeTeam.id}` as any)}
                    activeOpacity={0.9}
                  >
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

                    {/* Event type badge - top left */}
                    <View style={[s.heroBadge, { backgroundColor: eventColor }]}>
                      <Text style={s.heroBadgeText}>
                        {evt.type === 'game' ? 'GAME DAY' : 'PRACTICE'}
                      </Text>
                    </View>

                    {/* HOME/AWAY badge - top right */}
                    {locConf && (
                      <View style={[s.heroLocBadge, { backgroundColor: locConf.color }]}>
                        <Text style={s.heroLocBadgeText}>{locConf.label}</Text>
                      </View>
                    )}

                    <View style={s.heroContent}>
                      <View style={s.heroContentRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.heroCountdown, countdown.urgent && { color: '#F97316' }]}>
                            {countdown.text}
                          </Text>
                          <Text style={s.heroTitle}>
                            {evt.type === 'game' ? 'GAME DAY' : 'PRACTICE'}
                          </Text>

                          {/* Opponent */}
                          {evt.type === 'game' && evt.opponent && (
                            <Text style={s.heroOpponent}>vs {evt.opponent}</Text>
                          )}

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

                          {/* Team name for multi-team coaches */}
                          {teams.length > 1 && (
                            <Text style={s.heroTeamLabel}>{activeTeam.name}</Text>
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

                      {/* Game Prep / Game Day button */}
                      {evt.type === 'game' && (
                        <View>
                          {countdown.text === 'TODAY' ? (
                            <TouchableOpacity
                              style={s.heroGameDayBtn}
                              onPress={() => router.push(`/game-prep?startLive=${evt.id}` as any)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="play-circle" size={14} color="#000" />
                              <Text style={s.heroGameDayBtnText}>Game Day</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={s.heroPrepBtn}
                              onPress={() => router.push(`/game-prep-wizard?eventId=${evt.id}&teamId=${activeTeam.id}` as any)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="clipboard" size={14} color="#FFF" />
                              <Text style={s.heroPrepBtnText}>Game Prep</Text>
                            </TouchableOpacity>
                          )}
                          {prepProgress[evt.id] && (
                            <View style={s.prepProgressRow}>
                              <Text style={s.prepProgressLabel}>
                                Prep: {[prepProgress[evt.id].rsvps, prepProgress[evt.id].attendance, prepProgress[evt.id].lineup].filter(Boolean).length}/3
                              </Text>
                              {prepProgress[evt.id].rsvps && prepProgress[evt.id].attendance && prepProgress[evt.id].lineup && (
                                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                              )}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Pagination dots */}
          {carouselData.length > 1 && (
            <View style={s.dotsRow}>
              {carouselData.map((_, i) => (
                <View key={i} style={[s.dot, i === activeCarouselIndex ? s.dotActive : s.dotInactive]} />
              ))}
            </View>
          )}
        </>
      )}

      {/* ================================================================ */}
      {/* 5. QUICK ACTIONS                                                  */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Quick Actions" />
        </View>
        <View style={[s.quickRow, { paddingHorizontal: 16 }]}>
          <TouchableOpacity
            style={[s.quickBtn, todaysGame && { borderTopColor: '#F97316', borderTopWidth: 3 }]}
            onPress={() => router.push(todaysGame ? `/game-prep?startLive=${todaysGame.id}` as any : '/game-prep' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="play-circle" size={20} color={todaysGame ? '#F97316' : colors.primary} />
            <Text style={s.quickLabel}>Game Day</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.quickBtn}
            onPress={() => router.push('/game-prep-wizard' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="clipboard" size={20} color={colors.primary} />
            <Text style={s.quickLabel}>Game Prep</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.quickBtn}
            onPress={() => router.push(activeTeam ? { pathname: '/team-roster' as any, params: { teamId: activeTeam.id } } : '/team-roster' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={s.quickLabel}>Roster</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.quickBtn}
            onPress={() => router.push('/game-prep' as any)}
            activeOpacity={0.7}
          >
            <View>
              <Ionicons name="stats-chart" size={20} color={colors.primary} />
              {pendingStatsCount > 0 && (
                <View style={s.pendingBadge}>
                  <Text style={s.pendingBadgeText}>{pendingStatsCount}</Text>
                </View>
              )}
            </View>
            <Text style={s.quickLabel}>Enter Stats</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================================================================ */}
      {/* 6. TEAM HUB PREVIEW                                               */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Team Hub" action="View All" onAction={() => router.push('/(tabs)/coach-team-hub' as any)} />
        </View>
        {latestPost ? (
          <TouchableOpacity
            style={s.teamHubCard}
            onPress={() => router.push('/(tabs)/coach-team-hub' as any)}
            activeOpacity={0.8}
          >
            <View style={s.teamHubHeader}>
              {latestPost.avatarUrl ? (
                <Image source={{ uri: latestPost.avatarUrl }} style={s.teamHubAvatar} />
              ) : (
                <View style={[s.teamHubAvatar, s.teamHubAvatarPlaceholder]}>
                  <Ionicons name="person" size={16} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.teamHubAuthor}>{latestPost.authorName}</Text>
                <Text style={s.teamHubTime}>{timeAgo(latestPost.createdAt)}</Text>
              </View>
            </View>
            <Text style={s.teamHubContent} numberOfLines={2}>{latestPost.content}</Text>
            {latestPost.mediaUrls && latestPost.mediaUrls.length > 0 && (
              <Image source={{ uri: latestPost.mediaUrls[0] }} style={s.teamHubImage} resizeMode="cover" />
            )}
          </TouchableOpacity>
        ) : (
          <View style={[s.teamHubCard, { alignItems: 'center' as const, paddingVertical: 24 }]}>
            <Ionicons name="newspaper-outline" size={24} color={colors.textMuted} />
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>No team posts yet</Text>
          </View>
        )}
      </View>

      {/* ================================================================ */}
      {/* 7. CHAT PREVIEW                                                   */}
      {/* ================================================================ */}
      {chatPreviews.length > 0 && (
        <View style={s.sectionBlock}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="Chat Preview" action="View All" onAction={() => router.push('/(tabs)/coach-chat' as any)} />
          </View>
          <TouchableOpacity
            style={s.chatCard}
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: chatPreviews[0].channelId } } as any)}
            activeOpacity={0.8}
          >
            <View style={s.chatIconWrap}>
              <Ionicons name="chatbubble-ellipses" size={20} color={colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.chatHeaderRow}>
                <Text style={s.chatChannelName} numberOfLines={1}>{chatPreviews[0].channelName}</Text>
                <Text style={s.chatTime}>{timeAgo(chatPreviews[0].createdAt)}</Text>
              </View>
              <Text style={s.chatSnippet} numberOfLines={1}>
                {chatPreviews[0].senderName}: {chatPreviews[0].content}
              </Text>
            </View>
            {chatPreviews[0].unreadCount > 0 && (
              <View style={s.chatUnreadBadge}>
                <Text style={s.chatUnreadText}>{chatPreviews[0].unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>

    {/* Achievement Celebration Modal */}
    {showCelebration && unseenAchievements.length > 0 && (
      <AchievementCelebrationModal
        unseen={unseenAchievements}
        onDismiss={() => {
          setShowCelebration(false);
          if (user?.id) markAchievementsSeen(user.id);
        }}
        onViewAllTrophies={() => {
          setShowCelebration(false);
          if (user?.id) markAchievementsSeen(user.id);
          router.push('/team-hub' as any);
        }}
        themeColors={{
          bg: colors.background,
          card: colors.card,
          cardAlt: colors.cardAlt || colors.card,
          border: colors.border,
          text: colors.text,
          textSecondary: colors.textSecondary,
          textMuted: colors.textMuted,
          gold: '#FFD700',
        }}
      />
    )}
    </>
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
    marginBottom: 14,
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
    ...displayTextStyle,
    fontSize: 14,
    color: colors.teal,
  },
  heroBadge: {
    position: 'absolute' as const,
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 5,
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  heroLocBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 5,
  },
  heroLocBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    textTransform: 'uppercase' as const,
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
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  heroTeamLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 2,
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
  heroGameDayBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F97316',
  },
  heroGameDayBtnText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#000',
    letterSpacing: 0.5,
  },
  prepProgressRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 4,
  },
  prepProgressLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.7)',
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: colors.teal || colors.primary,
  },
  dotInactive: {
    backgroundColor: colors.glassBorder,
  },

  // ========== SEASON RECORD (Fix 2) ==========
  progressCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    ...shadows.card,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressNumber: {
    ...displayTextStyle,
    fontSize: 24,
    color: colors.text,
  },
  progressLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.glassBorder,
    overflow: 'hidden' as const,
    marginBottom: 12,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  seasonMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  seasonMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seasonMetaText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // ========== QUICK ACTIONS (Fix 4 — 1 row × 4) ==========
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderTopWidth: 3,
    borderTopColor: colors.primary,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.card,
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  pendingBadge: {
    position: 'absolute' as const,
    top: -6,
    right: -8,
    backgroundColor: colors.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 3,
  },
  pendingBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#fff',
  },

  // ========== TEAM HUB PREVIEW (Fix 7) ==========
  teamHubCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    marginHorizontal: 16,
    ...shadows.card,
  },
  teamHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  teamHubAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  teamHubAvatarPlaceholder: {
    backgroundColor: colors.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamHubAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  teamHubTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  teamHubContent: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  teamHubImage: {
    width: '100%' as any,
    height: 120,
    borderRadius: 8,
    marginTop: 10,
  },

  // ========== CHAT PREVIEW (Fix 6) ==========
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    marginHorizontal: 16,
    gap: 12,
    ...shadows.card,
  },
  chatIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: (colors.teal || colors.primary) + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatChannelName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  chatTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  chatSnippet: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  chatUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.teal || colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  chatUnreadText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },

  // ========== LEVEL & BADGE SHOWCASE ==========
  levelCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    ...shadows.card,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelInfo: {
    flex: 1,
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  xpBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bgSecondary || 'rgba(255,255,255,0.1)',
    overflow: 'hidden' as const,
  },
  xpBarFill: {
    height: '100%' as any,
    borderRadius: 3,
    backgroundColor: colors.teal || '#14B8A6',
  },
  xpText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  badgeShowcase: {
    marginTop: 12,
    gap: 6,
  },
  badgeShowcaseLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  badgeIcon: {
    fontSize: 14,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    maxWidth: 80,
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
