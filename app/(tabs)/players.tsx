import PlayerCard from '@/components/PlayerCard';
import PlayerCardExpanded, { PlayerCardPlayer } from '@/components/PlayerCardExpanded';
import PlayerStatBar from '@/components/PlayerStatBar';
import { displayTextStyle, spacing } from '@/lib/design-tokens';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { BRAND } from '@/theme/colors';
import { D_COLORS } from '@/theme/d-system';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
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
  age_group_name: string | null;
};

type ViewMode = 'grid' | 'list';

export default function PlayersScreen() {
  const { colors } = useTheme();
  const { workingSeason } = useSeason();
  const { isAdmin, isCoach } = usePermissions();
  const { teamId: paramTeamId } = useLocalSearchParams<{ teamId?: string }>();

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

  // Auto-select team when paramTeamId is provided (e.g. from team-hub or admin tiles)
  useEffect(() => {
    if (paramTeamId && teams.length > 0) {
      setSelectedTeam(paramTeamId);
    }
  }, [paramTeamId, teams]);

  const fetchData = async () => {
    if (!workingSeason) {
      setLoading(false);
      return;
    }

    try {
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, color, age_group_id')
        .eq('season_id', workingSeason.id)
        .order('name');

      if (teamsError && __DEV__) console.error('Teams fetch error:', teamsError);

      const formattedTeams: Team[] = (teamsData || []).map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        age_group_name: null,
      }));
      setTeams(formattedTeams);

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

  const renderGridItem = ({ item, index }: { item: PlayerCardPlayer; index: number }) => (
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
      staggerIndex={index}
    />
  );

  const renderListItem = ({ item, index }: { item: PlayerCardPlayer; index: number }) => (
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
      compact
      staggerIndex={index}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={D_COLORS.skyBlue} />
        </View>
      </SafeAreaView>
    );
  }

  if (!workingSeason) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <Ionicons name="calendar-outline" size={48} color={D_COLORS.textMuted} />
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 16, color: D_COLORS.textPrimary, marginTop: 12 }}>No Active Season</Text>
          <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 13, color: D_COLORS.textMuted, textAlign: 'center', marginTop: 4 }}>
            Select a season to view players.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>PLAYERS</Text>
          <Text style={s.subtitle}>{workingSeason?.name} {'\u00B7'} {players.length} total</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity style={s.addBtn} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={28} color={BRAND.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={s.filterBar}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={20} color={D_COLORS.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search players..."
            placeholderTextColor={D_COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={D_COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Team Filter Chips */}
      <View style={s.teamFilterWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.teamFilterContent}
          data={[{ id: '__all__', name: 'All', color: null }, ...teams]}
          keyExtractor={item => item.id}
          renderItem={({ item: team }) => {
            const isAll = team.id === '__all__';
            const isActive = isAll ? !selectedTeam : selectedTeam === team.id;
            return (
              <TouchableOpacity
                style={[
                  s.teamChip,
                  isActive && {
                    backgroundColor: isAll ? D_COLORS.skyBlue : (team.color || D_COLORS.skyBlue),
                  },
                ]}
                onPress={() => setSelectedTeam(isAll ? null : (selectedTeam === team.id ? null : team.id))}
              >
                {!isAll && team.color && !isActive && (
                  <View style={[s.teamDot, { backgroundColor: team.color }]} />
                )}
                <Text style={[
                  s.teamChipText,
                  isActive && s.teamChipTextActive,
                ]}>
                  {team.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* View Mode Toggle */}
      <View style={s.viewToggle}>
        <View style={s.viewToggleContainer}>
          <TouchableOpacity
            style={[s.viewBtn, viewMode === 'grid' && s.viewBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons name="grid" size={18} color={viewMode === 'grid' ? D_COLORS.skyBlue : D_COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.viewBtn, viewMode === 'list' && s.viewBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={18} color={viewMode === 'list' ? D_COLORS.skyBlue : D_COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Player Content */}
      {filteredPlayers.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="people-outline" size={64} color={D_COLORS.textMuted} />
          <Text style={s.emptyText}>No players found</Text>
          {isAdmin && (
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAddModal(true)}>
              <Text style={s.emptyBtnText}>Add Player</Text>
            </TouchableOpacity>
          )}
        </View>
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

      {/* Add Player Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Player</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={D_COLORS.textPrimary} />
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
  container: { flex: 1, backgroundColor: D_COLORS.pageBg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.screenPadding, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 28, ...displayTextStyle, color: D_COLORS.textPrimary },
  subtitle: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: D_COLORS.skyBlue, marginTop: 2 },
  addBtn: { backgroundColor: D_COLORS.skyBlue, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  filterBar: { paddingHorizontal: spacing.screenPadding, marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: D_COLORS.pageBg, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, fontFamily: FONTS.bodyMedium, color: D_COLORS.textPrimary },

  teamFilterWrap: { marginBottom: 12 },
  teamFilterContent: { paddingHorizontal: spacing.screenPadding, paddingVertical: 8 },
  teamChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.04)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  teamChipText: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: D_COLORS.textPrimary },
  teamChipTextActive: { color: BRAND.white, fontFamily: FONTS.bodySemiBold },
  teamDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },

  viewToggle: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12, paddingHorizontal: spacing.screenPadding },
  viewToggleContainer: { flexDirection: 'row', gap: 4, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 2 },
  viewBtn: { width: 44, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  viewBtnActive: { backgroundColor: BRAND.white },

  gridRow: { justifyContent: 'space-between', paddingHorizontal: spacing.screenPadding, marginBottom: 12 },
  listContent: { paddingBottom: 24 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, fontFamily: FONTS.bodyMedium, color: D_COLORS.textMuted, marginTop: 12 },
  emptyBtn: { backgroundColor: D_COLORS.skyBlue, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  emptyBtnText: { fontSize: 16, fontFamily: FONTS.bodySemiBold, color: BRAND.white },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: BRAND.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, ...displayTextStyle, color: D_COLORS.textPrimary },
  modalContent: { alignItems: 'center', paddingVertical: 20 },
  modalText: { fontSize: 15, fontFamily: FONTS.bodyMedium, color: D_COLORS.textMuted, textAlign: 'center', marginBottom: 20 },
  modalBtn: { backgroundColor: D_COLORS.skyBlue, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  modalBtnText: { fontSize: 16, fontFamily: FONTS.bodySemiBold, color: BRAND.white },
});
