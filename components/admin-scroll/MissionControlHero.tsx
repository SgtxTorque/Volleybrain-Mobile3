/**
 * MissionControlHero — Dark navy hero card with org stats grid + dynamic greeting.
 * Mascot breathing animation. All hooks above early returns.
 */
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';
import { getAdminGreeting } from './AdminLynxGreetings';

/** Sub-component: animated stat cell with count-up */
function AnimatedStatCell({
  cell,
  index,
  hasRightBorder,
  hasBottomBorder,
}: {
  cell: { numericValue: number; prefix: string; label: string; color: string };
  index: number;
  hasRightBorder: boolean;
  hasBottomBorder: boolean;
}) {
  const animatedNum = useSharedValue(0);
  const [displayNum, setDisplayNum] = useState(0);

  useEffect(() => {
    animatedNum.value = withDelay(
      index * 100,
      withTiming(cell.numericValue, { duration: 600, easing: Easing.out(Easing.ease) }),
    );
  }, [cell.numericValue]);

  useAnimatedReaction(
    () => Math.round(animatedNum.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplayNum)(current);
      }
    },
    [cell.numericValue],
  );

  return (
    <View
      style={[
        styles.statCell,
        hasRightBorder && styles.statCellRightBorder,
        hasBottomBorder && styles.statCellBottomBorder,
      ]}
    >
      <Text style={[styles.statValue, { color: cell.color }]}>
        {cell.prefix}{displayNum.toLocaleString()}
      </Text>
      <Text style={styles.statLabel}>{cell.label}</Text>
    </View>
  );
}

interface Props {
  adminName: string;
  orgName: string;
  teamCount: number;
  playerCount: number;
  coachCount: number;
  overdueCount: number;
  collected: number;
  pendingRegs: number;
  paymentPct: number;
  queueLength: number;
  hasGameToday: boolean;
}

function MissionControlHero({
  adminName,
  orgName,
  teamCount,
  playerCount,
  coachCount,
  overdueCount,
  collected,
  pendingRegs,
  paymentPct,
  queueLength,
  hasGameToday,
}: Props) {
  // ALL hooks above early return
  const breathScale = useSharedValue(1);

  useEffect(() => {
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(breathScale);
  }, []);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  const greeting = getAdminGreeting({
    name: adminName,
    overdueCount,
    queueLength,
    paymentPct,
    hasGameToday,
  });

  const statCells = [
    { numericValue: teamCount, prefix: '', label: 'TEAMS', color: '#FFFFFF' },
    { numericValue: playerCount, prefix: '', label: 'PLAYERS', color: '#FFFFFF' },
    { numericValue: coachCount, prefix: '', label: 'COACHES', color: '#FFFFFF' },
    { numericValue: overdueCount, prefix: '', label: 'OVERDUE', color: D_COLORS.overdueRed },
    { numericValue: Math.round(collected), prefix: '$', label: 'COLLECTED', color: D_COLORS.collectedGreen },
    { numericValue: pendingRegs, prefix: '', label: 'PENDING', color: D_COLORS.pendingBlue },
  ];

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={[D_COLORS.missionHeroBgStart, D_COLORS.missionHeroBgEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Top row: Greeting + Mascot */}
        <View style={styles.topRow}>
          <View style={styles.greetingCol}>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.orgName}>{orgName}</Text>
          </View>
          <Animated.View style={breathStyle}>
            <Image
              source={require('@/assets/images/mascot/HiLynx.png')}
              style={styles.mascot}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* 3x2 Stats Grid with count-up animation */}
        <View style={styles.statsGrid}>
          {statCells.map((cell, i) => (
            <AnimatedStatCell
              key={cell.label}
              cell={cell}
              index={i}
              hasRightBorder={i % 3 !== 2}
              hasBottomBorder={i < 3}
            />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

export default React.memo(MissionControlHero);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: D_RADII.hero,
    padding: 20,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greetingCol: {
    flex: 1,
    paddingRight: 12,
  },
  greetingText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 4,
  },
  orgName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  mascot: {
    width: 80,
    height: 80,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCell: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statCellRightBorder: {
    borderRightWidth: 1,
    borderRightColor: D_COLORS.statsGridBorder,
  },
  statCellBottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: D_COLORS.statsGridBorder,
  },
  statValue: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
