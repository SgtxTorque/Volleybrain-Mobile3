/**
 * EngagementSection — Tier 2/3 active challenge + shoutout nudge.
 * NOTE: coach_challenges, challenge_participants, and shoutouts tables
 * do not exist in SCHEMA_REFERENCE.csv. This component renders placeholder
 * ambient messages instead of live data.
 * TODO: Wire to real data when these tables are created.
 */
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

export default function EngagementSection() {
  return (
    <View style={styles.container}>
      {/* Active Challenge — placeholder (coach_challenges table not found) */}
      <TouchableOpacity
        style={styles.nudgeLine}
        activeOpacity={0.7}
        onPress={() => {
          Alert.alert('Coming Soon', 'Team challenges are coming in a future update.');
        }}
      >
        <Text style={styles.ambientText}>
          No active challenges. Your team could use one. {'\u2192'}
        </Text>
      </TouchableOpacity>

      {/* Shoutout Nudge — placeholder (shoutouts table not found) */}
      <TouchableOpacity
        style={styles.nudgeLine}
        activeOpacity={0.7}
        onPress={() => {
          Alert.alert('Coming Soon', 'Shoutouts are coming in a future update.');
        }}
      >
        <Text style={styles.ambientText}>
          Who's been putting in work? Recognize someone. {'\u2192'}
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
