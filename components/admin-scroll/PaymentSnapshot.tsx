/**
 * PaymentSnapshot — Payment summary card with progress bar.
 * Phase 4: Shows collected vs expected, overdue families,
 * reminder CTA, "View Details" link.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  collected: number;
  expected: number;
  overdueAmount: number;
  overdueCount: number;
  paymentPct: number;
  seasonName: string;
};

export default function PaymentSnapshot({
  collected,
  expected,
  overdueAmount,
  overdueCount,
  paymentPct,
  seasonName,
}: Props) {
  const router = useRouter();
  const allPaid = paymentPct >= 100;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>PAYMENTS</Text>
        <Text style={styles.seasonLabel}>{seasonName}</Text>
      </View>

      {allPaid ? (
        <Text style={styles.allPaid}>
          {'\u2705'} 100% collected! ${collected.toLocaleString()} total.
        </Text>
      ) : (
        <>
          <View style={styles.numbersRow}>
            <View>
              <Text style={styles.amountGreen}>${collected.toLocaleString()}</Text>
              <Text style={styles.amountLabel}>collected</Text>
            </View>
            <View style={styles.rightAlign}>
              <Text style={styles.amountMuted}>
                ${(expected - collected).toLocaleString()}
              </Text>
              <Text style={[styles.amountLabel, styles.rightAlign]}>outstanding</Text>
            </View>
          </View>

          <View style={styles.barRow}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.min(paymentPct, 100)}%` }]} />
            </View>
            <Text style={styles.pctText}>{paymentPct}%</Text>
          </View>

          {overdueCount > 0 && (
            <Text style={styles.overdueLine}>
              {overdueCount} famil{overdueCount === 1 ? 'y' : 'ies'} overdue
              {overdueAmount > 0 ? ` \u00B7 $${overdueAmount.toLocaleString()}` : ''}
            </Text>
          )}

          <View style={styles.actionsRow}>
            {overdueCount > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.reminderBtn}
                onPress={() => router.push('/blast-composer' as any)}
              >
                <Text style={styles.reminderBtnText}>Send All Reminders</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/payments' as any)}
            >
              <Text style={styles.viewDetailsText}>View Details {'\u203A'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRAND.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    marginHorizontal: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: BRAND.textFaint,
  },
  seasonLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: BRAND.textFaint,
  },
  allPaid: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.success,
    textAlign: 'center',
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rightAlign: {
    alignItems: 'flex-end',
  },
  amountGreen: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: BRAND.success,
  },
  amountMuted: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: BRAND.textMuted,
  },
  amountLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textFaint,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.warmGray,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.success,
  },
  pctText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textMuted,
  },
  overdueLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.warning,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderBtn: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reminderBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  viewDetailsText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
});
