/**
 * QuickPropsRow — "Who balled out?" CTA row.
 * Phase 5A: Gold-tinted row. Opens shoutout modal for giving props.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { FONTS } from '@/theme/fonts';

const PT = {
  gold: '#FFD700',
  textSecondary: 'rgba(255,255,255,0.60)',
  textFaint: 'rgba(255,255,255,0.15)',
  borderGold: 'rgba(255,215,0,0.15)',
};

type Props = {
  teamId?: string | null;
  onGiveShoutout?: () => void;
};

export default function QuickPropsRow({ teamId, onGiveShoutout }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onGiveShoutout}
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
    borderRadius: 16,
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
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: PT.textSecondary,
  },
});
