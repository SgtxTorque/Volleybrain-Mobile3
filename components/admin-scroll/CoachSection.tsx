/**
 * CoachSection — Flat list of active coaches and their team assignments.
 * Phase 1 stub: coach_tasks table doesn't exist, so shows simplified list.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { CoachInfo } from '@/hooks/useAdminHomeData';

type Props = {
  coaches: CoachInfo[];
};

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
            <Text style={styles.avatarText}>
              {coach.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.coachName}>{coach.name}</Text>
            <Text style={styles.teams} numberOfLines={1}>
              {coach.teams.join(', ') || 'No teams assigned'}
            </Text>
          </View>
        </View>
      ))}
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.warmGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
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
});
