/**
 * QuickPropsRow — "Who balled out?" CTA row.
 * Phase 5A: Gold-tinted row. Navigates to team wall for social interaction.
 * (Shoutout tables don't exist yet — using team wall as fallback.)
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const PT = {
  gold: '#FFD700',
  textSecondary: 'rgba(255,255,255,0.60)',
  textFaint: 'rgba(255,255,255,0.15)',
  borderGold: 'rgba(255,215,0,0.15)',
};

type Props = {
  teamId?: string | null;
};

export default function QuickPropsRow({ teamId }: Props) {
  const router = useRouter();

  const handlePress = () => {
    if (teamId) {
      router.push(`/team-wall?teamId=${teamId}` as any);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
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
