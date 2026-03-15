/**
 * PlayerLeaderboardPreview — Team rankings preview showing top 3 or
 * the player's rank with neighbors. Tappable to full leaderboard.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_COLORS, D_RADII } from '@/theme/d-system';
import type { BestRank } from '@/hooks/usePlayerHomeData';

type Props = {
  bestRank: BestRank | null;
  xp: number;
  level: number;
  playerName: string;
};

function getRankColor(rank: number): string {
  if (rank === 1) return D_COLORS.leaderboardGold;
  if (rank === 2) return D_COLORS.leaderboardSilver;
  if (rank === 3) return D_COLORS.leaderboardBronze;
  return PLAYER_THEME.textMuted;
}

function getRankEmoji(rank: number): string {
  if (rank === 1) return '\u{1F947}';
  if (rank === 2) return '\u{1F948}';
  if (rank === 3) return '\u{1F949}';
  return `#${rank}`;
}

/** Animated row with stagger slide-in */
function LeaderboardRow({
  rank,
  name,
  value,
  label,
  isYou,
  index,
}: {
  rank: number;
  name: string;
  value: number;
  label: string;
  isYou: boolean;
  index: number;
}) {
  const translateX = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(index * 50, withTiming(0, { duration: 300 }));
    opacity.value = withDelay(index * 50, withTiming(1, { duration: 300 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const rankColor = getRankColor(rank);

  return (
    <Animated.View style={[styles.row, isYou && styles.rowHighlight, animStyle]}>
      <Text style={[styles.rankText, { color: rankColor }]}>
        {getRankEmoji(rank)}
      </Text>
      <View style={[styles.rowAvatar, { borderColor: isYou ? PLAYER_THEME.accent : PLAYER_THEME.border }]}>
        <Text style={styles.rowAvatarText}>{name[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={styles.rowNameWrap}>
        <Text style={[styles.rowName, isYou && styles.rowNameYou]} numberOfLines={1}>
          {name}
        </Text>
        {isYou && <Text style={styles.youLabel}>You</Text>}
      </View>
      <Text style={styles.rowValue}>{value} {label}</Text>
    </Animated.View>
  );
}

export default function PlayerLeaderboardPreview({ bestRank, xp, level, playerName }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push('/standings' as any)}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{'\u{1F3C6}'} TEAM RANKINGS</Text>
        <Text style={styles.headerCta}>See Full {'\u2192'}</Text>
      </View>

      {bestRank ? (
        <>
          <LeaderboardRow
            rank={bestRank.rank}
            name={playerName}
            value={bestRank.value}
            label={bestRank.stat}
            isYou={true}
            index={0}
          />
          <Text style={styles.rankNote}>
            #{bestRank.rank} in {bestRank.stat} this season
          </Text>
        </>
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            Play games to get ranked!
          </Text>
          <Text style={styles.emptyCta}>
            View leaderboard {'\u2192'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: D_RADII.card,
    backgroundColor: PLAYER_THEME.cardBg,
    borderWidth: 1,
    borderColor: PLAYER_THEME.border,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: PLAYER_THEME.accent,
    letterSpacing: 1.2,
  },
  headerCta: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: PLAYER_THEME.textMuted,
  },
  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 10,
  },
  rowHighlight: {
    backgroundColor: 'rgba(75,185,236,0.06)',
  },
  rankText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    width: 30,
    textAlign: 'center',
  },
  rowAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PLAYER_THEME.cardBg,
  },
  rowAvatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: PLAYER_THEME.textPrimary,
  },
  rowNameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: PLAYER_THEME.textPrimary,
  },
  rowNameYou: {
    color: PLAYER_THEME.accent,
  },
  youLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: PLAYER_THEME.accent,
    backgroundColor: 'rgba(75,185,236,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  rowValue: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 12,
    color: PLAYER_THEME.xpGold,
  },
  rankNote: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: PLAYER_THEME.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PLAYER_THEME.textSecondary,
    marginBottom: 4,
  },
  emptyCta: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PLAYER_THEME.accent,
  },
});
