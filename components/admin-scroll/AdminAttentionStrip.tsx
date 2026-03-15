/**
 * AdminAttentionStrip — Expandable attention strip for admin queue items.
 * Full tinted card (NO side-border), urgency dots, tappable items.
 * LayoutAnimation for expand/collapse.
 */
import React, { useCallback, useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_RADII } from '@/theme/d-system';
import type { QueueItem } from '@/hooks/useAdminHomeData';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Map urgency → dot color */
const URGENCY_DOT: Record<string, string> = {
  overdue: '#EF4444',
  blocking: '#F59E0B',
  thisWeek: '#4BB9EC',
  upcoming: '#94A3B8',
};

/** Map queue category → navigation target (same as SmartQueueCard) */
const CATEGORY_ROUTES: Record<string, string> = {
  registration: '/registration-hub',
  payment: '/(tabs)/payments',
  waiver: '/registration-hub',
  schedule: '/(tabs)/admin-schedule',
  jersey: '/(tabs)/jersey-management',
};

interface Props {
  items: QueueItem[];
}

function AdminAttentionStrip({ items }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }, []);

  if (items.length === 0) return null;

  const overdueCount = items.filter(i => i.urgency === 'overdue' || i.urgency === 'blocking').length;
  const firstItem = items[0];

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={toggleExpand}
      >
        {/* Collapsed summary */}
        <View style={styles.summaryRow}>
          <Text style={styles.countText}>{items.length}</Text>
          <View style={styles.summaryTextCol}>
            <Text style={styles.summaryLabel}>
              item{items.length !== 1 ? 's' : ''} need action
            </Text>
            {!expanded && (
              <Text style={styles.firstItemPreview} numberOfLines={1}>
                {firstItem.icon} {firstItem.title}
              </Text>
            )}
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={BRAND.textMuted}
          />
        </View>

        {/* Expanded items */}
        {expanded && (
          <View style={styles.itemsContainer}>
            {items.map((item) => {
              const dotColor = URGENCY_DOT[item.urgency] || '#94A3B8';
              const route = item.actionRoute || CATEGORY_ROUTES[item.category.toLowerCase()] || '/registration-hub';
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemRow}
                  activeOpacity={0.7}
                  onPress={() => router.push(route as any)}
                >
                  <View style={[styles.urgencyDot, { backgroundColor: dotColor }]} />
                  <View style={styles.itemTextCol}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.itemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={BRAND.textFaint} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(AdminAttentionStrip);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(255,107,107,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.12)',
    borderRadius: D_RADII.cardSmall,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 24,
    color: BRAND.coral,
  },
  summaryTextCol: {
    flex: 1,
  },
  summaryLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  firstItemPreview: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  itemsContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,107,107,0.08)',
    paddingTop: 10,
    gap: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  itemSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 1,
  },
});
