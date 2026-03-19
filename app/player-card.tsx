/**
 * player-card screen — Full-screen FIFA-style trading card view.
 *
 * Route: /player-card?playerId=xxx
 *        /player-card?childId=xxx (parent viewing child)
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
import Animated, { FadeIn } from 'react-native-reanimated';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { getLevelFromXP } from '@/lib/engagement-constants';
import { getSportDisplay } from '@/constants/sport-display';
import PlayerTradingCard, { PlayerTradingCardPlayer } from '@/components/PlayerTradingCard';
import { PLAYER_THEME } from '@/components/PlayerHomeScroll';
import { useResponsive } from '@/lib/responsive';
import { FONTS } from '@/theme/fonts';

// TODO: Move to shared utility
function computeXP(ss: Record<string, number> | null, badgeCount: number): number {
  const gp = ss?.games_played || 0;
  const k = ss?.total_kills || 0;
  const a = ss?.total_aces || 0;
  const d = ss?.total_digs || 0;
  const bl = ss?.total_blocks || 0;
  const as = ss?.total_assists || 0;
  return (gp * 100) + (k * 10) + (a * 25) + (d * 5) + (bl * 15) + (as * 10) + (badgeCount * 50);
}

// TODO: Move to shared utility
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

export default function PlayerCardScreen() {
  const { playerId, childId } = useLocalSearchParams<{ playerId?: string; childId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { workingSeason } = useSeason();

  const { isTabletAny, contentMaxWidth } = useResponsive();
  const resolvedId = playerId || childId || null;

  // Auto-resolve when no playerId param (e.g. "My Player Card" from gesture drawer)
  const [autoResolvedId, setAutoResolvedId] = useState<string | null>(null);

  useEffect(() => {
    if (resolvedId || !user?.id) return;
    (async () => {
      // Try team_players first (player's own record)
      const { data: tpRow } = await supabase
        .from('team_players')
        .select('player_id')
        .eq('player_id', user.id)
        .limit(1)
        .maybeSingle();
      if (tpRow) { setAutoResolvedId(tpRow.player_id); return; }

      // Try players table by parent_account_id
      const { data: playerRow } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id)
        .limit(1)
        .maybeSingle();
      if (playerRow) { setAutoResolvedId(playerRow.id); return; }

      // Try player_guardians
      const { data: guardianRow } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id)
        .limit(1)
        .maybeSingle();
      if (guardianRow) { setAutoResolvedId(guardianRow.player_id); return; }

      setAutoResolvedId(null);
    })();
  }, [resolvedId, user?.id]);

  const effectivePlayerId = resolvedId || autoResolvedId;

  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<PlayerTradingCardPlayer | null>(null);

  const fetchPlayer = useCallback(async () => {
    if (!effectivePlayerId) { setLoading(false); return; }

    try {
      // Player basic info
      const { data: pData } = await supabase
        .from('players')
        .select('id, first_name, last_name, jersey_number, position, photo_url')
        .eq('id', effectivePlayerId)
        .maybeSingle();

      if (!pData) { setLoading(false); return; }

      // Team info
      const { data: teamData } = await supabase
        .from('team_players')
        .select('team_id, teams(id, name, color)')
        .eq('player_id', effectivePlayerId)
        .limit(1);

      const team = (teamData?.[0] as any)?.teams;

      // Season stats
      let seasonStats: Record<string, number> | null = null;
      if (workingSeason?.id) {
        const { data: stats } = await supabase
          .from('player_season_stats')
          .select('*')
          .eq('player_id', effectivePlayerId)
          .eq('season_id', workingSeason.id)
          .maybeSingle();
        seasonStats = stats;
      }

      // Badges count — filter to only valid active achievements
      let badgeCount = 0;
      try {
        const { data: badgeData } = await supabase
          .from('player_achievements')
          .select('id, achievement:achievement_id(id)')
          .eq('player_id', effectivePlayerId);
        badgeCount = (badgeData || []).filter((b: any) => b.achievement && b.achievement.id).length;
      } catch { /* table may not exist */ }

      // Build stat bars from sport config
      const sportConfig = getSportDisplay(null);
      const statBars = sportConfig.primaryStats.map(sc => ({
        label: sc.label,
        value: seasonStats ? Math.min(100, Math.round((seasonStats[sc.seasonColumn] || 0) / Math.max(1, seasonStats.games_played || 1) * 10)) : 0,
        color: sc.color,
      }));

      const xp = computeXP(seasonStats, badgeCount);
      // Use the real exponential XP_LEVELS thresholds instead of flat modulo
      const levelInfo = getLevelFromXP(xp);
      const level = levelInfo.level;
      const xpToNextLevel = levelInfo.nextLevelXp - xp;
      const ovr = computeOVR(seasonStats);

      setPlayer({
        id: pData.id,
        firstName: pData.first_name || '',
        lastName: pData.last_name || '',
        photoUrl: pData.photo_url,
        jerseyNumber: pData.jersey_number,
        position: pData.position,
        sportName: undefined,
        teamName: team?.name || '',
        teamColor: team?.color,
        seasonName: workingSeason?.name || undefined,
        level,
        xp,
        xpToNextLevel,
        overallRating: ovr,
        stats: statBars,
      });
    } catch (err) {
      if (__DEV__) console.error('[player-card] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [effectivePlayerId, workingSeason?.id]);

  useEffect(() => { fetchPlayer(); }, [fetchPlayer]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B3E" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MY PLAYER CARD</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PLAYER_THEME.accent} />
          <Text style={styles.loadingText}>Loading card...</Text>
        </View>
      ) : !player ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Player not found</Text>
        </View>
      ) : (
        <Animated.ScrollView
          entering={FadeIn.duration(400)}
          contentContainerStyle={[styles.scroll, isTabletAny && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
          showsVerticalScrollIndicator={false}
        >
          <PlayerTradingCard
            player={player}
            variant="full"
            onShare={() => {/* TODO: screenshot share */}}
            onViewStats={() => router.push(`/my-stats?playerId=${player.id}` as any)}
          />
          <View style={{ height: insets.bottom + 40 }} />
        </Animated.ScrollView>
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
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.30)',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scroll: {
    paddingTop: 8,
    alignItems: 'center',
  },
});
