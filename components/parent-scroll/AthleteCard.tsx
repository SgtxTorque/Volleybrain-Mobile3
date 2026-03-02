/**
 * AthleteCard — velocity-sensitive card showing a parent's child.
 * Compact state: avatar, name, team, jersey, level badge.
 * Expanded state (slow scroll + center viewport): stats row slides out.
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

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    e.target.measureInWindow((_x, y) => {
      if (typeof y === 'number') setCardY(y);
    });
  }, []);

  // Is this card in the center 40% of the viewport?
  const viewportCenter = screenHeight / 2;
  const centerZoneTop = screenHeight * 0.3;
  const centerZoneBottom = screenHeight * 0.7;

  const isInCenter = useDerivedValue(() => {
    // Approximate card position relative to viewport
    const cardTop = cardY - scrollY.value;
    const cardBottom = cardTop + 120; // approximate card height
    const cardMid = (cardTop + cardBottom) / 2;
    return cardMid > centerZoneTop && cardMid < centerZoneBottom;
  });

  const shouldExpand = useDerivedValue(() => {
    return isInCenter.value && isSlowScroll.value;
  });

  // Expansion animation
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
  // Prefer team color, then sport color, then gold fallback
  const sportColor = child.team_color || child.sport_color || '#D4A017';
  const hasPhoto = Boolean(child.photo_url);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/child-detail?playerId=${child.id}` as any)}
    >
      <Animated.View style={[styles.card, cardScaleStyle]} onLayout={onLayout}>
        {/* Compact content */}
        <View style={styles.compactRow}>
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: sportColor }]}>
            {hasPhoto ? (
              <Image source={{ uri: child.photo_url! }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>
                {child.first_name[0]?.toUpperCase() || '?'}
              </Text>
            )}
            {child.jersey_number ? (
              <View style={styles.jerseyBadge}>
                <Text style={styles.jerseyText}>#{child.jersey_number}</Text>
              </View>
            ) : null}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.playerName} numberOfLines={1}>
              {fullName}
            </Text>
            <Text style={styles.playerMeta} numberOfLines={1}>
              {[child.team_name, child.position, child.jersey_number ? `#${child.jersey_number}` : null]
                .filter(Boolean)
                .join(' \u{00B7} ')}
            </Text>
          </View>

          {/* Level badge */}
          {xp && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>LVL {xp.level}</Text>
            </View>
          )}
        </View>

        {/* Expandable stats row */}
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
  card: {
    backgroundColor: BRAND.white,
    borderRadius: SPACING.cardRadius,
    padding: 14,
    ...SHADOWS.light,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },

  // Avatar
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
  avatarInitial: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: BRAND.white,
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

  // Info
  info: {
    flex: 1,
  },
  playerName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: BRAND.textPrimary,
  },
  playerMeta: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
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

  // Stats row
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
