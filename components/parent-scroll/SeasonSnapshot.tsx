/**
 * SeasonSnapshot — flat Tier 2 season scoreboard with big numbers.
 * No card wrapper — content directly on page background.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

import type { SeasonRecord } from '@/hooks/useParentHomeData';

type Props = {
  record: SeasonRecord | null;
  lastGameResult?: string | null;
};

export default function SeasonSnapshot({ record, lastGameResult }: Props) {
  const router = useRouter();

  if (!record || record.games_played === 0) return null;

  const winRate = record.games_played > 0 ? record.wins / record.games_played : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>SEASON</Text>

      {/* Big numbers */}
      <View style={styles.numbersRow}>
        <View style={styles.numBlock}>
          <Text style={[styles.bigNum, { color: '#22C55E' }]}>{record.wins}</Text>
          <Text style={styles.numLabel}>WINS</Text>
        </View>
        <Text style={styles.divider}>|</Text>
        <View style={styles.numBlock}>
          <Text style={[styles.bigNum, { color: BRAND.error }]}>{record.losses}</Text>
          <Text style={styles.numLabel}>LOSSES</Text>
        </View>
      </View>

      {/* Win rate bar */}
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${winRate * 100}%` }]} />
      </View>
      <Text style={styles.barLabel}>
        {(winRate * 100).toFixed(0)}% win rate
      </Text>

      {/* Last game line */}
      {lastGameResult && (
        <TouchableOpacity
          style={styles.lastGameRow}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/parent-schedule' as any)}
        >
          <Text style={styles.lastGameText}>{lastGameResult}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 12,
  },
  numBlock: {
    alignItems: 'center',
  },
  bigNum: {
    fontFamily: FONTS.display,
    fontSize: 44,
    letterSpacing: 1,
  },
  numLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    textTransform: 'uppercase',
    marginTop: -2,
  },
  divider: {
    fontFamily: FONTS.display,
    fontSize: 32,
    color: BRAND.textFaint,
  },
  barBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.warmGray,
    overflow: 'hidden',
    marginTop: 12,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  barLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  lastGameRow: {
    marginTop: 12,
  },
  lastGameText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
    textAlign: 'center',
  },
});
