import PlayerCard from '@/components/PlayerCard';
import PlayerCardExpanded, { PlayerCardPlayer } from '@/components/PlayerCardExpanded';
import PlayerStatBar from '@/components/PlayerStatBar';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Team = {
  id: string;
  name: string;
  color: string | null;
  age_group_name: string | null;
};

type ViewMode = 'grid' | 'lineup' | 'list';

export default function PlayersScreen() {
  const { colors } = useTheme();
  const { workingSeason } = useSeason();
  const { isAdmin, isCoach } = usePermissions();
  
  const [players, setPlayers] = useState<PlayerCardPlayer[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCardPlayer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const s = createStyles(colors);

  useEffect(() => {
    if (workingSeason) {
      fetchData();
    }
  }, [workingSeason?.id]);

  const fetchData = async () => {
    if (!workingSeason) {
      if (__DEV__) console.log('No working season');
      setLoading(false);
      return;
    }

    if (__DEV__) console.log('Fetching data for season:', workingSeason.id, workingSeason.name);

    try {
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, color, age_group_id')
        .eq('season_id', workingSeason.id)
        .order('name');

      if (teamsError) {
        if (__DEV__) console.error('Teams fetch error:', teamsError);
      }

      const formattedTeams: Team[] = (teamsData || []).map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        age_group_name: null,
      }));
      setTeams(formattedTeams);
      if (__DEV__) console.log('Teams loaded:', formattedTeams.length);

      // Fetch players - simpler query first
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('season_id', workingSeason.id)
        .order('last_name');

      if (playersError) {
        if (__DEV__) console.error('Players fetch error:', playersError);
        setLoading(false);
        return;
      }

      if (__DEV__) console.log('Players raw data:', playersData?.length);

      // Fetch team_players separately
      const { data: teamPlayersData } = await supabase
        .from('team_players')
        .select('player_id, team_id');

      // Create lookup map
      const playerTeamMap: Record<string, string> = {};
      (teamPlayersData || []).forEach(tp => {
        playerTeamMap[tp.player_id] = tp.team_id;
      });

      // Create team lookup
      const teamMap: Record<string, { name: string; color: string | null }> = {};
      formattedTeams.forEach(t => {
        teamMap[t.id] = { name: t.name, color: t.color };
      });

      const formattedPlayers: PlayerCardPlayer[] = (playersData || []).map(p => {
        const teamId = playerTeamMap[p.id];
        const team = teamId ? teamMap[teamId] : null;
        return {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          jersey_number: p.jersey_number || p.jersey_pref_1, // Use assigned or first preference
          position: p.position,
          photo_url: p.photo_url,
          grade: p.grade,
          school: p.school,
          experience_level: p.experience_level,
          parent_name: p.parent_name,
          parent_phone: p.parent_phone,
          parent_email: p.parent_email,
          medical_conditions: p.medical_conditions,
          allergies: p.allergies,
          team_id: teamId || null,
          team_name: team?.name || null,
          team_color: team?.color || null,
          age_group_name: null,
        };
      });
      
      if (__DEV__) console.log('Formatted players:', formattedPlayers.length);
      setPlayers(formattedPlayers);

    } catch (error) {
      if (__DEV__) console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filteredPlayers = players.filter(p => {
    const matchesSearch = searchQuery === '' || 
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.jersey_number?.toString().includes(searchQuery);
    const matchesTeam = !selectedTeam || (p as any).team_id === selectedTeam;
    return matchesSearch && matchesTeam;
  });

  // Group players by team for lineup view
  const playersByTeam = teams.reduce((acc, team) => {
    acc[team.id] = filteredPlayers.filter(p => (p as any).team_id === team.id);
    return acc;
  }, {} as Record<string, PlayerCardPlayer[]>);

  const unassignedPlayers = filteredPlayers.filter(p => !(p as any).team_id);

  const renderGridItem = ({ item }: { item: PlayerCardPlayer }) => (
    <PlayerCard
      player={{
        id: item.id,
        first_name: item.first_name,
        last_name: item.last_name,
        jersey_number: item.jersey_number,
        position: item.position,
        photo_url: item.photo_url,
        grade: item.grade,
        team_name: item.team_name,
        team_color: item.team_color,
      }}
      onPress={() => setSelectedPlayer(item)}
      size="medium"
    />
  );

  const renderLineupView = () => (
    <ScrollView style={s.lineupScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {teams.map(team => {
        const teamPlayers = playersByTeam[team.id] || [];
        if (teamPlayers.length === 0) return null;

        return (
          <View key={team.id} style={s.lineupTeam}>
            <View style={[s.lineupHeader, { backgroundColor: team.color || colors.card }]}>
              <Text style={s.lineupTeamName}>{team.name}</Text>
              <Text style={s.lineupCount}>{teamPlayers.length} players</Text>
            </View>
            <View style={s.lineupGrid}>
              {teamPlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={{
                    id: player.id,
                    first_name: player.first_name,
                    last_name: player.last_name,
                    jersey_number: player.jersey_number,
                    position: player.position,
                    photo_url: player.photo_url,
                    grade: player.grade,
                    team_color: team.color,
                  }}
                  onPress={() => setSelectedPlayer(player)}
                  size="small"
                />
              ))}
            </View>
          </View>
        );
      })}

      {unassignedPlayers.length > 0 && (
        <View style={s.lineupTeam}>
          <View style={[s.lineupHeader, { backgroundColor: colors.warning }]}>
            <Text style={s.lineupTeamName}>Unassigned</Text>
            <Text style={s.lineupCount}>{unassignedPlayers.length} players</Text>
          </View>
          <View style={s.lineupGrid}>
            {unassignedPlayers.map(player => (
              <PlayerCard
                key={player.id}
                player={{
                  id: player.id,
                  first_name: player.first_name,
                  last_name: player.last_name,
                  jersey_number: player.jersey_number,
                  position: player.position,
                  photo_url: player.photo_url,
                  grade: player.grade,
                }}
                onPress={() => setSelectedPlayer(player)}
                size="small"
              />
            ))}
          </View>
        </View>
      )}
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // NEW: ESPN-style stat bar for list view
  const renderListItem = ({ item }: { item: PlayerCardPlayer }) => (
    <PlayerStatBar
      player={{
        id: item.id,
        first_name: item.first_name,
        last_name: item.last_name,
        photo_url: item.photo_url,
        jersey_number: item.jersey_number,
        position: item.position,
        grade: item.grade,
        team_name: item.team_name,
        team_color: item.team_color,
      }}
      onPress={() => setSelectedPlayer(item)}
      statLabels={['SRV', 'ACE', 'KIL']} // Volleyball stat placeholders
      compact
    />
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
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Players</Text>
          <Text style={s.subtitle}>{workingSeason?.name} • {players.length} total</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity style={s.addBtn} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={28} color={colors.background} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search & Filter Bar */}
      <View style={s.filterBar}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search players..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Team Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.teamFilter}>
        <TouchableOpacity
          style={[s.teamChip, !selectedTeam && s.teamChipActive]}
          onPress={() => setSelectedTeam(null)}
        >
          <Text style={[s.teamChipText, !selectedTeam && s.teamChipTextActive]}>All</Text>
        </TouchableOpacity>
        {teams.map(team => (
          <TouchableOpacity
            key={team.id}
            style={[
              s.teamChip,
              selectedTeam === team.id && s.teamChipActive,
              { borderColor: team.color || colors.border }
            ]}
            onPress={() => setSelectedTeam(selectedTeam === team.id ? null : team.id)}
          >
            {team.color && <View style={[s.teamDot, { backgroundColor: team.color }]} />}
            <Text style={[s.teamChipText, selectedTeam === team.id && s.teamChipTextActive]}>
              {team.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* View Mode Toggle */}
      <View style={s.viewToggle}>
        <TouchableOpacity
          style={[s.viewBtn, viewMode === 'grid' && s.viewBtnActive]}
          onPress={() => setViewMode('grid')}
        >
          <Ionicons name="grid" size={18} color={viewMode === 'grid' ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.viewBtn, viewMode === 'lineup' && s.viewBtnActive]}
          onPress={() => setViewMode('lineup')}
        >
          <Ionicons name="people" size={18} color={viewMode === 'lineup' ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.viewBtn, viewMode === 'list' && s.viewBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="list" size={18} color={viewMode === 'list' ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Player Content */}
      {filteredPlayers.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="people-outline" size={64} color={colors.textMuted} />
          <Text style={s.emptyText}>No players found</Text>
          {isAdmin && (
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAddModal(true)}>
              <Text style={s.emptyBtnText}>Add Player</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : viewMode === 'lineup' ? (
        renderLineupView()
      ) : (
        <FlatList
          key={viewMode}
          data={filteredPlayers}
          keyExtractor={item => item.id}
          renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
          numColumns={viewMode === 'grid' ? 3 : 1}
          columnWrapperStyle={viewMode === 'grid' ? s.gridRow : undefined}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Expanded Player Card Modal */}
      <PlayerCardExpanded
        player={selectedPlayer}
        visible={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        onUpdate={fetchData}
      />

      {/* Add Player Modal - simplified for now */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Player</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={s.modalContent}>
              <Text style={s.modalText}>
                Use the public registration form or manually add players through the registration system.
              </Text>
              <TouchableOpacity 
                style={s.modalBtn}
                onPress={() => {
                  setShowAddModal(false);
                }}
              >
                <Text style={s.modalBtnText}>Go to Registration</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.primary, marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  filterBar: { paddingHorizontal: 16, marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glassCard, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: colors.glassBorder },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: colors.text },

  teamFilter: { paddingHorizontal: 16, marginBottom: 12, maxHeight: 40 },
  teamChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  teamChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  teamChipText: { fontSize: 13, color: colors.textMuted },
  teamChipTextActive: { color: colors.primary, fontWeight: '600' },
  teamDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },

  viewToggle: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 12, paddingHorizontal: 16 },
  viewBtn: { width: 44, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card },
  viewBtnActive: { backgroundColor: colors.primary + '20' },

  gridRow: { justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  listContent: { paddingBottom: 100 },

  lineupScroll: { flex: 1, paddingHorizontal: 16 },
  lineupTeam: { marginBottom: 24 },
  lineupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  lineupTeamName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  lineupCount: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  lineupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: colors.textMuted, marginTop: 12 },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  emptyBtnText: { fontSize: 16, fontWeight: '600', color: colors.background },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  modalContent: { alignItems: 'center', paddingVertical: 20 },
  modalText: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 20 },
  modalBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  modalBtnText: { fontSize: 16, fontWeight: '600', color: colors.background },
});
