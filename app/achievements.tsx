import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// TYPES
// =============================================================================

type Achievement = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  type: string | null;
  rarity: string;
  icon: string | null;
  stat_key: string | null;
  threshold: number | null;
  display_order: number | null;
  is_active: boolean;
};

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

// =============================================================================
// CONSTANTS
// =============================================================================

const CATEGORIES: Record<string, CategoryConfig> = {
  Offensive: { label: 'Offensive', icon: 'flash', color: '#FF3B3B' },
  Defensive: { label: 'Defensive', icon: 'shield', color: '#3B82F6' },
  Playmaker: { label: 'Playmaker', icon: 'people', color: '#10B981' },
  Heart: { label: 'Heart', icon: 'heart', color: '#EC4899' },
  Elite: { label: 'Elite', icon: 'diamond', color: '#F59E0B' },
};

const RARITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  common: { bg: '#94A3B820', text: '#94A3B8', label: 'Common' },
  uncommon: { bg: '#10B98120', text: '#10B981', label: 'Uncommon' },
  rare: { bg: '#3B82F620', text: '#3B82F6', label: 'Rare' },
  epic: { bg: '#A855F720', text: '#A855F7', label: 'Epic' },
  legendary: { bg: '#F59E0B20', text: '#F59E0B', label: 'Legendary' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function AchievementsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [earnedMap, setEarnedMap] = useState<Record<string, PlayerAchievement>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id && workingSeason?.id) {
      loadData();
    }
  }, [user?.id, workingSeason?.id]);

  const resolvePlayerId = async (): Promise<string | null> => {
    if (!user?.id || !workingSeason?.id) return null;

    // 1. Check user_account_id
    const { data: selfPlayers } = await supabase
      .from('players')
      .select('id')
      .eq('user_account_id', user.id)
      .eq('season_id', workingSeason.id)
      .limit(1);
    if (selfPlayers && selfPlayers.length > 0) return selfPlayers[0].id;

    // 2. Check parent_account_id
    const { data: directPlayers } = await supabase
      .from('players')
      .select('id')
      .eq('parent_account_id', user.id)
      .eq('season_id', workingSeason.id)
      .limit(1);
    if (directPlayers && directPlayers.length > 0) return directPlayers[0].id;

    // 3. Check player_guardians
    const { data: guardianLinks } = await supabase
      .from('player_guardians')
      .select('player_id')
      .eq('guardian_id', user.id);
    if (guardianLinks && guardianLinks.length > 0) {
      const playerIds = guardianLinks.map(g => g.player_id);
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
      const resolvedPlayerId = await resolvePlayerId();
      setPlayerId(resolvedPlayerId);

      // Fetch all active achievements
      const { data: achievements } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
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
            map[pa.achievement_id] = pa as any;
          }
          setEarnedMap(map);
        }
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group achievements by category
  const categories = Object.keys(CATEGORIES);
  const filteredAchievements = activeCategory
    ? allAchievements.filter(a => a.category === activeCategory)
    : allAchievements;

  // Count earned per category
  const earnedCountByCategory: Record<string, number> = {};
  const totalCountByCategory: Record<string, number> = {};
  for (const ach of allAchievements) {
    const cat = ach.category || 'Other';
    totalCountByCategory[cat] = (totalCountByCategory[cat] || 0) + 1;
    if (earnedMap[ach.id]) {
      earnedCountByCategory[cat] = (earnedCountByCategory[cat] || 0) + 1;
    }
  }

  const totalEarned = Object.keys(earnedMap).length;

  const s = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Achievements</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Summary Card */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryNumber}>{totalEarned}</Text>
              <Text style={s.summaryLabel}>Earned</Text>
            </View>
            <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={s.summaryItem}>
              <Text style={s.summaryNumber}>{allAchievements.length}</Text>
              <Text style={s.summaryLabel}>Total</Text>
            </View>
            <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryNumber, { color: colors.primary }]}>
                {allAchievements.length > 0
                  ? Math.round((totalEarned / allAchievements.length) * 100)
                  : 0}%
              </Text>
              <Text style={s.summaryLabel}>Complete</Text>
            </View>
          </View>
        </View>

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
              !activeCategory && { backgroundColor: colors.primary + '25', borderColor: colors.primary },
            ]}
            onPress={() => setActiveCategory(null)}
          >
            <Text style={[s.categoryChipText, !activeCategory && { color: colors.primary }]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map(cat => {
            const config = CATEGORIES[cat];
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  s.categoryChip,
                  isActive && { backgroundColor: config.color + '25', borderColor: config.color },
                ]}
                onPress={() => setActiveCategory(isActive ? null : cat)}
              >
                <Ionicons
                  name={config.icon}
                  size={14}
                  color={isActive ? config.color : colors.textMuted}
                />
                <Text style={[s.categoryChipText, isActive && { color: config.color }]}>
                  {config.label}
                </Text>
                <Text style={[s.categoryCount, isActive && { color: config.color }]}>
                  {earnedCountByCategory[cat] || 0}/{totalCountByCategory[cat] || 0}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Achievement Cards */}
        {filteredAchievements.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyText}>No achievements found</Text>
          </View>
        ) : (
          filteredAchievements.map(ach => {
            const earned = earnedMap[ach.id];
            const isEarned = Boolean(earned?.earned_at);
            const progress = earned?.progress ?? 0;
            const threshold = ach.threshold ?? 1;
            const progressPct = threshold > 0 ? Math.min((progress / threshold) * 100, 100) : 0;
            const catConfig = CATEGORIES[ach.category] || { color: colors.textMuted, icon: 'star' as any };
            const rarityConfig = RARITY_COLORS[ach.rarity] || RARITY_COLORS.common;

            return (
              <View
                key={ach.id}
                style={[
                  s.achievementCard,
                  !isEarned && s.achievementCardLocked,
                ]}
              >
                <View style={s.achievementRow}>
                  {/* Icon */}
                  <View
                    style={[
                      s.achievementIcon,
                      {
                        backgroundColor: isEarned ? catConfig.color + '20' : colors.border + '40',
                      },
                    ]}
                  >
                    <Text style={[s.achievementEmoji, !isEarned && { opacity: 0.4 }]}>
                      {ach.icon || '🏆'}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={s.achievementInfo}>
                    <View style={s.achievementNameRow}>
                      <Text
                        style={[
                          s.achievementName,
                          !isEarned && { color: colors.textMuted },
                        ]}
                        numberOfLines={1}
                      >
                        {ach.name}
                      </Text>
                      {/* Rarity Badge */}
                      <View style={[s.rarityBadge, { backgroundColor: rarityConfig.bg }]}>
                        <Text style={[s.rarityText, { color: rarityConfig.text }]}>
                          {rarityConfig.label}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[s.achievementDesc, !isEarned && { color: colors.textMuted }]}
                      numberOfLines={2}
                    >
                      {ach.description || 'Complete this achievement to earn it!'}
                    </Text>

                    {isEarned ? (
                      <View style={s.earnedRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={s.earnedText}>
                          Earned {earned.earned_at
                            ? new Date(earned.earned_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : ''}
                        </Text>
                      </View>
                    ) : (
                      <View style={s.progressSection}>
                        <View style={s.progressBarBg}>
                          <View
                            style={[
                              s.progressBarFill,
                              {
                                width: `${progressPct}%`,
                                backgroundColor: catConfig.color,
                              },
                            ]}
                          />
                        </View>
                        <Text style={s.progressText}>
                          {progress}/{threshold}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: colors.textMuted,
      marginTop: 12,
      fontSize: 14,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
    },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { padding: 16 },

    // Summary
    summaryCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
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
      fontWeight: '900',
      color: colors.text,
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    summaryDivider: {
      width: 1,
      height: 40,
    },

    // Category Filter
    categoryScroll: {
      marginBottom: 16,
    },
    categoryScrollContent: {
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
      borderColor: colors.border,
      backgroundColor: colors.glassCard,
    },
    categoryChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    categoryCount: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
    },

    // Achievement Cards
    achievementCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 6 },
      }),
    },
    achievementCardLocked: {
      opacity: 0.7,
    },
    achievementRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    achievementIcon: {
      width: 52,
      height: 52,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    achievementEmoji: {
      fontSize: 24,
    },
    achievementInfo: {
      flex: 1,
    },
    achievementNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    achievementName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    rarityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    rarityText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    achievementDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 8,
    },

    // Earned
    earnedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    earnedText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#10B981',
    },

    // Progress
    progressSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    progressBarBg: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      minWidth: 40,
      textAlign: 'right',
    },

    // Empty
    emptyBox: {
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 12,
    },
  });
