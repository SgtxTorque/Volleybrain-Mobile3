/**
 * OrgPulseFeed — Activity feed showing recent org activity.
 * Flat on page background. Items from available data.
 * Staggered fade-in (first 5 items, 60ms apart).
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
import type { UpcomingEvent } from '@/hooks/useAdminHomeData';

interface Props {
  collected: number;
  pendingRegs: number;
  overdueCount: number;
  upcomingEvents: UpcomingEvent[];
}

type FeedItem = {
  id: string;
  icon: string;
  iconBg: string;
  text: string;
  detail: string;
  route: string;
};

/** Sub-component: stagger-fade per item */
function PulseItem({ item, index, isLast }: { item: FeedItem; index: number; isLast: boolean }) {
  const router = useRouter();
  const itemOpacity = useSharedValue(0);

  useEffect(() => {
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
          <Text style={styles.itemDetail}>{item.detail}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function OrgPulseFeed({ collected, pendingRegs, overdueCount, upcomingEvents }: Props) {
  const router = useRouter();
  const items: FeedItem[] = [];

  // Payment activity
  if (collected > 0) {
    items.push({
      id: 'payments-collected',
      icon: '\u{1F4B0}',
      iconBg: 'rgba(34,197,94,0.1)',
      text: `$${collected.toLocaleString()} collected this season`,
      detail: overdueCount > 0 ? `${overdueCount} overdue` : 'On track',
      route: '/(tabs)/payments',
    });
  }

  // Registrations
  if (pendingRegs > 0) {
    items.push({
      id: 'pending-regs',
      icon: '\u{1F4CB}',
      iconBg: 'rgba(245,158,11,0.1)',
      text: `${pendingRegs} registration${pendingRegs !== 1 ? 's' : ''} awaiting review`,
      detail: 'Tap to review',
      route: '/registration-hub',
    });
  }

  // Upcoming events
  for (const event of upcomingEvents.slice(0, 2)) {
    const isGame = event.event_type === 'game';
    items.push({
      id: `event-${event.id}`,
      icon: isGame ? '\u{1F3C6}' : '\u{1F4C5}',
      iconBg: isGame ? 'rgba(245,158,11,0.1)' : 'rgba(75,185,236,0.1)',
      text: `${event.team_name} ${isGame ? 'vs ' + (event.opponent_name || 'TBD') : event.event_type}`,
      detail: formatEventDate(event.event_date),
      route: '/(tabs)/admin-schedule',
    });
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>ORG PULSE</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/admin-schedule' as any)}>
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

function formatEventDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default React.memo(OrgPulseFeed);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 2,
    marginBottom: 16,
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
  itemDetail: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: BRAND.textMuted,
    marginTop: 2,
  },
});
