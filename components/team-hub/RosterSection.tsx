/**
 * RosterSection — roster carousel preview + "View All" link.
 * Uses RosterCarousel from CC-PLAYER-EXPERIENCE-BUILD.
 * Tapping a card navigates to the full PlayerTradingCard view.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import RosterCarousel from '@/components/RosterCarousel';
import type { PlayerTradingCardPlayer } from '@/components/PlayerTradingCard';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

export type RosterSectionProps = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  seasonId: string | null;
  seasonName: string | null;
};

export default function RosterSection({
  teamId,
  teamName,
  teamColor,
  seasonId,
  seasonName,
}: RosterSectionProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerTradingCardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoster = useCallback(async () => {
    if (!teamId) { setLoading(false); return; }
    try {
      // Get player IDs from team_players
      const { data: tp } = await supabase
        .from('team_players')
        .select('player_id')
        .eq('team_id', teamId);

      const ids = (tp || []).map((r) => r.player_id);
      if (ids.length === 0) { setPlayers([]); setLoading(false); return; }

      // Batch fetch player data
      const { data: playersData } = await supabase
        .from('players')
        .select('id, first_name, last_name, jersey_number, position, photo_url')
        .in('id', ids);

      // Fetch player_stats for OVR ratings
      const { data: statsData } = await supabase
        .from('player_stats')
        .select('player_id, stat_name, stat_value')
        .in('player_id', ids);

      // Build stats map
      const statsMap = new Map<string, { label: string; value: number }[]>();
      for (const s of statsData || []) {
        if (!statsMap.has(s.player_id)) statsMap.set(s.player_id, []);
        statsMap.get(s.player_id)!.push({
          label: s.stat_name,
          value: typeof s.stat_value === 'number' ? s.stat_value : 0,
        });
      }

      const mapped: PlayerTradingCardPlayer[] = (playersData || [])
        .sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999))
        .map((p) => ({
          id: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          photoUrl: p.photo_url,
          jerseyNumber: p.jersey_number,
          position: p.position,
          teamName,
          teamColor,
          seasonName,
          stats: statsMap.get(p.id) || [],
        }));

      setPlayers(mapped);
    } catch (err) {
      if (__DEV__) console.error('[RosterSection] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId, teamName, teamColor, seasonName]);

  useEffect(() => { fetchRoster(); }, [fetchRoster]);

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="small" color={BRAND.teal} />
      </View>
    );
  }

  if (players.length === 0) return null;

  return (
    <View style={s.container}>
      {/* Section header */}
      <View style={s.headerRow}>
        <Text style={s.headerLabel}>ROSTER</Text>
        <TouchableOpacity
          onPress={() => router.push({
            pathname: '/roster' as any,
            params: { teamId, teamName },
          })}
          activeOpacity={0.7}
        >
          <Text style={s.viewAll}>View All →</Text>
        </TouchableOpacity>
      </View>

      {/* RosterCarousel */}
      <RosterCarousel
        teamId={teamId}
        teamName={teamName}
        teamColor={teamColor}
        seasonName={seasonName}
        players={players}
        onPlayerTap={(playerId) => {
          router.push({ pathname: '/player-card' as any, params: { playerId } });
        }}
        showHeader={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  loadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: BRAND.textFaint,
    letterSpacing: 1.2,
  },
  viewAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.teal,
  },
});
