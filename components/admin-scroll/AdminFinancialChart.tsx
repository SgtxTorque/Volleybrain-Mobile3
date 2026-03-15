/**
 * AdminFinancialChart — Financial overview with collection progress bar,
 * category breakdown, and Send Reminders button.
 * Replaces PaymentSnapshot with richer visual hierarchy.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_COLORS, D_RADII } from '@/theme/d-system';

interface Props {
  collected: number;
  expected: number;
  overdueAmount: number;
  overdueCount: number;
  paymentPct: number;
  seasonName: string;
}

function AdminFinancialChart({
  collected,
  expected,
  overdueAmount,
  overdueCount,
  paymentPct,
  seasonName,
}: Props) {
  const router = useRouter();
  const outstanding = Math.max(0, expected - collected);

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>FINANCES</Text>
          <Text style={styles.seasonLabel}>{seasonName}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.min(paymentPct, 100)}%` }]} />
        </View>

        {/* Percentage */}
        <Text style={styles.pctText}>{paymentPct}% collected</Text>

        {/* Category breakdown */}
        <View style={styles.breakdownContainer}>
          {/* Collected */}
          <View style={styles.breakdownRow}>
            <View style={[styles.dot, { backgroundColor: D_COLORS.collectedGreen }]} />
            <Text style={styles.breakdownLabel}>Collected</Text>
            <Text style={[styles.breakdownAmount, { color: D_COLORS.collectedGreen }]}>
              ${collected.toLocaleString()}
            </Text>
          </View>

          {/* Outstanding */}
          <View style={styles.breakdownRow}>
            <View style={[styles.dot, { backgroundColor: BRAND.coral }]} />
            <Text style={styles.breakdownLabel}>Outstanding</Text>
            <Text style={[styles.breakdownAmount, { color: BRAND.coral }]}>
              ${outstanding.toLocaleString()}
            </Text>
          </View>

          {/* Overdue */}
          {overdueCount > 0 && (
            <View style={styles.breakdownRow}>
              <View style={[styles.dot, { backgroundColor: D_COLORS.overdueRed }]} />
              <Text style={styles.breakdownLabel}>
                Overdue{' '}
                <Text style={styles.breakdownMeta}>
                  ({overdueCount} famil{overdueCount === 1 ? 'y' : 'ies'})
                </Text>
              </Text>
              <Text style={[styles.breakdownAmount, { color: D_COLORS.overdueRed }]}>
                ${overdueAmount.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          {overdueCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.reminderBtn}
              onPress={() => router.push('/payment-reminders' as any)}
            >
              <Text style={styles.reminderBtnText}>Send Reminders</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/payments' as any)}
          >
            <Text style={styles.viewDetailsText}>View Details {'\u203A'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default React.memo(AdminFinancialChart);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: BRAND.white,
    borderRadius: D_RADII.card,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 13,
    color: BRAND.textPrimary,
    letterSpacing: 0.5,
  },
  seasonLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.warmGray,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: D_COLORS.collectedGreen,
  },
  pctText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 15,
    color: BRAND.textPrimary,
    marginBottom: 16,
  },
  breakdownContainer: {
    gap: 10,
    marginBottom: 18,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  breakdownMeta: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
  },
  breakdownAmount: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderBtn: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  reminderBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.white,
  },
  viewDetailsText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
});
