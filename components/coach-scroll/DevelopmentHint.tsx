/**
 * DevelopmentHint — Tier 2 flat hint about player evaluations.
 * Queries player_evaluations to find players due for evaluation.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSeason } from '@/lib/season';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  teamId: string | null;
};

export default function DevelopmentHint({ teamId }: Props) {
  const router = useRouter();
  const { workingSeason } = useSeason();
  const [hintText, setHintText] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId || !workingSeason?.id) return;

    (async () => {
      try {
        // Get roster players
        const { data: roster } = await supabase
          .from('team_players')
          .select('player_id')
          .eq('team_id', teamId);

        if (!roster || roster.length === 0) return;

        const playerIds = roster.map(r => r.player_id);

        // Check recent evaluations (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

        const { data: recentEvals } = await supabase
          .from('player_evaluations')
          .select('player_id')
          .in('player_id', playerIds)
          .eq('season_id', workingSeason.id)
          .gte('evaluation_date', cutoff);

        const evaluatedIds = new Set((recentEvals || []).map(e => e.player_id));
        const dueCount = playerIds.filter(id => !evaluatedIds.has(id)).length;

        if (dueCount > 0) {
          setHintText(`${dueCount} player${dueCount > 1 ? 's' : ''} due for evaluation this month \u2192`);
        }
      } catch (err) {
        if (__DEV__) console.error('[DevelopmentHint] Error:', err);
      }
    })();
  }, [teamId, workingSeason?.id]);

  if (!hintText) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/coach-roster' as any)}
    >
      <Text style={styles.header}>PLAYER DEVELOPMENT</Text>
      <Text style={styles.hintText}>{hintText}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  header: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  hintText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
    lineHeight: 20,
  },
});
