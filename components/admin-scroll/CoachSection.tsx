/**
 * CoachSection — Tier 2 flat list of active coaches and their team assignments.
 * Phase 5: coach_tasks table doesn't exist, so shows simplified list
 * with "Assign Task" CTA placeholder.
 */
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { CoachInfo } from '@/hooks/useAdminHomeData';

type Props = {
  coaches: CoachInfo[];
};

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return '?';
}

export default function CoachSection({ coaches }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>COACHES</Text>
        <Text style={styles.countLabel}>{coaches.length} Active</Text>
      </View>

      {coaches.map((coach) => (
        <View key={coach.id} style={styles.coachRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(coach.name)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.coachName}>{coach.name}</Text>
            <Text style={styles.teams} numberOfLines={1}>
              {coach.teams.join(', ') || 'No teams assigned'}
            </Text>
          </View>
        </View>
      ))}

      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.assignBtn}
        onPress={() =>
          Alert.alert('Coming Soon', 'Task assignment will be available in a future update.')
        }
      >
        <Text style={styles.assignBtnText}>Assign Task {'\u203A'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: BRAND.textFaint,
  },
  countLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: BRAND.textMuted,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND.warmGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: BRAND.textPrimary,
  },
  info: {
    flex: 1,
  },
  coachName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  teams: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  assignBtn: {
    marginTop: 4,
  },
  assignBtnText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
});
