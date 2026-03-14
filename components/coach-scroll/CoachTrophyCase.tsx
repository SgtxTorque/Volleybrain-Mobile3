/**
 * CoachTrophyCase — Fortnite-style dark navy badge showcase.
 * 4x2 badge grid with rarity dots, level badge, and XP bar.
 * Does NOT modify the shared TrophyCaseWidget.tsx.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchUserXP, getRoleAchievements, type RoleAchievementWithStatus } from '@/lib/achievement-engine';
import { getLevelFromXP, getLevelTier } from '@/lib/engagement-constants';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_RADII } from '@/theme/d-system';

interface Props {
  userId: string;
}

const RARITY_DOT: Record<string, string> = {
  epic: '#8B5CF6',
  rare: '#4BB9EC',
  common: '#22C55E',
  legendary: '#FFD700',
};

function CoachTrophyCase({ userId }: Props) {
  const router = useRouter();
  const [allBadges, setAllBadges] = useState<RoleAchievementWithStatus[]>([]);
  const [xp, setXp] = useState({ totalXp: 0, level: 1, progress: 0, nextLevelXp: 100 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let mounted = true;

    (async () => {
      try {
        const [roleAch, xpData] = await Promise.all([
          getRoleAchievements(userId, 'coach'),
          fetchUserXP(userId),
        ]);
        if (!mounted) return;

        // Sort: earned first (by earned_at desc), then unearned
        const earned = roleAch
          .filter(a => a.earned)
          .sort((a, b) => {
            const da = a.earned_at ? new Date(a.earned_at).getTime() : 0;
            const db = b.earned_at ? new Date(b.earned_at).getTime() : 0;
            return db - da;
          });
        const locked = roleAch.filter(a => !a.earned);
        setAllBadges([...earned, ...locked].slice(0, 8));
        setXp(xpData);
      } catch {
        // Silent fail
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [userId]);

  if (loading) return null;

  const earnedCount = allBadges.filter(b => b.earned).length;
  const totalCount = allBadges.length;
  const levelInfo = getLevelFromXP(xp.totalXp);
  const tier = getLevelTier(levelInfo.level);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push('/achievements' as any)}
    >
      <LinearGradient
        colors={['#0B1628', '#1a2d4a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{'\u{1F3C6}'} TROPHY CASE</Text>
          <Text style={styles.headerCount}>{earnedCount} / {totalCount} Unlocked</Text>
        </View>

        {/* Badge grid — 4 columns, 2 rows */}
        <View style={styles.badgeGrid}>
          {allBadges.map((badge, i) => {
            const dotColor = RARITY_DOT[badge.rarity?.toLowerCase() || 'common'] || RARITY_DOT.common;
            return (
              <View key={badge.id || i} style={[styles.badgeCell, badge.earned ? styles.badgeEarned : styles.badgeLocked]}>
                {/* Rarity dot */}
                <View style={[styles.rarityDot, { backgroundColor: dotColor }]} />
                <Text style={[styles.badgeEmoji, !badge.earned && styles.badgeEmojiLocked]}>
                  {badge.icon || '\u{1F3C6}'}
                </Text>
                <Text style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]} numberOfLines={1}>
                  {badge.name || 'Badge'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Level row */}
        <View style={styles.levelRow}>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.levelBadge}
          >
            <Text style={styles.levelNum}>{levelInfo.level}</Text>
          </LinearGradient>
          <View style={styles.levelInfo}>
            <Text style={styles.levelText}>
              Level {levelInfo.level} {'\u00B7'} <Text style={styles.tierHighlight}>{tier.name}</Text>
            </Text>
            <View style={styles.xpBarBg}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.xpBarFill, { width: `${levelInfo.progress}%` as any }]}
              />
            </View>
            <Text style={styles.xpLabel}>
              {xp.totalXp.toLocaleString()} / {levelInfo.nextLevelXp.toLocaleString()} XP
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default React.memo(CoachTrophyCase);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 13,
    color: BRAND.gold,
    letterSpacing: 1,
  },
  headerCount: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },

  // Badge grid
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  badgeCell: {
    width: '22%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: D_RADII.badge,
    borderWidth: 1,
    position: 'relative',
  },
  badgeEarned: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderColor: 'rgba(255,215,0,0.2)',
  },
  badgeLocked: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rarityDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  badgeEmojiLocked: {
    opacity: 0.25,
  },
  badgeName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 7.5,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  badgeNameLocked: {
    color: 'rgba(255,255,255,0.15)',
  },

  // Level row
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  levelNum: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: '#0B1628',
  },
  levelInfo: {
    flex: 1,
  },
  levelText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  tierHighlight: {
    color: BRAND.gold,
  },
  xpBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 3,
  },
});
