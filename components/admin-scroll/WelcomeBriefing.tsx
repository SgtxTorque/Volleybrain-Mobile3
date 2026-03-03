/**
 * WelcomeBriefing — Tier 3 ambient welcome section for admin.
 * Shows greeting, scope, and urgency counters.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  greeting: string;
  adminName: string;
  teamCount: number;
  playerCount: number;
  overdueCount: number;
  thisWeekCount: number;
};

export default function WelcomeBriefing({
  greeting,
  adminName,
  teamCount,
  playerCount,
  overdueCount,
  thisWeekCount,
}: Props) {
  const allClear = overdueCount === 0 && thisWeekCount === 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.mascot}>{'\u{1F431}'}</Text>
      <Text style={styles.greeting}>
        {greeting}, {adminName}.
      </Text>
      <Text style={styles.context}>
        You're managing {teamCount} team{teamCount !== 1 ? 's' : ''} and{' '}
        {playerCount} player{playerCount !== 1 ? 's' : ''}.
      </Text>

      {allClear ? (
        <Text style={styles.allClear}>
          {'\u2705'} All caught up! Enjoy the moment.
        </Text>
      ) : (
        <View style={styles.countersRow}>
          {overdueCount > 0 && (
            <View style={styles.counter}>
              <View style={[styles.dot, { backgroundColor: BRAND.error }]} />
              <Text style={[styles.counterNum, { color: BRAND.error }]}>{overdueCount}</Text>
            </View>
          )}
          {thisWeekCount > 0 && (
            <View style={styles.counter}>
              <View style={[styles.dot, { backgroundColor: BRAND.warning }]} />
              <Text style={[styles.counterNum, { color: BRAND.warning }]}>{thisWeekCount}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  mascot: {
    fontSize: 48,
    marginBottom: 12,
  },
  greeting: {
    fontFamily: FONTS.bodyBold,
    fontSize: 22,
    color: BRAND.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  context: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  allClear: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.success,
    textAlign: 'center',
  },
  countersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  counterNum: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
  },
});
