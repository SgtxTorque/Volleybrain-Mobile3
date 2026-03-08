import AchievementCelebrationModal from '@/components/AchievementCelebrationModal';
import RarityGlow from '@/components/RarityGlow';
import type { AchievementFull, UnseenAchievement } from '@/lib/achievement-types';
import { RARITY_CONFIG } from '@/lib/achievement-types';
import {
  checkAllAchievements,
  checkRoleAchievements,
  fetchPlayerXP,
  fetchUserXP,
  getRoleAchievements,
  getUnseenAchievements,
  getUnseenRoleAchievements,
  markAchievementsSeen,
} from '@/lib/achievement-engine';
import { useAuth } from '@/lib/auth';
import { getLevelFromXP, getLevelTier } from '@/lib/engagement-constants';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { fetchActiveChallenges, type ChallengeWithParticipants } from '@/lib/challenge-service';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// DARK MODE COLORS
// =============================================================================

const DARK = {
  bg: '#0A0F1A',
  card: '#111827',
  cardAlt: '#1A2235',
  border: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  gold: '#FFD700',
};

// =============================================================================
// TYPES
// =============================================================================

type Achievement = AchievementFull;

type PlayerAchievement = {
  id: string;
  player_id: string;
  achievement_id: string;
  earned_at: string | null;
  progress: number | null;
  achievements: Achievement;
};

type CategoryConfig = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

type PlayerSeasonStats = Record<string, number>;

// =============================================================================
// CONSTANTS
// =============================================================================

const PLAYER_CATEGORIES: Record<string, CategoryConfig> = {
  Offensive: { label: 'Offensive', icon: 'flash', color: '#FF3B3B' },
  Defensive: { label: 'Defensive', icon: 'shield', color: '#3B82F6' },
  Playmaker: { label: 'Playmaker', icon: 'people', color: '#10B981' },
  Heart: { label: 'Heart', icon: 'heart', color: '#EC4899' },
  Community: { label: 'Community', icon: 'megaphone', color: '#F59E0B' },
  Elite: { label: 'Elite', icon: 'diamond', color: '#FFD700' },
};

const COACH_CATEGORIES: Record<string, CategoryConfig> = {
  'Team Builder': { label: 'Team Builder', icon: 'people', color: '#3B82F6' },
  'Game Day': { label: 'Game Day', icon: 'football', color: '#EF4444' },
  Development: { label: 'Development', icon: 'trending-up', color: '#10B981' },
  Engagement: { label: 'Engagement', icon: 'flame', color: '#F59E0B' },
  Community: { label: 'Community', icon: 'megaphone', color: '#EC4899' },
};

const PARENT_CATEGORIES: Record<string, CategoryConfig> = {
  'Team Spirit': { label: 'Team Spirit', icon: 'heart', color: '#EC4899' },
  Support: { label: 'Support', icon: 'hand-left', color: '#3B82F6' },
  Financial: { label: 'Financial', icon: 'cash', color: '#10B981' },
  Engagement: { label: 'Engagement', icon: 'chatbubbles', color: '#F59E0B' },
  Community: { label: 'Community', icon: 'megaphone', color: '#A855F7' },
};

const ADMIN_CATEGORIES: Record<string, CategoryConfig> = {
  Operations: { label: 'Operations', icon: 'settings', color: '#3B82F6' },
  Management: { label: 'Management', icon: 'grid', color: '#10B981' },
  Community: { label: 'Community', icon: 'megaphone', color: '#F59E0B' },
};

const ROLE_CATEGORY_MAP: Record<string, Record<string, CategoryConfig>> = {
  player: PLAYER_CATEGORIES,
  coach: COACH_CATEGORIES,
  parent: PARENT_CATEGORIES,
  admin: ADMIN_CATEGORIES,
};

// Merged CATEGORIES used for rendering — gets set dynamically based on role
let CATEGORIES: Record<string, CategoryConfig> = PLAYER_CATEGORIES;

const RARITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  common: { bg: '#94A3B820', text: '#94A3B8', label: 'Common' },
  uncommon: { bg: '#10B98120', text: '#10B981', label: 'Uncommon' },
  rare: { bg: '#3B82F620', text: '#3B82F6', label: 'Rare' },
  epic: { bg: '#A855F720', text: '#A855F7', label: 'Epic' },
  legendary: { bg: '#F59E0B20', text: '#F59E0B', label: 'Legendary' },
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 16;
const GRID_GAP = 10;
const NUM_COLUMNS = 3;
const CELL_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// =============================================================================
// HELPERS
// =============================================================================

function getProgressForAchievement(
  achievement: Achievement,
  playerAchievement: PlayerAchievement | undefined,
  seasonStats: PlayerSeasonStats,
): { current: number; target: number; pct: number } {
  const target = achievement.threshold ?? 1;
  // If we have a player_achievement record with progress, use it
  if (playerAchievement?.progress != null) {
    const current = playerAchievement.progress;
    return { current, target, pct: target > 0 ? Math.min((current / target) * 100, 100) : 0 };
  }
  // Otherwise try to derive from season stats via stat_key
  if (achievement.stat_key && seasonStats[achievement.stat_key] != null) {
    const current = seasonStats[achievement.stat_key];
    return { current, target, pct: target > 0 ? Math.min((current / target) * 100, 100) : 0 };
  }
  return { current: 0, target, pct: 0 };
}

