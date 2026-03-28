import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SeasonRankProgressCard from '@/components/player-scroll/SeasonRankProgressCard';
import { useSeasonRank } from '@/hooks/useSeasonRank';

// =============================================================================
// Types
// =============================================================================

type Milestone = {
  id: string;
  type: 'game' | 'badge' | 'milestone';
  date: string;
  title: string;
  subtitle: string | null;
  color: 'teal' | 'gold' | 'coral';
  icon: string;
};

type SeasonSummary = {
  seasonName: string;
  wins: number;
  losses: number;
  ties: number;
  badgesEarned: number;
  gamesPlayed: number;
};

// =============================================================================
// Component
// =============================================================================

export default function SeasonProgressScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const { playerId } = useLocalSearchParams<{ playerId?: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);

  // Season rank — use user ID as profile for rank lookup
  const { rankInfo } = useSeasonRank(
    user?.id || null,
    workingSeason?.id || null,
  );

  const s = createStyles(colors);

  // =============================================================================
  // Data fetching
  // =============================================================================

  const fetchData = useCallback(async () => {
    if (!workingSeason) return;

    try {
      // Determine which player to show
      let targetPlayerId = playerId;

      if (!targetPlayerId && user?.id) {
        // Try to find the parent's first child
        const { data: guardianLinks } = await supabase
          .from('player_guardians')
          .select('player_id')
          .eq('guardian_id', user.id)
          .limit(1);

        if (guardianLinks && guardianLinks.length > 0) {
          targetPlayerId = guardianLinks[0].player_id;
        } else {
          const { data: directPlayers } = await supabase
            .from('players')
            .select('id')
            .eq('parent_account_id', user.id)
            .limit(1);

          if (directPlayers && directPlayers.length > 0) {
            targetPlayerId = directPlayers[0].id;
          }
        }
      }

      const allMilestones: Milestone[] = [];

      // Get team for this player
      let teamId: string | null = null;
      if (targetPlayerId) {
        const { data: tp } = await supabase
          .from('team_players')
          .select('team_id')
          .eq('player_id', targetPlayerId)
          .limit(1)
          .maybeSingle();
        teamId = tp?.team_id || null;
      }

      // Fetch game results for the team
      const gamesQuery = supabase
        .from('schedule_events')
        .select('id, title, event_date, game_result, our_score, opponent_score, opponent_name, opponent')
        .eq('season_id', workingSeason.id)
        .eq('event_type', 'game')
        .not('game_result', 'is', null)
        .order('event_date', { ascending: false });

      if (teamId) gamesQuery.eq('team_id', teamId);

      const { data: games } = await gamesQuery;

      let wins = 0, losses = 0, ties = 0;

      (games || []).forEach(game => {
        const oppName = game.opponent_name || game.opponent || 'Opponent';
        const isWin = game.game_result === 'win';
        const isLoss = game.game_result === 'loss';

        if (isWin) wins++;
        else if (isLoss) losses++;
        else ties++;

        allMilestones.push({
          id: `game-${game.id}`,
          type: 'game',
          date: game.event_date,
          title: `${isWin ? 'W' : isLoss ? 'L' : 'T'} vs ${oppName}`,
          subtitle: game.our_score != null && game.opponent_score != null
            ? `${game.our_score} - ${game.opponent_score}`
            : null,
          color: isWin ? 'teal' : isLoss ? 'coral' : 'gold',
          icon: isWin ? 'trophy' : isLoss ? 'close-circle' : 'remove-circle',
        });
      });

      // Fetch badges for this player
      let badgesEarned = 0;
      if (targetPlayerId) {
        const { data: badges } = await supabase
          .from('player_badges')
          .select('id, badge_name, badge_type, awarded_at')
          .eq('player_id', targetPlayerId)
          .order('awarded_at', { ascending: false });

        badgesEarned = (badges || []).length;

        (badges || []).forEach(badge => {
          allMilestones.push({
            id: `badge-${badge.id}`,
            type: 'badge',
            date: badge.awarded_at,
            title: badge.badge_name,
            subtitle: badge.badge_type,
            color: 'gold',
            icon: 'ribbon',
          });
        });
      }

      // Add automatic milestones based on games played
      const gamesPlayed = (games || []).length;
      if (gamesPlayed >= 1) {
        const firstGame = (games || [])[games!.length - 1];
        allMilestones.push({
          id: 'milestone-first-game',
          type: 'milestone',
          date: firstGame.event_date,
          title: 'First Game!',
          subtitle: 'The season journey begins',
          color: 'teal',
          icon: 'flag',
        });
      }
      if (gamesPlayed >= 5) {
        allMilestones.push({
          id: 'milestone-5-games',
          type: 'milestone',
          date: (games || [])[games!.length - 5]?.event_date || '',
          title: '5 Games Played',
          subtitle: 'Building momentum',
          color: 'teal',
          icon: 'star',
        });
      }
      if (gamesPlayed >= 10) {
        allMilestones.push({
          id: 'milestone-10-games',
          type: 'milestone',
          date: (games || [])[games!.length - 10]?.event_date || '',
          title: '10 Games Played',
          subtitle: 'Halfway there!',
          color: 'gold',
          icon: 'medal',
        });
      }

      // Sort milestones by date, most recent first
      allMilestones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setMilestones(allMilestones);
      setSummary({
        seasonName: workingSeason.name,
        wins,
        losses,
        ties,
        badgesEarned,
        gamesPlayed,
      });
    } catch (error) {
      if (__DEV__) console.error('Error fetching season progress:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workingSeason, playerId, user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDotColor = (color: string) => {
    switch (color) {
      case 'teal': return colors.primary;
      case 'coral': return colors.danger;
      case 'gold': return colors.warning;
      default: return colors.primary;
    }
  };

  // =============================================================================
  // Render
  // =============================================================================

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Season Journey</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Season Rank */}
        {rankInfo && (
          <View style={{ marginBottom: 16 }}>
            <SeasonRankProgressCard rankInfo={rankInfo} />
          </View>
        )}

        {/* Summary Card */}
        {summary && (
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>{summary.seasonName}</Text>
            <View style={s.summaryStats}>
              <View style={s.statItem}>
                <Text style={s.statValue}>{summary.wins}-{summary.losses}{summary.ties > 0 ? `-${summary.ties}` : ''}</Text>
                <Text style={s.statLabel}>Record</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statValue}>{summary.gamesPlayed}</Text>
                <Text style={s.statLabel}>Games</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statValue}>{summary.badgesEarned}</Text>
                <Text style={s.statLabel}>Badges</Text>
              </View>
              {rankInfo && rankInfo.rankTier !== 'unranked' && (
                <>
                  <View style={s.statDivider} />
                  <View style={s.statItem}>
                    <Text style={[s.statValue, { color: rankInfo.rankColor }]}>{rankInfo.rankLabel}</Text>
                    <Text style={s.statLabel}>Rank</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Timeline */}
        {milestones.length === 0 ? (
          <View style={s.emptyCard}>
            <Image
              source={require('@/assets/images/mascot/Meet-Lynx.png')}
              style={s.emptyMascot}
              resizeMode="contain"
            />
            <Text style={s.emptyTitle}>Your season journey starts here!</Text>
            <Text style={s.emptySubtext}>
              Milestones will appear as the season unfolds.
            </Text>
          </View>
        ) : (
          <View style={s.timeline}>
            {milestones.map((milestone, index) => {
              const dotColor = getDotColor(milestone.color);
              const isLast = index === milestones.length - 1;

              return (
                <View key={milestone.id} style={s.timelineRow}>
                  {/* Line + Dot */}
                  <View style={s.lineColumn}>
                    <View style={[s.dot, { backgroundColor: dotColor }]}>
                      <Ionicons name={milestone.icon as any} size={12} color={colors.background} />
                    </View>
                    {!isLast && <View style={[s.line, { backgroundColor: colors.border }]} />}
                  </View>

                  {/* Card */}
                  <View style={s.milestoneCard}>
                    <Text style={s.milestoneDate}>{formatDate(milestone.date)}</Text>
                    <Text style={s.milestoneTitle}>{milestone.title}</Text>
                    {milestone.subtitle && (
                      <Text style={s.milestoneSubtitle}>{milestone.subtitle}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { ...displayTextStyle, fontSize: 18, color: colors.text },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.screenPadding },

    // Summary
    summaryCard: {
      backgroundColor: colors.glassCard, borderRadius: radii.card, padding: 20,
      marginBottom: 24, borderWidth: 1, borderColor: colors.glassBorder, ...shadows.card,
    },
    summaryTitle: { ...displayTextStyle, fontSize: 20, color: colors.text, textAlign: 'center', marginBottom: 16 },
    summaryStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 22, fontFamily: FONTS.bodyBold, color: colors.text },
    statLabel: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
    statDivider: { width: 1, height: 32, backgroundColor: colors.border },

    // Empty state
    emptyCard: {
      backgroundColor: colors.glassCard, borderRadius: radii.card, padding: 40,
      alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder, ...shadows.card,
    },
    emptyMascot: { width: 120, height: 120, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontFamily: FONTS.bodySemiBold, color: colors.text, textAlign: 'center' },
    emptySubtext: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },

    // Timeline
    timeline: { paddingLeft: 4 },
    timelineRow: { flexDirection: 'row', minHeight: 72 },
    lineColumn: { width: 32, alignItems: 'center' },
    dot: {
      width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
      zIndex: 1,
    },
    line: { width: 2, flex: 1, marginTop: -2 },
    milestoneCard: {
      flex: 1, marginLeft: 12, marginBottom: 16,
      backgroundColor: colors.glassCard, borderRadius: radii.card, padding: 14,
      borderWidth: 1, borderColor: colors.glassBorder,
    },
    milestoneDate: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: colors.textMuted, marginBottom: 4 },
    milestoneTitle: { fontSize: 15, fontFamily: FONTS.bodyBold, color: colors.text },
    milestoneSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  });
