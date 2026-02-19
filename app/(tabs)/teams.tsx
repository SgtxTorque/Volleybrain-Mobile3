import { useAuth } from '@/lib/auth';
import { addAdminToTeamChats, addCoachToTeamChats, addParentToTeamChats, createTeamChats, getProfileByEmail, syncTeamChats } from '@/lib/chat-utils';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Team = { id: string; name: string; team_type: string; color: string; max_players: number; age_group_id: string; };
type AgeGroup = { id: string; name: string; display_order: number; };
type Player = { id: string; first_name: string; last_name: string; grade: number; status: string; parent_name: string; parent_email: string; };
type TeamPlayer = { id: string; team_id: string; player_id: string; jersey_number: number; };
type Coach = { id: string; first_name: string; last_name: string; email: string; };
type TeamCoach = { id: string; team_id: string; coach_id: string; role: string; };

export default function TeamsScreen() {
  const { profile } = useAuth();
  const { workingSeason } = useSeason();
  const { colors } = useTheme();
  const [teams, setTeams] = useState<Team[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [teamCoaches, setTeamCoaches] = useState<TeamCoach[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [teamType, setTeamType] = useState('development');
  const [teamColor, setTeamColor] = useState('#FFD700');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string | null>(null);

  const fetchData = async () => {
    if (!workingSeason) return;
    const { data: t } = await supabase.from('teams').select('*').eq('season_id', workingSeason.id).order('name');
    const { data: ag } = await supabase.from('age_groups').select('*').eq('season_id', workingSeason.id).order('display_order');
    const { data: p } = await supabase.from('players').select('id, first_name, last_name, grade, status, parent_name, parent_email').eq('season_id', workingSeason.id);
    const { data: c } = await supabase.from('coaches').select('id, first_name, last_name, email').eq('season_id', workingSeason.id);
    const { data: tp } = await supabase.from('team_players').select('*');
    const { data: tc } = await supabase.from('team_coaches').select('*');
    setTeams(t || []);
    setAgeGroups(ag || []);
    setPlayers(p || []);
    setCoaches(c || []);
    setTeamPlayers(tp || []);
    setTeamCoaches(tc || []);
  };

  useEffect(() => { fetchData(); }, [workingSeason]);

  const resetForm = () => {
    setTeamName(''); setTeamType('development'); setTeamColor('#FFD700'); setSelectedAgeGroup(null);
  };

  const createTeam = async () => {
    if (!teamName.trim() || !selectedAgeGroup) { Alert.alert('Error', 'Please fill all fields'); return; }
    if (!workingSeason || !profile) return;
    setCreating(true);

    const { data: newTeam, error } = await supabase.from('teams').insert({
      season_id: workingSeason.id,
      age_group_id: selectedAgeGroup,
      name: teamName.trim(),
      team_type: teamType,
      color: teamColor,
      max_players: 12,
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
    setShowModal(false);
    resetForm();
    fetchData();
    Alert.alert('Success', 'Team created with chat channels!');
  };

  const deleteTeam = (team: Team) => {
    Alert.alert('Delete Team', `Delete "${team.name}"? This will also delete associated chats.`, [
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

  const syncChats = async (team: Team) => {
    if (!workingSeason || !profile) return;
    setSyncing(true);
    
    const result = await syncTeamChats(
  workingSeason.id,
  team.id,
  team.name,
  profile.id,
  profile.full_name || 'Admin'
);
    
    setSyncing(false);
    
    if (result.success) {
      let message = `✅ Added ${result.added.length} members:\n`;
      message += result.added.join('\n');
      
      if (result.pending.length > 0) {
        message += `\n\n⏳ Pending signup (${result.pending.length}):\n`;
        message += result.pending.join('\n');
      }
      
      Alert.alert('Sync Complete', message);
    } else {
      Alert.alert('Error', 'Failed to sync team chats.');
    }
  };

  const getTeamPlayers = (teamId: string) => {
    const tpIds = teamPlayers.filter(tp => tp.team_id === teamId).map(tp => tp.player_id);
    return players.filter(p => tpIds.includes(p.id));
  };

  const getTeamCoaches = (teamId: string) => {
    const tcIds = teamCoaches.filter(tc => tc.team_id === teamId);
    return tcIds.map(tc => {
      const coach = coaches.find(c => c.id === tc.coach_id);
      return { ...coach, role: tc.role };
    }).filter(c => c.first_name);
  };

  const getUnassignedPlayers = () => {
    const assignedIds = teamPlayers.map(tp => tp.player_id);
    return players.filter(p => !assignedIds.includes(p.id));
  };

  const getUnassignedCoaches = (teamId: string) => {
    const assignedIds = teamCoaches.filter(tc => tc.team_id === teamId).map(tc => tc.coach_id);
    return coaches.filter(c => !assignedIds.includes(c.id));
  };

const assignPlayer = async (player: Player) => {
    if (!selectedTeam || !workingSeason || !profile) return;

    const { error } = await supabase.from('team_players').insert({
      team_id: selectedTeam.id,
      player_id: player.id,
      is_primary_team: true,
    });

    if (error) { Alert.alert('Error', error.message); return; }

    await supabase.from('players').update({ status: 'assigned' }).eq('id', player.id);

    // Auto-add parent to chats if they have an account
    if (player.parent_email) {
      const chats = await createTeamChats({
        seasonId: workingSeason.id,
        teamId: selectedTeam.id,
        teamName: selectedTeam.name,
        createdBy: profile.id,
      });

      if (chats) {
        const parentProfile = await getProfileByEmail(player.parent_email);
        
        if (parentProfile !== null && parentProfile.id) {
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
    Alert.alert('Success', `${player.first_name} added to team!`);
  };

  const removePlayer = async (player: Player) => {
    if (!selectedTeam) return;
    Alert.alert('Remove Player', `Remove ${player.first_name} from ${selectedTeam.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('team_players').delete().eq('team_id', selectedTeam.id).eq('player_id', player.id);
        await supabase.from('players').update({ status: 'new' }).eq('id', player.id);
        fetchData();
      }},
    ]);
  };

  const assignCoach = async (coach: Coach, role: string) => {
    if (!selectedTeam || !workingSeason || !profile) return;

    const { error } = await supabase.from('team_coaches').insert({
      team_id: selectedTeam.id,
      coach_id: coach.id,
      role: role,
    });

    if (error) { Alert.alert('Error', error.message); return; }

    // Auto-add coach to chats if they have an account
    if (coach.email) {
      const chats = await createTeamChats({
        seasonId: workingSeason.id,
        teamId: selectedTeam.id,
        teamName: selectedTeam.name,
        createdBy: profile.id,
      });

      if (chats) {
        const coachProfile = await getProfileByEmail(coach.email);
        
        if (coachProfile !== null && coachProfile.id) {
          await addCoachToTeamChats({
            coachId: coachProfile.id,
            coachName: coachProfile.full_name || `${coach.first_name} ${coach.last_name}`,
            teamChatId: chats.teamChatId,
            playerChatId: chats.playerChatId,
            isHead: role === 'head',
          });
        }
      }
    }

    fetchData();
    Alert.alert('Success', `Coach added to team!`);
  };

  const removeCoach = async (coachId: string) => {
    if (!selectedTeam) return;
    await supabase.from('team_coaches').delete().eq('team_id', selectedTeam.id).eq('coach_id', coachId);
    fetchData();
  };

  const getAgeGroupName = (ageGroupId: string) => {
    return ageGroups.find(ag => ag.id === ageGroupId)?.name || '';
  };

  const teamColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#9B59B6', '#3498DB', '#E67E22'];

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} />}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Teams</Text>
            {workingSeason && <Text style={s.subtitle}>{workingSeason.name}</Text>}
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="add" size={24} color={colors.background} />
          </TouchableOpacity>
        </View>

        <View style={s.statsRow}>
          <View style={s.statBox}><Text style={s.statNum}>{teams.length}</Text><Text style={s.statLabel}>Teams</Text></View>
          <View style={s.statBox}><Text style={s.statNum}>{teamPlayers.length}</Text><Text style={s.statLabel}>Assigned</Text></View>
          <View style={s.statBox}><Text style={s.statNum}>{getUnassignedPlayers().length}</Text><Text style={s.statLabel}>Unassigned</Text></View>
        </View>

        {teams.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>No teams created yet</Text></View>
        ) : (
          teams.map(team => {
            const roster = getTeamPlayers(team.id);
            const teamCoachesList = getTeamCoaches(team.id);
            return (
              <TouchableOpacity key={team.id} style={s.teamCard} onPress={() => { setSelectedTeam(team); setShowDetailModal(true); }}>
                <View style={[s.teamColor, { backgroundColor: team.color }]} />
                <View style={s.teamInfo}>
                  <Text style={s.teamName}>{team.name}</Text>
                  <Text style={s.teamMeta}>{getAgeGroupName(team.age_group_id)} • {team.team_type} • {roster.length}/{team.max_players} players</Text>
                  {teamCoachesList.length > 0 && (
                    <Text style={s.coachList}>{teamCoachesList.map(c => `${c.role === 'head' ? '👑 ' : ''}${c.first_name}`).join(', ')}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Create Team Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Create Team</Text>
            <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.label}>Team Name</Text>
            <TextInput style={s.input} placeholder="e.g., Eagles 12U Elite" placeholderTextColor={colors.textMuted} value={teamName} onChangeText={setTeamName} />

            <Text style={s.label}>Age Group</Text>
            <View style={s.optionRow}>
              {ageGroups.map(ag => (
                <TouchableOpacity key={ag.id} style={[s.optionBtn, selectedAgeGroup === ag.id && s.optionBtnSel]} onPress={() => setSelectedAgeGroup(ag.id)}>
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
                <TouchableOpacity key={c} style={[s.colorBtn, { backgroundColor: c }, teamColor === c && s.colorBtnSel]} onPress={() => setTeamColor(c)}>
                  {teamColor === c && <Ionicons name="checkmark" size={18} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[s.createBtn, creating && s.disabled]} onPress={createTeam} disabled={creating}>
              <Text style={s.createBtnTxt}>{creating ? 'Creating...' : 'Create Team'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View></View>
      </Modal>

      {/* Team Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.detailModal}>
          {selectedTeam && (
            <>
              <View style={s.detailHeader}>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={s.detailTitle}>{selectedTeam.name}</Text>
                <TouchableOpacity onPress={() => deleteTeam(selectedTeam)}>
                  <Ionicons name="trash" size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>

              <ScrollView style={s.detailScroll}>
                <TouchableOpacity style={s.syncBtn} onPress={() => syncChats(selectedTeam)} disabled={syncing}>
                  <Ionicons name="chatbubbles" size={18} color={colors.info} />
                  <Text style={s.syncBtnTxt}>{syncing ? 'Syncing...' : 'Sync Team Chats'}</Text>
                </TouchableOpacity>

                <View style={s.section}>
                  <Text style={s.sectionTitle}>Coaches ({getTeamCoaches(selectedTeam.id).length})</Text>
                  {getTeamCoaches(selectedTeam.id).map((coach: any) => (
                    <View key={coach.id} style={s.memberRow}>
                      <View style={s.memberAvatar}><Text style={s.memberInitials}>{coach.first_name?.[0]}{coach.last_name?.[0]}</Text></View>
                      <View style={s.memberInfo}>
                        <Text style={s.memberName}>{coach.first_name} {coach.last_name}</Text>
                        <Text style={s.memberRole}>{coach.role === 'head' ? '👑 Head Coach' : 'Assistant'}</Text>
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

                <View style={s.section}>
                  <Text style={s.sectionTitle}>Roster ({getTeamPlayers(selectedTeam.id).length}/{selectedTeam.max_players})</Text>
                  {getTeamPlayers(selectedTeam.id).map(player => (
                    <View key={player.id} style={s.memberRow}>
                      <View style={s.memberAvatar}><Text style={s.memberInitials}>{player.first_name[0]}{player.last_name[0]}</Text></View>
                      <View style={s.memberInfo}>
                        <Text style={s.memberName}>{player.first_name} {player.last_name}</Text>
                        <Text style={s.memberRole}>Grade {player.grade}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removePlayer(player)}>
                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {getUnassignedPlayers().length > 0 && getTeamPlayers(selectedTeam.id).length < selectedTeam.max_players && (
                    <>
                      <Text style={s.addLabel}>Add Player:</Text>
                      {getUnassignedPlayers().slice(0, 5).map(player => (
                        <TouchableOpacity key={player.id} style={s.addRow} onPress={() => assignPlayer(player)}>
                          <Text style={s.addName}>{player.first_name} {player.last_name}</Text>
                          <Text style={s.addMeta}>Gr {player.grade}</Text>
                          <Ionicons name="add-circle" size={24} color={colors.success} />
                        </TouchableOpacity>
                      ))}
                      {getUnassignedPlayers().length > 5 && (
                        <Text style={s.moreText}>+{getUnassignedPlayers().length - 5} more available</Text>
                      )}
                    </>
                  )}
                </View>
              </ScrollView>
            </>
          )}
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.primary, marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: colors.glassCard, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  statNum: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { color: colors.textMuted, fontSize: 16 },
  teamCard: { backgroundColor: colors.glassCard, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  teamColor: { width: 6, height: '100%', position: 'absolute', left: 0 },
  teamInfo: { flex: 1, padding: 16, paddingLeft: 20 },
  teamName: { fontSize: 18, fontWeight: '600', color: colors.text },
  teamMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  coachList: { fontSize: 12, color: colors.primary, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '700', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' as const, letterSpacing: 1 },
  input: { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { backgroundColor: colors.background, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  optionBtnSel: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  optionBtnTxt: { fontSize: 14, color: colors.text },
  optionBtnTxtSel: { color: colors.primary, fontWeight: '600' },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, backgroundColor: colors.background, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  typeBtnSel: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  typeBtnTxt: { fontSize: 14, color: colors.text },
  typeBtnTxtSel: { color: colors.primary, fontWeight: '600' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  colorBtnSel: { borderWidth: 3, borderColor: colors.text },
  createBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  createBtnTxt: { color: colors.background, fontSize: 18, fontWeight: 'bold' },
  disabled: { opacity: 0.5 },
  detailModal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '90%' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  detailScroll: { flex: 1, padding: 16 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.info + '20', padding: 14, borderRadius: 12, marginBottom: 16 },
  syncBtnTxt: { color: colors.info, fontSize: 16, fontWeight: '600' },
  section: { backgroundColor: colors.background, borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.card },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberInitials: { color: colors.primary, fontSize: 14, fontWeight: 'bold' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '500', color: colors.text },
  memberRole: { fontSize: 13, color: colors.textMuted },
  addLabel: { fontSize: 13, color: colors.textMuted, marginTop: 16, marginBottom: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.card },
  addName: { flex: 1, fontSize: 14, color: colors.text },
  addMeta: { fontSize: 12, color: colors.textMuted, marginRight: 12 },
  roleBtn: { backgroundColor: colors.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginLeft: 8 },
  roleBtnTxt: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  moreText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 12 },
});