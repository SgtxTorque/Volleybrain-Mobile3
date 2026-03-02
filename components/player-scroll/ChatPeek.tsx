/**
 * ChatPeek — Latest chat message preview or "coming soon" ambient text.
 * Phase 4C: Single flat row, not a card.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PT = {
  textSecondary: 'rgba(255,255,255,0.60)',
  textMuted: 'rgba(255,255,255,0.30)',
  textFaint: 'rgba(255,255,255,0.15)',
};

export default function ChatPeek() {
  // Chat/messages table doesn't exist yet — show coming soon
  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.row}>
      <Text style={styles.icon}>{'\u{1F4AC}'}</Text>
      <Text style={styles.text}>Chat coming soon</Text>
      <Text style={styles.arrow}>{'\u203A'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  icon: {
    fontSize: 18,
    opacity: 0.4,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: PT.textMuted,
  },
  arrow: {
    fontSize: 18,
    color: PT.textFaint,
  },
});
