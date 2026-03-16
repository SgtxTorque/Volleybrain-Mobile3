import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TeamQuest {
  id: string;
  team_id: string;
  quest_type: string;
  title: string;
  description: string | null;
  xp_reward_per_player: number;
  target_value: number;
  current_value: number;
  is_completed: boolean;
  completed_at: string | null;
  week_start: string;
  is_auto_generated: boolean;
  contributions?: TeamQuestContribution[];
}

export interface TeamQuestContribution {
  player_id: string;
  player_name: string;
  contribution_value: number;
}

// ─── Date Helper ─────────────────────────────────────────────────────────────

function localMondayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

// ─── Get or Create Weekly Team Quests ────────────────────────────────────────

export async function getOrCreateTeamQuests(teamId: string): Promise<TeamQuest[]> {
  const weekStart = localMondayOfWeek();

  // Check for existing
  const { data: existing } = await supabase
    .from('team_quests')
    .select('*')
    .eq('team_id', teamId)
    .eq('week_start', weekStart)
    .order('created_at', { ascending: true });

  if (existing && existing.length > 0) {
    return existing as TeamQuest[];
  }

  // Auto-generate 2 team quests for the week
  const quests: any[] = [];

  // Quest 1: Team attendance
  // Check how many events this week
  const sunday = sundayOfWeek();
  const { data: events } = await supabase
    .from('schedule_events')
    .select('id')
    .eq('team_id', teamId)
    .gte('event_date', weekStart)
    .lte('event_date', sunday);

  const eventCount = events?.length || 0;

  if (eventCount > 0) {
    // Get team size for target calculation
    const { data: teamPlayers } = await supabase
      .from('team_players')
      .select('id')
      .eq('team_id', teamId);

    const teamSize = teamPlayers?.length || 1;
    // Target: 80% of team attends at least 1 event
    const attendanceTarget = Math.max(Math.ceil(teamSize * 0.8), 2);

    quests.push({
      team_id: teamId,
      quest_type: 'team_attendance',
      title: `${attendanceTarget} players attend this week`,
      description: 'Show up as a squad.',
      xp_reward_per_player: 50,
      target_value: attendanceTarget,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      week_start: weekStart,
      is_auto_generated: true,
      created_by: null,
    });
  }

  // Quest 2: Team shoutouts
  quests.push({
    team_id: teamId,
    quest_type: 'team_shoutouts',
    title: 'Team gives 15 shoutouts this week',
    description: 'Lift each other up. Every shoutout counts.',
    xp_reward_per_player: 30,
    target_value: 15,
    current_value: 0,
    is_completed: false,
    completed_at: null,
    week_start: weekStart,
    is_auto_generated: true,
    created_by: null,
  });

  // Insert
  const { data: inserted, error } = await supabase
    .from('team_quests')
    .insert(quests)
    .select('*');

  if (error) {
    if (__DEV__) console.error('[team-quest-engine] Error creating team quests:', error);
    return [];
  }

  return (inserted || []) as TeamQuest[];
}

function sundayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  const sunday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
}

// ─── Update Team Quest Progress ──────────────────────────────────────────────

export async function updateTeamQuestProgress(
  teamId: string,
  questType: string,
  playerProfileId: string,
  incrementBy: number = 1
): Promise<{ questCompleted: boolean }> {
  const weekStart = localMondayOfWeek();

  const { data: quest } = await supabase
    .from('team_quests')
    .select('*')
    .eq('team_id', teamId)
    .eq('week_start', weekStart)
    .eq('quest_type', questType)
    .eq('is_completed', false)
    .maybeSingle();

  if (!quest) return { questCompleted: false };

  // Update individual contribution
  const { data: existingContrib } = await supabase
    .from('team_quest_contributions')
    .select('*')
    .eq('team_quest_id', quest.id)
    .eq('player_id', playerProfileId)
    .maybeSingle();

  if (existingContrib) {
    await supabase
      .from('team_quest_contributions')
      .update({
        contribution_value: existingContrib.contribution_value + incrementBy,
        last_contributed_at: new Date().toISOString(),
      })
      .eq('id', existingContrib.id);
  } else {
    await supabase
      .from('team_quest_contributions')
      .insert({
        team_quest_id: quest.id,
        player_id: playerProfileId,
        contribution_value: incrementBy,
      });
  }

  // Update team quest total
  const newValue = Math.min(quest.current_value + incrementBy, quest.target_value);
  const nowComplete = newValue >= quest.target_value;

  await supabase
    .from('team_quests')
    .update({
      current_value: newValue,
      ...(nowComplete ? { is_completed: true, completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', quest.id);

  // If completed, award XP to all team members
  if (nowComplete) {
    await awardTeamQuestXp(quest);
  }

  return { questCompleted: nowComplete };
}

// ─── Award XP to all team members ────────────────────────────────────────────

async function awardTeamQuestXp(quest: any) {
  const { data: teamPlayers } = await supabase
    .from('team_players')
    .select('players!inner(parent_account_id)')
    .eq('team_id', quest.team_id);

  if (!teamPlayers) return;

  const profileIds = teamPlayers
    .map((tp: any) => tp.players?.parent_account_id)
    .filter(Boolean);

  const { calculateLevel } = require('@/lib/quest-engine');

  for (const pid of profileIds) {
    // Write XP ledger entry
    await supabase.from('xp_ledger').insert({
      player_id: pid,
      xp_amount: quest.xp_reward_per_player,
      source_type: 'team_quest',
      source_id: quest.id,
      description: `Team quest complete: ${quest.title}`,
      team_id: quest.team_id,
    });

    // Update profiles.total_xp
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_xp')
      .eq('id', pid)
      .single();

    if (profile) {
      const newTotal = (profile.total_xp || 0) + quest.xp_reward_per_player;
      const { level, tier, xpToNext } = calculateLevel(newTotal);

      await supabase
        .from('profiles')
        .update({
          total_xp: newTotal,
          player_level: level,
          tier: tier,
          xp_to_next_level: xpToNext,
        })
        .eq('id', pid);
    }
  }
}

// ─── Get contributions with age-based visibility ─────────────────────────────
// NOTE: players table uses 'dob' column (NOT 'date_of_birth')

export async function getTeamQuestContributions(
  teamQuestId: string,
  viewerProfileId: string
): Promise<{
  contributions: TeamQuestContribution[];
  showIndividualNames: boolean;
}> {
  // Check viewer's age using players.dob
  const { data: playerData } = await supabase
    .from('players')
    .select('dob')
    .eq('parent_account_id', viewerProfileId)
    .limit(1)
    .maybeSingle();

  let showNames = true;
  if (playerData?.dob) {
    const birthDate = new Date(playerData.dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      showNames = age - 1 >= 13;
    } else {
      showNames = age >= 13;
    }
  }

  const { data: contributions } = await supabase
    .from('team_quest_contributions')
    .select('*, profile:player_id(full_name)')
    .eq('team_quest_id', teamQuestId)
    .order('contribution_value', { ascending: false });

  const mapped = (contributions || []).map((c: any) => ({
    player_id: c.player_id,
    player_name: showNames ? (c.profile?.full_name || 'Player') : 'Teammate',
    contribution_value: c.contribution_value,
  }));

  return { contributions: mapped, showIndividualNames: showNames };
}
