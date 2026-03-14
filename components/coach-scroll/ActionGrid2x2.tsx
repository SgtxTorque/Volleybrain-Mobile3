/**
 * ActionGrid2x2 — 2x2 pastel action grid replacing the vertical QuickActions list.
 * Send Blast, Give Shoutout, Review Stats, Create Challenge.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
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

/** Per-cell spring animation on press */
function SpringCell({ action, onPress }: { action: typeof ACTIONS[number]; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={[{ width: '47%', flexGrow: 1 }, animStyle]}>
      <TouchableOpacity
        style={[styles.cell, { backgroundColor: action.bg }]}
        activeOpacity={1}
        onPressIn={() => { scale.value = withTiming(0.95, { duration: 100 }); }}
        onPressOut={() => { scale.value = withSpring(1.0, { damping: 10, stiffness: 200 }); }}
        onPress={onPress}
      >
        <View style={[styles.iconContainer, { backgroundColor: action.iconBg }]}>
          <Text style={styles.emoji}>{action.emoji}</Text>
        </View>
        <Text style={styles.label}>{action.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ActionGrid2x2({ onGiveShoutout }: Props) {
  const router = useRouter();

  return (
    <View style={styles.grid}>
      {ACTIONS.map((action, i) => (
        <SpringCell
          key={i}
          action={action}
          onPress={() => {
            if (action.label === 'Give Shoutout' && onGiveShoutout) {
              onGiveShoutout();
            } else if (action.route) {
              router.push(action.route as any);
            }
          }}
        />
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
