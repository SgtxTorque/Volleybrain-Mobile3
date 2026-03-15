/**
 * PlayerDailyQuests — "TODAY'S QUESTS" section with 3 quest cards.
 * Quests are generated from EXISTING data — no new backend needed.
 * DISPLAY ONLY for now — they show quest cards with XP rewards but
 * don't actually award XP. The future engagement system will wire
 * real quest completion + XP awards.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import type { NextEvent, RsvpStatus, RecentShoutout, PlayerBadge } from '@/hooks/usePlayerHomeData';

type Props = {
  nextEvent: NextEvent | null;
  rsvpStatus: RsvpStatus;
  challengesAvailable: boolean;
  recentShoutouts: RecentShoutout[];
  badges: PlayerBadge[];
  onOpenShoutout?: () => void;
};

type Quest = {
  id: string;
  text: string;
  xp: number;
  completed: boolean;
};

/** Check if event_date is today */
function isToday(dateStr: string): boolean {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return dateStr === today;
}

function buildQuests(
  nextEvent: NextEvent | null,
  rsvpStatus: RsvpStatus,
  challengesAvailable: boolean,
  recentShoutouts: RecentShoutout[],
  badges: PlayerBadge[],
): Quest[] {
  const quests: Quest[] = [];

  // Quest 1: Always present — "Open Lynx today" auto-completed
  quests.push({
    id: 'open-lynx',
    text: 'Open Lynx today',
    xp: 5,
    completed: true,
  });

  // Quest 2: pick first that applies
  if (nextEvent && isToday(nextEvent.event_date)) {
    const eventType = nextEvent.event_type === 'game' ? 'game' : 'practice';
    const isConfirmed = rsvpStatus === 'confirmed' || rsvpStatus === 'yes';
    quests.push({
      id: 'show-up',
      text: `Show up to ${eventType} today`,
      xp: 20,
      completed: isConfirmed,
    });
  } else if (challengesAvailable) {
    quests.push({
      id: 'challenge',
      text: 'Work on your active challenge',
      xp: 15,
      completed: false,
    });
  } else {
    quests.push({
      id: 'check-stats',
      text: 'Check your stats',
      xp: 10,
      completed: false,
    });
  }

  // Quest 3: pick first that applies
  if (recentShoutouts.length === 0) {
    quests.push({
      id: 'give-props',
      text: 'Give a teammate props',
      xp: 10,
      completed: false,
    });
  } else if (badges.length > 0) {
    const recentBadge = badges[0];
    const earnedDate = new Date(recentBadge.earned_at);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    if (earnedDate > threeDaysAgo) {
      quests.push({
        id: 'view-badge',
        text: 'View your new badge',
        xp: 5,
        completed: false,
      });
    } else {
      quests.push({
        id: 'check-leaderboard',
        text: 'Check the leaderboard',
        xp: 10,
        completed: false,
      });
    }
  } else {
    quests.push({
      id: 'check-leaderboard',
      text: 'Check the leaderboard',
      xp: 10,
      completed: false,
    });
  }

  return quests;
}

/** Animated quest card with spring pop on checkmark */
function QuestCard({ quest, index }: { quest: Quest; index: number }) {
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

  const bgColor = quest.completed ? D_COLORS.questBgDone : D_COLORS.questBgActive;
  const borderColor = quest.completed ? D_COLORS.questBorderDone : D_COLORS.questBorderActive;

  return (
    <Animated.View style={[styles.questCard, { backgroundColor: bgColor, borderColor }, animStyle]}>
      {/* Checkbox */}
      <View style={[styles.checkbox, quest.completed && styles.checkboxDone]}>
        {quest.completed && <Text style={styles.checkmark}>{'\u2713'}</Text>}
      </View>

      {/* Quest text */}
      <Text
        style={[styles.questText, quest.completed && styles.questTextDone]}
        numberOfLines={1}
      >
        {quest.text}
      </Text>

      {/* XP reward */}
      <Text style={styles.xpReward}>+{quest.xp} XP</Text>
    </Animated.View>
  );
}

export default function PlayerDailyQuests({
  nextEvent,
  rsvpStatus,
  challengesAvailable,
  recentShoutouts,
  badges,
}: Props) {
  const quests = useMemo(
    () => buildQuests(nextEvent, rsvpStatus, challengesAvailable, recentShoutouts, badges),
    [nextEvent, rsvpStatus, challengesAvailable, recentShoutouts, badges],
  );

  const doneCount = quests.filter(q => q.completed).length;
  const allDone = doneCount === quests.length;
  const bonusXp = 25;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TODAY'S QUESTS</Text>
        <Text style={styles.headerCount}>
          {doneCount}/{quests.length} done
        </Text>
      </View>

      {/* Quest cards */}
      {quests.map((quest, index) => (
        <QuestCard key={quest.id} quest={quest} index={index} />
      ))}

      {/* Daily bonus bar */}
      <View style={[styles.bonusBar, allDone && styles.bonusBarDone]}>
        <Text style={[styles.bonusText, allDone && styles.bonusTextDone]}>
          {allDone
            ? `All done! +${bonusXp} XP bonus earned`
            : `Complete all ${quests.length} for +${bonusXp} XP bonus`}
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
