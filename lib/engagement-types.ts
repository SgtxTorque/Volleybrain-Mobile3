// =============================================================================
// Engagement System — TypeScript Types
// =============================================================================

/** Shoutout category from shoutout_categories table */
export type ShoutoutCategory = {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  color: string | null;
  is_default: boolean;
  organization_id: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
};

/** Shoutout record from shoutouts table */
export type Shoutout = {
  id: string;
  giver_id: string;
  giver_role: string;
  receiver_id: string;
  receiver_role: string;
  team_id: string | null;
  organization_id: string;
  category_id: string | null;
  category: string;
  message: string | null;
  show_on_team_wall: boolean;
  post_id: string | null;
  created_at: string;
};

/** Enriched shoutout with joined profile data */
export type ShoutoutWithProfiles = Shoutout & {
  giver: { full_name: string; avatar_url: string | null };
  receiver: { full_name: string; avatar_url: string | null };
  categoryData?: ShoutoutCategory;
};

/** Coach challenge from coach_challenges table */
export type CoachChallenge = {
  id: string;
  coach_id: string;
  team_id: string;
  organization_id: string;
  title: string;
  description: string | null;
  challenge_type: 'individual' | 'team';
  metric_type: 'stat_based' | 'coach_verified' | 'self_report' | null;
  stat_key: string | null;
  target_value: number | null;
  xp_reward: number;
  badge_id: string | null;
  custom_reward_text: string | null;
  starts_at: string;
  ends_at: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  post_id: string | null;
  created_at: string;
};

/** Challenge participant from challenge_participants table */
export type ChallengeParticipant = {
  id: string;
  challenge_id: string;
  player_id: string;
  current_value: number;
  completed: boolean;
  completed_at: string | null;
  contribution: number;
  opted_in_at: string;
};

/** XP ledger entry from xp_ledger table */
export type XpLedgerEntry = {
  id: string;
  player_id: string;
  organization_id: string;
  xp_amount: number;
  source_type: XpSourceType;
  source_id: string | null;
  description: string | null;
  created_at: string;
};

/** Valid XP source types */
export type XpSourceType =
  | 'achievement'
  | 'shoutout_received'
  | 'shoutout_given'
  | 'challenge'
  | 'challenge_won'
  | 'game_played'
  | 'attendance'
  | 'coach_award';
