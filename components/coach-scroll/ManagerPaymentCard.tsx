/**
 * ManagerPaymentCard — payment health summary for Team Manager.
 * Shows overdue/pending/collected payment totals at a glance.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';

interface Props {
  overduePayments: number;
  overdueAmount: number;
  pendingPayments: number;
  totalCollected: number;
  teamId: string;
}

function ManagerPaymentCard({ overduePayments, overdueAmount, pendingPayments, totalCollected, teamId }: Props) {
  const router = useRouter();
  const hasOverdue = overduePayments > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/payments' as any)}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="cash-outline" size={18} color={BRAND.textPrimary} />
          <Text style={styles.title}>Payments</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={BRAND.textMuted} />
      </View>

      {/* Status bar */}
      {hasOverdue ? (
        <View style={styles.alertBar}>
          <Ionicons name="alert-circle" size={16} color={D_COLORS.overdueRed} />
          <Text style={styles.alertText}>
            ${overdueAmount.toLocaleString()} overdue from {overduePayments} {overduePayments === 1 ? 'family' : 'families'}
          </Text>
        </View>
      ) : (
        <View style={styles.okBar}>
          <Ionicons name="checkmark-circle" size={16} color={D_COLORS.collectedGreen} />
          <Text style={styles.okText}>All payments current</Text>
        </View>
      )}

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: D_COLORS.collectedGreen }]}>
            ${totalCollected.toLocaleString()}
          </Text>
          <Text style={styles.summaryLabel}>Collected</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: D_COLORS.pendingBlue }]}>
            {pendingPayments}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: hasOverdue ? D_COLORS.overdueRed : BRAND.textMuted }]}>
            {overduePayments}
          </Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(ManagerPaymentCard);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: D_RADII.card,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(11,22,40,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  alertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: D_RADII.cardSmall,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  alertText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12.5,
    color: D_COLORS.overdueRed,
  },
  okBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: D_RADII.cardSmall,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  okText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12.5,
    color: D_COLORS.collectedGreen,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
  },
  summaryLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(11,22,40,0.08)',
  },
});
