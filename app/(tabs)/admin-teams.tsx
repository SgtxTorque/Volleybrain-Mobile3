import AppHeaderBar from '@/components/ui/AppHeaderBar';
import PillTabs from '@/components/ui/PillTabs';
import { useAuth } from '@/lib/auth';
import { addAdminToTeamChats, createTeamChats } from '@/lib/chat-utils';
import { radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

// ===========================================================================
// Types
// ===========================================================================

type Team = {
  id: string; name: string; color: string; team_type: string;
  max_players: number; age_group_id: string;
};
type AgeGroup = { id: string; name: string; display_order: number; };
type Coach = { id: string; first_name: string; last_name: string; email: string; };
type Player = { id: string; first_name: string; last_name: string; grade: number; position: string | null; parent_email: string; parent_name: string; };
type WinLoss = { wins: number; losses: number; };
type NextEvent = { title: string; event_date: string; event_type: string; };

// ===========================================================================
// Helpers
// ===========================================================================

const formatEventDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
};

const eventTypeIcon = (type: string): string => {
  switch (type) {
    case 'game': return 'trophy';
    case 'practice': return 'barbell';
    default: return 'calendar';
  }
};

// ===========================================================================
// Component
// ===========================================================================

export default function AdminTeamsScreen() {
  const { profile } = useAuth();
  const { workingSeason } = useSeason();
  const { colors } = useTheme();
  const router = useRouter();
  const s = useMemo(() => createStyles(colors), [colors]);

  // --- Core data ---
  const [teams, setTeams] = useState<Team[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamPlayerMap, setTeamPlayerMap] = useState<Record<string, string[]>>({});
  const [winLossMap, setWinLossMap] = useState<Record<string, WinLoss>>({});
  const [headCoachMap, setHeadCoachMap] = useState<Record<string, string>>({});
  const [nextEventMap, setNextEventMap] = useState<Record<string, NextEvent>>({});
  const [waiverCompliance, setWaiverCompliance] = useState<Record<string, { compliant: number; total: number }>>({});
  const [unrosteredPlayers, setUnrosteredPlayers] = useState<Player[]>([]);

  // --- UI state ---
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // --- Form state ---
  const [teamName, setTeamName] = useState('');
  const [teamType, setTeamType] = useState('development');
  const [teamColor, setTeamColor] = useState('#FFD700');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string | null>(null);
  const [maxRoster, setMaxRoster] = useState('15');
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);

  const teamColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#9B59B6', '#3498DB', '#E67E22'];

  // =========================================================================
  // Data fetching
  // =========================================================================

  const fetchData = useCallback(async () => {
    if (!workingSeason || !profile) return;
    const seasonId = workingSeason.id;
    const orgId = profile.current_organization_id;
    const today = new Date().toISOString().split('T')[0];

    const [tRes, agRes, pRes, cRes, tpRes, tcRes, gRes, neRes] = await Promise.all([
      supabase.from('teams').select('id, name, color, team_type, max_players, age_group_id').eq('season_id', seasonId).order('name'),
      supabase.from('age_groups').select('id, name, display_order').eq('season_id', seasonId).order('display_order'),
      supabase.from('players').select('id, first_name, last_name, grade, position, parent_email, parent_name').eq('season_id', seasonId),
      supabase.from('coaches').select('id, first_name, last_name, email').eq('season_id', seasonId),
      supabase.from('team_players').select('team_id, player_id'),
      supabase.from('team_coaches').select('team_id, coach_id, role, coaches(first_name, last_name)'),
      supabase.from('schedule_events').select('team_id, game_result').eq('season_id', seasonId).eq('event_type', 'game').not('game_result', 'is', null),
      supabase.from('schedule_events').select('team_id, title, event_type, event_date').eq('season_id', seasonId).gte('event_date', today).order('event_date').limit(200),
    ]);

    const teamsData = tRes.data || [];
    const playersData = pRes.data || [];
    const teamPlayersData = tpRes.data || [];
    const teamCoachesData = tcRes.data || [];

    setTeams(teamsData);
    setAgeGroups(agRes.data || []);
    setPlayers(playersData);
    setCoaches(cRes.data || []);

    // Build team → player IDs map
    const tpMap: Record<string, string[]> = {};
    const teamIdSet = new Set(teamsData.map(t => t.id));
    for (const tp of teamPlayersData) {
      if (!teamIdSet.has(tp.team_id)) continue;
      if (!tpMap[tp.team_id]) tpMap[tp.team_id] = [];
      tpMap[tp.team_id].push(tp.player_id);
    }
    setTeamPlayerMap(tpMap);

    // Unrostered players
    const rosteredIds = new Set(teamPlayersData.map(tp => tp.player_id));
    setUnrosteredPlayers(playersData.filter(p => !rosteredIds.has(p.id)));

    // Head coach map
    const hcMap: Record<string, string> = {};
    for (const tc of teamCoachesData) {
      if (tc.role === 'head' && tc.coaches) {
        const c = tc.coaches as any;
        hcMap[tc.team_id] = `${c.first_name} ${c.last_name}`;
      }
    }
    setHeadCoachMap(hcMap);

    // W-L map
    const wlMap: Record<string, WinLoss> = {};
    for (const g of (gRes.data || [])) {
      if (!wlMap[g.team_id]) wlMap[g.team_id] = { wins: 0, losses: 0 };
      if (g.game_result === 'win') wlMap[g.team_id].wins++;
      else if (g.game_result === 'loss') wlMap[g.team_id].losses++;
    }
    setWinLossMap(wlMap);

    // Next event map (first upcoming per team)
    const neMap: Record<string, NextEvent> = {};
    for (const ev of (neRes.data || [])) {
      if (!neMap[ev.team_id]) {
        neMap[ev.team_id] = { title: ev.title, event_date: ev.event_date, event_type: ev.event_type };
      }
    }
    setNextEventMap(neMap);

    // Waiver compliance
    if (orgId) {
      const { data: requiredWaivers } = await supabase
        .from('waiver_templates')
        .select('id')
        .eq('organization_id', orgId)
        .eq('is_required', true)
        .eq('is_active', true);

      if (requiredWaivers && requiredWaivers.length > 0) {
        const playerIds = playersData.map(p => p.id);
        const waiverIds = requiredWaivers.map(w => w.id);

        if (playerIds.length > 0) {
          const { data: sigs } = await supabase
            .from('waiver_signatures')
            .select('player_id, waiver_template_id')
            .eq('season_id', seasonId)
            .in('player_id', playerIds)
            .in('waiver_template_id', waiverIds);

          const signedSet = new Set((sigs || []).map(sg => sg.player_id + ':' + sg.waiver_template_id));
          const compliance: Record<string, { compliant: number; total: number }> = {};

          for (const team of teamsData) {
            const teamPids = tpMap[team.id] || [];
            let compliant = 0;
            for (const pid of teamPids) {
              const allSigned = waiverIds.every(wid => signedSet.has(pid + ':' + wid));
              if (allSigned) compliant++;
            }
            compliance[team.id] = { compliant, total: teamPids.length };
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

  // =========================================================================
  // Filtering
  // =========================================================================

  const getFilteredTeams = useCallback(() => {
    let filtered = teams;

    // Age group filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(t => t.age_group_id === activeFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => {
        if (t.name.toLowerCase().includes(q)) return true;
        const hc = headCoachMap[t.id];
        if (hc && hc.toLowerCase().includes(q)) return true;
        const pids = teamPlayerMap[t.id] || [];
        return pids.some(pid => {
          const p = players.find(pl => pl.id === pid);
          return p && `${p.first_name} ${p.last_name}`.toLowerCase().includes(q);
        });
      });
    }

    return filtered;
  }, [teams, activeFilter, searchQuery, headCoachMap, teamPlayerMap, players]);

  const filteredTeams = getFilteredTeams();

  const filterTabs = useMemo(() => {
    const tabs = [{ key: 'all', label: 'All' }];
    for (const ag of ageGroups) {
      tabs.push({ key: ag.id, label: ag.name });
    }
    return tabs;
  }, [ageGroups]);

  const totalRostered = Object.values(teamPlayerMap).reduce((sum, ids) => sum + ids.length, 0);

  // =========================================================================
  // Helpers
  // =========================================================================

  const getAgeGroupName = (id: string) => ageGroups.find(ag => ag.id === id)?.name || '';

  // =========================================================================
  // Create team
  // =========================================================================

  const resetForm = () => {
    setTeamName(''); setTeamType('development'); setTeamColor('#FFD700');
    setSelectedAgeGroup(null); setMaxRoster('15'); setSelectedCoachId(null);
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
      // Assign head coach if selected
      if (selectedCoachId) {
        await supabase.from('team_coaches').insert({
          team_id: newTeam.id, coach_id: selectedCoachId, role: 'head',
        });
      }

      // Create team chats
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

  // =========================================================================
  // Quick assign player
  // =========================================================================

  const assignPlayer = async (player: Player, team: Team) => {
    if (!workingSeason || !profile) return;
    const { error } = await supabase.from('team_players').insert({
      team_id: team.id, player_id: player.id, is_primary_team: true,
    });
    if (error) { Alert.alert('Error', error.message); return; }
    await supabase.from('players').update({ status: 'assigned' }).eq('id', player.id);
    fetchData();
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeaderBar title="TEAMS" showAvatar={false} showNotificationBell={false} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* All Players Directory */}
        <TouchableOpacity
          style={[s.allPlayersCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}
          onPress={() => router.push('/(tabs)/players' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="people" size={22} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>All Players</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{totalRostered + unrosteredPlayers.length} players across {teams.length} teams</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Stats summary */}
        <View style={s.statsRow}>
          <View style={[s.statBox, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Text style={[s.statValue, { color: colors.text }]}>{teams.length}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>Teams</Text>
          </View>
          <View style={[s.statBox, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Text style={[s.statValue, { color: colors.text }]}>{totalRostered}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>Rostered</Text>
          </View>
          <View style={[s.statBox, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Text style={[s.statValue, { color: unrosteredPlayers.length > 0 ? '#E8913A' : colors.success }]}>{unrosteredPlayers.length}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>Unrostered</Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={[s.searchBar, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search teams, coaches, players..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        {filterTabs.length > 1 && (
          <View style={s.pillRow}>
            <PillTabs tabs={filterTabs} activeKey={activeFilter} onChange={setActiveFilter} />
          </View>
        )}

        {/* Team cards */}
        {filteredTeams.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Ionicons name="shirt-outline" size={48} color={colors.textMuted} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>
              {teams.length === 0 ? 'No teams yet' : 'No teams match your search'}
            </Text>
            {teams.length === 0 && (
              <Text style={[s.emptySubtext, { color: colors.textMuted }]}>
                Tap + to create your first team
              </Text>
            )}
          </View>
        ) : (
          filteredTeams.map(team => {
            const playerCount = (teamPlayerMap[team.id] || []).length;
            const wl = winLossMap[team.id];
            const hc = headCoachMap[team.id];
            const ne = nextEventMap[team.id];
            const waiver = waiverCompliance[team.id];
            const agName = getAgeGroupName(team.age_group_id);

            return (
              <TouchableOpacity
                key={team.id}
                style={[s.teamCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/team-wall', params: { teamId: team.id } } as any)}
              >
                <View style={[s.teamStripe, { backgroundColor: team.color || colors.primary }]} />
                <View style={s.teamBody}>
                  {/* Row 1: Name + W-L */}
                  <View style={s.teamRow1}>
                    <Text style={[s.teamName, { color: colors.text }]} numberOfLines={1}>{team.name}</Text>
                    {wl && (
                      <View style={[s.wlBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[s.wlText, { color: colors.primary }]}>{wl.wins}-{wl.losses}</Text>
                      </View>
                    )}
                  </View>

                  {/* Row 2: Meta info */}
                  <Text style={[s.teamMeta, { color: colors.textMuted }]} numberOfLines={1}>
                    {agName ? agName + ' \u00B7 ' : ''}{playerCount}/{team.max_players} players{hc ? ` \u00B7 ${hc}` : ''}
                  </Text>

                  {/* Row 3: Next event */}
                  {ne ? (
                    <View style={s.nextEventRow}>
                      <Ionicons name={eventTypeIcon(ne.event_type) as any} size={13} color={colors.textMuted} />
                      <Text style={[s.nextEventText, { color: colors.textSecondary }]}>
                        {formatEventDate(ne.event_date)} \u00B7 {ne.event_type === 'game' ? 'Game' : ne.event_type === 'practice' ? 'Practice' : 'Event'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[s.noEventText, { color: colors.textMuted }]}>No upcoming events</Text>
                  )}

                  {/* Row 4: Health indicators */}
                  {waiver && waiver.total > 0 && (
                    <View style={s.healthRow}>
                      <View style={[s.healthPill, {
                        backgroundColor: waiver.compliant === waiver.total ? '#22C55E15' : '#E8913A15',
                      }]}>
                        <Ionicons
                          name={waiver.compliant === waiver.total ? 'shield-checkmark' : 'alert-circle'}
                          size={12}
                          color={waiver.compliant === waiver.total ? '#22C55E' : '#E8913A'}
                        />
                        <Text style={{
                          fontSize: 11, marginLeft: 3,
                          color: waiver.compliant === waiver.total ? '#22C55E' : '#E8913A',
                        }}>
                          {waiver.compliant}/{waiver.total} waivers
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={s.chevron} />
              </TouchableOpacity>
            );
          })
        )}

        {/* Unrostered players */}
        {unrosteredPlayers.length > 0 && (
          <View style={s.unrosteredSection}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>
              UNROSTERED PLAYERS ({unrosteredPlayers.length})
            </Text>
            {(searchQuery
              ? unrosteredPlayers.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()))
              : unrosteredPlayers
            ).map(player => (
              <View key={player.id} style={[s.unrosteredCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
                <View style={s.unrosteredInfo}>
                  <Text style={[s.unrosteredName, { color: colors.text }]}>
                    {player.first_name} {player.last_name}
                  </Text>
                  <Text style={[s.unrosteredMeta, { color: colors.textMuted }]}>
                    Grade {player.grade}{player.position ? ` \u00B7 ${player.position}` : ''}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.teamPillScroll}>
                  {teams.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[s.teamPill, { borderColor: t.color || colors.primary }]}
                      onPress={() => {
                        Alert.alert('Assign Player', `Add ${player.first_name} to ${t.name}?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Assign', onPress: () => assignPlayer(player, t) },
                        ]);
                      }}
                    >
                      <View style={[s.teamPillDot, { backgroundColor: t.color || colors.primary }]} />
                      <Text style={[s.teamPillText, { color: colors.text }]}>{t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create Team FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={() => { resetForm(); setShowCreateModal(true); }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create Team Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={s.modalWrapper}
          >
            <View style={[s.modal, { backgroundColor: colors.card }]}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: colors.text }]}>Create Team</Text>
                <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[s.formLabel, { color: colors.textSecondary }]}>Team Name *</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.glassCard }]}
                  placeholder="e.g., Eagles 12U Elite"
                  placeholderTextColor={colors.textMuted}
                  value={teamName}
                  onChangeText={setTeamName}
                />

                <Text style={[s.formLabel, { color: colors.textSecondary }]}>Age Group *</Text>
                <View style={s.optionRow}>
                  {ageGroups.map(ag => (
                    <TouchableOpacity
                      key={ag.id}
                      style={[s.optionBtn, { borderColor: colors.glassBorder },
                        selectedAgeGroup === ag.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setSelectedAgeGroup(ag.id)}
                    >
                      <Text style={[s.optionBtnText, { color: colors.textSecondary },
                        selectedAgeGroup === ag.id && { color: '#FFF' }]}>
                        {ag.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[s.formLabel, { color: colors.textSecondary }]}>Team Type</Text>
                <View style={s.optionRow}>
                  {['elite', 'development'].map(tt => (
                    <TouchableOpacity
                      key={tt}
                      style={[s.optionBtn, { borderColor: colors.glassBorder },
                        teamType === tt && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setTeamType(tt)}
                    >
                      <Text style={[s.optionBtnText, { color: colors.textSecondary },
                        teamType === tt && { color: '#FFF' }]}>
                        {tt.charAt(0).toUpperCase() + tt.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[s.formLabel, { color: colors.textSecondary }]}>Team Color</Text>
                <View style={s.colorRow}>
                  {teamColors.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[s.colorBtn, { backgroundColor: c }, teamColor === c && s.colorBtnSelected]}
                      onPress={() => setTeamColor(c)}
                    >
                      {teamColor === c && <Ionicons name="checkmark" size={16} color="#FFF" />}
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[s.formLabel, { color: colors.textSecondary }]}>Max Roster Size</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.glassCard }]}
                  placeholder="15"
                  placeholderTextColor={colors.textMuted}
                  value={maxRoster}
                  onChangeText={setMaxRoster}
                  keyboardType="number-pad"
                />

                <Text style={[s.formLabel, { color: colors.textSecondary }]}>Head Coach</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.coachPicker}>
                  <TouchableOpacity
                    style={[s.optionBtn, { borderColor: colors.glassBorder },
                      !selectedCoachId && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setSelectedCoachId(null)}
                  >
                    <Text style={[s.optionBtnText, { color: colors.textSecondary },
                      !selectedCoachId && { color: '#FFF' }]}>None</Text>
                  </TouchableOpacity>
                  {coaches.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[s.optionBtn, { borderColor: colors.glassBorder },
                        selectedCoachId === c.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setSelectedCoachId(c.id)}
                    >
                      <Text style={[s.optionBtnText, { color: colors.textSecondary },
                        selectedCoachId === c.id && { color: '#FFF' }]}>
                        {c.first_name} {c.last_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[s.createBtn, { backgroundColor: colors.primary }, creating && { opacity: 0.5 }]}
                  onPress={createTeam}
                  disabled={creating}
                >
                  <Text style={s.createBtnText}>{creating ? 'Creating...' : 'Create Team'}</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.screenPadding, paddingTop: 12 },

    // All Players card
    allPlayersCard: {
      flexDirection: 'row', alignItems: 'center', padding: 14,
      borderRadius: radii.card, borderWidth: 1, marginBottom: 12,
      ...shadows.card,
    },

    // Stats
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    statBox: {
      flex: 1, alignItems: 'center', paddingVertical: 12,
      borderRadius: radii.card, borderWidth: 1, ...shadows.card,
    },
    statValue: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Search
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
      borderRadius: radii.card, borderWidth: 1, marginBottom: 10,
    },
    searchInput: { flex: 1, fontSize: 15 },

    // Filter pills
    pillRow: { marginBottom: 12 },

    // Team card
    teamCard: {
      flexDirection: 'row', alignItems: 'center',
      borderRadius: radii.card, borderWidth: 1, marginBottom: 10,
      overflow: 'hidden', ...shadows.card,
    },
    teamStripe: { width: 4, alignSelf: 'stretch' },
    teamBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
    teamRow1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    teamName: { fontSize: 16, fontWeight: '700', flex: 1 },
    wlBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    wlText: { fontSize: 12, fontWeight: '700' },
    teamMeta: { fontSize: 13, marginTop: 3 },
    nextEventRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
    nextEventText: { fontSize: 12 },
    noEventText: { fontSize: 12, marginTop: 5, fontStyle: 'italic' },
    healthRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
    healthPill: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    },
    chevron: { marginRight: 12 },

    // Empty state
    emptyCard: {
      alignItems: 'center', paddingVertical: 48,
      borderRadius: radii.card, borderWidth: 1, ...shadows.card,
    },
    emptyTitle: { fontSize: 17, fontWeight: '600', marginTop: 12 },
    emptySubtext: { fontSize: 13, marginTop: 4 },

    // Unrostered section
    unrosteredSection: { marginTop: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
    unrosteredCard: {
      flexDirection: 'row', alignItems: 'center',
      borderRadius: radii.card, borderWidth: 1, padding: 12, marginBottom: 8,
    },
    unrosteredInfo: { minWidth: 100, marginRight: 12 },
    unrosteredName: { fontSize: 14, fontWeight: '600' },
    unrosteredMeta: { fontSize: 12, marginTop: 2 },
    teamPillScroll: { flex: 1 },
    teamPill: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
      borderWidth: 1.5, marginRight: 6,
    },
    teamPillDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
    teamPillText: { fontSize: 12, fontWeight: '600' },

    // FAB
    fab: {
      position: 'absolute', bottom: 24, right: 20,
      width: 56, height: 56, borderRadius: 28,
      alignItems: 'center', justifyContent: 'center',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
        android: { elevation: 8 },
      }),
    },

    // Modal
    overlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalWrapper: { flex: 1, justifyContent: 'flex-end' },
    modal: {
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
      maxHeight: '85%',
    },
    modalHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: colors.textMuted + '40',
      alignSelf: 'center', marginBottom: 12,
    },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: { fontSize: 18, fontWeight: '700' },

    // Form
    formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
    formInput: {
      borderWidth: 1, borderRadius: radii.card,
      paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 15,
    },
    optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionBtn: {
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 16, borderWidth: 1,
    },
    optionBtnText: { fontSize: 13, fontWeight: '600' },
    colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    colorBtn: {
      width: 34, height: 34, borderRadius: 17,
      alignItems: 'center', justifyContent: 'center',
    },
    colorBtnSelected: {
      borderWidth: 3, borderColor: '#FFF',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
        android: { elevation: 4 },
      }),
    },
    coachPicker: { marginBottom: 8 },
    createBtn: {
      alignItems: 'center', paddingVertical: 14,
      borderRadius: radii.card, marginTop: 20,
    },
    createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  });
