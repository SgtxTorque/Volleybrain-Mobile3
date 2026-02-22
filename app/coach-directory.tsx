import AdminContextBar from '@/components/AdminContextBar';
import AppHeaderBar from '@/components/ui/AppHeaderBar';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ================================================================
// TYPES
// ================================================================

type Coach = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  experience_years: number | null;
  specialties: string | null;
  status: string;
  coaching_level: string | null;
  background_check_status: string | null;
  background_check_date: string | null;
  background_check_expiry: string | null;
  certifications: any;
  waiver_signed: boolean | null;
  code_of_conduct_signed: boolean | null;
  photo_url: string | null;
};

type Team = { id: string; name: string; color: string; };
type TeamCoach = { id: string; team_id: string; coach_id: string; role: string; };
type FilterType = 'all' | 'active' | 'unassigned';

// ================================================================
// COMPONENT
// ================================================================

export default function CoachDirectoryScreen() {
  const { workingSeason } = useSeason();
  const { colors } = useTheme();
  const router = useRouter();

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamCoaches, setTeamCoaches] = useState<TeamCoach[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  // ================================================================
  // DATA FETCHING
  // ================================================================

  const fetchData = useCallback(async () => {
    if (!workingSeason) return;
    const [cRes, tRes, tcRes] = await Promise.all([
      supabase.from('coaches')
        .select('id, first_name, last_name, email, phone, experience_years, specialties, status, coaching_level, background_check_status, background_check_date, background_check_expiry, certifications, waiver_signed, code_of_conduct_signed, photo_url')
        .eq('season_id', workingSeason.id),
      supabase.from('teams').select('id, name, color').eq('season_id', workingSeason.id).order('name'),
      supabase.from('team_coaches').select('*'),
    ]);
    setCoaches(cRes.data || []);
    setTeams(tRes.data || []);
    setTeamCoaches(tcRes.data || []);
  }, [workingSeason]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ================================================================
  // COMPUTED HELPERS
  // ================================================================

  const getCoachTeams = (coachId: string) => {
    const tcs = teamCoaches.filter(tc => tc.coach_id === coachId);
    return tcs.map(tc => {
      const team = teams.find(t => t.id === tc.team_id);
      return team ? { ...team, role: tc.role, tcId: tc.id } : null;
    }).filter(Boolean) as (Team & { role: string; tcId: string })[];
  };

  const isAssigned = (coachId: string) => teamCoaches.some(tc => tc.coach_id === coachId);

  const filteredCoaches = coaches.filter(coach => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = `${coach.first_name} ${coach.last_name}`.toLowerCase();
      if (!name.includes(q) && !(coach.email || '').toLowerCase().includes(q)) return false;
    }
    if (filterType === 'active') return coach.status === 'active';
    if (filterType === 'unassigned') return !isAssigned(coach.id);
    return true;
  });

  const activeCount = coaches.filter(c => c.status === 'active').length;
  const unassignedCount = coaches.filter(c => !isAssigned(c.id)).length;

  // ================================================================
  // OPERATIONS
  // ================================================================

  const assignToTeam = async (coachId: string, teamId: string, role: string) => {
    const existing = teamCoaches.find(tc => tc.coach_id === coachId && tc.team_id === teamId);
    if (existing) {
      await supabase.from('team_coaches').update({ role }).eq('id', existing.id);
    } else {
      const { error } = await supabase.from('team_coaches').insert({ team_id: teamId, coach_id: coachId, role });
      if (error) { Alert.alert('Error', error.message); return; }
    }
    fetchData();
  };

  const removeFromTeam = async (coachId: string, teamId: string) => {
    Alert.alert('Remove Coach', 'Remove this coach from the team?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('team_coaches').delete().eq('coach_id', coachId).eq('team_id', teamId);
        fetchData();
      }},
    ]);
  };

  // ================================================================
  // HELPERS
  // ================================================================

  const getBgCheckBadge = (status: string | null) => {
    switch (status) {
      case 'passed': case 'cleared':
        return { icon: 'shield-checkmark' as const, color: '#34C759', label: 'Cleared' };
      case 'pending':
        return { icon: 'time' as const, color: '#FF9500', label: 'Pending' };
      case 'failed': case 'expired':
        return { icon: 'close-circle' as const, color: '#FF3B30', label: status === 'expired' ? 'Expired' : 'Failed' };
      default:
        return { icon: 'remove-circle-outline' as const, color: colors.textMuted, label: 'Not Started' };
    }
  };

  const getCertifications = (certs: any): string[] => {
    if (!certs) return [];
    if (Array.isArray(certs)) {
      return certs.map((c: any) => (typeof c === 'string' ? c : c.name || c.type || '')).filter(Boolean);
    }
    if (typeof certs === 'string') {
      try {
        const parsed = JSON.parse(certs);
        return getCertifications(parsed);
      } catch { return [certs]; }
    }
    return [];
  };

  // ================================================================
  // RENDER
  // ================================================================

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Coach Directory</Text>
            {workingSeason && <Text style={s.subtitle}>{workingSeason.name}</Text>}
          </View>
        </View>

        <AdminContextBar />

        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{coaches.length}</Text>
            <Text style={s.statLabel}>Total</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{activeCount}</Text>
            <Text style={s.statLabel}>Active</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statNum, unassignedCount > 0 && { color: colors.warning }]}>
              {unassignedCount}
            </Text>
            <Text style={s.statLabel}>Unassigned</Text>
          </View>
        </View>

        {/* Search */}
        <View style={s.searchRow}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput style={s.searchInput} placeholder="Search by name or email..."
            placeholderTextColor={colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {([
            { key: 'all' as FilterType, label: `All (${coaches.length})` },
            { key: 'active' as FilterType, label: `Active (${activeCount})` },
            { key: 'unassigned' as FilterType, label: `Unassigned (${unassignedCount})` },
          ]).map(f => (
            <TouchableOpacity key={f.key}
              style={[s.filterPill, filterType === f.key && s.filterPillActive]}
              onPress={() => setFilterType(f.key)}>
              <Text style={[s.filterPillText, filterType === f.key && s.filterPillTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Coach Cards */}
        {filteredCoaches.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyTitle}>
              {coaches.length === 0 ? 'No coaches found' : 'No matches'}
            </Text>
            <Text style={s.emptySubtext}>
              {coaches.length === 0 ? 'Invite coaches from the dashboard' : 'Try adjusting your search or filter'}
            </Text>
          </View>
        ) : (
          filteredCoaches.map(coach => {
            const coachTeams = getCoachTeams(coach.id);
            const bgCheck = getBgCheckBadge(coach.background_check_status);
            const certs = getCertifications(coach.certifications);

            return (
              <TouchableOpacity key={coach.id} style={s.coachCard}
                onPress={() => { setSelectedCoach(coach); setShowDetailModal(true); }}>
                <View style={s.cardContent}>
                  {/* Avatar */}
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{coach.first_name[0]}{coach.last_name[0]}</Text>
                  </View>

                  {/* Info */}
                  <View style={s.cardInfo}>
                    <View style={s.cardNameRow}>
                      <Text style={s.coachName}>{coach.first_name} {coach.last_name}</Text>
                      {coach.coaching_level && (
                        <Text style={s.levelText}>{coach.coaching_level}</Text>
                      )}
                    </View>

                    {/* Contact */}
                    <View style={s.contactRow}>
                      {coach.email && (
                        <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL('mailto:' + coach.email)}>
                          <Ionicons name="mail-outline" size={14} color={colors.info} />
                          <Text style={s.contactText} numberOfLines={1}>{coach.email}</Text>
                        </TouchableOpacity>
                      )}
                      {coach.phone && (
                        <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL('tel:' + coach.phone)}>
                          <Ionicons name="call-outline" size={14} color={colors.success} />
                          <Text style={s.contactText}>{coach.phone}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Team Pills */}
                    {coachTeams.length > 0 && (
                      <View style={s.teamPillsRow}>
                        {coachTeams.map(t => (
                          <View key={t.id} style={[s.teamPill, { backgroundColor: t.color + '20', borderColor: t.color }]}>
                            <Text style={[s.teamPillText, { color: t.color }]}>{t.name}</Text>
                            {t.role === 'head' && <Text style={{ fontSize: 10, marginLeft: 2 }}>{'\uD83D\uDC51'}</Text>}
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Badges Row */}
                    <View style={s.badgesRow}>
                      <View style={[s.badge, { backgroundColor: bgCheck.color + '15' }]}>
                        <Ionicons name={bgCheck.icon} size={12} color={bgCheck.color} />
                        <Text style={[s.badgeText, { color: bgCheck.color }]}>BG: {bgCheck.label}</Text>
                      </View>
                      {coach.waiver_signed && (
                        <View style={[s.badge, { backgroundColor: '#34C75915' }]}>
                          <Ionicons name="document-text" size={12} color="#34C759" />
                          <Text style={[s.badgeText, { color: '#34C759' }]}>Waiver</Text>
                        </View>
                      )}
                      {coach.code_of_conduct_signed && (
                        <View style={[s.badge, { backgroundColor: '#0EA5E915' }]}>
                          <Ionicons name="checkmark-circle" size={12} color="#0EA5E9" />
                          <Text style={[s.badgeText, { color: '#0EA5E9' }]}>CoC</Text>
                        </View>
                      )}
                      {certs.slice(0, 2).map((cert, i) => (
                        <View key={i} style={[s.badge, { backgroundColor: '#AF52DE15' }]}>
                          <Text style={[s.badgeText, { color: '#AF52DE' }]}>{cert}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ============================================================ */}
      {/* DETAIL MODAL */}
      {/* ============================================================ */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.detailModal}>
            {selectedCoach && (() => {
              const bgCheck = getBgCheckBadge(selectedCoach.background_check_status);
              const certs = getCertifications(selectedCoach.certifications);
              const coachTeams = getCoachTeams(selectedCoach.id);
              const unassignedTeams = teams.filter(t => !coachTeams.some(ct => ct.id === t.id));

              return (
                <>
                  <View style={s.detailHeader}>
                    <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                      <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={s.detailTitle}>Coach Details</Text>
                    <View style={{ width: 24 }} />
                  </View>

                  <ScrollView style={s.detailScroll}>
                    {/* Profile Header */}
                    <View style={s.profileHeader}>
                      <View style={s.avatarLg}>
                        <Text style={s.avatarLgText}>{selectedCoach.first_name[0]}{selectedCoach.last_name[0]}</Text>
                      </View>
                      <Text style={s.profileName}>{selectedCoach.first_name} {selectedCoach.last_name}</Text>
                      {selectedCoach.coaching_level && (
                        <Text style={s.profileLevel}>{selectedCoach.coaching_level}</Text>
                      )}
                      {selectedCoach.experience_years != null && (
                        <Text style={s.profileMeta}>{selectedCoach.experience_years} year{selectedCoach.experience_years !== 1 ? 's' : ''} experience</Text>
                      )}
                    </View>

                    {/* Contact Section */}
                    <View style={s.section}>
                      <Text style={s.sectionTitle}>CONTACT</Text>
                      {selectedCoach.email && (
                        <TouchableOpacity style={s.detailRow} onPress={() => Linking.openURL('mailto:' + selectedCoach.email)}>
                          <Ionicons name="mail" size={18} color={colors.info} />
                          <Text style={s.detailRowText}>{selectedCoach.email}</Text>
                          <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                      {selectedCoach.phone && (
                        <TouchableOpacity style={s.detailRow} onPress={() => Linking.openURL('tel:' + selectedCoach.phone)}>
                          <Ionicons name="call" size={18} color={colors.success} />
                          <Text style={s.detailRowText}>{selectedCoach.phone}</Text>
                          <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                      {!selectedCoach.email && !selectedCoach.phone && (
                        <Text style={s.noDataText}>No contact info available</Text>
                      )}
                    </View>

                    {/* Background Check */}
                    <View style={s.section}>
                      <Text style={s.sectionTitle}>BACKGROUND CHECK</Text>
                      <View style={s.bgCheckRow}>
                        <Ionicons name={bgCheck.icon} size={20} color={bgCheck.color} />
                        <Text style={[s.bgCheckLabel, { color: bgCheck.color }]}>{bgCheck.label}</Text>
                      </View>
                      {selectedCoach.background_check_date && (
                        <Text style={s.bgCheckDate}>Checked: {selectedCoach.background_check_date}</Text>
                      )}
                      {selectedCoach.background_check_expiry && (
                        <Text style={s.bgCheckDate}>Expires: {selectedCoach.background_check_expiry}</Text>
                      )}
                    </View>

                    {/* Certifications */}
                    {certs.length > 0 && (
                      <View style={s.section}>
                        <Text style={s.sectionTitle}>CERTIFICATIONS</Text>
                        <View style={s.certsRow}>
                          {certs.map((cert, i) => (
                            <View key={i} style={s.certBadge}>
                              <Ionicons name="ribbon" size={14} color="#AF52DE" />
                              <Text style={s.certText}>{cert}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Team Assignments */}
                    <View style={s.section}>
                      <Text style={s.sectionTitle}>TEAM ASSIGNMENTS</Text>
                      {coachTeams.length === 0 ? (
                        <Text style={s.noDataText}>Not assigned to any teams</Text>
                      ) : (
                        coachTeams.map(team => (
                          <View key={team.id} style={s.teamAssignRow}>
                            <View style={[s.teamDot, { backgroundColor: team.color }]} />
                            <Text style={s.teamAssignName}>{team.name}</Text>
                            <TouchableOpacity style={s.roleToggle}
                              onPress={() => assignToTeam(selectedCoach.id, team.id, team.role === 'head' ? 'assistant' : 'head')}>
                              <Text style={[s.roleToggleText, team.role === 'head' && { color: colors.primary, fontWeight: '700' }]}>
                                {team.role === 'head' ? '\uD83D\uDC51 Head' : 'Assistant'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => removeFromTeam(selectedCoach.id, team.id)}>
                              <Ionicons name="close-circle" size={22} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                    </View>

                    {/* Assign to Team */}
                    {unassignedTeams.length > 0 && (
                      <View style={s.section}>
                        <Text style={s.sectionTitle}>ASSIGN TO TEAM</Text>
                        {unassignedTeams.map(team => (
                          <View key={team.id} style={s.assignRow}>
                            <View style={[s.teamDot, { backgroundColor: team.color }]} />
                            <Text style={s.assignTeamName}>{team.name}</Text>
                            <TouchableOpacity style={s.assignBtn}
                              onPress={() => assignToTeam(selectedCoach.id, team.id, 'assistant')}>
                              <Ionicons name="add-circle" size={20} color={colors.success} />
                              <Text style={s.assignBtnText}>Assign</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Specialties */}
                    {selectedCoach.specialties && (
                      <View style={s.section}>
                        <Text style={s.sectionTitle}>SPECIALTIES</Text>
                        <Text style={s.specialtiesText}>{selectedCoach.specialties}</Text>
                      </View>
                    )}
                  </ScrollView>
                </>
              );
            })()}
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
  scrollContent: { paddingHorizontal: spacing.screenPadding, paddingTop: 8 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  backBtn: { padding: 4 },
  title: { ...displayTextStyle, fontSize: 24, color: colors.text },
  subtitle: { fontSize: 13, color: colors.primary, marginTop: 2 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  statNum: { fontSize: 24, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: 0.5 },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },

  // Filter Pills
  filterRow: { flexGrow: 0, marginBottom: 16 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', marginRight: 8,
  },
  filterPillActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  filterPillText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  filterPillTextActive: { color: colors.primary },

  // Coach Card
  coachCard: {
    backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  cardInfo: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coachName: { fontSize: 16, fontWeight: '700', color: colors.text },
  levelText: { fontSize: 11, color: colors.textMuted, backgroundColor: colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  contactRow: { marginTop: 4, gap: 2 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactText: { fontSize: 12, color: colors.textSecondary },

  teamPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  teamPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  teamPillText: { fontSize: 11, fontWeight: '600' },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: 4, textAlign: 'center' },

  // Detail Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  detailModal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '88%', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  detailScroll: { flex: 1, padding: 16 },

  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatarLg: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarLgText: { fontSize: 32, fontWeight: '700', color: colors.primary },
  profileName: { fontSize: 24, fontWeight: '800', color: colors.text },
  profileLevel: { fontSize: 14, color: colors.primary, marginTop: 4, fontWeight: '600' },
  profileMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  section: { backgroundColor: colors.background, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 12, letterSpacing: 1 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailRowText: { flex: 1, fontSize: 15, color: colors.text },
  noDataText: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },

  bgCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bgCheckLabel: { fontSize: 16, fontWeight: '700' },
  bgCheckDate: { fontSize: 13, color: colors.textMuted, marginTop: 4 },

  certsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  certBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#AF52DE15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  certText: { fontSize: 13, color: '#AF52DE', fontWeight: '600' },

  teamAssignRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  teamDot: { width: 10, height: 10, borderRadius: 5 },
  teamAssignName: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  roleToggle: { backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 8 },
  roleToggleText: { fontSize: 12, color: colors.textMuted },

  assignRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  assignTeamName: { flex: 1, fontSize: 15, color: colors.text },
  assignBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  assignBtnText: { fontSize: 13, color: colors.success, fontWeight: '600' },

  specialtiesText: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
