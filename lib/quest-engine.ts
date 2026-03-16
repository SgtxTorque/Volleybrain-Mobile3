import { supabase } from '@/lib/supabase';
import { recordQualifyingAction } from '@/lib/streak-engine';

// ─── Types ───────────────────────────────────────────────────────────────────

export type QuestType =
  | 'app_checkin'
  | 'skill_tip'
  | 'drill_completion'
  | 'social_action'
  | 'quiz'
  | 'attendance'
  | 'stats_check';

export type VerificationType =
  | 'automatic'
  | 'self_report'
  | 'coach_verified'
  | 'content_viewed';

export interface DailyQuest {
  id: string;
  player_id: string;
  team_id: string | null;
  quest_date: string;
  quest_type: QuestType;
  title: string;
  description: string | null;
  xp_reward: number;
  verification_type: VerificationType;
  target_value: number;
  current_value: number;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

export type WeeklyQuestType =
  | 'attendance'
  | 'skill_module'
  | 'game_performance'
  | 'community'
  | 'consistency';

export interface WeeklyQuest {
  id: string;
  player_id: string;
  team_id: string | null;
  week_start: string;
  quest_type: WeeklyQuestType;
  title: string;
  description: string | null;
  xp_reward: number;
  verification_type: VerificationType;
  target_value: number;
  current_value: number;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

export interface QuestContext {
  profileId: string;
  playerId: string | null;
  teamIds: string[];
  primaryTeamId: string | null;
  hasEventToday: boolean;
  eventType: string | null;
  eventId: string | null;
  hasActiveChallenge: boolean;
  hasRecentShoutout: boolean;
  hasRecentBadge: boolean;
  recentBadgeName: string | null;
}

// ─── XP Level Curve ──────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS: { level: number; xpRequired: number; cumulative: number; tier: string }[] = [
  { level: 1, xpRequired: 0, cumulative: 0, tier: 'Rookie' },
  { level: 2, xpRequired: 100, cumulative: 100, tier: 'Rookie' },
  { level: 3, xpRequired: 200, cumulative: 300, tier: 'Rookie' },
  { level: 4, xpRequired: 300, cumulative: 600, tier: 'Rookie' },
  { level: 5, xpRequired: 400, cumulative: 800, tier: 'Bronze' },
  { level: 6, xpRequired: 500, cumulative: 1300, tier: 'Bronze' },
  { level: 7, xpRequired: 600, cumulative: 1900, tier: 'Bronze' },
  { level: 8, xpRequired: 700, cumulative: 2500, tier: 'Bronze' },
  { level: 9, xpRequired: 800, cumulative: 3300, tier: 'Bronze' },
  { level: 10, xpRequired: 1000, cumulative: 4500, tier: 'Silver' },
  { level: 11, xpRequired: 1100, cumulative: 5600, tier: 'Silver' },
  { level: 12, xpRequired: 1200, cumulative: 6800, tier: 'Silver' },
  { level: 13, xpRequired: 1300, cumulative: 8100, tier: 'Silver' },
  { level: 14, xpRequired: 1400, cumulative: 9500, tier: 'Silver' },
  { level: 15, xpRequired: 1500, cumulative: 10000, tier: 'Gold' },
  { level: 16, xpRequired: 1600, cumulative: 11600, tier: 'Gold' },
  { level: 17, xpRequired: 1700, cumulative: 13300, tier: 'Gold' },
  { level: 18, xpRequired: 1800, cumulative: 15100, tier: 'Gold' },
  { level: 19, xpRequired: 1900, cumulative: 17000, tier: 'Gold' },
  { level: 20, xpRequired: 2000, cumulative: 18000, tier: 'Platinum' },
  { level: 21, xpRequired: 2100, cumulative: 20100, tier: 'Platinum' },
  { level: 22, xpRequired: 2200, cumulative: 22300, tier: 'Platinum' },
  { level: 23, xpRequired: 2300, cumulative: 24600, tier: 'Platinum' },
  { level: 24, xpRequired: 2400, cumulative: 27000, tier: 'Platinum' },
  { level: 25, xpRequired: 2500, cumulative: 28000, tier: 'Diamond' },
  { level: 26, xpRequired: 2600, cumulative: 30600, tier: 'Diamond' },
  { level: 27, xpRequired: 2700, cumulative: 33300, tier: 'Diamond' },
  { level: 28, xpRequired: 2800, cumulative: 36100, tier: 'Diamond' },
  { level: 29, xpRequired: 2900, cumulative: 39000, tier: 'Diamond' },
  { level: 30, xpRequired: 3000, cumulative: 40000, tier: 'Legend' },
];

export function calculateLevel(totalXp: number): { level: number; tier: string; xpToNext: number } {
  let result = { level: 1, tier: 'Rookie', xpToNext: 100 };
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i].cumulative) {
      const current = LEVEL_THRESHOLDS[i];
      const next = LEVEL_THRESHOLDS[i + 1];
      result = {
        level: current.level,
        tier: current.tier,
        xpToNext: next ? next.cumulative - totalXp : 0,
      };
      break;
    }
  }
  return result;
}

