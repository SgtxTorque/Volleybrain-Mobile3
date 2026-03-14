/**
 * SquadFacesRow — overlapping circular avatars showing team players.
 * Max 8 visible + "+N" overflow circle. Tapping navigates to roster.
 * Shows player photos when available, initials as fallback.
 */
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { TopPerformer } from '@/hooks/useCoachHomeData';

const AVATAR_COLORS = [
  '#E76F51', '#4BB9EC', '#22C55E', '#8B5CF6', '#F59E0B', '#2A9D8F',
];

type PlayerFace = {
  initial: string;
  color: string;
  photoUrl: string | null;
};

interface Props {
  teamId: string | null;
  teamName: string;
  playerCount: number;
  topPerformers: TopPerformer[];
}

function SquadFacesRow({ teamId, teamName, playerCount, topPerformers }: Props) {
  const router = useRouter();
  const [rosterFaces, setRosterFaces] = useState<PlayerFace[] | null>(null);

  // Fetch roster photos for this team
  useEffect(() => {
    if (!teamId) return;
    let mounted = true;

    (async () => {
      try {
        const { data: roster } = await supabase
          .from('team_players')
          .select('player_id, players!inner(first_name, last_name, photo_url)')
          .eq('team_id', teamId)
          .limit(8);

        if (!mounted || !roster) return;

        const faces: PlayerFace[] = roster.map((r: any, i: number) => {
          const p = r.players;
          const firstName = p?.first_name || '';
          const lastName = p?.last_name || '';
          const initial = firstName
            ? firstName.charAt(0).toUpperCase()
            : lastName
              ? lastName.charAt(0).toUpperCase()
              : '\u{1F464}';
          return {
            initial,
            color: AVATAR_COLORS[i % AVATAR_COLORS.length],
            photoUrl: p?.photo_url || null,
          };
        });
        setRosterFaces(faces);
      } catch {
        // Fall through to topPerformers fallback
      }
    })();

    return () => { mounted = false; };
  }, [teamId]);

  if (playerCount === 0) return null;

  // Use roster data if available, otherwise fall back to topPerformers
  let faces: PlayerFace[];
  if (rosterFaces && rosterFaces.length > 0) {
    faces = rosterFaces;
  } else {
    const maxVisible = Math.min(8, playerCount);
    faces = [];
    for (let i = 0; i < maxVisible; i++) {
      const performer = topPerformers[i];
      const name = performer?.player_name || '';
      const initial = name ? name.charAt(0).toUpperCase() : '\u{1F464}';
      faces.push({ initial, color: AVATAR_COLORS[i % AVATAR_COLORS.length], photoUrl: null });
    }
  }
  const overflow = playerCount - faces.length;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>YOUR SQUAD</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push(`/roster?teamId=${teamId}` as any)}
        >
          <Text style={styles.headerLink}>View All {'\u2192'}</Text>
        </TouchableOpacity>
      </View>

      {/* Face row */}
      <TouchableOpacity
        style={styles.facesRow}
        activeOpacity={0.85}
        onPress={() => router.push(`/roster?teamId=${teamId}` as any)}
      >
        {faces.map((face, i) => (
          <View
            key={i}
            style={[
              styles.avatar,
              { backgroundColor: face.color, marginLeft: i === 0 ? 0 : -6 },
            ]}
          >
            {face.photoUrl ? (
              <Image source={{ uri: face.photoUrl }} style={styles.avatarPhoto} />
            ) : (
              <Text style={styles.avatarText}>{face.initial}</Text>
            )}
          </View>
        ))}
        {overflow > 0 && (
          <View style={[styles.avatar, styles.overflowAvatar, { marginLeft: -6 }]}>
            <Text style={styles.overflowText}>+{overflow}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Player count */}
      <Text style={styles.countText}>
        {playerCount} player{playerCount !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

export default React.memo(SquadFacesRow);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 13,
    color: BRAND.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerLink: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  facesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FAFBFE',
  },
  avatarPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: BRAND.white,
  },
  overflowAvatar: {
    backgroundColor: BRAND.warmGray,
  },
  overflowText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textMuted,
  },
  countText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    marginTop: 8,
  },
});
