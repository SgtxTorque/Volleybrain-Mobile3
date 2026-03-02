/**
 * ActivityFeed — Tier 2 compact recent activity feed.
 * C1: Capped at 2 items, inline format with emoji + text + timestamp.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type ActivityItem = {
  id: string;
  text: string;
  timestamp: string;
  icon: string;
};

type Props = {
  teamId: string | null;
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

export default function ActivityFeed({ teamId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!teamId) return;

    (async () => {
      try {
        const { data: roster } = await supabase
          .from('team_players')
          .select('player_id, players(id, first_name, last_name)')
          .eq('team_id', teamId);

        if (!roster || roster.length === 0) {
          setLoaded(true);
          return;
        }

        const playerIds = roster.map((r: any) => r.player_id);
        const nameMap = new Map<string, string>();
        for (const r of roster) {
          const p = (r as any).players;
          if (p) nameMap.set(r.player_id, `${p.first_name} ${p.last_name}`);
        }

        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const cutoff = twoWeeksAgo.toISOString();

        const { data: achievements } = await supabase
          .from('player_achievements')
          .select('id, player_id, earned_at, achievements(name, icon)')
          .in('player_id', playerIds)
          .gte('earned_at', cutoff)
          .order('earned_at', { ascending: false })
          .limit(5);

        const feed: ActivityItem[] = [];
        for (const ach of (achievements || [])) {
          const playerName = nameMap.get(ach.player_id) || 'A player';
          const achData = (ach as any).achievements;
          const achName = achData?.name || 'an achievement';
          const icon = achData?.icon || '\u{1F3C5}';
          feed.push({
            id: ach.id,
            text: `${playerName} earned ${achName}`,
            timestamp: relativeTime(ach.earned_at),
            icon,
          });
        }

        setTotalCount(feed.length);
        setItems(feed);
      } catch (err) {
        if (__DEV__) console.error('[ActivityFeed] Error:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, [teamId]);

  if (!loaded || !teamId) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>RECENT</Text>

      {items.length === 0 ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/coach-schedule' as any)}
        >
          <Text style={styles.emptyText}>
            Quiet week. Time to stir things up? {'\u2192'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.feedList}>
          {items.slice(0, 2).map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.feedItem}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/coach-roster' as any)}
            >
              <Text style={styles.feedText} numberOfLines={1}>
                {item.icon} {item.text} {'\u00B7'}{' '}
                <Text style={styles.feedTimestamp}>{item.timestamp}</Text>
              </Text>
            </TouchableOpacity>
          ))}
          {totalCount > 2 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/coach-roster' as any)}
            >
              <Text style={styles.viewAll}>View all {'\u2192'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    paddingHorizontal: 24,
  },
  feedList: {
    paddingHorizontal: 24,
    gap: 6,
  },
  feedItem: {},
  feedText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
    lineHeight: 18,
  },
  feedTimestamp: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
  },
  viewAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
    textAlign: 'right',
    marginTop: 4,
  },
});
