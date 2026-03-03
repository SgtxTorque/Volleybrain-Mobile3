/**
 * UpcomingEvents — Flat list of next events across all teams.
 * Tier 2 section.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { UpcomingEvent } from '@/hooks/useAdminHomeData';

type Props = {
  events: UpcomingEvent[];
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  return `${days[d.getDay()]} ${months[d.getMonth()]}/${d.getDate()}`;
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

export default function UpcomingEvents({ events }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>UPCOMING</Text>
      </View>

      {events.length === 0 ? (
        <Text style={styles.emptyText}>No upcoming events.</Text>
      ) : (
        events.map((e) => (
          <View key={e.id} style={styles.eventRow}>
            <Text style={styles.dateText}>{formatDate(e.event_date)}</Text>
            <Text style={styles.separator}>{'\u00B7'}</Text>
            <Text style={styles.typeText}>{formatEventType(e.event_type)}</Text>
            {e.opponent_name ? (
              <>
                <Text style={styles.separator}>vs</Text>
                <Text style={styles.opponentText}>{e.opponent_name}</Text>
              </>
            ) : null}
            <Text style={styles.separator}>{'\u00B7'}</Text>
            <Text style={[styles.teamText, e.team_color ? { color: e.team_color } : null]}>
              {e.team_name}
            </Text>
            {e.start_time ? (
              <>
                <Text style={styles.separator}>{'\u00B7'}</Text>
                <Text style={styles.timeText}>{formatTime(e.start_time)}</Text>
              </>
            ) : null}
          </View>
        ))
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
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  dateText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  separator: {
    fontSize: 12,
    color: BRAND.textFaint,
  },
  typeText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  opponentText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  teamText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
  timeText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
  },
});
