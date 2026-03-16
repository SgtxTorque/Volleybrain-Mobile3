import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notification-engine';

// ─── Check and Create Auto Boosts ───────────────────────────────────────────
// Called on app open. Checks schedule_events for today and creates boosts.

export async function checkAndCreateAutoBoosts(teamId: string): Promise<void> {
  const today = localToday();

  // Check if boost already exists for today
  const todayStart = new Date(today + 'T00:00:00').toISOString();
  const todayEnd = new Date(today + 'T23:59:59').toISOString();

  const { data: existingBoost } = await supabase
    .from('xp_boost_events')
    .select('id')
    .eq('team_id', teamId)
    .gte('starts_at', todayStart)
    .lte('starts_at', todayEnd)
    .maybeSingle();

  if (existingBoost) return; // Already created

  // Check for today's events
  const { data: todayEvents } = await supabase
    .from('schedule_events')
    .select('event_type')
    .eq('team_id', teamId)
    .eq('event_date', today);

  if (!todayEvents || todayEvents.length === 0) {
    // Check for Weekend Warrior (Saturday/Sunday)
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      await supabase.from('xp_boost_events').insert({
        team_id: null, // Global boost
        boost_type: 'weekend_warrior',
        multiplier: 1.00, // Weekend Warrior is a flat +25 XP bonus, not a multiplier
        starts_at: todayStart,
        ends_at: todayEnd,
        applicable_sources: ['skill_tip', 'skill_drill', 'skill_quiz', 'journey_node'],
      });
    }
    return;
  }

  const hasGame = todayEvents.some((e: any) => e.event_type === 'game');
  const hasPractice = todayEvents.some((e: any) => e.event_type === 'practice');

  if (hasGame) {
    await supabase.from('xp_boost_events').insert({
      team_id: teamId,
      boost_type: 'game_day',
      multiplier: 2.00,
      starts_at: todayStart,
      ends_at: todayEnd,
      applicable_sources: null, // All sources
    });

    // Notify team
    await notifyTeamOfBoost(teamId, 'Game day! 2x XP on everything today.');
  } else if (hasPractice) {
    await supabase.from('xp_boost_events').insert({
      team_id: teamId,
      boost_type: 'practice_day',
      multiplier: 1.50,
      starts_at: todayStart,
      ends_at: todayEnd,
      applicable_sources: ['skill_drill', 'quest_daily', 'skill_quiz'],
    });

    await notifyTeamOfBoost(teamId, 'Practice day! 1.5x XP on drills and quests.');
  }
}

// ─── Early Bird RSVP ─────────────────────────────────────────────────────────

export async function checkEarlyBird(
  eventId: string,
  playerProfileId: string
): Promise<{ isEarlyBird: boolean; rsvpOrder: number; xpAwarded: number }> {
  // Check if already claimed
  const { data: existing } = await supabase
    .from('early_bird_claims')
    .select('id')
    .eq('event_id', eventId)
    .eq('player_id', playerProfileId)
    .maybeSingle();

  if (existing) return { isEarlyBird: false, rsvpOrder: 0, xpAwarded: 0 };

  // Count how many have already claimed for this event
  const { count } = await supabase
    .from('early_bird_claims')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  const currentCount = count || 0;

  if (currentCount >= 5) return { isEarlyBird: false, rsvpOrder: 0, xpAwarded: 0 };

  // Claim Early Bird
  const rsvpOrder = currentCount + 1;
  const xpAmount = 10;

  await supabase.from('early_bird_claims').insert({
    event_id: eventId,
    player_id: playerProfileId,
    rsvp_order: rsvpOrder,
    xp_awarded: xpAmount,
  });

  // Award XP
  await supabase.from('xp_ledger').insert({
    player_id: playerProfileId,
    xp_amount: xpAmount,
    source_type: 'rsvp',
    source_id: eventId,
    description: `Early Bird #${rsvpOrder}: +${xpAmount} XP`,
  });

  // Update profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', playerProfileId)
    .single();

  if (profile) {
    const { calculateLevel } = require('@/lib/quest-engine');
    const newTotal = (profile.total_xp || 0) + xpAmount;
    const { level, tier, xpToNext } = calculateLevel(newTotal);

    await supabase
      .from('profiles')
      .update({ total_xp: newTotal, player_level: level, tier, xp_to_next_level: xpToNext })
      .eq('id', playerProfileId);
  }

  return { isEarlyBird: true, rsvpOrder, xpAwarded: xpAmount };
}

// ─── Helper: Notify all team players ─────────────────────────────────────────

async function notifyTeamOfBoost(teamId: string, message: string) {
  const { data: teamPlayers } = await supabase
    .from('team_players')
    .select('players!inner(parent_account_id)')
    .eq('team_id', teamId);

  if (!teamPlayers) return;

  const profileIds = teamPlayers
    .map((tp: any) => tp.players?.parent_account_id)
    .filter(Boolean);

  for (const pid of profileIds) {
    await createNotification(pid, 'xp_boost_active', {
      teamId,
      customBody: message,
      expiresAt: new Date(new Date().setHours(23, 59, 59)).toISOString(),
    });
  }
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
