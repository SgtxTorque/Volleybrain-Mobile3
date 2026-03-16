/**
 * CoachEngagementCard — compact team engagement summary for Coach Home scroll.
 * Shows active %, avg XP, quest completion, top 3 players, inactive alert.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCoachEngagement } from '@/hooks/useCoachEngagement';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_RADII } from '@/theme/d-system';

interface Props {
  teamId: string | null;
}

// ─── Color helpers ───────────────────────────────────────────────────────────

function metricColor(value: number, goodThreshold: number, warnThreshold: number): string {
  if (value >= goodThreshold) return BRAND.success;
  if (value >= warnThreshold) return BRAND.warning;
  return BRAND.error;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CoachEngagementCard({ teamId }: Props) {
  const router = useRouter();
  const { summary, loading } = useCoachEngagement(teamId);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={BRAND.skyBlue} />
      </View>
    );
  }

  if (!summary) return null;

  const activeColor = metricColor(summary.activePercent, 70, 40);
  const questColor = metricColor(summary.questCompletionRate, 60, 30);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/coach-engagement?teamId=${teamId}` as any)}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Team engagement</Text>
        <Text style={styles.subtitle}>This week</Text>
      </View>

      {/* Metric pills */}
      <View style={styles.metricsRow}>
        <View style={styles.metricPill}>
          <Text style={[styles.metricValue, { color: activeColor }]}>{summary.activePercent}%</Text>
          <Text style={styles.metricLabel}>active</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={[styles.metricValue, { color: BRAND.textPrimary }]}>{summary.avgWeeklyXp}</Text>
          <Text style={styles.metricLabel}>avg XP</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={[styles.metricValue, { color: questColor }]}>{summary.questCompletionRate}%</Text>
          <Text style={styles.metricLabel}>quests done</Text>
        </View>
      </View>

      {/* Top 3 engaged */}
      {summary.topEngaged.length > 0 && (
        <View style={styles.topSection}>
          <Text style={styles.topLabel}>Top engaged</Text>
          {summary.topEngaged.map((p, i) => (
            <View key={p.profileId} style={styles.topRow}>
              <Text style={styles.topRank}>{i + 1}.</Text>
              <Text style={styles.topName} numberOfLines={1}>{p.playerName}</Text>
              <Text style={styles.topXp}>{p.weeklyXp} XP</Text>
            </View>
          ))}
        </View>
      )}

      {/* Inactive alert */}
      {summary.inactivePlayers.length > 0 && (
        <View style={styles.inactiveBar}>
          <Ionicons name="alert-circle" size={14} color={BRAND.error} />
          <Text style={styles.inactiveText}>
            {summary.inactivePlayers.length} player{summary.inactivePlayers.length !== 1 ? 's' : ''} haven't opened Lynx in 3+ days
          </Text>
        </View>
      )}

      {/* View details */}
      <View style={styles.footerRow}>
        <Text style={styles.viewDetails}>View details</Text>
        <Ionicons name="chevron-forward" size={14} color={BRAND.skyBlue} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: D_RADII.cardSmall,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricPill: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
  },
  metricLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: BRAND.textMuted,
  },
  topSection: {
    gap: 4,
  },
  topLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: BRAND.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  topRank: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
    width: 16,
  },
  topName: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textPrimary,
  },
  topXp: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  inactiveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  inactiveText: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.error,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  viewDetails: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
});
