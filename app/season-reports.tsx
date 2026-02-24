import AppHeaderBar from '@/components/ui/AppHeaderBar';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SeasonReportsScreen() {
  const { colors } = useTheme();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const s = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [rosteredCount, setRosteredCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalExpected, setTotalExpected] = useState(0);
  const [regTotal, setRegTotal] = useState(0);
  const [regApproved, setRegApproved] = useState(0);
  const [regPending, setRegPending] = useState(0);

  const fetchData = async () => {
    if (!workingSeason) { setLoading(false); return; }
    const sid = workingSeason.id;

    const [
      { count: pCount },
      { count: tCount },
      { data: gameResults },
      { data: players },
      { data: payments },
      { count: regTotalCount },
      { count: regApprovedCount },
      { count: regPendingCount },
    ] = await Promise.all([
      supabase.from('players').select('*', { count: 'exact', head: true }).eq('season_id', sid),
      supabase.from('teams').select('*', { count: 'exact', head: true }).eq('season_id', sid),
      supabase.from('schedule_events').select('game_result').eq('season_id', sid).eq('event_type', 'game').not('game_result', 'is', null),
      supabase.from('players').select('id').eq('season_id', sid),
      supabase.from('payments').select('amount, paid').eq('season_id', sid),
      supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('season_id', sid),
      supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('season_id', sid).in('status', ['active', 'approved']),
      supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('season_id', sid).eq('status', 'new'),
    ]);

    setPlayerCount(pCount || 0);
    setTeamCount(tCount || 0);
    setGamesPlayed((gameResults || []).length);
    setWins((gameResults || []).filter((g: any) => g.game_result === 'win').length);
    setLosses((gameResults || []).filter((g: any) => g.game_result === 'loss').length);

    // Rostered
    const playerIds = (players || []).map(p => p.id);
    if (playerIds.length > 0) {
      const { count: rCount } = await supabase.from('team_players').select('*', { count: 'exact', head: true }).in('player_id', playerIds);
      setRosteredCount(rCount || 0);
    } else {
      setRosteredCount(0);
    }

    const fee = workingSeason.fee_registration || 335;
    setTotalExpected((players?.length || 0) * fee);
    setTotalCollected((payments || []).filter((p: any) => p.paid).reduce((sum: number, p: any) => sum + p.amount, 0));

    setRegTotal(regTotalCount || 0);
    setRegApproved(regApprovedCount || 0);
    setRegPending(regPendingCount || 0);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [workingSeason?.id]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const revenuePercent = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const winPct = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <AppHeaderBar title="SEASON REPORTS" leftIcon={<Ionicons name="arrow-back" size={22} color="#FFF" />} onLeftPress={() => router.back()} showAvatar={false} showNotificationBell={false} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <AppHeaderBar title="SEASON REPORTS" leftIcon={<Ionicons name="arrow-back" size={22} color="#FFF" />} onLeftPress={() => router.back()} showAvatar={false} showNotificationBell={false} />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>

        {/* Season label */}
        <Text style={s.seasonLabel}>{workingSeason?.name || 'No Season'}</Text>

        {/* Games Breakdown */}
        <View style={[s.card, { marginHorizontal: spacing.screenPadding }]}>
          <View style={s.cardHeader}>
            <Ionicons name="trophy-outline" size={16} color={colors.primary} />
            <Text style={s.cardTitle}>GAMES</Text>
          </View>
          <View style={s.statRow}>
            <View style={s.statItem}><Text style={s.statNum}>{gamesPlayed}</Text><Text style={s.statLabel}>Played</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.success }]}>{wins}</Text><Text style={s.statLabel}>Wins</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.danger }]}>{losses}</Text><Text style={s.statLabel}>Losses</Text></View>
            <View style={s.statItem}><Text style={s.statNum}>{winPct}%</Text><Text style={s.statLabel}>Win %</Text></View>
          </View>
        </View>

        {/* Financial Overview */}
        <View style={[s.card, { marginHorizontal: spacing.screenPadding }]}>
          <View style={s.cardHeader}>
            <Ionicons name="cash-outline" size={16} color={colors.success} />
            <Text style={s.cardTitle}>FINANCIALS</Text>
          </View>
          <View style={s.statRow}>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.success }]}>${totalCollected.toLocaleString()}</Text><Text style={s.statLabel}>Collected</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.warning }]}>${(totalExpected - totalCollected).toLocaleString()}</Text><Text style={s.statLabel}>Outstanding</Text></View>
          </View>
          <View style={s.progressBar}><View style={[s.progressFill, { width: `${Math.min(revenuePercent, 100)}%` }]} /></View>
          <Text style={s.progressText}>{revenuePercent}% collected</Text>
        </View>

        {/* Players */}
        <View style={[s.card, { marginHorizontal: spacing.screenPadding }]}>
          <View style={s.cardHeader}>
            <Ionicons name="people-outline" size={16} color={colors.info} />
            <Text style={s.cardTitle}>PLAYERS</Text>
          </View>
          <View style={s.statRow}>
            <View style={s.statItem}><Text style={s.statNum}>{playerCount}</Text><Text style={s.statLabel}>Total</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.success }]}>{rosteredCount}</Text><Text style={s.statLabel}>Rostered</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.warning }]}>{playerCount - rosteredCount}</Text><Text style={s.statLabel}>Unrostered</Text></View>
            <View style={s.statItem}><Text style={s.statNum}>{teamCount}</Text><Text style={s.statLabel}>Teams</Text></View>
          </View>
        </View>

        {/* Registration Funnel */}
        <View style={[s.card, { marginHorizontal: spacing.screenPadding, marginBottom: 40 }]}>
          <View style={s.cardHeader}>
            <Ionicons name="document-text-outline" size={16} color="#AF52DE" />
            <Text style={s.cardTitle}>REGISTRATIONS</Text>
          </View>
          <View style={s.statRow}>
            <View style={s.statItem}><Text style={s.statNum}>{regTotal}</Text><Text style={s.statLabel}>Total</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.success }]}>{regApproved}</Text><Text style={s.statLabel}>Approved</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.warning }]}>{regPending}</Text><Text style={s.statLabel}>Pending</Text></View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  seasonLabel: {
    ...displayTextStyle,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  card: {
    backgroundColor: colors.glassCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statNum: {
    ...displayTextStyle,
    fontSize: 22,
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.glassBorder,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 6,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  progressText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
