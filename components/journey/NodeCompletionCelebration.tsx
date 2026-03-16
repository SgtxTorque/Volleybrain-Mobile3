/**
 * NodeCompletionCelebration — Full-screen XP celebration overlay.
 * Shows mascot bounce, XP counter animation, level/streak info.
 */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { getMascotImage } from '@/lib/mascot-images';
import { calculateLevel } from '@/lib/quest-engine';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';

type Props = {
  xpEarned: number;
  previousTotalXp: number;
  newTotalXp: number;
  streakCount: number | null;
  onContinue: () => void;
};

export default function NodeCompletionCelebration({
  xpEarned,
  previousTotalXp,
  newTotalXp,
  streakCount,
  onContinue,
}: Props) {
  const prevLevel = calculateLevel(previousTotalXp);
  const newLevel = calculateLevel(newTotalXp);
  const didLevelUp = newLevel.level > prevLevel.level;

  // XP counter animation
  const [displayXp, setDisplayXp] = useState(0);
  const xpAnim = useSharedValue(0);

  // XP bar animation
  const xpBarWidth = useSharedValue(0);
  const xpBarTarget = newLevel.xpToNext > 0
    ? 1 - (newLevel.xpToNext / (newLevel.xpToNext + (newTotalXp - previousTotalXp)))
    : 1;

  // Sequence animations
  useEffect(() => {
    // 1. XP counter from 0 to xpEarned (delay 500ms, duration 800ms)
    const interval = setInterval(() => {
      setDisplayXp(prev => {
        const next = prev + Math.ceil(xpEarned / 20);
        if (next >= xpEarned) {
          clearInterval(interval);
          return xpEarned;
        }
        return next;
      });
    }, 40);

    // 2. XP bar fills (delay 1300ms, duration 500ms)
    xpBarWidth.value = withDelay(
      1300,
      withTiming(xpBarTarget, { duration: 500, easing: Easing.inOut(Easing.ease) })
    );

    return () => clearInterval(interval);
  }, [xpEarned]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${xpBarWidth.value * 100}%` as any,
  }));

  return (
    <View style={styles.container}>
      {/* Mascot bounce in */}
      <Animated.View entering={FadeIn.delay(200).springify().damping(8).stiffness(150)}>
        <Image
          source={getMascotImage('EXCITEDACHIEVEMENT.png')}
          style={styles.mascot}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Title */}
      <Animated.Text entering={FadeIn.delay(400)} style={styles.title}>
        Node Complete!
      </Animated.Text>

      {/* XP counter */}
      <Animated.Text entering={FadeIn.delay(500)} style={styles.xpCounter}>
        +{displayXp} XP
      </Animated.Text>

      {/* XP bar */}
      <Animated.View entering={FadeIn.delay(1200)} style={styles.xpBarSection}>
        <View style={styles.xpBarBg}>
          <Animated.View style={[styles.xpBarFill, barStyle]}>
            <LinearGradient
              colors={['#4BB9EC', '#22C55E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Text style={styles.levelText}>
          Level {newLevel.level} — {newLevel.tier}
        </Text>
      </Animated.View>

      {/* Level up */}
      {didLevelUp && (
        <Animated.View entering={FadeIn.delay(1500).springify().damping(10)}>
          <Text style={styles.levelUpText}>LEVEL UP!</Text>
        </Animated.View>
      )}

      {/* Streak */}
      {streakCount != null && streakCount > 0 && (
        <Animated.View entering={FadeIn.delay(1600)} style={styles.streakRow}>
          <Text style={styles.streakIcon}>{'\uD83D\uDD25'}</Text>
          <Text style={styles.streakText}>{streakCount} day streak</Text>
        </Animated.View>
      )}

      {/* Continue button */}
      <Animated.View entering={FadeIn.delay(1800)} style={styles.continueWrap}>
        <Pressable onPress={onContinue}>
          <LinearGradient
            colors={['#4BB9EC', '#22C55E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueButton}
          >
            <Text style={styles.continueText}>Continue</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 200,
  },
  mascot: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  xpCounter: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 32,
    color: PLAYER_THEME.xpGold,
    marginBottom: 20,
  },
  xpBarSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  xpBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpBarFill: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PLAYER_THEME.textSecondary,
  },
  levelUpText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: PLAYER_THEME.xpGold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  streakIcon: {
    fontSize: 18,
  },
  streakText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: PLAYER_THEME.streakFire,
  },
  continueWrap: {
    width: '100%',
    marginTop: 24,
  },
  continueButton: {
    borderRadius: D_RADII.cardSmall,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
