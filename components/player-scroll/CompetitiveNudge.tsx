/**
 * CompetitiveNudge — Dynamic competitive message bar below the hero.
 * Drives action by showing how close the player is to the next milestone.
 * Scroll-triggered: slides in from left when scrolled into view.
 */
import React, { useCallback, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';
import type { BestRank } from '@/hooks/usePlayerHomeData';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type Props = {
  bestRank: BestRank | null;
  personalBest: string | null;
  xpToNext: number;
  level: number;
  challengesAvailable: boolean;
  scrollY: SharedValue<number>;
};

function buildNudgeMessage(
  bestRank: BestRank | null,
  personalBest: string | null,
  xpToNext: number,
  level: number,
  challengesAvailable: boolean,
): { emoji: string; text: string } {
  if (bestRank && bestRank.rank === 1) {
    return { emoji: '\u{1F451}', text: `You're #1 in ${bestRank.stat} this season! Keep it up` };
  }
  if (bestRank && bestRank.rank > 1 && bestRank.rank <= 10) {
    return { emoji: '\u{1F3AF}', text: `You're #${bestRank.rank} in ${bestRank.stat} — keep climbing` };
  }
  if (personalBest) {
    return { emoji: '\u{1F525}', text: `New personal best in ${personalBest}!` };
  }
  if (xpToNext <= 300) {
    return { emoji: '\u{26A1}', text: `${xpToNext} XP to Level ${level + 1}. One good game could do it` };
  }
  if (challengesAvailable) {
    return { emoji: '\u{1F3AF}', text: 'You have an active challenge waiting' };
  }
  return { emoji: '\u{1F3C6}', text: 'Check where you rank on the team' };
}

export default function CompetitiveNudge({
  bestRank,
  personalBest,
  xpToNext,
  level,
  challengesAvailable,
  scrollY,
}: Props) {
  const router = useRouter();

  // Scroll entrance
  const componentY = useSharedValue(0);
  const entered = useSharedValue(0);
  const translateX = useSharedValue(-30);
  const opacity = useSharedValue(0);

  const onLayoutCapture = useCallback((e: any) => {
    componentY.value = e.nativeEvent.layout.y;
  }, []);

  useDerivedValue(() => {
    if (entered.value === 0 && componentY.value > 0 && scrollY.value + SCREEN_HEIGHT > componentY.value - 50) {
      entered.value = 1;
    }
  });

  useAnimatedReaction(
    () => entered.value,
    (val, prev) => {
      if (val === 1 && (prev === null || prev === 0)) {
        translateX.value = withTiming(0, { duration: 400 });
        opacity.value = withTiming(1, { duration: 400 });
      }
    },
  );

  const entranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const nudge = useMemo(
    () => buildNudgeMessage(bestRank, personalBest, xpToNext, level, challengesAvailable),
    [bestRank, personalBest, xpToNext, level, challengesAvailable],
  );

  return (
    <Animated.View onLayout={onLayoutCapture} style={[styles.outerWrap, entranceStyle]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/standings' as any)}
      >
        <LinearGradient
          colors={['rgba(75,185,236,0.06)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.bar}
        >
          <Text style={styles.emoji}>{nudge.emoji}</Text>
          <Text style={styles.text} numberOfLines={1}>{nudge.text}</Text>
          <Text style={styles.arrow}>{'\u2192'}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PLAYER_THEME.cardBg,
    borderRadius: D_RADII.cardSmall,
    borderWidth: 1,
    borderColor: PLAYER_THEME.borderAccent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  emoji: {
    fontSize: 16,
  },
  text: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PLAYER_THEME.textPrimary,
  },
  arrow: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: PLAYER_THEME.accent,
  },
});