// ─── Date Helpers ────────────────────────────────────────────────────────────
// Matches the localToday() pattern used across the app (device local time)

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hoursAgo(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function localMondayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function sundayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Sunday
  const sunday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
}

// ─── Context Gathering ───────────────────────────────────────────────────────
// Fetches all data needed to decide which quests to generate.
// Resolves profiles.id -> players.id bridge ONCE here.

export async function gatherQuestContext(profileId: string): Promise<QuestContext> {
  const today = localToday();

  // Step 1: Resolve profiles.id -> players.id
  const { data: playerData } = await supabase
    .from('players')
    .select('id')
    .eq('parent_account_id', profileId)
    .limit(1)
    .maybeSingle();

  const playerId = playerData?.id || null;

  // Step 2: Get team IDs (via team_players if we have a player record)
  let teamIds: string[] = [];
  let primaryTeamId: string | null = null;

  if (playerId) {
    const { data: teamData } = await supabase
      .from('team_players')
      .select('team_id')
      .eq('player_id', playerId);

    teamIds = (teamData || []).map((t: { team_id: string }) => t.team_id);
    primaryTeamId = teamIds[0] || null;
  }

  // Step 3: Check for event today
  let hasEventToday = false;
  let eventType: string | null = null;
  let eventId: string | null = null;

  if (teamIds.length > 0) {
    const { data: eventData } = await supabase
      .from('schedule_events')
      .select('id, event_type')
      .in('team_id', teamIds)
      .eq('event_date', today)
      .limit(1)
      .maybeSingle();

    if (eventData) {
      hasEventToday = true;
      eventType = eventData.event_type;
      eventId = eventData.id;
    }
  }

  // Step 4: Check for active coach challenges
  let hasActiveChallenge = false;
  if (primaryTeamId) {
    const { count } = await supabase
      .from('coach_challenges')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', primaryTeamId)
      .eq('status', 'active');

    hasActiveChallenge = (count ?? 0) > 0;
  }

  // Step 5: Check for recent shoutout given (last 24 hours)
  const { count: shoutoutCount } = await supabase
    .from('shoutouts')
    .select('id', { count: 'exact', head: true })
    .eq('giver_id', profileId)
    .gte('created_at', hoursAgo(24));

  const hasRecentShoutout = (shoutoutCount ?? 0) > 0;

  // Step 6: Check for recent badge (last 7 days)
  let hasRecentBadge = false;
  let recentBadgeName: string | null = null;

  if (playerId) {
    const { data: badgeData } = await supabase
      .from('player_achievements')
      .select('id, achievement:achievement_id(name)')
      .eq('player_id', playerId)
      .gte('earned_at', daysAgo(7))
      .order('earned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (badgeData) {
      hasRecentBadge = true;
      recentBadgeName = (badgeData as any)?.achievement?.name || null;
    }
  }

  return {
    profileId,
    playerId,
    teamIds,
    primaryTeamId,
    hasEventToday,
    eventType,
    eventId,
    hasActiveChallenge,
    hasRecentShoutout,
    hasRecentBadge,
    recentBadgeName,
  };
}

// ─── Quest Generation ────────────────────────────────────────────────────────
// Generates 3 contextual daily quests. Mirrors the logic from the old
// buildQuests() in PlayerDailyQuests.tsx but writes to the database.

