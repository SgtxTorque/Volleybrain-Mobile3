import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Coach = { id: string; first_name: string; last_name: string; email: string; phone: string; experience_years: number; specialties: string; status: string; };
type Team = { id: string; name: string; };
type TeamCoach = { id: string; team_id: string; coach_id: string; role: string; };

export default function CoachesScreen() {
  const { workingSeason } = useSeason();
  const { colors } = useTheme();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamCoaches, setTeamCoaches] = useState<TeamCoach[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [creating, setCreating] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState('');
  const [specialties, setSpecialties] = useState('');

  const fetchData = async () => {
    if (!workingSeason) return;
    const { data: c } = await supabase.from('coaches').select('*').eq('season_id', workingSeason.id);
    const { data: t } = await supabase.from('teams').select('*').eq('season_id', workingSeason.id);
    const { data: tc } = await supabase.from('team_coaches').select('*');
    setCoaches(c || []);
    setTeams(t || []);
    setTeamCoaches(tc || []);
  };

  useEffect(() => { fetchData(); }, [workingSeason]);

  const resetForm = () => { setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setExperience(''); setSpecialties(''); };

  const createCoach = async () => {
    if (!firstName.trim() || !lastName.trim()) { Alert.alert('Error', 'Name is required'); return; }
    if (!workingSeason) return;
    setCreating(true);
    const { error } = await supabase.from('coaches').insert({
      season_id: workingSeason.id, first_name: firstName.trim(), last_name: lastName.trim(),
      email: email.trim() || null, phone: phone.trim() || null,
      experience_years: experience ? parseInt(experience) : null, specialties: specialties.trim() || null, status: 'active',
    });
    setCreating(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setShowModal(false); resetForm(); fetchData();
  };

  const deleteCoach = () => {
    if (!selectedCoach) return;
    Alert.alert('Delete Coach', `Delete ${selectedCoach.first_name} ${selectedCoach.last_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('team_coaches').delete().eq('coach_id', selectedCoach.id);
        await supabase.from('coaches').delete().eq('id', selectedCoach.id);
        setShowDetailModal(false); fetchData();
      }},
    ]);
  };

  const getCoachTeams = (coachId: string) => {
    const tcs = teamCoaches.filter(tc => tc.coach_id === coachId);
    return tcs.map(tc => {
      const team = teams.find(t => t.id === tc.team_id);
      return { ...team, role: tc.role };
    }).filter(t => t.name);
  };

  const assignToTeam = async (teamId: string, role: string) => {
    if (!selectedCoach) return;
    const existing = teamCoaches.find(tc => tc.coach_id === selectedCoach.id && tc.team_id === teamId);
    if (existing) {
      await supabase.from('team_coaches').update({ role }).eq('id', existing.id);
    } else {
      await supabase.from('team_coaches').insert({ team_id: teamId, coach_id: selectedCoach.id, role });
    }
    fetchData();
  };

  const removeFromTeam = async (teamId: string) => {
    if (!selectedCoach) return;
    await supabase.from('team_coaches').delete().eq('coach_id', selectedCoach.id).eq('team_id', teamId);
    fetchData();
  };

  const headCount = coaches.filter(c => teamCoaches.some(tc => tc.coach_id === c.id && tc.role === 'head')).length;
  const assistantCount = coaches.filter(c => teamCoaches.some(tc => tc.coach_id === c.id && tc.role === 'assistant')).length;

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} />}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Coaches</Text>
            {workingSeason && <Text style={s.subtitle}>{workingSeason.name}</Text>}
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="add" size={24} color={colors.background} />
          </TouchableOpacity>
        </View>

        <View style={s.statsRow}>
          <View style={s.statBox}><Text style={s.statNum}>{coaches.length}</Text><Text style={s.statLabel}>Total</Text></View>
          <View style={s.statBox}><Text style={s.statNum}>{headCount}</Text><Text style={s.statLabel}>Head</Text></View>
          <View style={s.statBox}><Text style={s.statNum}>{assistantCount}</Text><Text style={s.statLabel}>Assistant</Text></View>
        </View>

        {coaches.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>No coaches added yet</Text></View>
        ) : (
          coaches.map(coach => {
            const coachTeams = getCoachTeams(coach.id);
            return (
              <TouchableOpacity key={coach.id} style={s.coachCard} onPress={() => { setSelectedCoach(coach); setShowDetailModal(true); }}>
                <View style={s.avatar}><Text style={s.initials}>{coach.first_name[0]}{coach.last_name[0]}</Text></View>
                <View style={s.coachInfo}>
                  <Text style={s.coachName}>{coach.first_name} {coach.last_name}</Text>
                  <Text style={s.coachMeta}>
                    {coachTeams.length > 0 ? coachTeams.map(t => `${t.name} (${t.role})`).join(', ') : 'Unassigned'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add Coach</Text>
            <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={s.row}>
            <TextInput style={[s.input, s.half]} placeholder="First Name *" placeholderTextColor={colors.textMuted} value={firstName} onChangeText={setFirstName} />
            <TextInput style={[s.input, s.half]} placeholder="Last Name *" placeholderTextColor={colors.textMuted} value={lastName} onChangeText={setLastName} />
          </View>
          <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={s.input} placeholder="Phone" placeholderTextColor={colors.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput style={s.input} placeholder="Years of Experience" placeholderTextColor={colors.textMuted} value={experience} onChangeText={setExperience} keyboardType="number-pad" />
          <TextInput style={[s.input, s.textArea]} placeholder="Specialties" placeholderTextColor={colors.textMuted} value={specialties} onChangeText={setSpecialties} multiline />

          <TouchableOpacity style={[s.createBtn, creating && s.disabled]} onPress={createCoach} disabled={creating}>
            <Text style={s.createBtnTxt}>{creating ? 'Adding...' : 'Add Coach'}</Text>
          </TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.detailModal}>
          {selectedCoach && (
            <>
              <View style={s.detailHeader}>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={s.detailTitle}>Coach Details</Text>
                <TouchableOpacity onPress={deleteCoach}>
                  <Ionicons name="trash" size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>

              <ScrollView style={s.detailScroll}>
                <View style={s.coachHeader}>
                  <View style={s.avatarLg}><Text style={s.initialsLg}>{selectedCoach.first_name[0]}{selectedCoach.last_name[0]}</Text></View>
                  <Text style={s.coachNameLg}>{selectedCoach.first_name} {selectedCoach.last_name}</Text>
                </View>

                <View style={s.section}>
                  <Text style={s.sectionTitle}>Contact</Text>
                  <Text style={s.detailItem}>{selectedCoach.email || 'No email'}</Text>
                  <Text style={s.detailItem}>{selectedCoach.phone || 'No phone'}</Text>
                </View>

                <View style={s.section}>
                  <Text style={s.sectionTitle}>Team Assignments</Text>
                  {getCoachTeams(selectedCoach.id).length === 0 ? (
                    <Text style={s.emptyText}>Not assigned to any teams</Text>
                  ) : (
                    getCoachTeams(selectedCoach.id).map((team: any, i) => (
                      <View key={i} style={s.teamRow}>
                        <Text style={s.teamName}>{team.name}</Text>
                        <TouchableOpacity style={s.roleToggle} onPress={() => assignToTeam(team.id, team.role === 'head' ? 'assistant' : 'head')}>
                          <Text style={[s.roleText, team.role === 'head' && s.roleHead]}>{team.role === 'head' ? 'Head' : 'Assistant'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeFromTeam(team.id)}>
                          <Ionicons name="close-circle" size={24} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>

                <View style={s.section}>
                  <Text style={s.sectionTitle}>Assign to Team</Text>
                  {teams.filter(t => !getCoachTeams(selectedCoach.id).some((ct: any) => ct.id === t.id)).map(team => (
                    <View key={team.id} style={s.assignRow}>
                      <Text style={s.assignTeam}>{team.name}</Text>
                      <TouchableOpacity style={s.assignBtn} onPress={() => assignToTeam(team.id, 'assistant')}>
                        <Text style={s.assignBtnTxt}>+ Assign</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
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
  coachCard: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  initials: { color: colors.primary, fontSize: 18, fontWeight: 'bold' },
  coachInfo: { flex: 1 },
  coachName: { fontSize: 18, fontWeight: '600', color: colors.text },
  coachMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  input: { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  createBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  createBtnTxt: { color: colors.background, fontSize: 18, fontWeight: 'bold' },
  disabled: { opacity: 0.5 },
  detailModal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  detailScroll: { flex: 1, padding: 16 },
  coachHeader: { alignItems: 'center', marginBottom: 24 },
  avatarLg: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  initialsLg: { color: colors.primary, fontSize: 32, fontWeight: 'bold' },
  coachNameLg: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  section: { backgroundColor: colors.background, borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 1 },
  detailItem: { fontSize: 14, color: colors.text, marginBottom: 4 },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.card },
  teamName: { flex: 1, fontSize: 14, color: colors.text },
  roleToggle: { backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 12 },
  roleText: { fontSize: 12, color: colors.textMuted },
  roleHead: { color: colors.primary, fontWeight: 'bold' },
  assignRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.card },
  assignTeam: { fontSize: 14, color: colors.text },
  assignBtn: { backgroundColor: colors.success + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  assignBtnTxt: { fontSize: 12, color: colors.success, fontWeight: '600' },
});