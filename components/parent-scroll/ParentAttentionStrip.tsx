/**
 * ParentAttentionStrip — Expandable attention strip with urgency dots.
 * Collapsed: count + summary. Expanded: list of items with navigation.
 * Animated expand/collapse with stagger-fade items.
 */
import React, { useEffect, useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import type { FamilyAttentionItem } from '@/hooks/useParentHomeData';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  count: number;
  items: FamilyAttentionItem[];
}

const URGENCY_DOT: Record<string, string> = {
  rsvp: '#FF6B6B',
  payment: '#FF6B6B',
  waiver: '#FF6B6B',
  photo: '#F59E0B',
  evaluation: '#4BB9EC',
};

/** Individual attention item with stagger-fade animation */
function StaggerItem({
  item,
  index,
  expanded,
}: {
  item: FamilyAttentionItem;
  index: number;
  expanded: boolean;
}) {
  const router = useRouter();
  const itemOpacity = useSharedValue(0);

  useEffect(() => {
    if (expanded) {
      itemOpacity.value = withDelay(index * 60, withTiming(1, { duration: 200 }));
    } else {
      itemOpacity.value = 0;
    }
  }, [expanded]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: itemOpacity.value,
  }));

  return (
    <Animated.View style={fadeStyle}>
      <TouchableOpacity
        style={styles.itemRow}
        activeOpacity={0.7}
        onPress={() => router.push(item.route as any)}
      >
        <View style={[styles.urgencyDot, { backgroundColor: URGENCY_DOT[item.type] || '#F59E0B' }]} />
        <View style={styles.itemTextCol}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={BRAND.textFaint} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function ParentAttentionStrip({ count, items }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (count <= 0 || items.length === 0) return null;

  const summary = items.length === 1
    ? items[0].description
    : `${items[0].description} and ${items.length - 1} more`;

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.collapsedRow}
        activeOpacity={0.7}
        onPress={handleToggle}
      >
        <View style={styles.leftSection}>
          <Text style={styles.countNum}>{count}</Text>
          <View style={styles.textCol}>
            <Text style={styles.label}>
              {count === 1 ? 'thing needs attention' : 'things need attention'}
            </Text>
            {!expanded && (
              <Text style={styles.summary} numberOfLines={1}>{summary}</Text>
            )}
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={BRAND.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedList}>
          {items.map((item, index) => (
            <StaggerItem
              key={item.id}
              item={item}
              index={index}
              expanded={expanded}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default React.memo(ParentAttentionStrip);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: 'rgba(255,107,107,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.12)',
    overflow: 'hidden',
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  countNum: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 24,
    color: BRAND.coral,
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  summary: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  expandedList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,107,107,0.1)',
    paddingBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
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
    fontSize: 12,
    color: BRAND.textPrimary,
  },
  itemDesc: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 1,
  },
});
