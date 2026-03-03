/**
 * SmartQueueCard — Tier 1 action card for admin Smart Queue.
 * Shows urgency-colored left accent, title, subtitle, and action button.
 */
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { QueueItem } from '@/hooks/useAdminHomeData';

type Props = {
  item: QueueItem;
};

const URGENCY_LABELS: Record<string, string> = {
  overdue: 'OVERDUE',
  blocking: 'BLOCKING',
  thisWeek: 'THIS WEEK',
  upcoming: 'UPCOMING',
};

export default function SmartQueueCard({ item }: Props) {
  const handleAction = () => {
    if (item.actionRoute) {
      // Navigate — will be wired later
      Alert.alert('Coming Soon', `Navigation to ${item.actionRoute} coming soon.`);
    } else {
      Alert.alert('Coming Soon', `${item.actionLabel} coming in a future update.`);
    }
  };

  return (
    <View style={styles.card}>
      {/* Left accent strip */}
      <View style={[styles.accent, { backgroundColor: item.color }]} />

      <View style={styles.body}>
        {/* Urgency + Category label */}
        <Text style={[styles.urgencyLabel, { color: item.color }]}>
          {URGENCY_LABELS[item.urgency] || 'UPCOMING'} {'\u00B7'} {item.category}
        </Text>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleAction}
            style={[styles.actionBtn, { backgroundColor: BRAND.skyBlue }]}
          >
            <Text style={styles.actionBtnText}>{item.actionLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: BRAND.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  urgencyLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
