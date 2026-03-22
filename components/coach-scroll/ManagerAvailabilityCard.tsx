/**
 * ManagerAvailabilityCard — next event RSVP breakdown for Team Manager.
 * Shows confirmed/maybe/no-response counts with a visual bar and send-reminder action.
 */
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';
import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notification-engine';

interface Props {
  nextEventTitle: string | null;
  nextEventDate: string | null;
  nextEventType: string | null;
  nextEventId: string | null;
  rsvpConfirmed: number;
  rsvpMaybe: number;
  rsvpNoResponse: number;
  rsvpTotal: number;
  teamId: string;
}

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function ManagerAvailabilityCard({
  nextEventTitle,
  nextEventDate,
  nextEventType,
  nextEventId,
  rsvpConfirmed,
  rsvpMaybe,
  rsvpNoResponse,
  rsvpTotal,
  teamId,
}: Props) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  if (!nextEventTitle || !nextEventId) return null;

  const isGame = nextEventType === 'game';
  const typeLabel = isGame ? 'Game' : nextEventType === 'practice' ? 'Practice' : 'Event';
  const typeBadgeColor = isGame ? BRAND.skyBlue : D_COLORS.collectedGreen;

  // RSVP bar widths (percentage of total)
  const total = rsvpTotal || 1;
  const confirmedPct = (rsvpConfirmed / total) * 100;
  const maybePct = (rsvpMaybe / total) * 100;
  const noPct = (rsvpNoResponse / total) * 100;

  const sendReminder = async () => {
    if (!nextEventId || !teamId) return;
    setSending(true);
    try {
      // Get all players on the team
      const { data: roster } = await supabase
        .from('team_players')
        .select('player_id, players ( parent_account_id )')
        .eq('team_id', teamId);

      if (!roster || roster.length === 0) {
        Alert.alert('No players', 'No players on this team to send reminders to.');
        setSending(false);
        return;
      }

      // Get existing RSVPs for this event
      const { data: existingRsvps } = await supabase
        .from('event_rsvps')
        .select('player_id')
        .eq('event_id', nextEventId);

      const respondedIds = new Set((existingRsvps || []).map(r => r.player_id));

      // Find parents of players who haven't RSVP'd
      const parentIds = new Set<string>();
      for (const r of roster) {
        if (!respondedIds.has(r.player_id)) {
          const parentId = (r.players as any)?.parent_account_id;
          if (parentId) parentIds.add(parentId);
        }
      }

      if (parentIds.size === 0) {
        Alert.alert('All responded', 'All players have already responded to this event.');
        setSending(false);
        return;
      }

      // Send notification to each parent
      let sent = 0;
      for (const parentId of parentIds) {
        try {
          await createNotification(parentId, 'rsvp_reminder', {
            teamId,
            customTitle: 'RSVP needed',
            customBody: `Please respond to ${nextEventTitle} on ${formatEventDate(nextEventDate)}.`,
          });
          sent++;
        } catch {
          // Skip individual notification failures
        }
      }

      Alert.alert('Reminders sent', `Sent ${sent} reminder${sent === 1 ? '' : 's'} to parents.`);
    } catch (err) {
      Alert.alert('Error', 'Failed to send reminders.');
    } finally {
      setSending(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/coach-schedule' as any)}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={18} color={BRAND.textPrimary} />
          <Text style={styles.title}>Next {typeLabel}</Text>
        </View>
        <Text style={styles.dateText}>{formatEventDate(nextEventDate)}</Text>
      </View>

      {/* Event info */}
      <View style={styles.eventRow}>
        <Text style={styles.eventTitle} numberOfLines={1}>{nextEventTitle}</Text>
        <View style={[styles.typeBadge, { backgroundColor: typeBadgeColor + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: typeBadgeColor }]}>{typeLabel.toUpperCase()}</Text>
        </View>
      </View>

      {/* RSVP visual bar */}
      <View style={styles.rsvpBar}>
        {confirmedPct > 0 && (
          <View style={[styles.rsvpSegment, { width: `${confirmedPct}%`, backgroundColor: D_COLORS.collectedGreen }]} />
        )}
        {maybePct > 0 && (
          <View style={[styles.rsvpSegment, { width: `${maybePct}%`, backgroundColor: BRAND.warning }]} />
        )}
        {noPct > 0 && (
          <View style={[styles.rsvpSegment, { width: `${noPct}%`, backgroundColor: 'rgba(11,22,40,0.12)' }]} />
        )}
      </View>

      {/* RSVP counts */}
      <View style={styles.rsvpCountsRow}>
        <View style={styles.rsvpCount}>
          <View style={[styles.rsvpDot, { backgroundColor: D_COLORS.collectedGreen }]} />
          <Text style={styles.rsvpCountText}>{rsvpConfirmed} confirmed</Text>
        </View>
        <View style={styles.rsvpCount}>
          <View style={[styles.rsvpDot, { backgroundColor: BRAND.warning }]} />
          <Text style={styles.rsvpCountText}>{rsvpMaybe} maybe</Text>
        </View>
        <View style={styles.rsvpCount}>
          <View style={[styles.rsvpDot, { backgroundColor: 'rgba(11,22,40,0.12)' }]} />
          <Text style={styles.rsvpCountText}>{rsvpNoResponse} no response</Text>
        </View>
      </View>

      {/* Send reminder */}
      {rsvpNoResponse > 0 && (
        <TouchableOpacity
          style={styles.reminderBtn}
          activeOpacity={0.7}
          onPress={(e) => {
            e.stopPropagation?.();
            sendReminder();
          }}
          disabled={sending}
        >
          <Ionicons name="notifications-outline" size={14} color={BRAND.skyBlue} />
          <Text style={styles.reminderBtnText}>
            {sending ? 'Sending...' : 'Send reminder'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default React.memo(ManagerAvailabilityCard);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: D_RADII.card,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(11,22,40,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  dateText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  eventTitle: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  rsvpBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(11,22,40,0.06)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  rsvpSegment: {
    height: 6,
  },
  rsvpCountsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  rsvpCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rsvpDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rsvpCountText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(75,185,236,0.1)',
  },
  reminderBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12.5,
    color: BRAND.skyBlue,
  },
});
