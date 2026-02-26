import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { useSport } from '@/lib/sport';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
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
import {
  checkRoleAchievements,
  fetchUserXP,
  getRoleAchievements,
  type RoleAchievementWithStatus,
} from '@/lib/achievement-engine';
import AppHeaderBar from './ui/AppHeaderBar';
import SectionHeader from './ui/SectionHeader';

const SNAPSHOT_CARD_WIDTH = 200;

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

type TeamSnapshot = {
  id: string;
  name: string;
  color: string | null;
  playerCount: number;
  wins: number;
  losses: number;
  nextEventDate: string | null;
};

type RecentActivity = {
  id: string;
  text: string;
  timestamp: string;
  color: string;
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
  const [teamSnapshots, setTeamSnapshots] = useState<TeamSnapshot[]>([]);
  const [blastCount, setBlastCount] = useState(0);
  const [adminBadges, setAdminBadges] = useState<RoleAchievementWithStatus[]>([]);

  // Org banner photo
  const [bannerUrl, setBannerUrl] = useState<string | null>((organization as any)?.settings?.banner_url || null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Needs Attention — single animated button + bottom sheet
  const [showAttentionSheet, setShowAttentionSheet] = useState(false);
  const actionPulse = useRef(new Animated.Value(1)).current;

  // Pulse animation for attention badge
  useEffect(() => {
    if (alerts.length > 0 && alerts[0].type !== 'success') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(actionPulse, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
          Animated.timing(actionPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      actionPulse.setValue(1);
    }
  }, [alerts]);

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

    const { count: newRegCount } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', seasonId)
      .eq('status', 'new');

    setNewRegistrationCount(newRegCount || 0);

    if (newRegCount && newRegCount > 0) {
      alertList.push({
        text: newRegCount + ' new registration' + (newRegCount > 1 ? 's' : '') + ' awaiting review',
        route: '/registration-hub',
        type: 'warning',
        count: newRegCount,
        borderColor: colors.warning,
      });
    }

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

    alertList.sort((a, b) => {
      const pri: Record<string, number> = { error: 0, warning: 1, success: 2 };
      return (pri[a.type] ?? 1) - (pri[b.type] ?? 1) || ((b.count || 0) - (a.count || 0));
    });

    if (alertList.length === 0) alertList.push({ text: 'All clear! Everything is running smoothly.', route: null, type: 'success' });
    setAlerts(alertList);

    const { count: gamesCount } = await supabase
      .from('schedule_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'game')
      .eq('season_id', workingSeason.id)
      .not('game_result', 'is', null);
    setGamesPlayedCount(gamesCount || 0);

    const { count: sentBlasts } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', workingSeason.id);
    setBlastCount(sentBlasts || 0);

    await fetchRecentActivity(orgId);
    setLoading(false);
  };

  const fetchRecentActivity = async (orgId: string | null | undefined) => {
    if (!orgId || !workingSeason) return;

    const activities: RecentActivity[] = [];

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

  const fetchTeamSnapshots = async () => {
    if (!workingSeason) { setTeamSnapshots([]); return; }

    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name, color')
      .eq('season_id', workingSeason.id)
      .order('name');

    if (!teamsData || teamsData.length === 0) { setTeamSnapshots([]); return; }

    const teamIds = teamsData.map(t => t.id);

    // Batch: player counts
    const { data: teamPlayers } = await supabase
      .from('team_players')
      .select('team_id')
      .in('team_id', teamIds);

    const playerCountMap = new Map<string, number>();
    (teamPlayers || []).forEach(tp => {
      playerCountMap.set(tp.team_id, (playerCountMap.get(tp.team_id) || 0) + 1);
    });

    // Batch: W-L records
    const { data: gameResults } = await supabase
      .from('schedule_events')
      .select('team_id, game_result')
      .in('team_id', teamIds)
      .eq('event_type', 'game')
      .not('game_result', 'is', null);

    const winsMap = new Map<string, number>();
    const lossesMap = new Map<string, number>();
    (gameResults || []).forEach((g: any) => {
      if (g.game_result === 'win') winsMap.set(g.team_id, (winsMap.get(g.team_id) || 0) + 1);
      else if (g.game_result === 'loss') lossesMap.set(g.team_id, (lossesMap.get(g.team_id) || 0) + 1);
    });

    // Batch: next events
    const today = new Date().toISOString().split('T')[0];
    const { data: nextEvents } = await supabase
      .from('schedule_events')
      .select('team_id, event_date')
      .in('team_id', teamIds)
      .gte('event_date', today)
      .order('event_date', { ascending: true });

    const nextEventMap = new Map<string, string>();
    (nextEvents || []).forEach((e: any) => {
      if (!nextEventMap.has(e.team_id)) nextEventMap.set(e.team_id, e.event_date);
    });

    const snapshots = teamsData.map(team => ({
      id: team.id,
      name: team.name,
      color: team.color || null,
      playerCount: playerCountMap.get(team.id) || 0,
      wins: winsMap.get(team.id) || 0,
      losses: lossesMap.get(team.id) || 0,
      nextEventDate: nextEventMap.get(team.id) || null,
    }));

    setTeamSnapshots(snapshots);
  };

  useEffect(() => {
    if (workingSeason) {
      fetchStats();
      fetchTeams();
      fetchTeamSnapshots();
    }
    fetchPendingInvites();
  }, [workingSeason]);

  // ============================================
  // INVITE FUNCTIONS
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
              const msg = 'You have been invited to join ' + (organization?.name || 'our organization') + ' on VolleyBrain!\n\nYour invite code: ' + inviteCode + '\n\nOpen directly: volleybrain://redeem-code?code=' + inviteCode + '\n\nOr download the app and enter the code manually.' + (inviteMessage ? '\n\nMessage: ' + inviteMessage : '');
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
                message: 'Join ' + selectedTeam?.name + ' on ' + (organization?.name || 'VolleyBrain') + '!\n\nUse code: ' + inviteCode + '\n\nOpen directly: volleybrain://redeem-code?code=' + inviteCode + '\n\nOr enter the code when signing up on VolleyBrain.',
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
      message: 'Reminder: You have been invited to join ' + (organization?.name || 'our organization') + '!\n\nYour invite code: ' + invite.invite_code + '\n\nOpen directly: volleybrain://redeem-code?code=' + invite.invite_code + '\n\nOr download VolleyBrain and enter the code to sign up.',
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
  // SEASON FUNCTIONS
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
  // HANDLERS & HELPERS
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

  const getAlertIcon = (text: string): string => {
    if (text.includes('waiver')) return 'shield-checkmark';
    if (text.includes('stats')) return 'stats-chart';
    if (text.includes('registration') || text.includes('Registration')) return 'document-text';
    if (text.includes('payment') || text.includes('outstanding')) return 'card';
    if (text.includes('approval')) return 'person-circle';
    if (text.includes('invite')) return 'person-circle';
    if (text.includes('team assignment') || text.includes('No teams')) return 'people';
    if (text.includes('ready for team')) return 'person-add';
    if (text.includes('player') && !text.includes('waiver')) return 'people';
    if (text.includes('coach')) return 'clipboard';
    if (text.includes('No season')) return 'calendar';
    if (text.includes('All clear')) return 'checkmark-circle';
    return 'alert-circle';
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

  const formatShortDate = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const fetchAdminAchievements = async () => {
    if (!profile?.id) return;
    try {
      const badges = await getRoleAchievements(profile.id, 'admin');
      setAdminBadges(badges);
      // Background unlock check
      checkRoleAchievements(profile.id, 'admin', workingSeason?.id).then(({ newUnlocks }) => {
        if (newUnlocks.length > 0) {
          getRoleAchievements(profile.id, 'admin').then(setAdminBadges);
        }
      });
    } catch {}
  };

  useEffect(() => {
    if (profile?.id) fetchAdminAchievements();
  }, [profile?.id, workingSeason?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshSeasons();
    await Promise.all([fetchStats(), fetchPendingInvites(), fetchTeamSnapshots(), fetchAdminAchievements()]);
    setRefreshing(false);
  };

  const revenuePercent = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const s = createStyles(colors, sportColors);

  const userInitials = (profile?.full_name || 'A')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading && !workingSeason) {
    return (
      <View style={s.scroll}>
        <AppHeaderBar initials={userInitials} />
        <View style={{ padding: spacing.screenPadding, gap: 12 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={{
              backgroundColor: colors.glassCard,
              borderRadius: radii.card,
              height: 72,
              borderWidth: 1,
              borderColor: colors.glassBorder,
            }} />
          ))}
        </View>
      </View>
    );
  }

  // ============================================
  // BANNER PHOTO UPLOAD
  // ============================================
  const handlePickBanner = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant photo library access to upload a banner.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingBanner(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const validExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
      const contentType = `image/${validExt === 'jpg' ? 'jpeg' : validExt}`;
      const orgId = organization?.id || 'unknown';
      const filePath = `org-banners/${orgId}_${Date.now()}.${validExt}`;
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('Could not read the selected image.');
      const arrayBuffer = await response.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, arrayBuffer, { contentType, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      // Merge banner_url into existing settings JSONB
      const existingSettings = (organization as any)?.settings || {};
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ settings: { ...existingSettings, banner_url: publicUrl } })
        .eq('id', orgId);
      if (updateError) throw updateError;
      setBannerUrl(publicUrl);
      Alert.alert('Success', 'Banner photo updated!');
    } catch (error: any) {
      if (__DEV__) console.error('Banner upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload banner.');
    } finally {
      setUploadingBanner(false);
    }
  };

  // ============================================
  // RENDER — Command Center
  // ============================================

  return (
    <ScrollView
      style={s.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <AppHeaderBar initials={userInitials} />

      {/* ====== 1. ORG HEALTH BANNER ====== */}
      <View style={s.sectionBlock}>
        <View style={[s.orgBanner, { marginHorizontal: spacing.screenPadding, overflow: 'hidden' }]}>
          {/* Custom photo background or dark gradient */}
          {bannerUrl ? (
            <>
              <Image source={{ uri: bannerUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(15,32,39,0.3)', 'rgba(32,58,67,0.7)', 'rgba(15,32,39,0.9)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : (
            <LinearGradient
              colors={['#0F2027', '#203A43', '#2C5364']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          {/* Camera edit button */}
          <TouchableOpacity
            style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}
            onPress={handlePickBanner}
            disabled={uploadingBanner}
          >
            {uploadingBanner ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="camera" size={16} color="#FFF" />
            )}
          </TouchableOpacity>

          <View style={s.orgBannerHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[s.orgBannerName, { color: '#FFF' }]}>{organization?.name || 'Organization'}</Text>
            </View>
            <View style={[s.orgSportBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={{ fontSize: 22 }}>{activeSport?.icon || '\uD83C\uDFD0'}</Text>
            </View>
          </View>

          <View style={s.orgBannerStatsRow}>
            <View style={s.orgBannerStat}>
              <Text style={[s.orgBannerStatNum, { color: '#FFF' }]}>{stats.players}</Text>
              <Text style={[s.orgBannerStatLabel, { color: 'rgba(255,255,255,0.7)' }]}>Players</Text>
            </View>
            <View style={[s.orgBannerDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
            <View style={s.orgBannerStat}>
              <Text style={[s.orgBannerStatNum, { color: '#FFF' }]}>{stats.teams}</Text>
              <Text style={[s.orgBannerStatLabel, { color: 'rgba(255,255,255,0.7)' }]}>Teams</Text>
            </View>
            <View style={[s.orgBannerDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
            <View style={s.orgBannerStat}>
              <Text style={[s.orgBannerStatNum, { color: '#FFF' }]}>{stats.coaches}</Text>
              <Text style={[s.orgBannerStatLabel, { color: 'rgba(255,255,255,0.7)' }]}>Coaches</Text>
            </View>
          </View>

          <View style={s.regStatusRow}>
            <View style={[s.regStatusDot, { backgroundColor: workingSeason?.registration_open ? '#4ADE80' : 'rgba(255,255,255,0.5)' }]} />
            <Text style={[s.regStatusText, { color: workingSeason?.registration_open ? '#4ADE80' : 'rgba(255,255,255,0.5)' }]}>
              Registration {workingSeason?.registration_open ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>
      </View>

      {/* ====== SEASON SELECTOR BAR ====== */}
      <View style={{ paddingHorizontal: spacing.screenPadding, marginBottom: 4 }}>
        <TouchableOpacity
          style={s.seasonBar}
          onPress={() => setShowSeasonPicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar" size={16} color={sportColors.primary} />
          <Text style={s.seasonBarText} numberOfLines={1}>
            {workingSeason?.name || 'No Season'}
            {workingSeason && ' \u00B7 ' + getStatusLabel(workingSeason.status)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ====== 2. NEEDS ATTENTION (single button → bottom sheet) ====== */}
      {alerts.length > 0 && (
        <View style={{ paddingHorizontal: spacing.screenPadding, marginBottom: 8 }}>
          {alerts[0].type === 'success' ? (
            <View style={s.attentionBtn}>
              <View style={[s.attentionBadge, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark" size={14} color="#FFF" />
              </View>
              <Text style={[s.attentionText, { color: colors.success }]}>All clear!</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={s.attentionBtn}
              onPress={() => setShowAttentionSheet(true)}
              activeOpacity={0.8}
            >
              <Animated.View style={[s.attentionBadge, { backgroundColor: colors.warning, opacity: actionPulse }]}>
                <Text style={s.attentionBadgeText}>{alerts.filter(a => a.type !== 'success').length}</Text>
              </Animated.View>
              <Text style={s.attentionText}>
                {alerts.filter(a => a.type !== 'success').length} {alerts.filter(a => a.type !== 'success').length === 1 ? 'thing needs' : 'things need'} attention
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ====== 3. QUICK ACTIONS ====== */}
      <View style={s.sectionBlock}>
        <View style={{ paddingHorizontal: spacing.screenPadding }}>
          <SectionHeader title="Quick Actions" />
        </View>
        <View style={[s.quickRow, { paddingHorizontal: spacing.screenPadding }]}>
          <TouchableOpacity
            style={s.quickBtn}
            onPress={() => router.push('/registration-hub' as any)}
            activeOpacity={0.7}
          >
            <View>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              {newRegistrationCount > 0 && (
                <View style={s.quickBadge}>
                  <Text style={s.quickBadgeText}>{newRegistrationCount}</Text>
                </View>
              )}
            </View>
            <Text style={s.quickLabel}>Regs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.quickBtn}
            onPress={() => router.push('/(tabs)/payments' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="card" size={20} color={colors.primary} />
            <Text style={s.quickLabel}>Payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.quickBtn}
            onPress={() => setShowInviteModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={20} color={colors.primary} />
            <Text style={s.quickLabel}>Invite</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.quickBtn}
            onPress={() => router.push('/blast-composer' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="megaphone" size={20} color={colors.primary} />
            <Text style={s.quickLabel}>Blast</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ====== 4. SEASON OVERVIEW ====== */}
      <View style={s.sectionBlock}>
        <TouchableOpacity
          style={[s.overviewCard, { marginHorizontal: spacing.screenPadding }]}
          onPress={() => router.push('/season-reports' as any)}
          activeOpacity={0.8}
        >
          <View style={s.overviewHeader}>
            <Ionicons name="trophy-outline" size={16} color="#14B8A6" />
            <Text style={s.overviewTitle}>SEASON OVERVIEW</Text>
          </View>

          <View style={s.overviewStats}>
            <View style={s.overviewStat}>
              <Text style={s.overviewNumber}>{gamesPlayedCount}</Text>
              <Text style={s.overviewLabel}>Games</Text>
            </View>
            <View style={s.overviewStat}>
              <Text style={s.overviewNumber}>{stats.players}</Text>
              <Text style={s.overviewLabel}>Players</Text>
            </View>
            <View style={s.overviewStat}>
              <Text style={s.overviewNumber}>{stats.teams}</Text>
              <Text style={s.overviewLabel}>Teams</Text>
            </View>
          </View>

          {/* Revenue progress bar */}
          <View style={s.overviewBar}>
            <View style={[s.overviewBarFill, {
              width: `${Math.min(revenuePercent, 100)}%`,
            }, revenuePercent >= 100 && { backgroundColor: '#22C55E' }]} />
          </View>
          <Text style={s.overviewRevenue}>
            ${totalCollected.toLocaleString('en-US', { maximumFractionDigits: 0 })} collected / ${totalExpected.toLocaleString('en-US', { maximumFractionDigits: 0 })} expected
          </Text>

          <View style={s.overviewMetaRow}>
            <View style={s.overviewMetaItem}>
              <Ionicons name="flag-outline" size={12} color={colors.textMuted} />
              <Text style={s.overviewMetaText}>{getStatusLabel(workingSeason?.status || '')}</Text>
            </View>
            <View style={s.overviewMetaItem}>
              <Ionicons name={workingSeason?.registration_open ? 'lock-open-outline' : 'lock-closed-outline'} size={12} color={colors.textMuted} />
              <Text style={s.overviewMetaText}>Reg {workingSeason?.registration_open ? 'Open' : 'Closed'}</Text>
            </View>
            <View style={s.overviewMetaItem}>
              <Ionicons name="cash-outline" size={12} color={colors.textMuted} />
              <Text style={s.overviewMetaText}>{revenuePercent}% Collected</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* ====== 5. TEAM SNAPSHOT ====== */}
      <View style={s.sectionBlock}>
        <View style={{ paddingHorizontal: spacing.screenPadding }}>
          <SectionHeader title="Team Snapshot" action="Manage" onAction={() => router.push('/team-management' as any)} />
        </View>
        {teamSnapshots.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.screenPadding, gap: 10 }}
          >
            {teamSnapshots.map(team => (
              <TouchableOpacity
                key={team.id}
                style={[s.snapshotCard, { borderLeftColor: team.color || colors.primary }]}
                onPress={() => router.push({ pathname: '/team-wall', params: { teamId: team.id } } as any)}
                activeOpacity={0.8}
              >
                <Text style={s.snapshotName} numberOfLines={1}>{team.name}</Text>
                <Text style={s.snapshotStat}>{team.playerCount} Players</Text>
                <Text style={s.snapshotRecord}>{team.wins}W - {team.losses}L</Text>
                {team.nextEventDate && (
                  <View style={s.snapshotNextRow}>
                    <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                    <Text style={s.snapshotNextText}>Next: {formatShortDate(team.nextEventDate)}</Text>
                  </View>
                )}
                <Text style={s.snapshotViewTeam}>View Team →</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={[s.emptySnapshotCard, { marginHorizontal: spacing.screenPadding }]}>
            <Ionicons name="people-outline" size={24} color={colors.textMuted} />
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>No teams yet</Text>
          </View>
        )}
      </View>

      {/* ====== 6. RECENT ACTIVITY ====== */}
      {recentActivity.length > 0 && (
        <View style={s.sectionBlock}>
          <View style={{ paddingHorizontal: spacing.screenPadding }}>
            <SectionHeader title="Recent Activity" />
          </View>
          <View style={[s.activityCard, { marginHorizontal: spacing.screenPadding }]}>
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
        </View>
      )}

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}

      {/* Needs Attention Bottom Sheet */}
      <Modal visible={showAttentionSheet} transparent animationType="slide" onRequestClose={() => setShowAttentionSheet(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowAttentionSheet(false)}>
          <View style={s.attentionSheet} onStartShouldSetResponder={() => true}>
            <View style={s.attentionHandle} />
            <Text style={s.attentionSheetTitle}>Things That Need Attention</Text>
            {alerts.filter(a => a.type !== 'success').map((alert, i) => (
              <TouchableOpacity
                key={i}
                style={s.attentionRow}
                onPress={() => { setShowAttentionSheet(false); handleAlertPress(alert); }}
                activeOpacity={0.7}
              >
                <View style={[s.alertIconCircle, { backgroundColor: (alert.borderColor || getAlertColor(alert.type)) + '20' }]}>
                  <Ionicons name={getAlertIcon(alert.text) as any} size={20} color={alert.borderColor || getAlertColor(alert.type)} />
                </View>
                <Text style={s.attentionRowText}>{alert.text}</Text>
                {alert.count != null && alert.count > 0 && (
                  <View style={[s.alertBadge, { backgroundColor: alert.borderColor || getAlertColor(alert.type) }]}>
                    <Text style={s.alertBadgeText}>{alert.count}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
            {alerts.every(a => a.type === 'success') && (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.success, marginTop: 8 }}>All clear!</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

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

      {/* ====== 7. ORG MILESTONES (Admin Achievements — Lightweight) ====== */}
      {adminBadges.filter(b => b.earned).length > 0 && (
        <View style={s.sectionBlock}>
          <View style={{ paddingHorizontal: spacing.screenPadding }}>
            <SectionHeader title="Org Milestones" />
          </View>
          <View style={[s.milestonesCard, { marginHorizontal: spacing.screenPadding }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
              {adminBadges
                .filter(b => b.earned)
                .sort((a, b) => {
                  const order = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
                  return order.indexOf(a.rarity) - order.indexOf(b.rarity);
                })
                .map(badge => (
                  <View key={badge.id} style={s.milestonePill}>
                    <Text style={{ fontSize: 18 }}>{badge.icon}</Text>
                    <Text style={s.milestoneName} numberOfLines={1}>{badge.name}</Text>
                    <Text style={s.milestoneDesc} numberOfLines={1}>{badge.description}</Text>
                  </View>
                ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Bottom padding */}
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
    backgroundColor: colors.background,
  },

  sectionBlock: {
    marginBottom: 14,
  },

  // Org Health Banner
  orgBanner: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    ...shadows.card,
  },
  orgBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  orgBannerName: {
    ...displayTextStyle,
    fontSize: 20,
    color: colors.text,
  },
  orgBannerSeasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  orgBannerSeasonName: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  orgSportBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orgBannerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orgBannerStat: {
    flex: 1,
    alignItems: 'center',
  },
  orgBannerStatNum: {
    ...displayTextStyle,
    fontSize: 22,
    color: colors.text,
  },
  orgBannerStatLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  orgBannerDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.glassBorder,
  },
  regStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  regStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  regStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Season selector bar (FIX 5)
  seasonBar: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    ...shadows.card,
  },
  seasonBarText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // Needs Attention button (FIX 6)
  attentionBtn: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    ...shadows.card,
  },
  attentionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  attentionBadgeText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#FFF',
  },
  attentionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },

  // Attention sheet (FIX 6)
  attentionSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  attentionHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
    alignSelf: 'center' as const,
    marginBottom: 16,
  },
  attentionSheetTitle: {
    ...displayTextStyle,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: 8,
  },
  attentionRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 20,
  },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Alerts
  alertCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    ...shadows.card,
  },
  alertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 20,
  },
  alertBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 5,
    marginRight: 8,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#fff',
  },

  // Quick Actions
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
    textAlign: 'center' as const,
  },
  quickBadge: {
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
  quickBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#fff',
  },

  // Season Overview Card
  overviewCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    ...shadows.card,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  overviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewNumber: {
    ...displayTextStyle,
    fontSize: 24,
    color: colors.text,
  },
  overviewLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  overviewBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.glassBorder,
    overflow: 'hidden' as const,
    marginBottom: 6,
  },
  overviewBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2C5F7C',
  },
  overviewRevenue: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  overviewMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  overviewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overviewMetaText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Team Snapshot
  snapshotCard: {
    width: SNAPSHOT_CARD_WIDTH,
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderLeftWidth: 3,
    padding: 12,
    ...shadows.card,
  },
  snapshotName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  snapshotStat: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  snapshotRecord: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  snapshotNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  snapshotNextText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  snapshotViewTeam: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 6,
  },
  emptySnapshotCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center' as const,
    paddingVertical: 24,
    ...shadows.card,
  },

  // Recent Activity
  activityCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 12,
    ...shadows.card,
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

  // ========== ORG MILESTONES ==========
  milestonesCard: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    ...shadows.card,
  },
  milestonePill: {
    alignItems: 'center' as const,
    backgroundColor: colors.bgSecondary || 'rgba(255,255,255,0.05)',
    borderRadius: radii.card,
    padding: 12,
    minWidth: 100,
    gap: 4,
  },
  milestoneName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
  },
  milestoneDesc: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center' as const,
    maxWidth: 90,
  },

  // Modals
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end' as const,
  },

  inviteModal: {
    backgroundColor: colors.card || '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
    backgroundColor: '#FFF',
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...shadows.card,
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
    backgroundColor: colors.card || '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
    backgroundColor: '#FFF',
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...shadows.card,
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
    backgroundColor: colors.card || '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
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
    backgroundColor: '#FFF',
    borderRadius: radii.card,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...shadows.card,
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
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
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
    backgroundColor: colors.card || '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
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
    backgroundColor: '#FAFAFA',
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
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
