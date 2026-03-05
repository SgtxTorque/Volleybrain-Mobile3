/**
 * roster screen — Full-screen roster carousel view.
 *
 * Route: /roster?teamId=xxx
 *        If no teamId, uses the user's current team.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { getSportDisplay } from '@/constants/sport-display';
import RosterCarousel from '@/components/RosterCarousel';
import type { PlayerTradingCardPlayer } from '@/components/PlayerTradingCard';
import { PLAYER_THEME } from '@/components/PlayerHomeScroll';
import { FONTS } from '@/theme/fonts';

// Shared OVR formula
function computeOVR(ss: Record<string, number> | null): number {
  if (!ss) return 0;
  const gp = ss.games_played || 0;
  if (gp === 0) return 0;
  const raw = ((ss.hitting_percentage || 0) * 100 * 0.25)
    + ((ss.serve_percentage || 0) * 100 * 0.15)
    + ((ss.total_kills || 0) / gp * 4)
    + ((ss.total_aces || 0) / gp * 6)
    + ((ss.total_digs || 0) / gp * 2.5)
    + ((ss.total_blocks || 0) / gp * 5)
    + ((ss.total_assists || 0) / gp * 3)
    + Math.min(gp * 1.5, 15);
  return Math.min(99, Math.max(40, Math.round(raw + 35)));
}

export default function RosterScreen() {
  const { teamId: paramTeamId } = useLocalSearchParams<{ teamId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { workingSeason } = useSeason();

  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerTradingCardPlayer[]>([]);

  const fetchRoster = useCallback(async () => {
    try {
      // Resolve team ID
      let resolvedTeamId = paramTeamId;
      if (!resolvedTeamId && user?.id) {
        // Try team_staff first (coach/admin)
        const { data: staff } = await supabase
          .from('team_staff')
          .select('team_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);
        if (staff?.[0]) {
          resolvedTeamId = staff[0].team_id;
        }
      }
      if (!resolvedTeamId) { setLoading(false); return; }

      // Get team info
      const { data: team } = await supabase
        .from('teams')
        .select('id, name, color, sport_name')
        .eq('id', resolvedTeamId)
        .maybeSingle();

      if (!team) { setLoading(false); return; }
      setTeamName(team.name);
      setTeamColor(team.color);

      // Get players on this team
      const { data: teamPlayers } = await supabase
        .from('team_players')
        .select('player_id, players(id, first_name, last_name, jersey_number, position, photo_url, sport_name)')
        .eq('team_id', resolvedTeamId);

      if (!teamPlayers || teamPlayers.length === 0) {
        setPlayers([]);
        setLoading(false);
        return;
      }

      const playerIds = teamPlayers.map((tp: any) => tp.players?.id).filter(Boolean);

      // Batch fetch season stats for all players
      let statsMap: Record<string, Record<string, number>> = {};
      if (workingSeason?.id && playerIds.length > 0) {
        const { data: allStats } = await supabase
          .from('player_season_stats')
          .select('*')
          .eq('season_id', workingSeason.id)
          .in('player_id', playerIds);

        for (const s of (allStats || [])) {
          statsMap[s.player_id] = s;
        }
      }

      const sportConfig = getSportDisplay(team.sport_name);

      const rosterPlayers: PlayerTradingCardPlayer[] = teamPlayers
        .map((tp: any) => {
          const p = tp.players;
          if (!p) return null;
          const ss = statsMap[p.id] || null;
          const ovr = computeOVR(ss);
          const gp = ss?.games_played || 1;

          const statBars = sportConfig.primaryStats.slice(0, 3).map(sc => ({
            label: sc.short,
            value: ss ? Math.min(100, Math.round((ss[sc.seasonColumn] || 0) / gp * 10)) : 0,
            color: sc.color,
          }));

          return {
            id: p.id,
            firstName: p.first_name || '',
            lastName: p.last_name || '',
            photoUrl: p.photo_url,
            jerseyNumber: p.jersey_number,
            position: p.position,
            sportName: p.sport_name || team.sport_name,
            teamName: team.name,
            teamColor: team.color,
            seasonName: workingSeason?.name,
            overallRating: ovr,
            stats: statBars,
          } as PlayerTradingCardPlayer;
        })
        .filter(Boolean) as PlayerTradingCardPlayer[];

      // Sort by jersey number or name
      rosterPlayers.sort((a, b) => {
        const numA = a.jerseyNumber ? Number(a.jerseyNumber) : 999;
        const numB = b.jerseyNumber ? Number(b.jerseyNumber) : 999;
        if (numA !== numB) return numA - numB;
        return a.lastName.localeCompare(b.lastName);
      });

      setPlayers(rosterPlayers);
    } catch (err) {
      if (__DEV__) console.error('[roster] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [paramTeamId, user?.id, workingSeason?.id]);

  useEffect(() => { fetchRoster(); }, [fetchRoster]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B3E" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TEAM ROSTER</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PLAYER_THEME.accent} />
        </View>
      ) : players.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>No players on this roster yet</Text>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <RosterCarousel
            teamId={paramTeamId || ''}
            teamName={teamName}
            teamColor={teamColor}
            seasonName={workingSeason?.name}
            players={players}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D1B3E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 2,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.30)',
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
  },
});
