/**
 * SmartQueueCard — Tier 1 action card for admin Smart Queue.
 * Phase 2: urgency-colored left accent, icon, title, subtitle,
 * action button, and slide-in entry animation with stagger.
 */
import React, { useEffect } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { QueueItem } from '@/hooks/useAdminHomeData';

type Props = {
  item: QueueItem;
  index: number;
};

const URGENCY_LABELS: Record<string, string> = {
  overdue: 'OVERDUE',
  blocking: 'BLOCKING',
  thisWeek: 'THIS WEEK',
  upcoming: 'UPCOMING',
};

export default function SmartQueueCard({ item, index }: Props) {
  // Stagger slide-in animation: each card slides from right with 100ms stagger
  const translateX = useSharedValue(60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 100;
    translateX.value = withDelay(delay, withTiming(0, { duration: 350 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const handleAction = () => {
    if (item.actionRoute) {
      Alert.alert('Coming Soon', `Navigation to ${item.actionRoute} coming soon.`);
    } else {
      Alert.alert('Coming Soon', `${item.actionLabel} coming in a future update.`);
    }
  };

  return (
    <Animated.View style={[styles.card, animStyle]}>
      {/* Left accent strip */}
      <View style={[styles.accent, { backgroundColor: item.color }]} />

      <View style={styles.body}>
        {/* Urgency + Category label */}
        <View style={styles.topRow}>
          <Text style={styles.icon}>{item.icon}</Text>
          <Text style={[styles.urgencyLabel, { color: item.color }]}>
            {URGENCY_LABELS[item.urgency] || 'UPCOMING'} {'\u00B7'} {item.category}
          </Text>
        </View>

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
    </Animated.View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  accent: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  icon: {
    fontSize: 14,
  },
  urgencyLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
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
