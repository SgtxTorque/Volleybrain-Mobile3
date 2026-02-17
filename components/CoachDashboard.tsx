import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RoleSelector from './RoleSelector';

type CoachTeam = {
  id: string;
  name: string;
  role: 'head_coach' | 'assistant_coach';
  season_name: string;
  player_count: number;
  age_group_name: string | null;
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

  useEffect(() => {
    fetchCoachData();
  }, [user?.id, workingSeason?.id]);

  const fetchCoachData = async () => {
    if (!user?.id || !workingSeason?.id) return;

    try {
      // Get teams where user is head coach
      const { data: headCoachTeams } = await supabase
        .from('team_staff')
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
        .eq('user_id', user.id)
        .eq('role', 'head_coach');

      // Get teams where user is assistant coach
      const { data: assistantTeams } = await supabase
        .from('team_staff')
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
        .eq('user_id', user.id)
        .eq('role', 'assistant_coach');

      // Combine and filter to current season
      const allTeamData = [...(headCoachTeams || []), ...(assistantTeams || [])];
      const seasonTeams = allTeamData.filter(t => {
        const team = t.teams as any;
        return team?.season_id === workingSeason.id;
      });

      // Get player counts for each team
      const teamsWithCounts: CoachTeam[] = [];
      let total = 0;

      for (const t of seasonTeams) {
        const team = t.teams as any;
        const { count } = await supabase
          .from('team_players')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);

        const playerCount = count || 0;
        total += playerCount;

        teamsWithCounts.push({
          id: team.id,
          name: team.name,
          role: t.role as 'head_coach' | 'assistant_coach',
          season_name: team.seasons?.name || '',
          player_count: playerCount,
          age_group_name: team.age_groups?.name || null,
        });
      }

      // Sort: head_coach first, then assistant_coach
      teamsWithCounts.sort((a, b) => {
        if (a.role === 'head_coach' && b.role !== 'head_coach') return -1;
        if (a.role !== 'head_coach' && b.role === 'head_coach') return 1;
        return a.name.localeCompare(b.name);
      });

      setTeams(teamsWithCounts);
      setTotalPlayers(total);

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
      }

    } catch (error) {
      console.error('Error fetching coach data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCoachData();
    setRefreshing(false);
  };

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

  const getNextEvent = () => {
    if (upcomingEvents.length === 0) return null;
    return upcomingEvents[0];
  };

  const getNextGameCountdown = () => {
    const nextGame = upcomingEvents.find(e => e.type === 'game');
    if (!nextGame) return null;
    
    const gameDate = new Date(nextGame.date + 'T00:00:00');
    const today = new Date();
    const diffTime = gameDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today!';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
  };

  const navigateToTeamRoster = (teamId: string) => {
    router.push({ pathname: '/players', params: { teamId } });
  };

  const navigateToTeamChat = (teamId: string) => {
    router.push({ pathname: '/chat/[id]', params: { id: teamId } });
  };

  const s = createStyles(colors);
  const nextEvent = getNextEvent();
  const gameCountdown = getNextGameCountdown();
  const firstName = profile?.full_name?.split(' ')[0] || 'Coach';

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Welcome back,</Text>
          <Text style={s.name}>{firstName}</Text>
        </View>
        <RoleSelector />
      </View>

      <Text style={s.subtitle}>{workingSeason?.name || 'No Season'}</Text>

      {/* Quick Stats */}
      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Text style={s.statNum}>{teams.length}</Text>
          <Text style={s.statLabel}>{teams.length === 1 ? 'Team' : 'Teams'}</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statNum}>{totalPlayers}</Text>
          <Text style={s.statLabel}>Players</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNum, gameCountdown === 'Today!' && { color: colors.success }]}>
            {gameCountdown || '—'}
          </Text>
          <Text style={s.statLabel}>Next Game</Text>
        </View>
      </View>

      {/* My Teams */}
      <Text style={s.sectionTitle}>My Teams</Text>
      {teams.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="shirt-outline" size={32} color={colors.textMuted} />
          <Text style={s.emptyText}>No teams assigned for this season</Text>
        </View>
      ) : (
        teams.map(team => (
          <View key={team.id} style={s.teamCard}>
            <View style={s.teamHeader}>
              <View style={s.teamInfo}>
                <View style={s.teamNameRow}>
                  <Text style={s.teamName}>{team.name}</Text>
                  {team.age_group_name && (
                    <View style={s.ageGroupBadge}>
                      <Text style={s.ageGroupText}>{team.age_group_name}</Text>
                    </View>
                  )}
                </View>
                <View style={s.teamMeta}>
                  <View style={[s.roleBadge, team.role === 'head_coach' ? s.roleBadgeHC : s.roleBadgeAC]}>
                    <Text style={s.roleBadgeText}>
                      {team.role === 'head_coach' ? 'Head Coach' : 'Assistant'}
                    </Text>
                  </View>
                  <Text style={s.playerCount}>{team.player_count} players</Text>
                </View>
              </View>
            </View>

            <View style={s.teamActions}>
              <TouchableOpacity style={s.teamAction} onPress={() => navigateToTeamRoster(team.id)}>
                <Ionicons name="people" size={20} color={colors.primary} />
                <Text style={s.teamActionText}>Roster</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.teamAction} onPress={() => router.push('/schedule')}>
                <Ionicons name="calendar" size={20} color={colors.info} />
                <Text style={s.teamActionText}>Schedule</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.teamAction} onPress={() => navigateToTeamChat(team.id)}>
                <Ionicons name="chatbubbles" size={20} color={colors.success} />
                <Text style={s.teamActionText}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.teamAction} onPress={() => router.push('/players')}>
                <Ionicons name="card" size={20} color={colors.warning} />
                <Text style={s.teamActionText}>Cards</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Quick Actions */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <View style={s.actionsGrid}>
        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/players')}>
          <View style={[s.actionIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="list" size={24} color={colors.primary} />
          </View>
          <Text style={s.actionLabel}>Lineup</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/players')}>
          <View style={[s.actionIcon, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="card" size={24} color={colors.warning} />
          </View>
          <Text style={s.actionLabel}>Player Cards</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/schedule')}>
          <View style={[s.actionIcon, { backgroundColor: colors.info + '20' }]}>
            <Ionicons name="clipboard" size={24} color={colors.info} />
          </View>
          <Text style={s.actionLabel}>Game Prep</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/messages')}>
          <View style={[s.actionIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="megaphone" size={24} color={colors.success} />
          </View>
          <Text style={s.actionLabel}>Announce</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming */}
      <Text style={s.sectionTitle}>Upcoming</Text>
      {upcomingEvents.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
          <Text style={s.emptyText}>No upcoming events scheduled</Text>
        </View>
      ) : (
        upcomingEvents.slice(0, 3).map(event => (
          <TouchableOpacity key={event.id} style={s.eventCard} onPress={() => router.push('/schedule')}>
            <View style={[s.eventTypeIndicator, event.type === 'game' ? s.eventGame : s.eventPractice]} />
            <View style={s.eventContent}>
              <View style={s.eventHeader}>
                <Text style={s.eventTitle}>
                  {event.type === 'game' && event.opponent ? `vs ${event.opponent}` : event.title}
                </Text>
                <View style={[s.eventTypeBadge, event.type === 'game' ? s.eventTypeBadgeGame : s.eventTypeBadgePractice]}>
                  <Text style={s.eventTypeBadgeText}>{event.type === 'game' ? 'Game' : 'Practice'}</Text>
                </View>
              </View>
              <Text style={s.eventTeam}>{event.team_name}</Text>
              <View style={s.eventDetails}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <Text style={s.eventDetailText}>{formatDate(event.date)}</Text>
                {event.time && (
                  <>
                    <Ionicons name="time-outline" size={14} color={colors.textMuted} style={{ marginLeft: 12 }} />
                    <Text style={s.eventDetailText}>{formatTime(event.time)}</Text>
                  </>
                )}
              </View>
              {event.location && (
                <View style={s.eventDetails}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <Text style={s.eventDetailText}>{event.location}</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))
      )}

      {upcomingEvents.length > 3 && (
        <TouchableOpacity style={s.viewAllBtn} onPress={() => router.push('/schedule')}>
          <Text style={s.viewAllText}>View Full Schedule</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 16 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  greeting: { fontSize: 16, color: colors.textMuted },
  name: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginBottom: 20 },

  statsRow: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  statNum: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 1 },

  emptyCard: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  emptyText: { fontSize: 14, color: colors.textMuted, marginTop: 8 },

  teamCard: { backgroundColor: colors.glassCard, borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  teamHeader: { padding: 16 },
  teamInfo: { flex: 1 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  teamName: { fontSize: 18, fontWeight: '600', color: colors.text },
  ageGroupBadge: { backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  ageGroupText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  teamMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleBadgeHC: { backgroundColor: colors.success + '20' },
  roleBadgeAC: { backgroundColor: colors.info + '20' },
  roleBadgeText: { fontSize: 11, fontWeight: '600', color: colors.text },
  playerCount: { fontSize: 13, color: colors.textMuted },
  teamActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  teamAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRightWidth: 1, borderRightColor: colors.border },
  teamActionText: { fontSize: 12, color: colors.text, fontWeight: '500' },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionCard: { width: '47%', backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  actionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '500', color: colors.text },

  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glassCard, borderRadius: 16, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  eventTypeIndicator: { width: 4, alignSelf: 'stretch' },
  eventGame: { backgroundColor: colors.danger },
  eventPractice: { backgroundColor: colors.info },
  eventContent: { flex: 1, padding: 12 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  eventTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  eventTypeBadgeGame: { backgroundColor: colors.danger + '20' },
  eventTypeBadgePractice: { backgroundColor: colors.info + '20' },
  eventTypeBadgeText: { fontSize: 10, fontWeight: '600', color: colors.text },
  eventTeam: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  eventDetails: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  eventDetailText: { fontSize: 12, color: colors.textMuted },

  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  viewAllText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
});
