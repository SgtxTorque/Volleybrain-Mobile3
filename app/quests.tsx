/**
 * QuestsScreen — Dedicated screen showing Daily, Weekly, and Team quests.
 * Navigated from PlayerQuestEntryCard on the home scroll.
 * Each quest card is tappable and navigates to the relevant action.
 */
import React, { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useQuestEngine } from '@/hooks/useQuestEngine';
import { useWeeklyQuestEngine } from '@/hooks/useWeeklyQuestEngine';
import { useTeamQuests } from '@/hooks/useTeamQuests';
import { usePlayerHomeData } from '@/hooks/usePlayerHomeData';
import { useAuth } from '@/lib/auth';
import { getQuestMascot, MASCOT } from '@/lib/mascot-images';
import { getTeamQuestContributions, type TeamQuest, type TeamQuestContribution } from '@/lib/team-quest-engine';
import type { DailyQuest, WeeklyQuest } from '@/lib/quest-engine';
import { supabase } from '@/lib/supabase';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_COLORS, D_RADII } from '@/theme/d-system';

// ─── Quest Navigation Map ────────────────────────────────────────────────────

function getQuestNavigation(quest: DailyQuest | WeeklyQuest): { route: string } | null {
  switch (quest.quest_type) {
    case 'app_checkin':
      return null;
    case 'stats_check':
      return { route: '/my-stats' };
    case 'social_action':
      return null; // Uses modal, not a route
    case 'attendance':
      return { route: '/(tabs)/schedule' };
    case 'drill_completion':
      return { route: '/(tabs)/journey' };
    case 'skill_tip':
      return { route: '/(tabs)/journey' };
    case 'skill_module':
      return { route: '/(tabs)/journey' };
    case 'quiz':
      return { route: '/(tabs)/journey' };
    case 'game_performance':
      return null;
    case 'community':
      return null; // Uses modal
    case 'consistency':
      return null;
    default:
      return null;
  }
}

// ─── Team Quest Mascot ───────────────────────────────────────────────────────

function getTeamQuestMascot(questType: string) {
  switch (questType) {
    case 'team_attendance': return MASCOT.TEAM_HUDDLE;
    case 'team_shoutouts': return MASCOT.ENCOURAGING_TEAMMATE;
    case 'team_practice_streak': return MASCOT.SPORTSMANSHIP;
    case 'team_quests_completed': return MASCOT.TEAM_ACHIEVEMENT;
    default: return MASCOT.TEAM_HUDDLE;
  }
}

// ─── Daily Quest Card ────────────────────────────────────────────────────────

