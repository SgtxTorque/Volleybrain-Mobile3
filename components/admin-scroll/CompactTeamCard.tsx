/**
 * CompactTeamCard — ~200px compact card for horizontal scroll.
 * Alternating dark navy / white. Tappable → team players screen.
 * ALL hooks above early returns.
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
  team: TeamHealth;
  isDark: boolean;
}

function CompactTeamCard({ team, isDark }: Props) {
  const router = useRouter();

  const statusColor =
    team.paymentStatus === 'overdue' ? D_COLORS.overdueRed
    : team.paymentStatus === 'warning' ? BRAND.warning
    : D_COLORS.collectedGreen;

  const textColor = isDark ? '#FFFFFF' : BRAND.textPrimary;
  const labelColor = isDark ? 'rgba(255,255,255,0.3)' : BRAND.textMuted;
  const rosterPct = team.maxPlayers > 0 ? team.rosterCount / team.maxPlayers : 0;
  const barTrackColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const barFillColor = isDark ? 'rgba(255,255,255,0.5)' : BRAND.skyBlue;

  const inner = (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.cardInner}
      onPress={() => router.push(`/(tabs)/players?teamId=${team.id}` as any)}
    >
      {/* Status dot */}
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />

      {/* Team name */}
      <Text style={[styles.teamName, { color: textColor }]} numberOfLines={1}>
        {team.name}
      </Text>

      {/* Roster fill bar */}
      <View style={styles.rosterRow}>
        <Text style={[styles.rosterLabel, { color: labelColor }]}>ROSTER</Text>
        <Text style={[styles.rosterValue, { color: textColor }]}>
          {team.rosterCount}/{team.maxPlayers || '?'}
        </Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: barTrackColor }]}>
        <View
          style={[
            styles.barFill,
            { backgroundColor: barFillColor, width: `${Math.min(rosterPct * 100, 100)}%` },
          ]}
        />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={[styles.statValue, { color: textColor }]}>
            {team.wins}-{team.losses}
          </Text>
          <Text style={[styles.statLabel, { color: labelColor }]}>RECORD</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={[styles.statValue, { color: textColor }]}>
            {team.unpaidCount}
          </Text>
          <Text style={[styles.statLabel, { color: labelColor }]}>UNPAID</Text>
        </View>
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

export default React.memo(CompactTeamCard);

const styles = StyleSheet.create({
  card: {
    width: 200,
    borderRadius: D_RADII.card,
    overflow: 'hidden',
  },
  cardLight: {
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardInner: {
    padding: 14,
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamName: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 14,
    marginBottom: 10,
    marginRight: 16,
  },
  rosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rosterLabel: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 8,
    letterSpacing: 1,
  },
  rosterValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    marginBottom: 10,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCell: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    marginBottom: 1,
  },
  statLabel: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 8,
    letterSpacing: 1,
  },
});
