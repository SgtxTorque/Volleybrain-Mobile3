/**
 * AmbientCelebration — Tier 3 ambient text after athlete cards.
 * Shows the most impressive recent achievement OR shoutout for any child.
 * Renders nothing if no notable achievements or shoutouts found.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  playerIds: string[];
  childNames: Record<string, string>; // playerId → first_name
};

type CelebrationData = {
  type: 'badge' | 'shoutout';
  childName: string;
  label: string;
  subtext: string;
  timeAgo: string;
};

export default function AmbientCelebration({ playerIds, childNames }: Props) {
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);

  useEffect(() => {
    if (playerIds.length === 0) return;

    (async () => {
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        // Fetch badges and shoutouts in parallel
        const [badgeRes, shoutoutRes] = await Promise.all([
          supabase
            .from('player_achievements')
            .select('player_id, earned_at, achievements(name)')
            .in('player_id', playerIds)
            .gte('earned_at', weekAgo.toISOString())
            .order('earned_at', { ascending: false })
            .limit(1),

          // Resolve player IDs to profile IDs for shoutout lookup
          (async () => {
            const { data: players } = await supabase
              .from('players')
              .select('id, parent_account_id')
              .in('id', playerIds);
            const profileMap = new Map<string, string>();
            for (const p of (players || [])) {
              if (p.parent_account_id) profileMap.set(p.parent_account_id, p.id);
            }
            const profileIds = Array.from(profileMap.keys());
            if (profileIds.length === 0) return { data: null, profileMap };

            const { data } = await supabase
              .from('shoutouts')
              .select('receiver_id, category, created_at')
              .in('receiver_id', profileIds)
              .gte('created_at', weekAgo.toISOString())
              .order('created_at', { ascending: false })
              .limit(1);
            return { data, profileMap };
          })(),
        ]);

        const candidates: { date: Date; build: () => CelebrationData }[] = [];

        // Badge candidate
        if (badgeRes.data && badgeRes.data.length > 0) {
          const item = badgeRes.data[0];
          const ach = item.achievements as any;
          if (ach?.name) {
            const d = new Date(item.earned_at);
            candidates.push({
              date: d,
              build: () => ({
                type: 'badge',
                childName: childNames[item.player_id] || 'Your athlete',
                label: `earned "${ach.name}"`,
                subtext: 'That badge takes real commitment.',
                timeAgo: formatTimeAgo(d),
              }),
            });
          }
        }

        // Shoutout candidate
        if (shoutoutRes.data && shoutoutRes.data.length > 0) {
          const item = shoutoutRes.data[0];
          const d = new Date(item.created_at);
          const playerId = shoutoutRes.profileMap.get(item.receiver_id);
          candidates.push({
            date: d,
            build: () => ({
              type: 'shoutout',
              childName: playerId ? (childNames[playerId] || 'Your athlete') : 'Your athlete',
              label: `got a ${item.category || 'Shoutout'} shoutout`,
              subtext: 'Their coach noticed.',
              timeAgo: formatTimeAgo(d),
            }),
          });
        }

        // Show the most recent
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.date.getTime() - a.date.getTime());
          setCelebration(candidates[0].build());
        }
      } catch (err) {
        if (__DEV__) console.error('[AmbientCelebration] Error:', err);
      }
    })();
  }, [playerIds.join(',')]);

  if (!celebration) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {celebration.childName} {celebration.label} {celebration.timeAgo}.
      </Text>
      <Text style={styles.text}>
        {celebration.subtext}
      </Text>
    </View>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  text: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: 'rgba(16,40,76,0.35)', // textAmbient
    textAlign: 'center',
    lineHeight: 22,
  },
});
