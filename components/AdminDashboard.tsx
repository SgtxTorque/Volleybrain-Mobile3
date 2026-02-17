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
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, Share, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ReenrollmentBanner from './ReenrollmentBanner';
import RoleSelector from './RoleSelector';
import SportSelector from './ui/SportSelector';

type AlertItem = { text: string; route: string | null; type: 'success' | 'warning' | 'error' };

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

export default function AdminDashboard() {
  const { profile, organization } = useAuth();
  const { isAdmin } = usePermissions();
  const { allSeasons, workingSeason, setWorkingSeason, refreshSeasons } = useSeason();
  const { activeSport, sportColors } = useSport();
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ players: 0, teams: 0, coaches: 0, outstanding: 0 });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  
  // Registration stats
  const [newRegistrationCount, setNewRegistrationCount] = useState(0);
  
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

  const fetchStats = async () => {
    if (!workingSeason) {
      setStats({ players: 0, teams: 0, coaches: 0, outstanding: 0 });
      setNewRegistrationCount(0);
      setAlerts([{ text: 'No season selected - Create one to get started!', route: null, type: 'error' }]);
      return;
    }

    const alertList: AlertItem[] = [];
    const seasonId = workingSeason.id;

    const { count: playerCount } = await supabase.from('players').select('*', { count: 'exact', head: true }).eq('season_id', seasonId);
    const { count: teamCount } = await supabase.from('teams').select('*', { count: 'exact', head: true }).eq('season_id', seasonId);
    const { count: coachCount } = await supabase.from('coaches').select('*', { count: 'exact', head: true }).eq('season_id', seasonId);

    const { data: players } = await supabase.from('players').select('id').eq('season_id', seasonId);
    const { data: payments } = await supabase.from('payments').select('*').eq('season_id', seasonId);

    const totalExpected = (players?.length || 0) * 335;
    const totalPaid = (payments || []).filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
    const outstanding = totalExpected - totalPaid;

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
        type: 'warning' 
      });
    }

    // Check for players needing team assignment (active status in registrations)
    const { count: needsTeamCount } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', seasonId)
      .eq('status', 'active');
    
    if (needsTeamCount && needsTeamCount > 0) {
      alertList.push({ 
        text: needsTeamCount + ' player' + (needsTeamCount > 1 ? 's' : '') + ' ready for team assignment', 
        route: '/registration-hub', 
        type: 'warning' 
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
        type: 'warning' 
      });
    }

    if (teamCount === 0) alertList.push({ text: 'No teams created yet', route: '/teams', type: 'error' });
    if (playerCount === 0 && (!newRegCount || newRegCount === 0)) alertList.push({ text: 'No players registered yet', route: '/players', type: 'error' });
    if (coachCount === 0) alertList.push({ text: 'No coaches added yet', route: '/coaches', type: 'error' });
    if (outstanding > 0) alertList.push({ text: '$' + outstanding + ' in outstanding payments', route: '/payments', type: 'warning' });

    const orgId = profile?.current_organization_id;
    const { count: pendingCount } = await supabase.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('organization_id', orgId);
    if (pendingCount && pendingCount > 0) alertList.push({ text: pendingCount + ' pending invite' + (pendingCount > 1 ? 's' : '') + ' awaiting response', route: null, type: 'warning' });

    const { count: approvalCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('pending_approval', true).eq('current_organization_id', orgId);
    if (approvalCount && approvalCount > 0) alertList.push({ text: approvalCount + ' account' + (approvalCount > 1 ? 's' : '') + ' awaiting approval', route: '/users', type: 'warning' });

    if (alertList.length === 0) alertList.push({ text: 'You are all set!', route: null, type: 'success' });
    setAlerts(alertList);
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

  useEffect(() => {
    if (workingSeason) {
      fetchStats();
      fetchTeams();
    }
    fetchPendingInvites();
  }, [workingSeason]);

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

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'players': router.push('/players'); break;
      case 'teams': router.push('/teams'); break;
      case 'schedule': router.push('/schedule'); break;
      case 'payments': router.push('/payments'); break;
      case 'coaches': router.push('/coaches'); break;
      case 'invite': setShowInviteModal(true); break;
      case 'registration': router.push('/registration-hub' as any); break;
      case 'users': router.push('/users'); break;
    }
  };

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
    switch (status) { case 'active': return 'In Progress'; case 'upcoming': return 'Upcoming'; case 'completed': return 'Completed'; default: return status; }
  };

  const getInviteTypeLabel = (type: string) => {
    switch (type) { case 'parent': return 'Parent'; case 'coach': return 'Coach'; case 'admin': return 'Admin'; default: return type; }
  };

  const getInviteTypeColor = (type: string) => {
    switch (type) { case 'parent': return colors.success; case 'coach': return colors.info; case 'admin': return colors.danger; default: return colors.textMuted; }
  };

  const onRefresh = async () => { 
    setRefreshing(true); 
    await refreshSeasons(); 
    await fetchStats(); 
    await fetchPendingInvites();
    setRefreshing(false); 
  };

  const openSeasonsCount = allSeasons.filter(s => s.registration_open).length;
  const s = createStyles(colors, sportColors);

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      
      {/* Header with Sport Selector and Role Selector */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Welcome back,</Text>
          <Text style={s.userName}>{profile?.full_name || 'Admin'}</Text>
        </View>
        <View style={s.headerRight}>
          <RoleSelector />
          <SportSelector />
          <View style={s.logoBox}>
            <Text style={s.logoIcon}>{activeSport?.icon || '🏐'}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={s.seasonBanner} onPress={() => setShowSeasonPicker(true)}>
        {workingSeason ? (
          <>
            <View style={{ flex: 1 }}>
              <View style={s.seasonLabelRow}>
                <Text style={s.seasonLabel}>WORKING IN</Text>
                <View style={[s.statusPill, { backgroundColor: getStatusColor(workingSeason.status) }]}>
                  <Text style={s.statusPillText}>{getStatusLabel(workingSeason.status)}</Text>
                </View>
              </View>
              <Text style={s.seasonName}>{workingSeason.name}</Text>
              <View style={s.regStatusRow}>
                <Ionicons name={workingSeason.registration_open ? 'checkmark-circle' : 'close-circle'} size={14} color={workingSeason.registration_open ? colors.success : colors.danger} />
                <Text style={[s.regStatusText, { color: workingSeason.registration_open ? colors.success : colors.danger }]}>
                  Registration {workingSeason.registration_open ? 'Open' : 'Closed'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-down" size={24} color={sportColors.primary} />
          </>
        ) : (
          <>
            <View>
              <Text style={s.seasonLabel}>NO SEASON</Text>
              <Text style={s.seasonName}>Tap to Create</Text>
            </View>
            <Ionicons name="add-circle" size={28} color={sportColors.primary} />
          </>
        )}
      </TouchableOpacity>

      {openSeasonsCount > 0 && (
        <View style={s.regAlert}>
          <Ionicons name="information-circle" size={18} color={colors.info} />
          <Text style={s.regAlertText}>{openSeasonsCount} season{openSeasonsCount > 1 ? 's' : ''} accepting registration</Text>
        </View>
      )}

      <ReenrollmentBanner />

      <View style={s.statsRow}>
        <TouchableOpacity style={s.statItem} onPress={() => router.push('/players')}>
          <Text style={s.statNum}>{stats.players}</Text>
          <Text style={s.statLabel}>Players</Text>
        </TouchableOpacity>
        <View style={s.statDivider} />
        <TouchableOpacity style={s.statItem} onPress={() => router.push('/teams')}>
          <Text style={s.statNum}>{stats.teams}</Text>
          <Text style={s.statLabel}>Teams</Text>
        </TouchableOpacity>
        <View style={s.statDivider} />
        <TouchableOpacity style={s.statItem} onPress={() => router.push('/coaches')}>
          <Text style={s.statNum}>{stats.coaches}</Text>
          <Text style={s.statLabel}>Coaches</Text>
        </TouchableOpacity>
        <View style={s.statDivider} />
        <TouchableOpacity style={s.statItem} onPress={() => router.push('/payments')}>
          <Text style={[s.statNum, stats.outstanding > 0 && { color: colors.warning }]}>${stats.outstanding}</Text>
          <Text style={s.statLabel}>Owed</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>Quick Actions</Text>
      
      <View style={s.actionsRow}>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleQuickAction('players')}>
          <Ionicons name="people" size={24} color={colors.success} />
          <Text style={s.actionText} numberOfLines={1} adjustsFontSizeToFit>Players</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleQuickAction('teams')}>
          <Ionicons name="shirt" size={24} color={colors.info} />
          <Text style={s.actionText} numberOfLines={1} adjustsFontSizeToFit>Teams</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleQuickAction('schedule')}>
          <Ionicons name="calendar" size={24} color={colors.danger} />
          <Text style={s.actionText} numberOfLines={1} adjustsFontSizeToFit>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleQuickAction('payments')}>
          <Ionicons name="cash" size={24} color={colors.warning} />
          <Text style={s.actionText} numberOfLines={1} adjustsFontSizeToFit>Payments</Text>
        </TouchableOpacity>
      </View>

      <View style={s.actionsRow}>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleQuickAction('coaches')}>
          <Ionicons name="clipboard" size={24} color="#AF52DE" />
          <Text style={s.actionText} numberOfLines={1} adjustsFontSizeToFit>Coaches</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, s.actionBtnHighlight]} onPress={() => handleQuickAction('invite')}>
          <Ionicons name="person-add" size={24} color={sportColors.primary} />
          <Text style={s.actionText} numberOfLines={1} adjustsFontSizeToFit>Invite</Text>
        </TouchableOpacity>
        {/* Registration Hub with Badge */}
        <TouchableOpacity style={s.actionBtn} onPress={() => handleQuickAction('registration')}>
          <View style={s.actionIconContainer}>
            <Ionicons name="document-text" size={24} color="#5AC8FA" />
            {newRegistrationCount > 0 && (
              <View style={s.actionBadge}>
                <Text style={s.actionBadgeText}>
                  {newRegistrationCount > 99 ? '99+' : newRegistrationCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={s.actionText} numberOfLines={1} adjustsFontSizeToFit>Registration</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleQuickAction('users')}>
          <Ionicons name="people-circle" size={24} color="#FF9500" />
          <Text style={s.actionText} numberOfLines={1} adjustsFontSizeToFit>Users</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>Needs Attention</Text>
      <View style={s.alertsCard}>
        {alerts.map((alert, i) => (
          <TouchableOpacity key={i} style={s.alertRow} onPress={() => handleAlertPress(alert)} disabled={alert.type === 'success'} activeOpacity={alert.type === 'success' ? 1 : 0.7}>
            <View style={[s.alertDot, { backgroundColor: getAlertColor(alert.type) }]} />
            <Text style={s.alertText}>{alert.text}</Text>
            {(alert.route || alert.text.includes('No season') || alert.text.includes('pending invite')) && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
          </TouchableOpacity>
        ))}
      </View>

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

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors: any, sportColors: any) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greeting: { fontSize: 16, color: colors.textMuted },
  userName: { fontSize: 28, fontWeight: '800', color: colors.text },
  logoBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: sportColors.primary + '20', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: sportColors.primary },
  logoIcon: { fontSize: 24 },
  
  seasonBanner: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  seasonLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seasonLabel: { fontSize: 11, color: sportColors.primary, fontWeight: '600', letterSpacing: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusPillText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  seasonName: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginTop: 4 },
  regStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  regStatusText: { fontSize: 12, fontWeight: '500' },
  
  regAlert: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.info + '20', borderRadius: 10, padding: 10, marginBottom: 16 },
  regAlertText: { fontSize: 13, color: colors.info },
  
  statsRow: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  statNum: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 1 },
  
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  actionBtn: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 14, alignItems: 'center', width: '23%', borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  actionBtnHighlight: { borderWidth: 1, borderColor: sportColors.primary },
  actionText: { fontSize: 10, color: colors.text, marginTop: 6, textAlign: 'center', minHeight: 14 },
  actionIconContainer: { position: 'relative' },
  actionBadge: { 
    position: 'absolute', 
    top: -8, 
    right: -12, 
    backgroundColor: '#FF3B30', 
    borderRadius: 10, 
    minWidth: 18, 
    height: 18, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  actionBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  alertsCard: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  alertRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  alertDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  alertText: { fontSize: 14, color: colors.text, flex: 1 },
  
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  
  inviteModal: { backgroundColor: colors.glassCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', borderWidth: 1, borderColor: colors.glassBorder },
  inviteModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  inviteModalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  inviteOptions: { padding: 16 },
  inviteOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder },
  inviteOptionIcon: { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  inviteOptionContent: { flex: 1 },
  inviteOptionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 },
  inviteOptionSubtitle: { fontSize: 13, color: colors.textMuted },
  inviteDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  inviteDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  inviteDividerText: { fontSize: 11, color: colors.textMuted, fontWeight: '600', letterSpacing: 1, marginHorizontal: 12 },
  viewPendingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 8 },
  viewPendingBtnText: { fontSize: 15, color: colors.info, fontWeight: '500' },
  
  inviteForm: { padding: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  backBtnText: { fontSize: 15, color: colors.text },
  formLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  formInput: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  formTextArea: { minHeight: 80, textAlignVertical: 'top' },
  sendInviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: sportColors.primary, padding: 16, borderRadius: 12, marginTop: 8 },
  sendInviteBtnDisabled: { opacity: 0.6 },
  sendInviteBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  teamSelector: { flexGrow: 0, marginBottom: 16 },
  teamOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.background, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  teamOptionSelected: { backgroundColor: sportColors.primary + '20', borderColor: sportColors.primary },
  teamOptionText: { fontSize: 14, color: colors.text },
  teamOptionTextSelected: { color: sportColors.primary, fontWeight: '600' },
  noTeamsText: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic', marginBottom: 16 },
  
  pendingModal: { backgroundColor: colors.glassCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', borderWidth: 1, borderColor: colors.glassBorder },
  pendingList: { padding: 16 },
  emptyPending: { alignItems: 'center', padding: 40 },
  emptyPendingText: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 16 },
  emptyPendingSubtext: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  pendingItem: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  pendingItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  inviteTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  inviteTypeBadgeText: { fontSize: 12, fontWeight: '600' },
  pendingItemDate: { fontSize: 12, color: colors.textMuted },
  pendingItemEmail: { fontSize: 16, fontWeight: '500', color: colors.text, marginBottom: 4 },
  pendingItemCode: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  pendingItemActions: { flexDirection: 'row', gap: 16 },
  pendingActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pendingActionText: { fontSize: 13, fontWeight: '500' },
  
  pickerModal: { backgroundColor: colors.glassCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', borderWidth: 1, borderColor: colors.glassBorder },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  pickerScroll: { padding: 16 },
  pickerSectionLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', letterSpacing: 1, marginTop: 16, marginBottom: 8 },
  
  seasonCard: { backgroundColor: colors.glassCard, borderRadius: 16, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  seasonCardSelected: { borderWidth: 1, borderColor: sportColors.primary },
  seasonCardCompleted: { opacity: 0.7 },
  seasonCardMain: { padding: 16 },
  seasonCardInfo: {},
  seasonCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  seasonCardName: { fontSize: 16, fontWeight: '600', color: colors.text },
  statusPillSmall: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusPillSmallText: { fontSize: 11, fontWeight: '600' },
  seasonCardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.glassCard, padding: 12, borderTopWidth: 1, borderTopColor: colors.glassBorder },
  regToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  regToggleLabel: { fontSize: 13, color: colors.textMuted },
  statusChangeBtn: { backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  statusChangeBtnText: { fontSize: 12, color: colors.info, fontWeight: '500' },
  
  emptySeasons: { alignItems: 'center', padding: 40 },
  emptySeasonsText: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 16 },
  emptySeasonsSubtext: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  
  createSeasonBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: sportColors.primary, padding: 16, margin: 16, borderRadius: 12 },
  createSeasonBtnText: { fontSize: 16, fontWeight: 'bold', color: colors.background },
  
  modal: { backgroundColor: colors.glassCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.glassBorder },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  inputLabel: { fontSize: 14, color: colors.textMuted, marginBottom: 8 },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  
  statusRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.background, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  statusBtnSelected: { backgroundColor: sportColors.primary, borderColor: sportColors.primary },
  statusBtnText2: { fontSize: 14, fontWeight: '600', color: colors.text },
  statusBtnTextSelected: { color: colors.background },
  
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.info + '15', borderRadius: 10, padding: 12, marginBottom: 16 },
  infoBoxText: { flex: 1, fontSize: 13, color: colors.info },
  
  feeBox: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.glassBorder },
  feeTitle: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  feeItem: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
  feeTotal: { fontSize: 14, fontWeight: 'bold', color: sportColors.primary, marginTop: 8 },
  createBtn: { backgroundColor: sportColors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  disabled: { opacity: 0.7 },
  createTxt: { fontSize: 18, fontWeight: 'bold', color: colors.background },
});
