import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Team = {
  id: string;
  name: string;
  color: string | null;
};

type JerseyAssignment = {
  id: string;
  player_id: string;
  player_name: string;
  first_name: string;
  last_name: string;
  jersey_number: number;
  jersey_pref_1: number | null;
  jersey_pref_2: number | null;
  jersey_pref_3: number | null;
  needs_jersey_order: boolean;
  status: string;
};

type JerseyAlert = {
  player_id: string;
  player_name: string;
  jersey_number: number;
  alert_type: 'warning' | 'info' | 'success';
  alert_message: string;
  assignment_reason: string;
};

export default function JerseyManagementScreen() {
  const { colors } = useTheme();
  const { workingSeason } = useSeason();
  const { user } = useAuth();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [assignments, setAssignments] = useState<JerseyAssignment[]>([]);
  const [alerts, setAlerts] = useState<JerseyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [editingPlayer, setEditingPlayer] = useState<JerseyAssignment | null>(null);
  const [newNumber, setNewNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const s = createStyles(colors);

  useEffect(() => {
    if (workingSeason) {
      fetchTeams();
    }
  }, [workingSeason?.id]);

  useEffect(() => {
    if (selectedTeam) {
      fetchAssignments();
      fetchAlerts();
    }
  }, [selectedTeam?.id]);

  const fetchTeams = async () => {
    if (!workingSeason) return;
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, color')
        .eq('season_id', workingSeason.id)
        .order('name');

      if (error) throw error;
      setTeams(data || []);
      
      if (data && data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0]);
      }
    } catch (err) {
      if (__DEV__) console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!selectedTeam) return;

    try {
      const { data, error } = await supabase
        .from('v_jersey_status')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .eq('status', 'active')
        .order('jersey_number');

      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      if (__DEV__) console.error('Error fetching assignments:', err);
    }
  };

  const fetchAlerts = async () => {
    if (!selectedTeam) return;

    try {
      const { data, error } = await supabase
        .from('v_jersey_alerts')
        .select('*')
        .eq('team_id', selectedTeam.id);

      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      if (__DEV__) console.error('Error fetching alerts:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAssignments();
    await fetchAlerts();
    setRefreshing(false);
  };

  const handleChangeNumber = async () => {
    if (!editingPlayer || !newNumber || !selectedTeam || !user) return;

    const num = parseInt(newNumber);
    if (isNaN(num) || num < 1 || num > 99) {
      Alert.alert('Invalid Number', 'Please enter a number between 1 and 99');
      return;
    }

    const existing = assignments.find(a => 
      a.jersey_number === num && a.player_id !== editingPlayer.player_id
    );
    if (existing) {
      Alert.alert(
        'Number Taken', 
        `#${num} is already assigned to ${existing.player_name}. Choose a different number.`
      );
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('assign_jersey', {
        p_player_id: editingPlayer.player_id,
        p_team_id: selectedTeam.id,
        p_jersey_number: num,
        p_assigned_by: user.id,
        p_reason: 'Admin manual change'
      });

      if (error) throw error;

      Alert.alert('Success', `Changed ${editingPlayer.first_name}'s number to #${num}`);
      setEditingPlayer(null);
      setNewNumber('');
      onRefresh();
    } catch (err: any) {
      if (__DEV__) console.error('Error changing number:', err);
      Alert.alert('Error', err.message || 'Failed to change jersey number');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkOrdered = async (assignment: JerseyAssignment) => {
    try {
      const { error } = await supabase
        .from('jersey_assignments')
        .update({ 
          needs_jersey_order: false,
          jersey_ordered_at: new Date().toISOString()
        })
        .eq('id', assignment.id);

      if (error) throw error;
      onRefresh();
    } catch (err) {
      if (__DEV__) console.error('Error marking ordered:', err);
    }
  };

  const renderNumberGrid = () => {
    const numbers = Array.from({ length: 99 }, (_, i) => i + 1);
    const assignmentMap: Record<number, JerseyAssignment> = {};
    assignments.forEach(a => { assignmentMap[a.jersey_number] = a; });

    return (
      <View style={s.numberGrid}>
        {numbers.map(num => {
          const assignment = assignmentMap[num];
          const isAssigned = !!assignment;
          const needsOrder = assignment?.needs_jersey_order;

          return (
            <TouchableOpacity
              key={num}
              style={[
                s.numberCell,
                isAssigned && s.numberCellAssigned,
                needsOrder && s.numberCellNeedsOrder,
              ]}
              onPress={() => {
                if (assignment) {
                  setEditingPlayer(assignment);
                  setNewNumber(assignment.jersey_number.toString());
                }
              }}
            >
              <Text style={[
                s.numberText,
                isAssigned && s.numberTextAssigned
              ]}>
                {num}
              </Text>
              {isAssigned && (
                <Text style={s.numberInitials} numberOfLines={1}>
                  {assignment.first_name.charAt(0)}{assignment.last_name.charAt(0)}
                </Text>
              )}
              {needsOrder && (
                <View style={s.orderDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderPlayerList = () => (
    <View style={s.playerList}>
      {assignments.map(assignment => {
        const gotPref1 = assignment.jersey_number === assignment.jersey_pref_1;
        const gotPref2 = assignment.jersey_number === assignment.jersey_pref_2;
        const gotPref3 = assignment.jersey_number === assignment.jersey_pref_3;
        const gotNoPref = !gotPref1 && !gotPref2 && !gotPref3;

        return (
          <TouchableOpacity
            key={assignment.id}
            style={s.playerRow}
            onPress={() => {
              setEditingPlayer(assignment);
              setNewNumber(assignment.jersey_number.toString());
            }}
          >
            <View style={[
              s.jerseyBadge,
              { backgroundColor: selectedTeam?.color || colors.primary }
            ]}>
              <Text style={s.jerseyBadgeText}>{assignment.jersey_number}</Text>
            </View>

            <View style={s.playerInfo}>
              <Text style={s.playerName}>{assignment.player_name}</Text>
              <Text style={s.prefText}>
                Prefs: {assignment.jersey_pref_1 || '-'}, {assignment.jersey_pref_2 || '-'}, {assignment.jersey_pref_3 || '-'}
                {gotPref1 && ' ✓ Got 1st'}
                {gotPref2 && ' • Got 2nd'}
                {gotPref3 && ' • Got 3rd'}
                {gotNoPref && ' ⚠️ Auto'}
              </Text>
            </View>

            <View style={s.playerActions}>
              {assignment.needs_jersey_order ? (
                <TouchableOpacity
                  style={s.orderBtn}
                  onPress={() => handleMarkOrdered(assignment)}
                >
                  <Ionicons name="shirt-outline" size={16} color={colors.warning} />
                  <Text style={s.orderBtnText}>Order</Text>
                </TouchableOpacity>
              ) : (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              )}
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        );
      })}

      {assignments.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="shirt-outline" size={48} color={colors.textMuted} />
          <Text style={s.emptyText}>No jersey assignments yet</Text>
          <Text style={s.emptySubtext}>Add players to this team to auto-assign jerseys</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Jersey Numbers</Text>
          <Text style={s.subtitle}>
            {selectedTeam?.name || 'Select a team'} • {assignments.length} assigned
          </Text>
        </View>
      </View>

      {alerts.length > 0 && (
        <View style={s.alertBanner}>
          <Ionicons name="alert-circle" size={20} color={colors.warning} />
          <Text style={s.alertBannerText}>
            {alerts.filter(a => a.alert_type === 'warning').length} players need review • {alerts.filter(a => a.alert_type === 'info').length} jerseys to order
          </Text>
        </View>
      )}

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={s.teamSelector}
      >
        {teams.map(team => (
          <TouchableOpacity
            key={team.id}
            style={[
              s.teamChip,
              selectedTeam?.id === team.id && s.teamChipActive,
              { borderColor: team.color || colors.border }
            ]}
            onPress={() => setSelectedTeam(team)}
          >
            {team.color && (
              <View style={[s.teamDot, { backgroundColor: team.color }]} />
            )}
            <Text style={[
              s.teamChipText,
              selectedTeam?.id === team.id && s.teamChipTextActive
            ]}>
              {team.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.viewToggle}>
        <TouchableOpacity
          style={[s.viewBtn, viewMode === 'grid' && s.viewBtnActive]}
          onPress={() => setViewMode('grid')}
        >
          <Ionicons name="grid" size={18} color={viewMode === 'grid' ? colors.primary : colors.textMuted} />
          <Text style={[s.viewBtnText, viewMode === 'grid' && s.viewBtnTextActive]}>Grid</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.viewBtn, viewMode === 'list' && s.viewBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="list" size={18} color={viewMode === 'list' ? colors.primary : colors.textMuted} />
          <Text style={[s.viewBtnText, viewMode === 'list' && s.viewBtnTextActive]}>List</Text>
        </TouchableOpacity>
      </View>

      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors.card }]} />
          <Text style={s.legendText}>Available</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={s.legendText}>Assigned</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={s.legendText}>Needs Order</Text>
        </View>
      </View>

      <ScrollView
        style={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {viewMode === 'grid' ? renderNumberGrid() : renderPlayerList()}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={!!editingPlayer} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Jersey Number</Text>
              <TouchableOpacity onPress={() => { setEditingPlayer(null); setNewNumber(''); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {editingPlayer && (
              <View style={s.modalContent}>
                <Text style={s.modalPlayerName}>{editingPlayer.player_name}</Text>
                
                <Text style={s.modalLabel}>Preferences</Text>
                <View style={s.prefRow}>
                  <View style={[s.prefBadge, editingPlayer.jersey_pref_1 === editingPlayer.jersey_number && s.prefBadgeActive]}>
                    <Text style={s.prefBadgeText}>1st: {editingPlayer.jersey_pref_1 || '-'}</Text>
                  </View>
                  <View style={[s.prefBadge, editingPlayer.jersey_pref_2 === editingPlayer.jersey_number && s.prefBadgeActive]}>
                    <Text style={s.prefBadgeText}>2nd: {editingPlayer.jersey_pref_2 || '-'}</Text>
                  </View>
                  <View style={[s.prefBadge, editingPlayer.jersey_pref_3 === editingPlayer.jersey_number && s.prefBadgeActive]}>
                    <Text style={s.prefBadgeText}>3rd: {editingPlayer.jersey_pref_3 || '-'}</Text>
                  </View>
                </View>

                <Text style={s.modalLabel}>Assigned Number</Text>
                <TextInput
                  style={s.numberInput}
                  value={newNumber}
                  onChangeText={setNewNumber}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="1-99"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={s.modalLabel}>Quick Pick (Available)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.quickPickRow}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,20,21,22,23,24,25].map(num => {
                      const isTaken = assignments.some(a => 
                        a.jersey_number === num && a.player_id !== editingPlayer.player_id
                      );
                      if (isTaken) return null;
                      return (
                        <TouchableOpacity
                          key={num}
                          style={s.quickPickBtn}
                          onPress={() => setNewNumber(num.toString())}
                        >
                          <Text style={s.quickPickText}>{num}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={[s.saveBtn, saving && s.saveBtnDisabled]}
                  onPress={handleChangeNumber}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.primary, marginTop: 2 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warning + '20', paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 16, borderRadius: 10, marginBottom: 12, gap: 8 },
  alertBannerText: { fontSize: 13, color: colors.warning, flex: 1 },
  teamSelector: { paddingHorizontal: 16, marginBottom: 12, maxHeight: 44 },
  teamChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1.5, borderColor: colors.border },
  teamChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  teamChipText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  teamChipTextActive: { color: colors.primary, fontWeight: '600' },
  teamDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  viewToggle: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: colors.card, borderRadius: 10, padding: 4, marginBottom: 12 },
  viewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 6 },
  viewBtnActive: { backgroundColor: colors.primary + '20' },
  viewBtnText: { fontSize: 14, color: colors.textMuted },
  viewBtnTextActive: { color: colors.primary, fontWeight: '600' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 12, paddingHorizontal: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 12, color: colors.textMuted },
  content: { flex: 1 },
  numberGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, justifyContent: 'center' },
  numberCell: { width: 38, height: 44, margin: 3, borderRadius: 8, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  numberCellAssigned: { backgroundColor: colors.primary, borderColor: colors.primary },
  numberCellNeedsOrder: { borderColor: colors.warning, borderWidth: 2 },
  numberText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  numberTextAssigned: { color: '#fff' },
  numberInitials: { fontSize: 8, color: 'rgba(255,255,255,0.8)', marginTop: -2 },
  orderDot: { position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning },
  playerList: { paddingHorizontal: 16 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glassCard, padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.glassBorder },
  jerseyBadge: { width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  jerseyBadgeText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 16, fontWeight: '600', color: colors.text },
  prefText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  playerActions: { marginRight: 8 },
  orderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warning + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  orderBtnText: { fontSize: 11, color: colors.warning, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  modalContent: {},
  modalPlayerName: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 20 },
  modalLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '700', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' as const, letterSpacing: 1 },
  prefRow: { flexDirection: 'row', gap: 8 },
  prefBadge: { backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  prefBadgeActive: { backgroundColor: colors.success + '20', borderColor: colors.success },
  prefBadgeText: { fontSize: 13, color: colors.text },
  numberInput: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 32, fontWeight: 'bold', color: colors.text, textAlign: 'center', borderWidth: 2, borderColor: colors.primary },
  quickPickRow: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  quickPickBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  quickPickText: { fontSize: 14, fontWeight: '600', color: colors.text },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
