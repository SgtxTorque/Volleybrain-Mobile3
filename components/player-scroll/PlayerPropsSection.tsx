/**
 * PlayerPropsSection — "PROPS FROM THE TEAM" — recent shoutouts
 * received by this player, styled for the D+ player scroll.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';
import type { RecentShoutout } from '@/hooks/usePlayerHomeData';

type Props = {
  shoutouts: RecentShoutout[];
  onGiveShoutout: () => void;
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function PlayerPropsSection({ shoutouts, onGiveShoutout }: Props) {
  if (shoutouts.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.headerTitle}>PROPS FROM THE TEAM</Text>
        <TouchableOpacity style={styles.emptyCard} activeOpacity={0.7} onPress={onGiveShoutout}>
          <Text style={styles.emptyText}>
            No props yet. Be the first to give some! {'\u2192'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>PROPS FROM THE TEAM</Text>
      {shoutouts.slice(0, 3).map((shoutout) => (
        <View key={shoutout.id} style={styles.shoutoutRow}>
          <View style={styles.shoutoutAvatar}>
            <Text style={styles.shoutoutAvatarText}>
              {shoutout.giverName[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.shoutoutContent}>
            <Text style={styles.shoutoutText} numberOfLines={1}>
              {shoutout.giverName} gave you {shoutout.categoryEmoji} {shoutout.categoryName}
            </Text>
            {shoutout.message && (
              <Text style={styles.shoutoutMessage} numberOfLines={1}>
                "{shoutout.message}"
              </Text>
            )}
          </View>
          <Text style={styles.shoutoutTime}>{timeAgo(shoutout.created_at)}</Text>
        </View>
      ))}
      {shoutouts.length > 3 && (
        <TouchableOpacity activeOpacity={0.7} onPress={onGiveShoutout}>
          <Text style={styles.seeAll}>See All {'\u2192'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: PLAYER_THEME.accent,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  // Shoutout rows
  shoutoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: PLAYER_THEME.cardBg,
    borderRadius: D_RADII.cardSmall,
    borderWidth: 1,
    borderColor: PLAYER_THEME.border,
    marginBottom: 6,
  },
  shoutoutAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(75,185,236,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shoutoutAvatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: PLAYER_THEME.accent,
  },
  shoutoutContent: {
    flex: 1,
  },
  shoutoutText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PLAYER_THEME.textPrimary,
  },
  shoutoutMessage: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: PLAYER_THEME.textMuted,
    fontStyle: 'italic',
    marginTop: 1,
  },
  shoutoutTime: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
  },
  seeAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PLAYER_THEME.accent,
    textAlign: 'center',
    paddingVertical: 6,
  },
  // Empty state
  emptyCard: {
    backgroundColor: PLAYER_THEME.cardBg,
    borderRadius: D_RADII.cardSmall,
    borderWidth: 1,
    borderColor: PLAYER_THEME.border,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PLAYER_THEME.accent,
  },
});
