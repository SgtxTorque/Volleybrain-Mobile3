/**
 * FamilyHeroCard — Dark navy family identity hero card.
 * Dynamic Lynx-tone greeting, mascot right, Parent Level + XP bar inside.
 */
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_COLORS, D_RADII } from '@/theme/d-system';
import { getLevelFromXP, getLevelTier } from '@/lib/engagement-constants';
import { getParentGreeting } from './LynxGreetings';
import type { FamilyChild } from '@/hooks/useParentHomeData';

interface Props {
  lastName: string;
  firstName: string;
  children: FamilyChild[];
  seasonName: string;
  isGameDay: boolean;
  isPracticeDay: boolean;
  winStreak: number;
  hasPaymentDue: boolean;
  justWon: boolean;
  justLost: boolean;
  parentXp: { totalXp: number; level: number; progress: number } | null;
}

function FamilyHeroCard({
  lastName,
  firstName,
  children,
  seasonName,
  isGameDay,
  isPracticeDay,
  winStreak,
  hasPaymentDue,
  justWon,
  justLost,
  parentXp,
}: Props) {
  // ALL hooks ABOVE any early return
  const mascotScale = useSharedValue(1.0);
  const xpWidth = useSharedValue(0);

  // Mascot breathing animation
  useEffect(() => {
    mascotScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(mascotScale);
  }, []);

  // XP bar fill animation (0% → actual over 800ms)
  useEffect(() => {
    if (!parentXp) return;
    const levelInfo = getLevelFromXP(parentXp.totalXp);
    xpWidth.value = withDelay(
      200,
      withTiming(levelInfo.progress, { duration: 800, easing: Easing.out(Easing.ease) }),
    );
  }, [parentXp?.totalXp]);

  const mascotBreathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }],
  }));

  const xpFillStyle = useAnimatedStyle(() => ({
    width: `${xpWidth.value}%` as any,
  }));

  const hour = new Date().getHours();

  const greeting = getParentGreeting({
    firstName,
    isGameDay,
    isPracticeDay,
    winStreak,
    hasPaymentDue,
    justWon,
    justLost,
    hour,
    childCount: children.length,
  });

  const childCount = children.length;
  const teamCount = new Set(children.flatMap(c => c.teams.map(t => t.teamId))).size;

  const subtitle = [
    childCount > 0 ? `${childCount} athlete${childCount > 1 ? 's' : ''}` : null,
    teamCount > 0 ? `${teamCount} team${teamCount > 1 ? 's' : ''}` : null,
    seasonName || null,
  ].filter(Boolean).join(' \u00B7 ');

  const levelInfo = parentXp ? getLevelFromXP(parentXp.totalXp) : null;
  const tier = levelInfo ? getLevelTier(levelInfo.level) : null;

  return (
    <LinearGradient
      colors={[D_COLORS.familyHeroBgStart, D_COLORS.familyHeroBgEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Left: greeting + XP bar (~65%) */}
      <View style={styles.leftCol}>
        <Text style={styles.greeting}>{greeting}</Text>

        {/* Level + XP bar inside hero */}
        {levelInfo && tier && (
          <>
            <Text style={styles.levelText}>
              Level {levelInfo.level} {'\u00B7'} {tier.name}
            </Text>
            <View style={styles.xpBarBg}>
              <Animated.View style={[styles.xpBarFillWrap, xpFillStyle]}>
                <LinearGradient
                  colors={[BRAND.gold, '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.xpBarFill}
                />
              </Animated.View>
            </View>
            <Text style={styles.xpLabel}>
              {parentXp!.totalXp.toLocaleString()} / {levelInfo.nextLevelXp.toLocaleString()} XP
            </Text>
          </>
        )}

        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {/* Right: mascot (~35%), vertically centered */}
      <Animated.View style={[styles.mascotWrap, mascotBreathStyle]}>
        <Image
          source={require('@/assets/images/mascot/HiLynx.png')}
          style={styles.mascotImg}
          resizeMode="contain"
        />
      </Animated.View>
    </LinearGradient>
  );
}

export default React.memo(FamilyHeroCard);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: D_RADII.hero,
    padding: 22,
    minHeight: 140,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftCol: {
    flex: 1,
    paddingRight: 12,
  },
  greeting: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 21,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  levelText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.gold,
    marginBottom: 5,
  },
  xpBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  xpBarFillWrap: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    width: 300,
  },
  xpLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.30)',
    marginTop: 3,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  mascotWrap: {},
  mascotImg: {
    width: 85,
    height: 85,
  },
});
