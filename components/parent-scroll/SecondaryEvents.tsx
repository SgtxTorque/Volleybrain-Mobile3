/**
 * SecondaryEvents — flat Tier 2 lines for upcoming events after the hero card.
 * Shows events 2-5 (skipping the hero event which is already displayed).
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type EventItem = {
  id: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  start_time: string | null;
  title: string;
  venue_name: string | null;
  location: string | null;
  opponent_name: string | null;
};

type Props = {
  events: EventItem[];
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTime(event: EventItem): string {
  if (event.start_time) {
    const d = new Date(event.start_time);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  }
  if (event.event_time) {
    const [h, m] = event.event_time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  }
  return '';
}

function buildDetail(event: EventItem): string {
  const parts: string[] = [];
  const typeLabel = (event.event_type || event.title || 'Event');
  if (event.opponent_name) {
    parts.push(`${typeLabel} vs ${event.opponent_name}`);
  } else {
    parts.push(typeLabel);
  }
  const loc = event.venue_name || event.location;
  if (loc) parts.push(loc);
  return parts.join(' \u{00B7} ');
}

export default function SecondaryEvents({ events }: Props) {
  const router = useRouter();

  // Skip the first event (already shown as hero) and take next 4
  const secondary = events.slice(1, 5);
  if (secondary.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>ALSO THIS WEEK</Text>
      {secondary.map((event) => {
        const dateStr = formatDate(event.event_date);
        const timeStr = formatTime(event);
        const detail = buildDetail(event);

        return (
          <TouchableOpacity
            key={event.id}
            style={styles.eventRow}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/parent-schedule' as any)}
          >
            <View style={styles.eventContent}>
              <Text style={styles.dateTime}>
                {dateStr}{timeStr ? ` \u{00B7} ${timeStr}` : ''}
              </Text>
              <Text style={styles.detail} numberOfLines={1}>
                {detail}
              </Text>
            </View>
            <Text style={styles.arrow}>{'\u{2192}'}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: BRAND.textFaint,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  eventRow: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventContent: {
    flex: 1,
  },
  dateTime: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  detail: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  arrow: {
    color: BRAND.textFaint,
    fontSize: 16,
    marginLeft: 8,
  },
});
