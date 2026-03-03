/**
 * ShoutoutProfileSection — Shows a player's shoutout stats.
 * Total received/given + category breakdown.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fetchShoutoutStats } from '@/lib/shoutout-service';
import { supabase } from '@/lib/supabase';

type Props = {
  /** Profile ID (profiles.id) — used directly if provided */
  profileId?: string | null;
  /** Player ID (players.id) — resolved to profile via parent_account_id */
  playerId?: string | null;
  colors: {
    glassCard: string;
    glassBorder: string;
    text: string;
    textSecondary: string;
    textMuted: string;
  };
};

type ShoutoutStats = {
  received: number;
  given: number;
  categoryBreakdown: { name: string; emoji: string; count: number }[];
};

export default function ShoutoutProfileSection({ profileId, playerId, colors }: Props) {
  const [stats, setStats] = useState<ShoutoutStats | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let resolvedId = profileId || null;

        // Resolve playerId → profileId via parent_account_id
        if (!resolvedId && playerId) {
          const { data } = await supabase
            .from('players')
            .select('parent_account_id')
            .eq('id', playerId)
            .maybeSingle();
          resolvedId = data?.parent_account_id || null;
        }

        if (!resolvedId) return;

        const data = await fetchShoutoutStats(resolvedId);
        if (data) {
          setStats({
            received: data.received ?? 0,
            given: data.given ?? 0,
            categoryBreakdown: (data.categoryBreakdown || []).map((c) => ({
              name: c.category || 'Shoutout',
              emoji: c.emoji || '\u{1F31F}',
              count: c.count || 0,
            })),
          });
        }
      } catch {
        // Silently fail — not critical
      }
    })();
  }, [profileId, playerId]);

  if (!stats || (stats.received === 0 && stats.given === 0)) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SHOUTOUTS</Text>

      <View style={styles.countsRow}>
        <View style={styles.countItem}>
          <Text style={[styles.countValue, { color: colors.text }]}>{stats.received}</Text>
          <Text style={[styles.countLabel, { color: colors.textMuted }]}>Received</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.countItem}>
          <Text style={[styles.countValue, { color: colors.text }]}>{stats.given}</Text>
          <Text style={[styles.countLabel, { color: colors.textMuted }]}>Given</Text>
        </View>
      </View>

      {stats.categoryBreakdown.length > 0 && (
        <View style={styles.categoriesWrap}>
          {stats.categoryBreakdown.slice(0, 4).map((cat, i) => (
            <View key={i} style={styles.categoryPill}>
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                {cat.name} x{cat.count}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 12,
  },
  countItem: {
    alignItems: 'center',
  },
  countValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
