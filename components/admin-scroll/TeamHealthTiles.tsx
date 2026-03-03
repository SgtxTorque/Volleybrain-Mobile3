/**
 * TeamHealthTiles — Horizontal scroll of compact team health tiles.
 * Phase 3: Color-coded by health, shows roster count, W-L record, payment status.
 */
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { TeamHealth } from '@/hooks/useAdminHomeData';

type Props = {
  teams: TeamHealth[];
};

function getTileColors(status: TeamHealth['paymentStatus']) {
  switch (status) {
    case 'good':
      return { bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.30)' };
    case 'warning':
      return { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.30)' };
    case 'overdue':
      return { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.30)' };
  }
}

function TeamTile({ team }: { team: TeamHealth }) {
  const tileColors = getTileColors(team.paymentStatus);
  const hasRecord = team.wins > 0 || team.losses > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.tile, { backgroundColor: tileColors.bg, borderColor: tileColors.border }]}
    >
      <View style={styles.tileHeader}>
        <View style={[styles.teamDot, { backgroundColor: team.color || BRAND.skyBlue }]} />
        <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
      </View>

      <View style={styles.midRow}>
        <Text style={styles.roster}>
          {team.rosterCount}/{team.maxPlayers || '?'}
        </Text>
        {hasRecord && (
          <Text style={styles.record}>{team.wins}-{team.losses}</Text>
        )}
      </View>

      {team.paymentStatus === 'good' ? (
        <Text style={styles.paidText}>{'\u2713'} Paid</Text>
      ) : (
        <Text style={styles.unpaidText}>{team.unpaidCount} unpaid</Text>
      )}
    </TouchableOpacity>
  );
}

export default function TeamHealthTiles({ teams }: Props) {
  return (
    <FlatList
      data={teams}
      keyExtractor={(t) => t.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <TeamTile team={item} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    gap: 10,
  },
  tile: {
    width: 110,
    height: 94,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  teamName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textPrimary,
    flex: 1,
  },
  midRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roster: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  record: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: BRAND.textFaint,
  },
  paidText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: BRAND.success,
  },
  unpaidText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: BRAND.warning,
  },
});
