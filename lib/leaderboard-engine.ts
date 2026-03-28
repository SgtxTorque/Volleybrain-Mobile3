import { supabase } from '@/lib/supabase';
import { awardXP } from '@/lib/xp-award-service';

// ─── Constants ───────────────────────────────────────────────────────────────

const LEAGUE_TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'] as const;
export type LeagueTier = typeof LEAGUE_TIERS[number];

const PODIUM_XP = { 1: 50, 2: 30, 3: 20 } as const;

// ─── Date Helper ─────────────────────────────────────────────────────────────

function localMondayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function previousMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) - 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

// ─── Get or Create Weekly Standings ──────────────────────────────────────────
// Called on app open. Creates this week's standings rows if they don't exist.
// Calculates weekly XP from xp_ledger for the current week.

export async function getOrCreateWeeklyStandings(
  profileId: string,
  teamId: string
): Promise<{
  standings: LeaderboardEntry[];
  myRank: number;
  myTier: LeagueTier;
  teamSize: number;
}> {
  const weekStart = localMondayOfWeek();

  // Check if this week's standings exist for this team
  const { data: existing } = await supabase
    .from('league_standings')
    .select('*')
    .eq('team_id', teamId)
    .eq('week_start', weekStart)
    .order('weekly_xp', { ascending: false });

  if (existing && existing.length > 0) {
    // Refresh the current player's weekly XP (it may have changed since last check)
    await refreshPlayerWeeklyXp(profileId, teamId, weekStart);

    // Re-fetch with updated XP
    const { data: refreshed } = await supabase
      .from('league_standings')
      .select('*, profile:player_id(full_name)')
      .eq('team_id', teamId)
      .eq('week_start', weekStart)
      .order('weekly_xp', { ascending: false });

    const standings = (refreshed || []).map((s: any, idx: number) => ({
      ...s,
      rank: idx + 1,
      playerName: s.profile?.full_name || 'Player',
    }));

    const myEntry = standings.find((s: any) => s.player_id === profileId);

    return {
      standings,
      myRank: myEntry?.rank || 0,
      myTier: (myEntry?.league_tier || 'Bronze') as LeagueTier,
      teamSize: standings.length,
    };
  }

  // Create this week's standings for all players on the team
  // First, get all players on the team
  const { data: teamPlayers } = await supabase
    .from('team_players')
    .select('player_id, players!inner(parent_account_id)')
    .eq('team_id', teamId);

  if (!teamPlayers || teamPlayers.length === 0) {
    return { standings: [], myRank: 0, myTier: 'Bronze', teamSize: 0 };
  }

  // Get each player's profile ID and their current tier from last week
  const playerProfileIds = teamPlayers
    .map((tp: any) => tp.players?.parent_account_id)
    .filter(Boolean);

  // Get last week's standings for tier carryover
  const lastWeek = previousMonday();
  const { data: lastWeekStandings } = await supabase
    .from('league_standings')
    .select('player_id, league_tier')
    .eq('team_id', teamId)
    .eq('week_start', lastWeek);

  const lastTierMap: Record<string, string> = {};
  if (lastWeekStandings) {
    lastWeekStandings.forEach((s: any) => {
      lastTierMap[s.player_id] = s.league_tier;
    });
  }

  // Calculate weekly XP for each player from xp_ledger
  const weekStartDate = new Date(weekStart + 'T00:00:00').toISOString();
  const rows: any[] = [];

  for (const pid of playerProfileIds) {
    const { data: xpData } = await supabase
      .from('xp_ledger')
      .select('xp_amount')
      .eq('player_id', pid)
      .gte('created_at', weekStartDate);

    const weeklyXp = (xpData || []).reduce((sum: number, row: any) => sum + (row.xp_amount || 0), 0);
    const tier = lastTierMap[pid] || 'Bronze';

    rows.push({
      player_id: pid,
      team_id: teamId,
      league_tier: tier,
      week_start: weekStart,
      weekly_xp: weeklyXp,
      rank_in_team: null,
      promotion_status: 'none',
    });
  }

  // Sort by XP and assign ranks
  rows.sort((a, b) => b.weekly_xp - a.weekly_xp);
  rows.forEach((row, idx) => { row.rank_in_team = idx + 1; });

  // Insert
  const { error: insertError } = await supabase
    .from('league_standings')
    .upsert(rows, { onConflict: 'player_id,team_id,week_start' });

  if (insertError) {
    if (__DEV__) console.error('[leaderboard-engine] Error creating standings:', insertError);
  }

  // Fetch with profile names
  const { data: final } = await supabase
    .from('league_standings')
    .select('*, profile:player_id(full_name)')
    .eq('team_id', teamId)
    .eq('week_start', weekStart)
    .order('weekly_xp', { ascending: false });

  const standings = (final || []).map((s: any, idx: number) => ({
    ...s,
    rank: idx + 1,
    playerName: s.profile?.full_name || 'Player',
  }));

  const myEntry = standings.find((s: any) => s.player_id === profileId);

  return {
    standings,
    myRank: myEntry?.rank || 0,
    myTier: (myEntry?.league_tier || 'Bronze') as LeagueTier,
    teamSize: standings.length,
  };
}

