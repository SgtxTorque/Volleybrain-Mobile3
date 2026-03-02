/**
 * ActionItems — Tier 2 merged section combining evaluation hints and pending stats.
 * C3: Replaces separate DevelopmentHint + PendingStatsNudge sections.
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
  pendingStatsCount: number;
};

export default function ActionItems({ teamId, pendingStatsCount }: Props) {
  const router = useRouter();
  const { workingSeason } = useSeason();
  const [evalCount, setEvalCount] = useState(0);

  useEffect(() => {
    if (!teamId || !workingSeason?.id) return;

    (async () => {
      try {
        const { data: roster } = await supabase
          .from('team_players')
          .select('player_id')
          .eq('team_id', teamId);

        if (!roster || roster.length === 0) return;

        const playerIds = roster.map(r => r.player_id);
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
        setEvalCount(playerIds.filter(id => !evaluatedIds.has(id)).length);
      } catch (err) {
        if (__DEV__) console.error('[ActionItems] Error:', err);
      }
    })();
  }, [teamId, workingSeason?.id]);

  // Don't render if nothing actionable
  if (evalCount === 0 && pendingStatsCount === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>ACTION ITEMS</Text>

      {evalCount > 0 && (
        <TouchableOpacity
          style={styles.item}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/coach-roster' as any)}
        >
          <Text style={styles.itemText}>
            {'\u{1F4CB}'} {evalCount} player{evalCount > 1 ? 's' : ''} due for evaluation {'\u2192'}
          </Text>
        </TouchableOpacity>
      )}

      {evalCount > 0 && pendingStatsCount > 0 && <View style={styles.separator} />}

      {pendingStatsCount > 0 && (
        <TouchableOpacity
          style={styles.item}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/coach-schedule' as any)}
        >
          <Text style={styles.itemText}>
            {'\u{1F4CA}'} {pendingStatsCount} game{pendingStatsCount > 1 ? 's' : ''} need stats entered {'\u2192'}
          </Text>
        </TouchableOpacity>
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
  item: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  itemText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: BRAND.border,
    marginHorizontal: 24,
  },
});
