// =============================================================================
// Engagement Events — Auto-post to team wall, progress nudges
// =============================================================================

import { supabase } from './supabase';
import { getLevelTier } from './engagement-constants';
import type { AchievementFull } from './achievement-types';

// =============================================================================
// Auto-post: Achievement Unlock → Team Wall
// =============================================================================

export async function postAchievementUnlockToWall(params: {
  playerId: string;
  playerName: string;
  teamId: string;
  achievement: AchievementFull;
}): Promise<void> {
  const { playerId, playerName, teamId, achievement } = params;

  const displayText = `${playerName} just earned the ${achievement.icon || '\uD83C\uDFC6'} ${achievement.name} badge!`;
  const metadata = JSON.stringify({
    type: 'achievement_unlock',
    playerId,
    playerName,
    achievementName: achievement.name,
    achievementIcon: achievement.icon,
    achievementRarity: achievement.rarity,
    achievementCategory: achievement.category,
  });

  const { error } = await supabase.from('team_posts').insert({
    team_id: teamId,
    author_id: playerId,
    post_type: 'milestone',
    title: metadata,
    content: displayText,
    is_pinned: false,
    is_published: true,
  });

  if (__DEV__ && error) console.error('[EngagementEvents] achievement post error:', error);
}

// =============================================================================
// Auto-post: Level Up → Team Wall
// =============================================================================

export async function postLevelUpToWall(params: {
  playerId: string;
  playerName: string;
  teamId: string;
  newLevel: number;
  totalXp: number;
}): Promise<void> {
  const { playerId, playerName, teamId, newLevel, totalXp } = params;
  const tier = getLevelTier(newLevel);

  const displayText = `${playerName} reached Level ${newLevel}! ${tier.name} tier`;
  const metadata = JSON.stringify({
    type: 'level_up',
    playerId,
    playerName,
    newLevel,
    totalXp,
    tierName: tier.name,
    tierColor: tier.color,
  });

  const { error } = await supabase.from('team_posts').insert({
    team_id: teamId,
    author_id: playerId,
    post_type: 'milestone',
    title: metadata,
    content: displayText,
    is_pinned: false,
    is_published: true,
  });

  if (__DEV__ && error) console.error('[EngagementEvents] level-up post error:', error);
}

// =============================================================================
// Auto-post: Challenge Milestone → Team Wall
// =============================================================================

export async function postChallengeMilestoneToWall(params: {
  challengeId: string;
  challengeTitle: string;
  teamId: string;
  coachId: string;
  milestoneText: string; // e.g. "50% of the team has joined!"
}): Promise<void> {
  const { challengeId, challengeTitle, teamId, coachId, milestoneText } = params;

  const displayText = `Challenge "${challengeTitle}" — ${milestoneText}`;
  const metadata = JSON.stringify({
    type: 'challenge_milestone',
    challengeId,
    challengeTitle,
    milestoneText,
  });

  const { error } = await supabase.from('team_posts').insert({
    team_id: teamId,
    author_id: coachId,
    post_type: 'milestone',
    title: metadata,
    content: displayText,
    is_pinned: false,
    is_published: true,
  });

  if (__DEV__ && error) console.error('[EngagementEvents] challenge milestone post error:', error);
}

// =============================================================================
// Auto-post: Challenge Completion → Team Wall
// =============================================================================

export async function postChallengeCompletionToWall(params: {
  challengeId: string;
  challengeTitle: string;
  teamId: string;
  playerId: string;
  playerName: string;
  xpEarned: number;
}): Promise<void> {
  const { challengeId, challengeTitle, teamId, playerId, playerName, xpEarned } = params;

  const displayText = `${playerName} completed the challenge "${challengeTitle}" and earned +${xpEarned} XP!`;
  const metadata = JSON.stringify({
    type: 'challenge_completion',
    challengeId,
    challengeTitle,
    playerId,
    playerName,
    xpEarned,
  });

  const { error } = await supabase.from('team_posts').insert({
    team_id: teamId,
    author_id: playerId,
    post_type: 'milestone',
    title: metadata,
    content: displayText,
    is_pinned: false,
    is_published: true,
  });

  if (__DEV__ && error) console.error('[EngagementEvents] challenge completion post error:', error);
}

// =============================================================================
// Auto-post: Challenge Winner → Team Wall
// =============================================================================

export async function postChallengeWinnerToWall(params: {
  challengeId: string;
  challengeTitle: string;
  teamId: string;
  coachId: string;
  winnerId: string;
  winnerName: string;
  completedCount: number;
  totalParticipants: number;
}): Promise<void> {
  const { challengeId, challengeTitle, teamId, coachId, winnerId, winnerName, completedCount, totalParticipants } = params;

  const displayText = winnerId
    ? `Challenge "${challengeTitle}" is complete! Winner: ${winnerName}! ${completedCount}/${totalParticipants} players finished.`
    : `Challenge "${challengeTitle}" is complete! ${completedCount}/${totalParticipants} players finished.`;
  const metadata = JSON.stringify({
    type: 'challenge_winner',
    challengeId,
    challengeTitle,
    winnerId,
    winnerName,
    completedCount,
    totalParticipants,
  });

  const { error } = await supabase.from('team_posts').insert({
    team_id: teamId,
    author_id: coachId,
    post_type: 'milestone',
    title: metadata,
    content: displayText,
    is_pinned: false,
    is_published: true,
  });

  if (__DEV__ && error) console.error('[EngagementEvents] challenge winner post error:', error);
}

// =============================================================================
// Progress Nudges — achievements at 80%+ completion
// =============================================================================

export type ProgressNudge = {
  achievementId: string;
  achievementName: string;
  achievementIcon: string | null;
  currentValue: number;
  targetValue: number;
  pct: number;
};

export async function getProgressNudges(
  playerId: string,
  allStats: Record<string, number>,
): Promise<ProgressNudge[]> {
  try {
    // Get all active achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true);

    if (!achievements) return [];

    // Get already earned
    const { data: earned } = await supabase
      .from('player_achievements')
      .select('achievement_id')
      .eq('player_id', playerId);
    const earnedSet = new Set((earned || []).map((e) => e.achievement_id));

    const nudges: ProgressNudge[] = [];

    for (const ach of achievements as AchievementFull[]) {
      if (earnedSet.has(ach.id)) continue;
      if (ach.threshold == null || ach.threshold <= 0) continue;
      if (!ach.stat_key) continue;

      const current = allStats[ach.stat_key] ?? 0;
      const pct = (current / ach.threshold) * 100;

      if (pct >= 80 && pct < 100) {
        nudges.push({
          achievementId: ach.id,
          achievementName: ach.name,
          achievementIcon: ach.icon,
          currentValue: current,
          targetValue: ach.threshold,
          pct: Math.round(pct),
        });
      }
    }

    return nudges.sort((a, b) => b.pct - a.pct);
  } catch (err) {
    if (__DEV__) console.error('[EngagementEvents] getProgressNudges error:', err);
    return [];
  }
}
