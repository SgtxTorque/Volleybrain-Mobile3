/**
 * CoachEngagementScreen — full team engagement dashboard for coaches.
 * Sections: team summary stats, inactive alert, sortable player table,
 * streak leaderboard, journey progress, quest completion rates.
 */
import React, { useCallback, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCoachEngagement, type PlayerEngagementData } from '@/hooks/useCoachEngagement';
import { createNotification } from '@/lib/notification-engine';
import { getStreakMascot } from '@/lib/mascot-images';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';

// ─── Color helpers ───────────────────────────────────────────────────────────

function statusColor(value: number, good: number, warn: number): string {
  if (value >= good) return BRAND.success;
  if (value >= warn) return BRAND.warning;
  return BRAND.error;
}

function activityDotColor(days: number): string {
  if (days === 0) return BRAND.success;
  if (days <= 2) return BRAND.warning;
  return BRAND.error;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CoachEngagementScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const {
    players,
    summary,
    loading,
    sortField,
    sortAsc,
    toggleSort,
    refreshEngagement,
  } = useCoachEngagement(teamId ?? null);

  const [nudgedIds, setNudgedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleNudge = useCallback(async (player: PlayerEngagementData) => {
    try {
      await createNotification(player.profileId, 'quest_reminder', {
        teamId: teamId ?? undefined,
        customTitle: 'Your coach is thinking about you',
        customBody: 'Open Lynx and get back on track. Your team needs you.',
      });
      setNudgedIds(prev => new Set(prev).add(player.profileId));
    } catch (e) {
      if (__DEV__) console.error('[CoachEngagement] nudge error:', e);
    }
  }, [teamId]);

  const sortArrow = (field: typeof sortField) => {
    if (sortField !== field) return '';
    return sortAsc ? ' \u25B2' : ' \u25BC';
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Team engagement</Text>
              <Text style={styles.headerSubtitle}>This week</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={BRAND.skyBlue} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Team engagement</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingWrap}>
            <Text style={styles.emptyText}>No engagement data available</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Streak leaderboard: sorted by current streak desc
  const streakRanked = [...players].sort((a, b) => b.currentStreak - a.currentStreak);

  // Journey progress: sorted by completion desc
  const journeyRanked = [...players].sort((a, b) => b.journeyNodesCompleted - a.journeyNodesCompleted);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Team engagement</Text>
            <Text style={styles.headerSubtitle}>This week</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refreshEngagement}
              tintColor={BRAND.skyBlue}
            />
          }
        >
          {/* ─── Section 1: Team Summary Stats (2x2) ─── */}
          <View style={styles.sectionWrap}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: statusColor(summary.activePercent, 70, 40) }]}>
                  {summary.activePlayers}/{summary.totalPlayers}
                </Text>
                <Text style={styles.statPercent}>({summary.activePercent}%)</Text>
                <Text style={styles.statLabel}>Active players</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: BRAND.textPrimary }]}>{summary.avgWeeklyXp}</Text>
                <Text style={styles.statPercent}>XP</Text>
                <Text style={styles.statLabel}>Avg weekly XP</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: statusColor(summary.questCompletionRate, 60, 30) }]}>
                  {summary.questCompletionRate}%
                </Text>
                <Text style={styles.statPercent}>today</Text>
                <Text style={styles.statLabel}>Quest completion</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: BRAND.textPrimary }]}>{summary.avgStreak}</Text>
                <Text style={styles.statPercent}>days</Text>
                <Text style={styles.statLabel}>Avg streak</Text>
              </View>
            </View>
          </View>

          {/* ─── Section 2: Inactive Players Alert ─── */}
          {summary.inactivePlayers.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.inactiveCard}>
                <View style={styles.inactiveHeader}>
                  <Ionicons name="warning" size={16} color={BRAND.error} />
                  <Text style={styles.inactiveTitle}>Needs attention</Text>
                </View>
                {summary.inactivePlayers.map(p => (
                  <View key={p.profileId} style={styles.inactiveRow}>
                    <View style={styles.inactiveInfo}>
                      <Text style={styles.inactiveName} numberOfLines={1}>{p.playerName}</Text>
                      <Text style={styles.inactiveDays}>Last active {p.daysSinceActive} days ago</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.nudgeBtn, nudgedIds.has(p.profileId) && styles.nudgeBtnSent]}
                      onPress={() => handleNudge(p)}
                      disabled={nudgedIds.has(p.profileId)}
                    >
                      <Text style={[styles.nudgeBtnText, nudgedIds.has(p.profileId) && styles.nudgeBtnTextSent]}>
                        {nudgedIds.has(p.profileId) ? 'Nudge sent' : 'Send nudge'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ─── Section 3: Player-by-Player Table ─── */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Player breakdown</Text>
            {/* Column headers */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Player</Text>
              <TouchableOpacity style={styles.tableHeaderCell} onPress={() => toggleSort('weeklyXp')}>
                <Text style={[styles.tableHeaderText, sortField === 'weeklyXp' && styles.tableHeaderActive]}>
                  XP{sortArrow('weeklyXp')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tableHeaderCell} onPress={() => toggleSort('currentStreak')}>
                <Text style={[styles.tableHeaderText, sortField === 'currentStreak' && styles.tableHeaderActive]}>
                  Streak{sortArrow('currentStreak')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tableHeaderCell} onPress={() => toggleSort('journeyNodesCompleted')}>
                <Text style={[styles.tableHeaderText, sortField === 'journeyNodesCompleted' && styles.tableHeaderActive]}>
                  Journey{sortArrow('journeyNodesCompleted')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tableHeaderCell} onPress={() => toggleSort('daysSinceActive')}>
                <Text style={[styles.tableHeaderText, sortField === 'daysSinceActive' && styles.tableHeaderActive]}>
                  Status{sortArrow('daysSinceActive')}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Rows */}
            {players.map(p => (
              <React.Fragment key={p.profileId}>
                <TouchableOpacity
                  style={styles.tableRow}
                  activeOpacity={0.7}
                  onPress={() => setExpandedId(expandedId === p.profileId ? null : p.profileId)}
                >
                  <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{p.playerName}</Text>
                  <Text style={styles.tableCell}>{p.weeklyXp}</Text>
                  <View style={[styles.tableCellRow, { flex: 1 }]}>
                    <Text style={styles.tableCell}>{'\u{1F525}'}{p.currentStreak}</Text>
                  </View>
                  <Text style={styles.tableCell}>{p.journeyNodesCompleted}/{p.journeyNodesTotal}</Text>
                  <View style={[styles.tableCellRow, { flex: 1, justifyContent: 'center' }]}>
                    <View style={[styles.statusDot, { backgroundColor: activityDotColor(p.daysSinceActive) }]} />
                  </View>
                </TouchableOpacity>
                {/* Expanded detail row */}
                {expandedId === p.profileId && (
                  <View style={styles.expandedRow}>
                    <View style={styles.expandedStats}>
                      <Text style={styles.expandedStat}>Level {p.level} {'\u00B7'} {p.tier}</Text>
                      <Text style={styles.expandedStat}>Total XP: {p.totalXp}</Text>
                      <Text style={styles.expandedStat}>Longest streak: {p.longestStreak}d</Text>
                      {p.currentChapter && (
                        <Text style={styles.expandedStat}>Journey: {p.currentChapter}</Text>
                      )}
                      <Text style={styles.expandedStat}>
                        Daily quests: {p.dailyQuestsCompletedToday}/{p.dailyQuestsTotalToday} {'\u00B7'} Weekly: {p.weeklyQuestsCompletedThisWeek}/{p.weeklyQuestsTotalThisWeek}
                      </Text>
                    </View>
                    {p.isInactive && !nudgedIds.has(p.profileId) && (
                      <TouchableOpacity style={styles.nudgeBtn} onPress={() => handleNudge(p)}>
                        <Text style={styles.nudgeBtnText}>Send nudge</Text>
                      </TouchableOpacity>
                    )}
                    {nudgedIds.has(p.profileId) && (
                      <Text style={styles.nudgeSentLabel}>Nudge sent</Text>
                    )}
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>

          {/* ─── Section 4: Streak Leaderboard ─── */}
          <View style={styles.sectionWrap}>
            <View style={styles.streakCard}>
              <Text style={styles.streakTitle}>{'\u{1F525}'} Streak Leaderboard</Text>
              {streakRanked.map((p, i) => {
                const isTop = i === 0 && p.currentStreak > 0;
                return (
                  <View key={p.profileId} style={styles.streakRow}>
                    <Text style={[styles.streakRank, p.currentStreak === 0 && styles.mutedText]}>
                      {i + 1}.
                    </Text>
                    <Text
                      style={[styles.streakName, p.currentStreak === 0 && styles.mutedText]}
                      numberOfLines={1}
                    >
                      {p.playerName}
                    </Text>
                    <Image source={getStreakMascot(p.currentStreak)} style={styles.streakMascot} resizeMode="contain" />
                    <Text style={[styles.streakCount, p.currentStreak === 0 && styles.mutedText]}>
                      {'\u{1F525}'}{p.currentStreak}d
                    </Text>
                    {isTop && <Text style={styles.crownLabel}>{'\u{1F451}'}</Text>}
                  </View>
                );
              })}
            </View>
          </View>

          {/* ─── Section 5: Journey Progress Overview ─── */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Journey progress</Text>
            {journeyRanked.map(p => {
              const pct = p.journeyNodesTotal > 0
                ? Math.round((p.journeyNodesCompleted / p.journeyNodesTotal) * 100)
                : 0;
              return (
                <View key={p.profileId} style={styles.journeyRow}>
                  <Text style={styles.journeyName} numberOfLines={1}>{p.playerName}</Text>
                  <View style={styles.journeyBarTrack}>
                    <View style={[styles.journeyBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.journeyLabel}>
                    {p.journeyNodesCompleted > 0
                      ? (p.currentChapter || `${p.journeyNodesCompleted}/${p.journeyNodesTotal}`)
                      : 'Not started'}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* ─── Section 6: Quest Completion Rates ─── */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Quest completion</Text>

            {/* Daily quests */}
            <Text style={styles.questSubheading}>Daily quests (today)</Text>
            {(() => {
              const totalD = players.reduce((s, p) => s + p.dailyQuestsTotalToday, 0);
              const doneD = players.reduce((s, p) => s + p.dailyQuestsCompletedToday, 0);
              return (
                <View style={styles.questSummaryBar}>
                  <View style={styles.questBarTrack}>
                    <View style={[styles.questBarFill, { width: totalD > 0 ? `${Math.round((doneD / totalD) * 100)}%` : '0%' }]} />
                  </View>
                  <Text style={styles.questSummaryText}>{doneD}/{totalD} completed</Text>
                </View>
              );
            })()}
            {players.map(p => (
              <View key={p.profileId} style={styles.questPlayerRow}>
                <Text style={styles.questPlayerName} numberOfLines={1}>{p.playerName}</Text>
                <Text style={styles.questPlayerVal}>
                  {p.dailyQuestsCompletedToday}/{p.dailyQuestsTotalToday}
                  {p.dailyQuestsCompletedToday === p.dailyQuestsTotalToday && p.dailyQuestsTotalToday > 0 ? ' \u2713' : ''}
                </Text>
              </View>
            ))}

            {/* Weekly quests */}
            <Text style={[styles.questSubheading, { marginTop: 14 }]}>Weekly quests (this week)</Text>
            {(() => {
              const totalW = players.reduce((s, p) => s + p.weeklyQuestsTotalThisWeek, 0);
              const doneW = players.reduce((s, p) => s + p.weeklyQuestsCompletedThisWeek, 0);
              return (
                <View style={styles.questSummaryBar}>
                  <View style={styles.questBarTrack}>
                    <View style={[styles.questBarFill, { width: totalW > 0 ? `${Math.round((doneW / totalW) * 100)}%` : '0%' }]} />
                  </View>
                  <Text style={styles.questSummaryText}>{doneW}/{totalW} completed</Text>
                </View>
              );
            })()}
            {players.map(p => (
              <View key={p.profileId} style={styles.questPlayerRow}>
                <Text style={styles.questPlayerName} numberOfLines={1}>{p.playerName}</Text>
                <Text style={styles.questPlayerVal}>
                  {p.weeklyQuestsCompletedThisWeek}/{p.weeklyQuestsTotalThisWeek}
                  {p.weeklyQuestsCompletedThisWeek === p.weeklyQuestsTotalThisWeek && p.weeklyQuestsTotalThisWeek > 0 ? ' \u2713' : ''}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: D_COLORS.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: BRAND.textPrimary,
  },
  headerSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // ─── Section wrapper ───
  sectionWrap: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: BRAND.textPrimary,
    marginBottom: 10,
  },

  // ─── Section 1: Stats grid ───
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: '48%' as any,
    backgroundColor: BRAND.white,
    borderRadius: D_RADII.cardSmall,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 14,
    alignItems: 'center',
    gap: 2,
    flexGrow: 1,
  },
  statValue: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 22,
  },
  statPercent: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textMuted,
  },
  statLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: BRAND.textMuted,
    marginTop: 2,
  },

  // ─── Section 2: Inactive alert ───
  inactiveCard: {
    backgroundColor: 'rgba(239,68,68,0.04)',
    borderRadius: D_RADII.cardSmall,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
    padding: 14,
    gap: 8,
  },
  inactiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inactiveTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: BRAND.error,
  },
  inactiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  inactiveInfo: {
    flex: 1,
  },
  inactiveName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  inactiveDays: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
  },
  nudgeBtn: {
    backgroundColor: BRAND.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  nudgeBtnSent: {
    backgroundColor: BRAND.border,
  },
  nudgeBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.white,
  },
  nudgeBtnTextSent: {
    color: BRAND.textMuted,
  },
  nudgeSentLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textMuted,
  },

  // ─── Section 3: Player table ───
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  tableHeaderCell: {
    flex: 1,
  },
  tableHeaderText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: BRAND.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableHeaderActive: {
    color: BRAND.skyBlue,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  tableCell: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textPrimary,
  },
  tableCellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  expandedRow: {
    backgroundColor: BRAND.offWhite,
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
    gap: 6,
  },
  expandedStats: {
    gap: 3,
  },
  expandedStat: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textPrimary,
  },

  // ─── Section 4: Streak leaderboard ───
  streakCard: {
    backgroundColor: BRAND.surfaceDark,
    borderRadius: D_RADII.card,
    padding: 16,
    gap: 8,
  },
  streakTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 15,
    color: BRAND.textLight,
    marginBottom: 4,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  streakRank: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textSecondary,
    width: 22,
  },
  streakName: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textLight,
  },
  streakMascot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  streakCount: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: D_COLORS.streakStart,
    width: 48,
    textAlign: 'right',
  },
  crownLabel: {
    fontSize: 14,
  },
  mutedText: {
    color: BRAND.textTertiary,
  },

  // ─── Section 5: Journey progress ───
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  journeyName: {
    width: 80,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textPrimary,
  },
  journeyBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.border,
    overflow: 'hidden',
  },
  journeyBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.skyBlue,
  },
  journeyLabel: {
    width: 70,
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: BRAND.textMuted,
    textAlign: 'right',
  },

  // ─── Section 6: Quest rates ───
  questSubheading: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textPrimary,
    marginBottom: 6,
  },
  questSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  questBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.border,
    overflow: 'hidden',
  },
  questBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.success,
  },
  questSummaryText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textMuted,
    width: 90,
    textAlign: 'right',
  },
  questPlayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  questPlayerName: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textPrimary,
  },
  questPlayerVal: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textMuted,
  },
});
