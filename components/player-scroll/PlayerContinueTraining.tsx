/**
 * PlayerContinueTraining — Purple gradient card for Journey Path progress.
 * Wired to useJourneyPath: shows current chapter, next node, progress bar.
 *
 * Bold animations: shimmer sweep, press scale spring, arrow nudge loop.
 */
import React, { useEffect, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';
import { PLAYER_THEME } from '@/theme/player-theme';
import { useJourneyPath } from '@/hooks/useJourneyPath';

export default function PlayerContinueTraining() {
  const router = useRouter();
  const { chapters, loading, currentChapterIndex } = useJourneyPath();

  // Shimmer sweep — every 5 seconds
  const shimmerX = useSharedValue(-200);
  // Press scale
  const pressScale = useSharedValue(1);
  // Arrow nudge loop
  const arrowNudge = useSharedValue(0);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withSequence(
        withTiming(400, { duration: 1200 }),
        withTiming(-200, { duration: 0 }),
        withTiming(-200, { duration: 3800 }),
      ),
      -1, false,
    );

    arrowNudge.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 1000 }),
        withTiming(0, { duration: 1000 }),
      ),
      -1, false,
    );

    return () => {
      cancelAnimation(shimmerX);
      cancelAnimation(arrowNudge);
    };
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowNudge.value }],
  }));

  const handlePress = () => {
    router.push('/(tabs)/journey' as any);
  };

  // Derived journey data
  const journeyData = useMemo(() => {
    if (!chapters || chapters.length === 0) return null;

    const allComplete = chapters.every(c => c.isComplete);
    if (allComplete) {
      return {
        state: 'complete' as const,
        chapterTitle: '',
        nextNode: '',
        completedNodes: 0,
        totalNodes: 0,
        progressPct: 100,
        remainingXp: 0,
      };
    }

    const current = chapters[currentChapterIndex];
    if (!current) return null;

    const nextNode = current.nodes.find(n => n.progress.status === 'available');
    const totalNodes = current.nodes.length;
    const completedNodes = current.completedNodes;
    const progressPct = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;
    const remainingXp = current.nodes
      .filter(n => n.progress.status !== 'completed')
      .reduce((sum, n) => sum + n.xp_reward, 0);

    return {
      state: 'in_progress' as const,
      chapterTitle: `Chapter ${current.chapter_number}: ${current.title}`,
      nextNode: nextNode?.title || '',
      completedNodes,
      totalNodes,
      progressPct,
      remainingXp,
    };
  }, [chapters, currentChapterIndex]);

  // Determine card content
  let subtitle = 'Loading your journey...';
  let icon = '\u{1F5FA}\u{FE0F}';
  let showProgress = false;
  let showCelebration = false;

  if (!loading && journeyData) {
    if (journeyData.state === 'complete') {
      subtitle = 'Journey complete! All 8 chapters mastered.';
      icon = '\u{1F3C6}';
      showCelebration = true;
    } else {
      subtitle = journeyData.chapterTitle;
      showProgress = true;
    }
  } else if (!loading && !journeyData) {
    subtitle = 'Skill drills, tips & challenges';
  }

  return (
    <Pressable
      onPressIn={() => {
        pressScale.value = withSpring(0.97, { damping: 12, stiffness: 200 });
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
      onPress={handlePress}
    >
      <Animated.View style={[styles.outerWrap, scaleStyle]}>
        <LinearGradient
          colors={[D_COLORS.trainingCardStart, D_COLORS.trainingCardEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {showCelebration ? (
            <Image
              source={require('@/assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png')}
              style={styles.celebrationMascot}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>{icon}</Text>
            </View>
          )}

          <View style={styles.textWrap}>
            <Text style={styles.title}>Continue Training</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>

            {showProgress && journeyData && journeyData.state === 'in_progress' && (
              <>
                {journeyData.nextNode ? (
                  <Text style={styles.nextUp} numberOfLines={1}>
                    Next up: {journeyData.nextNode}
                  </Text>
                ) : null}
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${journeyData.progressPct}%` }]} />
                  </View>
                  <Text style={styles.progressLabel}>
                    {journeyData.completedNodes}/{journeyData.totalNodes}
                  </Text>
                </View>
                {journeyData.remainingXp > 0 && (
                  <Text style={styles.xpAhead}>+{journeyData.remainingXp} XP ahead</Text>
                )}
              </>
            )}
          </View>

          {/* Animated arrow with nudge */}
          <Animated.View style={arrowStyle}>
            <Text style={styles.arrowText}>{'\u203A'}</Text>
          </Animated.View>

          {/* Shimmer overlay */}
          <Animated.View style={[styles.shimmer, shimmerStyle]} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: D_RADII.card,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 18,
  },
  celebrationMascot: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.50)',
  },
  nextUp: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.70)',
    marginTop: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 6,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: PLAYER_THEME.xpGold,
  },
  progressLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.50)',
  },
  xpAhead: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: PLAYER_THEME.xpGold,
    marginTop: 2,
  },
  arrowText: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 120,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ skewX: '-15deg' }],
  },
});
