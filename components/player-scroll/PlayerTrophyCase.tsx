/**
 * PlayerTrophyCase — Fortnite-style dark badge grid with rarity dots.
 * Scroll-triggered: badges pop-in with spring + gold flash for earned badges.
 */
import React, { useCallback } from 'react';
import { Dimensions, Image as RNImage, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';
import { getEmptyStateMascot } from '@/lib/mascot-images';
import type { PlayerBadge } from '@/hooks/usePlayerHomeData';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type Props = {
  badges: PlayerBadge[];
  level: number;
  xpProgress: number;
  xpCurrent: number;
  xpNextLevel: number;
  scrollY: SharedValue<number>;
};

const RARITY_DOT: Record<string, string> = {
  epic: '#8B5CF6',
  rare: '#4BB9EC',
  common: '#22C55E',
  legendary: '#FFD700',
};

const LOCKED_PLACEHOLDERS = [
  { icon: '\u{1F3C6}', name: 'Champion', rarity: 'epic' },
  { icon: '\u{1F4AA}', name: 'Power Hitter', rarity: 'rare' },
  { icon: '\u{1F525}', name: 'On Fire', rarity: 'common' },
  { icon: '\u{2B50}', name: 'All-Star', rarity: 'legendary' },
  { icon: '\u{1F3AF}', name: 'Ace Hunter', rarity: 'rare' },
  { icon: '\u{1F6E1}\u{FE0F}', name: 'Wall', rarity: 'epic' },
  { icon: '\u{1F31F}', name: 'Rising Star', rarity: 'common' },
  { icon: '\u{1F451}', name: 'MVP', rarity: 'legendary' },
];

/** Animated badge cell — scroll-triggered pop-in with gold flash for earned */
function PopBadge({
  icon, name, earned, rarity, index, entered,
}: {
  icon: string;
  name: string;
  earned: boolean;
  rarity: string;
  index: number;
  entered: SharedValue<number>;
}) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  useAnimatedReaction(
    () => entered.value,
    (val, prev) => {
      if (val === 1 && (prev === null || prev === 0)) {
        // Spring overshoot: scales to ~1.05 then settles at 1.0
        scale.value = withDelay(index * 80, withSpring(1, { damping: 10, stiffness: 120 }));
        opacity.value = withDelay(index * 80, withTiming(1, { duration: 300 }));
        // Gold flash for earned badges
        if (earned) {
          flashOpacity.value = withDelay(index * 80 + 200, withSequence(
            withTiming(0.4, { duration: 100 }),
            withTiming(0, { duration: 200 }),
          ));
        }
      }
    },
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const dotColor = RARITY_DOT[rarity.toLowerCase()] || RARITY_DOT.common;

  return (
    <Animated.View style={[styles.badgeCell, earned ? styles.badgeEarned : styles.badgeLocked, animStyle]}>
      <View style={[styles.rarityDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.badgeEmoji, !earned && styles.badgeEmojiLocked]}>
        {icon}
      </Text>
      <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={1}>
        {name}
      </Text>
      {/* Gold flash overlay */}
      {earned && (
        <Animated.View style={[styles.goldFlash, flashStyle]} />
      )}
    </Animated.View>
  );
}

export default function PlayerTrophyCase({ badges, level, xpProgress, xpCurrent, xpNextLevel, scrollY }: Props) {
  const router = useRouter();

  // Scroll entrance
  const componentY = useSharedValue(0);
  const entered = useSharedValue(0);

  const onLayoutCapture = useCallback((e: any) => {
    componentY.value = e.nativeEvent.layout.y;
  }, []);

  useDerivedValue(() => {
    if (entered.value === 0 && componentY.value > 0 && scrollY.value + SCREEN_HEIGHT > componentY.value - 50) {
      entered.value = 1;
    }
  });

  // XP bar fill — triggered on scroll entrance
  const xpBarWidth = useSharedValue(0);
  useAnimatedReaction(
    () => entered.value,
    (val, prev) => {
      if (val === 1 && (prev === null || prev === 0)) {
        xpBarWidth.value = withDelay(200, withTiming(Math.min(xpProgress, 100), { duration: 800 }));
      }
    },
  );
  const xpFillStyle = useAnimatedStyle(() => ({
    width: `${xpBarWidth.value}%` as any,
  }));

  // Build display list
  const earnedBadges = badges.map((b) => ({
    icon: b.achievement?.icon || '\u{1F3C6}',
    name: b.achievement?.name || 'Badge',
    rarity: b.achievement?.rarity || 'common',
    earned: true,
  }));

  const needed = Math.max(0, 8 - earnedBadges.length);
  const lockedBadges = LOCKED_PLACEHOLDERS.slice(0, needed).map((p) => ({
    icon: p.icon, name: p.name, rarity: p.rarity, earned: false,
  }));

  const allBadges = [...earnedBadges.slice(0, 8), ...lockedBadges];
  const earnedCount = earnedBadges.length;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push('/achievements' as any)}
      style={styles.container}
      onLayout={onLayoutCapture}
    >
      <LinearGradient
        colors={[PLAYER_THEME.cardBg, '#162848']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{'\u{1F3C6}'} TROPHY CASE</Text>
          <Text style={styles.headerCount}>{earnedCount} Earned</Text>
        </View>

        <View style={styles.badgeGrid}>
          {allBadges.map((badge, i) => (
            <PopBadge
              key={`${badge.name}-${i}`}
              icon={badge.icon}
              name={badge.name}
              earned={badge.earned}
              rarity={badge.rarity}
              index={i}
              entered={entered}
            />
          ))}
        </View>

        <View style={styles.levelRow}>
          <LinearGradient
            colors={[PLAYER_THEME.xpGold, '#FFA500']}
            style={styles.levelBadge}
          >
            <Text style={styles.levelNum}>{level}</Text>
          </LinearGradient>
          <View style={styles.levelInfo}>
            <Text style={styles.levelText}>Level {level}</Text>
            <View style={styles.xpBarBg}>
              <Animated.View style={[styles.xpBarFill, xpFillStyle]}>
                <LinearGradient
                  colors={[PLAYER_THEME.xpGold, '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: '100%', width: 300 }}
                />
              </Animated.View>
            </View>
            <Text style={styles.xpLabel}>
              {xpCurrent.toLocaleString()} / {xpNextLevel.toLocaleString()} XP
            </Text>
          </View>
        </View>

        {earnedCount === 0 && (
          <View style={styles.emptyWrap}>
            <RNImage
              source={getEmptyStateMascot('no_badges').image}
              style={styles.emptyMascot}
              resizeMode="contain"
            />
            <Text style={styles.emptyText}>
              {getEmptyStateMascot('no_badges').message}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    borderRadius: D_RADII.hero,
    padding: 18,
    borderWidth: 1,
    borderColor: PLAYER_THEME.borderGold,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 13,
    color: PLAYER_THEME.xpGold,
    letterSpacing: 1,
  },
  headerCount: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: PLAYER_THEME.textMuted,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badgeCell: {
    width: '22%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: D_RADII.badge,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  badgeEarned: {
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderColor: 'rgba(255,215,0,0.20)',
  },
  badgeLocked: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: PLAYER_THEME.border,
  },
  rarityDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  badgeEmojiLocked: {
    opacity: 0.25,
  },
  badgeName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 8,
    color: PLAYER_THEME.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  badgeNameLocked: {
    color: PLAYER_THEME.textFaint,
  },
  goldFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: PLAYER_THEME.xpGold,
    borderRadius: D_RADII.badge,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNum: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    color: PLAYER_THEME.bg,
  },
  levelInfo: {
    flex: 1,
  },
  levelText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: PLAYER_THEME.textSecondary,
    marginBottom: 4,
  },
  xpBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: PLAYER_THEME.textMuted,
    marginTop: 3,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  emptyMascot: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PLAYER_THEME.textMuted,
    textAlign: 'center',
  },
});
