/**
 * FamilyPulseFeed — Activity feed combining team hub, chat, and child activity.
 * Flat on page background, section header + items with timestamps and XP badges.
 * Staggered fade-in animation (first 5 items, 60ms apart).
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_COLORS } from '@/theme/d-system';
import type { LatestPost, LastChatPreview, SeasonRecord } from '@/hooks/useParentHomeData';

interface Props {
  latestPost: LatestPost | null;
  lastChat: LastChatPreview | null;
  seasonRecord: SeasonRecord | null;
  childName: string;
}

type FeedItem = {
  id: string;
  icon: string;
  iconBg: string;
  text: string;
  timestamp: string;
  xpBadge: string | null;
  route: string;
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Sub-component for stagger-fade animation per item */
function PulseItem({
  item,
  index,
  isLast,
}: {
  item: FeedItem;
  index: number;
  isLast: boolean;
}) {
  const router = useRouter();
  const itemOpacity = useSharedValue(0);

  useEffect(() => {
    // Only animate first 5 items
    const delay = index < 5 ? index * 60 : 0;
    itemOpacity.value = withDelay(delay, withTiming(1, { duration: 250 }));
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: itemOpacity.value,
  }));

  return (
    <Animated.View style={fadeStyle}>
      <TouchableOpacity
        style={[styles.itemRow, !isLast && styles.itemBorder]}
        activeOpacity={0.7}
        onPress={() => router.push(item.route as any)}
      >
        <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
          <Text style={styles.iconEmoji}>{item.icon}</Text>
        </View>
        <View style={styles.itemBody}>
          <Text style={styles.itemText} numberOfLines={2}>{item.text}</Text>
          {item.timestamp ? <Text style={styles.itemTimestamp}>{item.timestamp}</Text> : null}
        </View>
        {item.xpBadge && (
          <Text style={styles.xpBadge}>{item.xpBadge}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function FamilyPulseFeed({ latestPost, lastChat, seasonRecord, childName }: Props) {
  const router = useRouter();

  const items: FeedItem[] = [];

  // Team hub post
  if (latestPost) {
    items.push({
      id: `post-${latestPost.id}`,
      icon: '\u{1F4E3}',
      iconBg: 'rgba(75,185,236,0.1)',
      text: `${latestPost.author_name}: ${latestPost.content.length > 60 ? latestPost.content.slice(0, 60) + '...' : latestPost.content}`,
      timestamp: timeAgo(latestPost.created_at),
      xpBadge: null,
      route: '/(tabs)/connect',
    });
  }

  // Chat message
  if (lastChat && lastChat.last_message) {
    items.push({
      id: 'chat-latest',
      icon: '\u{1F4AC}',
      iconBg: 'rgba(34,197,94,0.1)',
      text: `${lastChat.sender_name} in ${lastChat.channel_name}: "${lastChat.last_message.length > 50 ? lastChat.last_message.slice(0, 50) + '...' : lastChat.last_message}"`,
      timestamp: lastChat.unread_count > 0 ? `${lastChat.unread_count} unread` : '',
      xpBadge: null,
      route: '/(tabs)/chats',
    });
  }

  // Season record
  if (seasonRecord && seasonRecord.games_played > 0) {
    items.push({
      id: 'season-record',
      icon: '\u{1F3C6}',
      iconBg: 'rgba(245,158,11,0.1)',
      text: `${childName}'s team is ${seasonRecord.wins}-${seasonRecord.losses} this season`,
      timestamp: `${seasonRecord.games_played} games`,
      xpBadge: seasonRecord.wins > 0 ? `+${seasonRecord.wins * 50} XP` : null,
      route: '/standings',
    });
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>FAMILY PULSE</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/connect' as any)}>
          <Text style={styles.headerLink}>See All</Text>
        </TouchableOpacity>
      </View>

      {items.map((item, i) => (
        <PulseItem
          key={item.id}
          item={item}
          index={i}
          isLast={i === items.length - 1}
        />
      ))}
    </View>
  );
}

export default React.memo(FamilyPulseFeed);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 13,
    color: BRAND.textPrimary,
    letterSpacing: 0.5,
  },
  headerLink: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 16,
  },
  itemBody: {
    flex: 1,
  },
  itemText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12.5,
    color: BRAND.textPrimary,
    lineHeight: 18,
  },
  itemTimestamp: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  xpBadge: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 11,
    color: D_COLORS.xpBarFill,
  },
});