// ─── Refresh a single player's weekly XP ─────────────────────────────────────

async function refreshPlayerWeeklyXp(profileId: string, teamId: string, weekStart: string) {
  const weekStartDate = new Date(weekStart + 'T00:00:00').toISOString();

  const { data: xpData } = await supabase
    .from('xp_ledger')
    .select('xp_amount')
    .eq('player_id', profileId)
    .gte('created_at', weekStartDate);

  const weeklyXp = (xpData || []).reduce((sum: number, row: any) => sum + (row.xp_amount || 0), 0);

  await supabase
    .from('league_standings')
    .update({ weekly_xp: weeklyXp })
    .eq('player_id', profileId)
    .eq('team_id', teamId)
    .eq('week_start', weekStart);
}

// ─── Process Weekly Reset (called on first Monday open) ──────────────────────
// Calculates promotion/demotion from LAST week's final standings.

export async function processWeeklyLeaderboardReset(
  teamId: string
): Promise<void> {
  const lastWeek = previousMonday();

  // Get last week's standings
  const { data: lastStandings } = await supabase
    .from('league_standings')
    .select('*')
    .eq('team_id', teamId)
    .eq('week_start', lastWeek)
    .order('weekly_xp', { ascending: false });

  if (!lastStandings || lastStandings.length === 0) return;

  // Check if promotion/demotion was already processed
  const alreadyProcessed = lastStandings.some((s: any) => s.promotion_status !== 'none');
  if (alreadyProcessed) return;

  const teamSize = lastStandings.length;

  // Determine promotion/demotion counts based on team size
  let promoteCount: number;
  let demoteCount: number;

  if (teamSize <= 5) {
    promoteCount = 2;
    demoteCount = 0; // No demotion for small teams
  } else if (teamSize <= 9) {
    promoteCount = 2;
    demoteCount = 2;
  } else {
    promoteCount = 3;
    demoteCount = 3;
  }

  // Assign ranks (already sorted by XP desc)
  for (let i = 0; i < lastStandings.length; i++) {
    const entry = lastStandings[i];
    const rank = i + 1;
    let status = 'maintained';

    // Check for 2+ consecutive weeks of 0 XP for demotion
    let shouldDemoteInactive = false;
    if (entry.weekly_xp === 0 && demoteCount > 0) {
      // Check the week before last
      const twoWeeksAgo = getTwoWeeksAgoMonday();
      const { data: prevWeek } = await supabase
        .from('league_standings')
        .select('weekly_xp')
        .eq('player_id', entry.player_id)
        .eq('team_id', teamId)
        .eq('week_start', twoWeeksAgo)
        .maybeSingle();

      if (prevWeek && prevWeek.weekly_xp === 0) {
        shouldDemoteInactive = true;
      }
    }

    if (rank <= promoteCount && entry.weekly_xp > 0) {
      // Promote (only if they earned XP)
      const currentTierIdx = LEAGUE_TIERS.indexOf(entry.league_tier as LeagueTier);
      if (currentTierIdx < LEAGUE_TIERS.length - 1) {
        status = 'promoted';
        const newTier = LEAGUE_TIERS[currentTierIdx + 1];

        // Update this week's standings with new tier
        await supabase
          .from('league_standings')
          .update({ league_tier: newTier })
          .eq('player_id', entry.player_id)
          .eq('team_id', teamId)
          .eq('week_start', localMondayOfWeek());
      }

      // Award podium XP
      const podiumXp = PODIUM_XP[rank as keyof typeof PODIUM_XP];
      if (podiumXp) {
        await awardXP({
          profileId: entry.player_id,
          baseAmount: podiumXp,
          sourceType: 'leaderboard_bonus',
          teamId,
          description: `Weekly leaderboard #${rank}: +${podiumXp} XP`,
          skipBoostLookup: true,
        });
      }
    } else if (
      (rank > teamSize - demoteCount && demoteCount > 0 && entry.weekly_xp > 0) ||
      shouldDemoteInactive
    ) {
      // Demote
      const currentTierIdx = LEAGUE_TIERS.indexOf(entry.league_tier as LeagueTier);
      if (currentTierIdx > 0) {
        status = 'demoted';
        const newTier = LEAGUE_TIERS[currentTierIdx - 1];

        await supabase
          .from('league_standings')
          .update({ league_tier: newTier })
          .eq('player_id', entry.player_id)
          .eq('team_id', teamId)
          .eq('week_start', localMondayOfWeek());
      }
    }

    // Update last week's entry with final status and rank
    await supabase
      .from('league_standings')
      .update({
        rank_in_team: rank,
        promotion_status: status,
      })
      .eq('id', entry.id);
  }
}

function getTwoWeeksAgoMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) - 14;
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

export interface LeaderboardEntry {
  id: string;
  player_id: string;
  team_id: string;
  league_tier: LeagueTier;
  week_start: string;
  weekly_xp: number;
  rank_in_team: number;
  promotion_status: string;
  rank: number;
  playerName: string;
}
