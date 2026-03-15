/**
 * AdminAmbientCloser — Contextual closing message with mascot.
 * Mascot gentle sway: -2deg to 2deg, 4-second loop.
 * Opacity 0.8, text rgba(11,22,40,0.35).
 * ALL hooks above early returns.
 */
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FONTS } from '@/theme/fonts';

interface Props {
  adminName: string;
  teamCount: number;
  playerCount: number;
  queueCount: number;
}

function AdminAmbientCloser({ adminName, teamCount, playerCount, queueCount }: Props) {
  // ALL hooks above early return
  const swayRotation = useSharedValue(0);

  useEffect(() => {
    swayRotation.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(swayRotation);
  }, []);

  const swayStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swayRotation.value}deg` }],
  }));

  let message: string;
  if (queueCount > 0) {
    message = `${queueCount} item${queueCount !== 1 ? 's' : ''} in your queue. Let's clear them out.`;
  } else if (teamCount > 0 && playerCount > 0) {
    message = `${teamCount} team${teamCount !== 1 ? 's' : ''}. ${playerCount} player${playerCount !== 1 ? 's' : ''}. You've got this, ${adminName}.`;
  } else {
    message = `Your org is in good hands, ${adminName}.`;
  }

  return (
    <View style={styles.container}>
      <Animated.View style={swayStyle}>
        <Image
          source={require('@/assets/images/mascot/SleepLynx.png')}
          style={styles.mascotImg}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export default React.memo(AdminAmbientCloser);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 12,
    paddingBottom: 16,
  },
  mascotImg: {
    width: 40,
    height: 40,
    marginBottom: 10,
    opacity: 0.8,
  },
  message: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: 'rgba(11,22,40,0.35)',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
});
