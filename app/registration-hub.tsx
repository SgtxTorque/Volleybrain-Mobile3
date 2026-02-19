import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =====================================================
// TYPES
// =====================================================
type RegistrationStatus = 'new' | 'approved' | 'waitlisted' | 'denied' | 'active' | 'rostered' | 'withdrawn';

type Sport = {
  id: string;
  name: string;
  code: string;
  icon: string;
  color_primary: string;
};

type Season = {
  id: string;
  name: string;
  sport_id: string;
  registration_open: boolean;
};

type Registration = {
  id: string;
  player_id: string;
  season_id: string;
  family_id?: string;
  status: RegistrationStatus;
  submitted_at: string;
  approved_at?: string;
  paid_at?: string;
  rostered_at?: string;
  needs_evaluation: boolean;
  waitlist_position?: number;
  denial_reason?: string;
  admin_notes?: string;
  registration_source: string;
  player: {
    id: string;
    first_name: string;
    last_name: string;
    grade: number;
    player_type: string;
    parent_name: string;
    parent_email: string;
    parent_phone: string;
    parent_2_name?: string;
    parent_2_email?: string;
    parent_2_phone?: string;
    school?: string;
    dob?: string;
    position?: string;
    experience_level?: string;
    uniform_size_jersey?: string;
    uniform_size_shorts?: string;
    jersey_pref_1?: number;
    jersey_pref_2?: number;
    jersey_pref_3?: number;
    jersey_number?: number;
    medical_conditions?: string;
    allergies?: string;
    medications?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relation?: string;
    waiver_liability: boolean;
    waiver_photo: boolean;
    waiver_conduct: boolean;
    waiver_signed_by?: string;
    waiver_signed_date?: string;
    address?: string;
    family_id?: string;
    sport_id?: string;
    season_id?: string;
    placement_preferences?: string;
  };
  payments?: {
    total_due: number;
    total_paid: number;
  };
  team?: {
    id: string;
    name: string;
  };
  siblings?: {
    id: string;
    first_name: string;
    last_name: string;
    grade: number;
  }[];
  sport?: Sport;
  season?: Season;
};

type RegistrationStats = {
  total_count: number;
  new_count: number;
  approved_count: number;
  waitlisted_count: number;
  active_count: number;
  rostered_count: number;
  needs_evaluation_count: number;
  total_expected_revenue: number;
  total_collected_revenue: number;
};

type Team = {
  id: string;
  name: string;
  player_count: number;
  season_id: string;
};

