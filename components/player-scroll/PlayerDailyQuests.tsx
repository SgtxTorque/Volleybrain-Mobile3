/**
 * PlayerDailyQuests — "TODAY'S QUESTS" section with 3 quest cards.
 * Wired to the engagement system: reads from daily_quests table via
 * useQuestEngine. Tapping a quest marks it complete and awards XP.
 */
import React, { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { useQuestEngine } from '@/hooks/useQuestEngine';
import type { DailyQuest } from '@/lib/quest-engine';
import { getQuestMascot } from '@/lib/mascot-images';
import type { NextEvent, RsvpStatus, RecentShoutout, PlayerBadge } from '@/hooks/usePlayerHomeData';

type Props = {
  nextEvent?: NextEvent | null;
  rsvpStatus?: RsvpStatus;
  challengesAvailable?: boolean;
  recentShoutouts?: RecentShoutout[];
  badges?: PlayerBadge[];
  onOpenShoutout?: () => void;
};

/** Animated quest card with spring pop on checkmark */
function QuestCard({
  quest,
  index,
  completing,
  onComplete,
}: {
  quest: DailyQuest;
  index: number;
  completing: string | null;
  onComplete: (id: string) => void;
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
  const isCompleting = completing === quest.id;

  return (
    <TouchableOpacity
      activeOpacity={quest.is_completed ? 1 : 0.7}
      onPress={() => {
        if (!quest.is_completed && !isCompleting) {
          onComplete(quest.id);
        }
      }}
    >
      <Animated.View style={[styles.questCard, { backgroundColor: bgColor, borderColor }, animStyle]}>
        {/* Checkbox */}
        <View style={[styles.checkbox, quest.is_completed && styles.checkboxDone]}>
          {isCompleting ? (
            <ActivityIndicator size={10} color={PLAYER_THEME.accent} />
          ) : quest.is_completed ? (
            <Text style={styles.checkmark}>{'\u2713'}</Text>
          ) : null}
        </View>

        {/* Quest mascot */}
        <Image
          source={getQuestMascot(quest.quest_type)}
          style={styles.questMascot}
          resizeMode="contain"
        />

        {/* Quest text */}
        <Text
          style={[styles.questText, quest.is_completed && styles.questTextDone]}
          numberOfLines={1}
        >
          {quest.title}
        </Text>

        {/* XP reward */}
        <Text style={styles.xpReward}>+{quest.xp_reward} XP</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function PlayerDailyQuests(_props: Props) {
  const { quests, loading, completing, allComplete, bonusEarned, completeQuest } = useQuestEngine();

  const doneCount = quests.filter(q => q.is_completed).length;
  const bonusXp = 25;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TODAY'S QUESTS</Text>
        <Text style={styles.headerCount}>
          {loading ? '' : `${doneCount}/${quests.length} done`}
        </Text>
      </View>

      {/* Quest cards */}
      {loading ? (
        // Show placeholder cards with same dimensions to prevent layout shift
        <>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.questCard, { backgroundColor: D_COLORS.questBgActive, borderColor: D_COLORS.questBorderActive, opacity: 0.4 }]}>
              <View style={styles.checkbox} />
              <Text style={[styles.questText, { opacity: 0.3 }]}>Loading...</Text>
              <Text style={[styles.xpReward, { opacity: 0.3 }]}>+0 XP</Text>
            </View>
          ))}
        </>
      ) : (
        quests.map((quest, index) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            index={index}
            completing={completing}
            onComplete={completeQuest}
          />
        ))
      )}

      {/* Daily bonus bar */}
      <View style={[styles.bonusBar, (allComplete || bonusEarned) && styles.bonusBarDone]}>
        <Text style={[styles.bonusText, (allComplete || bonusEarned) && styles.bonusTextDone]}>
          {bonusEarned
            ? `All done! +${bonusXp} XP bonus earned`
            : `Complete all 3 for +${bonusXp} XP bonus`}
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
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: PLAYER_THEME.accent,
    letterSpacing: 1.5,
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
  questText: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PLAYER_THEME.textPrimary,
  },
  questTextDone: {
    color: PLAYER_THEME.textSecondary,
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
