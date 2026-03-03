/**
 * EngagementSection — Tier 3 single ambient nudge.
 * C4: Show only ONE nudge at a time based on priority.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  onGiveShoutout?: () => void;
};

export default function EngagementSection({ onGiveShoutout }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.nudgeLine}
        activeOpacity={0.7}
        onPress={onGiveShoutout}
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
