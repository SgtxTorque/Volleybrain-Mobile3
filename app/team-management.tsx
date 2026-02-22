import AdminContextBar from '@/components/AdminContextBar';
import AppHeaderBar from '@/components/ui/AppHeaderBar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import StatBox from '@/components/ui/StatBox';
import { useAuth } from '@/lib/auth';
import { addAdminToTeamChats, addParentToTeamChats, createTeamChats, getProfileByEmail, syncTeamChats } from '@/lib/chat-utils';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ================================================================
// TYPES
// ================================================================

type Team = {
  id: string; name: string; team_type: string; color: string;
  max_players: number; age_group_id: string;
};
type AgeGroup = { id: string; name: string; display_order: number; };
type Player = {
  id: string; first_name: string; last_name: string; grade: number;
  status: string; parent_name: string; parent_email: string; position: string | null;
};
type TeamPlayer = { id: string; team_id: string; player_id: string; jersey_number: number; };
type Coach = { id: string; first_name: string; last_name: string; email: string; };
type TeamCoach = { id: string; team_id: string; coach_id: string; role: string; };
type WinLoss = { wins: number; losses: number; };

// ================================================================
// COMPONENT
// ================================================================

export default function TeamManagementScreen() {
  const { profile } = useAuth();
  const { workingSeason } = useSeason();
  const { colors } = useTheme();
  const router = useRouter();

  // Core data
  const [teams, setTeams] = useState<Team[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [teamCoaches, setTeamCoaches] = useState<TeamCoach[]>([]);
  const [winLossMap, setWinLossMap] = useState<Record<string, WinLoss>>({});
  const [waiverCompliance, setWaiverCompliance] = useState<Record<string, { compliant: number; total: number }>>({});

  // UI state
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Form state
  const [teamName, setTeamName] = useState('');
  const [teamType, setTeamType] = useState('development');
  const [teamColor, setTeamColor] = useState('#FFD700');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string | null>(null);
  const [maxRoster, setMaxRoster] = useState('15');

  const teamColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#9B59B6', '#3498DB', '#E67E22'];

  // ================================================================
  // DATA FETCHING
  // ================================================================

  const fetchData = useCallback(async () => {
    if (!workingSeason || !profile) return;
    const seasonId = workingSeason.id;
    const orgId = profile.current_organization_id;

    const [tRes, agRes, pRes, cRes, tpRes, tcRes, gRes] = await Promise.all([
      supabase.from('teams').select('*').eq('season_id', seasonId).order('name'),
      supabase.from('age_groups').select('*').eq('season_id', seasonId).order('display_order'),
      supabase.from('players').select('id, first_name, last_name, grade, status, parent_name, parent_email, position').eq('season_id', seasonId),
      supabase.from('coaches').select('id, first_name, last_name, email').eq('season_id', seasonId),
      supabase.from('team_players').select('*'),
      supabase.from('team_coaches').select('*'),
      supabase.from('schedule_events').select('team_id, game_result').eq('season_id', seasonId).eq('event_type', 'game').not('game_result', 'is', null),
    ]);

    setTeams(tRes.data || []);
    setAgeGroups(agRes.data || []);
    setPlayers(pRes.data || []);
    setCoaches(cRes.data || []);
    setTeamPlayers(tpRes.data || []);
    setTeamCoaches(tcRes.data || []);

    // Build W-L map
    const wlMap: Record<string, WinLoss> = {};
    for (const g of (gRes.data || [])) {
      if (!wlMap[g.team_id]) wlMap[g.team_id] = { wins: 0, losses: 0 };
      if (g.game_result === 'win') wlMap[g.team_id].wins++;
      else if (g.game_result === 'loss') wlMap[g.team_id].losses++;
    }
    setWinLossMap(wlMap);

    // Waiver compliance
    if (orgId) {
      const { data: requiredWaivers } = await supabase
        .from('waiver_templates')
        .select('id')
        .eq('organization_id', orgId)
        .eq('is_required', true)
        .eq('is_active', true);

      if (requiredWaivers && requiredWaivers.length > 0) {
        const playerIds = (pRes.data || []).map((p: any) => p.id);
        const waiverIds = requiredWaivers.map(w => w.id);

        if (playerIds.length > 0) {
          const { data: sigs } = await supabase
            .from('waiver_signatures')
            .select('player_id, waiver_template_id')
            .eq('season_id', seasonId)
            .in('player_id', playerIds)
            .in('waiver_template_id', waiverIds);

          const signedSet = new Set((sigs || []).map(s => s.player_id + ':' + s.waiver_template_id));
          const tpData = tpRes.data || [];
          const compliance: Record<string, { compliant: number; total: number }> = {};

          for (const team of (tRes.data || [])) {
            const teamPlayerIds = tpData.filter((tp: any) => tp.team_id === team.id).map((tp: any) => tp.player_id);
            let compliant = 0;
            for (const pid of teamPlayerIds) {
              const allSigned = waiverIds.every(wid => signedSet.has(pid + ':' + wid));
              if (allSigned) compliant++;
            }
            compliance[team.id] = { compliant, total: teamPlayerIds.length };
          }
          setWaiverCompliance(compliance);
        }
      } else {
        setWaiverCompliance({});
      }
    }
  }, [workingSeason, profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ================================================================
  // COMPUTED HELPERS
  // ================================================================

  const getTeamPlayers = (teamId: string) => {
    const ids = teamPlayers.filter(tp => tp.team_id === teamId).map(tp => tp.player_id);
    return players.filter(p => ids.includes(p.id));
  };

  const getTeamCoaches = (teamId: string) => {
    const tcs = teamCoaches.filter(tc => tc.team_id === teamId);
    return tcs.map(tc => {
      const coach = coaches.find(c => c.id === tc.coach_id);
      return coach ? { ...coach, role: tc.role } : null;
    }).filter(Boolean) as (Coach & { role: string })[];
  };

  const getUnassignedPlayers = () => {
    const assignedIds = teamPlayers.map(tp => tp.player_id);
    return players.filter(p => !assignedIds.includes(p.id));
  };

  const getUnassignedCoaches = (teamId: string) => {
    const assignedIds = teamCoaches.filter(tc => tc.team_id === teamId).map(tc => tc.coach_id);
    return coaches.filter(c => !assignedIds.includes(c.id));
  };

  const getAgeGroupName = (ageGroupId: string) =>
    ageGroups.find(ag => ag.id === ageGroupId)?.name || '';

  const getFilteredTeams = () => {
    if (!searchQuery) return teams;
    const q = searchQuery.toLowerCase();
    return teams.filter(t => {
      if (t.name.toLowerCase().includes(q)) return true;
      const roster = getTeamPlayers(t.id);
      return roster.some(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q));
    });
  };

  const unrosteredPlayers = getUnassignedPlayers();
  const filteredTeams = getFilteredTeams();

  // ================================================================
  // CRUD OPERATIONS
  // ================================================================

  const resetForm = () => {
    setTeamName(''); setTeamType('development'); setTeamColor('#FFD700');
    setSelectedAgeGroup(null); setMaxRoster('15');
  };

  const createTeam = async () => {
    if (!teamName.trim() || !selectedAgeGroup) {
      Alert.alert('Error', 'Please enter a name and select an age group');
      return;
    }
    if (!workingSeason || !profile) return;
    setCreating(true);

    const { data: newTeam, error } = await supabase.from('teams').insert({
      season_id: workingSeason.id,
      age_group_id: selectedAgeGroup,
      name: teamName.trim(),
      team_type: teamType,
      color: teamColor,
      max_players: parseInt(maxRoster) || 15,
    }).select().single();

    if (error) { Alert.alert('Error', error.message); setCreating(false); return; }

    if (newTeam) {
      const chats = await createTeamChats({
        seasonId: workingSeason.id,
        teamId: newTeam.id,
        teamName: newTeam.name,
        createdBy: profile.id,
      });
      if (chats) {
        await addAdminToTeamChats(profile.id, profile.full_name || 'Admin', chats.teamChatId, chats.playerChatId);
      }
    }

    setCreating(false);
    setShowCreateModal(false);
    resetForm();
    fetchData();
    Alert.alert('Success', 'Team created!');
  };

  const updateTeam = async () => {
    if (!editingTeam || !teamName.trim()) return;
    setCreating(true);

    const { error } = await supabase.from('teams').update({
      name: teamName.trim(),
      team_type: teamType,
      color: teamColor,
      max_players: parseInt(maxRoster) || 15,
      age_group_id: selectedAgeGroup || editingTeam.age_group_id,
    }).eq('id', editingTeam.id);

    setCreating(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setShowEditModal(false);
    resetForm();
    fetchData();
    Alert.alert('Success', 'Team updated!');
  };

  const deleteTeam = (team: Team) => {
    Alert.alert('Delete Team', `Delete "${team.name}"? This removes all players and coaches.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { data: channelIds } = await supabase.from('chat_channels').select('id').eq('team_id', team.id);
        if (channelIds && channelIds.length > 0) {
          await supabase.from('channel_members').delete().in('channel_id', channelIds.map(c => c.id));
        }
        await supabase.from('chat_channels').delete().eq('team_id', team.id);
        await supabase.from('team_players').delete().eq('team_id', team.id);
        await supabase.from('team_coaches').delete().eq('team_id', team.id);
        await supabase.from('teams').delete().eq('id', team.id);
        setShowDetailModal(false);
        fetchData();
      }},
    ]);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamType(team.team_type);
    setTeamColor(team.color);
    setSelectedAgeGroup(team.age_group_id);
    setMaxRoster(String(team.max_players || 15));
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  // ================================================================
  // PLAYER OPERATIONS
  // ================================================================

  const assignPlayer = async (player: Player, team: Team) => {
    if (!workingSeason || !profile) return;
    const { error } = await supabase.from('team_players').insert({
      team_id: team.id, player_id: player.id, is_primary_team: true,
    });
    if (error) { Alert.alert('Error', error.message); return; }
    await supabase.from('players').update({ status: 'assigned' }).eq('id', player.id);

    if (player.parent_email) {
      const chats = await createTeamChats({
        seasonId: workingSeason.id, teamId: team.id, teamName: team.name, createdBy: profile.id,
      });
      if (chats) {
        const parentProfile = await getProfileByEmail(player.parent_email);
        if (parentProfile?.id) {
          await addParentToTeamChats({
            parentId: parentProfile.id,
            parentName: parentProfile.full_name || player.parent_name || 'Parent',
            playerFirstName: player.first_name,
            teamChatId: chats.teamChatId,
            playerChatId: chats.playerChatId,
          });
        }
      }
    }

    fetchData();
  };

  const removePlayer = (player: Player) => {
    if (!selectedTeam) return;
    Alert.alert('Remove Player', `Remove ${player.first_name} ${player.last_name} from ${selectedTeam.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('team_players').delete().eq('team_id', selectedTeam.id).eq('player_id', player.id);
        await supabase.from('players').update({ status: 'new' }).eq('id', player.id);
        fetchData();
      }},
    ]);
  };

  const movePlayer = (player: Player, targetTeam: Team) => {
    if (!selectedTeam) return;
    Alert.alert(
      'Move Player',
      `Move ${player.first_name} ${player.last_name} from ${selectedTeam.name} to ${targetTeam.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Move', onPress: async () => {
          await supabase.from('team_players').delete().eq('team_id', selectedTeam.id).eq('player_id', player.id);
          await supabase.from('team_players').insert({
            team_id: targetTeam.id, player_id: player.id, is_primary_team: true,
          });
          setShowMoveModal(false);
          setSelectedPlayer(null);
          fetchData();
          Alert.alert('Success', `${player.first_name} moved to ${targetTeam.name}`);
        }},
      ],
    );
  };

  // ================================================================
  // COACH OPERATIONS
  // ================================================================

  const assignCoach = async (coach: Coach, role: string) => {
    if (!selectedTeam) return;
    const { error } = await supabase.from('team_coaches').insert({
      team_id: selectedTeam.id, coach_id: coach.id, role,
    });
    if (error) { Alert.alert('Error', error.message); return; }
    fetchData();
  };

  const removeCoach = async (coachId: string) => {
    if (!selectedTeam) return;
    await supabase.from('team_coaches').delete().eq('team_id', selectedTeam.id).eq('coach_id', coachId);
    fetchData();
  };

  const syncChats = async (team: Team) => {
    if (!workingSeason || !profile) return;
    setSyncing(true);
    const result = await syncTeamChats(workingSeason.id, team.id, team.name, profile.id, profile.full_name || 'Admin');
    setSyncing(false);
    if (result.success) {
      Alert.alert('Sync Complete', `Added ${result.added.length} members.`);
    } else {
      Alert.alert('Error', 'Failed to sync chats.');
    }
  };

  // ================================================================
  // RENDER
  // ================================================================

  const s = createStyles(colors);

  const renderTeamForm = (isEdit: boolean) => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.label}>Team Name *</Text>
        <TextInput style={s.input} placeholder="e.g., Eagles 12U Elite" placeholderTextColor={colors.textMuted}
          value={teamName} onChangeText={setTeamName} />

        <Text style={s.label}>Age Group</Text>
        <View style={s.optionRow}>
          {ageGroups.map(ag => (
            <TouchableOpacity key={ag.id} style={[s.optionBtn, selectedAgeGroup === ag.id && s.optionBtnSel]}
              onPress={() => setSelectedAgeGroup(ag.id)}>
              <Text style={[s.optionBtnTxt, selectedAgeGroup === ag.id && s.optionBtnTxtSel]}>{ag.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Team Type</Text>
        <View style={s.typeRow}>
          <TouchableOpacity style={[s.typeBtn, teamType === 'elite' && s.typeBtnSel]} onPress={() => setTeamType('elite')}>
            <Text style={[s.typeBtnTxt, teamType === 'elite' && s.typeBtnTxtSel]}>Elite</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.typeBtn, teamType === 'development' && s.typeBtnSel]} onPress={() => setTeamType('development')}>
            <Text style={[s.typeBtnTxt, teamType === 'development' && s.typeBtnTxtSel]}>Development</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Team Color</Text>
        <View style={s.colorRow}>
          {teamColors.map(c => (
            <TouchableOpacity key={c} style={[s.colorBtn, { backgroundColor: c }, teamColor === c && s.colorBtnSel]}
              onPress={() => setTeamColor(c)}>
              {teamColor === c && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Max Roster Size</Text>
        <TextInput style={s.input} placeholder="15" placeholderTextColor={colors.textMuted}
          value={maxRoster} onChangeText={setMaxRoster} keyboardType="number-pad" />

        <TouchableOpacity style={[s.primaryBtn, creating && s.disabled]} onPress={isEdit ? updateTeam : createTeam} disabled={creating}>
          <Text style={s.primaryBtnTxt}>{creating ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Team'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>

        {/* Header */}
        <AdminContextBar />
        <AppHeaderBar
          title="TEAM MANAGEMENT"
          showLogo={false}
          showAvatar={false}
          showNotificationBell={false}
          leftIcon={<Ionicons name="arrow-back" size={22} color="#FFF" />}
          onLeftPress={() => router.back()}
          rightIcon={
            <TouchableOpacity style={s.addBtn} onPress={() => { resetForm(); setShowCreateModal(true); }}>
              <Ionicons name="add" size={22} color="#FFF" />
            </TouchableOpacity>
          }
        />

        {/* Stats Row */}
        <View style={s.statsRow}>
          <StatBox value={teams.length} label="Teams" accentColor="#2C5F7C" />
          <StatBox value={teamPlayers.length} label="Rostered" accentColor="#14B8A6" />
          <StatBox value={unrosteredPlayers.length} label="Unrostered" accentColor={unrosteredPlayers.length > 0 ? '#E8913A' : '#22C55E'} />
        </View>

        {/* Unrostered Alert */}
        {unrosteredPlayers.length > 0 && (
          <Card accentColor="#E8913A" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="alert-circle" size={18} color="#E8913A" />
            <Text style={s.alertText}>
              {unrosteredPlayers.length} player{unrosteredPlayers.length > 1 ? 's' : ''} ready for team assignment
            </Text>
          </Card>
        )}

        {/* Search */}
        <View style={s.searchRow}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput style={s.searchInput} placeholder="Search teams or players..."
            placeholderTextColor={colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Team Cards */}
        <SectionHeader title="Teams" />
        {filteredTeams.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="shirt-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No teams yet</Text>
            <Text style={s.emptySubtext}>Create your first team to get started!</Text>
          </Card>
        ) : (
          filteredTeams.map(team => {
            const roster = getTeamPlayers(team.id);
            const teamCoachesList = getTeamCoaches(team.id);
            const wl = winLossMap[team.id];
            const waiver = waiverCompliance[team.id];
            return (
              <Card key={team.id} accentColor={team.color}
                onPress={() => { setSelectedTeam(team); setShowDetailModal(true); }}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={s.teamBody}>
                  <View style={s.teamTopRow}>
                    <Text style={s.teamName}>{team.name}</Text>
                    {wl && (
                      <Text style={s.recordText}>{wl.wins}-{wl.losses}</Text>
                    )}
                  </View>
                  <Text style={s.teamMeta}>
                    {getAgeGroupName(team.age_group_id)}{team.team_type ? ` \u00B7 ${team.team_type}` : ''} \u00B7 {roster.length}/{team.max_players} players
                  </Text>
                  {teamCoachesList.length > 0 && (
                    <Text style={s.coachList}>
                      {teamCoachesList.map(c => `${c.role === 'head' ? '\uD83D\uDC51 ' : ''}${c.first_name}`).join(', ')}
                    </Text>
                  )}
                  {waiver && waiver.total > 0 && (
                    <View style={[s.waiverPill, { backgroundColor: waiver.compliant === waiver.total ? '#22C55E20' : '#E8913A20' }]}>
                      <Ionicons name={waiver.compliant === waiver.total ? 'shield-checkmark' : 'alert-circle'}
                        size={12} color={waiver.compliant === waiver.total ? '#22C55E' : '#E8913A'} />
                      <Text style={{ fontSize: 11, marginLeft: 4,
                        color: waiver.compliant === waiver.total ? '#22C55E' : '#E8913A' }}>
                        {waiver.compliant}/{waiver.total} waivers
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Card>
            );
          })
        )}

        {/* Unrostered Players Section */}
        {unrosteredPlayers.length > 0 && (
          <View style={s.unrosteredSection}>
            <SectionHeader title={'Unrostered Players (' + unrosteredPlayers.length + ')'} />
            {(searchQuery
              ? unrosteredPlayers.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()))
              : unrosteredPlayers
            ).map(player => (
              <View key={player.id} style={s.unrosteredCard}>
                <View style={s.unrosteredInfo}>
                  <Text style={s.unrosteredName}>{player.first_name} {player.last_name}</Text>
                  <Text style={s.unrosteredMeta}>
                    Grade {player.grade}{player.position ? ` \u00B7 ${player.position}` : ''}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.teamPillScroll}>
                  {teams.map(team => (
                    <TouchableOpacity key={team.id} style={[s.teamPill, { borderColor: team.color }]}
                      onPress={() => {
                        Alert.alert('Assign Player', `Add ${player.first_name} to ${team.name}?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Assign', onPress: () => assignPlayer(player, team) },
                        ]);
                      }}>
                      <View style={[s.teamPillDot, { backgroundColor: team.color }]} />
                      <Text style={s.teamPillText}>{team.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ))}
            {unrosteredPlayers.length === 0 && (
              <View style={s.allRostered}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={{ color: colors.success, fontSize: 14, marginLeft: 8 }}>All players rostered!</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ============================================================ */}
      {/* CREATE TEAM MODAL */}
      {/* ============================================================ */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Create Team</Text>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {renderTeamForm(false)}
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* EDIT TEAM MODAL */}
      {/* ============================================================ */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Team</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {renderTeamForm(true)}
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* TEAM DETAIL MODAL */}
      {/* ============================================================ */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.detailModal}>
            {selectedTeam && (
              <>
                <View style={s.detailHeader}>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={s.detailTitle}>{selectedTeam.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => openEditModal(selectedTeam)}>
                      <Ionicons name="create-outline" size={22} color={colors.info} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteTeam(selectedTeam)}>
                      <Ionicons name="trash" size={22} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={s.detailScroll}>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <TouchableOpacity style={[s.syncBtn, { flex: 1, marginBottom: 0 }]} onPress={() => syncChats(selectedTeam)} disabled={syncing}>
                      <Ionicons name="chatbubbles" size={18} color={colors.info} />
                      <Text style={s.syncBtnTxt}>{syncing ? 'Syncing...' : 'Sync Chats'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.syncBtn, { flex: 1, marginBottom: 0 }]} onPress={() => { setShowDetailModal(false); router.push('/(tabs)/jersey-management' as any); }}>
                      <Ionicons name="shirt-outline" size={18} color={colors.info} />
                      <Text style={s.syncBtnTxt}>Manage Jerseys</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Coaches Section */}
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>COACHES ({getTeamCoaches(selectedTeam.id).length})</Text>
                    {getTeamCoaches(selectedTeam.id).map(coach => (
                      <View key={coach.id} style={s.memberRow}>
                        <View style={s.avatar}>
                          <Text style={s.avatarText}>{coach.first_name[0]}{coach.last_name[0]}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.memberName}>{coach.first_name} {coach.last_name}</Text>
                          <Text style={s.memberRole}>{coach.role === 'head' ? '\uD83D\uDC51 Head Coach' : 'Assistant'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeCoach(coach.id)}>
                          <Ionicons name="close-circle" size={24} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {getUnassignedCoaches(selectedTeam.id).length > 0 && (
                      <>
                        <Text style={s.addLabel}>Add Coach:</Text>
                        {getUnassignedCoaches(selectedTeam.id).map(coach => (
                          <View key={coach.id} style={s.addRow}>
                            <Text style={s.addName}>{coach.first_name} {coach.last_name}</Text>
                            <TouchableOpacity style={s.roleBtn} onPress={() => assignCoach(coach, 'head')}>
                              <Text style={s.roleBtnTxt}>Head</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.roleBtn} onPress={() => assignCoach(coach, 'assistant')}>
                              <Text style={s.roleBtnTxt}>Asst</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </>
                    )}
                  </View>

                  {/* Roster Section */}
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>
                      ROSTER ({getTeamPlayers(selectedTeam.id).length}/{selectedTeam.max_players})
                    </Text>
                    {getTeamPlayers(selectedTeam.id).map(player => (
                      <View key={player.id} style={s.memberRow}>
                        <View style={s.avatar}>
                          <Text style={s.avatarText}>{player.first_name[0]}{player.last_name[0]}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.memberName}>{player.first_name} {player.last_name}</Text>
                          <Text style={s.memberRole}>Grade {player.grade}</Text>
                        </View>
                        <TouchableOpacity style={{ marginRight: 8 }} onPress={() => {
                          setSelectedPlayer(player);
                          setShowMoveModal(true);
                        }}>
                          <Ionicons name="swap-horizontal" size={22} color={colors.info} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removePlayer(player)}>
                          <Ionicons name="close-circle" size={24} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Add unassigned players */}
                    {getUnassignedPlayers().length > 0 && getTeamPlayers(selectedTeam.id).length < selectedTeam.max_players && (
                      <>
                        <Text style={s.addLabel}>Add Player:</Text>
                        {getUnassignedPlayers().slice(0, 8).map(player => (
                          <TouchableOpacity key={player.id} style={s.addRow}
                            onPress={() => assignPlayer(player, selectedTeam)}>
                            <Text style={s.addName}>{player.first_name} {player.last_name}</Text>
                            <Text style={s.addMeta}>Gr {player.grade}</Text>
                            <Ionicons name="add-circle" size={24} color={colors.success} />
                          </TouchableOpacity>
                        ))}
                        {getUnassignedPlayers().length > 8 && (
                          <Text style={s.moreText}>+{getUnassignedPlayers().length - 8} more</Text>
                        )}
                      </>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MOVE PLAYER MODAL */}
      {/* ============================================================ */}
      <Modal visible={showMoveModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Move {selectedPlayer?.first_name} to...</Text>
              <TouchableOpacity onPress={() => { setShowMoveModal(false); setSelectedPlayer(null); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {teams.filter(t => t.id !== selectedTeam?.id).map(team => {
                const count = getTeamPlayers(team.id).length;
                return (
                  <TouchableOpacity key={team.id} style={s.moveTeamRow}
                    onPress={() => selectedPlayer && movePlayer(selectedPlayer, team)}>
                    <View style={[s.moveTeamStripe, { backgroundColor: team.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.moveTeamName}>{team.name}</Text>
                      <Text style={s.moveTeamMeta}>{count}/{team.max_players} players</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={24} color={colors.primary} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ================================================================
// STYLES
// ================================================================

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.screenPadding, paddingTop: 0 },

  // Header
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },

  // Alert Banner
  alertText: { fontSize: 14, color: '#E8913A', fontWeight: '500', flex: 1 },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: radii.card, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', gap: 8, ...shadows.card,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },

  // Team Card (inner body — Card wrapper handles outer styling)
  teamBody: { flex: 1 },
  teamTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamName: { ...displayTextStyle, fontSize: 16, color: colors.text },
  recordText: { ...displayTextStyle, fontSize: 14, color: colors.textSecondary },
  teamMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  coachList: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  waiverPill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 6,
  },

  // Empty
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: 4 },

  // Unrostered Section
  unrosteredSection: { marginTop: 12 },
  unrosteredCard: {
    backgroundColor: '#FFF', borderRadius: radii.card, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card,
  },
  unrosteredInfo: { marginBottom: 8 },
  unrosteredName: { fontSize: 15, fontWeight: '600', color: colors.text },
  unrosteredMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  teamPillScroll: { flexGrow: 0 },
  teamPill: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, marginRight: 6,
  },
  teamPillDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  teamPillText: { fontSize: 12, color: colors.text },
  allRostered: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'center' },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card || '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { ...displayTextStyle, fontSize: 20, color: colors.text },
  detailModal: { backgroundColor: colors.card || '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '88%' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailTitle: { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  detailScroll: { flex: 1, padding: 16 },

  syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.info + '15', borderRadius: 12, padding: 12, marginBottom: 16 },
  syncBtnTxt: { fontSize: 14, color: colors.info, fontWeight: '600' },

  section: { backgroundColor: '#FAFAFA', borderRadius: radii.card, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 12, letterSpacing: 1 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  memberName: { fontSize: 15, fontWeight: '600', color: colors.text },
  memberRole: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

  addLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 12, marginBottom: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  addName: { flex: 1, fontSize: 14, color: colors.text },
  addMeta: { fontSize: 12, color: colors.textMuted },
  roleBtn: { backgroundColor: colors.primary + '20', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  roleBtnTxt: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  moreText: { fontSize: 13, color: colors.textMuted, paddingVertical: 8, textAlign: 'center' },

  // Move Player Modal
  moveTeamRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background,
    borderRadius: 12, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: colors.glassBorder,
  },
  moveTeamStripe: { width: 6, alignSelf: 'stretch' },
  moveTeamName: { fontSize: 15, fontWeight: '600', color: colors.text, paddingLeft: 12 },
  moveTeamMeta: { fontSize: 12, color: colors.textMuted, paddingLeft: 12, marginTop: 2 },

  // Form elements
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 8 },
  input: { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 4 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  optionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  optionBtnSel: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  optionBtnTxt: { fontSize: 14, color: colors.text },
  optionBtnTxtSel: { color: colors.primary, fontWeight: '600' },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  typeBtnSel: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  typeBtnTxt: { fontSize: 14, color: colors.text },
  typeBtnTxtSel: { color: colors.primary, fontWeight: '600' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  colorBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  colorBtnSel: { borderWidth: 3, borderColor: colors.text },
  primaryBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  primaryBtnTxt: { color: colors.background, fontSize: 18, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
