/**
 * QuickActions — Tier 2 flat action rows.
 * Adapts based on whether it's an event day (game plan card is showing).
 */
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type ActionItem = {
  icon: string;
  label: string;
  route: string | null;
  eventDayOnly?: boolean;
  offDayOnly?: boolean;
};

const ALL_ACTIONS: ActionItem[] = [
  { icon: '\u{1F4E3}', label: 'Send a Blast', route: '/(tabs)/coach-chat' },
  { icon: '\u{1F4DD}', label: 'Build a Lineup', route: '/(tabs)/coach-roster', offDayOnly: true },
  // TODO: shoutouts table not found — navigate to toast for now
  { icon: '\u{1F31F}', label: 'Give a Shoutout', route: null },
  { icon: '\u{1F4CA}', label: 'Review Stats', route: '/(tabs)/coach-schedule' },
  { icon: '\u{1F465}', label: 'Manage Roster', route: '/(tabs)/coach-roster', offDayOnly: true },
  // TODO: coach_challenges table not found — navigate to toast for now
  { icon: '\u{1F3AF}', label: 'Create a Challenge', route: null },
];

type Props = {
  isEventDay: boolean;
};

export default function QuickActions({ isEventDay }: Props) {
  const router = useRouter();

  const actions = ALL_ACTIONS.filter(a => {
    if (isEventDay && a.offDayOnly) return false;
    if (!isEventDay && a.eventDayOnly) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      {actions.map((action, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.row, i < actions.length - 1 && styles.rowBorder]}
          activeOpacity={0.7}
          onPress={() => {
            if (action.route) {
              router.push(action.route as any);
            } else {
              Alert.alert('Coming Soon', `${action.label} is coming in a future update.`);
            }
          }}
        >
          <Text style={styles.icon}>{action.icon}</Text>
          <Text style={styles.label}>{action.label}</Text>
          <Text style={styles.arrow}>{'\u2192'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textPrimary,
    marginLeft: 12,
  },
  arrow: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: BRAND.textFaint,
  },
});
