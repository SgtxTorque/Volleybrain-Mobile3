/**
 * PaymentSnapshot — Payment summary card with progress bar.
 * Shows collected vs expected, overdue families, and reminder CTA.
 */
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
            <View>
              <Text style={styles.amountMuted}>
                ${(expected - collected).toLocaleString()}
              </Text>
              <Text style={styles.amountLabel}>outstanding</Text>
            </View>
          </View>

          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.min(paymentPct, 100)}%` }]} />
          </View>
          <Text style={styles.pctText}>{paymentPct}%</Text>

          {overdueCount > 0 && (
            <Text style={styles.overdueLine}>
              {overdueCount} famil{overdueCount === 1 ? 'y' : 'ies'} overdue
            </Text>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.reminderBtn}
              onPress={() =>
                Alert.alert(
                  'Coming Soon',
                  'Payment reminders will be available in a future update.',
                )
              }
            >
              <Text style={styles.reminderBtnText}>Send All Reminders</Text>
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
  amountGreen: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: BRAND.success,
  },
  amountMuted: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: BRAND.textMuted,
    textAlign: 'right',
  },
  amountLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textFaint,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.warmGray,
    marginBottom: 4,
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
    textAlign: 'right',
    marginBottom: 10,
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
});
