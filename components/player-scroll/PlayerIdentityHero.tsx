/**
 * PlayerIdentityHero — Compact identity hero with dynamic greeting,
 * streak counter, level/XP bar, and breathing mascot.
 * Bold animations: XP bar shimmer, XP count-up with bounce, level badge scale bounce.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';
import { getPlayerGreeting, type PlayerGreetingContext } from './PlayerLynxGreetings';
import { getGreetingMascot, getStreakMascot } from '@/lib/mascot-images';
import type { LastGameStats, RecentShoutout, PlayerBadge } from '@/hooks/usePlayerHomeData';

type Props = {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  teamName: string;
  teamColor: string | null;
  position: string | null;
  jerseyNumber: string | null;
  level: number;
  xpProgress: number;
  xpCurrent: number;
  xpToNext: number;
  attendanceStreak: number;
  lastGame: LastGameStats | null;
  nextEvent: { event_type: string; event_date: string } | null;
  badges: PlayerBadge[];
  challengesAvailable: boolean;
  recentShoutouts: RecentShoutout[];
  scrollY: SharedValue<number>;
};

function getLevelTitle(level: number): string {
  if (level >= 20) return 'Diamond';
  if (level >= 15) return 'Platinum';
  if (level >= 10) return 'Gold';
  if (level >= 5) return 'Silver';
  return 'Bronze';
}

export default function PlayerIdentityHero({
  firstName, lastName, photoUrl, teamName, teamColor, position, jerseyNumber,
  level, xpProgress, xpCurrent, xpToNext, attendanceStreak,
  lastGame, nextEvent, badges, challengesAvailable, recentShoutouts, scrollY,
}: Props) {
  // ─── Animations (all hooks above early returns) ──
  const mascotScale = useSharedValue(1);
  const streakPulse = useSharedValue(1);
  const xpBarWidth = useSharedValue(0);
  const greetingOpacity = useSharedValue(0);

  // Bold micro-animations
  const levelScale = useSharedValue(0);
  const xpShimmerX = useSharedValue(-60);
  const xpCountVal = useSharedValue(0);
  const xpCountBounce = useSharedValue(1);
  const [displayXp, setDisplayXp] = useState(0);

  useEffect(() => {
    // Mascot breathing: scale 1.0 <-> 1.03, 4s loop
    mascotScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2000 }),
        withTiming(1.0, { duration: 2000 }),
      ),
      -1, false,
    );

    // Streak fire pill pulse: scale 1.0 <-> 1.1, 2s loop
    streakPulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1.0, { duration: 1000 }),
      ),
      -1, false,
    );

    // XP bar fill animation: 0 to actual, 800ms
    xpBarWidth.value = withTiming(Math.min(xpProgress, 100), { duration: 800 });

    // Greeting fade-in
    greetingOpacity.value = withTiming(1, { duration: 400 });

    // Level badge: scale bounce 0 → 1.1 → 1.0
    levelScale.value = withSpring(1, { damping: 8, stiffness: 150 });

    // XP shimmer sweep after bar fills (delay 900ms)
    xpShimmerX.value = withDelay(900, withTiming(200, { duration: 400 }));

    // XP count-up from 0 to actual
    xpCountVal.value = withTiming(xpCurrent % 1000, {
      duration: 800,
      easing: Easing.out(Easing.ease),
    });

    // Bounce after count reaches target
    xpCountBounce.value = withDelay(800, withSequence(
      withTiming(1.05, { duration: 100 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    ));

    return () => {
      cancelAnimation(mascotScale);
      cancelAnimation(streakPulse);
    };
  }, [xpProgress, xpCurrent]);

  useAnimatedReaction(
    () => xpCountVal.value,
    (val) => { runOnJS(setDisplayXp)(Math.round(val)); },
  );

  const mascotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }],
  }));

  const streakAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakPulse.value }],
  }));

  const xpBarStyle = useAnimatedStyle(() => ({
    width: `${xpBarWidth.value}%` as any,
  }));

  const greetingAnimStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
  }));

  const levelScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: levelScale.value }],
  }));

  const xpShimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: xpShimmerX.value }],
  }));

  const xpBounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpCountBounce.value }],
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

  // ─── Derived data ──
  const greetingCtx: PlayerGreetingContext = useMemo(() => ({
    firstName, attendanceStreak, lastGame, nextEvent, badges,
    challengesAvailable, recentShoutouts, hour: new Date().getHours(),
  }), [firstName, attendanceStreak, lastGame, nextEvent, badges, challengesAvailable, recentShoutouts]);

  const greeting = useMemo(() => getPlayerGreeting(greetingCtx), [greetingCtx]);

  const infoLine = [teamName, position, jerseyNumber ? `#${jerseyNumber}` : null]
    .filter(Boolean).join(' \u00B7 ');

  const levelTitle = getLevelTitle(level);

  const initials = useMemo(() => {
    const f = firstName?.[0] || '';
    const l = lastName?.[0] || '';
    return (f + l).toUpperCase() || '?';
  }, [firstName, lastName]);

  const avatarBorderColor = teamColor || PLAYER_THEME.accent;

  return (
    <Animated.View style={[styles.outerWrap, cardAnimStyle]}>
      <LinearGradient
        colors={[PLAYER_THEME.cardBg, '#162848', PLAYER_THEME.cardBg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Top row: Greeting + Streak */}
        <View style={styles.topRow}>
          <Animated.View style={[styles.greetingWrap, greetingAnimStyle]}>
            <Text style={styles.greetingText} numberOfLines={2}>
              {greeting}
            </Text>
          </Animated.View>

          {attendanceStreak >= 2 && (
            <Animated.View style={[styles.streakPill, streakAnimStyle]}>
              <Image
                source={getStreakMascot(attendanceStreak)}
                style={styles.streakMascot}
                resizeMode="contain"
              />
              <Text style={styles.streakText}>{'\u{1F525}'} {attendanceStreak}</Text>
            </Animated.View>
          )}
        </View>

        {/* Middle row: Photo + Name + Info */}
        <View style={styles.middleRow}>
          <View style={[styles.avatar, { borderColor: avatarBorderColor }]}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
          <View style={styles.nameBlock}>
            <Text style={styles.playerName} numberOfLines={1}>
              {firstName} {lastName}
            </Text>
            {infoLine.length > 0 && (
              <Text style={styles.infoLine} numberOfLines={1}>{infoLine}</Text>
            )}
          </View>
        </View>

        {/* Level row: Level badge + XP bar */}
        <View style={styles.levelRow}>
          <Animated.View style={levelScaleStyle}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{level}</Text>
            </View>
          </Animated.View>
          <View style={styles.levelInfo}>
            <Text style={styles.levelText}>
              Level {level} {'\u00B7'} {levelTitle}
            </Text>
            <View style={styles.xpBarTrack}>
              <Animated.View style={[styles.xpBarFill, xpBarStyle]} />
              <Animated.View style={[styles.xpShimmer, xpShimmerStyle]} />
            </View>
            <Animated.View style={xpBounceStyle}>
              <Text style={styles.xpText}>{displayXp} / 1,000 XP</Text>
            </Animated.View>
          </View>
        </View>

        {/* Mascot: breathing animation, right side */}
        <Animated.View style={[styles.mascotWrap, mascotAnimStyle]}>
          <Image
            source={getGreetingMascot()}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </Animated.View>
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
    borderRadius: D_RADII.hero,
    borderWidth: 1,
    borderColor: PLAYER_THEME.borderAccent,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  greetingWrap: {
    flex: 1,
    marginRight: 12,
  },
  greetingText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 19,
    lineHeight: 24,
    color: PLAYER_THEME.textPrimary,
  },
  streakPill: {
    backgroundColor: 'rgba(255,107,107,0.15)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakMascot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  streakText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: PLAYER_THEME.streakFire,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PLAYER_THEME.cardBg,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarInitials: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: PLAYER_THEME.textPrimary,
  },
  nameBlock: {
    flex: 1,
  },
  playerName: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    color: PLAYER_THEME.textPrimary,
    marginBottom: 2,
  },
  infoLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: PLAYER_THEME.textMuted,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PLAYER_THEME.xpGold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNumber: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 13,
    color: PLAYER_THEME.bg,
  },
  levelInfo: {
    flex: 1,
  },
  levelText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PLAYER_THEME.textSecondary,
    marginBottom: 4,
  },
  xpBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 3,
    position: 'relative',
  },
  xpBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: PLAYER_THEME.xpGold,
  },
  xpShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 3,
  },
  xpText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
  },
  mascotWrap: {
    position: 'absolute',
    right: 10,
    top: 18,
    opacity: 0.18,
  },
  mascotImage: {
    width: 75,
    height: 75,
  },
});
