/**
 * SquadFacesRow — overlapping circular avatars showing team players.
 * Max 8 visible + "+N" overflow circle. Tapping navigates to roster.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { TopPerformer } from '@/hooks/useCoachHomeData';

const AVATAR_COLORS = [
  '#E76F51', '#4BB9EC', '#22C55E', '#8B5CF6', '#F59E0B', '#2A9D8F',
];

interface Props {
  teamId: string | null;
  teamName: string;
  playerCount: number;
  /** We use topPerformers names to show real initials; fallback to generic circles */
  topPerformers: TopPerformer[];
}

function SquadFacesRow({ teamId, teamName, playerCount, topPerformers }: Props) {
  const router = useRouter();

  if (playerCount === 0) return null;

  // Build name list from top performers (limited data source without new query)
  const names = topPerformers.map(p => p.player_name).filter(Boolean);
  // Pad up to 8 with generic initials
  const maxVisible = Math.min(8, playerCount);
  const faces: { initial: string; color: string }[] = [];
  for (let i = 0; i < maxVisible; i++) {
    const name = names[i] || '';
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    faces.push({ initial, color: AVATAR_COLORS[i % AVATAR_COLORS.length] });
  }
  const overflow = playerCount - maxVisible;

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
            <Text style={styles.avatarText}>{face.initial}</Text>
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
