/**
 * PlayerWeeklyQuests — "WEEKLY QUESTS" section with 3-5 quest cards.
 * Wired to the engagement system: reads from weekly_quests table via
 * useWeeklyQuestEngine. Weekly quests complete automatically when
 * progress reaches the target — no manual tap-to-complete.
 */
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_COLORS, D_RADII } from '@/theme/d-system';
import { useWeeklyQuestEngine } from '@/hooks/useWeeklyQuestEngine';
import { getQuestMascot } from '@/lib/mascot-images';
import type { WeeklyQuest } from '@/lib/quest-engine';

/** Animated quest card with spring pop and optional progress bar */
function WeeklyQuestCard({
  quest,
  index,
}: {
  quest: WeeklyQuest;
  index: number;
}) {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 80, withSpring(1, { damping: 14, stiffness: 120 }));
    opacity.value = withDelay(index * 80, withTiming(1, { duration: 300 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const bgColor = quest.is_completed ? D_COLORS.questBgDone : D_COLORS.questBgActive;
  const borderColor = quest.is_completed ? D_COLORS.questBorderDone : D_COLORS.questBorderActive;
  const showProgress = quest.target_value > 1 && !quest.is_completed;
  const progressPct = quest.target_value > 0 ? Math.min(quest.current_value / quest.target_value, 1) : 0;

  return (
    <Animated.View style={[styles.questCard, { backgroundColor: bgColor, borderColor }, animStyle]}>
      {/* Checkbox */}
      <View style={[styles.checkbox, quest.is_completed && styles.checkboxDone]}>
        {quest.is_completed ? (
          <Text style={styles.checkmark}>{'\u2713'}</Text>
        ) : null}
      </View>

      {/* Quest mascot */}
      <Image
        source={getQuestMascot(quest.quest_type)}
        style={styles.questMascot}
        resizeMode="contain"
      />

      {/* Quest text + optional progress */}
      <View style={styles.questContent}>
        <Text
          style={[styles.questText, quest.is_completed && styles.questTextDone]}
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

      {/* XP reward */}
      <Text style={styles.xpReward}>+{quest.xp_reward} XP</Text>
    </Animated.View>
  );
}

export default function PlayerWeeklyQuests() {
  const { quests, loading, allComplete, bonusEarned } = useWeeklyQuestEngine();

  const doneCount = quests.filter(q => q.is_completed).length;
  const bonusXp = 50;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>WEEKLY QUESTS</Text>
          <Text style={styles.headerReset}>Resets Monday</Text>
        </View>
        <Text style={styles.headerCount}>
          {loading ? '' : `${doneCount}/${quests.length} done`}
        </Text>
      </View>

      {/* Quest cards */}
      {loading ? (
        <>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.questCard, { backgroundColor: D_COLORS.questBgActive, borderColor: D_COLORS.questBorderActive, opacity: 0.4 }]}>
              <View style={styles.checkbox} />
              <View style={styles.questContent}>
                <Text style={[styles.questText, { opacity: 0.3 }]}>Loading...</Text>
              </View>
              <Text style={[styles.xpReward, { opacity: 0.3 }]}>+0 XP</Text>
            </View>
          ))}
        </>
      ) : (
        quests.map((quest, index) => (
          <WeeklyQuestCard
            key={quest.id}
            quest={quest}
            index={index}
          />
        ))
      )}

      {/* Weekly bonus bar */}
      <View style={[styles.bonusBar, (allComplete || bonusEarned) && styles.bonusBarDone]}>
        <Text style={[styles.bonusText, (allComplete || bonusEarned) && styles.bonusTextDone]}>
          {bonusEarned
            ? `All done! +${bonusXp} XP weekly bonus earned`
            : `Complete all for +${bonusXp} XP weekly bonus`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: PLAYER_THEME.accent,
    letterSpacing: 1.5,
  },
  headerReset: {
    fontFamily: FONTS.bodyLight,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  headerCount: {
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
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: PLAYER_THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDone: {
    backgroundColor: PLAYER_THEME.success,
    borderColor: PLAYER_THEME.success,
  },
  checkmark: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: PLAYER_THEME.bg,
  },
  questMascot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  questContent: {
    flex: 1,
  },
  questText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PLAYER_THEME.textPrimary,
  },
  questTextDone: {
    color: PLAYER_THEME.textSecondary,
  },
  // Progress bar
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
  xpReward: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 12,
    color: PLAYER_THEME.xpGold,
  },
  // Bonus bar
  bonusBar: {
    borderRadius: 10,
    backgroundColor: 'rgba(255,215,0,0.06)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 2,
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
});
