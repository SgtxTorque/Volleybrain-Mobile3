/**
 * QuickActions — Tier 2 panel with action rows, badge dots, and enhanced styling.
 * Phase 10.3: Upgraded quick actions panel with attention badges.
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
  badgeKey?: 'stats' | 'roster';
};

const ALL_ACTIONS: ActionItem[] = [
  { icon: '\u{1F4E3}', label: 'Send a Blast', route: '/(tabs)/coach-chat' },
  { icon: '\u{1F4DD}', label: 'Build a Lineup', route: '/(tabs)/coach-roster', offDayOnly: true },
  { icon: '\u{1F31F}', label: 'Give a Shoutout', route: null },
  { icon: '\u{1F4CA}', label: 'Review Stats', route: '/(tabs)/coach-schedule', badgeKey: 'stats' },
  { icon: '\u{1F465}', label: 'Manage Roster', route: '/(tabs)/coach-roster', offDayOnly: true, badgeKey: 'roster' },
  { icon: '\u{1F3AF}', label: 'Create a Challenge', route: null },
];

type Props = {
  isEventDay: boolean;
  pendingStatsCount?: number;
  hasRosterIssues?: boolean;
  onGiveShoutout?: () => void;
};

export default function QuickActions({ isEventDay, pendingStatsCount = 0, hasRosterIssues = false, onGiveShoutout }: Props) {
  const router = useRouter();

  const actions = ALL_ACTIONS.filter(a => {
    if (isEventDay && a.offDayOnly) return false;
    if (!isEventDay && a.eventDayOnly) return false;
    return true;
  });

  const hasBadge = (action: ActionItem): { show: boolean; color: string } => {
    if (action.badgeKey === 'stats' && pendingStatsCount > 0) {
      return { show: true, color: BRAND.error };
    }
    if (action.badgeKey === 'roster' && hasRosterIssues) {
      return { show: true, color: '#F59E0B' };
    }
    return { show: false, color: '' };
  };

  return (
    <View style={styles.panel}>
      {actions.map((action, i) => {
        const badge = hasBadge(action);
        return (
          <TouchableOpacity
            key={i}
            style={[styles.row, i < actions.length - 1 && styles.rowBorder]}
            activeOpacity={0.7}
            onPress={() => {
              if (action.label === 'Give a Shoutout' && onGiveShoutout) {
                onGiveShoutout();
              } else if (action.route) {
                router.push(action.route as any);
              } else {
                Alert.alert('Challenges', 'The challenge system is coming in the next update.');
              }
            }}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{action.icon}</Text>
              {badge.show && (
                <View style={[styles.badgeDot, { backgroundColor: badge.color }]} />
              )}
            </View>
            <Text style={styles.label}>{action.label}</Text>
            <Text style={styles.arrow}>{'\u2192'}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: BRAND.offWhite,
    borderRadius: 16,
    marginHorizontal: 20,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  iconWrap: {
    position: 'relative',
  },
  icon: {
    fontSize: 24,
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
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
