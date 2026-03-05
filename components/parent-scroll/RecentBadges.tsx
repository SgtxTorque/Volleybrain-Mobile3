/**
 * RecentBadges — horizontal scrollable row of badge pills.
 * No card container — pills sit directly on the page background.
 * Queries player_achievements + achievements table.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type BadgeItem = {
  id: string;
  name: string;
  icon: string;
};

type Props = {
  playerIds: string[];
  childPlayerId?: string;
};

export default function RecentBadges({ playerIds, childPlayerId }: Props) {
  const router = useRouter();
  const [badges, setBadges] = useState<BadgeItem[]>([]);

  useEffect(() => {
    if (playerIds.length === 0) return;

    (async () => {
      try {
        const { data } = await supabase
          .from('player_achievements')
          .select('achievement_id, achievements(id, name, icon)')
          .in('player_id', playerIds)
          .order('earned_at', { ascending: false })
          .limit(10);

        if (data) {
          const items: BadgeItem[] = data
            .map((d: any) => {
              const ach = d.achievements;
              if (!ach) return null;
              return { id: ach.id, name: ach.name, icon: ach.icon || '\u{1F3C5}' };
            })
            .filter(Boolean) as BadgeItem[];

          // Deduplicate by id
          const seen = new Set<string>();
          setBadges(items.filter((b) => {
            if (seen.has(b.id)) return false;
            seen.add(b.id);
            return true;
          }));
        }
      } catch (err) {
        if (__DEV__) console.error('[RecentBadges] Error:', err);
      }
    })();
  }, [playerIds.join(',')]);

  if (badges.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>RECENT BADGES</Text>
        <TouchableOpacity onPress={() => router.push(childPlayerId ? `/achievements?playerId=${childPlayerId}` as any : '/achievements' as any)}>
          <Text style={styles.seeAll}>See All {'\u{2192}'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {badges.map((badge) => (
          <TouchableOpacity
            key={badge.id}
            style={styles.pill}
            activeOpacity={0.7}
            onPress={() => router.push(childPlayerId ? `/achievements?playerId=${childPlayerId}` as any : '/achievements' as any)}
          >
            <Text style={styles.pillIcon}>{badge.icon}</Text>
            <Text style={styles.pillText} numberOfLines={1}>
              {badge.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
  },
  seeAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  scrollContent: {
    paddingLeft: 24,
    paddingRight: 32,
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  pillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textPrimary,
    maxWidth: 120,
  },
});
