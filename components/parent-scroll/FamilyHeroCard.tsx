/**
 * FamilyHeroCard — Dark navy family identity hero card.
 * Dynamic Lynx-tone greeting with mascot breathing animation.
 */
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';
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
}: Props) {
  // Mascot breathing animation — hooks ABOVE any early return
  const mascotScale = useSharedValue(1.0);
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
  const mascotBreathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }],
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

  return (
    <LinearGradient
      colors={[D_COLORS.familyHeroBgStart, D_COLORS.familyHeroBgEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Left: greeting text (~65%) */}
      <View style={styles.leftCol}>
        <Text style={styles.greeting}>{greeting}</Text>
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
    minHeight: 130,
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
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  mascotWrap: {
    // No absolute positioning — sits in the row flow
  },
  mascotImg: {
    width: 85,
    height: 85,
  },
});
