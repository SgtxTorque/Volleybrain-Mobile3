/**
 * EngagementSection — Tier 3 single ambient nudge.
 * C4: Show only ONE nudge at a time based on priority.
 * NOTE: shoutouts/challenges tables don't exist yet — always shows one placeholder.
 */
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

export default function EngagementSection() {
  // Since shoutouts + challenges tables don't exist, always show the shoutout nudge only
  // Priority: shoutout nudge > challenge nudge > nothing
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.nudgeLine}
        activeOpacity={0.7}
        onPress={() => {
          Alert.alert('Coming Soon', 'Shoutouts are coming in a future update.');
        }}
      >
        <Text style={styles.ambientText}>
          Who's been putting in work? Give a shoutout. {'\u2192'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  nudgeLine: {
    paddingHorizontal: 24,
    paddingVertical: 6,
  },
  ambientText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
    lineHeight: 20,
  },
});
