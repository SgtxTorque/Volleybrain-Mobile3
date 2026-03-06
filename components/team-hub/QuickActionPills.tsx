/**
 * QuickActionPills — horizontal scroll-to-section anchors for the Team Hub.
 * Feed | Roster | Schedule | Gallery | Chat
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Pill = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const PILLS: Pill[] = [
  { key: 'feed', label: 'Feed', icon: 'newspaper-outline' },
  { key: 'roster', label: 'Roster', icon: 'people-outline' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar-outline' },
  { key: 'gallery', label: 'Gallery', icon: 'images-outline' },
  { key: 'chat', label: 'Chat', icon: 'chatbubble-outline' },
];

export type QuickActionPillsProps = {
  activeSection: string;
  onPress: (key: string) => void;
};

export default function QuickActionPills({ activeSection, onPress }: QuickActionPillsProps) {
  return (
    <View style={s.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {PILLS.map((pill) => {
          const isActive = pill.key === activeSection;
          return (
            <TouchableOpacity
              key={pill.key}
              style={[s.pill, isActive && s.pillActive]}
              onPress={() => onPress(pill.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={pill.icon}
                size={14}
                color={isActive ? '#FFF' : BRAND.textMuted}
              />
              <Text style={[s.pillText, isActive && s.pillTextActive]}>
                {pill.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: BRAND.warmGray,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  pillActive: {
    backgroundColor: BRAND.teal,
    borderColor: BRAND.teal,
  },
  pillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  pillTextActive: {
    color: '#FFF',
  },
});
