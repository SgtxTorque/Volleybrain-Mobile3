/**
 * PlayerQuestEntryCard — Compact gradient card for the home scroll.
 * Replaces the three separate quest sections with a single tappable entry
 * that navigates to the dedicated QuestsScreen.
 *
 * Visual treatment complementary to PlayerContinueTraining (teal vs purple).
 */
import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '@/theme/fonts';
import { D_RADII } from '@/theme/d-system';
import { PLAYER_THEME } from '@/theme/player-theme';
import { MASCOT } from '@/lib/mascot-images';

type Props = {
  dailyComplete: number;
  dailyTotal: number;
  weeklyComplete: number;
  weeklyTotal: number;
  teamComplete: number;
  teamTotal: number;
  xpEarnedToday: number;
};

function ProgressPill({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
  const isComplete = total > 0 && done >= total;
  const hasProgress = done > 0 && !isComplete;

  const pillBg = isComplete
    ? 'rgba(34,197,94,0.15)'
    : hasProgress
      ? 'rgba(75,185,236,0.15)'
      : 'rgba(255,255,255,0.08)';
  const textColor = isComplete
    ? PLAYER_THEME.success
    : hasProgress
      ? PLAYER_THEME.accent
      : PLAYER_THEME.textMuted;

  return (
    <View style={[styles.progressPill, { backgroundColor: pillBg }]}>
      {isComplete && (
        <Ionicons name="checkmark-circle" size={12} color={PLAYER_THEME.success} />
      )}
      <Text style={[styles.progressPillText, { color: textColor }]}>
        {label} {done}/{total}
      </Text>
    </View>
  );
}

export default function PlayerQuestEntryCard({
  dailyComplete,
  dailyTotal,
  weeklyComplete,
  weeklyTotal,
  teamComplete,
  teamTotal,
  xpEarnedToday,
}: Props) {
  const router = useRouter();

  // Shimmer sweep
  const shimmerX = useSharedValue(-200);
  // Press scale
  const pressScale = useSharedValue(1);
  // Arrow nudge
  const arrowNudge = useSharedValue(0);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withSequence(
        withTiming(400, { duration: 1200 }),
        withTiming(-200, { duration: 0 }),
        withTiming(-200, { duration: 3800 }),
      ),
      -1, false,
    );

    arrowNudge.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 1000 }),
        withTiming(0, { duration: 1000 }),
      ),
      -1, false,
    );

    return () => {
      cancelAnimation(shimmerX);
      cancelAnimation(arrowNudge);
    };
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowNudge.value }],
  }));

  const handlePress = () => {
    router.push('/quests' as any);
  };

  return (
    <Pressable
      onPressIn={() => {
        pressScale.value = withSpring(0.97, { damping: 12, stiffness: 200 });
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
      onPress={handlePress}
    >
      <Animated.View style={[styles.outerWrap, scaleStyle]}>
        <LinearGradient
          colors={['#0EA5E9', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Top row: label + mascot */}
          <View style={styles.topRow}>
            <Text style={styles.cardLabel}>QUESTS</Text>
            <Image
              source={MASCOT.ARE_YOU_READY}
              style={styles.mascot}
              resizeMode="contain"
            />
          </View>

          {/* Progress pills */}
          <View style={styles.pillRow}>
            <ProgressPill label="Daily" done={dailyComplete} total={dailyTotal} />
            <ProgressPill label="Weekly" done={weeklyComplete} total={weeklyTotal} />
            {teamTotal > 0 && (
              <ProgressPill label="Team" done={teamComplete} total={teamTotal} />
            )}
          </View>

          {/* Bottom row: XP + arrow */}
          <View style={styles.bottomRow}>
            <Text style={styles.xpText}>
              {xpEarnedToday > 0 ? `+${xpEarnedToday} XP today` : 'No XP earned yet today'}
            </Text>
            <Animated.View style={arrowStyle}>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />
            </Animated.View>
          </View>

          {/* Shimmer overlay */}
          <Animated.View style={[styles.shimmer, shimmerStyle]} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    borderRadius: D_RADII.card,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardLabel: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  mascot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.60)',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 120,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ skewX: '-15deg' }],
  },
});
