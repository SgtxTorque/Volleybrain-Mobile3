/**
 * QuickPropsRow — "Who balled out?" shoutout CTA row.
 * Phase 5A: Gold-tinted row. Tapping shows "Coming soon" toast.
 */
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';

const PT = {
  gold: '#FFD700',
  textSecondary: 'rgba(255,255,255,0.60)',
  textFaint: 'rgba(255,255,255,0.15)',
  borderGold: 'rgba(255,215,0,0.15)',
};

export default function QuickPropsRow() {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => Alert.alert('Coming Soon', 'Shoutouts are coming in a future update!')}
      style={styles.row}
    >
      <Text style={styles.icon}>{'\u{1F31F}'}</Text>
      <Text style={styles.text}>Who balled out today? Give props {'\u203A'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1,
    borderColor: PT.borderGold,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },
  icon: {
    fontSize: 18,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: PT.textSecondary,
  },
});
