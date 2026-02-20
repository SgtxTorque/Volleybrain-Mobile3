import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { useSport } from '@/lib/sport';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ReenrollmentBanner from './ReenrollmentBanner';
import RoleSelector from './RoleSelector';
import SportSelector from './ui/SportSelector';

// ============================================
// TYPES
// ============================================

type AlertItem = {
  text: string;
  route: string | null;
  type: 'success' | 'warning' | 'error';
  count?: number;
  borderColor?: string;
};

type PendingInvite = {
  id: string;
  email: string | null;
  invite_type: string;
  invite_code: string;
  status: string;
  invited_at: string;
  expires_at: string;
};

type Team = {
  id: string;
  name: string;
};

type RecentActivity = {
  id: string;
  text: string;
  timestamp: string;
  color: string;
};

type TodaysGame = {
  id: string;
  team_name: string;
  team_color: string | null;
  opponent: string | null;
  event_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  location: string | null;
  game_status: string | null;
};

// ============================================
// COMPONENT
// ============================================

export default function AdminDashboard() {
  const { profile, organization } = useAuth();
  const { isAdmin } = usePermissions();
  const { allSeasons, workingSeason, setWorkingSeason, refreshSeasons } = useSeason();
  const { activeSport, sportColors } = useSport();
  const { colors } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ players: 0, teams: 0, coaches: 0, outstanding: 0 });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [familiesPaid, setFamiliesPaid] = useState(0);
  const [familiesPending, setFamiliesPending] = useState(0);
  const [totalExpected, setTotalExpected] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [gamesPlayedCount, setGamesPlayedCount] = useState(0);
  const [avgAttendance, setAvgAttendance] = useState(0);

  // Registration stats
  const [newRegistrationCount, setNewRegistrationCount] = useState(0);
  const [todaysGames, setTodaysGames] = useState<TodaysGame[]>([]);
  const [tomorrowGames, setTomorrowGames] = useState<TodaysGame[]>([]);
  const [approvalCount, setApprovalCount] = useState(0);
  const [unrosteredCount, setUnrosteredCount] = useState(0);

  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonStatus, setNewSeasonStatus] = useState<'active' | 'upcoming'>('upcoming');
  const [creating, setCreating] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState<'parent' | 'coach' | 'admin' | 'team_code' | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [showPendingInvites, setShowPendingInvites] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamCodeDescription, setTeamCodeDescription] = useState('');
  const [teamRevenueBreakdown, setTeamRevenueBreakdown] = useState<{
    teamId: string; teamName: string; collected: number; expected: number;
  }[]>([]);
  const [showTeamBreakdown, setShowTeamBreakdown] = useState(false);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchStats = async () => {
    if (!workingSeason) {
      setStats({ players: 0, teams: 0, coaches: 0, outstanding: 0 });
      setNewRegistrationCount(0);
      setAlerts([{ text: 'No season selected - Create one to get started!', route: null, type: 'error' }]);
      setLoading(false);
      return;
    }

    const alertList: AlertItem[] = [];
    const seasonId = workingSeason.id;

    const { count: playerCount } = await supabase.from('players').select('*', { count: 'exact', head: true }).eq('season_id', seasonId);
    const { count: teamCount } = await supabase.from('teams').select('*', { count: 'exact', head: true }).eq('season_id', seasonId);
    const { count: coachCount } = await supabase.from('coaches').select('*', { count: 'exact', head: true }).eq('season_id', seasonId);

    const { data: players } = await supabase.from('players').select('id').eq('season_id', seasonId);
    const { data: payments } = await supabase.from('payments').select('*').eq('season_id', seasonId);

    const seasonFee = workingSeason?.fee_registration || 335;
    const expectedTotal = (players?.length || 0) * seasonFee;
    const paidTotal = (payments || []).filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
    const outstanding = expectedTotal - paidTotal;

    // Calculate families paid/pending
    const paidFamilies = new Set((payments || []).filter(p => p.paid).map(p => p.player_id)).size;
    const allFamilies = players?.length || 0;

    setFamiliesPaid(paidFamilies);
    setFamiliesPending(allFamilies - paidFamilies);
    setTotalExpected(expectedTotal);
    setTotalCollected(paidTotal);

    setStats({
      players: playerCount || 0,
      teams: teamCount || 0,
      coaches: coachCount || 0,
      outstanding: outstanding,
    });

    // Fetch new registration count from registrations table
    const { count: newRegCount } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', seasonId)
      .eq('status', 'new');

    setNewRegistrationCount(newRegCount || 0);

    // Add registration alert if there are new registrations
    if (newRegCount && newRegCount > 0) {
      alertList.push({
        text: newRegCount + ' new registration' + (newRegCount > 1 ? 's' : '') + ' awaiting review',
        route: '/registration-hub',
        type: 'warning',
        count: newRegCount,
        borderColor: colors.warning,
      });
    }

    // Check for players needing team assignment (active status in registrations)
    const { count: needsTeamCount } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', seasonId)
      .eq('status', 'active');

    setUnrosteredCount(needsTeamCount || 0);
    if (needsTeamCount && needsTeamCount > 0) {
      alertList.push({
        text: needsTeamCount + ' player' + (needsTeamCount > 1 ? 's' : '') + ' ready for team assignment',
        route: '/team-management',
        type: 'warning',
        count: needsTeamCount,
        borderColor: colors.danger,
      });
    }

    // Check for pending payments (approved but not paid)
    const { count: pendingPaymentCount } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', seasonId)
      .eq('status', 'approved');

    if (pendingPaymentCount && pendingPaymentCount > 0) {
      alertList.push({
        text: pendingPaymentCount + ' registration' + (pendingPaymentCount > 1 ? 's' : '') + ' pending payment',
        route: '/registration-hub',
        type: 'warning',
        count: pendingPaymentCount,
        borderColor: colors.primary,
      });
    }

    if (teamCount === 0) alertList.push({ text: 'No teams created yet', route: '/team-management', type: 'error', borderColor: colors.danger });
    if (playerCount === 0 && (!newRegCount || newRegCount === 0)) alertList.push({ text: 'No players registered yet', route: '/(tabs)/players', type: 'error', borderColor: colors.danger });
    if (coachCount === 0) alertList.push({ text: 'No coaches added yet', route: '/coach-directory', type: 'error', borderColor: colors.danger });
    if (outstanding > 0) alertList.push({ text: '$' + Number(outstanding).toFixed(2) + ' in outstanding payments', route: '/(tabs)/payments', type: 'warning', borderColor: colors.warning });

    const orgId = profile?.current_organization_id;
    const { count: pendingCount } = await supabase.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('organization_id', orgId);
    if (pendingCount && pendingCount > 0) alertList.push({ text: pendingCount + ' pending invite' + (pendingCount > 1 ? 's' : '') + ' awaiting response', route: null, type: 'warning', borderColor: colors.info });

    const { count: approvalCt } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('pending_approval', true).eq('current_organization_id', orgId);
    setApprovalCount(approvalCt || 0);
    if (approvalCt && approvalCt > 0) alertList.push({ text: approvalCt + ' account' + (approvalCt > 1 ? 's' : '') + ' awaiting approval', route: '/users', type: 'warning', borderColor: colors.info });

    // Waiver compliance alert
    const { data: requiredWaivers } = await supabase
      .from('waiver_templates')
      .select('id')
      .eq('organization_id', orgId)
      .eq('is_required', true)
      .eq('is_active', true);

    if (requiredWaivers && requiredWaivers.length > 0 && players && players.length > 0) {
      const playerIds = players.map(p => p.id);
      const waiverIds = requiredWaivers.map(w => w.id);
      const { data: signatures } = await supabase
        .from('waiver_signatures')
        .select('player_id, waiver_template_id')
        .eq('season_id', seasonId)
        .in('player_id', playerIds)
        .in('waiver_template_id', waiverIds);

      const signedSet = new Set((signatures || []).map(s => s.player_id + ':' + s.waiver_template_id));
      let missingCount = 0;
      for (const pid of playerIds) {
        for (const wid of waiverIds) {
          if (!signedSet.has(pid + ':' + wid)) { missingCount++; break; }
        }
      }
      if (missingCount > 0) {
        alertList.push({
          text: missingCount + ' player' + (missingCount > 1 ? 's' : '') + ' missing required waivers',
          route: '/registration-hub',
          type: 'warning',
          count: missingCount,
          borderColor: '#AF52DE',
        });
      }
    }

    // Games needing stats entry alert
    const { count: needsStatsCount } = await supabase
      .from('schedule_events')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', seasonId)
      .eq('event_type', 'game')
      .not('game_result', 'is', null)
      .or('stats_entered.is.null,stats_entered.eq.false');

    if (needsStatsCount && needsStatsCount > 0) {
      alertList.push({
        text: needsStatsCount + ' game' + (needsStatsCount > 1 ? 's' : '') + ' need stats entry',
        route: '/game-prep',
        type: 'warning',
        count: needsStatsCount,
        borderColor: colors.danger,
      });
    }

    // Sort alerts by urgency (errors first, then by count desc)
    alertList.sort((a, b) => {
      const pri: Record<string, number> = { error: 0, warning: 1, success: 2 };
      return (pri[a.type] ?? 1) - (pri[b.type] ?? 1) || ((b.count || 0) - (a.count || 0));
    });

    if (alertList.length === 0) alertList.push({ text: 'All clear! Everything is running smoothly.', route: null, type: 'success' });
    setAlerts(alertList);

    // Fetch games played and avg attendance
    const { count: gamesCount } = await supabase
      .from('schedule_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'game')
      .eq('season_id', workingSeason.id)
      .not('game_result', 'is', null);
    setGamesPlayedCount(gamesCount || 0);

    // Fetch recent activity
    await fetchRecentActivity(orgId);

    setLoading(false);
  };

  const fetchRecentActivity = async (orgId: string | null | undefined) => {
    if (!orgId || !workingSeason) return;

    const activities: RecentActivity[] = [];

    // Recent registrations
    const { data: recentRegs } = await supabase
      .from('registrations')
      .select('id, created_at, players (first_name, last_name)')
      .eq('season_id', workingSeason.id)
      .order('created_at', { ascending: false })
      .limit(3);

    (recentRegs || []).forEach((reg: any) => {
      const name = reg.players ? `${reg.players.first_name || ''} ${reg.players.last_name || ''}`.trim() : 'Unknown';
      activities.push({
        id: 'reg-' + reg.id,
        text: 'New registration: ' + name,
        timestamp: reg.created_at,
        color: colors.success,
      });
    });

    // Recent payments
    const { data: recentPayments } = await supabase
      .from('payments')
      .select('id, amount, created_at, players (first_name, last_name)')
      .eq('season_id', workingSeason.id)
      .eq('paid', true)
      .order('created_at', { ascending: false })
      .limit(3);

    (recentPayments || []).forEach((pay: any) => {
      const name = pay.players ? `${pay.players.first_name || ''} ${pay.players.last_name || ''}`.trim() : 'Unknown';
      activities.push({
        id: 'pay-' + pay.id,
        text: 'Payment received: $' + Number(pay.amount).toFixed(2) + ' from ' + name,
        timestamp: pay.created_at,
        color: colors.info,
      });
    });

    // Recent profile approvals pending
    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, created_at')
      .eq('current_organization_id', orgId)
      .eq('pending_approval', true)
      .order('created_at', { ascending: false })
      .limit(2);

    (recentProfiles || []).forEach((prof: any) => {
      activities.push({
        id: 'prof-' + prof.id,
        text: 'Coach approval pending: ' + (prof.full_name || 'Unknown'),
        timestamp: prof.created_at,
        color: colors.warning,
      });
    });

    // Sort by timestamp desc and limit to 5
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRecentActivity(activities.slice(0, 5));
  };

  const fetchPendingInvites = async () => {
    const orgId = profile?.current_organization_id;
    if (!orgId) return;

    const { data } = await supabase
      .from('invitations')
      .select('id, email, invite_type, invite_code, status, invited_at, expires_at')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false })
      .limit(20);

    setPendingInvites(data || []);
  };

  const fetchTeams = async () => {
    if (!workingSeason) return;
    const { data } = await supabase
      .from('teams')
      .select('id, name')
      .eq('season_id', workingSeason.id)
      .order('name');
    setTeams(data || []);
  };

  const fetchTeamRevenueBreakdown = async () => {
    if (!workingSeason) return;
    try {
      // 1. Get teams
      const { data: seasonTeams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('season_id', workingSeason.id)
        .order('name');
      if (!seasonTeams || seasonTeams.length === 0) { setTeamRevenueBreakdown([]); return; }

      // 2. Get team_players
      const teamIds = seasonTeams.map(t => t.id);
      const { data: teamPlayers } = await supabase
        .from('team_players')
        .select('team_id, player_id')
        .in('team_id', teamIds);

      // Build team->player map
      const teamPlayerMap = new Map<string, string[]>();
      (teamPlayers || []).forEach(tp => {
        const pids = teamPlayerMap.get(tp.team_id) || [];
        pids.push(tp.player_id);
        teamPlayerMap.set(tp.team_id, pids);
      });

      // 3. Get season fees for expected calc
      const { data: seasonFees } = await supabase
        .from('season_fees')
        .select('amount')
        .eq('season_id', workingSeason.id);
      const feePerPlayer = (seasonFees || []).reduce((sum, f) => sum + (f.amount || 0), 0) || (workingSeason.fee_registration || 335);

      // 4. Get payments (already have them from fetchStats, but fetch again for clarity)
      const allPlayerIds = [...new Set((teamPlayers || []).map(tp => tp.player_id))];
      let paymentsMap = new Map<string, number>();
      if (allPlayerIds.length > 0) {
        const { data: payments } = await supabase
          .from('payments')
          .select('player_id, amount, paid')
          .in('player_id', allPlayerIds)
          .eq('season_id', workingSeason.id)
          .eq('paid', true);
        (payments || []).forEach(p => {
          paymentsMap.set(p.player_id, (paymentsMap.get(p.player_id) || 0) + (p.amount || 0));
        });
      }

      // 5. Build breakdown
      const breakdown = seasonTeams.map(team => {
        const playerIds = teamPlayerMap.get(team.id) || [];
        const expected = playerIds.length * feePerPlayer;
        const collected = playerIds.reduce((sum, pid) => sum + (paymentsMap.get(pid) || 0), 0);
        return { teamId: team.id, teamName: team.name, collected, expected };
      });

      setTeamRevenueBreakdown(breakdown);
    } catch (err) {
      if (__DEV__) console.error('Team revenue breakdown error:', err);
    }
  };

  const fetchTodaysGames = async () => {
    if (!workingSeason) { setTodaysGames([]); setTomorrowGames([]); return; }
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: todayData } = await supabase
      .from('schedule_events')
      .select('id, opponent, opponent_name, event_time, venue_name, venue_address, location, game_status, team_id, teams(name, color)')
      .eq('season_id', workingSeason.id)
      .eq('event_type', 'game')
      .eq('event_date', todayStr)
      .order('event_time', { ascending: true });

    const mapGame = (g: any): TodaysGame => ({
      id: g.id,
      team_name: g.teams?.name || 'Unknown',
      team_color: g.teams?.color || null,
      opponent: g.opponent_name || g.opponent || null,
      event_time: g.event_time,
      venue_name: g.venue_name,
      venue_address: g.venue_address,
      location: g.location,
      game_status: g.game_status,
    });

    const todayMapped = (todayData || []).map(mapGame);
    setTodaysGames(todayMapped);

    if (todayMapped.length === 0) {
      const { data: tomorrowData } = await supabase
        .from('schedule_events')
        .select('id, opponent, opponent_name, event_time, venue_name, venue_address, location, game_status, team_id, teams(name, color)')
        .eq('season_id', workingSeason.id)
        .eq('event_type', 'game')
        .eq('event_date', tomorrowStr)
        .order('event_time', { ascending: true });

      setTomorrowGames((tomorrowData || []).map(mapGame));
    } else {
      setTomorrowGames([]);
    }
  };

  const formatGameTime = (time: string | null): string => {
    if (!time) return 'TBD';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return hour12 + ':' + String(m).padStart(2, '0') + ' ' + ampm;
  };

  const openGameMaps = (address: string) => {
    const url = Platform.select({
      ios: 'http://maps.apple.com/?daddr=' + encodeURIComponent(address),
      android: 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address),
      default: 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address),
    });
    if (url) Linking.openURL(url);
  };

  useEffect(() => {
    if (workingSeason) {
      fetchStats();
      fetchTeams();
      fetchTodaysGames();
      fetchTeamRevenueBreakdown();
    }
    fetchPendingInvites();
  }, [workingSeason]);

  // ============================================
  // INVITE FUNCTIONS (preserved from original)
  // ============================================

  const generateInviteCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const sendInvite = async (type: 'parent' | 'coach' | 'admin') => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setInviteLoading(true);

    try {
      const orgId = profile?.current_organization_id;
      if (!orgId) throw new Error('Organization not found');

      const inviteCode = generateInviteCode();
      const roleMap: Record<string, string> = { parent: 'parent', coach: 'head_coach', admin: 'league_admin' };

      const { error } = await supabase.from('invitations').insert({
        organization_id: orgId,
        invite_type: type,
        email: inviteEmail.trim().toLowerCase(),
        invite_code: inviteCode,
        role_to_grant: roleMap[type],
        message: inviteMessage.trim() || null,
        invited_by: profile?.id,
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert(
        'Invite Created!',
        'Invite code: ' + inviteCode + '\n\nShare this code with ' + inviteEmail,
        [
          {
            text: 'Copy & Share',
            onPress: () => {
              const msg = 'You have been invited to join ' + (organization?.name || 'our organization') + ' on VolleyBrain!\n\nYour invite code: ' + inviteCode + '\n\nDownload the app and use this code to sign up.' + (inviteMessage ? '\n\nMessage: ' + inviteMessage : '');
              Share.share({ message: msg });
            }
          },
          { text: 'Done' }
        ]
      );

      setInviteEmail('');
      setInviteMessage('');
      setShowInviteForm(null);
      fetchPendingInvites();

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const createTeamCode = async () => {
    if (!selectedTeamId) {
      Alert.alert('Select Team', 'Please select a team for this invite code.');
      return;
    }

    setInviteLoading(true);

    try {
      const inviteCode = generateInviteCode();
      const selectedTeam = teams.find(t => t.id === selectedTeamId);

      const { error } = await supabase.from('team_invite_codes').insert({
        team_id: selectedTeamId,
        code: inviteCode,
        description: teamCodeDescription.trim() || ('Join ' + selectedTeam?.name),
        created_by: profile?.id,
        is_active: true,
      });

      if (error) throw error;

      Alert.alert(
        'Team Code Created!',
        'Code: ' + inviteCode + '\n\nParents can use this code when signing up to automatically link to ' + selectedTeam?.name + '.',
        [
          {
            text: 'Copy & Share',
            onPress: () => {
              Share.share({
                message: 'Join ' + selectedTeam?.name + ' on ' + (organization?.name || 'VolleyBrain') + '!\n\nUse code: ' + inviteCode + ' when signing up on VolleyBrain.',
              });
            }
          },
          { text: 'Done' }
        ]
      );

      setSelectedTeamId('');
      setTeamCodeDescription('');
      setShowInviteForm(null);

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create team code');
    } finally {
      setInviteLoading(false);
    }
  };

  const resendInvite = async (invite: PendingInvite) => {
    Share.share({
      message: 'Reminder: You have been invited to join ' + (organization?.name || 'our organization') + '!\n\nYour invite code: ' + invite.invite_code + '\n\nDownload VolleyBrain and use this code to sign up.',
    });
  };

  const revokeInvite = async (invite: PendingInvite) => {
    Alert.alert('Revoke Invite', 'Are you sure you want to revoke this invite for ' + invite.email + '?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('invitations').update({ status: 'revoked' }).eq('id', invite.id);
          fetchPendingInvites();
        }
      }
    ]);
  };

  const copyInviteCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied!', 'Code ' + code + ' copied to clipboard.');
  };

  const shareRegistrationLink = () => {
    const openSeasons = allSeasons.filter(s => s.registration_open);
    if (openSeasons.length > 0) {
      const link = 'https://sgtxtorque.github.io/volleyball-registration/';
      Share.share({
        message: 'Register for ' + (organization?.name || 'our organization') + '!\n\n' + link + '\n\nOpen seasons: ' + openSeasons.map(s => s.name).join(', '),
      });
    } else {
      Alert.alert('No Open Registration', 'Turn on registration for at least one season first.');
    }
  };

  // ============================================
  // SEASON FUNCTIONS (preserved from original)
  // ============================================

  const createSeason = async () => {
    if (!newSeasonName.trim()) { Alert.alert('Error', 'Please enter a season name'); return; }
    setCreating(true);
    try {
      const orgId = profile?.current_organization_id;

      const { data, error } = await supabase
        .from('seasons')
        .insert({
          name: newSeasonName.trim(),
          status: newSeasonStatus,
          registration_open: true,
          fee_registration: 150,
          fee_uniform: 35,
          fee_monthly: 50,
          months_in_season: 3,
          organization_id: orgId,
          sport_id: activeSport?.id,
        })
        .select().single();
      if (error) throw error;

      const ageGroups = [
        { season_id: data.id, name: '11U', min_grade: 5, max_grade: 5, display_order: 1 },
        { season_id: data.id, name: '12U', min_grade: 6, max_grade: 6, display_order: 2 },
        { season_id: data.id, name: '13U', min_grade: 7, max_grade: 7, display_order: 3 },
        { season_id: data.id, name: '14U', min_grade: 8, max_grade: 8, display_order: 4 },
      ];
      await supabase.from('age_groups').insert(ageGroups);

      setShowCreateModal(false);
      setNewSeasonName('');
      setNewSeasonStatus('upcoming');
      setWorkingSeason(data);
      await refreshSeasons();
      Alert.alert('Success!', data.name + ' has been created with registration open!');
    } catch (error: any) { Alert.alert('Error', error.message); }
    finally { setCreating(false); }
  };

  const selectSeason = (season: any) => { setWorkingSeason(season); setShowSeasonPicker(false); };

  const toggleRegistration = async (season: any) => {
    const { error } = await supabase.from('seasons').update({ registration_open: !season.registration_open }).eq('id', season.id);
    if (error) { Alert.alert('Error', error.message); return; }
    await refreshSeasons();
  };

  const updateSeasonStatus = async (season: any, newStatus: string) => {
    const { error } = await supabase.from('seasons').update({ status: newStatus }).eq('id', season.id);
    if (error) { Alert.alert('Error', error.message); return; }
    await refreshSeasons();
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleAlertPress = (alert: AlertItem) => {
    if (alert.text.includes('pending invite')) {
      setShowPendingInvites(true);
    } else if (alert.route) {
      router.push(alert.route as any);
    } else if (alert.text.includes('No season')) {
      setShowSeasonPicker(true);
    }
  };

  const getAlertColor = (type: AlertItem['type']) => {
    switch (type) { case 'success': return colors.success; case 'warning': return colors.warning; case 'error': return colors.danger; }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'active': return colors.success; case 'upcoming': return colors.info; case 'completed': return colors.textMuted; default: return colors.textMuted; }
  };

  const getStatusLabel = (status: string) => {
    switch (status) { case 'active': return 'Active'; case 'upcoming': return 'Upcoming'; case 'completed': return 'Completed'; default: return status; }
  };

  const getInviteTypeLabel = (type: string) => {
    switch (type) { case 'parent': return 'Parent'; case 'coach': return 'Coach'; case 'admin': return 'Admin'; default: return type; }
  };

  const getInviteTypeColor = (type: string) => {
    switch (type) { case 'parent': return colors.success; case 'coach': return colors.info; case 'admin': return colors.danger; default: return colors.textMuted; }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + 'm ago';
    if (diffHours < 24) return diffHours + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshSeasons();
    await Promise.all([fetchStats(), fetchPendingInvites(), fetchTodaysGames()]);
    setRefreshing(false);
  };

  const openSeasonsCount = allSeasons.filter(s => s.registration_open).length;
  const revenuePercent = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const s = createStyles(colors, sportColors);

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading && !workingSeason) {
    return (
      <View style={[s.scroll, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 15 }}>Loading Mission Control...</Text>
      </View>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <ScrollView
      style={s.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Welcome back,</Text>
          <Text style={s.userName}>{profile?.full_name || 'Admin'}</Text>
        </View>
        <View style={s.headerRight}>
          <RoleSelector />
          <SportSelector />
        </View>
      </View>

      {/* HERO SECTION - Org Overview */}
      <View style={s.heroCard}>
        <View style={s.heroAccentBar} />
        <View style={s.heroBody}>
          <View style={s.heroTopRow}>
            <Text style={s.heroOrgName}>{organization?.name || 'Organization'}</Text>
            <View style={s.heroSportBadge}>
              <Text style={s.heroSportIcon}>{activeSport?.icon || '🏐'}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.heroSeasonRow} onPress={() => setShowSeasonPicker(true)}>
            <Text style={s.heroSeasonName}>{workingSeason?.name || 'No Season'}</Text>
            {workingSeason && (
              <View style={[s.heroStatusPill, { backgroundColor: getStatusColor(workingSeason.status) }]}>
                <Text style={s.heroStatusPillText}>{getStatusLabel(workingSeason.status)}</Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <View style={s.heroStatsRow}>
            <TouchableOpacity style={s.heroStatItem} onPress={() => router.push('/players' as any)}>
              <Text style={s.heroStatNum}>{stats.players}</Text>
              <Text style={s.heroStatLabel}>Players</Text>
            </TouchableOpacity>
            <View style={s.heroStatDivider} />
            <TouchableOpacity style={s.heroStatItem} onPress={() => router.push('/team-management' as any)}>
              <Text style={s.heroStatNum}>{stats.teams}</Text>
              <Text style={s.heroStatLabel}>Teams</Text>
            </TouchableOpacity>
            <View style={s.heroStatDivider} />
            <TouchableOpacity style={s.heroStatItem} onPress={() => router.push('/coach-directory' as any)}>
              <Text style={s.heroStatNum}>{stats.coaches}</Text>
              <Text style={s.heroStatLabel}>Coaches</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {openSeasonsCount > 0 && (
        <View style={s.regAlert}>
          <Ionicons name="information-circle" size={18} color={colors.info} />
          <Text style={s.regAlertText}>{openSeasonsCount} season{openSeasonsCount > 1 ? 's' : ''} accepting registration</Text>
        </View>
      )}

      <ReenrollmentBanner />

      {/* NEEDS ATTENTION */}
      {alerts.length > 0 && alerts[0].type !== 'success' && (
        <>
          <Text style={s.sectionLabel}>NEEDS ATTENTION</Text>
          <View style={s.attentionContainer}>
            {alerts.map((alert, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  s.attentionCard,
                  { borderLeftColor: alert.borderColor || getAlertColor(alert.type) },
                ]}
                onPress={() => handleAlertPress(alert)}
                disabled={alert.type === 'success'}
                activeOpacity={alert.type === 'success' ? 1 : 0.7}
              >
                <View style={[s.attentionIconCircle, { backgroundColor: (alert.borderColor || getAlertColor(alert.type)) + '20' }]}>
                  <Ionicons
                    name={
                      alert.text.includes('waiver') ? 'document-attach' :
                      alert.text.includes('stats') ? 'stats-chart' :
                      alert.text.includes('registration') ? 'document-text' :
                      alert.text.includes('payment') || alert.text.includes('outstanding') ? 'cash' :
                      alert.text.includes('approval') || alert.text.includes('invite') ? 'person' :
                      alert.text.includes('team') ? 'shirt' :
                      alert.text.includes('player') ? 'people' :
                      alert.text.includes('coach') ? 'clipboard' :
                      'alert-circle'
                    }
                    size={20}
                    color={alert.borderColor || getAlertColor(alert.type)}
                  />
                </View>
                <View style={s.attentionContent}>
                  <Text style={s.attentionText}>{alert.text}</Text>
                </View>
                {(alert.route || alert.text.includes('No season') || alert.text.includes('pending invite')) && (
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {alerts.length === 1 && alerts[0].type === 'success' && (
        <>
          <Text style={s.sectionLabel}>NEEDS ATTENTION</Text>
          <View style={s.successCard}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            <Text style={s.successText}>All clear! Everything is running smoothly.</Text>
          </View>
        </>
      )}

      {/* REVENUE PULSE */}
      <Text style={s.sectionLabel}>REVENUE PULSE</Text>
      <TouchableOpacity style={s.revenueCard} activeOpacity={0.7} onPress={() => router.push('/(tabs)/payments' as any)}>
        <View style={s.revenueHeader}>
          <Text style={[s.revenuePercent, revenuePercent >= 100 && { color: colors.success }]}>{revenuePercent}%</Text>
          <Text style={s.revenueLabel}>collected</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
        <View style={s.revenueBarBg}>
          <View style={[s.revenueBarFill, { width: `${Math.min(revenuePercent, 100)}%` }, revenuePercent >= 100 && { backgroundColor: colors.success }]} />
        </View>
        {revenuePercent >= 100 ? (
          <Text style={[s.revenueDetail, { color: colors.success, fontWeight: '600' }]}>All payments collected! Great job!</Text>
        ) : (
          <Text style={s.revenueDetail}>
            ${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${totalExpected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} collected
          </Text>
        )}
        <View style={s.revenueSubStats}>
          <View style={s.revenueSubStat}>
            <Text style={[s.revenueSubNum, { color: colors.success }]}>{familiesPaid}</Text>
            <Text style={s.revenueSubLabel}>Families Paid</Text>
          </View>
          <View style={s.revenueSubDivider} />
          <View style={s.revenueSubStat}>
            <Text style={[s.revenueSubNum, { color: colors.warning }]}>{familiesPending}</Text>
            <Text style={s.revenueSubLabel}>Families Pending</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Team Revenue Breakdown */}
      {teamRevenueBreakdown.length > 0 && (
        <TouchableOpacity
          onPress={() => setShowTeamBreakdown(!showTeamBreakdown)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
            {showTeamBreakdown ? 'Hide' : 'Show'} Team Breakdown
          </Text>
          <Ionicons name={showTeamBreakdown ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {showTeamBreakdown && teamRevenueBreakdown.length > 0 && (
        <View style={{
          backgroundColor: colors.glassCard,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          overflow: 'hidden',
          marginHorizontal: 16,
          marginBottom: 8,
        }}>
          {teamRevenueBreakdown.map((team, idx) => {
            const pct = team.expected > 0 ? Math.round((team.collected / team.expected) * 100) : 0;
            const barColor = pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.danger;
            return (
              <View key={team.teamId} style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: idx < teamRevenueBreakdown.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, flex: 1 }}>{team.teamName}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: barColor }}>{pct}%</Text>
                </View>
                <View style={{
                  height: 4,
                  backgroundColor: colors.border,
                  borderRadius: 2,
                  marginTop: 6,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    height: '100%',
                    width: `${Math.min(pct, 100)}%`,
                    backgroundColor: barColor,
                    borderRadius: 2,
                  }} />
                </View>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                  ${team.collected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${team.expected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* TODAY'S GAMES */}
      {todaysGames.length > 0 && (
        <>
          <Text style={s.sectionLabel}>TODAY'S GAMES</Text>
          <View style={s.todaysGamesContainer}>
            {todaysGames.map(game => (
              <View key={game.id} style={s.gameCard}>
                <View style={[s.gameCardAccent, { backgroundColor: game.team_color || colors.primary }]} />
                <View style={s.gameCardBody}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={s.gameCardTeam}>{game.team_name}</Text>
                    <View style={[s.gameStatusPill, {
                      backgroundColor: game.game_status === 'live' ? colors.danger + '20' :
                        game.game_status === 'completed' ? colors.success + '20' : colors.info + '20'
                    }]}>
                      <Text style={{
                        fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
                        color: game.game_status === 'live' ? colors.danger :
                          game.game_status === 'completed' ? colors.success : colors.info,
                      }}>
                        {game.game_status === 'completed' ? 'FINAL' : game.game_status === 'live' ? 'LIVE' : 'SCHEDULED'}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.gameCardOpponent}>vs {game.opponent || 'TBD'}</Text>
                  <View style={s.gameCardDetails}>
                    <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                    <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 4 }}>{formatGameTime(game.event_time)}</Text>
                    {(game.venue_name || game.venue_address || game.location) && (
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}
                        onPress={() => openGameMaps(game.venue_address || game.location || game.venue_name || '')}
                      >
                        <Ionicons name="location-outline" size={14} color={colors.info} />
                        <Text style={{ fontSize: 13, color: colors.info, marginLeft: 4 }} numberOfLines={1}>
                          {game.venue_name || game.location || 'View Map'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {todaysGames.length === 0 && tomorrowGames.length > 0 && (
        <>
          <Text style={s.sectionLabel}>TOMORROW'S GAMES</Text>
          <View style={s.todaysGamesContainer}>
            {tomorrowGames.map(game => (
              <View key={game.id} style={[s.gameCard, { opacity: 0.8 }]}>
                <View style={[s.gameCardAccent, { backgroundColor: game.team_color || colors.primary }]} />
                <View style={s.gameCardBody}>
                  <Text style={s.gameCardTeam}>{game.team_name}</Text>
                  <Text style={s.gameCardOpponent}>vs {game.opponent || 'TBD'}</Text>
                  <View style={s.gameCardDetails}>
                    <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                    <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 4 }}>{formatGameTime(game.event_time)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {todaysGames.length === 0 && tomorrowGames.length === 0 && (
        <>
          <Text style={s.sectionLabel}>TODAY'S GAMES</Text>
          <View style={s.noGamesCard}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>&#9728;&#65039;</Text>
            <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: '500' }}>No games today — enjoy the day off!</Text>
          </View>
        </>
      )}

      {/* QUICK ACTIONS */}
      <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
      <View style={s.actionsGrid}>
        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/registration-hub' as any)}>
          <View style={[s.actionIconCircle, { backgroundColor: colors.info + '26' }]}>
            <Ionicons name="person-add" size={28} color={colors.info} />
          </View>
          <Text style={s.actionLabel}>Registrations</Text>
          <Text style={s.actionSubtitle}>{newRegistrationCount > 0 ? newRegistrationCount + ' pending' : 'All caught up'}</Text>
          {newRegistrationCount > 0 && (
            <View style={s.actionBadge}>
              <Text style={s.actionBadgeText}>{newRegistrationCount > 99 ? '99+' : newRegistrationCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/blast-composer' as any)}>
          <View style={[s.actionIconCircle, { backgroundColor: colors.warning + '26' }]}>
            <Ionicons name="megaphone" size={28} color={colors.warning} />
          </View>
          <Text style={s.actionLabel}>Send Blast</Text>
          <Text style={s.actionSubtitle}>Org-wide announcement</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/(tabs)/reports-tab' as any)}>
          <View style={[s.actionIconCircle, { backgroundColor: colors.success + '26' }]}>
            <Ionicons name="bar-chart" size={28} color={colors.success} />
          </View>
          <Text style={s.actionLabel}>Reports</Text>
          <Text style={s.actionSubtitle}>Analytics & exports</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/users' as any)}>
          <View style={[s.actionIconCircle, { backgroundColor: colors.primary + '26' }]}>
            <Ionicons name="people-circle" size={28} color={colors.primary} />
          </View>
          <Text style={s.actionLabel}>Users</Text>
          <Text style={s.actionSubtitle}>{approvalCount > 0 ? approvalCount + ' awaiting approval' : 'All approved'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/team-management' as any)}>
          <View style={[s.actionIconCircle, { backgroundColor: '#FF6B6B26' }]}>
            <Ionicons name="shirt" size={28} color="#FF6B6B" />
          </View>
          <Text style={s.actionLabel}>Teams</Text>
          <Text style={s.actionSubtitle}>{stats.teams} team{stats.teams !== 1 ? 's' : ''}{unrosteredCount > 0 ? ` · ${unrosteredCount} unrostered` : ''}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/(tabs)/payments' as any)}>
          <View style={[s.actionIconCircle, { backgroundColor: colors.danger + '26' }]}>
            <Ionicons name="card" size={28} color={colors.danger} />
          </View>
          <Text style={s.actionLabel}>Payments</Text>
          <Text style={s.actionSubtitle}>{stats.outstanding > 0 ? '$' + stats.outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' outstanding' : 'Fully collected'}</Text>
        </TouchableOpacity>
      </View>

      {/* RECENT ACTIVITY */}
      {recentActivity.length > 0 && (
        <>
          <Text style={s.sectionLabel}>RECENT ACTIVITY</Text>
          <View style={s.activityCard}>
            {recentActivity.map((activity, i) => (
              <View key={activity.id} style={[s.activityRow, i < recentActivity.length - 1 && s.activityRowBorder]}>
                <View style={[s.activityDot, { backgroundColor: activity.color }]} />
                <View style={s.activityContent}>
                  <Text style={s.activityText}>{activity.text}</Text>
                  <Text style={s.activityTime}>{formatTimeAgo(activity.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ORGANIZATION STATS */}
      <Text style={s.sectionLabel}>ORGANIZATION</Text>
      <View style={s.orgStatsGrid}>
        <View style={s.orgStatCard}>
          <Ionicons name="shirt" size={20} color={colors.info} />
          <Text style={s.orgStatNum}>{stats.teams}</Text>
          <Text style={s.orgStatLabel}>Teams</Text>
        </View>
        <View style={s.orgStatCard}>
          <Ionicons name="people" size={20} color={colors.success} />
          <Text style={s.orgStatNum}>{stats.players}</Text>
          <Text style={s.orgStatLabel}>Players</Text>
        </View>
        <View style={s.orgStatCard}>
          <Ionicons name="clipboard" size={20} color={colors.primary} />
          <Text style={s.orgStatNum}>{stats.coaches}</Text>
          <Text style={s.orgStatLabel}>Coaches</Text>
        </View>
        <View style={s.orgStatCard}>
          <Ionicons name="trophy" size={20} color={colors.warning} />
          <Text style={s.orgStatNum}>{gamesPlayedCount}</Text>
          <Text style={s.orgStatLabel}>Games Played</Text>
        </View>
        <View style={s.orgStatCard}>
          <Ionicons name="trending-up" size={20} color={colors.danger} />
          <Text style={s.orgStatNum}>{stats.players > 0 ? Math.round((stats.teams / Math.max(stats.players, 1)) * 100) : 0}%</Text>
          <Text style={s.orgStatLabel}>Roster Fill</Text>
        </View>
        <View style={s.orgStatCard}>
          <Ionicons name="cash" size={20} color={colors.info} />
          <Text style={s.orgStatNum}>{revenuePercent}%</Text>
          <Text style={s.orgStatLabel}>Collected</Text>
        </View>
      </View>

      {/* ============================================ */}
      {/* MODALS (preserved from original) */}
      {/* ============================================ */}

      {/* Invite Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.inviteModal}>
            <View style={s.inviteModalHeader}>
              <Text style={s.inviteModalTitle}>
                {showInviteForm === 'parent' ? 'Invite Parent' :
                 showInviteForm === 'coach' ? 'Invite Coach' :
                 showInviteForm === 'admin' ? 'Invite Admin' :
                 showInviteForm === 'team_code' ? 'Create Team Code' :
                 'Invite to ' + (organization?.name || 'Organization')}
              </Text>
              <TouchableOpacity onPress={() => { setShowInviteModal(false); setShowInviteForm(null); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {!showInviteForm ? (
              <ScrollView style={s.inviteOptions}>
                <TouchableOpacity style={s.inviteOption} onPress={shareRegistrationLink}>
                  <View style={[s.inviteOptionIcon, { backgroundColor: sportColors.primary + '20' }]}>
                    <Ionicons name="link" size={28} color={sportColors.primary} />
                  </View>
                  <View style={s.inviteOptionContent}>
                    <Text style={s.inviteOptionTitle}>Share Registration Link</Text>
                    <Text style={s.inviteOptionSubtitle}>Share public signup link for parents</Text>
                  </View>
                  <Ionicons name="share-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.inviteOption}
                  onPress={() => { setShowInviteModal(false); router.push('/players'); }}
                >
                  <View style={[s.inviteOptionIcon, { backgroundColor: '#AF52DE20' }]}>
                    <Ionicons name="create" size={28} color="#AF52DE" />
                  </View>
                  <View style={s.inviteOptionContent}>
                    <Text style={s.inviteOptionTitle}>Manual Registration</Text>
                    <Text style={s.inviteOptionSubtitle}>Add a player/family manually</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                <View style={s.inviteDivider}>
                  <View style={s.inviteDividerLine} />
                  <Text style={s.inviteDividerText}>OR SEND INVITE</Text>
                  <View style={s.inviteDividerLine} />
                </View>

                <TouchableOpacity style={s.inviteOption} onPress={() => setShowInviteForm('parent')}>
                  <View style={[s.inviteOptionIcon, { backgroundColor: colors.success + '20' }]}>
                    <Ionicons name="people" size={28} color={colors.success} />
                  </View>
                  <View style={s.inviteOptionContent}>
                    <Text style={s.inviteOptionTitle}>Invite Parent</Text>
                    <Text style={s.inviteOptionSubtitle}>Send email invite to register their child</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity style={s.inviteOption} onPress={() => setShowInviteForm('coach')}>
                  <View style={[s.inviteOptionIcon, { backgroundColor: colors.info + '20' }]}>
                    <Ionicons name="clipboard" size={28} color={colors.info} />
                  </View>
                  <View style={s.inviteOptionContent}>
                    <Text style={s.inviteOptionTitle}>Invite Coach</Text>
                    <Text style={s.inviteOptionSubtitle}>Send email invite for coach account</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity style={s.inviteOption} onPress={() => setShowInviteForm('team_code')}>
                  <View style={[s.inviteOptionIcon, { backgroundColor: colors.warning + '20' }]}>
                    <Ionicons name="qr-code" size={28} color={colors.warning} />
                  </View>
                  <View style={s.inviteOptionContent}>
                    <Text style={s.inviteOptionTitle}>Team Invite Code</Text>
                    <Text style={s.inviteOptionSubtitle}>Generate shareable code for a team</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                {isAdmin && (
                  <TouchableOpacity style={s.inviteOption} onPress={() => setShowInviteForm('admin')}>
                    <View style={[s.inviteOptionIcon, { backgroundColor: colors.danger + '20' }]}>
                      <Ionicons name="shield" size={28} color={colors.danger} />
                    </View>
                    <View style={s.inviteOptionContent}>
                      <Text style={s.inviteOptionTitle}>Invite Admin</Text>
                      <Text style={s.inviteOptionSubtitle}>Add another league administrator</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={s.viewPendingBtn}
                  onPress={() => { setShowInviteModal(false); setShowPendingInvites(true); }}
                >
                  <Ionicons name="time" size={20} color={colors.info} />
                  <Text style={s.viewPendingBtnText}>View Pending Invites ({pendingInvites.length})</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : showInviteForm === 'team_code' ? (
              <View style={s.inviteForm}>
                <TouchableOpacity style={s.backBtn} onPress={() => setShowInviteForm(null)}>
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                  <Text style={s.backBtnText}>Back</Text>
                </TouchableOpacity>

                <Text style={s.formLabel}>Select Team *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.teamSelector}>
                  {teams.map(team => (
                    <TouchableOpacity
                      key={team.id}
                      style={[s.teamOption, selectedTeamId === team.id && s.teamOptionSelected]}
                      onPress={() => setSelectedTeamId(team.id)}
                    >
                      <Text style={[s.teamOptionText, selectedTeamId === team.id && s.teamOptionTextSelected]}>
                        {team.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {teams.length === 0 && (
                  <Text style={s.noTeamsText}>No teams yet. Create teams first.</Text>
                )}

                <Text style={s.formLabel}>Description (Optional)</Text>
                <TextInput
                  style={s.formInput}
                  placeholder="e.g., Spring 2026 registration"
                  placeholderTextColor={colors.textMuted}
                  value={teamCodeDescription}
                  onChangeText={setTeamCodeDescription}
                />

                <TouchableOpacity
                  style={[s.sendInviteBtn, (!selectedTeamId || inviteLoading) && s.sendInviteBtnDisabled]}
                  onPress={createTeamCode}
                  disabled={!selectedTeamId || inviteLoading}
                >
                  {inviteLoading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Ionicons name="qr-code" size={20} color="#000" />
                      <Text style={s.sendInviteBtnText}>Generate Code</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.inviteForm}>
                <TouchableOpacity style={s.backBtn} onPress={() => setShowInviteForm(null)}>
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                  <Text style={s.backBtnText}>Back</Text>
                </TouchableOpacity>

                <Text style={s.formLabel}>Email Address *</Text>
                <TextInput
                  style={s.formInput}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textMuted}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={s.formLabel}>Personal Message (Optional)</Text>
                <TextInput
                  style={[s.formInput, s.formTextArea]}
                  placeholder="Add a personal message..."
                  placeholderTextColor={colors.textMuted}
                  value={inviteMessage}
                  onChangeText={setInviteMessage}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[s.sendInviteBtn, inviteLoading && s.sendInviteBtnDisabled]}
                  onPress={() => sendInvite(showInviteForm as 'parent' | 'coach' | 'admin')}
                  disabled={inviteLoading}
                >
                  {inviteLoading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="#000" />
                      <Text style={s.sendInviteBtnText}>Send Invite</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Pending Invites Modal */}
      <Modal visible={showPendingInvites} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.pendingModal}>
            <View style={s.inviteModalHeader}>
              <Text style={s.inviteModalTitle}>Pending Invites</Text>
              <TouchableOpacity onPress={() => setShowPendingInvites(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.pendingList}>
              {pendingInvites.length === 0 ? (
                <View style={s.emptyPending}>
                  <Ionicons name="mail-open-outline" size={48} color={colors.textMuted} />
                  <Text style={s.emptyPendingText}>No pending invites</Text>
                  <Text style={s.emptyPendingSubtext}>All invites have been accepted or expired</Text>
                </View>
              ) : (
                pendingInvites.map(invite => (
                  <View key={invite.id} style={s.pendingItem}>
                    <View style={s.pendingItemHeader}>
                      <View style={[s.inviteTypeBadge, { backgroundColor: getInviteTypeColor(invite.invite_type) + '20' }]}>
                        <Text style={[s.inviteTypeBadgeText, { color: getInviteTypeColor(invite.invite_type) }]}>
                          {getInviteTypeLabel(invite.invite_type)}
                        </Text>
                      </View>
                      <Text style={s.pendingItemDate}>
                        {new Date(invite.invited_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={s.pendingItemEmail}>{invite.email}</Text>
                    <Text style={s.pendingItemCode}>Code: {invite.invite_code}</Text>
                    <View style={s.pendingItemActions}>
                      <TouchableOpacity style={s.pendingActionBtn} onPress={() => copyInviteCode(invite.invite_code)}>
                        <Ionicons name="copy-outline" size={16} color={colors.info} />
                        <Text style={[s.pendingActionText, { color: colors.info }]}>Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.pendingActionBtn} onPress={() => resendInvite(invite)}>
                        <Ionicons name="refresh" size={16} color={colors.success} />
                        <Text style={[s.pendingActionText, { color: colors.success }]}>Resend</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.pendingActionBtn} onPress={() => revokeInvite(invite)}>
                        <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                        <Text style={[s.pendingActionText, { color: colors.danger }]}>Revoke</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Season Picker Modal */}
      <Modal visible={showSeasonPicker} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.pickerModal}>
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>{activeSport?.name || 'All'} Seasons</Text>
              <TouchableOpacity onPress={() => setShowSeasonPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.pickerScroll}>
              {allSeasons.length === 0 ? (
                <View style={s.emptySeasons}>
                  <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                  <Text style={s.emptySeasonsText}>No seasons yet</Text>
                  <Text style={s.emptySeasonsSubtext}>Create your first season to get started</Text>
                </View>
              ) : (
                <>
                  {allSeasons.filter(ss => ss.status === 'active').length > 0 && (
                    <>
                      <Text style={s.pickerSectionLabel}>IN PROGRESS</Text>
                      {allSeasons.filter(ss => ss.status === 'active').map(season => (
                        <View key={season.id} style={[s.seasonCard, workingSeason?.id === season.id && s.seasonCardSelected]}>
                          <TouchableOpacity style={s.seasonCardMain} onPress={() => selectSeason(season)}>
                            <View style={s.seasonCardInfo}>
                              <View style={s.seasonCardHeader}>
                                <Text style={s.seasonCardName}>{season.name}</Text>
                                {workingSeason?.id === season.id && <Ionicons name="checkmark-circle" size={20} color={sportColors.primary} />}
                              </View>
                              <View style={[s.statusPillSmall, { backgroundColor: getStatusColor(season.status) + '30' }]}>
                                <Text style={[s.statusPillSmallText, { color: getStatusColor(season.status) }]}>{getStatusLabel(season.status)}</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                          <View style={s.seasonCardActions}>
                            <View style={s.regToggleRow}>
                              <Text style={s.regToggleLabel}>Registration</Text>
                              <Switch value={season.registration_open} onValueChange={() => toggleRegistration(season)} trackColor={{ false: colors.border, true: colors.success }} thumbColor="#fff" />
                            </View>
                            <TouchableOpacity style={s.statusChangeBtn} onPress={() => Alert.alert('Change Status', 'Mark ' + season.name + ' as:', [{ text: 'Cancel', style: 'cancel' }, { text: 'Completed', onPress: () => updateSeasonStatus(season, 'completed') }])}>
                              <Text style={s.statusChangeBtnText}>Mark Complete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </>
                  )}

                  {allSeasons.filter(ss => ss.status === 'upcoming').length > 0 && (
                    <>
                      <Text style={s.pickerSectionLabel}>UPCOMING</Text>
                      {allSeasons.filter(ss => ss.status === 'upcoming').map(season => (
                        <View key={season.id} style={[s.seasonCard, workingSeason?.id === season.id && s.seasonCardSelected]}>
                          <TouchableOpacity style={s.seasonCardMain} onPress={() => selectSeason(season)}>
                            <View style={s.seasonCardInfo}>
                              <View style={s.seasonCardHeader}>
                                <Text style={s.seasonCardName}>{season.name}</Text>
                                {workingSeason?.id === season.id && <Ionicons name="checkmark-circle" size={20} color={sportColors.primary} />}
                              </View>
                              <View style={[s.statusPillSmall, { backgroundColor: getStatusColor(season.status) + '30' }]}>
                                <Text style={[s.statusPillSmallText, { color: getStatusColor(season.status) }]}>{getStatusLabel(season.status)}</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                          <View style={s.seasonCardActions}>
                            <View style={s.regToggleRow}>
                              <Text style={s.regToggleLabel}>Registration</Text>
                              <Switch value={season.registration_open} onValueChange={() => toggleRegistration(season)} trackColor={{ false: colors.border, true: colors.success }} thumbColor="#fff" />
                            </View>
                            <TouchableOpacity style={s.statusChangeBtn} onPress={() => Alert.alert('Change Status', 'Mark ' + season.name + ' as:', [{ text: 'Cancel', style: 'cancel' }, { text: 'In Progress', onPress: () => updateSeasonStatus(season, 'active') }])}>
                              <Text style={s.statusChangeBtnText}>Start Season</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </>
                  )}

                  {allSeasons.filter(ss => ss.status === 'completed').length > 0 && (
                    <>
                      <Text style={s.pickerSectionLabel}>COMPLETED</Text>
                      {allSeasons.filter(ss => ss.status === 'completed').map(season => (
                        <View key={season.id} style={[s.seasonCard, s.seasonCardCompleted, workingSeason?.id === season.id && s.seasonCardSelected]}>
                          <TouchableOpacity style={s.seasonCardMain} onPress={() => selectSeason(season)}>
                            <View style={s.seasonCardInfo}>
                              <View style={s.seasonCardHeader}>
                                <Text style={[s.seasonCardName, { color: colors.textMuted }]}>{season.name}</Text>
                                {workingSeason?.id === season.id && <Ionicons name="checkmark-circle" size={20} color={sportColors.primary} />}
                              </View>
                              <View style={[s.statusPillSmall, { backgroundColor: colors.border }]}>
                                <Text style={[s.statusPillSmallText, { color: colors.textMuted }]}>{getStatusLabel(season.status)}</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                          <View style={s.seasonCardActions}>
                            <View style={s.regToggleRow}>
                              <Text style={[s.regToggleLabel, { color: colors.textMuted }]}>Registration</Text>
                              <Switch value={season.registration_open} onValueChange={() => toggleRegistration(season)} trackColor={{ false: colors.border, true: colors.success }} thumbColor="#fff" />
                            </View>
                            <TouchableOpacity style={s.statusChangeBtn} onPress={() => Alert.alert('Reopen Season', 'Reopen ' + season.name + '?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reopen as In Progress', onPress: () => updateSeasonStatus(season, 'active') }, { text: 'Reopen as Upcoming', onPress: () => updateSeasonStatus(season, 'upcoming') }])}>
                              <Text style={s.statusChangeBtnText}>Reopen</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity style={s.createSeasonBtn} onPress={() => { setShowSeasonPicker(false); setShowCreateModal(true); }}>
              <Ionicons name="add-circle" size={24} color={colors.background} />
              <Text style={s.createSeasonBtnText}>Create New Season</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Season Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Create {activeSport?.name} Season</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLabel}>Season Name</Text>
            <TextInput style={s.input} placeholder="e.g., Spring 2026" placeholderTextColor={colors.textMuted} value={newSeasonName} onChangeText={setNewSeasonName} />

            <Text style={s.inputLabel}>Initial Status</Text>
            <View style={s.statusRow}>
              <TouchableOpacity style={[s.statusBtn, newSeasonStatus === 'upcoming' && s.statusBtnSelected]} onPress={() => setNewSeasonStatus('upcoming')}>
                <Ionicons name="time" size={20} color={newSeasonStatus === 'upcoming' ? colors.background : colors.info} />
                <Text style={[s.statusBtnText2, newSeasonStatus === 'upcoming' && s.statusBtnTextSelected]}>Upcoming</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.statusBtn, newSeasonStatus === 'active' && s.statusBtnSelected]} onPress={() => setNewSeasonStatus('active')}>
                <Ionicons name="play-circle" size={20} color={newSeasonStatus === 'active' ? colors.background : colors.success} />
                <Text style={[s.statusBtnText2, newSeasonStatus === 'active' && s.statusBtnTextSelected]}>In Progress</Text>
              </TouchableOpacity>
            </View>

            <View style={s.infoBox}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
              <Text style={s.infoBoxText}>Registration will be open by default. You can toggle it anytime.</Text>
            </View>

            <View style={s.feeBox}>
              <Text style={s.feeTitle}>Default Fees:</Text>
              <Text style={s.feeItem}>Registration: $150</Text>
              <Text style={s.feeItem}>Uniform: $35</Text>
              <Text style={s.feeItem}>Monthly: $50 x 3</Text>
              <Text style={s.feeTotal}>Total: $335/player</Text>
            </View>

            <TouchableOpacity style={[s.createBtn, creating && s.disabled]} onPress={createSeason} disabled={creating}>
              <Text style={s.createTxt}>{creating ? 'Creating...' : 'Create Season'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom padding for tab bar */}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (colors: any, sportColors: any) => StyleSheet.create({
  scroll: {
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
    marginBottom: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  userName: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },

  // Hero Card
  heroCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
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
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroOrgName: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
    flex: 1,
  },
  heroSportBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: sportColors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: sportColors.primary,
  },
  heroSportIcon: {
    fontSize: 22,
  },
  heroSeasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroSeasonName: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '500',
  },
  heroStatusPill: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  heroStatusPillText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.glassBorder,
  },
  heroStatNum: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  heroStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Registration alert
  regAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.info + '20',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  regAlertText: {
    fontSize: 13,
    color: colors.info,
  },

  // Section Label
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    marginBottom: 12,
    marginTop: 8,
  },

  // Needs Attention
  attentionContainer: {
    gap: 8,
    marginBottom: 28,
  },
  attentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  attentionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attentionContent: {
    flex: 1,
  },
  attentionText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 20,
  },

  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.success + '15',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  successText: {
    fontSize: 15,
    color: colors.success,
    fontWeight: '600',
    flex: 1,
  },

  // Revenue Pulse
  revenueCard: {
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
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  revenuePercent: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
  },
  revenueLabel: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '500',
  },
  revenueBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.glassBorder,
    overflow: 'hidden',
    marginBottom: 10,
  },
  revenueBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  revenueDetail: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
  },
  revenueSubStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueSubStat: {
    flex: 1,
    alignItems: 'center',
  },
  revenueSubDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.glassBorder,
  },
  revenueSubNum: {
    fontSize: 22,
    fontWeight: '800',
  },
  revenueSubLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
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
    position: 'relative',
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
  actionSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  actionBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  actionBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Today's Games
  todaysGamesContainer: {
    gap: 10,
    marginBottom: 28,
  },
  gameCard: {
    flexDirection: 'row',
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  gameCardAccent: {
    width: 4,
  },
  gameCardBody: {
    flex: 1,
    padding: 14,
  },
  gameCardTeam: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  gameStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gameCardOpponent: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  gameCardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noGamesCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },

  // Recent Activity
  activityCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Organization Stats Grid
  orgStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  orgStatCard: {
    width: '31%',
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  orgStatNum: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 6,
  },
  orgStatLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  // Modals (preserved styling from original)
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },

  inviteModal: {
    backgroundColor: colors.glassCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  inviteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inviteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  inviteOptions: { padding: 16 },
  inviteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  inviteOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  inviteOptionContent: { flex: 1 },
  inviteOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  inviteOptionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  inviteDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  inviteDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  inviteDividerText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    letterSpacing: 1,
    marginHorizontal: 12,
  },
  viewPendingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  viewPendingBtnText: {
    fontSize: 15,
    color: colors.info,
    fontWeight: '500',
  },

  inviteForm: { padding: 20 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  backBtnText: {
    fontSize: 15,
    color: colors.text,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendInviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: sportColors.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  sendInviteBtnDisabled: { opacity: 0.6 },
  sendInviteBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  teamSelector: {
    flexGrow: 0,
    marginBottom: 16,
  },
  teamOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamOptionSelected: {
    backgroundColor: sportColors.primary + '20',
    borderColor: sportColors.primary,
  },
  teamOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  teamOptionTextSelected: {
    color: sportColors.primary,
    fontWeight: '600',
  },
  noTeamsText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 16,
  },

  pendingModal: {
    backgroundColor: colors.glassCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  pendingList: { padding: 16 },
  emptyPending: {
    alignItems: 'center',
    padding: 40,
  },
  emptyPendingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  emptyPendingSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  pendingItem: {
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  pendingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inviteTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inviteTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pendingItemDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  pendingItemEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  pendingItemCode: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  pendingItemActions: {
    flexDirection: 'row',
    gap: 16,
  },
  pendingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pendingActionText: {
    fontSize: 13,
    fontWeight: '500',
  },

  pickerModal: {
    backgroundColor: colors.glassCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  pickerScroll: { padding: 16 },
  pickerSectionLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },

  seasonCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  seasonCardSelected: {
    borderWidth: 1,
    borderColor: sportColors.primary,
  },
  seasonCardCompleted: { opacity: 0.7 },
  seasonCardMain: { padding: 16 },
  seasonCardInfo: {},
  seasonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seasonCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusPillSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillSmallText: {
    fontSize: 11,
    fontWeight: '600',
  },
  seasonCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.glassCard,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  regToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  regToggleLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statusChangeBtn: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusChangeBtnText: {
    fontSize: 12,
    color: colors.info,
    fontWeight: '500',
  },

  emptySeasons: {
    alignItems: 'center',
    padding: 40,
  },
  emptySeasonsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  emptySeasonsSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },

  createSeasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: sportColors.primary,
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  createSeasonBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.background,
  },

  modal: {
    backgroundColor: colors.glassCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },

  statusRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBtnSelected: {
    backgroundColor: sportColors.primary,
    borderColor: sportColors.primary,
  },
  statusBtnText2: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusBtnTextSelected: {
    color: colors.background,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.info + '15',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: colors.info,
  },

  feeBox: {
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  feeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  feeItem: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  feeTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: sportColors.primary,
    marginTop: 8,
  },
  createBtn: {
    backgroundColor: sportColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  disabled: { opacity: 0.7 },
  createTxt: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.background,
  },
});
