import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ArchivedSeason = {
  id: string;
  name: string;
  sport: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  organization_id: string | null;
  team_count: number;
  player_count: number;
};

type SeasonDetail = {
  teams: { id: string; name: string; player_count: number }[];
  games: { id: string; title: string; event_date: string; location: string | null }[];
};

export default function SeasonArchivesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [seasons, setSeasons] = useState<ArchivedSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, SeasonDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  useEffect(() => {
    fetchArchivedSeasons();
  }, []);

  const fetchArchivedSeasons = async () => {
    try {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, sport, start_date, end_date, status, organization_id')
        .in('status', ['completed', 'closed', 'inactive'])
        .order('end_date', { ascending: false });

      if (error) throw error;

      const enriched: ArchivedSeason[] = [];
      for (const season of data || []) {
        const { data: teamIds } = await supabase
          .from('teams')
          .select('id')
          .eq('season_id', season.id);

        const ids = teamIds?.map((t: any) => t.id) || [];
        let playerCount = 0;
        if (ids.length > 0) {
          const { count } = await supabase
            .from('team_players')
            .select('id', { count: 'exact', head: true })
            .in('team_id', ids);
          playerCount = count || 0;
        }

        enriched.push({
          ...season,
          team_count: ids.length,
          player_count: playerCount,
        });
      }

      setSeasons(enriched);
    } catch (error) {
      console.error('Error fetching archived seasons:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (seasonId: string) => {
    if (expandedId === seasonId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(seasonId);

    if (details[seasonId]) return;

    setLoadingDetail(seasonId);
    try {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('season_id', seasonId)
        .order('name');

      const teamsWithCounts: { id: string; name: string; player_count: number }[] = [];
      for (const team of teams || []) {
        const { count } = await supabase
          .from('team_players')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', team.id);
        teamsWithCounts.push({ ...team, player_count: count || 0 });
      }

      const { data: games } = await supabase
        .from('schedule_events')
        .select('id, title, event_date, location')
        .eq('season_id', seasonId)
        .eq('event_type', 'game')
        .order('event_date', { ascending: false })
        .limit(20);

      setDetails(prev => ({
        ...prev,
        [seasonId]: {
          teams: teamsWithCounts,
          games: games || [],
        },
      }));
    } catch (error) {
      console.error('Error fetching season details:', error);
    } finally {
      setLoadingDetail(null);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '\u2014';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatFullDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'closed': return '#6B7280';
      case 'inactive': return '#F59E0B';
      default: return colors.textMuted;
    }
  };

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Season Archives</Text>
        <View style={s.backBtn} />
      </View>

      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading archives...</Text>
        </View>
      ) : seasons.length === 0 ? (
        <View style={s.emptyContainer}>
          <Ionicons name="archive-outline" size={64} color={colors.textMuted} />
          <Text style={s.emptyTitle}>No Archived Seasons</Text>
          <Text style={s.emptySubtitle}>Completed seasons will appear here</Text>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          {seasons.map(season => (
            <View key={season.id}>
              <TouchableOpacity
                style={[s.seasonCard, expandedId === season.id && s.seasonCardExpanded]}
                onPress={() => toggleExpand(season.id)}
                activeOpacity={0.7}
              >
                <View style={s.seasonHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.seasonName}>{season.name}</Text>
                    <Text style={s.seasonDates}>
                      {formatDate(season.start_date)} \u2014 {formatDate(season.end_date)}
                    </Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: getStatusColor(season.status) + '20' }]}>
                    <Text style={[s.statusText, { color: getStatusColor(season.status) }]}>
                      {season.status}
                    </Text>
                  </View>
                </View>

                <View style={s.seasonStats}>
                  <View style={s.statItem}>
                    <Ionicons name="shirt-outline" size={16} color={colors.primary} />
                    <Text style={s.statValue}>{season.team_count}</Text>
                    <Text style={s.statLabel}>Teams</Text>
                  </View>
                  <View style={s.statItem}>
                    <Ionicons name="people-outline" size={16} color={colors.primary} />
                    <Text style={s.statValue}>{season.player_count}</Text>
                    <Text style={s.statLabel}>Players</Text>
                  </View>
                  {season.sport && (
                    <View style={s.statItem}>
                      <Ionicons name="football-outline" size={16} color={colors.primary} />
                      <Text style={s.statLabel}>{season.sport}</Text>
                    </View>
                  )}
                </View>

                <Ionicons
                  name={expandedId === season.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textMuted}
                  style={{ alignSelf: 'center', marginTop: 8 }}
                />
              </TouchableOpacity>

              {expandedId === season.id && (
                <View style={s.detailContainer}>
                  {loadingDetail === season.id ? (
                    <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
                  ) : details[season.id] ? (
                    <>
                      <View style={s.detailSection}>
                        <Text style={s.detailTitle}>Teams</Text>
                        {details[season.id].teams.length === 0 ? (
                          <Text style={s.detailEmpty}>No teams recorded</Text>
                        ) : (
                          details[season.id].teams.map(team => (
                            <View key={team.id} style={s.detailRow}>
                              <Ionicons name="shirt" size={16} color={colors.primary} />
                              <Text style={s.detailRowText}>{team.name}</Text>
                              <Text style={s.detailRowMeta}>{team.player_count} players</Text>
                            </View>
                          ))
                        )}
                      </View>

                      <View style={s.detailSection}>
                        <Text style={s.detailTitle}>Games</Text>
                        {details[season.id].games.length === 0 ? (
                          <Text style={s.detailEmpty}>No games recorded</Text>
                        ) : (
                          details[season.id].games.map(game => (
                            <View key={game.id} style={s.detailRow}>
                              <Ionicons name="trophy-outline" size={16} color="#F59E0B" />
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={s.detailRowText}>{game.title}</Text>
                                <Text style={s.detailRowMeta}>
                                  {formatFullDate(game.event_date)}
                                  {game.location ? ` \u2022 ${game.location}` : ''}
                                </Text>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    </>
                  ) : null}
                </View>
              )}
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textMuted },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  seasonCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  seasonCardExpanded: { marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  seasonHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  seasonName: { fontSize: 17, fontWeight: '700', color: colors.text },
  seasonDates: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  seasonStats: { flexDirection: 'row', marginTop: 12, gap: 20 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  statLabel: { fontSize: 13, color: colors.textMuted },
  detailContainer: { backgroundColor: colors.card, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, paddingHorizontal: 16, paddingBottom: 16, marginBottom: 12, borderTopWidth: 1, borderTopColor: colors.border },
  detailSection: { marginTop: 12 },
  detailTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 8 },
  detailEmpty: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  detailRowText: { flex: 1, fontSize: 14, color: colors.text },
  detailRowMeta: { fontSize: 12, color: colors.textMuted },
});
