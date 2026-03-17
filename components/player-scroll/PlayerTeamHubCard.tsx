/**
 * PlayerTeamHubCard — Team Hub entry point with team name, accent glow, and notification pill.
 * Tappable → navigates to team hub screen.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';

type Props = {
  teamName: string;
  teamColor: string | null;
  teamId: string | undefined;
};

function NotificationPill() {
  const pillScale = useSharedValue(1);

  useEffect(() => {
    pillScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      false,
    );
    return () => { cancelAnimation(pillScale); };
  }, []);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pillScale.value }],
  }));

  return (
    <Animated.View style={[styles.pill, pillStyle]}>
      <Text style={styles.pillText}>New</Text>
    </Animated.View>
  );
}

export default function PlayerTeamHubCard({ teamName, teamColor, teamId }: Props) {
  const router = useRouter();

  if (!teamId) return null;

  const accentColor = teamColor || PLAYER_THEME.accent;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push('/(tabs)/connect' as any)}
    >
      {/* Left accent glow */}
      <LinearGradient
        colors={[`${accentColor}30`, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.accentGlow}
      />

      <View style={styles.content}>
        <View style={styles.left}>
          <Text style={styles.label}>TEAM HUB</Text>
          <Text style={styles.teamName} numberOfLines={1}>{teamName}</Text>
        </View>

        <View style={styles.right}>
          <NotificationPill />
          <Text style={styles.arrow}>{'\u2192'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: D_RADII.card,
    backgroundColor: PLAYER_THEME.cardBg,
    borderWidth: 1,
    borderColor: PLAYER_THEME.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  accentGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 60,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  left: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
    letterSpacing: 1.2,
  },
  teamName: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 14,
    color: PLAYER_THEME.textPrimary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pill: {
    backgroundColor: 'rgba(239,68,68,0.90)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  arrow: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: PLAYER_THEME.textMuted,
  },
});