// =====================================================
// STATUS CONFIG
// =====================================================
const statusConfig: Record<RegistrationStatus, { label: string; color: string; icon: string }> = {
  new: { label: 'New', color: '#FF9500', icon: 'alert-circle' },
  approved: { label: 'Approved', color: '#5AC8FA', icon: 'checkmark-circle' },
  waitlisted: { label: 'Waitlisted', color: '#8E8E93', icon: 'time' },
  denied: { label: 'Denied', color: '#FF3B30', icon: 'close-circle' },
  active: { label: 'Active', color: '#34C759', icon: 'wallet' },
  rostered: { label: 'Rostered', color: '#AF52DE', icon: 'people' },
  withdrawn: { label: 'Withdrawn', color: '#8E8E93', icon: 'exit' },
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function RegistrationHubScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeFilter, setActiveFilter] = useState<RegistrationStatus | 'all'>('all');
  const [activeSportFilter, setActiveSportFilter] = useState<string | 'all'>('all');
  const [activeSeasonFilter, setActiveSeasonFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // =====================================================
  // DATA FETCHING - Now queries ALL open seasons
  // =====================================================
  const fetchData = useCallback(async () => {
    try {
      // Fetch all sports
      const { data: sportsData } = await supabase
        .from('sports')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      setSports(sportsData || []);

      // Fetch ALL seasons with registration open
      const { data: seasonsData } = await supabase
        .from('seasons')
        .select('*')
        .eq('registration_open', true)
        .order('created_at', { ascending: false });
      
      setSeasons(seasonsData || []);

      if (!seasonsData || seasonsData.length === 0) {
        // No open seasons - try to get players directly
        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .eq('player_type', 'new')
          .order('created_at', { ascending: false })
          .limit(50);

        if (playersData && playersData.length > 0) {
          // Convert players to registration-like objects
          const playerRegs = playersData.map(player => ({
            id: player.id,
            player_id: player.id,
            season_id: player.season_id,
            family_id: player.family_id,
            status: 'new' as RegistrationStatus,
            submitted_at: player.created_at,
            needs_evaluation: false,
            registration_source: player.registration_source || 'web',
            player: player,
            sport: sportsData?.find(s => s.id === player.sport_id),
          }));
          setRegistrations(playerRegs);
          setStats({
            total_count: playerRegs.length,
            new_count: playerRegs.length,
            approved_count: 0,
            waitlisted_count: 0,
            active_count: 0,
            rostered_count: 0,
            needs_evaluation_count: 0,
            total_expected_revenue: 0,
            total_collected_revenue: 0,
          });
        } else {
          setRegistrations([]);
          setStats(null);
        }
        setLoading(false);
        return;
      }

      const seasonIds = seasonsData.map(s => s.id);

      // First try to fetch from registrations table
      const { data: regData, error: regError } = await supabase
        .from('registrations')
        .select(`
          *,
          player:players(
            id, first_name, last_name, grade, player_type,
            parent_name, parent_email, parent_phone,
            parent_2_name, parent_2_email, parent_2_phone,
            school, dob, position, experience_level,
            uniform_size_jersey, uniform_size_shorts,
            jersey_pref_1, jersey_pref_2, jersey_pref_3, jersey_number,
            medical_conditions, allergies, medications,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
            waiver_liability, waiver_photo, waiver_conduct,
            waiver_signed_by, waiver_signed_date,
            address, family_id, sport_id, season_id, placement_preferences
          )
        `)
        .in('season_id', seasonIds)
        .neq('status', 'withdrawn')
        .order('submitted_at', { ascending: false });

      let allRegistrations: any[] = regData || [];

      // Also fetch players that might not have registration records
      // (fallback for registration insert failures)
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .in('season_id', seasonIds)
        .order('created_at', { ascending: false });

      // Find players without registration records
      const registeredPlayerIds = new Set(allRegistrations.map(r => r.player_id));
      const orphanPlayers = (playersData || []).filter(p => !registeredPlayerIds.has(p.id));

      // Convert orphan players to registration-like objects
      const orphanRegs = orphanPlayers.map(player => ({
        id: `player-${player.id}`,
        player_id: player.id,
        season_id: player.season_id,
        family_id: player.family_id,
        status: 'new' as RegistrationStatus,
        submitted_at: player.created_at,
        needs_evaluation: false,
        registration_source: player.registration_source || 'web',
        player: player,
      }));

      allRegistrations = [...allRegistrations, ...orphanRegs];

      // Enrich registrations with payments, teams, siblings, and sport/season info
      const registrationsWithPayments = await Promise.all(
        allRegistrations.map(async (reg) => {
          const { data: payments } = await supabase
            .from('payments')
            .select('amount, paid')
            .eq('player_id', reg.player_id)
            .eq('season_id', reg.season_id);

          const total_due = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
          const total_paid = payments?.filter(p => p.paid).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

          const { data: teamPlayer } = await supabase
            .from('team_players')
            .select('team:teams(id, name)')
            .eq('player_id', reg.player_id)
            .maybeSingle();

          let siblings: any[] = [];
          if (reg.family_id || reg.player?.family_id) {
            const familyId = reg.family_id || reg.player?.family_id;
            const { data: siblingData } = await supabase
              .from('players')
              .select('id, first_name, last_name, grade')
              .eq('family_id', familyId)
              .neq('id', reg.player_id);
            siblings = siblingData || [];
          }

          // Get sport info from player's sport_id
          const sport = sportsData?.find(s => s.id === reg.player?.sport_id);
          // Get season info
          const season = seasonsData?.find(s => s.id === reg.season_id);

          return {
            ...reg,
            payments: { total_due, total_paid },
            team: teamPlayer?.team || null,
            siblings,
            sport,
            season,
          };
        })
      );

      setRegistrations(registrationsWithPayments);

      // Calculate stats
      const newCount = registrationsWithPayments.filter(r => r.status === 'new').length;
      const approvedCount = registrationsWithPayments.filter(r => r.status === 'approved').length;
      const activeCount = registrationsWithPayments.filter(r => r.status === 'active').length;
      const rosteredCount = registrationsWithPayments.filter(r => r.status === 'rostered').length;
      const waitlistedCount = registrationsWithPayments.filter(r => r.status === 'waitlisted').length;
      
      setStats({
        total_count: registrationsWithPayments.length,
        new_count: newCount,
        approved_count: approvedCount,
        waitlisted_count: waitlistedCount,
        active_count: activeCount,
        rostered_count: rosteredCount,
        needs_evaluation_count: registrationsWithPayments.filter(r => r.needs_evaluation).length,
        total_expected_revenue: registrationsWithPayments.reduce((sum, r) => sum + (r.payments?.total_due || 0), 0),
        total_collected_revenue: registrationsWithPayments.reduce((sum, r) => sum + (r.payments?.total_paid || 0), 0),
      });

      // Fetch teams from all open seasons
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, season_id')
        .in('season_id', seasonIds)
        .order('name');

      const teamsWithCounts = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { count } = await supabase
            .from('team_players')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);
          return { ...team, player_count: count || 0 };
        })
      );

      setTeams(teamsWithCounts);
    } catch (error) {
      if (__DEV__) console.error('Error fetching registration data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // =====================================================
  // ACTIONS
  // =====================================================
  const updateRegistrationStatus = async (
    registrationId: string,
    newStatus: RegistrationStatus,
    additionalData?: any
  ) => {
    setActionLoading(true);
    try {
      // Check if this is a "fake" registration (player without registration record)
      if (registrationId.startsWith('player-')) {
        const playerId = registrationId.replace('player-', '');
        // Create a real registration record first
        const player = registrations.find(r => r.id === registrationId)?.player;
        if (player) {
          const { data: newReg, error: insertError } = await supabase
            .from('registrations')
            .insert({
              player_id: playerId,
              season_id: player.season_id,
              family_id: player.family_id,
              status: newStatus,
              submitted_at: new Date().toISOString(),
              registration_source: 'web',
            })
            .select()
            .single();

          if (insertError) throw insertError;
          registrationId = newReg.id;
        }
      }

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...additionalData,
      };

      if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = user?.id;
      }

      const { error } = await supabase
        .from('registrations')
        .update(updateData)
        .eq('id', registrationId);

      if (error) throw error;

      if (newStatus === 'approved' && selectedRegistration) {
        await createPaymentRecords(selectedRegistration.player_id, selectedRegistration.season_id);
      }

      await fetchData();
      setDetailModalVisible(false);
      Alert.alert('Success', `Registration ${newStatus}`);
    } catch (error) {
      if (__DEV__) console.error('Error updating registration:', error);
      Alert.alert('Error', 'Failed to update registration');
    } finally {
      setActionLoading(false);
    }
  };

  const createPaymentRecords = async (playerId: string, seasonId: string) => {
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('player_id', playerId)
      .eq('season_id', seasonId)
      .limit(1);

    if (existing && existing.length > 0) return;

    const payments = [
      { season_id: seasonId, player_id: playerId, fee_type: 'registration', amount: 150, paid: false, due_now: true },
      { season_id: seasonId, player_id: playerId, fee_type: 'uniform', amount: 35, paid: false, due_now: true },
      { season_id: seasonId, player_id: playerId, fee_type: 'monthly_1', amount: 50, paid: false, due_now: false },
      { season_id: seasonId, player_id: playerId, fee_type: 'monthly_2', amount: 50, paid: false, due_now: false },
      { season_id: seasonId, player_id: playerId, fee_type: 'monthly_3', amount: 50, paid: false, due_now: false },
    ];

    await supabase.from('payments').insert(payments);
  };

  const assignToTeam = async (registrationId: string, playerId: string, teamId: string) => {
    setActionLoading(true);
    try {
      const { error: teamError } = await supabase
        .from('team_players')
        .upsert({
          team_id: teamId,
          player_id: playerId,
          role: 'player',
          joined_at: new Date().toISOString(),
        });

      if (teamError) throw teamError;

      // Handle fake registration IDs
      let realRegId = registrationId;
      if (registrationId.startsWith('player-')) {
        const player = registrations.find(r => r.id === registrationId)?.player;
        if (player) {
          const { data: newReg } = await supabase
            .from('registrations')
            .insert({
              player_id: playerId,
              season_id: player.season_id,
              family_id: player.family_id,
              status: 'rostered',
              rostered_at: new Date().toISOString(),
              registration_source: 'web',
            })
            .select()
            .single();
          if (newReg) realRegId = newReg.id;
        }
      } else {
        await supabase
          .from('registrations')
          .update({
            status: 'rostered',
            rostered_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', registrationId);
      }

      await createRSVPsForPlayer(playerId, teamId);
      await fetchData();
      setDetailModalVisible(false);
      Alert.alert('Success', 'Player assigned to team!');
    } catch (error) {
      if (__DEV__) console.error('Error assigning to team:', error);
      Alert.alert('Error', 'Failed to assign player to team');
    } finally {
      setActionLoading(false);
    }
  };

  const createRSVPsForPlayer = async (playerId: string, teamId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data: events } = await supabase
      .from('schedule_events')
      .select('id')
      .eq('team_id', teamId)
      .gte('event_date', today);

    if (!events || events.length === 0) return;

    const rsvps = events.map(event => ({
      event_id: event.id,
      player_id: playerId,
      status: 'pending',
    }));

    await supabase.from('event_rsvps').upsert(rsvps, { onConflict: 'event_id,player_id' });
  };

  const handleDeny = (registration: Registration) => {
    Alert.prompt(
      'Deny Registration',
      'Please provide a reason for denial:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: (reason: string | undefined) => {
            updateRegistrationStatus(registration.id, 'denied', { denial_reason: reason });
          },
        },
      ],
      'plain-text'
    );
  };

  const handleWaitlist = (registration: Registration) => {
    const maxPosition = Math.max(
      0,
      ...registrations.filter(r => r.status === 'waitlisted').map(r => r.waitlist_position || 0)
    );

    updateRegistrationStatus(registration.id, 'waitlisted', {
      waitlist_position: maxPosition + 1,
    });
  };

  // =====================================================
  // FILTERING
  // =====================================================
  const filteredRegistrations = registrations.filter(reg => {
    if (activeFilter !== 'all' && reg.status !== activeFilter) return false;
    if (activeSportFilter !== 'all' && reg.player?.sport_id !== activeSportFilter) return false;
    if (activeSeasonFilter !== 'all' && reg.season_id !== activeSeasonFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const playerName = `${reg.player.first_name} ${reg.player.last_name}`.toLowerCase();
      const parentName = reg.player.parent_name?.toLowerCase() || '';
      const email = reg.player.parent_email?.toLowerCase() || '';
      if (!playerName.includes(query) && !parentName.includes(query) && !email.includes(query)) return false;
    }
    return true;
  });

  const groupedRegistrations = {
    new: filteredRegistrations.filter(r => r.status === 'new'),
    approved: filteredRegistrations.filter(r => r.status === 'approved'),
    active: filteredRegistrations.filter(r => r.status === 'active'),
    rostered: filteredRegistrations.filter(r => r.status === 'rostered'),
    waitlisted: filteredRegistrations.filter(r => r.status === 'waitlisted'),
  };

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================
  const hasMedicalInfo = (player: Registration['player']) => {
    return !!(player.medical_conditions || player.allergies || player.medications);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Get teams for a specific season
  const getTeamsForSeason = (seasonId: string) => {
    return teams.filter(t => t.season_id === seasonId);
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================
  const renderStatCard = (label: string, value: number, color: string, filterKey: string, onPress?: () => void) => (
    <TouchableOpacity
      style={{
        flex: 1,
        backgroundColor: colors.glassCard,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: activeFilter === filterKey ? 2 : 1,
        borderColor: activeFilter === filterKey ? color : colors.glassBorder,
        minWidth: 70,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
      }}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={{ fontSize: 24, fontWeight: 'bold', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' }} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderRegistrationCard = (registration: Registration) => {
    const { player, payments, team, sport, season } = registration;
    const config = statusConfig[registration.status];
    const paymentPercent = payments && payments.total_due > 0 
      ? Math.round((payments.total_paid / payments.total_due) * 100) 
      : 0;
    const hasMedical = hasMedicalInfo(player);

    return (
      <TouchableOpacity
        key={registration.id}
        style={{
          backgroundColor: colors.glassCard,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderLeftWidth: 4,
          borderLeftColor: config.color,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 6,
        }}
        onPress={() => {
          setSelectedRegistration(registration);
          setDetailModalVisible(true);
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            {/* Sport Icon + Player Name */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {sport && (
                <Text style={{ fontSize: 18, marginRight: 8 }}>{sport.icon}</Text>
              )}
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                {player.first_name} {player.last_name}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              Grade {player.grade} • {player.player_type === 'returning' ? 'Returning' : 'New'}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              {player.parent_name}
            </Text>
            {/* Season Name */}
            {season && (
              <Text style={{ fontSize: 12, color: sport?.color_primary || colors.primary, marginTop: 4 }}>
                {season.name}
              </Text>
            )}
          </View>
          
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: `${config.color}20`,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}>
              <Ionicons name={config.icon as any} size={14} color={config.color} />
              <Text style={{ fontSize: 12, color: config.color, marginLeft: 4, fontWeight: '600' }}>
                {config.label}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
              {formatDate(registration.submitted_at)}
            </Text>
          </View>
        </View>

        {/* Payment Progress */}
        {['approved', 'active'].includes(registration.status) && payments && (
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                Payment: {formatCurrency(payments.total_paid)} / {formatCurrency(payments.total_due)}
              </Text>
              <Text style={{ fontSize: 12, color: paymentPercent >= 100 ? '#34C759' : colors.textSecondary }}>
                {paymentPercent}%
              </Text>
            </View>
            <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2 }}>
              <View style={{
                height: '100%',
                width: `${Math.min(paymentPercent, 100)}%`,
                backgroundColor: paymentPercent >= 100 ? '#34C759' : '#FFD700',
                borderRadius: 2,
              }} />
            </View>
          </View>
        )}

        {/* Team Assignment */}
        {registration.status === 'rostered' && team && (
          <View style={{
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background,
            padding: 8,
            borderRadius: 8,
          }}>
            <Ionicons name="people" size={16} color="#AF52DE" />
            <Text style={{ fontSize: 13, color: colors.text, marginLeft: 8 }}>{team.name}</Text>
          </View>
        )}

        {/* Flags */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {hasMedical && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF3B3020', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Ionicons name="medkit" size={12} color="#FF3B30" />
              <Text style={{ fontSize: 11, color: '#FF3B30', marginLeft: 4 }}>Medical</Text>
            </View>
          )}
          {player.placement_preferences && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#5AC8FA20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Ionicons name="flag" size={12} color="#5AC8FA" />
              <Text style={{ fontSize: 11, color: '#5AC8FA', marginLeft: 4 }}>Pref</Text>
            </View>
          )}
          {registration.needs_evaluation && registration.status !== 'new' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF950020', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Ionicons name="clipboard" size={12} color="#FF9500" />
              <Text style={{ fontSize: 11, color: '#FF9500', marginLeft: 4 }}>Eval</Text>
            </View>
          )}
          {!player.waiver_liability && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF3B3020', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Ionicons name="document" size={12} color="#FF3B30" />
              <Text style={{ fontSize: 11, color: '#FF3B30', marginLeft: 4 }}>Waiver</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, items: Registration[], statusKey: string) => {
    if (items.length === 0) return null;
    const config = statusConfig[statusKey as RegistrationStatus];

    return (
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name={config.icon as any} size={18} color={config.color} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginLeft: 8 }}>{title}</Text>
          <View style={{ backgroundColor: config.color, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 }}>
            <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>{items.length}</Text>
          </View>
        </View>
        {items.map(renderRegistrationCard)}
      </View>
    );
  };

  // =====================================================
  // DETAIL MODAL
  // =====================================================
  const renderDetailModal = () => {
    if (!selectedRegistration) return null;

    const { player, payments, team, siblings, sport, season } = selectedRegistration;
    const config = statusConfig[selectedRegistration.status];
    const hasMedical = hasMedicalInfo(player);
    const seasonTeams = getTeamsForSeason(selectedRegistration.season_id);

    return (
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>Registration Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {/* Sport + Season Badge */}
            {sport && season && (
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: sport.color_primary + '20', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>{sport.icon}</Text>
                  <Text style={{ fontSize: 14, color: sport.color_primary, fontWeight: '600' }}>{sport.name} - {season.name}</Text>
                </View>
              </View>
            )}

            {/* Status Badge */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${config.color}20`, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                <Ionicons name={config.icon as any} size={20} color={config.color} />
                <Text style={{ fontSize: 16, color: config.color, marginLeft: 8, fontWeight: '600' }}>{config.label}</Text>
              </View>
            </View>

            {/* Placement Preferences */}
            {player.placement_preferences && (
              <View style={{ backgroundColor: '#5AC8FA15', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#5AC8FA' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="flag" size={18} color="#5AC8FA" />
                  <Text style={{ color: '#5AC8FA', marginLeft: 8, fontWeight: '600', fontSize: 14 }}>PLACEMENT PREFERENCES</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{player.placement_preferences}</Text>
              </View>
            )}

            {/* Medical Alert */}
            {hasMedical && (
              <View style={{ backgroundColor: '#FF3B3015', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FF3B30' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="warning" size={20} color="#FF3B30" />
                  <Text style={{ color: '#FF3B30', marginLeft: 8, fontWeight: '700', fontSize: 14 }}>MEDICAL ALERT</Text>
                </View>
                {player.allergies && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ color: '#FF3B30', fontWeight: '600', fontSize: 13 }}>Allergies:</Text>
                    <Text style={{ color: colors.text }}>{player.allergies}</Text>
                  </View>
                )}
                {player.medical_conditions && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ color: '#FF3B30', fontWeight: '600', fontSize: 13 }}>Medical Conditions:</Text>
                    <Text style={{ color: colors.text }}>{player.medical_conditions}</Text>
                  </View>
                )}
                {player.medications && (
                  <View>
                    <Text style={{ color: '#FF3B30', fontWeight: '600', fontSize: 13 }}>Medications:</Text>
                    <Text style={{ color: colors.text }}>{player.medications}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Player Info */}
            <View style={{ backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 12 }}>PLAYER INFORMATION</Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Name</Text><Text style={{ color: colors.text, fontWeight: '500' }}>{player.first_name} {player.last_name}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Grade</Text><Text style={{ color: colors.text }}>{player.grade === 0 ? 'Kindergarten' : `${player.grade}th Grade`}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Type</Text><Text style={{ color: colors.text }}>{player.player_type === 'returning' ? 'Returning Player' : 'New Player'}</Text></View>
                {player.school && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>School</Text><Text style={{ color: colors.text }}>{player.school}</Text></View>}
              </View>
            </View>

            {/* Parent/Guardian Info */}
            <View style={{ backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 12 }}>PARENT/GUARDIAN</Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Name</Text><Text style={{ color: colors.text, fontWeight: '500' }}>{player.parent_name}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Email</Text><Text style={{ color: colors.text, fontSize: 13 }}>{player.parent_email}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Phone</Text><Text style={{ color: colors.text }}>{formatPhone(player.parent_phone)}</Text></View>
                {player.parent_2_name && (
                  <>
                    <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Parent 2</Text><Text style={{ color: colors.text, fontWeight: '500' }}>{player.parent_2_name}</Text></View>
                    {player.parent_2_email && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Email</Text><Text style={{ color: colors.text, fontSize: 13 }}>{player.parent_2_email}</Text></View>}
                    {player.parent_2_phone && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Phone</Text><Text style={{ color: colors.text }}>{formatPhone(player.parent_2_phone)}</Text></View>}
                  </>
                )}
              </View>
            </View>

            {/* Uniform & Jersey */}
            <View style={{ backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 12 }}>UNIFORM & JERSEY</Text>
              <View style={{ gap: 8 }}>
                {player.uniform_size_jersey && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Jersey Size</Text><Text style={{ color: colors.text, fontWeight: '500' }}>{player.uniform_size_jersey}</Text></View>}
                {player.uniform_size_shorts && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Shorts Size</Text><Text style={{ color: colors.text, fontWeight: '500' }}>{player.uniform_size_shorts}</Text></View>}
                {(player.jersey_pref_1 || player.jersey_pref_2 || player.jersey_pref_3) && (
                  <>
                    <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
                    <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Jersey # Preferences</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {player.jersey_pref_1 && <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}><Text style={{ color: colors.primary, fontWeight: '600' }}>1st: #{player.jersey_pref_1}</Text></View>}
                      {player.jersey_pref_2 && <View style={{ backgroundColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}><Text style={{ color: colors.text }}>2nd: #{player.jersey_pref_2}</Text></View>}
                      {player.jersey_pref_3 && <View style={{ backgroundColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}><Text style={{ color: colors.text }}>3rd: #{player.jersey_pref_3}</Text></View>}
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Siblings */}
            {siblings && siblings.length > 0 && (
              <View style={{ backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 12 }}>SIBLINGS</Text>
                <View style={{ gap: 8 }}>
                  {siblings.map((sibling) => (
                    <View key={sibling.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, padding: 12, borderRadius: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="person" size={18} color={colors.textSecondary} />
                        <Text style={{ color: colors.text, marginLeft: 8, fontWeight: '500' }}>{sibling.first_name} {sibling.last_name}</Text>
                      </View>
                      <Text style={{ color: colors.textSecondary }}>Grade {sibling.grade}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Waivers */}
            <View style={{ backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 12 }}>WAIVERS</Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={player.waiver_liability ? 'checkmark-circle' : 'close-circle'} size={20} color={player.waiver_liability ? '#34C759' : '#FF3B30'} />
                  <Text style={{ color: colors.text, marginLeft: 8 }}>Liability Waiver</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={player.waiver_photo ? 'checkmark-circle' : 'close-circle'} size={20} color={player.waiver_photo ? '#34C759' : '#8E8E93'} />
                  <Text style={{ color: colors.text, marginLeft: 8 }}>Photo Release</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={player.waiver_conduct ? 'checkmark-circle' : 'close-circle'} size={20} color={player.waiver_conduct ? '#34C759' : '#FF3B30'} />
                  <Text style={{ color: colors.text, marginLeft: 8 }}>Code of Conduct</Text>
                </View>
              </View>
            </View>

            {/* Payment Info */}
            {payments && payments.total_due > 0 && (
              <View style={{ backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 12 }}>PAYMENT STATUS</Text>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Total Due</Text><Text style={{ color: colors.text, fontWeight: '500' }}>{formatCurrency(payments.total_due)}</Text></View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Paid</Text><Text style={{ color: '#34C759', fontWeight: '500' }}>{formatCurrency(payments.total_paid)}</Text></View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Balance</Text><Text style={{ color: payments.total_due - payments.total_paid > 0 ? '#FF9500' : '#34C759', fontWeight: '600' }}>{formatCurrency(payments.total_due - payments.total_paid)}</Text></View>
                </View>
              </View>
            )}

            {/* Team Assignment */}
            {team && (
              <View style={{ backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 12 }}>TEAM ASSIGNMENT</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="people" size={20} color="#AF52DE" />
                  <Text style={{ color: colors.text, marginLeft: 8, fontSize: 16 }}>{team.name}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
            {actionLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                {selectedRegistration.status === 'new' && (
                  <View style={{ gap: 12 }}>
                    <TouchableOpacity style={{ backgroundColor: '#34C759', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }} onPress={() => updateRegistrationStatus(selectedRegistration.id, 'approved')}>
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Approve Registration</Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity style={{ flex: 1, backgroundColor: colors.card, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border }} onPress={() => handleWaitlist(selectedRegistration)}>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>Waitlist</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flex: 1, backgroundColor: '#FF3B30', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }} onPress={() => handleDeny(selectedRegistration)}>
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Deny</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {selectedRegistration.status === 'active' && (
                  <View style={{ gap: 12 }}>
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 8 }}>Assign to Team</Text>
                    {seasonTeams.length === 0 ? (
                      <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>No teams created for this season yet</Text>
                    ) : (
                      seasonTeams.map(t => (
                        <TouchableOpacity key={t.id} style={{ backgroundColor: colors.card, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border }} onPress={() => assignToTeam(selectedRegistration.id, selectedRegistration.player_id, t.id)}>
                          <Text style={{ color: colors.text, fontWeight: '600' }}>{t.name}</Text>
                          <Text style={{ color: colors.textSecondary }}>{t.player_count} players</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}

                {selectedRegistration.status === 'approved' && (
                  <View style={{ gap: 12 }}>
                    <TouchableOpacity style={{ backgroundColor: '#34C759', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }} onPress={() => {
                      Alert.alert('Mark as Paid', 'Has this player paid their registration and uniform fees?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Yes, Mark Paid', onPress: async () => {
                          await supabase.from('payments').update({ paid: true, paid_at: new Date().toISOString() }).eq('player_id', selectedRegistration.player_id).eq('season_id', selectedRegistration.season_id).in('fee_type', ['registration', 'uniform']);
                          updateRegistrationStatus(selectedRegistration.id, 'active', { paid_at: new Date().toISOString() });
                        }},
                      ]);
                    }}>
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Mark Initial Payment Received</Text>
                    </TouchableOpacity>
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 12 }}>Registration + Uniform = {formatCurrency(185)}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>Registration Hub</Text>
        <TouchableOpacity onPress={() => router.push('/season-settings' as any)}>
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* All Open Seasons Badge */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 }}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>All Open Registrations ({seasons.length} season{seasons.length !== 1 ? 's' : ''})</Text>
          </View>
        </View>

        {/* Sport Filter Pills */}
        {sports.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: activeSportFilter === 'all' ? colors.primary : colors.card,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={() => setActiveSportFilter('all')}
              >
                <Text style={{ color: activeSportFilter === 'all' ? colors.background : colors.text, fontWeight: '600' }}>All Sports</Text>
              </TouchableOpacity>
              {sports.map(sport => (
                <TouchableOpacity
                  key={sport.id}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: activeSportFilter === sport.id ? sport.color_primary : colors.card,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => setActiveSportFilter(sport.id)}
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{sport.icon}</Text>
                  <Text style={{ color: activeSportFilter === sport.id ? '#fff' : colors.text, fontWeight: '600' }}>{sport.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Stats Cards */}
        {stats && (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {renderStatCard('New', stats.new_count, '#FF9500', 'new', () => setActiveFilter('new'))}
              {renderStatCard('Paid', stats.approved_count, '#5AC8FA', 'approved', () => setActiveFilter('approved'))}
              {renderStatCard('Ready', stats.active_count, '#34C759', 'active', () => setActiveFilter('active'))}
              {renderStatCard('Team', stats.rostered_count, '#AF52DE', 'rostered', () => setActiveFilter('rostered'))}
            </View>

            {/* Revenue Overview */}
            <View style={{ backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="wallet" size={18} color={colors.primary} />
                <Text style={{ color: colors.textSecondary, marginLeft: 8 }}>Payment Overview</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#34C759' }}>{formatCurrency(stats.total_collected_revenue)}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Collected</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>{formatCurrency(stats.total_expected_revenue)}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Expected</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 8, color: colors.text, fontSize: 16 }} placeholder="Search players or parents..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color={colors.textSecondary} /></TouchableOpacity> : null}
        </View>

        {/* Status Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: activeFilter === 'all' ? colors.primary : colors.card }} onPress={() => setActiveFilter('all')}>
              <Text style={{ color: activeFilter === 'all' ? colors.background : colors.text }}>All</Text>
            </TouchableOpacity>
            {Object.entries(statusConfig).map(([key, config]) => (
              <TouchableOpacity key={key} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: activeFilter === key ? config.color : colors.card }} onPress={() => setActiveFilter(key as RegistrationStatus)}>
                <Text style={{ color: activeFilter === key ? '#fff' : colors.text }}>{config.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Registration Lists */}
        {activeFilter === 'all' ? (
          <>
            {renderSection('Needs Review', groupedRegistrations.new, 'new')}
            {renderSection('Pending Payment', groupedRegistrations.approved, 'approved')}
            {renderSection('Ready for Team', groupedRegistrations.active, 'active')}
            {renderSection('Rostered', groupedRegistrations.rostered, 'rostered')}
            {renderSection('Waitlisted', groupedRegistrations.waitlisted, 'waitlisted')}
          </>
        ) : (
          filteredRegistrations.map(renderRegistrationCard)
        )}

        {/* Empty State */}
        {filteredRegistrations.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16, fontWeight: '600' }}>No registrations found</Text>
            {seasons.length === 0 && (
              <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 14, textAlign: 'center' }}>No seasons have registration open.{'\n'}Go to Season Settings to open registration.</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      {renderDetailModal()}
    </SafeAreaView>
  );
}
