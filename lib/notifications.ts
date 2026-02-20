import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

// Set notification handler for foreground notifications
try {
  if (!isExpoGo) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (e) {
  if (__DEV__) console.log('Notifications not available:', e);
}

export type NotificationType =
  | 'volunteer_needed'
  | 'rsvp_reminder'
  | 'event_update'
  | 'backup_promoted'
  | 'general';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  event_id?: string;
  team_id?: string;
  read: boolean;
  read_at?: string;
  created_at: string;
  data?: Record<string, any>;
}

// =====================================================
// PUSH TOKEN REGISTRATION
// =====================================================
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (isExpoGo) {
      if (__DEV__) console.log('Push notifications are not available in Expo Go');
      return null;
    }

    if (!Device.isDevice) {
      if (__DEV__) console.log('Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      if (__DEV__) console.log('Push notification permission denied');
      return null;
    }

    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Android channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F97316',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

// Legacy alias for backward compatibility
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  return registerForPushNotificationsAsync();
}

// =====================================================
// SAVE PUSH TOKEN TO SUPABASE
// =====================================================
export async function savePushToken(userId: string, token: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);
  if (error) console.error('Error saving push token:', error);
}

// =====================================================
// SEND VOLUNTEER BLAST
// =====================================================
export async function sendVolunteerBlast(params: {
  eventId: string;
  teamId: string;
  role: 'line_judge' | 'scorekeeper' | 'both';
  eventTitle: string;
  eventDate: string;
  sentBy: string;
}): Promise<{ success: boolean; recipientCount: number; error?: string }> {
  const { eventId, teamId, role, eventTitle, eventDate, sentBy } = params;

  try {
    // Check if blast was already sent today for this role
    const today = new Date().toISOString().split('T')[0];
    const { data: existingBlast } = await supabase
      .from('volunteer_blasts')
      .select('id')
      .eq('event_id', eventId)
      .eq('role', role)
      .eq('sent_date', today)
      .maybeSingle();

    if (existingBlast) {
      return { success: false, recipientCount: 0, error: 'A blast was already sent today for this role' };
    }

    // Get all parent IDs for this team
    const { data: teamParents, error: parentError } = await supabase
      .rpc('get_team_parent_ids', { p_team_id: teamId });

    if (parentError) {
      console.error('Error getting team parents:', parentError);
      // Fallback: get parents directly from player_parents joined with team_players
      const { data: fallbackParents } = await supabase
        .from('player_guardians')
        .select(`
          guardian_id,
          player:players!inner(
            team_players!inner(team_id)
          )
        `)
        .eq('player.team_players.team_id', teamId);

      if (!fallbackParents || fallbackParents.length === 0) {
        return { success: false, recipientCount: 0, error: 'No parents found for this team' };
      }

      // Use fallback parents
      const parentIds = [...new Set(fallbackParents.map(p => p.guardian_id))];
      return await createNotifications(parentIds, eventId, teamId, role, eventTitle, eventDate, sentBy);
    }

    if (!teamParents || teamParents.length === 0) {
      return { success: false, recipientCount: 0, error: 'No parents found for this team' };
    }

    const parentIds = teamParents.map((p: { parent_id: string }) => p.parent_id);
    return await createNotifications(parentIds, eventId, teamId, role, eventTitle, eventDate, sentBy);
  } catch (error) {
    console.error('Error sending volunteer blast:', error);
    return { success: false, recipientCount: 0, error: 'Failed to send notifications' };
  }
}

async function createNotifications(
  parentIds: string[],
  eventId: string,
  teamId: string,
  role: string,
  eventTitle: string,
  eventDate: string,
  sentBy: string
): Promise<{ success: boolean; recipientCount: number; error?: string }> {
  // Format the notification message
  const roleText = role === 'both' 
    ? 'a Line Judge and Scorekeeper' 
    : role === 'line_judge' 
      ? 'a Line Judge' 
      : 'a Scorekeeper';

  const formattedDate = new Date(eventDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const title = '🏐 Volunteers Needed!';
  const body = `We still need ${roleText} for ${eventTitle} on ${formattedDate}. Can you help?`;

  // Create in-app notifications for each parent
  const notifications = parentIds.map((parentId: string) => ({
    user_id: parentId,
    title,
    body,
    type: 'volunteer_needed' as NotificationType,
    event_id: eventId,
    team_id: teamId,
    data: { role },
  }));

  const { error: notifError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (notifError) {
    console.error('Error creating notifications:', notifError);
    return { success: false, recipientCount: 0, error: 'Failed to create notifications' };
  }

  // Record the blast
  const blastRecord: any = {
    event_id: eventId,
    role,
    sent_date: new Date().toISOString().split('T')[0],
    recipient_count: parentIds.length,
  };
  
  // Only add sent_by if it's a valid UUID (not empty or 'system')
  if (sentBy && sentBy.length > 10) {
    blastRecord.sent_by = sentBy;
  }
  
  await supabase
    .from('volunteer_blasts')
    .insert(blastRecord);

  return { success: true, recipientCount: parentIds.length };
}

// =====================================================
// FETCH USER NOTIFICATIONS
// =====================================================
export async function fetchNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

// =====================================================
// MARK NOTIFICATION AS READ
// =====================================================
export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
}

// =====================================================
// MARK ALL NOTIFICATIONS AS READ
// =====================================================
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false);
}

