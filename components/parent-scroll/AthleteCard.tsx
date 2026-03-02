/**
 * AthleteCard — tiered athlete card for parent home scroll.
 * Tier 1 (photo): full card, shadow, velocity-sensitive stat expansion.
 * Tier 1.5 (no photo): lightweight card, offWhite bg, no shadow, no expansion.
 */
import React, { useCallback, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING, SHADOWS } from '@/theme/spacing';
import type { ChildPlayer, PlayerStats } from '@/hooks/useParentHomeData';

type Props = {
  child: ChildPlayer;
  stats: PlayerStats | null;
  xp: { totalXp: number; level: number; progress: number } | null;
  scrollY: SharedValue<number>;
  isSlowScroll: SharedValue<boolean>;
  screenHeight: number;
};

export default function AthleteCard({
  child,
  stats,
  xp,
  scrollY,
  isSlowScroll,
  screenHeight,
}: Props) {
  const router = useRouter();
  const [cardY, setCardY] = useState(0);
  const hasPhoto = Boolean(child.photo_url);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    e.target.measureInWindow((_x, y) => {
      if (typeof y === 'number') setCardY(y);
    });
  }, []);

  // Viewport center detection for expansion (only used for photo cards)
  const centerZoneTop = screenHeight * 0.3;
  const centerZoneBottom = screenHeight * 0.7;

  const isInCenter = useDerivedValue(() => {
    const cardTop = cardY - scrollY.value;
    const cardBottom = cardTop + 120;
    const cardMid = (cardTop + cardBottom) / 2;
    return cardMid > centerZoneTop && cardMid < centerZoneBottom;
  });

  const shouldExpand = useDerivedValue(() => {
    return hasPhoto && isInCenter.value && isSlowScroll.value;
  });

  const expandProgress = useDerivedValue(() => {
    return withTiming(shouldExpand.value ? 1 : 0, { duration: 300 });
  });

  const statsRowStyle = useAnimatedStyle(() => ({
    height: interpolate(expandProgress.value, [0, 1], [0, 52], Extrapolation.CLAMP),
    opacity: expandProgress.value,
    overflow: 'hidden' as const,
  }));

  const cardScaleStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(expandProgress.value, [0, 1], [1, 1.015], Extrapolation.CLAMP) },
    ],
  }));

  const fullName = `${child.first_name} ${child.last_name}`;
  // Team color for initial circle; skyBlue default (gold reserved for achievements)
  const avatarColor = child.team_color || child.sport_color || BRAND.skyBlue;

  // ─── Tier 1.5: Lightweight card (no photo) ──
  if (!hasPhoto) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/child-detail?playerId=${child.id}` as any)}
      >
        <Animated.View style={[styles.lightCard, cardScaleStyle]} onLayout={onLayout}>
          <View style={styles.compactRow}>
            <View style={[styles.initialCircle, { backgroundColor: avatarColor }]}>
              <Text style={styles.initialText}>
                {child.first_name[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.playerName} numberOfLines={1}>{fullName}</Text>
              <Text style={styles.playerMeta} numberOfLines={1}>
                {[child.team_name, child.position].filter(Boolean).join(' \u{00B7} ')}
              </Text>
            </View>
            {xp && (
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>LVL {xp.level}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // ─── Tier 1: Full card (with photo) ──
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/child-detail?playerId=${child.id}` as any)}
    >
      <Animated.View style={[styles.card, cardScaleStyle]} onLayout={onLayout}>
        <View style={styles.compactRow}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Image source={{ uri: child.photo_url! }} style={styles.avatarImage} />
            {child.jersey_number ? (
              <View style={styles.jerseyBadge}>
                <Text style={styles.jerseyText}>#{child.jersey_number}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.info}>
            <Text style={styles.playerName} numberOfLines={1}>{fullName}</Text>
            <Text style={styles.playerMeta} numberOfLines={1}>
              {[child.team_name, child.position, child.jersey_number ? `#${child.jersey_number}` : null]
                .filter(Boolean)
                .join(' \u{00B7} ')}
            </Text>
          </View>

          {xp && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>LVL {xp.level}</Text>
            </View>
          )}
        </View>

        {/* Expandable stats row (Tier 1 only) */}
        <Animated.View style={statsRowStyle}>
          <View style={styles.statsRow}>
            <StatPill label="KILLS" value={stats?.total_kills ?? 0} />
            <StatPill label="ACES" value={stats?.total_aces ?? 0} />
            <StatPill label="DIGS" value={stats?.total_digs ?? 0} />
            <StatPill label="ASSISTS" value={stats?.total_assists ?? 0} />
          </View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value > 0 ? value : '\u{2014}'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Tier 1: Full card
  card: {
    backgroundColor: BRAND.white,
    borderRadius: 18,
    padding: 18,
    ...SHADOWS.light,
  },
  // Tier 1.5: Lightweight card
  lightCard: {
    backgroundColor: BRAND.offWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F2F5',
    padding: 14,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },

  // Tier 1 avatar (photo)
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  jerseyBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: BRAND.navyDeep,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  jerseyText: {
    fontFamily: FONTS.display,
    fontSize: 11,
    color: BRAND.white,
  },

  // Tier 1.5 initial circle
  initialCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.white,
  },

  // Shared
  info: {
    flex: 1,
  },
  playerName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
    color: BRAND.textPrimary,
  },
  playerMeta: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 2,
  },

  // Level badge
  levelBadge: {
    backgroundColor: BRAND.gold,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: BRAND.navyDeep,
    letterSpacing: 0.5,
  },

  // Stats row (Tier 1 only)
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    justifyContent: 'space-evenly',
  },
  statPill: {
    alignItems: 'center',
    backgroundColor: BRAND.offWhite,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 64,
  },
  statLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.textPrimary,
    marginTop: 1,
  },
});
