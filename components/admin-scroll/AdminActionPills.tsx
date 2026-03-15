/**
 * AdminActionPills — Horizontal scroll row of pill action buttons.
 * First pill is primary (dark navy), rest are secondary (light tinted).
 * contentContainerStyle paddingVertical: 8 to prevent clipping.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_COLORS } from '@/theme/d-system';

type ActionPill = {
  label: string;
  route: string;
  primary?: boolean;
};

const PILLS: ActionPill[] = [
  { label: 'Create Event', route: '/(tabs)/admin-schedule', primary: true },
  { label: 'Send Blast', route: '/blast-composer' },
  { label: 'Add Player', route: '/registration-hub' },
  { label: 'Manage Payments', route: '/(tabs)/payments' },
  { label: 'Reports', route: '/season-reports' },
];

function AdminActionPills() {
  const router = useRouter();

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {PILLS.map((pill) => (
          <TouchableOpacity
            key={pill.label}
            activeOpacity={0.7}
            style={[styles.pill, pill.primary ? styles.pillPrimary : styles.pillSecondary]}
            onPress={() => router.push(pill.route as any)}
          >
            <Text style={[styles.pillText, pill.primary ? styles.pillTextPrimary : styles.pillTextSecondary]}>
              {pill.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default React.memo(AdminActionPills);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  pillPrimary: {
    backgroundColor: D_COLORS.actionPillActive,
  },
  pillSecondary: {
    backgroundColor: D_COLORS.actionPillInactive,
  },
  pillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
  },
  pillTextPrimary: {
    color: BRAND.white,
  },
  pillTextSecondary: {
    color: BRAND.textPrimary,
  },
});
