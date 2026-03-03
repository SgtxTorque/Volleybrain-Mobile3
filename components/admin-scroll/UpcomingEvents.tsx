/**
 * UpcomingEvents — Tier 2 flat list of next events across all teams.
 * Phase 5: structured event rows, "View Calendar" link, "Create Event" CTA when empty.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { UpcomingEvent } from '@/hooks/useAdminHomeData';

type Props = {
  events: UpcomingEvent[];
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

function formatTime(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatEventType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

function EventRow({ event }: { event: UpcomingEvent }) {
  const typeLabel = event.opponent_name
    ? `${formatEventType(event.event_type)} vs ${event.opponent_name}`
    : formatEventType(event.event_type);

  return (
    <View style={styles.eventRow}>
      <View style={styles.dateCol}>
        <Text style={styles.dateText}>{formatDate(event.event_date)}</Text>
      </View>
      <View style={styles.detailCol}>
        <Text style={styles.typeText} numberOfLines={1}>{typeLabel}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.teamText, event.team_color ? { color: event.team_color } : null]}>
            {event.team_name}
          </Text>
          {event.start_time ? (
            <>
              <Text style={styles.separator}>{'\u00B7'}</Text>
              <Text style={styles.timeText}>{formatTime(event.start_time)}</Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function UpcomingEvents({ events }: Props) {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>UPCOMING</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/admin-schedule' as any)}
        >
          <Text style={styles.viewCalendar}>View Calendar {'\u203A'}</Text>
        </TouchableOpacity>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No upcoming events.</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/admin-schedule' as any)}
          >
            <Text style={styles.createEventText}>Create Event {'\u203A'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        events.map((e) => <EventRow key={e.id} event={e} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: BRAND.textFaint,
  },
  viewCalendar: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
  },
  createEventText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  dateCol: {
    width: 72,
  },
  dateText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  detailCol: {
    flex: 1,
  },
  typeText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  separator: {
    fontSize: 10,
    color: BRAND.textFaint,
  },
  timeText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
});
