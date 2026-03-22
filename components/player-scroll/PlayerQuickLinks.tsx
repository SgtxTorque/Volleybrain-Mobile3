/**
 * PlayerQuickLinks — Horizontal row of 3 compact pill buttons:
 * My Card, Teammates, My Stats. Scale press with spring back + haptic.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';

type Props = {
  playerId: string | null;
  teamId: string | undefined;
};

type LinkItem = {
  emoji: string;
  label: string;
  route: string;
};

function QuickPill({ item }: { item: LinkItem }) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.93, { damping: 6, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 6, stiffness: 200 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(item.route as any);
      }}
    >
      <Animated.View style={[styles.pill, animStyle]}>
        <Text style={styles.pillEmoji}>{item.emoji}</Text>
        <Text style={styles.pillText}>{item.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function PlayerQuickLinks({ playerId, teamId }: Props) {
  const links: LinkItem[] = [
    {
      emoji: '\u{1F0CF}',
      label: 'My Card',
      route: playerId ? `/player-card?playerId=${playerId}` : '/player-card',
    },
    {
      emoji: '\u{1F465}',
      label: 'Teammates',
      route: teamId ? `/roster?teamId=${teamId}` : '/roster',
    },
    {
      emoji: '\u{1F4CA}',
      label: 'My Stats',
      route: playerId ? `/my-stats?playerId=${playerId}` : '/my-stats',
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollWrap}
    >
      {links.map((item) => (
        <QuickPill key={item.label} item={item} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PLAYER_THEME.cardBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: PLAYER_THEME.border,
    gap: 6,
  },
  pillEmoji: {
    fontSize: 14,
  },
  pillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: PLAYER_THEME.textPrimary,
  },
});