// =====================================================
// GET UNREAD COUNT
// =====================================================
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }

  return count || 0;
}

// =====================================================
// CHECK FOR GAMES NEEDING VOLUNTEERS (Auto-blast)
// Call this on app open or via scheduled function
// =====================================================
export async function checkUpcomingGamesForVolunteers(
  daysAhead: number = 2
): Promise<{ eventId: string; title: string; missingRoles: string[] }[]> {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const todayStr = today.toISOString().split('T')[0];
  const futureStr = futureDate.toISOString().split('T')[0];

  // Get games in the date range
  const { data: games } = await supabase
    .from('schedule_events')
    .select('id, title, event_date, team_id')
    .eq('event_type', 'game')
    .gte('event_date', todayStr)
    .lte('event_date', futureStr);

  if (!games || games.length === 0) return [];

  const gamesNeedingHelp: { eventId: string; title: string; missingRoles: string[] }[] = [];

  for (const game of games) {
    // Check for primary volunteers
    const { data: volunteers } = await supabase
      .from('event_volunteers')
      .select('role')
      .eq('event_id', game.id)
      .eq('position', 'primary');

    const hasLineJudge = volunteers?.some(v => v.role === 'line_judge');
    const hasScorekeeper = volunteers?.some(v => v.role === 'scorekeeper');

    const missingRoles: string[] = [];
    if (!hasLineJudge) missingRoles.push('line_judge');
    if (!hasScorekeeper) missingRoles.push('scorekeeper');

    if (missingRoles.length > 0) {
      gamesNeedingHelp.push({
        eventId: game.id,
        title: game.title,
        missingRoles,
      });
    }
  }

  return gamesNeedingHelp;
}

// =====================================================
// AUTO-BLAST FOR UPCOMING GAMES
// Automatically sends blast for games missing volunteers
// =====================================================
export async function runAutoBlastCheck(daysAhead: number = 2): Promise<number> {
  let blastsSent = 0;
  
  try {
    const gamesNeedingHelp = await checkUpcomingGamesForVolunteers(daysAhead);
    
    for (const game of gamesNeedingHelp) {
      // Get the game details for team_id
      const { data: gameData } = await supabase
        .from('schedule_events')
        .select('team_id, event_date')
        .eq('id', game.eventId)
        .single();
      
      if (!gameData) continue;
      
      // Determine role to blast for
      const role = game.missingRoles.length === 2 
        ? 'both' 
        : game.missingRoles[0] as 'line_judge' | 'scorekeeper';
      
      // Check if we already blasted today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingBlast } = await supabase
        .from('volunteer_blasts')
        .select('id')
        .eq('event_id', game.eventId)
        .eq('sent_date', today)
        .maybeSingle();
      
      if (existingBlast) continue; // Already blasted today
      
      // Send the blast (system-initiated, no sentBy)
      const result = await sendVolunteerBlast({
        eventId: game.eventId,
        teamId: gameData.team_id,
        role,
        eventTitle: game.title,
        eventDate: gameData.event_date,
        sentBy: '', // Empty for system-initiated
      });
      
      if (result.success) blastsSent++;
    }
  } catch (error) {
    console.error('Auto-blast check error:', error);
  }
  
  return blastsSent;
}

// =====================================================
// PROMOTE BACKUP VOLUNTEER
// Called when primary cancels - promotes backup chain
// =====================================================
export async function promoteBackupVolunteer(
  eventId: string,
  role: 'line_judge' | 'scorekeeper'
): Promise<{ promoted: boolean; promotedUserId?: string; error?: string }> {
  try {
    // Get all volunteers for this role, ordered by position
    const { data: volunteers } = await supabase
      .from('event_volunteers')
      .select('id, profile_id, position, profile:profiles(full_name)')
      .eq('event_id', eventId)
      .eq('role', role)
      .order('position');
    
    if (!volunteers || volunteers.length === 0) {
      return { promoted: false };
    }
    
    // Find backups to promote
    const backup1 = volunteers.find(v => v.position === 'backup_1');
    const backup2 = volunteers.find(v => v.position === 'backup_2');
    const backup3 = volunteers.find(v => v.position === 'backup_3');
    
    if (!backup1) {
      return { promoted: false }; // No backup to promote
    }
    
    // Promote backup_1 to primary
    await supabase
      .from('event_volunteers')
      .update({ position: 'primary' })
      .eq('id', backup1.id);
    
    // Shift others up
    if (backup2) {
      await supabase
        .from('event_volunteers')
        .update({ position: 'backup_1' })
        .eq('id', backup2.id);
    }
    
    if (backup3) {
      await supabase
        .from('event_volunteers')
        .update({ position: 'backup_2' })
        .eq('id', backup3.id);
    }
    
    // Get event details for notification
    const { data: event } = await supabase
      .from('schedule_events')
      .select('title, event_date')
      .eq('id', eventId)
      .single();
    
    if (event) {
      const roleText = role === 'line_judge' ? 'Line Judge' : 'Scorekeeper';
      const formattedDate = new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      
      // Notify the promoted volunteer
      await supabase
        .from('notifications')
        .insert({
          user_id: backup1.profile_id,
          title: '⬆️ You\'ve Been Promoted!',
          body: `You're now the primary ${roleText} for ${event.title} on ${formattedDate}. The previous volunteer had to cancel.`,
          type: 'backup_promoted',
          event_id: eventId,
          data: { role },
        });
    }
    
    return { promoted: true, promotedUserId: backup1.profile_id };
  } catch (error) {
    console.error('Promote backup error:', error);
    return { promoted: false, error: 'Failed to promote backup' };
  }
}

