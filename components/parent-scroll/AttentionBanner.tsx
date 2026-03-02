/**
 * AttentionBanner — flat nudge line showing count of items needing parent attention.
 * Tier 2 flat content. Hides entirely when count is 0.
 * Color shifts by urgency: 1-2 muted, 3-4 amber, 5+ red.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  count: number;
  onPress?: () => void;
};

function getNudgeColor(count: number): string {
  if (count >= 5) return BRAND.error;
  if (count >= 3) return '#F59E0B'; // amberWarm
  return 'rgba(16,40,76,0.4)'; // textMuted
}

export default function AttentionBanner({ count, onPress }: Props) {
  if (count <= 0) return null;

  const color = getNudgeColor(count);

  return (
    <TouchableOpacity
      style={styles.nudge}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={styles.emoji}>{'\u{26A0}\u{FE0F}'}</Text>
      <Text style={[styles.label, { color }]}>
        {count} {count === 1 ? 'thing needs' : 'things need'} your attention
      </Text>
      <Text style={[styles.arrow, { color }]}>{'\u{2192}'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  arrow: {
    fontSize: 16,
  },
});
