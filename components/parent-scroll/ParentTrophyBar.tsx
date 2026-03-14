/**
 * ParentTrophyBar — Compact dark navy trophy bar with badges and XP.
 * Does NOT use TrophyCaseWidget. Independent component.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { fetchUserXP, getRoleAchievements, type RoleAchievementWithStatus } from '@/lib/achievement-engine';
import { getLevelFromXP, getLevelTier } from '@/lib/engagement-constants';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_RADII } from '@/theme/d-system';

interface Props {
  userId: string;
}

function ParentTrophyBar({ userId }: Props) {
  const router = useRouter();
  const [badges, setBadges] = useState<RoleAchievementWithStatus[]>([]);
  const [xp, setXp] = useState({ totalXp: 0, level: 1, progress: 0, nextLevelXp: 100 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let mounted = true;

    (async () => {
      try {
        const [roleAch, xpData] = await Promise.all([
          getRoleAchievements(userId, 'parent'),
          fetchUserXP(userId),
        ]);
        if (!mounted) return;

        const earned = roleAch.filter(a => a.earned);
        const locked = roleAch.filter(a => !a.earned);
        setBadges([...earned, ...locked].slice(0, 4));
        setXp(xpData);
      } catch {
        // Silent fail
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [userId]);

  // ALL hooks above early return
  if (loading) return null;

  const earnedCount = badges.filter(b => b.earned).length;
  const totalCount = badges.length;
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
        style={styles.bar}
      >
        {/* Left: badge circles */}
        <View style={styles.badgesRow}>
          {badges.slice(0, 4).map((badge, i) => (
            <View
              key={badge.id || i}
              style={[styles.badgeCircle, badge.earned ? styles.badgeEarned : styles.badgeLocked]}
            >
              <Text style={[styles.badgeEmoji, !badge.earned && styles.badgeEmojiDim]}>
                {badge.icon || '\u{1F3C6}'}
              </Text>
            </View>
          ))}
        </View>

        {/* Right: trophy info */}
        <View style={styles.infoCol}>
          <Text style={styles.infoText}>
            Level {levelInfo.level} {'\u00B7'} <Text style={styles.tierGold}>{tier.name}</Text> {'\u00B7'} {earnedCount}/{totalCount} badges
          </Text>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${Math.min(levelInfo.progress, 100)}%` }]}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: '100%', width: 200 }}
              />
            </View>
          </View>
          <Text style={styles.xpLabel}>
            {xp.totalXp.toLocaleString()} / {levelInfo.nextLevelXp.toLocaleString()} XP
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default React.memo(ParentTrophyBar);

const styles = StyleSheet.create({
  bar: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: D_RADII.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badgeCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  badgeEarned: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderColor: 'rgba(255,215,0,0.2)',
  },
  badgeLocked: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  badgeEmoji: {
    fontSize: 18,
  },
  badgeEmojiDim: {
    opacity: 0.25,
  },
  infoCol: {
    flex: 1,
  },
  infoText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  tierGold: {
    color: BRAND.gold,
  },
  xpBarBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 3,
  },
});
