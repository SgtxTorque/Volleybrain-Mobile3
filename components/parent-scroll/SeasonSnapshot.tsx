/**
 * SeasonSnapshot — large win/loss numbers + win-rate bar.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING, SHADOWS } from '@/theme/spacing';
import type { SeasonRecord } from '@/hooks/useParentHomeData';

type Props = {
  record: SeasonRecord | null;
  lastGameResult?: string | null;
};

export default function SeasonSnapshot({ record, lastGameResult }: Props) {
  if (!record || record.games_played === 0) return null;

  const winRate = record.games_played > 0 ? record.wins / record.games_played : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>SEASON</Text>
      <View style={styles.card}>
        {/* Big numbers */}
        <View style={styles.numbersRow}>
          <Text style={[styles.bigNum, { color: BRAND.success }]}>{record.wins}</Text>
          <Text style={styles.divider}>|</Text>
          <Text style={[styles.bigNum, { color: BRAND.error }]}>{record.losses}</Text>
        </View>

        {/* Latest game result */}
        {lastGameResult && (
          <Text style={styles.latestGame}>{lastGameResult}</Text>
        )}

        {/* Win-rate bar */}
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${winRate * 100}%` }]} />
        </View>
        <Text style={styles.barLabel}>
          {(winRate * 100).toFixed(0)}% win rate
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.pagePadding,
    marginBottom: SPACING.sectionGap,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: {
    backgroundColor: BRAND.white,
    borderRadius: SPACING.cardRadius,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.light,
  },
  numbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  bigNum: {
    fontFamily: FONTS.display,
    fontSize: 36,
    letterSpacing: 1,
  },
  divider: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: BRAND.textFaint,
  },
  latestGame: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textMuted,
    marginBottom: 12,
  },
  barBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.warmGray,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: BRAND.success,
  },
  barLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 6,
  },
});
