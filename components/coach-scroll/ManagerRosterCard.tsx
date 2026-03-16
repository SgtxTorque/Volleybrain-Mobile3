/**
 * ManagerRosterCard — compact roster glance for Team Manager.
 * Shows player count and taps to roster management.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_RADII } from '@/theme/d-system';

interface Props {
  rosterCount: number;
  pendingApproval: number;
  teamId: string;
}

function ManagerRosterCard({ rosterCount, pendingApproval, teamId }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/players' as any)}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="people" size={20} color={BRAND.skyBlue} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>Roster</Text>
          <Text style={styles.subtitle}>
            {rosterCount} player{rosterCount === 1 ? '' : 's'}
          </Text>
        </View>
        {pendingApproval > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{pendingApproval} pending</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={BRAND.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(ManagerRosterCard);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: D_RADII.card,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(11,22,40,0.06)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(75,185,236,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 1,
  },
  pendingBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.warning,
  },
});
