import AppHeaderBar from '@/components/ui/AppHeaderBar';
import { getPlayerImage } from '@/lib/default-images';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RosterPlayer = {
  player_id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  jersey_number: number | null;
  position: string | null;
};

export default function TeamRosterScreen() {
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const s = createStyles(colors);

  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    (async () => {
      try {
        const { data: team } = await supabase
          .from('teams')
          .select('name')
          .eq('id', teamId)
          .maybeSingle();
        if (team) setTeamName(team.name);

        const { data: tp } = await supabase
          .from('team_players')
          .select('player_id, jersey_number, players(first_name, last_name, photo_url, position)')
          .eq('team_id', teamId);

        const mapped: RosterPlayer[] = (tp || []).map((row: any) => ({
          player_id: row.player_id,
          first_name: row.players?.first_name || '',
          last_name: row.players?.last_name || '',
          photo_url: row.players?.photo_url || null,
          jersey_number: row.jersey_number ?? row.players?.jersey_number ?? null,
          position: row.players?.position || null,
        }));

        mapped.sort((a, b) => {
          if (a.jersey_number != null && b.jersey_number != null) return a.jersey_number - b.jersey_number;
          if (a.jersey_number != null) return -1;
          if (b.jersey_number != null) return 1;
          return a.last_name.localeCompare(b.last_name);
        });

        setPlayers(mapped);
      } catch (err) {
        if (__DEV__) console.error('[TeamRoster] fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [teamId]);

  const renderPlayer = ({ item }: { item: RosterPlayer }) => {
    const initials = (item.first_name[0] || '') + (item.last_name[0] || '');
    return (
      <TouchableOpacity
        style={s.playerRow}
        onPress={() => router.push((`/child-detail?playerId=${item.player_id}`) as any)}
        activeOpacity={0.7}
      >
        {item.photo_url ? (
          <Image source={getPlayerImage(item.photo_url)} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarPlaceholder]}>
            <Text style={s.avatarInitials}>{initials.toUpperCase()}</Text>
          </View>
        )}
        <View style={s.playerInfo}>
          <Text style={s.playerName}>{item.first_name} {item.last_name}</Text>
          {item.position && (
            <View style={s.positionPill}>
              <Text style={s.positionText}>{item.position}</Text>
            </View>
          )}
        </View>
        {item.jersey_number != null && (
          <View style={s.jerseyBadge}>
            <Text style={s.jerseyText}>#{item.jersey_number}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <AppHeaderBar title="ROSTER" showAvatar={false} showNotificationBell={false} />
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {teamName || 'Roster'}
        </Text>
        <View style={s.backBtn} />
      </View>

      <Text style={s.countLabel}>{players.length} player{players.length !== 1 ? 's' : ''}</Text>

      <FlatList
        data={players}
        keyExtractor={(item) => item.player_id}
        renderItem={renderPlayer}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={
          <View style={s.centered}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[s.emptyText, { color: colors.textMuted }]}>No players on this roster</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: {
      ...displayTextStyle,
      fontSize: 18,
      flex: 1,
      textAlign: 'center',
    },
    countLabel: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
      paddingHorizontal: spacing.screenPadding,
      marginBottom: 8,
    },
    listContent: {
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: 100,
    },
    playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.glassCard,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 12,
      marginBottom: 8,
      gap: 12,
      ...shadows.card,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    avatarPlaceholder: {
      backgroundColor: colors.bgSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitials: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMuted,
    },
    playerInfo: { flex: 1 },
    playerName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    positionPill: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(20,184,166,0.15)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      marginTop: 4,
    },
    positionText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#14B8A6',
    },
    jerseyBadge: {
      backgroundColor: colors.bgSecondary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    jerseyText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    emptyText: { fontSize: 14 },
  });
