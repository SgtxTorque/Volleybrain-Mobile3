/**
 * PendingStatsNudge — Tier 2 flat amber nudge for games needing stats.
 * Only renders when pendingStatsCount > 0.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';

type Props = {
  count: number;
};

export default function PendingStatsNudge({ count }: Props) {
  const router = useRouter();

  if (count === 0) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/coach-schedule' as any)}
    >
      <Text style={styles.text}>
        {'\u26A0\uFE0F'}  {count} game{count > 1 ? 's' : ''} need{count === 1 ? 's' : ''} stats entered {'\u2192'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 16,
  },
  text: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: '#F59E0B',
  },
});
