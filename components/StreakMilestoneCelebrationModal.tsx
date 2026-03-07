// =============================================================================
// StreakMilestoneCelebrationModal — Celebration when a player crosses a streak tier
// Reuses LevelUpCelebrationModal animation pattern.
// =============================================================================

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StreakTier } from '@/lib/streak-engine';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DARK = {
  bg: '#0A0F1A',
  text: '#FFFFFF',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
};

const SPARKLE_COLORS = ['#FFD700', '#FFA500', '#FF6347', '#FFE4B5', '#22D3EE', '#A855F7'];

type Props = {
  visible: boolean;
  tier: StreakTier;
  streak: number;
  onDismiss: () => void;
};

export default function StreakMilestoneCelebrationModal({ visible, tier, streak, onDismiss }: Props) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;

  const sparkles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      x: new Animated.Value(SCREEN_WIDTH / 2),
      y: new Animated.Value(SCREEN_HEIGHT / 2),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
    })),
  ).current;

  useEffect(() => {
    if (!visible) return;

    overlayOpacity.setValue(0);
    emojiScale.setValue(0);
    textOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(emojiScale, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    sparkles.forEach((s, i) => {
      const angle = (i / sparkles.length) * Math.PI * 2;
      const radius = 70 + Math.random() * 50;
      const targetX = SCREEN_WIDTH / 2 + Math.cos(angle) * radius;
      const targetY = SCREEN_HEIGHT / 2 + Math.sin(angle) * radius - 40;

      s.x.setValue(SCREEN_WIDTH / 2);
      s.y.setValue(SCREEN_HEIGHT / 2 - 40);
      s.opacity.setValue(0);
      s.scale.setValue(0);

      Animated.sequence([
        Animated.delay(400 + i * 40),
        Animated.parallel([
          Animated.timing(s.x, { toValue: targetX, duration: 500, useNativeDriver: true }),
          Animated.timing(s.y, { toValue: targetY, duration: 500, useNativeDriver: true }),
          Animated.timing(s.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(s.scale, { toValue: 1, friction: 5, useNativeDriver: true }),
        ]),
        Animated.timing(s.opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]).start();
    });

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ]),
    );
    glow.start();

    return () => glow.stop();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onDismiss}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <SafeAreaView style={styles.container}>
          {/* Sparkles */}
          {sparkles.map((s, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: s.color,
                opacity: s.opacity,
                transform: [
                  { translateX: Animated.subtract(s.x, 4) },
                  { translateY: Animated.subtract(s.y, 4) },
                  { scale: s.scale },
                ],
              }}
              pointerEvents="none"
            />
          ))}

          <View style={styles.content}>
            {/* Header */}
            <Animated.Text
              style={[styles.headerText, { color: tier.color, opacity: textOpacity }]}
            >
              STREAK MILESTONE!
            </Animated.Text>

            {/* Emoji circle with glow */}
            <Animated.View
              style={[
                styles.emojiCircleGlow,
                {
                  borderColor: tier.color,
                  transform: [{ scale: emojiScale }],
                  ...Platform.select({
                    ios: {
                      shadowColor: tier.color,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: glowPulse as unknown as number,
                      shadowRadius: 30,
                    },
                    android: { elevation: 12 },
                  }),
                },
              ]}
            >
              <View style={[styles.emojiCircle, { backgroundColor: tier.color + '20' }]}>
                <Text style={styles.emojiText}>{tier.emoji}</Text>
              </View>
            </Animated.View>

            {/* Tier info */}
            <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
              <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
              <Text style={styles.streakText}>
                {streak}-event streak!
              </Text>
              {tier.xp > 0 && (
                <Text style={styles.xpText}>
                  +{tier.xp} XP earned
                </Text>
              )}
            </Animated.View>

            {/* Dismiss */}
            <Animated.View style={{ opacity: textOpacity, width: '100%', marginTop: 32 }}>
              <TouchableOpacity
                style={[styles.dismissBtn, { backgroundColor: tier.color }]}
                onPress={onDismiss}
                activeOpacity={0.8}
              >
                <Text style={styles.dismissBtnText}>Keep it up!</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  emojiCircleGlow: {
    borderRadius: 75,
    borderWidth: 3,
    marginBottom: 20,
  },
  emojiCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 56,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  streakText: {
    fontSize: 16,
    color: DARK.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  xpText: {
    fontSize: 14,
    color: DARK.textMuted,
    textAlign: 'center',
  },
  dismissBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  dismissBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
});
