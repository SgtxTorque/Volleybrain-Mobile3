import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import RoleSelector from './RoleSelector';

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
        const today = new Date().toISOString().split('T')[0];

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
          .limit(5);

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
      const today = new Date().toISOString().split('T')[0];
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

  const firstName = profile?.full_name?.split(' ')[0] || 'Coach';

  // Season progress (scoped to active team)
  const totalWins = activeTeam ? activeTeam.wins : teams.reduce((sum, t) => sum + t.wins, 0);
  const totalLosses = activeTeam ? activeTeam.losses : teams.reduce((sum, t) => sum + t.losses, 0);
  const winRate = gamesPlayed > 0 ? Math.round((totalWins / gamesPlayed) * 100) : 0;

  const s = createStyles(colors);

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 15 }}>Loading Command Center...</Text>
      </View>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Welcome back,</Text>
          <Text style={s.heroName}>{firstName}</Text>
        </View>
        <RoleSelector />
      </View>

      {/* Team Selector Pills (if multiple teams) */}
      {teams.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.teamSelectorContainer}
          contentContainerStyle={s.teamSelectorContent}
        >
          {teams.map((team, index) => (
            <TouchableOpacity
              key={team.id}
              style={[
                s.teamPill,
                index === activeTeamIndex && s.teamPillActive,
              ]}
              onPress={() => setActiveTeamIndex(index)}
            >
              <Text style={[
                s.teamPillText,
                index === activeTeamIndex && s.teamPillTextActive,
              ]}>
                {team.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* HERO SECTION - Team Card */}
      {activeTeam ? (
        <View style={s.heroCard}>
          <View style={s.heroAccentBar} />
          <View style={s.heroBody}>
            <Text style={s.heroTeamName}>{activeTeam.name}</Text>

            <View style={s.heroStatsRow}>
              <View style={s.heroRecordContainer}>
                <Text style={[s.heroRecordLetter, { color: colors.success }]}>W</Text>
                <Text style={s.heroRecordNum}>{activeTeam.wins}</Text>
                <Text style={s.heroRecordDash}> - </Text>
                <Text style={[s.heroRecordLetter, { color: colors.danger }]}>L</Text>
                <Text style={s.heroRecordNum}>{activeTeam.losses}</Text>
              </View>

              <View style={s.heroStatDivider} />

              <View style={s.heroRosterContainer}>
                <Ionicons name="people" size={16} color={colors.primary} />
                <Text style={s.heroRosterText}>{activeTeam.player_count} Players</Text>
              </View>
            </View>

            <Text style={s.heroSeasonText}>
              {activeTeam.season_name}
              {activeTeam.age_group_name ? ` \u00B7 ${activeTeam.age_group_name}` : ''}
            </Text>
          </View>
        </View>
      ) : (
        <View style={s.emptyCard}>
          <Ionicons name="shirt-outline" size={36} color={colors.textMuted} />
          <Text style={s.emptyTitle}>No Teams Assigned</Text>
          <Text style={s.emptySubtext}>No teams found for this season</Text>
        </View>
      )}

      {/* MISSION BRIEFING - Next Event */}
      <Text style={s.sectionLabel}>MISSION BRIEFING</Text>
      {nextEvent ? (
        <View style={s.missionCard}>
          <View style={s.missionTop}>
            <View style={[
              s.eventTypeBadge,
              { backgroundColor: nextEvent.type === 'game' ? colors.danger + '20' : colors.info + '20' },
            ]}>
              <View style={[
                s.eventTypeDot,
                { backgroundColor: nextEvent.type === 'game' ? colors.danger : colors.info },
              ]} />
              <Text style={[
                s.eventTypeBadgeText,
                { color: nextEvent.type === 'game' ? colors.danger : colors.info },
              ]}>
                {nextEvent.type === 'game' ? 'GAME' : 'PRACTICE'}
              </Text>
            </View>

            <Text style={s.countdownText}>{getCountdownText(nextEvent.date)}</Text>
          </View>

          {nextEvent.type === 'game' && nextEvent.opponent && (
            <Text style={s.missionOpponent}>vs {nextEvent.opponent}</Text>
          )}

          {nextEvent.type !== 'game' && (
            <Text style={s.missionTitle}>{nextEvent.title}</Text>
          )}

          <View style={s.missionDetails}>
            <View style={s.missionDetailRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={s.missionDetailText}>{formatDate(nextEvent.date)}</Text>
            </View>
            {nextEvent.time ? (
              <View style={s.missionDetailRow}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={s.missionDetailText}>{formatTime(nextEvent.time)}</Text>
              </View>
            ) : null}
            {nextEvent.location ? (
              <View style={s.missionDetailRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={s.missionDetailText}>{nextEvent.location}</Text>
              </View>
            ) : null}
          </View>

          <View style={s.missionActions}>
            <TouchableOpacity
              style={s.missionBtn}
              onPress={() => router.push({ pathname: '/lineup-builder', params: { teamId: activeTeam?.id } } as any)}
            >
              <Ionicons name="list" size={16} color={colors.primary} />
              <Text style={s.missionBtnText}>Prep Lineup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.missionBtn}
              onPress={() => router.push('/(tabs)/players' as any)}
            >
              <Ionicons name="people" size={16} color={colors.primary} />
              <Text style={s.missionBtnText}>View Roster</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={s.emptyCard}>
          <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
          <Text style={s.emptyTitle}>All Clear</Text>
          <Text style={s.emptySubtext}>No upcoming events scheduled</Text>
        </View>
      )}

      {/* TEAM HEALTH - Quick Indicators */}
      <Text style={s.sectionLabel}>TEAM HEALTH</Text>
      <View style={s.healthRow}>
        <View style={s.healthCard}>
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
        </View>

        <View style={s.healthCard}>
          <Ionicons name="hand-left" size={24} color={colors.info} />
          <Text style={s.healthNum}>
            {availableCount ? `${availableCount.available}/${availableCount.total}` : '--'}
          </Text>
          <Text style={s.healthLabel}>Available</Text>
        </View>

        <View style={s.healthCard}>
          {(() => {
            const lowRoster = activeTeam && activeTeam.player_count < 6;
            const lowAttendance = attendanceRate !== null && attendanceRate < 60;
            const hasAlert = lowRoster || lowAttendance;
            return (
              <>
                <Ionicons
                  name={hasAlert ? 'warning' : 'checkmark-done-circle'}
                  size={24}
                  color={hasAlert ? colors.warning : colors.success}
                />
                <Text style={[s.healthNum, { color: hasAlert ? colors.warning : colors.success }]}>
                  {hasAlert
                    ? lowRoster ? 'Low Roster' : 'Low Att.'
                    : 'All good'}
                </Text>
                <Text style={s.healthLabel}>Alerts</Text>
              </>
            );
          })()}
        </View>
      </View>

      {/* TOP PERFORMERS */}
      <Text style={s.sectionLabel}>TOP PERFORMERS</Text>
      {topPerformers.length > 0 ? (
        <View style={s.performersRow}>
          {topPerformers.map((performer, idx) => {
            const accentColors = [colors.warning, '#C0C0C0', '#CD7F32'];
            const accent = accentColors[idx] || colors.textMuted;
            return (
              <View key={performer.player_id} style={s.performerCard}>
                <View style={[s.performerBadge, { borderColor: accent }]}>
                  <Text style={s.performerInitials}>{performer.initials}</Text>
                </View>
                <Text style={s.performerName} numberOfLines={1}>{performer.player_name}</Text>
                <Text style={[s.performerStat, { color: accent }]}>
                  {performer.stat_value} {performer.stat_label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={s.emptyCard}>
          <Ionicons name="trophy-outline" size={32} color={colors.textMuted} />
          <Text style={s.emptySubtext}>Play a game to see top performers</Text>
        </View>
      )}

      {/* QUICK ACTIONS */}
      <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
      <View style={s.actionsGrid}>
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

        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/(tabs)/schedule' as any)}>
          <View style={[s.actionIconCircle, { backgroundColor: '#6366F1' + '26' }]}>
            <Ionicons name="calendar" size={32} color="#6366F1" />
          </View>
          <Text style={s.actionLabel}>Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* SEASON PROGRESS */}
      <Text style={s.sectionLabel}>SEASON PROGRESS</Text>
      <View style={s.progressCard}>
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
      </View>

      {/* Bottom padding for tab bar */}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  heroName: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },

  // Team Selector Pills
  teamSelectorContainer: {
    marginBottom: 16,
    flexGrow: 0,
  },
  teamSelectorContent: {
    gap: 8,
    paddingVertical: 4,
  },
  teamPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.glassCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  teamPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  teamPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  teamPillTextActive: {
    color: '#000',
  },

  // Hero Card
  heroCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  heroAccentBar: {
    height: 4,
    backgroundColor: colors.primary,
  },
  heroBody: {
    padding: 20,
  },
  heroTeamName: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroRecordContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroRecordLetter: {
    fontSize: 14,
    fontWeight: '800',
    marginRight: 4,
  },
  heroRecordNum: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  heroRecordDash: {
    fontSize: 20,
    color: colors.textMuted,
    marginHorizontal: 4,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.glassBorder,
    marginHorizontal: 16,
  },
  heroRosterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroRosterText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  heroSeasonText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Section Label
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    marginBottom: 12,
  },

  // Mission Briefing Card
  missionCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  missionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  eventTypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  countdownText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  missionOpponent: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  missionDetails: {
    gap: 6,
    marginBottom: 16,
  },
  missionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  missionDetailText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  missionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  missionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.glassCard,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  missionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // Team Health
  healthRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  healthCard: {
    flex: 1,
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  healthNum: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 6,
    textAlign: 'center',
  },
  healthLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  // Top Performers
  performersRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  performerCard: {
    flex: 1,
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  performerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 6,
  },
  performerInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  performerName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  performerStat: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Quick Actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    width: '47%',
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
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
    fontSize: 14,
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

  // Season Progress
  progressCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
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
    backgroundColor: colors.primary,
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatNum: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  progressStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Empty / Placeholder Cards
  emptyCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
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
