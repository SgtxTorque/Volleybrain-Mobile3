import AppHeaderBar from '@/components/ui/AppHeaderBar';
import { useAuth } from '@/lib/auth';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SeasonReportsScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const s = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Existing data
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

  // New data
  const [waiverCompliant, setWaiverCompliant] = useState(0);
  const [waiverTotal, setWaiverTotal] = useState(0);
  const [rosterFill, setRosterFill] = useState<{ name: string; count: number; max: number }[]>([]);
  const [eventsThisWeek, setEventsThisWeek] = useState(0);
  const [eventsThisMonth, setEventsThisMonth] = useState(0);

  const fetchData = async () => {
    if (!workingSeason) { setLoading(false); return; }
    const sid = workingSeason.id;
    const orgId = profile?.current_organization_id;

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

    // Waiver compliance
    if (orgId && playerIds.length > 0) {
      const { data: requiredWaivers } = await supabase
        .from('waiver_templates')
        .select('id')
        .eq('organization_id', orgId)
        .eq('is_required', true)
        .eq('is_active', true);
      const waiverIds = (requiredWaivers || []).map(w => w.id);
      if (waiverIds.length > 0) {
        const { data: signatures } = await supabase
          .from('waiver_signatures')
          .select('player_id, waiver_template_id')
          .in('season_id', [sid])
          .in('player_id', playerIds)
          .in('waiver_template_id', waiverIds);
        const sigMap = new Map<string, Set<string>>();
        for (const sig of signatures || []) {
          if (!sigMap.has(sig.player_id)) sigMap.set(sig.player_id, new Set());
          sigMap.get(sig.player_id)!.add(sig.waiver_template_id);
        }
        let compliant = 0;
        for (const pid of playerIds) {
          const signed = sigMap.get(pid);
          if (signed && waiverIds.every(wId => signed.has(wId))) compliant++;
        }
        setWaiverCompliant(compliant);
        setWaiverTotal(playerIds.length);
      } else {
        setWaiverCompliant(playerIds.length);
        setWaiverTotal(playerIds.length);
      }
    }

    // Roster fill per team
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name, max_players_per_team:seasons!inner(max_players_per_team)')
      .eq('season_id', sid)
      .order('name');
    // Fallback: just get teams directly
    const { data: simpleTeams } = await supabase.from('teams').select('id, name').eq('season_id', sid).order('name');
    const teamsList = simpleTeams || [];
    const maxPerTeam = (workingSeason as any).max_players_per_team || 15;
    if (teamsList.length > 0) {
      const teamIds = teamsList.map(t => t.id);
      const { data: tpData } = await supabase.from('team_players').select('team_id').in('team_id', teamIds);
      const countMap: Record<string, number> = {};
      for (const tp of tpData || []) countMap[tp.team_id] = (countMap[tp.team_id] || 0) + 1;
      setRosterFill(teamsList.map(t => ({ name: t.name, count: countMap[t.id] || 0, max: maxPerTeam })));
    }

    // Upcoming events
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const monthEnd = new Date(now);
    monthEnd.setDate(monthEnd.getDate() + 30);
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    const [{ count: weekCount }, { count: monthCount }] = await Promise.all([
      supabase.from('schedule_events').select('*', { count: 'exact', head: true }).eq('season_id', sid).gte('event_date', todayStr).lte('event_date', weekEndStr),
      supabase.from('schedule_events').select('*', { count: 'exact', head: true }).eq('season_id', sid).gte('event_date', todayStr).lte('event_date', monthEndStr),
    ]);
    setEventsThisWeek(weekCount || 0);
    setEventsThisMonth(monthCount || 0);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [workingSeason?.id]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const revenuePercent = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const winPct = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
  const waiverPct = waiverTotal > 0 ? Math.round((waiverCompliant / waiverTotal) * 100) : 0;

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

        {/* Games Breakdown → Schedule */}
        <TouchableOpacity style={[s.card, { marginHorizontal: spacing.screenPadding }]} onPress={() => router.push('/(tabs)/admin-schedule' as any)} activeOpacity={0.7}>
          <View style={s.cardHeader}>
            <Ionicons name="trophy-outline" size={16} color={colors.primary} />
            <Text style={[s.cardTitle, { flex: 1 }]}>GAMES</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
          <View style={s.statRow}>
            <View style={s.statItem}><Text style={s.statNum}>{gamesPlayed}</Text><Text style={s.statLabel}>Played</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.success }]}>{wins}</Text><Text style={s.statLabel}>Wins</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.danger }]}>{losses}</Text><Text style={s.statLabel}>Losses</Text></View>
            <View style={s.statItem}><Text style={s.statNum}>{winPct}%</Text><Text style={s.statLabel}>Win %</Text></View>
          </View>
        </TouchableOpacity>

        {/* Financials → Payments */}
        <TouchableOpacity style={[s.card, { marginHorizontal: spacing.screenPadding }]} onPress={() => router.push('/(tabs)/payments' as any)} activeOpacity={0.7}>
          <View style={s.cardHeader}>
            <Ionicons name="cash-outline" size={16} color={colors.success} />
            <Text style={[s.cardTitle, { flex: 1 }]}>FINANCIALS</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
          <View style={s.statRow}>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.success }]}>${totalCollected.toLocaleString()}</Text><Text style={s.statLabel}>Collected</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.warning }]}>${(totalExpected - totalCollected).toLocaleString()}</Text><Text style={s.statLabel}>Outstanding</Text></View>
          </View>
          <View style={s.progressBar}><View style={[s.progressFill, { width: `${Math.min(revenuePercent, 100)}%` }]} /></View>
          <Text style={s.progressText}>{revenuePercent}% collected</Text>
        </TouchableOpacity>

        {/* Players → Teams tab */}
        <TouchableOpacity style={[s.card, { marginHorizontal: spacing.screenPadding }]} onPress={() => router.push('/(tabs)/admin-teams' as any)} activeOpacity={0.7}>
          <View style={s.cardHeader}>
            <Ionicons name="people-outline" size={16} color={colors.info} />
            <Text style={[s.cardTitle, { flex: 1 }]}>PLAYERS</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
          <View style={s.statRow}>
            <View style={s.statItem}><Text style={s.statNum}>{playerCount}</Text><Text style={s.statLabel}>Total</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.success }]}>{rosteredCount}</Text><Text style={s.statLabel}>Rostered</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.warning }]}>{playerCount - rosteredCount}</Text><Text style={s.statLabel}>Unrostered</Text></View>
            <View style={s.statItem}><Text style={s.statNum}>{teamCount}</Text><Text style={s.statLabel}>Teams</Text></View>
          </View>
        </TouchableOpacity>

        {/* Registrations → Registration hub */}
        <TouchableOpacity style={[s.card, { marginHorizontal: spacing.screenPadding }]} onPress={() => router.push('/registration-hub' as any)} activeOpacity={0.7}>
          <View style={s.cardHeader}>
            <Ionicons name="document-text-outline" size={16} color="#AF52DE" />
            <Text style={[s.cardTitle, { flex: 1 }]}>REGISTRATIONS</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
          <View style={s.statRow}>
            <View style={s.statItem}><Text style={s.statNum}>{regTotal}</Text><Text style={s.statLabel}>Total</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.success }]}>{regApproved}</Text><Text style={s.statLabel}>Approved</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.warning }]}>{regPending}</Text><Text style={s.statLabel}>Pending</Text></View>
          </View>
        </TouchableOpacity>

        {/* Waiver Compliance */}
        <TouchableOpacity style={[s.card, { marginHorizontal: spacing.screenPadding }]} onPress={() => router.push('/(tabs)/admin-teams' as any)} activeOpacity={0.7}>
          <View style={s.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#14B8A6" />
            <Text style={[s.cardTitle, { flex: 1 }]}>WAIVER COMPLIANCE</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
          <View style={s.statRow}>
            <View style={s.statItem}><Text style={[s.statNum, { color: waiverPct >= 80 ? colors.success : colors.warning }]}>{waiverPct}%</Text><Text style={s.statLabel}>Compliant</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.success }]}>{waiverCompliant}</Text><Text style={s.statLabel}>Complete</Text></View>
            <View style={s.statItem}><Text style={[s.statNum, { color: colors.warning }]}>{waiverTotal - waiverCompliant}</Text><Text style={s.statLabel}>Missing</Text></View>
          </View>
          <View style={s.progressBar}><View style={[s.progressFill, { width: `${Math.min(waiverPct, 100)}%`, backgroundColor: waiverPct >= 80 ? colors.success : colors.warning }]} /></View>
        </TouchableOpacity>

        {/* Roster Fill → Teams */}
        {rosterFill.length > 0 && (
          <TouchableOpacity style={[s.card, { marginHorizontal: spacing.screenPadding }]} onPress={() => router.push('/(tabs)/admin-teams' as any)} activeOpacity={0.7}>
            <View style={s.cardHeader}>
              <Ionicons name="grid-outline" size={16} color="#E8913A" />
              <Text style={[s.cardTitle, { flex: 1 }]}>ROSTER FILL</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </View>
            {rosterFill.map((team, i) => {
              const fillPct = team.max > 0 ? Math.round((team.count / team.max) * 100) : 0;
              return (
                <View key={i} style={{ marginBottom: i < rosterFill.length - 1 ? 8 : 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ fontSize: 12, color: colors.text, fontWeight: '500' }}>{team.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>{team.count}/{team.max}</Text>
                  </View>
                  <View style={[s.progressBar, { marginTop: 0, marginBottom: 0 }]}>
                    <View style={[s.progressFill, { width: `${Math.min(fillPct, 100)}%`, backgroundColor: fillPct >= 80 ? colors.success : fillPct >= 50 ? '#E8913A' : colors.danger }]} />
                  </View>
                </View>
              );
            })}
          </TouchableOpacity>
        )}

        {/* Upcoming Events → Schedule */}
        <TouchableOpacity style={[s.card, { marginHorizontal: spacing.screenPadding, marginBottom: 40 }]} onPress={() => router.push('/(tabs)/admin-schedule' as any)} activeOpacity={0.7}>
          <View style={s.cardHeader}>
            <Ionicons name="calendar-outline" size={16} color="#0EA5E9" />
            <Text style={[s.cardTitle, { flex: 1 }]}>UPCOMING EVENTS</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
          <View style={s.statRow}>
            <View style={s.statItem}><Text style={s.statNum}>{eventsThisWeek}</Text><Text style={s.statLabel}>This Week</Text></View>
            <View style={s.statItem}><Text style={s.statNum}>{eventsThisMonth}</Text><Text style={s.statLabel}>Next 30 Days</Text></View>
          </View>
        </TouchableOpacity>

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
