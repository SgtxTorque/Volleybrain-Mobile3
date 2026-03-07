/**
 * StreakBanner - Enhanced streak display with tier name, progress bar,
 * next milestone text, tier-appropriate colors, and freeze indicator.
 * Only renders when streak >= 2.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS } from '@/theme/fonts';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  getNextMilestone,
  getStreakGradient,
  getStreakTier,
} from '@/lib/streak-engine';

type Props = {
  streak: number;
  freezeUsed?: boolean;
};

export default function StreakBanner({ streak, freezeUsed }: Props) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.85, { duration: 900 }),
      -1,
      true,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  if (streak < 2) return null;

  const tier = getStreakTier(streak);
  const next = getNextMilestone(streak);
  const [gradientStart] = getStreakGradient(tier);
  const tierColor = tier?.color || '#FFD700';
  const tierEmoji = tier?.emoji || '\u{1F525}';
  const tierName = tier?.name || '';

  // Progress to next milestone
  const progressToNext = next
    ? (() => {
        const prevMin = tier?.min || 0;
        const range = next.tier.min - prevMin;
        const current = streak - prevMin;
        return range > 0 ? current / range : 0;
      })()
    : 1;

  return (
    <View style={[styles.banner, { backgroundColor: gradientStart, borderColor: tierColor + '25' }]}>
      {/* Emoji with pulse */}
      <Animated.View style={pulseStyle}>
        <Text style={styles.flame}>{tierEmoji}</Text>
      </Animated.View>

      <View style={styles.textWrap}>
        {/* Streak count + tier name */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: tierColor }]}>{streak}-Event Streak</Text>
          {tierName ? (
            <View style={[styles.tierBadge, { backgroundColor: tierColor + '20' }]}>
              <Text style={[styles.tierBadgeText, { color: tierColor }]}>{tierName}</Text>
            </View>
          ) : null}
        </View>

        {/* Freeze indicator */}
        {freezeUsed && (
          <View style={styles.freezeRow}>
            <Text style={styles.freezeText}>{'\u{1F6E1}'} Streak saved! (1 freeze used)</Text>
          </View>
        )}

        {/* Progress to next milestone */}
        {next && (
          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(progressToNext * 100, 100)}%`,
                    backgroundColor: tierColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.nextText}>
              {next.remaining} more to reach {next.tier.name}!
            </Text>
          </View>
        )}

        {/* Max tier reached */}
        {!next && tier && (
          <Text style={[styles.nextText, { color: tierColor }]}>
            Maximum tier reached!
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  flame: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tierBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  freezeRow: {
    marginTop: 4,
  },
  freezeText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: '#22D3EE',
  },
  progressSection: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  nextText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 4,
  },
});
