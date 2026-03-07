/**
 * ClosingMotivation — Tier 3 ambient closing section.
 * Phase 6: fade-in animation, scope summary + motivational sign-off.
 */
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  adminName: string;
  teamCount: number;
  playerCount: number;
  queueTotal: number;
};

export default function ClosingMotivation({
  adminName,
  teamCount,
  playerCount,
  queueTotal,
}: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(200, withTiming(0, { duration: 500 }));
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, fadeStyle]}>
      <Image source={require('../../assets/images/mascot/HiLynx.png')} style={styles.mascotImg} resizeMode="contain" />
      <Text style={styles.scopeLine}>
        You're managing {teamCount} team{teamCount !== 1 ? 's' : ''},{' '}
        {playerCount} player{playerCount !== 1 ? 's' : ''}
        {'\n'}this season.
      </Text>
      {queueTotal > 0 ? (
        <Text style={styles.progressLine}>
          {queueTotal} item{queueTotal !== 1 ? 's' : ''} left in your queue.
        </Text>
      ) : (
        <Text style={[styles.progressLine, { color: BRAND.success }]}>
          Queue is clear {'\u2014'} great work!
        </Text>
      )}
      <Text style={styles.signOff}>You've got this, {adminName}.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  mascotImg: {
    width: 36,
    height: 36,
    marginBottom: 12,
  },
  scopeLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  progressLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  signOff: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.skyBlue,
    textAlign: 'center',
  },
});
