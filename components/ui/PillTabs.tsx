import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/lib/theme';
import { radii, shadows } from '@/lib/design-tokens';

type Tab = {
  key: string;
  label: string;
};

type PillTabsProps = {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
};

export default function PillTabs({ tabs, activeKey, onChange }: PillTabsProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.container, { backgroundColor: colors.secondary }]}
      style={styles.scrollOuter}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              isActive && [{ backgroundColor: colors.primary }, shadows.card],
            ]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Text
              style={[
                styles.tabText,
                { color: isActive ? '#FFFFFF' : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollOuter: {
    flexGrow: 0,
    marginTop: 4,
    marginBottom: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pillTab,
    padding: 3,
    marginHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
