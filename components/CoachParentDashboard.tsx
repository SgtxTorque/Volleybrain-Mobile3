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
  player_count: number;
  age_group_name: string | null;
};

type ChildPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  team_name: string | null;
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
};

export default function CoachParentDashboard() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [coachTeams, setCoachTeams] = useState<CoachTeam[]>([]);
  const [children, setChildren] = useState<ChildPlayer[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user?.id, workingSeason?.id]);

  const fetchData = async () => {
    if (!user?.id || !workingSeason?.id) return;

    try {
      // COACHING DATA
      const { data: headCoachTeams } = await supabase
        .from('team_staff')
        .select(`
          team_id,
          role,
          teams (id, name, season_id, age_groups (name))
        `)
        .eq('user_id', user.id)
        .eq('role', 'head_coach');

      const { data: assistantTeams } = await supabase
        .from('team_staff')
        .select(`
          team_id,
          role,
          teams (id, name, season_id, age_groups (name))
        `)
        .eq('user_id', user.id)
        .eq('role', 'assistant_coach');

      const allTeamData = [...(headCoachTeams || []), ...(assistantTeams || [])];
      const seasonTeams = allTeamData.filter(t => {
        const team = t.teams as any;
        return team?.season_id === workingSeason.id;
      });

      const teamsWithCounts: CoachTeam[] = [];
      const allTeamIds: string[] = [];

      for (const t of seasonTeams) {
        const team = t.teams as any;
        allTeamIds.push(team.id);

        const { count } = await supabase
          .from('team_players')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);

        teamsWithCounts.push({
          id: team.id,
          name: team.name,
          role: t.role as 'head_coach' | 'assistant_coach',
          player_count: count || 0,
          age_group_name: team.age_groups?.name || null,
        });
      }

      teamsWithCounts.sort((a, b) => {
        if (a.role === 'head_coach' && b.role !== 'head_coach') return -1;
        if (a.role !== 'head_coach' && b.role === 'head_coach') return 1;
        return a.name.localeCompare(b.name);
      });

      setCoachTeams(teamsWithCounts);

      // PARENT DATA
      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);

      if (guardianLinks && guardianLinks.length > 0) {
        const playerIds = guardianLinks.map(g => g.player_id);

        const { data: players } = await supabase
          .from('players')
          .select(`
            id, first_name, last_name, season_id,
            age_groups (name),
            team_players (team_id, teams (id, name))
          `)
          .in('id', playerIds);

        const currentSeasonChildren: ChildPlayer[] = [];

        (players || []).forEach(player => {
          if (player.season_id === workingSeason.id) {
            const teamPlayer = (player.team_players as any)?.[0];
            const team = teamPlayer?.teams as any;
            const ageGroup = player.age_groups as any;

            if (team?.id) allTeamIds.push(team.id);

            currentSeasonChildren.push({
              id: player.id,
              first_name: player.first_name,
              last_name: player.last_name,
              team_name: team?.name || null,
              age_group_name: ageGroup?.name || null,
            });
          }
        });

        setChildren(currentSeasonChildren);
      }

      // UPCOMING EVENTS
      const uniqueTeamIds = [...new Set(allTeamIds)];
      if (uniqueTeamIds.length > 0) {
        const today = new Date().toISOString().split('T')[0];

        const { data: events } = await supabase
          .from('schedule_events')
          .select(`
            id, title, event_type, event_date, start_time,
            location, opponent, team_id, teams (name)
          `)
          .in('team_id', uniqueTeamIds)
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
        }));

        setUpcomingEvents(formattedEvents);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
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

  const navigateToTeamChat = (teamId: string) => {
    router.push({ pathname: '/chat/[id]', params: { id: teamId } });
  };

  const s = createStyles(colors);
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

      {/* COACHING SECTION */}
      {coachTeams.length > 0 && (
        <>
          <View style={s.sectionHeader}>
            <Ionicons name="clipboard" size={20} color={colors.info} />
            <Text style={s.sectionHeaderText}>COACHING</Text>
          </View>

          {coachTeams.map(team => (
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
                <TouchableOpacity style={s.teamAction} onPress={() => router.push('/players')}>
                  <Ionicons name="people" size={18} color={colors.primary} />
                  <Text style={s.teamActionText}>Roster</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.teamAction} onPress={() => router.push('/schedule')}>
                  <Ionicons name="calendar" size={18} color={colors.info} />
                  <Text style={s.teamActionText}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.teamAction} onPress={() => navigateToTeamChat(team.id)}>
                  <Ionicons name="chatbubbles" size={18} color={colors.success} />
                  <Text style={s.teamActionText}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.teamAction} onPress={() => router.push('/players')}>
                  <Ionicons name="card" size={18} color={colors.warning} />
                  <Text style={s.teamActionText}>Cards</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Coach Quick Actions */}
          <View style={s.quickActionsRow}>
            <TouchableOpacity style={s.quickActionBtn} onPress={() => router.push('/players')}>
              <Ionicons name="list" size={20} color={colors.primary} />
              <Text style={s.quickActionText}>Lineup</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.quickActionBtn} onPress={() => router.push('/schedule')}>
              <Ionicons name="clipboard" size={20} color={colors.info} />
              <Text style={s.quickActionText}>Game Prep</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.quickActionBtn} onPress={() => router.push('/messages')}>
              <Ionicons name="megaphone" size={20} color={colors.success} />
              <Text style={s.quickActionText}>Announce</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* FAMILY SECTION */}
      {children.length > 0 && (
        <>
          <View style={s.sectionHeader}>
            <Ionicons name="people" size={20} color={colors.success} />
            <Text style={s.sectionHeaderText}>MY FAMILY</Text>
          </View>

          {children.map(child => (
            <View key={child.id} style={s.childCard}>
              <View style={s.childAvatar}>
                <Text style={s.childAvatarText}>{child.first_name.charAt(0)}</Text>
              </View>
              <View style={s.childInfo}>
                <Text style={s.childName}>{child.first_name} {child.last_name}</Text>
                <View style={s.childMeta}>
                  {child.team_name ? (
                    <Text style={s.childTeam}>{child.team_name}</Text>
                  ) : (
                    <Text style={s.childTeamPending}>Team TBD</Text>
                  )}
                  {child.age_group_name && (
                    <View style={s.ageGroupBadgeSmall}>
                      <Text style={s.ageGroupTextSmall}>{child.age_group_name}</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push('/players')}>
                <Ionicons name="card" size={20} color={colors.warning} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Family Quick Actions */}
          <View style={s.quickActionsRow}>
            <TouchableOpacity style={s.quickActionBtn} onPress={() => router.push('/schedule')}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={s.quickActionText}>Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.quickActionBtn} onPress={() => router.push('/players')}>
              <Ionicons name="card" size={20} color={colors.warning} />
              <Text style={s.quickActionText}>Player Cards</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.quickActionBtn} onPress={() => router.push('/payments')}>
              <Ionicons name="card-outline" size={20} color={colors.info} />
              <Text style={s.quickActionText}>Payments</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* UPCOMING EVENTS (Combined) */}
      <View style={s.sectionHeader}>
        <Ionicons name="calendar" size={20} color={colors.danger} />
        <Text style={s.sectionHeaderText}>UPCOMING</Text>
      </View>

      {upcomingEvents.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
          <Text style={s.emptyText}>No upcoming events</Text>
        </View>
      ) : (
        upcomingEvents.map(event => (
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
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 16, color: colors.textMuted },
  name: { fontSize: 28, fontWeight: '800', color: colors.text },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionHeaderText: { fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' as const },

  teamCard: { backgroundColor: colors.glassCard, borderRadius: 16, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  teamHeader: { padding: 14 },
  teamInfo: { flex: 1 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  teamName: { fontSize: 16, fontWeight: '600', color: colors.text },
  ageGroupBadge: { backgroundColor: colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ageGroupText: { fontSize: 10, fontWeight: '600', color: colors.primary },
  teamMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  roleBadgeHC: { backgroundColor: colors.success + '20' },
  roleBadgeAC: { backgroundColor: colors.info + '20' },
  roleBadgeText: { fontSize: 10, fontWeight: '600', color: colors.text },
  playerCount: { fontSize: 12, color: colors.textMuted },
  teamActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  teamAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
  teamActionText: { fontSize: 11, color: colors.text, fontWeight: '500' },

  quickActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.glassCard, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  quickActionText: { fontSize: 12, fontWeight: '500', color: colors.text },

  childCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glassCard, borderRadius: 16, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  childAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.success + '30', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  childAvatarText: { fontSize: 16, fontWeight: 'bold', color: colors.success },
  childInfo: { flex: 1 },
  childName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  childMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  childTeam: { fontSize: 12, color: colors.textMuted },
  childTeamPending: { fontSize: 12, color: colors.warning, fontStyle: 'italic' },
  ageGroupBadgeSmall: { backgroundColor: colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ageGroupTextSmall: { fontSize: 10, fontWeight: '600', color: colors.primary },

  emptyCard: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  emptyText: { fontSize: 13, color: colors.textMuted, marginTop: 8 },

  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glassCard, borderRadius: 16, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  eventTypeIndicator: { width: 4, alignSelf: 'stretch' },
  eventGame: { backgroundColor: colors.danger },
  eventPractice: { backgroundColor: colors.info },
  eventContent: { flex: 1, padding: 12 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  eventTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  eventTypeBadgeGame: { backgroundColor: colors.danger + '20' },
  eventTypeBadgePractice: { backgroundColor: colors.info + '20' },
  eventTypeBadgeText: { fontSize: 9, fontWeight: '600', color: colors.text },
  eventTeam: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  eventDetails: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  eventDetailText: { fontSize: 11, color: colors.textMuted },

  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  viewAllText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
});
