import TeamWall from '@/components/TeamWall';
import { ACHIEVEMENT_IMAGES, FAMILY_IMAGES } from '@/constants/mascot-images';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

// Simple Achievements tab content
function AchievementsTab({ teamId }: { teamId: string }) {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('player_badges')
        .select('id, badge_name, badge_description, awarded_at, players (first_name, last_name)')
        .eq('team_id', teamId)
        .order('awarded_at', { ascending: false })
        .limit(50);
      setBadges(data || []);
      setLoading(false);
    })();
  }, [teamId]);

  if (loading) return <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={BRAND.teal} /></View>;
  if (badges.length === 0) return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <Image source={FAMILY_IMAGES.BABY_SISTER} style={{ width: 160, height: 160, marginBottom: 12 }} resizeMode="contain" accessibilityLabel="No achievements yet" />
      <Text style={{ fontSize: 14, color: BRAND.textMuted }}>Your trophy case is waiting! Complete quests to earn your first badge.</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      {badges.map(b => (
        <View key={b.id} style={{ backgroundColor: BRAND.white, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="trophy" size={20} color="#E8913A" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: FONTS.bodySemiBold, color: BRAND.textPrimary }}>{b.badge_name}</Text>
            {b.players && <Text style={{ fontSize: 12, color: BRAND.textMuted }}>{(b.players as any).first_name} {(b.players as any).last_name}</Text>}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// Simple Stats tab content
function StatsTab({ teamId }: { teamId: string }) {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Get team players and their stats
      const { data: teamPlayers } = await supabase
        .from('team_players')
        .select('player_id, players (first_name, last_name)')
        .eq('team_id', teamId);

      if (!teamPlayers || teamPlayers.length === 0) { setLoading(false); return; }

      const playerIds = teamPlayers.map(tp => tp.player_id);
      const { data: playerStats } = await supabase
        .from('player_stats')
        .select('*')
        .in('player_id', playerIds);

      // Merge
      const merged = teamPlayers.map(tp => {
        const ps = (playerStats || []).find(s => s.player_id === tp.player_id);
        const p = tp.players as any;
        return { id: tp.player_id, name: p ? `${p.first_name} ${p.last_name}` : 'Unknown', stats: ps };
      });
      setStats(merged);
      setLoading(false);
    })();
  }, [teamId]);

  if (loading) return <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={BRAND.teal} /></View>;
  if (stats.length === 0) return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <Image source={ACHIEVEMENT_IMAGES.IMPROVE_STATS} style={{ width: 160, height: 160, marginBottom: 12 }} resizeMode="contain" accessibilityLabel="No stats recorded" />
      <Text style={{ fontSize: 14, color: BRAND.textMuted }}>Play your first game to start tracking your stats!</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      {stats.map(s => (
        <View key={s.id} style={{ backgroundColor: BRAND.white, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="person" size={18} color={BRAND.teal} />
          <Text style={{ flex: 1, fontSize: 14, fontFamily: FONTS.bodySemiBold, color: BRAND.textPrimary }}>{s.name}</Text>
          {s.stats && <Text style={{ fontSize: 12, color: BRAND.textMuted }}>GP: {s.stats.games_played || 0}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

export default function TeamWallScreen() {
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();
  const tid = teamId || '';

  const additionalTabs = tid ? [
    {
      key: 'achievements',
      label: 'Achievements',
      icon: 'trophy' as const,
      render: () => <AchievementsTab teamId={tid} />,
    },
    {
      key: 'stats',
      label: 'Stats',
      icon: 'stats-chart' as const,
      render: () => <StatsTab teamId={tid} />,
    },
  ] : [];

  return <TeamWall teamId={teamId || null} additionalTabs={additionalTabs} />;
}
