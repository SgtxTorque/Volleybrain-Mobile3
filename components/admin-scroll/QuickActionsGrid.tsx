/**
 * QuickActionsGrid — 3x2 grid of admin quick-action shortcuts.
 */
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

const ACTIONS = [
  { icon: '\u{1F4CB}', label: 'Create\nEvent', key: 'createEvent' },
  { icon: '\u{1F4C5}', label: 'Quick\nSchedule', key: 'quickSchedule' },
  { icon: '\u{1F4B0}', label: 'Send\nReminder', key: 'sendReminder' },
  { icon: '\u{1F4E3}', label: 'Blast\nAll', key: 'blastAll' },
  { icon: '\u{1F464}', label: 'Add\nPlayer', key: 'addPlayer' },
  { icon: '\u{1F4CA}', label: 'Season\nReport', key: 'seasonReport' },
];

export default function QuickActionsGrid() {
  const handlePress = (key: string) => {
    Alert.alert('Coming Soon', 'This action will be available in a future update.');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
      <View style={styles.grid}>
        {ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.key}
            activeOpacity={0.7}
            style={styles.actionTile}
            onPress={() => handlePress(a.key)}
          >
            <Text style={styles.icon}>{a.icon}</Text>
            <Text style={styles.label}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: BRAND.textFaint,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  actionTile: {
    width: '30%',
    height: 80,
    backgroundColor: BRAND.offWhite,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
    marginBottom: 4,
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
});