function generateDailyQuestDefinitions(ctx: QuestContext): Omit<DailyQuest, 'id' | 'created_at'>[] {
  const today = localToday();
  const quests: Omit<DailyQuest, 'id' | 'created_at'>[] = [];

  // ── Quest 1: Always "Open Lynx today" (auto-completed on generation) ──
  quests.push({
    player_id: ctx.profileId,
    team_id: ctx.primaryTeamId,
    quest_date: today,
    quest_type: 'app_checkin',
    title: 'Open Lynx today',
    description: 'Just showing up is half the battle.',
    xp_reward: 5,
    verification_type: 'automatic',
    target_value: 1,
    current_value: 1,
    is_completed: true,
    completed_at: new Date().toISOString(),
    sort_order: 0,
  });

  // ── Quest 2: Contextual (event > challenge > stats) ──
  if (ctx.hasEventToday) {
    const label = ctx.eventType === 'game' ? 'game' : 'practice';
    quests.push({
      player_id: ctx.profileId,
      team_id: ctx.primaryTeamId,
      quest_date: today,
      quest_type: 'attendance',
      title: `Show up to ${label} today`,
      description: ctx.eventType === 'game'
        ? 'Be there for your team when it counts.'
        : 'Reps make the difference.',
      xp_reward: 20,
      verification_type: 'coach_verified',
      target_value: 1,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      sort_order: 1,
    });
  } else if (ctx.hasActiveChallenge) {
    quests.push({
      player_id: ctx.profileId,
      team_id: ctx.primaryTeamId,
      quest_date: today,
      quest_type: 'drill_completion',
      title: 'Work on your active challenge',
      description: 'Every rep brings you closer.',
      xp_reward: 15,
      verification_type: 'self_report',
      target_value: 1,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      sort_order: 1,
    });
  } else {
    quests.push({
      player_id: ctx.profileId,
      team_id: ctx.primaryTeamId,
      quest_date: today,
      quest_type: 'stats_check',
      title: 'Check your stats',
      description: 'Know your numbers, know your game.',
      xp_reward: 10,
      verification_type: 'automatic',
      target_value: 1,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      sort_order: 1,
    });
  }

  // ── Quest 3: Social/Recognition ──
  if (!ctx.hasRecentShoutout) {
    quests.push({
      player_id: ctx.profileId,
      team_id: ctx.primaryTeamId,
      quest_date: today,
      quest_type: 'social_action',
      title: 'Give a teammate props',
      description: 'Recognize someone who deserves it.',
      xp_reward: 10,
      verification_type: 'automatic',
      target_value: 1,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      sort_order: 2,
    });
  } else if (ctx.hasRecentBadge) {
    quests.push({
      player_id: ctx.profileId,
      team_id: ctx.primaryTeamId,
      quest_date: today,
      quest_type: 'stats_check',
      title: ctx.recentBadgeName
        ? `Check out your ${ctx.recentBadgeName} badge`
        : 'View your new badge',
      description: 'You earned it. Go admire it.',
      xp_reward: 5,
      verification_type: 'automatic',
      target_value: 1,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      sort_order: 2,
    });
  } else {
    quests.push({
      player_id: ctx.profileId,
      team_id: ctx.primaryTeamId,
      quest_date: today,
      quest_type: 'stats_check',
      title: 'Check the leaderboard',
      description: 'See where you stand.',
      xp_reward: 10,
      verification_type: 'automatic',
      target_value: 1,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      sort_order: 2,
    });
  }

  return quests;
}

// ─── Main Entry Point ────────────────────────────────────────────────────────
// Called by the hook on home screen mount. Returns today's 3 quests.
// If they don't exist yet, generates and inserts them first.

