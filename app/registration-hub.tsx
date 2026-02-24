import AdminContextBar from '@/components/AdminContextBar';
import AppHeaderBar from '@/components/ui/AppHeaderBar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import StatBox from '@/components/ui/StatBox';
import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { queueRegistrationApproval, queueTeamAssignment } from '@/lib/email-queue';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
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
  custom_answers?: Record<string, any>;
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
  new: { label: 'New', color: '#E8913A', icon: 'alert-circle' },
  approved: { label: 'Approved', color: '#0EA5E9', icon: 'checkmark-circle' },
  waitlisted: { label: 'Waitlisted', color: '#8E8E93', icon: 'time' },
  denied: { label: 'Denied', color: '#D94F4F', icon: 'close-circle' },
  active: { label: 'Active', color: '#22C55E', icon: 'wallet' },
  rostered: { label: 'Rostered', color: '#2C5F7C', icon: 'people' },
  withdrawn: { label: 'Withdrawn', color: '#8E8E93', icon: 'exit' },
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function RegistrationHubScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
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
  const [requiredWaiverIds, setRequiredWaiverIds] = useState<string[]>([]);
  const [waiverSignatureMap, setWaiverSignatureMap] = useState<Map<string, Set<string>>>(new Map());

  const [showApproveTeamPicker, setShowApproveTeamPicker] = useState(false);
  const [sortMode, setSortMode] = useState<'recent' | 'alpha' | 'status'>('recent');

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; action: string; failures: string[] } | null>(null);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [pendingTeamAssignIds, setPendingTeamAssignIds] = useState<string[]>([]);
  const [showBulkTeamPicker, setShowBulkTeamPicker] = useState(false);
  const [showSeasonFilter, setShowSeasonFilter] = useState(false);

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

      // Fetch waiver compliance data
      const orgId = profile?.current_organization_id;
      if (orgId) {
        const { data: requiredWaivers } = await supabase
          .from('waiver_templates')
          .select('id')
          .eq('organization_id', orgId)
          .eq('is_required', true)
          .eq('is_active', true);

        const waiverIds = (requiredWaivers || []).map(w => w.id);
        setRequiredWaiverIds(waiverIds);

        if (waiverIds.length > 0) {
          const allPlayerIds = registrationsWithPayments.map(r => r.player_id).filter(Boolean);
          if (allPlayerIds.length > 0) {
            const { data: signatures } = await supabase
              .from('waiver_signatures')
              .select('player_id, waiver_template_id')
              .in('season_id', seasonIds)
              .in('player_id', allPlayerIds)
              .in('waiver_template_id', waiverIds);

            const sigMap = new Map<string, Set<string>>();
            for (const sig of signatures || []) {
              if (!sigMap.has(sig.player_id)) sigMap.set(sig.player_id, new Set());
              sigMap.get(sig.player_id)!.add(sig.waiver_template_id);
            }
            setWaiverSignatureMap(sigMap);
          }
        }
      }
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

      // Queue approval email
      if (newStatus === 'approved' && selectedRegistration?.player?.parent_email) {
        try {
          const p = selectedRegistration.player;
          const orgId = profile?.current_organization_id || '';
          const seasonName = seasons.find(s => s.id === selectedRegistration.season_id)?.name || '';
          queueRegistrationApproval(orgId, p.parent_email, p.parent_name || '', `${p.first_name} ${p.last_name}`, seasonName, '');
        } catch {}
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

    // Try season_fees templates first
    const { data: feeTemplates } = await supabase
      .from('season_fees')
      .select('fee_type, fee_name, amount, due_date')
      .eq('season_id', seasonId);

    if (feeTemplates && feeTemplates.length > 0) {
      const records = feeTemplates.map(fee => ({
        season_id: seasonId,
        player_id: playerId,
        fee_type: fee.fee_type,
        fee_name: fee.fee_name,
        amount: fee.amount,
        paid: false,
        due_date: fee.due_date || null,
        auto_generated: true,
      }));
      await supabase.from('payments').insert(records);
    } else {
      // Fallback: hardcoded amounts
      const payments = [
        { season_id: seasonId, player_id: playerId, fee_type: 'registration', fee_name: 'Registration Fee', amount: 150, paid: false, auto_generated: true },
        { season_id: seasonId, player_id: playerId, fee_type: 'uniform', fee_name: 'Uniform Fee', amount: 35, paid: false, auto_generated: true },
        { season_id: seasonId, player_id: playerId, fee_type: 'monthly_1', fee_name: 'Monthly Fee 1', amount: 50, paid: false, auto_generated: true },
        { season_id: seasonId, player_id: playerId, fee_type: 'monthly_2', fee_name: 'Monthly Fee 2', amount: 50, paid: false, auto_generated: true },
        { season_id: seasonId, player_id: playerId, fee_type: 'monthly_3', fee_name: 'Monthly Fee 3', amount: 50, paid: false, auto_generated: true },
      ];
      await supabase.from('payments').insert(payments);
    }
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

      // Queue team assignment email
      if (selectedRegistration?.player?.parent_email) {
        try {
          const p = selectedRegistration.player;
          const orgId = profile?.current_organization_id || '';
          const teamObj = teams.find(t => t.id === teamId);
          const seasonName = seasons.find(s => s.id === selectedRegistration.season_id)?.name || '';
          queueTeamAssignment(orgId, p.parent_email, p.parent_name || '', `${p.first_name} ${p.last_name}`, teamObj?.name || '', seasonName, '');
        } catch {}
      }

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
  // BULK ACTIONS
  // =====================================================
  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedIds(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const ids = filteredRegistrations.map(r => r.id);
    setSelectedIds(new Set(ids));
  };

  const deselectAll = () => setSelectedIds(new Set());

  const handleBulkApprove = async () => {
    const count = selectedIds.size;
    Alert.alert('Bulk Approve', `Approve ${count} registration${count > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve All',
        onPress: async () => {
          setBulkSubmitting(true);
          const progress = { current: 0, total: count, action: 'Approving', failures: [] as string[] };
          setBulkProgress(progress);
          const approvedIds: string[] = [];
          for (const id of selectedIds) {
            try {
              const reg = registrations.find(r => r.id === id);
              if (!reg) continue;
              await updateRegistrationStatus(id, 'approved');
              approvedIds.push(id);
            } catch {
              const reg = registrations.find(r => r.id === id);
              progress.failures.push(reg ? (reg.player.first_name + ' ' + reg.player.last_name) : id);
            }
            progress.current++;
            setBulkProgress({ ...progress });
          }
          await fetchData();
          setSelectionMode(false);
          setSelectedIds(new Set());
          setBulkSubmitting(false);
          setBulkProgress(null);

          // Queue approval emails for all approved registrations
          try {
            const orgId = profile?.current_organization_id || '';
            for (const regId of approvedIds) {
              const reg = registrations.find(r => r.id === regId);
              if (reg?.player?.parent_email) {
                const seasonName = seasons.find(s => s.id === reg.season_id)?.name || '';
                queueRegistrationApproval(orgId, reg.player.parent_email, reg.player.parent_name || '', `${reg.player.first_name} ${reg.player.last_name}`, seasonName, '');
              }
            }
          } catch {}

          const failCount = progress.failures.length;
          if (failCount > 0) {
            Alert.alert('Partial Success', `${approvedIds.length} approved, ${failCount} failed:\n${progress.failures.join(', ')}`);
          } else if (approvedIds.length > 0 && teams.length > 0) {
            Alert.alert(
              'Approved!',
              `${approvedIds.length} registration${approvedIds.length > 1 ? 's' : ''} approved. Assign to a team?`,
              [
                { text: 'Skip' },
                {
                  text: 'Assign to Team',
                  onPress: () => {
                    setPendingTeamAssignIds(approvedIds);
                    setShowBulkTeamPicker(true);
                  },
                },
              ]
            );
          } else {
            Alert.alert('Done', `${approvedIds.length} registration${approvedIds.length > 1 ? 's' : ''} approved.`);
          }
        },
      },
    ]);
  };

  const handleBulkTeamAssign = async (teamId: string) => {
    setShowBulkTeamPicker(false);
    setBulkSubmitting(true);
    const progress = { current: 0, total: pendingTeamAssignIds.length, action: 'Assigning', failures: [] as string[] };
    setBulkProgress(progress);

    for (const regId of pendingTeamAssignIds) {
      try {
        const reg = registrations.find(r => r.id === regId);
        if (!reg) continue;
        await assignToTeam(regId, reg.player_id, teamId);
      } catch {
        const reg = registrations.find(r => r.id === regId);
        progress.failures.push(reg ? (reg.player.first_name + ' ' + reg.player.last_name) : regId);
      }
      progress.current++;
      setBulkProgress({ ...progress });
    }

    await fetchData();
    setBulkSubmitting(false);
    setBulkProgress(null);

    // Queue team assignment emails
    try {
      const orgId = profile?.current_organization_id || '';
      const teamObj = teams.find(t => t.id === teamId);
      for (const regId of pendingTeamAssignIds) {
        const reg = registrations.find(r => r.id === regId);
        if (reg?.player?.parent_email && teamObj) {
          const seasonName = seasons.find(s => s.id === reg.season_id)?.name || '';
          queueTeamAssignment(orgId, reg.player.parent_email, reg.player.parent_name || '', `${reg.player.first_name} ${reg.player.last_name}`, teamObj.name, seasonName, '');
        }
      }
    } catch {}

    setPendingTeamAssignIds([]);

    const failCount = progress.failures.length;
    const successCount = progress.total - failCount;
    if (failCount > 0) {
      Alert.alert('Partial Success', `${successCount} assigned, ${failCount} failed:\n${progress.failures.join(', ')}`);
    } else {
      Alert.alert('Done', `${successCount} player${successCount > 1 ? 's' : ''} assigned to team.`);
    }
  };

  const executeBulkDeny = async (reason: string) => {
    setBulkSubmitting(true);
    const count = selectedIds.size;
    const progress = { current: 0, total: count, action: 'Denying', failures: [] as string[] };
    setBulkProgress(progress);
    for (const id of selectedIds) {
      try {
        await updateRegistrationStatus(id, 'denied', { denial_reason: reason });
      } catch {
        const reg = registrations.find(r => r.id === id);
        progress.failures.push(reg ? (reg.player.first_name + ' ' + reg.player.last_name) : id);
      }
      progress.current++;
      setBulkProgress({ ...progress });
    }
    await fetchData();
    setSelectionMode(false);
    setSelectedIds(new Set());
    setBulkSubmitting(false);
    setBulkProgress(null);
    setShowDenyModal(false);
    setDenyReason('');
    const failCount = progress.failures.length;
    const successCount = count - failCount;
    if (failCount > 0) {
      Alert.alert('Partial Success', `${successCount} denied, ${failCount} failed:\n${progress.failures.join(', ')}`);
    } else {
      Alert.alert('Done', `${successCount} registration${successCount > 1 ? 's' : ''} denied.`);
    }
  };

  const handleBulkDeny = () => {
    const count = selectedIds.size;
    if (Platform.OS === 'ios') {
      Alert.prompt('Deny Reason', `Deny ${count} registration${count > 1 ? 's' : ''}. Provide a reason:`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deny All', style: 'destructive', onPress: (reason: string | undefined) => executeBulkDeny(reason || '') },
      ], 'plain-text');
    } else {
      setShowDenyModal(true);
    }
  };

  const handleBulkWaitlist = async () => {
    const count = selectedIds.size;
    Alert.alert('Bulk Waitlist', `Waitlist ${count} registration${count > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Waitlist All',
        onPress: async () => {
          setBulkSubmitting(true);
          const maxPos = Math.max(0, ...registrations.filter(r => r.status === 'waitlisted').map(r => r.waitlist_position || 0));
          const progress = { current: 0, total: count, action: 'Waitlisting', failures: [] as string[] };
          setBulkProgress(progress);
          let idx = 0;
          for (const id of selectedIds) {
            try {
              await updateRegistrationStatus(id, 'waitlisted', { waitlist_position: maxPos + idx + 1 });
              idx++;
            } catch {
              const reg = registrations.find(r => r.id === id);
              progress.failures.push(reg ? (reg.player.first_name + ' ' + reg.player.last_name) : id);
            }
            progress.current++;
            setBulkProgress({ ...progress });
          }
          await fetchData();
          setSelectionMode(false);
          setSelectedIds(new Set());
          setBulkSubmitting(false);
          setBulkProgress(null);
          const failCount = progress.failures.length;
          const successCount = count - failCount;
          if (failCount > 0) {
            Alert.alert('Partial Success', `${successCount} waitlisted, ${failCount} failed:\n${progress.failures.join(', ')}`);
          } else {
            Alert.alert('Done', `${successCount} registration${successCount > 1 ? 's' : ''} waitlisted.`);
          }
        },
      },
    ]);
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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: registrations.length };
    for (const r of registrations) counts[r.status] = (counts[r.status] || 0) + 1;
    return counts;
  }, [registrations]);

  const sortedRegistrations = useMemo(() => {
    const sorted = [...filteredRegistrations];
    switch (sortMode) {
      case 'alpha':
        sorted.sort((a, b) => {
          const nameA = `${a.player?.last_name || ''} ${a.player?.first_name || ''}`.toLowerCase();
          const nameB = `${b.player?.last_name || ''} ${b.player?.first_name || ''}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;
      case 'status': {
        const order: Record<string, number> = { new: 0, approved: 1, active: 2, waitlisted: 3, rostered: 4, denied: 5, withdrawn: 6 };
        sorted.sort((a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99));
        break;
      }
      default: // 'recent'
        sorted.sort((a, b) => new Date(b.submitted_at || (b as any).created_at || 0).getTime() - new Date(a.submitted_at || (a as any).created_at || 0).getTime());
        break;
    }
    return sorted;
  }, [filteredRegistrations, sortMode]);

  const groupedRegistrations = {
    new: sortedRegistrations.filter(r => r.status === 'new'),
    approved: sortedRegistrations.filter(r => r.status === 'approved'),
    active: sortedRegistrations.filter(r => r.status === 'active'),
    rostered: sortedRegistrations.filter(r => r.status === 'rostered'),
    waitlisted: sortedRegistrations.filter(r => r.status === 'waitlisted'),
  };

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================
  const getWaiverStatus = (playerId: string) => {
    if (requiredWaiverIds.length === 0) return { complete: true, missing: 0 };
    const signed = waiverSignatureMap.get(playerId) || new Set();
    const missing = requiredWaiverIds.filter(wId => !signed.has(wId)).length;
    return { complete: missing === 0, missing };
  };

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
        minWidth: 70,
        borderWidth: activeFilter === filterKey ? 2 : 0,
        borderColor: activeFilter === filterKey ? color : 'transparent',
        borderRadius: radii.statBox,
      }}
      onPress={onPress}
      disabled={!onPress}
    >
      <StatBox value={value} label={label} accentColor={color} />
    </TouchableOpacity>
  );

  const renderRegistrationCard = (registration: Registration) => {
    const { player, payments, team, sport } = registration;
    const config = statusConfig[registration.status];
    const hasMedical = hasMedicalInfo(player);
    const isSelected = selectedIds.has(registration.id);

    // Compact inline flags
    const flags: { icon: string; color: string }[] = [];
    if (hasMedical) flags.push({ icon: 'medkit', color: '#FF3B30' });
    if (!player.waiver_liability) flags.push({ icon: 'document', color: '#FF3B30' });
    if (player.placement_preferences) flags.push({ icon: 'flag', color: '#5AC8FA' });

    return (
      <TouchableOpacity
        key={registration.id}
        style={{
          backgroundColor: '#FFF',
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 12,
          marginBottom: 6,
          borderLeftWidth: 3,
          borderLeftColor: config.color,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? '#2C5F7C' : 'rgba(0,0,0,0.06)',
          flexDirection: 'row',
          alignItems: 'center',
        }}
        onPress={() => {
          if (selectionMode) {
            toggleSelectId(registration.id);
          } else {
            setSelectedRegistration(registration);
            setDetailModalVisible(true);
          }
        }}
      >
        {selectionMode && (
          <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={20} color={isSelected ? colors.primary : colors.textMuted} style={{ marginRight: 8 }} />
        )}
        {/* Sport icon */}
        {sport && <Text style={{ fontSize: 16, marginRight: 6 }}>{sport.icon}</Text>}
        {/* Name */}
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>
          {player.first_name} {player.last_name}
        </Text>
        {/* Grade pill */}
        <Text style={{ fontSize: 11, color: colors.textMuted, marginHorizontal: 4 }}>G{player.grade}</Text>
        {/* Inline flag icons */}
        {flags.map((f, i) => (
          <Ionicons key={i} name={f.icon as any} size={12} color={f.color} style={{ marginLeft: 3 }} />
        ))}
        {/* Team badge (if rostered) */}
        {team && <Ionicons name="people" size={13} color="#AF52DE" style={{ marginLeft: 4 }} />}
        {/* Status badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${config.color}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: config.color }} />
          <Text style={{ fontSize: 10, color: config.color, marginLeft: 3, fontWeight: '700' }}>{config.label}</Text>
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
        onRequestClose={() => { setDetailModalVisible(false); setShowApproveTeamPicker(false); }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
            <TouchableOpacity onPress={() => { setDetailModalVisible(false); setShowApproveTeamPicker(false); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ ...displayTextStyle, fontSize: 16, color: colors.text }}>REGISTRATION DETAILS</Text>
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
            <View style={{ backgroundColor: '#FFF', borderRadius: radii.card, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 12 }}>PLAYER INFORMATION</Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Name</Text><Text style={{ color: colors.text, fontWeight: '500' }}>{player.first_name} {player.last_name}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Grade</Text><Text style={{ color: colors.text }}>{player.grade === 0 ? 'Kindergarten' : `${player.grade}th Grade`}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Type</Text><Text style={{ color: colors.text }}>{player.player_type === 'returning' ? 'Returning Player' : 'New Player'}</Text></View>
                {player.school && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>School</Text><Text style={{ color: colors.text }}>{player.school}</Text></View>}
              </View>
            </View>

            {/* Parent/Guardian Info */}
            <View style={{ backgroundColor: '#FFF', borderRadius: radii.card, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card }}>
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
            <View style={{ backgroundColor: '#FFF', borderRadius: radii.card, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card }}>
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
              <View style={{ backgroundColor: '#FFF', borderRadius: radii.card, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card }}>
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
            <View style={{ backgroundColor: '#FFF', borderRadius: radii.card, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card }}>
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
              <View style={{ backgroundColor: '#FFF', borderRadius: radii.card, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 12 }}>PAYMENT STATUS</Text>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Total Due</Text><Text style={{ color: colors.text, fontWeight: '500' }}>{formatCurrency(payments.total_due)}</Text></View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Paid</Text><Text style={{ color: '#34C759', fontWeight: '500' }}>{formatCurrency(payments.total_paid)}</Text></View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary }}>Balance</Text><Text style={{ color: payments.total_due - payments.total_paid > 0 ? '#FF9500' : '#34C759', fontWeight: '600' }}>{formatCurrency(payments.total_due - payments.total_paid)}</Text></View>
                </View>
              </View>
            )}

            {/* Custom Registration Answers */}
            {selectedRegistration?.custom_answers && Object.keys(selectedRegistration.custom_answers).length > 0 && (
              <View style={{ backgroundColor: '#FFF', borderRadius: radii.card, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="document-text" size={18} color={colors.primary} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginLeft: 8 }}>REGISTRATION ANSWERS</Text>
                </View>
                {Object.entries(selectedRegistration.custom_answers).map(([question, answer]) => (
                  <View key={question} style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>{question}</Text>
                    <Text style={{ fontSize: 14, color: colors.text }}>{String(answer || '—')}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Team Assignment */}
            {team && (
              <View style={{ backgroundColor: '#FFF', borderRadius: radii.card, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card }}>
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
                    {/* Enhanced Approve with Team Picker */}
                    {!showApproveTeamPicker ? (
                      <>
                        <TouchableOpacity
                          style={{ backgroundColor: '#34C759', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 8 }}
                          onPress={() => setShowApproveTeamPicker(true)}
                          disabled={actionLoading}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Approve & Assign Team</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ backgroundColor: colors.card, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}
                          onPress={() => updateRegistrationStatus(selectedRegistration.id, 'approved')}
                          disabled={actionLoading}
                        >
                          <Text style={{ color: colors.text, fontWeight: '500' }}>Approve Without Team</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={{ gap: 8, marginBottom: 8 }}>
                        <Text style={{ color: colors.textSecondary, textAlign: 'center', fontWeight: '600', marginBottom: 4 }}>
                          Select Team
                        </Text>
                        {seasonTeams.map(t => (
                          <TouchableOpacity
                            key={t.id}
                            disabled={actionLoading}
                            style={{
                              backgroundColor: colors.card, paddingVertical: 14, paddingHorizontal: 16,
                              borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between',
                              alignItems: 'center', borderWidth: 1, borderColor: colors.border,
                            }}
                            onPress={async () => {
                              setActionLoading(true);
                              try {
                                // 1. Approve registration
                                await updateRegistrationStatus(selectedRegistration.id, 'approved');
                                // 2. Assign to team (this also creates RSVPs)
                                await assignToTeam(selectedRegistration.id, selectedRegistration.player_id, t.id);

                                // Get fee total
                                const { data: fees } = await supabase
                                  .from('payments')
                                  .select('amount')
                                  .eq('player_id', selectedRegistration.player_id)
                                  .eq('season_id', selectedRegistration.season_id);
                                const totalFees = (fees || []).reduce((sum: number, f: any) => sum + (f.amount || 0), 0);

                                // Count future events for RSVP summary
                                const now = new Date();
                                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                const { count: rsvpCount } = await supabase
                                  .from('schedule_events')
                                  .select('*', { count: 'exact', head: true })
                                  .eq('team_id', t.id)
                                  .gte('event_date', todayStr);

                                setShowApproveTeamPicker(false);
                                Alert.alert(
                                  'Registration Approved!',
                                  `Added to ${t.name}, fees generated ($${totalFees.toFixed(2)}), RSVPs created for ${rsvpCount || 0} upcoming events.`
                                );
                              } catch (error) {
                                if (__DEV__) console.log('Approval chain error:', error);
                                Alert.alert('Error', 'Some steps of the approval may have failed. Check the registration status.');
                              } finally {
                                setActionLoading(false);
                              }
                            }}
                          >
                            <Text style={{ color: colors.text, fontWeight: '600' }}>{t.name}</Text>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          style={{ paddingVertical: 10, alignItems: 'center' }}
                          onPress={() => setShowApproveTeamPicker(false)}
                        >
                          <Text style={{ color: colors.textMuted }}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <AdminContextBar />
      <AppHeaderBar
        title="REGISTRATION"
        showLogo={false}
        showAvatar={false}
        showNotificationBell={false}
        leftIcon={<Ionicons name="arrow-back" size={22} color="#FFF" />}
        onLeftPress={() => router.back()}
        rightIcon={
          <TouchableOpacity onPress={toggleSelectionMode}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>
              {selectionMode ? 'DONE' : 'SELECT'}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Season Filter Button (FIX 18) */}
        <TouchableOpacity
          onPress={() => setShowSeasonFilter(true)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', backgroundColor: colors.glassCard, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 12 }}
        >
          <Text style={{ color: activeSeasonFilter === 'all' ? '#14B8A6' : colors.primary, fontWeight: '700', fontSize: 13 }}>
            {activeSeasonFilter === 'all' ? `All Seasons (${seasons.length})` : seasons.find(s => s.id === activeSeasonFilter)?.name || 'Season'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

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

        {/* Registration Overview — consolidated single card (FIX 16) */}
        {stats && stats.total_count > 0 && (
          <View style={{ backgroundColor: colors.glassCard, borderRadius: radii.card, borderWidth: 1, borderColor: colors.glassBorder, padding: 14, marginBottom: 12, ...shadows.card }}>
            {/* Top row: Total | Approved | Rostered */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ ...displayTextStyle, fontSize: 22, color: colors.text }}>{stats.total_count}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>Total</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ ...displayTextStyle, fontSize: 22, color: '#22C55E' }}>
                  {Math.round(((stats.approved_count + stats.active_count + stats.rostered_count) / stats.total_count) * 100)}%
                </Text>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>Approved</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ ...displayTextStyle, fontSize: 22, color: colors.text }}>{stats.rostered_count}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>Rostered</Text>
              </View>
            </View>
            {/* Status pills row */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              <TouchableOpacity onPress={() => setActiveFilter('new')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: 8, backgroundColor: activeFilter === 'new' ? '#E8913A15' : colors.background, borderWidth: activeFilter === 'new' ? 1.5 : 1, borderColor: activeFilter === 'new' ? '#E8913A' : colors.glassBorder }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8913A' }} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: activeFilter === 'new' ? '#E8913A' : colors.text }}>New {stats.new_count}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveFilter('approved')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: 8, backgroundColor: activeFilter === 'approved' ? '#0EA5E915' : colors.background, borderWidth: activeFilter === 'approved' ? 1.5 : 1, borderColor: activeFilter === 'approved' ? '#0EA5E9' : colors.glassBorder }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0EA5E9' }} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: activeFilter === 'approved' ? '#0EA5E9' : colors.text }}>Paid {stats.approved_count}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveFilter('active')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: 8, backgroundColor: activeFilter === 'active' ? '#22C55E15' : colors.background, borderWidth: activeFilter === 'active' ? 1.5 : 1, borderColor: activeFilter === 'active' ? '#22C55E' : colors.glassBorder }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: activeFilter === 'active' ? '#22C55E' : colors.text }}>Ready {stats.active_count}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveFilter('rostered')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: 8, backgroundColor: activeFilter === 'rostered' ? '#2C5F7C15' : colors.background, borderWidth: activeFilter === 'rostered' ? 1.5 : 1, borderColor: activeFilter === 'rostered' ? '#2C5F7C' : colors.glassBorder }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2C5F7C' }} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: activeFilter === 'rostered' ? '#2C5F7C' : colors.text }}>Team {stats.rostered_count}</Text>
              </TouchableOpacity>
            </View>
            {/* Revenue progress bar */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#22C55E' }}>{formatCurrency(stats.total_collected_revenue)} collected</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{formatCurrency(stats.total_expected_revenue)} expected</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.glassBorder, overflow: 'hidden' }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: '#22C55E', width: `${stats.total_expected_revenue > 0 ? Math.min(Math.round((stats.total_collected_revenue / stats.total_expected_revenue) * 100), 100) : 0}%` }} />
            </View>
          </View>
        )}

        {/* Selection mode controls */}
        {selectionMode && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
              {selectedIds.size} selected
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={selectAllVisible}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deselectAll}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Deselect All</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: radii.card, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card }}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 8, color: colors.text, fontSize: 16 }} placeholder="Search players or parents..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color={colors.textSecondary} /></TouchableOpacity> : null}
        </View>

        {/* Sort Toggle */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8, gap: 4, paddingHorizontal: 16 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, alignSelf: 'center', marginRight: 4 }}>Sort:</Text>
          {(['recent', 'alpha', 'status'] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              onPress={() => setSortMode(mode)}
              style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                backgroundColor: sortMode === mode ? colors.primary + '20' : 'transparent',
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: sortMode === mode ? '700' : '500',
                color: sortMode === mode ? colors.primary : colors.textMuted,
              }}>
                {mode === 'recent' ? 'Recent' : mode === 'alpha' ? 'A-Z' : 'Status'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: activeFilter === 'all' ? colors.primary : colors.card }} onPress={() => setActiveFilter('all')}>
              <Text style={{ color: activeFilter === 'all' ? colors.background : colors.text }}>All ({statusCounts.all})</Text>
            </TouchableOpacity>
            {Object.entries(statusConfig).map(([key, config]) => (
              <TouchableOpacity key={key} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: activeFilter === key ? config.color : colors.card }} onPress={() => setActiveFilter(key as RegistrationStatus)}>
                <Text style={{ color: activeFilter === key ? '#fff' : colors.text }}>{config.label} ({statusCounts[key] || 0})</Text>
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
          sortedRegistrations.map(renderRegistrationCard)
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

      {/* Bulk Action Bar */}
      {selectionMode && selectedIds.size > 0 && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
          padding: 16, paddingBottom: 32,
          shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
        }}>
          {bulkSubmitting && bulkProgress ? (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                {bulkProgress.action} {bulkProgress.current} of {bulkProgress.total}...
              </Text>
              <View style={{ width: '100%', height: 8, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{
                  height: '100%',
                  width: `${Math.round((bulkProgress.current / bulkProgress.total) * 100)}%`,
                  backgroundColor: bulkProgress.action === 'Denying' ? '#D94F4F' : bulkProgress.action === 'Waitlisting' ? '#E8913A' : '#22C55E',
                  borderRadius: 4,
                }} />
              </View>
              {bulkProgress.failures.length > 0 && (
                <Text style={{ fontSize: 12, color: '#D94F4F' }}>{bulkProgress.failures.length} failed</Text>
              )}
            </View>
          ) : bulkSubmitting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#22C55E', borderRadius: radii.card, paddingVertical: 14, alignItems: 'center' }}
                onPress={handleBulkApprove}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Approve ({selectedIds.size})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#E8913A', borderRadius: radii.card, paddingVertical: 14, alignItems: 'center' }}
                onPress={handleBulkWaitlist}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Waitlist ({selectedIds.size})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#D94F4F', borderRadius: radii.card, paddingVertical: 14, alignItems: 'center' }}
                onPress={handleBulkDeny}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Deny ({selectedIds.size})</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Bulk Team Assignment Modal */}
      <Modal visible={showBulkTeamPicker} transparent animationType="fade" onRequestClose={() => setShowBulkTeamPicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 32 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, maxHeight: '70%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Assign to Team</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
              Select a team for {pendingTeamAssignIds.length} player{pendingTeamAssignIds.length > 1 ? 's' : ''}
            </Text>
            <ScrollView>
              {teams.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={{
                    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    backgroundColor: colors.background, marginBottom: 8, borderWidth: 1, borderColor: colors.border,
                  }}
                  onPress={() => handleBulkTeamAssign(t.id)}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{t.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t.player_count} players</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={{ paddingVertical: 12, alignItems: 'center', marginTop: 8 }}
              onPress={() => { setShowBulkTeamPicker(false); setPendingTeamAssignIds([]); }}
            >
              <Text style={{ color: colors.textMuted, fontWeight: '500' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Android Deny Reason Modal */}
      <Modal visible={showDenyModal} transparent animationType="fade" onRequestClose={() => setShowDenyModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 32 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Deny Reason</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
              Deny {selectedIds.size} registration{selectedIds.size > 1 ? 's' : ''}. Provide a reason:
            </Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, fontSize: 15, minHeight: 80, textAlignVertical: 'top' }}
              placeholder="Reason for denial..."
              placeholderTextColor={colors.textMuted}
              value={denyReason}
              onChangeText={setDenyReason}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: colors.background }} onPress={() => { setShowDenyModal(false); setDenyReason(''); }}>
                <Text style={{ fontWeight: '600', color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#FF3B30' }} onPress={() => executeBulkDeny(denyReason)}>
                <Text style={{ fontWeight: '600', color: '#fff' }}>Deny All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Season Filter Modal (FIX 18) */}
      <Modal visible={showSeasonFilter} transparent animationType="fade" onRequestClose={() => setShowSeasonFilter(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowSeasonFilter(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 32, paddingHorizontal: 20, maxHeight: '50%' }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Filter by Season</Text>
            <TouchableOpacity
              onPress={() => { setActiveSeasonFilter('all'); setShowSeasonFilter(false); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Text style={{ fontSize: 15, fontWeight: activeSeasonFilter === 'all' ? '700' : '400', color: colors.text }}>All Seasons</Text>
              {activeSeasonFilter === 'all' && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </TouchableOpacity>
            <ScrollView>
              {seasons.map(s => {
                const sport = sports.find(sp => sp.id === s.sport_id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => { setActiveSeasonFilter(s.id); setShowSeasonFilter(false); }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {sport && <Text style={{ fontSize: 16, marginRight: 8 }}>{sport.icon}</Text>}
                      <Text style={{ fontSize: 15, fontWeight: activeSeasonFilter === s.id ? '700' : '400', color: colors.text }}>{s.name}</Text>
                    </View>
                    {activeSeasonFilter === s.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Detail Modal */}
      {renderDetailModal()}
    </SafeAreaView>
  );
}
