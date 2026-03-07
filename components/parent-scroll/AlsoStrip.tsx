/**
 * AlsoStrip — horizontal scrollable strip of compact event chips.
 * Shows events NOT currently displayed in the billboard hero.
 * Only renders if there are > 1 total events.
 */
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import type { FamilyEvent } from '@/hooks/useParentHomeData';

type Props = {
  /** All upcoming events (billboard shows index 0) */
  events: FamilyEvent[];
  isMultiChild: boolean;
};

function isToday(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00').toDateString() === new Date().toDateString();
}

function isTomorrow(dateStr: string): boolean {
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  return new Date(dateStr + 'T00:00:00').toDateString() === tmrw.toDateString();
}

function formatChipTime(event: FamilyEvent): string {
  if (event.startTime) {
    const d = new Date(event.startTime);
    if (!isNaN(d.getTime())) {
      const h = d.getHours();
      const m = d.getMinutes();
      return `${h % 12 || 12}${m > 0 ? `:${String(m).padStart(2, '0')}` : ''}${h >= 12 ? 'pm' : 'am'}`;
    }
  }
  if (event.time) {
    const [h] = event.time.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}${hr >= 12 ? 'pm' : 'am'}`;
  }
  return '';
}

function getChipLabel(event: FamilyEvent, isMultiChild: boolean): string {
  const prefix = isMultiChild ? `${event.childName.charAt(0)} ` : '';
  const type = (event.eventType || 'Event').charAt(0).toUpperCase() + (event.eventType || 'Event').slice(1).toLowerCase();
  const time = formatChipTime(event);

  if (isToday(event.date)) {
    return `${prefix}${event.sportIcon} ${type}${time ? ` ${time}` : ''} today`;
  }
  if (isTomorrow(event.date)) {
    return `${prefix}${event.sportIcon} ${type}${time ? ` ${time}` : ''} tmrw`;
  }
  try {
    const day = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    return `${prefix}${event.sportIcon} ${type} ${day}${time ? ` ${time}` : ''}`;
  } catch {
    return `${prefix}${event.sportIcon} ${type}`;
  }
}

function getSportDotColor(sport: string): string {
  const s = sport.toLowerCase();
  if (s.includes('volleyball')) return '#0891B2';
  if (s.includes('basketball')) return BRAND.coral;
  if (s.includes('soccer') || s.includes('football')) return '#16A34A';
  return BRAND.skyBlue;
}

export default function AlsoStrip({ events, isMultiChild }: Props) {
  const router = useRouter();

  // Skip first event (billboard shows it) and only render if > 1
  const chipEvents = events.slice(1, 7);
  if (chipEvents.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={chipEvents}
        keyExtractor={(item) => `chip-${item.eventId}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chip}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/parent-schedule' as any)}
          >
            <View style={[styles.sportDot, { backgroundColor: getSportDotColor(item.sport) }]} />
            <Text style={styles.chipText} numberOfLines={1}>{getChipLabel(item, isMultiChild)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.cardGap,
  },
  list: {
    paddingHorizontal: SPACING.pagePadding,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.white,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  sportDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.navy,
  },
});