export async function getOrCreateDailyQuests(profileId: string): Promise<DailyQuest[]> {
  const today = localToday();

  // Check if today's quests already exist
  const { data: existing, error: fetchError } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('player_id', profileId)
    .eq('quest_date', today)
    .order('sort_order', { ascending: true });

  if (fetchError) {
    console.error('[quest-engine] Error fetching daily quests:', fetchError);
    return [];
  }

  // If quests exist for today, return them
  if (existing && existing.length > 0) {
    return existing as DailyQuest[];
  }

  // Generate new quests
  const ctx = await gatherQuestContext(profileId);
  const questDefs = generateDailyQuestDefinitions(ctx);

  // Insert into database
  const { data: inserted, error: insertError } = await supabase
    .from('daily_quests')
    .insert(questDefs)
    .select('*');

  if (insertError) {
    console.error('[quest-engine] Error inserting daily quests:', insertError);
    // Return the definitions as fallback (display-only, no DB persistence)
    return questDefs.map((q, i) => ({
      ...q,
      id: `temp-${i}`,
      created_at: new Date().toISOString(),
    })) as unknown as DailyQuest[];
  }

  return (inserted || []) as DailyQuest[];
}

// ─── Quest Completion ────────────────────────────────────────────────────────

export async function completeQuest(questId: string, profileId: string): Promise<{
  success: boolean;
  xpAwarded: number;
  allComplete: boolean;
  bonusAwarded: boolean;
  newTotalXp: number;
  newLevel: number;
  newTier: string;
  newStreak: number;
  streakMilestone: number | null;
  streakFreezeAwarded: boolean;
}> {
  // Step 1: Mark quest as completed
  const { data: quest, error: updateError } = await supabase
    .from('daily_quests')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      current_value: 1,
    })
    .eq('id', questId)
    .eq('player_id', profileId)
    .select('*')
    .single();

  if (updateError || !quest) {
    console.error('[quest-engine] Error completing quest:', updateError);
    return { success: false, xpAwarded: 0, allComplete: false, bonusAwarded: false, newTotalXp: 0, newLevel: 1, newTier: 'Rookie', newStreak: 0, streakMilestone: null, streakFreezeAwarded: false };
  }

  // Step 2: Award XP
  const xpResult = await awardXp(profileId, quest.xp_reward, 'quest_daily', questId, quest.team_id);

  // Step 2.5: Record qualifying action for streak
  const streakResult = await recordQualifyingAction(profileId);

  // Step 2.7: Update weekly consistency quest progress
  // Count how many unique days this week the player completed at least 1 daily quest
  const weekStart = localMondayOfWeek();
  const { data: completedDays } = await supabase
    .from('daily_quests')
    .select('quest_date')
    .eq('player_id', profileId)
    .gte('quest_date', weekStart)
    .eq('is_completed', true);

  if (completedDays) {
    const uniqueDays = new Set(completedDays.map((d: { quest_date: string }) => d.quest_date)).size;
    // Directly update the consistency quest's current_value
    await supabase
      .from('weekly_quests')
      .update({ current_value: uniqueDays })
      .eq('player_id', profileId)
      .eq('week_start', weekStart)
      .eq('quest_type', 'consistency')
      .eq('is_completed', false);

    // Check if consistency quest is now complete
    if (uniqueDays >= 5) {
      const { data: consistencyQuest } = await supabase
        .from('weekly_quests')
        .select('id')
        .eq('player_id', profileId)
        .eq('week_start', weekStart)
        .eq('quest_type', 'consistency')
        .eq('is_completed', false)
        .maybeSingle();

      if (consistencyQuest) {
        await completeWeeklyQuest(consistencyQuest.id, profileId);
      }
    }
  }

  // Step 3: Check if all 3 daily quests are now complete
  const today = localToday();
  const { data: allQuests } = await supabase
    .from('daily_quests')
    .select('is_completed')
    .eq('player_id', profileId)
    .eq('quest_date', today);

  const allComplete = (allQuests || []).every((q: { is_completed: boolean }) => q.is_completed);
  let bonusAwarded = false;

  if (allComplete) {
    // Check if bonus was already awarded today
    const { data: existingBonus } = await supabase
      .from('quest_bonus_tracking')
      .select('id')
      .eq('player_id', profileId)
      .eq('bonus_type', 'daily_all_complete')
      .eq('period_date', today)
      .maybeSingle();

    if (!existingBonus) {
      // Award 25 XP bonus
      await awardXp(profileId, 25, 'quest_bonus', null, quest.team_id);

      await supabase.from('quest_bonus_tracking').insert({
        player_id: profileId,
        bonus_type: 'daily_all_complete',
        period_date: today,
        xp_awarded: 25,
      });

      bonusAwarded = true;
    }
  }

  return {
    success: true,
    xpAwarded: quest.xp_reward,
    allComplete,
    bonusAwarded,
    newTotalXp: xpResult.newTotalXp,
    newLevel: xpResult.newLevel,
    newTier: xpResult.newTier,
    newStreak: streakResult.newStreak,
    streakMilestone: streakResult.milestoneReached,
    streakFreezeAwarded: streakResult.freezeAwarded,
  };
}