function DailyQuestCard({ quest, index }: { quest: DailyQuest; index: number }) {
  const router = useRouter();
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 60, withSpring(1, { damping: 14, stiffness: 120 }));
    opacity.value = withDelay(index * 60, withTiming(1, { duration: 250 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const bgColor = quest.is_completed ? D_COLORS.questBgDone : D_COLORS.questBgActive;
  const borderColor = quest.is_completed ? D_COLORS.questBorderDone : D_COLORS.questBorderActive;

  const handlePress = () => {
    if (quest.is_completed) return;
    const nav = getQuestNavigation(quest);
    if (nav) {
      router.push(`${nav.route}?fromQuest=${quest.id}` as any);
    }
  };

  return (
    <Pressable onPress={handlePress} disabled={quest.is_completed || !getQuestNavigation(quest)}>
      <Animated.View style={[styles.questCard, { backgroundColor: bgColor, borderColor }, animStyle]}>
        <Image
          source={getQuestMascot(quest.quest_type)}
          style={styles.questMascot}
          resizeMode="contain"
        />
        <View style={styles.questContent}>
          <Text
            style={[styles.questTitle, quest.is_completed && styles.questTitleDone]}
            numberOfLines={1}
          >
            {quest.title}
          </Text>
          {quest.description && (
            <Text style={styles.questDescription} numberOfLines={1}>
              {quest.description}
            </Text>
          )}
        </View>
        {quest.is_completed ? (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={PLAYER_THEME.success} />
          </View>
        ) : (
          <View style={styles.xpPill}>
            <Text style={styles.xpPillText}>+{quest.xp_reward} XP</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Weekly Quest Card ───────────────────────────────────────────────────────

function WeeklyQuestCard({ quest, index }: { quest: WeeklyQuest; index: number }) {
  const router = useRouter();
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 60, withSpring(1, { damping: 14, stiffness: 120 }));
    opacity.value = withDelay(index * 60, withTiming(1, { duration: 250 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const bgColor = quest.is_completed ? D_COLORS.questBgDone : D_COLORS.questBgActive;
  const borderColor = quest.is_completed ? D_COLORS.questBorderDone : D_COLORS.questBorderActive;
  const showProgress = quest.target_value > 1 && !quest.is_completed;
  const progressPct = quest.target_value > 0 ? Math.min(quest.current_value / quest.target_value, 1) : 0;

  const handlePress = () => {
    if (quest.is_completed) return;
    const nav = getQuestNavigation(quest);
    if (nav) {
      router.push(`${nav.route}?fromQuest=${quest.id}` as any);
    }
  };

  return (
    <Pressable onPress={handlePress} disabled={quest.is_completed || !getQuestNavigation(quest)}>
      <Animated.View style={[styles.questCard, { backgroundColor: bgColor, borderColor }, animStyle]}>
        <Image
          source={getQuestMascot(quest.quest_type)}
          style={styles.questMascot}
          resizeMode="contain"
        />
        <View style={styles.questContent}>
          <Text
            style={[styles.questTitle, quest.is_completed && styles.questTitleDone]}
            numberOfLines={1}
          >
            {quest.title}
          </Text>
          {showProgress && (
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
              </View>
              <Text style={styles.progressLabel}>
                {quest.current_value}/{quest.target_value}
              </Text>
            </View>
          )}
        </View>
        {quest.is_completed ? (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={PLAYER_THEME.success} />
          </View>
        ) : (
          <View style={styles.xpPill}>
            <Text style={styles.xpPillText}>+{quest.xp_reward} XP</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Team Quest Card ─────────────────────────────────────────────────────────

function TeamQuestCard({ quest, index }: { quest: TeamQuest; index: number }) {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 60, withSpring(1, { damping: 14, stiffness: 120 }));
    opacity.value = withDelay(index * 60, withTiming(1, { duration: 250 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const bgColor = quest.is_completed ? D_COLORS.questBgDone : D_COLORS.questBgActive;
  const borderColor = quest.is_completed ? D_COLORS.questBorderDone : D_COLORS.questBorderActive;
  const progressPct = quest.target_value > 0 ? Math.min(quest.current_value / quest.target_value, 1) : 0;

  return (
    <Animated.View style={[styles.questCard, { backgroundColor: bgColor, borderColor }, animStyle]}>
      <Image
        source={getTeamQuestMascot(quest.quest_type)}
        style={styles.questMascot}
        resizeMode="contain"
      />
      <View style={styles.questContent}>
        <Text
          style={[styles.questTitle, quest.is_completed && styles.questTitleDone]}
          numberOfLines={1}
        >
          {quest.title}
        </Text>
        {!quest.is_completed && (
          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { height: 5 }]}>
              <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {quest.current_value}/{quest.target_value}
            </Text>
          </View>
        )}
      </View>
      {quest.is_completed ? (
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={20} color={PLAYER_THEME.success} />
        </View>
      ) : (
        <View style={styles.xpPill}>
          <Text style={styles.xpPillText}>+{quest.xp_reward_per_player} XP</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─── XP Today Pill ───────────────────────────────────────────────────────────

function useXpToday() {
  const [xpToday, setXpToday] = React.useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const startOfDay = `${todayStr}T00:00:00`;
      const { data } = await supabase
        .from('xp_ledger')
        .select('xp_amount')
        .eq('player_id', user.id)
        .gte('created_at', startOfDay);
      const total = (data || []).reduce((sum: number, row: { xp_amount: number }) => sum + (row.xp_amount || 0), 0);
      setXpToday(total);
    })();
  }, []);

  return xpToday;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function QuestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const xpToday = useXpToday();

  // Load quest data
  const { quests: dailyQuests, loading: dailyLoading, bonusEarned: dailyBonusEarned, allComplete: dailyAllComplete } = useQuestEngine();
  const { quests: weeklyQuests, loading: weeklyLoading, bonusEarned: weeklyBonusEarned, allComplete: weeklyAllComplete } = useWeeklyQuestEngine();

  // Get player's team for team quests
  const [teamId, setTeamId] = React.useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: playerData } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id)
        .limit(1)
        .maybeSingle();
      if (!playerData) return;
      const { data: tp } = await supabase
        .from('team_players')
        .select('team_id')
        .eq('player_id', playerData.id)
        .limit(1)
        .maybeSingle();
      setTeamId(tp?.team_id ?? null);
    })();
  }, [user?.id]);

  const { quests: teamQuests, loading: teamLoading } = useTeamQuests(teamId);

  const dailyDone = dailyQuests.filter(q => q.is_completed).length;
  const weeklyDone = weeklyQuests.filter(q => q.is_completed).length;
  const teamDone = teamQuests.filter(q => q.is_completed).length;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Quests</Text>
          <View style={styles.xpTodayPill}>
            <Text style={styles.xpTodayText}>
              {xpToday > 0 ? `+${xpToday} XP today` : 'No XP yet today'}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── DAILY QUESTS ─────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Quests</Text>
              <Text style={styles.sectionCount}>
                {dailyLoading ? '' : `${dailyDone}/${dailyQuests.length} done`}
              </Text>
            </View>

            {dailyLoading ? (
              <ActivityIndicator size="small" color={PLAYER_THEME.accent} style={{ marginVertical: 20 }} />
            ) : (
              dailyQuests.map((quest, i) => (
                <DailyQuestCard key={quest.id} quest={quest} index={i} />
              ))
            )}

            <View style={[styles.bonusBar, (dailyAllComplete || dailyBonusEarned) && styles.bonusBarDone]}>
              <Text style={[styles.bonusText, (dailyAllComplete || dailyBonusEarned) && styles.bonusTextDone]}>
                {dailyBonusEarned
                  ? 'All done! +25 XP bonus earned'
                  : 'Complete all 3 for +25 XP bonus'}
              </Text>
            </View>
          </View>

          {/* ─── WEEKLY QUESTS ─────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLeft}>
                <Text style={styles.sectionTitle}>Weekly Quests</Text>
                <Text style={styles.sectionReset}>Resets Monday</Text>
              </View>
              <Text style={styles.sectionCount}>
                {weeklyLoading ? '' : `${weeklyDone}/${weeklyQuests.length} done`}
              </Text>
            </View>

            {weeklyLoading ? (
              <ActivityIndicator size="small" color={PLAYER_THEME.accent} style={{ marginVertical: 20 }} />
            ) : (
              weeklyQuests.map((quest, i) => (
                <WeeklyQuestCard key={quest.id} quest={quest} index={i} />
              ))
            )}

            <View style={[styles.bonusBar, (weeklyAllComplete || weeklyBonusEarned) && styles.bonusBarDone]}>
              <Text style={[styles.bonusText, (weeklyAllComplete || weeklyBonusEarned) && styles.bonusTextDone]}>
                {weeklyBonusEarned
                  ? 'All done! +50 XP weekly bonus earned'
                  : 'Complete all for +50 XP weekly bonus'}
              </Text>
            </View>
          </View>

          {/* ─── TEAM QUESTS ─────────────────────────────────────── */}
          {teamId && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionLeft}>
                  <Ionicons name="people-outline" size={14} color={PLAYER_THEME.accent} />
                  <Text style={styles.sectionTitle}>Team Quests</Text>
                </View>
                <Text style={styles.sectionCount}>
                  {teamLoading ? '' : `${teamDone}/${teamQuests.length} done`}
                </Text>
              </View>

              {teamLoading ? (
                <ActivityIndicator size="small" color={PLAYER_THEME.accent} style={{ marginVertical: 20 }} />
              ) : teamQuests.length === 0 ? (
                <Text style={styles.emptyText}>No team quests this week</Text>
              ) : (
                teamQuests.map((quest, i) => (
                  <TeamQuestCard key={quest.id} quest={quest} index={i} />
                ))
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PLAYER_THEME.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  xpTodayPill: {
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.20)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  xpTodayText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: PLAYER_THEME.xpGold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: PLAYER_THEME.accent,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionReset: {
    fontFamily: FONTS.bodyLight,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginLeft: 8,
  },
  sectionCount: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PLAYER_THEME.textMuted,
  },

  // Quest card
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: D_RADII.cardSmall,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  questMascot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  questContent: {
    flex: 1,
  },
  questTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PLAYER_THEME.textPrimary,
  },
  questTitleDone: {
    color: PLAYER_THEME.textSecondary,
  },
  questDescription: {
    fontFamily: FONTS.bodyLight,
    fontSize: 11,
    color: PLAYER_THEME.textMuted,
    marginTop: 2,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: PLAYER_THEME.accent,
  },
  progressLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
  },

  // XP pill + completion badge
  xpPill: {
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  xpPillText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 11,
    color: PLAYER_THEME.xpGold,
  },
  completedBadge: {
    width: 24,
    alignItems: 'center',
  },

  // Bonus bar
  bonusBar: {
    borderRadius: 10,
    backgroundColor: 'rgba(255,215,0,0.06)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  bonusBarDone: {
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  bonusText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: PLAYER_THEME.xpGold,
  },
  bonusTextDone: {
    color: PLAYER_THEME.success,
  },

  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: PLAYER_THEME.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
