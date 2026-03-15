/**
 * CompetitiveNudge — Dynamic competitive message bar below the hero.
 * Drives action by showing how close the player is to the next milestone.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';
import type { BestRank } from '@/hooks/usePlayerHomeData';

type Props = {
  bestRank: BestRank | null;
  personalBest: string | null;
  xpToNext: number;
  level: number;
  challengesAvailable: boolean;
};

function buildNudgeMessage(
  bestRank: BestRank | null,
  personalBest: string | null,
  xpToNext: number,
  level: number,
  challengesAvailable: boolean,
): { emoji: string; text: string } {
  // 1. If #1 in any stat
  if (bestRank && bestRank.rank === 1) {
    return { emoji: '\u{1F451}', text: `You're #1 in ${bestRank.stat} this season! Keep it up` };
  }

  // 2. If close to passing someone (rank exists and rank > 1)
  if (bestRank && bestRank.rank > 1 && bestRank.rank <= 10) {
    return { emoji: '\u{1F3AF}', text: `You're #${bestRank.rank} in ${bestRank.stat} — keep climbing` };
  }

  // 3. Personal best from last game
  if (personalBest) {
    return { emoji: '\u{1F525}', text: `New personal best in ${personalBest}!` };
  }

  // 4. Close to leveling up (within 300 XP)
  if (xpToNext <= 300) {
    return { emoji: '\u{26A1}', text: `${xpToNext} XP to Level ${level + 1}. One good game could do it` };
  }

  // 5. Active challenge
  if (challengesAvailable) {
    return { emoji: '\u{1F3AF}', text: 'You have an active challenge waiting' };
  }

  // 6. Default
  return { emoji: '\u{1F3C6}', text: 'Check where you rank on the team' };
}

export default function CompetitiveNudge({
  bestRank,
  personalBest,
  xpToNext,
  level,
  challengesAvailable,
}: Props) {
  const router = useRouter();

  const nudge = useMemo(
    () => buildNudgeMessage(bestRank, personalBest, xpToNext, level, challengesAvailable),
    [bestRank, personalBest, xpToNext, level, challengesAvailable],
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push('/standings' as any)}
      style={styles.outerWrap}
    >
      <LinearGradient
        colors={['rgba(75,185,236,0.06)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.bar}
      >
        <Text style={styles.emoji}>{nudge.emoji}</Text>
        <Text style={styles.text} numberOfLines={1}>{nudge.text}</Text>
        <Text style={styles.arrow}>{'\u2192'}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PLAYER_THEME.cardBg,
    borderRadius: D_RADII.cardSmall,
    borderWidth: 1,
    borderColor: PLAYER_THEME.borderAccent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  emoji: {
    fontSize: 16,
  },
  text: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PLAYER_THEME.textPrimary,
  },
  arrow: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: PLAYER_THEME.accent,
  },
});
