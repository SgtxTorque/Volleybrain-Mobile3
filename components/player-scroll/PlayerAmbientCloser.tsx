/**
 * PlayerAmbientCloser — Quiet closing message with mascot sway.
 * Dynamic message referencing real data.
 */
import React, { useEffect, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { getCloserMascot } from '@/lib/mascot-images';

type Props = {
  xpToNext: number;
  level: number;
  attendanceStreak: number;
  badgeCount: number;
};

function getClosingMessage(
  xpToNext: number,
  level: number,
  attendanceStreak: number,
  badgeCount: number,
): string {
  // Close to leveling (within 200 XP)
  if (xpToNext <= 200) {
    return `${xpToNext} XP to Level ${level + 1}. Keep grinding.`;
  }

  // On a streak
  if (attendanceStreak >= 3) {
    return `${attendanceStreak}-day streak. Don't let it end.`;
  }

  // Earned badges
  if (badgeCount > 0) {
    return `${badgeCount} badge${badgeCount !== 1 ? 's' : ''} and counting. What's next?`;
  }

  return 'Every rep counts. See you tomorrow.';
}

export default function PlayerAmbientCloser({ xpToNext, level, attendanceStreak, badgeCount }: Props) {
  // Mascot sway: rotation -2deg <-> 2deg, 4s loop
  const swayRotation = useSharedValue(0);

  useEffect(() => {
    swayRotation.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 2000 }),
        withTiming(-2, { duration: 2000 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(swayRotation);
    };
  }, []);

  const swayStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swayRotation.value}deg` }],
  }));

  const closerData = useMemo(
    () => getCloserMascot({
      streakCount: attendanceStreak,
      hasEventTomorrow: false,
      justLeveledUp: false,
      timeOfDay: new Date().getHours(),
    }),
    [attendanceStreak],
  );

  // Use closer mascot message, but prefer XP-proximity message when close to leveling
  const message = useMemo(() => {
    if (xpToNext <= 200) {
      return `${xpToNext} XP to Level ${level + 1}. Keep grinding.`;
    }
    return closerData.message;
  }, [xpToNext, level, closerData.message]);

  return (
    <View style={styles.container}>
      <Animated.View style={swayStyle}>
        <Image
          source={closerData.image}
          style={styles.mascot}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  mascot: {
    width: 40,
    height: 40,
    opacity: 0.8,
    marginBottom: 8,
  },
  message: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PLAYER_THEME.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
