/**
 * JourneyNodeCircle — Redesigned node component for the world map.
 * Renders completed, available, locked, boss, and bonus node states
 * with themed glow, mascot images, and animated rings.
 */
import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getMascotImage } from '@/lib/mascot-images';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import type { JourneyNode } from '@/hooks/useJourneyPath';
import type { JourneyTheme } from '@/lib/journey-themes';

const NODE_SIZE = 56;
const BOSS_SIZE = 70;
const BONUS_SIZE = 40;

type Props = {
  node: JourneyNode;
  nodeIdx: number;
  theme: JourneyTheme;
  onTap: () => void;
};

export default function JourneyNodeCircle({ node, nodeIdx, theme, onTap }: Props) {
  const isAvailable = node.progress.status === 'available' || node.progress.status === 'in_progress';
  const isCompleted = node.progress.status === 'completed';
  const isLocked = node.progress.status === 'locked';
  const isBoss = node.is_boss;
  const isBonus = node.is_bonus;

  const size = isBoss ? BOSS_SIZE : isBonus ? BONUS_SIZE : NODE_SIZE;
  const borderRadius = isBoss ? 20 : size / 2;

  // Pulsing ring for available nodes
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.4);

  useEffect(() => {
    if (isAvailable) {
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, false,
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1200 }),
          withTiming(0.4, { duration: 1200 }),
        ),
        -1, false,
      );
    }
    return () => { cancelAnimation(ringScale); cancelAnimation(ringOpacity); };
  }, [isAvailable]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const mascotSource = getMascotImage(node.skillContent?.tip_image_url ?? node.icon_emoji);

  // Theme-based gradient colors
  const circleColors = isCompleted
    ? [theme.pathDoneColor, `${theme.pathDoneColor}CC`] as const
    : isAvailable
      ? (isBoss ? ['#FFD700', '#e6a800'] as const : [theme.currentNodeGlow, `${theme.currentNodeGlow}AA`] as const)
      : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)'] as const;

  return (
    <Animated.View
      entering={FadeInDown.delay(nodeIdx * 50).springify().damping(14)}
      style={styles.wrapper}
    >
      <Pressable onPress={onTap} disabled={isLocked} style={styles.pressable}>
        {/* Pulsing ring for available */}
        {isAvailable && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                width: size + 20,
                height: size + 20,
                borderRadius: isBoss ? 25 : (size + 20) / 2,
                borderColor: theme.currentNodeGlow,
              },
              ringStyle,
            ]}
          />
        )}

        {/* Boss decoration: crown */}
        {isBoss && isAvailable && (
          <View style={styles.bossDecor}>
            <Ionicons name="star" size={14} color="#FFD700" />
          </View>
        )}

        {/* Bonus decoration: sparkle */}
        {isBonus && (
          <View style={styles.bonusDecor}>
            <Ionicons name="sparkles" size={10} color="#A855F7" />
          </View>
        )}

        {/* Node circle */}
        <LinearGradient
          colors={circleColors as any}
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius,
              opacity: isLocked ? 0.25 : 1,
            },
            isBonus && styles.bonusBorder,
            isBoss && isAvailable && styles.bossBorder,
          ]}
        >
          <Image
            source={mascotSource}
            style={[
              styles.mascot,
              { width: size - 14, height: size - 14 },
              isLocked && styles.mascotLocked,
            ]}
            resizeMode="contain"
          />

          {/* Completed checkmark badge */}
          {isCompleted && (
            <View style={[styles.checkBadge, { borderColor: theme.pathDoneColor }]}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          )}

          {/* Locked icon overlay */}
          {isLocked && (
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.3)" />
            </View>
          )}
        </LinearGradient>

        {/* Micro label below */}
        {isBoss && !isCompleted && (
          <Text style={[styles.microLabel, { color: '#FFD700' }]}>BOSS</Text>
        )}
        {isBonus && !isCompleted && (
          <Text style={[styles.microLabel, { color: '#A855F7' }]}>BONUS</Text>
        )}
        {isAvailable && !isBoss && !isBonus && (
          <Text style={[styles.microLabel, { color: theme.currentNodeGlow }]}>START</Text>
        )}
      </Pressable>

      {/* Node title */}
      <Text
        style={[
          styles.nodeLabel,
          isCompleted && styles.nodeLabelDone,
          isLocked && styles.nodeLabelLocked,
        ]}
        numberOfLines={2}
      >
        {node.title}
      </Text>

      {/* XP reward */}
      <Text
        style={[
          styles.nodeXp,
          isAvailable && { color: PLAYER_THEME.xpGold },
          isCompleted && styles.nodeXpDone,
          isLocked && styles.nodeXpLocked,
        ]}
      >
        +{node.xp_reward} XP
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    position: 'absolute',
  },
  pressable: {
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    top: -10,
    left: -10,
  },
  bossDecor: {
    position: 'absolute',
    top: -16,
    zIndex: 2,
  },
  bonusDecor: {
    position: 'absolute',
    top: -12,
    zIndex: 2,
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bonusBorder: {
    borderWidth: 2,
    borderColor: 'rgba(168,85,247,0.4)',
    borderStyle: 'dashed',
  },
  bossBorder: {
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.5)',
  },
  mascot: {
    borderRadius: 4,
  },
  mascotLocked: {
    opacity: 0.2,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  microLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 8,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  nodeLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 5,
    textAlign: 'center',
    maxWidth: 100,
  },
  nodeLabelDone: {
    color: PLAYER_THEME.textMuted,
  },
  nodeLabelLocked: {
    color: PLAYER_THEME.textFaint,
  },
  nodeXp: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: PLAYER_THEME.textMuted,
    marginTop: 2,
  },
  nodeXpDone: {
    color: PLAYER_THEME.textFaint,
  },
  nodeXpLocked: {
    color: PLAYER_THEME.textFaint,
    opacity: 0.5,
  },
});
