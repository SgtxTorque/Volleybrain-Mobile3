/**
 * PlayerContinueTraining — Purple gradient teaser card for the future
 * Journey Path / Skill Library. Shows "coming soon" and doesn't
 * navigate to a real training module yet.
 *
 * TEASER: This card exists in the scroll so when the engagement system
 * is built, we just wire it to the real destination.
 */
import React, { useEffect } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';

export default function PlayerContinueTraining() {
  // Shimmer sweep animation — every 5 seconds
  const shimmerX = useSharedValue(-200);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withSequence(
        withTiming(400, { duration: 1200 }),
        withTiming(-200, { duration: 0 }),
        // Pause ~3.8s between sweeps
        withTiming(-200, { duration: 3800 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(shimmerX);
    };
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const handlePress = () => {
    Alert.alert('Coming Soon!', 'Training modules are on their way. Stay tuned!');
  };

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={handlePress} style={styles.outerWrap}>
      <LinearGradient
        colors={[D_COLORS.trainingCardStart, D_COLORS.trainingCardEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>{'\u{1F5FA}\u{FE0F}'}</Text>
        </View>

        {/* Text content */}
        <View style={styles.textWrap}>
          <Text style={styles.title}>Continue Training</Text>
          <Text style={styles.subtitle}>
            Skill drills, tips & challenges — coming soon
          </Text>
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />

        {/* Shimmer overlay */}
        <Animated.View style={[styles.shimmer, shimmerStyle]} />
      </LinearGradient>
    </TouchableOpacity>
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
