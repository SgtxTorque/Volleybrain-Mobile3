// =============================================================================
// LevelUpCelebrationModal — Full-screen level-up celebration
// =============================================================================

import { getLevelTier } from '@/lib/engagement-constants';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
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

// =============================================================================
// Constants
// =============================================================================

const DARK = {
  bg: '#0A0F1A',
  card: '#111827',
  text: '#FFFFFF',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  border: 'rgba(255,255,255,0.08)',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPARKLE_COLORS = ['#FFD700', '#FFA500', '#FF6347', '#FFE4B5', '#FFEFD5', '#F0E68C'];

// =============================================================================
// Types
// =============================================================================

type Props = {
  visible: boolean;
  newLevel: number;
  totalXp: number;
  onDismiss: () => void;
};

// =============================================================================
// Component
// =============================================================================

export default function LevelUpCelebrationModal({ visible, newLevel, totalXp, onDismiss }: Props) {
  const tier = getLevelTier(newLevel);

  // Animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const levelScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;

  // Sparkle particles
  const sparkles = useRef(
    Array.from({ length: 15 }, (_, i) => ({
      x: new Animated.Value(SCREEN_WIDTH / 2),
      y: new Animated.Value(SCREEN_HEIGHT / 2),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
    })),
  ).current;

  useEffect(() => {
    if (!visible) return;

    // Reset
    overlayOpacity.setValue(0);
    levelScale.setValue(0);
    textOpacity.setValue(0);

    // Entry sequence
    Animated.sequence([
      // Fade in overlay
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Explode level number
      Animated.spring(levelScale, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
      // Fade in text
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Sparkle animations
    sparkles.forEach((s, i) => {
      const angle = (i / sparkles.length) * Math.PI * 2;
      const radius = 80 + Math.random() * 60;
      const targetX = SCREEN_WIDTH / 2 + Math.cos(angle) * radius;
      const targetY = SCREEN_HEIGHT / 2 + Math.sin(angle) * radius - 40;

      s.x.setValue(SCREEN_WIDTH / 2);
      s.y.setValue(SCREEN_HEIGHT / 2 - 40);
      s.opacity.setValue(0);
      s.scale.setValue(0);

      Animated.sequence([
        Animated.delay(400 + i * 50),
        Animated.parallel([
          Animated.timing(s.x, { toValue: targetX, duration: 600, useNativeDriver: true }),
          Animated.timing(s.y, { toValue: targetY, duration: 600, useNativeDriver: true }),
          Animated.timing(s.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(s.scale, { toValue: 1, friction: 5, useNativeDriver: true }),
        ]),
        Animated.timing(s.opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start();
    });

    // Glow pulse loop
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

          {/* Content */}
          <View style={styles.content}>
            {/* LEVEL UP header */}
            <Animated.Text
              style={[
                styles.levelUpText,
                { color: tier.color, opacity: textOpacity },
              ]}
            >
              LEVEL UP!
            </Animated.Text>

            {/* Level circle with glow */}
            <Animated.View
              style={[
                styles.levelCircleGlow,
                {
                  borderColor: tier.color,
                  transform: [{ scale: levelScale }],
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
              <View style={[styles.levelCircle, { backgroundColor: tier.color + '20' }]}>
                <Text style={[styles.levelNumber, { color: tier.color }]}>{newLevel}</Text>
              </View>
            </Animated.View>

            {/* Tier name */}
            <Animated.View style={{ opacity: textOpacity }}>
              <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
              <Text style={styles.congratsText}>
                You are now Level {newLevel}!
              </Text>
              <Text style={styles.xpText}>
                {totalXp.toLocaleString()} Total XP
              </Text>
            </Animated.View>

            {/* Dismiss button */}
            <Animated.View style={{ opacity: textOpacity, width: '100%', marginTop: 32 }}>
              <TouchableOpacity
                style={[styles.dismissBtn, { backgroundColor: tier.color }]}
                onPress={onDismiss}
                activeOpacity={0.8}
              >
                <Text style={styles.dismissBtnText}>Awesome!</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

// =============================================================================
// Styles
// =============================================================================

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
  levelUpText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  levelCircleGlow: {
    borderRadius: 75,
    borderWidth: 3,
    marginBottom: 20,
  },
  levelCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 64,
    fontWeight: '900',
  },
  tierName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  congratsText: {
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
        shadowOpacity: 0.3,
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