// ─── XP Award ────────────────────────────────────────────────────────────────
// Writes to xp_ledger and updates profiles.total_xp / player_level / tier.

async function awardXp(
  profileId: string,
  amount: number,
  sourceType: string,
  sourceId: string | null,
  teamId: string | null,
): Promise<{ newTotalXp: number; newLevel: number; newTier: string }> {
  // Check for active XP boost
  let multiplier = 1.0;
  const now = new Date().toISOString();

  const { data: boosts } = await supabase
    .from('xp_boost_events')
    .select('multiplier, applicable_sources')
    .or(`team_id.is.null,team_id.eq.${teamId}`)
    .lte('starts_at', now)
    .gte('ends_at', now);

  if (boosts && boosts.length > 0) {
    for (const boost of boosts) {
      // If applicable_sources is null, boost applies to everything
      // If it's an array, check if our sourceType is in it
      if (!boost.applicable_sources || boost.applicable_sources.includes(sourceType)) {
        multiplier = Math.max(multiplier, Number(boost.multiplier));
      }
    }
  }

  const finalAmount = Math.round(amount * multiplier);

  // Write to xp_ledger
  await supabase.from('xp_ledger').insert({
    player_id: profileId,
    xp_amount: finalAmount,
    source_type: sourceType,
    source_id: sourceId,
    description: `Quest reward: ${finalAmount} XP${multiplier > 1 ? ` (${multiplier}x boost)` : ''}`,
    team_id: teamId,
    multiplier: multiplier,
  });

  // Get current total XP
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', profileId)
    .maybeSingle();

  const currentXp = profile?.total_xp || 0;
  const newTotalXp = currentXp + finalAmount;
  const { level, tier, xpToNext } = calculateLevel(newTotalXp);

  // Update profiles
  await supabase
    .from('profiles')
    .update({
      total_xp: newTotalXp,
      player_level: level,
      tier: tier,
      xp_to_next_level: xpToNext,
    })
    .eq('id', profileId);

  return { newTotalXp, newLevel: level, newTier: tier };
}

// ─── Weekly Quest Context ────────────────────────────────────────────────────

async function gatherWeeklyContext(profileId: string, playerId: string | null, teamIds: string[]): Promise<{
  practicesThisWeek: number;
  gamesThisWeek: number;
  hasActiveChallenge: boolean;
  shoutoutsGivenThisWeek: number;
  dailyQuestsCompletedThisWeek: number;
}> {
  const mondayStr = localMondayOfWeek();

  // Count practices and games scheduled this week
  let practicesThisWeek = 0;
  let gamesThisWeek = 0;
  if (teamIds.length > 0) {
    const { data: events } = await supabase
      .from('schedule_events')
      .select('event_type')
      .in('team_id', teamIds)
      .gte('event_date', mondayStr)
      .lte('event_date', sundayOfWeek());

    if (events) {
      practicesThisWeek = events.filter((e: { event_type: string }) => e.event_type === 'practice').length;
      gamesThisWeek = events.filter((e: { event_type: string }) => e.event_type === 'game').length;
    }
  }

  // Check active challenges
  let hasActiveChallenge = false;
  if (teamIds.length > 0) {
    const { count } = await supabase
      .from('coach_challenges')
      .select('id', { count: 'exact', head: true })
      .in('team_id', teamIds)
      .eq('status', 'active');
    hasActiveChallenge = (count ?? 0) > 0;
  }

  // Shoutouts given this week
  const { count: shoutoutCount } = await supabase
    .from('shoutouts')
    .select('id', { count: 'exact', head: true })
    .eq('giver_id', profileId)
    .gte('created_at', new Date(mondayStr + 'T00:00:00').toISOString());

  // Daily quests completed this week
  const { count: questCount } = await supabase
    .from('daily_quests')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', profileId)
    .gte('quest_date', mondayStr)
    .eq('is_completed', true);

  return {
    practicesThisWeek,
    gamesThisWeek,
    hasActiveChallenge,
    shoutoutsGivenThisWeek: shoutoutCount ?? 0,
    dailyQuestsCompletedThisWeek: questCount ?? 0,
  };
}

