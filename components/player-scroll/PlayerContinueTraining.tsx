/**
 * PlayerContinueTraining — Purple gradient teaser card for the future
 * Journey Path / Skill Library. Shows "coming soon" and doesn't
 * navigate to a real training module yet.
 *
 * Bold animations: shimmer sweep, press scale spring, arrow nudge loop.
 */
import React, { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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

export default function PlayerContinueTraining() {
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
    Alert.alert('Coming Soon!', 'Training modules are on their way. Stay tuned!');
  };

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
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>{'\u{1F5FA}\u{FE0F}'}</Text>
          </View>

          <View style={styles.textWrap}>
            <Text style={styles.title}>Continue Training</Text>
            <Text style={styles.subtitle}>
              Skill drills, tips & challenges — coming soon
            </Text>
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
