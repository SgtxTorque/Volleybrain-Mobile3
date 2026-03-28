/**
 * TrophyCaseWidget — Mini badge showcase for Coach, Admin, and Parent dashboards.
 * Shows recent earned badges with rarity glow, XP bar, and "View All" link.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import RarityGlow from '@/components/RarityGlow';
import { fetchUserXP, getRoleAchievements, type RoleAchievementWithStatus } from '@/lib/achievement-engine';
import { getLevelFromXP, getLevelTier } from '@/lib/engagement-constants';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  userId: string;
  userRole: 'coach' | 'parent' | 'admin' | 'player';
};

export default function TrophyCaseWidget({ userId, userRole }: Props) {
  const router = useRouter();
  const [badges, setBadges] = useState<RoleAchievementWithStatus[]>([]);
  const [xp, setXp] = useState({ totalXp: 0, level: 1, progress: 0, nextLevelXp: 100 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    (async () => {
      try {
        const [roleAch, xpData] = await Promise.all([
          getRoleAchievements(userId, userRole),
          fetchUserXP(userId),
        ]);
        if (!mounted) return;

        // Get earned badges sorted by earned_at descending, take first 6
        const earned = roleAch
          .filter(a => a.earned)
          .sort((a, b) => {
            const dateA = a.earned_at ? new Date(a.earned_at).getTime() : 0;
            const dateB = b.earned_at ? new Date(b.earned_at).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 6);

        setBadges(earned);
        setXp(xpData);
      } catch {
        // Silent fail
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [userId, userRole]);

  if (loading) return null;

  const levelInfo = getLevelFromXP(xp.totalXp);
  const tier = getLevelTier(levelInfo.level);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Ionicons name="trophy" size={16} color={BRAND.gold} />
          <Text style={s.headerTitle}>TROPHY CASE</Text>
        </View>
        <TouchableOpacity
          style={s.viewAllBtn}
          onPress={() => router.push('/achievements')}
        >
          <Text style={s.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={14} color={BRAND.gold} />
        </TouchableOpacity>
      </View>

      {/* Badges Grid */}
      {badges.length > 0 ? (
        <View style={s.badgesRow}>
          {badges.map(badge => (
            <TouchableOpacity
              key={badge.id}
              style={s.badgeItem}
              activeOpacity={0.7}
              onPress={() => router.push('/achievements')}
            >
              <View>
                <RarityGlow rarity={badge.rarity} size={44} earned>
                  <View style={[s.badgeCircle, { backgroundColor: (badge.color_primary || BRAND.gold) + '30' }]}>
                    <Text style={s.badgeEmoji}>{badge.icon || '\uD83C\uDFC6'}</Text>
                  </View>
                </RarityGlow>
                {badge.earn_count > 1 && (
                  <View style={s.earnCountBadge}>
                    <Text style={s.earnCountText}>x{badge.earn_count}</Text>
                  </View>
                )}
              </View>
              <Text style={s.badgeName} numberOfLines={1}>{badge.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <TouchableOpacity style={s.emptyRow} onPress={() => router.push('/achievements')}>
          <Ionicons name="trophy-outline" size={24} color="rgba(255,255,255,0.2)" />
          <Text style={s.emptyText}>No badges earned yet. Keep going!</Text>
        </TouchableOpacity>
      )}

      {/* XP Progress Bar */}
      <View style={s.xpRow}>
        <View style={[s.levelBadge, { backgroundColor: tier.color + '20', borderColor: tier.color }]}>
          <Text style={[s.levelNum, { color: tier.color }]}>{levelInfo.level}</Text>
        </View>
        <View style={s.xpBarWrap}>
          <Text style={s.xpTierLabel}>Level {levelInfo.level} ({tier.name})</Text>
          <View style={s.xpBarBg}>
            <View style={[s.xpBarFill, { width: `${levelInfo.progress}%` as any, backgroundColor: tier.color }]} />
          </View>
          <Text style={s.xpLabel}>
            {xp.totalXp.toLocaleString()} / {levelInfo.nextLevelXp.toLocaleString()} XP
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: FONTS.bodyExtraBold,
    color: BRAND.gold,
    letterSpacing: 1.5,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.gold,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  badgeItem: {
    alignItems: 'center',
    width: 56,
  },
  badgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  earnCountBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: BRAND.gold,
    borderRadius: 7,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center' as const,
    zIndex: 2,
  },
  earnCountText: {
    fontSize: 8,
    fontWeight: '800' as const,
    color: '#000',
  },
  badgeName: {
    fontSize: 9,
    fontFamily: FONTS.bodySemiBold,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: 'rgba(255,255,255,0.3)',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  levelNum: {
    fontSize: 16,
    fontFamily: FONTS.bodyExtraBold,
  },
  xpBarWrap: {
    flex: 1,
  },
  xpTierLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
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
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 3,
  },
});
