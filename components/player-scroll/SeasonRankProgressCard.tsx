import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '@/theme/fonts';
import type { SeasonRankInfo } from '@/hooks/useSeasonRank';
import SeasonRankBadge from './SeasonRankBadge';

type SeasonRankProgressCardProps = {
  rankInfo: SeasonRankInfo;
};

export default function SeasonRankProgressCard({ rankInfo }: SeasonRankProgressCardProps) {
  const {
    rankTier, rankLabel, rankColor, rankBgColor, xpMultiplier,
    seasonXp, badgesEarned, activityScore, seasonScore,
    nextRankLabel, nextRankScore, progressToNextRank,
  } = rankInfo;

  const isMaxRank = !nextRankLabel;
  const isUnranked = rankTier === 'unranked' && seasonScore === 0;

  // Unranked empty state
  if (isUnranked) {
    return (
      <View style={styles.card}>
        <View style={styles.emptyWrap}>
          <Ionicons name="shield-outline" size={32} color="#6B7280" />
          <Text style={styles.emptyTitle}>Season Rank</Text>
          <Text style={styles.emptySubtext}>
            Start earning XP to climb the ranks!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header: Rank badge + Multiplier */}
      <View style={styles.headerRow}>
        <SeasonRankBadge
          rankTier={rankTier}
          rankLabel={rankLabel}
          rankColor={rankColor}
          rankBgColor={rankBgColor}
          xpMultiplier={xpMultiplier}
          size="medium"
        />
        {xpMultiplier > 1.0 && (
          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierText}>{xpMultiplier}x XP</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressScore}>{seasonScore}</Text>
          {nextRankScore != null && (
            <Text style={styles.progressTarget}>{nextRankScore}</Text>
          )}
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.max(progressToNextRank, 2)}%`,
                backgroundColor: rankColor,
              },
            ]}
          />
        </View>
        <Text style={styles.progressHint}>
          {isMaxRank
            ? 'Max rank reached!'
            : `${(nextRankScore || 0) - seasonScore} points to ${nextRankLabel}`
          }
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{seasonXp.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Season XP</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{badgesEarned}</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{activityScore}</Text>
          <Text style={styles.statLabel}>Activity</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0B1628',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  emptySubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 4,
    textAlign: 'center',
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  multiplierBadge: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.20)',
  },
  multiplierText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#FFD700',
  },
  // Progress
  progressSection: {
    marginBottom: 14,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressScore: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.60)',
  },
  progressTarget: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.30)',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#162D50',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressHint: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.30)',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  statLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.30)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
