/**
 * TeamPulse — Tier 2 flat data rows showing attendance, RSVPs, messages.
 * Includes ambient moment after the data rows.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { RsvpSummary } from '@/hooks/useCoachHomeData';

type Props = {
  attendanceRate: number | null;
  rsvpSummary: RsvpSummary | null;
  unreadMessages: number;
  heroEventDate: string | null;
};

function getDayLabel(date: string | null): string {
  if (!date) return 'next event';
  try {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  } catch {
    return 'next event';
  }
}

export default function TeamPulse({ attendanceRate, rsvpSummary, unreadMessages, heroEventDate }: Props) {
  const router = useRouter();
  const dayLabel = getDayLabel(heroEventDate);

  // Missing names text
  const missingText = rsvpSummary && rsvpSummary.missing.length > 0
    ? rsvpSummary.missing.length <= 2
      ? `${rsvpSummary.missing.join(' and ')} hasn't responded`
      : `${rsvpSummary.missing[0]} and ${rsvpSummary.missing.length - 1} others haven't responded`
    : null;

  // Ambient moment
  const ambientMessage = (() => {
    if (attendanceRate !== null && attendanceRate >= 90) {
      return { text: `${attendanceRate}% attendance. This team shows up.`, color: BRAND.textMuted };
    }
    if (attendanceRate !== null && attendanceRate < 80) {
      return { text: 'Attendance dipped this week. Worth a check-in.', color: '#F59E0B' };
    }
    if (rsvpSummary && rsvpSummary.confirmed === rsvpSummary.total && rsvpSummary.total > 0) {
      return { text: `Full roster confirmed for ${dayLabel}. Let's go.`, color: BRAND.success };
    }
    return null;
  })();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>TEAM PULSE</Text>

      {/* Attendance */}
      {attendanceRate !== null && (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/coach-schedule' as any)}
        >
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>Attendance</Text>
            <Text style={styles.rowSubtitle}>Average over last 3 events</Text>
          </View>
          <Text style={styles.rowValue}>{attendanceRate}% {'\u2192'}</Text>
        </TouchableOpacity>
      )}

      {/* RSVPs */}
      {rsvpSummary && (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/coach-schedule' as any)}
        >
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>RSVPs for {dayLabel}</Text>
            {missingText && <Text style={styles.rowSubtitle}>{missingText}</Text>}
          </View>
          <Text style={styles.rowValue}>
            {rsvpSummary.confirmed}/{rsvpSummary.total} {'\u2192'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Unread Messages */}
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => router.push('/(tabs)/coach-chat' as any)}
      >
        <View style={styles.rowLeft}>
          <Text style={styles.rowLabel}>Unread Parent Messages</Text>
        </View>
        <Text style={[styles.rowValue, unreadMessages > 0 && { color: BRAND.skyBlue }]}>
          {unreadMessages} {'\u2192'}
        </Text>
      </TouchableOpacity>

      {/* Ambient moment */}
      {ambientMessage && (
        <Text style={[styles.ambient, { color: ambientMessage.color }]}>
          {ambientMessage.text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textPrimary,
  },
  rowSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  rowValue: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textPrimary,
  },
  ambient: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 12,
  },
});
