import { supabase } from './supabase';

// =============================================================================
// EMAIL QUEUE — Inserts rows into email_notifications for Edge Function to send
// =============================================================================
// All functions are fire-and-forget. Failures are silently caught so email
// queueing NEVER blocks the primary action (registration, approval, etc.).

type EmailData = Record<string, any>;

async function queueEmail(
  organizationId: string,
  recipientEmail: string,
  recipientName: string,
  type: string,
  data: EmailData,
): Promise<void> {
  try {
    if (!recipientEmail) return;
    await supabase.from('email_notifications').insert({
      organization_id: organizationId,
      recipient_email: recipientEmail,
      recipient_name: recipientName || null,
      type,
      data,
      status: 'pending',
    });
  } catch (e) {
    if (__DEV__) console.error('Email queue error:', e);
  }
}

// =============================================================================
// PREFERENCE CHECKING (for non-transactional emails)
// =============================================================================

type PrefKey = 'event_updates' | 'game_reminders';

async function shouldSendEmail(userId: string | null, prefKey: PrefKey): Promise<boolean> {
  if (!userId) return true; // No user ID → default to sending
  try {
    const { data } = await supabase
      .from('notification_preferences')
      .select(prefKey)
      .eq('user_id', userId)
      .maybeSingle();
    return data?.[prefKey] !== false;
  } catch {
    return true;
  }
}

// =============================================================================
// TRANSACTIONAL EMAILS (always send)
// =============================================================================

export function queueRegistrationConfirmation(
  orgId: string,
  parentEmail: string,
  parentName: string,
  childName: string,
  seasonName: string,
  orgName: string,
): void {
  queueEmail(orgId, parentEmail, parentName, 'registration_confirmation', {
    player_name: childName,
    season_name: seasonName,
    organization_name: orgName,
    registration_date: new Date().toLocaleDateString(),
  });
}

export function queueRegistrationApproval(
  orgId: string,
  parentEmail: string,
  parentName: string,
  childName: string,
  seasonName: string,
  orgName: string,
): void {
  queueEmail(orgId, parentEmail, parentName, 'registration_approved', {
    player_name: childName,
    season_name: seasonName,
    organization_name: orgName,
  });
}

export function queueTeamAssignment(
  orgId: string,
  parentEmail: string,
  parentName: string,
  childName: string,
  teamName: string,
  seasonName: string,
  orgName: string,
  coachName?: string,
): void {
  queueEmail(orgId, parentEmail, parentName, 'team_assignment', {
    player_name: childName,
    team_name: teamName,
    season_name: seasonName,
    organization_name: orgName,
    coach_name: coachName || null,
  });
}

export function queuePaymentConfirmation(
  orgId: string,
  parentEmail: string,
  parentName: string,
  amount: number,
  paymentMethod: string,
  childName: string,
  orgName: string,
): void {
  queueEmail(orgId, parentEmail, parentName, 'payment_confirmation', {
    player_name: childName,
    amount,
    payment_method: paymentMethod,
    organization_name: orgName,
    date: new Date().toLocaleDateString(),
  });
}

export function queueWelcomeEmail(
  orgId: string,
  email: string,
  name: string,
  orgName: string,
  role: string,
): void {
  queueEmail(orgId, email, name, 'welcome', {
    name,
    organization_name: orgName,
    role,
  });
}

// =============================================================================
// PREFERENCE-GATED EMAILS
// =============================================================================

export async function queueBlastEmail(
  orgId: string,
  recipientEmail: string,
  recipientName: string,
  userId: string | null,
  blastTitle: string,
  blastBody: string,
  orgName: string,
): Promise<void> {
  if (!(await shouldSendEmail(userId, 'event_updates'))) return;
  await queueEmail(orgId, recipientEmail, recipientName, 'blast', {
    title: blastTitle,
    body: blastBody,
    organization_name: orgName,
  });
}

export async function queueGameReminder(
  orgId: string,
  recipientEmail: string,
  recipientName: string,
  userId: string | null,
  teamName: string,
  opponent: string,
  date: string,
  time: string,
  venue: string,
): Promise<void> {
  if (!(await shouldSendEmail(userId, 'game_reminders'))) return;
  await queueEmail(orgId, recipientEmail, recipientName, 'game_reminder', {
    team_name: teamName,
    opponent,
    date,
    time,
    venue,
  });
}

export async function queueScheduleChange(
  orgId: string,
  recipientEmail: string,
  recipientName: string,
  userId: string | null,
  teamName: string,
  eventType: string,
  oldDate: string,
  newDate: string,
): Promise<void> {
  if (!(await shouldSendEmail(userId, 'event_updates'))) return;
  await queueEmail(orgId, recipientEmail, recipientName, 'schedule_change', {
    team_name: teamName,
    event_type: eventType,
    old_date: oldDate,
    new_date: newDate,
  });
}