// =====================================================
// SEND RSVP REMINDERS
// Notify parents who haven't responded to upcoming events
// =====================================================
export async function sendRSVPReminders(daysAhead: number = 3): Promise<number> {
  let remindersSent = 0;
  
  try {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];
    
    // Get upcoming events (games and practices)
    const { data: events } = await supabase
      .from('schedule_events')
      .select('id, title, event_date, team_id, event_type')
      .in('event_type', ['game', 'practice'])
      .gte('event_date', todayStr)
      .lte('event_date', futureStr);
    
    if (!events || events.length === 0) return 0;
    
    for (const event of events) {
      // Check if we already sent reminders today for this event
      const { data: existingReminder } = await supabase
        .from('notifications')
        .select('id')
        .eq('event_id', event.id)
        .eq('type', 'rsvp_reminder')
        .gte('created_at', todayStr)
        .limit(1)
        .maybeSingle();
      
      if (existingReminder) continue; // Already sent today
      
      // Get all players on this team
      const { data: teamPlayers } = await supabase
        .from('team_players')
        .select('player_id')
        .eq('team_id', event.team_id);
      
      if (!teamPlayers || teamPlayers.length === 0) continue;
      
      const playerIds = teamPlayers.map(tp => tp.player_id);
      
      // Get existing RSVPs for this event
      const { data: existingRSVPs } = await supabase
        .from('event_rsvps')
        .select('player_id')
        .eq('event_id', event.id);
      
      const rsvpedPlayerIds = existingRSVPs?.map(r => r.player_id) || [];
      
      // Find players who haven't RSVPed
      const missingRSVPPlayerIds = playerIds.filter(id => !rsvpedPlayerIds.includes(id));
      
      if (missingRSVPPlayerIds.length === 0) continue;
      
      // Get parents of players who haven't RSVPed
      const { data: parents } = await supabase
        .from('player_guardians')
        .select('guardian_id, player:players(first_name)')
        .in('player_id', missingRSVPPlayerIds);
      
      if (!parents || parents.length === 0) continue;
      
      const formattedDate = new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      
      const eventTypeText = event.event_type === 'game' ? 'game' : 'practice';
      
      // Create notifications for each parent
      const notifications = parents.map((p: any) => ({
        user_id: p.guardian_id,
        title: '📋 RSVP Needed',
        body: `Please let us know if ${p.player?.first_name || 'your player'} can make the ${eventTypeText} on ${formattedDate}: ${event.title}`,
        type: 'rsvp_reminder' as NotificationType,
        event_id: event.id,
        data: { event_type: event.event_type },
      }));
      
      // Remove duplicates (same parent for multiple players)
      const uniqueNotifications = notifications.filter((notif, index, self) =>
        index === self.findIndex(n => n.user_id === notif.user_id)
      );
      
      if (uniqueNotifications.length > 0) {
        await supabase
          .from('notifications')
          .insert(uniqueNotifications);
        
        remindersSent += uniqueNotifications.length;
      }
    }
  } catch (error) {
    console.error('RSVP reminder error:', error);
  }
  
  return remindersSent;
}

// =====================================================
// RUN ALL SCHEDULED CHECKS
// Call this on app open to run all automated tasks
// =====================================================
export async function runScheduledChecks(): Promise<{
  autoBlasts: number;
  rsvpReminders: number;
}> {
  if (__DEV__) console.log('Running scheduled notification checks...');
  
  const [autoBlasts, rsvpReminders] = await Promise.all([
    runAutoBlastCheck(2),      // Check games in next 2 days
    sendRSVPReminders(3),      // Remind for events in next 3 days
  ]);
  
  if (__DEV__) console.log(`Scheduled checks complete: ${autoBlasts} blasts, ${rsvpReminders} reminders`);
  
  return { autoBlasts, rsvpReminders };
}
