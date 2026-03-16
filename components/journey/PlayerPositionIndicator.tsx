/**
 * PlayerPositionIndicator — Small Lynx cub mascot that bounces next to
 * the player's current/available node on the journey map.
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
import { MASCOT } from '@/lib/mascot-images';
import { FONTS } from '@/theme/fonts';

type Props = {
  /** Which side is the node on? Indicator goes on opposite side */
  nodeSide: 'left' | 'center' | 'right';
  /** Color from the chapter theme */
  glowColor: string;
};

const MESSAGES = ["Let's go!", 'You got this!', 'Next up!', "Let's play!"];

export default function PlayerPositionIndicator({ nodeSide, glowColor }: Props) {
  const bounceY = useSharedValue(0);
  const message = MESSAGES[Math.floor(Date.now() / 60000) % MESSAGES.length];

  // Opposite side positioning
  const side = nodeSide === 'left' ? 'right' : nodeSide === 'right' ? 'left' : 'left';
  const offset = side === 'left' ? -55 : 55;

  useEffect(() => {
    bounceY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false,
    );
    return () => cancelAnimation(bounceY);
  }, []);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX: offset }] },
        bounceStyle,
      ]}
    >
      {/* Speech bubble */}
      <View style={[styles.bubble, { backgroundColor: `${glowColor}20`, borderColor: `${glowColor}40` }]}>
        <Text style={[styles.bubbleText, { color: glowColor }]}>{message}</Text>
      </View>
      {/* Mascot */}
      <Image
        source={MASCOT.LYNX_READY}
        style={styles.mascot}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  bubble: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  bubbleText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 8,
  },
  mascot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
