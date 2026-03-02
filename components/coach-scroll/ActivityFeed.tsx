/**
 * ActivityFeed — Tier 2 flat recent activity feed.
 * Shows player achievements/level-ups for the team.
 * NOTE: shoutouts table not found — only shows achievement activity.
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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!teamId) return;

    (async () => {
      try {
        // Get roster player IDs
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

        // Recent achievements (last 14 days)
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
            text: `${playerName} earned ${icon} ${achName}`,
            timestamp: relativeTime(ach.earned_at),
          });
        }

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
          onPress={() => {
            // Scroll to quick actions conceptually; navigate to schedule
            router.push('/(tabs)/coach-schedule' as any);
          }}
        >
          <Text style={styles.emptyText}>
            Quiet week. Time to stir things up? {'\u2192'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.feedList}>
          {items.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.feedItem}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/coach-roster' as any)}
            >
              <Text style={styles.feedText}>{item.text}</Text>
              <Text style={styles.feedTimestamp}>{item.timestamp}</Text>
            </TouchableOpacity>
          ))}
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
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
    paddingHorizontal: 24,
  },
  feedList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  feedItem: {},
  feedText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
    lineHeight: 20,
  },
  feedTimestamp: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 2,
  },
});