// ─── Weekly Quest Generation ─────────────────────────────────────────────────

function generateWeeklyQuestDefinitions(
  profileId: string,
  primaryTeamId: string | null,
  weeklyCtx: Awaited<ReturnType<typeof gatherWeeklyContext>>
): Omit<WeeklyQuest, 'id' | 'created_at'>[] {
  const weekStart = localMondayOfWeek();
  const quests: Omit<WeeklyQuest, 'id' | 'created_at'>[] = [];
  let sortOrder = 0;

  // ── Quest 1: Attendance (always present if practices/games exist) ──
  if (weeklyCtx.practicesThisWeek > 0 || weeklyCtx.gamesThisWeek > 0) {
    const totalEvents = weeklyCtx.practicesThisWeek + weeklyCtx.gamesThisWeek;
    const target = Math.min(totalEvents, 3);
    quests.push({
      player_id: profileId,
      team_id: primaryTeamId,
      week_start: weekStart,
      quest_type: 'attendance',
      title: target === 1 ? 'Attend practice or game this week' : `Attend ${target} events this week`,
      description: 'Show up and put in the work.',
      xp_reward: target === 1 ? 30 : 50,
      verification_type: 'coach_verified',
      target_value: target,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      sort_order: sortOrder++,
    });
  }

  // ── Quest 2: Community (shoutouts) ──
  quests.push({
    player_id: profileId,
    team_id: primaryTeamId,
    week_start: weekStart,
    quest_type: 'community',
    title: 'Give 3 shoutouts this week',
    description: 'Lift your teammates up.',
    xp_reward: 25,
    verification_type: 'automatic',
    target_value: 3,
    current_value: weeklyCtx.shoutoutsGivenThisWeek,
    is_completed: weeklyCtx.shoutoutsGivenThisWeek >= 3,
    completed_at: weeklyCtx.shoutoutsGivenThisWeek >= 3 ? new Date().toISOString() : null,
    sort_order: sortOrder++,
  });

  // ── Quest 3: Consistency (complete daily quests) ──
  quests.push({
    player_id: profileId,
    team_id: primaryTeamId,
    week_start: weekStart,
    quest_type: 'consistency',
    title: 'Complete daily quests 5 of 7 days',
    description: 'Consistency beats everything.',
    xp_reward: 60,
    verification_type: 'automatic',
    target_value: 5,
    current_value: 0,
    is_completed: false,
    completed_at: null,
    sort_order: sortOrder++,
  });

  // ── Quest 4 (conditional): Game performance ──
  if (weeklyCtx.gamesThisWeek > 0) {
    quests.push({
      player_id: profileId,
      team_id: primaryTeamId,
      week_start: weekStart,
      quest_type: 'game_performance',
      title: 'Play in a game this week',
      description: 'Step on the court and compete.',
      xp_reward: 30,
      verification_type: 'automatic',
      target_value: 1,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      sort_order: sortOrder++,
    });
  }

  // ── Quest 5 (conditional): Skill module ──
  if (weeklyCtx.gamesThisWeek === 0) {
    quests.push({
      player_id: profileId,
      team_id: primaryTeamId,
      week_start: weekStart,
      quest_type: 'skill_module',
      title: 'Complete a skill module',
      description: 'Learn something new this week.',
      xp_reward: 40,
      verification_type: 'automatic',
      target_value: 1,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      sort_order: sortOrder++,
    });
  }

  return quests;
}

// ─── Weekly Quest Entry Points ───────────────────────────────────────────────

