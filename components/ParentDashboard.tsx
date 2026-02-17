import ParentOnboardingModal from '@/components/ParentOnboardingModal';
import ShareRegistrationModal from '@/components/ShareRegistrationModal';
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
import ReenrollmentBanner from './ReenrollmentBanner';
import RoleSelector from './RoleSelector';

type ChildPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  team_id: string | null;
  team_name: string | null;
  age_group_name: string | null;
  season_id: string;
  season_name: string;
  sport_id: string | null;
  sport_name: string | null;
  sport_icon: string | null;
  sport_color: string | null;
  registration_status: 'new' | 'approved' | 'active' | 'rostered' | 'waitlisted' | 'denied';
  registration_id: string | null;
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
  child_name: string;
};

type PaymentStatus = {
  total_owed: number;
  total_paid: number;
  balance: number;
};

type RecentGame = {
  id: string;
  event_date: string;
  opponent: string | null;
  game_result: string | null;
  our_score: number | null;
  their_score: number | null;
  team_name: string;
};

type TodayGame = {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  venue_name: string | null;
  opponent: string | null;
  team_name: string;
};

// Status configuration with colors and labels
const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  new: { label: 'Pending Review', color: '#FF9500', icon: 'time' },
  approved: { label: 'Approved', color: '#5AC8FA', icon: 'checkmark-circle' },
  active: { label: 'Paid', color: '#34C759', icon: 'wallet' },
  rostered: { label: 'On Team', color: '#AF52DE', icon: 'people' },
  waitlisted: { label: 'Waitlisted', color: '#8E8E93', icon: 'hourglass' },
  denied: { label: 'Not Approved', color: '#FF3B30', icon: 'close-circle' },
};

