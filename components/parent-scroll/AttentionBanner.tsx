/**
 * AttentionBanner — expandable accordion showing items needing parent attention.
 * Tapping the header toggles the item list open/closed.
 * Each item row is tappable and navigates to the relevant screen.
 */
import React, { useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { AttentionItem } from '@/hooks/useParentHomeData';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  count: number;
  items: AttentionItem[];
  onPress?: () => void;
};

function getNudgeColor(count: number): string {
  if (count >= 5) return BRAND.error;
  if (count >= 3) return '#F59E0B';
  return 'rgba(16,40,76,0.6)';
}

export default function AttentionBanner({ count, items, onPress }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  if (count <= 0) return null;

  const color = getNudgeColor(count);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const handleItemPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      {/* Header row — tap to expand */}
      <TouchableOpacity
        style={styles.nudge}
        activeOpacity={0.7}
        onPress={items.length > 0 ? toggleExpand : onPress}
      >
        <Text style={styles.emoji}>{'\u26A0\uFE0F'}</Text>
        <Text style={[styles.label, { color }]}>
          {count} {count === 1 ? 'thing needs' : 'things need'} your attention
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={color}
        />
      </TouchableOpacity>

      {/* Expanded item list */}
      {expanded && items.length > 0 && (
        <View style={styles.itemList}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemRow}
              activeOpacity={0.7}
              onPress={() => handleItemPress(item.route)}
            >
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <Text style={styles.itemLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={BRAND.textFaint} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  nudge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    marginLeft: 8,
  },
  itemList: {
    marginHorizontal: 24,
    backgroundColor: BRAND.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    overflow: 'hidden',
    marginBottom: 8,
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
  itemIcon: {
    fontSize: 16,
  },
  itemLabel: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
});
