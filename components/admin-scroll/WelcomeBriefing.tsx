/**
 * WelcomeBriefing — Tier 3 ambient welcome section for admin.
 * Shows greeting, scope, urgency counters.
 * Phase 2: parallax mascot, celebratory all-clear variant.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  greeting: string;
  adminName: string;
  teamCount: number;
  playerCount: number;
  overdueCount: number;
  thisWeekCount: number;
  scrollY: SharedValue<number>;
};

export default function WelcomeBriefing({
  greeting,
  adminName,
  teamCount,
  playerCount,
  overdueCount,
  thisWeekCount,
  scrollY,
}: Props) {
  const allClear = overdueCount === 0 && thisWeekCount === 0;

  // Parallax mascot: moves at 0.3x scroll speed
  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: interpolate(scrollY.value, [0, 300], [0, -90], Extrapolation.CLAMP),
    }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={mascotStyle}>
        <Text style={styles.mascot}>
          {allClear ? '\u{1F389}' : '\u{1F431}'}
        </Text>
      </Animated.View>

      <Text style={styles.greeting}>
        {greeting}, {adminName}.
      </Text>
      <Text style={styles.context}>
        You're managing {teamCount} team{teamCount !== 1 ? 's' : ''} and{' '}
        {playerCount} player{playerCount !== 1 ? 's' : ''}.
      </Text>

      {allClear ? (
        <View style={styles.allClearWrap}>
          <Text style={styles.allClearText}>
            {'\u2705'} All caught up! Enjoy the moment.
          </Text>
        </View>
      ) : (
        <View style={styles.countersRow}>
          {overdueCount > 0 && (
            <View style={[styles.counterPill, { borderColor: 'rgba(239,68,68,0.20)', backgroundColor: 'rgba(239,68,68,0.06)' }]}>
              <View style={[styles.dot, { backgroundColor: BRAND.error }]} />
              <Text style={[styles.counterNum, { color: BRAND.error }]}>{overdueCount}</Text>
            </View>
          )}
          {thisWeekCount > 0 && (
            <View style={[styles.counterPill, { borderColor: 'rgba(245,158,11,0.20)', backgroundColor: 'rgba(245,158,11,0.06)' }]}>
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
  allClearWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  allClearText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.success,
    textAlign: 'center',
  },
  countersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
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
