/**
 * PlayerTeamQuests — "TEAM QUESTS" section with group progress bars.
 * Wired to the engagement system via useTeamQuests. Team quests complete
 * automatically when the target is reached — no manual tap-to-complete.
 *
 * Visual pattern matches PlayerWeeklyQuests exactly.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_COLORS, D_RADII } from '@/theme/d-system';
import { useTeamQuests } from '@/hooks/useTeamQuests';
import { useAuth } from '@/lib/auth';
import { getTeamQuestContributions, type TeamQuest, type TeamQuestContribution } from '@/lib/team-quest-engine';

type Props = {
  teamId?: string | null;
};

// ─── Contributors Section ─────────────────────────────────────────────────────

function ContributorsLine({
  questId,
  isCompleted,
}: {
  questId: string;
  isCompleted: boolean;
}) {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<TeamQuestContribution[]>([]);
  const [showNames, setShowNames] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getTeamQuestContributions(questId, user.id).then(result => {
      setContributions(result.contributions);
      setShowNames(result.showIndividualNames);
      setLoaded(true);
    });
  }, [questId, user?.id]);

  if (!loaded || contributions.length === 0) return null;

  const count = contributions.length;

  if (!showNames) {
    return (
      <Text style={styles.contributorsText}>
        {count} teammate{count !== 1 ? 's' : ''} contributed
      </Text>
    );
  }

  // Show up to 2 names + "and X others"
  const names = contributions.slice(0, 2).map(c => c.player_name.split(' ')[0]);
  const remaining = count - names.length;

  let label = names.join(', ');
  if (remaining > 0) {
    label += ` and ${remaining} other${remaining !== 1 ? 's' : ''}`;
  }
  label += ' contributed';

  return <Text style={styles.contributorsText}>{label}</Text>;
}

// ─── Quest Card ───────────────────────────────────────────────────────────────

function TeamQuestCard({
  quest,
  index,
}: {
  quest: TeamQuest;
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
  const progressPct = quest.target_value > 0 ? Math.min(quest.current_value / quest.target_value, 1) : 0;

  return (
    <Animated.View style={[styles.questCard, { backgroundColor: bgColor, borderColor }, animStyle]}>
      {/* Checkbox */}
      <View style={[styles.checkbox, quest.is_completed && styles.checkboxDone]}>
        {quest.is_completed ? (
          <Text style={styles.checkmark}>{'\u2713'}</Text>
        ) : null}
      </View>

      {/* Quest text + progress */}
      <View style={styles.questContent}>
        <Text
          style={[styles.questText, quest.is_completed && styles.questTextDone]}
          numberOfLines={1}
        >
          {quest.title}
        </Text>

        {/* Progress bar */}
        {!quest.is_completed && (
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {quest.current_value}/{quest.target_value}
            </Text>
          </View>
        )}

        {/* Contributors */}
        <ContributorsLine questId={quest.id} isCompleted={quest.is_completed} />
      </View>

      {/* XP reward */}
      <View style={styles.xpCol}>
        {quest.is_completed ? (
          <Text style={styles.xpComplete}>+{quest.xp_reward_per_player} XP earned</Text>
        ) : (
          <Text style={styles.xpReward}>+{quest.xp_reward_per_player} XP</Text>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlayerTeamQuests({ teamId }: Props) {
  const { quests, loading } = useTeamQuests(teamId ?? null);

  const doneCount = quests.filter(q => q.is_completed).length;

  if (!teamId) return null;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people-outline" size={14} color={PLAYER_THEME.accent} />
          <Text style={styles.headerTitle}>TEAM QUESTS</Text>
          <Text style={styles.headerReset}>Resets Monday</Text>
        </View>
        <Text style={styles.headerCount}>
          {loading ? '' : `${doneCount}/${quests.length} done`}
        </Text>
      </View>

      {/* Quest cards */}
      {loading ? (
        <>
          {[0, 1].map(i => (
            <View key={i} style={[styles.questCard, { backgroundColor: D_COLORS.questBgActive, borderColor: D_COLORS.questBorderActive, opacity: 0.4 }]}>
              <View style={styles.checkbox} />
              <View style={styles.questContent}>
                <Text style={[styles.questText, { opacity: 0.3 }]}>Loading...</Text>
              </View>
              <Text style={[styles.xpReward, { opacity: 0.3 }]}>+0 XP</Text>
            </View>
          ))}
        </>
      ) : quests.length === 0 ? null : (
        quests.map((quest, index) => (
          <TeamQuestCard
            key={quest.id}
            quest={quest}
            index={index}
          />
        ))
      )}
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
  // Contributors
  contributorsText: {
    fontFamily: FONTS.bodyLight,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
    marginTop: 3,
  },
  // XP
  xpCol: {
    alignItems: 'flex-end',
  },
  xpReward: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 12,
    color: PLAYER_THEME.xpGold,
  },
  xpComplete: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: PLAYER_THEME.success,
  },
});
