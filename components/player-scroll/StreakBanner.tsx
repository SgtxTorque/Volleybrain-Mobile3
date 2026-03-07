/**
 * StreakBanner — Gold-tinted banner showing attendance streak.
 * Only renders when streak >= 2. Pulses opacity.
 * Phase 3.
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

type Props = {
  streak: number;
};

export default function StreakBanner({ streak }: Props) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.7, { duration: 750 }),
      -1,
      true,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  if (streak < 2) return null;

  return (
    <Animated.View style={[styles.banner, pulseStyle]}>
      <Text style={styles.flame}>{'\u{1F525}'}</Text>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{streak}-Day Streak</Text>
        <Text style={styles.subtitle}>Keep it going {'\u2014'} you're locked in</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,215,0,0.06)',
  },
  flame: {
    fontSize: 20,
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#FFD700',
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.30)',
    marginTop: 1,
  },
});
