/**
 * AdminTeamHealthCards — Vertical stack of editorial team health cards.
 * Alternating dark navy and white. Tappable → team players screen.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_COLORS, D_RADII } from '@/theme/d-system';
import type { TeamHealth } from '@/hooks/useAdminHomeData';

interface Props {
  teams: TeamHealth[];
}

function TeamCard({ team, isDark }: { team: TeamHealth; isDark: boolean }) {
  const router = useRouter();

  const statusColor =
    team.paymentStatus === 'overdue' ? D_COLORS.overdueRed
    : team.paymentStatus === 'warning' ? BRAND.warning
    : D_COLORS.collectedGreen;

  const stats = [
    { value: `${team.rosterCount}/${team.maxPlayers || '?'}`, label: 'ROSTER' },
    { value: `${team.wins}-${team.losses}`, label: 'RECORD' },
    { value: String(team.unpaidCount), label: 'UNPAID' },
  ];

  const textColor = isDark ? '#FFFFFF' : BRAND.textPrimary;
  const labelColor = isDark ? 'rgba(255,255,255,0.3)' : BRAND.textMuted;
  const statValueColor = isDark ? '#FFFFFF' : BRAND.textPrimary;

  const inner = (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.cardInner}
      onPress={() => router.push(`/(tabs)/players?teamId=${team.id}` as any)}
    >
      {/* Status dot */}
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />

      {/* Team name */}
      <Text style={[styles.teamName, { color: textColor }]}>{team.name}</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCell}>
            <Text style={[styles.statValue, { color: statValueColor }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: labelColor }]}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  if (isDark) {
    return (
      <LinearGradient
        colors={[D_COLORS.missionHeroBgStart, D_COLORS.missionHeroBgEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {inner}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.card, styles.cardLight]}>
      {inner}
    </View>
  );
}

function AdminTeamHealthCards({ teams }: Props) {
  if (teams.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      {/* Section header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>YOUR TEAMS</Text>
        <Text style={styles.headerCount}>{teams.length}</Text>
      </View>

      {/* Team cards */}
      <View style={styles.cardsContainer}>
        {teams.map((team, index) => (
          <TeamCard key={team.id} team={team} isDark={index % 2 === 0} />
        ))}
      </View>
    </View>
  );
}

export default React.memo(AdminTeamHealthCards);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 13,
    color: BRAND.textPrimary,
    letterSpacing: 0.5,
  },
  headerCount: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.textMuted,
  },
  cardsContainer: {
    gap: 10,
  },
  card: {
    borderRadius: D_RADII.card,
    overflow: 'hidden',
  },
  cardLight: {
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardInner: {
    padding: 18,
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  teamName: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statCell: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
