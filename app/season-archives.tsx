import AdminContextBar from '@/components/AdminContextBar';
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
  game_count: number;
  revenue_collected: number;
  revenue_total: number;
};

type TeamStanding = {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
};

type SeasonDetail = {
  teams: { id: string; name: string; player_count: number }[];
  games: { id: string; title: string; event_date: string; location: string | null }[];
  standings: TeamStanding[];
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
      if (!data || data.length === 0) { setSeasons([]); setLoading(false); return; }

      const seasonIds = data.map(s => s.id);

      // Batch: get all teams for these seasons
      const { data: allTeams } = await supabase
        .from('teams')
        .select('id, season_id')
        .in('season_id', seasonIds);

      const teamsBySeasonMap = new Map<string, string[]>();
      (allTeams || []).forEach(t => {
        const ids = teamsBySeasonMap.get(t.season_id) || [];
        ids.push(t.id);
        teamsBySeasonMap.set(t.season_id, ids);
      });

      // Batch: get all team_players counts
      const allTeamIds = (allTeams || []).map(t => t.id);
      let playerCountByTeam = new Map<string, number>();
      if (allTeamIds.length > 0) {
        const { data: teamPlayers } = await supabase
          .from('team_players')
          .select('team_id')
          .in('team_id', allTeamIds);
        (teamPlayers || []).forEach(tp => {
          playerCountByTeam.set(tp.team_id, (playerCountByTeam.get(tp.team_id) || 0) + 1);
        });
      }

      // Batch: revenue data
      const { data: allPayments } = await supabase
        .from('payments')
        .select('season_id, amount, paid')
        .in('season_id', seasonIds);

      // Batch: game counts per season
      const { data: allGames } = await supabase
        .from('schedule_events')
        .select('season_id')
        .in('season_id', seasonIds)
        .eq('event_type', 'game');
      const gameCountBySeason = new Map<string, number>();
      (allGames || []).forEach(g => {
        gameCountBySeason.set(g.season_id, (gameCountBySeason.get(g.season_id) || 0) + 1);
      });

      const enriched: ArchivedSeason[] = data.map(season => {
        const teamIds = teamsBySeasonMap.get(season.id) || [];
        const playerCount = teamIds.reduce((sum, tid) => sum + (playerCountByTeam.get(tid) || 0), 0);
        const seasonPayments = (allPayments || []).filter(p => p.season_id === season.id);
        const collected = seasonPayments.filter(p => p.paid).reduce((sum, p) => sum + (p.amount || 0), 0);
        const total = seasonPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        return {
          ...season,
          team_count: teamIds.length,
          player_count: playerCount,
          game_count: gameCountBySeason.get(season.id) || 0,
          revenue_collected: collected,
          revenue_total: total,
        };
      });

      setSeasons(enriched);
    } catch (error) {
      if (__DEV__) console.error('Error fetching archived seasons:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (seasonId: string) => {
    if (expandedId === seasonId) { setExpandedId(null); return; }
    setExpandedId(seasonId);
    if (details[seasonId]) return;

    setLoadingDetail(seasonId);
    try {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('season_id', seasonId)
        .order('name');

      // Batch: team player counts
      const teamIds = (teams || []).map(t => t.id);
      let playerCountMap = new Map<string, number>();
      if (teamIds.length > 0) {
        const { data: teamPlayers } = await supabase
          .from('team_players')
          .select('team_id')
          .in('team_id', teamIds);
        (teamPlayers || []).forEach(tp => {
          playerCountMap.set(tp.team_id, (playerCountMap.get(tp.team_id) || 0) + 1);
        });
      }

      const teamsWithCounts = (teams || []).map(team => ({
        ...team,
        player_count: playerCountMap.get(team.id) || 0,
      }));

      const { data: games } = await supabase
        .from('schedule_events')
        .select('id, title, event_date, location, team_id, game_result')
        .eq('season_id', seasonId)
        .eq('event_type', 'game')
        .order('event_date', { ascending: false })
        .limit(50);

      // Compute standings from game results
      const standingsMap = new Map<string, { wins: number; losses: number }>();
      const teamNameMap = new Map<string, string>();
      (teams || []).forEach(t => teamNameMap.set(t.id, t.name));
      (games || []).forEach(g => {
        if (!g.team_id || !g.game_result) return;
        if (!standingsMap.has(g.team_id)) standingsMap.set(g.team_id, { wins: 0, losses: 0 });
        const record = standingsMap.get(g.team_id)!;
        if (g.game_result === 'win') record.wins++;
        else if (g.game_result === 'loss') record.losses++;
      });
      const standings: TeamStanding[] = Array.from(standingsMap.entries())
        .map(([teamId, record]) => ({
          teamId,
          teamName: teamNameMap.get(teamId) || 'Unknown',
          wins: record.wins,
          losses: record.losses,
        }))
        .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

      setDetails(prev => ({
        ...prev,
        [seasonId]: { teams: teamsWithCounts, games: (games || []).slice(0, 20), standings },
      }));
    } catch (error) {
      if (__DEV__) console.error('Error fetching season details:', error);
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
      <AdminContextBar />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="trophy" size={22} color="#F59E0B" />
          <Text style={s.headerTitle}>Season Archives</Text>
        </View>
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
          <Text style={s.emptySubtitle}>Completed seasons will appear here.{'\n'}This is your organization's history.</Text>
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
                  <View style={s.statItem}>
                    <Ionicons name="trophy-outline" size={16} color="#F59E0B" />
                    <Text style={s.statValue}>{season.game_count}</Text>
                    <Text style={s.statLabel}>Games</Text>
                  </View>
                  <View style={s.statItem}>
                    <Ionicons name="wallet-outline" size={16} color="#22C55E" />
                    <Text style={s.statValue}>
                      ${season.revenue_collected >= 1000
                        ? (season.revenue_collected / 1000).toFixed(1) + 'K'
                        : season.revenue_collected.toLocaleString()}
                    </Text>
                    <Text style={s.statLabel}>
                      of ${season.revenue_total >= 1000
                        ? (season.revenue_total / 1000).toFixed(1) + 'K'
                        : season.revenue_total.toLocaleString()}
                    </Text>
                  </View>
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

                      {details[season.id].standings.length > 0 && (
                        <View style={s.detailSection}>
                          <Text style={s.detailTitle}>Standings</Text>
                          {details[season.id].standings.slice(0, 5).map((team, idx) => {
                            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                            return (
                              <View key={team.teamId} style={[s.detailRow, { gap: 8 }]}>
                                {medal ? (
                                  <Text style={{ fontSize: 16 }}>{medal}</Text>
                                ) : (
                                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted, width: 24, textAlign: 'center' }}>{idx + 1}</Text>
                                )}
                                <Text style={[s.detailRowText, { fontWeight: idx < 3 ? '600' : '400' }]}>{team.teamName}</Text>
                                <Text style={[s.detailRowMeta, { fontWeight: '600' }]}>{team.wins}-{team.losses}</Text>
                              </View>
                            );
                          })}
                        </View>
                      )}

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
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textMuted },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  seasonCard: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
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
  detailContainer: { backgroundColor: colors.glassCard, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, paddingHorizontal: 16, paddingBottom: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder, borderTopColor: colors.border },
  detailSection: { marginTop: 12 },
  detailTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  detailEmpty: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  detailRowText: { flex: 1, fontSize: 14, color: colors.text },
  detailRowMeta: { fontSize: 12, color: colors.textMuted },
});
