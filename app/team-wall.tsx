import TeamWall from '@/components/TeamWall';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

// Simple Achievements tab content
function AchievementsTab({ teamId }: { teamId: string }) {
  const { colors } = useTheme();
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

  if (loading) return <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  if (badges.length === 0) return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
      <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}>No achievements yet</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      {badges.map(b => (
        <View key={b.id} style={{ backgroundColor: colors.glassCard, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="trophy" size={20} color="#E8913A" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{b.badge_name}</Text>
            {b.players && <Text style={{ fontSize: 12, color: colors.textMuted }}>{(b.players as any).first_name} {(b.players as any).last_name}</Text>}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// Simple Stats tab content
function StatsTab({ teamId }: { teamId: string }) {
  const { colors } = useTheme();
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

  if (loading) return <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  if (stats.length === 0) return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <Ionicons name="stats-chart-outline" size={48} color={colors.textMuted} />
      <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}>No stats recorded yet</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      {stats.map(s => (
        <View key={s.id} style={{ backgroundColor: colors.glassCard, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="person" size={18} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>{s.name}</Text>
          {s.stats && <Text style={{ fontSize: 12, color: colors.textMuted }}>GP: {s.stats.games_played || 0}</Text>}
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
