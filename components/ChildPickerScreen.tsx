import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================
// DARK GAMING PALETTE
// ============================================

const DARK = {
  bg: '#0A0F1A',
  card: '#111827',
  border: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  accent: '#F97316',
  gold: '#FFD700',
};

// ============================================
// TYPES
// ============================================

export type ChildPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: number | null;
  position: string | null;
  photo_url: string | null;
  team_name: string | null;
  team_color: string | null;
};

type Props = {
  onSelectChild: (child: ChildPlayer) => void;
};

// ============================================
// COMPONENT
// ============================================

export default function ChildPickerScreen({ onSelectChild }: Props) {
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState<ChildPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id && workingSeason?.id) loadChildren();
  }, [user?.id, workingSeason?.id]);

  const loadChildren = async () => {
    if (!user?.id || !workingSeason?.id) return;
    try {
      // Collect player IDs from both sources
      const playerIds = new Set<string>();

      // 1. parent_account_id
      const { data: parentPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id)
        .eq('season_id', workingSeason.id);
      parentPlayers?.forEach(p => playerIds.add(p.id));

      // 2. player_guardians
      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);
      if (guardianLinks) {
        const gIds = guardianLinks.map(g => g.player_id);
        if (gIds.length > 0) {
          const { data: gPlayers } = await supabase
            .from('players')
            .select('id')
            .in('id', gIds)
            .eq('season_id', workingSeason.id);
          gPlayers?.forEach(p => playerIds.add(p.id));
        }
      }

      if (playerIds.size === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      // Fetch full player info with team
      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, jersey_number, position, photo_url')
        .in('id', Array.from(playerIds));

      if (!players || players.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      // Get team info via team_players
      const { data: teamLinks } = await supabase
        .from('team_players')
        .select('player_id, teams(name, color)')
        .in('player_id', players.map(p => p.id));

      const teamMap: Record<string, { name: string; color: string | null }> = {};
      teamLinks?.forEach((tl: any) => {
        if (tl.teams) teamMap[tl.player_id] = tl.teams;
      });

      const result: ChildPlayer[] = players.map(p => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        jersey_number: p.jersey_number,
        position: p.position,
        photo_url: p.photo_url,
        team_name: teamMap[p.id]?.name || null,
        team_color: teamMap[p.id]?.color || null,
      }));

      setChildren(result);
    } catch (err) {
      if (__DEV__) console.error('ChildPickerScreen loadChildren error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={DARK.accent} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 20 }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Who's Playing?</Text>
        <Text style={s.subtitle}>Select a player to view their dashboard</Text>
      </View>

      {/* Child Cards */}
      <View style={s.cardsContainer}>
        {children.map(child => (
          <TouchableOpacity
            key={child.id}
            style={s.childCard}
            activeOpacity={0.8}
            onPress={() => onSelectChild(child)}
          >
            {/* Photo or Initials */}
            <View style={[s.photoContainer, { borderColor: child.team_color || DARK.accent }]}>
              {child.photo_url ? (
                <Image source={{ uri: child.photo_url }} style={s.photo} />
              ) : (
                <View style={[s.initialsCircle, { backgroundColor: child.team_color || DARK.accent }]}>
                  <Text style={s.initials}>
                    {child.first_name[0]}{child.last_name[0]}
                  </Text>
                </View>
              )}
              {child.jersey_number != null && (
                <View style={[s.jerseyBadge, { backgroundColor: child.team_color || DARK.accent }]}>
                  <Text style={s.jerseyText}>#{child.jersey_number}</Text>
                </View>
              )}
            </View>

            {/* Info */}
            <View style={s.childInfo}>
              <Text style={s.childName}>{child.first_name} {child.last_name}</Text>
              <View style={s.detailRow}>
                {child.position && (
                  <View style={s.tag}>
                    <Text style={s.tagText}>{child.position}</Text>
                  </View>
                )}
                {child.team_name && (
                  <View style={[s.tag, { backgroundColor: (child.team_color || DARK.accent) + '25' }]}>
                    <Text style={[s.tagText, { color: child.team_color || DARK.accent }]}>{child.team_name}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={22} color={DARK.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK.bg,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: DARK.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: DARK.textMuted,
  },
  cardsContainer: {
    gap: 14,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: DARK.border,
    gap: 14,
  },
  photoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    overflow: 'visible',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  initialsCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  jerseyBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  jerseyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  childInfo: {
    flex: 1,
    gap: 6,
  },
  childName: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK.text,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: DARK.textSecondary,
  },
});
