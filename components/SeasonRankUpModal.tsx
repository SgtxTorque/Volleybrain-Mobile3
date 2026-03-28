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
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SEASON_RANK_TIERS } from '@/lib/engagement-constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPARKLE_COLORS = ['#FFD700', '#FFA500', '#FF6347', '#FFE4B5', '#B9F2FF', '#C0C0C0'];

type SeasonRankUpModalProps = {
  visible: boolean;
  onDismiss: () => void;
  oldRank: string;
  newRank: string;
  newMultiplier: number;
};

function getTierConfig(rank: string) {
  return SEASON_RANK_TIERS.find(t => t.rank === rank) || SEASON_RANK_TIERS[0];
}

export default function SeasonRankUpModal({
  visible,
  onDismiss,
  oldRank,
  newRank,
  newMultiplier,
}: SeasonRankUpModalProps) {
  const newTier = getTierConfig(newRank);
  const oldTier = getTierConfig(oldRank);

  // Animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const shieldScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;
  const arrowOpacity = useRef(new Animated.Value(0)).current;

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
    shieldScale.setValue(0);
    textOpacity.setValue(0);
    arrowOpacity.setValue(0);

    // Entry sequence
    Animated.sequence([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(shieldScale, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(arrowOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Haptic feedback on shield appear
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 500);

    // Sparkle animations
    sparkles.forEach((s, i) => {
      const angle = (i / sparkles.length) * Math.PI * 2;
      const radius = 80 + Math.random() * 60;
      const targetX = SCREEN_WIDTH / 2 + Math.cos(angle) * radius;
      const targetY = SCREEN_HEIGHT / 2 + Math.sin(angle) * radius - 60;

      s.x.setValue(SCREEN_WIDTH / 2);
      s.y.setValue(SCREEN_HEIGHT / 2 - 60);
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

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(onDismiss, 4000);

    return () => {
      glow.stop();
      clearTimeout(timer);
    };
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

          <TouchableOpacity
            style={styles.content}
            activeOpacity={1}
            onPress={onDismiss}
          >
            {/* RANK UP header */}
            <Animated.Text style={[styles.rankUpText, { opacity: textOpacity }]}>
              RANK UP!
            </Animated.Text>

            {/* Shield with glow */}
            <Animated.View
              style={[
                styles.shieldGlow,
                {
                  transform: [{ scale: shieldScale }],
                  ...Platform.select({
                    ios: {
                      shadowColor: newTier.color,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: glowPulse as unknown as number,
                      shadowRadius: 30,
                    },
                    android: { elevation: 12 },
                  }),
                },
              ]}
            >
              <Animated.View style={[styles.glowCircle, { backgroundColor: newTier.color, opacity: glowPulse }]} />
              <View style={[styles.shieldCircle, { backgroundColor: newTier.color + '20', borderColor: newTier.color }]}>
                <Ionicons name="shield" size={64} color={newTier.color} />
              </View>
            </Animated.View>

            {/* Old → New rank transition */}
            <Animated.View style={[styles.transitionRow, { opacity: arrowOpacity }]}>
              <Text style={[styles.oldRankText, { color: oldTier.color }]}>{oldTier.label}</Text>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.5)" style={styles.arrow} />
              <Text style={[styles.newRankText, { color: newTier.color }]}>{newTier.label}</Text>
            </Animated.View>

            {/* Multiplier */}
            <Animated.View style={{ opacity: textOpacity }}>
              <Text style={styles.multiplierText}>
                All XP now earns {newMultiplier}x!
              </Text>
            </Animated.View>

            {/* Tap to dismiss hint */}
            <Animated.View style={[styles.hintWrap, { opacity: textOpacity }]}>
              <Text style={styles.hintText}>Tap to continue</Text>
            </Animated.View>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#10284C',
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
  rankUpText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  shieldGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  glowCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  shieldCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  oldRankText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  arrow: {
    marginHorizontal: 12,
  },
  newRankText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  multiplierText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
  },
  hintWrap: {
    marginTop: 32,
  },
  hintText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.30)',
  },
});
