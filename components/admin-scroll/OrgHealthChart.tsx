/**
 * OrgHealthChart — Org-level stats bar chart.
 * White card with animated horizontal bars for key org metrics.
 * Bar fills stagger 100ms apart, each 600ms easeOut.
 * ALL hooks above early returns.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_RADII } from '@/theme/d-system';

type BarRow = {
  label: string;
  value: number;
  displayValue: string;
  color: string;
  maxValue: number;
};

interface Props {
  teams: { rosterCount: number; maxPlayers: number }[];
  totalPlayers: number;
  collected: number;
  expected: number;
  overdueCount: number;
  pendingRegs: number;
}

/** Sub-component: single animated bar row */
function AnimatedBar({ row, index }: { row: BarRow; index: number }) {
  const barWidth = useSharedValue(0);

  useEffect(() => {
    const pct = row.maxValue > 0 ? Math.min((row.value / row.maxValue) * 100, 100) : 0;
    barWidth.value = withDelay(
      index * 100,
      withTiming(pct, { duration: 600, easing: Easing.out(Easing.ease) }),
    );
  }, [row.value, row.maxValue]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%` as any,
  }));

  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{row.label}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { backgroundColor: row.color }, fillStyle]} />
      </View>
      <Text style={styles.barValue}>{row.displayValue}</Text>
    </View>
  );
}

function OrgHealthChart({ teams, totalPlayers, collected, expected, overdueCount, pendingRegs }: Props) {
  const router = useRouter();

  // Compute roster fill
  const totalRoster = teams.reduce((sum, t) => sum + t.rosterCount, 0);
  const totalCapacity = teams.reduce((sum, t) => sum + (t.maxPlayers || 0), 0);

  // Build bar rows — skip rows with no data
  const rows: BarRow[] = [];

  if (totalCapacity > 0) {
    rows.push({
      label: 'Roster Fill',
      value: totalRoster,
      displayValue: `${totalRoster}/${totalCapacity}`,
      color: '#4BB9EC',
      maxValue: totalCapacity,
    });
  }

  if (expected > 0) {
    const pct = Math.round((collected / expected) * 100);
    rows.push({
      label: 'Payments',
      value: collected,
      displayValue: `${pct}%`,
      color: '#22C55E',
      maxValue: expected,
    });
  }

  if (overdueCount > 0) {
    rows.push({
      label: 'Overdue',
      value: overdueCount,
      displayValue: String(overdueCount),
      color: '#FF6B6B',
      maxValue: Math.max(overdueCount, totalPlayers || 20),
    });
  }

  if (pendingRegs > 0) {
    rows.push({
      label: 'Registrations',
      value: pendingRegs,
      displayValue: String(pendingRegs),
      color: '#8B5CF6',
      maxValue: Math.max(pendingRegs, totalPlayers || 20),
    });
  }

  if (teams.length > 0) {
    rows.push({
      label: 'Teams Active',
      value: teams.length,
      displayValue: String(teams.length),
      color: '#F59E0B',
      maxValue: Math.max(teams.length, 20),
    });
  }

  // ALL hooks above — early return below
  if (rows.length === 0) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={() => router.push('/season-reports' as any)}
    >
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>ORG HEALTH</Text>
        <Text style={styles.headerLink}>View All</Text>
      </View>

      {rows.map((row, i) => (
        <AnimatedBar key={row.label} row={row} index={i} />
      ))}
    </TouchableOpacity>
  );
}

export default React.memo(OrgHealthChart);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: BRAND.white,
    borderRadius: D_RADII.card,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 13,
    color: BRAND.textPrimary,
    letterSpacing: 0.5,
  },
  headerLink: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  barLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textPrimary,
    width: 90,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  barValue: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 14,
    color: BRAND.textPrimary,
    width: 50,
    textAlign: 'right',
  },
});
