/**
 * onboarding-router.ts — Determines the correct post-auth destination.
 *
 * Four entry paths:
 *  1. Cold Download — no context, needs to find org
 *  2. Registration Link — deep link with seasonId
 *  3. Invite Code — code resolves to org
 *  4. Pre-Added by Admin — email matches unclaimed profile
 *
 * Plus: already_set_up — existing user with linked children
 */
import { hasLinkedPlayers } from '@/lib/resolve-linked-players';
import { supabase } from '@/lib/supabase';

export type OnboardingPath =
  | 'cold'
  | 'registration_link'
  | 'invite_code'
  | 'claim_account'
  | 'already_set_up';

type OnboardingContext = {
  deepLinkSeasonId?: string;
  inviteCode?: string;
};

/**
 * Determines the correct onboarding path after authentication.
 */
export async function determineOnboardingPath(
  userId: string,
  userEmail: string,
  profileId: string | null,
  context?: OnboardingContext,
): Promise<OnboardingPath> {
  // 1. Check if user has existing player links (canonical resolver)
  if (await hasLinkedPlayers(userId, userEmail)) {
    return 'already_set_up';
  }

  // 2. Check if user has active roles in any org (coaches, admins)
  const { data: activeRoles } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);

  if (activeRoles && activeRoles.length > 0) {
    return 'already_set_up';
  }

  // 3. Check for unclaimed player records matching this email
  const { data: unclaimedPlayers } = await supabase
    .from('players')
    .select('id')
    .or(`parent_email.eq.${userEmail},parent1_email.eq.${userEmail}`)
    .is('parent_account_id', null)
    .limit(1);

  if (unclaimedPlayers && unclaimedPlayers.length > 0) {
    return 'claim_account';
  }

  // 4. Context-based paths
  if (context?.deepLinkSeasonId) {
    return 'registration_link';
  }

  if (context?.inviteCode) {
    return 'invite_code';
  }

  // 5. Default: cold download
  return 'cold';
}

/**
 * Returns the route to navigate to based on the onboarding path.
 */
export function getOnboardingRoute(
  path: OnboardingPath,
  context?: OnboardingContext,
): string {
  switch (path) {
    case 'already_set_up':
      return '/(tabs)';
    case 'claim_account':
      return '/claim-account';
    case 'registration_link':
      return `/register/${context?.deepLinkSeasonId}`;
    case 'invite_code':
      return '/parent-registration-hub';
    case 'cold':
      return '/parent-registration-hub';
  }
}
