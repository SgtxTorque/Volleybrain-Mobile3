/**
 * PlayerChallengeCard — Active challenge progress card with D+ styling.
 * Scroll-triggered: fades in with subtle scale, animated progress bar fill,
 * gold pulse on "+XP" when bar finishes.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { fetchActiveChallenges, type ChallengeWithParticipants } from '@/lib/challenge-service';
import { useAuth } from '@/lib/auth';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type Props = {
  available: boolean;
  teamId: string | undefined;
  scrollY: SharedValue<number>;
};

export default function PlayerChallengeCard({ available, teamId, scrollY }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<ChallengeWithParticipants | null>(null);

  // Scroll entrance hooks (MUST be above early returns)
  const componentY = useSharedValue(0);
  const entered = useSharedValue(0);
  const entranceOpacity = useSharedValue(0);
  const entranceScale = useSharedValue(0.95);
  const barFillWidth = useSharedValue(0);
  const computedPct = useSharedValue(0);
  const xpPulseScale = useSharedValue(1);

  const onLayoutCapture = useCallback((e: any) => {
    componentY.value = e.nativeEvent.layout.y;
  }, []);

  useDerivedValue(() => {
    if (entered.value === 0 && componentY.value > 0 && scrollY.value + SCREEN_HEIGHT > componentY.value - 50) {
      entered.value = 1;
    }
  });

  // On scroll entrance: fade in, scale, fill bar, pulse XP
  useAnimatedReaction(
    () => entered.value,
    (val, prev) => {
      if (val === 1 && (prev === null || prev === 0)) {
        entranceOpacity.value = withTiming(1, { duration: 400 });
        entranceScale.value = withSpring(1, { damping: 12, stiffness: 100 });
        if (computedPct.value > 0) {
          barFillWidth.value = withTiming(computedPct.value, { duration: 800 });
          xpPulseScale.value = withDelay(800, withSequence(
            withTiming(1.15, { duration: 100 }),
            withSpring(1, { damping: 12, stiffness: 200 }),
          ));
        }
      }
    },
  );

  // If data arrives after scroll entrance
  useAnimatedReaction(
    () => computedPct.value,
    (val, prev) => {
      if (val > 0 && (prev === null || prev === 0) && entered.value === 1) {
        barFillWidth.value = withTiming(val, { duration: 800 });
        xpPulseScale.value = withDelay(800, withSequence(
          withTiming(1.15, { duration: 100 }),
          withSpring(1, { damping: 12, stiffness: 200 }),
        ));
      }
    },
  );

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ scale: entranceScale.value }],
  }));

  const barFillStyle = useAnimatedStyle(() => ({
    width: `${barFillWidth.value}%` as any,
  }));

  const xpPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpPulseScale.value }],
  }));

  useEffect(() => {
    if (!available || !teamId) return;
    let mounted = true;
    (async () => {
      const all = await fetchActiveChallenges(teamId);
      if (mounted && all.length > 0) {
        setChallenge(all[0]);
      }
    })();
    return () => { mounted = false; };
  }, [available, teamId]);

  // Update bar target when challenge data arrives
  useEffect(() => {
    if (challenge && user?.id) {
      const isTeam = challenge.challenge_type === 'team';
      const myProg = challenge.participants.find((p) => p.player_id === user.id);
      const progressVal = isTeam
        ? (challenge.totalProgress || 0)
        : (myProg?.current_value || 0);
      const target = challenge.target_value || 1;
      computedPct.value = Math.min((progressVal / target) * 100, 100);
    }
  }, [challenge, user?.id]);

  if (!available || !challenge) return null;

  const isTeam = challenge.challenge_type === 'team';
  const myProgress = challenge.participants.find((p) => p.player_id === user?.id);
  const progressVal = isTeam
    ? (challenge.totalProgress || 0)
    : (myProgress?.current_value || 0);
  const target = challenge.target_value || 1;

  const diff = new Date(challenge.ends_at).getTime() - Date.now();
  const daysLeft = diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;

  return (
    <Animated.View onLayout={onLayoutCapture} style={entranceStyle}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push(`/challenge-cta?challengeId=${challenge.id}` as any)}
      >
        <View style={styles.headerRow}>
          <Text style={styles.label}>{'\u{26A1}'} ACTIVE CHALLENGE</Text>
          {daysLeft > 0 && (
            <Text style={styles.timeLeft}>{daysLeft}d left</Text>
          )}
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {challenge.title?.toUpperCase() || 'CHALLENGE'}
        </Text>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, barFillStyle]} />
        </View>
        <View style={styles.footerRow}>
          <Text style={styles.progressText}>{progressVal}/{target}</Text>
          <Animated.View style={xpPulseStyle}>
            <Text style={styles.reward}>+{challenge.xp_reward} XP</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: D_RADII.card,
    backgroundColor: PLAYER_THEME.cardBg,
    borderWidth: 1,
    borderColor: PLAYER_THEME.borderGold,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: PLAYER_THEME.xpGold,
    letterSpacing: 1.2,
  },
  timeLeft: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
  },
  title: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    color: PLAYER_THEME.textPrimary,
    marginBottom: 10,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: PLAYER_THEME.accent,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PLAYER_THEME.textMuted,
  },
  reward: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 12,
    color: PLAYER_THEME.xpGold,
  },
});
