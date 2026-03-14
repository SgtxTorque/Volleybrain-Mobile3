/**
 * ActionGrid2x2 — 2x2 pastel action grid replacing the vertical QuickActions list.
 * Send Blast, Give Shoutout, Review Stats, Create Challenge.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';

interface Props {
  onGiveShoutout?: () => void;
}

const ACTIONS = [
  {
    emoji: '\u{1F4E3}',
    label: 'Send Blast',
    bg: D_COLORS.blastBg,
    iconBg: D_COLORS.blastIcon,
    route: '/(tabs)/chats',
  },
  {
    emoji: '\u{2B50}',
    label: 'Give Shoutout',
    bg: D_COLORS.shoutBg,
    iconBg: D_COLORS.shoutIcon,
    route: null, // uses callback
  },
  {
    emoji: '\u{1F4CA}',
    label: 'Review Stats',
    bg: D_COLORS.statsBg,
    iconBg: D_COLORS.statsIcon,
    route: '/game-results',
  },
  {
    emoji: '\u{1F3AF}',
    label: 'Create Challenge',
    bg: D_COLORS.challengeBg,
    iconBg: D_COLORS.challengeIcon,
    route: '/create-challenge',
  },
];

function ActionGrid2x2({ onGiveShoutout }: Props) {
  const router = useRouter();

  return (
    <View style={styles.grid}>
      {ACTIONS.map((action, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.cell, { backgroundColor: action.bg }]}
          activeOpacity={0.7}
          onPress={() => {
            if (action.label === 'Give Shoutout' && onGiveShoutout) {
              onGiveShoutout();
            } else if (action.route) {
              router.push(action.route as any);
            }
          }}
        >
          <View style={[styles.iconContainer, { backgroundColor: action.iconBg }]}>
            <Text style={styles.emoji}>{action.emoji}</Text>
          </View>
          <Text style={styles.label}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default React.memo(ActionGrid2x2);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
  },
  cell: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: D_RADII.actionCell,
    padding: 16,
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 18,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#1a1a2e',
    flexShrink: 1,
  },
});