function getRarityPercentageLabel(rarity: string): string | null {
  switch (rarity) {
    case 'legendary':
      return 'Only 2% of players earn this badge';
    case 'epic':
      return 'Only 5% of players earn this badge';
    default:
      return null;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function AchievementsScreen() {
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const { isAdmin, isCoach, isParent, isPlayer } = usePermissions();
  const router = useRouter();
  const { playerId: paramPlayerId } = useLocalSearchParams<{ playerId?: string }>();

  // Detect effective role for this screen
  const effectiveRole: 'player' | 'coach' | 'parent' | 'admin' = isAdmin
    ? 'admin'
    : isCoach
      ? 'coach'
      : isParent
        ? 'parent'
        : 'player';

  // Set categories based on role
  CATEGORIES = ROLE_CATEGORY_MAP[effectiveRole] || PLAYER_CATEGORIES;

  const [loading, setLoading] = useState(true);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [earnedMap, setEarnedMap] = useState<Record<string, PlayerAchievement>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [seasonStats, setSeasonStats] = useState<PlayerSeasonStats>({});
  const [earnedCounts, setEarnedCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'badges' | 'challenges' | 'progress'>('badges');
  const [challenges, setChallenges] = useState<ChallengeWithParticipants[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
  const [totalXp, setTotalXp] = useState(0);
  const [unseenAchievements, setUnseenAchievements] = useState<UnseenAchievement[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const hasRunAutoUnlock = useRef(false);

  useEffect(() => {
    hasRunAutoUnlock.current = false; // Reset when deps change
    if (user?.id && workingSeason?.id) {
      loadData();
    }
  }, [user?.id, workingSeason?.id]);

  // Auto-unlock after data loads — runs ONCE per load cycle, not on every stats change
  useEffect(() => {
    if (!loading && playerId && allAchievements.length > 0 && !hasRunAutoUnlock.current) {
      hasRunAutoUnlock.current = true;
      runAutoUnlock();
    }
  }, [loading, playerId, allAchievements.length]);

  const resolvePlayerId = async (): Promise<string | null> => {
    // Use route param if provided (parent viewing child's achievements)
    if (paramPlayerId) return paramPlayerId;
    if (!user?.id || !workingSeason?.id) return null;

    // 1. Check parent_account_id
    const { data: directPlayers } = await supabase
      .from('players')
      .select('id')
      .eq('parent_account_id', user.id)
      .eq('season_id', workingSeason.id)
      .limit(1);
    if (directPlayers && directPlayers.length > 0) return directPlayers[0].id;

    // 2. Check player_guardians
    const { data: guardianLinks } = await supabase
      .from('player_guardians')
      .select('player_id')
      .eq('guardian_id', user.id);
    if (guardianLinks && guardianLinks.length > 0) {
      const playerIds = guardianLinks.map((g: { player_id: string }) => g.player_id);
      const { data } = await supabase
        .from('players')
        .select('id')
        .in('id', playerIds)
        .eq('season_id', workingSeason.id)
        .limit(1);
      if (data && data.length > 0) return data[0].id;
    }

    return null;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Non-player roles use a different data path
      if (effectiveRole !== 'player' && user?.id) {
        return await loadRoleData();
      }

      const resolvedPlayerId = await resolvePlayerId();
      setPlayerId(resolvedPlayerId);

      // Fetch all active achievements (player + all)
      const { data: achievements } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .in('target_role', ['player', 'all'])
        .order('display_order');

      if (achievements) {
        setAllAchievements(achievements);
      }

      // Fetch player's earned achievements
      if (resolvedPlayerId) {
        const { data: earned } = await supabase
          .from('player_achievements')
          .select('*, achievements(*)')
          .eq('player_id', resolvedPlayerId);

        if (earned) {
          const map: Record<string, PlayerAchievement> = {};
          for (const pa of earned) {
            map[pa.achievement_id] = pa as PlayerAchievement;
          }
          setEarnedMap(map);
        }

        // Fetch tracked achievements
        const { data: tracked } = await supabase
          .from('player_tracked_achievements')
          .select('achievement_id')
          .eq('player_id', resolvedPlayerId);
        if (tracked) {
          setTrackedIds(new Set(tracked.map(t => t.achievement_id)));
        }

        // Fetch player_season_stats for progress calculation
        if (workingSeason?.id) {
          const { data: stats } = await supabase
            .from('player_season_stats')
            .select('*')
            .eq('player_id', resolvedPlayerId)
            .eq('season_id', workingSeason.id)
            .limit(1)
            .maybeSingle();

          if (stats) {
            const statsObj: PlayerSeasonStats = {};
            for (const key of Object.keys(stats)) {
              if (typeof stats[key] === 'number') {
                statsObj[key] = stats[key];
              }
            }
            setSeasonStats(statsObj);
          }
        }
      }

      // Fetch how many players have earned each achievement
      const { data: countData } = await supabase
        .from('player_achievements')
        .select('achievement_id');

      if (countData) {
        const counts: Record<string, number> = {};
        for (const row of countData) {
          counts[row.achievement_id] = (counts[row.achievement_id] || 0) + 1;
        }
        setEarnedCounts(counts);
      }

      // Fetch XP/level data
      if (resolvedPlayerId) {
        const xpData = await fetchPlayerXP(resolvedPlayerId);
        setTotalXp(xpData.totalXp);
      }

      // Fetch team ID for challenges
      if (resolvedPlayerId) {
        const { data: teamLink } = await supabase
          .from('team_players')
          .select('team_id')
          .eq('player_id', resolvedPlayerId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (teamLink?.team_id) {
          setTeamId(teamLink.team_id);
          const teamChallenges = await fetchActiveChallenges(teamLink.team_id);
          setChallenges(teamChallenges);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  /** Load data for coach/parent/admin roles */
  const loadRoleData = async () => {
    if (!user?.id) return;
    try {
      const roleKey = effectiveRole as 'coach' | 'parent' | 'admin';

      // Fetch role-specific achievements with earned status
      const roleAchievements = await getRoleAchievements(user.id, roleKey);
      setAllAchievements(roleAchievements);

      // Build earned map from roleAchievements
      const map: Record<string, PlayerAchievement> = {};
      for (const ra of roleAchievements) {
        if (ra.earned) {
          map[ra.id] = {
            id: ra.id,
            player_id: user.id,
            achievement_id: ra.id,
            earned_at: ra.earned_at,
            progress: null,
            achievements: ra,
          };
        }
      }
      setEarnedMap(map);
      setPlayerId(user.id);

      // Fetch XP
      const xpData = await fetchUserXP(user.id);
      setTotalXp(xpData.totalXp);

      // Run achievement check in background
      const result = await checkRoleAchievements(user.id, roleKey, workingSeason?.id);
      if (result.allStats) setSeasonStats(result.allStats);
      if (result.newUnlocks.length > 0) {
        // Refresh
        const refreshed = await getRoleAchievements(user.id, roleKey);
        setAllAchievements(refreshed);
        const newMap: Record<string, PlayerAchievement> = {};
        for (const ra of refreshed) {
          if (ra.earned) {
            newMap[ra.id] = {
              id: ra.id,
              player_id: user.id,
              achievement_id: ra.id,
              earned_at: ra.earned_at,
              progress: null,
              achievements: ra,
            };
          }
        }
        setEarnedMap(newMap);
        const xp = await fetchUserXP(user.id);
        setTotalXp(xp.totalXp);
      }

      // Check for unseen
      const unseen = await getUnseenRoleAchievements(user.id);
      if (unseen.length > 0) {
        setUnseenAchievements(unseen);
        setShowCelebration(true);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading role achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-unlock achievements using the enhanced engine (handles all types)
  const runAutoUnlock = async () => {
    if (!playerId || !workingSeason?.id || allAchievements.length === 0) return;

    try {
      // Only run checkAllAchievements for PLAYER role — it writes to player_achievements
      // which has an FK on players.id. For parents/coaches/admins, role achievements
      // are already handled in loadRoleData via checkRoleAchievements.
      if (effectiveRole === 'player') {
        const result = await checkAllAchievements(playerId, workingSeason.id);

        if (Object.keys(result.allStats).length > 0) {
          setSeasonStats(result.allStats);
        }

        if (result.newUnlocks.length > 0) {
          await loadData();
        }

        // Check for unseen achievements to celebrate
        const unseen = await getUnseenAchievements(playerId);
        if (unseen.length > 0) {
          setUnseenAchievements(unseen);
          setShowCelebration(true);
        }
      }
    } catch (err: any) {
      if (__DEV__) console.log('Achievement check skipped:', err?.message);
      return; // Fail silently, don't retry
    }
  };

  const handleCelebrationDismiss = async () => {
    setShowCelebration(false);
    setUnseenAchievements([]);
    // For role users, use user.id; for players, use playerId
    const markId = effectiveRole !== 'player' ? user?.id : playerId;
    if (markId) {
      await markAchievementsSeen(markId);
    }
  };

  const toggleTrack = async (achievementId: string) => {
    if (!playerId) return;
    const isTracked = trackedIds.has(achievementId);
    if (isTracked) {
      // Untrack
      await supabase
        .from('player_tracked_achievements')
        .delete()
        .eq('player_id', playerId)
        .eq('achievement_id', achievementId);
      setTrackedIds(prev => {
        const next = new Set(prev);
        next.delete(achievementId);
        return next;
      });
    } else {
      // Track — max 3
      if (trackedIds.size >= 3) {
        Alert.alert('Limit Reached', 'You can track up to 3 achievements at a time. Untrack one first.');
        return;
      }
      await supabase
        .from('player_tracked_achievements')
        .insert({ player_id: playerId, achievement_id: achievementId, display_order: trackedIds.size });
      setTrackedIds(prev => new Set(prev).add(achievementId));
    }
  };

  // Derived data
  const filteredAchievements = useMemo(() => {
    return activeCategory
      ? allAchievements.filter((a) => a.category === activeCategory)
      : allAchievements;
  }, [allAchievements, activeCategory]);

  const totalEarned = Object.keys(earnedMap).length;
  const completePct =
    allAchievements.length > 0 ? Math.round((totalEarned / allAchievements.length) * 100) : 0;

  // Earned count by category
  const earnedCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ach of allAchievements) {
      const cat = ach.category || 'Other';
      if (earnedMap[ach.id]) {
        map[cat] = (map[cat] || 0) + 1;
      }
    }
    return map;
  }, [allAchievements, earnedMap]);

  const totalCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ach of allAchievements) {
      const cat = ach.category || 'Other';
      map[cat] = (map[cat] || 0) + 1;
    }
    return map;
  }, [allAchievements]);

  // Progress nudges: achievements at 80%+ completion
  const almostThere = useMemo(() => {
    const nudges: Array<{ ach: Achievement; pct: number; current: number; target: number }> = [];
    for (const ach of allAchievements) {
      if (earnedMap[ach.id]?.earned_at) continue;
      const prog = getProgressForAchievement(ach, earnedMap[ach.id], seasonStats);
      if (prog.pct >= 80 && prog.pct < 100) {
        nudges.push({ ach, pct: prog.pct, current: prog.current, target: prog.target });
      }
    }
    return nudges.sort((a, b) => b.pct - a.pct).slice(0, 3);
  }, [allAchievements, earnedMap, seasonStats]);

  // "Next to earn" recommendation: unearned with highest progress %
  const nextToEarn = useMemo(() => {
    let best: Achievement | null = null;
    let bestPct = -1;
    for (const ach of allAchievements) {
      if (earnedMap[ach.id]?.earned_at) continue;
      const prog = getProgressForAchievement(ach, earnedMap[ach.id], seasonStats);
      if (prog.pct > bestPct) {
        bestPct = prog.pct;
        best = ach;
      }
    }
    return best;
  }, [allAchievements, earnedMap, seasonStats]);

  // Pad data for 3-column grid
  const gridData = useMemo(() => {
    const padded = [...filteredAchievements];
    const remainder = padded.length % NUM_COLUMNS;
    if (remainder !== 0) {
      for (let i = 0; i < NUM_COLUMNS - remainder; i++) {
        padded.push(null as unknown as Achievement);
      }
    }
    return padded;
  }, [filteredAchievements]);

  const handleBadgePress = useCallback((ach: Achievement) => {
    setSelectedAchievement(ach);
  }, []);

  // Challenges derived data (must be above early returns — Rules of Hooks)
  const activeChallenges = useMemo(() =>
    challenges.filter(c => c.status === 'active'), [challenges]);

  const completedChallenges = useMemo(() =>
    challenges.filter(c => c.status === 'completed'), [challenges]);

  // XP / level derived data
  const levelInfo = getLevelFromXP(totalXp);
  const tier = getLevelTier(levelInfo.level);

  // Build stat power bars from season stats
  const statBars = useMemo(() => {
    const keys = [
      { key: 'total_kills', label: 'KILLS', color: '#EF4444' },
      { key: 'total_aces', label: 'ACES', color: '#F59E0B' },
      { key: 'total_digs', label: 'DIGS', color: '#4BB9EC' },
      { key: 'total_blocks', label: 'BLOCKS', color: '#A855F7' },
      { key: 'total_assists', label: 'ASSISTS', color: '#10B981' },
      { key: 'total_serves', label: 'SERVES', color: '#EC4899' },
    ];
    const gamesPlayed = seasonStats.games_played || seasonStats.total_games_played || 1;
    return keys
      .filter(k => seasonStats[k.key] != null && seasonStats[k.key] > 0)
      .map(k => {
        const total = seasonStats[k.key] || 0;
        const perGame = total / gamesPlayed;
        const maxPerGame: Record<string, number> = {
          total_kills: 15, total_aces: 8, total_digs: 20,
          total_blocks: 6, total_assists: 30, total_serves: 20,
        };
        const norm = Math.min(Math.round((perGame / (maxPerGame[k.key] || 10)) * 100), 100);
        return { ...k, total, perGame: perGame.toFixed(1), value: norm };
      });
  }, [seasonStats]);

  // =========================================================================
  // LOADING STATE
  // =========================================================================

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={DARK.gold} />
          <Text style={s.loadingText}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // EMPTY STATE: no achievements in DB
  // =========================================================================

  if (allAchievements.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={DARK.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>ACHIEVEMENTS</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.centered}>
          <Image source={require('@/assets/images/mascot/Meet-Lynx.png')} style={{ width: 120, height: 120, marginBottom: 16 }} resizeMode="contain" />
          <Text style={s.emptyTitle}>Achievements Unlocking Soon</Text>
          <Text style={s.emptySubtitle}>Your league is setting up trophies. Check back — your first badge is within reach!</Text>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================

  const renderBadgeCell = ({ item }: { item: Achievement }) => {
    // Null items are padding for grid alignment
    if (!item) {
      return <View style={s.badgeCellEmpty} />;
    }

    const isEarned = Boolean(earnedMap[item.id]?.earned_at);
    const isLevelGated = !isEarned && item.min_level != null && item.min_level > levelInfo.level;
    const catConfig = CATEGORIES[item.category] || {
      color: DARK.textMuted,
      icon: 'star' as keyof typeof Ionicons.glyphMap,
    };
    const rarityConfig = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
    const prog = getProgressForAchievement(item, earnedMap[item.id], seasonStats);
    const isInProgress = !isEarned && !isLevelGated && prog.pct > 0;

    return (
      <TouchableOpacity
        style={[
          s.badgeCell,
          isEarned
            ? { backgroundColor: catConfig.color + '33' }
            : isLevelGated
              ? { backgroundColor: DARK.cardAlt, opacity: 0.4 }
              : { backgroundColor: DARK.cardAlt },
        ]}
        activeOpacity={0.7}
        onPress={() => handleBadgePress(item)}
      >
        {/* Icon container with rarity glow */}
        <RarityGlow rarity={item.rarity} size={52} earned={isEarned}>
          <View
            style={[
              s.badgeIconWrap,
              isEarned
                ? { backgroundColor: catConfig.color + '40' }
                : { backgroundColor: 'rgba(255,255,255,0.05)' },
            ]}
          >
            <Text style={[s.badgeEmoji, !isEarned && { opacity: isLevelGated ? 0.15 : isInProgress ? 0.5 : 0.2 }]}>
              {item.icon || '\uD83C\uDFC6'}
            </Text>
            {/* Overlay: checkmark, level lock, or regular lock */}
            {isEarned ? (
              <View style={s.badgeCheckOverlay}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              </View>
            ) : isLevelGated ? (
              <View style={s.badgeLockOverlay}>
                <Ionicons name="lock-closed" size={12} color={DARK.gold} />
              </View>
            ) : (
              <View style={s.badgeLockOverlay}>
                <Ionicons name="lock-closed" size={10} color={DARK.textMuted} />
              </View>
            )}
          </View>
        </RarityGlow>

        {/* Badge name */}
        <Text
          style={[s.badgeName, !isEarned && { color: DARK.textMuted }]}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        {/* Level gate label, progress bar, or rarity dot */}
        {isLevelGated ? (
          <Text style={s.levelGateText}>Lvl {item.min_level}</Text>
        ) : isInProgress ? (
          <View style={s.miniProgressBg}>
            <View style={[s.miniProgressFill, { width: `${prog.pct}%` as any, backgroundColor: rarityConfig.text }]} />
          </View>
        ) : (
          <View style={[s.rarityDot, { backgroundColor: rarityConfig.text }]} />
        )}

        {/* Tracking indicator */}
        {trackedIds.has(item.id) && !isEarned && !isLevelGated && (
          <View style={s.trackingIndicator}>
            <Ionicons name="eye" size={8} color={DARK.gold} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderListHeader = () => {
    const nextProg = nextToEarn
      ? getProgressForAchievement(nextToEarn, earnedMap[nextToEarn.id], seasonStats)
      : null;

    const levelInfo = getLevelFromXP(totalXp);
    const tier = getLevelTier(levelInfo.level);

    return (
      <View>
        {/* Level & XP Bar */}
        <View style={s.xpCard}>
          <View style={s.xpHeaderRow}>
            <View style={[s.levelBadge, { backgroundColor: tier.color + '25', borderColor: tier.color }]}>
              <Text style={[s.levelNumber, { color: tier.color }]}>{levelInfo.level}</Text>
            </View>
            <View style={s.xpInfo}>
              <Text style={s.xpTierName}>{tier.name}</Text>
              <Text style={s.xpLabel}>
                {totalXp} / {levelInfo.nextLevelXp} XP to Level {levelInfo.level + 1}
              </Text>
            </View>
          </View>
          <View style={s.xpBarBg}>
            <View
              style={[
                s.xpBarFill,
                {
                  width: `${levelInfo.progress}%` as any,
                  backgroundColor: tier.color,
                },
              ]}
            />
          </View>
        </View>

        {/* Summary Card */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryNumber}>{totalEarned}</Text>
              <Text style={s.summaryLabel}>Earned</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={s.summaryNumber}>{allAchievements.length}</Text>
              <Text style={s.summaryLabel}>Total</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryNumber, { color: DARK.gold }]}>{completePct}%</Text>
              <Text style={s.summaryLabel}>Complete</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={s.summaryProgressBarBg}>
            <View
              style={[
                s.summaryProgressBarFill,
                { width: `${completePct}%` as any },
              ]}
            />
          </View>

          {/* Next to earn */}
          {totalEarned === 0 && (
            <View style={s.nextToEarnRow}>
              <Ionicons name="arrow-forward-circle" size={16} color={DARK.gold} />
              <Text style={s.nextToEarnText}>
                START EARNING TROPHIES — Play games and hit milestones
              </Text>
            </View>
          )}
          {nextToEarn && totalEarned > 0 && (
            <View style={s.nextToEarnRow}>
              <Text style={s.nextToEarnLabel}>Next to earn:</Text>
              <Text style={s.nextToEarnBadge}>
                {nextToEarn.icon || '\uD83C\uDFC6'} {nextToEarn.name}
              </Text>
              {nextProg && nextProg.pct > 0 && (
                <Text style={s.nextToEarnProgress}>({Math.round(nextProg.pct)}%)</Text>
              )}
            </View>
          )}
        </View>

        {/* Almost There nudges */}
        {almostThere.length > 0 && (
          <View style={s.nudgeSection}>
            <View style={s.nudgeHeader}>
              <Ionicons name="flash" size={14} color={BRAND.warning} />
              <Text style={s.nudgeTitle}>Almost There!</Text>
            </View>
            {almostThere.map((n) => (
              <TouchableOpacity
                key={n.ach.id}
                style={s.nudgeRow}
                onPress={() => handleBadgePress(n.ach)}
                activeOpacity={0.7}
              >
                <Text style={s.nudgeEmoji}>{n.ach.icon || '\uD83C\uDFC6'}</Text>
                <View style={s.nudgeInfo}>
                  <Text style={s.nudgeName}>{n.ach.name}</Text>
                  <View style={s.nudgeProgressBg}>
                    <View style={[s.nudgeProgressFill, { width: `${n.pct}%` as any }]} />
                  </View>
                </View>
                <Text style={s.nudgePct}>{n.current}/{n.target}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.categoryScroll}
          contentContainerStyle={s.categoryScrollContent}
        >
          <TouchableOpacity
            style={[
              s.categoryChip,
              !activeCategory && {
                backgroundColor: DARK.gold + '25',
                borderColor: DARK.gold,
              },
            ]}
            onPress={() => setActiveCategory(null)}
          >
            <Text
              style={[s.categoryChipText, !activeCategory && { color: DARK.gold }]}
            >
              All
            </Text>
            <Text
              style={[s.categoryCount, !activeCategory && { color: DARK.gold }]}
            >
              {totalEarned}/{allAchievements.length}
            </Text>
          </TouchableOpacity>
          {Object.keys(CATEGORIES).map((cat) => {
            const config = CATEGORIES[cat];
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  s.categoryChip,
                  isActive && {
                    backgroundColor: config.color + '25',
                    borderColor: config.color,
                  },
                ]}
                onPress={() => setActiveCategory(isActive ? null : cat)}
              >
                <Ionicons
                  name={config.icon}
                  size={14}
                  color={isActive ? config.color : DARK.textMuted}
                />
                <Text
                  style={[s.categoryChipText, isActive && { color: config.color }]}
                >
                  {config.label}
                </Text>
                <Text
                  style={[s.categoryCount, isActive && { color: config.color }]}
                >
                  {earnedCountByCategory[cat] || 0}/{totalCountByCategory[cat] || 0}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Empty for filtered */}
        {filteredAchievements.length === 0 && (
          <View style={s.emptyBox}>
            <Ionicons name="trophy-outline" size={48} color={DARK.textMuted} />
            <Text style={s.emptyFilterText}>None unlocked yet in this category. Keep grinding!</Text>
          </View>
        )}
      </View>
    );
  };

  // =========================================================================
  // DETAIL MODAL
  // =========================================================================

  const renderDetailModal = () => {
    if (!selectedAchievement) return null;

    const ach = selectedAchievement;
    const pa = earnedMap[ach.id];
    const isEarned = Boolean(pa?.earned_at);
    const catConfig = CATEGORIES[ach.category] || {
      color: DARK.textMuted,
      icon: 'star' as keyof typeof Ionicons.glyphMap,
      label: ach.category,
    };
    const rarityConfig = RARITY_COLORS[ach.rarity] || RARITY_COLORS.common;
    const prog = getProgressForAchievement(ach, pa, seasonStats);
    const playersEarned = earnedCounts[ach.id] || 0;
    const rarityLabel = getRarityPercentageLabel(ach.rarity);

    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <SafeAreaView style={s.modalContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={s.modalCloseBtn}
            onPress={() => setSelectedAchievement(null)}
          >
            <Ionicons name="close" size={28} color={DARK.text} />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={s.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Large badge icon with rarity glow */}
            <RarityGlow rarity={ach.rarity} size={100} earned={isEarned} style={{ marginTop: 20 }}>
              <View
                style={[
                  s.modalBadgeCircle,
                  {
                    backgroundColor: isEarned ? catConfig.color + '30' : DARK.cardAlt,
                  },
                ]}
              >
                <Text style={[s.modalBadgeEmoji, !isEarned && { opacity: 0.35 }]}>
                  {ach.icon || '\uD83C\uDFC6'}
                </Text>
                {!isEarned && (
                  <View style={s.modalLockOverlay}>
                    <Ionicons name="lock-closed" size={24} color={DARK.textMuted} />
                  </View>
                )}
              </View>
            </RarityGlow>

            {/* Badge name */}
            <Text style={s.modalBadgeName}>{ach.name}</Text>

            {/* Rarity pill */}
            <View
              style={[s.modalRarityPill, { backgroundColor: rarityConfig.bg }]}
            >
              <View
                style={[
                  s.modalRarityDot,
                  { backgroundColor: rarityConfig.text },
                ]}
              />
              <Text style={[s.modalRarityText, { color: rarityConfig.text }]}>
                {rarityConfig.label}
              </Text>
            </View>

            {/* Description */}
            <Text style={s.modalDescription}>
              {ach.description || 'Complete this achievement to earn it!'}
            </Text>
            {ach.flavor_text && (
              <Text style={s.modalFlavorText}>"{ach.flavor_text}"</Text>
            )}

            {/* HOW TO EARN section */}
            <View style={s.modalSection}>
              <Text style={s.modalSectionTitle}>HOW TO EARN</Text>
              <View style={s.modalHowToEarnRow}>
                <View
                  style={[
                    s.modalCategoryIconWrap,
                    { backgroundColor: catConfig.color + '20' },
                  ]}
                >
                  <Ionicons
                    name={catConfig.icon}
                    size={18}
                    color={catConfig.color}
                  />
                </View>
                <Text style={s.modalHowToEarnText}>
                  {ach.how_to_earn || ach.description || 'Complete the required objective'}
                </Text>
              </View>

              {/* Progress bar (if not earned or partially complete) */}
              {ach.threshold != null && ach.threshold > 0 && (
                <View style={s.modalProgressWrap}>
                  <View style={s.modalProgressBarBg}>
                    <View
                      style={[
                        s.modalProgressBarFill,
                        {
                          width: `${prog.pct}%` as any,
                          backgroundColor: isEarned ? '#10B981' : catConfig.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={s.modalProgressLabel}>
                    {prog.current} / {prog.target}
                    {ach.stat_key
                      ? ` ${ach.stat_key.replace('total_', '').replace(/_/g, ' ')}`
                      : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* STATUS section */}
            <View style={s.modalSection}>
              <Text style={s.modalSectionTitle}>STATUS</Text>
              {isEarned ? (
                <View style={s.modalStatusEarned}>
                  <View style={s.modalStatusBanner}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <Text style={s.modalStatusEarnedText}>EARNED</Text>
                  </View>
                  {pa?.earned_at && (
                    <Text style={s.modalStatusDate}>
                      Unlocked on{' '}
                      {new Date(pa.earned_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={s.modalStatusLocked}>
                  <View style={s.modalStatusBanner}>
                    <Ionicons name="lock-closed" size={20} color={ach.min_level != null && ach.min_level > levelInfo.level ? DARK.gold : DARK.textMuted} />
                    <Text style={s.modalStatusLockedText}>
                      {ach.min_level != null && ach.min_level > levelInfo.level ? 'LEVEL LOCKED' : 'LOCKED'}
                    </Text>
                  </View>
                  {ach.min_level != null && ach.min_level > levelInfo.level ? (
                    <Text style={[s.modalMotivation, { color: DARK.gold }]}>
                      Unlocks at Level {ach.min_level} (you{"'"}re Level {levelInfo.level})
                    </Text>
                  ) : prog.pct > 50 ? (
                    <Text style={s.modalMotivation}>
                      Keep going! You{"'"}re almost there!
                    </Text>
                  ) : prog.pct > 0 ? (
                    <Text style={s.modalMotivation}>
                      You{"'"}re making progress. Keep it up!
                    </Text>
                  ) : (
                    <Text style={s.modalMotivation}>
                      Start playing to unlock this badge.
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* STATS section */}
            <View style={s.modalSection}>
              <Text style={s.modalSectionTitle}>STATS</Text>
              <View style={s.modalStatRow}>
                <Ionicons name="people-outline" size={18} color={DARK.textSecondary} />
                <Text style={s.modalStatText}>
                  {playersEarned === 0
                    ? 'No players have earned this yet'
                    : playersEarned === 1
                      ? '1 player in your league has earned this'
                      : `${playersEarned} players in your league have earned this`}
                </Text>
              </View>
              {rarityLabel && (
                <View style={s.modalStatRow}>
                  <Ionicons name="diamond-outline" size={18} color={rarityConfig.text} />
                  <Text style={[s.modalStatText, { color: rarityConfig.text }]}>
                    {rarityLabel}
                  </Text>
                </View>
              )}
            </View>

            {/* Track / Untrack button */}
            {playerId && !isEarned && (
              <TouchableOpacity
                style={[
                  s.modalTrackBtn,
                  trackedIds.has(ach.id) && { backgroundColor: DARK.gold + '25', borderColor: DARK.gold },
                ]}
                onPress={() => toggleTrack(ach.id)}
              >
                <Ionicons
                  name={trackedIds.has(ach.id) ? 'eye' : 'eye-outline'}
                  size={18}
                  color={trackedIds.has(ach.id) ? DARK.gold : DARK.textSecondary}
                />
                <Text style={[
                  s.modalTrackBtnText,
                  trackedIds.has(ach.id) && { color: DARK.gold },
                ]}>
                  {trackedIds.has(ach.id) ? 'Tracking' : 'Track This'}
                </Text>
                {!trackedIds.has(ach.id) && (
                  <Text style={s.modalTrackHint}>({trackedIds.size}/3)</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Close button at bottom */}
            <TouchableOpacity
              style={s.modalBottomCloseBtn}
              onPress={() => setSelectedAchievement(null)}
            >
              <Text style={s.modalBottomCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  // =========================================================================
  // CHALLENGES TAB HELPERS
  // =========================================================================

  const getDaysRemaining = (endsAt: string) => {
    const now = Date.now();
    const end = new Date(endsAt).getTime();
    const days = Math.ceil((end - now) / 86400000);
    return days > 0 ? days : 0;
  };

  const getPlayerProgress = (challenge: ChallengeWithParticipants) => {
    if (!playerId) return { current: 0, target: challenge.target_value || 1, pct: 0 };
    const part = challenge.participants.find(p => p.player_id === playerId);
    const current = part?.current_value || 0;
    const target = challenge.target_value || 1;
    return { current, target, pct: Math.min((current / target) * 100, 100) };
  };

  // =========================================================================
  // RENDER CHALLENGES TAB
  // =========================================================================

  const renderChallengesTab = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <>
          <Text style={s.tabSectionLabel}>ACTIVE CHALLENGES</Text>
          {activeChallenges.map(ch => {
            const prog = getPlayerProgress(ch);
            const daysLeft = getDaysRemaining(ch.ends_at);
            const isGold = prog.pct >= 50;
            return (
              <View key={ch.id} style={[s.challengeCard, isGold && { borderColor: DARK.gold + '25' }]}>
                <View style={s.challengeHeader}>
                  <View style={[s.challengeIconWrap, { backgroundColor: isGold ? DARK.gold + '15' : '#4BB9EC15' }]}>
                    <Ionicons name="flash" size={16} color={isGold ? DARK.gold : '#4BB9EC'} />
                  </View>
                  <Text style={[s.challengeTitle, { color: isGold ? DARK.gold : '#4BB9EC' }]} numberOfLines={2}>
                    {ch.title}
                  </Text>
                </View>
                {ch.description ? (
                  <Text style={s.challengeDesc} numberOfLines={2}>{ch.description}</Text>
                ) : null}
                <View style={s.challengeProgressRow}>
                  <View style={s.challengeProgressBg}>
                    <View
                      style={[
                        s.challengeProgressFill,
                        { width: `${prog.pct}%` as any, backgroundColor: isGold ? DARK.gold : '#4BB9EC' },
                      ]}
                    />
                  </View>
                  <Text style={s.challengeProgressText}>{prog.current}/{prog.target}</Text>
                </View>
                <View style={s.challengeFooter}>
                  <Text style={s.challengeXp}>+{ch.xp_reward} XP reward</Text>
                  <View style={s.challengeTimeRow}>
                    <Ionicons name="time-outline" size={12} color={DARK.textMuted} />
                    <Text style={s.challengeTimeText}>{daysLeft}d left</Text>
                  </View>
                </View>
                {ch.participants.length > 0 && (
                  <Text style={s.challengeParticipants}>
                    {ch.participants.length} participant{ch.participants.length !== 1 ? 's' : ''}
                    {' \u00B7 '}
                    {ch.participants.filter(p => p.completed).length} completed
                  </Text>
                )}
              </View>
            );
          })}
        </>
      )}

      {/* Completed Challenges */}
      {completedChallenges.length > 0 && (
        <>
          <Text style={[s.tabSectionLabel, { marginTop: 20 }]}>COMPLETED</Text>
          {completedChallenges.map(ch => (
            <View key={ch.id} style={[s.challengeCard, { opacity: 0.6 }]}>
              <View style={s.challengeHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={[s.challengeTitle, { color: DARK.textSecondary }]} numberOfLines={1}>
                  {ch.title}
                </Text>
              </View>
              <Text style={s.challengeXp}>+{ch.xp_reward} XP earned</Text>
            </View>
          ))}
        </>
      )}

      {/* Empty state */}
      {activeChallenges.length === 0 && completedChallenges.length === 0 && (
        <View style={s.emptyBox}>
          <Image
            source={require('@/assets/images/mascot/Meet-Lynx.png')}
            style={{ width: 80, height: 80, marginBottom: 12 }}
            resizeMode="contain"
          />
          <Text style={s.emptyTitle}>No Challenges Yet</Text>
          <Text style={s.emptySubtitle}>Your coach will post challenges here. Stay ready!</Text>
        </View>
      )}
    </ScrollView>
  );

  // =========================================================================
  // RENDER PROGRESS TAB
  // =========================================================================

  const renderProgressTab = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* XP Progress */}
      <View style={s.xpCard}>
        <View style={s.xpHeaderRow}>
          <View style={[s.levelBadge, { backgroundColor: tier.color + '25', borderColor: tier.color }]}>
            <Text style={[s.levelNumber, { color: tier.color }]}>{levelInfo.level}</Text>
          </View>
          <View style={s.xpInfo}>
            <Text style={s.xpTierName}>{tier.name}</Text>
            <Text style={s.xpLabel}>
              {totalXp} / {levelInfo.nextLevelXp} XP to Level {levelInfo.level + 1}
            </Text>
          </View>
        </View>
        <View style={s.xpBarBg}>
          <View style={[s.xpBarFill, { width: `${levelInfo.progress}%` as any, backgroundColor: tier.color }]} />
        </View>
      </View>

      {/* Season Stats Power Bars */}
      {statBars.length > 0 && (
        <View style={[s.progressStatsCard, { marginTop: 16 }]}>
          <Text style={s.tabSectionLabel}>SEASON STATS</Text>
          {statBars.map(bar => (
            <View key={bar.key} style={s.progressStatRow}>
              <Text style={s.progressStatLabel}>{bar.label}</Text>
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: `${bar.value}%` as any, backgroundColor: bar.color }]} />
              </View>
              <Text style={[s.progressStatValue, { color: bar.color }]}>{bar.total}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Summary */}
      <View style={[s.summaryCard, { marginTop: 16 }]}>
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={s.summaryNumber}>{totalEarned}</Text>
            <Text style={s.summaryLabel}>Badges</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryNumber, { color: DARK.gold }]}>{completePct}%</Text>
            <Text style={s.summaryLabel}>Complete</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryNumber}>{activeChallenges.length}</Text>
            <Text style={s.summaryLabel}>Active</Text>
          </View>
        </View>
      </View>

      {/* Personal Bests */}
      {statBars.length > 0 && (
        <View style={[s.progressStatsCard, { marginTop: 16 }]}>
          <Text style={s.tabSectionLabel}>PER-GAME AVERAGES</Text>
          <View style={s.personalBestsGrid}>
            {statBars.map(bar => (
              <View key={bar.key} style={s.personalBestCard}>
                <Text style={[s.personalBestNum, { color: bar.color }]}>{bar.perGame}</Text>
                <Text style={s.personalBestLabel}>{bar.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Empty */}
      {statBars.length === 0 && (
        <View style={[s.emptyBox, { marginTop: 16 }]}>
          <Image
            source={require('@/assets/images/mascot/Meet-Lynx.png')}
            style={{ width: 80, height: 80, marginBottom: 12 }}
            resizeMode="contain"
          />
          <Text style={s.emptyTitle}>Stats Coming Soon</Text>
          <Text style={s.emptySubtitle}>Play games to build your stats profile!</Text>
        </View>
      )}
    </ScrollView>
  );

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  const TAB_ITEMS: { key: typeof activeTab; label: string }[] = [
    { key: 'badges', label: 'BADGES' },
    { key: 'challenges', label: 'CHALLENGES' },
    { key: 'progress', label: 'PROGRESS' },
  ];

  return (
    <SafeAreaView style={s.container}>
      {/* Trophy Case Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={DARK.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={s.headerCountBadge}>
          <Text style={s.headerCountText}>{totalEarned}</Text>
        </View>
      </View>

      {/* Trophy Case Title */}
      <View style={s.trophyCaseTitle}>
        <Text style={s.trophyWord}>TROPHY</Text>
        <Text style={[s.trophyWord, { color: DARK.gold }]}>CASE</Text>
        <View style={s.trophyDivider}>
          <Text style={s.trophyEarnedCount}>{totalEarned} Earned</Text>
          <View style={s.trophyDividerLine} />
        </View>
      </View>

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {TAB_ITEMS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[s.tabItemText, activeTab === tab.key && s.tabItemTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'badges' && (
        <FlatList
          data={filteredAchievements.length > 0 ? gridData : []}
          renderItem={renderBadgeCell}
          keyExtractor={(item, index) => (item ? item.id : `pad-${index}`)}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={s.gridRow}
          contentContainerStyle={s.gridContent}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={<View style={{ height: 40 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
      {activeTab === 'challenges' && renderChallengesTab()}
      {activeTab === 'progress' && renderProgressTab()}

      {/* Detail Modal */}
      {renderDetailModal()}

      {/* Celebration Modal */}
      {showCelebration && unseenAchievements.length > 0 && (
        <AchievementCelebrationModal
          unseen={unseenAchievements}
          onDismiss={handleCelebrationDismiss}
          onViewAllTrophies={() => {
            handleCelebrationDismiss();
          }}
          themeColors={DARK}
        />
      )}
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: DARK.textMuted,
    marginTop: 12,
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DARK.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bodyExtraBold,
    color: DARK.gold,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  headerCountBadge: {
    backgroundColor: DARK.gold + '25',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: DARK.gold + '50',
  },
  headerCountText: {
    fontSize: 13,
    fontFamily: FONTS.bodyExtraBold,
    color: DARK.gold,
  },

  // Level & XP Bar
  xpCard: {
    backgroundColor: DARK.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  xpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  levelBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  levelNumber: {
    fontSize: 22,
    fontFamily: FONTS.bodyExtraBold,
  },
  xpInfo: {
    flex: 1,
  },
  xpTierName: {
    fontSize: 16,
    fontFamily: FONTS.bodyExtraBold,
    color: DARK.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  xpLabel: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: DARK.textMuted,
    marginTop: 2,
  },
  xpBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Almost There nudges
  nudgeSection: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: DARK.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  nudgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  nudgeTitle: {
    fontSize: 13,
    fontFamily: FONTS.bodyExtraBold,
    color: BRAND.warning,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  nudgeEmoji: {
    fontSize: 22,
  },
  nudgeInfo: {
    flex: 1,
  },
  nudgeName: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: DARK.text,
    marginBottom: 3,
  },
  nudgeProgressBg: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  nudgeProgressFill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: BRAND.warning,
  },
  nudgePct: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: DARK.textSecondary,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: DARK.card,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DARK.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontFamily: FONTS.bodyExtraBold,
    color: DARK.text,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: DARK.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: DARK.border,
  },
  summaryProgressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 16,
  },
  summaryProgressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: DARK.gold,
  },
  nextToEarnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
    flexWrap: 'wrap',
  },
  nextToEarnLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: DARK.textMuted,
  },
  nextToEarnBadge: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: DARK.gold,
  },
  nextToEarnProgress: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: DARK.textSecondary,
  },
  nextToEarnText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: DARK.gold,
    flex: 1,
  },

  // Category Filter
  categoryScroll: {
    marginBottom: 12,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DARK.border,
    backgroundColor: DARK.card,
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: DARK.textMuted,
  },
  categoryCount: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: DARK.textMuted,
  },

  // Badge Grid
  gridContent: {
    paddingBottom: 16,
  },
  gridRow: {
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  badgeCell: {
    width: CELL_WIDTH,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DARK.border,
  },
  badgeCellEmpty: {
    width: CELL_WIDTH,
  },
  badgeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  badgeEmoji: {
    fontSize: 32,
  },
  badgeCheckOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: DARK.card,
    borderRadius: 8,
    padding: 1,
  },
  badgeLockOverlay: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: DARK.cardAlt,
    borderRadius: 8,
    padding: 2,
  },
  badgeName: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: DARK.text,
    textAlign: 'center',
    lineHeight: 14,
    height: 28,
  },
  rarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  miniProgressBg: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 4,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  levelGateText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: DARK.gold,
    marginTop: 4,
  },

  // Empty states
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: DARK.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: DARK.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyFilterText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: DARK.textMuted,
    marginTop: 12,
  },

  // =========================================================================
  // MODAL STYLES
  // =========================================================================
  modalContainer: {
    flex: 1,
    backgroundColor: DARK.bg,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DARK.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalBadgeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DARK.border,
    position: 'relative',
  },
  modalBadgeEmoji: {
    fontSize: 48,
  },
  modalLockOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: DARK.cardAlt,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  modalBadgeName: {
    fontSize: 24,
    fontFamily: FONTS.bodyExtraBold,
    color: DARK.text,
    marginTop: 16,
    textAlign: 'center',
  },
  modalRarityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  modalRarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalRarityText: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalDescription: {
    fontSize: 15,
    color: DARK.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 8,
  },
  modalFlavorText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: DARK.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },

  // Modal sections
  modalSection: {
    width: '100%',
    marginTop: 28,
    backgroundColor: DARK.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontFamily: FONTS.bodyExtraBold,
    color: DARK.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 14,
  },

  // How to earn
  modalHowToEarnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalCategoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHowToEarnText: {
    flex: 1,
    fontSize: 14,
    color: DARK.textSecondary,
    lineHeight: 20,
  },

  // Modal progress
  modalProgressWrap: {
    marginTop: 14,
  },
  modalProgressBarBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  modalProgressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  modalProgressLabel: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: DARK.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },

  // Status section
  modalStatusEarned: {
    alignItems: 'center',
    gap: 8,
  },
  modalStatusLocked: {
    alignItems: 'center',
    gap: 8,
  },
  modalStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalStatusEarnedText: {
    fontSize: 18,
    fontFamily: FONTS.bodyExtraBold,
    color: '#10B981',
    letterSpacing: 2,
  },
  modalStatusLockedText: {
    fontSize: 18,
    fontFamily: FONTS.bodyExtraBold,
    color: DARK.textMuted,
    letterSpacing: 2,
  },
  modalStatusDate: {
    fontSize: 13,
    color: DARK.textSecondary,
  },
  modalMotivation: {
    fontSize: 13,
    color: DARK.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Stats section
  modalStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  modalStatText: {
    fontSize: 14,
    color: DARK.textSecondary,
    flex: 1,
  },

  // Track button
  modalTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: DARK.cardAlt,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: DARK.border,
    width: '100%',
  },
  modalTrackBtnText: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: DARK.textSecondary,
  },
  modalTrackHint: {
    fontSize: 12,
    color: DARK.textMuted,
  },

  // Tracking indicator on badge cell
  trackingIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: DARK.gold + '30',
    borderRadius: 8,
    padding: 3,
  },

  // Bottom close
  modalBottomCloseBtn: {
    marginTop: 32,
    backgroundColor: DARK.cardAlt,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  modalBottomCloseBtnText: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: DARK.text,
    textAlign: 'center',
  },

  // =========================================================================
  // TROPHY CASE HEADER
  // =========================================================================
  trophyCaseTitle: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  trophyWord: {
    fontSize: 48,
    fontFamily: FONTS.display,
    color: DARK.text,
    lineHeight: 52,
    letterSpacing: 2,
  },
  trophyDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  trophyEarnedCount: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: 'rgba(255,255,255,0.40)',
  },
  trophyDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // =========================================================================
  // TAB BAR
  // =========================================================================
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: DARK.card,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: DARK.gold + '20',
  },
  tabItemText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: DARK.textMuted,
    letterSpacing: 1,
  },
  tabItemTextActive: {
    color: DARK.gold,
  },
  tabSectionLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // =========================================================================
  // CHALLENGES TAB
  // =========================================================================
  challengeCard: {
    backgroundColor: DARK.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  challengeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeTitle: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    flex: 1,
  },
  challengeDesc: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: DARK.textMuted,
    marginBottom: 8,
    lineHeight: 17,
  },
  challengeProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  challengeProgressBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  challengeProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  challengeProgressText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: 'rgba(255,255,255,0.30)',
  },
  challengeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  challengeXp: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: DARK.gold + '80',
  },
  challengeTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  challengeTimeText: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    color: DARK.textMuted,
  },
  challengeParticipants: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: DARK.textMuted,
    marginTop: 8,
  },

  // =========================================================================
  // PROGRESS TAB
  // =========================================================================
  progressStatsCard: {
    backgroundColor: DARK.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  progressStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  progressStatLabel: {
    width: 56,
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: DARK.textMuted,
    letterSpacing: 0.5,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressStatValue: {
    width: 36,
    fontSize: 14,
    fontFamily: FONTS.bodyExtraBold,
    textAlign: 'right',
  },
  personalBestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  personalBestCard: {
    width: (SCREEN_WIDTH - 32 - 32 - 20) / 3,
    backgroundColor: DARK.cardAlt,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  personalBestNum: {
    fontSize: 20,
    fontFamily: FONTS.bodyExtraBold,
  },
  personalBestLabel: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: DARK.textMuted,
    letterSpacing: 0.5,
    marginTop: 4,
  },
});