export async function getOrCreateWeeklyQuests(profileId: string): Promise<WeeklyQuest[]> {
  const weekStart = localMondayOfWeek();

  const { data: existing, error: fetchError } = await supabase
    .from('weekly_quests')
    .select('*')
    .eq('player_id', profileId)
    .eq('week_start', weekStart)
    .order('sort_order', { ascending: true });

  if (fetchError) {
    console.error('[quest-engine] Error fetching weekly quests:', fetchError);
    return [];
  }

  if (existing && existing.length > 0) {
    return existing as WeeklyQuest[];
  }

  const ctx = await gatherQuestContext(profileId);
  const weeklyCtx = await gatherWeeklyContext(profileId, ctx.playerId, ctx.teamIds);
  const questDefs = generateWeeklyQuestDefinitions(profileId, ctx.primaryTeamId, weeklyCtx);

  const { data: inserted, error: insertError } = await supabase
    .from('weekly_quests')
    .insert(questDefs)
    .select('*');

  if (insertError) {
    console.error('[quest-engine] Error inserting weekly quests:', insertError);
    return questDefs.map((q, i) => ({
      ...q,
      id: `temp-weekly-${i}`,
      created_at: new Date().toISOString(),
    })) as unknown as WeeklyQuest[];
  }

  return (inserted || []) as WeeklyQuest[];
}

export async function completeWeeklyQuest(questId: string, profileId: string): Promise<{
  success: boolean;
  xpAwarded: number;
  allComplete: boolean;
  bonusAwarded: boolean;
  newTotalXp: number;
  newLevel: number;
  newTier: string;
}> {
  const { data: quest, error: updateError } = await supabase
    .from('weekly_quests')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', questId)
    .eq('player_id', profileId)
    .select('*')
    .single();

  if (updateError || !quest) {
    console.error('[quest-engine] Error completing weekly quest:', updateError);
    return { success: false, xpAwarded: 0, allComplete: false, bonusAwarded: false, newTotalXp: 0, newLevel: 1, newTier: 'Rookie' };
  }

  const xpResult = await awardXp(profileId, quest.xp_reward, 'quest_weekly', questId, quest.team_id);

  const weekStart = localMondayOfWeek();
  const { data: allQuests } = await supabase
    .from('weekly_quests')
    .select('is_completed')
    .eq('player_id', profileId)
    .eq('week_start', weekStart);

  const allComplete = (allQuests || []).every((q: { is_completed: boolean }) => q.is_completed);
  let bonusAwarded = false;

  if (allComplete) {
    const { data: existingBonus } = await supabase
      .from('quest_bonus_tracking')
      .select('id')
      .eq('player_id', profileId)
      .eq('bonus_type', 'weekly_all_complete')
      .eq('period_date', weekStart)
      .maybeSingle();

    if (!existingBonus) {
      await awardXp(profileId, 50, 'quest_bonus', null, quest.team_id);
      await supabase.from('quest_bonus_tracking').insert({
        player_id: profileId,
        bonus_type: 'weekly_all_complete',
        period_date: weekStart,
        xp_awarded: 50,
      });
      bonusAwarded = true;
    }
  }

  return {
    success: true,
    xpAwarded: quest.xp_reward,
    allComplete,
    bonusAwarded,
    newTotalXp: xpResult.newTotalXp,
    newLevel: xpResult.newLevel,
    newTier: xpResult.newTier,
  };
}

export async function updateWeeklyQuestProgress(
  profileId: string,
  questType: WeeklyQuestType,
  incrementBy: number = 1
): Promise<{ questCompleted: boolean; questId: string | null }> {
  const weekStart = localMondayOfWeek();

  const { data: quest } = await supabase
    .from('weekly_quests')
    .select('*')
    .eq('player_id', profileId)
    .eq('week_start', weekStart)
    .eq('quest_type', questType)
    .eq('is_completed', false)
    .maybeSingle();

  if (!quest) return { questCompleted: false, questId: null };

  const newValue = Math.min(quest.current_value + incrementBy, quest.target_value);
  const nowComplete = newValue >= quest.target_value;

  await supabase
    .from('weekly_quests')
    .update({
      current_value: newValue,
      ...(nowComplete ? { is_completed: true, completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', quest.id);

  if (nowComplete) {
    await completeWeeklyQuest(quest.id, profileId);
  }

  return { questCompleted: nowComplete, questId: quest.id };
}
