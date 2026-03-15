/**
 * PlayerTeamActivity — "TEAM ACTIVITY" feed showing recent shoutouts,
 * badge earns, game results from available data.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';
import type { RecentShoutout, PlayerBadge, LastGameStats } from '@/hooks/usePlayerHomeData';

type Props = {
  recentShoutouts: RecentShoutout[];
  badges: PlayerBadge[];
  lastGame: LastGameStats | null;
  teamId: string | undefined;
};

type FeedItem = {
  id: string;
  avatar: string;
  text: string;
  time: string;
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function buildFeed(
  shoutouts: RecentShoutout[],
  badges: PlayerBadge[],
  lastGame: LastGameStats | null,
): FeedItem[] {
  const items: FeedItem[] = [];

  // Shoutouts
  for (const s of shoutouts.slice(0, 2)) {
    items.push({
      id: `shout-${s.id}`,
      avatar: s.giverName[0]?.toUpperCase() || '?',
      text: `${s.giverName} gave props ${s.categoryEmoji}`,
      time: timeAgo(s.created_at),
    });
  }

  // Recent badges
  for (const b of badges.slice(0, 2)) {
    if (b.achievement?.name) {
      items.push({
        id: `badge-${b.id}`,
        avatar: b.achievement.icon || '\u{1F3C5}',
        text: `Earned ${b.achievement.name} ${b.achievement.icon || ''}`,
        time: timeAgo(b.earned_at),
      });
    }
  }

  // Last game result
  if (lastGame && lastGame.our_score != null && lastGame.opponent_score != null) {
    const won = lastGame.our_score > lastGame.opponent_score;
    const emoji = won ? '\u{1F3C6}' : '\u{1F4AA}';
    const result = won ? 'Won' : 'Lost';
    const opponent = lastGame.opponent_name || 'opponent';
    items.push({
      id: 'last-game',
      avatar: emoji,
      text: `Team ${result} vs ${opponent} ${emoji}`,
      time: lastGame.event_date ? timeAgo(lastGame.event_date + 'T12:00:00') : '',
    });
  }

  return items.slice(0, 3);
}

/** Animated feed item with stagger */
function FeedRow({ item, index }: { item: FeedItem; index: number }) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-15);

  useEffect(() => {
    opacity.value = withDelay(index * 60, withTiming(1, { duration: 300 }));
    translateX.value = withDelay(index * 60, withTiming(0, { duration: 300 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.feedRow, animStyle]}>
      <View style={styles.feedAvatar}>
        <Text style={styles.feedAvatarText}>{item.avatar}</Text>
      </View>
      <Text style={styles.feedText} numberOfLines={1}>{item.text}</Text>
      {item.time ? <Text style={styles.feedTime}>{item.time}</Text> : null}
    </Animated.View>
  );
}

export default function PlayerTeamActivity({ recentShoutouts, badges, lastGame, teamId }: Props) {
  const router = useRouter();
  const feed = useMemo(
    () => buildFeed(recentShoutouts, badges, lastGame),
    [recentShoutouts, badges, lastGame],
  );

  if (feed.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TEAM ACTIVITY</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/connect' as any)} activeOpacity={0.7}>
          <Text style={styles.headerCta}>See All</Text>
        </TouchableOpacity>
      </View>
      {feed.map((item, index) => (
        <FeedRow key={item.id} item={item} index={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: PLAYER_THEME.accent,
    letterSpacing: 1.5,
  },
  headerCta: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: PLAYER_THEME.textMuted,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: PLAYER_THEME.cardBg,
    borderRadius: D_RADII.cardSmall,
    borderWidth: 1,
    borderColor: PLAYER_THEME.border,
    marginBottom: 6,
  },
  feedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(75,185,236,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedAvatarText: {
    fontSize: 14,
  },
  feedText: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PLAYER_THEME.textPrimary,
  },
  feedTime: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
  },
});
