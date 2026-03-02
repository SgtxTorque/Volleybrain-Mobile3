/**
 * PrepChecklist — Tier 2 flat compact checklist line.
 * Only renders when selected team has an event today or tomorrow.
 * Shows lineup, RSVP, and stats checkpoint status.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { PrepChecklist as PrepChecklistType } from '@/hooks/useCoachHomeData';

type Props = {
  checklist: PrepChecklistType | null;
  eventDate: string | null;
};

function getDayLabel(eventDate: string | null): string {
  if (!eventDate) return 'the event';
  try {
    const d = new Date(eventDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.getTime() === today.getTime()) return 'today';
    if (d.getTime() === tomorrow.getTime()) return 'tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  } catch {
    return 'the event';
  }
}

export default function PrepChecklist({ checklist, eventDate }: Props) {
  const router = useRouter();

  if (!checklist) return null;

  const items = [
    { label: 'Lineup set', done: checklist.lineupSet },
    { label: 'RSVPs', done: checklist.rsvpsReviewed },
    { label: 'Last game stats', done: checklist.lastStatsEntered },
  ];

  const doneCount = items.filter(i => i.done).length;
  const allDone = doneCount === items.length;
  const dayLabel = getDayLabel(eventDate);

  // All done → ambient Tier 3 message
  if (allDone) {
    return (
      <View style={styles.container}>
        <Text style={styles.allDoneText}>
          All set for {dayLabel}. Trust the preparation. {'\u2713'}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/coach-schedule' as any)}
    >
      <View style={styles.checkRow}>
        {items.map((item, i) => (
          <Text key={i} style={styles.checkItem}>
            <Text style={{ color: item.done ? BRAND.success : BRAND.error }}>
              {item.done ? '\u2713' : '\u2717'}
            </Text>
            {' '}{item.label}
            {i < items.length - 1 ? '  ' : ''}
          </Text>
        ))}
      </View>
      <Text style={styles.summaryLine}>
        {doneCount} of {items.length} ready for {dayLabel} {'\u2192'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  checkItem: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  summaryLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 4,
  },
  allDoneText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.success,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
