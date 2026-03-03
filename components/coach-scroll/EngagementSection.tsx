/**
 * EngagementSection — Tier 3 single ambient nudge.
 * C4: Show only ONE nudge at a time based on priority.
 * Smart: suggests a specific player based on recent performance data.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type SuggestedPlayer = {
  name: string;
  stat: string;
  value: number;
};

type Props = {
  onGiveShoutout?: () => void;
  /** Pre-selected player from nudge — opens modal with this player */
  onShoutoutPlayer?: (player: { id: string; full_name: string; avatar_url: string | null; role: string }) => void;
  suggestedPlayer?: SuggestedPlayer | null;
};

export default function EngagementSection({ onGiveShoutout, suggestedPlayer }: Props) {
  const nudgeText = suggestedPlayer
    ? `${suggestedPlayer.name} had ${suggestedPlayer.value} ${suggestedPlayer.stat} — give them a shoutout? \u2192`
    : 'Who\u2019s been putting in work? Give a shoutout. \u2192';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.nudgeLine}
        activeOpacity={0.7}
        onPress={onGiveShoutout}
      >
        <Text style={styles.ambientText}>{nudgeText}</Text>
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
