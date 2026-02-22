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
import React, { useEffect, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AppHeaderBar from './ui/AppHeaderBar';
import Avatar from './ui/Avatar';
import Badge from './ui/Badge';
import Card from './ui/Card';
import MatchCard from './ui/MatchCard';
import PillTabs from './ui/PillTabs';
import SectionHeader from './ui/SectionHeader';

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

type TopPerformer = {
  player_id: string;
  player_name: string;
  initials: string;
  stat_label: string;
  stat_value: number;
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
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [availableCount, setAvailableCount] = useState<{ available: number; total: number } | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [pendingStatsCount, setPendingStatsCount] = useState(0);
  const [badgesEarnedCount, setBadgesEarnedCount] = useState(0);
  const [nextEventId, setNextEventId] = useState<string | null>(null);

  useEffect(() => {
    fetchCoachData();
  }, [user?.id, workingSeason?.id]);

  // Re-fetch team-specific data when active team changes
  useEffect(() => {
    if (teams.length > 0) {
      const activeTeam = teams[activeTeamIndex];
      if (activeTeam) {
        fetchTeamSpecificData(activeTeam.id);
      }
    }
  }, [activeTeamIndex, teams, workingSeason?.id]);

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
        // Batch player counts
        const { data: allTeamPlayers } = await supabase
          .from('team_players')
          .select('team_id')
          .in('team_id', staffTeamIds);

        for (const tp of (allTeamPlayers || [])) {
          playerCountMap.set(tp.team_id, (playerCountMap.get(tp.team_id) || 0) + 1);
        }

        // Batch game results
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

      // Sort: head_coach first, then assistant_coach
      teamsWithCounts.sort((a, b) => {
        if (a.role === 'head_coach' && b.role !== 'head_coach') return -1;
        if (a.role !== 'head_coach' && b.role === 'head_coach') return 1;
        return a.name.localeCompare(b.name);
      });

      setTeams(teamsWithCounts);
      setTotalPlayers(total);

      // Reset active team index if out of bounds
      if (activeTeamIndex >= teamsWithCounts.length) {
        setActiveTeamIndex(0);
      }

      // Fetch upcoming events for these teams
      const teamIds = teamsWithCounts.map(t => t.id);
      if (teamIds.length > 0) {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const { data: events } = await supabase
          .from('schedule_events')
          .select(`
            id,
            title,
            event_type,
            event_date,
            start_time,
            location,
            opponent,
            team_id,
            teams (name)
          `)
          .in('team_id', teamIds)
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(20);

        const formattedEvents: UpcomingEvent[] = (events || []).map(e => ({
          id: e.id,
          title: e.title,
          type: e.event_type as 'game' | 'practice',
          date: e.event_date,
          time: e.start_time || '',
          location: e.location,
          opponent: e.opponent,
          team_name: (e.teams as any)?.name || '',
          team_id: e.team_id,
        }));

        setUpcomingEvents(formattedEvents);

        // Season progress will be updated per active team in fetchTeamSpecificData
      }

    } catch (error) {
      if (__DEV__) console.error('Error fetching coach data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamSpecificData = async (teamId: string) => {
    if (!workingSeason?.id) return;
    try {
      // Fetch attendance rate for recent events
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

      // Fetch availability for next event
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

      // Fetch season progress for this team
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

      // Pending stats count (completed games without stats entered)
      const { count: pendingCount } = await supabase
        .from('schedule_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('event_type', 'game')
        .eq('game_status', 'completed')
        .or('stats_entered.is.null,stats_entered.eq.false');
      setPendingStatsCount(pendingCount || 0);

      // Fetch top performers from recent game stats
      const { data: recentGameStats } = await supabase
        .from('game_player_stats')
        .select(`
          player_id,
          kills,
          aces,
          blocks,
          digs,
          assists,
          players (first_name, last_name)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentGameStats && recentGameStats.length > 0) {
        // Aggregate stats by player and find top 3
        const playerMap = new Map<string, { name: string; kills: number; aces: number; blocks: number; digs: number; assists: number }>();

        for (const stat of recentGameStats) {
          const player = stat.players as any;
          if (!player) continue;
          const name = `${player.first_name || ''} ${player.last_name || ''}`.trim();
          const existing = playerMap.get(stat.player_id) || { name, kills: 0, aces: 0, blocks: 0, digs: 0, assists: 0 };
          existing.kills += stat.kills || 0;
          existing.aces += stat.aces || 0;
          existing.blocks += stat.blocks || 0;
          existing.digs += stat.digs || 0;
          existing.assists += stat.assists || 0;
          playerMap.set(stat.player_id, existing);
        }

        const performers: TopPerformer[] = [];
        for (const [playerId, data] of playerMap.entries()) {
          const bestStat = Math.max(data.kills, data.aces, data.blocks, data.digs, data.assists);
          let statLabel = '';
          let statValue = 0;

          if (data.kills >= data.aces && data.kills >= data.blocks && data.kills >= data.digs && data.kills >= data.assists) {
            statLabel = 'kills';
            statValue = data.kills;
          } else if (data.aces >= data.blocks && data.aces >= data.digs && data.aces >= data.assists) {
            statLabel = 'aces';
            statValue = data.aces;
          } else if (data.blocks >= data.digs && data.blocks >= data.assists) {
            statLabel = 'blocks';
            statValue = data.blocks;
          } else if (data.digs >= data.assists) {
            statLabel = 'digs';
            statValue = data.digs;
          } else {
            statLabel = 'assists';
            statValue = data.assists;
          }

          const nameParts = data.name.split(' ');
          const initials = nameParts.map(n => n[0] || '').join('').toUpperCase().slice(0, 2);

          performers.push({
            player_id: playerId,
            player_name: data.name,
            initials,
            stat_label: statLabel,
            stat_value: statValue,
          });
        }

        performers.sort((a, b) => b.stat_value - a.stat_value);
        setTopPerformers(performers.slice(0, 3));
      } else {
        setTopPerformers([]);
      }

      // Fetch badges earned by team players this season
      const { data: teamPlayerIds } = await supabase
        .from('team_players')
        .select('player_id')
        .eq('team_id', teamId);

      if (teamPlayerIds && teamPlayerIds.length > 0) {
        const pIds = teamPlayerIds.map(tp => tp.player_id);
        const { count: badgeCount } = await supabase
          .from('player_achievements')
          .select('*', { count: 'exact', head: true })
          .in('player_id', pIds);
        setBadgesEarnedCount(badgeCount || 0);
      } else {
        setBadgesEarnedCount(0);
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
  // HELPERS
  // ============================================

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const getCountdownText = (dateStr: string) => {
    const eventDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'TOMORROW';
    if (diffDays < 7) return `IN ${diffDays} DAYS`;
    return `IN ${diffDays} DAYS`;
  };

  const getAttendanceColor = (rate: number) => {
    if (rate > 80) return colors.success;
    if (rate > 60) return colors.warning;
    return colors.danger;
  };

  const activeTeam = teams[activeTeamIndex] || null;

  // Filter upcoming events to active team
  const activeTeamEvents = activeTeam
    ? upcomingEvents.filter(e => e.team_id === activeTeam.id)
    : upcomingEvents;

  const nextEvent = activeTeamEvents.length > 0 ? activeTeamEvents[0] : null;

  // Season progress (scoped to active team)
  const totalWins = activeTeam ? activeTeam.wins : teams.reduce((sum, t) => sum + t.wins, 0);
  const totalLosses = activeTeam ? activeTeam.losses : teams.reduce((sum, t) => sum + t.losses, 0);
  const winRate = gamesPlayed > 0 ? Math.round((totalWins / gamesPlayed) * 100) : 0;

  const userInitials = (() => {
    const name = profile?.full_name || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return '?';
  })();

  // Find secondary event: next game if hero is practice, or next practice if hero is game
  const secondaryEvent = React.useMemo(() => {
    if (!nextEvent || activeTeamEvents.length < 2) return null;
    const heroType = nextEvent.type;
    return activeTeamEvents.slice(1).find(e => e.type !== heroType) || null;
  }, [nextEvent, activeTeamEvents]);

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
  // RENDER — v0 layout
  // ============================================

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
    >

      {/* ================================================================ */}
      {/* 1. HEADER BAR — Steel blue                                        */}
      {/* ================================================================ */}
      <AppHeaderBar initials={userInitials} />

      {/* ================================================================ */}
      {/* 2. TEAM SELECTOR — PillTabs                                       */}
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
      {/* 3. HERO CARD — Next Event with photo + gradient                    */}
      {/* ================================================================ */}
      {activeTeam && nextEvent ? (
        <View style={s.heroCard}>
          {/* Background — default sport image */}
          <Image
            source={getDefaultHeroImage(activeSport?.name, nextEvent?.type)}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          {/* Dark gradient overlay for text readability */}
          <LinearGradient
            colors={['transparent', 'rgba(27,40,56,0.5)', 'rgba(27,40,56,0.95)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Top-right event type badge */}
          <View style={[
            s.heroBadge,
            { backgroundColor: nextEvent.type === 'game' ? '#D94F4F' : '#14B8A6' },
          ]}>
            <Text style={s.heroBadgeText}>
              {nextEvent.type === 'game' ? 'GAME DAY' : 'PRACTICE'}
            </Text>
          </View>

          {/* Bottom content */}
          <View style={s.heroContent}>
            <View style={s.heroContentRow}>
              {/* Left: event info */}
              <View style={{ flex: 1 }}>
                <Text style={s.heroCountdown}>{getCountdownText(nextEvent.date)}</Text>
                <Text style={s.heroTitle}>
                  {nextEvent.type === 'game' ? 'GAME DAY' : 'PRACTICE'}
                </Text>
                <Text style={s.heroTeamName}>{activeTeam.name}</Text>
                <View style={s.heroMetaRow}>
                  {nextEvent.time ? (
                    <>
                      <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.7)" />
                      <Text style={s.heroMetaText}>{formatTime(nextEvent.time)}</Text>
                    </>
                  ) : null}
                  {nextEvent.location ? (
                    <>
                      <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.7)" style={{ marginLeft: 8 }} />
                      <Text style={s.heroMetaText}>{nextEvent.location}</Text>
                    </>
                  ) : null}
                </View>
                {nextEvent.type === 'game' && nextEvent.opponent && (
                  <Text style={s.heroOpponent}>vs {nextEvent.opponent}</Text>
                )}
              </View>

              {/* Right: RSVP pill */}
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
      ) : activeTeam ? (
        /* No upcoming events — All Clear card */
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
      {/* 4. MISSION BRIEFING — Secondary event (different type from hero)   */}
      {/* ================================================================ */}
      {secondaryEvent && (
        <View style={s.sectionBlock}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="Mission Briefing" />
          </View>
          <Card
            accentColor={secondaryEvent.type === 'game' ? colors.danger : colors.info}
            style={{ marginHorizontal: 16 }}
          >
            <View style={s.missionTop}>
              <Badge
                label={secondaryEvent.type === 'game' ? 'GAME' : 'PRACTICE'}
                color={secondaryEvent.type === 'game' ? colors.danger : colors.info}
              />
              <Text style={s.countdownText}>{getCountdownText(secondaryEvent.date)}</Text>
            </View>
            {secondaryEvent.type === 'game' && secondaryEvent.opponent ? (
              <Text style={s.missionOpponent}>vs {secondaryEvent.opponent}</Text>
            ) : (
              <Text style={s.missionTitle}>{secondaryEvent.title}</Text>
            )}
            <View style={s.missionDetails}>
              <View style={s.missionDetailRow}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <Text style={s.missionDetailText}>
                  {formatDate(secondaryEvent.date)}
                  {secondaryEvent.time ? ` \u2022 ${formatTime(secondaryEvent.time)}` : ''}
                </Text>
              </View>
              {secondaryEvent.location ? (
                <View style={s.missionDetailRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <Text style={s.missionDetailText}>{secondaryEvent.location}</Text>
                </View>
              ) : null}
            </View>
          </Card>
        </View>
      )}

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
              color={attendanceRate !== null ? getAttendanceColor(attendanceRate) : colors.textMuted}
            />
            <Text style={[
              s.healthNum,
              attendanceRate !== null && { color: getAttendanceColor(attendanceRate) },
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
              {badgesEarnedCount}
            </Text>
            <Text style={s.healthLabel}>Badges</Text>
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
      {/* 7. TOP PERFORMERS                                                 */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Top Performers" />
        </View>
        {topPerformers.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          >
            {topPerformers.map((performer, idx) => {
              const accentColors = [colors.warning, '#C0C0C0', '#CD7F32'];
              const accent = accentColors[idx] || colors.textMuted;
              return (
                <View key={performer.player_id} style={s.performerCard}>
                  <Avatar name={performer.player_name} size={44} color={accent} />
                  <Text style={s.performerName} numberOfLines={1}>{performer.player_name}</Text>
                  <Text style={[s.performerStat, { color: accent }]}>
                    {performer.stat_value} {performer.stat_label}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Card style={{ marginHorizontal: 16, padding: 28, alignItems: 'center' }}>
            <Ionicons name="trophy-outline" size={32} color={colors.textMuted} />
            <Text style={s.emptySubtext}>Play a game to see top performers</Text>
          </Card>
        )}
      </View>

      {/* ================================================================ */}
      {/* 8. UPCOMING MATCHES — MatchCards                                   */}
      {/* ================================================================ */}
      {activeTeamEvents.length > 1 && (
        <View style={s.sectionBlock}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="Upcoming Matches" action="Full Schedule" onAction={() => router.push('/(tabs)/schedule' as any)} />
          </View>
          {activeTeamEvents.slice(1, 4).map(evt => (
            <MatchCard
              key={evt.id}
              homeTeam={activeTeam?.name || ''}
              awayTeam={evt.opponent || evt.title}
              time={formatTime(evt.time)}
              date={formatDate(evt.date).toUpperCase()}
              venue={evt.location || ''}
              accentColor={colors.primary}
              style={{ marginHorizontal: 16, marginBottom: 12 }}
            />
          ))}
        </View>
      )}

      {/* ================================================================ */}
      {/* 9. QUICK ACTIONS — 2x2 Grid                                       */}
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
            <Text style={s.actionLabel}>Send Message</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} onPress={() => router.push('/game-prep' as any)}>
            <View style={[s.actionIconCircle, { backgroundColor: colors.primary + '26' }]}>
              <Ionicons name="analytics" size={32} color={colors.primary} />
            </View>
            <Text style={s.actionLabel}>Game Prep</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================================================================ */}
      {/* 10. SEASON PROGRESS — Progress bar + stats                        */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Season Progress" />
        </View>
        <Card style={{ marginHorizontal: 16 }}>
          <Text style={s.progressTitle}>
            Game {gamesPlayed} of {totalGames} completed
          </Text>
          <View style={s.progressBarBg}>
            <View style={[
              s.progressBarFill,
              { width: totalGames > 0 ? `${Math.round((gamesPlayed / totalGames) * 100)}%` : '0%' },
            ]} />
          </View>
          <View style={s.progressStatsRow}>
            <View style={s.progressStat}>
              <Text style={s.progressStatNum}>{totalWins}</Text>
              <Text style={s.progressStatLabel}>Won</Text>
            </View>
            <View style={s.progressStat}>
              <Text style={s.progressStatNum}>{winRate}%</Text>
              <Text style={s.progressStatLabel}>Win %</Text>
            </View>
            <View style={s.progressStat}>
              <Text style={s.progressStatNum}>{totalGames - gamesPlayed}</Text>
              <Text style={s.progressStatLabel}>Remaining</Text>
            </View>
          </View>
        </Card>
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

  // ========== 1. HEADER BAR ==========
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C5F7C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 48,
  },

  // ========== 3. HERO CARD ==========
  heroCard: {
    height: 260,
    borderRadius: radii.card,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    ...shadows.cardHover,
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
    fontSize: 22,
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
    marginTop: 4,
  },
  heroMetaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 3,
  },
  heroOpponent: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },

  // RSVP pill
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

  // Attendance dots
  heroDotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 10,
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

  // ========== 4. MISSION BRIEFING ==========
  missionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countdownText: {
    ...displayTextStyle,
    fontSize: 20,
    color: colors.primary,
  },
  missionOpponent: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  missionDetails: {
    gap: 4,
  },
  missionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  missionDetailText: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // ========== 5. TEAM HEALTH ==========
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

  // ========== 6. SEASON OVERVIEW ==========
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

  // ========== 7. TOP PERFORMERS ==========
  performerCard: {
    width: 90,
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.card,
  },
  performerName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  performerStat: {
    fontSize: 10,
    fontWeight: '700',
  },

  // ========== 9. QUICK ACTIONS ==========
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

  // ========== 10. SEASON PROGRESS ==========
  progressTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    lineHeight: 22,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.glassBorder,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#14B8A6',
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatNum: {
    ...displayTextStyle,
    fontSize: 22,
    color: colors.text,
  },
  progressStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
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