export default function ParentDashboard() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason, allSeasons } = useSeason();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<ChildPlayer[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ total_owed: 0, total_paid: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [todayGame, setTodayGame] = useState<TodayGame | null>(null);

  useEffect(() => {
    fetchParentData();
  }, [user?.id, profile?.email]);

  const fetchParentData = async () => {
    if (!user?.id) return;

    try {
      // Get the parent's email (from profile or user)
      const parentEmail = profile?.email || user?.email;
      
      // Collect all player IDs from multiple sources
      let playerIds: string[] = [];

      // 1. Check player_guardians table
      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);
      
      if (guardianLinks) {
        playerIds.push(...guardianLinks.map(g => g.player_id));
      }

      // 2. Check players with parent_account_id
      const { data: directPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);
      
      if (directPlayers) {
        playerIds.push(...directPlayers.map(p => p.id));
      }

      // 3. Check players by parent_email (most reliable for new registrations)
      if (parentEmail) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', parentEmail);
        
        if (emailPlayers) {
          playerIds.push(...emailPlayers.map(p => p.id));
        }
      }

      // Remove duplicates
      playerIds = [...new Set(playerIds)];

      if (playerIds.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      // Fetch all sports for reference
      const { data: sports } = await supabase
        .from('sports')
        .select('id, name, icon, color_primary');

      // Fetch all seasons for reference
      const { data: seasons } = await supabase
        .from('seasons')
        .select('id, name, sport_id');

      // Get player details with their registrations
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select(`
          id,
          first_name,
          last_name,
          sport_id,
          season_id,
          team_players (
            team_id,
            teams (id, name)
          )
        `)
        .in('id', playerIds)
        .order('created_at', { ascending: false });

      if (playersError) {
        console.error('Players error:', playersError);
      }

      // Get registration records for these players
      const { data: registrations } = await supabase
        .from('registrations')
        .select('id, player_id, season_id, status')
        .in('player_id', playerIds);

      // Build a map of player_id + season_id -> registration
      const regMap = new Map<string, any>();
      (registrations || []).forEach(reg => {
        regMap.set(`${reg.player_id}-${reg.season_id}`, reg);
      });

      // Format players
      const formattedChildren: ChildPlayer[] = [];
      const teamIds: string[] = [];

      (players || []).forEach(player => {
        const teamPlayer = (player.team_players as any)?.[0];
        const team = teamPlayer?.teams as any;
        const season = seasons?.find(s => s.id === player.season_id);
        const sport = sports?.find(s => s.id === player.sport_id);
        
        // Get registration status
        const regKey = `${player.id}-${player.season_id}`;
        const registration = regMap.get(regKey);
        const regStatus = registration?.status || 'new';

        if (team?.id) teamIds.push(team.id);

        formattedChildren.push({
          id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          team_id: team?.id || null,
          team_name: team?.name || null,
          age_group_name: null,
          season_id: player.season_id,
          season_name: season?.name || '',
          sport_id: player.sport_id,
          sport_name: sport?.name || null,
          sport_icon: sport?.icon || null,
          sport_color: sport?.color_primary || null,
          registration_status: regStatus,
          registration_id: registration?.id || null,
        });
      });

      setChildren(formattedChildren);

      // Fetch upcoming events for teams
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

        const formattedEvents: UpcomingEvent[] = (events || []).map(e => {
          const teamName = (e.teams as any)?.name || '';
          const child = formattedChildren.find(c => c.team_id === e.team_id);
          return {
            id: e.id,
            title: e.title,
            type: e.event_type as 'game' | 'practice',
            date: e.event_date,
            time: e.start_time || '',
            location: e.location,
            opponent: e.opponent,
            team_name: teamName,
            child_name: child ? child.first_name : '',
          };
        });

        setUpcomingEvents(formattedEvents);

        // Fetch recent completed games (last 3)
        const { data: recentGameData } = await supabase
          .from('schedule_events')
          .select('id, event_date, opponent, game_result, our_score, opponent_score, team_id, teams(name)')
          .in('team_id', teamIds)
          .eq('event_type', 'game')
          .not('game_result', 'is', null)
          .order('event_date', { ascending: false })
          .limit(3);

        const formattedRecentGames: RecentGame[] = (recentGameData || []).map((g: any) => ({
          id: g.id,
          event_date: g.event_date,
          opponent: g.opponent,
          game_result: g.game_result,
          our_score: g.our_score,
          their_score: g.opponent_score,
          team_name: g.teams?.name || '',
        }));
        setRecentGames(formattedRecentGames);

        // Check for today's game
        const todayGameEvent = (events || []).find(
          (e: any) => e.event_type === 'game' && e.event_date === today
        );
        if (todayGameEvent) {
          setTodayGame({
            id: todayGameEvent.id,
            title: todayGameEvent.title,
            event_date: todayGameEvent.event_date,
            event_time: todayGameEvent.start_time || null,
            venue_name: todayGameEvent.location || null,
            opponent: todayGameEvent.opponent || null,
            team_name: (todayGameEvent.teams as any)?.name || '',
          });
        } else {
          setTodayGame(null);
        }
      } else {
        setUpcomingEvents([]);
        setRecentGames([]);
        setTodayGame(null);
      }

      // Calculate payment status across all children
      if (formattedChildren.length > 0) {
        const childIds = formattedChildren.map(c => c.id);
        
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, paid, player_id')
          .in('player_id', childIds);

        // Count unique player-season combinations for total owed
        const uniqueRegistrations = new Set(formattedChildren.map(c => `${c.id}-${c.season_id}`));
        const totalOwed = uniqueRegistrations.size * 335;
        const totalPaid = (payments || []).filter(p => p.paid).reduce((sum, p) => sum + (p.amount || 0), 0);
        
        setPaymentStatus({
          total_owed: totalOwed,
          total_paid: totalPaid,
          balance: totalOwed - totalPaid,
        });
      }

    } catch (error) {
      console.error('Error fetching parent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchParentData();
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

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || statusConfig.new;
  };

  const s = createStyles(colors);
  const firstName = profile?.full_name?.split(' ')[0] || 'Parent';

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

      {/* Re-enrollment Banner */}
      <ReenrollmentBanner />

      {/* Quick Stats */}
      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Text style={s.statNum}>{children.length}</Text>
          <Text style={s.statLabel}>{children.length === 1 ? 'Child' : 'Children'}</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statNum}>{upcomingEvents.length}</Text>
          <Text style={s.statLabel}>Upcoming</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNum, paymentStatus.balance > 0 && { color: colors.warning }]}>
            ${paymentStatus.balance}
          </Text>
          <Text style={s.statLabel}>Balance</Text>
        </View>
      </View>

      {/* My Children */}
      <Text style={s.sectionTitle}>My Children</Text>
      {children.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="people-outline" size={32} color={colors.textMuted} />
          <Text style={s.emptyText}>No children registered yet</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(auth)/parent-register')}>
            <Text style={s.emptyBtnText}>Register a Child</Text>
          </TouchableOpacity>
        </View>
      ) : (
        children.map(child => {
          const status = getStatusConfig(child.registration_status);
          return (
            <View key={`${child.id}-${child.season_id}`} style={s.childCard}>
              {/* Sport Icon */}
              <View style={[s.childAvatar, child.sport_color ? { backgroundColor: child.sport_color + '30' } : {}]}>
                {child.sport_icon ? (
                  <Text style={s.sportIcon}>{child.sport_icon}</Text>
                ) : (
                  <Text style={[s.childAvatarText, child.sport_color ? { color: child.sport_color } : {}]}>
                    {child.first_name.charAt(0)}
                  </Text>
                )}
              </View>
              
              <View style={s.childInfo}>
                <Text style={s.childName}>{child.first_name} {child.last_name}</Text>
                
                {/* Sport & Season */}
                <Text style={[s.childSport, child.sport_color ? { color: child.sport_color } : {}]}>
                  {child.sport_name ? `${child.sport_name} • ` : ''}{child.season_name}
                </Text>
                
                {/* Team or Status */}
                <View style={s.childMeta}>
                  {child.team_name ? (
                    <View style={s.teamBadge}>
                      <Ionicons name="people" size={12} color="#AF52DE" />
                      <Text style={s.teamBadgeText}>{child.team_name}</Text>
                    </View>
                  ) : child.registration_status === 'rostered' ? null : (
                    <Text style={s.childTeamPending}>Team TBD</Text>
                  )}
                </View>
              </View>
              
              {/* Status Badge */}
              <View style={[s.statusBadge, { backgroundColor: status.color + '20' }]}>
                <Ionicons name={status.icon as any} size={12} color={status.color} />
                <Text style={[s.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>
          );
        })
      )}

      {/* Game Day Card */}
      {todayGame && (
        <TouchableOpacity
          style={s.gameDayCard}
          onPress={() => router.push(`/game-day-parent?eventId=${todayGame.id}` as any)}
          activeOpacity={0.8}
        >
          <View style={s.gameDayLeft}>
            <View style={s.gameDayIconWrap}>
              <Ionicons name="flame" size={24} color={colors.danger} />
            </View>
            <View style={s.gameDayInfo}>
              <Text style={s.gameDayTitle}>GAME DAY</Text>
              <Text style={s.gameDayOpponent}>
                {todayGame.opponent ? `vs ${todayGame.opponent}` : todayGame.title}
              </Text>
              <Text style={s.gameDayMeta}>
                {todayGame.team_name}
                {todayGame.event_time ? ` \u2022 ${formatTime(todayGame.event_time)}` : ''}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.danger} />
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <View style={s.actionsGrid}>
        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/my-kids' as any)}>
          <View style={[s.actionIcon, { backgroundColor: colors.info + '20' }]}>
            <Ionicons name="people" size={24} color={colors.info} />
          </View>
          <Text style={s.actionLabel}>My Kids</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/schedule')}>
          <View style={[s.actionIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="calendar" size={24} color={colors.primary} />
          </View>
          <Text style={s.actionLabel}>Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/family-payments' as any)}>
          <View style={[s.actionIcon, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="wallet" size={24} color={colors.warning} />
          </View>
          <Text style={s.actionLabel}>Payments</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/chats')}>
          <View style={[s.actionIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="chatbubbles" size={24} color={colors.success} />
          </View>
          <Text style={s.actionLabel}>Team Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Events */}
      <Text style={s.sectionTitle}>Upcoming</Text>
      {upcomingEvents.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
          <Text style={s.emptyText}>No upcoming events</Text>
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
              <Text style={s.eventChild}>{event.child_name} • {event.team_name}</Text>
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

      {/* Recent Games */}
      {recentGames.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Recent Games</Text>
          {recentGames.map(game => (
            <TouchableOpacity
              key={game.id}
              style={s.recentGameCard}
              onPress={() => router.push(`/game-results?eventId=${game.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={[
                s.recentGameResult,
                { backgroundColor: game.game_result === 'win' ? colors.success + '20' : colors.danger + '20' }
              ]}>
                <Text style={[
                  s.recentGameResultText,
                  { color: game.game_result === 'win' ? colors.success : colors.danger }
                ]}>
                  {game.game_result === 'win' ? 'W' : 'L'}
                </Text>
              </View>
              <View style={s.recentGameInfo}>
                <Text style={s.recentGameOpponent}>
                  {game.opponent ? `vs ${game.opponent}` : 'Game'}
                </Text>
                <Text style={s.recentGameMeta}>
                  {game.team_name} {'\u2022'} {formatDate(game.event_date)}
                </Text>
              </View>
              <Text style={s.recentGameScore}>
                {game.our_score ?? 0}-{game.their_score ?? 0}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Payment Alert */}
      {paymentStatus.balance > 0 && (
        <TouchableOpacity style={s.paymentAlert} onPress={() => router.push('/family-payments' as any)}>
          <Ionicons name="alert-circle" size={24} color={colors.warning} />
          <View style={s.paymentAlertContent}>
            <Text style={s.paymentAlertTitle}>Payment Due</Text>
            <Text style={s.paymentAlertText}>You have an outstanding balance of ${paymentStatus.balance}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.warning} />
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />

      {/* Share Registration Modal */}
      <ShareRegistrationModal
        visible={showShare}
        onClose={() => setShowShare(false)}
      />

      {/* Parent Onboarding Modal */}
      <ParentOnboardingModal />
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 16 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 16, color: colors.textMuted },
  name: { fontSize: 28, fontWeight: '800', color: colors.text },

  statsRow: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  statNum: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 1 },

  emptyCard: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  emptyText: { fontSize: 14, color: colors.textMuted, marginTop: 8, marginBottom: 16 },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 },
  emptyBtnText: { color: '#000', fontWeight: '600' },

  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  childAvatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: colors.primary + '30', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  childAvatarText: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  sportIcon: { fontSize: 24 },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 },
  childSport: { fontSize: 13, color: colors.primary, marginBottom: 4 },
  childMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  childTeam: { fontSize: 13, color: colors.textMuted },
  childTeamPending: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  teamBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: '#AF52DE20', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6 
  },
  teamBadgeText: { fontSize: 12, color: '#AF52DE', fontWeight: '500' },
  ageGroupBadge: { backgroundColor: colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ageGroupText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 8, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  statusText: { fontSize: 10, fontWeight: '600' },

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
  eventChild: { fontSize: 12, color: colors.primary, marginBottom: 6 },
  eventDetails: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  eventDetailText: { fontSize: 12, color: colors.textMuted },

  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  viewAllText: { fontSize: 14, color: colors.primary, fontWeight: '500' },

  paymentAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warning + '15', borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: colors.warning + '40', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  paymentAlertContent: { flex: 1, marginLeft: 12 },
  paymentAlertTitle: { fontSize: 14, fontWeight: '600', color: colors.warning },
  paymentAlertText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // Game Day Card
  gameDayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.danger + '12', borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.danger + '30', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  gameDayLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  gameDayIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.danger + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  gameDayInfo: { flex: 1 },
  gameDayTitle: { fontSize: 11, fontWeight: '800', color: colors.danger, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  gameDayOpponent: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
  gameDayMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // Recent Games
  recentGameCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glassCard, borderRadius: 16, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  recentGameResult: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  recentGameResultText: { fontSize: 16, fontWeight: '800' },
  recentGameInfo: { flex: 1 },
  recentGameOpponent: { fontSize: 15, fontWeight: '600', color: colors.text },
  recentGameMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  recentGameScore: { fontSize: 18, fontWeight: '700', color: colors.text, marginRight: 8 },
});
