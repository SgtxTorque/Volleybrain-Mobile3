/**
 * AmbientCelebration — Tier 3 ambient text after athlete cards.
 * Shows the most impressive recent achievement for any of the parent's children.
 * Renders nothing if no notable achievements found.
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
  childName: string;
  badgeName: string;
  timeAgo: string;
};

export default function AmbientCelebration({ playerIds, childNames }: Props) {
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);

  useEffect(() => {
    if (playerIds.length === 0) return;

    (async () => {
      try {
        // Check for badges earned in last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data } = await supabase
          .from('player_achievements')
          .select('player_id, earned_at, achievements(name)')
          .in('player_id', playerIds)
          .gte('earned_at', weekAgo.toISOString())
          .order('earned_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const item = data[0];
          const ach = item.achievements as any;
          if (!ach?.name) return;

          const earnedDate = new Date(item.earned_at);
          const now = new Date();
          const diffMs = now.getTime() - earnedDate.getTime();
          const diffDays = Math.floor(diffMs / 86400000);
          const timeAgo = diffDays === 0 ? 'today' : diffDays === 1 ? 'yesterday' : `${diffDays} days ago`;

          setCelebration({
            childName: childNames[item.player_id] || 'Your athlete',
            badgeName: ach.name,
            timeAgo,
          });
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
        {celebration.childName} earned "{celebration.badgeName}" {celebration.timeAgo}.
      </Text>
      <Text style={styles.text}>
        That badge takes real commitment.
      </Text>
    </View>
  );
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
