/**
 * PlayerTrophyCase — Fortnite-style dark badge grid with rarity dots.
 * Uses badge data from usePlayerHomeData (already fetched).
 * Does NOT modify the shared TrophyCaseWidget.tsx.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';
import type { PlayerBadge } from '@/hooks/usePlayerHomeData';

type Props = {
  badges: PlayerBadge[];
  level: number;
  xpProgress: number;
  xpCurrent: number;
};

const RARITY_DOT: Record<string, string> = {
  epic: '#8B5CF6',
  rare: '#4BB9EC',
  common: '#22C55E',
  legendary: '#FFD700',
};

// Placeholder locked badges so the grid always has content (aspiration)
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

/** Animated badge cell with pop-in spring */
function PopBadge({
  icon,
  name,
  earned,
  rarity,
  index,
}: {
  icon: string;
  name: string;
  earned: boolean;
  rarity: string;
  index: number;
}) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 50, withSpring(1, { damping: 12, stiffness: 120 }));
    opacity.value = withDelay(index * 50, withTiming(1, { duration: 300 }));
    return () => {
      cancelAnimation(scale);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
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
    </Animated.View>
  );
}

export default function PlayerTrophyCase({ badges, level, xpProgress, xpCurrent }: Props) {
  const router = useRouter();

  // XP bar fill animation
  const xpBarWidth = useSharedValue(0);
  useEffect(() => {
    xpBarWidth.value = withDelay(200, withTiming(Math.min(xpProgress, 100), { duration: 800 }));
  }, [xpProgress]);
  const xpFillStyle = useAnimatedStyle(() => ({
    width: `${xpBarWidth.value}%` as any,
  }));

  // Build display list: earned badges first, then fill with locked placeholders to 8
  const earnedBadges = badges.map((b) => ({
    icon: b.achievement?.icon || '\u{1F3C6}',
    name: b.achievement?.name || 'Badge',
    rarity: b.achievement?.rarity || 'common',
    earned: true,
  }));

  const needed = Math.max(0, 8 - earnedBadges.length);
  const lockedBadges = LOCKED_PLACEHOLDERS.slice(0, needed).map((p) => ({
    icon: p.icon,
    name: p.name,
    rarity: p.rarity,
    earned: false,
  }));

  const allBadges = [...earnedBadges.slice(0, 8), ...lockedBadges];
  const earnedCount = earnedBadges.length;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push('/achievements' as any)}
      style={styles.container}
    >
      <LinearGradient
        colors={[PLAYER_THEME.cardBg, '#162848']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{'\u{1F3C6}'} TROPHY CASE</Text>
          <Text style={styles.headerCount}>{earnedCount} / {allBadges.length} Unlocked</Text>
        </View>

        {/* Badge grid — 4 columns, 2 rows */}
        <View style={styles.badgeGrid}>
          {allBadges.map((badge, i) => (
            <PopBadge
              key={`${badge.name}-${i}`}
              icon={badge.icon}
              name={badge.name}
              earned={badge.earned}
              rarity={badge.rarity}
              index={i}
            />
          ))}
        </View>

        {/* Level row */}
        <View style={styles.levelRow}>
          <LinearGradient
            colors={[PLAYER_THEME.xpGold, '#FFA500']}
            style={styles.levelBadge}
          >
            <Text style={styles.levelNum}>{level}</Text>
          </LinearGradient>
          <View style={styles.levelInfo}>
            <Text style={styles.levelText}>
              Level {level}
            </Text>
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
              {(xpCurrent % 1000).toLocaleString()} / 1,000 XP
            </Text>
          </View>
        </View>

        {earnedCount === 0 && (
          <Text style={styles.emptyText}>
            No badges earned yet. Keep going! {'\u{1F3C5}'}
          </Text>
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
  // Header
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
  // Badge grid
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
  // Level row
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
  emptyText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PLAYER_THEME.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
