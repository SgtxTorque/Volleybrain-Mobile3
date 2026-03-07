/**
 * AttentionBanner — expandable accordion showing items needing parent attention.
 * Enhanced with typed items, severity ordering, child names, and per-item navigation.
 */
import React, { useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import type { FamilyAttentionItem, AttentionItem } from '@/hooks/useParentHomeData';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  /** New typed items (preferred) */
  familyItems?: FamilyAttentionItem[];
  /** Legacy items (backward compat) */
  count: number;
  items: AttentionItem[];
  isMultiChild?: boolean;
  onPress?: () => void;
};

const TYPE_ICONS: Record<string, string> = {
  rsvp: '\u{1F4CB}',
  payment: '\u{1F4B3}',
  photo: '\u{1F4F8}',
  evaluation: '\u{2B50}',
  waiver: '\u{1F4DC}',
};

function getHeaderColor(count: number, hasUrgent: boolean): string {
  if (hasUrgent || count >= 5) return BRAND.error;
  if (count >= 3) return '#F59E0B';
  return 'rgba(16,40,76,0.6)';
}

export default function AttentionBanner({ familyItems, count, items, isMultiChild, onPress }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  // Use family items if available, fallback to legacy
  const useFamilyItems = familyItems && familyItems.length > 0;
  const effectiveCount = useFamilyItems ? familyItems!.length : count;

  if (effectiveCount <= 0) return null;

  const hasUrgent = useFamilyItems ? familyItems!.some(i => i.severity === 'urgent') : false;
  const headerColor = getHeaderColor(effectiveCount, hasUrgent);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const hasExpandableItems = useFamilyItems ? familyItems!.length > 0 : items.length > 0;

  return (
    <View style={styles.container}>
      {/* Header row — tap to expand */}
      <TouchableOpacity
        style={[styles.header, hasUrgent && styles.headerUrgent]}
        activeOpacity={0.7}
        onPress={hasExpandableItems ? toggleExpand : onPress}
      >
        <Text style={styles.headerIcon}>{'\u26A0\uFE0F'}</Text>
        <Text style={[styles.headerLabel, { color: headerColor }]}>
          {effectiveCount} {effectiveCount === 1 ? 'thing needs' : 'things need'} your attention
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={headerColor}
        />
      </TouchableOpacity>

      {/* Expanded item list */}
      {expanded && (
        <View style={[styles.itemList, hasUrgent && styles.itemListUrgent]}>
          {useFamilyItems ? (
            familyItems!.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemRow, item.severity === 'urgent' && styles.itemRowUrgent]}
                activeOpacity={0.7}
                onPress={() => router.push(item.route as any)}
              >
                <Text style={styles.itemIcon}>{TYPE_ICONS[item.type] || item.icon}</Text>
                <View style={styles.itemContent}>
                  <Text style={styles.itemDescription} numberOfLines={1}>{item.description}</Text>
                  {isMultiChild && item.childName ? (
                    <View style={styles.childBadge}>
                      <Text style={styles.childBadgeText}>{item.childName}</Text>
                    </View>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={14} color={BRAND.textFaint} />
              </TouchableOpacity>
            ))
          ) : (
            items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                activeOpacity={0.7}
                onPress={() => router.push(item.route as any)}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={styles.itemLabel} numberOfLines={1}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={BRAND.textFaint} />
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  header: {
    paddingHorizontal: SPACING.pagePadding + 4,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerUrgent: {
    // Subtle coral tint behind
  },
  headerIcon: {
    fontSize: 16,
  },
  headerLabel: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    marginLeft: 8,
  },
  itemList: {
    marginHorizontal: SPACING.pagePadding,
    backgroundColor: BRAND.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    overflow: 'hidden',
    marginBottom: 8,
  },
  itemListUrgent: {
    borderColor: BRAND.coral,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    gap: 10,
  },
  itemRowUrgent: {
    backgroundColor: 'rgba(239,68,68,0.04)',
  },
  itemIcon: {
    fontSize: 16,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDescription: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  itemLabel: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  childBadge: {
    backgroundColor: BRAND.offWhite,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  childBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: BRAND.textMuted,
    textTransform: 'uppercase',
  },
});
