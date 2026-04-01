/**
 * MapNode — Image-based journey node token for the Chapter 1 sprite map.
 * Renders locked/available/completed/boss states with sprite tokens and glow animations.
 */
import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { JOURNEY_CH1_ASSETS } from '@/assets/images/journey';
import { SCALE } from '@/lib/journey-map-config';
import { FONTS } from '@/theme/fonts';

interface MapNodeProps {
  node: {
    id: string;
    title: string;
    is_boss: boolean;
    progress: { status: string };
  };
  position: { x: number; y: number };
  isCurrent: boolean;
  onPress: (node: any) => void;
}

const TOKEN_SIZE = 52;
const BOSS_TOKEN_SIZE = 68;

export function MapNode({ node, position, isCurrent, onPress }: MapNodeProps) {
  const scaledX = position.x * SCALE;
  const scaledY = position.y * SCALE;
  const isBoss = node.is_boss;
  const size = (isBoss ? BOSS_TOKEN_SIZE : TOKEN_SIZE) * SCALE;
  const isLocked = node.progress.status === 'locked';
  const isCompleted = node.progress.status === 'completed';
  const isAvailable = node.progress.status === 'available' || node.progress.status === 'in_progress';

  // Select token image
  let tokenSource = JOURNEY_CH1_ASSETS.nodeLocked;
  if (isBoss && !isLocked) {
    tokenSource = JOURNEY_CH1_ASSETS.nodeBoss;
  } else if (isCompleted) {
    tokenSource = JOURNEY_CH1_ASSETS.nodeCompleted;
  } else if (isAvailable) {
    tokenSource = JOURNEY_CH1_ASSETS.nodeAvailable;
  }

  // Pulsing glow animation for current/available nodes
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    if (isAvailable || isCurrent) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }
    return () => {
      cancelAnimation(glowOpacity);
      cancelAnimation(glowScale);
    };
  }, [isAvailable, isCurrent]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const glowColor = isBoss ? 'rgba(255,215,0,0.5)' : 'rgba(75,185,236,0.5)';

  return (
    <View
      style={[
        styles.container,
        {
          left: scaledX - size / 2,
          top: scaledY - size / 2,
          zIndex: 8,
        },
      ]}
    >
      <Pressable
        onPress={() => onPress(node)}
        disabled={isLocked}
        style={styles.pressable}
      >
        {/* Glow ring for available/current nodes */}
        {(isAvailable || isCurrent) && (
          <Animated.View
            style={[
              styles.glowRing,
              {
                width: size + 16 * SCALE,
                height: size + 16 * SCALE,
                borderRadius: (size + 16 * SCALE) / 2,
                backgroundColor: glowColor,
                left: -(8 * SCALE),
                top: -(8 * SCALE),
              },
              glowStyle,
            ]}
          />
        )}

        {/* Token image */}
        <Image
          source={tokenSource}
          style={[
            {
              width: size,
              height: size,
            },
            isLocked && styles.locked,
          ]}
          resizeMode="contain"
        />
      </Pressable>

      {/* Title pill below the token */}
      <View style={styles.labelPill}>
        <Text style={styles.labelText} numberOfLines={1}>
          {node.title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
  },
  locked: {
    opacity: 0.5,
  },
  labelPill: {
    backgroundColor: 'rgba(16, 40, 76, 0.85)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    maxWidth: 100,
  },
  labelText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
