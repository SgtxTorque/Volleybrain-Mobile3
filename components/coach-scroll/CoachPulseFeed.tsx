/**
 * CoachPulseFeed — D System styled activity feed for coach home.
 * Renders the same data as TeamPulse but with flat styling (no card wrapper).
 * Does NOT modify the shared TeamPulse.tsx.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type ActivityItem = {
  id: string;
  type: 'game' | 'shoutout' | 'badge' | 'post' | 'practice' | 'challenge';
  icon: string;
  text: string;
  detail?: string;
  timestamp: string;
  color: string;
};

interface Props {
  teamId: string | null | undefined;
  limit?: number;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/** Animated wrapper for feed items — slide in from right, staggered */
function SlideItem({ index, children }: { index: number; children: React.ReactNode }) {
  const translateX = useSharedValue(index < 5 ? 20 : 0);
  const opacity = useSharedValue(index < 5 ? 0 : 1);
  useEffect(() => {
    if (index >= 5) return;
    translateX.value = withDelay(index * 80, withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) }));
    opacity.value = withDelay(index * 80, withTiming(1, { duration: 250 }));
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

function CoachPulseFeed({ teamId, limit = 5 }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) { setLoading(false); return; }
    let mounted = true;

    (async () => {
      const result: ActivityItem[] = [];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Game results
      const { data: games } = await supabase
        .from('schedule_events')
        .select('id, event_date, event_type, opponent_name, our_score, opponent_score')
        .eq('team_id', teamId)
        .eq('event_type', 'game')
        .not('our_score', 'is', null)
        .gte('event_date', weekAgo.split('T')[0])
        .order('event_date', { ascending: false })
        .limit(3);

      if (games) {
        for (const g of games) {
          const won = (g.our_score ?? 0) > (g.opponent_score ?? 0);
          result.push({
            id: `game-${g.id}`,
            type: 'game',
            icon: won ? '\u{1F3C6}' : '\u{1F3D0}',
            text: won
              ? `Won vs ${g.opponent_name || 'Opponent'} ${g.our_score}-${g.opponent_score}`
              : `Lost vs ${g.opponent_name || 'Opponent'} ${g.our_score}-${g.opponent_score}`,
            timestamp: g.event_date,
            color: won ? BRAND.success : BRAND.coral,
          });
        }
      }

      // Shoutouts
      try {
        const { data: shoutouts } = await supabase
          .from('shoutouts')
          .select('id, category, message, created_at, giver_name')
          .eq('team_id', teamId)
          .gte('created_at', weekAgo)
          .order('created_at', { ascending: false })
          .limit(3);

        if (shoutouts) {
          for (const s of shoutouts) {
            result.push({
              id: `shout-${s.id}`,
              type: 'shoutout',
              icon: '\u{2B50}',
              text: `${s.giver_name || 'Someone'} gave a shoutout`,
              detail: s.message || undefined,
              timestamp: s.created_at,
              color: BRAND.gold,
            });
          }
        }
      } catch { /* shoutouts table may not exist */ }

      // Team posts
      try {
        const { data: posts } = await supabase
          .from('team_posts')
          .select('id, body, created_at, author_name')
          .eq('team_id', teamId)
          .eq('is_published', true)
          .gte('created_at', weekAgo)
          .order('created_at', { ascending: false })
          .limit(2);

        if (posts) {
          for (const p of posts) {
            result.push({
              id: `post-${p.id}`,
              type: 'post',
              icon: '\u{1F4AC}',
              text: `${p.author_name || 'Someone'} posted on the wall`,
              detail: p.body ? (p.body.length > 60 ? p.body.slice(0, 60) + '...' : p.body) : undefined,
              timestamp: p.created_at,
              color: BRAND.skyBlue,
            });
          }
        }
      } catch { /* team_posts may not exist */ }

      // Sort by timestamp descending
      result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (mounted) {
        setItems(result.slice(0, limit));
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [teamId, limit]);

  if (loading || items.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TEAM PULSE</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/connect' as any)}>
          <Text style={styles.headerLink}>See All</Text>
        </TouchableOpacity>
      </View>

      {/* Feed items — staggered slide-in */}
      {items.map((item, i) => (
        <SlideItem key={item.id} index={i}>
          <View style={[styles.item, i < items.length - 1 && styles.itemBorder]}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '18' }]}>
              <Text style={styles.iconEmoji}>{item.icon}</Text>
            </View>
            <View style={styles.itemBody}>
              <Text style={styles.itemText} numberOfLines={2}>{item.text}</Text>
              {item.detail && (
                <Text style={styles.itemDetail} numberOfLines={1}>{item.detail}</Text>
              )}
            </View>
            <Text style={styles.timestamp}>{timeAgo(item.timestamp)}</Text>
          </View>
        </SlideItem>
      ))}
    </View>
  );
}

export default React.memo(CoachPulseFeed);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 13,
    color: BRAND.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerLink: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
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
    lineHeight: 17,
  },
  itemDetail: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 1,
  },
  timestamp: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: 'rgba(0,0,0,0.25)',
  },
});
