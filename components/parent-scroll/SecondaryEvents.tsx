/**
 * SecondaryEvents — compact Tier 2 hint for upcoming events after the hero card.
 * Shows at most 1 secondary event line + a "+N more" hint if more exist.
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

function getDayName(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  } catch {
    return '';
  }
}

function buildShortLabel(event: EventItem): string {
  const day = getDayName(event.event_date);
  const type = event.event_type === 'game'
    ? (event.opponent_name ? `Game vs ${event.opponent_name}` : 'Game')
    : event.event_type === 'practice'
      ? 'Practice'
      : (event.title || 'Event');
  return day ? `${day} \u{00B7} ${type}` : type;
}

export default function SecondaryEvents({ events }: Props) {
  const router = useRouter();

  // Skip the first event (already shown as hero)
  const secondary = events.slice(1);
  if (secondary.length === 0) return null;

  const goToSchedule = () => router.push('/(tabs)/parent-schedule' as any);

  // 1 extra event: show single flat line
  if (secondary.length === 1) {
    return (
      <TouchableOpacity style={styles.container} activeOpacity={0.7} onPress={goToSchedule}>
        <Text style={styles.lineText}>
          Also this week: {buildShortLabel(secondary[0])} {'\u2192'}
        </Text>
      </TouchableOpacity>
    );
  }

  // 2+ extra events: show "+N more" line
  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.7} onPress={goToSchedule}>
      <Text style={styles.lineText}>
        +{secondary.length} more events this week {'\u2192'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 4,
  },
  lineText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
  },
});
