/**
 * AdminTrophyBar — Compact dark navy trophy bar with badges and XP.
 * Same pattern as ParentTrophyBar. Independent component.
 * Animations: badge pop-in spring (staggered 50ms), XP bar fill (800ms).
 * ALL hooks above early returns.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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

/** Sub-component: Badge circle with pop-in spring animation */
function PopBadge({ badge, index }: { badge: RoleAchievementWithStatus; index: number }) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 50, withSpring(1.0, { damping: 8, stiffness: 150 }));
    opacity.value = withDelay(index * 50, withTiming(1, { duration: 200 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.badgeCircle,
        badge.earned ? styles.badgeEarned : styles.badgeLocked,
        animStyle,
      ]}
    >
      <Text style={[styles.badgeEmoji, !badge.earned && styles.badgeEmojiDim]}>
        {badge.icon || '\u{1F3C6}'}
      </Text>
    </Animated.View>
  );
}

function AdminTrophyBar({ userId }: Props) {
  const router = useRouter();
  const [badges, setBadges] = useState<RoleAchievementWithStatus[]>([]);
  const [xp, setXp] = useState({ totalXp: 0, level: 1, progress: 0, nextLevelXp: 100 });
  const [loading, setLoading] = useState(true);

  // XP bar fill animation — hook ABOVE early return
  const xpBarWidth = useSharedValue(0);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let mounted = true;

    (async () => {
      try {
        const [roleAch, xpData] = await Promise.all([
          getRoleAchievements(userId, 'admin'),
          fetchUserXP(userId),
        ]);
        if (!mounted) return;

        const earned = roleAch.filter(a => a.earned);
        const locked = roleAch.filter(a => !a.earned);
        setBadges([...earned, ...locked].slice(0, 4));
        setXp(xpData);

        const levelInfo = getLevelFromXP(xpData.totalXp);
        xpBarWidth.value = withDelay(
          300,
          withTiming(Math.min(levelInfo.progress, 100), {
            duration: 800,
            easing: Easing.out(Easing.ease),
          }),
        );
      } catch {
        // Silent fail
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [userId]);

  const xpFillStyle = useAnimatedStyle(() => ({
    width: `${xpBarWidth.value}%` as any,
  }));

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
        {/* Left: badge circles with pop-in */}
        <View style={styles.badgesRow}>
          {badges.slice(0, 4).map((badge, i) => (
            <PopBadge key={badge.id || i} badge={badge} index={i} />
          ))}
        </View>

        {/* Right: trophy info with animated XP bar */}
        <View style={styles.infoCol}>
          <Text style={styles.infoText}>
            Level {levelInfo.level} {'\u00B7'} <Text style={styles.tierGold}>{tier.name}</Text> {'\u00B7'} {earnedCount}/{totalCount} badges
          </Text>
          <View style={styles.xpBarBg}>
            <Animated.View style={[styles.xpBarFill, xpFillStyle]}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: '100%', width: 200 }}
              />
            </Animated.View>
          </View>
          <Text style={styles.xpLabel}>
            {xp.totalXp.toLocaleString()} / {levelInfo.nextLevelXp.toLocaleString()} XP
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default React.memo(AdminTrophyBar);

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
