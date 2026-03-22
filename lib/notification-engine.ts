import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlayerNotification {
  id: string;
  player_id: string;
  notification_type: string;
  title: string;
  body: string | null;
  mascot_image: string | null;
  mascot_tone: 'positive' | 'urgent';
  action_url: string | null;
  action_data: any;
  is_read: boolean;
  created_at: string;
}

// ─── Notification Templates ──────────────────────────────────────────────────
// Two tones per notification: positive (all ages) and urgent (13+ only)

const TEMPLATES: Record<string, { positive: { title: string; body: string }; urgent: { title: string; body: string }; mascot: string }> = {
  streak_reminder: {
    positive: { title: 'Keep it going!', body: 'Open Lynx today to keep your streak alive.' },
    urgent: { title: 'Your streak is on the line!', body: 'You haven\'t opened Lynx today. Don\'t let your streak end.' },
    mascot: 'assets/images/activitiesmascot/2DAYSTREAKNEXTLEVEL.png',
  },
  streak_broken: {
    positive: { title: 'New day, new streak!', body: 'Start a fresh streak today. Every champion starts at day 1.' },
    urgent: { title: 'Your streak ended.', body: 'Start a new one today. Come back stronger.' },
    mascot: 'assets/images/activitiesmascot/NOSTREAK.png',
  },
  streak_milestone: {
    positive: { title: 'Streak milestone!', body: 'Amazing consistency! You earned a streak freeze.' },
    urgent: { title: 'Streak milestone!', body: 'You earned a streak freeze. Keep the fire going.' },
    mascot: 'assets/images/activitiesmascot/7DAYSTREAK.png',
  },
  quest_reminder: {
    positive: { title: 'Quests are waiting!', body: 'You have daily quests ready. Quick XP up for grabs.' },
    urgent: { title: 'Don\'t miss today\'s quests!', body: 'Your daily quests reset at midnight. Get them done.' },
    mascot: 'assets/images/activitiesmascot/LYNXREADY.png',
  },
  quest_expiring: {
    positive: { title: 'Almost out of time!', body: 'Your weekly quests reset Monday. Finish strong.' },
    urgent: { title: 'Weekly quests expire tonight!', body: 'Sunday night. Last chance for your weekly bonus.' },
    mascot: 'assets/images/activitiesmascot/SURPRISED.png',
  },
  team_quest_progress: {
    positive: { title: 'Your team is making moves!', body: 'The team quest is getting closer. Keep contributing.' },
    urgent: { title: 'Team quest almost done!', body: 'Your team is close. A few more contributions and everyone earns XP.' },
    mascot: 'assets/images/activitiesmascot/TEAMHUDDLE.png',
  },
  team_quest_complete: {
    positive: { title: 'Team quest complete!', body: 'Your whole team earned XP. That\'s teamwork.' },
    urgent: { title: 'Team quest complete!', body: 'Squad goals. Everyone just earned bonus XP.' },
    mascot: 'assets/images/activitiesmascot/TEAMACHIEVEMENT.png',
  },
  leaderboard_promotion: {
    positive: { title: 'Moving up!', body: 'You got promoted to a new league tier. Keep climbing.' },
    urgent: { title: 'League promotion!', body: 'You moved up. The competition just got real.' },
    mascot: 'assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png',
  },
  leaderboard_podium: {
    positive: { title: 'Podium finish!', body: 'You finished in the top 3 this week. Bonus XP earned.' },
    urgent: { title: 'Top 3 this week!', body: 'Podium finish. The team sees you. Keep dominating.' },
    mascot: 'assets/images/activitiesmascot/onfire.png',
  },
  xp_boost_active: {
    positive: { title: 'XP boost active!', body: 'Earn bonus XP on everything today. Make it count.' },
    urgent: { title: '2x XP is live!', body: 'Game day boost. Everything you do earns double.' },
    mascot: 'assets/images/activitiesmascot/onfire.png',
  },
  level_up: {
    positive: { title: 'Level up!', body: 'You reached a new level. New content unlocked.' },
    urgent: { title: 'LEVEL UP!', body: 'You just leveled up. Go see what you unlocked.' },
    mascot: 'assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png',
  },
};

// ─── Create Notification ─────────────────────────────────────────────────────

export async function createNotification(
  playerProfileId: string,
  notificationType: string,
  options?: {
    teamId?: string;
    actionUrl?: string;
    actionData?: any;
    expiresAt?: string;
    customTitle?: string;
    customBody?: string;
  }
): Promise<void> {
  const template = TEMPLATES[notificationType];
  if (!template && !options?.customTitle) {
    if (__DEV__) console.error('[notification-engine] Unknown notification type:', notificationType);
    return;
  }

  // Determine tone based on player age
  const tone = await getPlayerTone(playerProfileId);

  const toneTemplate = template ? template[tone] : null;
  const title = options?.customTitle || toneTemplate?.title || 'Notification';
  const body = options?.customBody || toneTemplate?.body || '';
  const mascotImage = template?.mascot || 'assets/images/activitiesmascot/LYNXREADY.png';

  // Check for duplicate (don't send same notification type twice in same hour)
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const { data: recent } = await supabase
    .from('player_notifications')
    .select('id')
    .eq('player_id', playerProfileId)
    .eq('notification_type', notificationType)
    .gte('created_at', oneHourAgo.toISOString())
    .maybeSingle();

  if (recent) return; // Already sent recently

  // Check daily limit (max 2 per day)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: todayCount } = await supabase
    .from('player_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerProfileId)
    .gte('created_at', todayStart.toISOString());

  if ((todayCount || 0) >= 2) return; // Daily limit reached

  await supabase.from('player_notifications').insert({
    player_id: playerProfileId,
    team_id: options?.teamId || null,
    notification_type: notificationType,
    title,
    body,
    mascot_image: mascotImage,
    mascot_tone: tone,
    action_url: options?.actionUrl || null,
    action_data: options?.actionData || null,
    expires_at: options?.expiresAt || null,
  });
}

// ─── Get Player Notifications ────────────────────────────────────────────────

export async function getPlayerNotifications(
  profileId: string,
  limit: number = 20
): Promise<PlayerNotification[]> {
  const { data } = await supabase
    .from('player_notifications')
    .select('*')
    .eq('player_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []) as PlayerNotification[];
}

// ─── Get Unread Count ────────────────────────────────────────────────────────

export async function getUnreadNotificationCount(profileId: string): Promise<number> {
  const { count } = await supabase
    .from('player_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', profileId)
    .eq('is_read', false);

  return count || 0;
}

// ─── Mark as Read ────────────────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from('player_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
}

export async function markAllNotificationsRead(profileId: string): Promise<void> {
  await supabase
    .from('player_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('player_id', profileId)
    .eq('is_read', false);
}

// ─── Helper: Determine tone by age ───────────────────────────────────────────
// NOTE: players table uses 'dob' column (NOT 'date_of_birth')

async function getPlayerTone(profileId: string): Promise<'positive' | 'urgent'> {
  const { data: playerData } = await supabase
    .from('players')
    .select('dob')
    .eq('parent_account_id', profileId)
    .limit(1)
    .maybeSingle();

  if (!playerData?.dob) return 'positive'; // Default to safe tone

  const birthDate = new Date(playerData.dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 13 ? 'urgent' : 'positive';
}
