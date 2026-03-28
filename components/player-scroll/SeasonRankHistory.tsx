import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '@/theme/fonts';
import { SEASON_RANK_TIERS } from '@/lib/engagement-constants';
import { supabase } from '@/lib/supabase';

type SeasonRankHistoryProps = {
  profileId: string;
};

type HistoryEntry = {
  final_rank_tier: string;
  final_season_score: number;
  finalized_at: string;
  seasons: { name: string } | null;
};

function getTierConfig(rankTier: string) {
  return SEASON_RANK_TIERS.find(t => t.rank === rankTier) || SEASON_RANK_TIERS[0];
}

function abbreviateSeasonName(name: string): string {
  // "Fall 2026" → "Fall '26", "Spring 2027" → "Spr '27"
  const parts = name.split(' ');
  if (parts.length >= 2) {
    const season = parts[0].length > 4 ? parts[0].slice(0, 3) : parts[0];
    const year = parts[parts.length - 1];
    if (/^\d{4}$/.test(year)) {
      return `${season} '${year.slice(2)}`;
    }
  }
  return name.length > 10 ? name.slice(0, 10) : name;
}

export default function SeasonRankHistory({ profileId }: SeasonRankHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('season_rank_history')
          .select('final_rank_tier, final_season_score, finalized_at, seasons(name)')
          .eq('player_id', profileId)
          .order('finalized_at', { ascending: false });

        setHistory((data as HistoryEntry[] | null) || []);
      } catch {
        // Table may not exist yet
      } finally {
        setLoading(false);
      }
    })();
  }, [profileId]);

  if (loading || history.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Past Seasons</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {history.map((entry, i) => {
          const tier = getTierConfig(entry.final_rank_tier);
          const seasonName = entry.seasons?.name
            ? abbreviateSeasonName(entry.seasons.name)
            : 'Season';

          return (
            <View key={i} style={styles.pill}>
              <View style={[styles.dot, { backgroundColor: tier.color }]} />
              <View>
                <Text style={styles.pillRank}>{tier.label}</Text>
                <Text style={styles.pillSeason}>{seasonName}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0B1628',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pillRank: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  pillSeason: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
  },
});
