/**
 * HeroIdentityCard — Player's identity card with OVR badge, XP bar with shimmer.
 * Phase 2: The first thing the player sees.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '@/theme/fonts';
import { getLevelFromXP } from '@/lib/engagement-constants';

const PT = {
  bg: '#0D1B3E',
  cardBg: '#10284C',
  accent: '#4BB9EC',
  gold: '#FFD700',
  textPrimary: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.30)',
  textFaint: 'rgba(255,255,255,0.15)',
  borderAccent: 'rgba(75,185,236,0.15)',
};

type Props = {
  firstName: string;
  lastName: string;
  teamName: string;
  position: string | null;
  jerseyNumber: string | null;
  ovr: number;
  level: number;
  xpProgress: number;
  xpCurrent: number;
  xpMax: number;
  scrollY: SharedValue<number>;
  playerId?: string | null;
};

export default function HeroIdentityCard({
  firstName,
  lastName,
  teamName,
  position,
  jerseyNumber,
  ovr,
  level,
  xpProgress,
  xpCurrent,
  xpMax,
  scrollY,
  playerId,
}: Props) {
  const router = useRouter();
  // OVR badge glow animation
  const glowAnim = useSharedValue(0.3);
  useEffect(() => {
    glowAnim.value = withRepeat(
      withTiming(0.6, { duration: 1250 }),
      -1,
      true,
    );
  }, []);

  // XP shimmer animation
  const shimmerAnim = useSharedValue(0);
  useEffect(() => {
    shimmerAnim.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      false,
    );
  }, []);

  const ovrGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowAnim.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerAnim.value, [0, 1], [-200, 200]) }],
  }));

  // Scroll parallax on card
  const cardAnimStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value, [0, 200], [1.0, 0.95], Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollY.value, [0, 200], [1.0, 0.8], Extrapolation.CLAMP,
    );
    return { transform: [{ scale }], opacity };
  });

  const infoLine = [teamName, position, jerseyNumber ? `#${jerseyNumber}` : null]
    .filter(Boolean)
    .join(' \u00B7 ');

  const xpLevelInfo = getLevelFromXP(xpCurrent);
  const xpDisplay = xpLevelInfo.xpToNext > 0
    ? `${xpCurrent}/${xpLevelInfo.nextLevelXp}`
    : `${xpCurrent} XP`;

  return (
    <Animated.View style={[styles.outerWrap, cardAnimStyle]}>
      <LinearGradient
        colors={['#10284C', '#162848', '#10284C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Player label + OVR */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.nameBlock}
            activeOpacity={0.8}
            onPress={() => router.push(playerId ? `/my-stats?playerId=${playerId}` as any : '/my-stats' as any)}
          >
            <Text style={styles.playerLabel}>PLAYER</Text>
            <Text style={styles.nameFirst}>{firstName.toUpperCase()}</Text>
            <Text style={styles.nameLast}>{lastName.toUpperCase()}</Text>
          </TouchableOpacity>

          {/* OVR Badge */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/my-stats' as any)}
          >
            <Animated.View style={[styles.ovrBadge, ovrGlowStyle]}>
              <Text style={styles.ovrNumber}>{ovr || '--'}</Text>
              <Text style={styles.ovrLabel}>OVR</Text>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Info row */}
        {infoLine.length > 0 && (
          <Text style={styles.infoRow}>{infoLine}</Text>
        )}

        {/* Level + XP bar */}
        <View style={styles.xpRow}>
          <View style={styles.lvlPill}>
            <Text style={styles.lvlText}>LVL {level}</Text>
          </View>

          <View style={styles.xpBarTrack}>
            <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress, 100)}%` }]}>
              {/* Shimmer overlay */}
              <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
            </View>
          </View>

          <Text style={styles.xpText}>{xpDisplay}</Text>
        </View>

        {/* View My Card link */}
        <TouchableOpacity
          style={styles.viewCardBtn}
          activeOpacity={0.7}
          onPress={() => router.push(playerId ? `/player-card?playerId=${playerId}` as any : '/player-card' as any)}
        >
          <Ionicons name="id-card-outline" size={14} color={PT.gold} />
          <Text style={styles.viewCardText}>View My Card</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PT.borderAccent,
    padding: 20,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameBlock: {
    flex: 1,
  },
  playerLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(75,185,236,0.60)',
    marginBottom: 4,
  },
  nameFirst: {
    fontFamily: FONTS.display,
    fontSize: 38,
    lineHeight: 36,
    color: PT.textPrimary,
  },
  nameLast: {
    fontFamily: FONTS.display,
    fontSize: 38,
    lineHeight: 36,
    color: PT.textPrimary,
  },
  ovrBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.40)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PT.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 4,
  },
  ovrNumber: {
    fontFamily: FONTS.display,
    fontSize: 28,
    lineHeight: 30,
    color: PT.gold,
  },
  ovrLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: 'rgba(255,215,0,0.60)',
    letterSpacing: 1.5,
  },
  infoRow: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: PT.textMuted,
    marginBottom: 16,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lvlPill: {
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lvlText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: PT.gold,
  },
  xpBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: PT.accent,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 100,
    height: 8,
    backgroundColor: 'rgba(255,215,0,0.35)',
    borderRadius: 4,
  },
  xpText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: PT.textMuted,
  },
  viewCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.20)',
  },
  viewCardText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PT.gold,
  },
});
