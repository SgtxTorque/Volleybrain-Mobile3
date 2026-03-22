// =============================================================================
// AchievementCelebrationModal — Full-screen AAA-style unlock celebration
// =============================================================================

import { getCelebrationImage } from '@/constants/mascot-images';
import { RARITY_CONFIG, type UnseenAchievement } from '@/lib/achievement-types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RarityGlow from './RarityGlow';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =============================================================================
// CONFETTI PARTICLE SYSTEM
// =============================================================================

const PARTICLE_COUNT = 25;
const PARTICLE_COLORS = ['#FFD700', '#FF3B3B', '#3B82F6', '#A855F7', '#10B981', '#F97316', '#EC4899'];

type Particle = {
  x: number;
  y: Animated.Value;
  rotation: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  xOffset: number;
};

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * SCREEN_WIDTH,
    y: new Animated.Value(-30),
    rotation: new Animated.Value(0),
    opacity: new Animated.Value(1),
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    size: 6 + Math.random() * 8,
    xOffset: (Math.random() - 0.5) * 60,
  }));
}

function triggerConfetti(particles: Particle[]) {
  particles.forEach((p, i) => {
    p.y.setValue(-30);
    p.opacity.setValue(1);
    p.rotation.setValue(0);

    Animated.sequence([
      Animated.delay(i * 35),
      Animated.parallel([
        Animated.timing(p.y, {
          toValue: SCREEN_HEIGHT + 50,
          duration: 2200 + Math.random() * 800,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotation, {
          toValue: 360 * (1 + Math.random() * 2),
          duration: 2800,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(1800),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  });
}

// =============================================================================
// RARITY COLORS for display
// =============================================================================

const RARITY_DISPLAY: Record<string, { bg: string; text: string; label: string }> = {
  common: { bg: '#94A3B820', text: '#94A3B8', label: 'Common' },
  uncommon: { bg: '#10B98120', text: '#10B981', label: 'Uncommon' },
  rare: { bg: '#3B82F620', text: '#3B82F6', label: 'Rare' },
  epic: { bg: '#A855F720', text: '#A855F7', label: 'Epic' },
  legendary: { bg: '#F59E0B20', text: '#F59E0B', label: 'Legendary' },
};

// Rarity glow ring colors (per spec)
const RARITY_GLOW: Record<string, string> = {
  common: '#6B7280',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#FFD700',
};

// =============================================================================
// COMPONENT
// =============================================================================

type Props = {
  unseen: UnseenAchievement[];
  onDismiss: () => void;
  onViewAllTrophies: () => void;
  themeColors: {
    bg: string;
    card: string;
    cardAlt: string;
    border: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    gold: string;
  };
};

export default function AchievementCelebrationModal({
  unseen,
  onDismiss,
  onViewAllTrophies,
  themeColors: P,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0)).current;
  const glowRingScale = useRef(new Animated.Value(0)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const particles = useRef(createParticles()).current;

  const current = unseen[currentIndex];
  const isLast = currentIndex >= unseen.length - 1;
  const rarity = current?.achievements?.rarity || 'common';
  const rarityDisplay = RARITY_DISPLAY[rarity] || RARITY_DISPLAY.common;
  const rarityConfig = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  const glowColor = RARITY_GLOW[rarity] || RARITY_GLOW.common;
  const ach = current?.achievements;
  const celebrationImage = getCelebrationImage({
    category: ach?.category,
    rarity,
    stat_key: ach?.stat_key,
  });

  const playEntryAnimation = useCallback(() => {
    scaleAnim.setValue(0.3);
    opacityAnim.setValue(0);
    headerScale.setValue(0);
    glowRingScale.setValue(0);
    mascotOpacity.setValue(0);
    xpOpacity.setValue(0);

    // 0ms: Backdrop + mascot fade in
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    Animated.timing(mascotOpacity, {
      toValue: 0.25,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // 200ms: Glow ring scales in
    setTimeout(() => {
      Animated.spring(glowRingScale, {
        toValue: 1,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }).start();
    }, 200);

    // 500ms: Badge scales in + confetti + haptic
    setTimeout(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }).start();
      triggerConfetti(particles);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 500);

    // 800ms: Header text fades in
    setTimeout(() => {
      Animated.spring(headerScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }, 800);

    // 1000ms: XP sparkle + light haptic
    setTimeout(() => {
      Animated.timing(xpOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 1000);
  }, []);

  useEffect(() => {
    playEntryAnimation();
  }, [currentIndex]);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDismiss();
  };

  const handleShare = async () => {
    if (!ach) return;
    const msg = `I just unlocked "${ach.name}" on Lynx! ${ach.icon || '\uD83C\uDFC6'} #Lynx #LynxSports`;
    try {
      await Share.share({ message: msg });
    } catch {
      // User cancelled
    }
  };

  if (!ach) return null;

  // Build "how earned" context string
  let howEarned = ach.how_to_earn || ach.description || '';
  if (current.gameName) {
    howEarned += howEarned ? ` \u2014 ${current.gameName}` : current.gameName;
  }
  if (current.gameDate) {
    howEarned += ` on ${current.gameDate}`;
  }

  return (
    <Modal visible animationType="fade" transparent onRequestClose={handleDone}>
      {/* Overlay */}
      <Animated.View style={[s.overlay, { opacity: opacityAnim }]}>
        <SafeAreaView style={s.container}>
          {/* Background mascot illustration — atmospheric, behind everything */}
          <Animated.Image
            source={celebrationImage}
            accessibilityLabel="Celebration mascot"
            resizeMode="contain"
            style={[s.bgMascot, { opacity: mascotOpacity }]}
          />

          {/* Confetti particles */}
          {particles.map((p, i) => (
            <Animated.View
              key={i}
              style={[
                s.particle,
                {
                  left: p.x + p.xOffset,
                  backgroundColor: p.color,
                  width: p.size,
                  height: p.size,
                  borderRadius: p.size / 2,
                  transform: [
                    { translateY: p.y },
                    {
                      rotate: p.rotation.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                  opacity: p.opacity,
                },
              ]}
              pointerEvents="none"
            />
          ))}

          {/* Content */}
          <View style={s.content}>
            {/* Counter for multi-unlock */}
            {unseen.length > 1 && (
              <Text style={[s.counter, { color: P.textMuted }]}>
                {currentIndex + 1} of {unseen.length}
              </Text>
            )}

            {/* Header text */}
            <Animated.View style={{ transform: [{ scale: headerScale }] }}>
              <Text style={[s.header, { color: rarityConfig.glowColor }]}>
                ACHIEVEMENT UNLOCKED
              </Text>
            </Animated.View>

            {/* Rarity glow ring — pulses behind badge */}
            <View style={s.badgeArea}>
              <Animated.View
                style={[
                  s.glowRing,
                  {
                    backgroundColor: glowColor + '30',
                    borderColor: glowColor + '60',
                    transform: [{ scale: glowRingScale }],
                  },
                ]}
              />
              {/* Badge icon with rarity glow */}
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <RarityGlow rarity={rarity} size={160} earned style={s.badgeGlowWrap}>
                  <View style={[s.badgeCircle, { backgroundColor: rarityConfig.glowColor + '20' }]}>
                    <Text style={s.badgeEmoji}>{ach.icon || '\uD83C\uDFC6'}</Text>
                  </View>
                </RarityGlow>
              </Animated.View>
            </View>

            {/* Achievement name */}
            <Text style={[s.achievementName, { color: P.text }]}>{ach.name}</Text>

            {/* Badge name — rarity colored */}
            <Text style={[s.badgeName, { color: rarityDisplay.text }]}>
              {rarityDisplay.label}
            </Text>

            {/* How earned context */}
            {howEarned ? (
              <Text style={[s.howEarned, { color: P.textSecondary }]} numberOfLines={3}>
                {howEarned}
              </Text>
            ) : null}

            {/* XP earned — fades in at 1s */}
            {ach.xp_reward != null && ach.xp_reward > 0 && (
              <Animated.View style={[s.xpRow, { opacity: xpOpacity }]}>
                <Ionicons name="sparkles" size={16} color="#FFD700" />
                <Text style={s.xpText}>+{ach.xp_reward} XP</Text>
              </Animated.View>
            )}

            {/* Stat value */}
            {current.stat_value_at_unlock != null && ach.stat_key && (
              <View style={[s.statPill, { backgroundColor: P.card, borderColor: P.border }]}>
                <Ionicons name="trending-up" size={14} color={rarityConfig.glowColor} />
                <Text style={[s.statPillText, { color: P.text }]}>
                  {current.stat_value_at_unlock}{' '}
                  {ach.stat_key.replace('total_', '').replace(/_/g, ' ')}
                </Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={s.buttonsRow}>
              <TouchableOpacity
                style={[s.shareBtn, { backgroundColor: P.card, borderColor: P.border }]}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={18} color={P.text} />
                <Text style={[s.shareBtnText, { color: P.text }]}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.trophiesBtn, { backgroundColor: P.card, borderColor: P.border }]}
                onPress={onViewAllTrophies}
                activeOpacity={0.7}
              >
                <Ionicons name="trophy" size={18} color={P.gold} />
                <Text style={[s.trophiesBtnText, { color: P.gold }]}>View All</Text>
              </TouchableOpacity>
            </View>

            {/* Next / Done button */}
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: rarityConfig.glowColor }]}
              onPress={isLast ? handleDone : handleNext}
              activeOpacity={0.8}
            >
              <Text style={s.primaryBtnText}>
                {isLast ? 'Done' : `Next (${currentIndex + 2}/${unseen.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16,40,76,0.88)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgMascot: {
    position: 'absolute',
    width: 280,
    height: 280,
    top: '20%',
    alignSelf: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 360,
  },
  counter: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  badgeArea: {
    marginTop: 24,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
  },
  badgeGlowWrap: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 72,
  },
  achievementName: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  howEarned: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  xpText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFD700',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trophiesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  trophiesBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryBtn: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 16,
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
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});
