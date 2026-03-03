/**
 * TheDrop — "Since you were last here" notifications.
 * Shows shoutouts, badges earned, stats posted, or contextual forward message.
 * Phase 3: Stagger-reveal items.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { PlayerBadge, LastGameStats, NextEvent, RecentShoutout } from '@/hooks/usePlayerHomeData';

const PT = {
  cardBg: '#10284C',
  accent: '#4BB9EC',
  gold: '#FFD700',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.60)',
  textMuted: 'rgba(255,255,255,0.30)',
  textFaint: 'rgba(255,255,255,0.15)',
  border: 'rgba(255,255,255,0.06)',
  borderAccent: 'rgba(75,185,236,0.15)',
  borderGold: 'rgba(255,215,0,0.20)',
};

type DropItem = {
  type: 'badge' | 'stats' | 'shoutout' | 'contextual';
  icon: string;
  title: string;
  subtitle: string;
  tintColor?: string;
};

type Props = {
  badges: PlayerBadge[];
  lastGame: LastGameStats | null;
  nextEvent: NextEvent | null;
  attendanceStreak: number;
  recentShoutouts?: RecentShoutout[];
};

function relativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  } catch {
    return '';
  }
}

function buildDropItems(
  badges: PlayerBadge[],
  lastGame: LastGameStats | null,
  nextEvent: NextEvent | null,
  attendanceStreak: number,
  recentShoutouts?: RecentShoutout[],
): DropItem[] {
  const items: DropItem[] = [];

  // Recent shoutouts received (last 7 days)
  if (recentShoutouts && recentShoutouts.length > 0) {
    const s = recentShoutouts[0];
    items.push({
      type: 'shoutout',
      icon: s.categoryEmoji || '\u{1F31F}',
      title: `${s.giverName} gave you a ${s.categoryName} shoutout!`,
      subtitle: s.message || `${relativeTime(s.created_at)}`,
      tintColor: '#A855F7',
    });
  }

  // Recent badges (earned in last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentBadges = badges.filter(b => new Date(b.earned_at).getTime() > sevenDaysAgo);
  for (const badge of recentBadges.slice(0, 1)) {
    items.push({
      type: 'badge',
      icon: badge.achievement?.icon || '\u{1F3C5}',
      title: `You earned "${badge.achievement?.name || 'a badge'}"`,
      subtitle: `${badge.achievement?.description || ''} \u00B7 ${relativeTime(badge.earned_at)}`,
      tintColor: badge.achievement?.color_primary || PT.gold,
    });
  }

  // Stats posted
  if (lastGame && lastGame.event_date) {
    const gameDate = new Date(lastGame.event_date + 'T00:00:00');
    const daysSince = Math.floor((Date.now() - gameDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 7) {
      const statParts: string[] = [];
      if (lastGame.kills > 0) statParts.push(`${lastGame.kills} kills`);
      if (lastGame.aces > 0) statParts.push(`${lastGame.aces} aces`);
      if (lastGame.digs > 0) statParts.push(`${lastGame.digs} digs`);
      if (lastGame.assists > 0) statParts.push(`${lastGame.assists} assists`);
      items.push({
        type: 'stats',
        icon: '\u{1F4CA}',
        title: `Your stats are in${lastGame.opponent_name ? ` vs ${lastGame.opponent_name}` : ''}`,
        subtitle: statParts.slice(0, 3).join(' \u00B7 '),
      });
    }
  }

  // If nothing happened, show contextual message
  if (items.length === 0) {
    if (nextEvent) {
      const eventType = nextEvent.event_type === 'game' ? 'Game' : 'Practice';
      const dayName = (() => {
        try {
          return new Date(nextEvent.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
        } catch {
          return 'upcoming';
        }
      })();

      const today = new Date();
      const eventDate = new Date(nextEvent.event_date + 'T00:00:00');
      const isToday = today.toDateString() === eventDate.toDateString();

      if (isToday) {
        const time = formatTime(nextEvent.event_time || nextEvent.start_time);
        items.push({
          type: 'contextual',
          icon: attendanceStreak >= 2 ? '\u{1F525}' : '\u{1F3D0}',
          title: `${eventType} today${time ? ` at ${time}` : ''}.`,
          subtitle: attendanceStreak >= 2
            ? `Time to add to that streak.`
            : `Let's get after it.`,
        });
      } else {
        items.push({
          type: 'contextual',
          icon: '\u{1F3D0}',
          title: `${eventType} on ${dayName}${nextEvent.opponent_name ? ` vs ${nextEvent.opponent_name}` : ''}.`,
          subtitle: lastGame && lastGame.kills > 0
            ? `Last time you had ${lastGame.kills} kills. Beat that.`
            : 'Show up and show out.',
        });
      }
    } else {
      items.push({
        type: 'contextual',
        icon: '\u{1F431}',
        title: 'No events on the schedule.',
        subtitle: 'Enjoy the off day. You earned it.',
      });
    }
  }

  return items.slice(0, 3);
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    return `${hr % 12 || 12}:${m} ${ampm}`;
  } catch {
    return '';
  }
}

function DropCard({ item, index }: { item: DropItem; index: number }) {
  const animOpacity = useSharedValue(0);
  const animY = useSharedValue(20);

  useEffect(() => {
    animOpacity.value = withDelay(index * 200, withTiming(1, { duration: 400 }));
    animY.value = withDelay(index * 200, withTiming(0, { duration: 400 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: animOpacity.value,
    transform: [{ translateY: animY.value }],
  }));

  const isContextual = item.type === 'contextual';
  const bgColor = item.type === 'badge'
    ? 'rgba(255,215,0,0.06)'
    : item.type === 'shoutout'
      ? 'rgba(168,85,247,0.08)'
      : item.type === 'stats'
        ? PT.cardBg
        : 'transparent';
  const borderColor = item.type === 'badge'
    ? PT.borderGold
    : item.type === 'shoutout'
      ? 'rgba(168,85,247,0.15)'
      : item.type === 'stats'
        ? PT.border
        : 'transparent';

  if (isContextual) {
    return (
      <Animated.View style={[styles.contextualWrap, animStyle]}>
        <Text style={styles.contextualIcon}>{item.icon}</Text>
        <Text style={styles.contextualTitle}>{item.title}</Text>
        <Text style={styles.contextualSub}>{item.subtitle}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.dropCard,
        { backgroundColor: bgColor, borderColor },
        animStyle,
      ]}
    >
      <View style={styles.dropIconWrap}>
        <Text style={styles.dropIcon}>{item.icon}</Text>
      </View>
      <View style={styles.dropContent}>
        <Text style={styles.dropTitle}>{item.title}</Text>
        <Text style={styles.dropSub} numberOfLines={2}>{item.subtitle}</Text>
      </View>
    </Animated.View>
  );
}

export default function TheDrop({ badges, lastGame, nextEvent, attendanceStreak, recentShoutouts }: Props) {
  const items = buildDropItems(badges, lastGame, nextEvent, attendanceStreak, recentShoutouts);

  return (
    <View style={styles.container}>
      {items.map((item, i) => (
        <DropCard key={`${item.type}-${i}`} item={item} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    gap: 8,
  },
  dropCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  dropIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(75,185,236,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropIcon: {
    fontSize: 18,
  },
  dropContent: {
    flex: 1,
  },
  dropTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.80)',
    lineHeight: 18,
  },
  dropSub: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.25)',
    marginTop: 3,
  },
  contextualWrap: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 12,
  },
  contextualIcon: {
    fontSize: 28,
    marginBottom: 6,
    opacity: 0.4,
  },
  contextualTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.50)',
    textAlign: 'center',
    marginBottom: 2,
  },
  contextualSub: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
  },
});
