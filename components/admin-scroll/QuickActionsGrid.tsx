/**
 * QuickActionsGrid — 3x2 grid of admin quick-action shortcuts.
 * Phase 4: fade-in animation, improved grid layout.
 */
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

const SCREEN_W = Dimensions.get('window').width;
const GRID_PAD = 20;
const GAP = 10;
const TILE_W = (SCREEN_W - GRID_PAD * 2 - GAP * 2) / 3;

const ACTIONS = [
  { icon: '\u{1F4CB}', label: 'Create\nEvent', key: 'createEvent' },
  { icon: '\u{1F4C5}', label: 'Quick\nSchedule', key: 'quickSchedule' },
  { icon: '\u{1F4B0}', label: 'Send\nReminder', key: 'sendReminder' },
  { icon: '\u{1F4E3}', label: 'Blast\nAll', key: 'blastAll' },
  { icon: '\u{1F464}', label: 'Add\nPlayer', key: 'addPlayer' },
  { icon: '\u{1F4CA}', label: 'Season\nReport', key: 'seasonReport' },
];

const ACTION_ROUTES: Record<string, string> = {
  createEvent: '/(tabs)/admin-schedule',
  quickSchedule: '/(tabs)/admin-schedule',
  sendReminder: '/blast-composer',
  blastAll: '/blast-composer',
  addPlayer: '/registration-hub',
  seasonReport: '/season-reports',
};

export default function QuickActionsGrid() {
  const router = useRouter();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePress = (key: string) => {
    const route = ACTION_ROUTES[key];
    if (route) router.push(route as any);
  };

  return (
    <Animated.View style={[styles.wrap, fadeStyle]}>
      <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
      <View style={styles.grid}>
        {ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.key}
            activeOpacity={0.7}
            style={[styles.actionTile, { width: TILE_W }]}
            onPress={() => handlePress(a.key)}
          >
            <Text style={styles.icon}>{a.icon}</Text>
            <Text style={styles.label}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
    paddingHorizontal: GRID_PAD,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: BRAND.textFaint,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  actionTile: {
    height: 80,
    backgroundColor: BRAND.warmGray,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
    marginBottom: 4,
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
});
